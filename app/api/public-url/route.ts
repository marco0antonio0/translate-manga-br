import { NextResponse } from 'next/server'
import {
  badRequestResponse,
  requireAdmin,
  requireUser,
  unauthorizedResponse,
  untrustedOriginResponse,
} from '@/app/api/_shared/proxy'
import { publicUrlService } from '@/lib/backend/public-url/public-url.service'
import { isStateChangingMethod, isTrustedOrigin } from '@/lib/security/request-guards'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function parseBody(request: Request): Promise<Record<string, unknown>> {
  try {
    const payload = await request.json()
    return payload && typeof payload === 'object' && !Array.isArray(payload)
      ? payload as Record<string, unknown>
      : {}
  } catch {
    return {}
  }
}

export async function GET() {
  const user = await requireUser()
  if (!user) return unauthorizedResponse()

  return NextResponse.json(publicUrlService.getStatus())
}

export async function PUT(request: Request) {
  if (isStateChangingMethod(request.method) && !isTrustedOrigin(request)) {
    return untrustedOriginResponse()
  }

  const admin = await requireAdmin()
  if ('response' in admin) return admin.response

  const body = await parseBody(request)
  const result = publicUrlService.savePublicUrl(body.publicUrl)
  if (!result.ok) return badRequestResponse(result.error)

  return NextResponse.json({
    message: 'URL pública da extensão salva.',
    configured: true,
    publicUrl: result.publicUrl,
  })
}

export async function DELETE(request: Request) {
  if (isStateChangingMethod(request.method) && !isTrustedOrigin(request)) {
    return untrustedOriginResponse()
  }

  const admin = await requireAdmin()
  if ('response' in admin) return admin.response

  publicUrlService.clearPublicUrl()

  return NextResponse.json({
    message: 'URL pública da extensão removida.',
    configured: false,
    publicUrl: null,
  })
}
