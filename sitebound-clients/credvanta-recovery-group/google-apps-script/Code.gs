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

const SHEET_NAME = 'Claims';

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
 */
function doPost(e) {
  try {
    const p = e.parameter;

    // ── Write to Google Sheet ──────────────────────────────────
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

    // ── Handle file uploads → Google Drive ────────────────────
    const submissionId = Utilities.getUuid();
    let   fileLinks    = '';

    if (p.files && p.files !== '[]') {
      try {
        const files  = JSON.parse(p.files);
        const root   = DriveApp.getFolderById(DRIVE_FOLDER_ID);
        // Create a sub-folder per submission: "BusinessName — DD/MM/YYYY"
        const label  = (p.business || 'Unnamed') + ' — ' +
                       Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm');
        const folder = root.createFolder(label);

        const links = files.map(function(file) {
          if (!file.data || !file.name) return null;
          try {
            const decoded  = Utilities.base64Decode(file.data);
            const blob     = Utilities.newBlob(decoded, file.type || 'application/octet-stream', file.name);
            const driveFile = folder.createFile(blob);
            driveFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
            return file.name + ': ' + driveFile.getUrl();
          } catch (fileErr) {
            return file.name + ': upload failed (' + fileErr.message + ')';
          }
        }).filter(Boolean);

        fileLinks = links.join('\n');
      } catch (parseErr) {
        fileLinks = 'File parse error: ' + parseErr.message;
      }
    }

    // ── Append the data row ────────────────────────────────────
    sheet.appendRow([
      new Date(),                          // Timestamp
      p.name          || '',               // Name
      p.business      || '',               // Business Name
      p.email         || '',               // Email
      p.phone         || '',               // Phone
      p.debtor        || '',               // Debtor Company
      p.amount        || '',               // Invoice Amount
      p.invoiceDate   || '',               // Invoice Date
      p.description   || '',               // Description
      p.stripeConnected === 'true'
        ? 'Yes' : 'No',                    // Stripe Connected
      fileLinks,                           // File Drive links
      submissionId,                        // Unique submission ID
    ]);

    // ── Optional: send notification email to Credvanta ────────
    // Uncomment and set the email address below to receive an
    // email alert for every new claim submission.
    //
    // MailApp.sendEmail({
    //   to:      'recover@credvanta.co.uk',
    //   subject: 'New Claim: ' + (p.business || 'Unknown') + ' — £' + (p.amount || '?'),
    //   body:    'New claim submitted.\n\n'
    //            + 'Name: '     + p.name     + '\n'
    //            + 'Business: ' + p.business + '\n'
    //            + 'Email: '    + p.email    + '\n'
    //            + 'Phone: '    + p.phone    + '\n'
    //            + 'Debtor: '   + p.debtor   + '\n'
    //            + 'Amount: £'  + p.amount   + '\n\n'
    //            + 'View sheet: https://docs.google.com/spreadsheets/d/' + SPREADSHEET_ID,
    // });

    return ContentService
      .createTextOutput(JSON.stringify({ success: true, id: submissionId }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    // Log the error to Apps Script execution log for debugging
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
