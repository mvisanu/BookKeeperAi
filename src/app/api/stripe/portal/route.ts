import { createClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe'
import { apiSuccess, apiError } from '@/lib/api/response'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiError('Unauthenticated', 'UNAUTHENTICATED', 401)

  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', user.id)
    .single()

  if (!profile?.stripe_customer_id) {
    return apiError('No billing account found. Please subscribe to a plan first.', 'NO_CUSTOMER', 404)
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3005'

  const session = await stripe.billingPortal.sessions.create({
    customer: profile.stripe_customer_id as string,
    return_url: `${appUrl}/billing`,
  })

  return apiSuccess({ url: session.url })
}
