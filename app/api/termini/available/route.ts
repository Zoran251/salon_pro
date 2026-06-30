import { NextRequest, NextResponse } from 'next/server'
import { getPublicSupabaseEnv } from '@/lib/env-supabase'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

let trajanjeCache: Record<string, number> = {}

async function getUslugaTrajanje(supabase: any, usluga_id: string, salon_id: string): Promise<number> {
  const key = `${salon_id}_${usluga_id}`
  if (trajanjeCache[key] !== undefined) return trajanjeCache[key]
  const { data } = await supabase.from('usluge').select('trajanje').eq('id', usluga_id).eq('salon_id', salon_id).maybeSingle() as any
  const t = data?.trajanje ? Math.max(5, Math.min(480, Number(data.trajanje))) : 30
  trajanjeCache[key] = t
  return t
}

export async function GET(request: NextRequest) {
  const salon_id = request.nextUrl.searchParams.get('salon_id')
  const datum = request.nextUrl.searchParams.get('datum')
  const usluga_id = request.nextUrl.searchParams.get('usluga_id')
  const zaposleni_id = request.nextUrl.searchParams.get('zaposleni_id')

  if (!salon_id || !datum) {
    return NextResponse.json({ error: 'salon_id i datum su obavezni' }, { status: 400 })
  }

  const { url, anonKey, ok } = getPublicSupabaseEnv()
  if (!ok) return NextResponse.json({ error: 'Server config error' }, { status: 500 })

  const supabase = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: rawSalon } = await supabase
    .from('saloni')
    .select('radno_od, radno_do, radni_dani_od, radni_dani_do, subota_od, subota_do, nedelja_od, nedelja_do, nedelja_zatvoreno')
    .eq('id', salon_id)
    .single() as any

  if (!rawSalon) return NextResponse.json({ available: [] })

  const datumDate = new Date(datum + 'T12:00:00+02:00')
  const dow = datumDate.getDay()

  if (dow === 0 && rawSalon.nedelja_zatvoreno) return NextResponse.json({ available: [] })

  let od: string | null = null
  let do_: string | null = null

  if (dow === 0) {
    od = rawSalon.nedelja_od || rawSalon.radno_od || null
    do_ = rawSalon.nedelja_do || rawSalon.radno_do || null
  } else if (dow === 6) {
    od = rawSalon.subota_od || rawSalon.radni_dani_od || rawSalon.radno_od || null
    do_ = rawSalon.subota_do || rawSalon.radni_dani_do || rawSalon.radno_do || null
  } else {
    od = rawSalon.radni_dani_od || rawSalon.radno_od || null
    do_ = rawSalon.radni_dani_do || rawSalon.radno_do || null
  }

  if (!od || !do_) return NextResponse.json({ available: [] })

  const [oh, om] = od.split(':').map(Number)
  const [dh, dm] = do_.split(':').map(Number)
  const otvorenoMin = oh * 60 + (om || 0)
  const zatvorenoMin = dh * 60 + (dm || 0)
  if (zatvorenoMin <= otvorenoMin) return NextResponse.json({ available: [] })

  let trajanje = 30
  if (usluga_id) {
    const { data: usluga } = await supabase
      .from('usluge')
      .select('trajanje')
      .eq('id', usluga_id)
      .eq('salon_id', salon_id)
      .maybeSingle() as any
    if (usluga?.trajanje) trajanje = Math.max(5, Math.min(480, Number(usluga.trajanje)))
  }

  const dayStart = datum + 'T00:00:00.000Z'
  const dayEnd = datum + 'T23:59:59.999Z'

  let query = supabase
    .from('termini')
    .select('datum_vrijeme, usluga_id')
    .eq('salon_id', salon_id)
    .gte('datum_vrijeme', dayStart)
    .lt('datum_vrijeme', dayEnd)
    .not('status', 'in', '("otkazan","nije_dosao")')

  if (zaposleni_id) {
    query = query.eq('zaposleni_id', zaposleni_id)
  }

  const { data: appointments } = await query as any

  const fmtTime = new Intl.DateTimeFormat('en', { hour: 'numeric', minute: 'numeric', hourCycle: 'h23', timeZone: 'Europe/Belgrade' })

  const bookedMinutes = new Set<number>()
  if (appointments) {
    for (const apt of appointments) {
      const d = new Date(apt.datum_vrijeme)
      const [h, m] = fmtTime.format(d).split(':').map(Number)
      const startMin = h * 60 + (m || 0)
      const aptTrajanje = apt.usluga_id ? await getUslugaTrajanje(supabase, apt.usluga_id, salon_id) : 30
      for (let mm = startMin; mm < startMin + aptTrajanje; mm++) {
        bookedMinutes.add(mm)
      }
    }
  }

  const available: string[] = []
  for (let m = otvorenoMin; m + trajanje <= zatvorenoMin; m += trajanje) {
    let preklapaSe = false
    for (let offset = 0; offset < trajanje; offset++) {
      if (bookedMinutes.has(m + offset)) {
        preklapaSe = true
        break
      }
    }
    if (!preklapaSe) {
      const h = Math.floor(m / 60)
      const min = m % 60
      available.push(`${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`)
    }
  }

  return NextResponse.json({ available })
}
