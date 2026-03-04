import { createClient } from '@/lib/supabase/server'
import { apiSuccess, apiError } from '@/lib/api/response'
import { startOfMonth, subMonths, format } from 'date-fns'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiError('Unauthenticated', 'UNAUTHENTICATED', 401)

  const sixMonthsAgo = format(subMonths(startOfMonth(new Date()), 5), 'yyyy-MM-dd')
  const thisMonthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd')

  const [
    { data: transactions },
    { data: receipts },
    { count: matchedCount },
    { count: unmatchedCount },
  ] = await Promise.all([
    supabase
      .from('bank_transactions')
      .select('transaction_date, amount, description, category')
      .eq('user_id', user.id)
      .eq('is_duplicate', false)
      .gte('transaction_date', sixMonthsAgo)
      .order('transaction_date', { ascending: true }),
    supabase
      .from('receipts')
      .select('gst_hst_amount, pst_amount, status')
      .eq('user_id', user.id)
      .eq('status', 'complete'),
    supabase
      .from('reconciliation_matches')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id),
    supabase
      .from('bank_transactions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_duplicate', false)
      .not('id', 'in', '(select bank_transaction_id from reconciliation_matches)'),
  ])

  const txList = transactions ?? []
  const receiptList = receipts ?? []

  // Total tax paid from receipts
  const totalTaxPaid = receiptList.reduce((sum, r) => {
    return sum + (r.gst_hst_amount ?? 0) + (r.pst_amount ?? 0)
  }, 0)

  // Total items tracked = all non-duplicate transactions
  const { count: totalTracked } = await supabase
    .from('bank_transactions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('is_duplicate', false)

  // 6-month spending trend (debits only, grouped by month)
  const monthlyMap: Record<string, number> = {}
  for (let i = 5; i >= 0; i--) {
    const key = format(subMonths(new Date(), i), 'MMM yyyy')
    monthlyMap[key] = 0
  }
  for (const tx of txList) {
    if (tx.amount < 0) {
      const key = format(new Date(tx.transaction_date), 'MMM yyyy')
      if (key in monthlyMap) {
        monthlyMap[key] = +(monthlyMap[key] + Math.abs(tx.amount)).toFixed(2)
      }
    }
  }
  const spendingTrend = Object.entries(monthlyMap).map(([month, amount]) => ({ month, amount }))

  // This month by category
  const { data: thisMonthTx } = await supabase
    .from('bank_transactions')
    .select('amount, category')
    .eq('user_id', user.id)
    .eq('is_duplicate', false)
    .gte('transaction_date', thisMonthStart)
    .lt('amount', 0)

  const categoryMap: Record<string, number> = {}
  for (const tx of thisMonthTx ?? []) {
    const cat = tx.category ?? 'Uncategorized'
    categoryMap[cat] = +((categoryMap[cat] ?? 0) + Math.abs(tx.amount)).toFixed(2)
  }
  const categoryBreakdown = Object.entries(categoryMap)
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 8)

  // Top 5 vendors all time
  const { data: allTx } = await supabase
    .from('bank_transactions')
    .select('description, amount')
    .eq('user_id', user.id)
    .eq('is_duplicate', false)
    .lt('amount', 0)

  const vendorMap: Record<string, number> = {}
  for (const tx of allTx ?? []) {
    const vendor = tx.description.split(/\s{2,}|\*|#/)[0].trim().slice(0, 30)
    vendorMap[vendor] = +((vendorMap[vendor] ?? 0) + Math.abs(tx.amount)).toFixed(2)
  }
  const top5Vendors = Object.entries(vendorMap)
    .map(([vendor, amount]) => ({ vendor, amount }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5)

  // Recent activity (last 10 transactions from all time)
  const { data: recentActivity } = await supabase
    .from('bank_transactions')
    .select('id, transaction_date, description, amount, category')
    .eq('user_id', user.id)
    .eq('is_duplicate', false)
    .order('transaction_date', { ascending: false })
    .limit(10)

  return apiSuccess({
    stats: {
      matched: matchedCount ?? 0,
      unmatched: unmatchedCount ?? 0,
      totalTracked: totalTracked ?? 0,
      totalTaxPaid: +totalTaxPaid.toFixed(2),
    },
    spendingTrend,
    categoryBreakdown,
    top5Vendors,
    recentActivity: recentActivity ?? [],
  })
}
