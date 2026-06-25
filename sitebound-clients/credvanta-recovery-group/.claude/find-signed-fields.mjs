/**
 * Finds which subset of Taylr response fields matches their signature.
 * Run with: node find-signed-fields.mjs
 *
 * Paste the taylrSignature value from /payment-debug below, then run.
 */

// ── PASTE THE SIGNATURE FROM THE DEBUG OUTPUT HERE ──────────────────────────
const TAYLR_SIGNATURE = 'PASTE_SIGNATURE_HERE';
// ────────────────────────────────────────────────────────────────────────────

const SIGNING_KEY = '5fbfb863c18792acbb4e36ca6c88411e73b34354fd331deeed9244f94e407221';

// Field values from the last /payment-debug output — update if values differ
const ALL_PARAMS = {
  acquirerResponseCode: '59',
  'acquirerResponseDetails[additionalResponseReasonCode]': '2',
  'acquirerResponseDetails[schemeResponseCode]': '83',
  'acquirerResponseDetails[transactionLinkID]': '7Pehndq7Rw2bBnTNKR8XrA',
  acquirerResponseMessage: 'Suspected Fraud',
  acquirerTransactionID: '617600653270',
  action: 'SALE',
  addressCheck: 'not checked',
  addressCheckPref: 'not known,not checked,not matched,partially matched,matched',
  amount: '100',
  amountRetained: '0',
  avscv2AuthEntity: 'issuer',
  avscv2CheckEnabled: 'Y',
  avscv2ResponseCode: '011800',
  avscv2ResponseMessage: 'NO DATA MATCHES',
  callbackURL: 'https://www.credvantarecovery.co.uk/payment-callback',
  cardCVVMandatory: 'Y',
  cardExpiryDate: '0629',
  cardExpiryDateMandatory: 'Y',
  cardExpiryMonth: '06',
  cardExpiryYear: '29',
  cardFlags: '272564481',
  cardIssuer: 'STARLING BANK LIMITED',
  cardIssuerCountry: 'United Kingdom',
  cardIssuerCountryCode: 'GBR',
  cardNumberMask: '535744******1124',
  cardNumberValid: 'Y',
  cardScheme: 'MasterCard',
  cardSchemeCode: 'MC',
  cardType: 'MasterCard Debit',
  cardTypeCode: 'MD',
  countryCode: '826',
  currencyCode: '826',
  currencyExponent: '2',
  currencySymbol: '£',
  customerAddress: '58 Sandringham Way\r\nNewfields',
  customerContactMandatory: 'Y',
  customerEmail: 'nick@sitebound.co.uk',
  customerName: 'Nicholas Ward',
  customerNameMandatory: 'Y',
  customerPostcode: 'DH22FE',
  customerReceiptsRequired: 'N',
  cv2Check: 'not known',
  cv2CheckPref: 'not known,not checked,matched',
  displayAmount: 'GBP 1.00',
  displayCurrency: 'GBP',
  eReceiptsEnabled: 'N',
  formAmountEditable: 'N',
  formResponsive: 'Y',
  merchantCategoryCode: '7322',
  merchantID: '290684',
  merchantWebsite: 'https://www.credvantarecovery.co.uk',
  notifyEmailRequired: 'N',
  orderRef: 'CR-26270501',
  paymentMethod: 'card',
  postcodeCheck: 'not checked',
  postcodeCheckPref: 'not known,not checked,not matched,partially matched,matched',
  processMerchantID: '290684',
  processorStatus: 'active',
  redirectURL: 'https://www.credvantarecovery.co.uk/payment-debug',
  remoteAddress: '86.177.174.97',
  requestID: '6a3c6a5383539',
  requestMerchantID: '290684',
  responseCode: '895',
  responseMessage: 'Cannot authorise at this time (Suspected fraud)',
  responseStatus: '1',
  riskCheckEnabled: 'N',
  rtAdviceCode: '2',
  rtRetryAfter: '2026-06-28 00:39:39',
  schemeTransactionID: 'BPEVK4FK00624',
  state: 'declined',
  surchargeEnabled: 'N',
  threeDSACSURL: 'https://3dsecure.starlingbank.com/3ds/v2/3ds-method',
  threeDSAuthenticated: 'Y',
  threeDSCATimestamp: '2026-06-25 00:39:37',
  threeDSCAVV: 'kAOFwf2M3wH88ABkdOvnJ4Jh0IoL',
  threeDSCheck: 'authenticated',
  threeDSCheckPref: 'not known,authenticated',
  threeDSECI: '02',
  threeDSEnabled: 'Y',
  threeDSEnrolled: 'Y',
  threeDSRequired: 'Y',
  threeDSResponseCode: '0',
  threeDSResponseMessage: 'Successfully authenticated',
  threeDSVETimestamp: '2026-06-25 00:39:34',
  threeDSXID: '81b39a0a-addf-402d-8479-40440b50220a',
  timestamp: '2026-06-25 00:39:39',
  transactionID: '488765327',
  transactionUnique: 'mqsprgfnnjamx',
  type: '1',
  vcsResponseCode: '0',
  vcsResponseMessage: 'Success - no velocity check rules applied',
  xref: '26062500ZZ39BH34JP58LQK',
};

// ── Signature algorithm (mirrors _taylr.js) ─────────────────────────────────
function phpUrlencode(str) {
  return encodeURIComponent(str)
    .replace(/%20/g, '+')
    .replace(/[!~'()*]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase());
}

async function computeSignature(params, secret) {
  const sorted = Object.entries(params)
    .filter(([k]) => k !== 'signature')
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${phpUrlencode(k)}=${phpUrlencode(String(v))}`)
    .join('&');
  const normalized = sorted.replace(/%0D%0A|%0A%0D|%0D/gi, '%0A');
  const toHash     = normalized + secret;
  const buf        = await crypto.subtle.digest('SHA-512', new TextEncoder().encode(toHash));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// ── Field sets to test ───────────────────────────────────────────────────────

// The documented "core" Taylr response fields (from integration guide example)
const DOCUMENTED_CORE = [
  'action', 'amount', 'callbackURL', 'countryCode', 'currencyCode',
  'merchantID', 'merchantWebsite', 'orderRef', 'redirectURL',
  'responseCode', 'responseMessage', 'responseStatus',
  'transactionID', 'transactionUnique', 'type',
];

// Core + fields we sent that Taylr might include
const CORE_PLUS_OUR_EXTRAS = [
  ...DOCUMENTED_CORE, 'threeDSRequired', 'customerEmail',
];

// Core + some commonly signed response extras
const CORE_PLUS_EXTRAS = [
  ...DOCUMENTED_CORE, 'state', 'xref', 'timestamp',
];

// Core + threeDSRequired only
const CORE_PLUS_3DS_REQ = [
  ...DOCUMENTED_CORE, 'threeDSRequired',
];

// All fields (current broken behaviour — too many fields)
const ALL_FIELDS = Object.keys(ALL_PARAMS);

const STRATEGIES = [
  { name: 'DOCUMENTED_CORE (15 fields)',          fields: DOCUMENTED_CORE },
  { name: 'CORE + threeDSRequired',               fields: CORE_PLUS_3DS_REQ },
  { name: 'CORE + threeDSRequired + customerEmail', fields: CORE_PLUS_OUR_EXTRAS },
  { name: 'CORE + state + xref + timestamp',      fields: CORE_PLUS_EXTRAS },
  { name: 'ALL fields (current code)',            fields: ALL_FIELDS },
];

// ── Run ──────────────────────────────────────────────────────────────────────
if (TAYLR_SIGNATURE === 'PASTE_SIGNATURE_HERE') {
  console.error('❌  Paste the taylrSignature value from /payment-debug at the top of this file first.');
  process.exit(1);
}

console.log(`\nTarget signature: ${TAYLR_SIGNATURE.slice(0, 24)}…\n`);

for (const { name, fields } of STRATEGIES) {
  const subset = Object.fromEntries(
    fields.filter(f => f in ALL_PARAMS).map(f => [f, ALL_PARAMS[f]])
  );
  const computed = await computeSignature(subset, SIGNING_KEY);
  const match    = computed.toLowerCase() === TAYLR_SIGNATURE.toLowerCase();
  console.log(`${match ? '✅ MATCH' : '   ----'} ${name} (${Object.keys(subset).length} fields)`);
  if (match) {
    console.log(`         Fields: ${fields.filter(f => f in ALL_PARAMS).sort().join(', ')}`);
  }
}
console.log('');
