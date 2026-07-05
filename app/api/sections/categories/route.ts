import { NextResponse } from 'next/server'
import { requireUser, unauthorizedResponse } from '@/app/api/_shared/proxy'

export async function GET() {
  const user = await requireUser()
  if (!user) return unauthorizedResponse()

  return NextResponse.json({
    categories: [],
    category_items: [],
    section_categories_by_id: {},
    updated_at: new Date().toISOString(),
  })
}

export async function PUT() {
  const user = await requireUser()
  if (!user) return unauthorizedResponse()

  return NextResponse.json({
    message: 'Categorias não estão disponíveis nesta instância local.',
    categories: [],
    category_items: [],
  })
}

export async function DELETE() {
  const user = await requireUser()
  if (!user) return unauthorizedResponse()

  return NextResponse.json({
    message: 'Categorias não estão disponíveis nesta instância local.',
    deleted_sections_count: 0,
  })
}
