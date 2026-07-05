import { ReadProgressRepository } from './read-progress.repository'
import { ReadProgressService } from './read-progress.service'

const readProgressRepository = new ReadProgressRepository()
export const readProgressService = new ReadProgressService(readProgressRepository)
