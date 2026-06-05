/* POST /portal/create-client
   { clientRef, email, fullName, password, adminKey }

   Admin-only endpoint to provision a new portal client account.
   Protected by PORTAL_ADMIN_KEY env variable.

   clientRef IS the team's internal live_cases.client_id (e.g.
   CRGC-26270501). The client logs in with this value, and the
   portal filters their cases using the same value. */

import { corsHeaders, json, err, onRequestOptions, hashPassword, generateSalt, sb }
  from './_shared.js';

export { onRequestOptions };

export async function onRequestPost(context) {
  const { request: req, env } = context;

  try {
    const { clientRef, email, fullName, password, adminKey } = await req.json();

    // Verify admin key
    if (!adminKey || adminKey !== env.PORTAL_ADMIN_KEY) {
      return err('Unauthorised.', 401, req);
    }

    if (!clientRef || !email || !password) {
      return err('clientRef, email and password are required.', 400, req);
    }
    if (password.length < 8) {
      return err('Password must be at least 8 characters.', 400, req);
    }

    const ref  = String(clientRef).trim().toUpperCase();
    const salt = generateSalt();
    const hash = await hashPassword(password, salt);

    const [client] = await sb(env).insert('portal_clients', {
      client_ref:    ref,
      email:         String(email).trim().toLowerCase(),
      full_name:     fullName ? String(fullName).trim() : null,
      password_hash: hash,
      password_salt: salt,
      active:        true,
    });

    return json({ ok: true, clientRef: ref, id: client.id }, 201, req);
  } catch (e) {
    console.error('[portal/create-client]', e);
    if (e.message?.includes('23505')) {
      return err('A client with this reference or email already exists.', 409, req);
    }
    return err('Failed to create client account.', 500, req);
  }
}
