export const migration002TranslationReports = {
  version: 2,
  name: '002_translation_reports',
  up: `
    CREATE TABLE IF NOT EXISTS translation_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      reason TEXT NOT NULL,
      page_url TEXT NOT NULL,
      image_url TEXT NOT NULL,
      item_id TEXT NOT NULL DEFAULT '',
      box_json TEXT NOT NULL,
      ocr_text TEXT NOT NULL DEFAULT '',
      translated_text TEXT NOT NULL DEFAULT '',
      metadata_json TEXT NOT NULL DEFAULT '{}',
      status TEXT NOT NULL DEFAULT 'open',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_translation_reports_user
      ON translation_reports(user_id);

    CREATE INDEX IF NOT EXISTS idx_translation_reports_reason
      ON translation_reports(reason);

    CREATE INDEX IF NOT EXISTS idx_translation_reports_status
      ON translation_reports(status);

    CREATE INDEX IF NOT EXISTS idx_translation_reports_created_at
      ON translation_reports(created_at);
  `,
} as const
