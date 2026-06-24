/* ═══════════════════════════════════════════════════════════════
   Shared Taylr signature helpers — imported by sign-payment.js
   AND payment-complete.js so signing/verification stay in lockstep.
   ═══════════════════════════════════════════════════════════════ */

/* Generate a Taylr SHA-512 signature for a params object.
   Matches the gateway spec exactly:
     1. Sort fields by ASCII order on the key
     2. URL-encode pairs (RFC 1738, spaces as +)
     3. Normalise CR/LF sequences to single LF
     4. Append the secret key
     5. SHA-512 hash → lowercase hex */
export async function generateSignature(params, secret) {
  const sorted = Object.entries(params)
    .filter(([k]) => k !== 'signature') // never include the signature field itself
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${phpUrlencode(k)}=${phpUrlencode(String(v))}`)
    .join('&');

  const normalized = sorted.replace(/%0D%0A|%0A%0D|%0D/gi, '%0A');
  const toHash     = normalized + secret;
  const hashBuffer = await crypto.subtle.digest('SHA-512', new TextEncoder().encode(toHash));
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/* Verify that the signature on an inbound response matches what we'd
   compute from the rest of the fields. Constant-time comparison to
   avoid timing attacks. */
export async function verifySignature(params, secret) {
  const supplied = params.signature || '';
  if (!supplied) return false;
  const expected = await generateSignature(params, secret);
  return timingSafeEqual(supplied.toLowerCase(), expected.toLowerCase());
}

/* PHP urlencode() equivalent — RFC 1738 with spaces as + and
   the reserved punctuation set encoded. */
function phpUrlencode(str) {
  return encodeURIComponent(str)
    .replace(/%20/g, '+')
    .replace(/[!'()*]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase());
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}

/* Map responseCode/responseStatus → 'success' | 'declined' | 'error'.
   See Taylr Integration Guide → Response Fields. */
export function classifyOutcome(params) {
  const code   = String(params.responseCode || '');
  const status = String(params.responseStatus || '');
  if (code === '0' && status === '0') return 'success';
  if (status === '1' || code === '4' || code === '5') return 'declined';
  return 'error';
}

/* ── Record a payment + reduce the case balance (idempotent) ────
   Shared by BOTH /payment-callback (server-to-server) and
   /payment-complete (browser return), so the balance updates whichever
   path fires first. The UNIQUE transaction_id on case_payments is the
   idempotency guard: if both paths fire, only the first one reduces the
   balance — the second insert returns 409 and is a no-op.

   `params` is the parsed (and already signature-verified) Taylr response. */
export async function recordPaymentAndReduceBalance(env, params) {
  const autoUpdateEnabled =
    String(env.PAYMENT_AUTO_UPDATE_BALANCE ?? 'true').trim().toLowerCase() !== 'false';
  if (!autoUpdateEnabled) {
    console.warn('[payment] PAYMENT_AUTO_UPDATE_BALANCE is disabled — skipping balance update');
    return { ok: false, reason: 'disabled' };
  }
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_KEY) {
    console.error('[payment] SUPABASE_URL or SUPABASE_SERVICE_KEY env var missing — cannot update balance');
    return { ok: false, reason: 'no-supabase-env' };
  }

  const orderRef            = (params.orderRef || '').trim();
  const amountPence         = parseInt(params.amount || '0', 10);
  const amountReceivedPence = parseInt(params.amountReceived || '0', 10);
  const paidPence           = amountReceivedPence > 0 ? amountReceivedPence : amountPence;
  if (!orderRef || !paidPence || paidPence <= 0) {
    console.error('[payment] missing orderRef or amount — cannot update balance', { orderRef, amountPence, amountReceivedPence });
    return { ok: false, reason: 'no-amount-or-ref' };
  }

  const txnId   = params.transactionID || params.transactionUnique || null;
  const base    = `${env.SUPABASE_URL}/rest/v1`;
  const headers = {
    'apikey':        env.SUPABASE_SERVICE_KEY,
    'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
    'Content-Type':  'application/json',
  };

  // Look up the case (client_id for the log, plus balance/status)
  const lookupRes = await fetch(
    `${base}/live_cases?case_reference_number=eq.${encodeURIComponent(orderRef)}&select=client_id,current_balance,status`,
    { headers }
  );
  if (!lookupRes.ok) throw new Error(`live_cases lookup failed: ${lookupRes.status}`);
  const rows = await lookupRes.json();
  if (!rows.length) {
    console.warn(`[payment] no case found for orderRef ${orderRef} — not logged`);
    return { ok: false, reason: 'no-case' };
  }
  const caseRow      = rows[0];
  const amountPounds = paidPence / 100;

  // Idempotency guard: log the payment first. Duplicate transaction_id → 409 → stop.
  const insertRes = await fetch(`${base}/case_payments`, {
    method:  'POST',
    headers: { ...headers, 'Prefer': 'return=minimal' },
    body: JSON.stringify({
      case_reference_number: orderRef,
      client_id:             caseRow.client_id || null,
      amount:                amountPounds,
      authorisation_code:    params.authorisationCode || null,
      transaction_id:        txnId,
      transaction_unique:    params.transactionUnique || null,
      xref:                  params.xref || null,
      response_message:      params.responseMessage || null,
      status:                'success',
    }),
  });
  if (insertRes.status === 409) {
    console.log(`[payment] duplicate transaction ${txnId} — already processed, balance unchanged`);
    return { ok: true, duplicate: true };
  }
  if (!insertRes.ok) {
    const body = await insertRes.text().catch(() => '');
    throw new Error(`case_payments insert failed: ${insertRes.status} ${body}`);
  }

  // Newly logged — reduce the balance, mark Paid in Full at zero
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
  console.log(`[payment] £${amountPounds} logged + ${orderRef} balance now £${newBalance} (${newStatus}), auth ${params.authorisationCode || 'n/a'}`);
  return { ok: true, newBalance, status: newStatus };
}
