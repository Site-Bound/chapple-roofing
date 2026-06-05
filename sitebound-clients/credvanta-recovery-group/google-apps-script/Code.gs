/**
 * ═══════════════════════════════════════════════════════════════
 * CREDVANTA RECOVERY GROUP — Google Apps Script  (v4)
 * Receives claim form submissions → Google Sheets + Google Drive
 * ═══════════════════════════════════════════════════════════════
 *
 * COLUMN ORDER — matches the existing sheet exactly (v1 columns
 * 1-12 are unchanged; Status and Consent are appended at 13-14).
 *
 *  A  Timestamp          B  Name              C  Business Name
 *  D  Email              E  Phone             F  Debtor Company
 *  G  Invoice Amount (£) H  Invoice Date      I  Description
 *  J  Stripe Connected   K  Files (Drive)     L  Submission ID
 *  M  Status             N  Consent to Contact
 *
 * HOW IT WORKS (two-stage submission)
 * ─────────────────────────────────────────────────────────────
 * Stage 1 — Step 1 "Continue" (status=enquiry):
 *   Appends a new row with contact details only.
 *   Debt fields are blank. Status = "Enquiry".
 *   No notification email at this stage.
 *
 * Stage 2 — Step 4 "Submit Claim" (status=complete):
 *   Finds the matching Enquiry row by Submission ID (col L) and
 *   updates it with the full claim data, then sends the email.
 *   If no matching row is found, appends a new complete row.
 *
 * SETUP
 * ─────────────────────────────────────────────────────────────
 * 1. Replace SPREADSHEET_ID and DRIVE_FOLDER_ID below.
 * 2. Deploy → Manage deployments → edit existing deployment
 *    (keep the same URL — do NOT create a new deployment).
 * ═══════════════════════════════════════════════════════════════
 */

// ── CONFIGURE THESE TWO VALUES ────────────────────────────────
var SPREADSHEET_ID  = 'REPLACE_WITH_YOUR_SPREADSHEET_ID';
var DRIVE_FOLDER_ID = 'REPLACE_WITH_YOUR_DRIVE_FOLDER_ID';
// ─────────────────────────────────────────────────────────────

var SHEET_NAME         = 'Claims';
var NOTIFICATION_EMAIL = 'recover@credvanta.co.uk';

// Column indexes (0-based) — matches the sheet's current layout
// after the client added 5 debtor-contact columns (G-K) and pushed
// all downstream columns to the right.
var COL = {
  timestamp:              0,   // A
  name:                   1,   // B
  business:               2,   // C
  email:                  3,   // D
  phone:                  4,   // E
  debtor_company:         5,   // F (was: debtor)
  debtor_contact_name:    6,   // G (new)
  debtor_contact_email:   7,   // H (new)
  debtor_contact_telephone: 8, // I (new)
  debtor_contact_mobile:  9,   // J (new)
  debtor_address:         10,  // K (new)
  amount:                 11,  // L (was 6)
  invoiceDate:            12,  // M (was 7)
  description:            13,  // N (was 8)
  stripe:                 14,  // O (was 9)
  files:                  15,  // P (was 10)
  submissionId:           16,  // Q (was 11)
  status:                 17,  // R (was 12)
  consent:                18,  // S (was 13)
};

var TOTAL_COLS = 19;

// Headers written only when the sheet is brand new and empty.
// Existing sheets keep their current (manually-added) headers.
var HEADERS = [
  'Timestamp', 'Name', 'Business Name', 'Email', 'Phone',
  'Debtor Company', 'Debtor Contact Name',
  'Debtor contact email', 'Debtor contact telephone', 'Debtor contact mobile',
  'Debtor Address',
  'Invoice Amount (£)', 'Invoice Date', 'Description',
  'Stripe Connected', 'Files (Drive Links)', 'Submission ID',
  'Status', 'Consent to Contact',
];

// ─────────────────────────────────────────────────────────────

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    var p      = e.parameter;
    var status = (p.status || 'complete').toLowerCase();

    var sheet = getOrCreateSheet();

    if (status === 'enquiry') {
      appendEnquiry(sheet, p);

    } else {
      // Stage 2: update existing enquiry row, or append if not found
      var fileLinks = uploadFilesToDrive(p);
      var rowIndex  = p.draftId ? findRowByDraftId(sheet, p.draftId) : -1;

      if (rowIndex > 0) {
        updateRow(sheet, rowIndex, p, fileLinks);
      } else {
        appendComplete(sheet, p, fileLinks);
      }

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
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME);

  // Only write headers on a completely blank sheet
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
 * Build a blank row array of the correct length.
 */
function blankRow() {
  var row = [];
  for (var i = 0; i < TOTAL_COLS; i++) row.push('');
  return row;
}

/**
 * Stage 1 — append a partial Enquiry row.
 * Debt-related columns are left blank; filled in at Stage 2.
 */
function appendEnquiry(sheet, p) {
  var row = blankRow();
  row[COL.timestamp]    = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm:ss');
  row[COL.name]         = p.name     || '';
  row[COL.business]     = p.business || '';
  row[COL.email]        = p.email    || '';
  row[COL.phone]        = p.phone    || '';
  row[COL.submissionId] = p.draftId  || '';
  row[COL.status]       = 'Enquiry';
  row[COL.consent]      = p.consent  || '';
  sheet.appendRow(row);
}

/**
 * Stage 2 — append a complete row (no matching enquiry found).
 * Backward compatible: accepts `debtor` as a fallback for `debtor_company`
 * so older payloads still land correctly.
 */
function appendComplete(sheet, p, fileLinks) {
  var row = blankRow();
  row[COL.timestamp]                = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm:ss');
  row[COL.name]                     = p.name                     || '';
  row[COL.business]                 = p.business                 || '';
  row[COL.email]                    = p.email                    || '';
  row[COL.phone]                    = p.phone                    || '';
  row[COL.debtor_company]           = p.debtor_company           || p.debtor || '';
  row[COL.debtor_contact_name]      = p.debtor_contact_name      || '';
  row[COL.debtor_contact_email]     = p.debtor_contact_email     || p.debtor_email || '';
  row[COL.debtor_contact_telephone] = p.debtor_contact_telephone || p.debtor_phone || '';
  row[COL.debtor_contact_mobile]    = p.debtor_contact_mobile    || '';
  row[COL.debtor_address]           = p.debtor_address           || '';
  row[COL.amount]                   = p.amount                   || '';
  row[COL.invoiceDate]              = p.invoiceDate              || '';
  row[COL.description]              = p.description              || '';
  row[COL.stripe]                   = p.stripeConnected === 'true' ? 'Yes' : 'No';
  row[COL.files]                    = fileLinks;
  row[COL.submissionId]             = p.draftId                  || Utilities.getUuid();
  row[COL.status]                   = 'Complete';
  row[COL.consent]                  = p.consent                  || '';
  sheet.appendRow(row);
}

/**
 * Stage 2 — update an existing Enquiry row in place.
 * Only fills in the blank debt/debtor columns; leaves claimant contact intact.
 */
function updateRow(sheet, rowIndex, p, fileLinks) {
  sheet.getRange(rowIndex, COL.debtor_company           + 1).setValue(p.debtor_company           || p.debtor || '');
  sheet.getRange(rowIndex, COL.debtor_contact_name      + 1).setValue(p.debtor_contact_name      || '');
  sheet.getRange(rowIndex, COL.debtor_contact_email     + 1).setValue(p.debtor_contact_email     || p.debtor_email || '');
  sheet.getRange(rowIndex, COL.debtor_contact_telephone + 1).setValue(p.debtor_contact_telephone || p.debtor_phone || '');
  sheet.getRange(rowIndex, COL.debtor_contact_mobile    + 1).setValue(p.debtor_contact_mobile    || '');
  sheet.getRange(rowIndex, COL.debtor_address           + 1).setValue(p.debtor_address           || '');
  sheet.getRange(rowIndex, COL.amount                   + 1).setValue(p.amount                   || '');
  sheet.getRange(rowIndex, COL.invoiceDate              + 1).setValue(p.invoiceDate              || '');
  sheet.getRange(rowIndex, COL.description              + 1).setValue(p.description              || '');
  sheet.getRange(rowIndex, COL.stripe                   + 1).setValue(p.stripeConnected === 'true' ? 'Yes' : 'No');
  sheet.getRange(rowIndex, COL.files                    + 1).setValue(fileLinks);
  sheet.getRange(rowIndex, COL.status                   + 1).setValue('Complete');
  sheet.getRange(rowIndex, COL.consent                  + 1).setValue(p.consent                  || '');
}

/**
 * Find the 1-based row number of the Enquiry row with the given draftId.
 * Returns -1 if not found.
 */
function findRowByDraftId(sheet, draftId) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return -1;
  var col  = sheet.getRange(2, COL.submissionId + 1, lastRow - 1, 1).getValues();
  for (var i = 0; i < col.length; i++) {
    if (col[i][0] === draftId) return i + 2;
  }
  return -1;
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

    var links = files.map(function(file) {
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

// ── Notification email (fires on complete submissions only) ───

function sendNotificationEmail(p, fileLinks) {
  try {
    var sheetLink = SPREADSHEET_ID.includes('REPLACE')
      ? '(Sheet not yet configured)'
      : 'https://docs.google.com/spreadsheets/d/' + SPREADSHEET_ID;

    MailApp.sendEmail({
      to:      NOTIFICATION_EMAIL,
      subject: 'New Claim: ' + (p.business || 'Unknown') + ' — £' + (p.amount || '?'),
      body:
        'New claim submitted via the website.\n\n'
        + 'CLAIMANT\n'
        + '---\n'
        + 'Name:     ' + (p.name        || '') + '\n'
        + 'Business: ' + (p.business    || '') + '\n'
        + 'Email:    ' + (p.email       || '') + '\n'
        + 'Phone:    ' + (p.phone       || '') + '\n'
        + 'Consent:  ' + (p.consent     || '') + '\n\n'
        + 'DEBT\n'
        + '---\n'
        + 'Debtor:       ' + (p.debtor      || '') + '\n'
        + 'Amount:       £' + (p.amount     || '') + '\n'
        + 'Invoice Date: ' + (p.invoiceDate || '') + '\n'
        + 'Description:  ' + (p.description || '') + '\n\n'
        + (fileLinks ? 'FILES\n---\n' + fileLinks + '\n\n' : '')
        + 'Draft ID:   ' + (p.draftId || 'n/a') + '\n'
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
    .createTextOutput('Credvanta Recovery Group — Claims endpoint is live (v4).')
    .setMimeType(ContentService.MimeType.TEXT);
}
