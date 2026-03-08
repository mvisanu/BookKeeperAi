# BookKeeperAI

AI-powered bookkeeping for Canadian small businesses. Upload receipts and bank statements, let AI extract and categorize everything, then reconcile with one click.

**Live:** https://book-keeper-ai.vercel.app

---

## Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) + TypeScript 5 |
| Auth + DB + Storage | Supabase (Postgres, RLS, Storage, Realtime) |
| AI Extraction | Google Gemini 2.5 Flash (`@google/genai`) |
| Payments | Stripe (subscriptions, hosted checkout, customer portal, webhooks) |
| UI | shadcn/ui + Tailwind v4 |
| Fonts | Manrope + DM Mono (Google Fonts) |
| Deployment | Vercel |

---

## Features

- **Receipt OCR** — upload JPEG/PNG/PDF; Gemini extracts vendor, date, total, GST/HST, PST, category
- **Bank Statement Import** — CSV/PDF with auto column-mapping; handles RBC, TD, BMO, Scotiabank
- **AI Auto-Categorize** — one-click AI categorization of uncategorized transactions
- **Smart Reconciliation** — auto-match receipts to transactions by amount, date, vendor; manual link/unlink
- **Billing & Plans** — Free / Solo ($12 CAD/mo) / Pro ($29 CAD/mo) via Stripe subscriptions
- **Plan Enforcement** — receipt and statement upload limits enforced server-side per plan tier
- **Export** — CSV export of reconciled pairs

---

## Local Development

```bash
npm install
cp .env.example .env.local   # fill in your keys
npm run dev                  # http://localhost:3000
```

### Required environment variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Google Gemini
GEMINI_API_KEY=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_SOLO=
STRIPE_PRICE_PRO=
```

### Stripe local webhook forwarding

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

---

## Database

Migrations live in `supabase/migrations/`. Applied in order:

| File | Description |
|------|-------------|
| `20260303000001_initial_schema.sql` | Core tables: profiles, receipts, bank_statements, bank_transactions, reconciliation_matches |
| `20260303000002_storage.sql` | Storage buckets + RLS policies |
| `20260304000001_stripe_billing.sql` | `plan_tier` enum + Stripe columns on profiles (**applied 2026-03-04**) |

To apply migrations, run each SQL file in the Supabase Dashboard → SQL Editor, or use `supabase db push` if the project is linked.

---

## Project Structure

```
src/
  app/
    (auth)/          # sign-in, sign-up, reset-password
    (dashboard)/     # dashboard, receipts, statements, transactions, matching, reconciliation, billing, settings
    api/
      receipts/      # upload, retry, reprocess
      statements/    # upload, confirm-mapping
      transactions/  # list, patch, delete, categorize
      reconciliation/ # auto-match, manual-match, export
      stripe/        # checkout, portal, webhook
  components/
    layout/          # Sidebar
    receipts/        # ReceiptTable, ReceiptUploadZone, ReceiptStatusBadge, ...
    statements/      # StatementUploadZone, TransactionTable, TransactionFilters, ...
    reconciliation/  # ReconciliationView, ReconciliationSummaryBar, ...
    billing/         # BillingPageClient
  lib/
    stripe.ts        # Stripe client + PLANS config
    plans.ts         # Plan enforcement (canUploadReceipt, canUploadStatement)
    gemini.ts        # Gemini extraction
    matching.ts      # Reconciliation matching logic
    supabase/        # server/client helpers
  types/
    index.ts         # Receipt, BankTransaction, etc.
    supabase.ts      # Generated DB types (manually maintained)
```

---

## Stripe Integration

- **Checkout** — `POST /api/stripe/checkout` creates a Stripe-hosted Checkout Session; on success redirects to `/billing?success=true`
- **Portal** — `POST /api/stripe/portal` creates a Customer Portal session for subscription management/cancellation
- **Webhook** — `POST /api/stripe/webhook` handles `subscription.created/updated/deleted` and `invoice.payment_succeeded`; syncs plan tier back to Supabase `profiles`
- **Webhook endpoint** registered at `https://book-keeper-ai.vercel.app/api/stripe/webhook`

### Plan tiers

| Tier | Stripe Price ID | Price |
|------|----------------|-------|
| Solo | `price_1T7RYaF6LPbtWTWnrXhGRbEG` | $12 CAD/mo |
| Pro  | `price_1T7RYaF6LPbtWTWnVFZuqhia` | $29 CAD/mo |

---

## Commands

```bash
npm run dev      # development server
npm run build    # production build
npm run lint     # ESLint
npm test         # Jest unit tests
```
