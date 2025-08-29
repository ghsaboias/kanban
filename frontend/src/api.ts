export const API_URL: string = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001'

export function apiFetch(path: string, init?: RequestInit) {
  const base = API_URL.replace(/\/$/, '')
  const p = path.startsWith('/') ? path : `/${path}`
  return fetch(`${base}${p}`, init)
}

