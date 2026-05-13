/** Datum/vreme u Europe/Belgrade ↔ UTC ISO za `timestamptz` u bazi. */

const TZ = 'Europe/Belgrade'

function deloviUZoni(ms: number): { y: number; mo: number; da: number; h: number; mi: number } {
  const f = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  const parts = f.formatToParts(new Date(ms))
  const g = (t: Intl.DateTimeFormatPart['type']) => parts.find((p) => p.type === t)?.value ?? ''
  return {
    y: parseInt(g('year'), 10),
    mo: parseInt(g('month'), 10),
    da: parseInt(g('day'), 10),
    h: parseInt(g('hour'), 10),
    mi: parseInt(g('minute'), 10),
  }
}

/** ISO UTC za datume u kalendaru + vreme koje korisnik unosi kao lokalno u Srbiji. */
export function srbijaDatumVrijemeKaIsoUtc(datum: string, vrijeme: string): string {
  const [y, mo, da] = datum.split('-').map((x) => parseInt(x, 10))
  const [hh, mm] = vrijeme.split(':').map((x) => parseInt(x, 10))
  if ([y, mo, da, hh, mm].some((n) => Number.isNaN(n))) {
    throw new Error('Neispravan datum ili vreme.')
  }
  const start = Date.UTC(y, mo - 1, da, 0, 0, 0, 0) - 5 * 60 * 60 * 1000
  const end = Date.UTC(y, mo - 1, da + 1, 0, 0, 0, 0) + 5 * 60 * 60 * 1000
  for (let t = start; t <= end; t += 60 * 1000) {
    const p = deloviUZoni(t)
    if (p.y === y && p.mo === mo && p.da === da && p.h === hh && p.mi === mm) {
      return new Date(t).toISOString()
    }
  }
  throw new Error('Neispravan datum ili vreme.')
}

/** Polja forme (YYYY-MM-DD i HH:mm) iz vrednosti iz baze (ISO). */
export function datumIVremeFormaIzIsoBelgrad(iso: string): { datum: string; vrijeme: string } {
  const p = deloviUZoni(new Date(iso).getTime())
  return {
    datum: `${p.y}-${String(p.mo).padStart(2, '0')}-${String(p.da).padStart(2, '0')}`,
    vrijeme: `${String(p.h).padStart(2, '0')}:${String(p.mi).padStart(2, '0')}`,
  }
}

/** Kalendar dan u Beogradu za ISO UTC (npr. za RPC `p_dan`). */
export function datumKljucBelgrad(iso: string): string {
  return new Date(iso).toLocaleDateString('en-CA', { timeZone: TZ })
}
