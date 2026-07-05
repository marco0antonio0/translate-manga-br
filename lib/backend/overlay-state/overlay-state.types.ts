export interface OverlayItemOverrideState {
  dx: number
  dy: number
  shape?: 'rect' | 'oval'
  fontScale?: number
  sizeScale?: number
  widthScale?: number
  heightScale?: number
  density?: number
}

export interface OverlayManualItemState {
  id: number
  box: [number, number, number, number]
  ocr_text: string
  translated_text: string
}

export interface OverlayStateRecord {
  font_family: string
  font_scale: number
  box_inset_percent: number
  density: number
  global_shape: 'rect' | 'oval'
  overrides_by_image_id: Record<string, Record<string, OverlayItemOverrideState>>
  manual_items_by_image_id: Record<string, OverlayManualItemState[]>
  hidden_item_ids_by_image_id: Record<string, number[]>
  updated_at: string
}

export type SaveOverlayStateResult =
  | { ok: true; state: OverlayStateRecord }
  | { ok: false; error: 'invalid-payload' | 'too-large' }
