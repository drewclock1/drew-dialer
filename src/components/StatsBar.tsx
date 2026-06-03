'use client'

interface Props {
  stats: {
    total: number
    pending: number
    answered: number
    noAnswer: number
    voicemail: number
    converted: number
  }
}

export default function StatsBar({ stats }: Props) {
  const contacted = stats.answered + stats.noAnswer + stats.voicemail
  const rate = contacted > 0 ? Math.round((stats.answered / contacted) * 100) : 0

  return (
    <div className="border-b border-white/10 px-6 py-2 flex items-center gap-6 bg-white/[0.02]">
      <Stat label="Total Leads" value={stats.total} color="text-white" />
      <Stat label="Pending" value={stats.pending} color="text-blue-400" />
      <Stat label="Answered" value={stats.answered} color="text-green-400" />
      <Stat label="No Answer" value={stats.noAnswer} color="text-gray-400" />
      <Stat label="Voicemail" value={stats.voicemail} color="text-yellow-400" />
      <Stat label="Converted" value={stats.converted} color="text-brand" />
      <div className="ml-auto text-xs text-gray-500">
        Answer Rate: <span className="text-white font-semibold">{rate}%</span>
      </div>
    </div>
  )
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`text-lg font-bold ${color}`}>{value}</span>
      <span className="text-xs text-gray-500">{label}</span>
    </div>
  )
}
