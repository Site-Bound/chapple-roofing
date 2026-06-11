/* ═══════════════════════════════════════════════════════════════
   Taylr payment signing — Cloudflare Pages Function
   POST /sign-payment  { amount, ref, email, merchantId? }
   Returns { endpoint, params } with SHA-512 signature

   redirectURL → /payment-complete  (Function endpoint that accepts
   Taylr's POST, verifies the signature, then forwards the browser
   to /payment-complete.html with the outcome flags.)

   callbackURL → /payment-callback  (Server-to-server notification.
   Taylr will POST a copy of the response here independently of the
   browser redirect — used for reliable balance updates.)
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
    const { amount, ref, email, merchantId } = body;

    const MERCHANT_ID = (merchantId && String(merchantId).trim())
      ? String(merchantId).trim()
      : context.env.TAYLR_MERCHANT_ID;

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
