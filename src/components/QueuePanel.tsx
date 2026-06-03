'use client'
import { formatPhone } from '@/lib/telnyx'
import type { Lead } from '@/types'

const statusDot: Record<string, string> = {
  pending: 'bg-gray-500',
  dialing: 'bg-yellow-400 animate-pulse',
  answered: 'bg-green-400',
  no_answer: 'bg-gray-600',
  voicemail: 'bg-yellow-600',
  callback: 'bg-blue-400',
  not_interested: 'bg-red-600',
  converted: 'bg-green-600',
  busy: 'bg-orange-500',
}

const statusText: Record<string, string> = {
  pending: 'Pending',
  dialing: 'Dialing...',
  answered: 'Answered',
  no_answer: 'No Answer',
  voicemail: 'Voicemail',
  callback: 'Callback',
  not_interested: 'Not Interested',
  converted: '✅ Converted',
  busy: 'Busy',
}

interface Props {
  queue: Lead[]
  currentLead: Lead | null
  onCallLead: (lead: Lead) => void
  isOnCall: boolean
}

export default function QueuePanel({ queue, currentLead, onCallLead, isOnCall }: Props) {
  if (queue.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-600 text-sm p-8 text-center">
        No leads in queue.<br />Click "+ Import" to add leads.
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {queue.map(lead => {
        const isActive = currentLead?.id === lead.id
        const canCall = !isOnCall || isActive

        return (
          <div
            key={lead.id}
            className={`px-3 py-2.5 border-b border-white/5 group transition ${
              isActive
                ? 'bg-brand/10 border-l-2 border-l-brand'
                : 'hover:bg-white/5'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${statusDot[lead.status] || 'bg-gray-500'}`} />
                <span className="font-medium text-sm truncate">{lead.name}</span>
              </div>

              {/* Call button - shows on hover or if active */}
              {!isActive && (
                <button
                  onClick={() => onCallLead(lead)}
                  disabled={isOnCall}
                  title={isOnCall ? 'Finish current call first' : `Call ${lead.name}`}
                  className={`flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity
                    w-7 h-7 rounded-full flex items-center justify-center text-xs
                    ${isOnCall
                      ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                      : 'bg-green-600 hover:bg-green-500 text-white cursor-pointer'
                    }`}
                >
                  📞
                </button>
              )}

              {isActive && (
                <span className="flex-shrink-0 text-xs text-brand animate-pulse">●</span>
              )}
            </div>

            <div className="flex items-center justify-between mt-0.5 pl-4">
              <span className="text-xs text-gray-500 font-mono">{formatPhone(lead.phone)}</span>
              <span className="text-xs text-gray-600">{statusText[lead.status] || lead.status}</span>
            </div>

            {lead.company && (
              <p className="text-xs text-gray-600 pl-4 truncate">{lead.company}</p>
            )}

            {/* Re-call previously attempted leads */}
            {(lead.status === 'no_answer' || lead.status === 'voicemail' || lead.status === 'callback' || lead.status === 'busy') && !isActive && (
              <div className="pl-4 mt-1">
                <button
                  onClick={() => onCallLead(lead)}
                  disabled={isOnCall}
                  className={`text-xs px-2 py-0.5 rounded transition ${
                    isOnCall
                      ? 'text-gray-600 cursor-not-allowed'
                      : 'text-blue-400 hover:text-blue-300 hover:bg-blue-400/10'
                  }`}
                >
                  ↩ Re-call
                </button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
