'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import ReactPaginate from 'react-paginate'
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
import { cn } from '@/lib/utils'
import { useIsMobile } from '@/components/ui/use-mobile'
import { SpotlightTour, checkTourDone, type TourStep } from '@/components/spotlight-tour'
import { SakuraPetals, KiraSparkle } from '@/components/anime-decorations'
import { SECTION_READ_LS_PREFIX } from '@/components/section-reader'
import {
  buildImageViewUrl,
  formatSectionDate,
  formatStatus,
  getSectionQueueState,
  getSectionPriorityInfo,
  resolveSectionListResponse,
  type SectionListItem,
  type SectionListPaginationLinks,
  toErrorMessage,
} from '@/lib/sections'
import {
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Chrome,
  Loader2,
  PlusSquare,
  RefreshCw,
  Trash2,
  Upload,
  Sparkles,
  ArrowRight,
} from 'lucide-react'

interface DeleteSectionResponse {
  message?: string
  section?: { id?: number }
}

interface AuthUsageSummaryResponse {
  role?: number
  limite?: number
  gerado?: number
  limit_page_upload?: number
  message?: string
  error?: string
}

interface SectionCategoriesLibraryResponse {
  categories?: unknown
  section_categories_by_id?: unknown
  message?: string
  error?: string
}

interface LibraryUsageSummary {
  role: number | null
  limitInTenHours: number | null
  generatedInTenHours: number
  pageUploadLimit: number | null
}

interface PublicUrlStatusResponse {
  configured?: boolean
  message?: string
  error?: string
}

const MOBILE_SECTIONS_PER_PAGE = 6
const DESKTOP_SECTIONS_PER_PAGE = 8
const LIBRARY_CATEGORY_MAX_LENGTH = 64
const READ_PAGES_LS_PREFIX = 'manga-read-'
const SECTION_READ_THRESHOLD = 0.70

type SectionsPaginationMode = 'server' | 'client'

interface LibrarySectionsPagination {
  mode: SectionsPaginationMode
  total: number
  page: number
  perPage: number
  totalPages: number
  from: number | null
  to: number | null
  links: SectionListPaginationLinks | null
}

function toFiniteNumber(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return null
}

function clampPage(page: number, totalPages: number) {
  return Math.min(Math.max(page, 1), Math.max(1, totalPages))
}

function parsePageFromQuery(value: string | null) {
  if (!value) return 1
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed) || parsed <= 0) return 1
  return parsed
}

function normalizeCategoryLabel(value: unknown) {
  if (typeof value !== 'string') return ''
  const normalized = value.replace(/\s+/g, ' ').trim()
  if (!normalized) return ''
  return normalized.slice(0, LIBRARY_CATEGORY_MAX_LENGTH)
}

function toCategoryKey(value: string) {
  return normalizeCategoryLabel(value).toLocaleLowerCase('pt-BR')
}

function asRecordObject(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

function normalizeCategoryOptions(value: unknown) {
  if (!Array.isArray(value)) return [] as string[]

  const seen = new Set<string>()
  const options: string[] = []

  for (const item of value) {
    const normalized = normalizeCategoryLabel(item)
    if (!normalized) continue

    const key = toCategoryKey(normalized)
    if (seen.has(key)) continue
    seen.add(key)
    options.push(normalized)

    if (options.length >= 300) break
  }

  options.sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }))
  return options
}

function normalizeCategoryMap(value: unknown) {
  const root = asRecordObject(value)
  if (!root) return {} as Record<number, string>

  const map: Record<number, string> = {}
  for (const [rawSectionId, rawCategory] of Object.entries(root)) {
    const sectionId = Number.parseInt(rawSectionId, 10)
    if (!Number.isFinite(sectionId)) continue

    const category = normalizeCategoryLabel(rawCategory)
    if (!category) continue

    map[sectionId] = category
  }
  return map
}

export function SectionsLibrary() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const isMobile = useIsMobile()
  const sectionsPerPage = isMobile ? MOBILE_SECTIONS_PER_PAGE : DESKTOP_SECTIONS_PER_PAGE
  const sectionsFetchRequestId = useRef(0)
  const sectionsInFlightKeysRef = useRef<Set<string>>(new Set())
  const lastSectionsFetchKeyRef = useRef<string | null>(null)
  const lastSectionsFetchAtRef = useRef(0)
  const lastCategoriesSectionIdsKeyRef = useRef('')
  const syncedReadProgressSectionIdsRef = useRef<Set<number>>(new Set())
  const pageFromUrl = useMemo(
    () => parsePageFromQuery(searchParams.get('page')),
    [searchParams]
  )
  const categoryFromUrl = useMemo(
    () => normalizeCategoryLabel(searchParams.get('category')),
    [searchParams]
  )

  const [sections, setSections] = useState<SectionListItem[]>([])
  const [isLoadingSections, setIsLoadingSections] = useState(true)
  const [isLoadingUsageSummary, setIsLoadingUsageSummary] = useState(true)
  const [usageSummary, setUsageSummary] = useState<LibraryUsageSummary | null>(null)
  const [isExtensionConfigured, setIsExtensionConfigured] = useState(false)
  const [isExtensionStatusLoading, setIsExtensionStatusLoading] = useState(true)
  const [deletingSectionId, setDeletingSectionId] = useState<number | null>(null)
  const [sectionToDelete, setSectionToDelete] = useState<SectionListItem | null>(null)
  const [error, setError] = useState('')
  const [isTourOpen, setIsTourOpen] = useState(false)
  const [success, setSuccess] = useState('')
  const [loadedImageUrls, setLoadedImageUrls] = useState<Record<string, boolean>>({})
  const [readSectionIds, setReadSectionIds] = useState<Set<string>>(new Set())
  const [currentPage, setCurrentPage] = useState(pageFromUrl)
  const currentPageRef = useRef(currentPage)
  const [sectionsPagination, setSectionsPagination] = useState<LibrarySectionsPagination>({
    mode: 'server',
    total: 0,
    page: 1,
    perPage: sectionsPerPage,
    totalPages: 1,
    from: null,
    to: null,
    links: null,
  })
  const [categoryOptions, setCategoryOptions] = useState<string[]>([])
  const [sectionCategoryById, setSectionCategoryById] = useState<Record<number, string>>({})
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState(categoryFromUrl)
  const [isLoadingCategories, setIsLoadingCategories] = useState(false)

  const handleUnauthorized = useCallback(() => {
    const params = new URLSearchParams()
    params.set('expired', '1')
    const currentPath = pathname || '/inicio/secoes'
    const currentQuery = searchParams.toString()
    const redirectTarget = currentQuery ? `${currentPath}?${currentQuery}` : currentPath
    if (redirectTarget.startsWith('/')) {
      params.set('redirect', redirectTarget)
    }
    router.replace(`/login?${params.toString()}`)
  }, [pathname, router, searchParams])

  const syncFiltersToUrl = useCallback((nextPage: number, nextCategory: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (nextPage <= 1) {
      params.delete('page')
    } else {
      params.set('page', String(nextPage))
    }
    const normalizedCategory = normalizeCategoryLabel(nextCategory)
    if (normalizedCategory) {
      params.set('category', normalizedCategory)
    } else {
      params.delete('category')
    }
    const query = params.toString()
    const target = query ? `${pathname}?${query}` : pathname
    router.replace(target, { scroll: false })
  }, [pathname, router, searchParams])

  const fetchSections = useCallback(
    async (
      page = 1,
      options?: { force?: boolean; categoryOverride?: string; preserveView?: boolean }
    ) => {
      const force = options?.force ?? false
      const preserveView = options?.preserveView ?? false
      const normalizedPage = Math.max(1, Math.floor(page))
      const normalizedCategory = normalizeCategoryLabel(options?.categoryOverride ?? selectedCategoryFilter)
      const requestKey = `${normalizedPage}:${sectionsPerPage}:${toCategoryKey(normalizedCategory)}`
      const now = Date.now()

      if (!force) {
        if (sectionsInFlightKeysRef.current.has(requestKey)) return
        if (
          lastSectionsFetchKeyRef.current === requestKey &&
          now - lastSectionsFetchAtRef.current < 1000
        ) {
          return
        }
      }

      sectionsInFlightKeysRef.current.add(requestKey)
      const requestId = ++sectionsFetchRequestId.current
      if (!preserveView) {
        setIsLoadingSections(true)
      }

      try {
        const queryParams = new URLSearchParams()
        queryParams.set('page', String(normalizedPage))
        queryParams.set('per_page', String(sectionsPerPage))
        if (normalizedCategory) {
          queryParams.set('category', normalizedCategory)
        }
        const response = await fetch(
          `/api/sections?${queryParams.toString()}`,
          { cache: 'no-store' }
        )
        const data = await response.json()

        if (response.status === 401) {
          handleUnauthorized()
          return
        }

        if (!response.ok) {
          throw new Error(toErrorMessage(data, 'Não foi possível listar seções.'))
        }

        const resolved = resolveSectionListResponse(data, sectionsPerPage)
        if (sectionsFetchRequestId.current !== requestId) return

        const isLegacyArray = Array.isArray(data)
        const nextTotal = resolved.meta?.total ?? resolved.sections.length
        const nextPerPage = resolved.meta?.per_page ?? sectionsPerPage
        const nextTotalPages = resolved.meta?.last_page ?? Math.max(1, Math.ceil(nextTotal / nextPerPage))
        const nextPage = isLegacyArray
          ? normalizedPage
          : resolved.meta?.current_page ?? normalizedPage
        const nextFrom = isLegacyArray
          ? nextTotal === 0
            ? null
            : (nextPage - 1) * nextPerPage + 1
          : resolved.meta?.from ?? (nextTotal === 0 ? null : (nextPage - 1) * nextPerPage + 1)
        const nextTo = isLegacyArray
          ? nextTotal === 0
            ? null
            : Math.min(nextPage * nextPerPage, nextTotal)
          : resolved.meta?.to ??
            (nextTotal === 0 ? null : Math.min(nextPage * nextPerPage, nextTotal))

        setSections(resolved.sections)
        setSectionsPagination({
          mode: isLegacyArray ? 'client' : 'server',
          total: nextTotal,
          page: nextPage,
          perPage: nextPerPage,
          totalPages: nextTotalPages,
          from: nextFrom,
          to: nextTo,
          links: resolved.links,
        })
        setCurrentPage(nextPage)
        lastSectionsFetchKeyRef.current = requestKey
        lastSectionsFetchAtRef.current = Date.now()
        setError('')
      } catch (err) {
        if (sectionsFetchRequestId.current !== requestId) return
        setError(err instanceof Error ? err.message : 'Erro ao listar seções.')
      } finally {
        sectionsInFlightKeysRef.current.delete(requestKey)
        if (sectionsFetchRequestId.current === requestId) {
          setIsLoadingSections(false)
        }
      }
    },
    [handleUnauthorized, sectionsPerPage, selectedCategoryFilter]
  )

  const fetchUsageSummary = useCallback(async () => {
    setIsLoadingUsageSummary(true)

    try {
      const response = await fetch('/api/auth/me', { cache: 'no-store' })
      const data = (await response.json()) as AuthUsageSummaryResponse

      if (response.status === 401) {
        handleUnauthorized()
        return
      }

      if (!response.ok) {
        throw new Error(toErrorMessage(data, 'Não foi possível carregar os limites da conta.'))
      }

      setUsageSummary({
        role: toFiniteNumber(data.role),
        limitInTenHours: toFiniteNumber(data.limite),
        generatedInTenHours: toFiniteNumber(data.gerado) ?? 0,
        pageUploadLimit: toFiniteNumber(data.limit_page_upload),
      })
    } catch {
      setUsageSummary(null)
    } finally {
      setIsLoadingUsageSummary(false)
    }
  }, [handleUnauthorized])

  const fetchExtensionConfigStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/public-url', { cache: 'no-store' })
      const data = (await response.json()) as PublicUrlStatusResponse

      if (response.status === 401) {
        handleUnauthorized()
        return
      }

      if (!response.ok) {
        throw new Error(toErrorMessage(data, 'Não foi possível carregar configuração da extensão.'))
      }

      setIsExtensionConfigured(Boolean(data.configured))
    } catch {
      setIsExtensionConfigured(false)
    } finally {
      setIsExtensionStatusLoading(false)
    }
  }, [handleUnauthorized])

  const fetchSectionCategories = useCallback(async (sectionIds: number[]) => {
    if (sectionIds.length === 0) {
      setCategoryOptions([])
      setSectionCategoryById({})
      setSelectedCategoryFilter('')
      return
    }

    setIsLoadingCategories(true)
    try {
      const sectionIdsParam = sectionIds.join(',')
      const response = await fetch(`/api/sections/categories?section_ids=${encodeURIComponent(sectionIdsParam)}`, {
        cache: 'no-store',
      })
      const data = (await response.json()) as SectionCategoriesLibraryResponse

      if (response.status === 401) {
        handleUnauthorized()
        return
      }

      if (!response.ok) {
        throw new Error(toErrorMessage(data, 'Não foi possível carregar categorias da biblioteca.'))
      }

      const nextOptions = normalizeCategoryOptions(data.categories)
      const nextMap = normalizeCategoryMap(data.section_categories_by_id)
      setCategoryOptions(nextOptions)
      setSectionCategoryById(nextMap)
      setSelectedCategoryFilter((previous) => {
        if (!previous) return ''
        const exists = nextOptions.some((category) => toCategoryKey(category) === toCategoryKey(previous))
        return exists ? previous : ''
      })
    } catch {
      setCategoryOptions([])
      setSectionCategoryById({})
      setSelectedCategoryFilter('')
    } finally {
      setIsLoadingCategories(false)
    }
  }, [handleUnauthorized])

  useEffect(() => {
    currentPageRef.current = currentPage
  }, [currentPage])

  useEffect(() => {
    void fetchUsageSummary()
    void fetchExtensionConfigStatus()
  }, [fetchExtensionConfigStatus, fetchUsageSummary])

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchSections(currentPageRef.current)
    }, 180)
    return () => clearTimeout(timer)
  }, [fetchSections, sectionsPerPage])

  useEffect(() => {
    const currentCategoryKey = toCategoryKey(selectedCategoryFilter)
    const urlCategoryKey = toCategoryKey(categoryFromUrl)
    const shouldSyncCategory = currentCategoryKey !== urlCategoryKey
    const shouldSyncPage = pageFromUrl !== currentPageRef.current

    if (!shouldSyncCategory && !shouldSyncPage) return

    if (shouldSyncCategory) {
      setSelectedCategoryFilter(categoryFromUrl)
    }
    if (shouldSyncPage) {
      setCurrentPage(pageFromUrl)
      currentPageRef.current = pageFromUrl
    }

    void fetchSections(pageFromUrl, {
      force: true,
      categoryOverride: categoryFromUrl,
    })
  }, [categoryFromUrl, fetchSections, pageFromUrl, selectedCategoryFilter])

  useEffect(() => {
    const sectionIds = sections.map((section) => section.id)
    const sectionIdsKey = sectionIds.join(',')
    if (sectionIdsKey === lastCategoriesSectionIdsKeyRef.current) return
    lastCategoriesSectionIdsKeyRef.current = sectionIdsKey
    void fetchSectionCategories(sectionIds)
  }, [fetchSectionCategories, sections])

  useEffect(() => {
    const handler = (e: Event) => {
      const force = (e as CustomEvent<{ force?: boolean }>).detail?.force
      if (force || !checkTourDone('tour-library-v2')) {
        setIsTourOpen(true)
      }
    }
    window.addEventListener('open-page-tour', handler)
    return () => window.removeEventListener('open-page-tour', handler)
  }, [])

  useEffect(() => {
    if (sections.length === 0) return
    const localDoneSectionIds = new Set<string>()
    for (const section of sections) {
      try {
        if (localStorage.getItem(`${SECTION_READ_LS_PREFIX}${section.id}`) === 'done') {
          localDoneSectionIds.add(String(section.id))
          continue
        }
      } catch {
      }

      if (!Number.isFinite(section.images_count) || section.images_count <= 0) continue

      try {
        const rawReadPages = localStorage.getItem(`${READ_PAGES_LS_PREFIX}${section.id}`)
        if (!rawReadPages) continue

        const parsed = JSON.parse(rawReadPages) as unknown
        if (!Array.isArray(parsed) || parsed.length === 0) continue

        const uniqueReadPages = new Set(
          parsed
            .map((value) => (typeof value === 'number' ? value : Number(value)))
            .filter((value) => Number.isFinite(value))
            .map((value) => Math.floor(value))
        )

        const ratio = uniqueReadPages.size / section.images_count
        if (ratio < SECTION_READ_THRESHOLD) continue

        localStorage.setItem(`${SECTION_READ_LS_PREFIX}${section.id}`, 'done')
        localDoneSectionIds.add(String(section.id))
      } catch {
      }
    }

    setReadSectionIds(new Set(localDoneSectionIds))

    const pendingSyncSectionIds = Array.from(localDoneSectionIds)
      .map((sectionId) => Number(sectionId))
      .filter((sectionId) => Number.isFinite(sectionId))
      .filter((sectionId) => !syncedReadProgressSectionIdsRef.current.has(sectionId))
    if (pendingSyncSectionIds.length > 0) {
      for (const sectionId of pendingSyncSectionIds) {
        syncedReadProgressSectionIdsRef.current.add(sectionId)
      }

      void Promise.all(
        pendingSyncSectionIds.map(async (sectionId) => {
          try {
            await fetch(`/api/sections/${sectionId}/read-progress`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ done: true }),
            })
          } catch {
            syncedReadProgressSectionIdsRef.current.delete(sectionId)
          }
        })
      )
    }

    const sectionIdsParam = sections.map((s) => s.id).join(',')
    void fetch(`/api/sections/read-progress?section_ids=${sectionIdsParam}`, { cache: 'no-store' })
      .then((res) => (res.ok ? (res.json() as Promise<{ done: Record<string, boolean> }>) : null))
      .then((data) => {
        if (!data?.done) return
        setReadSectionIds((prev) => {
          const next = new Set(prev)
          for (const [idStr, isDone] of Object.entries(data.done)) {
            if (!isDone) continue
            const id = Number(idStr)
            if (!Number.isFinite(id)) continue
            next.add(String(id))
            try {
              localStorage.setItem(`${SECTION_READ_LS_PREFIX}${id}`, 'done')
            } catch {
            }
          }
          return next
        })
      })
      .catch(() => {
      })
  }, [sections])

  useEffect(() => {
    const handleReadProgressUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{ sectionId?: unknown; done?: unknown }>).detail
      if (!detail) return
      const sectionId = Number(detail.sectionId)
      if (!Number.isFinite(sectionId)) return
      const done = detail.done === true

      setReadSectionIds((prev) => {
        const next = new Set(prev)
        if (done) {
          next.add(String(sectionId))
        } else {
          next.delete(String(sectionId))
        }
        return next
      })
    }

    window.addEventListener('section-read-progress-updated', handleReadProgressUpdated)
    return () => {
      window.removeEventListener('section-read-progress-updated', handleReadProgressUpdated)
    }
  }, [])

  useEffect(() => {
    if (!success) return
    const timer = setTimeout(() => setSuccess(''), 4000)
    return () => clearTimeout(timer)
  }, [success])

  const categorySummaryItems = useMemo(() => {
    const summaryMap = new Map<string, { label: string; count: number }>()

    for (const category of categoryOptions) {
      const normalized = normalizeCategoryLabel(category)
      if (!normalized) continue
      const key = toCategoryKey(normalized)
      if (!summaryMap.has(key)) {
        summaryMap.set(key, { label: normalized, count: 0 })
      }
    }

    for (const section of sections) {
      const category = normalizeCategoryLabel(sectionCategoryById[section.id])
      if (!category) continue

      const key = toCategoryKey(category)
      const existing = summaryMap.get(key)
      if (existing) {
        existing.count += 1
      } else {
        summaryMap.set(key, { label: category, count: 1 })
      }
    }

    return Array.from(summaryMap.values()).sort((a, b) => a.label.localeCompare(b.label, 'pt-BR', { sensitivity: 'base' }))
  }, [categoryOptions, sectionCategoryById, sections])

  const filteredSections = useMemo(() => {
    if (sectionsPagination.mode === 'server') return sections
    if (!selectedCategoryFilter) return sections

    const selectedKey = toCategoryKey(selectedCategoryFilter)
    return sections.filter((section) => {
      const category = normalizeCategoryLabel(sectionCategoryById[section.id])
      if (!category) return false
      return toCategoryKey(category) === selectedKey
    })
  }, [sections, sectionCategoryById, sectionsPagination.mode, selectedCategoryFilter])

  const totalPages = sectionsPagination.mode === 'server'
    ? Math.max(1, sectionsPagination.totalPages)
    : Math.max(1, Math.ceil(filteredSections.length / sectionsPerPage))
  const safeCurrentPage = clampPage(currentPage, totalPages)
  const paginatedSections = useMemo(() => {
    if (sectionsPagination.mode === 'server') {
      return filteredSections
    }

    const startIndex = (safeCurrentPage - 1) * sectionsPerPage
    return filteredSections.slice(startIndex, startIndex + sectionsPerPage)
  }, [filteredSections, safeCurrentPage, sectionsPagination.mode, sectionsPerPage])
  const totalSections = sectionsPagination.mode === 'server' ? sectionsPagination.total : filteredSections.length
  const startItemIndex =
    totalSections === 0
      ? 0
      : sectionsPagination.mode === 'server'
        ? sectionsPagination.from ?? (safeCurrentPage - 1) * sectionsPagination.perPage + 1
        : (safeCurrentPage - 1) * sectionsPerPage + 1
  const endItemIndex =
    totalSections === 0
      ? 0
      : sectionsPagination.mode === 'server'
        ? sectionsPagination.to ?? Math.min(safeCurrentPage * sectionsPagination.perPage, totalSections)
        : Math.min(safeCurrentPage * sectionsPerPage, filteredSections.length)

  const markImageAsLoaded = useCallback((url: string) => {
    setLoadedImageUrls((prev) => {
      if (prev[url]) return prev
      return {
        ...prev,
        [url]: true,
      }
    })
  }, [])

  const hasReachedGenerationLimit =
    !isLoadingUsageSummary &&
    usageSummary !== null &&
    usageSummary.limitInTenHours !== null &&
    usageSummary.limitInTenHours > 0 &&
    usageSummary.generatedInTenHours >= usageSummary.limitInTenHours

  const hasPreviousPage =
    sectionsPagination.mode === 'server'
      ? Boolean(sectionsPagination.links?.prev ?? (safeCurrentPage > 1))
      : safeCurrentPage > 1
  const hasNextPage =
    sectionsPagination.mode === 'server'
      ? Boolean(sectionsPagination.links?.next ?? (safeCurrentPage < totalPages))
      : safeCurrentPage < totalPages
  const shouldShowExtensionCard = usageSummary?.role === 4 || isExtensionConfigured

  const goToPage = (page: number) => {
    const nextPage = clampPage(page, totalPages)
    if (nextPage === currentPageRef.current) return
    setCurrentPage(nextPage)
    currentPageRef.current = nextPage
    syncFiltersToUrl(nextPage, selectedCategoryFilter)
    if (sectionsPagination.mode === 'server') {
      void fetchSections(nextPage)
    }
  }

  const handleCategoryFilterChange = useCallback((nextCategory: string) => {
    const normalizedCategory = normalizeCategoryLabel(nextCategory)
    const currentKey = toCategoryKey(selectedCategoryFilter)
    const nextKey = toCategoryKey(normalizedCategory)
    if (currentKey === nextKey) return

    setSelectedCategoryFilter(normalizedCategory)
    setCurrentPage(1)
    currentPageRef.current = 1
    syncFiltersToUrl(1, normalizedCategory)
    void fetchSections(1, { force: true, categoryOverride: normalizedCategory })
  }, [fetchSections, selectedCategoryFilter, syncFiltersToUrl])

  const handleDeleteSection = async () => {
    if (!sectionToDelete) return

    setError('')
    setSuccess('')
    setDeletingSectionId(sectionToDelete.id)

    try {
      const response = await fetch(`/api/sections/${sectionToDelete.id}`, {
        method: 'DELETE',
      })
      const data = (await response.json()) as DeleteSectionResponse

      if (response.status === 401) {
        handleUnauthorized()
        return
      }

      if (!response.ok) {
        throw new Error(toErrorMessage(data, 'Não foi possível remover a seção.'))
      }

      setSuccess(data.message || `Seção ${sectionToDelete.id} removida com sucesso.`)
      setSectionToDelete(null)
      await fetchSections(currentPageRef.current, { force: true, preserveView: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao remover seção.')
    } finally {
      setDeletingSectionId(null)
    }
  }

  return (
    <div className="space-y-4">
      <Link href="/inicio/secoes/nova" data-tour="new-section">
        <div className="relative cursor-pointer rounded-xl overflow-hidden border border-primary/30 hover:border-primary/70 transition-all duration-300 group bg-card hover:shadow-[0_0_30px_-6px_color-mix(in_oklch,var(--primary)_45%,transparent)]">
          <div className="absolute inset-0 bg-linear-to-br from-primary/10 via-transparent to-accent/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
          <div className="anime-shine" />
          <div className="h-0.75 w-full bg-linear-to-r from-primary via-accent to-primary" />

          <div className="relative px-5 py-4 sm:px-6 sm:py-5 flex items-center gap-4 sm:gap-5">
            <div className="relative shrink-0">
              <div className="rounded-2xl bg-linear-to-br from-primary/25 to-accent/20 group-hover:from-primary/35 group-hover:to-accent/30 p-3.5 ring-1 ring-primary/30 group-hover:ring-primary/60 transition-all duration-300 group-hover:shadow-[0_0_20px_-2px_color-mix(in_oklch,var(--primary)_55%,transparent)]">
                <Upload className="h-6 w-6 text-primary group-hover:scale-110 transition-transform duration-300" />
              </div>
              <Sparkles className="anime-float absolute -right-1.5 -top-1.5 h-4 w-4 text-accent drop-shadow-[0_0_6px_color-mix(in_oklch,var(--accent)_70%,transparent)]" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-base font-semibold text-foreground group-hover:text-primary transition-colors duration-200">
                  Nova Tradução
                </span>
                <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-linear-to-r from-primary to-accent px-2 py-0.5 text-[11px] font-semibold text-primary-foreground shadow-sm">
                  <Sparkles className="h-3 w-3" />
                  IA
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5 hidden sm:block">
                Clique aqui para adicionar imagens ou PDF e traduzir automaticamente com IA.
              </p>
              <p className="text-xs text-muted-foreground mt-0.5 sm:hidden">
                Clique aqui para traduzir com IA.
              </p>
            </div>

            <div className="relative shrink-0 flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-3.5 py-2 text-sm font-semibold text-primary group-hover:bg-linear-to-r group-hover:from-primary group-hover:to-accent group-hover:text-primary-foreground group-hover:border-transparent transition-all duration-200">
              <KiraSparkle className="anime-twinkle absolute -right-1.5 -top-1.5 h-3.5 w-3.5" />
              <PlusSquare className="h-4 w-4 group-hover:rotate-90 transition-transform duration-300" />
              <span className="hidden sm:inline">Criar</span>
            </div>
          </div>
        </div>
      </Link>

      {shouldShowExtensionCard ? (
        <div className="pt-4 pb-2 sm:pt-6 sm:pb-3">
          <Link href="/extensao" className="block">
            <div className="relative cursor-pointer rounded-xl overflow-hidden border border-primary/30 hover:border-primary/70 transition-all duration-300 group bg-card hover:shadow-[0_0_30px_-6px_color-mix(in_oklch,var(--primary)_45%,transparent)]">
              <div className="h-0.75 w-full bg-linear-to-r from-accent via-primary to-accent" />
              <div className="absolute inset-0 bg-linear-to-br from-primary/10 via-transparent to-accent/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
              <div className="absolute -right-20 -top-20 h-44 w-44 rounded-full bg-primary/15 blur-3xl opacity-60 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

              <div className="relative px-4 py-4 sm:px-7 sm:py-6 flex items-center gap-3 sm:gap-6">
                <div className="relative shrink-0">
                  <div className="rounded-xl sm:rounded-2xl bg-linear-to-br from-primary/25 to-accent/20 group-hover:from-primary/40 group-hover:to-accent/30 p-2.5 sm:p-4 ring-1 ring-primary/30 group-hover:ring-primary/60 transition-all duration-300 group-hover:shadow-[0_0_20px_-2px_color-mix(in_oklch,var(--primary)_55%,transparent)]">
                    <Chrome className="h-5 w-5 sm:h-6 sm:w-6 text-primary group-hover:scale-110 transition-transform duration-300" />
                  </div>
                  <Sparkles className="anime-twinkle absolute -right-1.5 -top-1.5 h-3.5 w-3.5 sm:h-4 sm:w-4 text-accent drop-shadow-[0_0_6px_color-mix(in_oklch,var(--accent)_70%,transparent)]" />
                </div>

                <div className="flex-1 min-w-0 space-y-1 sm:space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
                    <span className="text-sm sm:text-base font-semibold text-foreground group-hover:text-primary transition-colors duration-200">
                      Extensão para o navegador
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-linear-to-r from-primary to-accent px-1.5 py-0.5 text-[10px] sm:px-2 sm:text-[11px] font-semibold text-primary-foreground shadow-sm">
                      <Sparkles className="h-3 w-3" />
                      Novo
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed text-muted-foreground hidden sm:block">
                    Traduza mangá direto de qualquer site com o leitor integrado — no PC e no celular.
                  </p>
                  <p className="text-xs leading-snug text-muted-foreground sm:hidden">
                    Traduza direto do navegador, no PC e no celular.
                  </p>
                </div>

                <div className="relative shrink-0 flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-2.5 py-2 sm:px-4 sm:py-2.5 text-sm font-semibold text-primary group-hover:bg-linear-to-r group-hover:from-primary group-hover:to-accent group-hover:text-primary-foreground group-hover:border-transparent transition-all duration-200">
                  <span className="hidden sm:inline">Conhecer</span>
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform duration-300" />
                </div>
              </div>
            </div>
          </Link>
        </div>
      ) : !isExtensionStatusLoading && !isLoadingUsageSummary ? (
        <div className="pt-4 pb-2 sm:pt-6 sm:pb-3">
          <div className="relative rounded-xl overflow-hidden border border-border bg-card/60">
            <div className="h-0.75 w-full bg-linear-to-r from-muted via-border to-muted" />
            <div className="relative px-4 py-4 sm:px-7 sm:py-6 flex items-center gap-3 sm:gap-6">
              <div className="shrink-0 rounded-xl sm:rounded-2xl bg-muted/60 p-2.5 sm:p-4 ring-1 ring-border">
                <Chrome className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground" />
              </div>

              <div className="flex-1 min-w-0 space-y-1 sm:space-y-1.5">
                <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
                  <span className="text-sm sm:text-base font-semibold text-muted-foreground">
                    Extensão para o navegador
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-muted px-1.5 py-0.5 text-[10px] sm:px-2 sm:text-[11px] font-semibold text-muted-foreground">
                    <Sparkles className="h-3 w-3" />
                    Em breve
                  </span>
                </div>
                <p className="text-xs sm:text-sm leading-snug sm:leading-relaxed text-muted-foreground">
                  Estamos quase lá! Assim que o administrador terminar de configurar, você vai poder
                  traduzir mangá direto do navegador — no PC e no celular. ✨
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {hasReachedGenerationLimit && usageSummary && (
        <Card className="relative overflow-hidden border-border bg-card p-4 sm:p-5 shadow-sm">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-linear-to-r from-primary/50 via-primary to-primary/50" />
          <div className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-primary/10 blur-3xl" />

          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
                <Sparkles className="h-3.5 w-3.5" />
                Limite atual atingido
              </div>

              <h2 className="text-base font-semibold text-foreground sm:text-lg">
                Quer continuar agora? Fale com a gente
              </h2>

              <p className="text-sm text-muted-foreground">
                Uso atual:{' '}
                <span className="font-semibold text-foreground">
                  {usageSummary.generatedInTenHours}/{usageSummary.limitInTenHours}
                </span>{' '}
                PDFs no mes. Ajuste o limite da sua instância local nas configurações.
              </p>
            </div>
          </div>
        </Card>
      )}


      <section className="relative mt-3 overflow-hidden rounded-xl border border-primary/20 bg-linear-to-br from-card via-card to-accent/10 p-4 sm:p-5 lg:pr-48">
        <div className="anime-speedlines pointer-events-none absolute -right-24 -top-24 h-80 w-80 opacity-50" />
        <div className="pointer-events-none absolute -right-12 -top-16 h-52 w-52 rounded-full bg-primary/25 blur-3xl" />
        <div className="pointer-events-none absolute -left-10 bottom-0 h-36 w-36 rounded-full bg-accent/20 blur-3xl" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-linear-to-r from-primary via-accent to-primary" />
        <SakuraPetals />

        <KiraSparkle className="anime-twinkle pointer-events-none absolute bottom-5 right-[34%] z-0 h-4 w-4" />
        <KiraSparkle className="anime-twinkle pointer-events-none absolute bottom-12 right-[26%] z-0 h-3 w-3 [animation-delay:0.8s]" />
        <KiraSparkle className="anime-twinkle pointer-events-none absolute bottom-3 right-[44%] z-0 hidden h-5 w-5 sm:block [animation-delay:1.4s]" />

        <div className="anime-bob pointer-events-none absolute bottom-3 right-6 z-0 hidden lg:block xl:right-10">
          <div className="anime-pop-in absolute -top-3 left-1/2 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-2xl rounded-bl-sm border border-primary/30 bg-card/95 px-3 py-1.5 text-xs font-semibold text-foreground shadow-lg shadow-primary/10 backdrop-blur">
            Vamos traduzir? <span className="text-primary">✨</span>
          </div>
          <span
            aria-hidden="true"
            className="block select-none text-6xl xl:text-7xl drop-shadow-[0_8px_18px_color-mix(in_oklch,var(--primary)_50%,transparent)]"
          >
            📖
          </span>
        </div>

        <div className="relative z-10 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span
              aria-hidden="true"
              className="anime-bob hidden select-none text-4xl drop-shadow-[0_4px_10px_color-mix(in_oklch,var(--primary)_45%,transparent)] sm:block lg:hidden"
            >
              📖
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                  Biblioteca de Seções
                </h1>
                <span className="select-none rounded-md bg-primary/15 px-1.5 py-0.5 text-xs font-medium text-primary">
                  ライブラリ
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                Navegue pelas seções criadas, abra páginas e acompanhe status de processamento.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {!isLoadingSections && totalSections > 0 && (
              <span className="rounded-md border border-border bg-muted/20 px-2 py-1 text-[11px] text-muted-foreground">
                Mostrando {startItemIndex}-{endItemIndex} de {totalSections}
              </span>
            )}
            {!isLoadingUsageSummary && usageSummary && (
              <div data-tour="usage-stats" className="flex flex-col gap-1.5">
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span className="rounded-md border border-border bg-muted/30 px-2 py-1">
                    Limite: <span className="font-semibold text-foreground">{usageSummary.limitInTenHours ?? '—'}</span>
                  </span>
                  <span className="rounded-md border border-border bg-muted/30 px-2 py-1">
                    Gerado: <span className="font-semibold text-foreground">{usageSummary.generatedInTenHours}</span>
                  </span>
                </div>
                {usageSummary.limitInTenHours !== null && usageSummary.limitInTenHours > 0 && (
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/50">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all duration-500',
                        hasReachedGenerationLimit ? 'bg-destructive' : 'bg-primary'
                      )}
                      style={{
                        width: `${Math.min(100, (usageSummary.generatedInTenHours / usageSummary.limitInTenHours) * 100)}%`,
                      }}
                    />
                  </div>
                )}
              </div>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void fetchSections(currentPage, { force: true })}
            >
              <RefreshCw className="h-4 w-4" />
              Atualizar
            </Button>
          </div>
        </div>

        {!isLoadingSections && sections.length > 0 && (
          <div className="mt-3">
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">Categorias</p>
            <div className="flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <button
                type="button"
                className={cn(
                  'shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-all',
                  !selectedCategoryFilter
                    ? 'border-transparent bg-linear-to-r from-primary to-accent text-primary-foreground shadow-sm shadow-primary/30'
                    : 'border-border bg-background text-muted-foreground hover:border-primary/50 hover:bg-muted hover:text-foreground'
                )}
                onClick={() => handleCategoryFilterChange('')}
              >
                Todas ({sectionsPagination.total})
              </button>
              {categorySummaryItems.map((categoryItem) => {
                const isActive = toCategoryKey(selectedCategoryFilter) === toCategoryKey(categoryItem.label)
                return (
                  <button
                    key={categoryItem.label}
                    type="button"
                    className={cn(
                      'shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-all',
                      isActive
                        ? 'border-transparent bg-linear-to-r from-primary to-accent text-primary-foreground shadow-sm shadow-primary/30'
                        : 'border-border bg-background text-muted-foreground hover:border-primary/50 hover:bg-muted hover:text-foreground'
                    )}
                    onClick={() => handleCategoryFilterChange(categoryItem.label)}
                  >
                    <span>{categoryItem.label}</span>
                    <span className={cn(
                      'ml-1.5 rounded-full px-1.5 py-0.5 text-[10px]',
                      isActive ? 'bg-white/25 text-white' : 'bg-primary/15 text-primary'
                    )}>
                      {categoryItem.count}
                    </span>
                  </button>
                )
              })}
              {isLoadingCategories && (
                <span className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1.5 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Atualizando categorias...
                </span>
              )}
            </div>
          </div>
        )}
      </section>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-600 dark:text-green-400">
          {success}
        </div>
      )}

      <section className="space-y-4">
        {isLoadingSections ? (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: sectionsPerPage }).map((_, i) => (
              <div key={i} className="rounded-xl bg-card/70 p-2 sm:p-2.5 ring-1 ring-border/40">
                <Skeleton className="aspect-3/4 w-full rounded-lg" />
                <div className="mt-2.5 space-y-2">
                  <Skeleton className="h-4 w-3/4 rounded" />
                  <div className="flex items-center justify-between gap-2">
                    <Skeleton className="h-5 w-20 rounded-full" />
                    <Skeleton className="h-3 w-16 rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : sections.length === 0 ? (
          <div className="relative overflow-hidden rounded-xl border border-primary/25 bg-linear-to-b from-card via-muted/10 to-accent/10 py-12 text-center sm:py-16">
            <div className="anime-speedlines pointer-events-none absolute inset-0 opacity-60" />
            <div className="anime-halftone pointer-events-none absolute inset-x-0 bottom-0 h-24 opacity-[0.07]" />
            <SakuraPetals className="opacity-80" />
            <div className="pointer-events-none absolute left-1/2 top-4 h-48 w-48 -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />
            <div className="pointer-events-none absolute left-[18%] bottom-6 h-24 w-24 rounded-full bg-accent/15 blur-2xl" />
            <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-linear-to-r from-primary via-accent to-primary" />
            <KiraSparkle className="anime-twinkle pointer-events-none absolute left-[24%] top-8 h-4 w-4" />
            <KiraSparkle className="anime-twinkle pointer-events-none absolute right-[22%] top-12 h-5 w-5 [animation-delay:1s]" />
            <KiraSparkle className="anime-twinkle pointer-events-none absolute left-[36%] bottom-10 h-3 w-3 [animation-delay:1.8s]" />
            <KiraSparkle className="anime-twinkle pointer-events-none absolute right-[34%] bottom-16 hidden h-4 w-4 sm:block [animation-delay:0.5s]" />

            <div className="relative flex flex-col items-center gap-5 px-4">
              <div className="anime-bob relative select-none">
                <span
                  aria-hidden="true"
                  className="block text-7xl sm:text-8xl drop-shadow-[0_10px_24px_color-mix(in_oklch,var(--primary)_50%,transparent)]"
                >
                  📖
                </span>
                <span aria-hidden="true" className="anime-twinkle absolute -right-5 -top-3 text-2xl">✨</span>
                <span aria-hidden="true" className="anime-twinkle absolute -left-6 top-6 text-lg [animation-delay:1.2s]">✨</span>
              </div>
              <div className="space-y-1.5">
                <p className="text-lg font-bold tracking-tight text-foreground sm:text-xl">
                  Sua biblioteca está{' '}
                  <span className="anime-gradient-text">esperando</span>
                </p>
                <p className="mx-auto max-w-xs text-xs text-muted-foreground sm:text-sm">
                  Envie as páginas de um mangá e deixe a IA detectar os balões e traduzir para você.
                </p>
              </div>
              <Button asChild className="bg-linear-to-r from-primary to-accent text-primary-foreground shadow-[0_8px_24px_-8px_color-mix(in_oklch,var(--primary)_80%,transparent)] hover:brightness-110">
                <Link href="/inicio/secoes/nova">
                  <PlusSquare className="h-4 w-4" />
                  Nova Tradução
                </Link>
              </Button>
            </div>
          </div>
        ) : (
          <>
            {selectedCategoryFilter && paginatedSections.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border/70 bg-muted/10 py-8 text-center text-sm text-muted-foreground">
                Nenhuma seção encontrada na categoria "{selectedCategoryFilter}".
              </div>
            ) : (
              <div data-tour="sections-grid" className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
                {paginatedSections.map((section, index) => {
                  const queueState = getSectionQueueState(section, null)
                  const priorityInfo = getSectionPriorityInfo(section.priority)
                  const coverUrl = section.cover?.image_id
                    ? buildImageViewUrl(section.id, section.cover.image_id, 'original')
                    : null
                  const isCoverLoaded = coverUrl ? Boolean(loadedImageUrls[coverUrl]) : true
                  const isRead = readSectionIds.has(String(section.id))
                  const showPriorityTag = priorityInfo.tier !== 'low' && priorityInfo.tier !== 'custom'

                  return (
                    <article
                      key={section.id}
                      className="anime-rise group relative cursor-pointer rounded-xl bg-card/70 p-2 sm:p-2.5 ring-1 ring-border/40 transition-all duration-200 hover:bg-card hover:ring-primary/50 hover:-translate-y-0.5 hover:shadow-[0_8px_30px_-12px_color-mix(in_oklch,var(--primary)_55%,transparent)]"
                      style={{ animationDelay: `${Math.min(index, 9) * 55}ms` }}
                      onClick={() => {
                        const detailHref = safeCurrentPage > 1
                          ? `/inicio/secoes/${section.id}?page=${safeCurrentPage}`
                          : `/inicio/secoes/${section.id}`
                        router.push(detailHref)
                      }}
                    >
                      <div className="relative aspect-3/4 overflow-hidden rounded-lg bg-muted/35 ring-1 ring-inset ring-white/5">
                        <div className="absolute left-2 top-2 z-20 flex flex-col items-start gap-1">
                          {isRead && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/40 bg-linear-to-r from-emerald-600 to-emerald-500 px-2 py-0.5 text-[10px] font-semibold text-white shadow-lg shadow-emerald-900/40">
                              <CheckCircle2 className="h-3 w-3 text-white" />
                              Lido
                            </span>
                          )}
                          <span
                            className={cn(
                              'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold shadow-sm backdrop-blur-sm',
                              queueState.completed
                                ? 'border border-emerald-400/40 bg-emerald-500/85 text-white'
                                : 'border border-amber-400/40 bg-amber-500/85 text-white'
                            )}
                          >
                            {formatStatus(section.status)}
                          </span>
                          {showPriorityTag && (
                            <span className="inline-flex items-center rounded-full border border-primary/50 bg-primary/85 px-2 py-0.5 text-[10px] font-semibold text-primary-foreground shadow-sm backdrop-blur-sm">
                              {priorityInfo.badgeLabel}
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          aria-label={`Excluir seção ${section.name}`}
                          className="absolute right-2 top-2 z-20 inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/20 bg-black/55 text-white opacity-0 backdrop-blur-sm transition-all duration-200 hover:border-destructive hover:bg-destructive group-hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-40"
                          disabled={deletingSectionId === section.id}
                          onClick={(e) => {
                            e.stopPropagation()
                            setSectionToDelete(section)
                          }}
                        >
                          {deletingSectionId === section.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </button>
                        {coverUrl ? (
                          <>
                            {!isCoverLoaded && <Skeleton className="absolute inset-0 rounded-none" />}
                            <img
                              src={coverUrl}
                              alt={`Capa da seção ${section.name}`}
                              className={cn(
                                'h-full w-full object-cover transition-all duration-300 group-hover:scale-105',
                                isCoverLoaded ? 'opacity-100' : 'opacity-0'
                              )}
                              loading="lazy"
                              decoding="async"
                              onLoad={() => markImageAsLoaded(coverUrl)}
                              onError={() => markImageAsLoaded(coverUrl)}
                            />
                          </>
                        ) : (
                          <div className="relative flex h-full w-full flex-col items-center justify-center gap-2 bg-linear-to-br from-primary/20 via-muted/30 to-accent/20 text-center">
                            <div className="anime-halftone absolute inset-0 opacity-[0.07]" />
                            <KiraSparkle className="anime-twinkle absolute right-2 top-2 h-3.5 w-3.5" />
                            <div className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-card/50 ring-1 ring-primary/30 backdrop-blur-sm">
                              <BookOpen className="h-5.5 w-5.5 text-primary" />
                            </div>
                            <span className="relative line-clamp-2 px-3 text-[11px] font-medium text-muted-foreground">
                              {section.name}
                            </span>
                          </div>
                        )}

                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-linear-to-t from-primary/70 via-black/55 to-black/30 opacity-0 backdrop-blur-[1px] transition-opacity duration-200 group-hover:opacity-100">
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/15 ring-2 ring-white/70 backdrop-blur-sm transition-transform duration-300 group-hover:scale-110">
                            <BookOpen className="h-6 w-6 text-white drop-shadow" />
                          </div>
                          <span className="text-xs font-bold uppercase tracking-[0.18em] text-white drop-shadow">Ler</span>
                        </div>
                        <div className="anime-shine" />
                      </div>

                      <div className="mt-2.5 space-y-2">
                        <p
                          className="truncate text-sm font-medium text-foreground transition-colors group-hover:text-primary sm:text-base"
                          title={section.name}
                        >
                          {section.name}
                        </p>

                        <div className="flex items-center justify-between gap-2">
                          <span className="inline-flex shrink-0 items-center gap-1 rounded-md border border-border bg-background px-2 py-0.5 text-[11px] font-medium text-foreground">
                            <BookOpen className="h-3 w-3 text-primary" />
                            {section.images_count} págs
                          </span>
                          <span
                            className="truncate text-[11px] text-muted-foreground"
                            title={`Atualizado em ${formatSectionDate(section.updated_at)}`}
                          >
                            {formatSectionDate(section.updated_at)}
                          </span>
                        </div>
                      </div>
                    </article>
                  )
                })}
              </div>
            )}

            {totalPages > 1 && (
              <div className="mt-5 border-t border-border/70 pt-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-center text-xs text-muted-foreground sm:text-left">
                    Página {safeCurrentPage} de {totalPages}
                  </p>

                  <ReactPaginate
                    breakLabel="..."
                    nextLabel={<ChevronRight className="h-4 w-4" />}
                    previousLabel={<ChevronLeft className="h-4 w-4" />}
                    forcePage={safeCurrentPage - 1}
                    pageCount={totalPages}
                    pageRangeDisplayed={3}
                    marginPagesDisplayed={1}
                    onPageChange={(selectedItem) => {
                      const nextPage = selectedItem.selected + 1
                      if (nextPage !== safeCurrentPage) goToPage(nextPage)
                    }}
                    containerClassName="flex flex-wrap items-center justify-center gap-1"
                    pageClassName=""
                    pageLinkClassName="inline-flex h-8 min-w-8 items-center justify-center rounded-md border border-border bg-background px-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                    activeClassName=""
                    activeLinkClassName="border-primary bg-primary text-primary-foreground hover:bg-primary"
                    previousClassName=""
                    previousLinkClassName={cn(
                      'inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-background transition-colors hover:bg-muted',
                      !hasPreviousPage && 'pointer-events-none opacity-40'
                    )}
                    nextClassName=""
                    nextLinkClassName={cn(
                      'inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-background transition-colors hover:bg-muted',
                      !hasNextPage && 'pointer-events-none opacity-40'
                    )}
                    breakClassName=""
                    breakLinkClassName="inline-flex h-8 min-w-8 items-center justify-center rounded-md border border-border/70 bg-muted/20 px-2.5 text-sm text-muted-foreground"
                    disabledClassName="pointer-events-none opacity-40"
                    renderOnZeroPageCount={null}
                  />
                </div>
              </div>
            )}
          </>
        )}
      </section>

      <AlertDialog
        open={Boolean(sectionToDelete)}
        onOpenChange={(open) => {
          if (!open && deletingSectionId === null) {
            setSectionToDelete(null)
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir seção</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação vai remover a seção "{sectionToDelete?.name}" e todos os vínculos dela.
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingSectionId !== null}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={(event) => {
                event.preventDefault()
                void handleDeleteSection()
              }}
              disabled={deletingSectionId !== null}
            >
              {deletingSectionId !== null ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Excluindo...
                </>
              ) : (
                'Confirmar exclusão'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <SpotlightTour
        storageKey="tour-library-v2"
        open={isTourOpen}
        onClose={() => setIsTourOpen(false)}
        steps={LIBRARY_TOUR_STEPS}
      />
    </div>
  )
}

const LIBRARY_TOUR_STEPS: TourStep[] = [
  {
    title: 'Bem-vindo à Biblioteca!',
    description: 'Este é o seu painel principal. Aqui ficam todos os capítulos e lotes de páginas que você enviou para tradução. Vou te guiar pelos recursos essenciais.',
  },
  {
    title: 'Criar Nova Tradução',
    description: 'Toque aqui para começar. Você pode enviar imagens (JPG, PNG…) ou um PDF completo — cada página do PDF vira uma imagem automaticamente.',
    selector: 'new-section',
    tooltipSide: 'bottom',
  },
  {
    title: 'Suas Seções',
    description: 'Cada card é uma seção. Toque na capa para abrir, ver o status de cada página, selecionar quais traduzir e iniciar o processamento com IA.',
    selector: 'sections-grid',
    tooltipSide: 'top',
  },
  {
    title: 'Seu uso mensal',
    description: 'Aqui você acompanha quantas seções já foram geradas e qual é o seu limite no período. Ao atingir o limite, novas criações ficam pausadas até a renovação.',
    selector: 'usage-stats',
    tooltipSide: 'bottom',
  },
]
