# Edge Functions Contract

**Feature**: `002-ai-bookkeeping-app` | **Date**: 2026-03-03

Supabase Edge Functions run on Deno. All functions live under `supabase/functions/<name>/index.ts`.
Entry point: `Deno.serve(async (req) => { ... })`.
Shared utilities: `supabase/functions/_shared/`.

**Timeout**: 150 s (free plan) / 400 s (paid plan). All functions respond immediately with `202 Accepted` and process in background via `EdgeRuntime.waitUntil()`.

---

## `process-receipt`

**Trigger**: HTTP POST from Next.js Server Action after receipt row is created in DB.
**Path**: `POST {SUPABASE_URL}/functions/v1/process-receipt`

**Request body**:
```ts
{
  receipt_id: string;   // UUID of the receipts row
  storage_path: string; // Supabase Storage path e.g. "{user_id}/{receipt_id}/file.jpg"
  mime_type: string;    // "image/jpeg" | "image/png" | "application/pdf"
}
```

**Authorization**: Caller must include `Authorization: Bearer {SUPABASE_SERVICE_ROLE_KEY}` header.

**Immediate response `202`**:
```ts
{ status: "processing", receipt_id: string }
```

**Background processing** (via `EdgeRuntime.waitUntil`):
1. Download file bytes from Supabase Storage using admin client.
2. Encode as base64 `inlineData` (files ≤ 20 MB; for larger use Files API).
3. Call Gemini 2.5 Flash with structured JSON schema for receipt fields.
4. Parse response; validate with Zod schema.
5. `UPDATE receipts SET status='complete', vendor_name=..., ... WHERE id = receipt_id`.
6. On any error: `UPDATE receipts SET status='failed', extraction_error=... WHERE id = receipt_id`.

**Gemini prompt schema** (enforced via `responseMimeType: "application/json"` + `responseJsonSchema`):
```ts
{
  vendor_name: string | null;
  transaction_date: string | null;  // "YYYY-MM-DD"
  total_amount: number | null;
  subtotal_amount: number | null;
  gst_hst_amount: number | null;
  pst_amount: number | null;
  payment_method: string | null;
  card_last4: string | null;        // exactly 4 digits or null
  category: string | null;
  expense_type: "business" | "personal" | null;
  location: string | null;
  receipt_number: string | null;
}
```

**Error handling**:
- Gemini 429: retry up to 3× with exponential backoff (1 s, 2 s, 4 s).
- Gemini 5xx / timeout: mark receipt `failed` with `extraction_error = "AI service temporarily unavailable"`.
- Image illegible / no structured data returned: mark `failed` with `extraction_error = "Could not extract data from image"`.

**Required secrets** (set via `supabase secrets set`):
- `GEMINI_API_KEY` — Google AI Studio key

**Available automatically**:
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`

---

## `process-statement`

**Trigger**: HTTP POST from Next.js Server Action after `bank_statements` row is created (PDF/image) or after CSV mapping is confirmed.
**Path**: `POST {SUPABASE_URL}/functions/v1/process-statement`

**Request body**:
```ts
{
  statement_id: string;
  storage_path: string;
  mime_type: string;       // "application/pdf" | "image/jpeg" | "image/png" | "text/csv"
  // For CSV files only:
  csv_mapping?: {
    date_col: string;
    description_col: string;
    amount_col?: string;        // signed; or use debit/credit pair
    debit_col?: string;
    credit_col?: string;
    card_last4: string;
  };
}
```

**Authorization**: `Authorization: Bearer {SUPABASE_SERVICE_ROLE_KEY}`

**Immediate response `202`**:
```ts
{ status: "processing", statement_id: string }
```

**Background processing** (PDF/image path):
1. Download file from Storage.
2. Encode as `inlineData` and call Gemini 2.5 Flash with transaction extraction prompt.
3. Parse array of transactions from JSON response.
4. Deduplicate against existing `bank_transactions` rows for this user (same `transaction_date`, `amount`, `trim(lower(description))`).
5. Bulk-insert non-duplicate transactions into `bank_transactions`.
6. Increment `bank_statements.transaction_count` progressively (update every 25 inserts).
7. On completion: `UPDATE bank_statements SET status='complete'`.

**Background processing** (CSV path):
1. Download CSV text from Storage.
2. Parse with Papa Parse (no Gemini needed).
3. Apply `csv_mapping` to extract date, description, amount columns.
4. Normalize amounts: handle parenthetical negatives `(42.00)`, debit/credit split columns.
5. Parse dates using `date-fns` with inferred format.
6. Deduplicate, bulk-insert, update progress count.
7. `UPDATE bank_statements SET status='complete'`.

**Gemini prompt schema for transactions** (PDF/image):
```ts
{
  card_last4: string | null;
  transactions: Array<{
    transaction_date: string;    // "YYYY-MM-DD"
    description: string;
    amount: number;              // negative = debit, positive = credit
    category: string | null;
  }>;
}
```

**Error handling**:
- Same retry pattern as `process-receipt`.
- Partial inserts (some transactions succeed before error): committed; `import_error` records how many were skipped.
- Duplicate transactions: skipped silently (not inserted); count tracked and returned in status.

**Required secrets**: `GEMINI_API_KEY`

---

## Shared Utilities (`supabase/functions/_shared/`)

### `supabase.ts`
```ts
import { createClient } from 'jsr:@supabase/supabase-js@2'
export const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)
```

### `gemini.ts`
```ts
import { GoogleGenAI } from 'npm:@google/genai'
export const genai = new GoogleGenAI({ apiKey: Deno.env.get('GEMINI_API_KEY')! })
export const GEMINI_MODEL = 'gemini-2.5-flash'
```

### `retry.ts`
Exponential backoff helper: retries on Gemini HTTP 429 up to 3 times.

---

## CORS Headers

All Edge Functions return:
```
Access-Control-Allow-Origin: {VERCEL_DEPLOYMENT_URL}
Access-Control-Allow-Methods: POST, OPTIONS
Access-Control-Allow-Headers: Authorization, Content-Type
```

`OPTIONS` preflight returns `200 No Content`.
