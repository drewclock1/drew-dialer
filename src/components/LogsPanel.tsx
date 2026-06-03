'use client'
import { formatPhone, formatDuration } from '@/lib/telnyx'
import type { CallLog } from '@/types'

const outcomeIcon: Record<string, string> = {
  answered: '📞',
  no_answer: '📵',
  voicemail: '📬',
  callback: '📅',
  not_interested: '❌',
  converted: '✅',
  busy: '🔴',
}

const outcomeColor: Record<string, string> = {
  answered: 'text-green-400',
  no_answer: 'text-gray-500',
  voicemail: 'text-yellow-400',
  callback: 'text-blue-400',
  not_interested: 'text-red-400',
  converted: 'text-green-300',
  busy: 'text-orange-400',
}

interface Props {
  logs: CallLog[]
}

export default function LogsPanel({ logs }: Props) {
  if (logs.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-600 text-sm p-8 text-center">
        No calls logged yet.
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {logs.map(log => (
        <div key={log.id} className="px-4 py-3 border-b border-white/5 hover:bg-white/5">
          <div className="flex items-center justify-between">
            <span className="font-medium text-sm truncate">{log.lead_name}</span>
            <span className={`text-xs ${outcomeColor[log.outcome] || 'text-gray-400'}`}>
              {outcomeIcon[log.outcome]} {log.outcome.replace('_', ' ')}
            </span>
          </div>
          <div className="flex items-center justify-between mt-0.5">
            <span className="text-xs text-gray-500 font-mono">{formatPhone(log.phone)}</span>
            <span className="text-xs text-gray-600">
              {log.duration ? formatDuration(log.duration) : '--'}
            </span>
          </div>
          {log.notes && (
            <p className="text-xs text-gray-600 mt-1 italic truncate">"{log.notes}"</p>
          )}
          <p className="text-xs text-gray-700 mt-0.5">
            {new Date(log.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      ))}
    </div>
  )
}
