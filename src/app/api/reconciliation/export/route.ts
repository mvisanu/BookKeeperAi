import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { apiError } from '@/lib/api/response'

function csvRow(values: unknown[]): string {
  return values
    .map((v: unknown) => {
      if (v == null) return ''
      const str = String(v)
      return str.includes(',') || str.includes('"') || str.includes('\n')
        ? `"${str.replace(/"/g, '""')}"`
        : str
    })
    .join(',')
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiError('Unauthenticated', 'UNAUTHENTICATED', 401)

  const { searchParams } = new URL(request.url)
  const include = searchParams.get('include') ?? 'all'

  const lines: string[] = [
    'Type,MatchID,TransactionDate,TransactionDescription,TransactionAmount,CardLast4,ReceiptDate,Vendor,ReceiptTotal,Category,ExpenseType,MatchType,ConfidenceScore',
  ]

  if (include === 'all' || include === 'matched') {
    const { data: matches } = await supabase
      .from('reconciliation_matches')
      .select(`
        id, match_type, confidence_score,
        bank_transactions!bank_transaction_id(transaction_date, description, amount, card_last4),
        receipts!receipt_id(transaction_date, vendor_name, total_amount, category, expense_type)
      `)
      .eq('user_id', user.id)

    for (const m of matches ?? []) {
      const tx = m.bank_transactions as Record<string, unknown> | null
      const r = m.receipts as Record<string, unknown> | null
      lines.push(
        csvRow([
          'Matched', m.id,
          tx?.transaction_date, tx?.description, tx?.amount, tx?.card_last4,
          r?.transaction_date, r?.vendor_name, r?.total_amount,
          r?.category, r?.expense_type,
          m.match_type, m.confidence_score,
        ])
      )
    }
  }

  if (include === 'all' || include === 'unmatched') {
    // Unmatched transactions
    const { data: txData } = await supabase
      .from('bank_transactions')
      .select('*, reconciliation_matches!bank_transaction_id(id)')
      .eq('user_id', user.id)
      .eq('is_duplicate', false)

    for (const tx of (txData ?? []) as Record<string, unknown>[]) {
      if (Array.isArray(tx['reconciliation_matches']) && (tx['reconciliation_matches'] as unknown[]).length > 0) continue
      lines.push(
        csvRow([
          'UnmatchedTransaction', '',
          tx['transaction_date'], tx['description'], tx['amount'], tx['card_last4'],
          '', '', '', '', '', '', '',
        ])
      )
    }

    // Unmatched receipts
    const { data: receiptData } = await supabase
      .from('receipts')
      .select('*, reconciliation_matches!receipt_id(id)')
      .eq('user_id', user.id)
      .eq('status', 'complete')

    for (const r of (receiptData ?? []) as Record<string, unknown>[]) {
      if (Array.isArray(r['reconciliation_matches']) && (r['reconciliation_matches'] as unknown[]).length > 0) continue
      lines.push(
        csvRow([
          'UnmatchedReceipt', '',
          '', '', '', '',
          r['transaction_date'], r['vendor_name'], r['total_amount'],
          r['category'], r['expense_type'], '', '',
        ])
      )
    }
  }

  const csv = lines.join('\n')
  return new Response(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="reconciliation.csv"',
    },
  })
}
