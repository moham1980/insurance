import '@insurance/design-system/themes/light.css';
import '@insurance/design-system/themes/dark.css';
import '@/styles/globals.css';
import type { AppProps } from 'next/app';
import { AgentShell } from '@/components/agent-shell';
import { ThemeProvider } from '@/components/theme-provider';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ThemeProvider>
      <AgentShell>
        <Component {...pageProps} />
      </AgentShell>
    </ThemeProvider>
  );
}
