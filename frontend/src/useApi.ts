import { useAuth } from '@clerk/clerk-react';
import { useCallback } from 'react';
import { API_URL } from './api';
import { useSocketContext } from './contexts/SocketContext';

export function useApi() {
  const { getToken } = useAuth();
  const { socketId } = useSocketContext();

  const apiFetch = useCallback(async (path: string, init?: RequestInit) => {
    const token = await getToken();
    const headers = new Headers(init?.headers || {});
    if (token) headers.set('Authorization', `Bearer ${token}`);
    if (socketId) headers.set('X-Socket-Id', socketId);
    const base = API_URL.replace(/\/$/, '');
    const p = path.startsWith('/') ? path : `/${path}`;
    return fetch(`${base}${p}`, { ...init, headers });
  }, [getToken, socketId]);

  return { apiFetch };
}
