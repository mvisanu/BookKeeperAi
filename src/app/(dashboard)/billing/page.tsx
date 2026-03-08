import { createClient } from '@/lib/supabase/server'
import { PLANS, type PlanTier } from '@/lib/stripe'
import { BillingPageClient } from '@/components/billing/BillingPageClient'

export const metadata = { title: 'Billing — BookKeeperAI' }

export default async function BillingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('plan, plan_expires_at, stripe_customer_id, stripe_subscription_id')
    .eq('id', user.id)
    .single()

  const currentTier = (profile?.plan ?? 'free') as PlanTier

  // Treat expired paid plans as free
  const isExpired =
    currentTier !== 'free' &&
    profile?.plan_expires_at &&
    new Date(profile.plan_expires_at as string) < new Date()

  const effectiveTier: PlanTier = isExpired ? 'free' : currentTier
  const hasSubscription = !!profile?.stripe_subscription_id

  return (
    <BillingPageClient
      currentTier={effectiveTier}
      hasSubscription={hasSubscription}
      plans={Object.values(PLANS)}
    />
  )
}
