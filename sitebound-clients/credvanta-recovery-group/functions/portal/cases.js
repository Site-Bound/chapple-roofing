/* GET /portal/cases
   Returns all live_cases rows for the authenticated client.

   The portal client's login reference (client_ref) is identical to
   the team's internal client_id used in live_cases — so we filter
   directly without an intermediate lookup. One unique value per
   client, no mapping required. */

import { json, err, onRequestOptions, verifySession, getBearer }
  from './_shared.js';

export { onRequestOptions };

export async function onRequestGet(context) {
  const { request: req, env } = context;

  try {
    // Verify session — clientRef IS the live_cases.client_id (CRGC-xxxxxxxxxx)
    const token     = getBearer(req);
    const clientRef = token ? await verifySession(token, env.PORTAL_SESSION_SECRET) : null;
    if (!clientRef) return err('Unauthorised.', 401, req);

    // Fetch matching rows from live_cases using the service key
    const url = new URL(`${env.SUPABASE_URL}/rest/v1/live_cases`);
    url.searchParams.set(
      'select',
      'case_reference_number,client_invoice_number,debtor_business_name,debtor_contact_name,original_balance,current_balance,status'
    );
    url.searchParams.set('client_id', `eq.${clientRef}`);
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
