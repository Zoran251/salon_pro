/** Maksimalna veličina fajla pre kompresije (kao kod logoa / zaposlenih). */
export const MAX_USLUGA_SLIKA_ULAZ_BYTES = 2 * 1024 * 1024

/**
 * Učitava sliku u pregledaču, smanji je do maxEdge px po dužoj strani i vrati JPEG data URL.
 * Koristi se za usluge (Supabase kolona text — kraći zapis od sirovog PNG).
 */
export async function fileToUslugaSlikaDataUrl(
  file: File,
  opts?: { maxEdge?: number; quality?: number },
): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Izaberite sliku (JPG, PNG ili WebP).')
  }
  if (file.size > MAX_USLUGA_SLIKA_ULAZ_BYTES) {
    throw new Error('Slika je prevelika. Maksimalno 2 MB pre otpremanja.')
  }
  const maxEdge = opts?.maxEdge ?? 960
  const quality = opts?.quality ?? 0.82

  try {
    const bitmap = await createImageBitmap(file)
    try {
      let w = bitmap.width
      let h = bitmap.height
      const scale = Math.min(1, maxEdge / Math.max(w, h))
      w = Math.max(1, Math.round(w * scale))
      h = Math.max(1, Math.round(h * scale))
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Pregledač ne podržava obradu slike.')
      ctx.drawImage(bitmap, 0, 0, w, h)
      const out = canvas.toDataURL('image/jpeg', quality)
      if (out.length > 1_200_000) {
        throw new Error('Slika je i posle smanjenja prevelika. Probaj manju ili drugu fotografiju.')
      }
      return out
    } finally {
      bitmap.close()
    }
  } catch {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const r = reader.result
        if (typeof r === 'string') resolve(r)
        else reject(new Error('Čitanje slike nije uspelo.'))
      }
      reader.onerror = () => reject(new Error('Čitanje slike nije uspelo.'))
      reader.readAsDataURL(file)
    })
  }
}
