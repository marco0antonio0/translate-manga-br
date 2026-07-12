import { NextResponse } from 'next/server'
import { requireUser } from '@/app/api/_shared/proxy'

export async function GET(request: Request) {
  const user = await requireUser(request)

  if (!user) {
    return NextResponse.json(
      { message: 'Token inválido ou expirado', error: 'Unauthorized', statusCode: 401 },
      { status: 401 }
    )
  }

  return NextResponse.json({
    idUser: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    limite: null,
    gerado: 0,
    limit_page_upload: null,
    foto: user.foto,
  })
}
