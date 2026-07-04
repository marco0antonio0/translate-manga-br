import { cookies } from 'next/headers'
import { deleteSession } from '@/lib/local-backend/auth'

const AUTH_TOKEN_COOKIE = 'manga-access-token'

export async function POST(request: Request) {
  const cookieStore = await cookies()
  const token = cookieStore.get(AUTH_TOKEN_COOKIE)?.value
  deleteSession(token)
  cookieStore.delete(AUTH_TOKEN_COOKIE)
  return Response.json({ success: true })
}
