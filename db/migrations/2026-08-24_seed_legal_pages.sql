-- Seed legal_pages with EU/Balkan compliant content
-- Run this in Supabase SQL Editor after the migration

-- USLOVI KORIŠTENJA (Terms of Service)
UPDATE public.legal_pages SET
  title = 'Uslovi korištenja',
  content_html = '
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
  <li>Vlasnik upravlja podacima svojih klijenata u skladu sa zakonom.</li>
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
',
  version = 2,
  updated_at = now()
WHERE slug = 'terms';

-- PRAVILA PRIVATNOSTI (Privacy Policy)
UPDATE public.legal_pages SET
  title = 'Pravila privatnosti',
  content_html = '
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
  <li>Ložalost podaci (broj posjeta, postignuti nagrade).</li>
  <li>Crna lista (razlog, datum unosa).</li>
</ul>

<h2>4. Pravna osnova (GDPR Art. 6)</h2>
<ul>
  <li><strong>Ugovor (Art. 6.1.b)</strong> – obrada za zakazivanje termina, upravljanje nalogom, fakturisanje.</li>
  <li><strong>Zakonski obaveza (Art. 6.1.c)</strong> – evidentiranje faktura, računovodstvo.</li>
  <li><strong>Legitiman interes (Art. 6.1.f)</strong> – analitika, sigurnost, prevasham (crna lista), poboljšanje usluge.</li>
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
  <red>Redakcija: dodati detalje o enkripaciji na odmahu (Supabase default).</red>
</ul>

<h2>11. Kolačići (Cookies)</h2>
<ul>
  <li><strong>Neophodni</strong>: sesija (auth), CSRF token – bez ostih ne radi aplikacija.</li>
  <li><strong>Funkcionalni</strong>: push subscription, preferencije jezika/teme.</li>
  <li><strong>Analitički</strong>: ne koristimo Google Analytics / Matomo / treće stranice za tracking. Sva analitika je first-party.</li>
</ul>

<h2>12. Djeca</h2>
<p>Aplikacija nije namenjena osobama mlađim od 16 godina. Ne prikupljamo svjesno podatke djece. Ako vlasnik salonu unese podatke djeteta (npr. za tretman), odgovoran je za dobijanje pristanka roditelja/staratelja.</p>

<h2>13. Promjene ovih Pravila</h2>
<p>Obavještavamo emailom 30 dana unaprijed o materijalnim promjenama. Verzija i datum ažuriranja su vidljivi na vrhu ove stranice.</p>

<h2>14. Kontakt DPO / za privatnost</h2>
<p>Za sve zahtjeve vezane za privatnost: <a href="mailto:privacy@salonpro.com" style="color:#d4af37">privacy@salonpro.com</a>. Odgovaramo u roku od 30 dana (GDPR Art. 12).</p>
',
  version = 2,
  updated_at = now()
WHERE slug = 'privacy';