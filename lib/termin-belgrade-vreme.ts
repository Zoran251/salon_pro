/**
 * Jedinstveno vreme za termin: čuvanje u bazi kao timestamptz (UTC),
 * prikaz i unos uvek u Europe/Belgrade.
 */
import { fromZonedTime } from 'date-fns-tz/fromZonedTime'

export const EUROPE_BELGRADE = 'Europe/Belgrade'

/** YYYY-MM-DD u Belgradu za dati trenutak (npr. grupisanje termina po danu). */
export function datumKljucBelgrad(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: EUROPE_BELGRADE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d)
}

/** HH:mm u Belgradu. */
export function formatVremeBelgrad(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: EUROPE_BELGRADE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(d)
  const h = parts.find((p) => p.type === 'hour')?.value
  const m = parts.find((p) => p.type === 'minute')?.value
  return h && m ? `${h}:${m}` : ''
}

/** Samo datum (dd.mm.yyyy) u Belgradu. */
export function formatDatumBelgrad(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return new Intl.DateTimeFormat('sr-Latn-RS', {
    timeZone: EUROPE_BELGRADE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d)
}

/** Datum i vreme za prikaz korisniku. */
export function formatDatumVrijemeBelgrad(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return new Intl.DateTimeFormat('sr-Latn-RS', {
    timeZone: EUROPE_BELGRADE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d)
}

/** Kalendarski dan (YYYY-MM-DD) → dugi format dana u Belgradu. */
export function formatDateLabelBelgrade(dateKey: string): string {
  const d = fromZonedTime(`${dateKey} 12:00:00`, EUROPE_BELGRADE)
  if (Number.isNaN(d.getTime())) return 'Izabrani dan'
  return new Intl.DateTimeFormat('sr-Latn-RS', {
    timeZone: EUROPE_BELGRADE,
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(d)
}

/**
 * Klijent šalje "YYYY-MM-DDTHH:mm" ili "...THH:mm:ss" bez zone = belgradski zidni sat.
 * Vraća pun ISO UTC string za Supabase timestamptz.
 */
export function naivniBelgradDatumVremeUUtcIso(raw: string): string | null {
  const s = raw.trim()
  if (!s) return null
  if (/Z$/i.test(s) || /[+-]\d{2}:\d{2}$/.test(s) || /[+-]\d{4}$/.test(s)) {
    const d = new Date(s)
    return Number.isNaN(d.getTime()) ? null : d.toISOString()
  }
  const m = s.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})(?::(\d{2}))?$/)
  if (!m) return null
  const sec = m[3] ?? '00'
  const localStr = `${m[1]} ${m[2]}:${sec}`
  const d = fromZonedTime(localStr, EUROPE_BELGRADE)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString()
}

/** Za poređenje dva termina (ISO iz baze ili naivni string sa forme). */
export function ujednacenoDatumVremeBelgrad(isoIliNaivni: string): string {
  const s = isoIliNaivni.trim().replace(' ', 'T')
  const utcIso = naivniBelgradDatumVremeUUtcIso(s)
  const inst = utcIso ? new Date(utcIso) : new Date(s)
  if (Number.isNaN(inst.getTime())) return s
  const iso = inst.toISOString()
  return `${datumKljucBelgrad(iso)}T${formatVremeBelgrad(iso)}`
}
