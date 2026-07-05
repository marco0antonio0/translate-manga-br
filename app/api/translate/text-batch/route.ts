import { NextRequest, NextResponse } from 'next/server'

import { requireUser, unauthorizedResponse } from '@/app/api/_shared/proxy'
import { openRouterService } from '@/lib/backend/openrouter/openrouter.module'
import { isAllowedOpenRouterModel } from '@/lib/backend/openrouter/openrouter.types'
import { translationService } from '@/lib/backend/translation/translation.module'
import { parseProviderSpec } from '@/lib/backend/translation/translation.types'

const MAX_BATCH_ITEMS = 300
const MAX_TEXT_LENGTH = 5000

interface TranslateBatchBody {
  source_lang?: unknown
  target_lang?: unknown
  provider_lang?: unknown
  texts?: unknown
}

function toLanguageCode(value: unknown, fallback: string) {
  if (typeof value !== 'string') return fallback
  const trimmed = value.trim()
  return trimmed || fallback
}

function toSafeTexts(value: unknown) {
  if (!Array.isArray(value)) return []

  return value
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter((item) => item.length > 0)
    .slice(0, MAX_BATCH_ITEMS)
    .map((item) => item.slice(0, MAX_TEXT_LENGTH))
}

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as TranslateBatchBody
    const sourceLang = toLanguageCode(payload.source_lang, 'auto')
    const targetLang = toLanguageCode(payload.target_lang, 'pt-BR')
    const provider = parseProviderSpec(payload.provider_lang)
    const texts = toSafeTexts(payload.texts)

    if (texts.length === 0) {
      return NextResponse.json(
        {
          message: 'Nenhum texto válido para tradução.',
          translations: [],
          provider_lang: provider.name,
          source_lang: sourceLang,
          target_lang: targetLang,
        },
        { status: 400 }
      )
    }

    if (provider.name === 'openrouter') {
      const user = await requireUser()
      if (!user) return unauthorizedResponse()

      if (!isAllowedOpenRouterModel(provider.model)) {
        return NextResponse.json({ message: 'Modelo OpenRouter não permitido.' }, { status: 400 })
      }
      if (!openRouterService.getApiKey()) {
        return NextResponse.json({ message: 'OpenRouter não está configurado.' }, { status: 400 })
      }
    }

    const translations = await translationService.translateBatch(texts, sourceLang, targetLang, provider)

    return NextResponse.json({
      translations,
      provider_lang: provider.name,
      provider_model: provider.name === 'openrouter' ? provider.model : null,
      source_lang: sourceLang,
      target_lang: targetLang,
    })
  } catch (error) {
    console.error('Translate text batch route error:', error)
    return NextResponse.json(
      { message: 'Erro ao traduzir textos em lote.' },
      { status: 500 }
    )
  }
}
