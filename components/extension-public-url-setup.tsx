'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Globe,
  Loader2,
  MonitorSmartphone,
  Save,
  Settings,
} from 'lucide-react'

type SetupMode = 'local' | 'domain' | null

interface ExtensionPublicUrlSetupProps {
  lanUrls: string[]
  domainUrl: string | null
}

export function ExtensionPublicUrlSetup({ lanUrls, domainUrl }: ExtensionPublicUrlSetupProps) {
  const router = useRouter()
  const [mode, setMode] = useState<SetupMode>(null)
  const [urlValue, setUrlValue] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  const selectMode = (nextMode: Exclude<SetupMode, null>) => {
    setMode(nextMode)
    setError('')
    if (nextMode === 'local') {
      setUrlValue(lanUrls[0] || '')
    } else {
      setUrlValue(domainUrl || '')
    }
  }

  const saveUrl = async () => {
    const value = urlValue.trim()
    if (!value) {
      setError('Escolha ou digite o endereço antes de salvar.')
      return
    }
    setError('')
    setIsSaving(true)
    try {
      const response = await fetch('/api/public-url', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicUrl: value }),
      })
      const data = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(
          (data && typeof data.message === 'string' && data.message) ||
          'Não foi possível salvar a URL.'
        )
      }
      setSaved(true)
      // Recarrega o server component: libera o download e esconde este assistente
      setTimeout(() => router.refresh(), 1200)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar a URL.')
    } finally {
      setIsSaving(false)
    }
  }

  if (saved) {
    return (
      <Card className="mx-auto max-w-3xl border-green-500/40 bg-green-500/5 p-6 text-center space-y-2">
        <CheckCircle2 className="mx-auto h-8 w-8 text-green-500" />
        <h2 className="text-base sm:text-lg font-semibold">URL configurada com sucesso!</h2>
        <p className="text-sm text-muted-foreground">
          O download da extensão foi liberado para todos os usuários. Atualizando a página...
        </p>
      </Card>
    )
  }

  return (
    <Card className="mx-auto max-w-3xl border-primary/30 bg-primary/5 p-5 sm:p-6 space-y-5">
      <div className="space-y-1">
        <h2 className="text-base sm:text-lg font-semibold">Configure a URL pública da extensão</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          A extensão instalada no navegador precisa saber o endereço deste servidor para se conectar.
          Responda abaixo e deixe tudo pronto em um clique — o download do ZIP é liberado na hora.
        </p>
      </div>

      <div className="space-y-2.5">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <p className="text-sm font-semibold">Onde esta aplicação está rodando?</p>
          <p className="text-xs text-muted-foreground">Clique em uma das opções abaixo:</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => selectMode('local')}
            className={cn(
              'group relative cursor-pointer rounded-lg border p-4 pr-10 text-left space-y-1.5 transition-all',
              mode === 'local'
                ? 'border-primary bg-primary/10 ring-1 ring-primary'
                : 'border-border/60 bg-card/60 hover:border-primary/60 hover:bg-primary/5 hover:shadow-[0_0_16px_-6px_color-mix(in_oklch,var(--primary)_50%,transparent)]'
            )}
          >
            <span
              aria-hidden
              className={cn(
                'absolute right-3.5 top-4 flex h-4.5 w-4.5 items-center justify-center rounded-full border-2 transition-all',
                mode === 'local'
                  ? 'border-primary bg-primary'
                  : 'border-muted-foreground/50 group-hover:border-primary'
              )}
            >
              {mode === 'local' && <span className="h-1.5 w-1.5 rounded-full bg-primary-foreground" />}
            </span>
            <p className="text-sm font-semibold flex items-center gap-2">
              <MonitorSmartphone className="h-4 w-4 text-primary shrink-0" />
              Na minha máquina (local)
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Rodando no seu computador ou num PC da sua casa/escritório, sem domínio próprio.
            </p>
          </button>

          <button
            type="button"
            onClick={() => selectMode('domain')}
            className={cn(
              'group relative cursor-pointer rounded-lg border p-4 pr-10 text-left space-y-1.5 transition-all',
              mode === 'domain'
                ? 'border-primary bg-primary/10 ring-1 ring-primary'
                : 'border-border/60 bg-card/60 hover:border-primary/60 hover:bg-primary/5 hover:shadow-[0_0_16px_-6px_color-mix(in_oklch,var(--primary)_50%,transparent)]'
            )}
          >
            <span
              aria-hidden
              className={cn(
                'absolute right-3.5 top-4 flex h-4.5 w-4.5 items-center justify-center rounded-full border-2 transition-all',
                mode === 'domain'
                  ? 'border-primary bg-primary'
                  : 'border-muted-foreground/50 group-hover:border-primary'
              )}
            >
              {mode === 'domain' && <span className="h-1.5 w-1.5 rounded-full bg-primary-foreground" />}
            </span>
            <p className="text-sm font-semibold flex items-center gap-2">
              <Globe className="h-4 w-4 text-primary shrink-0" />
              Em um servidor com domínio
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Publicado na internet com endereço próprio, tipo{' '}
              <code className="bg-muted px-1 rounded">https://manga.seusite.com</code>.
            </p>
          </button>
        </div>
      </div>

      {mode === 'local' && (
        <div className="rounded-lg border border-border/60 bg-card/60 p-4 space-y-3">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Rodando localmente, a extensão funciona <strong className="text-foreground">apenas nos
            dispositivos que alcançam esta máquina</strong>: neste próprio computador e nos aparelhos da
            mesma rede Wi-Fi (como o seu celular), sempre através do IP abaixo. Fora da sua rede ela não
            conecta. Detectamos os IPs desta máquina — clique no da sua rede:
          </p>
          <div className="flex flex-wrap gap-2">
            {lanUrls.map((url) => (
              <button
                key={url}
                type="button"
                onClick={() => { setUrlValue(url); setError('') }}
                className={cn(
                  'cursor-pointer rounded-md border px-2.5 py-1.5 font-mono text-xs transition-all',
                  urlValue === url
                    ? 'border-primary bg-primary/15 text-primary font-semibold'
                    : 'border-border bg-muted/40 text-muted-foreground hover:border-primary/50 hover:text-foreground'
                )}
              >
                {url}
              </button>
            ))}
            {lanUrls.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Nenhum IP de rede detectado — digite manualmente abaixo (ex.: <code>http://192.168.0.10:3080</code>).
              </p>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Dica: geralmente o IP da rede Wi-Fi de casa começa com <code className="bg-muted px-1 rounded">192.168.</code>
          </p>
        </div>
      )}

      {mode === 'domain' && (
        <div className="rounded-lg border border-border/60 bg-card/60 p-4 space-y-3">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Use o endereço pelo qual as pessoas acessam esta aplicação — o domínio (ou IP público do
            servidor). É esse endereço que a extensão usará de qualquer lugar.
            {domainUrl && (
              <> Detectamos que você está acessando agora por{' '}
                <button
                  type="button"
                  className="cursor-pointer font-mono text-primary underline underline-offset-2"
                  onClick={() => { setUrlValue(domainUrl); setError('') }}
                >
                  {domainUrl}
                </button>
                {' '}— clique para usar.
              </>
            )}
          </p>
        </div>
      )}

      {mode && (
        <div className="space-y-2">
          <p className="text-sm font-semibold">Endereço que será salvo</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              value={urlValue}
              onChange={(event) => { setUrlValue(event.target.value); setError('') }}
              placeholder={mode === 'local' ? 'http://192.168.0.10:3080' : 'https://manga.seusite.com'}
              disabled={isSaving}
              className="font-mono text-sm"
              onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); void saveUrl() } }}
            />
            <Button
              type="button"
              onClick={() => void saveUrl()}
              disabled={isSaving || !urlValue.trim()}
              className="gap-2 shrink-0"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Salvar e liberar download
            </Button>
          </div>
          {error && (
            <p className="flex items-center gap-1.5 text-xs text-destructive">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              {error}
            </p>
          )}
        </div>
      )}

      <div className="flex flex-col gap-2 border-t border-border/50 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">
          Dá para mudar isso depois a qualquer momento.
        </p>
        <div className="flex gap-2">
          {mode && (
            <Button type="button" variant="ghost" size="sm" className="gap-1.5" onClick={() => { setMode(null); setError('') }}>
              <ArrowLeft className="h-3.5 w-3.5" />
              Voltar
            </Button>
          )}
          <Button asChild variant="outline" size="sm" className="gap-1.5">
            <Link href="/inicio/preferencias">
              <Settings className="h-3.5 w-3.5" />
              Configurar em Preferências
            </Link>
          </Button>
        </div>
      </div>
    </Card>
  )
}
