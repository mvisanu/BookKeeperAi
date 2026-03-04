// @ts-ignore — Deno runtime
import { GoogleGenAI } from 'npm:@google/genai'
import { createClient } from 'jsr:@supabase/supabase-js@2'

const GEMINI_MODEL = 'gemini-2.5-flash'

const RECEIPT_JSON_SCHEMA = {
  type: 'object',
  properties: {
    vendor_name: { type: ['string', 'null'] },
    transaction_date: { type: ['string', 'null'], description: 'YYYY-MM-DD format' },
    total_amount: { type: ['number', 'null'] },
    subtotal_amount: { type: ['number', 'null'] },
    gst_hst_amount: { type: ['number', 'null'] },
    pst_amount: { type: ['number', 'null'] },
    payment_method: { type: ['string', 'null'] },
    card_last4: { type: ['string', 'null'], description: 'Exactly 4 digits or null' },
    category: { type: ['string', 'null'] },
    expense_type: { type: ['string', 'null'], enum: ['business', 'personal', null] },
    location: { type: ['string', 'null'] },
    receipt_number: { type: ['string', 'null'] },
  },
  required: [
    'vendor_name', 'transaction_date', 'total_amount', 'subtotal_amount',
    'gst_hst_amount', 'pst_amount', 'payment_method', 'card_last4',
    'category', 'expense_type', 'location', 'receipt_number',
  ],
}

const RECEIPT_PROMPT = `Extract the following fields from this receipt image or PDF.
Return only a JSON object matching the provided schema.
Use null for any field you cannot confidently identify.
For dates, use YYYY-MM-DD format.
For amounts, return positive numeric values only (no currency symbols).
For card_last4, return exactly 4 digits or null.
For expense_type, classify as "business" or "personal" based on the vendor/category.`

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

const genai = new GoogleGenAI({ apiKey: Deno.env.get('GEMINI_API_KEY')! })

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
}

async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3, baseDelayMs = 1000): Promise<T> {
  let lastError: unknown
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (err: unknown) {
      lastError = err
      const isRateLimit =
        err instanceof Error &&
        (err.message.includes('429') || err.message.toLowerCase().includes('rate limit'))
      if (!isRateLimit || attempt === maxRetries) throw err
      await new Promise((r) => setTimeout(r, baseDelayMs * Math.pow(2, attempt)))
    }
  }
  throw lastError
}

async function processInBackground(receiptId: string, storagePath: string, mimeType: string) {
  try {
    // Update to processing
    await supabaseAdmin
      .from('receipts')
      .update({ status: 'processing' })
      .eq('id', receiptId)

    // Download file
    const { data: fileData, error: downloadError } = await supabaseAdmin.storage
      .from('receipts')
      .download(storagePath)

    if (downloadError || !fileData) {
      throw new Error(`Storage download failed: ${downloadError?.message}`)
    }

    const arrayBuffer = await fileData.arrayBuffer()
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)))

    // Call Gemini with retry
    const response = await withRetry(() =>
      genai.models.generateContent({
        model: GEMINI_MODEL,
        contents: [
          { text: RECEIPT_PROMPT },
          { inlineData: { mimeType, data: base64 } },
        ],
        config: {
          responseMimeType: 'application/json',
          responseJsonSchema: RECEIPT_JSON_SCHEMA,
        },
      })
    )

    const text = response.candidates?.[0]?.content?.parts?.[0]?.text
    if (!text) throw new Error('Empty response from Gemini')

    const extracted = JSON.parse(text)

    await supabaseAdmin
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
      .eq('id', receiptId)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    await supabaseAdmin
      .from('receipts')
      .update({ status: 'failed', extraction_error: message })
      .eq('id', receiptId)
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: CORS_HEADERS })
  }

  try {
    const { receipt_id, storage_path, mime_type } = await req.json()

    if (!receipt_id || !storage_path || !mime_type) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      )
    }

    // @ts-ignore — EdgeRuntime is Deno-specific
    EdgeRuntime.waitUntil(processInBackground(receipt_id, storage_path, mime_type))

    return new Response(
      JSON.stringify({ status: 'processing', receipt_id }),
      { status: 202, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    )
  }
})
