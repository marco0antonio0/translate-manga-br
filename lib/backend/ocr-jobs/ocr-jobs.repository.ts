import { redisGetJson, redisSetJson } from '@/lib/redis-cache'
import type { OcrJob } from './ocr-jobs.types'

const OCR_JOB_TTL_SECONDS = 60 * 60

export class OcrJobsRepository {
  async saveJob(jobKey: string, job: OcrJob) {
    await redisSetJson(jobKey, job, OCR_JOB_TTL_SECONDS)
  }

  async getJob(jobKey: string) {
    return redisGetJson<OcrJob>(jobKey)
  }
}
