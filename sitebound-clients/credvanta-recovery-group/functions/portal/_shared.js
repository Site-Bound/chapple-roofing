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
      subject: 'Welcome to Credvanta Recovery Group — Your Client Portal is Ready',
      html:    welcomeEmailHtml({ name, ref, setupLink, baseUrl }),
    }),
  });
}

function welcomeEmailHtml({ name, ref, setupLink, baseUrl }) {
  const greeting   = name ? `Dear ${escHtml(name)},` : 'Hello,';
  const portalHost = baseUrl.replace(/^https?:\/\//, '');

  // Shared inline styles
  const H2 = 'font-family:Arial,sans-serif;font-size:16px;font-weight:700;color:#1B2D4F;margin:28px 0 10px;letter-spacing:0.01em;';
  const P  = 'font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#333;margin:0 0 14px;';
  const LI = 'font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#333;margin:0 0 8px;';

  return `
    <div style="font-family:Arial,sans-serif;background:#f4f6f9;padding:24px 12px;margin:0">
      <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.06)">

        <!-- Header band -->
        <div style="background:#1B2D4F;padding:28px 32px">
          <p style="color:#fff;font-family:Arial,sans-serif;font-size:22px;font-weight:700;margin:0;line-height:1.2">Credvanta Recovery Group</p>
          <p style="color:rgba(255,255,255,0.75);font-family:Arial,sans-serif;font-size:13px;margin:6px 0 0">Client Portal &mdash; Welcome</p>
        </div>

        <div style="padding:32px">

          <!-- Greeting + intro -->
          <p style="${P}">${greeting}</p>

          <p style="${P}">Welcome to Credvanta Recovery Group.</p>

          <p style="${P}">
            We are delighted to have you on board and look forward to supporting your business with debt recovery and credit management services.
          </p>

          <!-- Client details -->
          <h2 style="${H2}">Your Client Details</h2>

          <div style="background:#f4f6f9;border-left:4px solid #1851C4;border-radius:6px;padding:14px 18px;margin:0 0 14px">
            <p style="font-family:Arial,sans-serif;font-size:14px;color:#6B7280;margin:0 0 4px;text-transform:uppercase;letter-spacing:0.05em;font-weight:600">Client Reference Number</p>
            <p style="font-family:Arial,sans-serif;font-size:18px;color:#1B2D4F;font-weight:700;margin:0;letter-spacing:0.02em">${escHtml(ref)}</p>
          </div>

          <p style="${P}">
            Please keep this reference number for your records as it may be requested by our team when discussing your account.
          </p>

          <!-- Portal access -->
          <h2 style="${H2}">Client Portal Access</h2>

          <p style="${P}">You can access your secure client portal using the details below:</p>

          <table style="width:100%;border-collapse:collapse;margin:0 0 18px;font-family:Arial,sans-serif;font-size:15px">
            <tr>
              <td style="padding:8px 0;color:#6B7280;width:130px;vertical-align:top"><strong style="color:#1B2D4F">Portal URL:</strong></td>
              <td style="padding:8px 0"><a href="${baseUrl}" style="color:#1851C4;text-decoration:none;font-weight:600">${portalHost}</a></td>
            </tr>
            <tr>
              <td style="padding:8px 0;color:#6B7280;vertical-align:top"><strong style="color:#1B2D4F">Username:</strong></td>
              <td style="padding:8px 0;color:#1B2D4F;font-weight:600;letter-spacing:0.02em">${escHtml(ref)}</td>
            </tr>
          </table>

          <p style="${P}">To get started, please set up your password by clicking the button below:</p>

          <p style="text-align:center;margin:28px 0">
            <a href="${setupLink}"
               style="background:#1851C4;color:#fff;font-family:Arial,sans-serif;padding:14px 36px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;display:inline-block;box-shadow:0 2px 8px rgba(24,81,196,0.35)">
              Set up my password and log in
            </a>
          </p>

          <p style="font-family:Arial,sans-serif;font-size:13px;color:#666;margin:0 0 8px;text-align:center">
            This link is valid for ${WELCOME_LINK_DAYS} days.
          </p>

          <p style="font-family:Arial,sans-serif;font-size:13px;color:#888;line-height:1.5;margin:0 0 22px">
            <em>For your security, we don't send passwords by email. The button above takes you to a secure page where you'll choose your own password. After that, you'll log in at <a href="${baseUrl}" style="color:#1851C4">${portalHost}</a> using your Username and the password you set.</em>
          </p>

          <!-- What you can do -->
          <h2 style="${H2}">What You Can Do Through The Portal</h2>

          <p style="${P}">Your client portal is the central hub for managing your account with Credvanta.</p>
          <p style="${P}">Through the portal, you can:</p>

          <ul style="padding:0 0 0 20px;margin:0 0 18px">
            <li style="${LI}">Submit new debt recovery instructions.</li>
            <li style="${LI}">View all cases you have instructed us on.</li>
            <li style="${LI}">Track the progress of each case in real time.</li>
            <li style="${LI}">Upload supporting documents and evidence.</li>
            <li style="${LI}">View updates from our recovery team.</li>
            <li style="${LI}">Monitor outstanding balances and recovery activity.</li>
            <li style="${LI}">Communicate securely with our team.</li>
          </ul>

          <!-- Case submission -->
          <h2 style="${H2}">Case Submission &amp; Review Process</h2>

          <p style="${P}">All new cases submitted through the portal are reviewed by our team before recovery action begins.</p>

          <p style="${P}">
            Once a case has been submitted, it will be reviewed and approved within 24 hours. Following approval, the case will be allocated to a member of our recovery team and will then appear within your portal for tracking and management.
          </p>

          <p style="${P}">
            You will be able to monitor progress, view updates and follow the status of each case directly from your portal once work has commenced.
          </p>

          <!-- Important note -->
          <h2 style="${H2}">Important &mdash; Case Reference Numbers</h2>

          <p style="${P}">Each case submitted to Credvanta will be assigned its own unique Case Reference Number.</p>

          <p style="${P}">
            If you contact our team by telephone or email regarding a specific matter, please quote the relevant Case Reference Number. This allows us to locate the correct file quickly and provide you with the most accurate update.
          </p>

          <p style="${P}">
            Please note that your <strong>Client Reference Number</strong> identifies your organisation, while individual <strong>Case Reference Numbers</strong> identify specific debt recovery matters.
          </p>

          <!-- Need help -->
          <h2 style="${H2}">Need Assistance?</h2>

          <p style="${P}">Our team is available 24 hours a day, 7 days a week to support you.</p>

          <p style="${P}">
            If you need assistance with your account, require an update on a case, or need help submitting a new instruction, please do not hesitate to contact us.
          </p>

          <table style="width:100%;border-collapse:collapse;margin:0 0 18px;font-family:Arial,sans-serif;font-size:15px">
            <tr>
              <td style="padding:6px 0;color:#6B7280;width:110px;vertical-align:top"><strong style="color:#1B2D4F">Telephone:</strong></td>
              <td style="padding:6px 0"><a href="tel:02081291490" style="color:#1851C4;text-decoration:none;font-weight:600">020 8129 1490</a></td>
            </tr>
            <tr>
              <td style="padding:6px 0;color:#6B7280;vertical-align:top"><strong style="color:#1B2D4F">Email:</strong></td>
              <td style="padding:6px 0"><a href="mailto:recover@credvanta.co.uk" style="color:#1851C4;text-decoration:none;font-weight:600">recover@credvanta.co.uk</a></td>
            </tr>
          </table>

          <p style="${P}">
            When contacting us regarding a specific case, please have the relevant Case Reference Number available to help us assist you as quickly as possible.
          </p>

          <!-- Sign-off -->
          <p style="${P}margin-top:24px">
            Thank you for choosing Credvanta Recovery Group. We look forward to helping you recover outstanding debts, improve cash flow and protect your business from bad debt.
          </p>

          <p style="${P}margin-top:24px">Kind regards,</p>

          <p style="font-family:Arial,sans-serif;font-size:15px;line-height:1.4;color:#1B2D4F;margin:0">
            <strong>Client Success Team</strong><br>
            Credvanta Recovery Group<br>
            <a href="https://www.credvanta.co.uk" style="color:#1851C4;text-decoration:none">www.credvanta.co.uk</a>
          </p>

          <!-- Setup link fallback -->
          <hr style="border:none;border-top:1px solid #eee;margin:28px 0 18px">

          <p style="font-family:Arial,sans-serif;font-size:12px;color:#999;line-height:1.5;margin:0 0 8px">
            <strong>Trouble with the button?</strong> Copy and paste this link into your browser:<br>
            <a href="${setupLink}" style="color:#1851C4;word-break:break-all">${setupLink}</a>
          </p>

          <p style="font-family:Arial,sans-serif;font-size:12px;color:#aaa;line-height:1.5;margin:8px 0 0">
            If you weren't expecting this email, please ignore it &mdash; no account changes have been made.
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
