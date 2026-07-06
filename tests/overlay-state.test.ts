import { describe, expect, it } from 'vitest'
import { OverlayStateService } from '../lib/backend/overlay-state/overlay-state.service'
import type { OverlayStateRecord } from '../lib/backend/overlay-state/overlay-state.types'

class MemoryOverlayRepository {
  saved: OverlayStateRecord | null = null

  async getState() {
    return this.saved
  }

  async saveState(_sectionId: string, _userId: number, state: OverlayStateRecord) {
    this.saved = state
  }
}

describe('overlay state sanitization', () => {
  it('clamps numeric values and keeps only supported enum values', async () => {
    const repository = new MemoryOverlayRepository()
    const service = new OverlayStateService(repository)

    const result = await service.saveState('section-1', 7, {
      font_family: 'unknown-font',
      font_scale: 99,
      box_inset_percent: -99,
      density: '9',
      global_shape: 'triangle',
      overrides_by_image_id: {
        1: {
          3: {
            dx: 9000,
            dy: -9000,
            shape: 'oval',
            fontScale: 20,
            sizeScale: 0.1,
            widthScale: 99,
            heightScale: -1,
            density: 7,
          },
        },
      },
      hidden_item_ids_by_image_id: {
        1: [4, '2', 4, 'invalid'],
      },
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.state.font_family).toBe('condensed')
    expect(result.state.font_scale).toBe(1.35)
    expect(result.state.box_inset_percent).toBe(-20)
    expect(result.state.density).toBe(2.2)
    expect(result.state.global_shape).toBe('rect')
    expect(result.state.overrides_by_image_id['1']['3']).toMatchObject({
      dx: 5000,
      dy: -5000,
      shape: 'oval',
      fontScale: 5,
      sizeScale: 0.55,
      widthScale: 4,
      heightScale: 0.25,
      density: 2.5,
    })
    expect(result.state.hidden_item_ids_by_image_id['1']).toEqual([2, 4])
  })

  it('normalizes valid manual overlay items and rejects invalid ones', async () => {
    const repository = new MemoryOverlayRepository()
    const service = new OverlayStateService(repository)

    const result = await service.saveState('section-1', 7, {
      font_family: 'manga',
      global_shape: 'oval',
      manual_items_by_image_id: {
        2: [
          {
            id: '10',
            box: [300, 200, 100, 50],
            ocrText: ' hello ',
            translatedText: ' ola ',
          },
          {
            id: 11,
            box: [1, 1, 1, 1],
            ocr_text: 'invalid box',
          },
          {
            id: 12,
            box: [0, 0, 20, 20],
          },
        ],
      },
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.state.font_family).toBe('manga')
    expect(result.state.global_shape).toBe('oval')
    expect(result.state.manual_items_by_image_id['2']).toEqual([
      {
        id: 10,
        box: [100, 50, 300, 200],
        ocr_text: 'hello',
        translated_text: 'ola',
      },
    ])
  })
})
