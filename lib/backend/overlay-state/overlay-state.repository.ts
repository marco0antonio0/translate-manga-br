import { redisGetJson, redisSetJson } from '@/lib/redis-cache'
import type { OverlayStateRecord } from './overlay-state.types'

const OVERLAY_STATE_TTL_SECONDS = 0

function normalizeSectionId(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return 'unknown'
  return encodeURIComponent(trimmed)
}

function buildCacheKey(sectionId: string, userId: number) {
  const userIdentity = `id:${Math.floor(userId)}`
  return `manga:overlay-state:v1:section:${normalizeSectionId(sectionId)}:user:${userIdentity}`
}

export class OverlayStateRepository {
  async getState(sectionId: string, userId: number) {
    return redisGetJson<OverlayStateRecord>(buildCacheKey(sectionId, userId))
  }

  async saveState(sectionId: string, userId: number, state: OverlayStateRecord) {
    await redisSetJson(buildCacheKey(sectionId, userId), state, OVERLAY_STATE_TTL_SECONDS)
  }
}
