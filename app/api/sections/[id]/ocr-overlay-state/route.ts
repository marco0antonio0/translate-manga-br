import { NextRequest, NextResponse } from 'next/server'

import { requireUser, unauthorizedResponse } from '@/app/api/_shared/proxy'
import { overlayStateService } from '@/lib/backend/overlay-state/overlay-state.module'

type RouteParams = { params: Promise<{ id: string }> }

function asObjectRecord(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

export async function GET(_: NextRequest, { params }: RouteParams) {
  const user = await requireUser()
  if (!user) return unauthorizedResponse()

  const { id } = await params
  const state = await overlayStateService.getState(id, user.id)

  return NextResponse.json({ state: state ?? null })
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const user = await requireUser()
  if (!user) return unauthorizedResponse()

  const { id } = await params

  try {
    const payload = await request.json()
    const bodyRecord = asObjectRecord(payload)
    const rawState = bodyRecord && Object.prototype.hasOwnProperty.call(bodyRecord, 'state')
      ? bodyRecord.state
      : payload

    const result = await overlayStateService.saveState(id, user.id, rawState)
    if (!result.ok) {
      if (result.error === 'too-large') {
        return NextResponse.json(
          { message: 'Estado do overlay excede o tamanho máximo permitido.' },
          { status: 413 }
        )
      }
      return NextResponse.json({ message: 'Payload de estado inválido.' }, { status: 400 })
    }

    return NextResponse.json({ ok: true, state: result.state })
  } catch (error) {
    console.error('Overlay state route error:', error)
    return NextResponse.json(
      { message: 'Erro ao salvar estado do overlay.' },
      { status: 500 }
    )
  }
}
