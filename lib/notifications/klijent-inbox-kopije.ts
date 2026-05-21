/**
 * Kanonski tekst obaveštenja kupcu kada salon potvrdi termin (crna lista, rok od 6 sati).
 * Koristi se u API odgovoru da UI uvek prikaže upozorenje, i bez primene SQL migracije na projekat.
 */
export const potvrdaTerminaNotifikacijaNaslov = 'Termin vam je potvrđen'

export const potvrdaTerminaNotifikacijaTelo =
  'Termin vam je potvrđen. Ukoliko dođe do izmena obavite ih najkasnije 6 sati pre vašeg termina kako bi izbegli blokiranje naloga. Zahvalan vam je Salon pro, odgovornost čini razliku.'

export function normalizujNotifikacijeZaKupca<T extends { tip: string; title: string; body: string }>(
  rows: T[] | null | undefined
): T[] {
  if (!rows?.length) return rows ?? []
  return rows.map((row) =>
    row.tip === 'appointment_confirmed'
      ? { ...row, title: potvrdaTerminaNotifikacijaNaslov, body: potvrdaTerminaNotifikacijaTelo }
      : row
  )
}
