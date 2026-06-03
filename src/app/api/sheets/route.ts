import { NextRequest, NextResponse } from 'next/server'

function parseSheetUrl(url: string): { sheetId: string; gid: string } | null {
  try {
    const u = new URL(url)
    // Extract spreadsheet ID
    const match = u.pathname.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/)
    if (!match) return null
    const sheetId = match[1]
    // Extract GID (tab ID) from hash or query
    const gid = u.hash.match(/gid=(\d+)/)?.[1] || u.searchParams.get('gid') || '0'
    return { sheetId, gid }
  } catch {
    return null
  }
}

function parseCsvToLeads(csv: string) {
  const lines = csv.trim().split('\n').filter(l => l.trim())
  if (lines.length < 2) return []

  const headers = lines[0].toLowerCase().split(',').map(h =>
    h.trim().replace(/^"|"$/g, '').toLowerCase()
  )

  return lines.slice(1).map((line, lineIndex) => {
    // Handle quoted fields with commas inside
    const vals: string[] = []
    let current = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') { inQuotes = !inQuotes; continue }
      if (ch === ',' && !inQuotes) { vals.push(current.trim()); current = ''; continue }
      current += ch
    }
    vals.push(current.trim())

    const obj: Record<string, string> = {}
    headers.forEach((h, i) => obj[h] = vals[i] || '')

    const phone = obj['phone'] || obj['phone number'] || obj['mobile'] || obj['cell'] || obj['phone_number'] || ''
    const firstName = obj['first name'] || obj['firstname'] || obj['first_name'] || ''
    const lastName = obj['last name'] || obj['lastname'] || obj['last_name'] || ''
    const name = obj['name'] || obj['full name'] || obj['fullname'] || obj['full_name'] ||
      `${firstName} ${lastName}`.trim() || 'Unknown'

    return {
      name: name.trim(),
      phone: phone.trim(),
      email: obj['email'] || obj['email address'] || obj['email_address'] || '',
      company: obj['company'] || obj['organization'] || obj['business'] || obj['employer'] || '',
      _sheetRow: lineIndex + 2, // row 1 = headers, data starts at row 2
    }
  }).filter(l => l.phone && l.phone.replace(/\D/g, '').length >= 10)
}

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json()
    if (!url) return NextResponse.json({ error: 'URL required' }, { status: 400 })

    const parsed = parseSheetUrl(url)
    if (!parsed) {
      return NextResponse.json({ error: 'Invalid Google Sheets URL. Make sure to copy the full URL from your browser.' }, { status: 400 })
    }

    const csvUrl = `https://docs.google.com/spreadsheets/d/${parsed.sheetId}/export?format=csv&gid=${parsed.gid}`

    const res = await fetch(csvUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      redirect: 'follow'
    })

    if (!res.ok) {
      if (res.status === 403 || res.status === 401) {
        return NextResponse.json({
          error: 'Sheet is not publicly accessible. Go to Share → Anyone with the link → Viewer, then try again.'
        }, { status: 403 })
      }
      return NextResponse.json({ error: `Failed to fetch sheet: ${res.status}` }, { status: 500 })
    }

    const csv = await res.text()
    const leads = parseCsvToLeads(csv)
    // Attach sheet metadata to each lead
    const leadsWithMeta = leads.map(l => ({ ...l, _sheetId: parsed.sheetId, _sheetGid: parsed.gid }))

    if (leadsWithMeta.length === 0) {
      return NextResponse.json({
        error: 'No valid leads found. Make sure your sheet has Phone and Name columns.'
      }, { status: 400 })
    }

    return NextResponse.json({ leads: leadsWithMeta, total: leadsWithMeta.length })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
