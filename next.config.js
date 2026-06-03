/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  env: {
    TELNYX_API_KEY: process.env.TELNYX_API_KEY,
    TELNYX_FROM_NUMBER: process.env.TELNYX_FROM_NUMBER,
    TELNYX_CONNECTION_ID: process.env.TELNYX_CONNECTION_ID,
    TELNYX_SIP_USERNAME: process.env.TELNYX_SIP_USERNAME,
    TELNYX_SIP_PASSWORD: process.env.TELNYX_SIP_PASSWORD,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  }
}
nextConfig.output = 'standalone'
module.exports = nextConfig
