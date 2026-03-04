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
    { count: totalTracked },
    { count: totalReceipts },
    { count: processedReceipts },
    { count: failedReceipts },
    { count: categorizedTx },
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
      .eq('user_id', user.id),
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
    supabase
      .from('bank_transactions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_duplicate', false),
    supabase
      .from('receipts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id),
    supabase
      .from('receipts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'complete'),
    supabase
      .from('receipts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'failed'),
    supabase
      .from('bank_transactions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_duplicate', false)
      .not('category', 'is', null),
  ])

  const txList = transactions ?? []
  const receiptList = receipts ?? []
  const total = totalTracked ?? 0
  const matched = matchedCount ?? 0
  const totalRec = totalReceipts ?? 0
  const processed = processedReceipts ?? 0
  const failed = failedReceipts ?? 0
  const categorized = categorizedTx ?? 0

  // Tax paid from complete receipts
  const totalTaxPaid = receiptList
    .filter((r) => r.status === 'complete')
    .reduce((sum, r) => sum + (r.gst_hst_amount ?? 0) + (r.pst_amount ?? 0), 0)

  // Health metrics
  const matchRate = total > 0 ? Math.round((matched / total) * 100) : 0
  const processingSuccessRate = totalRec > 0 ? Math.round((processed / totalRec) * 100) : 100
  const categorizationRate = total > 0 ? Math.round((categorized / total) * 100) : 0

  // Overall health = weighted average of match rate (40%), processing (40%), categorization (20%)
  const overallHealthScore = Math.round(matchRate * 0.4 + processingSuccessRate * 0.4 + categorizationRate * 0.2)
  const healthLabel =
    overallHealthScore >= 90 ? 'Excellent' :
    overallHealthScore >= 75 ? 'Good' :
    overallHealthScore >= 55 ? 'Moderate' :
    overallHealthScore >= 35 ? 'Fair' : 'Needs Attention'

  // 6-month spending trend
  const monthlyMap: Record<string, number> = {}
  for (let i = 5; i >= 0; i--) {
    monthlyMap[format(subMonths(new Date(), i), 'MMM yyyy')] = 0
  }
  for (const tx of txList) {
    if (tx.amount < 0) {
      const key = format(new Date(tx.transaction_date), 'MMM yyyy')
      if (key in monthlyMap) monthlyMap[key] = +(monthlyMap[key] + Math.abs(tx.amount)).toFixed(2)
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

  // Top vendors
  const { data: allTx } = await supabase
    .from('bank_transactions')
    .select('description, amount, transaction_date')
    .eq('user_id', user.id)
    .eq('is_duplicate', false)
    .lt('amount', 0)

  const vendorMap: Record<string, { amount: number; count: number; lastDate: string }> = {}
  for (const tx of allTx ?? []) {
    const vendor = tx.description.split(/\s{2,}|\*|#/)[0].trim().slice(0, 40)
    if (!vendorMap[vendor]) vendorMap[vendor] = { amount: 0, count: 0, lastDate: tx.transaction_date }
    vendorMap[vendor].amount = +(vendorMap[vendor].amount + Math.abs(tx.amount)).toFixed(2)
    vendorMap[vendor].count += 1
    if (tx.transaction_date > vendorMap[vendor].lastDate) vendorMap[vendor].lastDate = tx.transaction_date
  }
  const topVendors = Object.entries(vendorMap)
    .map(([vendor, v]) => ({ vendor, amount: v.amount, transactions: v.count, lastDate: v.lastDate }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 10)

  // Recent activity with match and receipt info
  const { data: recentTx } = await supabase
    .from('bank_transactions')
    .select('id, transaction_date, description, amount, category, reconciliation_matches(receipt_id, receipts(status, vendor_name))')
    .eq('user_id', user.id)
    .eq('is_duplicate', false)
    .order('transaction_date', { ascending: false })
    .limit(10)

  const recentActivity = (recentTx ?? []).map((tx) => {
    const match = Array.isArray(tx.reconciliation_matches) ? tx.reconciliation_matches[0] : null
    const receipt = match?.receipts as { status?: string; vendor_name?: string } | null ?? null
    return {
      id: tx.id,
      transaction_date: tx.transaction_date,
      vendor: tx.description.split(/\s{2,}|\*|#/)[0].trim().slice(0, 40),
      amount: tx.amount,
      category: tx.category,
      matched: !!match,
      hasReceipt: !!receipt,
      receiptStatus: receipt?.status ?? null,
    }
  })

  return apiSuccess({
    stats: {
      matched,
      unmatched: unmatchedCount ?? 0,
      totalTracked: total,
      totalTaxPaid: +totalTaxPaid.toFixed(2),
      totalReceipts: totalRec,
      totalTransactions: total,
    },
    health: {
      overallScore: overallHealthScore,
      overallLabel: healthLabel,
      matchRate,
      processingSuccessRate,
      processedReceipts: processed,
      totalReceipts: totalRec,
      failedReceipts: failed,
      categorizationRate,
    },
    spendingTrend,
    categoryBreakdown,
    topVendors,
    recentActivity,
  })
}
