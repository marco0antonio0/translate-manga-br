export const migration004TranslationReportCorrectedText = {
  version: 4,
  name: '004_translation_report_corrected_text',
  up: `
    ALTER TABLE translation_reports
      ADD COLUMN corrected_text TEXT NOT NULL DEFAULT '';
  `,
} as const
