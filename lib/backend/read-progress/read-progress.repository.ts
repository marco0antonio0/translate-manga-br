import { redisGetJson, redisMGetStrings, redisSetJson } from '@/lib/redis-cache'
import type { ReadProgressRecord } from './read-progress.types'

const READ_PROGRESS_TTL = 0

function buildKey(sectionId: string, userId: number) {
  const userIdentity = `id:${Math.floor(userId)}`
  return `manga:read-progress:v1:section:${sectionId}:user:${userIdentity}`
}

export class ReadProgressRepository {
  async getProgress(sectionId: string, userId: number) {
    return redisGetJson<ReadProgressRecord>(buildKey(sectionId, userId))
  }

  async setProgress(sectionId: string, userId: number, record: ReadProgressRecord) {
    await redisSetJson(buildKey(sectionId, userId), record, READ_PROGRESS_TTL)
  }

  async getProgressBatchRaw(sectionIds: string[], userId: number) {
    const keys = sectionIds.map((id) => buildKey(id, userId))
    return redisMGetStrings(keys)
  }
}
