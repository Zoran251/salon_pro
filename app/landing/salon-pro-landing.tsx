'use client'

import { useRef, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { AnimatePresence, motion, useInView } from 'framer-motion'
import { BG, CARD, GOLD, GOLD_DARK, GOLD_LIGHT } from './constants'
import { StorySlideshow } from './story-slideshow'
import './landing-responsive.css'

function FadeIn({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-50px' })
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 28 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  )
}

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div
      onClick={() => setOpen(!open)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          setOpen(!open)
        }
      }}
      role="button"
      aria-expanded={open}
      tabIndex={0}
      className="lp-faq-item"
      style={{
        background: CARD,
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 14,
        marginBottom: 10,
        overflow: 'hidden',
        cursor: 'pointer',
      }}
    >
      <div style={{ padding: '17px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <span className="lp-faq-q" style={{ color: 'rgba(255,255,255,0.78)', fontFamily: 'sans-serif', lineHeight: 1.4 }}>
          {q}
        </span>
        <motion.span className="lp-faq-toggle" animate={{ rotate: open ? 45 : 0 }} style={{ color: GOLD, flexShrink: 0 }}>
          +
        </motion.span>
      </div>
      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
          >
            <p className="lp-faq-a" style={{ padding: '14px 18px 16px', color: 'rgba(255,255,255,0.42)', lineHeight: 1.7, fontFamily: 'sans-serif' }}>
              {a}
            </p>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}

function PricingCard({ naziv, cijena, period, opis, zlatni, isticanje, children }: { naziv: string; cijena: string; period: string; opis: string; zlatni: boolean; isticanje: boolean; children?: ReactNode }) {
  return (
    <div
      className="lp-pricing-card"
      style={{
        background: isticanje ? 'linear-gradient(160deg,#1f1800,#0f0e00)' : 'linear-gradient(160deg,#181818,#111)',
        border: `1px solid ${zlatni ? GOLD : 'rgba(212,175,55,0.12)'}`,
        borderRadius: 24,
        padding: '40px 32px',
        width: 300,
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: isticanje ? '0 0 100px rgba(212,175,55,0.1), 0 20px 60px rgba(0,0,0,0.5)' : '0 20px 60px rgba(0,0,0,0.3)',
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {isticanje && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg,transparent,${GOLD},transparent)` }} />
      )}
      {isticanje && (
        <div style={{ position: 'absolute', top: 14, right: 14, background: `linear-gradient(135deg,${GOLD},#b8960c)`, color: '#0a0a0a', fontSize: 9, fontWeight: 800, padding: '3px 12px', borderRadius: 20, fontFamily: 'sans-serif', letterSpacing: '0.12em', boxShadow: '0 4px 12px rgba(212,175,55,0.3)' }}>
          PREPORUČUJEMO
        </div>
      )}
      <div style={{ fontSize: 11, fontWeight: 700, color: zlatni ? GOLD : 'rgba(255,255,255,0.25)', marginBottom: 20, fontFamily: 'sans-serif', letterSpacing: '0.22em' }}>
        {naziv.toUpperCase()}
      </div>
      <div style={{ marginBottom: 4 }}>
        <span className="lp-price-big" style={{ color: '#f5f0e8', fontWeight: 700, fontFamily: 'Georgia,serif', fontSize: 'clamp(38px,5vw,48px)', letterSpacing: '-0.02em' }}>
          {cijena}
        </span>
        <span style={{ color: 'rgba(255,255,255,0.2)', fontFamily: 'sans-serif', fontSize: 14, fontWeight: 400 }}>{period}</span>
      </div>
      <p style={{ color: 'rgba(255,255,255,0.25)', fontFamily: 'sans-serif', fontSize: 12, lineHeight: 1.6, marginBottom: 24, minHeight: 38 }}>
        {opis}
      </p>
      {children}
    </div>
  )
}

export default function SalonProLanding() {
  const [promoKod, setPromoKod] = useState('')
  const promoVazi = promoKod.trim().toLowerCase() === 'osnivac10'
  const dozivotnaCijenaDisplay = promoVazi ? '500' : '1.200'
  const dozivotnaPeriodDisplay = promoVazi ? ' € (kod Osnivac10)' : ' € / jednokratno'
  const belowRef = useRef<HTMLDivElement>(null)
  const scrollDown = () => belowRef.current?.scrollIntoView({ behavior: 'smooth' })

  const features: Array<{ icon: string; title: string; desc: string; highlight?: boolean }> = [
    {
      icon: '📱',
      title: 'QR landing page',
      desc: 'Skeniranjem QR koda klijenti odmah vide tvoj salon, usluge i slobodne termine. Nema poziva, nema čekanja.',
    },
    {
      icon: '📅',
      title: 'Online zakazivanje',
      desc: 'Klijenti biraju termin sami, 24/7. Ti samo potvrđuješ i fokusiraš se na ono što voliš — posao.',
    },
    {
      icon: '📦',
      title: 'Lager i sirovine',
      desc: 'Prati zalihe boja i preparata u realnom vremenu. Alarm kad nešto ponestaje.',
    },
    {
      icon: '💬',
      title: 'Automatski podsjetnici',
      desc: 'Email obaveštenja oko termina. Manje zaborava, puniji kalendar.',
    },
    {
      icon: '📊',
      title: 'Analitika salona',
      desc: 'Koji tretmani donose najviše novca? Ko su top klijenti? Sve na jednom ekranu.',
    },
    {
      icon: '🔐',
      title: 'Sigurnost podataka',
      desc: 'Podaci klijenata su zaštićeni. RLS i uobičajene prakse usklađene sa GDPR-om.',
    },
    {
      icon: '🚫',
      title: 'Crna lista',
      desc: 'Zaštita od čestih no-show i kasnih otkazivanja — po pravilima koje postaviš.',
      highlight: true,
    },
  ]

  const perks = [
    'Personalizovana landing page',
    'QR kod za štampanje',
    'Online zakazivanje termina',
    'Upravljanje lagrom i sirovinama',
    'Automatski email obaveštenja',
    'Analitika i izvještaji',
    'Crna lista neodgovornih klijenata',
    'Otkaži kad hoćeš',
  ]

  return (
    <div className="lp-page" style={{ minHeight: '100vh', background: BG, color: '#fff' }}>
      <nav
        className="lp-nav"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'rgba(7,7,7,0.85)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255,255,255,0.04)',
        }}
      >
        <span
          className="lp-nav-brand"
          style={{ color: GOLD, fontFamily: 'Georgia,serif', fontStyle: 'italic', letterSpacing: '0.2em' }}
        >
          Salon Pro
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <Link href="/demo" className="lp-nav-link" style={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'sans-serif', textDecoration: 'none' }}>
            Demo
          </Link>
          <Link href="/login" className="lp-nav-link" style={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'sans-serif', textDecoration: 'none' }}>
            Prijava
          </Link>
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
            <Link
              href="/registracija"
              className="lp-nav-cta"
              style={{
                background: `linear-gradient(135deg, ${GOLD_LIGHT}, ${GOLD})`,
                color: '#000',
                border: 'none',
                borderRadius: 50,
                fontWeight: 800,
                letterSpacing: '0.15em',
                cursor: 'pointer',
                fontFamily: 'sans-serif',
                textDecoration: 'none',
                display: 'inline-block',
              }}
            >
              POČNI BESPLATNO
            </Link>
          </motion.div>
        </div>
      </nav>

      <section
        className="lp-hero"
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div className="lp-hero-story-wrap">
          <StorySlideshow onDone={scrollDown} />
        </div>
        <motion.div
          className="lp-scroll-cue"
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          onClick={scrollDown}
          style={{ color: 'rgba(255,255,255,0.2)', cursor: 'pointer', userSelect: 'none' }}
        >
          ↓
        </motion.div>
      </section>

      <section ref={belowRef} className="lp-features">
        <FadeIn>
          <div className="lp-features-intro" style={{ textAlign: 'center' }}>
            <div
              className="lp-eyebrow"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                background: `${GOLD}14`,
                border: `1px solid ${GOLD}33`,
                borderRadius: 20,
                marginBottom: 20,
              }}
            >
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: GOLD }} />
              <span style={{ color: GOLD, fontFamily: 'sans-serif', letterSpacing: '0.2em' }}>FUNKCIONALNOSTI</span>
            </div>
            <h2 className="lp-features-h2" style={{ fontWeight: 700, fontFamily: 'Georgia,serif', color: '#fff', marginBottom: 14 }}>
              Sve što ti treba.
              <br />
              Ništa što ne treba.
            </h2>
            <p className="lp-features-lead" style={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'sans-serif', lineHeight: 1.7, margin: '0 auto' }}>
              Salon Pro je napravljen za frizere i kozmetičare — ne za IT stručnjake.
            </p>
          </div>
        </FadeIn>

        <div className="lp-feature-grid">
          {features.filter((f) => !f.highlight).map((f, i) => (
              <FadeIn key={f.title} delay={i * 0.08}>
                <motion.div
                  whileHover={{ y: -4, borderColor: `${GOLD}44` }}
                  className="lp-feature-card"
                  style={{
                    background: CARD,
                    border: '1px solid rgba(255,255,255,0.06)',
                    transition: 'border-color 0.3s',
                  }}
                >
                  <div className="lp-feat-icon">{f.icon}</div>
                  <h3 className="lp-feat-title" style={{ color: '#fff', fontWeight: 700, fontFamily: 'sans-serif' }}>
                    {f.title}
                  </h3>
                  <p className="lp-feat-desc" style={{ color: 'rgba(255,255,255,0.38)', fontFamily: 'sans-serif', margin: 0 }}>
                    {f.desc}
                  </p>
                </motion.div>
              </FadeIn>
            ))}
        </div>

        <FadeIn delay={0.55}>
          <motion.div
            whileHover={{ y: -3 }}
            className="lp-spotlight"
            style={{
              position: 'relative',
              overflow: 'hidden',
              background: '#0d0000',
              border: '1px solid rgba(231,76,60,0.25)',
              display: 'flex',
              alignItems: 'flex-start',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: 2,
                background: 'linear-gradient(to right, transparent, rgba(231,76,60,0.7), transparent)',
              }}
            />
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'radial-gradient(ellipse at 10% 50%, rgba(231,76,60,0.07) 0%, transparent 60%)',
                pointerEvents: 'none',
              }}
            />
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <div
                className="lp-spotlight-icon"
                style={{
                  borderRadius: 14,
                  background: 'rgba(231,76,60,0.1)',
                  border: '1px solid rgba(231,76,60,0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                🚫
              </div>
              {[1, 2].map((r) => (
                <motion.div
                  key={r}
                  animate={{ scale: [1, 1.8], opacity: [0.3, 0] }}
                  transition={{ duration: 2, repeat: Infinity, delay: r * 0.6 }}
                  style={{ position: 'absolute', inset: 0, borderRadius: 14, border: '1px solid rgba(231,76,60,0.4)' }}
                />
              ))}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
                <h3 style={{ color: '#fff', fontWeight: 700, fontFamily: 'sans-serif', margin: 0 }}>Crna lista</h3>
                <span
                  className="lp-spotlight-badge"
                  style={{
                    background: 'rgba(231,76,60,0.15)',
                    border: '1px solid rgba(231,76,60,0.3)',
                    borderRadius: 20,
                    color: 'rgba(231,76,60,0.85)',
                    fontFamily: 'sans-serif',
                    letterSpacing: '0.15em',
                    whiteSpace: 'nowrap',
                  }}
                >
                  EKSKLUZIVNO
                </span>
              </div>
              <p style={{ color: 'rgba(255,255,255,0.5)', lineHeight: 1.7, fontFamily: 'sans-serif', margin: 0 }}>
                Zaštita od klijenata koji često ne dolaze ili otkazuju u poslednji čas — po pravilima koje ti podesiš.
              </p>
            </div>
          </motion.div>
        </FadeIn>
      </section>

      <section className="lp-pricing">
        <FadeIn>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <div
              className="lp-eyebrow"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                background: `${GOLD}14`,
                border: `1px solid ${GOLD}33`,
                borderRadius: 20,
                padding: '6px 18px',
                marginBottom: 20,
              }}
            >
              <span style={{ color: GOLD, fontFamily: 'sans-serif', letterSpacing: '0.2em' }}>CIJENE</span>
            </div>
            <h2 style={{ fontSize: 'clamp(28px,5vw,44px)', fontWeight: 700, fontFamily: 'Georgia,serif', color: '#f5f0e8', margin: 0 }}>
              Izaberi plan za tvoj salon
            </h2>
          </div>

          <div style={{ display: 'flex', gap: 24, justifyContent: 'center', flexWrap: 'wrap', alignItems: 'stretch' }}>
            {/* Mjesečna */}
            <PricingCard
              naziv="Mjesečna"
              cijena="29,99€"
              period=" / mjesec"
              opis="Prve 2 sedmice besplatno. Otkaži kad želiš."
              zlatni={false}
              isticanje={false}
            >
              <Link href="/registracija" style={{ textDecoration: 'none', marginTop: 'auto' }}>
                <motion.div
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    color: 'rgba(255,255,255,0.6)',
                    border: '0.5px solid rgba(212,175,55,0.15)',
                    borderRadius: 30,
                    padding: '14px 28px',
                    fontWeight: 500,
                    fontSize: 13,
                    cursor: 'pointer',
                    fontFamily: 'sans-serif',
                    letterSpacing: '0.1em',
                  }}
                >
                  Izaberi mjesečnu →
                </motion.div>
              </Link>
            </PricingCard>

            {/* Godišnja */}
            <PricingCard
              naziv="Godišnja"
              cijena="299€"
              period=" / godina"
              opis={`≈ ${(299 / 12).toFixed(2).replace('.', ',')}€ mjesečno · Ušteda ${Math.round(29.99 * 12 - 299)}€`}
              zlatni={false}
              isticanje={false}
            >
              <Link href="/registracija" style={{ textDecoration: 'none', marginTop: 'auto' }}>
                <motion.div
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    color: 'rgba(255,255,255,0.6)',
                    border: '0.5px solid rgba(212,175,55,0.15)',
                    borderRadius: 30,
                    padding: '14px 28px',
                    fontWeight: 500,
                    fontSize: 13,
                    cursor: 'pointer',
                    fontFamily: 'sans-serif',
                    letterSpacing: '0.1em',
                  }}
                >
                  Izaberi godišnju →
                </motion.div>
              </Link>
            </PricingCard>

            {/* Doživotna */}
            <PricingCard
              naziv="Doživotna licenca"
              cijena={dozivotnaCijenaDisplay + '€'}
              period={dozivotnaPeriodDisplay}
              opis={promoVazi ? '✅ Promo kod Osnivac10 aktivan' : 'Plati jednom — koristi zauvijek.'}
              zlatni={true}
              isticanje={true}
            >
              <div style={{ marginBottom: 12, marginTop: 'auto' }}>
                <div style={{ padding: '10px', border: '0.5px solid rgba(212,175,55,.2)', borderRadius: 12, background: 'rgba(212,175,55,.04)', marginBottom: 12 }}>
                  <div style={{ fontSize: 10, color: GOLD, fontWeight: 700, letterSpacing: '0.1em', marginBottom: 4 }}>🎯 AKCIJA ZA 10 NAJBRŽIH</div>
                  <div style={{ fontSize: 11, color: 'rgba(245,240,232,.5)' }}>
                    Unesi kod <strong style={{ color: GOLD }}>Osnivac10</strong> i dobij za samo 500€
                  </div>
                </div>
                <input
                  type="text"
                  placeholder="Promo kod"
                  value={promoKod}
                  onChange={e => setPromoKod(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'rgba(0,0,0,0.4)',
                    border: promoVazi ? '0.5px solid rgba(212,175,55,0.5)' : '0.5px solid rgba(255,255,255,0.08)',
                    borderRadius: 20,
                    padding: '10px 16px',
                    color: '#f5f0e8',
                    fontSize: 12,
                    outline: 'none',
                    fontFamily: 'sans-serif',
                    textAlign: 'center',
                    letterSpacing: '0.1em',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
              <Link href="/registracija" style={{ textDecoration: 'none' }}>
                <motion.div
                  whileHover={{ scale: 1.03, boxShadow: '0 12px 40px rgba(212,175,55,0.3)' }}
                  whileTap={{ scale: 0.97 }}
                  style={{
                    background: `linear-gradient(135deg, ${GOLD_LIGHT}, ${GOLD}, ${GOLD_DARK})`,
                    color: '#0a0a0a',
                    border: 'none',
                    borderRadius: 30,
                    padding: '14px 28px',
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: 'pointer',
                    fontFamily: 'sans-serif',
                    letterSpacing: '0.12em',
                    boxShadow: '0 8px 30px rgba(212,175,55,0.15)',
                  }}
                >
                  Izaberi doživotnu →
                </motion.div>
              </Link>
            </PricingCard>
          </div>

          <div style={{ textAlign: 'center', marginTop: 28 }}>
            <Link href="/registracija" style={{ textDecoration: 'none', display: 'inline-block' }}>
              <motion.div
                className="lp-pricing-cta"
                whileHover={{ scale: 1.03, boxShadow: '0 22px 55px rgba(212,175,55,0.4)' }}
                whileTap={{ scale: 0.97 }}
                style={{
                  background: `linear-gradient(135deg, ${GOLD_LIGHT}, ${GOLD}, ${GOLD_DARK})`,
                  color: '#000',
                  fontWeight: 900,
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  border: 'none',
                  borderRadius: 50,
                  cursor: 'pointer',
                  boxShadow: '0 14px 40px rgba(212,175,55,0.3)',
                  fontFamily: 'sans-serif',
                  padding: '18px 48px',
                  fontSize: '15px',
                }}
              >
                Počni besplatno →
              </motion.div>
            </Link>
            <p style={{ color: 'rgba(255,255,255,0.18)', fontFamily: 'sans-serif', marginTop: 16, fontSize: '13px' }}>
              Kartica nije potrebna za probni period · Svi planovi uključuju sve funkcije
            </p>
          </div>
        </FadeIn>
      </section>

      <section className="lp-faq">
        <FadeIn>
          <h2 className="lp-faq-h2" style={{ fontWeight: 700, fontFamily: 'Georgia,serif', textAlign: 'center', color: '#fff' }}>
            Česta pitanja
          </h2>
        </FadeIn>
        {[
          {
            q: 'Da li moram imati tehničko znanje?',
            a: 'Ne. Postavljanje traje oko 5 minuta. Uneseš ime, usluge, radno vreme — i gotovo. Mi vodimo računa o ostalom.',
          },
          {
            q: 'Šta se desi ako otkazujem?',
            a: 'Ništa komplikovano. Otkazuješ kad hoćeš, bez pitanja. Podaci ostaju tvoji.',
          },
          {
            q: 'Kako klijenti zakazuju?',
            a: 'Skeniraju QR kod ili kliknu na tvoj link. Biraju uslugu i slobodan termin. Ti dobijaš obaveštenje.',
          },
          {
            q: 'Da li radi i na mobilnom?',
            a: 'Potpuno. I za tebe i za klijente. Nema instalacije — sve radi u pregledaču.',
          },
          {
            q: 'Šta sa podacima klijenata?',
            a: 'Podaci se čuvaju sigurno u oblaku (EU region gdje je projekat podešen). Primjenjujemo uobičajene mjere zaštite i RLS.',
          },
        ].map((faq, i) => (
          <FadeIn key={faq.q} delay={i * 0.06}>
            <FAQItem q={faq.q} a={faq.a} />
          </FadeIn>
        ))}
      </section>

      <footer
        className="lp-footer"
        style={{
          borderTop: '1px solid rgba(255,255,255,0.05)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <span className="lp-footer-brand" style={{ color: GOLD, fontFamily: 'Georgia,serif', fontStyle: 'italic' }}>
          Salon Pro
        </span>
        <span className="lp-footer-copy" style={{ color: 'rgba(255,255,255,0.18)', fontFamily: 'sans-serif' }}>
          © {new Date().getFullYear()} Salon Pro. Sva prava zadržana.
        </span>
      </footer>
    </div>
  )
}
