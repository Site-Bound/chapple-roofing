/* ═══════════════════════════════════════════════════════════════
   /payment-callback  — Taylr server-to-server notification handler
   Taylr POSTs a copy of every transaction response here independently
   of the browser redirect. Used for reliable reconciliation even if
   the customer closes their browser before /payment-complete loads.

   Single Credvanta merchant account (merchant 290684). One merchant ID,
   one signing key. Funds settle to Credvanta, who pay creditors directly.

   Environment variables required:
     TAYLR_SIGNING_KEY: the live 290684 signing key
     PAYMENT_AUTO_UPDATE_BALANCE: true (default — anything but "false" enables)
     SUPABASE_URL, SUPABASE_SERVICE_KEY

   Behaviour:
     1. Parse the form body (application/x-www-form-urlencoded)
     2. Verify the inbound signature using TAYLR_SIGNING_KEY (constant-time)
     3. Classify outcome: success | declined | error
     4. If verified AND successful AND auto-update enabled:
        - Log the payment to case_payments (case ref, client_id, amount,
          authorisation code, transaction id) — UNIQUE on transaction_id
        - Reduce live_cases.current_balance by the amount paid
        - Mark 'Paid in Full' when the balance reaches zero
     5. IDEMPOTENT: a duplicate callback (Taylr retry) is caught by the
        unique transaction_id and will NOT reduce the balance a second time.
     6. Always return HTTP 200 to Taylr.

   Security:
     - Constant-time signature comparison (in _taylr.js)
     - Unverified payloads are logged and discarded; we never mutate
       state based on an unsigned request.
   ═══════════════════════════════════════════════════════════════ */

import { verifySignature, classifyOutcome, recordPaymentAndReduceBalance } from './_taylr.js';

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

  const outcome   = classifyOutcome(params);
  const orderRef  = (params.orderRef || '').trim();
  const amountPence         = parseInt(params.amount || '0', 10);
  const amountReceivedPence = parseInt(params.amountReceived || '0', 10);
  // amountReceived is the amount the acquirer actually authorised; fall
  // back to the requested amount when it isn't present.
  const paidPence = amountReceivedPence > 0 ? amountReceivedPence : amountPence;
  const txID      = params.transactionID || '';

  // Balance auto-update is ON unless explicitly disabled (case-insensitive,
  // trimmed) — only the literal string "false" turns it off.
  const autoUpdateEnabled =
    String(env.PAYMENT_AUTO_UPDATE_BALANCE ?? 'true').trim().toLowerCase() !== 'false';

  // Diagnostic mode — READ-ONLY. Only reachable with a VALID signature, so
  // only a caller holding the signing key can use it. Returns non-secret
  // config booleans and mutates nothing (returns BEFORE any DB write).
  if (params.__debug === '1') {
    return new Response(JSON.stringify({
      verified,
      outcome,
      autoUpdateEnabled,
      autoUpdateRaw:     env.PAYMENT_AUTO_UPDATE_BALANCE ?? null,
      hasSupabaseUrl:    !!env.SUPABASE_URL,
      hasServiceKey:     !!env.SUPABASE_SERVICE_KEY,
      orderRef,
      paidPence,
      transactionID:     txID,
      authorisationCode: params.authorisationCode || null,
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  console.log('[payment-callback] verified callback', {
    outcome, orderRef, paidPence, txID, autoUpdateEnabled,
    responseCode:   params.responseCode,
    responseStatus: params.responseStatus,
  });

  // Successful payment — log it and reduce the balance (idempotently).
  // Shared with /payment-complete; the UNIQUE transaction_id prevents any
  // double-processing if both the callback and the browser redirect fire.
  if (outcome === 'success' && autoUpdateEnabled) {
    try {
      await recordPaymentAndReduceBalance(env, params);
    } catch (e) {
      console.error('[payment-callback] payment processing failed', e);
      // Still return 200 so Taylr doesn't retry indefinitely. The payment
      // succeeded on Taylr's side and is reconcilable from case_payments.
    }
  }

  return ok();
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
