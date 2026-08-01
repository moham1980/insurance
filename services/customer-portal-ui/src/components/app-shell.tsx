'use client';

import { usePathname } from 'next/navigation';
import { PortalShell } from './portal-shell';

const PUBLIC_PATHS = ['/', '/login', '/forbidden'];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const safePathname = pathname || '/';
  const isPublic = PUBLIC_PATHS.some(
    (p) => safePathname === p || safePathname.startsWith(p + '/')
  );

  if (isPublic) {
    return <>{children}</>;
  }

  return <PortalShell>{children}</PortalShell>;
}
