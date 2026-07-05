import { NextResponse } from 'next/server'

import { requireUser, unauthorizedResponse } from '@/app/api/_shared/proxy'
import { ocrJobsService } from '@/lib/backend/ocr-jobs/ocr-jobs.module'

export async function POST(request: Request) {
  const user = await requireUser()
  if (!user) return unauthorizedResponse()

  try {
    const formData = await request.formData()
    const file = formData.get('file')

    if (!(file instanceof Blob)) {
      return NextResponse.json({ message: 'Nenhum arquivo válido para OCR.' }, { status: 400 })
    }

    const { jobKey, queueKey, job } = await ocrJobsService.enqueueImage(
      Buffer.from(await file.arrayBuffer())
    )

    return NextResponse.json({
      job_key: jobKey,
      queue_key: queueKey,
      status: job.status,
      queue_position: 0,
      queue_length: 1,
      redis: {
        job_key: jobKey,
        queue_key: queueKey,
      },
      job,
    }, { status: 200 })
  } catch (error) {
    console.error('OCR queue route error:', error)
    return NextResponse.json({ message: 'Erro ao enfileirar OCR da área selecionada.' }, { status: 500 })
  }
}
