import { cookies } from 'next/headers'
import { authController } from '@/lib/backend/auth/auth.module'
import { getRequestAuthToken } from '@/app/api/_shared/proxy'

const AUTH_TOKEN_COOKIE = 'manga-access-token'

export async function POST(request: Request) {
  const cookieStore = await cookies()
  const token = await getRequestAuthToken(request)
  authController.deleteSession(token)
  cookieStore.delete(AUTH_TOKEN_COOKIE)
  return Response.json({ success: true })
}
