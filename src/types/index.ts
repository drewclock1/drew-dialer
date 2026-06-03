export type DialerMode = 'auto' | 'predictive'
export type CallStatus = 'idle' | 'dialing' | 'ringing' | 'connected' | 'ended' | 'no_answer' | 'voicemail' | 'busy' | 'failed'
export type LeadStatus = 'pending' | 'dialing' | 'answered' | 'no_answer' | 'voicemail' | 'callback' | 'not_interested' | 'converted' | 'appointment' | 'invalid_number' | 'hung_up' | 'busy'
export type AgentStatus = 'offline' | 'ready' | 'on_call' | 'paused' | 'wrap_up'

export interface Lead {
  id: string
  name: string
  phone: string
  email?: string
  company?: string
  status: LeadStatus
  notes?: string
  attempts: number
  last_called?: string
  callback_time?: string
  campaign_id?: string
  // Google Sheets tracking
  sheet_id?: string
  sheet_gid?: string
  sheet_row?: number
}

export interface Campaign {
  id: string
  name: string
  leads: Lead[]
  mode: DialerMode
  status: 'idle' | 'running' | 'paused' | 'completed'
  created_at: string
  calls_made: number
  calls_answered: number
  calls_remaining: number
}

export interface CallLog {
  id: string
  lead_id: string
  lead_name: string
  phone: string
  started_at: string
  ended_at?: string
  duration?: number
  outcome: LeadStatus
  notes?: string
  call_sid?: string
}

export interface DialerState {
  mode: DialerMode
  agentStatus: AgentStatus
  activeCampaign: Campaign | null
  currentLead: Lead | null
  callStatus: CallStatus
  callDuration: number
  queue: Lead[]
  logs: CallLog[]
  isMuted: boolean
}
