import { createClient } from '@/lib/supabase/server'
import { apiError } from '@/lib/api/response'
import { NextResponse } from 'next/server'
import { startOfMonth, subMonths, format } from 'date-fns'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiError('Unauthenticated', 'UNAUTHENTICATED', 401)

  const sixMonthsAgo = format(subMonths(startOfMonth(new Date()), 5), 'yyyy-MM-dd')
  const thisMonthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd')

  // Fetch all raw data in parallel
  const [
    { data: allTransactions },
    { data: allReceipts },
    { data: allMatches },
    { data: thisMonthTx },
    { data: recentTx },
  ] = await Promise.all([
    supabase
      .from('bank_transactions')
      .select('id, transaction_date, amount, description, category')
      .eq('user_id', user.id)
      .eq('is_duplicate', false)
      .order('transaction_date', { ascending: false }),
    supabase
      .from('receipts')
      .select('id, status, gst_hst_amount, pst_amount')
      .eq('user_id', user.id),
    supabase
      .from('reconciliation_matches')
      .select('bank_transaction_id, receipt_id')
      .eq('user_id', user.id),
    supabase
      .from('bank_transactions')
      .select('id, amount, category')
      .eq('user_id', user.id)
      .eq('is_duplicate', false)
      .gte('transaction_date', thisMonthStart)
      .lt('amount', 0),
    supabase
      .from('bank_transactions')
      .select('id, transaction_date, description, amount, category')
      .eq('user_id', user.id)
      .eq('is_duplicate', false)
      .order('transaction_date', { ascending: false })
      .limit(10),
  ])

  const txList = allTransactions ?? []
  const receiptList = allReceipts ?? []
  const matchList = allMatches ?? []

  // Build lookup sets
  const matchedTxIds = new Set(matchList.map((m) => m.bank_transaction_id))
  const matchedReceiptIds = new Set(matchList.map((m) => m.receipt_id))

  // Stats
  const totalTransactions = txList.length
  const totalReceipts = receiptList.length
  const matchedCount = matchList.length
  const unmatchedCount = totalTransactions - matchedCount
  const processedReceipts = receiptList.filter((r) => r.status === 'complete').length
  const failedReceipts = receiptList.filter((r) => r.status === 'failed').length
  const categorizedTx = txList.filter((t) => t.category).length
  const totalTaxPaid = receiptList
    .filter((r) => r.status === 'complete')
    .reduce((sum, r) => sum + (r.gst_hst_amount ?? 0) + (r.pst_amount ?? 0), 0)

  // Health metrics
  const matchRate = totalTransactions > 0 ? Math.round((matchedCount / totalTransactions) * 100) : 0
  const processingSuccessRate = totalReceipts > 0 ? Math.round((processedReceipts / totalReceipts) * 100) : 100
  const categorizationRate = totalTransactions > 0 ? Math.round((categorizedTx / totalTransactions) * 100) : 0
  const overallHealthScore = Math.round(matchRate * 0.4 + processingSuccessRate * 0.4 + categorizationRate * 0.2)
  const overallLabel =
    overallHealthScore >= 90 ? 'Excellent' :
    overallHealthScore >= 75 ? 'Good' :
    overallHealthScore >= 55 ? 'Moderate' :
    overallHealthScore >= 35 ? 'Fair' : 'Needs Attention'

  // 6-month spending trend (debits only)
  const monthlyMap: Record<string, number> = {}
  for (let i = 5; i >= 0; i--) {
    monthlyMap[format(subMonths(new Date(), i), 'MMM yyyy')] = 0
  }
  for (const tx of txList) {
    if (tx.amount < 0) {
      const key = format(new Date(tx.transaction_date + 'T00:00:00'), 'MMM yyyy')
      if (key in monthlyMap) monthlyMap[key] = +(monthlyMap[key] + Math.abs(tx.amount)).toFixed(2)
    }
  }
  const spendingTrend = Object.entries(monthlyMap).map(([month, amount]) => ({ month, amount }))

  // This month by category
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
  const vendorMap: Record<string, { amount: number; count: number; lastDate: string }> = {}
  for (const tx of txList) {
    if (tx.amount >= 0) continue
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

  // Recent activity — enrich with match/receipt status
  const receiptById = new Map(receiptList.map((r) => [r.id, r]))
  const matchByTxId = new Map(matchList.map((m) => [m.bank_transaction_id, m.receipt_id]))

  const recentActivity = (recentTx ?? []).map((tx) => {
    const receiptId = matchByTxId.get(tx.id)
    const receipt = receiptId ? receiptById.get(receiptId) : null
    return {
      id: tx.id,
      transaction_date: tx.transaction_date,
      vendor: tx.description.split(/\s{2,}|\*|#/)[0].trim().slice(0, 40),
      amount: tx.amount,
      category: tx.category,
      matched: matchedTxIds.has(tx.id),
      hasReceipt: !!receipt,
      receiptStatus: receipt?.status ?? null,
    }
  })

  return NextResponse.json({
    data: {
      stats: {
        matched: matchedCount,
        unmatched: unmatchedCount,
        totalTracked: totalTransactions,
        totalTaxPaid: +totalTaxPaid.toFixed(2),
        totalReceipts,
        totalTransactions,
      },
      health: {
        overallScore: overallHealthScore,
        overallLabel,
        matchRate,
        processingSuccessRate,
        processedReceipts,
        totalReceipts,
        failedReceipts,
        categorizationRate,
      },
      spendingTrend,
      categoryBreakdown,
      topVendors,
      recentActivity,
    },
  })
}
