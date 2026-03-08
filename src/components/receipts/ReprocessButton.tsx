'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Loader2, RefreshCw } from 'lucide-react'
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
    <button
      onClick={handleReprocess}
      disabled={loading}
      className="shrink-0 inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-150"
      style={{
        background: 'oklch(1 0 0 / 5%)',
        border: '1px solid rgba(39,197,245,0.3)',
        color: '#27C5F5',
        opacity: loading ? 0.6 : 1,
      }}
      onMouseEnter={(e) => {
        if (!loading) e.currentTarget.style.background = 'rgba(39,197,245,0.08)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'oklch(1 0 0 / 5%)'
      }}
    >
      {loading ? (
        <><Loader2 className="h-3.5 w-3.5 animate-spin" />Processing…</>
      ) : (
        <><RefreshCw className="h-3.5 w-3.5" />Reprocess {pendingCount} Pending</>
      )}
    </button>
  )
}
