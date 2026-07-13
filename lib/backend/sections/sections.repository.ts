import fs from 'node:fs'
import path from 'node:path'
import { db } from '@/lib/backend/shared/database.module'
import type {
  CreateSectionData,
  ImageKind,
  OcrDetection,
  PendingSectionImage,
  ResolvedImageFile,
  SectionImageFileInput,
  SectionLangs,
} from './sections.types'

const sectionsRoot = path.resolve(process.cwd(), 'storage', 'sections')
if (!fs.existsSync(sectionsRoot)) fs.mkdirSync(sectionsRoot, { recursive: true })

function extFromName(name: string) {
  const ext = path.extname(name || '').trim().toLowerCase()
  if (!ext || ext.length > 10) return '.bin'
  return ext
}

function writeSectionImages(sectionId: number, data: SectionLangs, files: SectionImageFileInput[], startIndex: number) {
  const now = new Date().toISOString()
  const sectionDir = path.join(sectionsRoot, String(sectionId), 'images')
  fs.mkdirSync(sectionDir, { recursive: true })

  const insertImage = db.prepare(`
    INSERT INTO section_images (
      section_id, order_index, original_name, mime, size_bytes, original_path, translated_path,
      status, translation_status, selected_for_processing, source_lang, target_lang, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, NULL, 'queued', 'pending', 1, ?, ?, ?, ?)
  `)

  files.forEach((file, index) => {
    const orderIndex = startIndex + index
    const fileName = `${String(orderIndex + 1).padStart(4, '0')}${extFromName(file.name)}`
    const localPath = path.join(sectionDir, fileName)
    fs.writeFileSync(localPath, file.buffer)

    insertImage.run(
      sectionId,
      orderIndex,
      file.name || fileName,
      file.type || 'application/octet-stream',
      file.buffer.byteLength,
      localPath,
      data.sourceLang,
      data.targetLang,
      now,
      now
    )
  })

  db.prepare('UPDATE sections SET updated_at = ? WHERE id = ?').run(now, sectionId)
}


export class SectionsRepository {
  listSections(userId: number) {
    const sectionRows = db.prepare(`
      SELECT s.*,
        COUNT(i.id) as images_count,
        SUM(CASE WHEN i.selected_for_processing = 1 THEN 1 ELSE 0 END) as selected_images_count,
        SUM(CASE WHEN i.status IN ('queued','processing') THEN 1 ELSE 0 END) as queued_images_count,
        SUM(CASE WHEN i.status = 'processing' THEN 1 ELSE 0 END) as processing_images_count
      FROM sections s
      LEFT JOIN section_images i ON i.section_id = s.id
      WHERE s.user_id = ?
      GROUP BY s.id
      ORDER BY s.id DESC
    `).all(userId) as any[]

    const firstImageBySectionId = new Map<number, { imageId: number; mime: string }>()
    const firstImageRows = db.prepare(`
      SELECT i.section_id, i.id, i.mime
      FROM section_images i
      JOIN (
        SELECT section_id, MIN(order_index) AS min_order_index
        FROM section_images
        GROUP BY section_id
      ) first_i
      ON first_i.section_id = i.section_id AND first_i.min_order_index = i.order_index
    `).all() as Array<{ section_id: number; id: number; mime: string | null }>

    for (const image of firstImageRows) {
      const sectionId = Number(image.section_id)
      if (!Number.isFinite(sectionId)) continue
      if (firstImageBySectionId.has(sectionId)) continue
      firstImageBySectionId.set(sectionId, {
        imageId: Number(image.id),
        mime: typeof image.mime === 'string' && image.mime.trim() ? image.mime : 'application/octet-stream',
      })
    }

    return sectionRows.map((row) => {
      const sectionId = Number(row.id)
      const coverImage = firstImageBySectionId.get(sectionId)

      return {
        id: sectionId,
        name: String(row.name),
        priority: Number(row.priority ?? 10),
        status: String(row.status ?? 'completed'),
        internal_status: String(row.internal_status ?? 'idle'),
        source_lang: String(row.source_lang ?? 'auto'),
        target_lang: String(row.target_lang ?? 'pt-BR'),
        include_logs: Boolean(row.include_logs),
        provider_lang: String(row.provider_lang ?? 'google'),
        images_count: Number(row.images_count ?? 0),
        selected_images_count: Number(row.selected_images_count ?? 0),
        queued_images_count: Number(row.queued_images_count ?? 0),
        processing_images_count: Number(row.processing_images_count ?? 0),
        cover: coverImage
          ? {
              image_id: coverImage.imageId,
              mime: coverImage.mime,
              view_url: `/api/sections/${sectionId}/images/${coverImage.imageId}/original/view`,
              download_url: `/api/sections/${sectionId}/images/${coverImage.imageId}/original/view`,
            }
          : null,
        public_access: null,
        created_at: String(row.created_at),
        updated_at: String(row.updated_at),
      }
    })
  }

  
  createSectionWithImages(userId: number, data: CreateSectionData, files: SectionImageFileInput[]) {
    const now = new Date().toISOString()
    const sectionInsert = db.prepare(`
      INSERT INTO sections (user_id, name, priority, status, internal_status, source_lang, target_lang, provider_lang, include_logs, created_at, updated_at)
      VALUES (?, ?, 10, 'processing', 'queued', ?, ?, ?, 0, ?, ?)
    `).run(userId, data.name, data.sourceLang, data.targetLang, data.providerLang, now, now)
    const sectionId = Number(sectionInsert.lastInsertRowid)

    writeSectionImages(sectionId, data, files, 0)

    return sectionId
  }

  appendImagesToSection(userId: number, sectionId: number, files: SectionImageFileInput[]) {
    const section = db.prepare(
      'SELECT id, source_lang, target_lang, provider_lang FROM sections WHERE id = ? AND user_id = ?'
    ).get(sectionId, userId) as any
    if (!section) return null

    const countRow = db.prepare('SELECT COUNT(*) as count FROM section_images WHERE section_id = ?')
      .get(sectionId) as any
    const startIndex = Number(countRow?.count ?? 0)
    const langs = {
      sourceLang: String(section.source_lang || 'auto'),
      targetLang: String(section.target_lang || 'pt-BR'),
      providerLang: String(section.provider_lang || 'google'),
    }

    writeSectionImages(sectionId, langs, files, startIndex)

    return {
      appended: files.length,
      totalImages: startIndex + files.length,
      langs,
    }
  }

  getSectionLangs(sectionId: number, userId: number): SectionLangs | null {
    const section = db.prepare(
      'SELECT id, source_lang, target_lang, provider_lang FROM sections WHERE id = ? AND user_id = ?'
    ).get(sectionId, userId) as any
    if (!section) return null
    return {
      sourceLang: String(section.source_lang || 'auto'),
      targetLang: String(section.target_lang || 'pt-BR'),
      providerLang: String(section.provider_lang || 'google'),
    }
  }

  getPendingImages(sectionId: number): PendingSectionImage[] {
    return db.prepare(`
      SELECT id, order_index, original_path, mime
      FROM section_images
      WHERE section_id = ? AND translation_status = 'pending'
      ORDER BY order_index ASC
    `).all(sectionId) as PendingSectionImage[]
  }

  setSectionStatus(sectionId: number, patch: { status?: string; internalStatus?: string }) {
    const now = new Date().toISOString()
    if (patch.status !== undefined && patch.internalStatus !== undefined) {
      db.prepare('UPDATE sections SET status = ?, internal_status = ?, updated_at = ? WHERE id = ?')
        .run(patch.status, patch.internalStatus, now, sectionId)
    } else if (patch.internalStatus !== undefined) {
      db.prepare('UPDATE sections SET internal_status = ?, updated_at = ? WHERE id = ?')
        .run(patch.internalStatus, now, sectionId)
    } else if (patch.status !== undefined) {
      db.prepare('UPDATE sections SET status = ?, updated_at = ? WHERE id = ?')
        .run(patch.status, now, sectionId)
    }
  }

  countUnresolvedImages(sectionId: number) {
    const remaining = db.prepare(`
      SELECT COUNT(*) as count FROM section_images
      WHERE section_id = ? AND translation_status NOT IN ('translated','extracted','failed')
    `).get(sectionId) as any
    return Number(remaining?.count ?? 0)
  }

  markImageTranslating(imageId: number) {
    db.prepare(`UPDATE section_images SET status = 'processing', translation_status = 'translating', updated_at = ? WHERE id = ?`)
      .run(new Date().toISOString(), imageId)
  }

  markImageCompleted(imageId: number) {
    db.prepare(`UPDATE section_images SET status = 'completed', translation_status = 'extracted', updated_at = ? WHERE id = ?`)
      .run(new Date().toISOString(), imageId)
  }

  markImageFailed(imageId: number) {
    db.prepare(`UPDATE section_images SET status = 'error', translation_status = 'failed', updated_at = ? WHERE id = ?`)
      .run(new Date().toISOString(), imageId)
  }

  readImageBuffer(originalPath: string): Buffer | null {
    if (!originalPath || !fs.existsSync(originalPath)) return null
    return fs.readFileSync(originalPath)
  }

  replaceImageOcrItems(imageId: number, detections: OcrDetection[], translatedByIdx: Map<number, string>) {
    db.prepare('DELETE FROM section_image_ocr_items WHERE section_image_id = ?').run(imageId)

    const insertItem = db.prepare(`
      INSERT INTO section_image_ocr_items (
        section_image_id, det_id, cls_name, conf, x1, y1, x2, y2, ocr_text, translated_text, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    const insertTx = db.transaction((entries: OcrDetection[]) => {
      entries.forEach((det, idx) => {
        const box = Array.isArray(det.box) ? det.box : [0, 0, 0, 0]
        const [x1, y1, x2, y2] = box.map((n) => Math.floor(Number(n) || 0))
        insertItem.run(
          imageId,
          Number(det.det_id ?? idx + 1),
          typeof det.cls_name === 'string' ? det.cls_name : null,
          typeof det.conf === 'number' ? det.conf : null,
          x1, y1, x2, y2,
          typeof det.ocr_text === 'string' ? det.ocr_text : '',
          translatedByIdx.get(idx) ?? '',
          new Date().toISOString()
        )
      })
    })
    insertTx(detections)
  }

  
  resetSectionForReprocess(sectionId: number) {
    const now = new Date().toISOString()
    db.prepare(`
      UPDATE section_images
      SET translation_status = 'pending', status = 'queued', translated_path = NULL, updated_at = ?
      WHERE section_id = ?
    `).run(now, sectionId)
    db.prepare('UPDATE sections SET status = ?, internal_status = ?, updated_at = ? WHERE id = ?')
      .run('processing', 'queued', now, sectionId)
  }

  findSectionProvider(sectionId: number, userId: number): string | null {
    const section = db.prepare(`
      SELECT id, provider_lang
      FROM sections
      WHERE id = ? AND user_id = ?
      LIMIT 1
    `).get(sectionId, userId) as { id?: number; provider_lang?: string | null } | undefined
    if (!section?.id) return null
    return String(section.provider_lang ?? 'google')
  }

  getSectionImageCounts(sectionId: number) {
    return db.prepare(`
      SELECT
        COUNT(*) AS total_pages,
        SUM(CASE WHEN selected_for_processing = 1 THEN 1 ELSE 0 END) AS selected_pages,
        SUM(CASE WHEN translation_status IN ('translated','extracted') THEN 1 ELSE 0 END) AS translated_pages,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed_pages
      FROM section_images
      WHERE section_id = ?
    `).get(sectionId) as Record<string, unknown>
  }

  getSectionOcrAggregates(sectionId: number) {
    return db.prepare(`
      SELECT
        COUNT(DISTINCT section_image_id) AS ocr_completed_pages,
        COUNT(*) AS total_detections,
        COALESCE(SUM(LENGTH(COALESCE(ocr_text, ''))), 0) AS total_input_chars,
        COALESCE(SUM(LENGTH(COALESCE(translated_text, ''))), 0) AS total_output_chars
      FROM section_image_ocr_items
      WHERE section_image_id IN (
        SELECT id FROM section_images WHERE section_id = ?
      )
    `).get(sectionId) as Record<string, unknown>
  }

  getSectionDetail(sectionId: number, userId: number) {
    const section = db.prepare('SELECT * FROM sections WHERE id = ? AND user_id = ?').get(sectionId, userId) as any
    if (!section) return null

    const images = db.prepare('SELECT * FROM section_images WHERE section_id = ? ORDER BY order_index ASC').all(sectionId) as any[]

    return {
      id: Number(section.id),
      name: String(section.name),
      status: String(section.status ?? 'completed'),
      internal_status: String(section.internal_status ?? 'idle'),
      source_lang: String(section.source_lang ?? 'auto'),
      target_lang: String(section.target_lang ?? 'pt-BR'),
      provider_lang: String(section.provider_lang ?? 'google'),
      include_logs: Boolean(section.include_logs),
      queue: null,
      public_access: null,
      created_at: String(section.created_at),
      updated_at: String(section.updated_at),
      images: images.map((img) => {
        const items = db.prepare(`
          SELECT id, det_id, cls_name, conf, x1, y1, x2, y2, ocr_text, translated_text
          FROM section_image_ocr_items
          WHERE section_image_id = ?
          ORDER BY id ASC
        `).all(img.id) as any[]
        const overlayItems = items.map((row) => ({
          id: Number(row.id),
          det_id: Number(row.det_id),
          cls_name: row.cls_name ? String(row.cls_name) : null,
          conf: row.conf !== null && row.conf !== undefined ? Number(row.conf) : null,
          box: [Number(row.x1), Number(row.y1), Number(row.x2), Number(row.y2)] as [number, number, number, number],
          ocr_text: String(row.ocr_text || ''),
          translated_text: String(row.translated_text || ''),
        }))
        const translatedBoxes = overlayItems.filter((item) => item.translated_text).length
        return {
          id: Number(img.id),
          order_index: Number(img.order_index),
          original_name: String(img.original_name),
          mime: String(img.mime || 'application/octet-stream'),
          size_bytes: Number(img.size_bytes || 0),
          status: String(img.status || 'queued'),
          translation_status: String(img.translation_status || 'pending'),
          selected_for_processing: Boolean(img.selected_for_processing),
          translation_error: null,
          translated_mime: null,
          translated_size_bytes: 0,
          translated_width: null,
          translated_height: null,
          detections_count: overlayItems.length,
          elapsed_ms: 0,
          source_lang: img.source_lang ? String(img.source_lang) : null,
          target_lang: img.target_lang ? String(img.target_lang) : null,
          slowest_stage: null,
          ocr_cache_url: null,
          ocr: {
            total_boxes: overlayItems.length,
            translated_boxes: translatedBoxes,
            has_boxes: overlayItems.length > 0,
            items: overlayItems,
          },
          original_url: `/api/sections/${sectionId}/images/${img.id}/original/view`,
          translated_url: null,
        }
      }),
    }
  }

  deleteSection(sectionId: number, userId: number) {
    const section = db.prepare('SELECT id FROM sections WHERE id = ? AND user_id = ?').get(sectionId, userId) as any
    if (!section) return false

    db.prepare('DELETE FROM sections WHERE id = ?').run(sectionId)
    const sectionDir = path.join(sectionsRoot, String(sectionId))
    fs.rmSync(sectionDir, { recursive: true, force: true })
    return true
  }

  renameSection(sectionId: number, userId: number, name: string) {
    const row = db.prepare('SELECT id FROM sections WHERE id = ? AND user_id = ?').get(sectionId, userId) as any
    if (!row) return false
    db.prepare('UPDATE sections SET name = ?, updated_at = ? WHERE id = ?').run(name, new Date().toISOString(), sectionId)
    return true
  }

  updateSectionPriority(sectionId: number, userId: number, priority: number) {
    const row = db.prepare('SELECT id FROM sections WHERE id = ? AND user_id = ?').get(sectionId, userId) as any
    if (!row) return false
    db.prepare('UPDATE sections SET priority = ?, updated_at = ? WHERE id = ?').run(priority, new Date().toISOString(), sectionId)
    return true
  }

  updateImageSelection(sectionId: number, userId: number, selection: Record<number, boolean>) {
    const section = db.prepare('SELECT id FROM sections WHERE id = ? AND user_id = ?').get(sectionId, userId) as any
    if (!section) return false
    const now = new Date().toISOString()
    const stmt = db.prepare('UPDATE section_images SET selected_for_processing = ?, updated_at = ? WHERE id = ? AND section_id = ?')
    const tx = db.transaction((entries: [number, boolean][]) => {
      for (const [imageId, selected] of entries) {
        stmt.run(selected ? 1 : 0, now, imageId, sectionId)
      }
    })
    tx(Object.entries(selection).map(([k, v]) => [Number(k), Boolean(v)]))
    return true
  }

  resolveImageFile(sectionId: number, imageId: number, kind: ImageKind, userId: number): ResolvedImageFile | null {
    const row = db.prepare(`
      SELECT i.*, s.user_id
      FROM section_images i
      JOIN sections s ON s.id = i.section_id
      WHERE i.id = ? AND i.section_id = ?
      LIMIT 1
    `).get(imageId, sectionId) as any

    if (!row || Number(row.user_id) !== userId) return null

    const filePath = kind === 'translated'
      ? (row.translated_path || row.original_path)
      : row.original_path

    if (!filePath || !fs.existsSync(filePath)) return null

    return {
      filePath: String(filePath),
      mime: String(row.mime || 'application/octet-stream'),
      size: Number(row.size_bytes || 0),
    }
  }
}
