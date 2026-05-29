/* POST /portal/submit-case  (multipart/form-data)
   Fields: debtorName, debtorCompany, debtorEmail, debtorPhone,
           debtorAddress, amountOwed, invoiceNumber, invoiceDate,
           description, files[] (optional)
   Returns { caseId } on success.
   Files are base64-encoded and sent to Google Sheets in the same format
   as the main site's Start a Claim form, AND uploaded to Supabase Storage
   so they are accessible in the portal case history view. */

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

/* Convert an ArrayBuffer to a base64 string (CF Workers have no FileReader).
   Processes in chunks to avoid call-stack limits on large files. */
function arrayBufferToBase64(buffer) {
  const bytes     = new Uint8Array(buffer);
  const chunkSize = 8192;
  let binary      = '';
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

    // Fetch the client's stored name and email — used as creditor fields in the Sheet
    const clients = await sb(env).select('portal_clients', { client_ref: clientRef }, 'full_name,email');
    const client  = clients[0] || {};

    // Parse multipart form
    const form = await req.formData();

    const debtorName  = form.get('debtorName')?.trim();
    const amountOwed  = parseFloat(form.get('amountOwed'));

    if (!debtorName) return err('Debtor name is required.', 400, req);
    if (!isFinite(amountOwed) || amountOwed <= 0) return err('A valid amount owed is required.', 400, req);

    const caseData = {
      client_ref:     clientRef,
      debtor_name:    debtorName,
      debtor_company: form.get('debtorCompany')?.trim() || null,
      debtor_email:   form.get('debtorEmail')?.trim()   || null,
      debtor_phone:   form.get('debtorPhone')?.trim()   || null,
      debtor_address: form.get('debtorAddress')?.trim() || null,
      amount_owed:    amountOwed,
      invoice_number: form.get('invoiceNumber')?.trim() || null,
      invoice_date:   form.get('invoiceDate')           || null,
      description:    form.get('description')?.trim()   || null,
      status:         'submitted',
    };

    // Insert case record
    const [newCase] = await sb(env).insert('portal_cases', caseData);
    const caseId    = newCase.id;

    // ── Process files ──────────────────────────────────────────
    // Each valid file is:
    //   a) base64-encoded for the Google Sheet (same format as main site)
    //   b) uploaded to Supabase Storage for the portal case history view
    const rawFiles   = form.getAll('files');
    const encodedFiles = []; // [{name, type, data}] — matches main site format
    const docInserts   = [];

    for (const file of rawFiles) {
      if (!file || !file.name || file.size === 0) continue;
      if (file.size > MAX_FILE_SIZE) continue;
      if (!ALLOWED_TYPES.includes(file.type)) continue;

      const buffer = await file.arrayBuffer();

      // a) Base64 for Google Sheets
      encodedFiles.push({
        name: file.name,
        type: file.type || 'application/octet-stream',
        data: arrayBufferToBase64(buffer),
      });

      // b) Supabase Storage
      const ext         = file.name.split('.').pop();
      const storagePath = `${clientRef}/${caseId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      try {
        await sb(env).uploadFile('portal-documents', storagePath, buffer, file.type);
        docInserts.push({
          case_id:      caseId,
          filename:     file.name,
          storage_path: storagePath,
          file_size:    file.size,
          file_type:    file.type,
        });
      } catch (uploadErr) {
        console.error('[portal/submit-case] storage upload error', uploadErr);
        // Non-fatal — case and Sheet entry still proceed without this file in Storage
      }
    }

    if (docInserts.length > 0) {
      await sb(env).insert('portal_case_documents', docInserts);
    }

    // ── Push to Google Sheet ───────────────────────────────────
    // Field names match the main site's Start a Claim form so both sources
    // land in the same Sheet columns. Client details come from their account.
    const payload = new URLSearchParams({
      source:      'client_portal',
      name:        client.full_name  || clientRef,
      business:    clientRef,
      email:       client.email      || '',
      phone:       '',
      debtor:      debtorName,
      amount:      String(amountOwed),
      invoiceDate: caseData.invoice_date   || '',
      description: caseData.description   || '',
      files:       JSON.stringify(encodedFiles),
      // Extra portal fields — ignored by Apps Script if columns not present,
      // but available for future Sheet expansion
      debtor_company: caseData.debtor_company || '',
      debtor_email:   caseData.debtor_email   || '',
      debtor_phone:   caseData.debtor_phone   || '',
      debtor_address: caseData.debtor_address || '',
      invoice_number: caseData.invoice_number || '',
      case_id:        caseId,
    });

    fetch(APPS_SCRIPT_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    payload.toString(),
    }).catch(e => console.error('[portal/submit-case] sheets error', e));

    // Email notification to Credvanta team
    const teamEmail = env.TEAM_EMAIL || 'recover@credvanta.co.uk';
    fetch('https://api.resend.com/emails', {
      method:  'POST',
      headers: { 'Authorization': `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from:    env.PORTAL_FROM_EMAIL || 'portal@credvantarecovery.co.uk',
        to:      [teamEmail],
        subject: `New debt submitted — ${debtorName} (${clientRef})`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;color:#333">
            <div style="background:#1B2D4F;padding:20px 28px">
              <p style="color:#fff;font-weight:700;font-size:18px;margin:0">New Case Submitted</p>
              <p style="color:rgba(255,255,255,.7);font-size:12px;margin:4px 0 0">Credvanta Client Portal</p>
            </div>
            <div style="padding:24px 28px">
              <table style="width:100%;border-collapse:collapse">
                <tr><td style="padding:6px 0;font-weight:600;width:140px">Client Ref</td><td style="padding:6px 0">${clientRef}</td></tr>
                <tr><td style="padding:6px 0;font-weight:600">Debtor</td><td style="padding:6px 0">${debtorName}${caseData.debtor_company ? ` (${caseData.debtor_company})` : ''}</td></tr>
                <tr><td style="padding:6px 0;font-weight:600">Amount Owed</td><td style="padding:6px 0">£${amountOwed.toFixed(2)}</td></tr>
                <tr><td style="padding:6px 0;font-weight:600">Invoice No.</td><td style="padding:6px 0">${caseData.invoice_number || '—'}</td></tr>
                <tr><td style="padding:6px 0;font-weight:600">Documents</td><td style="padding:6px 0">${docInserts.length} file${docInserts.length !== 1 ? 's' : ''} uploaded</td></tr>
              </table>
              <p style="margin:16px 0 0;font-size:13px;color:#666">Case ID: ${caseId}</p>
            </div>
          </div>
        `,
      }),
    }).catch(e => console.error('[portal/submit-case] email error', e));

    return json({ caseId }, 201, req);
  } catch (e) {
    console.error('[portal/submit-case]', e);
    return err('Submission failed — please try again.', 500, req);
  }
}
