'use client'
import { useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { normalizePhone } from '@/lib/telnyx'
import type { Lead } from '@/types'

interface Props {
  onImport: (leads: Lead[]) => void
  onClose: () => void
}

const SAMPLE_CSV = `Name,Phone,Email,Company
John Smith,5551234567,john@example.com,ABC Corp
Sarah Johnson,5559876543,sarah@example.com,XYZ Inc
Mike Davis,5555555555,,
Lisa Wilson,5552223333,lisa@example.com,Tech Co`

type Tab = 'sheets' | 'paste' | 'manual'

export default function LeadImporter({ onImport, onClose }: Props) {
  const [tab, setTab] = useState<Tab>('sheets')
  const [csvText, setCsvText] = useState('')
  const [sheetUrl, setSheetUrl] = useState('')
  const [manualLeads, setManualLeads] = useState([{ name: '', phone: '', email: '', company: '' }])
  const [preview, setPreview] = useState<Lead[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const toLeads = (raw: any[]): Lead[] =>
    raw.map(l => ({
      id: uuidv4(),
      name: l.name,
      phone: normalizePhone(l.phone),
      email: l.email || '',
      company: l.company || '',
      status: 'pending' as const,
      attempts: 0,
      sheet_id: l._sheetId,
      sheet_gid: l._sheetGid,
      sheet_row: l._sheetRow,
    }))

  const parseCsv = (text: string) => {
    const lines = text.trim().split('\n').filter(l => l.trim())
    if (lines.length < 2) return []
    const headers = lines[0].toLowerCase().split(',').map(h => h.trim().replace(/^"|"$/g, ''))
    return lines.slice(1).map(line => {
      const vals = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''))
      const obj: any = {}
      headers.forEach((h, i) => obj[h] = vals[i] || '')
      const phone = obj.phone || obj['phone number'] || obj.mobile || obj.cell || ''
      const name = obj.name || obj['full name'] || obj['first name'] + ' ' + obj['last name'] || 'Unknown'
      return { name: name.trim(), phone, email: obj.email || '', company: obj.company || '' }
    }).filter(l => l.phone && l.phone.replace(/\D/g, '').length >= 10)
  }

  const handleSheets = async () => {
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: sheetUrl.trim() })
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Failed to fetch sheet'); return }
      setPreview(toLeads(data.leads))
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handlePaste = () => {
    setError('')
    const raw = parseCsv(csvText)
    if (raw.length === 0) { setError('No valid leads found. Make sure to include Name and Phone columns.'); return }
    setPreview(toLeads(raw))
  }

  const handleManual = () => {
    setError('')
    const raw = manualLeads.filter(l => l.name && l.phone)
    if (raw.length === 0) { setError('Add at least one lead with name and phone.'); return }
    setPreview(toLeads(raw))
  }

  const handlePreview = () => {
    if (tab === 'sheets') handleSheets()
    else if (tab === 'paste') handlePaste()
    else handleManual()
  }

  const addManualRow = () => setManualLeads(l => [...l, { name: '', phone: '', email: '', company: '' }])
  const updateManualRow = (i: number, field: string, val: string) =>
    setManualLeads(l => l.map((r, idx) => idx === i ? { ...r, [field]: val } : r))

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-[#111] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-lg font-bold">Import Leads</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-xl">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {preview.length === 0 && (
            <>
              {/* Tabs */}
              <div className="flex gap-1 mb-5 bg-white/5 p-1 rounded-xl w-fit">
                <TabBtn active={tab === 'sheets'} onClick={() => setTab('sheets')}>📊 Google Sheets</TabBtn>
                <TabBtn active={tab === 'paste'} onClick={() => setTab('paste')}>📋 CSV Paste</TabBtn>
                <TabBtn active={tab === 'manual'} onClick={() => setTab('manual')}>✏️ Manual</TabBtn>
              </div>

              {/* Google Sheets Tab */}
              {tab === 'sheets' && (
                <div>
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 mb-4">
                    <p className="text-sm font-semibold text-blue-300 mb-1">📊 Import from Google Sheets</p>
                    <p className="text-xs text-gray-400">
                      Paste your Google Sheet URL below. Your sheet must be shared as
                      <span className="text-white font-medium"> "Anyone with the link can view"</span>.
                    </p>
                  </div>

                  <label className="text-xs text-gray-400 mb-1 block">Google Sheet URL</label>
                  <input
                    type="text"
                    value={sheetUrl}
                    onChange={e => setSheetUrl(e.target.value)}
                    placeholder="https://docs.google.com/spreadsheets/d/..."
                    className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-brand/50 mb-4"
                  />

                  <div className="bg-white/5 rounded-xl p-4 text-xs text-gray-400 space-y-1">
                    <p className="font-semibold text-gray-300 mb-2">📋 Required column headers (any order):</p>
                    <div className="grid grid-cols-2 gap-1">
                      <span>• <code className="text-brand">Name</code> or <code className="text-brand">Full Name</code></span>
                      <span>• <code className="text-brand">Phone</code> or <code className="text-brand">Mobile</code></span>
                      <span>• <code className="text-brand">Email</code> (optional)</span>
                      <span>• <code className="text-brand">Company</code> (optional)</span>
                    </div>
                    <p className="mt-2 text-gray-500">Row 1 must be headers. All other rows are leads.</p>
                  </div>

                  <div className="mt-4 bg-white/5 rounded-xl p-4 text-xs text-gray-500">
                    <p className="font-semibold text-gray-400 mb-2">How to share your sheet:</p>
                    <ol className="list-decimal list-inside space-y-1">
                      <li>Open your Google Sheet</li>
                      <li>Click <strong className="text-gray-300">Share</strong> (top right)</li>
                      <li>Under "General access", select <strong className="text-gray-300">Anyone with the link</strong></li>
                      <li>Set to <strong className="text-gray-300">Viewer</strong></li>
                      <li>Copy the link and paste above</li>
                    </ol>
                  </div>
                </div>
              )}

              {/* CSV Paste Tab */}
              {tab === 'paste' && (
                <div>
                  <p className="text-sm text-gray-400 mb-2">
                    Paste CSV with columns: <code className="text-brand">Name, Phone, Email, Company</code>
                  </p>
                  <button onClick={() => setCsvText(SAMPLE_CSV)} className="text-xs text-brand hover:underline mb-2">
                    Load sample data
                  </button>
                  <textarea
                    value={csvText}
                    onChange={e => setCsvText(e.target.value)}
                    placeholder={SAMPLE_CSV}
                    className="w-full h-48 bg-white/5 border border-white/10 rounded-lg p-3 text-sm font-mono text-gray-300 resize-none focus:outline-none focus:border-brand/50"
                  />
                </div>
              )}

              {/* Manual Tab */}
              {tab === 'manual' && (
                <div className="space-y-2">
                  <div className="grid grid-cols-4 gap-2 text-xs text-gray-500 px-1 mb-1">
                    <span>Name *</span><span>Phone *</span><span>Email</span><span>Company</span>
                  </div>
                  {manualLeads.map((lead, i) => (
                    <div key={i} className="grid grid-cols-4 gap-2">
                      <input placeholder="John Smith" value={lead.name} onChange={e => updateManualRow(i, 'name', e.target.value)} className="input-field" />
                      <input placeholder="5551234567" value={lead.phone} onChange={e => updateManualRow(i, 'phone', e.target.value)} className="input-field" />
                      <input placeholder="email@..." value={lead.email} onChange={e => updateManualRow(i, 'email', e.target.value)} className="input-field" />
                      <input placeholder="Company" value={lead.company} onChange={e => updateManualRow(i, 'company', e.target.value)} className="input-field" />
                    </div>
                  ))}
                  <button onClick={addManualRow} className="text-sm text-brand hover:underline">+ Add row</button>
                </div>
              )}

              {error && (
                <div className="mt-3 bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-sm text-red-400">
                  {error}
                </div>
              )}
            </>
          )}

          {/* Preview */}
          {preview.length > 0 && (
            <div>
              <p className="text-sm text-green-400 mb-3 flex items-center gap-2">
                ✅ <span><strong>{preview.length} leads</strong> ready to add to queue</span>
              </p>
              <div className="bg-white/5 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left p-2 text-gray-400 font-medium">Name</th>
                      <th className="text-left p-2 text-gray-400 font-medium">Phone</th>
                      <th className="text-left p-2 text-gray-400 font-medium">Email</th>
                      <th className="text-left p-2 text-gray-400 font-medium">Company</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.slice(0, 15).map(l => (
                      <tr key={l.id} className="border-b border-white/5">
                        <td className="p-2">{l.name}</td>
                        <td className="p-2 font-mono text-xs text-gray-300">{l.phone}</td>
                        <td className="p-2 text-gray-400 text-xs truncate max-w-[100px]">{l.email}</td>
                        <td className="p-2 text-gray-400 text-xs truncate">{l.company}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {preview.length > 15 && (
                  <p className="text-center text-xs text-gray-500 p-2">...and {preview.length - 15} more</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/10 flex gap-3 justify-end">
          {preview.length > 0 ? (
            <>
              <button onClick={() => setPreview([])} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition">← Back</button>
              <button
                onClick={() => onImport(preview)}
                className="px-6 py-2 bg-brand hover:bg-brand-dark text-white font-bold rounded-lg text-sm transition"
              >
                Add {preview.length} Leads to Queue →
              </button>
            </>
          ) : (
            <>
              <button onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition">Cancel</button>
              <button
                onClick={handlePreview}
                disabled={loading || (tab === 'sheets' && !sheetUrl.trim())}
                className="px-6 py-2 bg-brand hover:bg-brand-dark text-white font-bold rounded-lg text-sm transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? <><span className="animate-spin">⟳</span> Fetching...</> : 'Preview →'}
              </button>
            </>
          )}
        </div>
      </div>

      <style jsx>{`
        .input-field {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 8px;
          padding: 8px 10px;
          color: white;
          font-size: 13px;
          width: 100%;
          outline: none;
        }
        .input-field:focus { border-color: rgba(230,57,70,0.5); }
        .input-field::placeholder { color: #555; }
      `}</style>
    </div>
  )
}

function TabBtn({ active, onClick, children }: any) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${
        active ? 'bg-brand text-white' : 'text-gray-400 hover:text-white'
      }`}
    >
      {children}
    </button>
  )
}
