import { useCallback, useState } from 'react';

export interface PasskeyState {
  isSupported: boolean;
  isRegistering: boolean;
  isAuthenticating: boolean;
  error: string | null;
}

/**
 * React hook for WebAuthn / Passkey foundation.
 * Provides registration and authentication helpers.
 * TODO: Wire to backend attestation/verification endpoints in Phase 3.
 *
 * @example
 * const { state, register, authenticate } = usePasskey();
 */
export function usePasskey(): {
  state: PasskeyState;
  register: (userName: string, displayName: string) => Promise<void>;
  authenticate: () => Promise<void>;
} {
  const [state, setState] = useState<PasskeyState>({
    isSupported: typeof window !== 'undefined' && !!window.PublicKeyCredential,
    isRegistering: false,
    isAuthenticating: false,
    error: null,
  });

  const register = useCallback(async (userName: string, displayName: string) => {
    if (!state.isSupported) {
      setState((s) => ({ ...s, error: 'WebAuthn is not supported in this browser.' }));
      return;
    }
    setState((s) => ({ ...s, isRegistering: true, error: null }));
    try {
      const challenge = crypto.getRandomValues(new Uint8Array(32));
      const userId = crypto.getRandomValues(new Uint8Array(16));

      const publicKey: PublicKeyCredentialCreationOptions = {
        challenge,
        rp: { name: 'Insurance Enterprise Console', id: typeof window !== 'undefined' ? window.location.hostname : undefined },
        user: { id: userId, name: userName, displayName },
        pubKeyCredParams: [{ alg: -7, type: 'public-key' }, { alg: -257, type: 'public-key' }],
        authenticatorSelection: { userVerification: 'preferred', residentKey: 'preferred' },
        attestation: 'none',
      };

      await navigator.credentials.create({ publicKey });
      setState((s) => ({ ...s, isRegistering: false }));
    } catch (err: any) {
      setState((s) => ({ ...s, isRegistering: false, error: err?.message || 'Registration failed' }));
    }
  }, [state.isSupported]);

  const authenticate = useCallback(async () => {
    if (!state.isSupported) {
      setState((s) => ({ ...s, error: 'WebAuthn is not supported in this browser.' }));
      return;
    }
    setState((s) => ({ ...s, isAuthenticating: true, error: null }));
    try {
      const challenge = crypto.getRandomValues(new Uint8Array(32));
      const publicKey: PublicKeyCredentialRequestOptions = {
        challenge,
        allowCredentials: [],
        userVerification: 'preferred',
      };

      await navigator.credentials.get({ publicKey });
      setState((s) => ({ ...s, isAuthenticating: false }));
    } catch (err: any) {
      setState((s) => ({ ...s, isAuthenticating: false, error: err?.message || 'Authentication failed' }));
    }
  }, [state.isSupported]);

  return { state, register, authenticate };
}
