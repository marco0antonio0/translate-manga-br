import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { requireUser } from '@/app/api/_shared/proxy'

const AUTH_TOKEN_COOKIE = 'manga-access-token'

export async function GET(request: Request) {
  const cookieStore = await cookies()
  const user = await requireUser(request)

  if (!user) {
    cookieStore.delete(AUTH_TOKEN_COOKIE)
    return NextResponse.json(
      { authenticated: false, reason: 'expired_token', error: 'Sessão expirada' },
      { status: 401 }
    )
  }

  return NextResponse.json({
    authenticated: true,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      limite: null,
      gerado: 0,
      limit_page_upload: null,
      foto: user.foto,
    },
  })
}
