'use client'

import { useEffect } from 'react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

interface ImportProgressToastProps {
  statementId: string
}

export default function ImportProgressToast({ statementId }: ImportProgressToastProps) {
  useEffect(() => {
    const supabase = createClient()
    const toastId = `import-${statementId}`

    const channel = supabase
      .channel(`statement-${statementId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'bank_statements',
          filter: `id=eq.${statementId}`,
        },
        (payload) => {
          const { status, transaction_count, import_error } = payload.new as {
            status: string
            transaction_count: number
            import_error: string | null
          }

          if (status === 'processing') {
            toast.loading(`Importing… ${transaction_count} transactions`, { id: toastId })
          } else if (status === 'complete') {
            toast.success(`Import complete — ${transaction_count} transactions imported`, {
              id: toastId,
            })
          } else if (status === 'failed') {
            toast.error(import_error ?? 'Import failed', { id: toastId })
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [statementId])

  return null
}
