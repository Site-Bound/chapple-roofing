/* ═══════════════════════════════════════════════════════════════
   /payment-complete  — Taylr return handler
   Receives the HTTP POST that Taylr issues at the end of a hosted
   payment session, verifies the inbound signature, then redirects
   to the static HTML page with the relevant outcome flags so the
   browser can display a success or failure state.
   ═══════════════════════════════════════════════════════════════ */

import { verifySignature, classifyOutcome, recordPaymentAndReduceBalance } from './_taylr.js';

// Static receipt page. Renamed from payment-complete.html so it doesn't
// collide with this Function endpoint at /payment-complete — Cloudflare
// Pages would otherwise strip the .html and bounce us into a redirect
// loop (Function → /payment-complete.html → strip → /payment-complete → …).
const STATIC_PAGE = '/payment-receipt.html';

/* Taylr posts the response body as application/x-www-form-urlencoded.
   We parse it, verify the signature, then redirect to the static page
   with a small set of safe query params for the UI to read.        */
export async function onRequestPost(context) {
  const { request: req, env } = context;

  let params = {};
  try {
    const formText = await req.text();
    params = parseFormBody(formText);
  } catch (e) {
    console.error('[payment-complete] body parse error', e);
    return redirectTo(`${STATIC_PAGE}?status=error&reason=parse`);
  }

  // Verify the signature using the same SIGNING KEY we sign requests with.
  // If verification fails we still send the customer to the failure page
  // but flag the request as untrusted so it shows the generic failure UI.
  let verified = false;
  try {
    verified = await verifySignature(params, env.TAYLR_SIGNING_KEY);
  } catch (e) {
    console.error('[payment-complete] verify error', e);
  }

  const outcome = classifyOutcome(params);

  // Update Supabase HERE too — not only in the async /payment-callback.
  // Taylr's browser redirect to this endpoint reliably fires (it's what
  // shows the customer the receipt), whereas the separate server-to-server
  // callback may not. Doing the idempotent update here guarantees the
  // balance/payment-log are written even if the callback never arrives.
  // The UNIQUE transaction_id means if the callback DOES also fire, it's a
  // no-op. We await it so it completes before the Worker is torn down, and
  // never let a failure block the customer's redirect.
  if (verified && outcome === 'success') {
    try {
      await recordPaymentAndReduceBalance(env, params);
    } catch (e) {
      console.error('[payment-complete] balance update failed', e);
    }
  }

  const qs = new URLSearchParams({
    status:      verified ? outcome : 'error',
    orderRef:    params.orderRef     || '',
    transactionID: params.transactionID || '',
    amount:      params.amount       || '',
    responseMessage: params.responseMessage || '',
    verified:    verified ? '1' : '0',
  });

  return redirectTo(`${STATIC_PAGE}?${qs.toString()}`);
}

/* If a browser hits /payment-complete via GET (e.g. someone reloads
   the URL or visits it directly), just send them to the static page. */
export async function onRequestGet() {
  return redirectTo(STATIC_PAGE);
}

/* ── Helpers ────────────────────────────────────────────────── */

function parseFormBody(text) {
  const out = {};
  const sp = new URLSearchParams(text);
  for (const [k, v] of sp.entries()) out[k] = v;
  return out;
}

function redirectTo(location) {
  // 303 See Other ensures the browser does a GET on the target page
  return new Response(null, { status: 303, headers: { Location: location } });
}
