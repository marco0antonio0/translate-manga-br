import type { PreferencesRepository } from './preferences.repository'

export class PreferencesService {
  constructor(private readonly repository: PreferencesRepository) {}

  async isAutoProcessingEnabled(userId: number) {
    const data = await this.repository.getAutoProcessing(userId)
    return data?.auto_processing_enabled ?? false
  }

  async setAutoProcessingEnabled(userId: number, enabled: boolean) {
    await this.repository.setAutoProcessing(userId, {
      auto_processing_enabled: enabled,
      updated_at: new Date().toISOString(),
    })
  }
}
