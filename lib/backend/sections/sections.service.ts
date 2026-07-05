import type { SectionsProcessingService } from './sections.processing.service'
import type { SectionsRepository } from './sections.repository'
import type { ImageKind, SectionImageFileInput } from './sections.types'

export class SectionsService {
  constructor(
    private readonly repository: SectionsRepository,
    private readonly processing: SectionsProcessingService
  ) {}

  listSections(userId: number) {
    return this.repository.listSections(userId)
  }

  async createSectionFromFormData(userId: number, formData: FormData) {
    const nameRaw = String(formData.get('name') ?? '').trim()
    const data = {
      name: nameRaw || `Secao ${new Date().toLocaleString('pt-BR')}`,
      sourceLang: String(formData.get('source_lang') ?? 'auto').trim() || 'auto',
      targetLang: String(formData.get('target_lang') ?? 'pt-BR').trim() || 'pt-BR',
      providerLang: String(formData.get('provider_lang') ?? 'google').trim() || 'google',
    }

    const rawFiles = formData.getAll('files').filter((x): x is File => x instanceof File)
    if (rawFiles.length === 0) {
      throw new Error('Envie ao menos um arquivo de imagem.')
    }

    const files: SectionImageFileInput[] = []
    for (const file of rawFiles) {
      files.push({
        name: file.name,
        type: file.type,
        buffer: Buffer.from(await file.arrayBuffer()),
      })
    }

    const sectionId = this.repository.createSectionWithImages(userId, data, files)

    void this.processing.processSection(sectionId, data)

    return sectionId
  }

  getSectionDetail(sectionId: number, userId: number) {
    return this.repository.getSectionDetail(sectionId, userId)
  }

  deleteSection(sectionId: number, userId: number) {
    return this.repository.deleteSection(sectionId, userId)
  }

  resolveImageFile(sectionId: number, imageId: number, kind: ImageKind, userId: number) {
    return this.repository.resolveImageFile(sectionId, imageId, kind, userId)
  }

  reprocessSection(sectionId: number, userId: number) {
    const langs = this.repository.getSectionLangs(sectionId, userId)
    if (!langs) return false

    this.repository.resetSectionForReprocess(sectionId)
    void this.processing.processSection(sectionId, langs)
    return true
  }

  renameSection(sectionId: number, userId: number, name: string) {
    return this.repository.renameSection(sectionId, userId, name)
  }

  updateSectionPriority(sectionId: number, userId: number, priority: number) {
    return this.repository.updateSectionPriority(sectionId, userId, priority)
  }

  updateImageSelection(sectionId: number, userId: number, selection: Record<number, boolean>) {
    return this.repository.updateImageSelection(sectionId, userId, selection)
  }
}
