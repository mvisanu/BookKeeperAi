# BookKeepingApp Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-03-03

## Stack

- **Framework**: Next.js 15 (App Router) + TypeScript 5
- **Auth/DB/Storage**: Supabase (`@supabase/supabase-js`, `@supabase/ssr`)
- **AI**: Google Gemini 2.5 Flash via `@google/genai` (NOT `@google/generative-ai`)
- **Payments**: Stripe `stripe@20.4.0`, API version `2026-02-25.clover`
- **UI**: `shadcn/ui`, Tailwind v4, Manrope + DM Mono fonts
- **Other**: `zod`, `react-hook-form`, `date-fns`, `papaparse`, `react-dropzone`, `sonner`

## Commands

```bash
npm run dev    # development server (localhost:3000)
npm test       # Jest unit tests
npm run lint   # ESLint
npm run build  # production build
```

## Project Structure

```
src/app/(auth)/          # sign-in, sign-up, reset-password
src/app/(dashboard)/     # dashboard, receipts, statements, transactions,
                         # matching, reconciliation, billing, settings
src/app/api/stripe/      # checkout, portal, webhook routes
src/lib/stripe.ts        # Stripe client + PLANS config (Free/Solo/Pro)
src/lib/plans.ts         # Plan enforcement: canUploadReceipt/canUploadStatement
src/lib/gemini.ts        # Gemini AI extraction
src/types/supabase.ts    # Manually-maintained DB types (NOT auto-generated)
supabase/migrations/     # SQL migrations (applied manually via Supabase Dashboard)
```

## Database Migrations Status

| Migration | Status |
|-----------|--------|
| `20260303000001_initial_schema.sql` | Applied |
| `20260303000002_storage.sql` | Applied |
| `20260304000001_stripe_billing.sql` | **Applied 2026-03-04** |

The `profiles` table now has: `stripe_customer_id`, `stripe_subscription_id`, `stripe_price_id`, `plan` (enum: free/solo/pro), `plan_expires_at`.

## Stripe Integration

- Plans: Free ($0), Solo ($12 CAD/mo, `price_1T7RYaF6LPbtWTWnrXhGRbEG`), Pro ($29 CAD/mo, `price_1T7RYaF6LPbtWTWnVFZuqhia`)
- Webhook registered at: `https://book-keeper-ai.vercel.app/api/stripe/webhook`
- Webhook handles: `customer.subscription.created/updated/deleted`, `invoice.payment_succeeded/failed`
- Plan limits enforced at: `POST /api/receipts` and `POST /api/statements`

## Design System

- Dark "Midnight Obsidian" theme — base: `oklch(0.09 0.04 270)`
- Brand cyan: `#27C5F5`, success: `#10D9A1`, warning: `#F5A623`, danger: `#FF4757`, violet: `#a78bfa`
- CSS variables on `:root` and `.dark` are identical (dark values) — `class="dark"` on `<html>`
- Custom utilities in globals.css: `.card-premium`, `.text-gradient`, `.animate-page-enter`, `.auth-input`
- Use inline `style={{}}` for per-element colors rather than Tailwind color utilities
- shadcn UI components use CSS vars automatically — no changes needed for dark theme

## Key Patterns

- Server components fetch data; client components receive it as props
- API routes use `apiSuccess()`/`apiError()` from `src/lib/api/response.ts`
- Webhook route uses **service-role** Supabase client (not session-based)
- `src/types/supabase.ts` must be **manually updated** when schema changes — not auto-generated
- Pre-existing failing test: `tests/unit/lib/matching.test.ts` (unrelated `user_id` type issue)

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
