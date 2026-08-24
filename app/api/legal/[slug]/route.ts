import { NextResponse } from 'next/server'
import { getServerSupabaseClient } from '@/lib/server-supabase'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const admin = getServerSupabaseClient()
  if (!admin) {
    return NextResponse.json({ error: 'Supabase env nedostaje.' }, { status: 500 })
  }

  const { slug } = await params

  if (!['terms', 'privacy'].includes(slug)) {
    return NextResponse.json({ error: 'Stranica ne postoji.' }, { status: 404 })
  }

  const { data, error } = await admin
    .from('legal_pages')
    .select('slug, title, content_html, version, updated_at')
    .eq('slug', slug)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  if (!data) {
    return NextResponse.json({ error: 'Stranica ne postoji.' }, { status: 404 })
  }

  return NextResponse.json({ data })
}