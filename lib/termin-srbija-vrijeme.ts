/**
 * Termini u bazi su `timestamptz` (tačan trenutak). Za salon u Srbiji/BiH
 * prikaz i formular tretiraju zidni sat u zoni Europe/Belgrade — isto što
 * korisnik očekuje kada u Supabase vidi UTC (+00) a u aplikaciji lokalno vreme.
 */

const TZ = 'Europe/Belgrade'

function deloviZidaBelgrad(ms: number): { y: number; mo: number; da: number; h: number; mi: number } {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  const o: Record<string, string> = {}
  for (const x of fmt.formatToParts(new Date(ms))) {
    if (x.type !== 'literal') o[x.type] = x.value
  }
  return {
    y: Number(o.year),
    mo: Number(o.month),
    da: Number(o.day),
    h: Number(o.hour),
    mi: Number(o.minute),
  }
}

function ključZida(p: { y: number; mo: number; da: number; h: number; mi: number }): number {
  return (((((p.y * 100 + p.mo) * 100 + p.da) * 100 + p.h) * 100 + p.mi))
}

/** YYYY-MM-DD kalendarskog dana u Beogradu za dati trenutak (ISO string iz baze). */
export function datumKljucBelgrad(iso: string): string {
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return ''
  const p = deloviZidaBelgrad(t)
  return `${String(p.y).padStart(4, '0')}-${String(p.mo).padStart(2, '0')}-${String(p.da).padStart(2, '0')}`
}

/** HH:mm u Beogradu. */
export function satiMinutiBelgrad(iso: string): string {
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return ''
  const p = deloviZidaBelgrad(t)
  return `${String(p.h).padStart(2, '0')}:${String(p.mi).padStart(2, '0')}`
}

/** Samo datum (bez sata), za kartice i podnaslove. */
export function formatKratkiDatumBelgrad(iso: string): string {
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return ''
  return new Intl.DateTimeFormat('sr-Latn-RS', {
    timeZone: TZ,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(t))
}

/** Jedan red za listu / karticu. */
export function formatDatumVrijemeBelgrad(iso: string): string {
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return ''
  return new Intl.DateTimeFormat('sr-Latn-RS', {
    timeZone: TZ,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(t))
}

/** Polja `<input type="date">` i `<input type="time">` iz vrednosti iz baze. */
export function datumIVremeFormaIzIsoBelgrad(iso: string): { datum: string; vrijeme: string } {
  return { datum: datumKljucBelgrad(iso), vrijeme: satiMinutiBelgrad(iso) }
}

/**
 * Polja forme (datum YYYY-MM-DD, vreme HH:mm) = zidni sat u Beogradu.
 * Vraća ISO UTC za `timestamptz` (isti trenutak kao u Supabase).
 */
export function srbijaDatumVrijemeKaIsoUtc(datum: string, vrijeme: string): string {
  const dStr = datum.trim()
  const tRaw = vrijeme.trim()
  const tp = tRaw.split(':')
  const wantH = parseInt(tp[0] ?? '', 10)
  const wantM = parseInt(tp[1] ?? '', 10)
  if (!dStr || Number.isNaN(wantH) || Number.isNaN(wantM)) {
    throw new Error('Neispravan datum ili vreme')
  }
  const dp = dStr.split('-').map((x) => parseInt(x, 10))
  const Y = dp[0]
  const Mo = dp[1]
  const Da = dp[2]
  if (!Y || Number.isNaN(Mo) || Number.isNaN(Da)) {
    throw new Error('Neispravan datum')
  }

  const want = ključZida({ y: Y, mo: Mo, da: Da, h: wantH, mi: wantM })

  let lo = Date.UTC(Y, Mo - 1, Da, 0, 0, 0, 0) - 50 * 3600000
  let hi = Date.UTC(Y, Mo - 1, Da, 23, 59, 0, 0) + 50 * 3600000
  let ans = -1
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    const wk = ključZida(deloviZidaBelgrad(mid))
    if (wk >= want) {
      ans = mid
      hi = mid - 1
    } else {
      lo = mid + 1
    }
  }
  if (ans < 0 || ključZida(deloviZidaBelgrad(ans)) !== want) {
    throw new Error('Neispravan datum ili vreme')
  }
  return new Date(ans).toISOString()
}

/** Za poređenje dva ISO zapisa (npr. pending termin vs lista) — ista kalendarska minuta u UTC. */
export function terminMinutKljučUtc(iso: string): number {
  const t = Date.parse(iso.replace(' ', 'T'))
  return Number.isNaN(t) ? NaN : Math.floor(t / 60000)
}
