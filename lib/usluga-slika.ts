/** Maksimalna veličina fajla pre obrade (kao kod logoa / zaposlenih). */
export const MAX_USLUGA_SLIKA_ULAZ_BYTES = 2 * 1024 * 1024

/** Maksimalna dužina data URL stringa za kolonu `text` (rezerva za Postgres/REST). */
const MAX_DATA_URL_CHARS = 1_200_000

function bitmapToPngDataUrl(bitmap: ImageBitmap, maxEdge: number): string {
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
  return canvas.toDataURL('image/png')
}

/**
 * Učitava sliku iz pregledača, smanji je i vrati PNG data URL (isto kao logo / foto zaposlenog u `saloni.logo_url` i `zaposleni.foto_url`).
 */
export async function fileToUslugaSlikaDataUrl(
  file: File,
  opts?: { maxEdge?: number },
): Promise<string> {
  const ime = file.name?.toLowerCase() || ''
  if (ime.endsWith('.heic') || ime.endsWith('.heif') || file.type === 'image/heic' || file.type === 'image/heif') {
    throw new Error(
      'HEIC/HEIF (često iPhone) pregledač obično ne obrađuje. Uključite „Najkompatibilnije“ u podešavanjima kamere ili izvezite fotografiju kao JPEG/PNG, pa pokušajte ponovo.',
    )
  }
  if (!file.type.startsWith('image/')) {
    throw new Error('Izaberite sliku (npr. JPG, PNG ili WebP).')
  }
  if (file.size > MAX_USLUGA_SLIKA_ULAZ_BYTES) {
    throw new Error('Slika je prevelika. Maksimalno 2 MB pre otpremanja.')
  }

  try {
    const bitmap = await createImageBitmap(file)
    try {
      let maxEdge = opts?.maxEdge ?? 720
      let out = bitmapToPngDataUrl(bitmap, maxEdge)
      while (out.length > MAX_DATA_URL_CHARS && maxEdge > 160) {
        maxEdge = Math.max(160, Math.round(maxEdge * 0.72))
        out = bitmapToPngDataUrl(bitmap, maxEdge)
      }
      if (out.length > MAX_DATA_URL_CHARS) {
        throw new Error('Slika je i posle smanjenja prevelika. Probaj jednostavniju sliku ili manju rezoluciju.')
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
        if (typeof r !== 'string') {
          reject(new Error('Čitanje slike nije uspelo.'))
          return
        }
        if (r.length > MAX_DATA_URL_CHARS) {
          reject(new Error('Slika je prevelika za snimanje. Smanjite je ili izvezite kao manji PNG/JPEG.'))
          return
        }
        resolve(r)
      }
      reader.onerror = () => reject(new Error('Čitanje slike nije uspelo.'))
      reader.readAsDataURL(file)
    })
  }
}
