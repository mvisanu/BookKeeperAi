import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { apiSuccess, apiError } from '@/lib/api/response'

export async function GET(_request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiError('Unauthenticated', 'UNAUTHENTICATED', 401)

  const { data, error } = await supabase
    .from('reconciliation_matches')
    .select(`
      *,
      transaction:bank_transactions!bank_transaction_id(*),
      receipt:receipts!receipt_id(*)
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return apiError(error.message, 'INTERNAL_ERROR', 500)

  return apiSuccess({ data: data ?? [] })
}
