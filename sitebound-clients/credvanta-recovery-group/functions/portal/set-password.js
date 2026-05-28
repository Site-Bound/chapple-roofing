/* POST /portal/set-password  { token, clientRef, newPassword }
   Validates reset token and updates password */

import { corsHeaders, json, err, onRequestOptions, hashToken, hashPassword, generateSalt, sb }
  from './_shared.js';

export { onRequestOptions };

export async function onRequestPost(context) {
  const { request: req, env } = context;

  try {
    const { token, clientRef, newPassword } = await req.json();

    if (!token || !clientRef || !newPassword) {
      return err('Missing required fields.', 400, req);
    }
    if (newPassword.length < 8) {
      return err('Password must be at least 8 characters.', 400, req);
    }

    const ref       = String(clientRef).trim().toUpperCase();
    const tokenHash = await hashToken(token);
    const now       = new Date().toISOString();

    // Find valid, unused token
    const tokens = await sb(env).select('portal_reset_tokens', {
      client_ref: ref,
      token_hash: tokenHash,
      used:       'false',
    });

    const resetRecord = tokens.find(t => t.expires_at > now && !t.used);
    if (!resetRecord) {
      return err('This reset link is invalid or has expired. Please request a new one.', 400, req);
    }

    // Hash new password
    const salt = generateSalt();
    const hash = await hashPassword(newPassword, salt);

    // Update client password and mark token used
    await Promise.all([
      sb(env).update('portal_clients',
        { password_hash: hash, password_salt: salt },
        { client_ref: ref }
      ),
      sb(env).update('portal_reset_tokens',
        { used: true },
        { id: resetRecord.id }
      ),
    ]);

    return json({ ok: true }, 200, req);
  } catch (e) {
    console.error('[portal/set-password]', e);
    return err('Password reset failed — please try again.', 500, req);
  }
}
