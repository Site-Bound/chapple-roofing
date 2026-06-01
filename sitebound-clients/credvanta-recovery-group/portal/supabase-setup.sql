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
CREATE TABLE IF NOT EXISTS portal_clients (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  client_ref    TEXT        UNIQUE NOT NULL,  -- e.g. CRG-001
  email         TEXT        UNIQUE NOT NULL,
  full_name     TEXT        NOT NULL,         -- MUST match client_name in live_cases
  password_hash TEXT        NOT NULL,
  password_salt TEXT        NOT NULL,
  active        BOOLEAN     DEFAULT TRUE,
  last_login    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── 2. Password reset tokens ──────────────────────────────────
CREATE TABLE IF NOT EXISTS portal_reset_tokens (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  client_ref  TEXT        NOT NULL,
  token_hash  TEXT        NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  used        BOOLEAN     DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_portal_reset_token_hash ON portal_reset_tokens(token_hash);

-- Disable RLS (server-side functions use service key — no RLS needed)
ALTER TABLE portal_clients       DISABLE ROW LEVEL SECURITY;
ALTER TABLE portal_reset_tokens  DISABLE ROW LEVEL SECURITY;

-- Grant access to service role (required after Supabase May 2026 change)
GRANT ALL ON portal_clients      TO service_role;
GRANT ALL ON portal_reset_tokens TO service_role;

-- ─────────────────────────────────────────────────────────────
-- IMPORTANT: full_name in portal_clients MUST exactly match
-- the client_name value used in your live_cases table.
--
-- Example: if cases for a client are stored in live_cases with
--   client_name = 'Growthline Connections Ltd'
-- then portal_clients must have:
--   full_name = 'Growthline Connections Ltd'
--
-- The portal filters live_cases WHERE client_name = full_name
-- to show each client only their own cases.
-- ─────────────────────────────────────────────────────────────
