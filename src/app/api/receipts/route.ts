import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { apiSuccess, apiError } from '@/lib/api/response'
import { CreateReceiptSchema } from '@/types'
import type { Database } from '@/types/supabase'

type ReceiptStatus = Database['public']['Enums']['receipt_status']
type ReceiptRow = Database['public']['Tables']['receipts']['Row']

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiError('Unauthenticated', 'UNAUTHENTICATED', 401)

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const page = parseInt(searchParams.get('page') ?? '1', 10)
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50', 10), 200)
  const offset = (page - 1) * limit

  let query = supabase
    .from('receipts')
    .select('*, reconciliation_matches!receipt_id(id)', { count: 'exact' })
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (status) query = query.eq('status', status as ReceiptStatus)

  const { data, error, count } = await query
  if (error) return apiError(error.message, 'INTERNAL_ERROR', 500)

  const receipts = (data ?? []).map((r: Record<string, unknown>) => ({
    ...r,
    is_matched: Array.isArray(r.reconciliation_matches) && (r.reconciliation_matches as unknown[]).length > 0,
    reconciliation_matches: undefined,
  }))

  return apiSuccess({ data: receipts, total: count ?? 0, page })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiError('Unauthenticated', 'UNAUTHENTICATED', 401)

  const body = await request.json()
  const parsed = CreateReceiptSchema.safeParse(body)
  if (!parsed.success) {
    return apiError(parsed.error.issues[0].message, 'VALIDATION_ERROR', 400)
  }

  if (parsed.data.file_size > 10485760) {
    return apiError('File exceeds 10 MB limit', 'FILE_TOO_LARGE', 422)
  }

  const { data: receiptData, error } = await supabase
    .from('receipts')
    .insert({
      user_id: user.id,
      storage_path: parsed.data.storage_path,
      file_name: parsed.data.file_name,
      file_size: parsed.data.file_size,
      file_mime_type: parsed.data.file_mime_type,
      status: 'pending',
    })
    .select()
    .single()

  if (error) return apiError(error.message, 'INTERNAL_ERROR', 500)
  const receipt = receiptData as ReceiptRow

  // Trigger Edge Function
  try {
    const edgeFnUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/process-receipt`
    await fetch(edgeFnUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({
        receipt_id: receipt.id,
        storage_path: parsed.data.storage_path,
        mime_type: parsed.data.file_mime_type,
      }),
    })
  } catch {
    // Non-fatal: Edge Function will retry via status=pending
  }

  return apiSuccess({ id: receipt.id, status: receipt.status }, 201)
}
