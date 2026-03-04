'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface ReceiptDeleteConfirmProps {
  receiptId: string | null
  fileName: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onDeleted: (id: string) => void
}

export default function ReceiptDeleteConfirm({
  receiptId,
  fileName,
  open,
  onOpenChange,
  onDeleted,
}: ReceiptDeleteConfirmProps) {
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    if (!receiptId) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/receipts/${receiptId}`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json()
        toast.error(err.error ?? 'Delete failed')
        return
      }
      toast.success('Receipt deleted')
      onDeleted(receiptId)
      onOpenChange(false)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete receipt?</DialogTitle>
          <DialogDescription>
            &quot;{fileName}&quot; will be permanently deleted. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
            {deleting ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
