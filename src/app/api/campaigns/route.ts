import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'

// In-memory campaign store (swap for Supabase)
let campaigns: any[] = []

export async function GET() {
  return NextResponse.json({ campaigns })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const campaign = {
      id: uuidv4(),
      name: body.name || 'New Campaign',
      mode: body.mode || 'auto',
      leads: (body.leads || []).map((l: any) => ({
        id: uuidv4(),
        name: l.name || '',
        phone: l.phone || '',
        email: l.email || '',
        company: l.company || '',
        status: 'pending',
        attempts: 0
      })),
      status: 'idle',
      created_at: new Date().toISOString(),
      calls_made: 0,
      calls_answered: 0,
    }
    campaigns.push(campaign)
    return NextResponse.json({ campaign })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
