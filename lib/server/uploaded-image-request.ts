export type UploadedImage = {
  buffer: Buffer
  mime: string
  name?: string
}

function normalizeMime(value: string | null) {
  return String(value || '').split(';', 1)[0].trim().toLowerCase()
}

function bufferFromDataUrl(value: string) {
  const match = /^data:(image\/[a-z0-9.+-]+);base64,([a-z0-9+/=\s]+)$/i.exec(value.trim())
  if (!match) return null

  return {
    buffer: Buffer.from(match[2].replace(/\s+/g, ''), 'base64'),
    mime: match[1].toLowerCase(),
  }
}

async function imageFromJson(request: Request): Promise<UploadedImage | null> {
  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return null
  }

  if (!payload || typeof payload !== 'object') return null
  const body = payload as Record<string, unknown>
  const dataUrl = typeof body.dataUrl === 'string'
    ? body.dataUrl
    : (typeof body.imageDataUrl === 'string' ? body.imageDataUrl : '')
  const fromDataUrl = dataUrl ? bufferFromDataUrl(dataUrl) : null
  if (fromDataUrl) {
    return {
      ...fromDataUrl,
      name: typeof body.fileName === 'string' ? body.fileName : undefined,
    }
  }

  const base64 = typeof body.base64 === 'string' ? body.base64.trim() : ''
  const mime = normalizeMime(typeof body.mime === 'string' ? body.mime : null)
  if (!base64 || !mime.startsWith('image/')) return null

  return {
    buffer: Buffer.from(base64.replace(/\s+/g, ''), 'base64'),
    mime,
    name: typeof body.fileName === 'string' ? body.fileName : undefined,
  }
}

export async function parseUploadedImageRequest(request: Request): Promise<UploadedImage | null> {
  const contentType = request.headers.get('content-type') || ''
  const mime = normalizeMime(contentType)

  if (mime === 'multipart/form-data') {
    let formData: FormData
    try {
      formData = await request.formData()
    } catch (error) {
      throw new Error('Corpo multipart/form-data inválido.', { cause: error })
    }

    const file = formData.get('file')
    if (!(file instanceof Blob) || !file.type.startsWith('image/')) return null

    return {
      buffer: Buffer.from(await file.arrayBuffer()),
      mime: file.type,
      name: file instanceof File ? file.name : undefined,
    }
  }

  if (mime === 'application/json') {
    return imageFromJson(request)
  }

  if (mime.startsWith('image/') || mime === 'application/octet-stream') {
    const buffer = Buffer.from(await request.arrayBuffer())
    if (buffer.length === 0) return null
    return {
      buffer,
      mime: mime.startsWith('image/') ? mime : 'application/octet-stream',
    }
  }

  return null
}
