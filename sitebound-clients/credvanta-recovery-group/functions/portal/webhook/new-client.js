/* POST /portal/webhook/new-client
   Supabase Database Webhook handler — fires when a portal_clients row
   is inserted or updated. Sends the welcome email automatically the
   moment a client_ref is allocated to a client record.

   Secured via shared secret in Authorization header (WEBHOOK_SECRET).

   ── Expected Supabase webhook payload ──────────────────────────
   {
     "type":   "INSERT" | "UPDATE",
     "table":  "portal_clients",
     "record": { id, client_ref, email, full_name, active, last_login, ... },
     "old_record": { ... } | null,
     "schema": "public"
   }

   ── Safety gates ───────────────────────────────────────────────
   The email only fires when ALL of these are true:
   - client_ref is set
   - email is set
   - active = true
   - last_login is null (so editing an existing client doesn't re-send)

   Any other case returns 200 with a skip reason logged — Supabase
   keeps the webhook healthy and we don't accidentally spam clients.
*/

import { json, err, onRequestOptions, sendWelcomeEmail }
  from '../_shared.js';

export { onRequestOptions };

export async function onRequestPost(context) {
  const { request: req, env } = context;

  try {
    // ── 1. Validate the shared secret ────────────────────────
    const auth     = req.headers.get('Authorization') || '';
    const expected = env.WEBHOOK_SECRET ? `Bearer ${env.WEBHOOK_SECRET}` : null;

    if (!expected) {
      console.error('[webhook/new-client] WEBHOOK_SECRET env var not configured');
      return err('Webhook not configured.', 500, req);
    }
    if (auth !== expected) {
      return err('Unauthorised.', 401, req);
    }

    // ── 2. Parse the webhook payload ─────────────────────────
    // Supabase wraps the row in `record`; tolerate direct calls too.
    const body   = await req.json();
    const record = body?.record || body;
    const event  = body?.type   || 'UNKNOWN';

    if (!record) {
      return json({ ok: true, skipped: 'no-record' }, 200, req);
    }

    // ── 3. Safety gates ──────────────────────────────────────
    const skips = [];
    if (!record.client_ref)        skips.push('no-client-ref');
    if (!record.email)             skips.push('no-email');
    if (record.active === false)   skips.push('inactive');
    if (record.last_login)         skips.push('already-logged-in');

    if (skips.length > 0) {
      console.log(`[webhook/new-client] ${event} on ${record.client_ref || '(unknown)'} — skipped: ${skips.join(', ')}`);
      return json({ ok: true, skipped: skips }, 200, req);
    }

    // ── 4. Send the welcome email (non-blocking) ─────────────
    console.log(`[webhook/new-client] ${event} on ${record.client_ref} — sending welcome to ${record.email}`);

    const welcomePromise = sendWelcomeEmail(env, {
      clientRef: record.client_ref,
      email:     record.email,
      fullName:  record.full_name,
    }).then(async r => {
      if (!r.ok) {
        console.error('[webhook/new-client] email send failed', r.status, await r.text());
      } else {
        console.log(`[webhook/new-client] welcome email sent to ${record.email}`);
      }
    }).catch(e => console.error('[webhook/new-client] email error', e));

    context.waitUntil(welcomePromise);

    return json({
      ok:          true,
      event,
      welcomeSent: true,
      clientRef:   record.client_ref,
      emailTo:     record.email,
    }, 200, req);

  } catch (e) {
    console.error('[webhook/new-client]', e);
    // Return 500 so Supabase retries the webhook
    return err('Webhook processing failed — please retry.', 500, req);
  }
}
