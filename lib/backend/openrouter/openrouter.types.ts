export const ALLOWED_OPENROUTER_MODELS = ['google/gemma-4-31b-it'] as const

export type AllowedOpenRouterModel = (typeof ALLOWED_OPENROUTER_MODELS)[number]

export interface OpenRouterKeyValidation {
  valid: boolean
  availableModels: AllowedOpenRouterModel[]
}

export interface OpenRouterStatus {
  hasApiKey: boolean
  isValid: boolean
  availableModels: AllowedOpenRouterModel[]
  selectedModel: AllowedOpenRouterModel | null
}

export function isAllowedOpenRouterModel(value: string): value is AllowedOpenRouterModel {
  return ALLOWED_OPENROUTER_MODELS.includes(value as AllowedOpenRouterModel)
}
