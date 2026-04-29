import { NextResponse } from 'next/server'
import { getServerSupabaseClient } from '@/lib/server-supabase'

type RouteCtx = { params: Promise<{ id: string }> }

export async function POST(_request: Request, context: RouteCtx) {
  try {
    const terminId = (await context.params).id
    if (!terminId) {
      return NextResponse.json({ error: 'Nedostaje id termina.' }, { status: 400 })
    }

    const supabase = getServerSupabaseClient()
    if (!supabase) {
      return NextResponse.json({ error: 'Server nije konfigurisan.' }, { status: 500 })
    }

    const { data, error } = await supabase.rpc('mark_appointment_no_show', {
      p_termin_id: terminId,
    })

    if (error) {
      const missingFn =
        /mark_appointment_no_show|function .* does not exist|Could not find the function/i.test(error.message)
      return NextResponse.json(
        {
          error: missingFn
            ? 'Baza nije ažurirana: pokreni migraciju db/migrations/2026-05-09_cancellation_warning_rules.sql.'
            : error.message,
        },
        { status: missingFn ? 503 : 500 },
      )
    }

    const payload = data as { ok?: boolean; error?: string; message?: string } | null
    if (payload?.ok === false) {
      return NextResponse.json({ error: payload.error || 'Akcija nije uspela.' }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: payload?.message || 'Kupac je označen kao da se nije pojavio i dodat je na crnu listu.',
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Greška servera.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
