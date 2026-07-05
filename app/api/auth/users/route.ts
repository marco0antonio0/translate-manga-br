import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin, untrustedOriginResponse } from '@/app/api/_shared/proxy'
import { parseJsonBody } from '@/app/api/_shared/validation'
import { usersController } from '@/lib/backend/users/users.module'
import { isStateChangingMethod, isTrustedOrigin } from '@/lib/security/request-guards'

const createUserBodySchema = z.object({
  name: z.string().trim().min(1, 'Nome é obrigatório'),
  email: z.string().trim().email('Email inválido').transform((v) => v.toLowerCase()),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
  role: z.coerce.number().int().min(0).max(4).default(0),
})

export async function GET() {
  const admin = await requireAdmin()
  if ('response' in admin) return admin.response

  return NextResponse.json(usersController.listUsers())
}

export async function POST(request: Request) {
  if (isStateChangingMethod(request.method) && !isTrustedOrigin(request)) {
    return untrustedOriginResponse()
  }

  const admin = await requireAdmin()
  if ('response' in admin) return admin.response

  const parsedBody = await parseJsonBody(request, createUserBodySchema)
  if (!parsedBody.success) return parsedBody.response
  const { name, email, password, role } = parsedBody.data

  const result = usersController.createUser({ name, email, password, role })
  if (!result.ok) {
    return NextResponse.json(
      { message: 'Email já cadastrado', error: 'Conflict', statusCode: 409 },
      { status: 409 }
    )
  }

  return NextResponse.json(
    { id: result.id, name, email, role, message: 'Usuário criado com sucesso.' },
    { status: 201 }
  )
}
