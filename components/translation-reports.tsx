'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { toErrorMessage } from '@/lib/sections'
import {
  AlertCircle,
  ArrowLeft,
  Download,
  Eye,
  EyeOff,
  ExternalLink,
  Flag,
  ImageOff,
  Inbox,
  Loader2,
  PencilLine,
  RefreshCw,
  Save,
  Trash2,
} from 'lucide-react'

type ReportStatus = 'open' | 'reviewed' | 'dismissed'

interface ReportItem {
  id: number
  user_id: number
  user_name: string
  user_email: string
  reason: string
  page_url: string
  image_url: string
  item_id: string
  box: [number, number, number, number]
  ocr_text: string
  translated_text: string
  image_crop: string
  corrected_text: string
  metadata: Record<string, unknown>
  status: ReportStatus
  created_at: string
}

interface AuthMeResponse {
  role?: number
  message?: string
  error?: string
}

const REASON_LABELS: Record<string, string> = {
  incorrect_translation: 'Tradução incorreta',
  not_translated: 'Não traduzido',
  inadequate_meaning: 'Sentido inadequado',
  unethical_content: 'Conteúdo antiético',
}

const STATUS_LABELS: Record<ReportStatus, string> = {
  open: 'Não visualizado',
  reviewed: 'Visualizado',
  dismissed: 'Descartado',
}

const STATUS_FILTERS: Array<{ value: ReportStatus | 'all'; label: string }> = [
  { value: 'all', label: 'Todos' },
  { value: 'open', label: 'Não visualizados' },
  { value: 'reviewed', label: 'Visualizados' },
]

function reasonColor(reason: string) {
  if (reason === 'unethical_content') return 'text-red-600 dark:text-red-400 bg-red-500/10 border-red-500/30'
  if (reason === 'incorrect_translation') return 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/30'
  if (reason === 'not_translated') return 'text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/30'
  return 'text-purple-600 dark:text-purple-400 bg-purple-500/10 border-purple-500/30'
}

function statusColor(status: ReportStatus) {
  if (status === 'open') return 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/30'
  if (status === 'reviewed') return 'text-green-600 dark:text-green-400 bg-green-500/10 border-green-500/30'
  return 'text-muted-foreground bg-muted/30 border-border'
}

function formatReportDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function metadataText(metadata: Record<string, unknown>, key: string) {
  const value = metadata?.[key]
  return typeof value === 'string' && value.trim() ? value.trim() : ''
}

function normalizeBox(box: [number, number, number, number]): [number, number, number, number] {
  return [
    Math.min(box[0], box[2]),
    Math.min(box[1], box[3]),
    Math.max(box[0], box[2]),
    Math.max(box[1], box[3]),
  ]
}

interface NaturalSize {
  width: number
  height: number
}

/**
 * Recorte ampliado da área do balão reportado: a imagem é escalada para que o
 * box preencha o container (posições em % dispensam medir o container).
 */
function ReportBalloonCrop({ report, natural }: { report: ReportItem; natural: NaturalSize }) {
  const [x1, y1, x2, y2] = normalizeBox(report.box)
  const boxWidth = Math.max(1, x2 - x1)
  const boxHeight = Math.max(1, y2 - y1)

  return (
    <div
      className="relative w-full overflow-hidden rounded-md border border-border bg-muted/30"
      style={{ aspectRatio: `${boxWidth} / ${boxHeight}`, maxHeight: 260 }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={report.image_url}
        alt="Área do balão reportado"
        className="absolute max-w-none"
        style={{
          width: `${(natural.width / boxWidth) * 100}%`,
          left: `${-(x1 / boxWidth) * 100}%`,
          top: `${-(y1 / boxHeight) * 100}%`,
        }}
      />
    </div>
  )
}

/** Imagem completa com a área reportada demarcada. */
function ReportImageWithBox({
  report,
  natural,
  onLoadNatural,
  onImageError,
  imageFailed,
}: {
  report: ReportItem
  natural: NaturalSize | null
  onLoadNatural: (size: NaturalSize) => void
  onImageError: () => void
  imageFailed: boolean
}) {
  const [x1, y1, x2, y2] = normalizeBox(report.box)

  if (imageFailed) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border py-10 text-muted-foreground">
        <ImageOff className="h-6 w-6 opacity-40" />
        <p className="text-xs text-center px-4">
          Não foi possível carregar a imagem (o site de origem pode bloquear acesso externo).
        </p>
        <a
          href={report.image_url}
          target="_blank"
          rel="noreferrer"
          className="text-xs text-primary hover:underline"
        >
          Abrir imagem em nova aba
        </a>
      </div>
    )
  }

  return (
    <div className="max-h-72 sm:max-h-105 overflow-y-auto rounded-md border border-border bg-muted/20">
      <div className="relative w-full">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={report.image_url}
          alt="Página reportada"
          className="w-full h-auto block"
          onLoad={(event) => {
            const img = event.currentTarget
            if (img.naturalWidth > 0 && img.naturalHeight > 0) {
              onLoadNatural({ width: img.naturalWidth, height: img.naturalHeight })
            }
          }}
          onError={onImageError}
        />
        {natural && (
          <div
            className="absolute border-2 border-red-500 bg-red-500/15 shadow-[0_0_0_9999px_rgb(0_0_0/0.35)] pointer-events-none"
            style={{
              left: `${(x1 / natural.width) * 100}%`,
              top: `${(y1 / natural.height) * 100}%`,
              width: `${((x2 - x1) / natural.width) * 100}%`,
              height: `${((y2 - y1) / natural.height) * 100}%`,
            }}
          />
        )}
      </div>
    </div>
  )
}

export function TranslationReports() {
  const router = useRouter()

  const [reports, setReports] = useState<ReportItem[]>([])
  const [isCheckingAccess, setIsCheckingAccess] = useState(true)
  const [isLoading, setIsLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<number | null>(null)
  const [statusFilter, setStatusFilter] = useState<ReportStatus | 'all'>('all')
  const [selectedReport, setSelectedReport] = useState<ReportItem | null>(null)
  const [naturalSize, setNaturalSize] = useState<NaturalSize | null>(null)
  const [imageFailed, setImageFailed] = useState(false)
  const [correctionDraft, setCorrectionDraft] = useState('')
  const [isSavingCorrection, setIsSavingCorrection] = useState(false)
  const [correctionStatus, setCorrectionStatus] = useState('')
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [error, setError] = useState('')

  const openCount = useMemo(() => reports.filter((r) => r.status === 'open').length, [reports])
  const viewedCount = useMemo(() => reports.filter((r) => r.status === 'reviewed').length, [reports])
  const filteredReports = useMemo(
    () => (statusFilter === 'all' ? reports : reports.filter((r) => r.status === statusFilter)),
    [reports, statusFilter]
  )

  const handleUnauthorized = useCallback(() => {
    router.replace('/login?expired=1')
  }, [router])

  const fetchReports = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/translation-reports', { cache: 'no-store' })
      const data = await response.json()
      if (response.status === 401) { handleUnauthorized(); return }
      if (response.status === 403) { router.replace('/inicio/secoes'); return }
      if (!response.ok || !Array.isArray(data?.reports)) {
        throw new Error(toErrorMessage(data, 'Não foi possível listar os reports.'))
      }
      setReports(data.reports as ReportItem[])
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao listar reports.')
    } finally {
      setIsLoading(false)
    }
  }, [handleUnauthorized, router])

  useEffect(() => {
    let cancelled = false
    const checkAccess = async () => {
      setIsCheckingAccess(true)
      try {
        const response = await fetch('/api/auth/me', { cache: 'no-store' })
        const data = (await response.json()) as AuthMeResponse
        if (cancelled) return
        if (response.status === 401) { handleUnauthorized(); return }
        if (!response.ok) throw new Error(toErrorMessage(data, 'Não foi possível verificar permissão.'))
        if (data.role !== 4) { router.replace('/inicio/secoes'); return }
        await fetchReports()
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Erro ao validar permissão.')
          setIsLoading(false)
        }
      } finally {
        if (!cancelled) setIsCheckingAccess(false)
      }
    }
    void checkAccess()
    return () => { cancelled = true }
  }, [fetchReports, handleUnauthorized, router])

  const openReport = (report: ReportItem) => {
    setNaturalSize(null)
    setImageFailed(false)
    setCorrectionDraft(report.corrected_text || '')
    setCorrectionStatus('')
    setSelectedReport(report)
  }

  const exportReports = async () => {
    setError('')
    setIsExporting(true)
    try {
      const response = await fetch('/api/translation-reports/export', { cache: 'no-store' })
      if (response.status === 401) { handleUnauthorized(); return }
      if (response.status === 403) { router.replace('/inicio/secoes'); return }
      if (!response.ok) {
        const data = await response.json().catch(() => null)
        throw new Error(toErrorMessage(data, 'Não foi possível exportar os reports.'))
      }
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `translation-reports-${new Date().toISOString().slice(0, 10)}.zip`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao exportar reports.')
    } finally {
      setIsExporting(false)
    }
  }

  const deleteReport = async (report: ReportItem) => {
    setError('')
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/translation-reports/${report.id}`, { method: 'DELETE' })
      const data = await response.json()
      if (response.status === 401) { handleUnauthorized(); return }
      if (response.status === 403) { router.replace('/inicio/secoes'); return }
      if (!response.ok) throw new Error(toErrorMessage(data, 'Não foi possível excluir o report.'))
      setReports((prev) => prev.filter((item) => item.id !== report.id))
      setIsDeleteConfirmOpen(false)
      setSelectedReport(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir report.')
      setIsDeleteConfirmOpen(false)
    } finally {
      setIsDeleting(false)
    }
  }

  const saveCorrection = async (report: ReportItem) => {
    setError('')
    setCorrectionStatus('')
    setIsSavingCorrection(true)
    try {
      const response = await fetch(`/api/translation-reports/${report.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ corrected_text: correctionDraft }),
      })
      const data = await response.json()
      if (response.status === 401) { handleUnauthorized(); return }
      if (response.status === 403) { router.replace('/inicio/secoes'); return }
      if (!response.ok) throw new Error(toErrorMessage(data, 'Não foi possível salvar a correção.'))
      const savedText = typeof data?.corrected_text === 'string' ? data.corrected_text : correctionDraft
      setReports((prev) => prev.map((item) => (item.id === report.id ? { ...item, corrected_text: savedText } : item)))
      setSelectedReport((prev) => (prev && prev.id === report.id ? { ...prev, corrected_text: savedText } : prev))
      setCorrectionDraft(savedText)
      setCorrectionStatus('Correção salva.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar correção.')
    } finally {
      setIsSavingCorrection(false)
    }
  }

  const toggleViewed = async (report: ReportItem) => {
    const nextStatus: ReportStatus = report.status === 'reviewed' ? 'open' : 'reviewed'
    setError('')
    setUpdatingId(report.id)
    try {
      const response = await fetch(`/api/translation-reports/${report.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      })
      const data = await response.json()
      if (response.status === 401) { handleUnauthorized(); return }
      if (response.status === 403) { router.replace('/inicio/secoes'); return }
      if (!response.ok) throw new Error(toErrorMessage(data, 'Não foi possível atualizar o report.'))
      setReports((prev) => prev.map((item) => (item.id === report.id ? { ...item, status: nextStatus } : item)))
      setSelectedReport((prev) => (prev && prev.id === report.id ? { ...prev, status: nextStatus } : prev))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar report.')
    } finally {
      setUpdatingId(null)
    }
  }

  if (isCheckingAccess) {
    return (
      <Card className="p-8">
        <div className="flex items-center justify-center text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
          Validando acesso...
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card className="p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Reports de tradução</h1>
            <p className="text-sm text-muted-foreground">
              Analise os balões reportados para entender e melhorar as traduções.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" className="flex-1 sm:flex-none">
              <Link href="/inicio/usuarios">
                <ArrowLeft className="h-4 w-4" />
                Usuários
              </Link>
            </Button>
            <Button type="button" variant="outline" onClick={() => void fetchReports()} disabled={isLoading} className="flex-1 sm:flex-none">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Atualizar
            </Button>
            <Button
              type="button"
              onClick={() => void exportReports()}
              disabled={isExporting || isLoading || reports.length === 0}
              className="flex-1 sm:flex-none"
              title="Baixar ZIP com dataset.json e imagens dos balões para avaliação/treino"
            >
              {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Exportar
            </Button>
          </div>
        </div>
      </Card>

      {error && (
        <Card className="p-3 flex items-center gap-2 text-sm text-destructive bg-destructive/10 border-destructive/30">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </Card>
      )}

      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <Card className="p-3 sm:p-4 flex flex-col items-start gap-1.5 sm:flex-row sm:items-center sm:gap-3 min-w-0">
          <div className="rounded-lg sm:rounded-xl bg-primary/10 p-2 sm:p-2.5 shrink-0">
            <Flag className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] sm:text-xs text-muted-foreground truncate w-full">Total</p>
            <p className="text-xl sm:text-2xl font-semibold text-foreground">{reports.length}</p>
          </div>
        </Card>
        <Card className="p-3 sm:p-4 flex flex-col items-start gap-1.5 sm:flex-row sm:items-center sm:gap-3 min-w-0">
          <div className="rounded-lg sm:rounded-xl bg-amber-500/10 p-2 sm:p-2.5 shrink-0">
            <Inbox className="h-4 w-4 sm:h-5 sm:w-5 text-amber-500" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] sm:text-xs text-muted-foreground truncate w-full">Não vistos</p>
            <p className="text-xl sm:text-2xl font-semibold text-foreground">{openCount}</p>
          </div>
        </Card>
        <Card className="p-3 sm:p-4 flex flex-col items-start gap-1.5 sm:flex-row sm:items-center sm:gap-3 min-w-0">
          <div className="rounded-lg sm:rounded-xl bg-green-500/10 p-2 sm:p-2.5 shrink-0">
            <Eye className="h-4 w-4 sm:h-5 sm:w-5 text-green-500" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] sm:text-xs text-muted-foreground truncate w-full">Visualizados</p>
            <p className="text-xl sm:text-2xl font-semibold text-foreground">{viewedCount}</p>
          </div>
        </Card>
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((filter) => (
          <Button
            key={filter.value}
            type="button"
            size="sm"
            variant={statusFilter === filter.value ? 'default' : 'outline'}
            onClick={() => setStatusFilter(filter.value)}
          >
            {filter.label}
          </Button>
        ))}
      </div>

      <Card className="overflow-hidden p-0">
        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            Carregando reports...
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center gap-2 text-muted-foreground">
            <Flag className="h-8 w-8 opacity-30" />
            <p className="text-sm">
              {reports.length === 0
                ? 'Nenhum report de tradução recebido ainda.'
                : 'Nenhum report com este status.'}
            </p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-border lg:hidden">
              {filteredReports.map((report) => (
                <button
                  key={report.id}
                  type="button"
                  className="w-full p-4 space-y-2 text-left hover:bg-muted/30 transition-colors"
                  onClick={() => openReport(report)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className={cn(
                      'text-xs font-medium px-2 py-0.5 rounded-full border',
                      reasonColor(report.reason)
                    )}>
                      {REASON_LABELS[report.reason] || report.reason}
                    </span>
                    <span className={cn(
                      'shrink-0 text-xs font-medium px-2 py-0.5 rounded-full border',
                      statusColor(report.status)
                    )}>
                      {STATUS_LABELS[report.status]}
                    </span>
                  </div>
                  {report.translated_text && (
                    <p className="text-sm text-foreground line-clamp-2">“{report.translated_text}”</p>
                  )}
                  <div className="flex justify-between gap-2 text-xs text-muted-foreground">
                    <span className="truncate">{report.user_name || report.user_email || `Usuário #${report.user_id}`}</span>
                    <span className="shrink-0">{formatReportDate(report.created_at)}</span>
                  </div>
                </button>
              ))}
            </div>

            <div className="hidden lg:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="w-12">ID</TableHead>
                    <TableHead>Motivo</TableHead>
                    <TableHead>Texto reportado</TableHead>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReports.map((report) => (
                    <TableRow
                      key={report.id}
                      className="cursor-pointer"
                      onClick={() => openReport(report)}
                    >
                      <TableCell className="font-mono text-sm text-muted-foreground">
                        {report.id}
                      </TableCell>
                      <TableCell>
                        <span className={cn(
                          'inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border whitespace-nowrap',
                          reasonColor(report.reason)
                        )}>
                          {REASON_LABELS[report.reason] || report.reason}
                        </span>
                      </TableCell>
                      <TableCell className="max-w-64">
                        <div className="flex items-center gap-1.5">
                          {report.corrected_text && (
                            <span title="Correção registrada">
                              <PencilLine className="h-3.5 w-3.5 text-green-500 shrink-0" />
                            </span>
                          )}
                          <p className="text-sm truncate">{report.translated_text || report.ocr_text || '—'}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm text-foreground">{report.user_name || `#${report.user_id}`}</p>
                        <p className="text-xs text-muted-foreground">{report.user_email}</p>
                      </TableCell>
                      <TableCell>
                        <span className={cn(
                          'inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border whitespace-nowrap',
                          statusColor(report.status)
                        )}>
                          {STATUS_LABELS[report.status]}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatReportDate(report.created_at)}
                      </TableCell>
                      <TableCell className="text-right" onClick={(event) => event.stopPropagation()}>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          title={report.status === 'reviewed' ? 'Marcar como não visualizado' : 'Marcar como visualizado'}
                          disabled={updatingId === report.id}
                          onClick={() => void toggleViewed(report)}
                        >
                          {updatingId === report.id
                            ? <Loader2 className="h-4 w-4 animate-spin" />
                            : report.status === 'reviewed'
                              ? <EyeOff className="h-4 w-4" />
                              : <Eye className="h-4 w-4" />}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </Card>

      <Dialog open={Boolean(selectedReport)} onOpenChange={(open) => { if (!open) setSelectedReport(null) }}>
        <DialogContent
          className={cn(
            'sm:max-w-4xl overflow-y-auto p-4 sm:p-6 sm:max-h-[92vh]',
            // Mobile: bottom sheet quase tela cheia em vez de modal centralizado
            'max-sm:top-auto max-sm:bottom-0 max-sm:left-0 max-sm:translate-x-0 max-sm:translate-y-0',
            'max-sm:max-w-full max-sm:h-[94dvh] max-sm:max-h-none',
            'max-sm:rounded-b-none max-sm:rounded-t-2xl max-sm:border-x-0 max-sm:border-b-0',
            'max-sm:pb-[max(1rem,env(safe-area-inset-bottom))]',
            'max-sm:data-[state=open]:slide-in-from-bottom-10 max-sm:data-[state=closed]:slide-out-to-bottom-10',
            'max-sm:data-[state=open]:zoom-in-100 max-sm:data-[state=closed]:zoom-out-100'
          )}
        >
          <DialogHeader className="text-left pr-8">
            <DialogTitle>Análise do report #{selectedReport?.id}</DialogTitle>
            <DialogDescription>
              {selectedReport
                ? `Enviado por ${selectedReport.user_name || selectedReport.user_email || `usuário #${selectedReport.user_id}`} em ${formatReportDate(selectedReport.created_at)}.`
                : ''}
            </DialogDescription>
          </DialogHeader>

          {selectedReport && (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                {selectedReport.image_crop ? (
                  <>
                    <p className="text-xs text-muted-foreground font-medium">
                      Recorte do balão reportado
                    </p>
                    <div className="flex items-center justify-center rounded-md border border-border bg-muted/20 p-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={selectedReport.image_crop}
                        alt="Recorte do balão reportado"
                        className="max-w-full max-h-64 sm:max-h-105 h-auto rounded"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-xs text-muted-foreground font-medium">
                      Página completa (área reportada em destaque)
                    </p>
                    <ReportImageWithBox
                      report={selectedReport}
                      natural={naturalSize}
                      onLoadNatural={setNaturalSize}
                      onImageError={() => setImageFailed(true)}
                      imageFailed={imageFailed}
                    />
                  </>
                )}
              </div>

              <div className="space-y-4 text-sm">
                <div className="flex flex-wrap gap-2">
                  <span className={cn(
                    'text-xs font-medium px-2 py-0.5 rounded-full border',
                    reasonColor(selectedReport.reason)
                  )}>
                    {REASON_LABELS[selectedReport.reason] || selectedReport.reason}
                  </span>
                  <span className={cn(
                    'text-xs font-medium px-2 py-0.5 rounded-full border',
                    statusColor(selectedReport.status)
                  )}>
                    {STATUS_LABELS[selectedReport.status]}
                  </span>
                  {metadataText(selectedReport.metadata, 'source_lang') && (
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full border text-muted-foreground bg-muted/30 border-border">
                      {metadataText(selectedReport.metadata, 'source_lang')} → {metadataText(selectedReport.metadata, 'target_lang') || '?'}
                      {metadataText(selectedReport.metadata, 'provider_lang') && ` · ${metadataText(selectedReport.metadata, 'provider_lang')}`}
                    </span>
                  )}
                </div>

                {naturalSize && !imageFailed && (
                  <div>
                    <p className="text-xs text-muted-foreground font-medium mb-1">Área do balão (ampliada)</p>
                    <ReportBalloonCrop report={selectedReport} natural={naturalSize} />
                  </div>
                )}

                <div>
                  <p className="text-xs text-muted-foreground font-medium mb-1">Texto original (OCR)</p>
                  <p className="rounded-md border border-border bg-muted/30 p-2.5 whitespace-pre-wrap wrap-break-word min-h-10">
                    {selectedReport.ocr_text || '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium mb-1">Texto traduzido</p>
                  <p className="rounded-md border border-border bg-muted/30 p-2.5 whitespace-pre-wrap wrap-break-word min-h-10">
                    {selectedReport.translated_text || '—'}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground font-medium mb-1 flex items-center gap-1">
                    <PencilLine className="h-3.5 w-3.5" />
                    Correção do revisor (como deveria ser)
                  </p>
                  <Textarea
                    value={correctionDraft}
                    onChange={(event) => { setCorrectionDraft(event.target.value); setCorrectionStatus('') }}
                    placeholder="Digite aqui a tradução correta para este balão..."
                    rows={3}
                    disabled={isSavingCorrection}
                  />
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <span className="text-xs text-green-600 dark:text-green-400">{correctionStatus}</span>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={isSavingCorrection || correctionDraft.trim() === (selectedReport.corrected_text || '')}
                      onClick={() => void saveCorrection(selectedReport)}
                    >
                      {isSavingCorrection
                        ? <Loader2 className="h-4 w-4 animate-spin" />
                        : <Save className="h-4 w-4" />}
                      Salvar correção
                    </Button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <a
                    href={selectedReport.image_url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 text-primary hover:underline"
                  >
                    <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">Abrir imagem original</span>
                  </a>
                  <a
                    href={selectedReport.page_url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 text-primary hover:underline"
                  >
                    <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">Abrir página de origem</span>
                  </a>
                </div>

                <p className="text-xs text-muted-foreground">
                  Coordenadas do balão: [{selectedReport.box.join(', ')}]
                  {selectedReport.item_id && ` · Item: ${selectedReport.item_id}`}
                </p>

                <div className="flex flex-col-reverse sm:flex-row gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="sm:shrink-0 text-destructive border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
                    disabled={isDeleting}
                    onClick={() => setIsDeleteConfirmOpen(true)}
                  >
                    <Trash2 className="h-4 w-4" />
                    Excluir
                  </Button>
                  <Button
                    type="button"
                    className="flex-1"
                    variant={selectedReport.status === 'reviewed' ? 'outline' : 'default'}
                    disabled={updatingId === selectedReport.id}
                    onClick={() => void toggleViewed(selectedReport)}
                  >
                    {updatingId === selectedReport.id
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : selectedReport.status === 'reviewed'
                        ? <EyeOff className="h-4 w-4" />
                        : <Eye className="h-4 w-4" />}
                    {selectedReport.status === 'reviewed' ? 'Marcar como não visualizado' : 'Marcar como visualizado'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteConfirmOpen} onOpenChange={(open) => { if (!isDeleting) setIsDeleteConfirmOpen(open) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir report #{selectedReport?.id}?</AlertDialogTitle>
            <AlertDialogDescription>
              O report e o recorte da imagem serão removidos permanentemente. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              disabled={isDeleting}
              onClick={(event) => {
                event.preventDefault()
                if (selectedReport) void deleteReport(selectedReport)
              }}
            >
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Excluir report
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
