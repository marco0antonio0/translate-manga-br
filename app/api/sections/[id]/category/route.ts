import { NextResponse } from 'next/server'
import { requireUser, unauthorizedResponse } from '@/app/api/_shared/proxy'

export async function GET() {
  const user = await requireUser()
  if (!user) return unauthorizedResponse()

  return NextResponse.json({
    category: null,
    categories: [],
    category_items: [],
  })
}

export async function PUT() {
  const user = await requireUser()
  if (!user) return unauthorizedResponse()

  return NextResponse.json({
    category: null,
    message: 'Categorias não estão disponíveis nesta instância local.',
  })
}

export async function DELETE() {
  const user = await requireUser()
  if (!user) return unauthorizedResponse()

  return NextResponse.json({
    category: null,
    message: 'Categorias não estão disponíveis nesta instância local.',
  })
}
