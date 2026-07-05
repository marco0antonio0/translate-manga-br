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

  const updated = usersController.resetUsage(userId)
  if (!updated) return notFoundResponse('Usuário não encontrado')

  return NextResponse.json({
    id: updated.id,
    limite: updated.limite,
    gerado: updated.gerado,
    limit_page_upload: updated.limit_page_upload,
    message: 'Uso resetado com sucesso.',
  })
}
