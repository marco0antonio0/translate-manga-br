import { TranslationReportsRepository } from './translation-reports.repository'
import { TranslationReportsService } from './translation-reports.service'

const translationReportsRepository = new TranslationReportsRepository()
export const translationReportsService = new TranslationReportsService(translationReportsRepository)
