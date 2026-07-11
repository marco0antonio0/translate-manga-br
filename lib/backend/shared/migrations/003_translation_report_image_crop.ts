export const migration003TranslationReportImageCrop = {
  version: 3,
  name: '003_translation_report_image_crop',
  up: `
    ALTER TABLE translation_reports
      ADD COLUMN image_crop TEXT NOT NULL DEFAULT '';
  `,
} as const
