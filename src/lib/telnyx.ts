// Telnyx WebRTC + REST client utilities

export const TELNYX_CONFIG = {
  apiKey: process.env.TELNYX_API_KEY || '',
  fromNumber: process.env.TELNYX_FROM_NUMBER || '+19282910777',
  connectionId: process.env.TELNYX_CONNECTION_ID || '',
  sipUsername: process.env.TELNYX_SIP_USERNAME || '',
  sipPassword: process.env.TELNYX_SIP_PASSWORD || '',
}

// Initiate an outbound call via Telnyx REST API
export async function initiateCall(to: string, webhookUrl: string) {
  const res = await fetch('/api/calls/initiate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ to, webhookUrl })
  })
  if (!res.ok) throw new Error(`Call failed: ${res.status}`)
  return res.json()
}

// Hang up a call
export async function hangupCall(callControlId: string) {
  const res = await fetch('/api/calls/hangup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callControlId })
  })
  return res.json()
}

// Bridge a call to WebRTC agent
export async function bridgeCall(callControlId: string, agentSipAddress: string) {
  const res = await fetch('/api/calls/bridge', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callControlId, agentSipAddress })
  })
  return res.json()
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0,3)}) ${cleaned.slice(3,6)}-${cleaned.slice(6)}`
  }
  if (cleaned.length === 11 && cleaned[0] === '1') {
    return `(${cleaned.slice(1,4)}) ${cleaned.slice(4,7)}-${cleaned.slice(7)}`
  }
  return phone
}

export function normalizePhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length === 10) return `+1${cleaned}`
  if (cleaned.length === 11 && cleaned[0] === '1') return `+${cleaned}`
  return `+${cleaned}`
}
