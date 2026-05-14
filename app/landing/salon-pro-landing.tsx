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

export default function SalonProLanding() {
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
          <div
            className="lp-pricing-card"
            style={{
              background: CARD,
              border: `1px solid ${GOLD}33`,
              textAlign: 'center',
              position: 'relative',
              overflow: 'hidden',
              boxShadow: '0 0 80px rgba(212,175,55,0.08)',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: 2,
                background: `linear-gradient(to right, transparent, ${GOLD}, transparent)`,
              }}
            />

            <div
              className="lp-eyebrow"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                background: `${GOLD}14`,
                border: `1px solid ${GOLD}33`,
                borderRadius: 20,
                marginBottom: 24,
              }}
            >
              <span style={{ color: GOLD, fontFamily: 'sans-serif', letterSpacing: '0.2em' }}>CIJENA</span>
            </div>

            <div style={{ marginBottom: 8 }}>
              <span className="lp-price-big" style={{ color: GOLD, fontWeight: 900, fontFamily: 'Georgia,serif' }}>
                29,99€
              </span>
              <span style={{ color: 'rgba(255,255,255,0.3)', fontFamily: 'sans-serif' }}> / mj.</span>
            </div>
            <p style={{ color: 'rgba(255,255,255,0.3)', fontFamily: 'sans-serif', marginBottom: 32 }}>
              Prve 2 sedmice besplatno. Otkaži kad hoćeš.
            </p>

            <div style={{ textAlign: 'left', marginBottom: 32 }}>
              {perks.map((p, i) => (
                <div
                  key={p}
                  className="lp-perk-row"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    borderBottom: i < perks.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                    background: p.includes('Crna lista') ? 'rgba(231,76,60,0.05)' : 'transparent',
                    borderRadius: p.includes('Crna lista') ? 8 : 0,
                    paddingLeft: p.includes('Crna lista') ? 8 : 0,
                    paddingRight: p.includes('Crna lista') ? 8 : 0,
                    margin: p.includes('Crna lista') ? '4px -8px' : 0,
                  }}
                >
                  <span style={{ color: p.includes('Crna lista') ? 'rgba(231,76,60,0.9)' : GOLD, fontSize: '1.1em' }}>
                    {p.includes('Crna lista') ? '🚫' : '✓'}
                  </span>
                  <span
                    style={{
                      color: p.includes('Crna lista') ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.65)',
                      fontFamily: 'sans-serif',
                      fontWeight: p.includes('Crna lista') ? 600 : 400,
                    }}
                  >
                    {p}
                  </span>
                  {p.includes('Crna lista') ? (
                    <span
                      style={{
                        marginLeft: 'auto',
                        background: 'rgba(231,76,60,0.15)',
                        border: '1px solid rgba(231,76,60,0.3)',
                        borderRadius: 20,
                        padding: '1px 8px',
                        fontSize: 8,
                        color: 'rgba(231,76,60,0.85)',
                        fontFamily: 'sans-serif',
                        letterSpacing: '0.12em',
                      }}
                    >
                      NOVO
                    </span>
                  ) : null}
                </div>
              ))}
            </div>

            <Link href="/registracija" style={{ textDecoration: 'none', display: 'block' }}>
              <motion.div
                className="lp-pricing-cta"
                whileHover={{ scale: 1.03, boxShadow: '0 22px 55px rgba(212,175,55,0.4)' }}
                whileTap={{ scale: 0.97 }}
                style={{
                  width: '100%',
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
                  textAlign: 'center',
                }}
              >
                Počni besplatno →
              </motion.div>
            </Link>
            <p style={{ color: 'rgba(255,255,255,0.18)', fontFamily: 'sans-serif', marginTop: 16 }}>
              Kartica nije potrebna za probni period
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
