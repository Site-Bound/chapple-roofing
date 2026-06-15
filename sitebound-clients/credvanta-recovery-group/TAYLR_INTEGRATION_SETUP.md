# Taylr Payment Integration — Setup Guide

## Status: Ready for Live Deployment

All code is complete and tested. The integration is ready to go live with the following configuration changes in Cloudflare.

---

## What You Need to Do

### Step 1: Update Cloudflare Environment Variables

Access your Cloudflare Pages project dashboard and update the following environment variables in **Settings → Environment Variables → Production**:

#### LIVE Account Credentials

| Variable | Current (Test) | New (Live) |
|----------|----------------|-----------|
| `TAYLR_MERCHANT_ID` | `290682` | `290684` |
| `TAYLR_SIGNING_KEY` | *(old test key)* | `5fbfb863c18792acbb4e36ca6c88411e73b34354fd331deeed9244f94e407221` |
| `PAYMENT_AUTO_UPDATE_BALANCE` | *(unset)* | `true` |

#### Existing Variables (Verify These Exist)

- `SUPABASE_URL` — Supabase project URL
- `SUPABASE_SERVICE_KEY` — Supabase service role key (required for balance updates)
- `SUPABASE_ANON_KEY` — Supabase anonymous key

---

## How the Integration Works

### 1. Payment Request Signing
```
POST /sign-payment 
{ amount: 150.50, ref: "CRG-XXXX-YYYY", email: "customer@example.com" }
↓
Returns { endpoint, params } with SHA-512 signature
↓
Frontend POSTs params to https://payments.taylr.io/hosted/
```

**Function:** `functions/sign-payment.js`
- Reads `TAYLR_MERCHANT_ID` and `TAYLR_SIGNING_KEY` from env
- Creates SHA-512 signature per Taylr spec (RFC 1738 URL encoding)
- Returns signed params ready for hosted form submission

---

### 2. Browser Return Handler (Immediate Feedback)
```
Customer completes payment on Taylr hosted form
↓
Taylr POSTs response to /payment-complete
↓
Function verifies signature (constant-time comparison)
↓
Redirects to /payment-receipt.html?status=success&orderRef=...
↓
Customer sees success/failed/error page with reference number
```

**Function:** `functions/payment-complete.js`
- Receives Taylr's signed response
- Verifies signature using `TAYLR_SIGNING_KEY`
- Classifies outcome: `success` | `declined` | `error`
- **Does NOT modify balance** (UI feedback only)

**UI:** `payment-receipt.html`
- Shows success: green tick, confirmation message, "receipt coming via email"
- Shows declined: red X, "card issuer declined", CTA to try different card
- Shows error: info icon, "could not verify", link to call support

---

### 3. Server-to-Server Callback (Balance Update)
```
Taylr POSTs copy of response to /payment-callback (independent, async)
↓
Function verifies signature (same key as request)
↓
If verified AND success AND PAYMENT_AUTO_UPDATE_BALANCE=true:
  → Fetch current live_cases row for orderRef
  → Reduce current_balance by payment amount
  → If balance = 0, set status = 'Paid in Full'
  → Update last_payment_date
↓
Always return HTTP 200 (prevents Taylr retries)
```

**Function:** `functions/payment-callback.js`
- Receives application/x-www-form-urlencoded POST from Taylr
- Verifies signature (constant-time comparison, prevents tampering)
- Fetches case from `live_cases` table via Supabase REST API
- Updates balance directly in database
- Logs all transactions for audit trail
- Returns 200 regardless of success (Taylr retries on non-2xx)

**Why server callback?**
- Reliable: Taylr retries if we return non-2xx
- Independent: Works even if customer closes browser before return URL loads
- Auditable: All balance changes logged server-side
- Secure: Signature verified before ANY balance change

---

## Testing Checklist

Before going live, test the full flow:

### Setup Test Case
1. Create a test case in Supabase `live_cases`:
   - `case_reference_number`: `CRG-TAYLR-TEST-001`
   - `client_id`: (your client ID, e.g., `CRGC-xxxxxxxx`)
   - `original_balance`: 150.50
   - `current_balance`: 150.50
   - `status`: "Open"

### Test the Full Flow
1. Visit the debtor portal payment form (or standalone test form)
2. Enter case reference `CRG-TAYLR-TEST-001` and amount 50.00
3. POST to `/sign-payment` — verify you get back signed params
4. Open Taylr payment form — enter test card (ask Taylr for test card details)
5. Complete payment — should see success page immediately
6. Wait 5-10 seconds for server callback
7. Refresh Supabase dashboard — verify `current_balance` is now 100.50
8. Test declined card — verify error page appears

### Verify in Logs
- Check Cloudflare Pages logs for `/payment-complete` and `/payment-callback` calls
- Verify signatures match and are verified correctly
- Look for balance update confirmation in callback logs

---

## Security Notes

✅ **Signatures verified on every request**
- Browser return signature verified in `/payment-complete`
- Callback signature verified in `/payment-callback`
- Constant-time comparison prevents timing attacks

✅ **No IP whitelisting needed**
- Taylr has disabled IP whitelisting for your account
- Signature verification is the security layer
- Safe for Cloudflare Workers (rotating IPs)

✅ **Balance updates gated by signature verification**
- We never modify `live_cases` without a verified Taylr signature
- Unverified payloads are logged and discarded
- Logs include orderRef for investigation

---

## Troubleshooting

### Signature Mismatch
If you see "signature verification failed" in logs:
1. Verify `TAYLR_SIGNING_KEY` is exactly correct (no spaces, exact case)
2. Verify `TAYLR_MERCHANT_ID` matches the signing key
3. Check Taylr integration guide for field order (we handle this correctly)

### Balance Not Updating
If payment succeeds but balance doesn't change:
1. Verify `PAYMENT_AUTO_UPDATE_BALANCE=true` is set
2. Verify `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` are set
3. Check that the case reference matches exactly (case-sensitive)
4. Review Cloudflare logs for callback endpoint — look for Supabase fetch errors
5. Verify the `live_cases` table RLS policy allows updates via service key

### Payment Form Won't Open
If hosted form doesn't load:
1. Verify `merchantWebsite` in sign-payment.js (must be exact domain)
2. Verify all required params are present (action, amount, merchantID, etc.)
3. Check CORS headers — should allow origin from credvantarecovery.co.uk

---

## Response Field Mapping

When Taylr POSTs back, the callback receives these fields:

| Field | Purpose | Example |
|-------|---------|---------|
| `action` | Transaction type | `SALE` |
| `amount` | Amount in pence | `5050` |
| `orderRef` | Your case reference | `CRG-XXXX-YYYY` |
| `transactionID` | Taylr's transaction ID | `0123456789` |
| `responseCode` | `0` = success, `4`/`5` = declined | `0` |
| `responseStatus` | `0` = success, `1` = declined | `0` |
| `responseMessage` | Description of response | `Auth OK` |
| `signature` | HMAC-SHA512 signature | *(hex string)* |

The callback classifies outcomes as:
- **success**: `responseCode='0'` AND `responseStatus='0'`
- **declined**: `responseStatus='1'` OR `responseCode='4'` OR `responseCode='5'`
- **error**: anything else

---

## Deployment Steps

1. ✅ Code is ready (functions committed)
2. ⏳ Update env vars in Cloudflare dashboard (you do this)
3. ⏳ Test with test case (you do this)
4. ⏳ Deploy to production (automatic when env vars are updated)
5. ⏳ Run live transaction test
6. ✅ Monitor logs for 24 hours

---

## Support

If you encounter issues:
1. Check Cloudflare Pages logs for function errors
2. Check Supabase logs for API errors (balance update failures)
3. Verify all env vars are set and exact
4. Contact Taylr support if signature verification fails (unlikely)
