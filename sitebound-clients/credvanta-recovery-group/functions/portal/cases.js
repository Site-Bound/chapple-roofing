/* GET /portal/cases
   Returns all cases for the authenticated client */

import { corsHeaders, json, err, onRequestOptions, verifySession, getBearer, sb }
  from './_shared.js';

export { onRequestOptions };

export async function onRequestGet(context) {
  const { request: req, env } = context;

  try {
    // Verify session
    const token     = getBearer(req);
    const clientRef = token ? await verifySession(token, env.PORTAL_SESSION_SECRET) : null;
    if (!clientRef) return err('Unauthorised.', 401, req);

    // Fetch cases
    const url = new URL(`${env.SUPABASE_URL}/rest/v1/portal_cases`);
    url.searchParams.set('select', 'id,debtor_name,debtor_company,amount_owed,invoice_number,status,status_notes,submitted_at,status_updated_at,portal_case_documents(id,filename,file_size,file_type)');
    url.searchParams.set('client_ref', `eq.${clientRef}`);
    url.searchParams.set('order', 'submitted_at.desc');

    const res   = await fetch(url.toString(), {
      headers: {
        'apikey':        env.SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
        'Content-Type':  'application/json',
      },
    });

    const cases = await res.json();
    return json({ cases }, 200, req);
  } catch (e) {
    console.error('[portal/cases]', e);
    return err('Failed to load cases.', 500, req);
  }
}
