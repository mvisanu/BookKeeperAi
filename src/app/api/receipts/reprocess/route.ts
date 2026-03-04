import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { extractReceiptData } from '@/lib/gemini'
import { apiSuccess, apiError } from '@/lib/api/response'

export async function POST(_request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiError('Unauthenticated', 'UNAUTHENTICATED', 401)

  // Fetch all pending or failed receipts
  const { data: receipts, error } = await supabase
    .from('receipts')
    .select('id, storage_path, file_mime_type')
    .eq('user_id', user.id)
    .in('status', ['pending', 'failed'])

  if (error) return apiError(error.message, 'INTERNAL_ERROR', 500)
  if (!receipts || receipts.length === 0) {
    return apiSuccess({ processed: 0, message: 'No pending or failed receipts' })
  }

  let processed = 0
  let failed = 0

  for (const receipt of receipts) {
    try {
      await supabase.from('receipts').update({ status: 'processing' }).eq('id', receipt.id)

      const { data: fileData, error: downloadError } = await supabase.storage
        .from('receipts')
        .download(receipt.storage_path)

      if (downloadError || !fileData) throw new Error('Could not download file')

      const arrayBuffer = await fileData.arrayBuffer()
      const base64 = Buffer.from(arrayBuffer).toString('base64')

      const extracted = await extractReceiptData(base64, receipt.file_mime_type)

      await supabase
        .from('receipts')
        .update({
          status: 'complete',
          vendor_name: extracted.vendor_name,
          transaction_date: extracted.transaction_date,
          total_amount: extracted.total_amount,
          subtotal_amount: extracted.subtotal_amount,
          gst_hst_amount: extracted.gst_hst_amount,
          pst_amount: extracted.pst_amount,
          payment_method: extracted.payment_method,
          card_last4: extracted.card_last4,
          category: extracted.category,
          expense_type: extracted.expense_type,
          location: extracted.location,
          receipt_number: extracted.receipt_number,
        })
        .eq('id', receipt.id)

      processed++
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Extraction failed'
      await supabase
        .from('receipts')
        .update({ status: 'failed', extraction_error: message })
        .eq('id', receipt.id)
      failed++
    }
  }

  return apiSuccess({ processed, failed, total: receipts.length })
}
