import { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Pravila privatnosti | Salon Pro',
  description: 'Pravila privatnosti i zaštite podataka aplikacije Salon Pro.',
}

const PRIVACY_CONTENT = `
<h2>1. Ko smo mi</h2>
<p><strong>Salon Pro</strong> (operator platforme) je poduzeće registrovano u Bosni i Hercegovini / Republici Srbiji. Kontakt: <a href="mailto:privacy@salonpro.com" style="color:#d4af37">privacy@salonpro.com</a>.</p>

<h2>2. Kako važe ova pravila</h2>
<p>Ova Pravila privatnosti primjenjuju se na sve osobne podatke koje prikupljamo, obrađujemo i čuvamo kada koristite Salon Pro aplikaciju (dashboard za vlasnike i javnu landing stranicu za klijente).</p>

<h2>3. Koje podatke prikupljamo</h2>
<h3>Od vlasnika salona (kontrolera):</h3>
<ul>
<li>Podaci naloga: ime, email, telefon, grad, tip salona, lozinka (heširana).</li>
<li>Podaci salona: naziv, slug, adresa, radno vrijeme, logo, boje, opis, usluge (naziv, cijena, trajanje), zaposleni (ime, uloga, telefon, slika), lager (artikli, količine).</li>
<li>Finansijski podaci: pretplata, fakture, referal kodovi.</li>
<li>Tehnički podaci: IP adresa, user agent, logovi pristupa, push subscription token.</li>
</ul>

<h3>Od klijenata salona (kako prikuplja vlasnik, mi smo procesor):</h3>
<ul>
<li>Ime, telefon, email (opciono), napomena prilikom zakazivanja.</li>
<li>Historija termina (datum, usluga, zaposleni, status).</li>
<li>Recenzije (ocjena, komentar, datum).</li>
<li>Lojalnost podaci (broj posjeta, postignuti nagrade).</li>
<li>Crna lista (razlog, datum unosa).</li>
</ul>

<h2>4. Pravna osnova (GDPR Art. 6)</h2>
<ul>
<li><strong>Ugovor (Art. 6.1.b)</strong> – obrada za zakazivanje termina, upravljanje nalogom, fakturisanje.</li>
<li><strong>Zakonski obaveza (Art. 6.1.c)</strong> – evidentiranje faktura, računovodstvo.</li>
<li><strong>Legitiman interes (Art. 6.1.f)</strong> – analitika, sigurnost, prevara (crna lista), poboljšanje usluge.</li>
<li><strong>Pristanak (Art. 6.1.a)</strong> – marketing emailovi (opciono, odvojen checkbox), push notifikacije.</li>
</ul>

<h2>5. Kako koristimo podatke</h2>
<ul>
<li>Omogućavanje rada aplikacije (dashboard, landing page, zakazivanje).</li>
<li>Slanje automatskih podsjetnika (email, push) za termine.</li>
<li>Analitika i izvještaji za vlasnika salona.</li>
<li>Zaštita od prevara i zloupotreba (crna lista, rate limiting).</li>
<li>Tehnička podrška i razvoja proizvoda.</li>
</ul>

<h2>6. Dijeljenje sa trećim stranama (procesori)</h2>
<p>Dijelimo podatke <strong>isključivo</strong> sa sljedećim procesorima na osnovu Ugovora o obradi podataka (DPA):</p>
<ul>
<li><strong>Supabase (PostgreSQL, Auth, Storage)</strong> – baza podataka, autentikacija, čuvanje slika. Serveri u EU (Frankfurt/Paris).</li>
<li><strong>Vercel</strong> – hosting aplikacije. Serveri u EU.</li>
<li><strong>Resend / SendGrid</strong> – transakcijski emailovi (potvrda registracije, podsjetnici).</li>
<li><strong>Firebase Cloud Messaging (Google)</strong> – push notifikacije. Tokeni se šalju na Google servere.</li>
<li><strong>Stripe</strong> – plaćanja (ako je omogućen). Mi ne vidimo kartične brojeve.</li>
</ul>

<h2>7. Meždunarodni transferi</h2>
<p>Svi procesori imaju servere u EU ili nude Standardne ugovorne klauzule (SCC) za transfer u SAD. Ne prenašamo podatke u zemlje bez adekvatne zaštite.</p>

<h2>8. Čuvanje podataka</h2>
<ul>
<li>Podaci naloga salona: dok je nalog aktivan + 5 godina nakon zatvaranja (računovodstveni propisi).</li>
<li>Podaci klijenata: dok vlasnik ne zatraži brisanje ili dok salon ne prestane sa radom + zakonski ročni.</li>
<li>Logovi pristupa: 12 mjeseci.</li>
<li>Backup-i: 30 dana (automatski, Supabase Point-in-Time Recovery).</li>
</ul>

<h2>9. Vaša prava (GDPR Art. 15–22)</h2>
<p>Kao <strong>vlasnik salona</strong> (kontroler): imate pravo na pristup, ispravku, brisanje ("zaboravi me"), ograničenje, prenosivost, pritužbu nadležnom organu (npr. AZOP u BiH, Komisija za zaštitu ličnih podataka u RS).</p>
<p>Kao <strong>klijent salona</strong>: obratite se vlasniku salona (kontroleru). Mi ćemo pomoći vlasniku da ispuni vaš zahtjev u roku od 30 dana.</p>

<h2>10. Sigurnost</h2>
<ul>
<li>TLS 1.2+ za sve veze (HTTPS, HSTS).</li>
<li>Row Level Security (RLS) u bazi – salon vidi samo svoje podatke.</li>
<li>Service role ključ samo na serveru (nikada u browseru).</li>
<li>bcrypt za lozinke, JWT za sesije (httpOnly, secure, sameSite cookies).</li>
<li>Enkripcija na odmahu (Supabase default, AES-256).</li>
</ul>

<h2>11. Kolačići (Cookies)</h2>
<ul>
<li><strong>Neophodni</strong>: sesija (auth), CSRF token – bez njih ne radi aplikacija.</li>
<li><strong>Funkcionalni</strong>: push subscription, preferencije jezika/teme.</li>
<li><strong>Analitički</strong>: ne koristimo Google Analytics / Matomo / treće stranice za tracking. Sva analitika je first-party.</li>
</ul>

<h2>12. Djeca</h2>
<p>Aplikacija nije namenjena osobama mlađim od 16 godina. Ne prikupljamo svjesno podatke djece. Ako vlasnik salonu unese podatke djeteta (npr. za tretman), odgovoran je za dobijanje pristanka roditelja/staratelja.</p>

<h2>13. Promjene ovih Pravila</h2>
<p>Obavještavamo emailom 30 dana unaprijed o materijalnim promjenama. Verzija i datum ažuriranja su vidljivi na vrhu ove stranice.</p>

<h2>14. Kontakt DPO / za privatnost</h2>
<p>Za sve zahtjeve vezane za privatnost: <a href="mailto:privacy@salonpro.com" style="color:#d4af37">privacy@salonpro.com</a>. Odgovaramo u roku od 30 dana (GDPR Art. 12).</p>
`

export default function PrivacyPage() {
  const GOLD = '#d4af37'

  return (
    <main style={{ background: '#0a0a0a', minHeight: '100vh', color: '#f5f0e8', fontFamily: 'sans-serif' }}>
      <style>{`
        @keyframes shimmer{0%{background-position:-200% center}100%{background-position:200% center}}
        a:hover{color:#d4af37}
      `}</style>

      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 48px', borderBottom: '0.5px solid rgba(212,175,55,.2)', background: 'rgba(10,10,10,.97)', position: 'sticky', top: 0, zIndex: 100 }}>
        <Link href="/" style={{ fontSize: '22px', fontWeight: 500, background: 'linear-gradient(90deg,#d4af37,#f5e17a,#d4af37)', backgroundSize: '200% auto', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', animation: 'shimmer 3s linear infinite', textDecoration: 'none' }}>SalonPro</Link>
        <Link href="/" style={{ fontSize: '14px', color: 'rgba(245,240,232,.5)', textDecoration: 'none' }}>← Nazad na početnu</Link>
      </nav>

      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '60px 24px 100px' }}>
        <h1 style={{ fontSize: 'clamp(28px,5vw,44px)', fontWeight: 700, fontFamily: 'Georgia,serif', color: '#f5f0e8', marginBottom: '8px' }}>
          Pravila privatnosti
        </h1>
        <p style={{ color: 'rgba(245,240,232,0.4)', marginBottom: '40px', fontSize: '15px' }}>
          Zadnje ažuriranje: 25. august 2026.
        </p>

        <div style={{ background: '#111', border: '0.5px solid rgba(212,175,55,.15)', borderRadius: '20px', padding: '48px', lineHeight: 1.8, color: 'rgba(245,240,232,0.85)' }}>
          <div dangerouslySetInnerHTML={{ __html: PRIVACY_CONTENT }} />
        </div>

        <div style={{ marginTop: '40px', textAlign: 'center' }}>
          <Link href="/" style={{ color: GOLD, textDecoration: 'none', fontWeight: 600 }}>
            ← Vrati se na početnu stranicu
          </Link>
        </div>
      </div>

      <footer style={{ borderTop: '0.5px solid rgba(212,175,55,.1)', padding: '24px', textAlign: 'center', color: 'rgba(245,240,232,.25)', fontSize: '12px' }}>
        © {new Date().getFullYear()} SalonPro. Sva prava zadržana.
      </footer>
    </main>
  )
}