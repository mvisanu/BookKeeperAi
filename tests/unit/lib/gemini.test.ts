import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGenerateContent = vi.hoisted(() => vi.fn())

vi.mock('@google/genai', () => {
  const MockGoogleGenAI = function (this: unknown) {
    return { models: { generateContent: mockGenerateContent } }
  }
  return { GoogleGenAI: MockGoogleGenAI }
})

const { extractReceiptData, extractStatementTransactions, detectCsvColumnMapping } = await import(
  '@/lib/gemini'
)

function makeResponse(text: string) {
  return { candidates: [{ content: { parts: [{ text }] } }] }
}

/** Helper: advance timers while keeping the promise "handled" to avoid unhandled-rejection noise */
async function runWithTimers<T>(fn: () => Promise<T>): Promise<T> {
  const promise = fn()
  // Silence potential rejection during timer advancement
  const silenced = promise.catch(() => {})
  await vi.runAllTimersAsync()
  await silenced
  return promise
}

const FULL_RECEIPT = {
  vendor_name: 'Tim Hortons',
  transaction_date: '2024-01-15',
  total_amount: 12.5,
  subtotal_amount: 11.06,
  gst_hst_amount: 1.44,
  pst_amount: null,
  payment_method: 'Visa',
  card_last4: '4321',
  category: 'Meals',
  expense_type: 'business',
  location: 'Toronto, ON',
  receipt_number: 'RC-001',
}

describe('extractReceiptData', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  it('parses a valid receipt JSON response', async () => {
    mockGenerateContent.mockResolvedValueOnce(makeResponse(JSON.stringify(FULL_RECEIPT)))
    const result = await extractReceiptData('base64data', 'image/jpeg')
    expect(result.vendor_name).toBe('Tim Hortons')
    expect(result.total_amount).toBe(12.5)
    expect(result.gst_hst_amount).toBe(1.44)
    expect(result.pst_amount).toBeNull()
    expect(result.expense_type).toBe('business')
  })

  it('handles all-null fields in extraction', async () => {
    const nullReceipt = Object.fromEntries(Object.keys(FULL_RECEIPT).map((k) => [k, null]))
    mockGenerateContent.mockResolvedValueOnce(makeResponse(JSON.stringify(nullReceipt)))
    const result = await extractReceiptData('base64data', 'image/png')
    expect(result.vendor_name).toBeNull()
    expect(result.total_amount).toBeNull()
    expect(result.expense_type).toBeNull()
  })

  it('retries once on failure then succeeds', async () => {
    mockGenerateContent
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce(makeResponse(JSON.stringify(FULL_RECEIPT)))
    const result = await runWithTimers(() => extractReceiptData('base64data', 'application/pdf'))
    expect(mockGenerateContent).toHaveBeenCalledTimes(2)
    expect(result.vendor_name).toBe('Tim Hortons')
  })

  it('throws after two consecutive failures', async () => {
    mockGenerateContent
      .mockRejectedValueOnce(new Error('First failure'))
      .mockRejectedValueOnce(new Error('Second failure'))
    await expect(runWithTimers(() => extractReceiptData('base64data', 'image/jpeg'))).rejects.toThrow(
      'Second failure'
    )
    expect(mockGenerateContent).toHaveBeenCalledTimes(2)
  })

  it('throws on empty response from Gemini', async () => {
    mockGenerateContent
      .mockResolvedValueOnce({ candidates: [] })
      .mockResolvedValueOnce({ candidates: [] })
    await expect(
      runWithTimers(() => extractReceiptData('base64data', 'image/jpeg'))
    ).rejects.toThrow('Empty response from Gemini')
  })

  it('retries once on malformed JSON then fails gracefully', async () => {
    mockGenerateContent
      .mockResolvedValueOnce(makeResponse('not valid json {'))
      .mockResolvedValueOnce(makeResponse('still not valid json'))
    await expect(
      runWithTimers(() => extractReceiptData('base64data', 'image/jpeg'))
    ).rejects.toThrow()
    expect(mockGenerateContent).toHaveBeenCalledTimes(2)
  })

  it('normalises date in YYYY-MM-DD format', async () => {
    const receipt = { ...FULL_RECEIPT, transaction_date: '2024-03-05' }
    mockGenerateContent.mockResolvedValueOnce(makeResponse(JSON.stringify(receipt)))
    const result = await extractReceiptData('base64data', 'image/jpeg')
    expect(result.transaction_date).toBe('2024-03-05')
  })
})

describe('extractStatementTransactions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  it('parses valid statement JSON with transactions', async () => {
    const payload = {
      card_last4: '5678',
      transactions: [
        { transaction_date: '2024-01-10', description: 'GROCERY STORE', amount: -45.23, category: 'Groceries' },
        { transaction_date: '2024-01-12', description: 'SALARY DEPOSIT', amount: 2500.0, category: null },
      ],
    }
    mockGenerateContent.mockResolvedValueOnce(makeResponse(JSON.stringify(payload)))
    const result = await extractStatementTransactions('base64data', 'application/pdf')
    expect(result.card_last4).toBe('5678')
    expect(result.transactions).toHaveLength(2)
    expect(result.transactions[0].amount).toBe(-45.23)
    expect(result.transactions[1].category).toBeNull()
  })

  it('handles null card_last4 and empty transactions', async () => {
    const payload = { card_last4: null, transactions: [] }
    mockGenerateContent.mockResolvedValueOnce(makeResponse(JSON.stringify(payload)))
    const result = await extractStatementTransactions('base64data', 'image/jpeg')
    expect(result.card_last4).toBeNull()
    expect(result.transactions).toHaveLength(0)
  })

  it('retries once on error and succeeds', async () => {
    const payload = { card_last4: null, transactions: [] }
    mockGenerateContent
      .mockRejectedValueOnce(new Error('Timeout'))
      .mockResolvedValueOnce(makeResponse(JSON.stringify(payload)))
    const result = await runWithTimers(() => extractStatementTransactions('base64data', 'image/jpeg'))
    expect(mockGenerateContent).toHaveBeenCalledTimes(2)
    expect(result.transactions).toHaveLength(0)
  })

  it('throws after two consecutive failures', async () => {
    mockGenerateContent
      .mockRejectedValueOnce(new Error('err1'))
      .mockRejectedValueOnce(new Error('err2'))
    await expect(
      runWithTimers(() => extractStatementTransactions('base64data', 'image/jpeg'))
    ).rejects.toThrow('err2')
    expect(mockGenerateContent).toHaveBeenCalledTimes(2)
  })

  it('throws on empty response', async () => {
    mockGenerateContent
      .mockResolvedValueOnce({ candidates: [] })
      .mockResolvedValueOnce({ candidates: [] })
    await expect(
      runWithTimers(() => extractStatementTransactions('base64data', 'image/jpeg'))
    ).rejects.toThrow('Empty response from Gemini')
  })
})

describe('detectCsvColumnMapping', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns detected column mapping with sample_rows appended', async () => {
    const geminiResponse = {
      detected_date_col: 'Date',
      detected_description_col: 'Description',
      detected_amount_col: 'Amount',
      detected_debit_col: null,
      detected_credit_col: null,
      confidence: 0.95,
      available_columns: ['Date', 'Description', 'Amount'],
    }
    mockGenerateContent.mockResolvedValueOnce(makeResponse(JSON.stringify(geminiResponse)))
    const headers = ['Date', 'Description', 'Amount']
    const sampleRows = [
      { Date: '2024-01-01', Description: 'Coffee', Amount: '-5.50' },
      { Date: '2024-01-02', Description: 'Salary', Amount: '2500.00' },
    ]
    const result = await detectCsvColumnMapping(headers, sampleRows)
    expect(result.detected_date_col).toBe('Date')
    expect(result.detected_amount_col).toBe('Amount')
    expect(result.confidence).toBe(0.95)
    expect(result.sample_rows).toEqual(sampleRows)
  })

  it('handles debit/credit split columns', async () => {
    const geminiResponse = {
      detected_date_col: 'Trans Date',
      detected_description_col: 'Memo',
      detected_amount_col: null,
      detected_debit_col: 'Debit',
      detected_credit_col: 'Credit',
      confidence: 0.88,
      available_columns: ['Trans Date', 'Memo', 'Debit', 'Credit'],
    }
    mockGenerateContent.mockResolvedValueOnce(makeResponse(JSON.stringify(geminiResponse)))
    const result = await detectCsvColumnMapping(['Trans Date', 'Memo', 'Debit', 'Credit'], [])
    expect(result.detected_amount_col).toBeNull()
    expect(result.detected_debit_col).toBe('Debit')
    expect(result.detected_credit_col).toBe('Credit')
  })

  it('throws on empty response from Gemini', async () => {
    mockGenerateContent.mockResolvedValueOnce({ candidates: [] })
    await expect(detectCsvColumnMapping(['Date', 'Desc', 'Amt'], [])).rejects.toThrow(
      'Empty response from Gemini'
    )
  })
})
