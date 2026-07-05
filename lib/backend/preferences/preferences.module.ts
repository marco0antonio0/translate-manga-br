import { PreferencesRepository } from './preferences.repository'
import { PreferencesService } from './preferences.service'

const preferencesRepository = new PreferencesRepository()
export const preferencesService = new PreferencesService(preferencesRepository)
