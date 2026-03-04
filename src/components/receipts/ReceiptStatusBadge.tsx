'use client'

import { Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface ReceiptStatusBadgeProps {
  status: 'pending' | 'processing' | 'complete' | 'failed'
  onRetry?: () => void
}

export default function ReceiptStatusBadge({ status, onRetry }: ReceiptStatusBadgeProps) {
  if (status === 'pending') {
    return <Badge variant="outline">Pending</Badge>
  }
  if (status === 'processing') {
    return (
      <Badge variant="secondary" className="gap-1">
        <Loader2 className="h-3 w-3 animate-spin" />
        Processing
      </Badge>
    )
  }
  if (status === 'complete') {
    return (
      <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
        Complete
      </Badge>
    )
  }
  return (
    <div className="flex items-center gap-1">
      <Badge variant="destructive">Failed</Badge>
      {onRetry && (
        <Button variant="ghost" size="sm" onClick={onRetry} className="h-6 px-2 text-xs">
          Retry
        </Button>
      )}
    </div>
  )
}
