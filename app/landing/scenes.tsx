'use client'

import { motion } from 'framer-motion'
import { GOLD, GOLD_DARK, GOLD_LIGHT } from './constants'

export function Scene1() {
  return (
    <>
      {[...Array(7)].map((_, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: `${6 + i * 14}%`,
            top: '5%',
            bottom: '5%',
            width: 1,
            background: 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.025), transparent)',
          }}
        />
      ))}
      <svg
        viewBox="0 0 320 260"
        style={{ position: 'absolute', width: '100%', height: '100%', opacity: 0.18 }}
        preserveAspectRatio="xMidYMid meet"
      >
        <ellipse cx="185" cy="95" rx="22" ry="22" fill="rgba(255,255,255,0.18)" />
        <rect x="168" y="117" width="34" height="70" rx="7" fill="rgba(255,255,255,0.12)" />
        <line x1="168" y1="135" x2="128" y2="118" stroke="rgba(255,255,255,0.12)" strokeWidth="9" strokeLinecap="round" />
        <line x1="106" y1="106" x2="122" y2="130" stroke="rgba(255,255,255,0.25)" strokeWidth="3" strokeLinecap="round" />
        <line x1="122" y1="106" x2="106" y2="130" stroke="rgba(255,255,255,0.25)" strokeWidth="3" strokeLinecap="round" />
        <ellipse cx="128" cy="148" rx="20" ry="20" fill="rgba(255,255,255,0.1)" />
        <rect x="112" y="168" width="32" height="55" rx="6" fill="rgba(255,255,255,0.07)" />
      </svg>

      <motion.div
        animate={{ rotate: [-10, 10, -10], scale: [1, 1.12, 1] }}
        transition={{ duration: 0.38, repeat: Infinity, repeatDelay: 1.6 }}
        style={{ position: 'absolute', top: '12%', right: '10%', zIndex: 6 }}
      >
        <div
          style={{
            width: 58,
            height: 58,
            borderRadius: 16,
            background: 'linear-gradient(145deg,#1c1c1c,#2d2d2d)',
            border: '1.5px solid rgba(231,76,60,0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 30px rgba(231,76,60,0.5), 0 0 80px rgba(231,76,60,0.15)',
            fontSize: 26,
          }}
        >
          📱
        </div>
        {[1, 2, 3].map((r) => (
          <motion.div
            key={r}
            animate={{ scale: [1, 2.6], opacity: [0.55, 0] }}
            transition={{ duration: 1.4, repeat: Infinity, delay: r * 0.3, repeatDelay: 1.2 }}
            style={{ position: 'absolute', inset: 0, borderRadius: 16, border: '1px solid rgba(231,76,60,0.5)' }}
          />
        ))}
      </motion.div>
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          animate={{ opacity: [0, 1, 0], x: [0, 12, 0] }}
          transition={{ duration: 0.7, repeat: Infinity, delay: i * 0.15, repeatDelay: 2 }}
          style={{
            position: 'absolute',
            top: `${30 + i * 5}%`,
            right: '24%',
            width: `${8 + i * 7}px`,
            height: 2,
            background: 'rgba(231,76,60,0.7)',
            borderRadius: 1,
          }}
        />
      ))}
      <motion.div
        animate={{ opacity: [0, 1, 1, 0] }}
        transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 1 }}
        style={{
          position: 'absolute',
          top: '6%',
          right: '8%',
          background: 'rgba(231,76,60,0.12)',
          border: '1px solid rgba(231,76,60,0.3)',
          borderRadius: 8,
          padding: '4px 10px',
          fontSize: 9,
          color: 'rgba(231,76,60,0.8)',
          fontFamily: 'sans-serif',
          letterSpacing: '0.1em',
        }}
      >
        DOLAZNI POZIV
      </motion.div>
    </>
  )
}

export function Scene2() {
  return (
    <>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse at 40% 50%, rgba(55,28,5,0.8) 0%, transparent 70%)',
        }}
      />
      <svg
        viewBox="0 0 360 280"
        style={{ position: 'absolute', width: '100%', height: '100%', opacity: 0.22 }}
        preserveAspectRatio="xMidYMid meet"
      >
        <rect x="130" y="130" width="100" height="70" rx="10" fill="rgba(230,126,34,0.12)" stroke="rgba(230,126,34,0.2)" strokeWidth="1.5" />
        <rect x="145" y="110" width="70" height="30" rx="8" fill="rgba(230,126,34,0.1)" stroke="rgba(230,126,34,0.15)" strokeWidth="1.5" />
        <rect x="118" y="195" width="20" height="40" rx="4" fill="rgba(230,126,34,0.08)" />
        <rect x="222" y="195" width="20" height="40" rx="4" fill="rgba(230,126,34,0.08)" />
        <circle cx="260" cy="60" r="30" fill="none" stroke="rgba(230,126,34,0.2)" strokeWidth="1.5" />
        <line x1="260" y1="60" x2="260" y2="42" stroke="rgba(230,126,34,0.3)" strokeWidth="2" strokeLinecap="round" />
        <line x1="260" y1="60" x2="272" y2="68" stroke="rgba(230,126,34,0.25)" strokeWidth="2" strokeLinecap="round" />
      </svg>

      <motion.div
        animate={{ opacity: [0.3, 0.7, 0.3] }}
        transition={{ duration: 2.5, repeat: Infinity }}
        style={{
          position: 'absolute',
          top: '28%',
          left: '50%',
          transform: 'translateX(-50%)',
          fontSize: 72,
          color: 'rgba(230,126,34,0.25)',
          lineHeight: 1,
        }}
      >
        ✕
      </motion.div>

      {['€', '€', '€'].map((e, i) => (
        <motion.div
          key={i}
          animate={{ y: [0, -60 - i * 20], x: [(i - 1) * 20, (i - 1) * 40], opacity: [0, 0.6, 0] }}
          transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.6, ease: 'easeOut' }}
          style={{
            position: 'absolute',
            bottom: '30%',
            left: `${42 + i * 8}%`,
            fontSize: 18,
            color: 'rgba(230,126,34,0.5)',
            fontFamily: 'Georgia,serif',
          }}
        >
          {e}
        </motion.div>
      ))}

      <motion.div
        animate={{ opacity: [0, 1, 1, 0] }}
        transition={{ duration: 3, repeat: Infinity, repeatDelay: 0.5 }}
        style={{
          position: 'absolute',
          top: '10%',
          right: '8%',
          background: 'rgba(230,126,34,0.1)',
          border: '1px solid rgba(230,126,34,0.3)',
          borderRadius: 8,
          padding: '4px 10px',
          fontSize: 9,
          color: 'rgba(230,126,34,0.75)',
          fontFamily: 'sans-serif',
          letterSpacing: '0.1em',
        }}
      >
        TERMIN PROPUŠTEN
      </motion.div>
    </>
  )
}

export function Scene3() {
  const notes = [
    { top: '10%', left: '5%', rot: -14, text: '14:30 Ana' },
    { top: '18%', left: '58%', rot: 9, text: 'Sreda??' },
    { top: '32%', left: '3%', rot: 6, text: '15h ✓' },
    { top: '8%', left: '32%', rot: -5, text: 'POZOVI!' },
    { top: '48%', left: '65%', rot: -11, text: 'Bojenje' },
    { top: '55%', left: '22%', rot: 8, text: 'Petra 16:30' },
    { top: '28%', left: '40%', rot: -4, text: '???' },
    { top: '42%', left: '10%', rot: 12, text: 'Ne dođe!' },
  ]
  return (
    <>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse at 50% 80%, rgba(30,0,60,0.6) 0%, transparent 70%)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: '8%',
          left: '10%',
          width: 38,
          height: 38,
          borderRadius: '50%',
          background: 'rgba(155,89,182,0.12)',
          border: '1px solid rgba(155,89,182,0.2)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: '8%',
          left: '14%',
          width: 28,
          height: 28,
          borderRadius: '50%',
          background: '#070707',
        }}
      />

      {notes.map((n, i) => (
        <motion.div
          key={i}
          animate={{ y: [0, -5 + (i % 3) * 2, 0], rotate: [n.rot, n.rot + 1.5, n.rot] }}
          transition={{ duration: 3 + i * 0.5, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            position: 'absolute',
            top: n.top,
            left: n.left,
            background: 'rgba(155,89,182,0.08)',
            border: '1px solid rgba(155,89,182,0.22)',
            borderRadius: 5,
            padding: '5px 9px',
            fontSize: 9,
            color: 'rgba(155,89,182,0.65)',
            fontFamily: 'monospace',
            transform: `rotate(${n.rot}deg)`,
            whiteSpace: 'nowrap',
          }}
        >
          {n.text}
        </motion.div>
      ))}

      <motion.div
        animate={{ opacity: [0, 1, 1, 0] }}
        transition={{ duration: 4, repeat: Infinity }}
        style={{
          position: 'absolute',
          bottom: '35%',
          right: '8%',
          background: 'rgba(155,89,182,0.1)',
          border: '1px solid rgba(155,89,182,0.25)',
          borderRadius: 8,
          padding: '4px 10px',
          fontSize: 9,
          color: 'rgba(155,89,182,0.7)',
          fontFamily: 'monospace',
          letterSpacing: '0.1em',
        }}
      >
        02:17 AM
      </motion.div>
    </>
  )
}

export function Scene4() {
  return (
    <>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse at 50% 90%, rgba(46,204,113,0.08) 0%, transparent 60%)',
        }}
      />

      <motion.div
        animate={{ opacity: [0.1, 0.35, 0.1] }}
        transition={{ duration: 3, repeat: Infinity }}
        style={{
          position: 'absolute',
          bottom: '32%',
          left: 0,
          right: 0,
          height: 1,
          background: 'linear-gradient(to right, transparent, rgba(46,204,113,0.4), transparent)',
        }}
      />

      {[...Array(5)].map((_, i) => (
        <motion.div
          key={i}
          animate={{ scaleY: [0, 1, 0], opacity: [0, 0.15, 0] }}
          transition={{ duration: 4, repeat: Infinity, delay: i * 0.4, ease: 'easeInOut' }}
          style={{
            position: 'absolute',
            bottom: '32%',
            left: `${30 + i * 8}%`,
            width: 1,
            height: `${30 + i * 8}%`,
            background: 'linear-gradient(to top, rgba(46,204,113,0.5), transparent)',
            transformOrigin: 'bottom',
          }}
        />
      ))}

      <motion.div
        animate={{ y: [0, -12, 0], opacity: [0.15, 0.35, 0.15] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'absolute',
          top: '15%',
          right: '8%',
          fontSize: 120,
          color: 'rgba(46,204,113,0.12)',
          fontFamily: 'Georgia,serif',
          lineHeight: 1,
          userSelect: 'none',
        }}
      >
        ?
      </motion.div>

      {[...Array(12)].map((_, i) => {
        const left = 20 + ((i * 37) % 55)
        const delay = (i * 0.25) % 3
        const dur = 3 + (i % 3) * 0.5
        const yMax = 30 + (i * 17) % 60
        return (
          <motion.div
            key={i}
            animate={{ y: [0, -yMax], opacity: [0, 0.5, 0] }}
            transition={{ duration: dur, repeat: Infinity, delay, ease: 'easeOut' }}
            style={{
              position: 'absolute',
              left: `${left}%`,
              bottom: '32%',
              width: 2,
              height: 2,
              borderRadius: '50%',
              background: 'rgba(46,204,113,0.5)',
            }}
          />
        )
      })}
    </>
  )
}

export function Scene5() {
  return (
    <>
      {[...Array(8)].map((_, i) => (
        <motion.div
          key={i}
          animate={{ opacity: [0.04, 0.12, 0.04] }}
          transition={{ duration: 3 + i * 0.4, repeat: Infinity, delay: i * 0.3 }}
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: 2,
            height: '60%',
            background: `linear-gradient(to bottom, ${GOLD}44, transparent)`,
            transformOrigin: 'top center',
            transform: `translateX(-50%) rotate(${i * 45}deg)`,
          }}
        />
      ))}

      <svg
        viewBox="0 0 360 280"
        style={{ position: 'absolute', width: '100%', height: '100%', opacity: 0.28 }}
        preserveAspectRatio="xMidYMid meet"
      >
        <ellipse cx="180" cy="108" rx="25" ry="25" fill={`${GOLD}55`} />
        <rect x="162" y="133" width="36" height="65" rx="8" fill={`${GOLD}33`} />
        <line x1="162" y1="152" x2="112" y2="128" stroke={`${GOLD}44`} strokeWidth="11" strokeLinecap="round" />
        <line x1="198" y1="152" x2="248" y2="128" stroke={`${GOLD}44`} strokeWidth="11" strokeLinecap="round" />
      </svg>

      {['📱 QR booking', '📅 24/7 termini', '💬 Auto obaveštenja', '📊 Analitika'].map((label, i) => (
        <motion.div
          key={label}
          initial={{ opacity: 0, x: i % 2 === 0 ? -20 : 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 + i * 0.2 }}
          style={{
            position: 'absolute',
            top: `${14 + i * 14}%`,
            left: i % 2 === 0 ? '5%' : undefined,
            right: i % 2 !== 0 ? '5%' : undefined,
            background: 'rgba(212,175,55,0.1)',
            border: `1px solid ${GOLD}44`,
            borderRadius: 20,
            padding: '5px 12px',
            fontSize: 9,
            color: `${GOLD}cc`,
            fontFamily: 'sans-serif',
            letterSpacing: '0.08em',
            whiteSpace: 'nowrap',
          }}
        >
          {label}
        </motion.div>
      ))}

      {[...Array(14)].map((_, i) => {
        const left = 5 + ((i * 13) % 90)
        const top = 35 + ((i * 19) % 50)
        const w = 1.5 + (i % 4) * 0.6
        const h = 1.5 + ((i * 3) % 4) * 0.6
        const yM = 40 + (i * 11) % 80
        const dur = 2.5 + (i % 5) * 0.4
        const del = (i * 0.31) % 4
        return (
          <motion.div
            key={i}
            animate={{ y: [0, -yM], opacity: [0, 0.7, 0] }}
            transition={{ duration: dur, repeat: Infinity, delay: del, ease: 'easeOut' }}
            style={{
              position: 'absolute',
              left: `${left}%`,
              top: `${top}%`,
              width: w,
              height: h,
              borderRadius: '50%',
              background: GOLD,
            }}
          />
        )
      })}
    </>
  )
}

export function Scene6() {
  return (
    <>
      {[...Array(20)].map((_, i) => {
        const left = 5 + ((i * 17) % 90)
        const top = 30 + ((i * 23) % 55)
        const yM = 60 + (i * 19) % 100
        const dur = 3 + (i % 6) * 0.4
        const del = (i * 0.27) % 5
        const x0 = ((i % 5) - 2) * 6
        const x1 = ((i % 7) - 3) * 10
        return (
          <motion.div
            key={i}
            animate={{ y: [0, -yM], opacity: [0, 0.9, 0], x: [x0, x1] }}
            transition={{ duration: dur, repeat: Infinity, delay: del, ease: 'easeOut' }}
            style={{
              position: 'absolute',
              left: `${left}%`,
              top: `${top}%`,
              width: 2 + (i % 5) * 0.7,
              height: 2 + (i % 5) * 0.7,
              borderRadius: '50%',
              background: i % 3 === 0 ? GOLD_LIGHT : i % 3 === 1 ? GOLD : GOLD_DARK,
            }}
          />
        )
      })}

      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          animate={{ scale: [0.8, 1.3, 0.8], opacity: [0.05, 0.15, 0.05] }}
          transition={{ duration: 4 + i * 0.5, repeat: Infinity, delay: i * 0.4 }}
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%,-50%)',
            width: `${120 + i * 40}px`,
            height: `${120 + i * 40}px`,
            borderRadius: '50%',
            border: `1px solid ${GOLD}33`,
          }}
        />
      ))}

      {['Bez ugovora ✓', 'Bez kartice ✓', 'Setup za 5 min ✓', 'Podrška 24/7 ✓'].map((label, i) => (
        <motion.div
          key={label}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 + i * 0.2 }}
          style={{
            position: 'absolute',
            top: `${12 + i * 13}%`,
            left: i % 2 === 0 ? '5%' : undefined,
            right: i % 2 !== 0 ? '5%' : undefined,
            background: 'rgba(212,175,55,0.12)',
            border: `1px solid ${GOLD}55`,
            borderRadius: 20,
            padding: '5px 14px',
            fontSize: 9,
            color: `${GOLD}ee`,
            fontFamily: 'sans-serif',
            letterSpacing: '0.08em',
            whiteSpace: 'nowrap',
          }}
        >
          {label}
        </motion.div>
      ))}
    </>
  )
}

export const SCENES = [Scene1, Scene2, Scene3, Scene4, Scene5, Scene6]
