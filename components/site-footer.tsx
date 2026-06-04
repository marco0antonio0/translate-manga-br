import Link from 'next/link'
import { Github, Heart, Languages, Linkedin } from 'lucide-react'
import { cn } from '@/lib/utils'

const SITE_NAME = 'MangaIOTranslate'
const DEVELOPER_NAME = 'Marco Antonio'
const DEVELOPER_URL = 'https://www.linkedin.com/in/marco-antonio-aa3024233'
const REPOSITORY_URL = 'https://github.com/marco0antonio0/translate-manga-br'

type FooterLink = {
  label: string
  href: string
  external?: boolean
}

// Links configuráveis — prontos para apontar a rotas futuras.
const FOOTER_LINKS: FooterLink[] = [
  { label: 'Sobre', href: '/sobre' },
  { label: 'Termos de uso', href: '/termos' },
  { label: 'Política de privacidade', href: '/termos' },
  { label: 'Contato', href: DEVELOPER_URL, external: true },
  { label: 'Repositório', href: REPOSITORY_URL, external: true },
]

function FooterNavLink({ link }: { link: FooterLink }) {
  const className =
    'text-sm text-muted-foreground transition-colors hover:text-foreground'

  if (link.external) {
    return (
      <a
        href={link.href}
        target="_blank"
        rel="noreferrer"
        className={className}
      >
        {link.label}
      </a>
    )
  }

  return (
    <Link href={link.href} className={className}>
      {link.label}
    </Link>
  )
}

function DeveloperCredit({ className }: { className?: string }) {
  return (
    <p className={cn('text-sm text-muted-foreground', className)}>
      Desenvolvido com{' '}
      <Heart className="inline h-3.5 w-3.5 -translate-y-px fill-primary text-primary" aria-hidden="true" />{' '}
      por{' '}
      <a
        href={DEVELOPER_URL}
        target="_blank"
        rel="noreferrer"
        className="font-medium text-foreground transition-colors hover:text-primary"
      >
        {DEVELOPER_NAME}
      </a>
    </p>
  )
}

export type SiteFooterProps = {
  /** Versão enxuta para páginas internas do sistema. */
  compact?: boolean
  className?: string
}

export function SiteFooter({ compact = false, className }: SiteFooterProps) {
  const year = new Date().getFullYear()

  if (compact) {
    return (
      <footer
        aria-label="Rodapé do sistema"
        className={cn(
          'border-t border-border/70 bg-background/60',
          className
        )}
      >
        <div className="mx-auto flex w-full max-w-screen-2xl flex-col items-center justify-between gap-2 px-3 py-4 text-center sm:flex-row sm:px-4 sm:text-left">
          <p className="text-xs text-muted-foreground">
            © {year} {SITE_NAME}
          </p>
          <DeveloperCredit className="text-xs" />
        </div>
      </footer>
    )
  }

  return (
    <footer
      aria-label="Rodapé do sistema"
      className={cn('border-t border-border bg-card/40', className)}
    >
      <div className="mx-auto w-full max-w-screen-2xl px-4 py-8 sm:py-10">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div className="max-w-sm space-y-3">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-primary p-1.5">
                <Languages className="h-5 w-5 text-primary-foreground" aria-hidden="true" />
              </div>
              <span className="text-base font-bold text-foreground">{SITE_NAME}</span>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Tradutor open source de mangás e manhwas para o português do Brasil,
              preservando o layout visual original das páginas.
            </p>
          </div>

          <nav aria-label="Links do rodapé" className="flex flex-col gap-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Links
            </span>
            <ul className="flex flex-col gap-2">
              {FOOTER_LINKS.map((link) => (
                <li key={`${link.label}-${link.href}`}>
                  <FooterNavLink link={link} />
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="mt-8 flex flex-col items-center justify-between gap-3 border-t border-border/70 pt-6 sm:flex-row">
          <p className="text-sm text-muted-foreground">
            © {year} {SITE_NAME}. Todos os direitos reservados.
          </p>
          <div className="flex items-center gap-4">
            <DeveloperCredit />
            <a
              href={REPOSITORY_URL}
              target="_blank"
              rel="noreferrer"
              aria-label="Repositório do projeto no GitHub"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              <Github className="h-5 w-5" aria-hidden="true" />
            </a>
            <a
              href={DEVELOPER_URL}
              target="_blank"
              rel="noreferrer"
              aria-label="LinkedIn do desenvolvedor"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              <Linkedin className="h-5 w-5" aria-hidden="true" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
