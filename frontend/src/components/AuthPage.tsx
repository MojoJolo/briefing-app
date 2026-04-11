import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'

// True when the app is running as an installed PWA on iOS (standalone mode).
// In this case magic links open in Safari instead of the PWA, so we need
// to guide the user back and let them manually trigger a session check.
const isIOSPWA =
  /iPad|iPhone|iPod/.test(navigator.userAgent) &&
  !!(window.navigator as Navigator & { standalone?: boolean }).standalone

export default function AuthPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [checkMessage, setCheckMessage] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
          // After the user clicks the link in Safari, Supabase redirects back to
          // this origin. The implicit-flow tokens land in the URL hash so the
          // app can establish a session even when running in a different context
          // (Safari vs. the installed PWA).
          emailRedirectTo: window.location.origin,
        },
      })
      if (error) setError(error.message)
      else setSent(true)
    } finally {
      setLoading(false)
    }
  }

  // Called by the iOS "I've clicked the link" button.
  // On iOS 16.4+ Safari and the PWA share localStorage, so the session that
  // was written by Safari is already readable here.
  async function handleCheckSession() {
    setCheckMessage(null)
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setCheckMessage("No sign-in found yet — make sure you tapped the link in your email first, then try again.")
      }
      // If a session was found, onAuthStateChange in AuthContext fires and the
      // app transitions to the authenticated view automatically.
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

            {isIOSPWA && (
              <div className="auth-ios-hint">
                <p className="auth-ios-hint-text">
                  On iPhone, the link will open in <strong>Safari</strong>. After signing in there, come back to this app and tap the button below.
                </p>
                <button
                  className="auth-submit"
                  onClick={handleCheckSession}
                  disabled={loading}
                >
                  {loading ? 'Checking…' : "I've clicked the link — sign me in"}
                </button>
                {checkMessage && <p className="auth-error">{checkMessage}</p>}
              </div>
            )}

            <button className="auth-toggle" onClick={() => { setSent(false); setEmail(''); setCheckMessage(null) }}>
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
