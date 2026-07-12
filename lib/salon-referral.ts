/** Godišnja pretplata i preporuke. */
import { GODISNJA_CIJENA_EUR, PREPORUKE_ZA_POPUST } from './pricing'

export const GODISNJA_CIJENA_SA_REF_EUR = Math.round(GODISNJA_CIJENA_EUR * 0.85) // 15% popusta preko preporuka

export { GODISNJA_CIJENA_EUR, PREPORUKE_ZA_POPUST }

export function godisnjaCijenaZaBrojPreporuka(brojPreporuka: number): number {
  return brojPreporuka >= PREPORUKE_ZA_POPUST ? GODISNJA_CIJENA_SA_REF_EUR : GODISNJA_CIJENA_EUR
}
