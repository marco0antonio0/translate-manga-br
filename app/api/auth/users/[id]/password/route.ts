import { NextResponse } from 'next/server'
import {
  badRequestResponse,
  notFoundResponse,
  parseRouteId,
  requireAdmin,
  untrustedOriginResponse,
} from '@/app/api/_shared/proxy'
import { usersController } from '@/lib/backend/users/users.module'
import { isStateChangingMethod, isTrustedOrigin } from '@/lib/security/request-guards'

type RouteParams = { params: Promise<{ id: string }> }

export async function PATCH(request: Request, { params }: RouteParams) {
  if (isStateChangingMethod(request.method) && !isTrustedOrigin(request)) {
    return untrustedOriginResponse()
  }

  const admin = await requireAdmin()
  if ('response' in admin) return admin.response

  const { id } = await params
  const userId = parseRouteId(id)
  if (!userId) return badRequestResponse('ID inválido')

  let payload: unknown = {}
  try {
    payload = await request.json()
  } catch {
    payload = {}
  }

  const body = payload && typeof payload === 'object' ? payload as Record<string, unknown> : {}
  const newPassword = typeof body.newPassword === 'string' ? body.newPassword : ''
  if (!newPassword || newPassword.trim().length < 6) {
    return badRequestResponse('Nova senha deve ter pelo menos 6 caracteres')
  }

  const updated = usersController.updatePassword(userId, newPassword)
  if (!updated) return notFoundResponse('Usuário não encontrado')

  return NextResponse.json({ success: true, message: 'Senha atualizada com sucesso.' })
}
