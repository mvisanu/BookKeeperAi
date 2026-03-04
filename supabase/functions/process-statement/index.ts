// @ts-ignore — Deno runtime
import { GoogleGenAI } from 'npm:@google/genai'
// @ts-ignore
import { createClient } from 'jsr:@supabase/supabase-js@2'
// @ts-ignore
import Papa from 'npm:papaparse'

const GEMINI_MODEL = 'gemini-2.5-flash'

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

const STATEMENT_PROMPT = `Extract all transactions from this bank statement image or PDF.
Return only a JSON object matching the provided schema.
For dates, use YYYY-MM-DD format.
For amounts: negative values indicate debits/withdrawals, positive values indicate credits/deposits.
For card_last4, extract the last 4 digits of the card number shown, or null if not visible.
For category, make a best guess based on the description, or null if unclear.`

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

const genai = new GoogleGenAI({ apiKey: Deno.env.get('GEMINI_API_KEY')! })

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
}

async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3, baseDelayMs = 1000): Promise<T> {
  let lastError: unknown
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (err: unknown) {
      lastError = err
      const isRateLimit =
        err instanceof Error &&
        (err.message.includes('429') || err.message.toLowerCase().includes('rate limit'))
      if (!isRateLimit || attempt === maxRetries) throw err
      await new Promise((r) => setTimeout(r, baseDelayMs * Math.pow(2, attempt)))
    }
  }
  throw lastError
}

function parseAmount(raw: string): number {
  if (!raw) return 0
  const str = raw.trim()
  // Parenthetical negative: (42.00) → -42
  const parens = str.match(/^\(([0-9,.]+)\)$/)
  if (parens) return -parseFloat(parens[1].replace(/[,$]/g, ''))
  // Dr./Cr. suffix
  const drCr = str.match(/^([0-9,.]+)\s*(Dr|CR)\.?$/i)
  if (drCr) {
    const val = parseFloat(drCr[1].replace(/[,$]/g, ''))
    return /Dr/i.test(drCr[2]) ? -val : val
  }
  return parseFloat(str.replace(/[^0-9.\-]/g, '')) || 0
}

function parseCsvTransactions(
  csvText: string,
  mapping: {
    date_col: string
    description_col: string
    amount_col?: string
    debit_col?: string
    credit_col?: string
    card_last4: string
  }
): Array<{ transaction_date: string; description: string; amount: number; card_last4: string }> {
  const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true })
  const rows: Record<string, string>[] = parsed.data

  return rows.map((row) => {
    let amount = 0
    if (mapping.amount_col && row[mapping.amount_col]) {
      amount = parseAmount(row[mapping.amount_col])
    } else if (mapping.debit_col && mapping.credit_col) {
      const debit = parseAmount(row[mapping.debit_col] ?? '0')
      const credit = parseAmount(row[mapping.credit_col] ?? '0')
      amount = credit > 0 ? credit : -Math.abs(debit)
    }

    return {
      transaction_date: row[mapping.date_col]?.trim() ?? '',
      description: row[mapping.description_col]?.trim() ?? '',
      amount,
      card_last4: mapping.card_last4,
    }
  }).filter((tx) => tx.transaction_date && tx.description)
}

async function processInBackground(
  statementId: string,
  storagePath: string,
  mimeType: string,
  csvMapping?: {
    date_col: string
    description_col: string
    amount_col?: string
    debit_col?: string
    credit_col?: string
    card_last4: string
  }
) {
  try {
    await supabaseAdmin.from('bank_statements').update({ status: 'processing' }).eq('id', statementId)

    // Get user_id for dedup
    const { data: stmt } = await supabaseAdmin
      .from('bank_statements')
      .select('user_id')
      .eq('id', statementId)
      .single()

    const userId = stmt?.user_id

    const { data: fileData, error: downloadError } = await supabaseAdmin.storage
      .from('bank-statements')
      .download(storagePath)

    if (downloadError || !fileData) {
      throw new Error(`Storage download failed: ${downloadError?.message}`)
    }

    let transactions: Array<{
      transaction_date: string
      description: string
      amount: number
      category?: string | null
      card_last4?: string | null
    }> = []

    if (mimeType === 'text/csv' && csvMapping) {
      const text = await fileData.text()
      transactions = parseCsvTransactions(text, csvMapping).map((tx) => ({
        ...tx,
        category: null,
      }))
    } else {
      // PDF or image — use Gemini
      const arrayBuffer = await fileData.arrayBuffer()
      const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)))

      const response = await withRetry(() =>
        genai.models.generateContent({
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
      )

      const text = response.candidates?.[0]?.content?.parts?.[0]?.text
      if (!text) throw new Error('Empty response from Gemini')

      const extracted = JSON.parse(text)

      // Update card_last4 on statement if extracted
      if (extracted.card_last4) {
        await supabaseAdmin
          .from('bank_statements')
          .update({ card_last4: extracted.card_last4 })
          .eq('id', statementId)
      }

      transactions = (extracted.transactions ?? []).map((tx: { transaction_date: string; description: string; amount: number; category: string | null }) => ({
        ...tx,
        card_last4: extracted.card_last4,
      }))
    }

    // Bulk insert with dedup
    let insertedCount = 0
    const batchSize = 25

    for (let i = 0; i < transactions.length; i += batchSize) {
      const batch = transactions.slice(i, i + batchSize)

      const rows = batch.map((tx) => ({
        user_id: userId,
        statement_id: statementId,
        transaction_date: tx.transaction_date,
        description: tx.description,
        amount: tx.amount,
        category: tx.category ?? null,
        card_last4: tx.card_last4 ?? null,
        is_duplicate: false,
      }))

      // Check duplicates
      for (const row of rows) {
        const { data: existing } = await supabaseAdmin
          .from('bank_transactions')
          .select('id')
          .eq('user_id', userId)
          .eq('transaction_date', row.transaction_date)
          .eq('amount', row.amount)
          .ilike('description', row.description)
          .limit(1)
          .single()

        if (!existing) {
          await supabaseAdmin.from('bank_transactions').insert(row)
          insertedCount++
        }
      }

      // Update progress
      await supabaseAdmin
        .from('bank_statements')
        .update({ transaction_count: insertedCount })
        .eq('id', statementId)
    }

    await supabaseAdmin
      .from('bank_statements')
      .update({ status: 'complete', transaction_count: insertedCount })
      .eq('id', statementId)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    await supabaseAdmin
      .from('bank_statements')
      .update({ status: 'failed', import_error: message })
      .eq('id', statementId)
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: CORS_HEADERS })
  }

  try {
    const { statement_id, storage_path, mime_type, csv_mapping } = await req.json()

    if (!statement_id || !storage_path || !mime_type) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      )
    }

    // @ts-ignore
    EdgeRuntime.waitUntil(processInBackground(statement_id, storage_path, mime_type, csv_mapping))

    return new Response(
      JSON.stringify({ status: 'processing', statement_id }),
      { status: 202, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    )
  }
})
