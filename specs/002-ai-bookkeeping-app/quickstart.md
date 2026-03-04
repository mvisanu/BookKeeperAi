# Quickstart Guide: AI-Powered Bookkeeping App

**Feature**: `002-ai-bookkeeping-app` | **Date**: 2026-03-03

---

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | 20 LTS | `nvm install 20` |
| npm | 10+ | bundled with Node |
| Supabase CLI | latest | `npm i -g supabase` |
| Docker Desktop | latest | supabase.com/docs/guides/cli/local-development |
| Git | any | — |

---

## 1. Clone & Install

```bash
git clone https://github.com/your-org/BookKeepingApp.git
cd BookKeepingApp/BookKeepingApp
npm install
```

---

## 2. Environment Variables

Copy the example file:

```bash
cp .env.local.example .env.local
```

Fill in `.env.local`:

```env
# Supabase (from your project dashboard → Settings → API)
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>

# Google AI (from aistudio.google.com → API Keys)
GEMINI_API_KEY=<your-gemini-api-key>

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

For local Supabase (step 4), `NEXT_PUBLIC_SUPABASE_URL` will be `http://localhost:54321`.

---

## 3. Local Supabase Stack

Start the local Supabase services (Postgres + Auth + Storage + Edge Functions + Realtime):

```bash
supabase start
```

Apply migrations to create all tables, enums, RLS policies, and indexes:

```bash
supabase db reset
```

(Optional) Seed sample data:

```bash
supabase db seed
```

The local studio runs at: `http://localhost:54323`

---

## 4. Edge Function Secrets (local)

Create `supabase/functions/.env` (gitignored):

```env
GEMINI_API_KEY=<your-gemini-api-key>
SUPABASE_SERVICE_ROLE_KEY=<from-supabase-start-output>
```

Serve Edge Functions locally:

```bash
supabase functions serve --env-file supabase/functions/.env
```

---

## 5. Run the App

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — register an account and verify the auth flow.

---

## 6. Run Tests

```bash
# Unit + integration tests (Vitest)
npm test

# With coverage (must reach ≥ 80%)
npm run test:coverage

# E2E tests (Playwright, requires running app + local Supabase)
npm run test:e2e

# Linter
npm run lint
```

---

## 7. Deploy to Vercel + Supabase Cloud

### Supabase Cloud

1. Create a project at [supabase.com](https://supabase.com).
2. Push migrations: `supabase db push`.
3. Deploy Edge Functions: `supabase functions deploy process-receipt process-statement`.
4. Set secrets on the cloud project:
   ```bash
   supabase secrets set GEMINI_API_KEY=<key>
   ```

### Vercel

1. Import the repo to Vercel.
2. Set root directory to `BookKeepingApp/` (the Next.js app).
3. Add all `.env.local` variables as Vercel Environment Variables.
4. Deploy: Vercel auto-deploys on push to `main`.

---

## Key Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Next.js dev server |
| `npm run build` | Production build |
| `npm run lint` | ESLint check |
| `npm run format` | Prettier format |
| `npm test` | Vitest unit + integration |
| `npm run test:coverage` | Coverage report |
| `npm run test:e2e` | Playwright E2E suite |
| `supabase start` | Start local Supabase |
| `supabase db reset` | Apply migrations + seed |
| `supabase functions serve` | Serve Edge Functions locally |
| `supabase gen types typescript --local` | Regenerate DB types |

---

## Architecture Overview

```text
Browser (Next.js App Router)
    │
    ├── Supabase Storage (direct client upload — no server proxy)
    ├── Next.js API Routes / Server Actions (auth, record creation, reconciliation)
    │       └── calls Supabase Edge Functions via HTTP POST (async processing)
    └── Supabase Realtime subscription (live status updates)

Supabase Edge Functions (Deno)
    ├── process-receipt  → Gemini 2.5 Flash → UPDATE receipts
    └── process-statement → Gemini 2.5 Flash (PDF/image) or Papa Parse (CSV) → INSERT bank_transactions
```

---

## Adding a New Shadcn/UI Component

```bash
npx shadcn@latest add <component-name>
```

Components land in `src/components/ui/`. Never edit generated Shadcn files directly — extend them via wrapper components in `src/components/`.

---

## Regenerating Supabase Types

After any migration change, regenerate TypeScript types:

```bash
supabase gen types typescript --local > src/types/supabase.ts
```

Commit the updated `src/types/supabase.ts`.
