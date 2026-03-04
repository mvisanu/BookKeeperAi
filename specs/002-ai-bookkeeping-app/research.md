# Research: AI-Powered Bookkeeping App

**Feature**: `002-ai-bookkeeping-app` | **Date**: 2026-03-03
**Status**: All NEEDS CLARIFICATION items resolved.

---

## §1 — Gemini 2.5 Flash Multimodal API for Receipt/Document Extraction

### Decision
Use **`@google/genai` v1+ (not `@google/generative-ai`)** with model **`gemini-2.5-flash`** and `responseMimeType: "application/json"` + `responseJsonSchema` for structured receipt extraction.

### Rationale
- `@google/generative-ai` is **deprecated — EOL August 31, 2025**. The replacement is `@google/genai`.
- `gemini-2.0-flash` is scheduled for **retirement June 1, 2026** (today is March 3, 2026). Use `gemini-2.5-flash`.
- `responseMimeType: "application/json"` with a JSON Schema guarantees structured output; no regex parsing needed.
- `inlineData` (base64) works for files ≤ 50 MB (PDFs), which covers all receipt files (≤ 10 MB) and most bank statements (≤ 20 MB). The Files API is available if needed for edge cases.

### API Pattern

```ts
import { GoogleGenAI } from '@google/genai'

const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! })

const response = await genai.models.generateContent({
  model: 'gemini-2.5-flash',
  contents: [
    { text: RECEIPT_EXTRACTION_PROMPT },
    { inlineData: { mimeType: 'image/jpeg', data: base64String } },
  ],
  config: {
    responseMimeType: 'application/json',
    responseJsonSchema: RECEIPT_SCHEMA,   // JSON Schema object
  },
})

const extracted = JSON.parse(
  response.candidates![0].content.parts[0].text!
)
```

### Receipt Extraction Prompt (canonical)

```
Extract the following fields from this receipt image or PDF.
Return only a JSON object matching the provided schema.
Use null for any field you cannot confidently identify.
For dates, use YYYY-MM-DD format.
For amounts, return positive numeric values only (no currency symbols).
For card_last4, return exactly 4 digits or null.
For expense_type, classify as "business" or "personal" based on the vendor/category.
```

### Rate Limits & Retry Strategy
- Free tier: 15 RPM. Tier 1 ($0.01+ spend): 150 RPM. Tier 2 ($250+ cumulative): 1,000+ RPM.
- Implement exponential backoff on HTTP 429: delays of 1 s, 2 s, 4 s (max 3 retries).
- Edge Function wall-clock timeout: 150 s (free) / 400 s (paid) — well above typical Gemini latency of 3–30 s.

### Alternatives Considered
- `@google/generative-ai`: Rejected — deprecated and EOL.
- `gemini-2.0-flash`: Rejected — retiring June 1, 2026.
- OpenAI GPT-4V: Rejected — user specified Gemini.
- Google Cloud Document AI: Rejected — heavy infrastructure, overkill for initial version.

---

## §2 — Supabase Edge Functions: File Access & Async Processing

### Decision
Use **Server Action → HTTP POST to Edge Function** (not DB Webhooks) as the trigger mechanism. Edge Functions read files from Storage using the **admin Supabase client** with `SUPABASE_SERVICE_ROLE_KEY`. Processing happens in the background via **`EdgeRuntime.waitUntil()`**.

### Rationale
- **DB Webhooks risk**: 100 simultaneous uploads fire 100 simultaneous Edge Functions — can hit rate limits. Server Action approach gives controlled, per-request invocation.
- **`EdgeRuntime.waitUntil()`**: Lets the function respond `202 Accepted` immediately while Gemini processing continues in background — satisfying the non-blocking UI requirement.
- **Admin client for Storage**: Edge Functions cannot use the user's session token to read their own Storage files (server-side). The service role key bypasses RLS, so file path validation must be done explicitly before download.

### File Access Pattern (Edge Function)

```ts
// supabase/functions/process-receipt/index.ts
import { createClient } from 'jsr:@supabase/supabase-js@2'

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

Deno.serve(async (req) => {
  const { receipt_id, storage_path, mime_type } = await req.json()

  EdgeRuntime.waitUntil(processInBackground(receipt_id, storage_path, mime_type))

  return new Response(
    JSON.stringify({ status: 'processing', receipt_id }),
    { status: 202, headers: { 'Content-Type': 'application/json' } }
  )
})

async function processInBackground(id: string, path: string, mime: string) {
  const { data: file } = await supabaseAdmin.storage.from('receipts').download(path)
  const arrayBuffer = await file!.arrayBuffer()
  const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)))
  // ... call Gemini, update DB row
}
```

### Secrets Configuration
- **Auto-available** (no setup): `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_URL`
- **Custom secrets** (set once): `supabase secrets set GEMINI_API_KEY=<key>`
- **Local development**: `supabase/functions/.env` (gitignored), loaded via `supabase functions serve --env-file supabase/functions/.env`

### Timeout Limits
| Limit | Free Plan | Paid Plan |
|-------|-----------|-----------|
| Wall-clock | 150 s | 400 s |
| CPU time | 2 s (I/O excluded) | 2 s |
| Memory | 256 MB | 256 MB |

### Alternatives Considered
- **DB Webhooks as trigger**: Rejected — risk of rate limit storms on bulk uploads; harder to handle errors in Next.js code.
- **Next.js API route as processor** (no Edge Function): Rejected — Vercel serverless function timeout is 10 s (free) / 60 s (pro), insufficient for Gemini + large files.
- **Supabase pg_net triggers**: Rejected — same issue as DB Webhooks.

---

## §3 — CSV Column Auto-Detection

### Decision
Use **Papa Parse** for raw CSV parsing + custom heuristic detector implementing **composite confidence scoring** (header regex × value sampling). Confidence threshold of **≥ 85%** = auto-proceed; **< 85%** = require user confirmation (FR-015).

### Rationale
- Papa Parse is the standard JavaScript CSV parser with robust delimiter auto-detection, but provides **no column type detection** — `meta.fields` is just header names.
- A composite score (header name regex + value sample validation) is the industry-standard pattern (used by csv-detective, messytables).
- 85% threshold matches industry practice and the spec's "high confidence" definition.

### Detection Algorithm

```ts
// src/lib/csv/column-detector.ts

export type CsvColumnMapping = {
  date_col: string
  description_col: string
  amount_col?: string     // signed amount
  debit_col?: string      // debit-only column
  credit_col?: string     // credit-only column
  confidence: number      // 0–1
}

function scoreColumn(
  header: string,
  sampleValues: string[],
  expectedType: 'date' | 'amount' | 'description'
): number {
  const labelScore = HEADER_PATTERNS[expectedType].test(header) ? 1.0 : 0.2
  const validCount = sampleValues.filter(v => VALIDATORS[expectedType](v)).length
  const fieldScore = validCount / Math.max(sampleValues.length, 1)
  return fieldScore * (1 + labelScore / 2)  // 0–1.5; normalised to 0–1
}
```

### Header Regex Patterns
```ts
const HEADER_PATTERNS = {
  date: /^(date|trans_date|transaction_date|posted|settlement|effective|value_date)$/i,
  amount: /^(amount|balance|value|debit|credit|withdrawal|deposit|total)$/i,
  description: /^(description|memo|narration|details|reference|payee|merchant)$/i,
}
```

### Amount Normalisation
Handle all common edge cases in `parseAmount(raw: string): number`:
```ts
// Parenthetical negative: (42.00) → -42
// Debit/credit split: two columns → credit positive, debit negative
// Dr./Cr. suffix: "100.00 Dr" → -100
// Currency symbols: "$1,234.56" → 1234.56
```

### Debit/Credit Split Detection
If headers matching `/^debit$/i` AND `/^credit$/i` both exist, treat as split columns:
- `amount = credit > 0 ? credit : -debit`

### Confidence Thresholds
| Score | Action |
|-------|--------|
| ≥ 0.85 | Auto-proceed — no user confirmation required |
| 0.60–0.84 | Show suggested mapping, allow user override |
| < 0.60 | Block import — user MUST select correct columns |

This implements FR-015: "when CSV column-mapping confidence falls below a defined threshold, the user MUST be required to manually confirm or correct the mapping."

### Alternatives Considered
- **`csv-detective` (Python)**: Rejected — Python library, not usable in Next.js/Deno.
- **OpenAI for CSV mapping**: Rejected — overkill and adds latency/cost for a structured task solvable with regex.
- **Shipping sample rows to Gemini**: Considered as fallback for very ambiguous CSVs — not implemented in v1 but available as enhancement.

---

## Summary of Resolutions

| # | Was NEEDS CLARIFICATION | Resolution |
|---|------------------------|------------|
| 1 | Gemini API package + model version | `@google/genai` + `gemini-2.5-flash`; `inlineData` for ≤ 50 MB; structured JSON via `responseJsonSchema` |
| 2 | Edge Function file access + trigger pattern | Admin client reads Storage; Server Action → HTTP POST triggers Edge Function; `EdgeRuntime.waitUntil()` for async |
| 3 | CSV column detection confidence threshold | Composite score (header regex × value sampling); ≥ 85% auto-proceed; < 85% requires user confirmation |

**All NEEDS CLARIFICATION items resolved. No blockers to Phase 1 design.**
