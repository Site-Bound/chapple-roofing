/* POST /portal/create-client
   { clientRef, email, fullName, adminKey, password? }

   Admin-only endpoint to provision a new portal client account.
   Protected by PORTAL_ADMIN_KEY env variable.

   clientRef IS the team's internal live_cases.client_id (e.g.
   CRGC-26270501). The client logs in with this value, and the
   portal filters their cases using the same value.

   FLOW:
   1. Account is created with a placeholder password (or one you supplied)
   2. A one-time "set password" token is generated (7-day expiry)
   3. A branded welcome email is sent to the client with a setup link
   4. Client clicks the link → set-password page → chooses their own password

   This means you never need to know or share the client's password. */

import { corsHeaders, json, err, onRequestOptions, hashPassword, generateSalt,
         generateToken, hashToken, sb }
  from './_shared.js';

export { onRequestOptions };

const WELCOME_LINK_DAYS = 7;

export async function onRequestPost(context) {
  const { request: req, env } = context;

  try {
    const { clientRef, email, fullName, password, adminKey } = await req.json();

    // ── Verify admin key ─────────────────────────────────────
    if (!adminKey || adminKey !== env.PORTAL_ADMIN_KEY) {
      return err('Unauthorised.', 401, req);
    }

    if (!clientRef || !email) {
      return err('clientRef and email are required.', 400, req);
    }

    const ref       = String(clientRef).trim().toUpperCase();
    const emailNorm = String(email).trim().toLowerCase();
    const name      = fullName ? String(fullName).trim() : null;

    // ── Set the initial password ─────────────────────────────
    // If an admin password was supplied, use it (handy for test accounts).
    // Otherwise generate a long random placeholder the client never sees —
    // they'll set their own via the welcome email link.
    const initialPassword = (password && String(password).length >= 8)
      ? String(password)
      : generateRandomPlaceholder();

    const salt = generateSalt();
    const hash = await hashPassword(initialPassword, salt);

    // ── Create the account ───────────────────────────────────
    const [client] = await sb(env).insert('portal_clients', {
      client_ref:    ref,
      email:         emailNorm,
      full_name:     name,
      password_hash: hash,
      password_salt: salt,
      active:        true,
    });

    // ── Generate welcome token (7-day expiry) ────────────────
    const rawToken  = generateToken();
    const tokenHash = await hashToken(rawToken);
    const expiresAt = new Date(Date.now() + WELCOME_LINK_DAYS * 86_400_000).toISOString();

    await sb(env).insert('portal_reset_tokens', {
      client_ref: ref,
      token_hash: tokenHash,
      expires_at: expiresAt,
    });

    // ── Send welcome email (non-blocking, kept alive by waitUntil) ──
    const baseUrl   = env.PORTAL_BASE_URL || 'https://credvantarecovery.co.uk/portal';
    const setupLink = `${baseUrl}/set-password.html?token=${rawToken}&ref=${encodeURIComponent(ref)}`;
    const fromEmail = env.PORTAL_FROM_EMAIL || 'portal@credvantarecovery.co.uk';

    const emailPromise = fetch('https://api.resend.com/emails', {
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
    }).then(async r => {
      if (!r.ok) console.error('[portal/create-client] welcome email failed', r.status, await r.text());
    }).catch(e => console.error('[portal/create-client] welcome email error', e));

    context.waitUntil(emailPromise);

    return json({
      ok:          true,
      clientRef:   ref,
      id:          client.id,
      welcomeSent: true,
      emailTo:     emailNorm,
    }, 201, req);

  } catch (e) {
    console.error('[portal/create-client]', e);
    if (e.message?.includes('23505')) {
      return err('A client with this reference or email already exists.', 409, req);
    }
    return err('Failed to create client account.', 500, req);
  }
}

/* ── 24-character random placeholder password ───────────────── */
function generateRandomPlaceholder() {
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

/* ── Branded welcome email template ─────────────────────────── */
function welcomeEmailHtml({ name, ref, setupLink, baseUrl }) {
  const greeting = name ? `Hi ${escapeHtml(name)},` : 'Hello,';
  return `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#333;background:#f4f6f9;padding:24px">
      <div style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.06)">
        <div style="background:#1B2D4F;padding:28px 32px">
          <p style="color:#fff;font-size:22px;font-weight:700;margin:0;line-height:1.2">Credvanta Recovery Group</p>
          <p style="color:rgba(255,255,255,0.7);font-size:13px;margin:6px 0 0">Client Portal — Your account is ready</p>
        </div>

        <div style="padding:32px">
          <p style="font-size:16px;margin:0 0 16px">${greeting}</p>

          <p style="font-size:15px;line-height:1.55;margin:0 0 16px">
            Welcome to the Credvanta Recovery Group Client Portal. Your account has been set up and is ready to use.
            From the portal you can submit new debts, track the status of your active cases, and message our team — all in one place.
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
            <p style="font-size:14px;margin:0 0 4px"><strong>Client reference:</strong> ${escapeHtml(ref)}</p>
            <p style="font-size:14px;margin:0"><strong>Portal URL:</strong> <a href="${baseUrl}" style="color:#1851C4">${baseUrl.replace(/^https?:\/\//, '')}</a></p>
          </div>

          <p style="font-size:13px;color:#888;line-height:1.5;margin:0 0 16px">
            If the button above doesn't work, copy and paste this link into your browser:<br>
            <a href="${setupLink}" style="color:#1851C4;word-break:break-all">${setupLink}</a>
          </p>

          <p style="font-size:13px;color:#888;line-height:1.5;margin:0 0 8px">
            If you weren't expecting this email, please ignore it — no account changes have been made.
          </p>

          <hr style="border:none;border-top:1px solid #eee;margin:24px 0">

          <p style="font-size:12px;color:#999;margin:0;line-height:1.5">
            Need help? Contact our team on <a href="tel:02081291490" style="color:#1851C4;font-weight:600">020 8129 1490</a> — available 24/7.
          </p>
          <p style="font-size:12px;color:#aaa;margin:8px 0 0">
            Credvanta Recovery Group Limited · credvantarecovery.co.uk
          </p>
        </div>
      </div>
    </div>
  `;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
