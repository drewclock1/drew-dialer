'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { formatDuration, formatPhone, normalizePhone } from '@/lib/telnyx'
import type { Lead, Campaign, CallLog, DialerMode, CallStatus, AgentStatus, LeadStatus } from '@/types'
import { v4 as uuidv4 } from 'uuid'
import LeadImporter from '@/components/LeadImporter'
import CallCard from '@/components/CallCard'
import QueuePanel from '@/components/QueuePanel'
import LogsPanel from '@/components/LogsPanel'
import StatsBar from '@/components/StatsBar'
import ModeSelector from '@/components/ModeSelector'

export default function DialerPage() {
  const [mode, setMode] = useState<DialerMode>('auto')
  const [agentStatus, setAgentStatus] = useState<AgentStatus>('ready')
  const [callStatus, setCallStatus] = useState<CallStatus>('idle')
  const [currentLead, setCurrentLead] = useState<Lead | null>(null)
  const [queue, setQueue] = useState<Lead[]>([])
  const [logs, setLogs] = useState<CallLog[]>([])
  const [isMuted, setIsMuted] = useState(false)
  const [callDuration, setCallDuration] = useState(0)
  const [activeCallId, setActiveCallId] = useState<string | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [notes, setNotes] = useState('')
  const [showImporter, setShowImporter] = useState(false)
  const [predictiveActive, setPredictiveActive] = useState<Lead[]>([])
  const [callStartTime, setCallStartTime] = useState<Date | null>(null)
  const [demoMode, setDemoMode] = useState(false)

  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const dialerRef = useRef<NodeJS.Timeout | null>(null)
  const pollRef = useRef<NodeJS.Timeout | null>(null)

  // Call duration timer
  useEffect(() => {
    if (callStatus === 'connected') {
      timerRef.current = setInterval(() => setCallDuration(d => d + 1), 1000)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
      if (callStatus === 'idle') setCallDuration(0)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [callStatus])

  // Poll for webhook events
  const pollEvents = useCallback(async (callControlId: string) => {
    try {
      const res = await fetch(`/api/webhooks/telnyx?callControlId=${callControlId}`)
      const { events } = await res.json()
      for (const ev of events) {
        if (ev.type === 'call.answered') {
          setCallStatus('connected')
          setCallStartTime(new Date())
          setAgentStatus('on_call')
        }
        if (ev.type === 'call.hangup') {
          handleCallEnded('no_answer')
        }
        if (ev.type === 'call.machine.detection.ended') {
          const result = ev.payload?.result
          if (result?.startsWith('machine')) handleCallEnded('voicemail')
        }
      }
    } catch {}
  }, [])

  const startPolling = (callControlId: string) => {
    if (pollRef.current) clearInterval(pollRef.current)
    pollRef.current = setInterval(() => pollEvents(callControlId), 1500)
  }

  const stopPolling = () => {
    if (pollRef.current) clearInterval(pollRef.current)
  }

  const dialLead = async (lead: Lead) => {
    setCurrentLead(lead)
    setCallStatus('dialing')
    setNotes('')
    setCallDuration(0)

    // Update lead status in queue
    setQueue(q => q.map(l => l.id === lead.id ? { ...l, status: 'dialing' } : l))

    try {
      const res = await fetch('/api/calls/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: normalizePhone(lead.phone),
          webhookUrl: `${window.location.origin}/api/webhooks/telnyx`
        })
      })
      const data = await res.json()
      if (data?.data?.call_control_id) {
        setDemoMode(false)
        setActiveCallId(data.data.call_control_id)
        setCallStatus('ringing')
        startPolling(data.data.call_control_id)
      } else {
        // Telnyx not yet configured — demo mode
        setDemoMode(true)
        setCallStatus('ringing')
        setTimeout(() => {
          const answered = Math.random() > 0.45
          if (answered) {
            setCallStatus('connected')
            setCallStartTime(new Date())
            setAgentStatus('on_call')
          } else {
            handleCallEnded('no_answer')
          }
        }, 2000 + Math.random() * 3000)
      }
    } catch {
      setDemoMode(true)
      setCallStatus('ringing')
      setTimeout(() => {
        const answered = Math.random() > 0.45
        if (answered) {
          setCallStatus('connected')
          setCallStartTime(new Date())
          setAgentStatus('on_call')
        } else {
          handleCallEnded('no_answer')
        }
      }, 2000 + Math.random() * 3000)
    }
  }

  const handleCallEnded = useCallback((outcome: LeadStatus) => {
    stopPolling()
    setCallStatus('ended')
    setAgentStatus('wrap_up')

    const duration = callStartTime ? Math.floor((Date.now() - callStartTime.getTime()) / 1000) : 0

    if (currentLead) {
      // Log the call
      const log: CallLog = {
        id: uuidv4(),
        lead_id: currentLead.id,
        lead_name: currentLead.name,
        phone: currentLead.phone,
        started_at: callStartTime?.toISOString() || new Date().toISOString(),
        ended_at: new Date().toISOString(),
        duration,
        outcome,
        notes,
        call_sid: activeCallId || undefined
      }
      setLogs(l => [log, ...l])

      // Update lead status
      setQueue(q => q.map(l =>
        l.id === currentLead.id ? { ...l, status: outcome, attempts: l.attempts + 1 } : l
      ))
    }

    setActiveCallId(null)
    setCallStartTime(null)

    // Auto-advance after 2s if running
    if (isRunning && !isPaused) {
      setTimeout(() => {
        setCallStatus('idle')
        setCallDuration(0)
        setAgentStatus('ready')
        setCurrentLead(null)
        advanceQueue()
      }, 2000)
    } else {
      setTimeout(() => {
        setCallStatus('idle')
        setAgentStatus('ready')
        setCurrentLead(null)
      }, 1500)
    }
  }, [currentLead, callStartTime, notes, activeCallId, isRunning, isPaused])

  const advanceQueue = useCallback(() => {
    setQueue(q => {
      const next = q.find(l => l.status === 'pending')
      if (next) {
        setTimeout(() => dialLead(next), 800)
      } else {
        setIsRunning(false)
        setAgentStatus('ready')
      }
      return q
    })
  }, [])

  const startDialer = () => {
    const pending = queue.filter(l => l.status === 'pending')
    if (pending.length === 0) return
    setIsRunning(true)
    setIsPaused(false)
    if (mode === 'auto') {
      dialLead(pending[0])
    } else {
      // Predictive: dial first 2-3 simultaneously
      const batch = pending.slice(0, 2)
      setPredictiveActive(batch)
      batch.forEach((lead, i) => {
        setTimeout(() => dialLead(lead), i * 500)
      })
    }
  }

  const pauseDialer = () => {
    setIsPaused(true)
    setIsRunning(false)
  }

  const skipLead = () => {
    if (activeCallId) {
      fetch('/api/calls/hangup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callControlId: activeCallId })
      }).catch(() => {})
    }
    handleCallEnded('no_answer')
  }

  const toggleMute = async () => {
    if (activeCallId) {
      await fetch('/api/calls/mute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callControlId: activeCallId, mute: !isMuted })
      })
    }
    setIsMuted(m => !m)
  }

  const setOutcome = (outcome: LeadStatus) => {
    if (activeCallId) {
      fetch('/api/calls/hangup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callControlId: activeCallId })
      }).catch(() => {})
    }
    handleCallEnded(outcome)
  }

  const addLeads = (leads: Lead[]) => {
    setQueue(q => [...q, ...leads])
    setShowImporter(false)
  }

  const stats = {
    total: queue.length,
    pending: queue.filter(l => l.status === 'pending').length,
    answered: logs.filter(l => l.outcome === 'answered').length,
    noAnswer: logs.filter(l => l.outcome === 'no_answer').length,
    voicemail: logs.filter(l => l.outcome === 'voicemail').length,
    converted: logs.filter(l => l.outcome === 'converted').length,
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <div className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-brand rounded-lg flex items-center justify-center text-sm font-bold">D</div>
          <span className="font-bold text-lg">Drew Power Dialer</span>
        </div>
        <div className="flex items-center gap-4">
          <div className={`flex items-center gap-2 text-sm px-3 py-1 rounded-full ${
            agentStatus === 'on_call' ? 'bg-green-500/20 text-green-400' :
            agentStatus === 'ready' ? 'bg-blue-500/20 text-blue-400' :
            agentStatus === 'wrap_up' ? 'bg-yellow-500/20 text-yellow-400' :
            'bg-gray-500/20 text-gray-400'
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              agentStatus === 'on_call' ? 'bg-green-400 animate-pulse' :
              agentStatus === 'ready' ? 'bg-blue-400' :
              agentStatus === 'wrap_up' ? 'bg-yellow-400' : 'bg-gray-400'
            }`} />
            {agentStatus === 'on_call' ? 'On Call' :
             agentStatus === 'ready' ? 'Ready' :
             agentStatus === 'wrap_up' ? 'Wrap Up' : 'Offline'}
          </div>
          <span className="text-sm text-gray-500">📞 +1 (928) 291-0777</span>
        </div>
      </div>

      {/* Demo mode warning */}
      {demoMode && (
        <div className="bg-yellow-500/10 border-b border-yellow-500/20 px-6 py-2 flex items-center gap-2 text-xs text-yellow-400">
          <span>⚠️</span>
          <span><strong>Demo Mode</strong> — Calls are simulated. Add your Telnyx API key to make real calls.</span>
        </div>
      )}

      {/* Stats Bar */}
      <StatsBar stats={stats} />

      <div className="flex h-[calc(100vh-130px)]">
        {/* Left: Queue */}
        <div className="w-80 border-r border-white/10 flex flex-col">
          <div className="p-4 border-b border-white/10 flex items-center justify-between">
            <span className="font-semibold text-sm">Lead Queue ({stats.pending} pending)</span>
            <button
              onClick={() => setShowImporter(true)}
              className="text-xs bg-brand hover:bg-brand-dark px-3 py-1.5 rounded-lg transition"
            >
              + Import
            </button>
          </div>
          <QueuePanel
            queue={queue}
            currentLead={currentLead}
            onCallLead={(lead) => {
              // If already on a call, don't allow
              if (callStatus === 'connected' || callStatus === 'ringing' || callStatus === 'dialing') return
              // Reset to pending so it dials cleanly
              setQueue(q => q.map(l => l.id === lead.id ? { ...l, status: 'pending' } : l))
              dialLead({ ...lead, status: 'pending' })
            }}
            isOnCall={callStatus === 'connected' || callStatus === 'ringing' || callStatus === 'dialing'}
          />
        </div>

        {/* Center: Active Call */}
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          <ModeSelector mode={mode} setMode={setMode} isRunning={isRunning} />

          <CallCard
            lead={currentLead}
            callStatus={callStatus}
            callDuration={callDuration}
            isMuted={isMuted}
            notes={notes}
            setNotes={setNotes}
            onMute={toggleMute}
            onHangup={() => setOutcome('no_answer')}
            onSkip={skipLead}
            onOutcome={setOutcome}
            isRunning={isRunning}
            isPaused={isPaused}
            queueEmpty={stats.pending === 0}
            onStart={startDialer}
            onPause={pauseDialer}
            onResume={() => { setIsPaused(false); setIsRunning(true); advanceQueue() }}
          />
        </div>

        {/* Right: Call Logs */}
        <div className="w-80 border-l border-white/10 flex flex-col">
          <div className="p-4 border-b border-white/10">
            <span className="font-semibold text-sm">Call Log ({logs.length})</span>
          </div>
          <LogsPanel logs={logs} />
        </div>
      </div>

      {/* Lead Importer Modal */}
      {showImporter && (
        <LeadImporter onImport={addLeads} onClose={() => setShowImporter(false)} />
      )}
    </div>
  )
}
