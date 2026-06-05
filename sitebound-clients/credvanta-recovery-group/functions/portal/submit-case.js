/* POST /portal/submit-case  (multipart/form-data)
   Fields: debtorName, debtorCompany, debtorEmail, debtorPhone,
           debtorAddress, amountOwed, invoiceNumber, invoiceDate,
           description, files[] (optional)

   Cases are managed in live_cases by the Credvanta team — no
   separate portal_cases table is written.  The submission goes
   to Google Sheets (same Apps Script as the main site) and an
   email notification is sent to the team. Files are base64-
   encoded for the Sheet in the same format as the main site. */

import { corsHeaders, json, err, onRequestOptions, verifySession, getBearer, sb }
  from './_shared.js';

export { onRequestOptions };

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzWDyBaEdV1quwpw-CKHuKDsRioIKozg0RBn-KqEtZUfOs6rHZXm99oCqxQ53VTApLwfA/exec';
const ALLOWED_TYPES   = ['application/pdf','application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg','image/png','image/gif','image/webp','text/plain'];
const MAX_FILE_SIZE   = 10 * 1024 * 1024; // 10MB per file

/* Convert ArrayBuffer → base64 without call-stack overflow on large files */
function arrayBufferToBase64(buffer) {
  const bytes     = new Uint8Array(buffer);
  const chunkSize = 8192;
  let   binary    = '';
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

export async function onRequestPost(context) {
  const { request: req, env } = context;

  try {
    // Verify session
    const token     = getBearer(req);
    const clientRef = token ? await verifySession(token, env.PORTAL_SESSION_SECRET) : null;
    if (!clientRef) return err('Unauthorised.', 401, req);

    // Fetch the client's name/email for the Sheet creditor columns
    const clients = await sb(env).select('portal_clients', { client_ref: clientRef }, 'full_name,email');
    const client  = clients[0] || {};

    // Parse multipart form
    const form = await req.formData();

    // Backward-compatible: accept old `debtorName` as fallback for contact name,
    // old `debtorPhone` as fallback for telephone
    const debtorCompany     = form.get('debtorCompany')?.trim();
    const debtorContactName = form.get('debtorContactName')?.trim() || form.get('debtorName')?.trim();
    const amountOwed        = parseFloat(form.get('amountOwed'));

    if (!debtorCompany)     return err('Debtor company is required.', 400, req);
    if (!debtorContactName) return err('Debtor contact name is required.', 400, req);
    if (!isFinite(amountOwed) || amountOwed <= 0) return err('A valid amount owed is required.', 400, req);

    const caseData = {
      debtor_company:           debtorCompany,
      debtor_contact_name:      debtorContactName,
      debtor_contact_email:     form.get('debtorEmail')?.trim()     || null,
      debtor_contact_telephone: form.get('debtorTelephone')?.trim() || form.get('debtorPhone')?.trim() || null,
      debtor_contact_mobile:    form.get('debtorMobile')?.trim()    || null,
      debtor_address:           form.get('debtorAddress')?.trim()   || null,
      amount_owed:              amountOwed,
      invoice_number:           form.get('invoiceNumber')?.trim()   || null,
      invoice_date:             form.get('invoiceDate')             || null,
      description:              form.get('description')?.trim()     || null,
    };

    // ── Encode files as base64 for Google Sheets ───────────────
    const rawFiles     = form.getAll('files');
    const encodedFiles = [];

    for (const file of rawFiles) {
      if (!file || !file.name || file.size === 0) continue;
      if (file.size > MAX_FILE_SIZE) continue;
      if (!ALLOWED_TYPES.includes(file.type)) continue;
      const buffer = await file.arrayBuffer();
      encodedFiles.push({
        name: file.name,
        type: file.type || 'application/octet-stream',
        data: arrayBufferToBase64(buffer),
      });
    }

    // ── Push to Google Sheet ───────────────────────────────────
    // Matches the main site Start a Claim payload exactly — same Apps Script,
    // same column layout. status=complete + draftId tells v4 Apps Script
    // to write a new "Complete" row directly (no enquiry update step).
    const payload = new URLSearchParams({
      status:                   'complete',
      draftId:                  `PORTAL-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      source:                   'client_portal',
      // Claimant (the client submitting the debt)
      name:                     client.full_name || clientRef,
      business:                 clientRef,
      email:                    client.email     || '',
      phone:                    '',
      // Debtor company + contact details (new schema)
      debtor_company:           caseData.debtor_company || '',
      debtor_contact_name:      caseData.debtor_contact_name || '',
      debtor_contact_email:     caseData.debtor_contact_email || '',
      debtor_contact_telephone: caseData.debtor_contact_telephone || '',
      debtor_contact_mobile:    caseData.debtor_contact_mobile || '',
      debtor_address:           caseData.debtor_address || '',
      // Debt details
      amount:                   String(amountOwed),
      invoice_number:           caseData.invoice_number || '',
      invoiceDate:              caseData.invoice_date   || '',
      description:              caseData.description    || '',
      stripeConnected:          'false',
      files:                    JSON.stringify(encodedFiles),
    });

    // CRITICAL: Cloudflare Workers terminate the function when the response
    // returns, killing any in-flight fetch() that wasn't awaited or wrapped
    // in waitUntil(). Without this, the Sheets POST (and the files inside it)
    // never actually completed.
    const sheetsPromise = fetch(APPS_SCRIPT_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    payload.toString(),
    }).then(r => {
      console.log('[portal/submit-case] sheets response', r.status);
    }).catch(e => console.error('[portal/submit-case] sheets error', e));

    context.waitUntil(sheetsPromise);

    // ── Email notification to Credvanta team ───────────────────
    const teamEmail = env.TEAM_EMAIL || 'recover@credvanta.co.uk';
    const emailPromise = fetch('https://api.resend.com/emails', {
      method:  'POST',
      headers: { 'Authorization': `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from:    env.PORTAL_FROM_EMAIL || 'portal@credvantarecovery.co.uk',
        to:      [teamEmail],
        subject: `New debt submitted — ${debtorCompany} (${clientRef})`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#333">
            <div style="background:#1B2D4F;padding:20px 28px">
              <p style="color:#fff;font-weight:700;font-size:18px;margin:0">New Case Submitted</p>
              <p style="color:rgba(255,255,255,.7);font-size:12px;margin:4px 0 0">Credvanta Client Portal</p>
            </div>
            <div style="padding:24px 28px">
              <table style="width:100%;border-collapse:collapse">
                <tr><td style="padding:6px 0;font-weight:600;width:170px">Client Ref</td><td style="padding:6px 0">${clientRef}</td></tr>
                <tr><td style="padding:6px 0;font-weight:600">Debtor Company</td><td style="padding:6px 0">${debtorCompany}</td></tr>
                <tr><td style="padding:6px 0;font-weight:600">Contact Name</td><td style="padding:6px 0">${debtorContactName}</td></tr>
                <tr><td style="padding:6px 0;font-weight:600">Contact Email</td><td style="padding:6px 0">${caseData.debtor_contact_email || '—'}</td></tr>
                <tr><td style="padding:6px 0;font-weight:600">Contact Telephone</td><td style="padding:6px 0">${caseData.debtor_contact_telephone || '—'}</td></tr>
                <tr><td style="padding:6px 0;font-weight:600">Contact Mobile</td><td style="padding:6px 0">${caseData.debtor_contact_mobile || '—'}</td></tr>
                <tr><td style="padding:6px 0;font-weight:600">Amount Owed</td><td style="padding:6px 0">£${amountOwed.toFixed(2)}</td></tr>
                <tr><td style="padding:6px 0;font-weight:600">Invoice No.</td><td style="padding:6px 0">${caseData.invoice_number || '—'}</td></tr>
                <tr><td style="padding:6px 0;font-weight:600">Files</td><td style="padding:6px 0">${encodedFiles.length} file${encodedFiles.length !== 1 ? 's' : ''} attached</td></tr>
              </table>
            </div>
          </div>
        `,
      }),
    }).catch(e => console.error('[portal/submit-case] email error', e));

    context.waitUntil(emailPromise);

    return json({ success: true }, 201, req);

  } catch (e) {
    console.error('[portal/submit-case]', e);
    return err('Submission failed — please try again.', 500, req);
  }
}
