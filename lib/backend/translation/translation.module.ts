import { openRouterService } from '@/lib/backend/openrouter/openrouter.module'
import { TranslationService } from './translation.service'

export const translationService = new TranslationService(openRouterService)
