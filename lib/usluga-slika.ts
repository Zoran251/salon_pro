/** Maksimalna veličina fajla pre obrade (kao kod logoa / zaposlenih). */
export const MAX_USLUGA_SLIKA_ULAZ_BYTES = 2 * 1024 * 1024

/** Maksimalna dužina data URL stringa za kolonu `text` (rezerva za Postgres/REST). */
const MAX_DATA_URL_CHARS = 1_200_000

/** Poznati sufiksi + prazan MIME (često iOS/Android galerija) — ne oslanjamo se samo na `file.type`. */
function jeVerovatnoSlikaFajl(file: File): boolean {
  const t = (file.type || '').trim().toLowerCase()
  if (t.startsWith('image/')) return true
  const ime = file.name?.toLowerCase() || ''
  if (
    /\.(jpe?g|jfif|pjpeg|pjp|png|apng|gif|webp|bmp|dib|tiff?|svg|svgz|heic|heif|avif|ico|raw|cr2|nef|arw|dng)$/i.test(
      ime,
    )
  ) {
    return true
  }
  if (!t && file.size > 0) return true
  return false
}

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
  if (file.size > MAX_USLUGA_SLIKA_ULAZ_BYTES) {
    throw new Error('Slika je prevelika. Maksimalno 2 MB pre otpremanja.')
  }
  if (!jeVerovatnoSlikaFajl(file)) {
    throw new Error(
      'Fajl ne izgleda kao slika. Probaj JPG, PNG, WebP, GIF, HEIC/HEIF ili drugi uobičajeni format; na telefonu izaberi „fotografija“ iz galerije.',
    )
  }

  let bitmap: ImageBitmap | null = null
  try {
    bitmap = await createImageBitmap(file)
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
      bitmap = null
    }
  } catch {
    // Dekodiranje u canvas ne uspeva (npr. neki HEIC u Chrome-u, TIFF, prazan MIME) — isto kao logo: raw data URL.
  } finally {
    if (bitmap) {
      try {
        bitmap.close()
      } catch {
        /* noop */
      }
    }
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const r = reader.result
      if (typeof r !== 'string') {
        reject(new Error('Čitanje slike nije uspelo. Probaj drugi format ili drugi pregledač.'))
        return
      }
      if (!r.startsWith('data:image/') && !r.startsWith('data:application/octet-stream')) {
        reject(
          new Error(
            'Pregledač nije prepoznao sliku. Sačuvaj kao JPG ili PNG pa ponovo izaberi fajl, ili probaj u Chrome/Safari.',
          ),
        )
        return
      }
      if (r.length > MAX_DATA_URL_CHARS) {
        reject(new Error('Slika je prevelika za snimanje. Smanjite je ili izvezite kao manji JPG/PNG.'))
        return
      }
      resolve(r)
    }
    reader.onerror = () => reject(new Error('Čitanje fajla nije uspelo.'))
    reader.readAsDataURL(file)
  })
}
