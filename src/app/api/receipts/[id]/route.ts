import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { apiSuccess, apiError } from '@/lib/api/response'
import { UpdateReceiptSchema } from '@/types'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiError('Unauthenticated', 'UNAUTHENTICATED', 401)

  const { data, error } = await supabase
    .from('receipts')
    .select('*, reconciliation_matches!receipt_id(id)')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (error || !data) return apiError('Receipt not found', 'NOT_FOUND', 404)

  return apiSuccess({
    ...data,
    is_matched: Array.isArray(data.reconciliation_matches) && data.reconciliation_matches.length > 0,
    reconciliation_matches: undefined,
  })
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiError('Unauthenticated', 'UNAUTHENTICATED', 401)

  const body = await request.json()
  const parsed = UpdateReceiptSchema.safeParse(body)
  if (!parsed.success) {
    return apiError(parsed.error.issues[0].message, 'VALIDATION_ERROR', 400)
  }

  const { data, error } = await supabase
    .from('receipts')
    .update(parsed.data)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error || !data) return apiError('Receipt not found', 'NOT_FOUND', 404)

  return apiSuccess(data)
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiError('Unauthenticated', 'UNAUTHENTICATED', 401)

  const { data: receipt, error: fetchError } = await supabase
    .from('receipts')
    .select('storage_path')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (fetchError || !receipt) return apiError('Receipt not found', 'NOT_FOUND', 404)

  // Delete from Storage
  await supabase.storage.from('receipts').remove([receipt.storage_path])

  // Delete DB row (cascades match)
  await supabase.from('receipts').delete().eq('id', id)

  return new Response(null, { status: 204 })
}
