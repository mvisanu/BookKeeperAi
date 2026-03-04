'use client'

import { toast } from 'sonner'
import { Unlink } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { ReconciliationMatch, BankTransaction, Receipt } from '@/types'

interface MatchedPairRowProps {
  match: ReconciliationMatch & {
    transaction: BankTransaction
    receipt: Receipt
  }
  onUnlinked: (matchId: string) => void
}

export default function MatchedPairRow({ match, onUnlinked }: MatchedPairRowProps) {
  const unlink = async () => {
    const res = await fetch(`/api/reconciliation/matches/${match.id}`, { method: 'DELETE' })
    if (res.ok) {
      toast.success('Match unlinked')
      onUnlinked(match.id)
    } else {
      toast.error('Failed to unlink match')
    }
  }

  return (
    <div className="flex items-center gap-4 rounded-lg border border-green-200 bg-green-50 p-3">
      <div className="flex-1 grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-muted-foreground">Transaction</p>
          <p className="text-sm font-medium">{match.transaction.description}</p>
          <p className="text-xs text-muted-foreground">
            {match.transaction.transaction_date} · ${Math.abs(match.transaction.amount).toFixed(2)}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Receipt</p>
          <p className="text-sm font-medium">{match.receipt.vendor_name ?? 'Unknown vendor'}</p>
          <p className="text-xs text-muted-foreground">
            {match.receipt.transaction_date} · ${match.receipt.total_amount?.toFixed(2) ?? '—'}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Badge
          variant="outline"
          className={`text-xs ${
            match.confidence_score >= 0.9
              ? 'border-green-400 text-green-700'
              : 'border-yellow-400 text-yellow-700'
          }`}
        >
          {Math.round(match.confidence_score * 100)}%
        </Badge>
        <Badge variant="outline" className="text-xs">
          {match.match_type}
        </Badge>
        <Button variant="ghost" size="icon" onClick={unlink} title="Unlink">
          <Unlink className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
