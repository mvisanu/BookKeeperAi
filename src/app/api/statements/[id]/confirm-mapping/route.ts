import { NextRequest } from 'next/server'
import { z } from 'zod'
import Papa from 'papaparse'
import { createClient } from '@/lib/supabase/server'
import { apiSuccess, apiError } from '@/lib/api/response'

const MappingSchema = z.object({
  date_col: z.string().min(1),
  description_col: z.string().min(1),
  amount_col: z.string().optional(),
  debit_col: z.string().optional(),
  credit_col: z.string().optional(),
  card_last4: z.string().regex(/^\d{4}$/),
}).refine(
  (d) => d.amount_col || (d.debit_col && d.credit_col),
  'Either amount_col or both debit_col and credit_col must be provided'
)

function parseAmount(raw: string): number {
  if (!raw) return 0
  const str = raw.trim()
  const parens = str.match(/^\(([0-9,.]+)\)$/)
  if (parens) return -parseFloat(parens[1].replace(/[,$]/g, ''))
  const drCr = str.match(/^([0-9,.]+)\s*(Dr|CR)\.?$/i)
  if (drCr) {
    const val = parseFloat(drCr[1].replace(/[,$]/g, ''))
    return /Dr/i.test(drCr[2]) ? -val : val
  }
  return parseFloat(str.replace(/[^0-9.\-]/g, '')) || 0
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiError('Unauthenticated', 'UNAUTHENTICATED', 401)

  const body = await request.json()
  const parsed = MappingSchema.safeParse(body)
  if (!parsed.success) {
    return apiError(parsed.error.issues[0].message, 'VALIDATION_ERROR', 400)
  }

  const mapping = parsed.data

  const { data: stmt, error: fetchError } = await supabase
    .from('bank_statements')
    .select('storage_path, file_mime_type')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (fetchError || !stmt) return apiError('Statement not found', 'NOT_FOUND', 404)

  // Save mapping and set status to processing
  await supabase
    .from('bank_statements')
    .update({ csv_column_mapping: mapping, status: 'processing', card_last4: mapping.card_last4 })
    .eq('id', id)

  // Download the CSV
  const { data: fileData, error: downloadError } = await supabase.storage
    .from('bank-statements')
    .download(stmt.storage_path)

  if (downloadError || !fileData) {
    await supabase.from('bank_statements').update({ status: 'failed', import_error: 'Could not download file' }).eq('id', id)
    return apiError('Could not download file', 'INTERNAL_ERROR', 500)
  }

  try {
    const csvText = await fileData.text()
    const result = Papa.parse(csvText, { header: true, skipEmptyLines: true })
    const rows = result.data as Record<string, string>[]

    const transactions = rows
      .map((row) => {
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
      })
      .filter((tx) => tx.transaction_date && tx.description)

    // Insert transactions (skip duplicates)
    let insertedCount = 0
    for (const tx of transactions) {
      const { data: existing } = await supabase
        .from('bank_transactions')
        .select('id')
        .eq('user_id', user.id)
        .eq('transaction_date', tx.transaction_date)
        .eq('amount', tx.amount)
        .ilike('description', tx.description)
        .limit(1)
        .maybeSingle()

      if (!existing) {
        await supabase.from('bank_transactions').insert({
          user_id: user.id,
          statement_id: id,
          transaction_date: tx.transaction_date,
          description: tx.description,
          amount: tx.amount,
          card_last4: tx.card_last4,
          is_duplicate: false,
        })
        insertedCount++
      }
    }

    await supabase
      .from('bank_statements')
      .update({ status: 'complete', transaction_count: insertedCount })
      .eq('id', id)

    return apiSuccess({ status: 'complete', transaction_count: insertedCount })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Processing failed'
    await supabase.from('bank_statements').update({ status: 'failed', import_error: message }).eq('id', id)
    return apiError(message, 'INTERNAL_ERROR', 500)
  }
}
