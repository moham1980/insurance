import { useEffect, useCallback, useState } from 'react';

export interface WebOTPConfig {
  transport?: ('sms' | 'email')[];
  timeout?: number;
}

export interface WebOTPResult {
  code: string | null;
  error: Error | null;
  isPending: boolean;
}

/**
 * React hook for Web OTP API (Credential Management API - OTPCredential).
 * Automatically receives OTP from SMS on supported browsers (Chrome 93+ Android).
 * Falls back gracefully on unsupported browsers.
 *
 * @example
 * const { code, error, isPending } = useWebOTP({ transport: ['sms'], timeout: 60000 });
 * useEffect(() => {
 *   if (code) console.log('Received OTP:', code);
 * }, [code]);
 */
export function useWebOTP(config?: WebOTPConfig): WebOTPResult {
  const [code, setCode] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isPending, setIsPending] = useState(false);

  const abort = useCallback(() => {
    // cleanup handled in useEffect
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const nav = navigator as any;
    if (!nav.credentials?.get) return;

    const abortCtrl = new AbortController();
    setIsPending(true);

    nav.credentials
      .get({
        otp: { transport: config?.transport ?? ['sms'] },
        signal: abortCtrl.signal,
      })
      .then((otp: any) => {
        if (otp?.code) setCode(otp.code);
      })
      .catch((err: any) => {
        if (err.name !== 'AbortError') setError(err);
      })
      .finally(() => setIsPending(false));

    const timer = config?.timeout
      ? setTimeout(() => abortCtrl.abort(), config.timeout)
      : undefined;

    return () => {
      abortCtrl.abort();
      if (timer) clearTimeout(timer);
    };
  }, [config?.transport?.join(','), config?.timeout]);

  return { code, error, isPending };
}
