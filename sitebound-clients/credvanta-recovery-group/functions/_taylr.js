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
