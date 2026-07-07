import { createHash } from 'node:crypto'

import { redisMGetStrings, redisSetString } from '@/lib/redis-cache'
import type { OpenRouterService } from '@/lib/backend/openrouter/openrouter.service'
import type {
  TranslateBatchOptions,
  TranslationProviderSpec,
} from './translation.types'

const GOOGLE_CONCURRENCY = 4
const OPENROUTER_CONCURRENCY = 3
const CACHE_SET_CONCURRENCY = 8
const TRANSLATION_CACHE_TTL_SECONDS = 0
const TRANSLATION_CACHE_PREFIX = 'manga:translate:v1'

function parseGoogleTranslation(payload: unknown) {
  if (!Array.isArray(payload) || !Array.isArray(payload[0])) return null
  const fragments = payload[0]
    .map((entry: unknown) => {
      if (!Array.isArray(entry)) return ''
      const part = entry[0]
      return typeof part === 'string' ? part : ''
    })
    .filter(Boolean)
  if (fragments.length === 0) return null
  return fragments.join('')
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

async function runPool(count: number, concurrency: number, worker: (index: number) => Promise<void>) {
  let cursor = 0
  await Promise.all(
    Array.from({ length: Math.max(1, Math.min(concurrency, count)) }, async () => {
      while (true) {
        const index = cursor++
        if (index >= count) return
        await worker(index)
      }
    })
  )
}

export class TranslationService {
  constructor(private readonly openRouter: OpenRouterService) {}

  private async translateOneViaGoogle(text: string, sourceLang: string, targetLang: string) {
    const query = new URLSearchParams({
      client: 'gtx',
      sl: sourceLang,
      tl: targetLang,
      dt: 't',
      q: text,
    })
    const response = await fetch(
      `https://translate.googleapis.com/translate_a/single?${query.toString()}`,
      { method: 'GET', cache: 'no-store', headers: { accept: 'application/json, text/plain, */*' } }
    )
    if (!response.ok) throw new Error(`Google Translate HTTP ${response.status}`)
    const parsed = JSON.parse(await response.text()) as unknown
    const translated = parseGoogleTranslation(parsed)
    if (!translated) throw new Error('Resposta de tradução inválida')
    return translated
  }

  private async translateOneViaOpenRouter(
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
          { role: 'system', content: buildOpenRouterSystemPrompt(sourceLang, targetLang) },
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

  private cacheToken(provider: TranslationProviderSpec) {
    return provider.name === 'openrouter' ? `openrouter:${provider.model}` : provider.name
  }

  private cacheKey(text: string, sourceLang: string, targetLang: string, providerToken: string) {
    const hash = createHash('sha256')
      .update(providerToken)
      .update('\u0000')
      .update(sourceLang)
      .update('\u0000')
      .update(targetLang)
      .update('\u0000')
      .update(text)
      .digest('hex')
    return `${TRANSLATION_CACHE_PREFIX}:${hash}`
  }

  async translateBatch(
    texts: string[],
    sourceLang: string,
    targetLang: string,
    provider: TranslationProviderSpec,
    options: TranslateBatchOptions = {}
  ): Promise<string[]> {
    if (texts.length === 0) return []

    let apiKey = ''
    if (provider.name === 'openrouter') {
      apiKey = this.openRouter.getApiKey()
      if (!apiKey) {
        throw new Error('OpenRouter selecionado, mas nenhuma API key válida foi encontrada.')
      }
    }

    const useCache = options.useCache !== false
    const providerToken = this.cacheToken(provider)
    const translations = new Array<string>(texts.length).fill('')
    const missingIndexes: number[] = []

    if (useCache) {
      const cacheKeys = texts.map((text) => this.cacheKey(text, sourceLang, targetLang, providerToken))
      const cached = await redisMGetStrings(cacheKeys)
      for (let index = 0; index < texts.length; index += 1) {
        const hit = cached[index]
        if (typeof hit === 'string' && hit.length > 0) {
          translations[index] = hit
        } else {
          missingIndexes.push(index)
        }
      }
    } else {
      for (let index = 0; index < texts.length; index += 1) missingIndexes.push(index)
    }

    if (missingIndexes.length > 0) {
      const concurrency = provider.name === 'openrouter' ? OPENROUTER_CONCURRENCY : GOOGLE_CONCURRENCY
      await runPool(missingIndexes.length, concurrency, async (position) => {
        const index = missingIndexes[position]
        const text = texts[index]
        try {
          translations[index] = provider.name === 'openrouter'
            ? await this.translateOneViaOpenRouter(text, sourceLang, targetLang, provider.model, apiKey)
            : await this.translateOneViaGoogle(text, sourceLang, targetLang)
        } catch {
          translations[index] = text
        }
      })

      if (useCache) {
        const entries = missingIndexes.map((index) => ({
          key: this.cacheKey(texts[index], sourceLang, targetLang, providerToken),
          value: translations[index],
        }))
        await runPool(entries.length, CACHE_SET_CONCURRENCY, async (position) => {
          const entry = entries[position]
          await redisSetString(entry.key, entry.value, TRANSLATION_CACHE_TTL_SECONDS)
        })
      }
    }

    return translations
  }
}
