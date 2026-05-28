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
