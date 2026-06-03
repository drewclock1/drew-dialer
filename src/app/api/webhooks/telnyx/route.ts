import { NextRequest, NextResponse } from 'next/server'
import { getTelnyxConfig } from '@/lib/config'

// In-memory event store for SSE polling
const callEvents: Map<string, any[]> = new Map()

async function telnyxAction(callControlId: string, action: string, body: any, apiKey: string) {
  const res = await fetch(`https://api.telnyx.com/v2/calls/${callControlId}/actions/${action}`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  return res.json()
}

async function initiateLeadCall(leadPhone: string, fromNumber: string, connectionId: string, agentCallId: string, appUrl: string, apiKey: string) {
  const res = await fetch('https://api.telnyx.com/v2/calls', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      connection_id: connectionId,
      to: leadPhone,
      from: fromNumber,
      webhook_url: `${appUrl}/api/webhooks/telnyx`,
      webhook_url_method: 'POST',
      answering_machine_detection: 'detect_words',
      answering_machine_detection_config: {
        after_greeting_silence_ms: 800,
        between_words_silence_ms: 50,
        greeting_duration_ms: 3500,
        initial_silence_ms: 4500,
        maximum_number_of_words: 3,
        silence_threshold: 256,
        total_analysis_time_ms: 5000
      },
      client_state: Buffer.from(JSON.stringify({
        stage: 'lead_leg',
        agent_call_id: agentCallId,
        from_number: fromNumber,
        app_url: appUrl
      })).toString('base64')
    })
  })
  return res.json()
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const event = body?.data
    const eventType = event?.event_type
    const payload = event?.payload
    const callControlId = payload?.call_control_id
    const rawState = payload?.client_state

    console.log(`[WEBHOOK] ${eventType} | ${callControlId}`)

    // Decode client state
    let state: any = {}
    if (rawState) {
      try { state = JSON.parse(Buffer.from(rawState, 'base64').toString()) } catch {}
    }

    const { apiKey } = await getTelnyxConfig()

    // Store event for frontend polling
    const key = callControlId || 'unknown'
    if (!callEvents.has(key)) callEvents.set(key, [])
    callEvents.get(key)!.push({
      type: eventType,
      payload,
      state,
      ts: Date.now()
    })

    // === AGENT LEG answered → dial the lead ===
    if (eventType === 'call.answered' && state.stage === 'agent_leg') {
      console.log(`[BRIDGE] Agent answered, now calling lead: ${state.lead_phone}`)

      // Play a brief whisper to the agent
      await telnyxAction(callControlId, 'speak', {
        payload: `Connecting to ${state.lead_name || 'lead'}...`,
        voice: 'male',
        language: 'en-US'
      }, apiKey)

      // Dial the lead
      await initiateLeadCall(
        state.lead_phone,
        state.from_number,
        state.connection_id,
        callControlId,
        state.app_url,
        apiKey
      )
    }

    // === LEAD LEG answered → bridge to agent ===
    if (eventType === 'call.answered' && state.stage === 'lead_leg') {
      console.log(`[BRIDGE] Lead answered, bridging to agent: ${state.agent_call_id}`)
      await telnyxAction(callControlId, 'bridge', {
        call_control_id: state.agent_call_id
      }, apiKey)
    }

    // === AMD detected voicemail ===
    if (eventType === 'call.machine.detection.ended') {
      const result = payload?.result
      console.log(`[AMD] ${result} on ${state.stage}`)
      if (result?.startsWith('machine') && state.stage === 'lead_leg') {
        // Hang up lead leg — agent gets notified via polling
        await telnyxAction(callControlId, 'hangup', {}, apiKey)
        // Also store event on agent call
        if (state.agent_call_id) {
          if (!callEvents.has(state.agent_call_id)) callEvents.set(state.agent_call_id, [])
          callEvents.get(state.agent_call_id)!.push({ type: 'voicemail_detected', ts: Date.now() })
        }
      }
    }

    // === Hangup ===
    if (eventType === 'call.hangup') {
      console.log(`[HANGUP] ${state.stage} | ${callControlId}`)
      // If lead hung up, also hang up agent
      if (state.stage === 'lead_leg' && state.agent_call_id) {
        await telnyxAction(state.agent_call_id, 'hangup', {}, apiKey).catch(() => {})
        if (!callEvents.has(state.agent_call_id)) callEvents.set(state.agent_call_id, [])
        callEvents.get(state.agent_call_id)!.push({ type: 'call.hangup', payload, ts: Date.now() })
      }
    }

    return NextResponse.json({ received: true })
  } catch (err: any) {
    console.error('[WEBHOOK ERROR]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// GET: frontend polls this for call events
export async function GET(req: NextRequest) {
  const callControlId = req.nextUrl.searchParams.get('callControlId')
  if (!callControlId) return NextResponse.json({ events: [] })
  const events = callEvents.get(callControlId) || []
  callEvents.delete(callControlId)
  return NextResponse.json({ events })
}
