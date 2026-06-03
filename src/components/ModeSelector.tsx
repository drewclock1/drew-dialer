'use client'
import type { DialerMode } from '@/types'

interface Props {
  mode: DialerMode
  setMode: (m: DialerMode) => void
  isRunning: boolean
}

export default function ModeSelector({ mode, setMode, isRunning }: Props) {
  return (
    <div className="flex gap-2 mb-8 bg-white/5 p-1 rounded-xl">
      <button
        onClick={() => !isRunning && setMode('auto')}
        className={`px-6 py-2 rounded-lg text-sm font-semibold transition ${
          mode === 'auto'
            ? 'bg-brand text-white'
            : 'text-gray-400 hover:text-white'
        } ${isRunning ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        ⚡ Auto Dialer
      </button>
      <button
        onClick={() => !isRunning && setMode('predictive')}
        className={`px-6 py-2 rounded-lg text-sm font-semibold transition ${
          mode === 'predictive'
            ? 'bg-brand text-white'
            : 'text-gray-400 hover:text-white'
        } ${isRunning ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        🚀 Predictive Dialer
      </button>
    </div>
  )
}
