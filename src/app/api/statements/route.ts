import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { apiSuccess, apiError } from '@/lib/api/response'
import { canUploadStatement } from '@/lib/plans'
import { CreateStatementSchema } from '@/types'
import type { Database } from '@/types/supabase'

type StatementRow = Database['public']['Tables']['bank_statements']['Row']

export async function GET(_request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiError('Unauthenticated', 'UNAUTHENTICATED', 401)

  const { data, error, count } = await supabase
    .from('bank_statements')
    .select('*', { count: 'exact' })
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return apiError(error.message, 'INTERNAL_ERROR', 500)
  return apiSuccess({ data: data ?? [], total: count ?? 0 })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiError('Unauthenticated', 'UNAUTHENTICATED', 401)

  const body = await request.json()
  const parsed = CreateStatementSchema.safeParse(body)
  if (!parsed.success) {
    return apiError(parsed.error.issues[0].message, 'VALIDATION_ERROR', 400)
  }

  if (parsed.data.file_size > 20971520) {
    return apiError('File exceeds 20 MB limit', 'FILE_TOO_LARGE', 422)
  }

  const planCheck = await canUploadStatement(user.id)
  if (!planCheck.allowed) {
    return apiError(planCheck.reason ?? 'Plan limit reached', 'PLAN_LIMIT_REACHED', 403)
  }

  const isCSV = parsed.data.file_mime_type === 'text/csv'

  // Insert statement row
  const { data: statementData, error } = await supabase
    .from('bank_statements')
    .insert({
      user_id: user.id,
      storage_path: parsed.data.storage_path,
      file_name: parsed.data.file_name,
      file_size: parsed.data.file_size,
      file_mime_type: parsed.data.file_mime_type,
      card_last4: parsed.data.card_last4 ?? null,
      status: isCSV ? 'awaiting_mapping' : 'pending',
    })
    .select()
    .single()

  if (error) return apiError(error.message, 'INTERNAL_ERROR', 500)
  const statement = statementData as StatementRow

  if (isCSV) {
    // Auto-detect column mapping
    try {
      const mappingRes = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL}/api/map-csv-columns`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Cookie: request.headers.get('cookie') ?? '' },
          body: JSON.stringify({ storage_path: parsed.data.storage_path }),
        }
      )
      const csvMapping = mappingRes.ok ? await mappingRes.json() : null
      return apiSuccess({ id: statement.id, status: 'awaiting_mapping', csv_column_mapping: csvMapping }, 201)
    } catch {
      return apiSuccess({ id: statement.id, status: 'awaiting_mapping' }, 201)
    }
  }

  // PDF/image — trigger Edge Function
  try {
    const edgeFnUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/process-statement`
    await fetch(edgeFnUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({
        statement_id: statement.id,
        storage_path: parsed.data.storage_path,
        mime_type: parsed.data.file_mime_type,
      }),
    })
  } catch {
    // Non-fatal
  }

  return apiSuccess({ id: statement.id, status: 'processing' }, 201)
}
