import { redisGetJson, redisSetJson } from '@/lib/redis-cache'
import type { AutoProcessingPreferenceRecord } from './preferences.types'

const USER_PREFERENCES_TTL_SECONDS = 0

function buildPreferenceKey(userId: number) {
  const userIdentity = `id:${Math.floor(userId)}`
  return `manga:user-preferences:v1:user:${userIdentity}`
}

export class PreferencesRepository {
  async getAutoProcessing(userId: number) {
    return redisGetJson<AutoProcessingPreferenceRecord>(buildPreferenceKey(userId))
  }

  async setAutoProcessing(userId: number, record: AutoProcessingPreferenceRecord) {
    await redisSetJson(buildPreferenceKey(userId), record, USER_PREFERENCES_TTL_SECONDS)
  }
}
