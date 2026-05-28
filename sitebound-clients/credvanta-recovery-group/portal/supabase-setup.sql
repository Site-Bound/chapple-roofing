-- ═══════════════════════════════════════════════════════════════
-- Credvanta Client Portal — Supabase Setup
-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor)
-- ═══════════════════════════════════════════════════════════════

-- Client credentials
CREATE TABLE IF NOT EXISTS portal_clients (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  client_ref    TEXT        UNIQUE NOT NULL,
  email         TEXT        UNIQUE NOT NULL,
  full_name     TEXT,
  password_hash TEXT        NOT NULL,
  password_salt TEXT        NOT NULL,
  active        BOOLEAN     DEFAULT TRUE,
  last_login    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Cases submitted by clients
CREATE TABLE IF NOT EXISTS portal_cases (
  id               UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  client_ref       TEXT          NOT NULL REFERENCES portal_clients(client_ref),
  debtor_name      TEXT          NOT NULL,
  debtor_company   TEXT,
  debtor_email     TEXT,
  debtor_phone     TEXT,
  debtor_address   TEXT,
  amount_owed      NUMERIC(10,2) NOT NULL,
  invoice_number   TEXT,
  invoice_date     DATE,
  description      TEXT,
  status           TEXT          DEFAULT 'submitted',
  status_notes     TEXT,
  status_updated_at TIMESTAMPTZ  DEFAULT NOW(),
  submitted_at     TIMESTAMPTZ   DEFAULT NOW(),
  updated_at       TIMESTAMPTZ   DEFAULT NOW()
);

-- Documents attached to cases
CREATE TABLE IF NOT EXISTS portal_case_documents (
  id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id      UUID        NOT NULL REFERENCES portal_cases(id) ON DELETE CASCADE,
  filename     TEXT        NOT NULL,
  storage_path TEXT        NOT NULL,
  file_size    INTEGER,
  file_type    TEXT,
  uploaded_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Password reset tokens
CREATE TABLE IF NOT EXISTS portal_reset_tokens (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  client_ref  TEXT        NOT NULL,
  token_hash  TEXT        NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  used        BOOLEAN     DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_portal_cases_client_ref   ON portal_cases(client_ref);
CREATE INDEX IF NOT EXISTS idx_portal_cases_status       ON portal_cases(status);
CREATE INDEX IF NOT EXISTS idx_portal_reset_token_hash   ON portal_reset_tokens(token_hash);

-- Disable RLS (server-side functions use service key — no RLS needed)
ALTER TABLE portal_clients          DISABLE ROW LEVEL SECURITY;
ALTER TABLE portal_cases            DISABLE ROW LEVEL SECURITY;
ALTER TABLE portal_case_documents   DISABLE ROW LEVEL SECURITY;
ALTER TABLE portal_reset_tokens     DISABLE ROW LEVEL SECURITY;

-- Grant access to service role (required after Supabase May 2026 change)
GRANT ALL ON portal_clients         TO service_role;
GRANT ALL ON portal_cases           TO service_role;
GRANT ALL ON portal_case_documents  TO service_role;
GRANT ALL ON portal_reset_tokens    TO service_role;

-- ── Storage bucket (run separately if needed) ─────────────────
-- In Supabase Dashboard → Storage → New bucket:
--   Name: portal-documents
--   Public: NO (private bucket)

-- ── Status values reference ───────────────────────────────────
-- submitted    → Just received (default)
-- active       → Being worked on
-- letter_sent  → Letter sent to debtor
-- in_dispute   → Disputed by debtor
-- legal        → Referred for legal action
-- settled      → Debt recovered
-- closed       → Case closed

-- ── Adding a new client (run per client) ─────────────────────
-- The portal /portal/login function handles password hashing.
-- To add a client manually, use the admin endpoint or insert directly:
--
-- INSERT INTO portal_clients (client_ref, email, full_name, password_hash, password_salt)
-- VALUES ('CRG-001', 'client@example.com', 'Client Name', '<hash>', '<salt>');
--
-- NOTE: Use the /portal/admin/create-client endpoint (if built) to
-- auto-generate the correct hash. Do NOT insert raw passwords.
