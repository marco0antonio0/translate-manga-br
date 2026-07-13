'use client'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { ExternalLink, Heart, Star } from 'lucide-react'

const GITHUB_STAR_KEY = 'manga-github-star-v1'
const GITHUB_REPO_URL = 'https://github.com/marco0antonio0/translate-manga-br'

export function hasSeenGithubStarModal() {
  if (typeof window === 'undefined') return true
  return localStorage.getItem(GITHUB_STAR_KEY) === 'seen'
}

export function markGithubStarModalSeen() {
  if (typeof window !== 'undefined') {
    localStorage.setItem(GITHUB_STAR_KEY, 'seen')
  }
}

function GithubMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.55 0-.27-.01-1.17-.02-2.12-3.2.7-3.87-1.36-3.87-1.36-.52-1.33-1.28-1.68-1.28-1.68-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.19 1.76 1.19 1.03 1.75 2.69 1.25 3.34.95.1-.74.4-1.25.72-1.53-2.55-.29-5.23-1.28-5.23-5.68 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11.1 11.1 0 0 1 2.89-.39c.98 0 1.97.13 2.89.39 2.2-1.49 3.16-1.18 3.16-1.18.63 1.59.24 2.76.12 3.05.74.81 1.19 1.83 1.19 3.09 0 4.41-2.69 5.38-5.25 5.67.41.35.77 1.05.77 2.12 0 1.53-.01 2.76-.01 3.14 0 .3.2.66.8.55A11.51 11.51 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
    </svg>
  )
}

interface GithubStarModalProps {
  open: boolean
  onClose: () => void
}

export function GithubStarModal({ open, onClose }: GithubStarModalProps) {
  const dismiss = () => {
    markGithubStarModalSeen()
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) dismiss() }}>
      <DialogContent className="max-w-[calc(100%-2.5rem)] sm:max-w-md">
        <DialogHeader className="sr-only">
          <DialogTitle>Apoie o projeto</DialogTitle>
          <DialogDescription>Considere dar uma estrela no GitHub</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 pt-2 text-center">
          <div className="relative">
            <div className="rounded-2xl bg-primary/10 p-4">
              <GithubMark className="h-10 w-10 text-foreground" />
            </div>
            <Star className="absolute -right-2 -top-2 h-5 w-5 fill-amber-400 text-amber-400 drop-shadow-[0_0_6px_rgb(251_191_36/0.7)]" />
          </div>

          <div className="space-y-1.5">
            <h2 className="text-xl font-bold text-foreground">Gostou do projeto?</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              O MangaIOTranslate é <strong className="text-foreground">gratuito e de código aberto</strong>,
              feito com <Heart className="inline h-3.5 w-3.5 fill-primary text-primary" /> para a comunidade.
              Se ele for útil para você, considere deixar uma{' '}
              <strong className="text-foreground">estrela no GitHub</strong> — é rápido, não custa nada e
              ajuda mais pessoas a descobrirem o projeto.
            </p>
          </div>

          <a
            href={GITHUB_REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={markGithubStarModalSeen}
            className="flex w-full items-center gap-3 rounded-lg border border-border bg-muted/30 px-3.5 py-2.5 text-left transition-colors hover:border-primary/50 hover:bg-muted/50"
          >
            <GithubMark className="h-5 w-5 shrink-0 text-foreground" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-foreground">
                marco0antonio0/translate-manga-br
              </span>
              <span className="block text-xs text-muted-foreground">Ver o repositório no GitHub</span>
            </span>
            <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
          </a>

          <div className="flex w-full flex-col gap-2">
            <Button asChild className="w-full gap-2">
              <a
                href={GITHUB_REPO_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={markGithubStarModalSeen}
              >
                <Star className="h-4 w-4" />
                Dar uma estrela no GitHub
              </a>
            </Button>
            <Button type="button" variant="ghost" className="w-full text-muted-foreground" onClick={dismiss}>
              Agora não
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
