'use client'

import { useEffect, useState, useCallback } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Receipt } from '@/types'
import ReceiptStatusBadge from './ReceiptStatusBadge'
import ReceiptEditSheet from './ReceiptEditSheet'
import ReceiptDeleteConfirm from './ReceiptDeleteConfirm'

interface ReceiptTableProps {
  initialReceipts: Receipt[]
}

const TH = ({ children, align = 'left' }: { children: React.ReactNode; align?: 'left' | 'right' }) => (
  <th
    className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider whitespace-nowrap"
    style={{ color: 'oklch(0.45 0.04 262)', textAlign: align }}
  >
    {children}
  </th>
)

const TD = ({ children, align = 'left', className = '' }: { children: React.ReactNode; align?: 'left' | 'right'; className?: string }) => (
  <td
    className={`px-5 py-3 text-sm ${className}`}
    style={{ textAlign: align, color: 'oklch(0.75 0.02 259)' }}
  >
    {children}
  </td>
)

export default function ReceiptTable({ initialReceipts }: ReceiptTableProps) {
  const [receipts, setReceipts] = useState<Receipt[]>(initialReceipts)
  const [editReceipt, setEditReceipt] = useState<Receipt | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteFileName, setDeleteFileName] = useState('')

  const handleRetry = useCallback(async (id: string) => {
    await fetch(`/api/receipts/${id}/retry`, { method: 'POST' })
  }, [])

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('receipts-changes')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'receipts' },
        (payload) => {
          setReceipts((prev) =>
            prev.map((r) =>
              r.id === payload.new.id ? { ...r, ...(payload.new as Partial<Receipt>) } : r
            )
          )
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  if (receipts.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center rounded-xl py-16 text-center"
        style={{ background: 'oklch(1 0 0 / 2%)', border: '1px dashed oklch(1 0 0 / 10%)' }}
      >
        <p className="text-sm" style={{ color: 'oklch(0.45 0.04 262)' }}>
          No receipts yet — upload your first one above.
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="card-premium rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid oklch(1 0 0 / 7%)' }}>
                <TH>Status</TH>
                <TH>File</TH>
                <TH>Vendor</TH>
                <TH>Date</TH>
                <TH align="right">Total</TH>
                <TH align="right">GST/HST</TH>
                <TH>Category</TH>
                <TH align="right">Actions</TH>
              </tr>
            </thead>
            <tbody>
              {receipts.map((receipt, i) => (
                <tr
                  key={receipt.id}
                  className="transition-colors"
                  style={{ borderBottom: i < receipts.length - 1 ? '1px solid oklch(1 0 0 / 5%)' : 'none' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'oklch(1 0 0 / 3%)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = '')}
                >
                  <TD>
                    <ReceiptStatusBadge status={receipt.status} onRetry={() => handleRetry(receipt.id)} />
                  </TD>
                  <TD>
                    <span className="max-w-[160px] truncate block" style={{ color: 'oklch(0.65 0.04 262)' }}>
                      {receipt.file_name}
                    </span>
                  </TD>
                  <td className="px-5 py-3">
                    {receipt.vendor_name
                      ? <span className="text-sm font-medium" style={{ color: 'oklch(0.82 0.02 259)' }}>{receipt.vendor_name}</span>
                      : <span style={{ color: 'oklch(0.38 0.04 262)' }}>—</span>}
                  </td>
                  <td className="px-5 py-3 text-sm nums whitespace-nowrap" style={{ color: 'oklch(0.65 0.04 262)' }}>
                    {receipt.transaction_date ?? <span style={{ color: 'oklch(0.38 0.04 262)' }}>—</span>}
                  </td>
                  <td className="px-5 py-3 text-right nums font-semibold">
                    {receipt.total_amount != null
                      ? <span style={{ color: '#27C5F5' }}>${receipt.total_amount.toFixed(2)}</span>
                      : <span style={{ color: 'oklch(0.38 0.04 262)' }}>—</span>}
                  </td>
                  <td className="px-5 py-3 text-right nums text-sm" style={{ color: 'oklch(0.65 0.04 262)' }}>
                    {receipt.gst_hst_amount != null
                      ? `$${receipt.gst_hst_amount.toFixed(2)}`
                      : <span style={{ color: 'oklch(0.38 0.04 262)' }}>—</span>}
                  </td>
                  <td className="px-5 py-3">
                    {receipt.category
                      ? <span
                          className="inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium"
                          style={{ background: 'rgba(39,197,245,0.08)', color: '#27C5F5' }}
                        >
                          {receipt.category}
                        </span>
                      : <span style={{ color: 'oklch(0.38 0.04 262)' }} className="text-sm">—</span>}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => setEditReceipt(receipt)}
                        className="rounded-md p-1.5 transition-colors"
                        style={{ color: 'oklch(0.48 0.04 262)' }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(39,197,245,0.1)'
                          e.currentTarget.style.color = '#27C5F5'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = ''
                          e.currentTarget.style.color = 'oklch(0.48 0.04 262)'
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          setDeleteId(receipt.id)
                          setDeleteFileName(receipt.file_name)
                        }}
                        className="rounded-md p-1.5 transition-colors"
                        style={{ color: 'oklch(0.48 0.04 262)' }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(255,71,87,0.1)'
                          e.currentTarget.style.color = '#FF4757'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = ''
                          e.currentTarget.style.color = 'oklch(0.48 0.04 262)'
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ReceiptEditSheet
        receipt={editReceipt}
        open={!!editReceipt}
        onOpenChange={(o) => !o && setEditReceipt(null)}
        onSave={(updated) =>
          setReceipts((prev) => prev.map((r) => (r.id === updated.id ? updated : r)))
        }
      />

      <ReceiptDeleteConfirm
        receiptId={deleteId}
        fileName={deleteFileName}
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
        onDeleted={(id) => setReceipts((prev) => prev.filter((r) => r.id !== id))}
      />
    </>
  )
}
