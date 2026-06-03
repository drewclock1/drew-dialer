import { NextRequest, NextResponse } from 'next/server'

// Store call events in memory (use Supabase in production)
const callEvents: Map<string, any[]> = new Map()

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const event = body?.data
    const eventType = event?.event_type
    const callControlId = event?.payload?.call_control_id
    const callLegId = event?.payload?.call_leg_id

    console.log(`[TELNYX WEBHOOK] ${eventType} for ${callControlId}`)

    // Store event for SSE polling
    const key = callControlId || 'unknown'
    if (!callEvents.has(key)) callEvents.set(key, [])
    callEvents.get(key)!.push({ type: eventType, payload: event?.payload, ts: Date.now() })

    // Handle AMD (answering machine detection)
    if (eventType === 'call.machine.detection.ended') {
      const result = event?.payload?.result
      console.log(`[AMD] Result: ${result} for ${callControlId}`)
      // AMD result: 'human', 'machine_start', 'machine_end_beep', 'machine_end_silence', 'not_sure'
    }

    // Handle call answered
    if (eventType === 'call.answered') {
      console.log(`[CALL] Answered: ${callControlId}`)
    }

    // Handle call ended
    if (eventType === 'call.hangup') {
      console.log(`[CALL] Hangup: ${callControlId}`)
    }

    return NextResponse.json({ received: true })
  } catch (err: any) {
    console.error('[WEBHOOK ERROR]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// GET endpoint for polling call events (SSE-lite)
export async function GET(req: NextRequest) {
  const callControlId = req.nextUrl.searchParams.get('callControlId')
  if (!callControlId) return NextResponse.json({ events: [] })
  const events = callEvents.get(callControlId) || []
  // Clear after read
  callEvents.delete(callControlId)
  return NextResponse.json({ events })
}
