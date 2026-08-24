import { NextResponse } from 'next/server'
import { getServerSupabaseClient, hasServiceRoleKey } from '@/lib/server-supabase'

const CALENDLY_URL = 'https://calendly.com/zorandostica2/prezentacija-i-konsultacije'

export async function POST(request: Request) {
  if (!hasServiceRoleKey()) {
    return NextResponse.json({ error: 'Server nije konfigurisan.' }, { status: 503 })
  }

  const admin = getServerSupabaseClient()
  if (!admin) {
    return NextResponse.json({ error: 'Supabase env nedostaje.' }, { status: 500 })
  }

  try {
    const body = await request.json()
    const { name, email, phone, subject, message, type } = body

    if (!name?.trim() || !email?.trim() || !subject?.trim() || !message?.trim()) {
      return NextResponse.json({ error: 'Sva obavezna polja moraju biti popunjena.' }, { status: 400 })
    }

    if (!['upit', 'konsultacija'].includes(type)) {
      return NextResponse.json({ error: 'Nevažeći tip upita.' }, { status: 400 })
    }

    const { data, error } = await admin
      .from('contact_messages')
      .insert({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone?.trim() || null,
        subject: subject.trim(),
        message: message.trim(),
        type,
        status: 'novo',
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    const isConsultation = type === 'konsultacija'
    return NextResponse.json({
      success: true,
      message: isConsultation
        ? 'Hvala na zahtevu za konsultaciju. Preusmeravamo vas na zakazivanje...'
        : 'Hvala na upitu. Odgovorićemo u najkraćem roku.',
      redirectUrl: isConsultation ? CALENDLY_URL : null,
      data,
    })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Greška servera.' }, { status: 500 })
  }
}