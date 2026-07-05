'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { LoginForm } from '@/components/login-form'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

export default function LoginPageClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [showExpiredModal, setShowExpiredModal] = useState(false)

  const sessionExpired = searchParams.get('expired') === '1'
  const redirectParam = searchParams.get('redirect')
  const loginRedirectTarget = useMemo(() => {
    if (!redirectParam) return '/inicio'
    if (!redirectParam.startsWith('/') || redirectParam.startsWith('//')) return '/inicio'
    return redirectParam
  }, [redirectParam])

  useEffect(() => {
    const checkAuth = async () => {
      const controller = new AbortController()
      const timeoutId = window.setTimeout(() => {
        controller.abort('session-check-timeout')
      }, 2500)

      try {
        const response = await fetch('/api/auth/check', {
          cache: 'no-store',
          signal: controller.signal,
        })
        const data = await response.json()

        if (response.ok && data.authenticated === true) {
          router.replace(loginRedirectTarget)
          return
        }

      } catch {
        // A tela de login nao deve ficar bloqueada se a checagem de sessao falhar.
      } finally {
        window.clearTimeout(timeoutId)
      }
    }

    void checkAuth()
  }, [loginRedirectTarget, router])

  useEffect(() => {
    if (sessionExpired) {
      setShowExpiredModal(true)
    }
  }, [sessionExpired])

  return (
    <>
      <Dialog open={showExpiredModal} onOpenChange={setShowExpiredModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sessão expirada</DialogTitle>
            <DialogDescription>
              Sua sessão expirou. Faça login novamente para continuar.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setShowExpiredModal(false)}>OK</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <LoginForm
        onLogin={() => router.replace(loginRedirectTarget)}
      />
    </>
  )
}
