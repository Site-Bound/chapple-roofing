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
  if (outcome === 'success' && autoUpdateEnabled) {
    try {
      await recordPaymentAndReduceBalance(env, {
        orderRef,
        paidPence,
        authorisationCode: params.authorisationCode || '',
        transactionID:     txID,
        transactionUnique: params.transactionUnique || '',
        xref:              params.xref || '',
        responseMessage:   params.responseMessage || '',
      });
    } catch (e) {
      console.error('[payment-callback] payment processing failed', e);
      // Still return 200 so Taylr doesn't retry indefinitely. The payment
      // succeeded on Taylr's side and is reconcilable from case_payments.
    }
  }

  return ok();
}

/* ── Log the payment + reduce the case balance (idempotent) ─────
   1. Look up the case (client_id, balance, status) by orderRef.
   2. Insert a row into case_payments. A UNIQUE constraint on
      transaction_id makes this the idempotency guard — a duplicate
      callback returns HTTP 409 and we stop without touching the balance.
   3. Only when the payment is newly logged do we reduce the balance
      and mark 'Paid in Full' at zero. */
async function recordPaymentAndReduceBalance(env, p) {
  const { orderRef, paidPence, authorisationCode, transactionID, transactionUnique, xref, responseMessage } = p;
  if (!orderRef || !paidPence || paidPence <= 0) return;
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_KEY) {
    console.warn('[payment-callback] Supabase env vars missing — skip');
    return;
  }

  const base    = `${env.SUPABASE_URL}/rest/v1`;
  const headers = {
    'apikey':        env.SUPABASE_SERVICE_KEY,
    'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
    'Content-Type':  'application/json',
  };

  // 1. Fetch the case (need client_id for the log, plus balance/status)
  const lookupRes = await fetch(
    `${base}/live_cases?case_reference_number=eq.${encodeURIComponent(orderRef)}&select=client_id,current_balance,status`,
    { headers }
  );
  if (!lookupRes.ok) throw new Error(`live_cases lookup failed: ${lookupRes.status}`);
  const rows = await lookupRes.json();
  if (rows.length === 0) {
    console.warn(`[payment-callback] no case found for orderRef ${orderRef} — payment not logged`);
    return;
  }
  const caseRow      = rows[0];
  const amountPounds = paidPence / 100;
  const txnId        = transactionID || transactionUnique || null;

  // 2. Idempotency guard — log the payment first. A duplicate
  //    transaction_id violates the UNIQUE constraint → 409 → stop.
  const insertRes = await fetch(`${base}/case_payments`, {
    method:  'POST',
    headers: { ...headers, 'Prefer': 'return=minimal' },
    body: JSON.stringify({
      case_reference_number: orderRef,
      client_id:             caseRow.client_id || null,
      amount:                amountPounds,
      authorisation_code:    authorisationCode || null,
      transaction_id:        txnId,
      transaction_unique:    transactionUnique || null,
      xref:                  xref || null,
      response_message:      responseMessage || null,
      status:                'success',
    }),
  });

  if (insertRes.status === 409) {
    console.log(`[payment-callback] duplicate callback for transaction ${txnId} — already processed, balance unchanged`);
    return;
  }
  if (!insertRes.ok) {
    const body = await insertRes.text().catch(() => '');
    throw new Error(`case_payments insert failed: ${insertRes.status} ${body}`);
  }

  // 3. Newly logged — now reduce the balance
  const newBalance = Math.max(0, Number(caseRow.current_balance || 0) - amountPounds);
  const newStatus  = newBalance === 0 ? 'Paid in Full' : caseRow.status;

  const patchRes = await fetch(
    `${base}/live_cases?case_reference_number=eq.${encodeURIComponent(orderRef)}`,
    {
      method:  'PATCH',
      headers: { ...headers, 'Prefer': 'return=minimal' },
      body: JSON.stringify({
        current_balance:   newBalance,
        status:            newStatus,
        last_payment_date: new Date().toISOString().slice(0, 10),
      }),
    }
  );
  if (!patchRes.ok) throw new Error(`live_cases update failed: ${patchRes.status}`);
  console.log(`[payment-callback] £${amountPounds} logged + balance for ${orderRef} now £${newBalance} (${newStatus}), auth ${authorisationCode || 'n/a'}`);
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
