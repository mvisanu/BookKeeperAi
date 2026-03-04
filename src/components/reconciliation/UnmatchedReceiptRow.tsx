import type { Receipt } from '@/types'

interface UnmatchedReceiptRowProps {
  receipt: Receipt
}

export default function UnmatchedReceiptRow({ receipt }: UnmatchedReceiptRowProps) {
  return (
    <div className="flex items-center rounded-lg border bg-muted/30 p-3">
      <div>
        <p className="text-sm font-medium">{receipt.vendor_name ?? 'Unknown vendor'}</p>
        <p className="text-xs text-muted-foreground">
          {receipt.transaction_date ?? '—'} · $
          {receipt.total_amount?.toFixed(2) ?? '—'}
          {receipt.category ? ` · ${receipt.category}` : ''}
        </p>
      </div>
    </div>
  )
}
