/* ═══════════════════════════════════════════════════════════════
   Credvanta Client Portal — Shared Utilities
   Imported by all portal Cloudflare Pages Functions
   ═══════════════════════════════════════════════════════════════ */

// ── CORS ──────────────────────────────────────────────────────
export function corsHeaders(req) {
  const origin = req?.headers?.get('Origin') || '';
  const allowed =
    origin.includes('credvantarecovery.co.uk') ||
    origin.includes('credvantarecoverygroup.com') ||
    origin.includes('localhost')
      ? origin
      : 'https://portal.credvantarecovery.co.uk';
  return {
    'Access-Control-Allow-Origin':  allowed,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
  };
}

export function json(data, status = 200, req) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(req) },
  });
}

export function err(message, status = 400, req) {
  return json({ error: message }, status, req);
}

export async function onRequestOptions(context) {
  return new Response(null, { status: 204, headers: corsHeaders(context.request) });
}

// ── Session token (HMAC-SHA256 signed, 24h expiry) ────────────
export async function createSession(clientRef, secret) {
  const ts      = Date.now();
  const payload = `${clientRef}::${ts}`;
  const key     = await hmacKey(secret, ['sign']);
  const sig     = await crypto.subtle.sign('HMAC', key, enc(payload));
  return btoa(`${payload}::${hex(sig)}`);
}

export async function verifySession(token, secret, maxAgeMs = 86_400_000) {
  try {
    const decoded = atob(token);
    const parts   = decoded.split('::');
    if (parts.length !== 3) return null;
    const [clientRef, tsStr, sigHex] = parts;
    const ts = parseInt(tsStr, 10);
    if (!isFinite(ts) || Date.now() - ts > maxAgeMs) return null;
    const payload  = `${clientRef}::${tsStr}`;
    const key      = await hmacKey(secret, ['verify']);
    const sigBytes = hexToBytes(sigHex);
    const valid    = await crypto.subtle.verify('HMAC', key, sigBytes, enc(payload));
    return valid ? clientRef : null;
  } catch {
    return null;
  }
}

export function getBearer(req) {
  const auth = req.headers.get('Authorization') || '';
  return auth.startsWith('Bearer ') ? auth.slice(7) : null;
}

// ── Password (PBKDF2 via Web Crypto — works in CF Workers) ────
export function generateSalt() {
  return hex(crypto.getRandomValues(new Uint8Array(16)));
}

export async function hashPassword(password, salt) {
  const keyMaterial = await crypto.subtle.importKey(
    'raw', enc(password), 'PBKDF2', false, ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: enc(salt), iterations: 100_000, hash: 'SHA-256' },
    keyMaterial, 256
  );
  return hex(bits);
}

// ── Reset token ───────────────────────────────────────────────
export function generateToken() {
  return hex(crypto.getRandomValues(new Uint8Array(32)));
}

export async function hashToken(token) {
  return hex(await crypto.subtle.digest('SHA-256', enc(token)));
}

// ── Supabase REST helper (server-side, uses service key) ──────
export function sb(env) {
  const base    = `${env.SUPABASE_URL}/rest/v1`;
  const headers = {
    'apikey':        env.SUPABASE_SERVICE_KEY,
    'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
    'Content-Type':  'application/json',
    'Prefer':        'return=representation',
  };

  return {
    async select(table, filters = {}, cols = '*') {
      const url = new URL(`${base}/${table}`);
      url.searchParams.set('select', cols);
      for (const [k, v] of Object.entries(filters)) url.searchParams.set(k, `eq.${v}`);
      const res = await fetch(url.toString(), { headers });
      if (!res.ok) throw new Error(`Supabase select failed: ${res.status}`);
      return res.json();
    },

    async insert(table, data) {
      const res = await fetch(`${base}/${table}`, {
        method: 'POST', headers,
        body:   JSON.stringify(data),
      });
      if (!res.ok) throw new Error(`Supabase insert failed: ${res.status}`);
      return res.json();
    },

    async update(table, data, filters = {}) {
      const url = new URL(`${base}/${table}`);
      for (const [k, v] of Object.entries(filters)) url.searchParams.set(k, `eq.${v}`);
      const res = await fetch(url.toString(), {
        method: 'PATCH', headers,
        body:   JSON.stringify(data),
      });
      if (!res.ok) throw new Error(`Supabase update failed: ${res.status}`);
      return res.json();
    },

    async delete(table, filters = {}) {
      const url = new URL(`${base}/${table}`);
      for (const [k, v] of Object.entries(filters)) url.searchParams.set(k, `eq.${v}`);
      const res = await fetch(url.toString(), { method: 'DELETE', headers });
      if (!res.ok) throw new Error(`Supabase delete failed: ${res.status}`);
      return res.json();
    },

    // Upload a file to Supabase Storage
    async uploadFile(bucket, path, fileBuffer, contentType) {
      const url = `${env.SUPABASE_URL}/storage/v1/object/${bucket}/${path}`;
      const res = await fetch(url, {
        method:  'POST',
        headers: {
          'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
          'Content-Type':  contentType,
          'x-upsert':      'false',
        },
        body: fileBuffer,
      });
      if (!res.ok) throw new Error(`Storage upload failed: ${res.status}`);
      return res.json();
    },
  };
}

// ── Welcome email (used by /portal/create-client AND the Supabase webhook) ──
//
// Generates a one-time 7-day setup token, stores its hash, and sends a
// branded welcome email to the client with a "Set up your password" link.
// Returns the fetch promise so callers can wrap it in context.waitUntil().
const WELCOME_LINK_DAYS = 7;

export async function sendWelcomeEmail(env, { clientRef, email, fullName }) {
  const ref       = String(clientRef).trim().toUpperCase();
  const emailNorm = String(email).trim().toLowerCase();
  const name      = fullName ? String(fullName).trim() : null;

  // Generate and store the welcome token
  const rawToken  = generateToken();
  const tokenHash = await hashToken(rawToken);
  const expiresAt = new Date(Date.now() + WELCOME_LINK_DAYS * 86_400_000).toISOString();

  await sb(env).insert('portal_reset_tokens', {
    client_ref: ref,
    token_hash: tokenHash,
    expires_at: expiresAt,
  });

  const baseUrl   = env.PORTAL_BASE_URL || 'https://credvantarecovery.co.uk/portal';
  const setupLink = `${baseUrl}/set-password.html?token=${rawToken}&ref=${encodeURIComponent(ref)}`;
  const fromEmail = env.PORTAL_FROM_EMAIL || 'portal@credvantarecovery.co.uk';

  return fetch('https://api.resend.com/emails', {
    method:  'POST',
    headers: {
      'Authorization': `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({
      from:    fromEmail,
      to:      [emailNorm],
      subject: 'Welcome to the Credvanta Recovery Group Client Portal',
      html:    welcomeEmailHtml({ name, ref, setupLink, baseUrl }),
    }),
  });
}

function welcomeEmailHtml({ name, ref, setupLink, baseUrl }) {
  const greeting = name ? `Hi ${escHtml(name)},` : 'Hello,';
  return `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#333;background:#f4f6f9;padding:24px">
      <div style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.06)">
        <div style="background:#1B2D4F;padding:28px 32px">
          <p style="color:#fff;font-size:22px;font-weight:700;margin:0;line-height:1.2">Credvanta Recovery Group</p>
          <p style="color:rgba(255,255,255,0.7);font-size:13px;margin:6px 0 0">Client Portal &mdash; Your account is ready</p>
        </div>
        <div style="padding:32px">
          <p style="font-size:16px;margin:0 0 16px">${greeting}</p>
          <p style="font-size:15px;line-height:1.55;margin:0 0 16px">
            Welcome to the Credvanta Recovery Group Client Portal. Your account has been set up and is ready to use.
            From the portal you can submit new debts, track the status of your active cases, and stay in touch with our team &mdash; all in one place.
          </p>
          <p style="font-size:15px;line-height:1.55;margin:0 0 20px">
            To get started, please choose a password by clicking the button below:
          </p>
          <p style="text-align:center;margin:28px 0">
            <a href="${setupLink}"
               style="background:#1851C4;color:#fff;padding:14px 30px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;display:inline-block;box-shadow:0 2px 8px rgba(24,81,196,0.35)">
              Set up your password
            </a>
          </p>
          <p style="font-size:13px;color:#666;margin:0 0 24px;text-align:center">
            This link is valid for ${WELCOME_LINK_DAYS} days.
          </p>
          <div style="background:#f4f6f9;border-radius:8px;padding:16px 20px;margin:8px 0 20px">
            <p style="font-size:13px;color:#666;margin:0 0 6px;text-transform:uppercase;letter-spacing:0.05em;font-weight:600">
              Your details
            </p>
            <p style="font-size:14px;margin:0 0 4px"><strong>Client reference:</strong> ${escHtml(ref)}</p>
            <p style="font-size:14px;margin:0"><strong>Portal URL:</strong> <a href="${baseUrl}" style="color:#1851C4">${baseUrl.replace(/^https?:\/\//, '')}</a></p>
          </div>
          <p style="font-size:13px;color:#888;line-height:1.5;margin:0 0 16px">
            If the button above doesn't work, copy and paste this link into your browser:<br>
            <a href="${setupLink}" style="color:#1851C4;word-break:break-all">${setupLink}</a>
          </p>
          <p style="font-size:13px;color:#888;line-height:1.5;margin:0 0 8px">
            If you weren't expecting this email, please ignore it &mdash; no account changes have been made.
          </p>
          <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
          <p style="font-size:12px;color:#999;margin:0;line-height:1.5">
            Need help? Contact our team on <a href="tel:02081291490" style="color:#1851C4;font-weight:600">020 8129 1490</a> &mdash; available 24/7.
          </p>
          <p style="font-size:12px;color:#aaa;margin:8px 0 0">
            Credvanta Recovery Group Limited &middot; credvantarecovery.co.uk
          </p>
        </div>
      </div>
    </div>
  `;
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Internal helpers ──────────────────────────────────────────
const enc = str => new TextEncoder().encode(str);

function hex(buf) {
  return Array.from(new Uint8Array(buf instanceof ArrayBuffer ? buf : buf.buffer ?? buf))
    .map(b => b.toString(16).padStart(2, '0')).join('');
}

function hexToBytes(h) {
  return new Uint8Array(h.match(/.{2}/g).map(b => parseInt(b, 16)));
}

async function hmacKey(secret, usages) {
  return crypto.subtle.importKey(
    'raw', enc(secret), { name: 'HMAC', hash: 'SHA-256' }, false, usages
  );
}
