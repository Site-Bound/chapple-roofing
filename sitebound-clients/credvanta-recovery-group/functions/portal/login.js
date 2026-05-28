/* POST /portal/login  { clientRef, password }
   Returns { token, clientRef, fullName } on success */

import { corsHeaders, json, err, onRequestOptions, hashPassword, createSession, sb }
  from './_shared.js';

export { onRequestOptions };

export async function onRequestPost(context) {
  const { request: req, env } = context;

  try {
    const { clientRef, password } = await req.json();

    if (!clientRef || !password) {
      return err('Client reference and password are required.', 400, req);
    }

    const ref = String(clientRef).trim().toUpperCase();

    // Look up client
    const clients = await sb(env).select('portal_clients', { client_ref: ref });
    const client  = clients[0];

    if (!client || !client.active) {
      return err('Invalid credentials.', 401, req);
    }

    // Verify password
    const hash = await hashPassword(password, client.password_salt);
    if (hash !== client.password_hash) {
      return err('Invalid credentials.', 401, req);
    }

    // Update last login
    await sb(env).update('portal_clients', { last_login: new Date().toISOString() }, { client_ref: ref });

    // Issue session token
    const token = await createSession(ref, env.PORTAL_SESSION_SECRET);

    return json({ token, clientRef: ref, fullName: client.full_name || ref }, 200, req);
  } catch (e) {
    console.error('[portal/login]', e);
    return err('Login failed — please try again.', 500, req);
  }
}
