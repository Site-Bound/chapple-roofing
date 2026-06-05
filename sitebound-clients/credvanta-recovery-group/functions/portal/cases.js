/* GET /portal/cases
   Returns all live_cases rows for the authenticated client.
   Filters by client_id (the team's internal unique reference like
   CRGC-xxxxxxxxxx) rather than client_name, so clients with the same
   business name are never confused with each other. */

import { json, err, onRequestOptions, verifySession, getBearer, sb }
  from './_shared.js';

export { onRequestOptions };

export async function onRequestGet(context) {
  const { request: req, env } = context;

  try {
    // Verify session
    const token     = getBearer(req);
    const clientRef = token ? await verifySession(token, env.PORTAL_SESSION_SECRET) : null;
    if (!clientRef) return err('Unauthorised.', 401, req);

    // Look up the client's linked live_cases client_id
    const clients = await sb(env).select('portal_clients', { client_ref: clientRef }, 'client_id');
    const client  = clients[0];
    if (!client?.client_id) {
      // Account exists but isn't linked to a live_cases client_id yet
      return json({ cases: [] }, 200, req);
    }

    // Fetch matching rows from live_cases using the service key
    const url = new URL(`${env.SUPABASE_URL}/rest/v1/live_cases`);
    url.searchParams.set(
      'select',
      'case_reference_number,client_invoice_number,debtor_business_name,debtor_contact_name,original_balance,current_balance,status'
    );
    url.searchParams.set('client_id', `eq.${client.client_id}`);
    url.searchParams.set('order', 'id.desc');

    const res = await fetch(url.toString(), {
      headers: {
        'apikey':        env.SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
      },
    });

    if (!res.ok) throw new Error(`live_cases query failed: ${res.status}`);

    const cases = await res.json();
    return json({ cases }, 200, req);

  } catch (e) {
    console.error('[portal/cases]', e);
    return err('Failed to load cases.', 500, req);
  }
}
