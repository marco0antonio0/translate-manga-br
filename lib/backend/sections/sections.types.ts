export interface ResolvedImageFile {
  filePath: string
  mime: string
  size: number
}

export type ImageKind = 'original' | 'translated'


export interface SectionLangs {
  sourceLang: string
  targetLang: string
  providerLang: string
}

export interface CreateSectionData extends SectionLangs {
  name: string
}

export interface SectionImageFileInput {
  name: string
  type: string
  buffer: Buffer
}

export interface PendingSectionImage {
  id: number
  order_index: number
  original_path: string
  mime: string
}


export interface OcrDetection {
  det_id?: number
  cls_name?: string
  conf?: number
  box?: [number, number, number, number]
  ocr_text?: string
  ocr_error?: string
}
