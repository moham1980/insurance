import '@insurance/design-system/themes/light.css';
import '@insurance/design-system/themes/dark.css';
import './globals.css';
import type { Metadata, Viewport } from 'next';
import { AppShell } from '@/components/app-shell';
import { ThemeProvider } from '@/components/theme-provider';
import { ToastProvider, ToastViewport } from '@/components/toast-provider';

export const metadata: Metadata = {
  title: 'Insurance Enterprise Console',
  description: 'Enterprise operations console',
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  themeColor: '#1a365d',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Note: Auth validation is handled by middleware.ts which checks auth-token cookie
  // and redirects to /login if missing. This layout renders all authenticated pages.
  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <ToastProvider>
            <AppShell>{children}</AppShell>
            <ToastViewport />
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
