import { NextResponse } from 'next/server'
import { requireUser, unauthorizedResponse } from '@/app/api/_shared/proxy'
import { sectionsController } from '@/lib/backend/sections/sections.module'

type RouteParams = { params: Promise<{ id: string }> }

function uploadErrorMessage(error: unknown) {
  const rawMessage = error instanceof Error ? error.message : ''
  return /failed to parse body as formdata/i.test(rawMessage)
    ? 'Upload muito grande ou incompleto: o lote de imagens não pôde ser lido. Tente enviar menos páginas por vez.'
    : rawMessage || 'Erro ao adicionar imagens à seção'
}

export async function POST(request: Request, { params }: RouteParams) {
  const user = await requireUser(request)
  if (!user) return unauthorizedResponse()

  const { id } = await params
  const sectionId = Number(id)
  if (!Number.isFinite(sectionId) || sectionId <= 0) {
    return NextResponse.json({ message: 'ID inválido.' }, { status: 400 })
  }

  try {
    const formData = await request.formData()
    const result = await sectionsController.appendSectionImagesFromFormData(user.id, sectionId, formData)
    if (!result) {
      return NextResponse.json({ message: 'Seção não encontrada.' }, { status: 404 })
    }

    return NextResponse.json({
      id: sectionId,
      appended: result.appended,
      total_images: result.totalImages,
      processing: result.processing,
    })
  } catch (error) {
    return NextResponse.json(
      { message: uploadErrorMessage(error), error: 'Bad Request', statusCode: 400 },
      { status: 400 }
    )
  }
}
