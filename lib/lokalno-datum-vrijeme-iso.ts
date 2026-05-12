/**
 * Polja iz forme (datum YYYY-MM-DD, vreme HH:mm) tumače se kao lokalno vreme u pregledaču korisnika.
 * Vraća ISO 8601 u UTC pogodan za kolonu `timestamptz` — isti trenutak za salon, kupca i bazu.
 */
export function lokalnoDatumVrijemeKaIsoUtc(datum: string, vrijeme: string): string {
  const dStr = datum.trim()
  const tRaw = vrijeme.trim()
  const parts = tRaw.split(':')
  const h = parseInt(parts[0] ?? '', 10)
  const m = parseInt(parts[1] ?? '', 10)
  if (!dStr || Number.isNaN(h) || Number.isNaN(m)) {
    throw new Error('Neispravan datum ili vreme')
  }
  const tNorm = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
  const d = new Date(`${dStr}T${tNorm}:00`)
  if (Number.isNaN(d.getTime())) {
    throw new Error('Neispravan datum ili vreme')
  }
  return d.toISOString()
}
