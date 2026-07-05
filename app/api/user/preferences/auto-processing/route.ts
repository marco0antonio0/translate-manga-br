import { NextRequest, NextResponse } from 'next/server'

import { requireUser } from '@/app/api/_shared/proxy'
import { preferencesService } from '@/lib/backend/preferences/preferences.module'

export async function GET() {
  const user = await requireUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const enabled = await preferencesService.isAutoProcessingEnabled(user.id)

  return NextResponse.json({ auto_processing_enabled: enabled })
}

export async function PUT(request: NextRequest) {
  const user = await requireUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let enabled = false
  try {
    const body = (await request.json()) as Record<string, unknown>
    enabled = body.auto_processing_enabled === true
  } catch {
    return NextResponse.json({ error: 'Payload inválido.' }, { status: 400 })
  }

  await preferencesService.setAutoProcessingEnabled(user.id, enabled)

  return NextResponse.json({ ok: true, auto_processing_enabled: enabled })
}
