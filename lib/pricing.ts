export const MJESECNA_CIJENA_EUR = 29.99
export const GODISNJA_CIJENA_EUR = 299
export const DOZIVOTNA_CIJENA_EUR = 1_200

export const PROMO_KOD_OSNIVAC10 = 'Osnivac10'
export const PROMO_DOZIVOTNA_CIJENA_EUR = 500
export const PROMO_MAX_KORISTI = 10

export const PREPORUKE_ZA_POPUST = 3

export type PlanTip = 'mjesečna' | 'godišnja' | 'doživotna'

export function formatCijena(iznos: number): string {
  return iznos.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
}

export function mjesecnaCijenaGodisnje(): number {
  return Math.round((GODISNJA_CIJENA_EUR / 12) * 100) / 100
}

export function uštedaGodisnje(): number {
  return Math.round((MJESECNA_CIJENA_EUR * 12 - GODISNJA_CIJENA_EUR) * 100) / 100
}
