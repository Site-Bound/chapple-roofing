/**
 * ═══════════════════════════════════════════════════════════════
 * CREDVANTA RECOVERY GROUP — Google Apps Script  (v2)
 * Receives claim form submissions → Google Sheets + Google Drive
 * ═══════════════════════════════════════════════════════════════
 *
 * HOW IT WORKS (two-stage submission)
 * ─────────────────────────────────────────────────────────────
 * Stage 1 — Step 1 "Continue":
 *   Receives status=enquiry with name/business/email/phone/consent
 *   and a unique Draft ID. Appends a new row with status "Enquiry".
 *   No notification email is sent at this point.
 *
 * Stage 2 — Step 4 "Submit Claim":
 *   Receives status=complete with the same Draft ID plus all
 *   remaining fields (debtor, amount, description, files).
 *   The script finds the matching Enquiry row by Draft ID and
 *   updates it in place with the full details, then changes the
 *   status to "Complete" and sends the notification email.
 *   If no matching row is found (e.g. browser refreshed between
 *   steps), a new Complete row is appended instead.
 *
 * SETUP INSTRUCTIONS (one-time, ~5 minutes)
 * ─────────────────────────────────────────────────────────────
 * 1. Go to https://script.google.com → New project
 * 2. Paste this entire file into the Code.gs editor
 * 3. Replace the two constants below:
 *      SPREADSHEET_ID  → from your Google Sheet URL
 *      DRIVE_FOLDER_ID → from your Google Drive folder URL
 * 4. Click Deploy → New deployment (or Manage → edit existing)
 *      Type:            Web app
 *      Execute as:      Me (your Google account)
 *      Who has access:  Anyone
 * 5. Copy the Web App URL into js/main.js as APPS_SCRIPT_URL
 *
 * SHEET COLUMNS (written automatically on first use)
 * ─────────────────────────────────────────────────────────────
 * A  Timestamp          B  Status            C  Draft ID
 * D  Name               E  Business Name     F  Email
 * G  Phone              H  Consent           I  Debtor Company
 * J  Invoice Amount (£) K  Invoice Date      L  Description
 * M  Stripe Connected   N  Files (Drive)     O  Completed
 * ─────────────────────────────────────────────────────────────
 */

// ── CONFIGURE THESE TWO VALUES ────────────────────────────────
var SPREADSHEET_ID  = 'REPLACE_WITH_YOUR_SPREADSHEET_ID';
var DRIVE_FOLDER_ID = 'REPLACE_WITH_YOUR_DRIVE_FOLDER_ID';
// ─────────────────────────────────────────────────────────────

var SHEET_NAME         = 'Claims';
var NOTIFICATION_EMAIL = 'recover@credvanta.co.uk';

var HEADERS = [
  'Timestamp',
  'Status',
  'Draft ID',
  'Name',
  'Business Name',
  'Email',
  'Phone',
  'Consent to Contact',
  'Debtor Company',
  'Invoice Amount (£)',
  'Invoice Date',
  'Description',
  'Stripe Connected',
  'Files (Drive Links)',
  'Completed',
];

// Column index map (0-based) — must match HEADERS order above
var COL = {
  timestamp:  0,
  status:     1,
  draftId:    2,
  name:       3,
  business:   4,
  email:      5,
  phone:      6,
  consent:    7,
  debtor:     8,
  amount:     9,
  invoiceDate:10,
  description:11,
  stripe:     12,
  files:      13,
  completed:  14,
};

/**
 * Main POST handler — called by both Step 1 (enquiry) and Step 4 (complete).
 */
function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    var p       = e.parameter;
    var status  = p.status  || 'complete';
    var draftId = p.draftId || '';

    var sheet = getOrCreateSheet();

    if (status === 'enquiry') {
      // ── Stage 1: append a new Enquiry row ──────────────────
      appendEnquiry(sheet, p, draftId);

    } else {
      // ── Stage 2: update existing row or append Complete ────
      var fileLinks = uploadFilesToDrive(p);

      var rowIndex = draftId ? findRowByDraftId(sheet, draftId) : -1;

      if (rowIndex > 0) {
        updateRow(sheet, rowIndex, p, fileLinks);
      } else {
        appendComplete(sheet, p, draftId, fileLinks);
      }

      // Notification email fires only on complete submission
      sendNotificationEmail(p, fileLinks);
    }

    return ContentService
      .createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    console.error('doPost error:', err.message);
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);

  } finally {
    lock.releaseLock();
  }
}

// ── Sheet helpers ─────────────────────────────────────────────

function getOrCreateSheet() {
  if (SPREADSHEET_ID.includes('REPLACE')) {
    throw new Error('SPREADSHEET_ID not configured in Code.gs');
  }
  var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.getRange(1, 1, 1, HEADERS.length)
      .setFontWeight('bold')
      .setBackground('#0B1D35')
      .setFontColor('#FFFFFF');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

/**
 * Append a new Enquiry row (Stage 1 — Step 1 Continue).
 * Debt fields are left blank; they are filled in when Stage 2 arrives.
 */
function appendEnquiry(sheet, p, draftId) {
  var row = new Array(HEADERS.length).fill('');
  row[COL.timestamp] = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm:ss');
  row[COL.status]    = 'Enquiry';
  row[COL.draftId]   = draftId;
  row[COL.name]      = p.name     || '';
  row[COL.business]  = p.business || '';
  row[COL.email]     = p.email    || '';
  row[COL.phone]     = p.phone    || '';
  row[COL.consent]   = p.consent  || '';
  sheet.appendRow(row);
}

/**
 * Append a new Complete row (Stage 2 — no matching Enquiry found).
 */
function appendComplete(sheet, p, draftId, fileLinks) {
  var row = new Array(HEADERS.length).fill('');
  var now = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm:ss');
  row[COL.timestamp]   = now;
  row[COL.status]      = 'Complete';
  row[COL.draftId]     = draftId;
  row[COL.name]        = p.name        || '';
  row[COL.business]    = p.business    || '';
  row[COL.email]       = p.email       || '';
  row[COL.phone]       = p.phone       || '';
  row[COL.consent]     = p.consent     || '';
  row[COL.debtor]      = p.debtor      || '';
  row[COL.amount]      = p.amount      || '';
  row[COL.invoiceDate] = p.invoiceDate || '';
  row[COL.description] = p.description || '';
  row[COL.stripe]      = p.stripeConnected === 'true' ? 'Yes' : 'No';
  row[COL.files]       = fileLinks;
  row[COL.completed]   = now;
  sheet.appendRow(row);
}

/**
 * Find the first row whose Draft ID column matches draftId.
 * Returns the 1-based sheet row number, or -1 if not found.
 */
function findRowByDraftId(sheet, draftId) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return -1;
  // Read only the Draft ID column (COL.draftId + 1 for 1-based)
  var col    = sheet.getRange(2, COL.draftId + 1, lastRow - 1, 1).getValues();
  for (var i = 0; i < col.length; i++) {
    if (col[i][0] === draftId) return i + 2; // +1 for header, +1 for 0-based
  }
  return -1;
}

/**
 * Update an existing Enquiry row in place with the full submission data.
 */
function updateRow(sheet, rowIndex, p, fileLinks) {
  var now = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm:ss');
  // Update individual cells — preserves any data already in the row
  sheet.getRange(rowIndex, COL.status      + 1).setValue('Complete');
  sheet.getRange(rowIndex, COL.consent     + 1).setValue(p.consent     || '');
  sheet.getRange(rowIndex, COL.debtor      + 1).setValue(p.debtor      || '');
  sheet.getRange(rowIndex, COL.amount      + 1).setValue(p.amount      || '');
  sheet.getRange(rowIndex, COL.invoiceDate + 1).setValue(p.invoiceDate || '');
  sheet.getRange(rowIndex, COL.description + 1).setValue(p.description || '');
  sheet.getRange(rowIndex, COL.stripe      + 1).setValue(p.stripeConnected === 'true' ? 'Yes' : 'No');
  sheet.getRange(rowIndex, COL.files       + 1).setValue(fileLinks);
  sheet.getRange(rowIndex, COL.completed   + 1).setValue(now);
}

// ── File upload ───────────────────────────────────────────────

function uploadFilesToDrive(p) {
  if (!p.files || p.files === '[]' || DRIVE_FOLDER_ID.includes('REPLACE')) return '';
  try {
    var files  = JSON.parse(p.files);
    var root   = DriveApp.getFolderById(DRIVE_FOLDER_ID);
    var label  = (p.business || 'Unnamed') + ' — ' +
                 Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm');
    var folder = root.createFolder(label);
    var links  = files.map(function(file) {
      if (!file.data || !file.name) return null;
      try {
        var decoded   = Utilities.base64Decode(file.data);
        var blob      = Utilities.newBlob(decoded, file.type || 'application/octet-stream', file.name);
        var driveFile = folder.createFile(blob);
        driveFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        return file.name + ': ' + driveFile.getUrl();
      } catch (fe) {
        return file.name + ': upload failed (' + fe.message + ')';
      }
    }).filter(Boolean);
    return links.join('\n');
  } catch (err) {
    console.error('Drive upload failed:', err.message);
    return 'Drive upload error: ' + err.message;
  }
}

// ── Notification email ────────────────────────────────────────

function sendNotificationEmail(p, fileLinks) {
  try {
    var sheetLink = SPREADSHEET_ID.includes('REPLACE')
      ? '⚠️  Google Sheet not yet configured.'
      : 'https://docs.google.com/spreadsheets/d/' + SPREADSHEET_ID;

    MailApp.sendEmail({
      to:      NOTIFICATION_EMAIL,
      subject: 'New Claim: ' + (p.business || 'Unknown') + ' — £' + (p.amount || '?'),
      body:    'New claim submitted via the website.\n\n'
               + '──────────────────────────────────\n'
               + 'CLAIMANT\n'
               + '──────────────────────────────────\n'
               + 'Name:     ' + (p.name        || '') + '\n'
               + 'Business: ' + (p.business    || '') + '\n'
               + 'Email:    ' + (p.email       || '') + '\n'
               + 'Phone:    ' + (p.phone       || '') + '\n'
               + 'Consent:  ' + (p.consent     || '') + '\n\n'
               + '──────────────────────────────────\n'
               + 'DEBT\n'
               + '──────────────────────────────────\n'
               + 'Debtor:      ' + (p.debtor      || '') + '\n'
               + 'Amount:      £' + (p.amount     || '') + '\n'
               + 'Invoice Date:' + (p.invoiceDate || '') + '\n'
               + 'Description: ' + (p.description || '') + '\n\n'
               + (fileLinks ? '──────────────────────────────────\n'
                            + 'FILES\n'
                            + '──────────────────────────────────\n'
                            + fileLinks + '\n\n' : '')
               + '──────────────────────────────────\n'
               + 'Draft ID: ' + (p.draftId || 'n/a') + '\n'
               + 'View sheet: ' + sheetLink,
    });
  } catch (err) {
    console.error('Email send failed:', err.message);
  }
}

/**
 * Simple GET — confirms the script is live.
 */
function doGet() {
  return ContentService
    .createTextOutput('Credvanta Recovery Group — Claims endpoint is live (v2).')
    .setMimeType(ContentService.MimeType.TEXT);
}
