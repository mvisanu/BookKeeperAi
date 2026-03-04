import type { BankTransaction, Receipt, ReconciliationMatch } from '@/types'

const AMOUNT_TOLERANCE = 0.01
const MAX_DATE_DIFF_DAYS = 3

function dateDiffDays(dateA: string, dateB: string): number {
  const a = new Date(dateA).getTime()
  const b = new Date(dateB).getTime()
  return Math.abs(a - b) / (1000 * 60 * 60 * 24)
}

function confidenceScore(dateDiff: number): number {
  // Exact date = 1.0; 3-day offset = 0.7
  return Math.round((1.0 - (dateDiff / MAX_DATE_DIFF_DAYS) * 0.1) * 1000) / 1000
}

/**
 * Greedy sorted auto-match algorithm.
 * Matches unmatched bank transactions to unmatched receipts by amount + date proximity.
 * Returns an array of ReconciliationMatch rows to insert (without id/user_id/timestamps).
 */
export function runAutoMatch(
  transactions: BankTransaction[],
  receipts: Receipt[]
): Omit<ReconciliationMatch, 'id' | 'user_id' | 'created_at' | 'updated_at'>[] {
  // Sort transactions by (date, abs(amount))
  const sortedTx = [...transactions].sort((a, b) => {
    const dateCmp = a.transaction_date.localeCompare(b.transaction_date)
    if (dateCmp !== 0) return dateCmp
    return Math.abs(a.amount) - Math.abs(b.amount)
  })

  const remainingReceipts = new Map(receipts.map((r) => [r.id, r]))
  const matches: Omit<ReconciliationMatch, 'id' | 'user_id' | 'created_at' | 'updated_at'>[] = []

  for (const tx of sortedTx) {
    const txAmount = Math.abs(tx.amount)

    // Find all candidate receipts
    const candidates: Array<{ receipt: Receipt; dateDiff: number; score: number }> = []

    for (const receipt of remainingReceipts.values()) {
      if (receipt.total_amount === null || receipt.transaction_date === null) continue

      const amountDiff = Math.abs(txAmount - receipt.total_amount)
      if (amountDiff >= AMOUNT_TOLERANCE) continue

      const dateDiff = dateDiffDays(tx.transaction_date, receipt.transaction_date)
      if (dateDiff > MAX_DATE_DIFF_DAYS) continue

      candidates.push({ receipt, dateDiff, score: confidenceScore(dateDiff) })
    }

    if (candidates.length === 0) continue

    // Sort by score desc, then prefer most recently created receipt on tie
    candidates.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      return b.receipt.created_at.localeCompare(a.receipt.created_at)
    })

    const best = candidates[0]
    remainingReceipts.delete(best.receipt.id)

    matches.push({
      bank_transaction_id: tx.id,
      receipt_id: best.receipt.id,
      match_type: 'auto',
      confidence_score: best.score,
    })
  }

  return matches
}
