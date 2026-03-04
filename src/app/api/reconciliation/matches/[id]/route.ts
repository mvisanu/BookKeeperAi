import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { apiError } from '@/lib/api/response'

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiError('Unauthenticated', 'UNAUTHENTICATED', 401)

  const { error } = await supabase
    .from('reconciliation_matches')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return apiError('Match not found', 'NOT_FOUND', 404)

  return new Response(null, { status: 204 })
}
