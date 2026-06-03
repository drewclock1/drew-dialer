import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { to, webhookUrl } = await req.json()
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || ''

    const body = {
      connection_id: process.env.TELNYX_CONNECTION_ID,
      to,
      from: process.env.TELNYX_FROM_NUMBER || '+19282910777',
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
        'Authorization': `Bearer ${process.env.TELNYX_API_KEY}`,
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
