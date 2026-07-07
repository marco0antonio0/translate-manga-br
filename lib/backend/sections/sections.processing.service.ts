import { extractTextBoxesNode } from '@/lib/server/manga-ocr-node'
import type { TranslationService } from '@/lib/backend/translation/translation.service'
import { parseProviderSpec } from '@/lib/backend/translation/translation.types'
import type { SectionsRepository } from './sections.repository'
import type { OcrDetection, PendingSectionImage, SectionLangs } from './sections.types'

const SECTION_IMAGE_PROCESSING_CONCURRENCY = Math.max(
  1,
  Math.floor(Number(process.env.SECTION_IMAGE_PROCESSING_CONCURRENCY ?? 10) || 10)
)


export class SectionsProcessingService {
  constructor(
    private readonly repository: SectionsRepository,
    private readonly translation: TranslationService
  ) {}

  async processSection(sectionId: number, langs: SectionLangs) {
    try {
      this.repository.setSectionStatus(sectionId, { internalStatus: 'processing' })

      const images = this.repository.getPendingImages(sectionId)
      const concurrency = Math.max(1, Math.min(SECTION_IMAGE_PROCESSING_CONCURRENCY, images.length))
      let cursor = 0
      await Promise.all(
        Array.from({ length: concurrency }, async () => {
          while (true) {
            const image = images[cursor++]
            if (!image) return
            await this.processImage(sectionId, image, langs)
          }
        })
      )

      const finalStatus = this.repository.countUnresolvedImages(sectionId) === 0 ? 'completed' : 'partial'
      this.repository.setSectionStatus(sectionId, { status: finalStatus, internalStatus: 'idle' })
    } catch (error) {
      console.error('[sections] processSection error:', error)
      this.repository.setSectionStatus(sectionId, { internalStatus: 'idle' })
    }
  }

  private async processImage(sectionId: number, image: PendingSectionImage, langs: SectionLangs) {
    this.repository.markImageTranslating(image.id)

    try {
      const buffer = this.repository.readImageBuffer(image.original_path)
      if (!buffer) throw new Error('Arquivo original não encontrado.')

      const data = await extractTextBoxesNode(buffer) as { detections?: OcrDetection[] }
      const detections = Array.isArray(data.detections) ? data.detections : []

      const textsToTranslate: { detIdx: number; text: string }[] = []
      detections.forEach((det, idx) => {
        const text = typeof det?.ocr_text === 'string' ? det.ocr_text.trim() : ''
        if (text) textsToTranslate.push({ detIdx: idx, text })
      })

      const provider = parseProviderSpec(langs.providerLang)
      const translations = await this.translation.translateBatch(
        textsToTranslate.map((t) => t.text),
        langs.sourceLang,
        langs.targetLang,
        provider
      )

      const translatedByIdx = new Map<number, string>()
      textsToTranslate.forEach((entry, position) => {
        translatedByIdx.set(entry.detIdx, translations[position] || entry.text)
      })

      this.repository.replaceImageOcrItems(image.id, detections, translatedByIdx)
      this.repository.markImageCompleted(image.id)
    } catch (error) {
      console.error(`[sections] processImage ${sectionId}/${image.id} error:`, error)
      this.repository.markImageFailed(image.id)
    }
  }
}
