import { NextRequest, NextResponse } from 'next/server'
import { extractTextBoxesNode } from '@/lib/server/manga-ocr-node'
import { parseUploadedImageRequest } from '@/lib/server/uploaded-image-request'

export async function POST(request: NextRequest) {
  try {
    const image = await parseUploadedImageRequest(request)

    if (!image) {
      return NextResponse.json(
        { error: 'Nenhuma imagem enviada. Envie multipart/form-data, uma imagem direta ou JSON com dataUrl/base64.' },
        { status: 400 }
      )
    }

    return NextResponse.json(await extractTextBoxesNode(image.buffer))
  } catch (error) {
    console.error('extract route error:', error)
    const message = error instanceof Error && error.message.includes('multipart/form-data')
      ? error.message
      : 'Erro ao processar extração.'
    const status = message === 'Erro ao processar extração.' ? 500 : 400
    return NextResponse.json({ error: message }, { status })
  }
}
