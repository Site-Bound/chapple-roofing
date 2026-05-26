/* ═══════════════════════════════════════════════════════════════
   Taylr payment signing — Cloudflare Pages Function
   POST /sign-payment  { amount, ref, email }
   Returns { endpoint, params } with SHA-512 signature
   ═══════════════════════════════════════════════════════════════ */

const MERCHANT_ID    = '290682';
const SIGNING_KEY    = '1448986500a239cd19452089208848afed775d30f3d24ae167314c13f1cd412d';
const TAYLR_ENDPOINT = 'https://app.taylr.io/api/process-transaction';
const REDIRECT_URL   = 'https://www.credvantarecoverygroup.com/payment-complete.html';

export async function onRequestPost(context) {
  try {
    const body = await context.request.json();
    const { amount, ref, email } = body;

    if (!amount || !ref) {
      return errorResponse('Missing required fields: amount and ref', 400, context.request);
    }

    const amountPence = Math.round(parseFloat(amount) * 100);
    if (!Number.isFinite(amountPence) || amountPence <= 0) {
      return errorResponse('Invalid amount', 400, context.request);
    }

    const params = {
      action:       'SALE',
      amount:       String(amountPence),
      countryCode:  '826',
      currencyCode: '826',
      merchantID:   MERCHANT_ID,
      orderRef:     String(ref).trim().toUpperCase(),
      redirectURL:  REDIRECT_URL,
      type:         '1',
    };

    if (email && String(email).trim()) {
      params.customerEmail = String(email).trim().toLowerCase();
    }

    params.signature = await generateSignature(params, SIGNING_KEY);

    return new Response(
      JSON.stringify({ endpoint: TAYLR_ENDPOINT, params }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders(context.request) } }
    );
  } catch {
    return errorResponse('Internal error — please try again', 500, context.request);
  }
}

export async function onRequestOptions(context) {
  return new Response(null, { status: 204, headers: corsHeaders(context.request) });
}

/* ── SHA-512 signature matching PHP http_build_query + hash('sha512') ── */
async function generateSignature(params, secret) {
  /* Step 1: sort alphabetically by key (ASCII order, matching PHP ksort) */
  const sorted = Object.entries(params)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${phpUrlencode(k)}=${phpUrlencode(String(v))}`)
    .join('&');

  /* Step 2: normalise line endings (CR+LF, LF+CR, CR → LF) */
  const normalized = sorted.replace(/%0D%0A|%0A%0D|%0D/gi, '%0A');

  /* Step 3: append secret key, SHA-512 hash */
  const toHash     = normalized + secret;
  const hashBuffer = await crypto.subtle.digest('SHA-512', new TextEncoder().encode(toHash));
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

/* Matches PHP urlencode() — RFC 1738, spaces as + */
function phpUrlencode(str) {
  return encodeURIComponent(str)
    .replace(/%20/g, '+')
    .replace(/[!'()*]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase());
}

function corsHeaders(req) {
  const origin = req?.headers?.get('Origin') || '';
  const allowed = origin.includes('credvantarecoverygroup.com') ? origin : 'https://www.credvantarecoverygroup.com';
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
