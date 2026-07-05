export type TranslationProviderSpec =
  | { name: 'google' }
  | { name: 'openrouter'; model: string }

export interface TranslateBatchOptions {
  /** Usa cache Redis por (provider, idiomas, texto). Padrão: true. */
  useCache?: boolean
}

export interface TranslateBatchResult {
  translations: string[]
  provider: TranslationProviderSpec
}

/** Interpreta o `provider_lang` persistido/enviado ("google" | "openrouter:<model>"). */
export function parseProviderSpec(value: unknown, fallbackModel = 'google/gemma-4-31b-it'): TranslationProviderSpec {
  if (typeof value !== 'string') return { name: 'google' }
  const normalized = value.trim()
  if (normalized.toLowerCase().startsWith('openrouter:')) {
    const model = normalized.slice('openrouter:'.length).trim()
    return { name: 'openrouter', model: model || fallbackModel }
  }
  return { name: 'google' }
}
