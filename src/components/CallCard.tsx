'use client'
import { formatDuration, formatPhone } from '@/lib/telnyx'
import type { Lead, CallStatus, LeadStatus } from '@/types'

interface Props {
  lead: Lead | null
  callStatus: CallStatus
  callDuration: number
  isMuted: boolean
  notes: string
  setNotes: (n: string) => void
  onMute: () => void
  onHangup: () => void
  onSkip: () => void
  onOutcome: (o: LeadStatus) => void
  isRunning: boolean
  isPaused: boolean
  queueEmpty: boolean
  onStart: () => void
  onPause: () => void
  onResume: () => void
}

const statusLabel: Record<CallStatus, string> = {
  idle: 'Ready to dial',
  dialing: 'Connecting...',
  ringing: 'Ringing...',
  connected: 'Connected',
  ended: 'Call ended',
  no_answer: 'No answer',
  voicemail: 'Voicemail',
  busy: 'Busy',
  failed: 'Failed'
}

const statusColor: Record<CallStatus, string> = {
  idle: 'text-gray-400',
  dialing: 'text-yellow-400',
  ringing: 'text-blue-400',
  connected: 'text-green-400',
  ended: 'text-gray-400',
  no_answer: 'text-gray-400',
  voicemail: 'text-yellow-400',
  busy: 'text-orange-400',
  failed: 'text-red-400'
}

export default function CallCard({
  lead, callStatus, callDuration, isMuted, notes, setNotes,
  onMute, onHangup, onSkip, onOutcome,
  isRunning, isPaused, queueEmpty, onStart, onPause, onResume
}: Props) {
  const isActive = callStatus === 'connected' || callStatus === 'ringing' || callStatus === 'dialing'
  const isConnected = callStatus === 'connected'

  return (
    <div className="w-full max-w-lg">
      {/* Main call card */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-8 mb-4">
        {lead ? (
          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-full bg-brand/20 border border-brand/30 flex items-center justify-center text-2xl font-bold mx-auto mb-3">
              {lead.name.charAt(0).toUpperCase()}
            </div>
            <h2 className="text-xl font-bold">{lead.name}</h2>
            <p className="text-gray-400 text-lg font-mono mt-1">{formatPhone(lead.phone)}</p>
            {lead.company && <p className="text-gray-500 text-sm mt-1">{lead.company}</p>}
          </div>
        ) : (
          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-2xl mx-auto mb-3">📞</div>
            <h2 className="text-xl font-bold text-gray-500">No active call</h2>
            <p className="text-gray-600 text-sm mt-1">Import leads and start the dialer</p>
          </div>
        )}

        {/* Status + Timer */}
        <div className="flex items-center justify-center gap-4 mb-6">
          <span className={`text-sm font-semibold flex items-center gap-2 ${statusColor[callStatus]}`}>
            {callStatus === 'ringing' && <span className="animate-pulse">●</span>}
            {callStatus === 'connected' && <span className="animate-pulse text-green-400">●</span>}
            {statusLabel[callStatus]}
          </span>
          {isConnected && (
            <span className="text-green-400 font-mono text-lg font-bold">
              {formatDuration(callDuration)}
            </span>
          )}
        </div>

        {/* Active call controls */}
        {isActive && (
          <div className="flex items-center justify-center gap-3 mb-6">
            <button
              onClick={onMute}
              className={`w-12 h-12 rounded-full flex items-center justify-center text-xl transition ${
                isMuted ? 'bg-red-500/20 border border-red-500/50 text-red-400' : 'bg-white/10 hover:bg-white/20'
              }`}
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? '🔇' : '🎙️'}
            </button>
            <button
              onClick={onHangup}
              className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center text-2xl transition"
              title="Hangup"
            >
              📵
            </button>
            <button
              onClick={onSkip}
              className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-xl transition"
              title="Skip"
            >
              ⏭️
            </button>
          </div>
        )}

        {/* Outcome buttons - only when connected */}
        {isConnected && (
          <div className="grid grid-cols-3 gap-2 mb-4">
            <OutcomeBtn label="✅ Converted" onClick={() => onOutcome('converted')} color="bg-green-600 hover:bg-green-700" />
            <OutcomeBtn label="📅 Callback" onClick={() => onOutcome('callback')} color="bg-blue-600 hover:bg-blue-700" />
            <OutcomeBtn label="❌ Not Interested" onClick={() => onOutcome('not_interested')} color="bg-gray-600 hover:bg-gray-700" />
          </div>
        )}

        {/* Notes */}
        {isActive && (
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Call notes..."
            className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm text-gray-300 placeholder-gray-600 resize-none h-20 focus:outline-none focus:border-brand/50"
          />
        )}

        {/* Dialer controls */}
        {!isActive && (
          <div className="flex gap-3 justify-center">
            {!isRunning ? (
              <button
                onClick={onStart}
                disabled={queueEmpty}
                className="px-8 py-3 bg-brand hover:bg-brand-dark text-white font-bold rounded-xl transition disabled:opacity-40 disabled:cursor-not-allowed text-sm"
              >
                ▶ Start Dialing
              </button>
            ) : (
              <button
                onClick={onPause}
                className="px-8 py-3 bg-yellow-600 hover:bg-yellow-700 text-white font-bold rounded-xl transition text-sm"
              >
                ⏸ Pause
              </button>
            )}
            {isPaused && (
              <button
                onClick={onResume}
                className="px-8 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl transition text-sm"
              >
                ▶ Resume
              </button>
            )}
          </div>
        )}
      </div>

      {/* Lead attempts */}
      {lead && lead.attempts > 0 && (
        <p className="text-center text-xs text-gray-600">
          Attempt #{lead.attempts + 1} • Last called {lead.last_called || 'never'}
        </p>
      )}
    </div>
  )
}

function OutcomeBtn({ label, onClick, color }: { label: string; onClick: () => void; color: string }) {
  return (
    <button
      onClick={onClick}
      className={`${color} text-white text-xs font-semibold py-2 px-3 rounded-lg transition`}
    >
      {label}
    </button>
  )
}
