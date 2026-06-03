import { NextRequest, NextResponse } from 'next/server'
import { getConfig } from '@/lib/config'

const OUTCOME_LABELS: Record<string, string> = {
  hung_up: 'Hung Up',
  callback: 'Callback',
  converted: 'Closed ✅',
  voicemail: 'Voicemail 📬',
  appointment: 'Appointment Set 📅',
  invalid_number: 'Invalid #',
  not_interested: 'Not Interested',
  no_answer: 'No Answer',
  answered: 'Answered',
  busy: 'Busy',
}

export async function POST(req: NextRequest) {
  try {
    const { phone, outcome, leadName, notes, sheetId, sheetGid, sheetRow, timestamp } = await req.json()
    const cfg = await getConfig()
    const appsScriptUrl = cfg['APPS_SCRIPT_URL'] || process.env.APPS_SCRIPT_URL || ''

    const outcomeLabel = OUTCOME_LABELS[outcome] || outcome
    const ts = timestamp || new Date().toISOString()

    // If Apps Script URL is configured, call it to update the sheet
    if (appsScriptUrl) {
      try {
        const res = await fetch(appsScriptUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'update_lead',
            phone,
            leadName,
            outcome: outcomeLabel,
            notes: notes || '',
            sheetId,
            sheetGid,
            sheetRow,
            timestamp: ts,
          }),
          signal: AbortSignal.timeout(8000)
        })
        const data = await res.json().catch(() => ({}))
        return NextResponse.json({ success: true, method: 'apps_script', data })
      } catch (e: any) {
        return NextResponse.json({ success: false, method: 'apps_script', error: e.message }, { status: 500 })
      }
    }

    // No Apps Script configured yet
    return NextResponse.json({
      success: false,
      method: 'none',
      message: 'Apps Script not configured. Set APPS_SCRIPT_URL in Supabase app_config.',
      payload: { phone, outcome: outcomeLabel, leadName, notes, timestamp: ts }
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
