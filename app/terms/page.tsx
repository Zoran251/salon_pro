import { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Uslovi korištenja | Salon Pro',
  description: 'Uslovi korištenja aplikacije Salon Pro za upravljanje frizerskim i kozmetičkim salonima.',
}

const TERMS_CONTENT = `
<h2>1. Uvod i prihvaćanje uslova</h2>
<p>Dobrodošli u Salon Pro ("mi", "naš", "aplikacija"). Koristeći našu aplikaciju i usluge, prihvaćate ove Uslove korištenja ("Uslovi"). Molimo vas da ih pažljivo pročitate.</p>

<h2>2. Opis usluge</h2>
<p>Salon Pro je SaaS platforma za upravljanje frizerskim, kozmetičkim i drugim tipovima salona. Omogućuje: online zakazivanje termina putem javne landing stranice, upravljanje uslugama, zaposlenima, lagerom, analitiku, automatske podsjetnike, recenzije, lojalnost i crnu listu klijenata.</p>

<h2>3. Registracija i nalog</h3>
<ul>
<li>Registracijom salon postaje "vlasnik naloga" i odgovoran je za sve aktivnosti na svom nalogu.</li>
<li>Vlasnik mora unijeti tačne podatke (naziv, email, telefon, grad, tip salona).</li>
<li>Lozinke se čuvaju heširane (bcrypt) – mi ih ne vidimo niti čuvamo u čitljivom obliku.</li>
</ul>

<h2>4. Pretplate i plaćanje</h3>
<ul>
<li>Dostupni planovi: Mjesečni (29,99 €/mj), Godišnji (299 €/god), Doživotna licenca (1.200 € jednokratno).</li>
<li>Cijene su u EUR, plaćanje obavlja se putem Stripe (kartica) ili putem fakture (dogovorno).</li>
<li>Promo kod "Osnivac10" daje doživotnu licencu za 500 € (limitirano na 10 licenci).</li>
<li>Preporuka: za 3 nova salona registrovana putem referal koda, godišnja pretplata snižava se na 254 €.</li>
<li>Otkazivanje: mjesečni plan se može otkazati u bilo kom trenutku, godišnji i doživotni nisu povratni.</li>
</ul>

<h2>5. Odgovornost vlasnika salona</h3>
<ul>
<li>Vlasnik je odgovoran za sadržaj svoje landing stranice (usluge, cjene, radno vrijeme, slike).</li>
<li>Vlasnik mora imati sve potrebne dozvole/licence za rad (sanitarna ispravnost, craft licence itd.).</li>
<li>Vlasnik upravlja podacima своих klijenata u skladu sa zakonom.</li>
</ul>

<h2>6. Podaci klijenata i privatnost</h3>
<p>Detaljna obrada osobnih podataka opisana je u <a href="/privacy" style="color:#d4af37">Pravilima privatnosti</a>. Kratko: mi smo <strong>procesori</strong> podataka, vlasnik salona je <strong>kontroler</strong>. Mi ne prodajemo niti dijelišemo podatke klijenata sa trećim stranama osim za tehničke potrebe (hosting, email, push notifikacije).</p>

<h2>7. Intelektualna svojina</h3>
<ul>
<li>Kod, dizajn, baza podataka i funkcionalnosti Salon Pro su naša intelektualna svojina.</li>
<li>Vlasnik salona zadržava prava na svoje slike, logo, tekstove i podatke klijenata.</li>
<li>Prilikom otkazivanja pretplate, vlasnik može izvezti svoje podatke (JSON/CSV).</li>
</ul>

<h2>8. Dostupnost i održavanje</h3>
<ul>
<li>Ciljamo na 99,9% uptime. Planirano održavanje obavljamo noću (najčešće 02–04h).</li>
<li>Ne garatujemo neprekidnu dostupnost (force majeure, DDoS, problemi sa dobavljačem oblaka).</li>
</ul>

<h2>9. Odricanje od garancija i ograničenje odgovornosti</h3>
<p>Usluga se pruža "kakva jest" i "kada je dostupna". Ne snosimo odgovornost za: gubitak profitа, gubitak podataka zbog greške korisnika, radnje trećih strana (Stripe, Supabase, Vercel, Firebase), ili bilo kakve indirektne štete. Naša ukupna odgovornost ograničena je na iznos plaćen u zadnjih 12 mjeseci.</p>

<h2>10. Promjene Uslova</h3>
<p>Možemo izmijeniti ove Uslove. O svim važnijim promjenama obavijestiti ćemo vas emailom najmanje 30 dana prije stupanja na snagu. Nastavak korištenja nakon promjene znači prihvaćanje novih Uslova.</p>

<h2>11. Primjenjivo pravo i rask</h3>
<ul>
<li>Ovi Uslovi su podložni zakonima Bosne i Hercegovine / Republike Srbije / Crne Gore (prema sjedištu korisnika).</li>
<li>Svi sporovi rješavaju se mirno, a ako to ne uspije — nadležnim sudom u sjedištu korisnika.</li>
</ul>

<h2>12. Kontakt</h3>
<p>Za pitanja oko ovih Uslova: <a href="mailto:legal@salonpro.com" style="color:#d4af37">legal@salonpro.com</a> ili putem <a href="/#contact" style="color:#d4af37">kontakt forme</a>.</p>
`

export default function TermsPage() {
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
          Uslovi korištenja
        </h1>
        <p style={{ color: 'rgba(245,240,232,0.4)', marginBottom: '40px', fontSize: '15px' }}>
          Zadnje ažuriranje: 25. august 2026.
        </p>

        <div style={{ background: '#111', border: '0.5px solid rgba(212,175,55,.15)', borderRadius: '20px', padding: '48px', lineHeight: 1.8, color: 'rgba(245,240,232,0.85)' }}>
          <div dangerouslySetInnerHTML={{ __html: TERMS_CONTENT }} />
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