import { NextResponse } from 'next/server'
import { z } from 'zod'
import { authController } from '@/lib/backend/auth/auth.module'
import { consumeRateLimit } from '@/lib/security/rate-limit'
import { parseJsonBody } from '@/app/api/_shared/validation'
import { isExtensionOrigin, requestTargetsIpAddress } from '@/lib/security/request-guards'

const AUTH_TOKEN_COOKIE = 'manga-access-token'
const loginBodySchema = z.object({
  email: z.string().trim().email('Email inválido'),
  password: z.string().min(1, 'Senha é obrigatória'),
})

function shouldUseSecureCookie(request: Request) {
  if (requestTargetsIpAddress(request)) return false

  const forwardedProto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim()
  if (forwardedProto) return forwardedProto === 'https'

  try {
    return new URL(request.url).protocol === 'https:'
  } catch {
    return false
  }
}

function getRequestOrigin(request: Request) {
  const forwardedProto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim()
  const proto = forwardedProto || new URL(request.url).protocol.replace(/:$/, '') || 'http'
  const host = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim()
    || request.headers.get('host')
    || new URL(request.url).host
  return `${proto}://${host}`
}

function requestUrl(request: Request, path: string) {
  return new URL(path, getRequestOrigin(request))
}

function loginRedirect(request: Request, error: string) {
  const url = requestUrl(request, '/login')
  url.searchParams.set('error', error)
  return NextResponse.redirect(url, { status: 303 })
}

async function parseLoginBody(request: Request) {
  const contentType = request.headers.get('content-type') || ''
  if (
    contentType.includes('application/x-www-form-urlencoded') ||
    contentType.includes('multipart/form-data')
  ) {
    const formData = await request.formData()
    const parsed = loginBodySchema.safeParse({
      email: formData.get('email'),
      password: formData.get('password'),
    })
    return parsed.success
      ? { success: true as const, data: parsed.data, isForm: true }
      : { success: false as const, response: loginRedirect(request, 'invalid_form'), isForm: true }
  }

  const parsed = await parseJsonBody(request, loginBodySchema)
  return parsed.success
    ? { success: true as const, data: parsed.data, isForm: false }
    : { success: false as const, response: parsed.response, isForm: false }
}

export async function POST(request: Request) {
  try {
    const clientIp = request.headers.get('x-real-ip')
      || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || 'local'
    const parsedBody = await parseLoginBody(request)
    if (!parsedBody.success) return parsedBody.response
    const { email, password } = parsedBody.data

    const ipLimiter = consumeRateLimit('auth-login-ip', clientIp, 20, 5 * 60 * 1000)
    if (!ipLimiter.allowed) {
      if (parsedBody.isForm) return loginRedirect(request, 'rate_limit')
      return NextResponse.json(
        { error: 'Muitas tentativas. Tente novamente em instantes.' },
        { status: 429, headers: { 'Retry-After': String(ipLimiter.retryAfterSec) } }
      )
    }
    const emailKey = email.toLowerCase() || 'unknown'
    const emailLimiter = consumeRateLimit('auth-login-email', emailKey, 8, 10 * 60 * 1000)
    if (!emailLimiter.allowed) {
      if (parsedBody.isForm) return loginRedirect(request, 'rate_limit')
      return NextResponse.json(
        { error: 'Muitas tentativas para este usuário. Aguarde alguns minutos.' },
        { status: 429, headers: { 'Retry-After': String(emailLimiter.retryAfterSec) } }
      )
    }

    if (!authController.hasAnyUser()) {
      if (parsedBody.isForm) return NextResponse.redirect(requestUrl(request, '/setup'), { status: 303 })
      return NextResponse.json({ error: 'Sistema não inicializado. Acesse /setup para criar o admin.' }, { status: 409 })
    }

    const login = authController.loginWithEmailPassword(email, password)
    if (!login) {
      if (parsedBody.isForm) return loginRedirect(request, 'invalid_credentials')
      return NextResponse.json({ error: 'Email ou senha incorretos' }, { status: 401 })
    }

    const fromExtension = isExtensionOrigin(request)
    const usingIpUrl = requestTargetsIpAddress(request)
    const extensionUsingIpUrl = fromExtension && usingIpUrl
    const cookieOptions = {
      httpOnly: true,
      secure: usingIpUrl ? false : (fromExtension ? true : shouldUseSecureCookie(request)),
      sameSite: fromExtension && !extensionUsingIpUrl ? 'none' : 'lax',
      maxAge: 60 * 60 * 24,
      path: '/',
    } as const

    if (parsedBody.isForm) {
      const response = NextResponse.redirect(requestUrl(request, '/inicio'), { status: 303 })
      response.cookies.set(AUTH_TOKEN_COOKIE, login.token, cookieOptions)
      return response
    }

    const response = NextResponse.json({
      success: true,
      message: 'Login realizado com sucesso',
      id: login.user.id,
      sessionToken: extensionUsingIpUrl ? login.token : undefined,
    })
    response.cookies.set(AUTH_TOKEN_COOKIE, login.token, cookieOptions)
    return response
  } catch (error) {
    console.error('Login route error:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
