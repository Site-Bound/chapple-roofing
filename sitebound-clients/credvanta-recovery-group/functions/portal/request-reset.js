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
    const baseUrl   = env.PORTAL_BASE_URL || 'https://portal.credvantarecovery.co.uk';
    const resetLink = `${baseUrl}/set-password.html?token=${rawToken}&ref=${encodeURIComponent(client.client_ref)}`;

    // Send email via Resend
    await fetch('https://api.resend.com/emails', {
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
          <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;color:#333">
            <div style="background:#1B2D4F;padding:24px 32px">
              <p style="color:#fff;font-size:20px;font-weight:700;margin:0">Credvanta Recovery Group</p>
              <p style="color:rgba(255,255,255,.7);font-size:13px;margin:4px 0 0">Client Portal</p>
            </div>
            <div style="padding:32px">
              <p style="font-size:16px">Hi ${client.full_name || client.client_ref},</p>
              <p>We received a request to reset the password for your client portal account.</p>
              <p>Click the button below to set a new password. This link expires in <strong>one hour</strong>.</p>
              <p style="text-align:center;margin:32px 0">
                <a href="${resetLink}" style="background:#1B2D4F;color:#fff;padding:14px 28px;border-radius:6px;text-decoration:none;font-weight:600;font-size:15px">
                  Reset my password
                </a>
              </p>
              <p style="font-size:13px;color:#888">If you didn't request this, you can safely ignore this email. Your password won't change.</p>
              <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
              <p style="font-size:12px;color:#aaa;margin:0">Credvanta Recovery Group · credvantarecovery.co.uk</p>
            </div>
          </div>
        `,
      }),
    });

    return json({ ok: true }, 200, req);
  } catch (e) {
    console.error('[portal/request-reset]', e);
    return err('Something went wrong — please try again.', 500, req);
  }
}
