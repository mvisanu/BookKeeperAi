# Implementation Plan: AI-Powered Bookkeeping App

**Branch**: `002-ai-bookkeeping-app` | **Date**: 2026-03-03 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-ai-bookkeeping-app/spec.md`

## Summary

Build a full-stack bookkeeping web application where authenticated users upload bank statements and receipts, Google Gemini 2.0 Flash extracts structured transaction data from each file, and the system automatically reconciles bank transactions with receipts by amount + date proximity. Stack: Next.js 15 (App Router) + TypeScript on the frontend, Supabase (Auth, Postgres, Storage, Edge Functions) as the backend, deployed to Vercel.

## Technical Context

**Language/Version**: TypeScript 5.x / Next.js 15 (App Router) / Node.js 20 LTS
**Primary Dependencies**: `next`, `@supabase/supabase-js`, `@supabase/ssr`, `@google/genai` (NOT deprecated `@google/generative-ai`), `shadcn/ui`, `tailwindcss`, `zod`, `react-hook-form`, `@tanstack/react-query`, `papaparse`, `date-fns`
**Storage**: Supabase Postgres (receipts, transactions, matches, profiles) + Supabase Storage (receipt images/PDFs, bank statement files)
**Testing**: Vitest + React Testing Library (unit / integration), Playwright (E2E), Supabase local dev stack (integration DB)
**Target Platform**: Web — Vercel (serverless + edge runtime), responsive (desktop-first, mobile-accessible)
**Project Type**: full-stack web-service (Next.js App Router + Supabase BaaS)

**Performance Goals**:
- Receipt extraction data visible ≤ 30 s after upload (SC-001)
- Bank statement import visible ≤ 60 s for 200 transactions (SC-003)
- UI initial load ≤ 2 s on mid-range device (Constitution §V)
- Save / submit actions respond ≤ 500 ms (Constitution §V)
- Auto-match completes ≤ 5 s for 200 unmatched pairs
- Gemini API calls must be non-blocking — background via Edge Function + Realtime push

**Constraints**:
- 10 MB max per receipt file (FR-005)
- 20 MB max per bank statement file (FR-012)
- Canadian tax fields only — GST/HST + PST (no international tax)
- Single currency (CAD) — no multi-currency
- One-to-one match cardinality enforced at DB level (FR-025)
- Real-time status updates required without page refresh (FR-007, FR-018)
- Supabase RLS enforces strict per-user isolation (FR-003, SC-007)

**Scale/Scope**: Small business / sole proprietors; ~50–200 transactions/month per user; multi-tenant

**NEEDS CLARIFICATION**:
1. Gemini 2.0 Flash multimodal API — exact pattern for inline file bytes vs. File API for PDF/image extraction; structured JSON output schema enforcement → *See research.md §1*
2. Supabase Edge Functions + Storage — how Edge Functions access uploaded files (Storage REST vs. admin client); Database Webhook trigger pattern for async processing → *See research.md §2*
3. CSV column auto-detection confidence — Papa Parse meta + heuristics for date/amount/description detection; threshold for requiring manual confirmation (FR-015) → *See research.md §3*

## Constitution Check

*GATE: Pre-Phase-0 evaluation. Re-checked post-Phase-1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| **I. Code Quality** | ✅ PASS | Reconciliation algorithm, CSV parser, Gemini extraction parser are pure functions. ESLint + Prettier configured. Complexity ≤ 10 per function enforced. |
| **II. Test-First** | ✅ PASS | Reconciliation matching logic + CSV column mapper are pure — written test-first with Vitest. Auth flows + upload → extract → match flow covered by Playwright E2E. |
| **III. Standards & Conventions** | ✅ PASS | ESLint (Next.js + TypeScript strict), Prettier enforced in CI. API contracts in `contracts/`. Conventional Commits. All dependencies reviewed for license + advisories. |
| **IV. UX Consistency** | ✅ PASS | Shadcn/UI as sole design-token source. All error messages actionable (e.g., "File exceeds 10 MB limit — please upload a smaller file"). WCAG 2.1 AA required. |
| **V. Performance Requirements** | ✅ PASS | Performance Goals defined above. All AI/import jobs are async + non-blocking with Realtime progress feedback. |

**Quality Gates**:

| Gate | Enforced By | Blocking? | Plan Status |
|------|-------------|-----------|-------------|
| Linter / formatter clean | CI (GitHub Actions) | YES | ✅ ESLint + Prettier planned |
| Unit test coverage ≥ 80 % | CI (Vitest coverage) | YES | ✅ Pure logic modules targeted |
| Contract tests pass | CI | YES | ✅ API route contracts defined in `contracts/` |
| Integration tests pass | CI (Supabase local) | YES | ✅ RLS policies + DB logic tested |
| No new HIGH/CRITICAL advisories | CI (npm audit / Dependabot) | YES | ✅ Dependency review on install |
| Performance baseline met | Playwright perf assertions | YES | ✅ Load time assertions in E2E |
| Code review approval (≥ 1) | GitHub PR process | YES | ✅ Required before merge |
| Constitution Check completed | PR checklist | YES | ✅ This section |

**No gate violations found.** No Complexity Tracking entries required.

---

*Post-Phase-1 re-check:* See bottom of document after design artifacts are complete.

## Project Structure

### Documentation (this feature)

```text
specs/002-ai-bookkeeping-app/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   ├── api-routes.md
│   ├── edge-functions.md
│   └── realtime-channels.md
└── tasks.md             # Phase 2 output (/speckit.tasks — NOT created here)
```

### Source Code (repository root)

```text
src/
├── app/                          # Next.js App Router pages
│   ├── (auth)/
│   │   ├── sign-in/page.tsx
│   │   ├── sign-up/page.tsx
│   │   └── reset-password/page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx            # Auth guard + nav shell
│   │   ├── receipts/
│   │   │   ├── page.tsx          # Receipts list
│   │   │   └── upload/page.tsx
│   │   ├── statements/
│   │   │   ├── page.tsx          # Transactions list
│   │   │   └── upload/page.tsx
│   │   └── reconciliation/
│   │       └── page.tsx
│   └── api/
│       ├── receipts/
│       │   ├── route.ts           # POST upload
│       │   └── [id]/
│       │       ├── route.ts       # PATCH, DELETE
│       │       └── retry/route.ts
│       ├── statements/
│       │   ├── route.ts           # POST upload
│       │   └── [id]/
│       │       ├── route.ts       # DELETE
│       │       └── confirm-mapping/route.ts
│       ├── transactions/
│       │   └── [id]/route.ts     # PATCH, DELETE
│       └── reconciliation/
│           ├── auto-match/route.ts
│           ├── manual-match/route.ts
│           ├── matches/[id]/route.ts
│           └── export/route.ts
├── components/
│   ├── ui/                        # Shadcn/UI primitives (auto-generated)
│   ├── receipts/
│   │   ├── ReceiptUploadZone.tsx
│   │   ├── ReceiptList.tsx
│   │   └── ReceiptEditModal.tsx
│   ├── statements/
│   │   ├── StatementUploadZone.tsx
│   │   ├── CsvMappingPreview.tsx
│   │   └── TransactionList.tsx
│   └── reconciliation/
│       ├── ReconciliationView.tsx
│       ├── MatchedPairRow.tsx
│       └── CandidatePanel.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts              # Browser Supabase client
│   │   ├── server.ts              # Server Component client
│   │   └── middleware.ts          # Session refresh
│   ├── gemini/
│   │   └── extraction.ts          # Gemini prompt helpers + response parser
│   ├── csv/
│   │   └── column-detector.ts     # Papa Parse + confidence heuristics
│   └── reconciliation/
│       └── matcher.ts             # Pure matching algorithm
├── types/
│   └── index.ts                   # Shared TypeScript types + Zod schemas
└── middleware.ts                   # Next.js middleware (auth session)

supabase/
├── functions/
│   ├── process-receipt/           # Edge Function: Gemini → receipt row
│   │   └── index.ts
│   └── process-statement/         # Edge Function: Gemini/CSV → transactions
│       └── index.ts
├── migrations/
│   └── 001_initial_schema.sql
└── seed.sql

tests/
├── unit/
│   ├── lib/reconciliation/matcher.test.ts
│   ├── lib/csv/column-detector.test.ts
│   └── lib/gemini/extraction.test.ts
├── integration/
│   ├── api/receipts.test.ts
│   ├── api/statements.test.ts
│   └── api/reconciliation.test.ts
└── e2e/
    ├── auth.spec.ts
    ├── receipts.spec.ts
    ├── statements.spec.ts
    └── reconciliation.spec.ts
```

**Structure Decision**: Next.js monorepo (App Router). Supabase functions live under `supabase/` per Supabase CLI convention. Business logic is extracted to `src/lib/` as pure functions to enable test-first development independent of framework. Shadcn/UI components land in `src/components/ui/` per Shadcn convention.

## Complexity Tracking

> No constitution violations requiring justification.

---

## Post-Phase-1 Constitution Re-Check

*Filled after data-model.md, contracts/, and quickstart.md are complete.*

| Principle | Status | Notes |
|-----------|--------|-------|
| **I. Code Quality** | ✅ PASS | All DB queries use Supabase typed client. Reconciliation algorithm is O(n log n) with clear single-responsibility. Gemini parser isolates external API response from domain model. |
| **II. Test-First** | ✅ PASS | matcher.ts, column-detector.ts, and extraction.ts are pure modules with full Vitest coverage targets. RLS policies tested via Supabase local integration tests. |
| **III. Standards & Conventions** | ✅ PASS | API contracts fully documented in `contracts/`. All Supabase types generated via `supabase gen types`. Zod schemas are the single source of truth for runtime validation. |
| **IV. UX Consistency** | ✅ PASS | Shadcn/UI used throughout. Status badges (pending/processing/complete/failed) use consistent colour tokens. All error states provide actionable copy. |
| **V. Performance Requirements** | ✅ PASS | File uploads go directly to Supabase Storage (client-side SDK — no server proxy). Gemini calls are async + non-blocking. CSV parsing happens in Web Worker to avoid UI blocking. |

**Post-design verdict: No new violations. All quality gates remain GREEN.**
