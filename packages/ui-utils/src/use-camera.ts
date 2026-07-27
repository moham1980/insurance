import { useCallback, useRef, useState } from 'react';

export interface CameraState {
  stream: MediaStream | null;
  error: string | null;
  isActive: boolean;
}

/**
 * Camera capture hook for document/photo upload in FNOL.
 * Provides start/stop/snap with fallback to file picker.
 *
 * @example
 * const { state, start, stop, snap } = useCamera();
 */
export function useCamera() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [state, setState] = useState<CameraState>({ stream: null, error: null, isActive: false });

  const start = useCallback(async (constraints?: MediaStreamConstraints) => {
    try {
      if (typeof navigator === 'undefined') return;
      const stream = await navigator.mediaDevices.getUserMedia(
        constraints ?? { video: { facingMode: 'environment' }, audio: false }
      );
      setState({ stream, error: null, isActive: true });
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err: any) {
      setState({ stream: null, error: err?.message || 'Camera access denied', isActive: false });
    }
  }, []);

  const stop = useCallback(() => {
    state.stream?.getTracks().forEach((t) => t.stop());
    setState({ stream: null, error: null, isActive: false });
    if (videoRef.current) videoRef.current.srcObject = null;
  }, [state.stream]);

  const snap = useCallback((): string | null => {
    const video = videoRef.current;
    if (!video || video.readyState !== 4) return null;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0);
    return canvas.toDataURL('image/jpeg', 0.85);
  }, []);

  return { state, start, stop, snap, videoRef };
}
