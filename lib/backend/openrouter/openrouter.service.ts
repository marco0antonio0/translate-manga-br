import type { OpenRouterRepository } from './openrouter.repository'
import {
  ALLOWED_OPENROUTER_MODELS,
  isAllowedOpenRouterModel,
  type OpenRouterKeyValidation,
  type OpenRouterStatus,
} from './openrouter.types'

export class OpenRouterService {
  constructor(private readonly repository: OpenRouterRepository) {}

  
  getApiKey(): string {
    return (this.repository.getApiKey() || '').trim()
  }

  
  getSelectedModel(): string {
    return (this.repository.getSelectedModel() || '').trim()
  }

  async validateApiKey(apiKey: string): Promise<OpenRouterKeyValidation> {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/models', {
        method: 'GET',
        headers: { Authorization: `Bearer ${apiKey}` },
        cache: 'no-store',
      })
      if (!response.ok) return { valid: false, availableModels: [] }

      const payload = await response.json() as { data?: Array<{ id?: string }> }
      const ids = Array.isArray(payload?.data)
        ? payload.data.map((entry) => String(entry?.id ?? '').trim()).filter(Boolean)
        : []

      const availableModels = ALLOWED_OPENROUTER_MODELS.filter((model) => ids.includes(model))
      return { valid: true, availableModels: [...availableModels] }
    } catch {
      return { valid: false, availableModels: [] }
    }
  }

  async getStatus(): Promise<OpenRouterStatus> {
    const apiKey = this.repository.getApiKey()
    const selectedModel = this.repository.getSelectedModel()

    if (!apiKey) {
      return { hasApiKey: false, isValid: false, availableModels: [], selectedModel: null }
    }

    const validation = await this.validateApiKey(apiKey)
    const normalizedSelected = selectedModel
      && isAllowedOpenRouterModel(selectedModel)
      && validation.availableModels.includes(selectedModel)
      ? selectedModel
      : null

    return {
      hasApiKey: true,
      isValid: validation.valid,
      availableModels: validation.availableModels,
      selectedModel: normalizedSelected,
    }
  }

  
  async saveApiKey(apiKey: string): Promise<OpenRouterKeyValidation> {
    const validation = await this.validateApiKey(apiKey)
    if (!validation.valid) return validation

    this.repository.setApiKey(apiKey)

    const selectedModel = this.repository.getSelectedModel()
    const selectionIsValid = selectedModel
      && isAllowedOpenRouterModel(selectedModel)
      && validation.availableModels.includes(selectedModel)
    if (!selectionIsValid && validation.availableModels.length > 0) {
      this.repository.setSelectedModel(validation.availableModels[0])
    }

    return validation
  }

  async selectModel(model: string): Promise<{ ok: boolean; error?: string }> {
    if (!isAllowedOpenRouterModel(model)) {
      return { ok: false, error: 'Modelo não permitido.' }
    }

    const apiKey = this.repository.getApiKey()
    if (!apiKey) {
      return { ok: false, error: 'Cadastre uma API key antes de escolher o modelo.' }
    }

    const validation = await this.validateApiKey(apiKey)
    if (!validation.valid || !validation.availableModels.includes(model)) {
      return { ok: false, error: 'Modelo indisponível para a API key informada.' }
    }

    this.repository.setSelectedModel(model)
    return { ok: true }
  }

  clear() {
    this.repository.clear()
  }
}
