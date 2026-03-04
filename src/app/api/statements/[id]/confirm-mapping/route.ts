import { NextRequest } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { apiSuccess, apiError } from '@/lib/api/response'

const MappingSchema = z.object({
  date_col: z.string().min(1),
  description_col: z.string().min(1),
  amount_col: z.string().optional(),
  debit_col: z.string().optional(),
  credit_col: z.string().optional(),
  card_last4: z.string().regex(/^\d{4}$/),
}).refine(
  (d) => d.amount_col || (d.debit_col && d.credit_col),
  'Either amount_col or both debit_col and credit_col must be provided'
)

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiError('Unauthenticated', 'UNAUTHENTICATED', 401)

  const body = await request.json()
  const parsed = MappingSchema.safeParse(body)
  if (!parsed.success) {
    return apiError(parsed.error.issues[0].message, 'VALIDATION_ERROR', 400)
  }

  const { data: stmt, error: fetchError } = await supabase
    .from('bank_statements')
    .select('storage_path, file_mime_type')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (fetchError || !stmt) return apiError('Statement not found', 'NOT_FOUND', 404)

  await supabase
    .from('bank_statements')
    .update({ csv_column_mapping: parsed.data, status: 'processing', card_last4: parsed.data.card_last4 })
    .eq('id', id)

  try {
    const edgeFnUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/process-statement`
    await fetch(edgeFnUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({
        statement_id: id,
        storage_path: stmt.storage_path,
        mime_type: stmt.file_mime_type,
        csv_mapping: parsed.data,
      }),
    })
  } catch {
    // Non-fatal
  }

  return apiSuccess({ status: 'processing' })
}
