import type { OverlayStateRepository } from './overlay-state.repository'
import type {
  OverlayItemOverrideState,
  OverlayManualItemState,
  OverlayStateRecord,
  SaveOverlayStateResult,
} from './overlay-state.types'

const MAX_OVERLAY_STATE_BYTES = 900_000

const ALLOWED_FONT_FAMILIES = new Set([
  'sans',
  'serif',
  'mono',
  'comic',
  'manga',
  'anime',
  'manhwa',
  'condensed',
])
const ALLOWED_SHAPES = new Set(['rect', 'oval'])

function asObjectRecord(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

function toFiniteNumber(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return null
}

function clampRange(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min
  return Math.max(min, Math.min(max, value))
}

function sanitizeOverrides(rawValue: unknown) {
  const root = asObjectRecord(rawValue)
  if (!root) return {} as Record<string, Record<string, OverlayItemOverrideState>>

  const result: Record<string, Record<string, OverlayItemOverrideState>> = {}
  const imageEntries = Object.entries(root).slice(0, 1000)

  for (const [imageId, imageOverridesRaw] of imageEntries) {
    const imageOverrides = asObjectRecord(imageOverridesRaw)
    if (!imageOverrides) continue

    const nextImageOverrides: Record<string, OverlayItemOverrideState> = {}
    const itemEntries = Object.entries(imageOverrides).slice(0, 5000)

    for (const [itemId, itemOverrideRaw] of itemEntries) {
      const itemOverride = asObjectRecord(itemOverrideRaw)
      if (!itemOverride) continue

      const dx = clampRange(toFiniteNumber(itemOverride.dx) ?? 0, -5000, 5000)
      const dy = clampRange(toFiniteNumber(itemOverride.dy) ?? 0, -5000, 5000)
      const shapeRaw = typeof itemOverride.shape === 'string' ? itemOverride.shape.trim().toLowerCase() : ''
      const fontScaleRaw = toFiniteNumber(itemOverride.fontScale)
      const sizeScaleRaw = toFiniteNumber(itemOverride.sizeScale)
      const widthScaleRaw = toFiniteNumber(itemOverride.widthScale)
      const heightScaleRaw = toFiniteNumber(itemOverride.heightScale)
      const densityRaw = toFiniteNumber(itemOverride.density)

      const nextItemOverride: OverlayItemOverrideState = { dx, dy }

      if (ALLOWED_SHAPES.has(shapeRaw)) {
        nextItemOverride.shape = shapeRaw as 'rect' | 'oval'
      }
      if (fontScaleRaw !== null) {
        nextItemOverride.fontScale = clampRange(fontScaleRaw, 0.45, 5)
      }
      if (sizeScaleRaw !== null) {
        nextItemOverride.sizeScale = clampRange(sizeScaleRaw, 0.55, 1.85)
      }
      if (widthScaleRaw !== null) {
        nextItemOverride.widthScale = clampRange(widthScaleRaw, 0.25, 4)
      }
      if (heightScaleRaw !== null) {
        nextItemOverride.heightScale = clampRange(heightScaleRaw, 0.25, 4)
      }
      if (densityRaw !== null) {
        nextItemOverride.density = clampRange(densityRaw, 0.45, 2.5)
      }

      nextImageOverrides[itemId] = nextItemOverride
    }

    if (Object.keys(nextImageOverrides).length > 0) {
      result[imageId] = nextImageOverrides
    }
  }

  return result
}

function sanitizeManualItems(rawValue: unknown) {
  const root = asObjectRecord(rawValue)
  if (!root) return {} as Record<string, OverlayManualItemState[]>

  const result: Record<string, OverlayManualItemState[]> = {}
  const imageEntries = Object.entries(root).slice(0, 1000)

  for (const [imageId, imageManualItemsRaw] of imageEntries) {
    if (!Array.isArray(imageManualItemsRaw) || imageManualItemsRaw.length === 0) continue

    const nextImageManualItems: OverlayManualItemState[] = []
    for (const imageManualItemRaw of imageManualItemsRaw.slice(0, 5000)) {
      const imageManualItem = asObjectRecord(imageManualItemRaw)
      if (!imageManualItem) continue

      const itemIdRaw = toFiniteNumber(imageManualItem.id)
      if (itemIdRaw === null) continue

      const box = Array.isArray(imageManualItem.box) ? imageManualItem.box : []
      if (box.length !== 4) continue

      const x1Raw = toFiniteNumber(box[0])
      const y1Raw = toFiniteNumber(box[1])
      const x2Raw = toFiniteNumber(box[2])
      const y2Raw = toFiniteNumber(box[3])
      if (x1Raw === null || y1Raw === null || x2Raw === null || y2Raw === null) continue

      const x1 = clampRange(Math.min(x1Raw, x2Raw), 0, 100_000)
      const y1 = clampRange(Math.min(y1Raw, y2Raw), 0, 100_000)
      const x2 = clampRange(Math.max(x1Raw, x2Raw), 0, 100_000)
      const y2 = clampRange(Math.max(y1Raw, y2Raw), 0, 100_000)
      if (x2 <= x1 || y2 <= y1) continue

      const ocrTextRaw = typeof imageManualItem.ocr_text === 'string'
        ? imageManualItem.ocr_text
        : (typeof imageManualItem.ocrText === 'string' ? imageManualItem.ocrText : '')
      const translatedTextRaw = typeof imageManualItem.translated_text === 'string'
        ? imageManualItem.translated_text
        : (typeof imageManualItem.translatedText === 'string' ? imageManualItem.translatedText : '')
      const ocrText = ocrTextRaw.trim().slice(0, 12_000)
      const translatedText = translatedTextRaw.trim().slice(0, 12_000)
      if (!ocrText && !translatedText) continue

      nextImageManualItems.push({
        id: Math.floor(itemIdRaw),
        box: [x1, y1, x2, y2],
        ocr_text: ocrText || translatedText,
        translated_text: translatedText || ocrText,
      })
    }

    if (nextImageManualItems.length > 0) {
      result[imageId] = nextImageManualItems
    }
  }

  return result
}

function sanitizeHiddenItemIds(rawValue: unknown) {
  const root = asObjectRecord(rawValue)
  if (!root) return {} as Record<string, number[]>

  const result: Record<string, number[]> = {}
  const imageEntries = Object.entries(root).slice(0, 1000)

  for (const [imageId, hiddenIdsRaw] of imageEntries) {
    if (!Array.isArray(hiddenIdsRaw) || hiddenIdsRaw.length === 0) continue

    const nextHiddenIds = hiddenIdsRaw
      .map((value) => toFiniteNumber(value))
      .filter((value): value is number => value !== null)
      .map((value) => Math.floor(value))
      .filter((value, index, array) => array.indexOf(value) === index)
      .sort((a, b) => a - b)

    if (nextHiddenIds.length > 0) {
      result[imageId] = nextHiddenIds
    }
  }

  return result
}

function sanitizeOverlayState(rawValue: unknown): OverlayStateRecord | null {
  const root = asObjectRecord(rawValue)
  if (!root) return null

  const fontFamilyRaw = typeof root.font_family === 'string' ? root.font_family.trim() : 'condensed'
  const fontFamily = ALLOWED_FONT_FAMILIES.has(fontFamilyRaw) ? fontFamilyRaw : 'condensed'
  const globalShapeRaw = typeof root.global_shape === 'string' ? root.global_shape.trim().toLowerCase() : 'rect'
  const globalShape = ALLOWED_SHAPES.has(globalShapeRaw) ? (globalShapeRaw as 'rect' | 'oval') : 'rect'

  const fontScale = clampRange(toFiniteNumber(root.font_scale) ?? 0.3, 0.1, 1.35)
  const boxInsetPercent = clampRange(toFiniteNumber(root.box_inset_percent) ?? 6, -20, 30)
  const density = clampRange(toFiniteNumber(root.density) ?? 1, 0.35, 2.2)

  return {
    font_family: fontFamily,
    font_scale: fontScale,
    box_inset_percent: boxInsetPercent,
    density,
    global_shape: globalShape,
    overrides_by_image_id: sanitizeOverrides(root.overrides_by_image_id),
    manual_items_by_image_id: sanitizeManualItems(root.manual_items_by_image_id),
    hidden_item_ids_by_image_id: sanitizeHiddenItemIds(root.hidden_item_ids_by_image_id),
    updated_at: new Date().toISOString(),
  }
}


export class OverlayStateService {
  constructor(private readonly repository: OverlayStateRepository) {}

  getState(sectionId: string, userId: number) {
    return this.repository.getState(sectionId, userId)
  }

  async saveState(sectionId: string, userId: number, rawState: unknown): Promise<SaveOverlayStateResult> {
    const state = sanitizeOverlayState(rawState)
    if (!state) return { ok: false, error: 'invalid-payload' }

    const serialized = JSON.stringify(state)
    if (Buffer.byteLength(serialized, 'utf8') > MAX_OVERLAY_STATE_BYTES) {
      return { ok: false, error: 'too-large' }
    }

    await this.repository.saveState(sectionId, userId, state)
    return { ok: true, state }
  }
}
