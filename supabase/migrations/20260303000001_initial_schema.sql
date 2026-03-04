-- ============================================================
-- Migration: 20260303000001_initial_schema
-- Description: Initial schema for AI-powered bookkeeping app
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- Enums
-- ────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE receipt_status AS ENUM ('pending', 'processing', 'complete', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE statement_status AS ENUM ('pending', 'awaiting_mapping', 'processing', 'complete', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE expense_type AS ENUM ('business', 'personal');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE match_type AS ENUM ('auto', 'manual');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ────────────────────────────────────────────────────────────
-- Helper: updated_at trigger function
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ────────────────────────────────────────────────────────────
-- Table: profiles
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS profiles (
  id         uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email      text        NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON profiles;
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles: own row only" ON profiles;
CREATE POLICY "profiles: own row only"
  ON profiles FOR ALL
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Trigger: auto-insert profile on new auth user
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ────────────────────────────────────────────────────────────
-- Table: receipts
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS receipts (
  id               uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid           NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status           receipt_status NOT NULL DEFAULT 'pending',
  storage_path     text           NOT NULL,
  file_name        text           NOT NULL,
  file_size        integer        NOT NULL CHECK (file_size <= 10485760),
  file_mime_type   text           NOT NULL,
  vendor_name      text,
  transaction_date date,
  total_amount     numeric(12,2)  CHECK (total_amount >= 0),
  subtotal_amount  numeric(12,2)  CHECK (subtotal_amount >= 0),
  gst_hst_amount   numeric(12,2)  CHECK (gst_hst_amount >= 0),
  pst_amount       numeric(12,2)  CHECK (pst_amount >= 0),
  payment_method   text,
  card_last4       char(4)        CHECK (card_last4 ~ '^[0-9]{4}$'),
  category         text,
  expense_type     expense_type,
  location         text,
  receipt_number   text,
  notes            text,
  extraction_error text,
  created_at       timestamptz    NOT NULL DEFAULT now(),
  updated_at       timestamptz    NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_receipts_user_status ON receipts(user_id, status);
CREATE INDEX IF NOT EXISTS idx_receipts_user_date   ON receipts(user_id, transaction_date);

DROP TRIGGER IF EXISTS trg_receipts_updated_at ON receipts;
CREATE TRIGGER trg_receipts_updated_at
  BEFORE UPDATE ON receipts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "receipts: own rows only" ON receipts;
CREATE POLICY "receipts: own rows only"
  ON receipts FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────
-- Table: bank_statements
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS bank_statements (
  id                  uuid             PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid             NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name           text             NOT NULL,
  file_size           integer          NOT NULL CHECK (file_size <= 20971520),
  file_mime_type      text             NOT NULL,
  storage_path        text             NOT NULL,
  card_last4          char(4)          CHECK (card_last4 ~ '^[0-9]{4}$'),
  status              statement_status NOT NULL DEFAULT 'pending',
  transaction_count   integer          NOT NULL DEFAULT 0,
  import_error        text,
  csv_column_mapping  jsonb,
  created_at          timestamptz      NOT NULL DEFAULT now(),
  updated_at          timestamptz      NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_bank_statements_updated_at ON bank_statements;
CREATE TRIGGER trg_bank_statements_updated_at
  BEFORE UPDATE ON bank_statements
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE bank_statements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bank_statements: own rows only" ON bank_statements;
CREATE POLICY "bank_statements: own rows only"
  ON bank_statements FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────
-- Table: bank_transactions
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS bank_transactions (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  statement_id     uuid        NOT NULL REFERENCES bank_statements(id) ON DELETE CASCADE,
  transaction_date date        NOT NULL,
  description      text        NOT NULL,
  amount           numeric(12,2) NOT NULL,
  category         text,
  notes            text,
  card_last4       char(4),
  is_duplicate     boolean     NOT NULL DEFAULT false,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bank_tx_user_statement ON bank_transactions(user_id, statement_id);
CREATE INDEX IF NOT EXISTS idx_bank_tx_user_date       ON bank_transactions(user_id, transaction_date);
CREATE INDEX IF NOT EXISTS idx_bank_tx_user_card       ON bank_transactions(user_id, card_last4);
CREATE INDEX IF NOT EXISTS idx_bank_tx_user_amount     ON bank_transactions(user_id, amount);
CREATE INDEX IF NOT EXISTS idx_bank_tx_dedup
  ON bank_transactions(user_id, transaction_date, amount, (trim(lower(description))));

DROP TRIGGER IF EXISTS trg_bank_transactions_updated_at ON bank_transactions;
CREATE TRIGGER trg_bank_transactions_updated_at
  BEFORE UPDATE ON bank_transactions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE bank_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bank_transactions: own rows only" ON bank_transactions;
CREATE POLICY "bank_transactions: own rows only"
  ON bank_transactions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────
-- Table: reconciliation_matches
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS reconciliation_matches (
  id                  uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bank_transaction_id uuid          NOT NULL UNIQUE REFERENCES bank_transactions(id) ON DELETE CASCADE,
  receipt_id          uuid          NOT NULL UNIQUE REFERENCES receipts(id) ON DELETE CASCADE,
  match_type          match_type    NOT NULL,
  confidence_score    numeric(4,3)  NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
  created_at          timestamptz   NOT NULL DEFAULT now(),
  updated_at          timestamptz   NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_reconciliation_matches_updated_at ON reconciliation_matches;
CREATE TRIGGER trg_reconciliation_matches_updated_at
  BEFORE UPDATE ON reconciliation_matches
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE reconciliation_matches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reconciliation_matches: own rows only" ON reconciliation_matches;
CREATE POLICY "reconciliation_matches: own rows only"
  ON reconciliation_matches FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────
-- Realtime
-- ────────────────────────────────────────────────────────────

ALTER PUBLICATION supabase_realtime ADD TABLE receipts;
ALTER PUBLICATION supabase_realtime ADD TABLE bank_statements;
