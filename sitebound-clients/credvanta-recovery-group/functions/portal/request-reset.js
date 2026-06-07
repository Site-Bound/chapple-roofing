/* POST /portal/request-reset  { email }
   Sends a password reset link to the client's registered email */

import { corsHeaders, json, err, onRequestOptions, generateToken, hashToken, sb }
  from './_shared.js';

export { onRequestOptions };

export async function onRequestPost(context) {
  const { request: req, env } = context;

  try {
    const { email } = await req.json();
    if (!email) return err('Email address is required.', 400, req);

    const emailNorm = String(email).trim().toLowerCase();

    // Look up client by email — always return success to avoid enumeration
    const clients = await sb(env).select('portal_clients', { email: emailNorm });
    const client  = clients[0];

    if (!client || !client.active) {
      // Don't reveal whether the email exists
      return json({ ok: true }, 200, req);
    }

    // Generate token, store hash in DB
    const rawToken   = generateToken();
    const tokenHash  = await hashToken(rawToken);
    const expiresAt  = new Date(Date.now() + 3_600_000).toISOString(); // 1 hour

    await sb(env).insert('portal_reset_tokens', {
      client_ref: client.client_ref,
      token_hash: tokenHash,
      expires_at: expiresAt,
    });

    // Build reset link
    const baseUrl   = env.PORTAL_BASE_URL || 'https://credvantarecovery.co.uk/portal';
    const resetLink = `${baseUrl}/set-password.html?token=${rawToken}&ref=${encodeURIComponent(client.client_ref)}`;
    const greeting  = client.full_name ? `Hi ${escapeHtml(client.full_name)},` : 'Hello,';

    // Send email via Resend
    const emailPromise = fetch('https://api.resend.com/emails', {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        from:    env.PORTAL_FROM_EMAIL || 'portal@credvantarecovery.co.uk',
        to:      [emailNorm],
        subject: 'Reset your Credvanta Client Portal password',
        html: `
          <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#333;background:#f4f6f9;padding:24px">
            <div style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.06)">
              <div style="background:#1B2D4F;padding:28px 32px">
                <p style="color:#fff;font-size:22px;font-weight:700;margin:0;line-height:1.2">Credvanta Recovery Group</p>
                <p style="color:rgba(255,255,255,0.7);font-size:13px;margin:6px 0 0">Client Portal — Password reset</p>
              </div>

              <div style="padding:32px">
                <p style="font-size:16px;margin:0 0 16px">${greeting}</p>

                <p style="font-size:15px;line-height:1.55;margin:0 0 16px">
                  We received a request to reset the password for your client portal account.
                </p>

                <p style="font-size:15px;line-height:1.55;margin:0 0 20px">
                  Click the button below to choose a new password. This link is valid for <strong>one hour</strong>.
                </p>

                <p style="text-align:center;margin:28px 0">
                  <a href="${resetLink}"
                     style="background:#1851C4;color:#fff;padding:14px 30px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;display:inline-block;box-shadow:0 2px 8px rgba(24,81,196,0.35)">
                    Reset my password
                  </a>
                </p>

                <p style="font-size:13px;color:#888;line-height:1.5;margin:0 0 16px">
                  If the button above doesn't work, copy and paste this link into your browser:<br>
                  <a href="${resetLink}" style="color:#1851C4;word-break:break-all">${resetLink}</a>
                </p>

                <p style="font-size:13px;color:#888;line-height:1.5;margin:0 0 8px">
                  If you didn't request this, you can safely ignore this email — your password won't change.
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
        `,
      }),
    }).then(async r => {
      if (!r.ok) console.error('[portal/request-reset] email failed', r.status, await r.text());
    }).catch(e => console.error('[portal/request-reset] email error', e));

    context.waitUntil(emailPromise);

    return json({ ok: true }, 200, req);
  } catch (e) {
    console.error('[portal/request-reset]', e);
    return err('Something went wrong — please try again.', 500, req);
  }
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
