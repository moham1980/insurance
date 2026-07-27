import { useCallback, useRef, useState } from 'react';

export interface VoiceState {
  isSupported: boolean;
  isListening: boolean;
  transcript: string;
  interimTranscript: string;
  error: string | null;
}

/**
 * React hook for Web Speech API (SpeechRecognition).
 * Enables voice input in supported browsers (Chrome, Edge, Safari).
 * Falls back gracefully on unsupported browsers.
 *
 * @example
 * const { state, start, stop } = useVoice();
 * useEffect(() => { if (state.transcript) handleQuery(state.transcript); }, [state.transcript]);
 */
export function useVoice(lang = 'fa-IR'): VoiceState & { start: () => void; stop: () => void } {
  const [state, setState] = useState<VoiceState>({
    isSupported: typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window),
    isListening: false,
    transcript: '',
    interimTranscript: '',
    error: null,
  });

  const recognitionRef = useRef<any>(null);

  const start = useCallback(() => {
    if (!state.isSupported || typeof window === 'undefined') return;

    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;

    const rec = new SR();
    recognitionRef.current = rec;
    rec.lang = lang;
    rec.continuous = false;
    rec.interimResults = true;

    rec.onstart = () => {
      setState((s) => ({ ...s, isListening: true, error: null, transcript: '', interimTranscript: '' }));
    };

    rec.onresult = (event: any) => {
      let final = '';
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) final += event.results[i][0].transcript;
        else interim += event.results[i][0].transcript;
      }
      setState((s) => ({ ...s, transcript: final, interimTranscript: interim }));
    };

    rec.onerror = (event: any) => {
      if (event.error !== 'aborted') {
        setState((s) => ({ ...s, error: event.error, isListening: false }));
      }
    };

    rec.onend = () => {
      setState((s) => ({ ...s, isListening: false, interimTranscript: '' }));
    };

    rec.start();
  }, [state.isSupported, lang]);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    setState((s) => ({ ...s, isListening: false, interimTranscript: '' }));
  }, []);

  return { ...state, start, stop };
}
