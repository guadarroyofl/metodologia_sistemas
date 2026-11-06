import type { ApiErrorBody } from '../types'

const API_BASE = import.meta.env.VITE_API_URL || '/api'
export const TOKEN_KEY = 'caos_token'

export class ApiError extends Error {
  status: number
  details: unknown

  constructor(message: string, status: number, details: unknown = null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.details = details
  }
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string | null): void {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

interface RequestOptions {
  method?: string
  body?: unknown
  auth?: boolean
  signal?: AbortSignal
}

async function parseError(response: Response): Promise<ApiError> {
  let message = `Error ${response.status}`
  let details: unknown = null
  try {
    const payload = (await response.json()) as ApiErrorBody
    if (payload?.error?.message) message = payload.error.message
    details = payload?.error?.details ?? null
    if (Array.isArray(details) && details.length > 0) {
      const first = details[0] as { field?: string; message?: string }
      if (first?.message) {
        message = first.field ? `${message} (${first.field}: ${first.message})` : `${message} ${first.message}`
      }
    }
  } catch {
    // respuesta sin JSON
  }
  return new ApiError(message, response.status, details)
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = true, signal } = options
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (auth) {
    const token = getToken()
    if (token) headers.Authorization = `Bearer ${token}`
  }

  let response: Response
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
    })
  } catch {
    throw new ApiError('No pudimos conectarnos con el servidor. Revisá tu conexión.', 0)
  }

  if (!response.ok) throw await parseError(response)
  if (response.status === 204) return undefined as T
  const contentType = response.headers.get('content-type') || ''
  if (!contentType.includes('application/json')) return (await response.text()) as T
  return (await response.json()) as T
}

export interface DownloadResult {
  blob: Blob
  filename: string
}

export async function download(path: string): Promise<DownloadResult> {
  const token = getToken()
  const headers: Record<string, string> = {}
  if (token) headers.Authorization = `Bearer ${token}`

  let response: Response
  try {
    response = await fetch(`${API_BASE}${path}`, { headers })
  } catch {
    throw new ApiError('No pudimos descargar el archivo. Revisá tu conexión.', 0)
  }
  if (!response.ok) throw await parseError(response)
  const disposition = response.headers.get('content-disposition') || ''
  const match = /filename="?([^";]+)"?/i.exec(disposition)
  return {
    blob: await response.blob(),
    filename: match?.[1] || 'reporte-caos',
  }
}

export function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PATCH', body }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
}
