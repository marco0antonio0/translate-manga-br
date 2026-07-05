export interface OcrJob {
  job_id: string
  status: string
  extracted_text: string
  elapsed_ms: number
  timeout_sec: number
  ocr_variant_best: string | null
  ocr_error: string | null
  created_at: string
  queue_key: string
  error_message?: string
}

export interface EnqueueOcrJobResult {
  jobKey: string
  queueKey: string
  job: OcrJob
}

export interface OcrJobLookup {
  jobKey: string
  queueKey: string
  job: OcrJob | null
}
