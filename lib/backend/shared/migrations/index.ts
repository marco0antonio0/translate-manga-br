import { migration001InitialSchema } from './001_initial_schema'
import { migration002TranslationReports } from './002_translation_reports'
import { migration003TranslationReportImageCrop } from './003_translation_report_image_crop'
import { migration004TranslationReportCorrectedText } from './004_translation_report_corrected_text'

export interface SqliteMigration {
  version: number
  name: string
  up: string
}

export const SQLITE_MIGRATIONS: SqliteMigration[] = [
  migration001InitialSchema,
  migration002TranslationReports,
  migration003TranslationReportImageCrop,
  migration004TranslationReportCorrectedText,
]
