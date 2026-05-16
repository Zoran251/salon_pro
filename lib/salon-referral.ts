/** Godišnja pretplata Pamet — standard i posle 3 uspešne preporuke salona. */
export const GODISNJA_CIJENA_EUR = 360
export const GODISNJA_CIJENA_SA_REF_EUR = 250
export const PREPORUKE_ZA_POPUST = 3

export function godisnjaCijenaZaBrojPreporuka(brojPreporuka: number): number {
  return brojPreporuka >= PREPORUKE_ZA_POPUST ? GODISNJA_CIJENA_SA_REF_EUR : GODISNJA_CIJENA_EUR
}
