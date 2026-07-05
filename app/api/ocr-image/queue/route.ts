import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import crypto from 'node:crypto'

import { getUserFromToken } from '@/lib/local-backend/auth'
import { redisSetJson } from '@/lib/redis-cache'
import { recognizeImageTextNode } from '@/lib/server/manga-ocr-node'

const AUTH_TOKEN_COOKIE = 'manga-access-token'
const OCR_JOB_TTL_SECONDS = 60 * 60

export async function POST(request: Request) {
  const cookieStore = await cookies()
  const token = cookieStore.get(AUTH_TOKEN_COOKIE)?.value
  const user = getUserFromToken(token)

  if (!user) {
    return NextResponse.json(
      { message: 'Token inválido ou expirado', error: 'Unauthorized', statusCode: 401 },
      { status: 401 }
    )
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file')

    if (!(file instanceof Blob)) {
      return NextResponse.json({ message: 'Nenhum arquivo válido para OCR.' }, { status: 400 })
    }

    const payload = await recognizeImageTextNode(Buffer.from(await file.arrayBuffer()), 10)

    const jobId = crypto.randomUUID()
    const jobKey = `local:ocr-job:${jobId}`
    const queueKey = 'local:ocr-queue'

    const job = {
      job_id: jobId,
      status: 'done',
      extracted_text: String(payload.extracted_text ?? ''),
      elapsed_ms: Number(payload.elapsed_ms ?? 0),
      timeout_sec: Number(payload.timeout_sec ?? 0),
      ocr_variant_best: payload.ocr_variant_best ?? null,
      ocr_error: payload.ocr_error ?? null,
      created_at: new Date().toISOString(),
      queue_key: queueKey,
    }

    await redisSetJson(jobKey, job, OCR_JOB_TTL_SECONDS)

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
