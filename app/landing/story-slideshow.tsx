'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import { GOLD, GOLD_DARK, GOLD_LIGHT, SLIDES } from './constants'
import { SCENES } from './scenes'

import type { Variants } from 'framer-motion'

const slideVar: Variants = {
  enter: (d: number) => ({ x: d > 0 ? '100%' : '-100%', opacity: 0 }),
  center: { x: 0, opacity: 1, transition: { duration: 0.7, ease: [0.4, 0, 0.2, 1] } },
  exit: (d: number) => ({
    x: d > 0 ? '-100%' : '100%',
    opacity: 0,
    transition: { duration: 0.55, ease: [0.4, 0, 0.2, 1] },
  }),
}

const DURS = [5500, 5500, 5500, 6000, 5500, 0]

type StorySlideshowProps = {
  onDone?: () => void
}

export function StorySlideshow({ onDone }: StorySlideshowProps) {
  const [cur, setCur] = useState(0)
  const [dir, setDir] = useState(1)
  const [prog, setProg] = useState(0)
  const [paused, setPaused] = useState(false)
  const pRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const tRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const isLast = cur === SLIDES.length - 1
  const DUR = DURS[cur] ?? 5500

  const goTo = (i: number, d?: number) => {
    setDir(d ?? (i > cur ? 1 : -1))
    setCur(i)
    setProg(0)
  }

  const next = () => {
    if (isLast) {
      onDone?.()
      return
    }
    goTo(cur + 1, 1)
  }

  const prev = () => {
    if (cur > 0) goTo(cur - 1, -1)
  }

  useEffect(() => {
    if (paused || isLast) return
    setProg(0)
    const start = Date.now()
    pRef.current = setInterval(() => setProg(Math.min((Date.now() - start) / DUR, 1)), 16)
    tRef.current = setTimeout(next, DUR)
    return () => {
      if (pRef.current) clearInterval(pRef.current)
      if (tRef.current) clearTimeout(tRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- namjerno: samo cur/pauza/isLast; next mijenja cur
  }, [cur, paused, isLast, DUR])

  const slide = SLIDES[cur]
  const SceneComp = SCENES[cur]

  return (
    <div
      className="lp-story-root"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      style={{
        width: '100%',
        position: 'relative',
        overflow: 'hidden',
        aspectRatio: '9/16',
        maxHeight: '86vh',
        boxShadow: `0 50px 130px rgba(0,0,0,0.85), 0 0 0 1px rgba(255,255,255,0.06), 0 0 80px ${slide.accentGlow}`,
      }}
    >
      <AnimatePresence custom={dir} initial={false}>
        <motion.div
          key={cur}
          custom={dir}
          variants={slideVar}
          initial="enter"
          animate="center"
          exit="exit"
          style={{ position: 'absolute', inset: 0 }}
        >
          <div style={{ position: 'absolute', inset: 0, background: slide.bg }} />
          <SceneComp />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(to top, rgba(0,0,0,0.97) 0%, rgba(0,0,0,0.15) 45%, rgba(0,0,0,0.55) 100%)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(to right, rgba(0,0,0,0.35) 0%, transparent 25%, transparent 75%, rgba(0,0,0,0.35) 100%)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: `radial-gradient(ellipse at 50% 100%, ${slide.accentGlow} 0%, transparent 55%)`,
            }}
          />

          <div
            className="lp-story-inner"
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span
                className="lp-story-brand"
                style={{
                  color: slide.accent,
                  fontFamily: 'Georgia,serif',
                  fontStyle: 'italic',
                  letterSpacing: '0.18em',
                }}
              >
                Salon Pro
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: slide.accent,
                    boxShadow: `0 0 10px ${slide.accent}`,
                  }}
                />
                <span
                  className="lp-story-counter"
                  style={{
                    color: 'rgba(255,255,255,0.3)',
                    fontFamily: 'sans-serif',
                    letterSpacing: '0.2em',
                  }}
                >
                  {cur + 1}/{SLIDES.length}
                </span>
              </div>
            </div>

            <motion.div
              initial={{ y: 45, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.18, duration: 0.75, ease: 'easeOut' }}
            >
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 7,
                  marginBottom: 14,
                  background: `${slide.accent}1a`,
                  border: `1px solid ${slide.accent}44`,
                  borderRadius: 20,
                  padding: '4px 12px',
                }}
              >
                <div
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: '50%',
                    background: slide.accent,
                    boxShadow: `0 0 8px ${slide.accent}`,
                  }}
                />
                <span
                  className="lp-story-phase"
                  style={{
                    color: slide.accent,
                    fontFamily: 'sans-serif',
                    letterSpacing: '0.22em',
                    textTransform: 'uppercase',
                  }}
                >
                  {slide.phase}
                </span>
              </div>

              <h2
                className="lp-story-headline"
                style={{
                  color: '#fff',
                  fontWeight: 700,
                  fontFamily: 'Georgia,serif',
                  whiteSpace: 'pre-line',
                }}
              >
                {slide.headline}
              </h2>

              <div
                className="lp-story-panel"
                style={{
                  background: 'rgba(5,5,5,0.8)',
                  backdropFilter: 'blur(30px)',
                  border: `1px solid ${slide.accent}28`,
                  marginBottom: 14,
                  boxShadow: `0 8px 40px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.04), 0 0 30px ${slide.accentGlow}`,
                }}
              >
                <p
                  className="lp-story-body"
                  style={{
                    color: 'rgba(255,255,255,0.88)',
                    fontFamily: 'Georgia,serif',
                    marginBottom: 12,
                  }}
                >
                  {slide.body}
                </p>
                <p
                  className="lp-story-sub"
                  style={{
                    color: slide.accent,
                    fontFamily: 'sans-serif',
                    letterSpacing: '0.1em',
                    opacity: 0.85,
                  }}
                >
                  {slide.sub}
                </p>

                {slide.cta ? (
                  <Link
                    href="/registracija"
                    onClick={(e) => e.stopPropagation()}
                    style={{ marginTop: 20, display: 'block', textDecoration: 'none' }}
                  >
                    <motion.div
                      className="lp-story-cta"
                      whileHover={{ scale: 1.04, boxShadow: '0 22px 55px rgba(212,175,55,0.45)' }}
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
                        boxShadow: '0 14px 40px rgba(212,175,55,0.35)',
                        fontFamily: 'sans-serif',
                        textAlign: 'center',
                      }}
                    >
                      Počni za 5 minuta →
                    </motion.div>
                  </Link>
                ) : null}
              </div>
            </motion.div>

            <div style={{ display: 'flex', gap: 5 }}>
              {SLIDES.map((_, i) => (
                <button
                  key={_.id}
                  type="button"
                  onClick={() => goTo(i, i > cur ? 1 : -1)}
                  style={{
                    flex: 1,
                    height: 3,
                    borderRadius: 2,
                    background: 'rgba(255,255,255,0.1)',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    border: 'none',
                    padding: 0,
                  }}
                >
                  <motion.div
                    style={{
                      height: '100%',
                      borderRadius: 2,
                      background:
                        i < cur ? 'rgba(255,255,255,0.5)' : i === cur ? slide.accent : 'transparent',
                      width: i === cur ? (isLast ? '100%' : `${prog * 100}%`) : i < cur ? '100%' : '0%',
                    }}
                  />
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      <div
        role="presentation"
        onClick={prev}
        style={{ position: 'absolute', left: 0, top: 0, width: '35%', height: '100%', zIndex: 20, cursor: 'pointer' }}
      />
      <div
        role="presentation"
        onClick={next}
        style={{ position: 'absolute', right: 0, top: 0, width: '35%', height: '100%', zIndex: 20, cursor: 'pointer' }}
      />

      {[
        { s: 'left' as const, i: '‹', fn: prev },
        { s: 'right' as const, i: '›', fn: next },
      ].map((b) => (
        <motion.button
          key={b.s}
          type="button"
          className="lp-story-nav-btn"
          onClick={b.fn}
          whileHover={{ opacity: 1, scale: 1.15 }}
          style={{
            position: 'absolute',
            top: '50%',
            transform: 'translateY(-50%)',
            [b.s]: 10,
            zIndex: 30,
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: 'rgba(255,255,255,0.4)',
            borderRadius: '50%',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: 0.4,
            backdropFilter: 'blur(8px)',
          }}
        >
          {b.i}
        </motion.button>
      ))}
    </div>
  )
}
