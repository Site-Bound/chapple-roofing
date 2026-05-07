/**
 * ═══════════════════════════════════════════════════════════════
 * CREDVANTA RECOVERY GROUP — Google Apps Script
 * Receives claim form submissions → Google Sheets + Google Drive
 * ═══════════════════════════════════════════════════════════════
 *
 * SETUP INSTRUCTIONS (one-time, takes ~5 minutes)
 * ─────────────────────────────────────────────────────────────
 * 1. Go to https://script.google.com → New project
 * 2. Paste this entire file into the Code.gs editor
 * 3. Replace the two constants below:
 *      SPREADSHEET_ID  → from your Google Sheet URL:
 *                        docs.google.com/spreadsheets/d/[THIS_PART]/edit
 *      DRIVE_FOLDER_ID → from your Google Drive folder URL:
 *                        drive.google.com/drive/folders/[THIS_PART]
 * 4. Click Deploy → New deployment
 *      Type:            Web app
 *      Execute as:      Me (your Google account)
 *      Who has access:  Anyone
 * 5. Click Deploy → copy the Web App URL
 * 6. Paste that URL into js/main.js as APPS_SCRIPT_URL
 * 7. Every time you edit this script, click Deploy →
 *    Manage deployments → edit the existing deployment (not New)
 *    to keep the same URL.
 * ─────────────────────────────────────────────────────────────
 */

// ── CONFIGURE THESE TWO VALUES ────────────────────────────────
const SPREADSHEET_ID  = 'REPLACE_WITH_YOUR_SPREADSHEET_ID';
const DRIVE_FOLDER_ID = 'REPLACE_WITH_YOUR_DRIVE_FOLDER_ID';
// ─────────────────────────────────────────────────────────────

const SHEET_NAME        = 'Claims';
const NOTIFICATION_EMAIL = 'recover@credvanta.co.uk';

// Column headers (written once when the sheet is first used)
const HEADERS = [
  'Timestamp',
  'Name',
  'Business Name',
  'Email',
  'Phone',
  'Debtor Company',
  'Invoice Amount (£)',
  'Invoice Date',
  'Description',
  'Stripe Connected',
  'Files (Drive Links)',
  'Submission ID',
];

/**
 * Handles POST requests from the claim form.
 * Receives URL-encoded data with optional base64-encoded file attachments.
 *
 * EMAIL fires first — independently of the sheet/Drive operations.
 * If the sheet write fails (e.g. placeholder ID not yet replaced),
 * the email is still delivered and a fallback error email is sent.
 */
function doPost(e) {
  try {
    const p            = e.parameter;
    const submissionId = Utilities.getUuid();
    const timestamp    = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm:ss');

    // ── 1. Send notification email FIRST ─────────────────────
    // This runs before any sheet/Drive operations so it always
    // delivers even if the sheet has not been configured yet.
    try {
      MailApp.sendEmail({
        to:      NOTIFICATION_EMAIL,
        subject: 'New Claim: ' + (p.business || 'Unknown') + ' — £' + (p.amount || '?'),
        body:    'New claim submitted via the website.\n\n'
                 + '──────────────────────────────────\n'
                 + 'CLAIM DETAILS\n'
                 + '──────────────────────────────────\n'
                 + 'Name:            ' + (p.name        || '') + '\n'
                 + 'Business:        ' + (p.business    || '') + '\n'
                 + 'Email:           ' + (p.email       || '') + '\n'
                 + 'Phone:           ' + (p.phone       || '') + '\n'
                 + 'Debtor Company:  ' + (p.debtor      || '') + '\n'
                 + 'Invoice Amount:  £' + (p.amount     || '') + '\n'
                 + 'Invoice Date:    ' + (p.invoiceDate || '') + '\n'
                 + 'Description:     ' + (p.description || '') + '\n'
                 + '──────────────────────────────────\n'
                 + 'Submitted: ' + timestamp + '\n'
                 + 'Ref ID:    ' + submissionId + '\n'
                 + '──────────────────────────────────\n\n'
                 + (SPREADSHEET_ID.includes('REPLACE')
                   ? '⚠️  Google Sheet not yet configured — see setup guide.'
                   : 'View sheet: https://docs.google.com/spreadsheets/d/' + SPREADSHEET_ID),
      });
    } catch (mailErr) {
      console.error('Email send failed:', mailErr.message);
    }

    // ── 2. Save uploaded files to Google Drive ────────────────
    let fileLinks = '';

    if (p.files && p.files !== '[]' && !DRIVE_FOLDER_ID.includes('REPLACE')) {
      try {
        const files  = JSON.parse(p.files);
        const root   = DriveApp.getFolderById(DRIVE_FOLDER_ID);
        const label  = (p.business || 'Unnamed') + ' — ' +
                       Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm');
        const folder = root.createFolder(label);

        const links = files.map(function(file) {
          if (!file.data || !file.name) return null;
          try {
            const decoded   = Utilities.base64Decode(file.data);
            const blob      = Utilities.newBlob(decoded, file.type || 'application/octet-stream', file.name);
            const driveFile = folder.createFile(blob);
            driveFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
            return file.name + ': ' + driveFile.getUrl();
          } catch (fileErr) {
            return file.name + ': upload failed (' + fileErr.message + ')';
          }
        }).filter(Boolean);

        fileLinks = links.join('\n');
      } catch (driveErr) {
        console.error('Drive upload failed:', driveErr.message);
        fileLinks = 'Drive upload error: ' + driveErr.message;
      }
    }

    // ── 3. Write to Google Sheet ──────────────────────────────
    if (!SPREADSHEET_ID.includes('REPLACE')) {
      try {
        const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
        let   sheet = ss.getSheetByName(SHEET_NAME);

        if (!sheet) {
          sheet = ss.insertSheet(SHEET_NAME);
        }

        // Add header row if the sheet is empty
        if (sheet.getLastRow() === 0) {
          sheet.appendRow(HEADERS);
          sheet.getRange(1, 1, 1, HEADERS.length)
            .setFontWeight('bold')
            .setBackground('#0B1D35')
            .setFontColor('#FFFFFF');
          sheet.setFrozenRows(1);
        }

        sheet.appendRow([
          new Date(),
          p.name          || '',
          p.business      || '',
          p.email         || '',
          p.phone         || '',
          p.debtor        || '',
          p.amount        || '',
          p.invoiceDate   || '',
          p.description   || '',
          p.stripeConnected === 'true' ? 'Yes' : 'No',
          fileLinks,
          submissionId,
        ]);
      } catch (sheetErr) {
        console.error('Sheet write failed:', sheetErr.message);
        // Send a fallback email so the submission is not lost
        try {
          MailApp.sendEmail({
            to:      NOTIFICATION_EMAIL,
            subject: '⚠️ Sheet Write Failed — Claim from ' + (p.business || 'Unknown'),
            body:    'A claim was received but could not be saved to the Google Sheet.\n\n'
                     + 'Error: ' + sheetErr.message + '\n\n'
                     + 'The full submission details were included in the earlier notification email.\n'
                     + 'Ref ID: ' + submissionId,
          });
        } catch (e2) {
          console.error('Fallback email also failed:', e2.message);
        }
      }
    }

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
 * Simple GET handler — confirms the script is live.
 * Visit the web app URL in a browser to test deployment.
 */
function doGet() {
  return ContentService
    .createTextOutput('Credvanta Recovery Group — Claims endpoint is live.')
    .setMimeType(ContentService.MimeType.TEXT);
}
