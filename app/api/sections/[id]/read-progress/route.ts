import { NextRequest, NextResponse } from 'next/server'

import { requireUser } from '@/app/api/_shared/proxy'
import { readProgressService } from '@/lib/backend/read-progress/read-progress.module'

type RouteParams = { params: Promise<{ id: string }> }

export async function GET(_: NextRequest, { params }: RouteParams) {
  const user = await requireUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const done = await readProgressService.isDone(id, user.id)

  return NextResponse.json({ done })
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const user = await requireUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  let done = false
  try {
    const body = (await request.json()) as Record<string, unknown>
    done = body.done === true
  } catch {
    return NextResponse.json({ error: 'Payload inválido.' }, { status: 400 })
  }

  await readProgressService.setDone(id, user.id, done)

  return NextResponse.json({ ok: true })
}
