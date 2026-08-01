import type { AppProps } from 'next/app';
import '../styles/globals.css';
import { ThemeProvider } from '@insurance/ui-utils';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ThemeProvider defaultTheme="light">
      <Component {...pageProps} />
    </ThemeProvider>
  );
}
