import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Use implicit flow so auth tokens are delivered via URL hash.
    // PKCE is the default in supabase-js v2, but it requires a code verifier
    // stored in localStorage. On iOS, the magic link opens in Safari (a separate
    // browser context from the PWA), so Safari can't find the verifier that was
    // saved in the PWA's localStorage — causing auth to fail silently.
    // Implicit flow embeds the tokens directly in the redirect URL hash, so
    // there is no cross-context lookup and the session can be established anywhere.
    flowType: 'implicit',
    detectSessionInUrl: true,
  },
})
