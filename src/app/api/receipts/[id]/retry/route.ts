import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { apiSuccess, apiError } from '@/lib/api/response'
import type { Database } from '@/types/supabase'

type ReceiptRow = Database['public']['Tables']['receipts']['Row']

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiError('Unauthenticated', 'UNAUTHENTICATED', 401)

  const { data: receiptData, error } = await supabase
    .from('receipts')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (error || !receiptData) return apiError('Receipt not found', 'NOT_FOUND', 404)
  const receipt = receiptData as ReceiptRow
  if (receipt.status !== 'failed') {
    return apiError('Receipt is not in failed state', 'CONFLICT', 409)
  }

  await supabase.from('receipts').update({ status: 'processing' }).eq('id', id)

  try {
    const edgeFnUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/process-receipt`
    await fetch(edgeFnUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({
        receipt_id: id,
        storage_path: receipt.storage_path,
        mime_type: receipt.file_mime_type,
      }),
    })
  } catch {
    // Non-fatal
  }

  return apiSuccess({ status: 'processing' })
}
