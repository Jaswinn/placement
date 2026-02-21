export type Role = 'TPO' | 'STUDENT' | 'ALUMNI'

export type User = {
    id: number
    name: string
    email: string
    phone: string
    role: Role
}

export type AuthResponse = {
    token: string
    user: User
}

const API_BASE = 'http://localhost:4000'

export function saveAuth(auth: AuthResponse) {
    localStorage.setItem('placement_auth', JSON.stringify(auth))
}

export function loadAuth(): AuthResponse | null {
    const raw = localStorage.getItem('placement_auth')
    if (!raw) return null
    try {
        return JSON.parse(raw) as AuthResponse
    } catch {
        return null
    }
}

export function clearAuth() {
    localStorage.removeItem('placement_auth')
}

export async function apiRequest<T>(
    path: string,
    options: RequestInit = {}
): Promise<T> {
    const auth = loadAuth()
    const headers = new Headers(options.headers || {})
    headers.set('Content-Type', 'application/json')

    if (auth && auth.token) {
        headers.set('Authorization', `Bearer ${auth.token}`)
    }

    try {
        const url = `${API_BASE}${path}`
        const res = await fetch(url, {
            ...options,
            headers,
        })

        if (!res.ok) {
            if (res.status === 404) {
                try {
                    const healthRes = await fetch(`${API_BASE}/api/health`)
                    if (!healthRes.ok) {
                        throw new Error('Server is not responding correctly. Please restart the backend server.')
                    }
                } catch {
                    throw new Error('Cannot connect to server. Make sure the backend is running on http://localhost:4000')
                }
                const errorBody = await res.json().catch(() => ({}))
                throw new Error(errorBody.message || `Endpoint not found: ${path}`)
            }

            if (res.status === 401 || res.status === 403) {
                clearAuth()
                window.location.reload()
                throw new Error('Session expired or invalid. Please log in again.')
            }

            const errorBody = await res.json().catch(() => ({}))
            const message =
                (errorBody && (errorBody.message as string)) ||
                `Request failed with status ${res.status}`
            throw new Error(message)
        }
        return (await res.json()) as T
    } catch (err) {
        if (err instanceof TypeError) {
            if (err.message.includes('fetch') || err.message.includes('Failed to fetch')) {
                throw new Error('Cannot connect to server. Please make sure:\n1. Backend server is running (npm run dev in server folder)\n2. Server is on http://localhost:4000\n3. No firewall is blocking the connection')
            }
        }
        throw err
    }
}
