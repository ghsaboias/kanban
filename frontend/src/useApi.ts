import { useAuth } from '@clerk/clerk-react';
import { useCallback, useEffect, useRef } from 'react';
import { API_URL } from './api';
import { useSocketContext } from './hooks/useSocketContext';

export function useApi() {
  const { getToken } = useAuth();
  const { socketId } = useSocketContext();
  const socketIdRef = useRef<string | null>(null);

  // Keep socketId in a ref so apiFetch stays stable and
  // doesn't trigger effects on reconnects.
  useEffect(() => {
    socketIdRef.current = socketId ?? null;
  }, [socketId]);

  const apiFetch = useCallback(async (path: string, init?: RequestInit) => {
    const token = await getToken();
    const headers = new Headers(init?.headers || {});
    if (token) headers.set('Authorization', `Bearer ${token}`);
    const sid = socketIdRef.current;
    if (sid) headers.set('X-Socket-Id', sid);
    const base = API_URL.replace(/\/$/, '');
    const p = path.startsWith('/') ? path : `/${path}`;
    return fetch(`${base}${p}`, { ...init, headers });
  }, [getToken]);

  return { apiFetch };
}
