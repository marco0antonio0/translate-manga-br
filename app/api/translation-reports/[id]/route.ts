import { NextRequest, NextResponse } from 'next/server'

import { badRequestResponse, parseRouteId, requireAdmin } from '@/app/api/_shared/proxy'
import { translationReportsService } from '@/lib/backend/translation-reports/translation-reports.module'

type RouteParams = { params: Promise<{ id: string }> }

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const access = await requireAdmin()
  if ('response' in access) return access.response

  const { id: rawId } = await params
  const id = parseRouteId(rawId)
  if (!id) return badRequestResponse('ID de reporte inválido.')

  try {
    const result = translationReportsService.delete(id)
    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Não foi possível excluir o reporte.'
    return badRequestResponse(message)
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const access = await requireAdmin()
  if ('response' in access) return access.response

  const { id: rawId } = await params
  const id = parseRouteId(rawId)
  if (!id) return badRequestResponse('ID de reporte inválido.')

  let payload: { status?: unknown; corrected_text?: unknown } = {}
  try {
    payload = await request.json()
  } catch {
    return badRequestResponse('Payload inválido.')
  }

  if (payload.status === undefined && payload.corrected_text === undefined) {
    return badRequestResponse('Informe status ou corrected_text para atualizar.')
  }

  try {
    let result: Record<string, unknown> = { id }
    if (payload.status !== undefined) {
      result = { ...result, ...translationReportsService.updateStatus(id, payload.status) }
    }
    if (payload.corrected_text !== undefined) {
      result = { ...result, ...translationReportsService.updateCorrectedText(id, payload.corrected_text) }
    }
    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Não foi possível atualizar o reporte.'
    return badRequestResponse(message)
  }
}
