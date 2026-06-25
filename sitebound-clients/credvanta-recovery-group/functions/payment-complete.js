/* ═══════════════════════════════════════════════════════════════
   /payment-complete  — Taylr return handler
   Receives the browser return at the end of a Taylr hosted payment
   session, verifies the inbound signature, then redirects to the
   static receipt page with the outcome flags.

   Taylr may return the customer here via either:
     - POST: signed params in application/x-www-form-urlencoded body
     - GET:  signed params in the URL query string
   Both are handled identically. POST body takes priority; if empty
   the query string is checked.
   ═══════════════════════════════════════════════════════════════ */

import { verifySignature, generateSignature, classifyOutcome, recordPaymentAndReduceBalance } from './_taylr.js';

// Fields present in the confirmed-matching Taylr response (93 fields,
// 2026-06-25 debug session) PLUS 5 new fields observed from 2026-06-25
// onwards. Used to detect new fields that Taylr may not include in
// their signature computation, and to drive subset-search verification.
const KNOWN_SIGNED_FIELDS = new Set([
  'acquirerResponseCode','acquirerResponseDetails[additionalResponseReasonCode]',
  'acquirerResponseDetails[eci]',
  'acquirerResponseDetails[schemeResponseCode]','acquirerResponseDetails[transactionLinkID]',
  'acquirerResponseMessage','acquirerTransactionID','action','addressCheck','addressCheckPref',
  'amount','amountApproved','amountReceived','amountRetained',
  'authorisationCode',
  'avscv2AuthEntity','avscv2CheckEnabled','avscv2ResponseCode',
  'avscv2ResponseMessage','callbackURL','cardCVVMandatory','cardExpiryDate',
  'cardExpiryDateMandatory','cardExpiryMonth','cardExpiryYear','cardFlags','cardIssuer',
  'cardIssuerCountry','cardIssuerCountryCode','cardNumberMask','cardNumberValid','cardScheme',
  'cardSchemeCode','cardType','cardTypeCode','countryCode','currencyCode','currencyExponent',
  'currencySymbol','customerAddress','customerContactMandatory','customerEmail','customerName',
  'customerNameMandatory','customerPhone','customerPostcode','customerReceiptsRequired',
  'cv2Check','cv2CheckPref',
  'displayAmount','displayCurrency','eReceiptsEnabled','formAmountEditable','formResponsive',
  'merchantCategoryCode','merchantID','merchantWebsite','notifyEmailRequired','orderRef',
  'paymentMethod','postcodeCheck','postcodeCheckPref','processMerchantID','processorStatus',
  'redirectURL','remoteAddress','requestID','requestMerchantID','responseCode','responseMessage',
  'responseStatus','riskCheckEnabled','rtAdviceCode','rtRetryAfter','schemeTransactionID',
  'state','surchargeEnabled','threeDSACSURL','threeDSAuthenticated','threeDSCATimestamp',
  'threeDSCAVV','threeDSCheck','threeDSCheckPref','threeDSECI','threeDSEnabled','threeDSEnrolled',
  'threeDSRequired','threeDSResponseCode','threeDSResponseMessage','threeDSVETimestamp',
  'threeDSXID','timestamp','transactionID','transactionUnique','type','vcsResponseCode',
  'vcsResponseMessage','xref',
]);

// The 5 fields added in Taylr responses from 2026-06-25 onwards that were
// not present in the confirmed-matching 93-field test response. We search
// all 30 intermediate subsets (include/exclude each) to find the exact
// combination Taylr uses in their response signature.
const NEW_FIELD_CANDIDATES = [
  'customerPhone', 'authorisationCode', 'amountApproved',
  'amountReceived', 'acquirerResponseDetails[eci]',
];

// Static receipt page. Renamed from payment-complete.html so it doesn't
// collide with this Function endpoint at /payment-complete — Cloudflare
// Pages would otherwise strip the .html and bounce us into a redirect
// loop (Function → /payment-complete.html → strip → /payment-complete → …).
const STATIC_PAGE = '/payment-receipt.html';

export async function onRequestPost(context) {
  return handleReturn(context, 'POST');
}

/* Taylr may redirect via GET with params in the query string. */
export async function onRequestGet(context) {
  return handleReturn(context, 'GET');
}

async function handleReturn(context, method) {
  const { request: req, env } = context;

  let params = {};
  try {
    if (method === 'POST') {
      const formText = await req.text();
      params = parseFormBody(formText);
    }
    // Fall through to query string if POST body was empty (GET redirect)
    // or if this is a GET request directly from Taylr.
    if (!params.signature) {
      const url = new URL(req.url);
      const qsParams = {};
      for (const [k, v] of url.searchParams.entries()) qsParams[k] = v;
      if (qsParams.signature) params = qsParams;
    }
  } catch (e) {
    console.error('[payment-complete] body/url parse error', e);
    return redirectTo(`${STATIC_PAGE}?status=error&reason=parse`);
  }

  // No params at all — direct visit or stale bookmark. No processing.
  if (!params.signature) {
    console.log(`[payment-complete] ${method} with no signature — direct visit, ignoring`);
    return redirectTo(STATIC_PAGE);
  }

  // DIAGNOSTIC: log all field names + values received from Taylr (no card data
  // on hosted form returns; safe to log temporarily for debugging).
  // Remove or reduce once the field set is confirmed.
  const safeParams = Object.fromEntries(
    Object.entries(params).filter(([k]) => k !== 'signature')
  );
  console.log(`[payment-complete] ${method} received — all fields:`, JSON.stringify(safeParams));
  console.log(`[payment-complete] ${method} signature present:`, !!params.signature);

  // Verify the signature using the same SIGNING KEY we sign requests with.
  let verified = false;
  try {
    verified = await verifySignature(params, env.TAYLR_SIGNING_KEY);
  } catch (e) {
    console.error('[payment-complete] verify error', e);
  }

  const outcome = classifyOutcome(params);
  console.log(`[payment-complete] verified=${verified} outcome=${outcome}`);

  // Update Supabase HERE too — not only in the async /payment-callback.
  // Taylr's browser return to this endpoint reliably fires (it's what
  // shows the customer the receipt), whereas the separate server-to-server
  // callback may not. Doing the idempotent update here guarantees the
  // balance/payment-log are written even if the callback never arrives.
  // The UNIQUE transaction_id means if the callback DOES also fire, it's a
  // no-op. We await it so it completes before the Worker is torn down, and
  // never let a failure block the customer's redirect.
  let debugParams = {};
  if (verified && outcome === 'success') {
    try {
      const result = await recordPaymentAndReduceBalance(env, params);
      console.log('[payment-complete] balance update result', result);
    } catch (e) {
      console.error('[payment-complete] balance update failed', e);
    }
  } else if (!verified) {
    try {
      const supplied = params.signature || '';
      const computed = await generateSignature(params, env.TAYLR_SIGNING_KEY || '');

      // Find any fields that weren't in our confirmed-matching test response.
      const extraFields = Object.keys(params).filter(
        k => k !== 'signature' && !KNOWN_SIGNED_FIELDS.has(k)
      );

      // Try verifying against only the original known-signed fields (exclude
      // all new fields). If this matches, Taylr doesn't sign the new extras.
      let subsetMatch = false;
      if (extraFields.length > 0) {
        const subsetParams = Object.fromEntries(
          Object.entries(params).filter(([k]) => KNOWN_SIGNED_FIELDS.has(k) || k === 'signature')
        );
        // Exclude ALL new candidates from this subset (use only the 93 core fields)
        const coreParams = Object.fromEntries(
          Object.entries(subsetParams).filter(([k]) => k === 'signature' || !NEW_FIELD_CANDIDATES.includes(k))
        );
        subsetMatch = await verifySignature(coreParams, env.TAYLR_SIGNING_KEY || '');
      }

      // Search all 30 intermediate subsets of the 5 new fields to find which
      // combination Taylr actually signs (mask 0 = full already tried,
      // mask 31 = all-new-excluded = subset above).
      let subsetSearchMatch = false;
      let matchedExcluded = null;
      if (!subsetMatch) {
        for (let mask = 1; mask <= 30; mask++) {
          const excludeList = NEW_FIELD_CANDIDATES.filter((_, i) => mask & (1 << i));
          if (!excludeList.length) continue;
          const testParams = Object.fromEntries(
            Object.entries(params).filter(([k]) => k === 'signature' || !excludeList.includes(k))
          );
          const testMatch = await verifySignature(testParams, env.TAYLR_SIGNING_KEY || '');
          if (testMatch) {
            subsetSearchMatch = true;
            matchedExcluded = excludeList;
            console.log('[payment-complete] SUBSET SEARCH MATCH — excluded fields:', excludeList);
            break;
          }
        }
      }

      console.warn('[payment-complete] signature FAILED', {
        suppliedFirst8:  supplied.slice(0, 8),
        computedFirst8:  computed.slice(0, 8),
        keyLength:       (env.TAYLR_SIGNING_KEY || '').length,
        fieldCount:      Object.keys(params).length - 1,
        extraFields,
        subsetMatch,
        subsetSearchMatch,
        matchedExcluded,
        orderRef:        params.orderRef,
      });

      if (subsetMatch || subsetSearchMatch) {
        // We found a field subset that matches Taylr's signature — accept.
        console.log('[payment-complete] verified via subset — unsigned fields:', matchedExcluded || extraFields);
        verified = true;
        if (outcome === 'success') {
          try {
            const result = await recordPaymentAndReduceBalance(env, params);
            console.log('[payment-complete] balance update result (subset)', result);
          } catch (e) {
            console.error('[payment-complete] balance update failed (subset)', e);
          }
        }
      } else {
        // No subset matched. If the bank authorised the payment
        // (responseCode=0 + authorisationCode present), soft-accept and
        // flag for manual review rather than blocking the customer.
        const bankAuthorised = params.responseCode === '0' && !!params.authorisationCode;
        if (bankAuthorised) {
          console.warn('[payment-complete] SOFT ACCEPT — bank authorised but Taylr signature unverified. MANUAL REVIEW REQUIRED.', {
            orderRef:          params.orderRef,
            authorisationCode: params.authorisationCode,
            transactionID:     params.transactionID,
            amount:            params.amount,
            extraFields,
          });
          verified = true;
          if (outcome === 'success') {
            try {
              const result = await recordPaymentAndReduceBalance(env, params);
              console.log('[payment-complete] balance update result (soft-accept)', result);
            } catch (e) {
              console.error('[payment-complete] balance update failed (soft-accept)', e);
            }
          }
        } else {
          // Genuine mismatch with no bank auth — pass details to error page.
          debugParams = {
            _s:  supplied.slice(0, 8),
            _c:  computed.slice(0, 8),
            _k:  String((env.TAYLR_SIGNING_KEY || '').length),
            _n:  String(Object.keys(params).length - 1),
            _x:  extraFields.join(',') || 'none',
          };
        }
      }
    } catch (e) {
      console.error('[payment-complete] signature debug failed', e);
    }
  }

  const qs = new URLSearchParams({
    status:           verified ? outcome : 'error',
    orderRef:         params.orderRef          || '',
    transactionID:    params.transactionID     || '',
    amount:           params.amount            || '',
    responseMessage:  params.responseMessage   || '',
    authorisationCode: params.authorisationCode || '',
    verified:         verified ? '1' : '0',
    ...debugParams,
  });

  return redirectTo(`${STATIC_PAGE}?${qs.toString()}`);
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
