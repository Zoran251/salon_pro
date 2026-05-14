export const GOLD = '#d4af37'
export const GOLD_DARK = '#a07d10'
export const GOLD_LIGHT = '#f0d060'
export const BG = '#070707'
export const CARD = '#111111'

export type SlideData = {
  id: number
  phase: string
  bg: string
  accent: string
  accentGlow: string
  headline: string
  body: string
  sub: string
  cta?: boolean
}

export const SLIDES: SlideData[] = [
  {
    id: 1,
    phase: 'TVOJ DAN',
    bg: 'radial-gradient(ellipse at 55% 35%, #2a0800 0%, #070707 68%)',
    accent: '#e74c3c',
    accentGlow: 'rgba(231,76,60,0.22)',
    headline: 'Makaze u ruci.\nTelefon zvoni.',
    body: 'Klijent ispred tebe. Još jedan čeka termin. A ti moraš da staviš sve na pauzu — jer ako ne odgovoriš, gubi se rezervacija.',
    sub: 'Svaki dan. Svaki sat. Bez prestanka.',
  },
  {
    id: 2,
    phase: 'SVAKE NEDELJE',
    bg: 'radial-gradient(ellipse at 45% 55%, #1f1200 0%, #070707 68%)',
    accent: '#e67e22',
    accentGlow: 'rgba(230,126,34,0.22)',
    headline: 'Neko se ne pojavi.\nTi gubiš sat života.',
    body: 'Sat zauzet. Klijent ne dođe. Ni poruku nije poslao. Ti sjediš, čekaš i gledaš kako novac odlazi.',
    sub: 'No-show ubija raspored. I volju za posao.',
  },
  {
    id: 3,
    phase: 'SVAKE NOĆI',
    bg: 'radial-gradient(ellipse at 30% 70%, #0a0014 0%, #070707 68%)',
    accent: '#9b59b6',
    accentGlow: 'rgba(155,89,182,0.2)',
    headline: 'Kada svi odu —\nti još radiš.',
    body: 'Termini u WhatsAppu, papirima, glavi. Prepisuješ, brišeš, zaboravljaš. Umoran si — ali sutra počinje sve iznova.',
    sub: 'Nije lijenost. Jednostavno — sistem te iscrpljuje.',
  },
  {
    id: 4,
    phase: 'PITANJE',
    bg: 'radial-gradient(ellipse at 50% 50%, #001a0f 0%, #070707 68%)',
    accent: '#2ecc71',
    accentGlow: 'rgba(46,204,113,0.18)',
    headline: 'Šta ako ne mora\nbiti ovako?',
    body: 'Šta ako klijenti sami zakazuju — dok spavaš? Šta ako podsjetnik ode automatski? Šta ako ti samo radiš ono što voliš?',
    sub: 'Nije san. To je sistem koji već postoji.',
  },
  {
    id: 5,
    phase: 'RJEŠENJE',
    bg: 'radial-gradient(ellipse at 50% 30%, #1a1400 0%, #070707 68%)',
    accent: GOLD,
    accentGlow: 'rgba(212,175,55,0.22)',
    headline: 'Salon Pro.\nRadi dok ti se odmaraš.',
    body: 'Klijenti zakazuju sami 24/7. Podsjetnici idu automatski. Lager se prati u realnom vremenu. Ti samo uživaš u poslu.',
    sub: 'QR kod · Online booking · Email obaveštenja · Analitika',
  },
  {
    id: 6,
    phase: 'POČNI DANAS',
    bg: 'radial-gradient(ellipse at 50% 30%, #1a1400 0%, #070707 68%)',
    accent: GOLD,
    accentGlow: 'rgba(212,175,55,0.28)',
    headline: '29,99€ / mj.\nBez ugovora.',
    body: 'Postavi za 5 minuta. Otkaži kad hoćeš. Hiljade vlasnika salona više ne čekaju telefon.',
    sub: 'Prve 2 sedmice besplatno. Kartica nije potrebna.',
    cta: true,
  },
]
