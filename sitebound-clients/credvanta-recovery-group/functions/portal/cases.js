/* GET /portal/cases
   Returns all live_cases rows for the authenticated client.
   Filters by client_name matching the client's registered full_name
   so no separate portal_cases table is needed — the team manages
   cases in live_cases as normal and they appear in the portal
   automatically. */

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

    // Look up the client's registered full_name — used as the live_cases filter
    const clients = await sb(env).select('portal_clients', { client_ref: clientRef }, 'full_name');
    const client  = clients[0];
    if (!client?.full_name) return err('Client not found.', 404, req);

    // Fetch matching rows from live_cases using the service key
    const url = new URL(`${env.SUPABASE_URL}/rest/v1/live_cases`);
    url.searchParams.set(
      'select',
      'case_reference_number,client_invoice_number,debtor_business_name,debtor_contact_name,original_balance,current_balance,status'
    );
    url.searchParams.set('client_name', `eq.${client.full_name}`);
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
