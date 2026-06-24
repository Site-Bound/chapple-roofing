/* ═══════════════════════════════════════════════════════════════
   Taylr payment signing — Cloudflare Pages Function
   POST /sign-payment  { amount, ref, email }
   Returns { endpoint, params } with SHA-512 signature

   Single Credvanta merchant account (290684). The merchant ID always
   comes from TAYLR_MERCHANT_ID — any merchantId in the request body is
   ignored, so funds can only ever route to the Credvanta account.

   Environment variables required (set in Cloudflare Dashboard):
     TAYLR_MERCHANT_ID: 290684 (LIVE account)
     TAYLR_SIGNING_KEY: 5fbfb863c18792acbb4e36ca6c88411e73b34354fd331deeed9244f94e407221
     PAYMENT_AUTO_UPDATE_BALANCE: true
     SUPABASE_URL, SUPABASE_SERVICE_KEY

   Taylr hosted endpoint: https://payments.taylr.io/hosted/
   IP whitelisting: DISABLED (Cloudflare Workers use rotating IPs)

   Flow:
   1. POST to /sign-payment with { amount, ref, email }
   2. Returns { endpoint, params } — frontend POSTs these to Taylr
   3. Taylr redirects customer to /payment-complete (signed response)
   4. Function verifies signature, redirects to /payment-receipt.html
   5. Taylr POSTs to /payment-callback (server-to-server, independent)
   6. Callback verifies signature, updates live_cases.current_balance
   ═══════════════════════════════════════════════════════════════ */

import { generateSignature } from './_taylr.js';

const TAYLR_ENDPOINT = 'https://payments.taylr.io/hosted/';
const SITE_ORIGIN    = 'https://www.credvantarecovery.co.uk';
const REDIRECT_URL   = `${SITE_ORIGIN}/payment-complete`;
const CALLBACK_URL   = `${SITE_ORIGIN}/payment-callback`;

export async function onRequestPost(context) {
  try {
    const SIGNING_KEY = context.env.TAYLR_SIGNING_KEY;
    if (!SIGNING_KEY) return errorResponse('Payment configuration error — please contact support', 500, context.request);

    const body = await context.request.json();
    const { amount, ref, email } = body;

    // Single Credvanta merchant account. We always use the configured
    // merchant ID and deliberately IGNORE any client-supplied merchantId,
    // so a payment can only ever route to the Credvanta account (290684).
    const MERCHANT_ID = context.env.TAYLR_MERCHANT_ID;

    if (!MERCHANT_ID)         return errorResponse('Payment configuration error — please contact support', 500, context.request);
    if (!amount || !ref)      return errorResponse('Missing required fields: amount and ref', 400, context.request);

    const amountPence = Math.round(parseFloat(amount) * 100);
    if (!Number.isFinite(amountPence) || amountPence <= 0) {
      return errorResponse('Invalid amount', 400, context.request);
    }

    const transactionUnique = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

    const params = {
      action:            'SALE',
      amount:            String(amountPence),
      callbackURL:       CALLBACK_URL,
      countryCode:       '826',
      currencyCode:      '826',
      merchantID:        MERCHANT_ID,
      // merchantWebsite is required by the gateway — it identifies the
      // originating site to the acquirer. Without it Taylr returns
      // "Missing merchantWebsite" and the transaction never reaches
      // the card form.
      merchantWebsite:   SITE_ORIGIN,
      orderRef:          String(ref).trim().toUpperCase(),
      redirectURL:       REDIRECT_URL,
      transactionUnique,
      type:              '1',
    };

    if (email && String(email).trim()) {
      params.customerEmail = String(email).trim().toLowerCase();
    }

    params.signature = await generateSignature(params, SIGNING_KEY);

    return new Response(
      JSON.stringify({ endpoint: TAYLR_ENDPOINT, params }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders(context.request) } }
    );
  } catch (e) {
    console.error('[sign-payment]', e);
    return errorResponse('Internal error — please try again', 500, context.request);
  }
}

export async function onRequestOptions(context) {
  return new Response(null, { status: 204, headers: corsHeaders(context.request) });
}

function corsHeaders(req) {
  const origin = req?.headers?.get('Origin') || '';
  const allowed =
    origin.includes('credvantarecovery.co.uk') ||
    origin.includes('credvantarecoverygroup.com') ||
    origin.includes('localhost')
      ? origin
      : 'https://www.credvantarecovery.co.uk';
  return {
    'Access-Control-Allow-Origin':  allowed,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

function errorResponse(message, status, req) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(req) },
  });
}
