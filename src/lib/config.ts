// Runtime config — reads from Supabase app_config table
// Never stored in code or git

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://supabasekong-e71vkgw01x9z9ba5oyg49mr1.5.78.228.49.sslip.io'
const SERVICE_KEY = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc4MDI2NDkyMCwiZXhwIjo0OTM1OTM4NTIwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.epK5onbWtNTzWt1etvXtD-a7hOHGECRBLvars7XJDmA'

let configCache: Record<string, string> | null = null
let cacheTime = 0
const CACHE_TTL = 60 * 1000 // 1 minute

export async function getConfig(): Promise<Record<string, string>> {
  if (configCache && Date.now() - cacheTime < CACHE_TTL) return configCache

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/app_config?select=key,value`, {
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
      },
      cache: 'no-store'
    })
    if (!res.ok) throw new Error(`Config fetch failed: ${res.status}`)
    const rows: { key: string; value: string }[] = await res.json()
    configCache = Object.fromEntries(rows.map(r => [r.key, r.value]))
    cacheTime = Date.now()
    return configCache
  } catch (err) {
    console.error('[CONFIG] Failed to load from Supabase:', err)
    return {}
  }
}

export async function getTelnyxConfig() {
  const cfg = await getConfig()
  return {
    apiKey: cfg['TELNYX_API_KEY'] || process.env.TELNYX_API_KEY || '',
    connectionId: cfg['TELNYX_CONNECTION_ID'] || process.env.TELNYX_CONNECTION_ID || '',
    fromNumber: cfg['TELNYX_FROM_NUMBER'] || process.env.TELNYX_FROM_NUMBER || '+19282910777',
  }
}
