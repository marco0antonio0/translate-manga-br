import { NextResponse } from 'next/server'

import { requireUser, unauthorizedResponse } from '@/app/api/_shared/proxy'
import { ocrJobsService } from '@/lib/backend/ocr-jobs/ocr-jobs.module'

export async function GET(request: Request) {
  const user = await requireUser()
  if (!user) return unauthorizedResponse()

  try {
    const url = new URL(request.url)
    const jobKeyParam = url.searchParams.get('job_key')?.trim() || ''
    const queueKeyParam = url.searchParams.get('queue_key')?.trim() || ''

    if (!jobKeyParam) {
      return NextResponse.json({ message: 'Parâmetro job_key é obrigatório.' }, { status: 400 })
    }

    const { jobKey, queueKey, job } = await ocrJobsService.getJob(jobKeyParam, queueKeyParam)
    if (!job) {
      return NextResponse.json(
        { job_key: jobKey, status: 'not_found', message: 'Job não encontrado no armazenamento local.' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      job_key: jobKey,
      queue_key: queueKey,
      status: String(job.status || 'unknown'),
      queue_position: 0,
      queue_length: 1,
      lock_value: null,
      job,
    })
  } catch (error) {
    console.error('OCR job polling route error:', error)
    return NextResponse.json({ message: 'Erro ao consultar status do job OCR.' }, { status: 500 })
  }
}
