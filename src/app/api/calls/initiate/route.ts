import { NextRequest, NextResponse } from 'next/server'
import { getTelnyxConfig, getConfig } from '@/lib/config'

export async function POST(req: NextRequest) {
  try {
    const { to, leadName } = await req.json()
    const { apiKey, connectionId, fromNumber } = await getTelnyxConfig()
    const cfg = await getConfig()
    const agentPhone = cfg['AGENT_PHONE'] || '+17017209050'
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://xf3cx7fixq5oqh8b7kbpzy11.5.78.228.49.sslip.io'

    if (!apiKey || !connectionId) {
      return NextResponse.json({ error: 'Telnyx not configured' }, { status: 503 })
    }

    // Step 1: Call the AGENT first (Drew's cell)
    // When agent answers, webhook bridges to the lead
    const agentCallBody = {
      connection_id: connectionId,
      to: agentPhone,
      from: fromNumber,           // Shows Telnyx number, not Drew's personal number
      webhook_url: `${appUrl}/api/webhooks/telnyx`,
      webhook_url_method: 'POST',
      // Pass lead info via custom headers so webhook knows who to dial next
      client_state: Buffer.from(JSON.stringify({
        stage: 'agent_leg',
        lead_phone: to,
        lead_name: leadName || 'Lead',
        from_number: fromNumber,
        connection_id: connectionId,
        app_url: appUrl
      })).toString('base64')
    }

    const res = await fetch('https://api.telnyx.com/v2/calls', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(agentCallBody)
    })

    const data = await res.json()
    if (!res.ok) {
      return NextResponse.json({ error: data }, { status: res.status })
    }

    // Return agent call control ID so frontend can track it
    return NextResponse.json({
      data: {
        call_control_id: data?.data?.call_control_id,
        call_leg_id: data?.data?.call_leg_id,
        stage: 'calling_agent',
        message: 'Calling your phone first, then bridging to lead...'
      }
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
