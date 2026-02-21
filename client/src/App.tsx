import { useState, useEffect } from 'react'
import Auth from './components/Auth'
import Dashboard from './components/Dashboard'
import { loadAuth, clearAuth } from './api'
import type { AuthResponse } from './api'
import { AnimatePresence } from 'framer-motion'
import PlacementBot from './components/PlacementBot'

function App() {
    const [auth, setAuth] = useState<AuthResponse | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const storedAuth = loadAuth()
        if (storedAuth) {
            setAuth(storedAuth)
        }
        setLoading(false)
    }, [])

    if (loading) return null

    return (
        <div className="app-container">
            <AnimatePresence mode="wait">
                {!auth ? (
                    <Auth key="auth" onAuth={setAuth} />
                ) : (
                    <Dashboard key="dashboard" auth={auth} onLogout={() => {
                        setAuth(null)
                        clearAuth()
                    }} />
                )}
            </AnimatePresence>
            {auth?.user?.role === 'STUDENT' && <PlacementBot />}
        </div>
    )
}

export default App
