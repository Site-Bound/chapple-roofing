/* ═══════════════════════════════════════════════════════════════
   TEMPORARY DIAGNOSTIC ENDPOINT — /payment-debug
   Shows exactly what Taylr sends in the browser redirect so we can
   diagnose signature verification failures.

   IMPORTANT: Remove this file once debugging is complete.
   ═══════════════════════════════════════════════════════════════ */

function captureParams(method, params) {
  // Never expose the signature — it's not useful for diagnosis and
  // there's no reason to show it in a browser response.
  const safe = Object.fromEntries(
    Object.entries(params).filter(([k]) => k !== 'signature')
  );
  return new Response(
    JSON.stringify({
      _note: 'DIAGNOSTIC ONLY — do not share this URL output publicly',
      method,
      fieldNames:  Object.keys(safe).sort(),
      fieldValues: safe,
      signaturePresent: 'signature' in params,
    }, null, 2),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
}

export async function onRequestPost(context) {
  const body   = await context.request.text();
  const params = Object.fromEntries(new URLSearchParams(body));
  return captureParams('POST', params);
}

export async function onRequestGet(context) {
  const url    = new URL(context.request.url);
  const params = Object.fromEntries(url.searchParams);
  return captureParams('GET', params);
}
