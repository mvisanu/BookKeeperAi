import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { apiSuccess, apiError } from '@/lib/api/response'
import { ManualMatchSchema } from '@/types'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiError('Unauthenticated', 'UNAUTHENTICATED', 401)

  const body = await request.json()
  const parsed = ManualMatchSchema.safeParse(body)
  if (!parsed.success) {
    return apiError(parsed.error.issues[0].message, 'VALIDATION_ERROR', 400)
  }

  // Check both are unmatched
  const { data: existingMatch } = await supabase
    .from('reconciliation_matches')
    .select('id')
    .or(
      `bank_transaction_id.eq.${parsed.data.bank_transaction_id},receipt_id.eq.${parsed.data.receipt_id}`
    )
    .limit(1)
    .single()

  if (existingMatch) {
    return apiError('One or both items are already matched', 'CONFLICT', 409)
  }

  const { data: match, error } = await supabase
    .from('reconciliation_matches')
    .insert({
      user_id: user.id,
      bank_transaction_id: parsed.data.bank_transaction_id,
      receipt_id: parsed.data.receipt_id,
      match_type: 'manual',
      confidence_score: 1.0,
    })
    .select()
    .single()

  if (error) return apiError(error.message, 'INTERNAL_ERROR', 500)

  return apiSuccess(match, 201)
}
