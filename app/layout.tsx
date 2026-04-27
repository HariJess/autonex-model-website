import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: 'MyTravelAgency - Find Your Perfect Car',
  description: 'Explore, compare and buy cars that match your lifestyle. Find your perfect car and drive your adventure.',
  keywords: 'car rental, car buying, car sales, vehicle',
  authors: [{ name: 'MyTravelAgency' }],
  generator: 'v0.app',
  openGraph: {
    title: 'MyTravelAgency',
    description: 'Find your perfect car, drive your adventure',
    type: 'website',
  },
  icons: {
    icon: [
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#17a697',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="bg-white">
      <body className="font-sans antialiased bg-white text-slate-900">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
