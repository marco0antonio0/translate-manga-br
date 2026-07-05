import { Metadata } from 'next'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Chrome, Download, BookOpen, Zap, Shield, Smartphone } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Extensão para navegador',
  description: 'Baixe e instale a extensão Manga Translator Local para Chrome e Firefox Mobile. Traduza mangá diretamente do navegador com IA.',
}

export default function ExtensaoPage() {
  return (
    <div className="min-h-screen bg-linear-to-br from-background via-background to-primary/5">
      {/* Header com navegação */}
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

      <main className="container mx-auto px-4 py-16 space-y-16">
        {/* Hero Section */}
        <section className="text-center space-y-6 max-w-2xl mx-auto">
          <div className="flex justify-center">
            <div className="p-4 rounded-full bg-primary/20 border border-primary/30">
              <Chrome className="w-12 h-12 text-primary" />
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold">
            Tradutor de Manga no Navegador
          </h1>
          <p className="text-lg text-muted-foreground">
            Instale nossa extensão para Chrome ou Firefox Mobile e traduza mangá direto do navegador. Acesso rápido, modo leitor integrado e controle total sobre o OCR.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Link href="/download-extensao">
              <Button size="lg" className="gap-2 bg-primary hover:bg-primary/90">
                <Download className="w-5 h-5" />
                Baixar para Chrome
              </Button>
            </Link>
            <Link href="/download-extensao?target=firefox">
              <Button size="lg" variant="outline" className="gap-2">
                <Smartphone className="w-5 h-5" />
                Baixar para Firefox Mobile
              </Button>
            </Link>
            <Link href="#tutorial">
              <Button size="lg" variant="outline" className="gap-2">
                <BookOpen className="w-5 h-5" />
                Ver Tutorial
              </Button>
            </Link>
          </div>
        </section>

        {/* Recursos principais */}
        <section className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          <Card className="p-6 border border-border/50 hover:border-primary/50 transition space-y-3">
            <div className="p-2 w-fit rounded-lg bg-primary/20">
              <Zap className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-semibold text-lg">Leitor Integrado</h3>
            <p className="text-sm text-muted-foreground">
              Leia mangá com o modo leitor completo direto do navegador. Zoom, navegação e overlay OCR.
            </p>
          </Card>

          <Card className="p-6 border border-border/50 hover:border-primary/50 transition space-y-3">
            <div className="p-2 w-fit rounded-lg bg-primary/20">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-semibold text-lg">Totalmente Local</h3>
            <p className="text-sm text-muted-foreground">
              Processa tudo localmente. Nenhum dado enviado para servidores terceirizados, apenas tradução segura.
            </p>
          </Card>

          <Card className="p-6 border border-border/50 hover:border-primary/50 transition space-y-3">
            <div className="p-2 w-fit rounded-lg bg-primary/20">
              <BookOpen className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-semibold text-lg">OCR Avançado</h3>
            <p className="text-sm text-muted-foreground">
              Suporte para Inglês, Português e Japonês com IA de última geração. Detecção precisa de balões.
            </p>
          </Card>
        </section>

        {/* Tutorial de instalação */}
        <section id="tutorial" className="max-w-3xl mx-auto space-y-8">
          <h2 className="text-3xl font-bold">Como Instalar</h2>

          <div className="space-y-6">
            {/* Passo 1 */}
            <Card className="p-6 border border-border/50">
              <div className="flex gap-4">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/20 font-semibold text-primary shrink-0">
                  1
                </div>
                <div className="space-y-2">
                  <h3 className="font-semibold text-lg">Baixe o pacote do seu navegador</h3>
                  <p className="text-muted-foreground">
                    Use "Baixar para Chrome" no desktop ou "Baixar para Firefox Mobile" no Android.
                  </p>
                </div>
              </div>
            </Card>

            {/* Passo 2 */}
            <Card className="p-6 border border-border/50">
              <div className="flex gap-4">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/20 font-semibold text-primary shrink-0">
                  2
                </div>
                <div className="space-y-2">
                  <h3 className="font-semibold text-lg">Instale em modo desenvolvedor</h3>
                  <p className="text-muted-foreground">
                    No Chrome, use "Carregar sem compactação". No Firefox Mobile, use o fluxo de extensão temporária/debug do Firefox para Android.
                  </p>
                </div>
              </div>
            </Card>

            {/* Passo 3 */}
            <Card className="p-6 border border-border/50">
              <div className="flex gap-4">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/20 font-semibold text-primary shrink-0">
                  3
                </div>
                <div className="space-y-2">
                  <h3 className="font-semibold text-lg">Escolha o ZIP gerado</h3>
                  <p className="text-muted-foreground">
                    O pacote Chrome usa Manifest V3. O pacote Firefox Mobile usa manifest próprio compatível com background script clássico.
                  </p>
                </div>
              </div>
            </Card>

            {/* Passo 4 */}
            <Card className="p-6 border border-border/50">
              <div className="flex gap-4">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/20 font-semibold text-primary shrink-0">
                  4
                </div>
                <div className="space-y-2">
                  <h3 className="font-semibold text-lg">Configure as permissões</h3>
                  <p className="text-muted-foreground">
                    A extensão pedirá acesso ao seu navegador. Confirme para continuar.
                  </p>
                </div>
              </div>
            </Card>

            {/* Passo 5 */}
            <Card className="p-6 border border-border/50">
              <div className="flex gap-4">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/20 font-semibold text-primary shrink-0">
                  5
                </div>
                <div className="space-y-2">
                  <h3 className="font-semibold text-lg">Pronto!</h3>
                  <p className="text-muted-foreground">
                    A extensão está instalada. Clique no ícone da extensão (canto superior direito) para começar a usar.
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </section>

        {/* Como usar */}
        <section className="max-w-3xl mx-auto space-y-8">
          <h2 className="text-3xl font-bold">Como Usar</h2>

          <div className="grid md:grid-cols-2 gap-6">
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

        {/* FAQ */}
        <section className="max-w-3xl mx-auto space-y-8">
          <h2 className="text-3xl font-bold">Perguntas Frequentes</h2>

          <div className="space-y-4">
            <details className="group border border-border/50 rounded-lg p-4 hover:border-primary/50 transition cursor-pointer">
              <summary className="font-semibold flex justify-between items-center">
                <span>A extensão requer o servidor local?</span>
                <span className="group-open:rotate-180 transition">▼</span>
              </summary>
              <p className="text-muted-foreground mt-3">
                Sim. A extensão conecta ao servidor Next.js em http://localhost:3080 para fazer OCR, tradução e verificar sessão. A URL é gerada pelo build/dev a partir das variáveis de ambiente.
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
              <p className="text-muted-foreground mt-3">
                Sim! No modo leitor, você pode:
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Duplo clique em um balão para editar</li>
                  <li>Arrastar balões para mover</li>
                  <li>Ajustar fonte, tamanho e densidade</li>
                  <li>Desenhar seleção manual para novos balões</li>
                </ul>
              </p>
            </details>

            <details className="group border border-border/50 rounded-lg p-4 hover:border-primary/50 transition cursor-pointer">
              <summary className="font-semibold flex justify-between items-center">
                <span>Como configurar a URL do servidor?</span>
                <span className="group-open:rotate-180 transition">▼</span>
              </summary>
              <p className="text-muted-foreground mt-3">
                Defina a URL via ambiente antes de rodar dev/build, por exemplo <code className="bg-muted px-2 py-1 rounded text-sm">CHROME_EXTENSION_API_BASE_URL=https://seu-dominio</code>. O modal do leitor apenas exibe a URL gerada.
              </p>
            </details>
          </div>
        </section>

        {/* CTA Final */}
        <section className="text-center space-y-6 max-w-2xl mx-auto py-8 border-t border-border">
          <h2 className="text-3xl font-bold">Pronto para começar?</h2>
          <p className="text-lg text-muted-foreground">
            Baixe a extensão agora e comece a traduzir mangá com facilidade.
          </p>
          <Link href="/download-extensao">
            <Button size="lg" className="gap-2 bg-primary hover:bg-primary/90">
              <Download className="w-5 h-5" />
              Baixar para Chrome
            </Button>
          </Link>
          <Link href="/download-extensao?target=firefox">
            <Button size="lg" variant="outline" className="gap-2">
              <Smartphone className="w-5 h-5" />
              Baixar para Firefox Mobile
            </Button>
          </Link>
        </section>
      </main>

      {/* Footer */}
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
