import { NextResponse } from 'next/server'
import { openRouterService } from '@/lib/backend/openrouter/openrouter.module'
import { requireUser, unauthorizedResponse } from '@/app/api/_shared/proxy'
import { isStateChangingMethod, isTrustedOrigin } from '@/lib/security/request-guards'

function forbiddenResponse() {
  return NextResponse.json(
    { message: 'Acesso negado', error: 'Forbidden', statusCode: 403 },
    { status: 403 }
  )
}

function untrustedOriginResponse() {
  return NextResponse.json(
    { message: 'Origem não autorizada', error: 'Forbidden', statusCode: 403 },
    { status: 403 }
  )
}

async function parseBody(request: Request): Promise<Record<string, unknown>> {
  try {
    const payload = await request.json()
    return payload && typeof payload === 'object' ? payload as Record<string, unknown> : {}
  } catch {
    return {}
  }
}

export async function GET() {
  const user = await requireUser()
  if (!user) return unauthorizedResponse()

  const status = await openRouterService.getStatus()
  return NextResponse.json(status)
}

export async function PUT(request: Request) {
  if (isStateChangingMethod(request.method) && !isTrustedOrigin(request)) {
    return untrustedOriginResponse()
  }

  const user = await requireUser()
  if (!user) return unauthorizedResponse()
  if (user.role !== 4) return forbiddenResponse()

  const body = await parseBody(request)
  const apiKey = typeof body.apiKey === 'string' ? body.apiKey.trim() : ''

  if (!apiKey) {
    return NextResponse.json(
      { message: 'Informe a API key do OpenRouter.', error: 'Bad Request', statusCode: 400 },
      { status: 400 }
    )
  }

  const validation = await openRouterService.saveApiKey(apiKey)
  if (!validation.valid) {
    return NextResponse.json(
      { message: 'API key inválida para OpenRouter.', error: 'Unauthorized', statusCode: 401 },
      { status: 401 }
    )
  }

  return NextResponse.json({
    message: 'API key do OpenRouter salva com sucesso.',
    hasApiKey: true,
    isValid: true,
    availableModels: validation.availableModels,
    selectedModel: validation.availableModels[0] ?? null,
  })
}

export async function PATCH(request: Request) {
  if (isStateChangingMethod(request.method) && !isTrustedOrigin(request)) {
    return untrustedOriginResponse()
  }

  const user = await requireUser()
  if (!user) return unauthorizedResponse()
  if (user.role !== 4) return forbiddenResponse()

  const body = await parseBody(request)
  const model = typeof body.model === 'string' ? body.model.trim() : ''

  const result = await openRouterService.selectModel(model)
  if (!result.ok) {
    return NextResponse.json(
      { message: result.error, error: 'Bad Request', statusCode: 400 },
      { status: 400 }
    )
  }

  return NextResponse.json({
    message: 'Modelo do OpenRouter atualizado.',
    selectedModel: model,
  })
}

export async function DELETE(request: Request) {
  if (isStateChangingMethod(request.method) && !isTrustedOrigin(request)) {
    return untrustedOriginResponse()
  }

  const user = await requireUser()
  if (!user) return unauthorizedResponse()
  if (user.role !== 4) return forbiddenResponse()

  openRouterService.clear()

  return NextResponse.json({
    message: 'API key do OpenRouter removida com sucesso.',
    hasApiKey: false,
    isValid: false,
    availableModels: [],
    selectedModel: null,
  })
}
