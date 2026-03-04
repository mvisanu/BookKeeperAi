'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Loader2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'

export default function ReprocessButton({ pendingCount }: { pendingCount: number }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleReprocess = async () => {
    setLoading(true)
    const toastId = 'reprocess'
    toast.loading(`Processing ${pendingCount} receipt${pendingCount === 1 ? '' : 's'} with Gemini AI…`, { id: toastId })

    try {
      const res = await fetch('/api/receipts/reprocess', { method: 'POST' })
      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error ?? 'Reprocessing failed', { id: toastId })
        return
      }

      toast.success(
        `Done — ${data.processed} processed${data.failed > 0 ? `, ${data.failed} failed` : ''}`,
        { id: toastId }
      )
      router.refresh()
    } catch {
      toast.error('Reprocessing failed', { id: toastId })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      onClick={handleReprocess}
      disabled={loading}
      variant="outline"
      className="shrink-0 gap-2 border-[#27C5F5] text-[#27C5F5] hover:bg-[rgba(39,197,245,0.1)]"
    >
      {loading ? (
        <><Loader2 className="h-4 w-4 animate-spin" />Processing…</>
      ) : (
        <><RefreshCw className="h-4 w-4" />Reprocess {pendingCount} Pending</>
      )}
    </Button>
  )
}
