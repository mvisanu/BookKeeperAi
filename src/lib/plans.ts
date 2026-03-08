import { createClient } from '@/lib/supabase/server'
import { PLANS, type PlanTier } from '@/lib/stripe'
import { startOfMonth } from 'date-fns'

export interface PlanStatus {
  tier: PlanTier
  receiptsThisMonth: number
  statementsThisMonth: number
  limits: {
    receiptsPerMonth: number | null
    statementsPerMonth: number | null
  }
}

/** Returns the current user's plan tier from the profiles table. */
export async function getUserPlan(userId: string): Promise<PlanTier> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('profiles')
    .select('plan, plan_expires_at')
    .eq('id', userId)
    .single()

  if (!data) return 'free'

  // If subscription has expired, fall back to free
  if (data.plan !== 'free' && data.plan_expires_at) {
    if (new Date(data.plan_expires_at) < new Date()) return 'free'
  }

  return (data.plan as PlanTier) ?? 'free'
}

/** Checks whether a user can upload another receipt given their plan limits. */
export async function canUploadReceipt(userId: string): Promise<{ allowed: boolean; reason?: string }> {
  const supabase = await createClient()
  const tier = await getUserPlan(userId)
  const limit = PLANS[tier].limits.receiptsPerMonth
  if (limit === null) return { allowed: true }

  const since = startOfMonth(new Date()).toISOString()
  const { count } = await supabase
    .from('receipts')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', since)

  if ((count ?? 0) >= limit) {
    return {
      allowed: false,
      reason: `Your ${PLANS[tier].name} plan allows ${limit} receipts per month. Upgrade to upload more.`,
    }
  }
  return { allowed: true }
}

/** Checks whether a user can upload another bank statement given their plan limits. */
export async function canUploadStatement(userId: string): Promise<{ allowed: boolean; reason?: string }> {
  const supabase = await createClient()
  const tier = await getUserPlan(userId)
  const limit = PLANS[tier].limits.statementsPerMonth
  if (limit === null) return { allowed: true }

  const since = startOfMonth(new Date()).toISOString()
  const { count } = await supabase
    .from('bank_statements')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', since)

  if ((count ?? 0) >= limit) {
    return {
      allowed: false,
      reason: `Your ${PLANS[tier].name} plan allows ${limit} bank statement per month. Upgrade to upload more.`,
    }
  }
  return { allowed: true }
}
