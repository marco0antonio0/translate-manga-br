'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ChevronDown,
  Chrome,
  Loader2,
  Sparkles,
  HardDrive,
  Languages,
  Lock,
  ImageIcon,
  BookOpenText,
  CheckCircle2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface SetupPageClientProps {
  lanUrls?: string[]
  domainUrl?: string | null
}

export default function SetupPageClient({ lanUrls = [], domainUrl = null }: SetupPageClientProps) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [isExtensionOpen, setIsExtensionOpen] = useState(false)
  const [extensionUrl, setExtensionUrl] = useState('')

  const urlSuggestions = [...(domainUrl ? [domainUrl] : []), ...lanUrls]

  const handleCreateAdmin = async () => {
    if (isLoading) return
    if (!name.trim() || !email.trim() || !password) {
      setError('Preencha nome, email e senha.')
      return
    }

    setError('')
    setIsLoading(true)
    try {
      const response = await fetch('/api/setup/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password,
          extensionPublicUrl: extensionUrl.trim(),
        }),
      })

      const data = (await response.json().catch(() => ({}))) as { message?: string }
      if (!response.ok) {
        throw new Error(data.message || 'Falha ao criar administrador.')
      }

      router.replace('/login')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar administrador.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void handleCreateAdmin()
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-linear-to-br from-background via-background to-primary/5">
      <div className="pointer-events-none absolute -top-24 -left-24 h-80 w-80 rounded-full bg-primary/15 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute -right-32 top-1/3 h-96 w-96 rounded-full bg-accent/10 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-linear-to-r from-primary via-accent to-primary" aria-hidden />

      <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col items-center justify-center gap-10 px-6 py-12 lg:flex-row lg:items-stretch lg:gap-12">
        <section className="flex w-full max-w-xl flex-col justify-center lg:max-w-2xl">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary backdrop-blur">
            <Sparkles className="h-3.5 w-3.5" />
            Primeira execução
          </div>

          <div className="mt-5 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-4">
            <div className="relative shrink-0">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-linear-to-br from-primary to-accent text-primary-foreground shadow-[0_0_24px_-4px_color-mix(in_oklch,var(--primary)_70%,transparent)] sm:h-14 sm:w-14">
                <Languages className="h-6 w-6 sm:h-7 sm:w-7" />
              </div>
              <Sparkles className="absolute -right-2 -top-2 h-4 w-4 text-accent drop-shadow-[0_0_8px_color-mix(in_oklch,var(--accent)_80%,transparent)]" />
            </div>
            <h1 className="min-w-0 text-[1.65rem] leading-tight font-bold tracking-tight sm:text-4xl lg:text-5xl">
              Bem-vindo ao{' '}
              <span className="bg-linear-to-r from-primary to-accent bg-clip-text text-transparent">
                MangaIOTranslate
              </span>
            </h1>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
            <span className="rounded-full border border-border/70 bg-card/60 px-2.5 py-1">📤 upload</span>
            <span className="text-primary">→</span>
            <span className="rounded-full border border-border/70 bg-card/60 px-2.5 py-1">🎯 detecção</span>
            <span className="text-primary">→</span>
            <span className="rounded-full border border-border/70 bg-card/60 px-2.5 py-1">🔍 OCR</span>
            <span className="text-primary">→</span>
            <span className="rounded-full border border-border/70 bg-card/60 px-2.5 py-1">🌐 tradução</span>
            <span className="text-primary">→</span>
            <span className="rounded-full border border-border/70 bg-card/60 px-2.5 py-1">📖 leitura</span>
          </div>

          <p className="mt-4 text-base text-muted-foreground sm:text-lg">
            Uma plataforma para ler, traduzir e organizar capítulos de mangás, quadrinhos e
            páginas escaneadas, com OCR e tradução automática. Tudo pensado para rodar na sua
            própria máquina.
          </p>

          <div className="mt-6 rounded-2xl border border-primary/20 bg-primary/5 p-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div className="text-sm">
                <p className="font-semibold text-foreground">
                  100% gratuito e executado localmente.
                </p>
                <p className="mt-1 text-muted-foreground">
                  Seus arquivos, OCR, traduções e leituras ficam salvos no seu próprio
                  ambiente. A única exceção é o Google Tradutor, usado opcionalmente para a
                  etapa de tradução — todo o resto roda local.
                </p>
              </div>
            </div>
          </div>

          <ul className="mt-6 grid gap-3 sm:grid-cols-2">
            <li className="group flex items-start gap-3 rounded-xl border border-border/70 bg-card/50 p-3 transition-colors hover:border-primary/40">
              <div className="rounded-lg bg-primary/10 p-2 transition-colors group-hover:bg-primary/20">
                <ImageIcon className="h-4.5 w-4.5 shrink-0 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">OCR de imagens</p>
                <p className="text-xs text-muted-foreground">
                  Extração de texto direto das páginas.
                </p>
              </div>
            </li>
            <li className="group flex items-start gap-3 rounded-xl border border-border/70 bg-card/50 p-3 transition-colors hover:border-primary/40">
              <div className="rounded-lg bg-accent/10 p-2 transition-colors group-hover:bg-accent/20">
                <Languages className="h-4.5 w-4.5 shrink-0 text-accent" />
              </div>
              <div>
                <p className="text-sm font-medium">Tradução automática</p>
                <p className="text-xs text-muted-foreground">
                  Via Google Tradutor (único serviço externo).
                </p>
              </div>
            </li>
            <li className="group flex items-start gap-3 rounded-xl border border-border/70 bg-card/50 p-3 transition-colors hover:border-primary/40">
              <div className="rounded-lg bg-primary/10 p-2 transition-colors group-hover:bg-primary/20">
                <HardDrive className="h-4.5 w-4.5 shrink-0 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">Armazenamento local</p>
                <p className="text-xs text-muted-foreground">
                  Tudo salvo no seu disco, sem nuvem.
                </p>
              </div>
            </li>
            <li className="group flex items-start gap-3 rounded-xl border border-border/70 bg-card/50 p-3 transition-colors hover:border-primary/40">
              <div className="rounded-lg bg-accent/10 p-2 transition-colors group-hover:bg-accent/20">
                <BookOpenText className="h-4.5 w-4.5 shrink-0 text-accent" />
              </div>
              <div>
                <p className="text-sm font-medium">Biblioteca pessoal</p>
                <p className="text-xs text-muted-foreground">
                  Organize seções e leia no próprio app.
                </p>
              </div>
            </li>
          </ul>
        </section>

        <section className="flex w-full max-w-md items-center">
          <div className="relative w-full overflow-hidden rounded-2xl border border-primary/25 bg-card p-6 shadow-[0_24px_60px_rgb(0_0_0/0.35),0_0_40px_-12px_color-mix(in_oklch,var(--primary)_40%,transparent)] sm:p-8">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-linear-to-r from-primary via-accent to-primary" aria-hidden />
            <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-primary/10 blur-3xl" aria-hidden />

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Lock className="h-4 w-4 text-primary" />
              Configuração inicial
            </div>
            <h2 className="mt-2 text-2xl font-bold">Crie o administrador</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Esta conta será a dona da instância. Use um email e senha que você lembre — os
              dados ficam armazenados localmente.
            </p>

            {error ? (
              <div className="mt-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            ) : null}

            <form className="mt-5 space-y-3" onSubmit={handleSubmit}>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Nome</label>
                <Input
                  placeholder="Nome do administrador"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Email</label>
                <Input
                  type="email"
                  placeholder="admin@exemplo.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Senha</label>
                <Input
                  type="password"
                  placeholder="Mínimo de 6 caracteres"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  disabled={isLoading}
                />
              </div>

              <div className="rounded-xl border border-border/70 bg-muted/20">
                <button
                  type="button"
                  onClick={() => setIsExtensionOpen((open) => !open)}
                  className="flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-muted/40"
                  aria-expanded={isExtensionOpen}
                >
                  <Chrome className="h-4 w-4 shrink-0 text-primary" />
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-medium">Extensão do navegador</span>
                    <span className="block text-xs text-muted-foreground">
                      Opcional — dá para configurar depois
                    </span>
                  </span>
                  <ChevronDown
                    className={cn(
                      'h-4 w-4 shrink-0 text-muted-foreground transition-transform',
                      isExtensionOpen && 'rotate-180'
                    )}
                  />
                </button>

                {isExtensionOpen && (
                  <div className="space-y-2.5 border-t border-border/70 px-3 py-3">
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      A extensão traduz mangá direto de qualquer site, e precisa saber o endereço
                      deste servidor. Se quiser já deixar pronto, informe o endereço pelo qual os
                      dispositivos vão acessá-lo:
                    </p>
                    {urlSuggestions.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {urlSuggestions.map((url) => (
                          <button
                            key={url}
                            type="button"
                            onClick={() => setExtensionUrl(url)}
                            className={cn(
                              'cursor-pointer rounded-md border px-2 py-1 font-mono text-[11px] transition-all',
                              extensionUrl === url
                                ? 'border-primary bg-primary/15 font-semibold text-primary'
                                : 'border-border bg-muted/40 text-muted-foreground hover:border-primary/50 hover:text-foreground'
                            )}
                          >
                            {url}
                          </button>
                        ))}
                      </div>
                    )}
                    <Input
                      value={extensionUrl}
                      onChange={(event) => setExtensionUrl(event.target.value)}
                      placeholder="http://192.168.0.10:3080 ou https://seu-dominio.com"
                      disabled={isLoading}
                      className="font-mono text-xs"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Detectamos os endereços acima — clique em um para usar. Deixe em branco para
                      pular: um assistente ajuda a configurar depois, na página Extensão.
                    </p>
                  </div>
                )}
              </div>

              <Button className="mt-6 w-full" size="lg" type="submit" disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {isLoading ? 'Criando administrador...' : 'Criar administrador e continuar'}
              </Button>
            </form>

            <p className="mt-4 text-center text-xs text-muted-foreground">
              Ao continuar, você concorda em manter estes dados apenas neste ambiente local.
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}
