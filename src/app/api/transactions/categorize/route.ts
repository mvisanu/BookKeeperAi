import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { categorizeBatch } from '@/lib/gemini'
import { apiSuccess, apiError } from '@/lib/api/response'

const BATCH_SIZE = 50

export async function POST(_request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiError('Unauthenticated', 'UNAUTHENTICATED', 401)

  // Fetch all uncategorized transactions
  const { data: transactions, error } = await supabase
    .from('bank_transactions')
    .select('id, description, amount')
    .eq('user_id', user.id)
    .eq('is_duplicate', false)
    .is('category', null)

  if (error) return apiError(error.message, 'INTERNAL_ERROR', 500)
  if (!transactions || transactions.length === 0) {
    return apiSuccess({ categorized: 0, message: 'All transactions already categorized' })
  }

  let totalCategorized = 0

  // Process in batches
  for (let i = 0; i < transactions.length; i += BATCH_SIZE) {
    const batch = transactions.slice(i, i + BATCH_SIZE)

    try {
      const results = await categorizeBatch(batch)

      // Bulk update each result
      for (const { id, category } of results) {
        await supabase
          .from('bank_transactions')
          .update({ category })
          .eq('id', id)
          .eq('user_id', user.id)
        totalCategorized++
      }
    } catch {
      // Continue with next batch if one fails
    }
  }

  return apiSuccess({ categorized: totalCategorized, total: transactions.length })
}
