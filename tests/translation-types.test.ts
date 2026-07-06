import { describe, expect, it } from 'vitest'
import { parseProviderSpec } from '../lib/backend/translation/translation.types'

describe('translation provider parsing', () => {
  it('defaults to Google for unknown provider values', () => {
    expect(parseProviderSpec(undefined)).toEqual({ name: 'google' })
    expect(parseProviderSpec('google')).toEqual({ name: 'google' })
    expect(parseProviderSpec('anything-else')).toEqual({ name: 'google' })
  })

  it('parses OpenRouter model specs with a fallback model', () => {
    expect(parseProviderSpec('openrouter:anthropic/claude-3.5-haiku')).toEqual({
      name: 'openrouter',
      model: 'anthropic/claude-3.5-haiku',
    })
    expect(parseProviderSpec('openrouter:', 'meta-llama/llama-3.1-8b-instruct')).toEqual({
      name: 'openrouter',
      model: 'meta-llama/llama-3.1-8b-instruct',
    })
  })
})
