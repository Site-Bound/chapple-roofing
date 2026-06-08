/* POST /portal/create-client
   { clientRef, email, fullName, adminKey, password? }

   Admin-only endpoint to provision a new portal client account.
   Protected by PORTAL_ADMIN_KEY env variable.

   Backup route — the primary onboarding flow now happens
   automatically via the Supabase webhook → /portal/webhook/new-client.
   This endpoint is kept for direct API onboarding and testing. */

import { json, err, onRequestOptions, hashPassword, generateSalt, sb, sendWelcomeEmail }
  from './_shared.js';

export { onRequestOptions };

export async function onRequestPost(context) {
  const { request: req, env } = context;

  try {
    const { clientRef, email, fullName, password, adminKey } = await req.json();

    if (!adminKey || adminKey !== env.PORTAL_ADMIN_KEY) {
      return err('Unauthorised.', 401, req);
    }

    if (!clientRef || !email) {
      return err('clientRef and email are required.', 400, req);
    }

    const ref       = String(clientRef).trim().toUpperCase();
    const emailNorm = String(email).trim().toLowerCase();
    const name      = fullName ? String(fullName).trim() : null;

    // Initial password — placeholder unless an admin password was supplied
    const initialPassword = (password && String(password).length >= 8)
      ? String(password)
      : generateRandomPlaceholder();

    const salt = generateSalt();
    const hash = await hashPassword(initialPassword, salt);

    const [client] = await sb(env).insert('portal_clients', {
      client_ref:    ref,
      email:         emailNorm,
      full_name:     name,
      password_hash: hash,
      password_salt: salt,
      active:        true,
    });

    // Welcome email — non-blocking, kept alive by waitUntil
    const welcomePromise = sendWelcomeEmail(env, { clientRef: ref, email: emailNorm, fullName: name })
      .then(async r => {
        if (!r.ok) console.error('[portal/create-client] welcome email failed', r.status, await r.text());
      })
      .catch(e => console.error('[portal/create-client] welcome email error', e));
    context.waitUntil(welcomePromise);

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

function generateRandomPlaceholder() {
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}
