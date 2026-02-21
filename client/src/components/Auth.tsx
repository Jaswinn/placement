import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { LogIn, UserPlus } from 'lucide-react'
import { apiRequest, saveAuth } from '../api'
import type { AuthResponse, Role } from '../api'

interface AuthProps {
  onAuth: (auth: AuthResponse) => void
}

export default function Auth({ onAuth }: AuthProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: 'STUDENT' as Role
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)

    try {
      if (mode === 'register') {
        const payload = {
          name: formData.name.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim(),
          password: formData.password,
          role: formData.role,
        }
        const auth = await apiRequest<AuthResponse>('/api/auth/register', {
          method: 'POST',
          body: JSON.stringify(payload),
        })
        saveAuth(auth)
        onAuth(auth)
      } else {
        const payload = {
          email: formData.email.trim(),
          password: formData.password,
          role: formData.role,
        }
        const auth = await apiRequest<AuthResponse>('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify(payload),
        })
        saveAuth(auth)
        onAuth(auth)
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const handleForgotPassword = async () => {
    setError('')
    setMessage('')
    const email = formData.email.trim()
    if (!email) {
      setError('Enter your email first to request a reset link.')
      return
    }
    try {
      setLoading(true)
      await apiRequest<{ message: string }>('/api/auth/request-password-reset', {
        method: 'POST',
        body: JSON.stringify({ email }),
      })
      setMessage('If an account exists for that email, a reset link will be sent.')
    } catch (err: any) {
      setError(err.message || 'Could not request reset.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="shell"
    >
      <motion.div
        className="auth-card"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1, type: "spring", stiffness: 300, damping: 24 }}
      >
        <h1 className="app-title">Placement Portal</h1>
        <p className="app-subtitle">Login or sign up to continue</p>

        <div className="tab-row">
          <button
            type="button"
            className={`tab-button ${mode === 'login' ? 'tab-button--active' : ''}`}
            onClick={() => setMode('login')}
          >
            <LogIn size={16} /> Login
          </button>
          <button
            type="button"
            className={`tab-button ${mode === 'register' ? 'tab-button--active' : ''}`}
            onClick={() => setMode('register')}
          >
            <UserPlus size={16} /> Sign Up
          </button>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <AnimatePresence mode="popLayout">
            {mode === 'register' && (
              <motion.input
                key="name"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                type="text"
                className="field"
                placeholder="Full name"
                required
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
              />
            )}
          </AnimatePresence>

          <input
            type="email"
            className="field"
            placeholder="Email"
            required
            value={formData.email}
            onChange={e => setFormData({ ...formData, email: e.target.value })}
          />

          <AnimatePresence mode="popLayout">
            {mode === 'register' && (
              <motion.input
                key="phone"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                type="tel"
                className="field"
                placeholder="Phone number (optional)"
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
              />
            )}
          </AnimatePresence>

          <input
            type="password"
            className="field"
            placeholder="Password"
            required
            value={formData.password}
            onChange={e => setFormData({ ...formData, password: e.target.value })}
          />

          <div className="role-row">
            <label className="role-label">Sign in as:</label>
            <div className="role-options">
              {['TPO', 'STUDENT', 'ALUMNI'].map(role => (
                <label key={role} className="role-option">
                  <input
                    type="radio"
                    name="role"
                    value={role}
                    checked={formData.role === role}
                    onChange={e => setFormData({ ...formData, role: e.target.value as Role })}
                  />
                  <span>{role === 'TPO' ? 'Admin (TPO)' : role.charAt(0) + role.slice(1).toLowerCase()}</span>
                </label>
              ))}
            </div>
          </div>

          <button type="submit" className="primary-button" disabled={loading}>
            {loading ? 'Please wait...' : 'Continue'}
          </button>

          {mode === 'login' && (
            <button
              type="button"
              className="link-button"
              onClick={handleForgotPassword}
              disabled={loading}
            >
              Forgot password?
            </button>
          )}

          <AnimatePresence>
            {error && (
              <motion.p
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="error-text"
              >
                {error}
              </motion.p>
            )}
            {message && (
              <motion.p
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="success-text"
              >
                {message}
              </motion.p>
            )}
          </AnimatePresence>
        </form>
      </motion.div>
    </motion.div>
  )
}
