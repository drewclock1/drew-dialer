import { NextRequest, NextResponse } from 'next/server'
import { getTelnyxConfig } from '@/lib/config'

export async function POST(req: NextRequest) {
  try {
    const { callControlId } = await req.json()
    const { apiKey } = await getTelnyxConfig()

    const res = await fetch(`https://api.telnyx.com/v2/calls/${callControlId}/actions/hangup`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    })
    const data = await res.json()
    return NextResponse.json(data)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
