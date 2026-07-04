import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'node:crypto'

import { requireUser, unauthorizedResponse } from '@/app/api/_shared/proxy'
import { db } from '@/lib/backend/shared/database.module'
import { redisMGetStrings, redisSetString } from '@/lib/redis-cache'
import { decryptSecret } from '@/lib/security/secrets'

type TranslationProvider =
  | { name: 'google' }
  | { name: 'openrouter'; model: string; apiKey: string }

const ALLOWED_OPENROUTER_MODELS = ['google/gemma-4-31b-it'] as const
const MAX_BATCH_ITEMS = 300
const MAX_TEXT_LENGTH = 5000
const MAX_CONCURRENCY = 4
const CACHE_SET_CONCURRENCY = 8
const TRANSLATION_CACHE_TTL_SECONDS = 0
const TRANSLATION_CACHE_PREFIX = 'manga:translate:v1'

interface TranslateBatchBody {
  source_lang?: unknown
  target_lang?: unknown
  provider_lang?: unknown
  texts?: unknown
}

function toLanguageCode(value: unknown, fallback: string) {
  if (typeof value !== 'string') return fallback
  const trimmed = value.trim()
  if (!trimmed) return fallback
  return trimmed
}

function parseProvider(value: unknown): { name: 'google' } | { name: 'openrouter'; model: string } {
  if (typeof value !== 'string') return { name: 'google' }
  const normalized = value.trim()
  if (normalized.toLowerCase().startsWith('openrouter:')) {
    const model = normalized.slice('openrouter:'.length).trim()
    return { name: 'openrouter', model: model || ALLOWED_OPENROUTER_MODELS[0] }
  }
  return { name: 'google' }
}

function toSafeTexts(value: unknown) {
  if (!Array.isArray(value)) return []

  return value
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter((item) => item.length > 0)
    .slice(0, MAX_BATCH_ITEMS)
    .map((item) => item.slice(0, MAX_TEXT_LENGTH))
}

function parseGoogleTranslation(payload: unknown) {
  if (!Array.isArray(payload) || !Array.isArray(payload[0])) return null

  const fragments = payload[0]
    .map((entry) => {
      if (!Array.isArray(entry)) return ''
      const translatedPart = entry[0]
      return typeof translatedPart === 'string' ? translatedPart : ''
    })
    .filter(Boolean)

  if (fragments.length === 0) return null
  return fragments.join('')
}

async function translateWithGoogle(text: string, sourceLang: string, targetLang: string) {
  const query = new URLSearchParams({
    client: 'gtx',
    sl: sourceLang,
    tl: targetLang,
    dt: 't',
    q: text,
  })

  const response = await fetch(`https://translate.googleapis.com/translate_a/single?${query.toString()}`, {
    method: 'GET',
    cache: 'no-store',
    headers: {
      accept: 'application/json, text/plain, */*',
    },
  })

  if (!response.ok) {
    throw new Error(`Google Translate HTTP ${response.status}`)
  }

  const raw = await response.text()
  const parsed = JSON.parse(raw) as unknown
  const translated = parseGoogleTranslation(parsed)
  if (!translated) {
    throw new Error('Resposta de tradução inválida')
  }

  return translated
}

function getOpenRouterApiKeyFromDb() {
  const row = db.prepare('SELECT value FROM kv_store WHERE key = ? LIMIT 1')
    .get('manga:openrouter:api_key') as { value?: string } | undefined
  const raw = row?.value ? String(row.value) : ''
  if (!raw) return ''
  const decrypted = decryptSecret(raw)
  return (decrypted || raw || '').trim()
}

function parseOpenRouterMessageContent(content: unknown) {
  if (typeof content === 'string') return content.trim()
  if (!Array.isArray(content)) return ''
  return content
    .map((part) => {
      if (!part || typeof part !== 'object') return ''
      const text = (part as Record<string, unknown>).text
      return typeof text === 'string' ? text : ''
    })
    .filter(Boolean)
    .join('\n')
    .trim()
}

function buildOpenRouterSystemPrompt(sourceLang: string, targetLang: string) {
  return [
    `You are a professional manga/comic translator. Translate the user's text from ${sourceLang} to ${targetLang}.`,
    'The source text was extracted by OCR from comic speech balloons and may contain recognition errors:',
    'missing, extra, swapped or misrecognized letters, split or merged words, and stray symbols.',
    'When a word looks corrupted or incomplete, infer the most likely intended word from the surrounding context',
    'and translate that intended meaning — prefer the closest real, sensible word instead of translating the noise literally.',
    'If the text is too garbled to guess, translate the readable parts and keep it coherent.',
    'Keep the tone natural and colloquial as in comics, preserving punctuation and interjections when it makes sense.',
    'Return ONLY the translated text, with no quotes, notes, alternatives, or explanations.',
  ].join(' ')
}

async function translateWithOpenRouter(
  text: string,
  sourceLang: string,
  targetLang: string,
  model: string,
  apiKey: string
) {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    cache: 'no-store',
    body: JSON.stringify({
      model,
      temperature: 0,
      messages: [
        {
          role: 'system',
          content: buildOpenRouterSystemPrompt(sourceLang, targetLang),
        },
        { role: 'user', content: text },
      ],
    }),
  })
  if (!response.ok) throw new Error(`OpenRouter HTTP ${response.status}`)

  const payload = await response.json() as {
    choices?: Array<{ message?: { content?: unknown } }>
  }
  const translated = parseOpenRouterMessageContent(payload?.choices?.[0]?.message?.content)
  if (!translated) throw new Error('Resposta de tradução OpenRouter inválida')
  return translated
}

function resolveProviderCacheToken(provider: TranslationProvider) {
  return provider.name === 'openrouter' ? `openrouter:${provider.model}` : provider.name
}

async function translateBatchTexts(
  texts: string[],
  sourceLang: string,
  targetLang: string,
  provider: TranslationProvider
) {
  const translations = new Array<string>(texts.length).fill('')
  let currentIndex = 0

  async function worker() {
    while (true) {
      const index = currentIndex
      currentIndex += 1
      if (index >= texts.length) return

      const sourceText = texts[index]
      try {
        translations[index] = provider.name === 'openrouter'
          ? await translateWithOpenRouter(sourceText, sourceLang, targetLang, provider.model, provider.apiKey)
          : await translateWithGoogle(sourceText, sourceLang, targetLang)
      } catch {
        translations[index] = sourceText
      }
    }
  }

  const workerCount = Math.max(1, Math.min(MAX_CONCURRENCY, texts.length))
  await Promise.all(Array.from({ length: workerCount }, () => worker()))
  return translations
}

function buildTranslationCacheKey(
  text: string,
  sourceLang: string,
  targetLang: string,
  provider: string
) {
  const hash = createHash('sha256')
    .update(provider)
    .update('\u0000')
    .update(sourceLang)
    .update('\u0000')
    .update(targetLang)
    .update('\u0000')
    .update(text)
    .digest('hex')

  return `${TRANSLATION_CACHE_PREFIX}:${hash}`
}

async function persistTranslationsInCache(entries: Array<{ key: string; value: string }>) {
  if (entries.length === 0) return

  let currentIndex = 0

  async function worker() {
    while (true) {
      const index = currentIndex
      currentIndex += 1
      if (index >= entries.length) return

      const current = entries[index]
      await redisSetString(current.key, current.value, TRANSLATION_CACHE_TTL_SECONDS)
    }
  }

  const workerCount = Math.max(1, Math.min(CACHE_SET_CONCURRENCY, entries.length))
  await Promise.all(Array.from({ length: workerCount }, () => worker()))
}

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as TranslateBatchBody
    const sourceLang = toLanguageCode(payload.source_lang, 'auto')
    const targetLang = toLanguageCode(payload.target_lang, 'pt-BR')
    const requestedProvider = parseProvider(payload.provider_lang)
    const texts = toSafeTexts(payload.texts)

    if (texts.length === 0) {
      return NextResponse.json(
        {
          message: 'Nenhum texto válido para tradução.',
          translations: [],
          provider_lang: requestedProvider.name,
          source_lang: sourceLang,
          target_lang: targetLang,
        },
        { status: 400 }
      )
    }

    let provider: TranslationProvider = { name: 'google' }
    if (requestedProvider.name === 'openrouter') {
      const user = await requireUser()
      if (!user) return unauthorizedResponse()
      if (!ALLOWED_OPENROUTER_MODELS.includes(requestedProvider.model as (typeof ALLOWED_OPENROUTER_MODELS)[number])) {
        return NextResponse.json(
          { message: 'Modelo OpenRouter não permitido.' },
          { status: 400 }
        )
      }

      const apiKey = getOpenRouterApiKeyFromDb()
      if (!apiKey) {
        return NextResponse.json(
          { message: 'OpenRouter não está configurado.' },
          { status: 400 }
        )
      }

      provider = { name: 'openrouter', model: requestedProvider.model, apiKey }
    }

    const providerCacheToken = resolveProviderCacheToken(provider)
    const cacheKeys = texts.map((text) => buildTranslationCacheKey(text, sourceLang, targetLang, providerCacheToken))
    const cachedTranslations = await redisMGetStrings(cacheKeys)

    const translations = new Array<string>(texts.length).fill('')
    const missingIndexes: number[] = []

    for (let index = 0; index < texts.length; index += 1) {
      const cached = cachedTranslations[index]
      if (typeof cached === 'string' && cached.length > 0) {
        translations[index] = cached
      } else {
        missingIndexes.push(index)
      }
    }

    if (missingIndexes.length > 0) {
      const missingTexts = missingIndexes.map((index) => texts[index])
      const translatedMissing = await translateBatchTexts(missingTexts, sourceLang, targetLang, provider)

      const toPersistInCache: Array<{ key: string; value: string }> = []
      missingIndexes.forEach((originalIndex, translatedIndex) => {
        const translatedText = translatedMissing[translatedIndex] || texts[originalIndex]
        translations[originalIndex] = translatedText
        toPersistInCache.push({
          key: cacheKeys[originalIndex],
          value: translatedText,
        })
      })

      await persistTranslationsInCache(toPersistInCache)
    }

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
      {
        message: 'Erro ao traduzir textos em lote.',
      },
      { status: 500 }
    )
  }
}
