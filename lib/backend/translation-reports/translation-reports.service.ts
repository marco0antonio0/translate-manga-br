import type { TranslationReportsRepository } from './translation-reports.repository'
import {
  TRANSLATION_REPORT_REASONS,
  TRANSLATION_REPORT_STATUSES,
  type CreateTranslationReportInput,
  type TranslationReportReason,
  type TranslationReportStatus,
} from './translation-reports.types'

const MAX_URL_LENGTH = 2000
const MAX_TEXT_LENGTH = 5000
const MAX_METADATA_TEXT_LENGTH = 500

export class TranslationReportsService {
  constructor(private readonly repository: TranslationReportsRepository) {}

  create(userId: number, payload: unknown) {
    const input = this.normalizePayload(userId, payload)
    const id = this.repository.create(input)
    return { id }
  }

  list() {
    return this.repository.list()
  }

  updateStatus(id: number, status: unknown) {
    const normalized = String(status || '').trim() as TranslationReportStatus
    if (!TRANSLATION_REPORT_STATUSES.includes(normalized)) {
      throw new Error('Status de reporte inválido.')
    }
    const updated = this.repository.updateStatus(id, normalized)
    if (!updated) throw new Error('Reporte não encontrado.')
    return { id, status: normalized }
  }

  delete(id: number) {
    const deleted = this.repository.delete(id)
    if (!deleted) throw new Error('Reporte não encontrado.')
    return { id }
  }

  updateCorrectedText(id: number, correctedText: unknown) {
    if (typeof correctedText !== 'string') {
      throw new Error('Texto de correção inválido.')
    }
    const normalized = correctedText.replace(/\s+/g, ' ').trim().slice(0, MAX_TEXT_LENGTH)
    const updated = this.repository.updateCorrectedText(id, normalized)
    if (!updated) throw new Error('Reporte não encontrado.')
    return { id, corrected_text: normalized }
  }

  private normalizePayload(userId: number, payload: unknown): CreateTranslationReportInput {
    const data = payload && typeof payload === 'object'
      ? payload as Record<string, unknown>
      : {}
    const reason = normalizeReason(data.reason)
    if (!reason) throw new Error('Motivo do reporte inválido.')

    const pageUrl = limitRequiredText(data.page_url, MAX_URL_LENGTH, 'URL da página inválida.')
    const imageUrl = limitRequiredText(data.image_url, MAX_URL_LENGTH, 'URL da imagem inválida.')
    const box = normalizeBox(data.box)
    if (!box) throw new Error('Área do balão inválida.')

    return {
      user_id: userId,
      reason,
      page_url: pageUrl,
      image_url: imageUrl,
      item_id: limitOptionalText(data.item_id, 120),
      box,
      ocr_text: limitOptionalText(data.ocr_text, MAX_TEXT_LENGTH),
      translated_text: limitOptionalText(data.translated_text, MAX_TEXT_LENGTH),
      image_crop: normalizeImageCrop(data.image_crop),
      metadata: {
        source_lang: limitOptionalText(data.source_lang, MAX_METADATA_TEXT_LENGTH),
        target_lang: limitOptionalText(data.target_lang, MAX_METADATA_TEXT_LENGTH),
        provider_lang: limitOptionalText(data.provider_lang, MAX_METADATA_TEXT_LENGTH),
      },
    }
  }
}

// ~2M chars de base64 ≈ 1,5MB de imagem — suficiente para o recorte de um balão.
const MAX_IMAGE_CROP_LENGTH = 2_000_000
const IMAGE_CROP_DATA_URL_PATTERN = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/

function normalizeImageCrop(value: unknown) {
  const crop = typeof value === 'string' ? value.trim() : ''
  if (!crop || crop.length > MAX_IMAGE_CROP_LENGTH) return ''
  return IMAGE_CROP_DATA_URL_PATTERN.test(crop) ? crop : ''
}

function normalizeReason(value: unknown): TranslationReportReason | null {
  const reason = String(value || '').trim()
  return TRANSLATION_REPORT_REASONS.includes(reason as TranslationReportReason)
    ? reason as TranslationReportReason
    : null
}

function normalizeBox(value: unknown): [number, number, number, number] | null {
  if (!Array.isArray(value) || value.length !== 4) return null
  const box = value.map(Number)
  if (!box.every(Number.isFinite)) return null
  return [box[0], box[1], box[2], box[3]]
}

function limitRequiredText(value: unknown, maxLength: number, errorMessage: string) {
  const text = limitOptionalText(value, maxLength)
  if (!text) throw new Error(errorMessage)
  return text
}

function limitOptionalText(value: unknown, maxLength: number) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, maxLength)
}
