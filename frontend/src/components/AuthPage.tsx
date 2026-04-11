import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function AuthPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
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

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="app-brand">
          <span className="app-brand-mark" />
          <span className="app-title">Briefing</span>
        </div>
        {sent ? (
          <div className="auth-sent">
            <p className="auth-sent-title">Check your email</p>
            <p className="auth-sent-hint">We sent a magic link to <strong>{email}</strong>. Click it to sign in.</p>
            <button className="auth-toggle" onClick={() => { setSent(false); setEmail('') }}>
              Use a different email
            </button>
          </div>
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
              {loading ? 'Sending…' : 'Send magic link'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
