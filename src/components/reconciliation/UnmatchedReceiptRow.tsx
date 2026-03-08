import type { Receipt } from '@/types'

interface UnmatchedReceiptRowProps {
  receipt: Receipt
}

export default function UnmatchedReceiptRow({ receipt }: UnmatchedReceiptRowProps) {
  return (
    <div
      className="flex items-center rounded-xl p-3"
      style={{
        background: 'oklch(1 0 0 / 2%)',
        border: '1px solid oklch(1 0 0 / 7%)',
      }}
    >
      <div>
        <p className="text-sm font-medium" style={{ color: 'oklch(0.75 0.02 259)' }}>
          {receipt.vendor_name ?? 'Unknown vendor'}
        </p>
        <p className="text-xs mt-0.5 nums" style={{ color: 'oklch(0.48 0.04 262)' }}>
          {receipt.transaction_date ?? '—'} · $
          {receipt.total_amount?.toFixed(2) ?? '—'}
          {receipt.category ? ` · ${receipt.category}` : ''}
        </p>
      </div>
    </div>
  )
}
