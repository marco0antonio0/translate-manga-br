import { NextResponse } from 'next/server'
import { requireUser, unauthorizedResponse } from '@/app/api/_shared/proxy'

export async function PATCH() {
  const user = await requireUser()
  if (!user) return unauthorizedResponse()

  return NextResponse.json({
    message: 'Categorias não estão disponíveis nesta instância local.',
  })
}

export async function DELETE() {
  const user = await requireUser()
  if (!user) return unauthorizedResponse()

  return NextResponse.json({
    message: 'Categorias não estão disponíveis nesta instância local.',
  })
}
