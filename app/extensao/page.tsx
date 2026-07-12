import { Metadata } from 'next'
import { cookies } from 'next/headers'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getPublicUrlSuggestions } from '@/lib/server/public-url-suggestions'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { authController } from '@/lib/backend/auth/auth.module'
import { AUTH_TOKEN_COOKIE } from '@/app/api/_shared/proxy'
import { publicUrlService } from '@/lib/backend/public-url/public-url.service'
import { ExtensionPublicUrlSetup } from '@/components/extension-public-url-setup'
import {
  BookOpen,
  Chrome,
  Download,
  Monitor,
  Shield,
  Smartphone,
  Sparkles,
  Zap,
} from 'lucide-react'

export const metadata: Metadata = {
  title: 'Extensão para navegador',
  description: 'Baixe e instale a extensão Manga Translator Local para Chrome no desktop e Kiwi Browser no Android. Traduza mangá diretamente do navegador com IA.',
}

const KIWI_APK_URL = 'https://pub-f819838a77944f35a4edc23737502f27.r2.dev/kiwi-browser/com.kiwibrowser.browser-arm64-14310011181-github.apk'
const CHROME_EXTENSION_DOWNLOAD_URL = '/download-extensao?target=chrome'

async function getCurrentUser() {
  const cookieStore = await cookies()
  const token = cookieStore.get(AUTH_TOKEN_COOKIE)?.value
  return authController.getUserFromToken(token)
}

function DownloadExtensionButton({
  canDownload,
  className,
  size = 'lg',
  variant = 'default',
}: {
  canDownload: boolean
  className?: string
  size?: 'default' | 'sm' | 'lg' | 'icon'
  variant?: 'default' | 'outline'
}) {
  if (!canDownload) {
    return (
      <Button disabled size={size} variant={variant} className={className}>
        <Download className={size === 'sm' ? 'w-4 h-4' : 'w-5 h-5'} />
        URL pública pendente
      </Button>
    )
  }

  return (
    <Button asChild size={size} variant={variant} className={className}>
      <a href={CHROME_EXTENSION_DOWNLOAD_URL} download="manga-translator-extension-chrome.zip">
        <Download className={size === 'sm' ? 'w-4 h-4' : 'w-5 h-5'} />
        Baixar extensão (.zip)
      </a>
    </Button>
  )
}

function StepCard({ step, title, children }: { step: string; title: string; children: React.ReactNode }) {
  return (
    <Card className="p-5 sm:p-6 border border-border/50 hover:border-primary/40 transition">
      <div className="flex gap-4">
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-linear-to-br from-primary/30 to-accent/20 ring-1 ring-primary/30 font-bold text-primary shrink-0">
          {step}
        </div>
        <div className="space-y-1.5 min-w-0">
          <h3 className="font-semibold text-base sm:text-lg">{title}</h3>
          <div className="text-sm text-muted-foreground leading-relaxed">{children}</div>
        </div>
      </div>
    </Card>
  )
}

function SectionHeading({ icon, badge, title, subtitle }: { icon: React.ReactNode; badge: string; title: string; subtitle?: string }) {
  return (
    <div className="space-y-3 text-center">
      <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
        {icon}
        {badge}
      </div>
      <h2 className="text-2xl sm:text-3xl font-bold">{title}</h2>
      {subtitle && <p className="text-muted-foreground max-w-xl mx-auto text-sm sm:text-base">{subtitle}</p>}
    </div>
  )
}


function KiwiExtensionsMock() {
  return (
    <div className="rounded-xl border border-border bg-background overflow-hidden shadow-lg max-w-md mx-auto text-left">
      <div className="flex items-center gap-2 bg-muted/60 px-4 py-2.5 border-b border-border">
        <span className="h-2.5 w-2.5 rounded-full bg-border" aria-hidden />
        <span className="flex-1 rounded-full bg-background/80 border border-border px-3 py-1 text-[11px] text-muted-foreground font-mono">
          chrome://extensions
        </span>
      </div>
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-base font-bold">Extensões</span>
          <span className="text-[11px] text-muted-foreground">Modo do desenvolvedor</span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-[12px]">
          <span className="rounded-md border border-border px-2.5 py-2 text-center text-muted-foreground">
            + (from store)
          </span>
          <span className="relative rounded-md border-2 border-primary bg-primary/10 px-2.5 py-2 text-center font-semibold text-primary shadow-[0_0_16px_-4px_color-mix(in_oklch,var(--primary)_60%,transparent)]">
            + (from .zip/.crx)
            <span className="absolute -top-2.5 -right-2 rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-bold text-primary-foreground rotate-6">
              toque aqui
            </span>
          </span>
          <span className="rounded-md border border-border px-2.5 py-2 text-center text-muted-foreground">
            Compactar extensão
          </span>
          <span className="rounded-md border border-border px-2.5 py-2 text-center text-muted-foreground">
            Atualizar
          </span>
        </div>
        <p className="pt-1 text-center text-[11px] text-muted-foreground">
          Tela ilustrativa do Kiwi Browser
        </p>
      </div>
    </div>
  )
}

export default async function ExtensaoPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login?redirect=/extensao')

  const publicUrlStatus = publicUrlService.getStatus()
  const isAdmin = user.role === 4
  const canDownload = publicUrlStatus.configured
  if (!canDownload && !isAdmin) redirect('/inicio/secoes')

  // Sem URL configurada, o admin vê apenas o assistente de configuração —
  // downloads e tutoriais só aparecem depois que a extensão estiver ativa.
  if (!canDownload) {
    const urlSuggestions = await getPublicUrlSuggestions()
    return (
      <div className="min-h-screen bg-linear-to-br from-background via-background to-primary/5">
        <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <Link href="/inicio/secoes" className="flex items-center gap-2 font-bold text-lg hover:opacity-80 transition">
              <span>← Voltar</span>
            </Link>
            <div className="flex items-center gap-2 text-primary">
              <Chrome className="w-5 h-5" />
              <span className="font-semibold">Extensão do navegador</span>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-14 sm:py-16 space-y-10">
          <section className="relative text-center space-y-5 max-w-2xl mx-auto">
            <div className="pointer-events-none absolute -top-10 left-1/2 h-56 w-56 -translate-x-1/2 rounded-full bg-primary/15 blur-3xl" aria-hidden />
            <div className="relative flex justify-center">
              <div className="relative p-4 rounded-2xl bg-linear-to-br from-primary/25 to-accent/15 border border-primary/30 shadow-[0_0_30px_-8px_color-mix(in_oklch,var(--primary)_60%,transparent)]">
                <Chrome className="w-12 h-12 text-primary" />
                <Sparkles className="absolute -right-2 -top-2 h-5 w-5 text-accent" />
              </div>
            </div>
            <h1 className="relative text-3xl md:text-4xl font-bold tracking-tight">
              Ative a extensão para{' '}
              <span className="bg-linear-to-r from-primary to-accent bg-clip-text text-transparent">seus usuários</span>
            </h1>
            <p className="relative text-base sm:text-lg text-muted-foreground">
              Falta só um passo: informe o endereço deste servidor. Depois disso, o download da
              extensão e os tutoriais de instalação ficam disponíveis para todo mundo.
            </p>
          </section>

          <ExtensionPublicUrlSetup
            lanUrls={urlSuggestions.lanUrls}
            domainUrl={urlSuggestions.domainUrl}
          />
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-background via-background to-primary/5">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/inicio/secoes" className="flex items-center gap-2 font-bold text-lg hover:opacity-80 transition">
            <span>← Voltar</span>
          </Link>
          <div className="flex items-center gap-2 text-primary">
            <Chrome className="w-5 h-5" />
            <span className="font-semibold">Extensão do navegador</span>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-14 sm:py-16 space-y-20">
        <section className="relative text-center space-y-6 max-w-2xl mx-auto">
          <div className="pointer-events-none absolute -top-10 left-1/2 h-56 w-56 -translate-x-1/2 rounded-full bg-primary/15 blur-3xl" aria-hidden />
          <div className="relative flex justify-center">
            <div className="relative p-4 rounded-2xl bg-linear-to-br from-primary/25 to-accent/15 border border-primary/30 shadow-[0_0_30px_-8px_color-mix(in_oklch,var(--primary)_60%,transparent)]">
              <Chrome className="w-12 h-12 text-primary" />
              <Sparkles className="absolute -right-2 -top-2 h-5 w-5 text-accent" />
            </div>
          </div>
          <h1 className="relative text-4xl md:text-5xl font-bold tracking-tight">
            Tradutor de Manga no{' '}
            <span className="bg-linear-to-r from-primary to-accent bg-clip-text text-transparent">Navegador</span>
          </h1>
          <p className="relative text-lg text-muted-foreground">
            Instale a extensão e traduza mangá direto de qualquer site. Leitor integrado,
            OCR com IA e overlay editável — no desktop e no celular.
          </p>
          <div className="relative flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <DownloadExtensionButton
              canDownload={canDownload}
              className="w-full sm:w-auto gap-2 bg-primary hover:bg-primary/90 shadow-[0_8px_24px_-8px_color-mix(in_oklch,var(--primary)_80%,transparent)]"
            />
            <Link href="#tutorial-desktop">
              <Button size="lg" variant="outline" className="w-full sm:w-auto gap-2">
                <Monitor className="w-5 h-5" />
                Tutorial desktop
              </Button>
            </Link>
            <Link href="#tutorial-android">
              <Button size="lg" variant="outline" className="w-full sm:w-auto gap-2">
                <Smartphone className="w-5 h-5" />
                Tutorial Android
              </Button>
            </Link>
          </div>
        </section>

        <section className="grid sm:grid-cols-3 gap-5 max-w-5xl mx-auto">
          <Card className="p-6 border border-border/50 hover:border-primary/50 hover:shadow-[0_0_24px_-10px_color-mix(in_oklch,var(--primary)_50%,transparent)] transition space-y-3">
            <div className="p-2 w-fit rounded-lg bg-primary/20">
              <Zap className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-semibold text-lg">Leitor Integrado</h3>
            <p className="text-sm text-muted-foreground">
              Um clique no ícone abre o modo leitor sobre a própria página, com zoom, navegação e overlay OCR.
            </p>
          </Card>

          <Card className="p-6 border border-border/50 hover:border-primary/50 hover:shadow-[0_0_24px_-10px_color-mix(in_oklch,var(--primary)_50%,transparent)] transition space-y-3">
            <div className="p-2 w-fit rounded-lg bg-primary/20">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-semibold text-lg">Seu Servidor</h3>
            <p className="text-sm text-muted-foreground">
              O processamento roda no seu próprio servidor. Suas leituras ficam na sua biblioteca, sob seu controle.
            </p>
          </Card>

          <Card className="p-6 border border-border/50 hover:border-primary/50 hover:shadow-[0_0_24px_-10px_color-mix(in_oklch,var(--primary)_50%,transparent)] transition space-y-3">
            <div className="p-2 w-fit rounded-lg bg-primary/20">
              <BookOpen className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-semibold text-lg">OCR Avançado</h3>
            <p className="text-sm text-muted-foreground">
              Detecção precisa de balões com suporte a Inglês, Português e Japonês, tradução via Google ou OpenRouter.
            </p>
          </Card>
        </section>

        <section id="tutorial-desktop" className="max-w-3xl mx-auto space-y-8 scroll-mt-24">
          <SectionHeading
            icon={<Monitor className="h-3.5 w-3.5" />}
            badge="Desktop"
            title="Instalar no Chrome"
            subtitle="Funciona no Chrome, Edge, Brave e demais navegadores Chromium."
          />

          <div className="space-y-4">
            <StepCard step="1" title="Baixe e extraia a extensão">
              Clique em <strong className="text-foreground">"Baixar extensão (.zip)"</strong> acima e extraia o
              arquivo em uma pasta de sua preferência.
            </StepCard>
            <StepCard step="2" title="Abra a tela de extensões">
              Acesse <code className="bg-muted px-2 py-0.5 rounded text-xs">chrome://extensions</code> e ative o{' '}
              <strong className="text-foreground">Modo do desenvolvedor</strong> (canto superior direito).
            </StepCard>
            <StepCard step="3" title="Carregue a pasta extraída">
              Clique em <strong className="text-foreground">"Carregar sem compactação"</strong> e selecione a pasta
              extraída no passo 1.
            </StepCard>
            <StepCard step="4" title="Pronto!">
              Abra uma página de mangá e clique no ícone da extensão: o leitor abre na hora, com o login por cima.
            </StepCard>
          </div>
        </section>

        <section id="tutorial-android" className="max-w-3xl mx-auto space-y-8 scroll-mt-24">
          <SectionHeading
            icon={<Smartphone className="h-3.5 w-3.5" />}
            badge="Android"
            title="Instalar no celular"
            subtitle="No Android, use o Kiwi Browser — um navegador baseado no Chrome com suporte completo a extensões."
          />

          <div className="flex gap-3 rounded-lg border border-border/60 bg-muted/30 p-4 text-sm text-muted-foreground">
            <Shield className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
            <p>
              O <strong className="text-foreground">Kiwi Browser</strong> é um aplicativo de terceiros, de código
              aberto (
              <a
                href="https://github.com/kiwibrowser/src.next"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 hover:text-foreground transition"
              >
                github.com/kiwibrowser/src.next
              </a>
              ), <strong className="text-foreground">sem qualquer afiliação</strong> com o Manga Translator Local.
              O link abaixo aponta para um espelho do APK publicado no GitHub do projeto; verifique a procedência e
              instale por sua própria conta e risco. Qualquer navegador Android baseado em Chromium com suporte a
              extensões também funciona.
            </p>
          </div>

          <div className="space-y-4">
            <StepCard step="1" title="Baixe o Kiwi Browser">
              <p>
                Instale o navegador pelo APK:
              </p>
              <a href={KIWI_APK_URL} rel="noopener noreferrer" className="mt-3 inline-flex">
                <Button variant="outline" size="sm" className="gap-2 border-primary/40 text-primary hover:bg-primary/10">
                  <Download className="w-4 h-4" />
                  Baixar Kiwi Browser (.apk)
                </Button>
              </a>
              <p className="mt-2 text-xs">
                O Android pode pedir permissão para instalar apps de fontes externas — confirme para prosseguir.
              </p>
            </StepCard>
            <StepCard step="2" title="Baixe a extensão (.zip)">
              <p>
                Ainda no celular, baixe o pacote da extensão — não precisa extrair:
              </p>
              <DownloadExtensionButton
                canDownload={canDownload}
                variant="outline"
                size="sm"
                className="mt-3 gap-2 border-primary/40 text-primary hover:bg-primary/10"
              />
            </StepCard>
            <StepCard step="3" title="Abra a tela de extensões do Kiwi">
              Digite <code className="bg-muted px-2 py-0.5 rounded text-xs">chrome://extensions</code> na barra de
              endereço do Kiwi e ative o <strong className="text-foreground">Modo do desenvolvedor</strong>.
            </StepCard>
            <StepCard step="4" title={'Toque em "+ (from .zip)"'}>
              <p className="mb-4">
                Toque no botão <strong className="text-foreground">"+ (from .zip/.crx/.user.js)"</strong> e selecione o
                arquivo zip baixado no passo 2:
              </p>
              <KiwiExtensionsMock />
            </StepCard>
            <StepCard step="5" title="Pronto!">
              Abra uma página de mangá, toque no menu <strong className="text-foreground">⋮</strong> do Kiwi e selecione{' '}
              <strong className="text-foreground">Manga Translator Local</strong> na lista de extensões para abrir o leitor.
            </StepCard>
          </div>
        </section>

        <section className="max-w-3xl mx-auto space-y-8">
          <SectionHeading
            icon={<BookOpen className="h-3.5 w-3.5" />}
            badge="Uso"
            title="Como Usar"
          />

          <div className="grid md:grid-cols-2 gap-5">
            <Card className="p-6 border border-border/50 space-y-3">
              <h3 className="font-semibold text-lg">Ao clicar no ícone</h3>
              <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                <li>O modo leitor já abre na hora, com as imagens da página</li>
                <li>Um modal aparece por cima: entre com seu email e senha</li>
                <li>Configure idiomas e provider na tela seguinte</li>
                <li>Clique em "Iniciar leitor" para liberar o modal</li>
              </ol>
            </Card>

            <Card className="p-6 border border-border/50 space-y-3">
              <h3 className="font-semibold text-lg">No modo leitor</h3>
              <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                <li>Clique em "Traduzir" para processar todas as páginas</li>
                <li>Use zoom com os botões +/-</li>
                <li>Edite o overlay com duplo clique nos balões</li>
                <li>O ícone de conta no topo reabre o modal (logout/idiomas)</li>
              </ol>
            </Card>
          </div>
        </section>

        <section className="max-w-3xl mx-auto space-y-8">
          <SectionHeading
            icon={<Sparkles className="h-3.5 w-3.5" />}
            badge="Dúvidas"
            title="Perguntas Frequentes"
          />

          <div className="space-y-4">
            <details className="group border border-border/50 rounded-lg p-4 hover:border-primary/50 transition cursor-pointer">
              <summary className="font-semibold flex justify-between items-center">
                <span>A extensão requer o servidor local?</span>
                <span className="group-open:rotate-180 transition">▼</span>
              </summary>
              <p className="text-muted-foreground mt-3">
                Sim. A extensão conecta ao servidor Next.js configurado pelo administrador para fazer OCR, tradução e verificar sessão.
              </p>
            </details>

            <details className="group border border-border/50 rounded-lg p-4 hover:border-primary/50 transition cursor-pointer">
              <summary className="font-semibold flex justify-between items-center">
                <span>Posso usar sem fazer login?</span>
                <span className="group-open:rotate-180 transition">▼</span>
              </summary>
              <p className="text-muted-foreground mt-3">
                A extensão exige autenticação. Clique no ícone da extensão numa página de mangá: o leitor abre na hora com um modal por cima — faça login com seu email e senha. Se não tiver conta, você pode criar uma na página de setup do servidor.
              </p>
            </details>

            <details className="group border border-border/50 rounded-lg p-4 hover:border-primary/50 transition cursor-pointer">
              <summary className="font-semibold flex justify-between items-center">
                <span>Quais idiomas são suportados?</span>
                <span className="group-open:rotate-180 transition">▼</span>
              </summary>
              <p className="text-muted-foreground mt-3">
                A extensão suporta Inglês, Português (com acentuação) e Japonês. A tradução usa o Google Translate por padrão, mas você pode mudar para outro provider nas configurações.
              </p>
            </details>

            <details className="group border border-border/50 rounded-lg p-4 hover:border-primary/50 transition cursor-pointer">
              <summary className="font-semibold flex justify-between items-center">
                <span>Posso editar o texto antes de traduzir?</span>
                <span className="group-open:rotate-180 transition">▼</span>
              </summary>
              <div className="text-muted-foreground mt-3">
                Sim! No modo leitor, você pode:
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Duplo clique em um balão para editar</li>
                  <li>Arrastar balões para mover</li>
                  <li>Ajustar fonte, tamanho e densidade</li>
                  <li>Desenhar seleção manual para novos balões</li>
                </ul>
              </div>
            </details>

            <details className="group border border-border/50 rounded-lg p-4 hover:border-primary/50 transition cursor-pointer">
              <summary className="font-semibold flex justify-between items-center">
                <span>Como configurar a URL do servidor?</span>
                <span className="group-open:rotate-180 transition">▼</span>
              </summary>
              <p className="text-muted-foreground mt-3">
                Entre como administrador e salve a URL em <strong className="text-foreground">Preferências</strong>, na aba <strong className="text-foreground">Extensão</strong>. O ZIP baixado passa a carregar essa URL automaticamente.
              </p>
            </details>
          </div>
        </section>

        <section className="relative text-center space-y-6 max-w-2xl mx-auto py-10 overflow-hidden rounded-2xl border border-primary/20 bg-linear-to-br from-card via-card to-accent/10 px-6">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-linear-to-r from-primary via-accent to-primary" aria-hidden />
          <div className="pointer-events-none absolute -right-12 -top-14 h-44 w-44 rounded-full bg-primary/20 blur-3xl" aria-hidden />
          <h2 className="relative text-2xl sm:text-3xl font-bold">Pronto para começar?</h2>
          <p className="relative text-muted-foreground">
            Baixe a extensão agora e comece a traduzir mangá com facilidade — no PC ou no celular.
          </p>
          <div className="relative flex flex-col sm:flex-row gap-3 justify-center">
            <DownloadExtensionButton
              canDownload={canDownload}
              className="w-full sm:w-auto gap-2 bg-primary hover:bg-primary/90"
            />
            <a href={KIWI_APK_URL} rel="noopener noreferrer">
              <Button size="lg" variant="outline" className="w-full sm:w-auto gap-2">
                <Smartphone className="w-5 h-5" />
                Kiwi Browser (.apk)
              </Button>
            </a>
          </div>
          <p className="relative text-xs text-muted-foreground">
            Kiwi Browser é um{' '}
            <a
              href="https://github.com/kiwibrowser/src.next"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-foreground transition"
            >
              projeto open source de terceiros
            </a>
            , sem afiliação com o Manga Translator Local.
          </p>
        </section>
      </main>

      <footer className="border-t border-border bg-card/50 mt-20">
        <div className="container mx-auto px-4 py-8 text-center text-sm text-muted-foreground">
          <p>
            <Link href="/inicio/secoes" className="hover:text-foreground transition">
              ← Voltar às Seções
            </Link>
          </p>
        </div>
      </footer>
    </div>
  )
}
