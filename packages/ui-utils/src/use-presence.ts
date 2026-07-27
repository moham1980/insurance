import { useEffect, useState, useCallback } from 'react';

export interface PresenceUser {
  id: string;
  name: string;
  avatar?: string;
  status: 'online' | 'away' | 'busy';
  lastSeen: number;
}

export interface PresenceState {
  users: PresenceUser[];
  myId: string | null;
  isConnected: boolean;
}

/**
 * Real-time presence hook using WebSocket/ SSE.
 * TODO: Replace mock polling with actual WebSocket connection in Phase 7.
 *
 * @example
 * const { state, setStatus } = usePresence('room-123');
 */
export function usePresence(roomId: string): {
  state: PresenceState;
  setStatus: (status: PresenceUser['status']) => void;
} {
  const [state, setState] = useState<PresenceState>({
    users: [],
    myId: null,
    isConnected: false,
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Mock: simulate presence with localStorage sync
    const myId = `user-${Math.random().toString(36).slice(2, 8)}`;
    setState((s) => ({ ...s, myId, isConnected: true }));

    const broadcast = () => {
      const payload: PresenceUser = {
        id: myId,
        name: 'کاربر فعال',
        status: 'online',
        lastSeen: Date.now(),
      };
      localStorage.setItem(`presence:${roomId}`, JSON.stringify(payload));
    };

    broadcast();
    const interval = setInterval(broadcast, 5000);

    const handleStorage = (e: StorageEvent) => {
      if (e.key?.startsWith(`presence:${roomId}`) && e.newValue) {
        try {
          const user = JSON.parse(e.newValue) as PresenceUser;
          if (user.id !== myId) {
            setState((s) => {
              const filtered = s.users.filter((u) => u.id !== user.id);
              return { ...s, users: [...filtered, user] };
            });
          }
        } catch {
          // ignore
        }
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handleStorage);
    };
  }, [roomId]);

  const setStatus = useCallback(
    (status: PresenceUser['status']) => {
      if (!state.myId) return;
      const payload: PresenceUser = {
        id: state.myId,
        name: 'کاربر فعال',
        status,
        lastSeen: Date.now(),
      };
      localStorage.setItem(`presence:${roomId}`, JSON.stringify(payload));
    },
    [state.myId, roomId]
  );

  return { state, setStatus };
}
