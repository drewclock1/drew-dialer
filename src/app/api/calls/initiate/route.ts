import { NextRequest, NextResponse } from 'next/server'
import { getTelnyxConfig } from '@/lib/config'

export async function POST(req: NextRequest) {
  try {
    const { to, webhookUrl } = await req.json()
    const { apiKey, connectionId, fromNumber } = await getTelnyxConfig()
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://xf3cx7fixq5oqh8b7kbpzy11.5.78.228.49.sslip.io'

    if (!apiKey || !connectionId) {
      return NextResponse.json({ error: 'Telnyx not configured' }, { status: 503 })
    }

    const body = {
      connection_id: connectionId,
      to,
      from: fromNumber,
      webhook_url: webhookUrl || `${appUrl}/api/webhooks/telnyx`,
      webhook_url_method: 'POST',
      answering_machine_detection: 'detect_words',
      answering_machine_detection_config: {
        after_greeting_silence_ms: 800,
        between_words_silence_ms: 50,
        greeting_duration_ms: 3500,
        initial_silence_ms: 4500,
        maximum_number_of_words: 3,
        maximum_silence_after_greeting_ms: 2000,
        silence_threshold: 256,
        total_analysis_time_ms: 5000
      }
    }

    const res = await fetch('https://api.telnyx.com/v2/calls', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    })

    const data = await res.json()
    if (!res.ok) {
      return NextResponse.json({ error: data }, { status: res.status })
    }
    return NextResponse.json(data)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
