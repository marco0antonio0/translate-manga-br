import { OpenRouterRepository } from './openrouter.repository'
import { OpenRouterService } from './openrouter.service'

const openRouterRepository = new OpenRouterRepository()
export const openRouterService = new OpenRouterService(openRouterRepository)
