import type { Metadata, Viewport } from 'next'
import '@insurance/design-system/themes/light.css';
import '@insurance/design-system/themes/dark.css';
import './globals.css'
import { ThemeProvider } from '@/components/theme-provider'
import { ToastProvider, ToastViewport } from '@/components/toast-provider'
import { PortalShell } from '@/components/portal-shell'
import { BrandProvider } from '@/config/brand-provider'

export const metadata: Metadata = {
  title: 'پرتال مشتری بیمه',
  description: 'پرتال مشتری بیمه - مدیریت بیمه‌نامه‌ها، خسارات و پرداخت‌ها',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'بیمه پلاس',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: '/icons/icon-192x192.png',
    apple: '/icons/icon-152x152.png',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#0066CC',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/icons/icon-192x192.png" />
        <link rel="apple-touch-icon" href="/icons/icon-152x152.png" />
      </head>
      <body>
        <ThemeProvider>
          <BrandProvider>
            <ToastProvider>
              <PortalShell>{children}</PortalShell>
              <ToastViewport />
            </ToastProvider>
          </BrandProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
