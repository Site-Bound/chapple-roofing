/**
 * ═══════════════════════════════════════════════════════════════
 * CREDVANTA RECOVERY GROUP — Debtor Portal Forms
 * Receives enquiries from the debtor page → sends email to
 * collections@credvanta.co.uk, optionally saves files to Drive.
 * ═══════════════════════════════════════════════════════════════
 *
 * SETUP (one-time, ~5 minutes)
 * ─────────────────────────────────────────────────────────────
 * 1. Go to https://script.google.com → New project
 * 2. Paste this entire file into the Code.gs editor
 * 3. Replace DRIVE_FOLDER_ID below with your Google Drive
 *    folder ID (for storing uploaded files).
 *    Folder URL: drive.google.com/drive/folders/[THIS_PART]
 * 4. Click Deploy → New deployment
 *      Type:            Web app
 *      Execute as:      Me (your Google account)
 *      Who has access:  Anyone
 * 5. Click Deploy → copy the Web App URL
 * 6. Paste that URL into js/debtor.js as DEBTOR_FORMS_URL
 * 7. For future edits: Deploy → Manage deployments → edit the
 *    EXISTING deployment (not New) to keep the same URL.
 * ─────────────────────────────────────────────────────────────
 */

// ── CONFIGURE THIS VALUE ─────────────────────────────────────
const DEBTOR_DRIVE_FOLDER_ID = 'REPLACE_WITH_YOUR_DRIVE_FOLDER_ID';
// ─────────────────────────────────────────────────────────────

const COLLECTIONS_EMAIL = 'collections@credvanta.co.uk';

/**
 * Handles POST requests from the debtor portal forms.
 */
function doPost(e) {
  try {
    const p = e.parameter;
    const formType = p.formType || 'unknown';

    let subject = '';
    let body    = '';
    let fileLinks = '';

    // ── Save any uploaded files to Drive ──────────────────────
    if (p.files && p.files !== '[]') {
      try {
        const files  = JSON.parse(p.files);
        const root   = DriveApp.getFolderById(DEBTOR_DRIVE_FOLDER_ID);
        const label  = (p.company || 'Unknown') + ' — ' +
                       Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm');
        const folder = root.createFolder('Debtor — ' + label);

        const links = files.map(function(file) {
          if (!file.data || !file.name) return null;
          try {
            const decoded   = Utilities.base64Decode(file.data);
            const blob      = Utilities.newBlob(decoded, file.type || 'application/octet-stream', file.name);
            const driveFile = folder.createFile(blob);
            driveFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
            return file.name + ': ' + driveFile.getUrl();
          } catch (err) {
            return file.name + ': upload failed (' + err.message + ')';
          }
        }).filter(Boolean);

        if (links.length) fileLinks = '\n\n📎 Uploaded Files:\n' + links.join('\n');
      } catch (parseErr) {
        fileLinks = '\n\nFile upload error: ' + parseErr.message;
      }
    }

    // ── Build email content per form type ─────────────────────
    switch (formType) {

      case 'payment-plan':
        subject = '💳 Payment Plan Proposal — ' + (p.company || 'Unknown') + ' / ' + (p.invoice || 'No ref');
        body = [
          'A new payment plan proposal has been submitted via the debtor portal.',
          '',
          '──────────────────────────────────',
          'DEBTOR DETAILS',
          '──────────────────────────────────',
          'Name:              ' + (p.name    || ''),
          'Company:           ' + (p.company || ''),
          'Invoice / Ref:     ' + (p.invoice || ''),
          'Phone:             ' + (p.phone   || ''),
          'Email:             ' + (p.email   || ''),
          'Best Callback Time:' + (p.callbackTime || 'Not specified'),
          '',
          '──────────────────────────────────',
          'PROPOSED PAYMENT PLAN',
          '──────────────────────────────────',
          p.plan || '',
        ].join('\n');
        break;

      case 'dispute':
        subject = '⚠️ Invoice Dispute — ' + (p.company || 'Unknown') + ' / ' + (p.invoice || 'No ref');
        body = [
          'A new invoice dispute has been submitted via the debtor portal.',
          '',
          '──────────────────────────────────',
          'DEBTOR DETAILS',
          '──────────────────────────────────',
          'Name:              ' + (p.name    || ''),
          'Company:           ' + (p.company || ''),
          'Invoice / Ref:     ' + (p.invoice || ''),
          'Phone:             ' + (p.phone   || ''),
          'Email:             ' + (p.email   || ''),
          'Best Callback Time:' + (p.callbackTime || 'Not specified'),
          '',
          '──────────────────────────────────',
          'DISPUTE DETAILS',
          '──────────────────────────────────',
          'Reason:  ' + (p.reason || ''),
          '',
          'Full Details:',
          p.details || '',
        ].join('\n') + fileLinks;
        break;

      case 'proof-of-payment':
        subject = '✅ Proof of Payment — ' + (p.company || 'Unknown') + ' / ' + (p.invoice || 'No ref');
        body = [
          'Proof of payment has been submitted via the debtor portal.',
          '',
          '──────────────────────────────────',
          'DEBTOR DETAILS',
          '──────────────────────────────────',
          'Name:          ' + (p.name    || ''),
          'Company:       ' + (p.company || ''),
          'Invoice / Ref: ' + (p.invoice || ''),
          'Phone:         ' + (p.phone   || ''),
          'Email:         ' + (p.email   || ''),
        ].join('\n') + fileLinks;
        break;

      case 'callback':
        subject = '📞 Call Back Request — ' + (p.company || 'Unknown') + ' / ' + (p.invoice || 'No ref');
        body = [
          'A call back request has been submitted via the debtor portal.',
          '',
          '──────────────────────────────────',
          'DEBTOR DETAILS',
          '──────────────────────────────────',
          'Name:              ' + (p.name    || ''),
          'Company:           ' + (p.company || ''),
          'Invoice / Ref:     ' + (p.invoice || ''),
          'Phone:             ' + (p.phone   || ''),
          'Email:             ' + (p.email   || ''),
          'Best Callback Time:' + (p.callbackTime || ''),
        ].join('\n');
        break;

      default:
        subject = 'Debtor Portal Submission';
        body    = 'Form type: ' + formType + '\n\n' + JSON.stringify(p, null, 2);
    }

    // ── Append timestamp and submission ID ────────────────────
    const submissionId = Utilities.getUuid();
    body += '\n\n──────────────────────────────────';
    body += '\nSubmitted: ' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm:ss');
    body += '\nRef ID: ' + submissionId;
    body += '\n──────────────────────────────────';

    // ── Send email ────────────────────────────────────────────
    MailApp.sendEmail({
      to:      COLLECTIONS_EMAIL,
      subject: subject,
      body:    body,
    });

    return ContentService
      .createTextOutput(JSON.stringify({ success: true, id: submissionId }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    console.error('doPost error:', err.message, err.stack);
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Simple GET — confirms the script is live.
 */
function doGet() {
  return ContentService
    .createTextOutput('Credvanta Recovery Group — Debtor Forms endpoint is live.')
    .setMimeType(ContentService.MimeType.TEXT);
}
