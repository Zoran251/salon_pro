import { isInvalidRefreshTokenError } from '@/lib/auth-refresh-errors'

export type AuthErrorNetworkHint = 'customer' | 'salon-login' | 'salon-register'

const NETWORK_MESSAGES: Record<AuthErrorNetworkHint, string> = {
  customer: 'Ne možemo da se povežemo. Proverite internet vezu ili podešavanja servera.',
  'salon-login':
    'Ne možemo da se povežemo sa bazom. U Vercel dodajte NEXT_PUBLIC_SUPABASE_URL i NEXT_PUBLIC_SUPABASE_ANON_KEY, pa ponovo pokrenite deploy.',
  'salon-register':
    'Ne možemo da se povežemo sa bazom (mrežna greška). U Vercel → Settings → Environment Variables podesite NEXT_PUBLIC_SUPABASE_URL i NEXT_PUBLIC_SUPABASE_ANON_KEY, zatim ponovo pokrenite deploy. Bez toga sajt šalje zahteve na pogrešnu adresu.',
}

/**
 * Čitljive poruke za korisnika; refresh-token greške nisu kvar PostgreSQL veze.
 */
export function formatAuthError(message: string, networkHint: AuthErrorNetworkHint = 'customer'): string {
  if (isInvalidRefreshTokenError(message)) {
    return 'Sesija u pregledaču nije važeća (token je istekao ili je oštećen). Odjavite se ili obrišite podatke sajta za ovaj domen (skladište / kolačići), pa se ponovo prijavite.'
  }
  const m = message.toLowerCase()
  if (m.includes('failed to fetch') || m.includes('networkerror')) {
    return NETWORK_MESSAGES[networkHint]
  }
  if (m.includes('email not confirmed') || m.includes('not confirmed')) {
    return 'Potvrdite email adresu pre prijave.'
  }
  if (m.includes('invalid login') || m.includes('invalid credentials')) {
    return 'Pogrešan email ili lozinka.'
  }
  return message
}
