import crypto from 'node:crypto'
import { recognizeImageTextNode } from '@/lib/server/manga-ocr-node'
import type { OcrJobsRepository } from './ocr-jobs.repository'
import type { EnqueueOcrJobResult, OcrJobLookup } from './ocr-jobs.types'

const OCR_TIMEOUT_SEC = 10
const QUEUE_KEY = 'local:ocr-queue'


export class OcrJobsService {
  constructor(private readonly repository: OcrJobsRepository) {}

  async enqueueImage(buffer: Buffer): Promise<EnqueueOcrJobResult> {
    const payload = await recognizeImageTextNode(buffer, OCR_TIMEOUT_SEC)

    const jobId = crypto.randomUUID()
    const jobKey = `local:ocr-job:${jobId}`

    const job = {
      job_id: jobId,
      status: 'done',
      extracted_text: String(payload.extracted_text ?? ''),
      elapsed_ms: Number(payload.elapsed_ms ?? 0),
      timeout_sec: Number(payload.timeout_sec ?? 0),
      ocr_variant_best: payload.ocr_variant_best ?? null,
      ocr_error: payload.ocr_error ?? null,
      created_at: new Date().toISOString(),
      queue_key: QUEUE_KEY,
    }

    await this.repository.saveJob(jobKey, job)

    return { jobKey, queueKey: QUEUE_KEY, job }
  }

  async getJob(jobKey: string, queueKeyRaw?: string): Promise<OcrJobLookup> {
    const job = await this.repository.getJob(jobKey)
    const queueKey = (queueKeyRaw || '').trim() || String(job?.queue_key || QUEUE_KEY)
    return { jobKey, queueKey, job }
  }
}
