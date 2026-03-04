import { NextRequest } from 'next/server'
import Papa from 'papaparse'
import { createClient } from '@/lib/supabase/server'
import { detectCsvColumnMapping } from '@/lib/gemini'
import { apiSuccess, apiError } from '@/lib/api/response'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiError('Unauthenticated', 'UNAUTHENTICATED', 401)

  const body = await request.json()
  const { storage_path } = body

  if (!storage_path) {
    return apiError('storage_path is required', 'VALIDATION_ERROR', 400)
  }

  // Download CSV from Storage
  const { data: fileData, error: downloadError } = await supabase.storage
    .from('bank-statements')
    .download(storage_path)

  if (downloadError || !fileData) {
    return apiError('Could not download file', 'INTERNAL_ERROR', 500)
  }

  const csvText = await fileData.text()
  const parsed = Papa.parse(csvText, { header: true, preview: 5, skipEmptyLines: true })
  const headers = parsed.meta.fields ?? []
  const sampleRows = parsed.data as Record<string, string>[]

  try {
    const result = await detectCsvColumnMapping(headers, sampleRows.slice(0, 3))
    return apiSuccess({ ...result, sample_rows: sampleRows.slice(0, 3) })
  } catch {
    return apiError('Column detection failed', 'INTERNAL_ERROR', 500)
  }
}
