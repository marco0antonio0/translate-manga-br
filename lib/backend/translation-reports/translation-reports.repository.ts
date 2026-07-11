import 'server-only'

import { db } from '@/lib/backend/shared/database.module'
import type {
  CreateTranslationReportInput,
  TranslationReportListItem,
  TranslationReportReason,
  TranslationReportStatus,
} from './translation-reports.types'

interface TranslationReportRow {
  id: number
  user_id: number
  reason: string
  page_url: string
  image_url: string
  item_id: string
  box_json: string
  ocr_text: string
  translated_text: string
  image_crop: string
  metadata_json: string
  status: string
  corrected_text: string
  created_at: string
  updated_at: string
  user_name: string | null
  user_email: string | null
}

export class TranslationReportsRepository {
  create(input: CreateTranslationReportInput) {
    const now = new Date().toISOString()
    const result = db.prepare(`
      INSERT INTO translation_reports (
        user_id,
        reason,
        page_url,
        image_url,
        item_id,
        box_json,
        ocr_text,
        translated_text,
        image_crop,
        metadata_json,
        status,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', ?, ?)
    `).run(
      input.user_id,
      input.reason,
      input.page_url,
      input.image_url,
      input.item_id,
      JSON.stringify(input.box),
      input.ocr_text,
      input.translated_text,
      input.image_crop,
      JSON.stringify(input.metadata),
      now,
      now
    )

    return Number(result.lastInsertRowid)
  }

  list(): TranslationReportListItem[] {
    const rows = db.prepare(`
      SELECT
        r.id,
        r.user_id,
        r.reason,
        r.page_url,
        r.image_url,
        r.item_id,
        r.box_json,
        r.ocr_text,
        r.translated_text,
        r.image_crop,
        r.metadata_json,
        r.status,
        r.corrected_text,
        r.created_at,
        r.updated_at,
        u.name AS user_name,
        u.email AS user_email
      FROM translation_reports r
      LEFT JOIN users u ON u.id = r.user_id
      ORDER BY r.created_at DESC, r.id DESC
    `).all() as TranslationReportRow[]

    return rows.map((row) => ({
      id: Number(row.id),
      user_id: Number(row.user_id),
      reason: row.reason as TranslationReportReason,
      page_url: row.page_url,
      image_url: row.image_url,
      item_id: row.item_id,
      box: parseBox(row.box_json),
      ocr_text: row.ocr_text,
      translated_text: row.translated_text,
      image_crop: row.image_crop || '',
      metadata: parseMetadata(row.metadata_json),
      status: row.status as TranslationReportStatus,
      corrected_text: row.corrected_text || '',
      created_at: row.created_at,
      updated_at: row.updated_at,
      user_name: row.user_name || '',
      user_email: row.user_email || '',
    }))
  }

  updateStatus(id: number, status: TranslationReportStatus) {
    const result = db.prepare(`
      UPDATE translation_reports
      SET status = ?, updated_at = ?
      WHERE id = ?
    `).run(status, new Date().toISOString(), id)
    return result.changes > 0
  }

  delete(id: number) {
    const result = db.prepare('DELETE FROM translation_reports WHERE id = ?').run(id)
    return result.changes > 0
  }

  updateCorrectedText(id: number, correctedText: string) {
    const result = db.prepare(`
      UPDATE translation_reports
      SET corrected_text = ?, updated_at = ?
      WHERE id = ?
    `).run(correctedText, new Date().toISOString(), id)
    return result.changes > 0
  }
}

function parseBox(value: string): [number, number, number, number] {
  try {
    const box = JSON.parse(value)
    if (Array.isArray(box) && box.length === 4 && box.every((item) => Number.isFinite(Number(item)))) {
      return [Number(box[0]), Number(box[1]), Number(box[2]), Number(box[3])]
    }
  } catch {
  }
  return [0, 0, 0, 0]
}

function parseMetadata(value: string): Record<string, unknown> {
  try {
    const metadata = JSON.parse(value)
    return metadata && typeof metadata === 'object' ? metadata : {}
  } catch {
    return {}
  }
}
