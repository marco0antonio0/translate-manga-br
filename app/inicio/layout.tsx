import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { requireUser } from '@/app/api/_shared/proxy'
import { InicioLayoutShell } from '@/components/inicio-layout-shell'

export default async function InicioLayout({
  children,
}: Readonly<{
  children: ReactNode
}>) {
  const user = await requireUser()

  if (!user) {
    redirect('/login')
  }

  return <InicioLayoutShell userRole={user.role}>{children}</InicioLayoutShell>
}
