/* POST /portal/upload-document  (multipart/form-data)
   Fields: caseRef, files[]

   Lets an authenticated client upload supporting documents/evidence
   against one of THEIR existing cases. Files are base64-encoded and
   forwarded to the same Google Apps Script the claim form uses, which
   saves them into a per-case sub-folder in the shared Google Drive
   folder and emails the team (recover@credvanta.co.uk) with the
   folder location.

   Security:
     - Session verified (Bearer token → clientRef)
     - Ownership enforced: the case must exist in live_cases AND its
       client_id must match the logged-in client. A client can only
       upload against their own cases. */

import { json, err, onRequestOptions, verifySession, getBearer, sb }
  from './_shared.js';

export { onRequestOptions };

// Same Apps Script Web App as the claim form / submit-case (Code.gs).
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzWDyBaEdV1quwpw-CKHuKDsRioIKozg0RBn-KqEtZUfOs6rHZXm99oCqxQ53VTApLwfA/exec';

const ALLOWED_TYPES = ['application/pdf','application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg','image/png','image/gif','image/webp','text/plain'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB per file
const MAX_FILES     = 10;

/* ArrayBuffer → base64 without call-stack overflow on large files */
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
    // ── Auth ───────────────────────────────────────────────────
    const token     = getBearer(req);
    const clientRef = token ? await verifySession(token, env.PORTAL_SESSION_SECRET) : null;
    if (!clientRef) return err('Unauthorised.', 401, req);

    // ── Parse form ─────────────────────────────────────────────
    const form    = await req.formData();
    const caseRef = (form.get('caseRef') || '').toString().trim();
    if (!caseRef) return err('A case reference is required.', 400, req);

    // ── Ownership check — case must belong to this client ──────
    const rows = await sb(env).select(
      'live_cases',
      { case_reference_number: caseRef, client_id: clientRef },
      'case_reference_number'
    );
    if (!rows.length) return err('Case not found for your account.', 403, req);

    // ── Encode files ───────────────────────────────────────────
    const rawFiles     = form.getAll('files');
    const encodedFiles = [];
    const rejected     = [];

    for (const file of rawFiles) {
      if (!file || !file.name || file.size === 0) continue;
      if (file.size > MAX_FILE_SIZE)        { rejected.push(`${file.name} (too large)`); continue; }
      if (!ALLOWED_TYPES.includes(file.type)){ rejected.push(`${file.name} (unsupported type)`); continue; }
      if (encodedFiles.length >= MAX_FILES) { rejected.push(`${file.name} (file limit reached)`); continue; }
      const buffer = await file.arrayBuffer();
      encodedFiles.push({
        name: file.name,
        type: file.type || 'application/octet-stream',
        data: arrayBufferToBase64(buffer),
      });
    }

    if (!encodedFiles.length) {
      return err(
        rejected.length ? `No valid files. ${rejected.join(', ')}` : 'No files were provided.',
        400, req
      );
    }

    // ── Client display name for the notification email ─────────
    let clientName = clientRef;
    try {
      const clients = await sb(env).select('portal_clients', { client_ref: clientRef }, 'full_name');
      if (clients[0] && clients[0].full_name) clientName = clients[0].full_name;
    } catch { /* fall back to clientRef */ }

    // ── Forward to Apps Script (saves to Drive + emails team) ──
    const payload = new URLSearchParams({
      type:       'document-upload',
      caseRef,
      clientRef,
      clientName,
      files:      JSON.stringify(encodedFiles),
    });

    let scriptResult = { success: true };
    try {
      const scriptRes = await fetch(APPS_SCRIPT_URL, {
        method:  'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body:    payload.toString(),
      });
      const text = await scriptRes.text();
      try { scriptResult = JSON.parse(text); } catch { scriptResult = { success: scriptRes.ok }; }
    } catch (e) {
      console.error('[portal/upload-document] apps script error', e);
      return err('Upload could not be completed — please try again.', 502, req);
    }

    if (!scriptResult.success) {
      return err(scriptResult.error || 'Upload failed — please try again.', 502, req);
    }

    return json({
      success:  true,
      uploaded: encodedFiles.length,
      rejected,
    }, 201, req);

  } catch (e) {
    console.error('[portal/upload-document]', e);
    return err('Upload failed — please try again.', 500, req);
  }
}
