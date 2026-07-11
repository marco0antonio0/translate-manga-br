import { NextRequest, NextResponse } from 'next/server'

import { badRequestResponse, requireAdmin, requireUser, unauthorizedResponse } from '@/app/api/_shared/proxy'
import { translationReportsService } from '@/lib/backend/translation-reports/translation-reports.module'

export async function GET() {
  const access = await requireAdmin()
  if ('response' in access) return access.response

  return NextResponse.json({ reports: translationReportsService.list() })
}

export async function POST(request: NextRequest) {
  const user = await requireUser()
  if (!user) return unauthorizedResponse()

  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return badRequestResponse('Payload inválido.')
  }

  try {
    const report = translationReportsService.create(user.id, payload)
    return NextResponse.json({ ok: true, report_id: report.id })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Reporte inválido.'
    return badRequestResponse(message)
  }
}
