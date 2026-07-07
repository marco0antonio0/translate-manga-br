import { cookies } from 'next/headers'
import { authController } from '@/lib/backend/auth/auth.module'

const AUTH_TOKEN_COOKIE = 'manga-access-token'

export async function POST() {
  const cookieStore = await cookies()
  const token = cookieStore.get(AUTH_TOKEN_COOKIE)?.value
  authController.deleteSession(token)
  cookieStore.delete(AUTH_TOKEN_COOKIE)
  return Response.json({ success: true })
}
