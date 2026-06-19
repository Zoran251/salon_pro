/** Pretvara #RRGGBB u rgba(r,g,b,a). Vraća fallback ako hex nije validan. */
export function hexToRgba(hex: string, alpha: number, fallback = 'rgba(212,175,55,1)'): string {
  const normalized = hex.trim().replace(/^#/, '')
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return fallback.replace(/,\s*[\d.]+\)$/, `, ${alpha})`)
  const r = parseInt(normalized.slice(0, 2), 16)
  const g = parseInt(normalized.slice(2, 4), 16)
  const b = parseInt(normalized.slice(4, 6), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

export const DEFAULT_BRAND_COLORS = {
  primarna: '#d4af37',
  sekundarna: '#121212',
  akcent: '#f5e17a',
  font: '#f5f0e8',
} as const
