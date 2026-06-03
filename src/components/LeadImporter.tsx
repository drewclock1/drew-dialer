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

export default function LeadImporter({ onImport, onClose }: Props) {
  const [tab, setTab] = useState<'paste' | 'manual'>('paste')
  const [csvText, setCsvText] = useState('')
  const [manualLeads, setManualLeads] = useState([{ name: '', phone: '', email: '', company: '' }])
  const [preview, setPreview] = useState<Lead[]>([])
  const [error, setError] = useState('')

  const parseCsv = (text: string): Lead[] => {
    const lines = text.trim().split('\n').filter(l => l.trim())
    if (lines.length < 2) return []
    const headers = lines[0].toLowerCase().split(',').map(h => h.trim())
    return lines.slice(1).map(line => {
      const vals = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''))
      const obj: any = {}
      headers.forEach((h, i) => obj[h] = vals[i] || '')
      const phone = obj.phone || obj['phone number'] || obj.mobile || obj.cell || ''
      const name = obj.name || obj['full name'] || obj['first name'] + ' ' + obj['last name'] || 'Unknown'
      return {
        id: uuidv4(),
        name: name.trim(),
        phone: normalizePhone(phone),
        email: obj.email || '',
        company: obj.company || obj.organization || '',
        status: 'pending' as const,
        attempts: 0
      }
    }).filter(l => l.phone && l.phone.length >= 10)
  }

  const handlePreview = () => {
    setError('')
    if (tab === 'paste') {
      const leads = parseCsv(csvText)
      if (leads.length === 0) {
        setError('No valid leads found. Make sure to include Name and Phone columns.')
        return
      }
      setPreview(leads)
    } else {
      const leads = manualLeads
        .filter(l => l.name && l.phone)
        .map(l => ({
          id: uuidv4(),
          name: l.name,
          phone: normalizePhone(l.phone),
          email: l.email,
          company: l.company,
          status: 'pending' as const,
          attempts: 0
        }))
      if (leads.length === 0) {
        setError('Add at least one lead with name and phone.')
        return
      }
      setPreview(leads)
    }
  }

  const addManualRow = () => {
    setManualLeads(l => [...l, { name: '', phone: '', email: '', company: '' }])
  }

  const updateManualRow = (i: number, field: string, val: string) => {
    setManualLeads(l => l.map((r, idx) => idx === i ? { ...r, [field]: val } : r))
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-[#111] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-lg font-bold">Import Leads</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-xl">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {/* Tabs */}
          {preview.length === 0 && (
            <>
              <div className="flex gap-2 mb-4 bg-white/5 p-1 rounded-lg w-fit">
                <TabBtn active={tab === 'paste'} onClick={() => setTab('paste')}>📋 CSV Paste</TabBtn>
                <TabBtn active={tab === 'manual'} onClick={() => setTab('manual')}>✏️ Manual Entry</TabBtn>
              </div>

              {tab === 'paste' && (
                <div>
                  <p className="text-sm text-gray-400 mb-2">
                    Paste CSV with columns: <code className="text-brand">Name, Phone, Email, Company</code>
                  </p>
                  <button
                    onClick={() => setCsvText(SAMPLE_CSV)}
                    className="text-xs text-brand hover:underline mb-2"
                  >
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

              {tab === 'manual' && (
                <div className="space-y-2">
                  {manualLeads.map((lead, i) => (
                    <div key={i} className="grid grid-cols-4 gap-2">
                      <input placeholder="Name *" value={lead.name} onChange={e => updateManualRow(i, 'name', e.target.value)}
                        className="input-field" />
                      <input placeholder="Phone *" value={lead.phone} onChange={e => updateManualRow(i, 'phone', e.target.value)}
                        className="input-field" />
                      <input placeholder="Email" value={lead.email} onChange={e => updateManualRow(i, 'email', e.target.value)}
                        className="input-field" />
                      <input placeholder="Company" value={lead.company} onChange={e => updateManualRow(i, 'company', e.target.value)}
                        className="input-field" />
                    </div>
                  ))}
                  <button onClick={addManualRow} className="text-sm text-brand hover:underline">+ Add row</button>
                </div>
              )}

              {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
            </>
          )}

          {/* Preview */}
          {preview.length > 0 && (
            <div>
              <p className="text-sm text-green-400 mb-3">✅ {preview.length} leads ready to import</p>
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
                    {preview.slice(0, 10).map(l => (
                      <tr key={l.id} className="border-b border-white/5">
                        <td className="p-2">{l.name}</td>
                        <td className="p-2 font-mono text-xs">{l.phone}</td>
                        <td className="p-2 text-gray-400 text-xs">{l.email}</td>
                        <td className="p-2 text-gray-400 text-xs">{l.company}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {preview.length > 10 && (
                  <p className="text-center text-xs text-gray-500 p-2">
                    ...and {preview.length - 10} more
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/10 flex gap-3 justify-end">
          {preview.length > 0 ? (
            <>
              <button onClick={() => setPreview([])} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition">
                ← Back
              </button>
              <button onClick={() => onImport(preview)} className="px-6 py-2 bg-brand hover:bg-brand-dark text-white font-semibold rounded-lg text-sm transition">
                Import {preview.length} Leads →
              </button>
            </>
          ) : (
            <>
              <button onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition">Cancel</button>
              <button onClick={handlePreview} className="px-6 py-2 bg-brand hover:bg-brand-dark text-white font-semibold rounded-lg text-sm transition">
                Preview →
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
      className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${
        active ? 'bg-brand text-white' : 'text-gray-400 hover:text-white'
      }`}
    >
      {children}
    </button>
  )
}
