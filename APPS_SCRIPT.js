/**
 * Drew Dialer — Google Apps Script
 * 
 * HOW TO DEPLOY:
 * 1. Open your Google Sheet
 * 2. Extensions → Apps Script
 * 3. Delete everything in the editor, paste this entire file
 * 4. Click Save (floppy disk icon)
 * 5. Click Deploy → New Deployment
 * 6. Type: Web App
 * 7. Execute as: Me
 * 8. Who has access: Anyone
 * 9. Click Deploy → Copy the Web App URL
 * 10. Send that URL to your AI assistant to plug in
 *
 * HOW IT WORKS:
 * - The dialer calls this script whenever a call outcome is set
 * - Script finds the lead by phone number and updates their Status column
 * - If lead not found, appends a new row to a "Results" tab
 * - Auto-creates Status, Outcome Time, and Notes columns if missing
 */

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents)
    
    if (data.action === 'update_lead') {
      const result = updateLeadStatus(data)
      return ContentService
        .createTextOutput(JSON.stringify({ success: true, result }))
        .setMimeType(ContentService.MimeType.JSON)
    }
    
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: 'Unknown action' }))
      .setMimeType(ContentService.MimeType.JSON)
      
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON)
  }
}

function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ status: 'Drew Dialer Script Active ✅' }))
    .setMimeType(ContentService.MimeType.JSON)
}

function updateLeadStatus(data) {
  const { phone, leadName, outcome, notes, sheetId, sheetGid, sheetRow, timestamp } = data
  
  // Clean phone for matching (digits only)
  const cleanPhone = (phone || '').replace(/\D/g, '').slice(-10)
  
  // Get the spreadsheet
  let ss
  if (sheetId) {
    try { ss = SpreadsheetApp.openById(sheetId) } catch(e) { ss = SpreadsheetApp.getActiveSpreadsheet() }
  } else {
    ss = SpreadsheetApp.getActiveSpreadsheet()
  }
  
  // Get all sheets, try to find lead by phone
  const sheets = ss.getSheets()
  let updated = false
  
  for (const sheet of sheets) {
    // Skip the Results log sheet
    if (sheet.getName() === 'Dialer Results') continue
    
    const data2d = sheet.getDataRange().getValues()
    if (data2d.length < 2) continue
    
    const headers = data2d[0].map(h => String(h).toLowerCase().trim())
    
    // Find phone column
    const phoneCol = headers.findIndex(h => 
      h.includes('phone') || h.includes('mobile') || h.includes('cell')
    )
    if (phoneCol === -1) continue
    
    // Find or create Status column
    let statusCol = headers.findIndex(h => h.includes('status') || h.includes('outcome'))
    if (statusCol === -1) {
      statusCol = data2d[0].length
      sheet.getRange(1, statusCol + 1).setValue('Status')
      sheet.getRange(1, statusCol + 2).setValue('Last Called')
      sheet.getRange(1, statusCol + 3).setValue('Notes')
    }
    
    // If we know the exact row, update it directly
    if (sheetRow && sheetRow > 1) {
      const rowPhone = String(data2d[sheetRow - 1]?.[phoneCol] || '').replace(/\D/g, '').slice(-10)
      if (rowPhone === cleanPhone || !cleanPhone) {
        sheet.getRange(sheetRow, statusCol + 1).setValue(outcome)
        sheet.getRange(sheetRow, statusCol + 2).setValue(timestamp ? new Date(timestamp) : new Date())
        if (notes) sheet.getRange(sheetRow, statusCol + 3).setValue(notes)
        updated = true
        break
      }
    }
    
    // Otherwise search all rows by phone
    for (let r = 1; r < data2d.length; r++) {
      const rowPhone = String(data2d[r][phoneCol]).replace(/\D/g, '').slice(-10)
      if (rowPhone === cleanPhone && cleanPhone) {
        sheet.getRange(r + 1, statusCol + 1).setValue(outcome)
        sheet.getRange(r + 1, statusCol + 2).setValue(timestamp ? new Date(timestamp) : new Date())
        if (notes) sheet.getRange(r + 1, statusCol + 3).setValue(notes)
        updated = true
        break
      }
    }
    if (updated) break
  }
  
  // Always append to Results log
  let resultsSheet = ss.getSheetByName('Dialer Results')
  if (!resultsSheet) {
    resultsSheet = ss.insertSheet('Dialer Results')
    resultsSheet.getRange(1, 1, 1, 6).setValues([['Name', 'Phone', 'Outcome', 'Notes', 'Timestamp', 'Updated Row']])
    resultsSheet.getRange(1, 1, 1, 6).setFontWeight('bold').setBackground('#e8f0fe')
  }
  resultsSheet.appendRow([
    leadName || '',
    phone || '',
    outcome || '',
    notes || '',
    timestamp ? new Date(timestamp) : new Date(),
    updated ? 'Yes' : 'No'
  ])
  
  return { updated, message: updated ? 'Lead row updated + logged' : 'Not found in sheet, logged to Results tab' }
}
