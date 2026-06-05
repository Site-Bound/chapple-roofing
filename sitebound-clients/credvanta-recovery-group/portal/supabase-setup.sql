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
  client_ref    TEXT        UNIQUE NOT NULL,  -- login + filter (e.g. CRGC-26270501)
  email         TEXT        UNIQUE NOT NULL,
  full_name     TEXT,                         -- display name shown in the portal
  password_hash TEXT        NOT NULL,
  password_salt TEXT        NOT NULL,
  active        BOOLEAN     DEFAULT TRUE,
  last_login    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- If upgrading from the old schema with a separate client_id column:
-- ALTER TABLE portal_clients DROP COLUMN IF EXISTS client_id;

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
