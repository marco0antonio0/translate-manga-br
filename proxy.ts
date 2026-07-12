import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const AUTH_TOKEN_COOKIE = 'manga-access-token'

function hasBearerToken(request: NextRequest) {
  return /^Bearer\s+\S+/i.test(request.headers.get('authorization') || '')
}

function withCorsHeaders(response: NextResponse) {
  response.headers.set('Access-Control-Allow-Origin', '*')
  response.headers.set('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS')
  response.headers.set(
    'Access-Control-Allow-Headers',
    'Authorization, Content-Type, X-API-Key, X-Requested-With'
  )
  response.headers.set('Access-Control-Max-Age', '86400')
  return response
}

function buildContentSecurityPolicy() {
  const scriptSrc = process.env.NODE_ENV === 'production'
    ? "'self' 'unsafe-inline'"
    : "'self' 'unsafe-inline' 'unsafe-eval'"
  const connectSrc = process.env.NODE_ENV === 'production'
    ? "'self' https://openrouter.ai"
    : "'self' https://openrouter.ai ws: wss:"

  return [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    `connect-src ${connectSrc}`,
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ')
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const response = withCorsHeaders(NextResponse.next())

  if (request.method === 'OPTIONS' && pathname.startsWith('/api/')) {
    return withCorsHeaders(new NextResponse(null, { status: 204 }))
  }

  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  response.headers.set('Content-Security-Policy', buildContentSecurityPolicy())

  // Rotas de autenticação são tratadas pelas APIs /api/auth/*
  if (pathname.startsWith('/api/auth/')) {
    return response
  }

  // Rotas públicas de compartilhamento não exigem sessão
  if (pathname.startsWith('/api/public/')) {
    return response
  }

  // Setup inicial precisa ser público na primeira execução
  if (pathname.startsWith('/api/setup/')) {
    return response
  }

  // Rotas públicas de tradução da landing (/)
  if (pathname === '/api/translate' || pathname.startsWith('/api/translate/')) {
    return response
  }

  // Verificar presença de sessão para demais rotas /api/*
  if (pathname.startsWith('/api/')) {
    const token = request.cookies.get(AUTH_TOKEN_COOKIE)

    if (!token && !hasBearerToken(request)) {
      return withCorsHeaders(
        NextResponse.json(
          {
            message: 'Token inválido ou expirado',
            error: 'Unauthorized',
            statusCode: 401,
          },
          { status: 401 }
        )
      )
    }
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)']
}
