import { NextResponse } from 'next/server'
import { getTelnyxConfig } from '@/lib/config'

export async function GET() {
  const cfg = await getTelnyxConfig()
  
  // Test Telnyx API with the key
  let telnyxTest: any = {}
  try {
    const res = await fetch('https://api.telnyx.com/v2/phone_numbers?page[size]=1', {
      headers: { 'Authorization': `Bearer ${cfg.apiKey}` }
    })
    const data = await res.json()
    telnyxTest = { status: res.status, ok: res.ok, data: data?.data?.[0]?.phone_number || data }
  } catch (e: any) {
    telnyxTest = { error: e.message }
  }

  return NextResponse.json({
    config: {
      hasKey: !!cfg.apiKey,
      keyPrefix: cfg.apiKey?.slice(0, 20),
      connectionId: cfg.connectionId,
      fromNumber: cfg.fromNumber,
      agentPhone: cfg.agentPhone,
    },
    telnyxTest
  })
}
