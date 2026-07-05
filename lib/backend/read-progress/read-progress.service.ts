import type { ReadProgressRepository } from './read-progress.repository'
import type { ReadProgressRecord } from './read-progress.types'

const MAX_SECTION_IDS = 200

export class ReadProgressService {
  constructor(private readonly repository: ReadProgressRepository) {}

  async isDone(sectionId: string, userId: number) {
    const data = await this.repository.getProgress(sectionId, userId)
    return data?.done ?? false
  }

  async setDone(sectionId: string, userId: number, done: boolean) {
    await this.repository.setProgress(sectionId, userId, {
      done,
      updated_at: new Date().toISOString(),
    })
  }

  /** Mapa sectionId -> done para uma lista de IDs (limitada e validada). */
  async getDoneMap(rawIds: string[], userId: number) {
    const validIds = rawIds.filter((id) => /^\d+$/.test(id)).slice(0, MAX_SECTION_IDS)
    const done: Record<string, boolean> = {}
    if (validIds.length === 0) return done

    const values = await this.repository.getProgressBatchRaw(validIds, userId)
    for (let i = 0; i < validIds.length; i += 1) {
      const id = validIds[i]
      const value = values[i]
      if (!id || value === null) continue

      try {
        const parsed = JSON.parse(value) as ReadProgressRecord
        done[id] = parsed.done === true
      } catch {
        done[id] = false
      }
    }
    return done
  }
}
