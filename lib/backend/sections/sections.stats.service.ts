import type { OpenRouterService } from '@/lib/backend/openrouter/openrouter.service'
import type { SectionsRepository } from './sections.repository'

const GEMMA_MODEL_ID = 'google/gemma-4-31b-it'
const GEMMA_INPUT_PRICE_PER_1M = 0.12
const GEMMA_OUTPUT_PRICE_PER_1M = 0.37
const CHARS_PER_TOKEN_ESTIMATE = 4

function toNum(value: unknown) {
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : 0
}

/** Estatísticas de processamento e estimativa de custo por seção. */
export class SectionsStatsService {
  constructor(
    private readonly repository: SectionsRepository,
    private readonly openRouter: OpenRouterService
  ) {}

  getSectionStats(sectionId: number, userId: number) {
    const providerLang = this.repository.findSectionProvider(sectionId, userId)
    if (providerLang === null) return null

    const counts = this.repository.getSectionImageCounts(sectionId)
    const ocr = this.repository.getSectionOcrAggregates(sectionId)

    const totalPages = Math.max(0, Math.floor(toNum(counts.total_pages)))
    const selectedPages = Math.max(0, Math.floor(toNum(counts.selected_pages)))
    const translatedPages = Math.max(0, Math.floor(toNum(counts.translated_pages)))
    const completedPages = Math.max(0, Math.floor(toNum(counts.completed_pages)))
    const ocrCompletedPages = Math.max(0, Math.floor(toNum(ocr.ocr_completed_pages)))
    const totalDetections = Math.max(0, Math.floor(toNum(ocr.total_detections)))
    const totalInputChars = Math.max(0, Math.floor(toNum(ocr.total_input_chars)))
    const totalOutputChars = Math.max(0, Math.floor(toNum(ocr.total_output_chars)))

    const estimatedInputTokens = Math.max(0, totalInputChars / CHARS_PER_TOKEN_ESTIMATE)
    const estimatedOutputTokens = Math.max(0, totalOutputChars / CHARS_PER_TOKEN_ESTIMATE)

    const normalizedProvider = providerLang.trim().toLowerCase()
    const isOpenRouterProvider = normalizedProvider === 'openrouter' || normalizedProvider.startsWith('openrouter:')
    const modelFromProvider = normalizedProvider.startsWith('openrouter:')
      ? providerLang.trim().slice('openrouter:'.length).trim()
      : ''
    const costModel = modelFromProvider || this.openRouter.getSelectedModel() || GEMMA_MODEL_ID

    const estimatedInputCostUsd = isOpenRouterProvider
      ? (estimatedInputTokens / 1_000_000) * GEMMA_INPUT_PRICE_PER_1M
      : null
    const estimatedOutputCostUsd = isOpenRouterProvider
      ? (estimatedOutputTokens / 1_000_000) * GEMMA_OUTPUT_PRICE_PER_1M
      : null
    const estimatedTotalCostUsd = (
      estimatedInputCostUsd !== null
      && estimatedOutputCostUsd !== null
    )
      ? estimatedInputCostUsd + estimatedOutputCostUsd
      : null

    return {
      section_id: sectionId,
      total_pages: totalPages,
      selected_pages: selectedPages,
      translated_pages: translatedPages,
      ocr_completed_pages: ocrCompletedPages,
      completed_pages: completedPages,
      pages_with_elapsed_ms: 0,
      total_elapsed_minutes: 0,
      avg_elapsed_seconds_per_page: 0,
      total_detections: totalDetections,
      provider_lang: providerLang,
      cost_model: isOpenRouterProvider ? costModel : null,
      estimated_input_tokens: Math.round(estimatedInputTokens),
      estimated_output_tokens: Math.round(estimatedOutputTokens),
      estimated_input_cost_usd: estimatedInputCostUsd,
      estimated_output_cost_usd: estimatedOutputCostUsd,
      estimated_total_cost_usd: estimatedTotalCostUsd,
      generated_at: new Date().toISOString(),
    }
  }
}
