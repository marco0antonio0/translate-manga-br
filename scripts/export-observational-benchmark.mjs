import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'
import Database from 'better-sqlite3'

const dbPath = process.argv[2] || path.join(process.cwd(), 'storage', 'local.sqlite')
const outputPath = process.argv[3]

if (!fs.existsSync(dbPath)) {
  console.error(`Database not found: ${dbPath}`)
  process.exit(1)
}

const db = new Database(dbPath, { readonly: true, fileMustExist: true })

const all = (sql) => db.prepare(sql).all()
const get = (sql) => db.prepare(sql).get()

function elapsedSeconds(start, end) {
  const started = Date.parse(start)
  const finished = Date.parse(end)
  if (!Number.isFinite(started) || !Number.isFinite(finished)) return null
  return Math.max(0, (finished - started) / 1000)
}

function median(values) {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  if (sorted.length % 2 === 1) return sorted[middle]
  return (sorted[middle - 1] + sorted[middle]) / 2
}

function mean(values) {
  if (values.length === 0) return null
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function round(value, digits = 4) {
  if (value === null || value === undefined || Number.isNaN(value)) return null
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

function directoryBytes(root) {
  if (!fs.existsSync(root)) return 0
  let total = 0
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const fullPath = path.join(root, entry.name)
    if (entry.isDirectory()) {
      total += directoryBytes(fullPath)
    } else if (entry.isFile()) {
      total += fs.statSync(fullPath).size
    }
  }
  return total
}

const sections = all(`
  SELECT
    s.id AS section_id,
    s.status,
    s.internal_status,
    s.source_lang,
    s.target_lang,
    s.provider_lang,
    s.created_at,
    s.updated_at,
    COUNT(DISTINCT i.id) AS pages,
    COALESCE(SUM(i.size_bytes), 0) AS input_bytes,
    COUNT(o.id) AS ocr_items,
    SUM(CASE WHEN LENGTH(TRIM(o.ocr_text)) > 0 THEN 1 ELSE 0 END) AS ocr_items_with_text,
    SUM(CASE WHEN LENGTH(TRIM(o.translated_text)) > 0 THEN 1 ELSE 0 END) AS ocr_items_with_translation
  FROM sections s
  LEFT JOIN section_images i ON i.section_id = s.id
  LEFT JOIN section_image_ocr_items o ON o.section_image_id = i.id
  GROUP BY s.id
  ORDER BY s.id
`).map((row) => {
  const elapsed = elapsedSeconds(row.created_at, row.updated_at)
  const pages = Number(row.pages)

  return {
    ...row,
    elapsed_seconds_created_to_updated: elapsed,
    pages_per_minute_created_to_updated: elapsed && pages ? round((pages / elapsed) * 60) : null,
    seconds_per_page_created_to_updated: elapsed && pages ? round(elapsed / pages) : null,
  }
})

const completedSections = sections.filter(
  (section) =>
    section.status === 'completed' &&
    Number(section.pages) > 0 &&
    Number(section.elapsed_seconds_created_to_updated) > 0
)

const images = all(`
  SELECT
    i.id AS image_id,
    i.section_id,
    i.status,
    i.translation_status,
    i.size_bytes,
    i.created_at,
    i.updated_at,
    COUNT(o.id) AS ocr_items,
    SUM(CASE WHEN LENGTH(TRIM(o.ocr_text)) > 0 THEN 1 ELSE 0 END) AS ocr_items_with_text,
    SUM(CASE WHEN LENGTH(TRIM(o.translated_text)) > 0 THEN 1 ELSE 0 END) AS ocr_items_with_translation
  FROM section_images i
  LEFT JOIN section_image_ocr_items o ON o.section_image_id = i.id
  GROUP BY i.id
  ORDER BY i.id
`).map((row) => ({
  ...row,
  elapsed_seconds_created_to_updated: elapsedSeconds(row.created_at, row.updated_at),
}))

const completedImages = images.filter((image) => image.status === 'completed')
const imageElapsed = completedImages
  .map((image) => image.elapsed_seconds_created_to_updated)
  .filter((value) => Number.isFinite(value))
const imageOcrCounts = completedImages.map((image) => Number(image.ocr_items))
const sectionSecondsPerPage = completedSections
  .map((section) => section.seconds_per_page_created_to_updated)
  .filter((value) => Number.isFinite(value))
const sectionPagesPerMinute = completedSections
  .map((section) => section.pages_per_minute_created_to_updated)
  .filter((value) => Number.isFinite(value))

const storageRoot = path.join(path.dirname(dbPath), '.')
const result = {
  generated_at: new Date().toISOString(),
  source_database: path.relative(process.cwd(), dbPath),
  privacy_note:
    'This export contains aggregate counts, statuses, timestamps, sizes, and anonymized numeric section identifiers only. OCR text, translated text, user names, emails, password hashes, API keys, overlay contents, manga titles, and page images are intentionally excluded.',
  environment: {
    hostname: os.hostname(),
    platform: os.platform(),
    release: os.release(),
    arch: os.arch(),
    cpu_model: os.cpus()[0]?.model ?? null,
    logical_cpus: os.cpus().length,
    total_memory_bytes: os.totalmem(),
    onnx_execution_provider: 'cpu',
  },
  pipeline: {
    local_detection_and_ocr: 'YOLO ONNX and PaddleOCR ONNX through onnxruntime-node and sharp',
    translation_provider_note:
      'Translation may use an external provider depending on section provider_lang; local CPU metrics primarily describe detection, OCR, image preprocessing, persistence, and orchestration.',
    timing_note:
      'The current schema does not store dedicated processing_start/processing_finish timestamps. Elapsed timing uses created_at to updated_at and should be treated as an observational workflow duration proxy.',
  },
  counts: {
    users: get('SELECT COUNT(*) AS count FROM users').count,
    sections: get('SELECT COUNT(*) AS count FROM sections').count,
    section_images: get('SELECT COUNT(*) AS count FROM section_images').count,
    ocr_items: get('SELECT COUNT(*) AS count FROM section_image_ocr_items').count,
  },
  status_counts: {
    sections: all(`
      SELECT status, internal_status, COUNT(*) AS count
      FROM sections
      GROUP BY status, internal_status
      ORDER BY count DESC
    `),
    images: all(`
      SELECT status, translation_status, COUNT(*) AS count
      FROM section_images
      GROUP BY status, translation_status
      ORDER BY count DESC
    `),
  },
  date_ranges: {
    sections: get('SELECT MIN(created_at) AS first_created_at, MAX(updated_at) AS last_updated_at FROM sections'),
    images: get('SELECT MIN(created_at) AS first_created_at, MAX(updated_at) AS last_updated_at FROM section_images'),
  },
  languages: {
    sections: all(`
      SELECT source_lang, target_lang, provider_lang, COUNT(*) AS count
      FROM sections
      GROUP BY source_lang, target_lang, provider_lang
      ORDER BY count DESC
    `),
    images: all(`
      SELECT source_lang, target_lang, COUNT(*) AS count
      FROM section_images
      GROUP BY source_lang, target_lang
      ORDER BY count DESC
    `),
  },
  derived_elapsed_metrics: {
    completed_sections_with_elapsed: completedSections.length,
    total_pages_in_completed_sections: completedSections.reduce((sum, section) => sum + Number(section.pages), 0),
    total_ocr_items_in_completed_sections: completedSections.reduce((sum, section) => sum + Number(section.ocr_items), 0),
    median_seconds_per_page_created_to_updated: round(median(sectionSecondsPerPage)),
    mean_seconds_per_page_created_to_updated: round(mean(sectionSecondsPerPage)),
    median_pages_per_minute_created_to_updated: round(median(sectionPagesPerMinute)),
    mean_pages_per_minute_created_to_updated: round(mean(sectionPagesPerMinute)),
  },
  image_elapsed_created_to_updated: {
    min_seconds: round(Math.min(...imageElapsed)),
    median_seconds: round(median(imageElapsed)),
    mean_seconds: round(mean(imageElapsed)),
    max_seconds: round(Math.max(...imageElapsed)),
  },
  ocr_items_per_completed_image: {
    min: imageOcrCounts.length ? Math.min(...imageOcrCounts) : null,
    median: round(median(imageOcrCounts)),
    mean: round(mean(imageOcrCounts)),
    max: imageOcrCounts.length ? Math.max(...imageOcrCounts) : null,
  },
  translation_coverage: {
    ocr_items_total: images.reduce((sum, image) => sum + Number(image.ocr_items), 0),
    ocr_items_with_text: images.reduce((sum, image) => sum + Number(image.ocr_items_with_text || 0), 0),
    ocr_items_with_translation: images.reduce((sum, image) => sum + Number(image.ocr_items_with_translation || 0), 0),
  },
  file_storage: {
    storage_bytes: directoryBytes(storageRoot),
    db_bytes: fs.statSync(dbPath).size,
  },
  sections_anonymized: sections,
}

const payload = JSON.stringify(result, null, 2)
if (outputPath) {
  fs.writeFileSync(outputPath, `${payload}\n`)
} else {
  console.log(payload)
}
