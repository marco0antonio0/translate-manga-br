import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { z } from 'zod'
import { validationErrorResponse } from '@/app/api/_shared/validation'
import { authController } from '@/lib/backend/auth/auth.module'
import { sectionsController } from '@/lib/backend/sections/sections.module'

const AUTH_TOKEN_COOKIE = 'manga-access-token'
const sectionsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(100).default(12),
})

function unauthorized() {
  return NextResponse.json(
    { message: 'Token inválido ou expirado', error: 'Unauthorized', statusCode: 401 },
    { status: 401 }
  )
}

export async function GET(request: Request) {
  const cookieStore = await cookies()
  const token = cookieStore.get(AUTH_TOKEN_COOKIE)?.value
  const user = authController.getUserFromToken(token)
  if (!user) return unauthorized()

  const { searchParams } = new URL(request.url)
  const parsedQuery = sectionsQuerySchema.safeParse({
    page: searchParams.get('page') ?? undefined,
    per_page: searchParams.get('per_page') ?? undefined,
  })
  if (!parsedQuery.success) return validationErrorResponse(parsedQuery.error)
  const page = parsedQuery.data.page
  const perPage = parsedQuery.data.per_page

  const allSections = sectionsController.listSections(user.id)
  const total = allSections.length
  const start = (page - 1) * perPage
  const items = allSections.slice(start, start + perPage)
  const lastPage = Math.max(1, Math.ceil(total / perPage))

  return NextResponse.json({
    sections: items,
    meta: {
      current_page: page,
      per_page: perPage,
      total,
      last_page: lastPage,
      from: total === 0 ? null : start + 1,
      to: total === 0 ? null : Math.min(start + perPage, total),
    },
    links: {
      first: null,
      last: null,
      prev: page > 1 ? '#' : null,
      next: page < lastPage ? '#' : null,
    },
  })
}

export async function POST(request: Request) {
  const cookieStore = await cookies()
  const token = cookieStore.get(AUTH_TOKEN_COOKIE)?.value
  const user = authController.getUserFromToken(token)
  if (!user) return unauthorized()

  try {
    const formData = await request.formData()
    const sectionId = await sectionsController.createSectionFromFormData(user.id, formData)
    return NextResponse.json({
      message: 'Seção criada com sucesso',
      section: { id: sectionId },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao criar seção'
    return NextResponse.json({ message, error: 'Bad Request', statusCode: 400 }, { status: 400 })
  }
}
