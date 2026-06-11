/* ═══════════════════════════════════════════════════════════════
   /payment-callback  — Taylr server-to-server notification handler
   Taylr POSTs a copy of every transaction response here independently
   of the browser redirect. Used for reliable reconciliation even if
   the customer closes their browser before /payment-complete loads.

   Behaviour:
     1. Parse the form body (application/x-www-form-urlencoded)
     2. Verify the inbound signature using TAYLR_SIGNING_KEY
     3. If verified AND payment was successful, log it.
        (Auto-balance-update is gated behind PAYMENT_AUTO_UPDATE_BALANCE
        env var — leave unset until Keiran confirms he wants it.)
     4. Always return HTTP 200 to Taylr — they retry on non-2xx and
        we don't want them to re-fire a successful notification.

   Security:
     - Constant-time signature comparison (in _taylr.js)
     - Unverified payloads are logged and discarded; we never mutate
       state based on an unsigned request.
   ═══════════════════════════════════════════════════════════════ */

import { verifySignature, classifyOutcome } from './_taylr.js';

export async function onRequestPost(context) {
  const { request: req, env } = context;

  let params = {};
  try {
    params = parseFormBody(await req.text());
  } catch (e) {
    console.error('[payment-callback] body parse error', e);
    return ok(); // Don't trigger Taylr retries on a malformed body
  }

  // Signature verification — discards anything we can't trust
  let verified = false;
  try {
    verified = await verifySignature(params, env.TAYLR_SIGNING_KEY);
  } catch (e) {
    console.error('[payment-callback] verify error', e);
  }

  if (!verified) {
    console.warn('[payment-callback] unverified payload — ignoring', {
      orderRef:     params.orderRef,
      transactionID: params.transactionID,
    });
    return ok();
  }

  const outcome = classifyOutcome(params);
  const orderRef = (params.orderRef || '').trim();
  const amountPence = parseInt(params.amount || '0', 10);
  const txID = params.transactionID || '';

  console.log('[payment-callback] verified callback', {
    outcome, orderRef, amountPence, txID,
    responseCode:    params.responseCode,
    responseStatus:  params.responseStatus,
    responseMessage: params.responseMessage,
  });

  // Successful payment — update the live_cases balance if enabled
  if (outcome === 'success' && env.PAYMENT_AUTO_UPDATE_BALANCE === 'true') {
    try {
      await reduceCaseBalance(env, orderRef, amountPence);
    } catch (e) {
      console.error('[payment-callback] balance update failed', e);
      // Still return 200 so Taylr doesn't retry — the payment was
      // recorded correctly on their side, we just couldn't sync.
    }
  }

  return ok();
}

/* ── Reduce live_cases.current_balance by the paid amount ───────
   Looks up by case_reference_number = orderRef (exact match).
   Marks the case 'Paid in Full' once the balance reaches zero. */
async function reduceCaseBalance(env, orderRef, amountPence) {
  if (!orderRef || !amountPence || amountPence <= 0) return;
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_KEY) {
    console.warn('[payment-callback] Supabase env vars missing — skip balance update');
    return;
  }

  const headers = {
    'apikey':        env.SUPABASE_SERVICE_KEY,
    'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
    'Content-Type':  'application/json',
  };

  // Fetch current balance
  const lookupUrl = `${env.SUPABASE_URL}/rest/v1/live_cases?case_reference_number=eq.${encodeURIComponent(orderRef)}&select=current_balance,status`;
  const lookupRes = await fetch(lookupUrl, { headers });
  if (!lookupRes.ok) throw new Error(`live_cases lookup failed: ${lookupRes.status}`);
  const rows = await lookupRes.json();
  if (rows.length === 0) {
    console.warn(`[payment-callback] no case found for orderRef ${orderRef}`);
    return;
  }

  const amountPounds = amountPence / 100;
  const newBalance = Math.max(0, Number(rows[0].current_balance || 0) - amountPounds);
  const newStatus  = newBalance === 0 ? 'Paid in Full' : rows[0].status;

  const patchUrl = `${env.SUPABASE_URL}/rest/v1/live_cases?case_reference_number=eq.${encodeURIComponent(orderRef)}`;
  const patchRes = await fetch(patchUrl, {
    method:  'PATCH',
    headers: { ...headers, 'Prefer': 'return=minimal' },
    body: JSON.stringify({
      current_balance:    newBalance,
      status:             newStatus,
      last_payment_date:  new Date().toISOString().slice(0, 10),
    }),
  });
  if (!patchRes.ok) throw new Error(`live_cases update failed: ${patchRes.status}`);
  console.log(`[payment-callback] balance updated for ${orderRef}: £${amountPounds} paid, new balance £${newBalance}, status ${newStatus}`);
}

function parseFormBody(text) {
  const out = {};
  const sp = new URLSearchParams(text);
  for (const [k, v] of sp.entries()) out[k] = v;
  return out;
}

function ok() {
  return new Response('OK', { status: 200, headers: { 'Content-Type': 'text/plain' } });
}
