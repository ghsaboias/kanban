import { useAuth } from '@clerk/clerk-react'
import { API_URL } from './api'

export function useApi() {
  const { getToken } = useAuth()

  return async function apiFetch(path: string, init?: RequestInit) {
    const token = await getToken()
    const headers = new Headers(init?.headers || {})
    if (token) headers.set('Authorization', `Bearer ${token}`)
    const base = API_URL.replace(/\/$/, '')
    const p = path.startsWith('/') ? path : `/${path}`
    return fetch(`${base}${p}`, { ...init, headers })
  }
}

