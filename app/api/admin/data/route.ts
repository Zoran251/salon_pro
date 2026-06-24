import { NextResponse } from 'next/server'
import { verifyPlatformAdmin } from '@/lib/admin-api-auth'
import { getServerSupabaseClient, hasServiceRoleKey } from '@/lib/server-supabase'

const ALLOWED_TABLES = ['saloni', 'usluge', 'lager', 'termini', 'zaposleni', 'rashodi', 'lojalnost', 'kupci_crna_lista', 'kupac_nalozi', 'salon_notifications'] as const

export async function GET(request: Request) {
  const auth = await verifyPlatformAdmin(request)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
  if (!hasServiceRoleKey()) return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY nije postavljen.' }, { status: 503 })

  const admin = getServerSupabaseClient()
  if (!admin) return NextResponse.json({ error: 'Supabase env nedostaje.' }, { status: 500 })

  const { searchParams } = new URL(request.url)
  const table = searchParams.get('table')
  const id = searchParams.get('id')

  if (!table || !ALLOWED_TABLES.includes(table as typeof ALLOWED_TABLES[number])) {
    return NextResponse.json({ error: 'Nedozvoljena tabela.' }, { status: 400 })
  }

  if (id) {
    const { data, error } = await admin.from(table).select('*').eq('id', id).maybeSingle()
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ data })
  }

  const { data, error } = await admin.from(table).select('*').order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ data: data || [] })
}

export async function POST(request: Request) {
  const auth = await verifyPlatformAdmin(request)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
  if (!hasServiceRoleKey()) return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY nije postavljen.' }, { status: 503 })

  const admin = getServerSupabaseClient()
  if (!admin) return NextResponse.json({ error: 'Supabase env nedostaje.' }, { status: 500 })

  try {
    const body = await request.json()
    const table = body._table as string
    if (!table || !ALLOWED_TABLES.includes(table as typeof ALLOWED_TABLES[number])) {
      return NextResponse.json({ error: 'Nedozvoljena tabela.' }, { status: 400 })
    }

    const insertData = { ...body }
    delete insertData._table
    delete insertData.id

    const { data, error } = await admin.from(table).insert(insertData).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ data })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Greška servera.' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  const auth = await verifyPlatformAdmin(request)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
  if (!hasServiceRoleKey()) return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY nije postavljen.' }, { status: 503 })

  const admin = getServerSupabaseClient()
  if (!admin) return NextResponse.json({ error: 'Supabase env nedostaje.' }, { status: 500 })

  try {
    const body = await request.json()
    const table = body._table as string
    const id = body.id as string
    if (!table || !ALLOWED_TABLES.includes(table as typeof ALLOWED_TABLES[number])) {
      return NextResponse.json({ error: 'Nedozvoljena tabela.' }, { status: 400 })
    }
    if (!id) return NextResponse.json({ error: 'Nedostaje id.' }, { status: 400 })

    const updateData = { ...body }
    delete updateData._table

    const { data, error } = await admin.from(table).update(updateData).eq('id', id).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ data })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Greška servera.' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const auth = await verifyPlatformAdmin(request)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
  if (!hasServiceRoleKey()) return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY nije postavljen.' }, { status: 503 })

  const admin = getServerSupabaseClient()
  if (!admin) return NextResponse.json({ error: 'Supabase env nedostaje.' }, { status: 500 })

  const { searchParams } = new URL(request.url)
  const table = searchParams.get('table')
  const id = searchParams.get('id')

  if (!table || !ALLOWED_TABLES.includes(table as typeof ALLOWED_TABLES[number])) {
    return NextResponse.json({ error: 'Nedozvoljena tabela.' }, { status: 400 })
  }
  if (!id) return NextResponse.json({ error: 'Nedostaje id.' }, { status: 400 })

  const { error } = await admin.from(table).delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true })
}
