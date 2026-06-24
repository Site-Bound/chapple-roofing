-- ═══════════════════════════════════════════════════════════════
-- Credvanta Client Portal — Supabase Setup (simplified)
-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor)
--
-- Only TWO tables are required. The portal's "My Cases" view
-- pulls directly from your existing live_cases table — the same
-- one used by the debtor payment lookup on the main website.
-- No portal_cases or document storage is needed.
-- ═══════════════════════════════════════════════════════════════

-- ── 1. Client login accounts ──────────────────────────────────
-- password_hash + password_salt are NULLABLE so the team can add
-- a row directly via the Supabase Table Editor without needing to
-- pre-generate a password. The Supabase webhook fires on insert,
-- emails the client a setup link, and they choose their own password
-- which then populates these columns.
CREATE TABLE IF NOT EXISTS portal_clients (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  client_ref    TEXT        UNIQUE NOT NULL,  -- login + filter (e.g. CRGC-26270501)
  email         TEXT        UNIQUE NOT NULL,
  full_name     TEXT,                         -- display name shown in the portal
  password_hash TEXT,                         -- nullable — set by the client via welcome link
  password_salt TEXT,                         -- nullable — set by the client via welcome link
  active        BOOLEAN     DEFAULT TRUE,
  last_login    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── Migrations for existing installations ─────────────────────
-- If upgrading from an old schema:
-- ALTER TABLE portal_clients DROP COLUMN IF EXISTS client_id;
-- ALTER TABLE portal_clients ALTER COLUMN password_hash DROP NOT NULL;
-- ALTER TABLE portal_clients ALTER COLUMN password_salt DROP NOT NULL;

-- ── 2. Password reset tokens ──────────────────────────────────
CREATE TABLE IF NOT EXISTS portal_reset_tokens (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  client_ref  TEXT        NOT NULL,
  token_hash  TEXT        NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  used        BOOLEAN     DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── 3. Payment log ────────────────────────────────────────────
-- Every successful Taylr payment is recorded here by the
-- /payment-callback Cloudflare Function. Captures what the client
-- asked for: case reference, client ID, amount paid, and the
-- acquirer authorisation code.
--
-- transaction_id (Taylr's gateway transactionID) is UNIQUE — this is
-- the idempotency guard. If Taylr re-sends a callback, the duplicate
-- INSERT is rejected (409) and the case balance is NOT reduced twice.
CREATE TABLE IF NOT EXISTS case_payments (
  id                     UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  case_reference_number  TEXT          NOT NULL,   -- = live_cases.case_reference_number / Taylr orderRef
  client_id              TEXT,                     -- = live_cases.client_id (creditor)
  amount                 NUMERIC(12,2) NOT NULL,   -- amount paid, in pounds
  authorisation_code     TEXT,                     -- Taylr authorisationCode
  transaction_id         TEXT          UNIQUE,     -- Taylr transactionID (idempotency key)
  transaction_unique     TEXT,                     -- our transactionUnique echoed back
  xref                   TEXT,                     -- Taylr cross-reference
  response_message       TEXT,
  status                 TEXT          DEFAULT 'success',
  created_at             TIMESTAMPTZ   DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_portal_reset_token_hash ON portal_reset_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_case_payments_caseref   ON case_payments(case_reference_number);
CREATE INDEX IF NOT EXISTS idx_case_payments_client    ON case_payments(client_id);

-- Enable RLS with no policies — only the service_role (which bypasses
-- RLS) can read or write. Our Cloudflare Functions use the service key,
-- so this is transparent to them. Anything using the anon key gets zero
-- access to these tables. Silences Supabase's "Table publicly accessible"
-- security advisory.
ALTER TABLE portal_clients      ENABLE ROW LEVEL SECURITY;
ALTER TABLE portal_reset_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_payments       ENABLE ROW LEVEL SECURITY;

-- Grant access to service role (required after Supabase May 2026 change)
GRANT ALL ON portal_clients      TO service_role;
GRANT ALL ON portal_reset_tokens TO service_role;
GRANT ALL ON case_payments       TO service_role;

-- ─────────────────────────────────────────────────────────────
-- IMPORTANT: client_ref in portal_clients MUST exactly match the
-- client_id value used in your live_cases table for that client.
--
-- The client's login reference IS their live_cases client_id —
-- one value, one purpose, no mapping required.
--
-- Example: if your team's internal record for a client is
--   live_cases.client_id = 'CRGC-26270501'
-- then create their portal account with:
--   client_ref = 'CRGC-26270501'
-- and the client logs in with that same reference.
--
-- The portal filters live_cases WHERE client_id = portal_clients.client_ref
-- to show each client only their own cases. Unique even if two
-- clients share the same business name.
-- ─────────────────────────────────────────────────────────────
