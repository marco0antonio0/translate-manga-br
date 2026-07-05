import { NextRequest, NextResponse } from 'next/server'
import { extractTextBoxesNode } from '@/lib/server/manga-ocr-node'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file')

    if (!(file instanceof File)) return NextResponse.json({ error: 'Nenhum arquivo enviado.' }, { status: 400 })
    if (!file.type.startsWith('image/')) return NextResponse.json({ error: 'Apenas imagens são aceitas.' }, { status: 400 })

    const buffer = Buffer.from(await file.arrayBuffer())
    return NextResponse.json(await extractTextBoxesNode(buffer))
  } catch (error) {
    console.error('extract route error:', error)
    return NextResponse.json({ error: 'Erro ao processar extração.' }, { status: 500 })
  }
}
