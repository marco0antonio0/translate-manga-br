import { OcrJobsRepository } from './ocr-jobs.repository'
import { OcrJobsService } from './ocr-jobs.service'

const ocrJobsRepository = new OcrJobsRepository()
export const ocrJobsService = new OcrJobsService(ocrJobsRepository)
