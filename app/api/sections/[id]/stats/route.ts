import { NextResponse } from 'next/server'
import { parseRouteId, requireUser, unauthorizedResponse } from '@/app/api/_shared/proxy'
import { sectionsStatsService } from '@/lib/backend/sections/sections.module'

type RouteParams = { params: Promise<{ id: string }> }

export async function GET(_: Request, { params }: RouteParams) {
  const user = await requireUser()
  if (!user) return unauthorizedResponse()

  const { id } = await params
  const sectionId = parseRouteId(id)
  if (!sectionId) {
    return NextResponse.json({ message: 'ID inválido.' }, { status: 400 })
  }

  const stats = sectionsStatsService.getSectionStats(sectionId, user.id)
  if (!stats) {
    return NextResponse.json({ message: 'Seção não encontrada.' }, { status: 404 })
  }

  return NextResponse.json(stats)
}
