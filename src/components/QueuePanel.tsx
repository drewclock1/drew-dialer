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
}

export default function QueuePanel({ queue, currentLead }: Props) {
  if (queue.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-600 text-sm p-8 text-center">
        No leads in queue.<br />Click "+ Import" to add leads.
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {queue.map(lead => (
        <div
          key={lead.id}
          className={`px-4 py-3 border-b border-white/5 ${
            currentLead?.id === lead.id ? 'bg-brand/10 border-l-2 border-l-brand' : 'hover:bg-white/5'
          }`}
        >
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${statusDot[lead.status] || 'bg-gray-500'}`} />
            <span className="font-medium text-sm truncate">{lead.name}</span>
          </div>
          <div className="flex items-center justify-between mt-0.5 pl-4">
            <span className="text-xs text-gray-500 font-mono">{formatPhone(lead.phone)}</span>
            <span className="text-xs text-gray-600">{statusText[lead.status] || lead.status}</span>
          </div>
          {lead.company && (
            <p className="text-xs text-gray-600 pl-4 truncate">{lead.company}</p>
          )}
        </div>
      ))}
    </div>
  )
}
