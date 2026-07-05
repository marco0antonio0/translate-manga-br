import { NextRequest, NextResponse } from 'next/server'

import { requireUser } from '@/app/api/_shared/proxy'
import { readProgressService } from '@/lib/backend/read-progress/read-progress.module'

export async function GET(request: NextRequest) {
  const user = await requireUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = request.nextUrl
  const sectionIdsParam = searchParams.get('section_ids') ?? ''
  const rawIds = sectionIdsParam.split(',').map((s) => s.trim()).filter(Boolean)

  if (rawIds.length === 0) {
    return NextResponse.json({ done: {} })
  }

  const done = await readProgressService.getDoneMap(rawIds, user.id)

  return NextResponse.json({ done })
}
