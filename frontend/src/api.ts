export const API_URL: string = (import.meta as { env?: { VITE_API_URL?: string } }).env?.VITE_API_URL || ''

export function apiFetch(path: string, init?: RequestInit) {
  const base = API_URL.replace(/\/$/, '')
  const p = path.startsWith('/') ? path : `/${path}`
  return fetch(`${base}${p}`, init)
}

type RequestOptions = {
  method?: string
  headers?: Record<string, string>
  body?: unknown
}

async function request(path: string, options: RequestOptions = {}) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  }

  const init: RequestInit = {
    method: options.method || 'GET',
    headers,
  }

  if (options.body !== undefined) {
    init.body = typeof options.body === 'string' ? options.body : JSON.stringify(options.body)
  }

  const res = await apiFetch(path, init)
  if (res.status === 204) return null

  try {
    const data = await res.json()
    if (!res.ok) {
      const msg = (data && (data.error || data.message)) || 'Request failed'
      throw new Error(msg)
    }
    return data
  } catch (err: unknown) {
    // If parsing failed and response wasn't 2xx, surface the parsing error
    if (res.ok) {
      throw err
    }
    throw err
  }
}

function authHeaders(token?: string, socketId?: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  if (socketId) headers['X-Socket-Id'] = socketId
  return headers
}

export const api = {
  request,
  get: (path: string, token?: string, socketId?: string) =>
    request(path, { method: 'GET', headers: authHeaders(token, socketId) }),
  post: (path: string, body: unknown, token?: string, socketId?: string) =>
    request(path, { method: 'POST', headers: authHeaders(token, socketId), body }),
  put: (path: string, body: unknown, token?: string, socketId?: string) =>
    request(path, { method: 'PUT', headers: authHeaders(token, socketId), body }),
  delete: (path: string, token?: string, socketId?: string) =>
    request(path, { method: 'DELETE', headers: authHeaders(token, socketId) }),
}

export type ApiClient = typeof api
