import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Drew Power Dialer',
  description: 'Auto & Predictive Dialer',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
