import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { runAutoMatch } from '@/lib/matching'
import { apiSuccess, apiError } from '@/lib/api/response'
import type { BankTransaction, Receipt } from '@/types'

export async function POST(_request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiError('Unauthenticated', 'UNAUTHENTICATED', 401)

  // Fetch unmatched transactions
  const { data: txData } = await supabase
    .from('bank_transactions')
    .select('*, reconciliation_matches!bank_transaction_id(id)')
    .eq('user_id', user.id)
    .eq('is_duplicate', false)

  // Fetch unmatched complete receipts
  const { data: receiptData } = await supabase
    .from('receipts')
    .select('*, reconciliation_matches!receipt_id(id)')
    .eq('user_id', user.id)
    .eq('status', 'complete')
    .not('total_amount', 'is', null)
    .not('transaction_date', 'is', null)

  const unmatchedTx: BankTransaction[] = (txData ?? [])
    .filter((t: Record<string, unknown>) => !Array.isArray(t.reconciliation_matches) || (t.reconciliation_matches as unknown[]).length === 0)
    .map((t: Record<string, unknown>) => ({ ...t, is_matched: false, reconciliation_matches: undefined })) as unknown as BankTransaction[]

  const unmatchedReceipts: Receipt[] = (receiptData ?? [])
    .filter((r: Record<string, unknown>) => !Array.isArray(r.reconciliation_matches) || (r.reconciliation_matches as unknown[]).length === 0)
    .map((r: Record<string, unknown>) => ({ ...r, is_matched: false, reconciliation_matches: undefined })) as unknown as Receipt[]

  const matchCandidates = runAutoMatch(unmatchedTx, unmatchedReceipts)

  if (matchCandidates.length === 0) {
    return apiSuccess({
      matched_count: 0,
      unmatched_transactions: unmatchedTx.length,
      unmatched_receipts: unmatchedReceipts.length,
      matches: [],
    })
  }

  // Bulk insert matches
  const { data: insertedMatches, error } = await supabase
    .from('reconciliation_matches')
    .insert(
      matchCandidates.map((m) => ({
        ...m,
        user_id: user.id,
      }))
    )
    .select()

  if (error) return apiError(error.message, 'INTERNAL_ERROR', 500)

  return apiSuccess({
    matched_count: insertedMatches?.length ?? 0,
    unmatched_transactions: unmatchedTx.length - (insertedMatches?.length ?? 0),
    unmatched_receipts: unmatchedReceipts.length - (insertedMatches?.length ?? 0),
    matches: insertedMatches ?? [],
  })
}
