# SalonPro Security Guide

Vodič za bezbednosno ojačavanje aplikacije pre i tokom produkcije.

## Implementirane zaštite

| Zaštita | Status | Detalji |
|---------|--------|---------|
| Security Headers (HSTS, nosniff, Referrer-Policy, Permissions-Policy) | ✅ | `next.config.ts` |
| Content-Security-Policy (nonce-based) | ✅ | `proxy.ts` — Report-Only u dev, enforced u produkciji |
| Rate limiting (auth, registracija) | ✅ | `lib/rate-limit.ts` — 10/min login, 5/min register |
| Auth na svim API rutama | ✅ | Bearer token ili httpOnly cookie |
| UUID validacija na rutama | ✅ | Regex check pre obrade |
| Sanitizovani error odgovori | ✅ | Generičke poruke klijentu, detalji u server logu |
| RLS (Row Level Security) | ✅ | Na svim tabelama u Supabase |
| httpOnly cookie za sesiju | ✅ | `lib/auth-cookies.ts` + `/api/auth/password` |
| Audit log | ✅ | `db/migrations/2026-05-12_audit_log.sql` — automatski trigeri |
| 2FA / MFA (TOTP) | ✅ | `/api/auth/mfa` — enroll, challenge, verify, unenroll |
| app_role zaštita | ✅ | Samo `customer` dozvoljen kroz signup API |

## Pre produkcije — obavezno

### 1. Supabase konfiguracija
- [ ] Ukloni default Supabase kredencijale iz `.env.local` i koristi samo produkcijske
- [ ] Proveri da su sve RLS politike aktivne (`alter table ... enable row level security`)
- [ ] Primeni SVE migracije iz `db/migrations/` redom po datumu
- [ ] U Supabase Dashboard → Authentication → URL Configuration dodaj produkcijski domen
- [ ] Uključi "Confirm email" za registraciju (Authentication → Settings)
- [ ] Postavi `SUPABASE_SERVICE_ROLE_KEY` samo kao server-only varijablu (nikad u klijent)

### 2. Environment varijable (Vercel)
- [ ] `NEXT_PUBLIC_SUPABASE_URL` — Supabase URL
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon key
- [ ] `SUPABASE_SERVICE_ROLE_KEY` — server-only
- [ ] `NEXT_PUBLIC_SITE_URL` — tvoj produkcijski domen (za QR kodove i linkove)

### 3. CSP monitoring
- [ ] Prati CSP violation reporte u browser dev tools (Report-Only mod)
- [ ] Kad nema lažnih pozitivnih, prebaci na enforcing CSP (automatski u produkciji)
- [ ] Razmotriti `/api/csp-report` endpoint za logovanje violation-a

### 4. 2FA deployment
- [ ] U Supabase Dashboard → Authentication → Multi-Factor Authentication uključi TOTP
- [ ] Dodaj MFA UI u dashboard profil sekciju za enrollment
- [ ] Razmotriti obavezno MFA za vlasnika salona

## Penetracijsko testiranje — checklist

### Autentifikacija
- [ ] Brute force na `/api/auth/password` — rate limit blokira posle 10 pokušaja/min
- [ ] Token u URL-u — proveriti da klijentski kod koristi `Authorization` header
- [ ] Session fixation — svaki login generiše novi token
- [ ] Logout — `POST /api/auth/signout` briše httpOnly cookies

### Autorizacija
- [ ] IDOR — pokušaj pristupa tuđim podacima (salonima, terminima, rashodima)
- [ ] Privilege escalation — pokušaj self-assign `salon_owner` role (blokiran)
- [ ] RLS bypass — direktan Supabase API poziv sa anon key (treba biti blokiran)

### Injection
- [ ] SQL injection — sve ide kroz Supabase PostgREST (parametrizovano)
- [ ] XSS — CSP blokira inline skripte bez nonce-a
- [ ] CSRF — JSON API sa token auth (nije ranjiv na klasičan CSRF)

### Infrastruktura
- [ ] HTTPS — HSTS header primorava HTTPS
- [ ] Clickjacking — `frame-ancestors 'none'` u CSP
- [ ] Open redirect — proveriti `next` parametre u redirect logici
- [ ] Error leakage — svi API error odgovori su generički

### Podaci
- [ ] Audit log — proveriti da se promene beleže u `audit_log` tabeli
- [ ] Backup — Supabase automatski pravi point-in-time recovery backup (Pro plan)
- [ ] Encryption at rest — Supabase PostgreSQL koristi AES-256

## Preporuke za budućnost

1. **Web Application Firewall (WAF)** — Vercel ili Cloudflare WAF za dodatnu zaštitu
2. **Penetration test** — angažuj profesionalnu firmu pre velikog launch-a
3. **Bug bounty** — razmotriti program za prijavu ranjivosti
4. **SOC 2 Type II** — ako ciljaš enterprise klijente
5. **GDPR compliance** — pravo na brisanje, data export, privacy policy
6. **Supabase Vault** — za enkripciju osetljivih polja na application nivou
