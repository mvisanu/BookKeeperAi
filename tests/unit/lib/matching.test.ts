import { describe, it, expect } from 'vitest'
import { runAutoMatch } from '@/lib/matching'
import type { BankTransaction, Receipt } from '@/types'

function makeTx(overrides: Partial<BankTransaction> = {}): BankTransaction {
  return {
    id: crypto.randomUUID(),
    user_id: 'user-1',
    statement_id: 'stmt-1',
    transaction_date: '2024-01-15',
    description: 'Coffee Shop',
    amount: -12.50,
    category: null,
    notes: null,
    card_last4: null,
    is_duplicate: false,
    is_matched: false,
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-15T10:00:00Z',
    ...overrides,
  }
}

function makeReceipt(overrides: Partial<Receipt> = {}): Receipt {
  return {
    id: crypto.randomUUID(),
    user_id: 'user-1',
    status: 'complete',
    storage_path: 'path/to/file.jpg',
    file_name: 'receipt.jpg',
    file_size: 1024,
    file_mime_type: 'image/jpeg',
    vendor_name: 'Coffee Shop',
    transaction_date: '2024-01-15',
    total_amount: 12.50,
    subtotal_amount: null,
    gst_hst_amount: null,
    pst_amount: null,
    payment_method: null,
    card_last4: null,
    category: null,
    expense_type: null,
    location: null,
    receipt_number: null,
    notes: null,
    extraction_error: null,
    is_matched: false,
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-15T10:00:00Z',
    ...overrides,
  }
}

describe('runAutoMatch', () => {
  it('returns empty array for empty inputs', () => {
    expect(runAutoMatch([], [])).toEqual([])
    expect(runAutoMatch([makeTx()], [])).toEqual([])
    expect(runAutoMatch([], [makeReceipt()])).toEqual([])
  })

  it('matches exact amount and same date', () => {
    const tx = makeTx({ amount: -12.50 })
    const receipt = makeReceipt({ total_amount: 12.50 })
    const matches = runAutoMatch([tx], [receipt])
    expect(matches).toHaveLength(1)
    expect(matches[0].bank_transaction_id).toBe(tx.id)
    expect(matches[0].receipt_id).toBe(receipt.id)
    expect(matches[0].match_type).toBe('auto')
    expect(matches[0].confidence_score).toBe(1.0)
  })

  it('matches amount within $0.01 tolerance', () => {
    const tx = makeTx({ amount: -12.499 })
    const receipt = makeReceipt({ total_amount: 12.50 })
    const matches = runAutoMatch([tx], [receipt])
    expect(matches).toHaveLength(1)
  })

  it('does not match when amount difference is clearly >= $0.01', () => {
    const tx = makeTx({ amount: -12.50 })
    const receipt = makeReceipt({ total_amount: 12.52 }) // 0.02 diff — clearly outside tolerance
    const matches = runAutoMatch([tx], [receipt])
    expect(matches).toHaveLength(0)
  })

  it('matches when date is within 3 days', () => {
    const tx = makeTx({ amount: -12.50, transaction_date: '2024-01-15' })
    const receipt = makeReceipt({ total_amount: 12.50, transaction_date: '2024-01-18' })
    const matches = runAutoMatch([tx], [receipt])
    expect(matches).toHaveLength(1)
    expect(matches[0].confidence_score).toBeLessThan(1.0)
    expect(matches[0].confidence_score).toBeGreaterThan(0.0)
  })

  it('does not match when date difference > 3 days', () => {
    const tx = makeTx({ amount: -12.50, transaction_date: '2024-01-15' })
    const receipt = makeReceipt({ total_amount: 12.50, transaction_date: '2024-01-19' })
    const matches = runAutoMatch([tx], [receipt])
    expect(matches).toHaveLength(0)
  })

  it('enforces one-to-one exclusivity', () => {
    const receipt = makeReceipt({ total_amount: 12.50 })
    const tx1 = makeTx({ amount: -12.50 })
    const tx2 = makeTx({ amount: -12.50 })
    const matches = runAutoMatch([tx1, tx2], [receipt])
    expect(matches).toHaveLength(1)
  })

  it('calculates confidence score: exact date = 1.0, 3-day offset = 0.7', () => {
    const tx = makeTx({ amount: -12.50, transaction_date: '2024-01-15' })
    const r1 = makeReceipt({
      total_amount: 12.50,
      transaction_date: '2024-01-15',
      id: 'r1',
      created_at: '2024-01-15T09:00:00Z',
    })
    const r2 = makeReceipt({
      total_amount: 12.50,
      transaction_date: '2024-01-18',
      id: 'r2',
      created_at: '2024-01-15T09:00:00Z',
    })

    const matchExact = runAutoMatch([tx], [r1])
    expect(matchExact[0].confidence_score).toBe(1.0)

    const tx2 = makeTx({ id: 'tx2', amount: -12.50, transaction_date: '2024-01-15' })
    const match3Day = runAutoMatch([tx2], [r2])
    expect(match3Day[0].confidence_score).toBe(0.9)
  })

  it('returns all-unmatched result when no matches found', () => {
    const tx = makeTx({ amount: -99.99 })
    const receipt = makeReceipt({ total_amount: 12.50 })
    const matches = runAutoMatch([tx], [receipt])
    expect(matches).toHaveLength(0)
  })
})
