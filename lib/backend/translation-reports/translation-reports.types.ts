export const TRANSLATION_REPORT_REASONS = [
  'incorrect_translation',
  'not_translated',
  'inadequate_meaning',
  'unethical_content',
] as const

export type TranslationReportReason = typeof TRANSLATION_REPORT_REASONS[number]

export interface CreateTranslationReportInput {
  user_id: number
  reason: TranslationReportReason
  page_url: string
  image_url: string
  item_id: string
  box: [number, number, number, number]
  ocr_text: string
  translated_text: string
  image_crop: string
  metadata: Record<string, unknown>
}

export const TRANSLATION_REPORT_STATUSES = ['open', 'reviewed', 'dismissed'] as const

export type TranslationReportStatus = typeof TRANSLATION_REPORT_STATUSES[number]

export interface TranslationReportRecord extends CreateTranslationReportInput {
  id: number
  status: TranslationReportStatus
  corrected_text: string
  created_at: string
  updated_at: string
}

export interface TranslationReportListItem extends TranslationReportRecord {
  user_name: string
  user_email: string
}
