# Salon Pro

SaaS za salone: **dashboard za vlasnika** (termini, usluge, lager, lojalnost, crna lista, javna stranica) i **javni portal** po salonu (`/salon/[slug]`) sa zakazivanjem, nalogom kupca, obaveštenjima i lojalnošću po salonu.

Ovaj repo je nova stabilna osnova za Salon Pro, prenesena iz prethodnog `salon-SAAS` projekta uz jasnije produkcijske zahtjeve za Vercel/Supabase.

## Dokumentacija stanja

**[STANJE_PROJEKTA.md](./STANJE_PROJEKTA.md)** — šta je implementirano, šta je u planu, migracije, API rute, okruženje.

## Zahtevi

- **Node** (LTS), **npm**
- **Supabase** projekat — primeni SQL migracije iz `db/migrations/` (redosled po datumu u imenu fajla).

## Varijable okruženja

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` ili `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
  (server varijante: `SUPABASE_URL`, `SUPABASE_ANON_KEY` ili `SUPABASE_PUBLISHABLE_KEY`)
- `SUPABASE_SERVICE_ROLE_KEY` — server (npr. `POST /api/termini`, RPC); preporučeno za produkciju
- `NEXT_PUBLIC_SITE_URL` ili `PUBLIC_SITE_URL` — produkcijski URL aplikacije, koristi se za javne salon linkove/QR
- `GOOGLE_MAPS_EMBED_API_KEY` ili `NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY` — opciono, za mapu na javnoj stranici salona

## Vercel checklist

Ako deploy "pada" ili funkcije vraćaju 500, prvo provjeri:

1. U Vercel Project Settings -> Environment Variables postoje Supabase varijable za ciljnu okolinu (Production/Preview). Kod podržava i `*_ANON_KEY` i `*_PUBLISHABLE_KEY` nazive koje Supabase/Vercel integracija može automatski dodati.
2. `SUPABASE_SERVICE_ROLE_KEY` je dodat kao server-only varijabla i urađen je Redeploy nakon dodavanja.
3. U Supabase SQL Editor-u su primijenjene sve migracije iz `db/migrations/` redoslijedom po datumu.
4. Supabase Auth redirect URL-ovi uključuju produkcijski domen i lokalni `http://localhost:3000`.
5. Preview deploy linkovi mogu vraćati 401 ako je uključena Vercel Deployment Protection; javni production domen treba testirati odvojeno.

## Razvoj

```bash
npm install
npm run dev
```

- Početna: [http://localhost:3000](http://localhost:3000)
- Dashboard: `/dashboard` (nakon prijave vlasnika)
- Javni salon: `/salon/<slug>`
- Kupac: `/kupac/prijava`, `/kupac/registracija`

## Ostalo

- Pravila za AI / Next: `AGENTS.md`, `CLAUDE.md`
- Lint: `npm run lint`
