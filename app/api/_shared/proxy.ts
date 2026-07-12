import { NextResponse } from 'next/server'
import { cookies, headers } from 'next/headers'
import { authController } from '@/lib/backend/auth/auth.module'

export const AUTH_TOKEN_COOKIE = 'manga-access-token'

export function unauthorizedPayload() {
  return { message: 'Token inválido ou expirado', error: 'Unauthorized', statusCode: 401 }
}

export function unauthorizedResponse() {
  return NextResponse.json(unauthorizedPayload(), { status: 401 })
}

export function getBearerToken(request: Request | null | undefined) {
  const authorization = request?.headers.get('authorization') || ''
  const match = authorization.match(/^Bearer\s+(.+)$/i)
  return match?.[1]?.trim() || null
}

export async function getRequestAuthToken(request?: Request) {
  const cookieStore = await cookies()
  let bearerToken = getBearerToken(request)
  if (!bearerToken) {
    const headerStore = await headers()
    const authorization = headerStore.get('authorization') || ''
    bearerToken = authorization.match(/^Bearer\s+(.+)$/i)?.[1]?.trim() || null
  }
  const token = cookieStore.get(AUTH_TOKEN_COOKIE)?.value || bearerToken
  return token || null
}

export async function requireUser(request?: Request) {
  const token = await getRequestAuthToken(request)
  return authController.getUserFromToken(token)
}

export function forbiddenResponse() {
  return NextResponse.json(
    { message: 'Acesso negado', error: 'Forbidden', statusCode: 403 },
    { status: 403 }
  )
}

export function untrustedOriginResponse() {
  return NextResponse.json(
    { message: 'Origem não autorizada', error: 'Forbidden', statusCode: 403 },
    { status: 403 }
  )
}

export function badRequestResponse(message: string) {
  return NextResponse.json(
    { message, error: 'Bad Request', statusCode: 400 },
    { status: 400 }
  )
}

export function notFoundResponse(message: string) {
  return NextResponse.json(
    { message, error: 'Not Found', statusCode: 404 },
    { status: 404 }
  )
}


export async function requireAdmin(): Promise<
  { user: NonNullable<Awaited<ReturnType<typeof requireUser>>> } | { response: NextResponse }
> {
  const user = await requireUser()
  if (!user) return { response: unauthorizedResponse() }
  if (user.role !== 4) return { response: forbiddenResponse() }
  return { user }
}

export function parseRouteId(raw: string) {
  const id = Number.parseInt(raw, 10)
  return Number.isFinite(id) && id > 0 ? id : null
}

export function isSessionExpiredStatus(status: number) {
  return status === 401 || status === 403
}
