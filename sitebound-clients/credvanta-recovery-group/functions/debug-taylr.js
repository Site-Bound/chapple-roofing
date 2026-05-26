/* ═══════════════════════════════════════════════════════════════
   Taylr debug probe — Cloudflare Pages Function
   GET /debug-taylr
   Posts a £1.00 test transaction server-side to Taylr and returns
   the raw response body so we can read the actual error message.
   REMOVE THIS FILE before going live.
   ═══════════════════════════════════════════════════════════════ */

const MERCHANT_ID    = '290682';
const SIGNING_KEY    = '1448986500a239cd19452089208848afed775d30f3d24ae167314c13f1cd412d';
const TAYLR_ENDPOINT = 'https://app.taylr.io/api/process-transaction';
const REDIRECT_URL   = 'https://www.credvantarecovery.co.uk/payment-complete.html';

export async function onRequestGet(context) {
  try {
    const transactionUnique = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

    const params = {
      action:            'SALE',
      amount:            '100',          // £1.00 in pence
      countryCode:       '826',
      currencyCode:      '826',
      merchantID:        MERCHANT_ID,
      orderRef:          'DEBUG-TEST-001',
      redirectURL:       REDIRECT_URL,
      transactionUnique,
      type:              '1',
    };

    params.signature = await generateSignature(params, SIGNING_KEY);

    /* Build a URL-encoded body exactly as a browser form POST would */
    const body = new URLSearchParams(params).toString();

    const taylrRes = await fetch(TAYLR_ENDPOINT, {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });

    const responseText = await taylrRes.text();

    const debug = {
      taylr_status:   taylrRes.status,
      taylr_headers:  Object.fromEntries(taylrRes.headers.entries()),
      taylr_body:     responseText,
      params_sent:    params,
      body_sent:      body,
    };

    return new Response(JSON.stringify(debug, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

/* ── SHA-512 signature — same algorithm as sign-payment.js ── */
async function generateSignature(params, secret) {
  const sorted = Object.entries(params)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${phpUrlencode(k)}=${phpUrlencode(String(v))}`)
    .join('&');

  const normalized = sorted.replace(/%0D%0A|%0A%0D|%0D/gi, '%0A');
  const toHash     = normalized + secret;
  const hashBuffer = await crypto.subtle.digest('SHA-512', new TextEncoder().encode(toHash));
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function phpUrlencode(str) {
  return encodeURIComponent(str)
    .replace(/%20/g, '+')
    .replace(/[!'()*]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase());
}
