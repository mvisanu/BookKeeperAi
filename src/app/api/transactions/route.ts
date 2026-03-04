import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { apiSuccess, apiError } from '@/lib/api/response'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiError('Unauthenticated', 'UNAUTHENTICATED', 401)

  const { searchParams } = new URL(request.url)
  const card_last4 = searchParams.get('card_last4')
  const date_from = searchParams.get('date_from')
  const date_to = searchParams.get('date_to')
  const amount_min = searchParams.get('amount_min')
  const amount_max = searchParams.get('amount_max')
  const statement_id = searchParams.get('statement_id')
  const unmatched_only = searchParams.get('unmatched_only') === 'true'
  const page = parseInt(searchParams.get('page') ?? '1', 10)
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '100', 10), 500)
  const offset = (page - 1) * limit

  let query = supabase
    .from('bank_transactions')
    .select('*, reconciliation_matches!bank_transaction_id(id)', { count: 'exact' })
    .eq('user_id', user.id)
    .order('transaction_date', { ascending: false })
    .range(offset, offset + limit - 1)

  if (card_last4) query = query.eq('card_last4', card_last4)
  if (date_from) query = query.gte('transaction_date', date_from)
  if (date_to) query = query.lte('transaction_date', date_to)
  if (amount_min) query = query.gte('amount', parseFloat(amount_min))
  if (amount_max) query = query.lte('amount', parseFloat(amount_max))
  if (statement_id) query = query.eq('statement_id', statement_id)

  const { data, error, count } = await query
  if (error) return apiError(error.message, 'INTERNAL_ERROR', 500)

  let transactions = (data ?? []).map((tx: Record<string, unknown>) => ({
    ...tx,
    is_matched: Array.isArray(tx.reconciliation_matches) && (tx.reconciliation_matches as unknown[]).length > 0,
    reconciliation_matches: undefined,
  }))

  if (unmatched_only) {
    transactions = transactions.filter((tx) => !tx.is_matched)
  }

  return apiSuccess({ data: transactions, total: count ?? 0 })
}
