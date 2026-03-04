import { createClient } from '@/lib/supabase/server'
import ReceiptUploadZone from '@/components/receipts/ReceiptUploadZone'
import ReceiptTable from '@/components/receipts/ReceiptTable'
import ReprocessButton from '@/components/receipts/ReprocessButton'
import type { Receipt } from '@/types'

export default async function ReceiptsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: rawReceipts } = await supabase
    .from('receipts')
    .select('*, reconciliation_matches!receipt_id(id)')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false })
    .limit(200)

  const receipts: Receipt[] = (rawReceipts ?? []).map((raw) => {
    const r = raw as Record<string, unknown>
    const matches = r['reconciliation_matches']
    return {
      ...r,
      is_matched: Array.isArray(matches) && matches.length > 0,
      reconciliation_matches: undefined,
    } as unknown as Receipt
  })

  const pendingCount = receipts.filter((r) => r.status === 'pending' || r.status === 'failed').length

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Receipts</h2>
          <p className="text-muted-foreground mt-1">
            Upload receipts and let AI extract the details automatically.
          </p>
        </div>
        {pendingCount > 0 && <ReprocessButton pendingCount={pendingCount} />}
      </div>
      <ReceiptUploadZone />
      <ReceiptTable initialReceipts={receipts} />
    </div>
  )
}
