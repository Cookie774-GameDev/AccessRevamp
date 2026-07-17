/**
 * Optional Google Sheets review bridge.
 * Import the CSV produced by scripts/export-approved-outreach.mjs.
 * This script deliberately does not send email.
 */
function onOpen() {
  SpreadsheetApp.getUi().createMenu('AccessRevamp')
    .addItem('Prepare review columns', 'prepareAccessRevampReview')
    .addToUi();
}

function prepareAccessRevampReview() {
  const sheet = SpreadsheetApp.getActiveSheet();
  const lastColumn = sheet.getLastColumn();
  if (!lastColumn) throw new Error('Import approved-outreach.csv first.');
  const headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
  if (!headers.includes('queue_id')) throw new Error('This does not look like an AccessRevamp export.');
  const reviewHeaders = ['human_decision', 'reviewer', 'reviewed_at', 'review_notes'];
  sheet.getRange(1, lastColumn + 1, 1, reviewHeaders.length).setValues([reviewHeaders]);
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, lastColumn + reviewHeaders.length);
  SpreadsheetApp.getUi().alert('Review columns added. This sheet cannot send email; approved decisions must be imported by the secured backend.');
}
