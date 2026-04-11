import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function AuthPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: true },
      })
      if (error) setError(error.message)
      else setSent(true)
    } finally {
      setLoading(false)
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: code.trim(),
        type: 'email',
      })
      if (error) setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="app-brand">
          <span className="app-brand-mark" />
          <span className="app-title">Briefing</span>
        </div>
        {sent ? (
          <form onSubmit={handleVerify} className="auth-form">
            <p className="auth-sent-title">Check your email</p>
            <p className="auth-sent-hint">We sent a 6-digit code to <strong>{email}</strong>.</p>
            <input
              className="auth-input"
              type="text"
              inputMode="numeric"
              placeholder="000000"
              maxLength={6}
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
              required
              autoFocus
            />
            {error && <p className="auth-error">{error}</p>}
            <button className="auth-submit" type="submit" disabled={loading || code.length < 6}>
              {loading ? 'Verifying…' : 'Sign in'}
            </button>
            <button className="auth-toggle" type="button" onClick={() => { setSent(false); setEmail(''); setCode('') }}>
              Use a different email
            </button>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="auth-form">
            <input
              className="auth-input"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoFocus
            />
            {error && <p className="auth-error">{error}</p>}
            <button className="auth-submit" type="submit" disabled={loading}>
              {loading ? 'Sending…' : 'Send code'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
