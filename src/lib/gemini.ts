import { GoogleGenAI } from '@google/genai'
import { z } from 'zod'
import type { ReceiptExtraction, StatementExtraction, CsvColumnDetectionResult } from '@/types'

const GEMINI_MODEL = 'gemini-2.5-flash'

function getClient() {
  return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! })
}

// ────────────────────────────────────────────────────────────
// JSON Schema definitions for structured output
// ────────────────────────────────────────────────────────────

const RECEIPT_JSON_SCHEMA = {
  type: 'object',
  properties: {
    vendor_name: { type: ['string', 'null'] },
    transaction_date: { type: ['string', 'null'], description: 'YYYY-MM-DD format' },
    total_amount: { type: ['number', 'null'] },
    subtotal_amount: { type: ['number', 'null'] },
    gst_hst_amount: { type: ['number', 'null'] },
    pst_amount: { type: ['number', 'null'] },
    payment_method: { type: ['string', 'null'] },
    card_last4: { type: ['string', 'null'], description: 'Exactly 4 digits or null' },
    category: { type: ['string', 'null'] },
    expense_type: { type: ['string', 'null'], enum: ['business', 'personal', null] },
    location: { type: ['string', 'null'] },
    receipt_number: { type: ['string', 'null'] },
  },
  required: [
    'vendor_name',
    'transaction_date',
    'total_amount',
    'subtotal_amount',
    'gst_hst_amount',
    'pst_amount',
    'payment_method',
    'card_last4',
    'category',
    'expense_type',
    'location',
    'receipt_number',
  ],
}

const STATEMENT_JSON_SCHEMA = {
  type: 'object',
  properties: {
    card_last4: { type: ['string', 'null'] },
    transactions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          transaction_date: { type: 'string', description: 'YYYY-MM-DD' },
          description: { type: 'string' },
          amount: { type: 'number', description: 'Negative = debit, positive = credit' },
          category: { type: ['string', 'null'] },
        },
        required: ['transaction_date', 'description', 'amount', 'category'],
      },
    },
  },
  required: ['card_last4', 'transactions'],
}

const CSV_MAPPING_JSON_SCHEMA = {
  type: 'object',
  properties: {
    detected_date_col: { type: 'string' },
    detected_description_col: { type: 'string' },
    detected_amount_col: { type: ['string', 'null'] },
    detected_debit_col: { type: ['string', 'null'] },
    detected_credit_col: { type: ['string', 'null'] },
    confidence: { type: 'number', minimum: 0, maximum: 1 },
    available_columns: { type: 'array', items: { type: 'string' } },
  },
  required: [
    'detected_date_col',
    'detected_description_col',
    'detected_amount_col',
    'detected_debit_col',
    'detected_credit_col',
    'confidence',
    'available_columns',
  ],
}

// ────────────────────────────────────────────────────────────
// Receipt extraction
// ────────────────────────────────────────────────────────────

const RECEIPT_PROMPT = `Extract the following fields from this receipt image or PDF.
Return only a JSON object matching the provided schema.
Use null for any field you cannot confidently identify.
For dates, use YYYY-MM-DD format.
For amounts, return positive numeric values only (no currency symbols).
For card_last4, return exactly 4 digits or null.
For expense_type, classify as "business" or "personal" based on the vendor/category.`

const ReceiptExtractionSchema = z.object({
  vendor_name: z.string().nullable(),
  transaction_date: z.string().nullable(),
  total_amount: z.number().nullable(),
  subtotal_amount: z.number().nullable(),
  gst_hst_amount: z.number().nullable(),
  pst_amount: z.number().nullable(),
  payment_method: z.string().nullable(),
  card_last4: z.string().nullable(),
  category: z.string().nullable(),
  expense_type: z.enum(['business', 'personal']).nullable(),
  location: z.string().nullable(),
  receipt_number: z.string().nullable(),
})

export async function extractReceiptData(
  base64: string,
  mimeType: string
): Promise<ReceiptExtraction> {
  const client = getClient()
  let lastError: unknown

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await client.models.generateContent({
        model: GEMINI_MODEL,
        contents: [
          { text: RECEIPT_PROMPT },
          { inlineData: { mimeType, data: base64 } },
        ],
        config: {
          responseMimeType: 'application/json',
          responseJsonSchema: RECEIPT_JSON_SCHEMA,
        },
      })

      const text = response.candidates?.[0]?.content?.parts?.[0]?.text
      if (!text) throw new Error('Empty response from Gemini')

      const parsed = JSON.parse(text)
      return ReceiptExtractionSchema.parse(parsed)
    } catch (err) {
      lastError = err
      if (attempt === 0) {
        await new Promise((r) => setTimeout(r, 1000))
        continue
      }
    }
  }

  throw lastError
}

// ────────────────────────────────────────────────────────────
// Bank statement extraction
// ────────────────────────────────────────────────────────────

const STATEMENT_PROMPT = `Extract all transactions from this bank statement image or PDF.
Return only a JSON object matching the provided schema.
For dates, use YYYY-MM-DD format.
For amounts: negative values indicate debits/withdrawals, positive values indicate credits/deposits.
For card_last4, extract the last 4 digits of the card number shown, or null if not visible.
For category, make a best guess based on the description, or null if unclear.`

const StatementExtractionSchema = z.object({
  card_last4: z.string().nullable(),
  transactions: z.array(
    z.object({
      transaction_date: z.string(),
      description: z.string(),
      amount: z.number(),
      category: z.string().nullable(),
    })
  ),
})

export async function extractStatementTransactions(
  base64: string,
  mimeType: string
): Promise<StatementExtraction> {
  const client = getClient()
  let lastError: unknown

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await client.models.generateContent({
        model: GEMINI_MODEL,
        contents: [
          { text: STATEMENT_PROMPT },
          { inlineData: { mimeType, data: base64 } },
        ],
        config: {
          responseMimeType: 'application/json',
          responseJsonSchema: STATEMENT_JSON_SCHEMA,
        },
      })

      const text = response.candidates?.[0]?.content?.parts?.[0]?.text
      if (!text) throw new Error('Empty response from Gemini')

      const parsed = JSON.parse(text)
      return StatementExtractionSchema.parse(parsed)
    } catch (err) {
      lastError = err
      if (attempt === 0) {
        await new Promise((r) => setTimeout(r, 1000))
        continue
      }
    }
  }

  throw lastError
}

// ────────────────────────────────────────────────────────────
// CSV column mapping detection
// ────────────────────────────────────────────────────────────

const CSV_MAPPING_PROMPT = `Analyze these CSV headers and sample data to detect which columns contain:
- Transaction date
- Transaction description/memo
- Amount (either a single signed column, or separate debit/credit columns)

Return a confidence score from 0 to 1 indicating how certain you are of the mapping.
If debit and credit are in separate columns, set detected_debit_col and detected_credit_col; leave detected_amount_col null.
If amount is a single signed column, set detected_amount_col; leave debit/credit null.`

export async function detectCsvColumnMapping(
  headers: string[],
  sampleRows: Record<string, string>[]
): Promise<CsvColumnDetectionResult> {
  const client = getClient()

  const prompt = `${CSV_MAPPING_PROMPT}

Headers: ${JSON.stringify(headers)}
Sample rows (first ${sampleRows.length}):
${JSON.stringify(sampleRows, null, 2)}`

  const response = await client.models.generateContent({
    model: GEMINI_MODEL,
    contents: [{ text: prompt }],
    config: {
      responseMimeType: 'application/json',
      responseJsonSchema: CSV_MAPPING_JSON_SCHEMA,
    },
  })

  const text = response.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new Error('Empty response from Gemini')

  const parsed = JSON.parse(text)
  return {
    ...parsed,
    sample_rows: sampleRows,
  }
}
