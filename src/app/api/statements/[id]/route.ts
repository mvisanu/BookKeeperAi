import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { apiError } from '@/lib/api/response'

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiError('Unauthenticated', 'UNAUTHENTICATED', 401)

  const { data: stmt, error: fetchError } = await supabase
    .from('bank_statements')
    .select('storage_path')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (fetchError || !stmt) return apiError('Statement not found', 'NOT_FOUND', 404)

  await supabase.storage.from('bank-statements').remove([stmt.storage_path])
  await supabase.from('bank_statements').delete().eq('id', id)

  return new Response(null, { status: 204 })
}
