const READER_HOST_ID = 'manga-translator-local-reader-host'
const PAGE_SECTION_CACHE_PREFIX = 'mtl:page-section:'
const EXTENSION_LOG_DISPLAY_LIMIT = 80
const MIN_IMAGE_WIDTH = 240
const MIN_IMAGE_HEIGHT = 320
const OCR_OVERLAY_DEFAULT_FONT_SCALE = 0.3
const OCR_OVERLAY_DEFAULT_BOX_INSET = 6
const OCR_OVERLAY_DENSITY_DEFAULT = 2.0
const OCR_OVERLAY_OPACITY_DEFAULT = 1

const OCR_OVERLAY_FONT_SCALE_MIN = 0.1
const OCR_OVERLAY_FONT_SCALE_MAX = 1.5
const OCR_OVERLAY_FONT_SCALE_STEP = 0.05
const OCR_OVERLAY_DENSITY_MIN = 0.35
const OCR_OVERLAY_DENSITY_MAX = 2.2
const OCR_OVERLAY_DENSITY_STEP = 0.1
const OCR_OVERLAY_OPACITY_MIN = 0.08
const OCR_OVERLAY_OPACITY_MAX = 1
const OCR_OVERLAY_OPACITY_STEP = 0.05

const OCR_OVERLAY_ITEM_FONT_SCALE_MIN = 0.45
const OCR_OVERLAY_ITEM_FONT_SCALE_MAX = 5
const OCR_OVERLAY_ITEM_FONT_SCALE_STEP = 0.1
const OCR_OVERLAY_ITEM_SIZE_MIN = 0.55
const OCR_OVERLAY_ITEM_SIZE_MAX = 1.85
const OCR_OVERLAY_ITEM_SIZE_STEP = 0.05
const OCR_OVERLAY_ITEM_DENSITY_MIN = 0.45
const OCR_OVERLAY_ITEM_DENSITY_MAX = 2.5
const OCR_OVERLAY_ITEM_DENSITY_STEP = 0.1
const OCR_OVERLAY_QUICK_EDITOR_DOUBLE_TAP_MS = 700
const OCR_OVERLAY_QUICK_EDITOR_TAP_MOVE_PX = 48

const OCR_OVERLAY_FONT_FAMILIES = {
  sans: { label: 'Wild Words', css: '"Bangers", "Comic Sans MS", cursive' },
  serif: { label: 'Retro Hero', css: '"Carter One", "Trebuchet MS", sans-serif' },
  mono: { label: 'Tech Scan', css: '"Rubik Mono One", "Audiowide", "Arial Black", sans-serif' },
  comic: { label: 'Ink Brush', css: '"Permanent Marker", "Kalam", "Comic Sans MS", cursive' },
  manga: { label: 'Shonen Blast', css: '"Luckiest Guy", "Bangers", "Changa One", "Arial Black", sans-serif' },
  anime: { label: 'Anime Title', css: '"Bebas Neue", "Anton", "Teko", Impact, sans-serif' },
  manhwa: { label: 'Manhwa Clean Pro', css: '"Noto Sans KR", "Nanum Gothic", "Malgun Gothic", Arial, sans-serif' },
  condensed: { label: 'Action Condensed', css: '"Teko", "Bebas Neue", "Arial Narrow", Impact, sans-serif' },
}
const OCR_OVERLAY_FONT_FAMILY_DEFAULT = 'sans'

const MTL_LANGUAGE_OPTIONS = [
  { code: 'auto', name: 'Detectar automaticamente' },
  { code: 'en', name: 'Inglês' },
  { code: 'pt-BR', name: 'Português (Brasil)' },
  { code: 'es', name: 'Espanhol' },
  { code: 'fr', name: 'Francês' },
  { code: 'de', name: 'Alemão' },
  { code: 'it', name: 'Italiano' },
  { code: 'ja', name: 'Japonês' },
  { code: 'ko', name: 'Coreano' },
  { code: 'zh-cn', name: 'Chinês Simplificado' },
  { code: 'zh-tw', name: 'Chinês Tradicional' },
  { code: 'ru', name: 'Russo' },
  { code: 'ar', name: 'Árabe' },
  { code: 'hi', name: 'Hindi' },
  { code: 'tr', name: 'Turco' },
  { code: 'nl', name: 'Holandês' },
  { code: 'pl', name: 'Polonês' },
  { code: 'uk', name: 'Ucraniano' },
  { code: 'vi', name: 'Vietnamita' },
  { code: 'id', name: 'Indonésio' },
  { code: 'th', name: 'Tailandês' },
]
const MTL_TARGET_LANGUAGE_OPTIONS = MTL_LANGUAGE_OPTIONS.filter((language) => language.code !== 'auto')
const MTL_GOOGLE_PROVIDER = { value: 'google', label: 'Google Translate' }
const MTL_TRANSLATION_REPORT_REASONS = [
  { value: 'incorrect_translation', label: 'Tradução incorreta' },
  { value: 'not_translated', label: 'Não traduziu' },
  { value: 'inadequate_meaning', label: 'Tradução com sentido inadequado' },
  { value: 'unethical_content', label: 'Conteúdo antiético' },
]
const MTL_TRANSLATION_REPORT_DEFAULT_REASON = MTL_TRANSLATION_REPORT_REASONS[0].value

let activeReaderShadow = null
let activeReaderState = null

function closeActiveReader() {
  if (activeReaderState) {
    activeReaderState.cleanupFns.forEach((cleanup) => cleanup())
    activeReaderState.cleanupFns = []
  }
  document.getElementById(READER_HOST_ID)?.remove()
  activeReaderShadow = null
  activeReaderState = null
}

function getCachedSectionIdForPage(pageUrl) {
  try {
    const key = `${PAGE_SECTION_CACHE_PREFIX}${pageUrl}`
    const cached = localStorage.getItem(key)
    return cached ? Number(cached) : null
  } catch {
    return null
  }
}

function setCachedSectionIdForPage(pageUrl, sectionId) {
  try {
    const key = `${PAGE_SECTION_CACHE_PREFIX}${pageUrl}`
    if (sectionId && Number.isFinite(sectionId) && sectionId > 0) {
      localStorage.setItem(key, String(sectionId))
    } else {
      localStorage.removeItem(key)
    }
  } catch {
  }
}

function isAutoSectionCreationEnabled(settings) {
  return settings?.autoCreateSections === true
}

function formatExtensionLogTime(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '--:--:--'
  return date.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function logDetailsFromError(error) {
  if (error instanceof Error) return error.stack || error.message
  return String(error || '')
}

function recordExtensionLog(state, level, message, details = '') {
  chrome.runtime.sendMessage({
    type: 'MTL_ADD_LOG',
    payload: {
      level,
      message,
      details,
      pageUrl: window.location.href,
    },
  }).catch(() => {})

  if (!state) return
  const logs = Array.isArray(state.logs) ? state.logs : []
  state.logs = [
    ...logs,
    {
      id: `local-${Date.now()}`,
      time: new Date().toISOString(),
      level,
      message,
      details,
      pageUrl: window.location.href,
    },
  ].slice(-EXTENSION_LOG_DISPLAY_LIMIT)
}

async function loadExtensionLogs(state, shadow) {
  state.isLoadingLogs = true
  renderReader(shadow, state)
  try {
    const response = await chrome.runtime.sendMessage({ type: 'MTL_GET_LOGS' })
    state.logs = Array.isArray(response?.logs)
      ? response.logs.slice(-EXTENSION_LOG_DISPLAY_LIMIT)
      : []
    state.networkLogs = Array.isArray(response?.networkLogs)
      ? response.networkLogs.slice(-EXTENSION_LOG_DISPLAY_LIMIT)
      : []
  } catch (error) {
    state.logs = [{
      id: `error-${Date.now()}`,
      time: new Date().toISOString(),
      level: 'error',
      message: 'Não foi possível carregar os logs da extensão.',
      details: logDetailsFromError(error),
      pageUrl: window.location.href,
    }]
    state.networkLogs = []
  } finally {
    state.isLoadingLogs = false
    renderReader(shadow, state)
  }
}

async function copyTextToClipboard(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }

  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'fixed'
  textarea.style.left = '-9999px'
  document.documentElement.append(textarea)
  textarea.select()
  document.execCommand('copy')
  textarea.remove()
}

function formatLogsForCopy(state) {
  const kind = state.logsTab === 'network' ? 'network' : 'events'
  const items = kind === 'network'
    ? (Array.isArray(state.networkLogs) ? state.networkLogs : [])
    : (Array.isArray(state.logs) ? state.logs : [])
  return JSON.stringify({
    kind,
    copiedAt: new Date().toISOString(),
    pageUrl: window.location.href,
    count: items.length,
    items,
  }, null, 2)
}

function formatSingleLogForCopy(state, logId) {
  const kind = state.logsTab === 'network' ? 'network' : 'events'
  const items = kind === 'network'
    ? (Array.isArray(state.networkLogs) ? state.networkLogs : [])
    : (Array.isArray(state.logs) ? state.logs : [])
  const item = items.find((entry) => String(entry?.id || '') === String(logId || ''))
  return item
    ? JSON.stringify({ kind, copiedAt: new Date().toISOString(), item }, null, 2)
    : ''
}

function normalizeReportReason(value) {
  const reason = String(value || '')
  return MTL_TRANSLATION_REPORT_REASONS.some((item) => item.value === reason)
    ? reason
    : MTL_TRANSLATION_REPORT_DEFAULT_REASON
}

function detectionItemId(item) {
  return item?.det_id ?? item?.detId ?? item?.id
}

function detectionOcrText(item) {
  return String(item?.ocr_text || item?.ocrText || item?.text || '').trim()
}

function detectionTranslatedText(item) {
  return String(item?.translated_text || item?.translatedText || item?.translated || '').trim()
}

function findReportTargetForSelectedItem(state) {
  const selected = state.selectedItem
  if (!selected) return null
  const processed = state.processedByUrl.get(selected.pageUrl)
  const detections = Array.isArray(processed?.detections) ? processed.detections : []
  const item = detections.find((entry) => String(detectionItemId(entry)) === String(selected.itemId))
  if (!item) return null
  const box = Array.isArray(item.box) ? item.box.map(Number) : []

  return {
    itemId: selected.itemId,
    pageUrl: window.location.href,
    imageUrl: selected.pageUrl,
    box: box.length === 4 && box.every(Number.isFinite) ? box : [],
    ocrText: detectionOcrText(item),
    translatedText: detectionTranslatedText(item),
    sourceLang: processed?.sourceLang || state.settings?.sourceLang || '',
    targetLang: processed?.targetLang || state.settings?.targetLang || '',
    providerLang: processed?.providerLang || state.settings?.providerLang || '',
  }
}

function closeReportPanel(state) {
  state.isReportPanelOpen = false
  state.isSubmittingReport = false
  state.reportSubmitted = false
  state.reportStatus = ''
  state.reportTarget = null
}

async function submitTranslationReport(shadow, state) {
  if (state.reportSubmitted) {
    closeReportPanel(state)
    renderReader(shadow, state)
    return
  }
  if (state.isSubmittingReport) return
  const target = state.reportTarget || findReportTargetForSelectedItem(state)
  if (!target) {
    state.reportStatus = 'Selecione um balão traduzido antes de reportar.'
    renderReader(shadow, state)
    return
  }

  state.reportTarget = target
  state.isSubmittingReport = true
  state.reportSubmitted = false
  state.reportStatus = 'Enviando reporte...'
  renderReader(shadow, state)

  try {
    const response = await chrome.runtime.sendMessage({
      type: 'MTL_REPORT_TRANSLATION',
      payload: {
        ...target,
        reason: normalizeReportReason(state.reportReason),
        settings: state.settings,
      },
    })
    if (!response?.ok) {
      throw new Error(response?.error || 'Não foi possível enviar o reporte.')
    }
    state.reportSubmitted = true
    state.reportStatus = ''
    recordExtensionLog(state, 'info', 'Reporte de tradução enviado.', `Reporte #${response.reportId || '-'}`)
  } catch (error) {
    state.reportSubmitted = false
    state.reportStatus = error instanceof Error ? error.message : 'Não foi possível enviar o reporte.'
    recordExtensionLog(state, 'error', 'Falha ao enviar reporte de tradução.', logDetailsFromError(error))
  } finally {
    state.isSubmittingReport = false
    renderReader(shadow, state)
  }
}

function renderReportReasonOptions(selectedReason) {
  const current = normalizeReportReason(selectedReason)
  return MTL_TRANSLATION_REPORT_REASONS.map((reason) => `
    <label class="mtl-report-option">
      <input type="radio" name="mtl-report-reason" value="${escapeAttr(reason.value)}"${reason.value === current ? ' checked' : ''}>
      <span>${escapeHtml(reason.label)}</span>
    </label>
  `).join('')
}

function renderEventLogRow(log) {
  const level = String(log.level || 'info').toLowerCase()
  const logId = String(log.id || '')
  return `
    <article class="mtl-log-row mtl-log-${escapeAttr(level)}">
      <div class="mtl-log-meta">
        <span>${escapeHtml(formatExtensionLogTime(log.time))}</span>
        <strong>${escapeHtml(level.toUpperCase())}</strong>
        <button type="button" class="mtl-log-copy" data-action="copy-log-item" data-log-id="${escapeAttr(logId)}">Copiar</button>
      </div>
      <p>${escapeHtml(log.message || 'Evento da extensão')}</p>
      ${log.details ? `<pre>${escapeHtml(log.details)}</pre>` : ''}
    </article>
  `
}

function renderNetworkLogRow(log) {
  const ok = Boolean(log.ok)
  const status = Number(log.status) || 0
  const method = String(log.method || 'GET').toUpperCase()
  const label = typeof log.context?.label === 'string' ? log.context.label : ''
  const logId = String(log.id || '')
  return `
    <article class="mtl-log-row mtl-network-row ${ok ? 'mtl-log-info' : 'mtl-log-error'}">
      <div class="mtl-log-meta mtl-network-meta">
        <span>${escapeHtml(formatExtensionLogTime(log.time))}</span>
        <strong>${escapeHtml(method)}</strong>
        <em>${status || 'ERR'} ${escapeHtml(log.statusText || '')}</em>
        <span>${Number(log.durationMs) || 0}ms</span>
        <button type="button" class="mtl-log-copy" data-action="copy-log-item" data-log-id="${escapeAttr(logId)}">Copiar</button>
      </div>
      <p>${label ? `${escapeHtml(label)} · ` : ''}${escapeHtml(log.url || '')}</p>
      <details>
        <summary>Detalhes</summary>
        <pre>${escapeHtml(JSON.stringify({
          requestHeaders: log.requestHeaders || {},
          requestBody: log.requestBody || '',
          responseHeaders: log.responseHeaders || {},
          responseBody: log.responseBody || '',
          error: log.error || '',
          context: log.context || {},
        }, null, 2))}</pre>
      </details>
    </article>
  `
}


const MTL_TERMS_STORAGE_KEY = 'manga-terms-v2'

async function mtlHasAcceptedTerms() {
  try {
    const stored = await chrome.storage.local.get(MTL_TERMS_STORAGE_KEY)
    return stored[MTL_TERMS_STORAGE_KEY] === 'accepted'
  } catch {
    return false
  }
}

async function mtlMarkTermsAccepted() {
  try {
    await chrome.storage.local.set({ [MTL_TERMS_STORAGE_KEY]: 'accepted' })
  } catch {
  }
}

const MTL_GITHUB_STAR_STORAGE_KEY = 'manga-github-star-v1'
const MTL_GITHUB_REPO_URL = 'https://github.com/marco0antonio0/translate-manga-br'

async function mtlHasSeenGithubStar() {
  try {
    const stored = await chrome.storage.local.get(MTL_GITHUB_STAR_STORAGE_KEY)
    return stored[MTL_GITHUB_STAR_STORAGE_KEY] === 'seen'
  } catch {
    return true
  }
}

async function mtlMarkGithubStarSeen() {
  try {
    await chrome.storage.local.set({ [MTL_GITHUB_STAR_STORAGE_KEY]: 'seen' })
  } catch {
  }
}

function buildSupportOverlayMarkup() {
  return `
    <div class="mtl-support-overlay" hidden>
      <div class="mtl-auth-backdrop"></div>
      <div class="mtl-auth-modal" role="dialog" aria-modal="true" aria-label="Apoie o projeto">
        <div class="mtl-auth-topstrip" aria-hidden="true"></div>
        <button type="button" class="mtl-auth-close" data-role="support-close" title="Fechar" aria-label="Fechar">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>

        <div class="mtl-support-body">
          <div class="mtl-support-mark">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" stroke="none" d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.55 0-.27-.01-1.17-.02-2.12-3.2.7-3.87-1.36-3.87-1.36-.52-1.33-1.28-1.68-1.28-1.68-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.19 1.76 1.19 1.03 1.75 2.69 1.25 3.34.95.1-.74.4-1.25.72-1.53-2.55-.29-5.23-1.28-5.23-5.68 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11.1 11.1 0 0 1 2.89-.39c.98 0 1.97.13 2.89.39 2.2-1.49 3.16-1.18 3.16-1.18.63 1.59.24 2.76.12 3.05.74.81 1.19 1.83 1.19 3.09 0 4.41-2.69 5.38-5.25 5.67.41.35.77 1.05.77 2.12 0 1.53-.01 2.76-.01 3.14 0 .3.2.66.8.55A11.51 11.51 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z"/></svg>
            <span class="mtl-support-star" aria-hidden="true">★</span>
          </div>

          <h2>Gostou do projeto?</h2>
          <p>
            O Manga Translator Local é <strong>gratuito e de código aberto</strong>, feito para a
            comunidade. Se esta extensão for útil para você, considere deixar uma
            <strong> estrela no GitHub</strong> — é rápido, não custa nada e ajuda mais pessoas a
            descobrirem o projeto.
          </p>

          <a class="mtl-support-repo" data-role="support-repo" href="${MTL_GITHUB_REPO_URL}" target="_blank" rel="noopener noreferrer">
            <span class="mtl-support-repo-name">marco0antonio0/translate-manga-br</span>
            <span class="mtl-support-repo-hint">Ver o repositório no GitHub</span>
          </a>

          <a class="mtl-primary mtl-support-star-button" data-role="support-star" href="${MTL_GITHUB_REPO_URL}" target="_blank" rel="noopener noreferrer">
            ★ Dar uma estrela no GitHub
          </a>
          <button type="button" class="mtl-support-later" data-role="support-later">Agora não</button>
        </div>
      </div>
    </div>
  `
}

function mountSupportOverlay(shadow) {
  let overlay = shadow.querySelector('.mtl-support-overlay')
  if (overlay) return overlay

  const wrapper = document.createElement('div')
  wrapper.innerHTML = buildSupportOverlayMarkup().trim()
  overlay = wrapper.firstElementChild
  shadow.querySelector('.mtl-reader').appendChild(overlay)

  const dismiss = () => {
    void mtlMarkGithubStarSeen()
    overlay.hidden = true
  }
  overlay.querySelector('[data-role="support-close"]').addEventListener('click', dismiss)
  overlay.querySelector('[data-role="support-later"]').addEventListener('click', dismiss)
  overlay.querySelector('[data-role="support-repo"]').addEventListener('click', dismiss)
  overlay.querySelector('[data-role="support-star"]').addEventListener('click', dismiss)
  overlay.addEventListener('pointerdown', (event) => event.stopPropagation())
  overlay.addEventListener('click', (event) => event.stopPropagation())
  return overlay
}

async function maybeShowSupportOverlay(shadow) {
  try {
    if (await mtlHasSeenGithubStar()) return
    const overlay = mountSupportOverlay(shadow)
    overlay.hidden = false
  } catch {
  }
}

function buildAuthOverlayMarkup() {
  return `
    <div class="mtl-auth-overlay" hidden>
      <div class="mtl-auth-backdrop"></div>
      <div class="mtl-auth-modal" role="dialog" aria-modal="true" aria-label="Manga Translator Local">
        <div class="mtl-auth-topstrip" aria-hidden="true"></div>
        <button type="button" class="mtl-auth-close" data-role="auth-close" title="Fechar extensão" aria-label="Fechar extensão">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>

        <div class="mtl-auth-brand">
          <div class="mtl-auth-brand-mark">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
            <span class="mtl-auth-sparkle" aria-hidden="true">✦</span>
          </div>
          <div class="mtl-auth-brand-text">
            <strong>Manga Translator <em>Local</em></strong>
            <span>Leitor do navegador</span>
          </div>
        </div>

        <div class="mtl-auth-screen" data-screen="loading">
          <div class="mtl-auth-loading">
            <span class="mtl-auth-loading-ring" aria-hidden="true"></span>
            <p class="mtl-auth-hint">Verificando sessão...</p>
          </div>
        </div>

        <div class="mtl-auth-screen" data-screen="offline" hidden>
          <div class="mtl-auth-offline">
            <div class="mtl-auth-offline-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24"><path d="M12 20h.01"/><path d="M8.5 16.429a5 5 0 0 1 7 0"/><path d="M5 12.859a10 10 0 0 1 5.17-2.69"/><path d="M19 12.859a10 10 0 0 0-2.007-1.523"/><path d="M2 8.82a15 15 0 0 1 4.177-2.643"/><path d="M22 8.82a15 15 0 0 0-11.288-3.764"/><path d="m2 2 20 20"/></svg>
            </div>
            <strong>Servidor fora do alcance</strong>
            <p>
              Não conseguimos falar com
              <span class="mtl-auth-offline-url" data-role="offline-system-url">o sistema</span>.
              Verifique se ele está no ar e se você tem conexão.
            </p>
            <button type="button" class="mtl-primary mtl-auth-retry" data-role="retry-button">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12a9 9 0 1 1-2.64-6.36"/><path d="M21 3v6h-6"/></svg>
              <span>Tentar novamente</span>
            </button>
          </div>
        </div>

        <div class="mtl-auth-screen" data-screen="login" hidden>
          <div class="mtl-auth-welcome">
            <strong>Bem-vindo de volta!</strong>
            <span>Entre para começar a traduzir</span>
          </div>
          <form class="mtl-auth-form" data-role="login-form">
            <div class="mtl-auth-panel" data-role="login-panel">
              <label>
                Email
                <div class="mtl-auth-field">
                  <svg viewBox="0 0 24 24" aria-hidden="true"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                  <input data-role="login-email" type="email" placeholder="voce@exemplo.com" autocomplete="username">
                </div>
              </label>
              <label>
                Senha
                <div class="mtl-auth-field">
                  <svg viewBox="0 0 24 24" aria-hidden="true"><rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  <input data-role="login-password" type="password" placeholder="••••••••" autocomplete="current-password">
                </div>
              </label>
            </div>
            <button type="submit" class="mtl-primary mtl-auth-submit" data-role="login-submit">
              <span>Entrar</span>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
            </button>
          </form>
          <div class="mtl-auth-error" data-role="login-error" hidden>
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 8v5"/><path d="M12 16h.01"/></svg>
            <span data-role="login-error-text"></span>
          </div>
          <div class="mtl-auth-system-line">
            <span>Sistema</span>
            <strong data-role="login-system-url">—</strong>
          </div>
        </div>

        <div class="mtl-auth-screen" data-screen="terms" hidden>
          <div class="mtl-auth-welcome">
            <strong>Bem-vindo ao MangaIOTranslate!</strong>
            <span>Projeto open source e gratuito para traduzir mangás com apoio de IA, de forma local.</span>
          </div>

          <!-- Textos espelhados de lib/legal-content.ts (LEGAL_MODAL_CONTENT) -->
          <div class="mtl-auth-terms-cards">
            <div class="mtl-auth-terms-card">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/></svg>
              <p>Ferramenta de tradução automática para leitura assistida, preservando a estrutura visual original das páginas processadas.</p>
            </div>
            <div class="mtl-auth-terms-card">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 12h-5"/><path d="M15 8h-5"/><path d="M19 17V5a2 2 0 0 0-2-2H4"/><path d="M8 21h12a2 2 0 0 0 2-2v-1a1 1 0 0 0-1-1H11a1 1 0 0 0-1 1v1a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v2a1 1 0 0 0 1 1h3"/></svg>
              <p>Dados e traduções ficam armazenados localmente na sua instância. O projeto não opera armazenamento central e não distribui conteúdo de terceiros.</p>
            </div>
            <div class="mtl-auth-terms-card">
              <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13"/><path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/><path d="M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5"/></svg>
              <p>O MangaIOTranslate é gratuito e sem planos pagos. Não há cobrança, créditos, mensalidades ou política de reembolso.</p>
            </div>
            <div class="mtl-auth-terms-card mtl-auth-terms-card-warn">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1 1 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>
              <p>O usuário é integralmente responsável pelo conteúdo enviado. O processamento ocorre de forma automatizada, sem curadoria editorial humana. O projeto não se responsabiliza por uso de material protegido sem autorização e observa a LGPD no contexto de execução local.</p>
            </div>
          </div>

          <label class="mtl-auth-terms-accept" data-role="terms-accept-label">
            <input type="checkbox" data-role="terms-checkbox">
            <span>
              Estou ciente que o uso desta plataforma é de minha responsabilidade e aceito os
              <a data-role="terms-link" href="#" target="_blank" rel="noopener noreferrer">Termos de Uso</a>.
            </span>
          </label>
          <p class="mtl-auth-terms-error" data-role="terms-error" hidden>Aceite os termos para entrar na plataforma.</p>

          <button type="button" class="mtl-primary mtl-auth-continue" data-role="terms-continue">
            <span>Entrar na plataforma</span>
          </button>
        </div>

        <div class="mtl-auth-screen" data-screen="main" hidden>
          <div class="mtl-auth-user-card">
            <div class="mtl-auth-user-row">
              <div class="mtl-auth-avatar-wrap">
                <div class="mtl-auth-avatar" aria-hidden="true" data-role="avatar">U</div>
                <span class="mtl-auth-online-dot" aria-hidden="true"></span>
              </div>
              <div class="mtl-auth-user-info">
                <span>Conectado</span>
                <strong data-role="user-name">—</strong>
                <small data-role="user-email">—</small>
              </div>
              <button type="button" class="mtl-auth-danger" data-role="logout-button" title="Sair da conta">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/></svg>
                <span>Sair</span>
              </button>
            </div>
          </div>

          <div class="mtl-auth-section-label">
            <span>Tradução</span>
          </div>

          <div class="mtl-auth-panel">
            <div class="mtl-auth-grid">
              <label>
                Origem
                <select data-role="source-lang"></select>
              </label>
              <label>
                Destino
                <select data-role="target-lang"></select>
              </label>
            </div>
            <label>
              Provider
              <select data-role="provider-lang">
                <option value="google">Google Translate</option>
              </select>
            </label>
          </div>

          <button type="button" class="mtl-primary mtl-auth-continue" data-role="continue-button">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
            <span>Iniciar leitor</span>
          </button>

          <div class="mtl-auth-system-line">
            <span>Sistema</span>
            <strong data-role="system-url">—</strong>
          </div>
        </div>

        <p class="mtl-auth-status" data-role="status"></p>
      </div>
    </div>
  `
}

function mountAuthOverlay(shadow) {
  let overlay = shadow.querySelector('.mtl-auth-overlay')
  if (overlay) return overlay

  const wrapper = document.createElement('div')
  wrapper.innerHTML = buildAuthOverlayMarkup().trim()
  overlay = wrapper.firstElementChild
  shadow.querySelector('.mtl-reader').appendChild(overlay)
  bindAuthOverlay(overlay)
  return overlay
}

function bindAuthOverlay(overlay) {
  const els = {
    loginForm: overlay.querySelector('[data-role="login-form"]'),
    loginEmail: overlay.querySelector('[data-role="login-email"]'),
    loginPassword: overlay.querySelector('[data-role="login-password"]'),
    loginPanel: overlay.querySelector('[data-role="login-panel"]'),
    loginSystemUrl: overlay.querySelector('[data-role="login-system-url"]'),
    loginError: overlay.querySelector('[data-role="login-error"]'),
    loginErrorText: overlay.querySelector('[data-role="login-error-text"]'),
    loginSubmit: overlay.querySelector('[data-role="login-submit"]'),
    sourceLang: overlay.querySelector('[data-role="source-lang"]'),
    targetLang: overlay.querySelector('[data-role="target-lang"]'),
    providerLang: overlay.querySelector('[data-role="provider-lang"]'),
    systemUrl: overlay.querySelector('[data-role="system-url"]'),
    avatar: overlay.querySelector('[data-role="avatar"]'),
    userName: overlay.querySelector('[data-role="user-name"]'),
    userEmail: overlay.querySelector('[data-role="user-email"]'),
    logoutButton: overlay.querySelector('[data-role="logout-button"]'),
    continueButton: overlay.querySelector('[data-role="continue-button"]'),
    status: overlay.querySelector('[data-role="status"]'),
    offlineSystemUrl: overlay.querySelector('[data-role="offline-system-url"]'),
    retryButton: overlay.querySelector('[data-role="retry-button"]'),
    termsCheckbox: overlay.querySelector('[data-role="terms-checkbox"]'),
    termsAcceptLabel: overlay.querySelector('[data-role="terms-accept-label"]'),
    termsError: overlay.querySelector('[data-role="terms-error"]'),
    termsContinue: overlay.querySelector('[data-role="terms-continue"]'),
    termsLink: overlay.querySelector('[data-role="terms-link"]'),
  }
  overlay._mtlEls = els

  els.termsContinue.addEventListener('click', async () => {
    if (!els.termsCheckbox.checked) {
      els.termsError.hidden = false
      els.termsAcceptLabel.classList.add('mtl-auth-terms-accept-error')
      return
    }
    await mtlMarkTermsAccepted()
    mtlShowAuthScreen(overlay, 'main')
  })
  els.termsCheckbox.addEventListener('change', () => {
    if (els.termsCheckbox.checked) {
      els.termsError.hidden = true
      els.termsAcceptLabel.classList.remove('mtl-auth-terms-accept-error')
    }
  })
  els.termsLink.addEventListener('click', (event) => {
    event.stopPropagation()
  })

  overlay.querySelector('[data-role="auth-close"]').addEventListener('click', () => {
    closeActiveReader()
  })

  els.retryButton.addEventListener('click', () => {
    if (activeReaderShadow && activeReaderState) {
      void runAuthGate(activeReaderShadow, activeReaderState)
    }
  })

  mtlPopulateLanguageSelect(els.sourceLang, MTL_LANGUAGE_OPTIONS)
  mtlPopulateLanguageSelect(els.targetLang, MTL_TARGET_LANGUAGE_OPTIONS)

  els.loginForm.addEventListener('submit', async (event) => {
    event.preventDefault()
    event.stopPropagation()
    mtlClearLoginError(els)
    const email = els.loginEmail.value.trim()
    const password = els.loginPassword.value
    if (!email || !password) {
      mtlShowLoginError(els, 'Informe email e senha.')
      return
    }

    mtlSetAuthBusy(els, true)
    try {
      const currentSettings = await chrome.runtime.sendMessage({ type: 'MTL_GET_SETTINGS' })
      await chrome.runtime.sendMessage({ type: 'MTL_SAVE_SETTINGS', settings: currentSettings })

      const response = await chrome.runtime.sendMessage({
        type: 'MTL_LOGIN',
        payload: { email, password, settings: currentSettings },
      })

      if (!response?.ok || !response.authenticated) {
        if (response?.network) {
          mtlShowAuthScreen(overlay, 'offline')
          return
        }
        mtlShowLoginError(els, response?.error || 'Não foi possível entrar.')
        return
      }

      els.loginPassword.value = ''
      const settings = await chrome.runtime.sendMessage({ type: 'MTL_GET_SETTINGS' })
      await mtlPopulateProviderSelect(els, settings)
      mtlFillFormFromSettings(els, settings)
      mtlFillUserInfo(els, response.user)
      mtlShowAuthScreen(overlay, (await mtlHasAcceptedTerms()) ? 'main' : 'terms')
    } finally {
      mtlSetAuthBusy(els, false)
    }
  })

  els.logoutButton.addEventListener('click', async () => {
    mtlSetAuthBusy(els, true)
    try {
      const settings = await chrome.runtime.sendMessage({ type: 'MTL_GET_SETTINGS' })
      const response = await chrome.runtime.sendMessage({ type: 'MTL_LOGOUT', payload: { settings } })
      if (!response?.ok) {
        mtlShowAuthStatus(els, response?.error || 'Não foi possível sair.')
        return
      }
      mtlShowAuthScreen(overlay, 'login')
    } finally {
      mtlSetAuthBusy(els, false)
    }
  })

  els.continueButton.addEventListener('click', async () => {
    mtlSetAuthBusy(els, true)
    try {
      const settings = mtlReadSettingsFromForm(els)
      const response = await chrome.runtime.sendMessage({ type: 'MTL_SAVE_SETTINGS', settings })
      if (!response?.ok) {
        mtlShowAuthStatus(els, 'Não foi possível salvar as configurações.')
        return
      }
      overlay.hidden = true
      void maybeShowSupportOverlay(overlay.getRootNode())
    } finally {
      mtlSetAuthBusy(els, false)
    }
  })

  for (const select of [els.sourceLang, els.targetLang, els.providerLang]) {
    select.addEventListener('change', () => {
      void chrome.runtime.sendMessage({ type: 'MTL_SAVE_SETTINGS', settings: mtlReadSettingsFromForm(els) })
    })
  }

  els.loginEmail.addEventListener('input', () => mtlClearLoginError(els))
  els.loginPassword.addEventListener('input', () => mtlClearLoginError(els))

  overlay.addEventListener('pointerdown', (event) => event.stopPropagation())
  overlay.addEventListener('click', (event) => event.stopPropagation())
}

function mtlShowAuthScreen(overlay, name) {
  overlay.querySelectorAll('.mtl-auth-screen').forEach((el) => {
    el.hidden = el.getAttribute('data-screen') !== name
  })
}

function mtlPopulateLanguageSelect(select, options) {
  select.replaceChildren(...options.map((language) => {
    const option = document.createElement('option')
    option.value = language.code
    option.textContent = language.name
    return option
  }))
}

async function mtlPopulateProviderSelect(els, settings) {
  const options = [MTL_GOOGLE_PROVIDER]
  const status = await chrome.runtime.sendMessage({
    type: 'MTL_GET_OPENROUTER_STATUS',
    payload: { settings },
  }).catch((error) => ({ ok: false, error: error?.message }))

  if (status?.ok && status.available) {
    const selectedModel = status.selectedModel || status.availableModels?.[0]
    if (selectedModel) {
      options.push({
        value: `openrouter:${selectedModel}`,
        label: `OpenRouter · ${selectedModel}`,
      })
    }
  }

  const currentValue = els.providerLang.value || settings?.providerLang || MTL_GOOGLE_PROVIDER.value
  els.providerLang.replaceChildren(...options.map((provider) => {
    const option = document.createElement('option')
    option.value = provider.value
    option.textContent = provider.label
    return option
  }))
  mtlSetSelectValue(els.providerLang, currentValue, MTL_GOOGLE_PROVIDER.value)
}

function mtlSetSelectValue(select, value, fallback) {
  const normalized = String(value || '').trim()
  const hasOption = Array.from(select.options).some((option) => option.value === normalized)
  select.value = hasOption ? normalized : fallback
}

function mtlFillFormFromSettings(els, settings) {
  els.loginSystemUrl.textContent = settings.apiBaseUrl
  els.systemUrl.textContent = settings.apiBaseUrl
  els.offlineSystemUrl.textContent = settings.apiBaseUrl
  els.termsLink.href = `${String(settings.apiBaseUrl || '').replace(/\/+$/, '')}/termos`
  mtlSetSelectValue(els.sourceLang, settings.sourceLang, 'auto')
  mtlSetSelectValue(els.targetLang, settings.targetLang, 'pt-BR')
  mtlSetSelectValue(els.providerLang, settings.providerLang, MTL_GOOGLE_PROVIDER.value)
}

function mtlFillUserInfo(els, user) {
  const name = user?.name || user?.email || 'Usuário'
  els.userName.textContent = name
  els.userEmail.textContent = user?.email || ''
  els.avatar.textContent = mtlGetInitials(name)
}

function mtlGetInitials(value) {
  const normalized = String(value || '').trim()
  if (!normalized) return 'U'
  const parts = normalized.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  return normalized.slice(0, 2).toUpperCase()
}

function mtlReadSettingsFromForm(els) {
  return {
    sourceLang: els.sourceLang.value,
    targetLang: els.targetLang.value,
    providerLang: els.providerLang.value,
  }
}

function mtlSetAuthBusy(els, isBusy) {
  els.continueButton.disabled = isBusy
  els.loginSubmit.disabled = isBusy
  els.logoutButton.disabled = isBusy
  els.continueButton.classList.toggle('is-busy', isBusy)
  els.loginSubmit.classList.toggle('is-busy', isBusy)
  els.logoutButton.classList.toggle('is-busy', isBusy)
}

function mtlShowLoginError(els, message) {
  els.loginErrorText.textContent = message
  els.loginError.hidden = false
  els.loginPanel.classList.add('has-error')
  els.loginEmail.setAttribute('aria-invalid', 'true')
  els.loginPassword.setAttribute('aria-invalid', 'true')
}

function mtlClearLoginError(els) {
  els.loginErrorText.textContent = ''
  els.loginError.hidden = true
  els.loginPanel.classList.remove('has-error')
  els.loginEmail.removeAttribute('aria-invalid')
  els.loginPassword.removeAttribute('aria-invalid')
}

function mtlShowAuthStatus(els, message) {
  els.status.textContent = message
  window.setTimeout(() => {
    if (els.status.textContent === message) els.status.textContent = ''
  }, 2500)
}

async function runAuthGate(shadow, state) {
  const overlay = mountAuthOverlay(shadow)
  const els = overlay._mtlEls
  overlay.hidden = false
  mtlShowAuthScreen(overlay, 'loading')
  mtlClearLoginError(els)

  try {
    const settings = await chrome.runtime.sendMessage({ type: 'MTL_GET_SETTINGS' })
    state.settings = settings
    await mtlPopulateProviderSelect(els, settings)
    mtlFillFormFromSettings(els, settings)

    const session = await chrome.runtime.sendMessage({ type: 'MTL_CHECK_SESSION', payload: { settings } })
    if (session?.ok && session.authenticated) {
      mtlFillUserInfo(els, session.user)
      mtlShowAuthScreen(overlay, (await mtlHasAcceptedTerms()) ? 'main' : 'terms')
      return
    }

    if (!session?.ok && session?.network) {
      mtlShowAuthScreen(overlay, 'offline')
      return
    }

    if (!session?.ok && session?.error) mtlShowLoginError(els, session.error)
    mtlShowAuthScreen(overlay, 'login')
  } catch {
    mtlShowLoginError(els, 'Não foi possível verificar o sistema.')
    mtlShowAuthScreen(overlay, 'login')
  }
}

chrome.runtime.onMessage.addListener((message) => {
  if (!message || typeof message !== 'object') return
  if (message.type === 'MTL_OPEN_READER') {
    const existingHost = document.getElementById(READER_HOST_ID)
    if (existingHost && activeReaderShadow && activeReaderState && !message.imageUrl) {
      void runAuthGate(activeReaderShadow, activeReaderState)
      return
    }
    openReader(message.imageUrl || '')
  }
})

function stopHostEventPropagation(event) {
  event.stopPropagation()
}

function attachHostEventGuards(host) {
  const types = ['keydown', 'keyup', 'keypress', 'beforeinput', 'wheel', 'touchstart', 'touchmove', 'touchend']
  types.forEach((type) => {
    host.addEventListener(type, stopHostEventPropagation, true)
  })
  return () => {
    types.forEach((type) => {
      host.removeEventListener(type, stopHostEventPropagation, true)
    })
  }
}

function openReader(preferredImageUrl = '') {
  const pages = collectReadableImages(preferredImageUrl)
  if (pages.length === 0) {
    showInlineToast('Nenhuma imagem grande encontrada nesta página.')
    return
  }

  let existing = document.getElementById(READER_HOST_ID)
  if (existing) existing.remove()

  const host = document.createElement('div')
  host.id = READER_HOST_ID
  document.documentElement.append(host)
  const removeHostEventGuards = attachHostEventGuards(host)

  const shadow = host.attachShadow({ mode: 'open' })
  const state = {
    pages,
    pageIndex: Math.max(0, pages.findIndex((page) => page.url === preferredImageUrl)),
    zoom: 100,
    viewMode: 'paginated',
    overlayMode: true,
    textMode: 'translated',
    isProcessing: false,
    processingPageUrl: null,
    processedByUrl: new Map(),
    settings: null,
    imageRenderSizeByUrl: new Map(),
    imageNaturalSizeByUrl: new Map(),
    activeStatus: '',
    cleanupFns: [],
    isTopbarMoreOpen: false,
    isFontPanelOpen: false,
    isSettingsMenuOpen: false,
    isLogsPanelOpen: false,
    isReportPanelOpen: false,
    isSubmittingReport: false,
    reportSubmitted: false,
    isLoadingLogs: false,
    logsTab: 'events',
    logsCopyStatus: '',
    reportTarget: null,
    reportReason: MTL_TRANSLATION_REPORT_DEFAULT_REASON,
    reportStatus: '',
    logs: [],
    networkLogs: [],
    ocrOverlayFontScale: OCR_OVERLAY_DEFAULT_FONT_SCALE,
    ocrOverlayFontFamily: OCR_OVERLAY_FONT_FAMILY_DEFAULT,
    ocrOverlayDensity: OCR_OVERLAY_DENSITY_DEFAULT,
    ocrOverlayOpacity: OCR_OVERLAY_OPACITY_DEFAULT,
    ocrOverlayGlobalShape: 'rect',
    isSelectionMode: false,
    selectionDraft: null,
    itemOverrides: new Map(),
    selectedItem: null,
    dragEnabledItemKey: null,
    lastTap: null,
    isBatchProcessing: false,
    batchProgress: null,
    syncedSectionId: getCachedSectionIdForPage(window.location.href),
    isSyncingSection: false,
    sectionOrderUrls: null,
  }
  if (state.pageIndex < 0) state.pageIndex = 0
  state.cleanupFns.push(removeHostEventGuards)

  activeReaderShadow = shadow
  activeReaderState = state

  shadow.innerHTML = buildReaderMarkup(state)
  bindReader(shadow, host, state)
  renderReader(shadow, state)
  void loadSettings(state, shadow)
  void runAuthGate(shadow, state)
}

function collectReadableImages(preferredImageUrl) {
  const images = Array.from(document.images)
    .map((img, index) => {
      const rect = img.getBoundingClientRect()
      const url = img.currentSrc || img.src || ''
      const width = img.naturalWidth || Math.round(rect.width)
      const height = img.naturalHeight || Math.round(rect.height)
      return {
        id: `page-${index + 1}`,
        url,
        alt: img.alt || img.title || `Página ${index + 1}`,
        width,
        height,
        area: width * height,
        top: rect.top + window.scrollY,
        left: rect.left + window.scrollX,
      }
    })
    .filter((item) => item.url && /^https?:|^blob:|^data:/i.test(item.url))
    .filter((item) => item.url === preferredImageUrl || isReadableImage(item))
    .sort((a, b) => (a.top - b.top) || (a.left - b.left))

  const seen = new Set()
  return images.filter((item) => {
    if (seen.has(item.url)) return false
    seen.add(item.url)
    return true
  })
}

function isReadableImage(item) {
  if (item.width < MIN_IMAGE_WIDTH || item.height < MIN_IMAGE_HEIGHT) return false
  if (item.area < MIN_IMAGE_WIDTH * MIN_IMAGE_HEIGHT) return false
  const ratio = item.height / Math.max(item.width, 1)
  return ratio >= 0.8 && ratio <= 4.2
}

function getMangaTitle() {
  const candidates = [
    document.querySelector('meta[property="og:title"]')?.getAttribute('content'),
    document.querySelector('h1')?.textContent,
    document.title,
  ]
  const title = candidates
    .map((value) => String(value || '').replace(/\s+/g, ' ').trim())
    .find(Boolean)
  return title || window.location.hostname || 'Mangá importado do navegador'
}

async function loadSettings(state, shadow) {
  state.settings = await chrome.runtime.sendMessage({ type: 'MTL_GET_SETTINGS' })
  renderReader(shadow, state)

  if (state.syncedSectionId) {
    void syncExistingSectionOnOpen(state, shadow)
  }
}

async function syncExistingSectionOnOpen(state, shadow) {
  const check = await chrome.runtime.sendMessage({
    type: 'MTL_GET_SECTION',
    payload: { sectionId: state.syncedSectionId, settings: state.settings },
  }).catch(() => null)

  if (!check?.ok) return
  if (check.exists === false) {
    state.syncedSectionId = null
    setCachedSectionIdForPage(window.location.href, null)
    return
  }

  const images = Array.isArray(check.section?.images) ? check.section.images : []
  let anyDone = false
  let allDone = images.length > 0
  for (const image of images) {
    const pageUrl = mapOrderToPageUrl(state, Number(image.order_index))
    if (isServerImageDone(image)) {
      anyDone = true
      if (pageUrl) applyServerImageToPage(state, pageUrl, image)
    } else if (!isServerImageResolved(image)) {
      allDone = false
    }
  }

  if (anyDone) renderReader(shadow, state)
  if (!allDone && isAutoSectionCreationEnabled(state.settings)) {
    void processAllPages(shadow, state, { force: false, syncSection: false })
  }
}

function bindReader(shadow, host, state) {
  shadow.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target : null
    if (!target) return

    const action = target.closest('[data-action]')?.getAttribute('data-action')

    if (!target.closest('.mtl-font-popover-wrap') && state.isFontPanelOpen) {
      state.isFontPanelOpen = false
      renderReader(shadow, state)
    }
    // No mobile o menu vira bottom sheet e o backdrop (::before) devolve o
    // próprio .mtl-settings-menu como alvo do clique — também deve fechar.
    if (
      state.isSettingsMenuOpen
      && (!target.closest('.mtl-settings-menu-wrap') || target.classList.contains('mtl-settings-menu'))
    ) {
      state.isSettingsMenuOpen = false
      renderReader(shadow, state)
    }
    if (
      !target.closest('.mtl-actions-secondary')
      && !target.closest('.mtl-more-toggle')
      && state.isTopbarMoreOpen
    ) {
      state.isTopbarMoreOpen = false
      renderReader(shadow, state)
    }
    if (
      !target.closest('.mtl-quick-editor')
      && !target.closest('.mtl-report-panel')
      && !target.closest('[data-ocr-item-key]')
      && state.selectedItem
    ) {
      state.selectedItem = null
      renderReader(shadow, state)
    }

    if (!action) return

    if (action === 'close') {
      if (activeReaderState === state) {
        closeActiveReader()
      } else {
        state.cleanupFns.forEach((cleanup) => cleanup())
        state.cleanupFns = []
        host.remove()
      }
      return
    }
    if (action === 'open-account') {
      void runAuthGate(shadow, state)
      return
    }
    if (action === 'prev') {
      state.pageIndex = Math.max(0, state.pageIndex - 1)
      state.error = ''
      state.activeStatus = ''
      renderReader(shadow, state)
      return
    }
    if (action === 'next') {
      state.pageIndex = Math.min(state.pages.length - 1, state.pageIndex + 1)
      state.error = ''
      state.activeStatus = ''
      renderReader(shadow, state)
      return
    }
    if (action === 'zoom-out') {
      state.zoom = Math.max(25, state.zoom - 10)
      renderReader(shadow, state)
      return
    }
    if (action === 'zoom-in') {
      state.zoom = Math.min(300, state.zoom + 10)
      renderReader(shadow, state)
      return
    }
    if (action === 'toggle-view-mode') {
      state.viewMode = state.viewMode === 'paginated' ? 'scroll' : 'paginated'
      renderReader(shadow, state)
      return
    }
    if (action === 'toggle-font-panel') {
      state.isFontPanelOpen = !state.isFontPanelOpen
      state.isSettingsMenuOpen = false
      renderReader(shadow, state)
      return
    }
    if (action === 'toggle-settings-menu') {
      state.isSettingsMenuOpen = !state.isSettingsMenuOpen
      state.isFontPanelOpen = false
      renderReader(shadow, state)
      return
    }
    if (action === 'open-logs') {
      state.isSettingsMenuOpen = false
      state.isLogsPanelOpen = true
      void loadExtensionLogs(state, shadow)
      return
    }
    if (action === 'close-logs') {
      state.isLogsPanelOpen = false
      renderReader(shadow, state)
      return
    }
    if (action === 'close-report-modal') {
      closeReportPanel(state)
      renderReader(shadow, state)
      return
    }
    if (action === 'submit-report') {
      void submitTranslationReport(shadow, state)
      return
    }
    if (action === 'logs-tab-events' || action === 'logs-tab-network') {
      state.logsTab = action === 'logs-tab-network' ? 'network' : 'events'
      state.logsCopyStatus = ''
      renderReader(shadow, state)
      return
    }
    if (action === 'clear-logs') {
      const kind = state.logsTab === 'network' ? 'network' : 'events'
      void chrome.runtime.sendMessage({ type: 'MTL_CLEAR_LOGS', payload: { kind } }).then((response) => {
        if (response?.ok) {
          if (kind === 'network') state.networkLogs = []
          else state.logs = []
        }
        else recordExtensionLog(state, 'error', response?.error || 'Não foi possível limpar os logs.')
        renderReader(shadow, state)
      }).catch((error) => {
        recordExtensionLog(state, 'error', 'Não foi possível limpar os logs.', logDetailsFromError(error))
        renderReader(shadow, state)
      })
      return
    }
    if (action === 'copy-logs') {
      void copyTextToClipboard(formatLogsForCopy(state)).then(() => {
        state.logsCopyStatus = 'Copiado'
        renderReader(shadow, state)
      }).catch((error) => {
        state.logsCopyStatus = 'Falha ao copiar'
        recordExtensionLog(state, 'error', 'Não foi possível copiar os logs.', logDetailsFromError(error))
        renderReader(shadow, state)
      })
      return
    }
    if (action === 'copy-log-item') {
      const logId = target.closest('[data-log-id]')?.getAttribute('data-log-id') || ''
      const text = formatSingleLogForCopy(state, logId)
      if (!text) return
      void copyTextToClipboard(text).then(() => {
        state.logsCopyStatus = 'Item copiado'
        renderReader(shadow, state)
      }).catch((error) => {
        state.logsCopyStatus = 'Falha ao copiar'
        recordExtensionLog(state, 'error', 'Não foi possível copiar o item de log.', logDetailsFromError(error))
        renderReader(shadow, state)
      })
      return
    }
    if (action === 'toggle-auto-section') {
      const nextSettings = {
        ...(state.settings || {}),
        autoCreateSections: !isAutoSectionCreationEnabled(state.settings),
      }
      state.settings = nextSettings
      state.isSettingsMenuOpen = false
      recordExtensionLog(
        state,
        'info',
        nextSettings.autoCreateSections
          ? 'Criação automática de seção habilitada.'
          : 'Criação automática de seção desabilitada.'
      )
      void chrome.runtime.sendMessage({ type: 'MTL_SAVE_SETTINGS', settings: nextSettings }).then((response) => {
        if (response?.settings) state.settings = response.settings
        renderReader(shadow, state)
      }).catch((error) => {
        recordExtensionLog(state, 'error', 'Não foi possível salvar a preferência de criação de seção.', logDetailsFromError(error))
        renderReader(shadow, state)
      })
      renderReader(shadow, state)
      return
    }
    if (action === 'toggle-topbar-more') {
      state.isTopbarMoreOpen = !state.isTopbarMoreOpen
      renderReader(shadow, state)
      return
    }
    if (action === 'font-scale-dec' || action === 'font-scale-inc') {
      const delta = action === 'font-scale-dec' ? -OCR_OVERLAY_FONT_SCALE_STEP : OCR_OVERLAY_FONT_SCALE_STEP
      state.ocrOverlayFontScale = clampRange(state.ocrOverlayFontScale + delta, OCR_OVERLAY_FONT_SCALE_MIN, OCR_OVERLAY_FONT_SCALE_MAX)
      renderReader(shadow, state)
      return
    }
    if (action === 'density-dec' || action === 'density-inc') {
      const delta = action === 'density-dec' ? -OCR_OVERLAY_DENSITY_STEP : OCR_OVERLAY_DENSITY_STEP
      state.ocrOverlayDensity = clampRange(state.ocrOverlayDensity + delta, OCR_OVERLAY_DENSITY_MIN, OCR_OVERLAY_DENSITY_MAX)
      renderReader(shadow, state)
      return
    }
    if (action === 'opacity-dec' || action === 'opacity-inc') {
      const delta = action === 'opacity-dec' ? -OCR_OVERLAY_OPACITY_STEP : OCR_OVERLAY_OPACITY_STEP
      state.ocrOverlayOpacity = clampRange(state.ocrOverlayOpacity + delta, OCR_OVERLAY_OPACITY_MIN, OCR_OVERLAY_OPACITY_MAX)
      renderReader(shadow, state)
      return
    }
    if (action === 'text-mode-translated' || action === 'text-mode-original') {
      state.textMode = action === 'text-mode-translated' ? 'translated' : 'original'
      renderReader(shadow, state)
      return
    }
    if (action === 'global-shape-rect' || action === 'global-shape-oval') {
      state.ocrOverlayGlobalShape = action === 'global-shape-rect' ? 'rect' : 'oval'
      renderReader(shadow, state)
      return
    }
    if (action === 'toggle-selection-mode') {
      state.isFontPanelOpen = false
      state.selectionDraft = null
      state.isSelectionMode = !state.isSelectionMode
      if (state.isSelectionMode) {
        state.selectedItem = null
        state.dragEnabledItemKey = null
      }
      renderReader(shadow, state)
      return
    }
    if (action === 'quick-editor-close') {
      state.selectedItem = null
      renderReader(shadow, state)
      return
    }
    if (action === 'quick-editor-report') {
      const targetData = findReportTargetForSelectedItem(state)
      if (!targetData) {
        recordExtensionLog(state, 'warn', 'Não foi possível abrir o reporte: balão não encontrado.')
        return
      }
      state.reportTarget = targetData
      state.reportReason = MTL_TRANSLATION_REPORT_DEFAULT_REASON
      state.reportStatus = ''
      state.reportSubmitted = false
      state.isSubmittingReport = false
      state.isReportPanelOpen = true
      renderReader(shadow, state)
      return
    }
    if (action === 'quick-editor-toggle-drag') {
      if (state.selectedItem) {
        const key = itemOverrideKey(state.selectedItem.pageUrl, state.selectedItem.itemId)
        state.dragEnabledItemKey = state.dragEnabledItemKey === key ? null : key
      }
      renderReader(shadow, state)
      return
    }
    if (action === 'quick-editor-shape-rect' || action === 'quick-editor-shape-oval') {
      if (state.selectedItem) {
        const override = getItemOverride(state, state.selectedItem.pageUrl, state.selectedItem.itemId)
        override.shape = action === 'quick-editor-shape-rect' ? 'rect' : 'oval'
      }
      renderReader(shadow, state)
      return
    }
    if (action === 'quick-editor-font-dec' || action === 'quick-editor-font-inc') {
      if (state.selectedItem) {
        const override = getItemOverride(state, state.selectedItem.pageUrl, state.selectedItem.itemId)
        const delta = action === 'quick-editor-font-dec' ? -OCR_OVERLAY_ITEM_FONT_SCALE_STEP : OCR_OVERLAY_ITEM_FONT_SCALE_STEP
        override.fontScale = clampRange((override.fontScale ?? 1) + delta, OCR_OVERLAY_ITEM_FONT_SCALE_MIN, OCR_OVERLAY_ITEM_FONT_SCALE_MAX)
      }
      renderReader(shadow, state)
      return
    }
    if (action === 'quick-editor-size-dec' || action === 'quick-editor-size-inc') {
      if (state.selectedItem) {
        const override = getItemOverride(state, state.selectedItem.pageUrl, state.selectedItem.itemId)
        const delta = action === 'quick-editor-size-dec' ? -OCR_OVERLAY_ITEM_SIZE_STEP : OCR_OVERLAY_ITEM_SIZE_STEP
        override.sizeScale = clampRange((override.sizeScale ?? 1) + delta, OCR_OVERLAY_ITEM_SIZE_MIN, OCR_OVERLAY_ITEM_SIZE_MAX)
      }
      renderReader(shadow, state)
      return
    }
    if (action === 'quick-editor-density-dec' || action === 'quick-editor-density-inc') {
      if (state.selectedItem) {
        const override = getItemOverride(state, state.selectedItem.pageUrl, state.selectedItem.itemId)
        const delta = action === 'quick-editor-density-dec' ? -OCR_OVERLAY_ITEM_DENSITY_STEP : OCR_OVERLAY_ITEM_DENSITY_STEP
        override.density = clampRange((override.density ?? 1) + delta, OCR_OVERLAY_ITEM_DENSITY_MIN, OCR_OVERLAY_ITEM_DENSITY_MAX)
      }
      renderReader(shadow, state)
      return
    }
    if (action === 'quick-editor-delete') {
      if (state.selectedItem) {
        const override = getItemOverride(state, state.selectedItem.pageUrl, state.selectedItem.itemId)
        override.hidden = true
        state.selectedItem = null
      }
      renderReader(shadow, state)
      return
    }
    if (action === 'quick-editor-reset') {
      if (state.selectedItem) {
        state.itemOverrides.delete(itemOverrideKey(state.selectedItem.pageUrl, state.selectedItem.itemId))
      }
      renderReader(shadow, state)
      return
    }
    if (action === 'toggle-text') {
      state.textMode = state.textMode === 'translated' ? 'original' : 'translated'
      renderReader(shadow, state)
      return
    }
    if (action === 'process-all-pages') {
      if (state.isProcessing || state.isBatchProcessing || state.isSyncingSection) return
      const allPagesProcessed = state.pages.length > 0
        && state.pages.every((page) => state.processedByUrl.has(page.url))
      state.isSyncingSection = true
      state.activeStatus = 'Processando...'
      renderReader(shadow, state)
      void processAllPages(shadow, state, { force: allPagesProcessed, syncSection: true })
      return
    }
  })

  const fontFamilySelect = shadow.querySelector('select[data-role="font-family"]')
  if (fontFamilySelect) {
    fontFamilySelect.innerHTML = Object.entries(OCR_OVERLAY_FONT_FAMILIES)
      .map(([key, config]) => `<option value="${key}">${escapeAttr(config.label)}</option>`)
      .join('')
  }

  shadow.addEventListener('change', (event) => {
    const target = event.target
    if (target instanceof HTMLInputElement && target.name === 'mtl-report-reason') {
      state.reportReason = normalizeReportReason(target.value)
      state.reportStatus = ''
      renderReader(shadow, state)
      return
    }
    if (!(target instanceof HTMLSelectElement)) return
    if (target.name === 'page') {
      state.pageIndex = Number(target.value)
      state.error = ''
      state.activeStatus = ''
      renderReader(shadow, state)
      return
    }
    if (target.dataset.role === 'font-family') {
      state.ocrOverlayFontFamily = target.value
      renderReader(shadow, state)
    }
  })

  shadow.addEventListener('load', (event) => {
    const target = event.target
    if (!(target instanceof HTMLImageElement)) return
    const pageUrl = target.getAttribute('data-page-url')
    if (!pageUrl) return
    state.imageNaturalSizeByUrl.set(pageUrl, {
      width: target.naturalWidth || 0,
      height: target.naturalHeight || 0,
    })
    updateRenderedImageSize(shadow, state, pageUrl)
  }, true)

  const handleResize = () => {
    const page = state.pages[state.pageIndex]
    if (!page) return
    updateRenderedImageSize(shadow, state, page.url)
    renderReader(shadow, state)
  }
  window.addEventListener('resize', handleResize)
  state.cleanupFns.push(() => window.removeEventListener('resize', handleResize))

  let touchStart = null
  shadow.querySelector('.mtl-reader')?.addEventListener('touchstart', (event) => {
    if (state.viewMode === 'scroll' || event.touches.length !== 1) {
      touchStart = null
      return
    }
    touchStart = { x: event.touches[0].clientX, y: event.touches[0].clientY }
  }, { passive: true })
  shadow.querySelector('.mtl-reader')?.addEventListener('touchend', (event) => {
    if (state.viewMode === 'scroll' || !touchStart || event.changedTouches.length !== 1) return
    const touch = event.changedTouches[0]
    const dx = touch.clientX - touchStart.x
    const dy = touch.clientY - touchStart.y
    touchStart = null
    if (Math.abs(dx) < 56 || Math.abs(dx) < Math.abs(dy) * 1.2) return
    state.pageIndex = dx < 0
      ? Math.min(state.pages.length - 1, state.pageIndex + 1)
      : Math.max(0, state.pageIndex - 1)
    renderReader(shadow, state)
  }, { passive: true })

  shadow.addEventListener('pointerdown', (event) => {
    const boxEl = event.target instanceof Element ? event.target.closest('[data-ocr-item-key]') : null
    if (boxEl) {
      if (state.isSelectionMode) return
      const pageUrl = boxEl.getAttribute('data-page-url')
      const itemId = Number(boxEl.getAttribute('data-item-id'))
      const key = itemOverrideKey(pageUrl, itemId)

      const now = Date.now()
      const prevTap = state.lastTap
      const isDoubleTap = Boolean(
        prevTap
        && prevTap.key === key
        && (now - prevTap.at) <= OCR_OVERLAY_QUICK_EDITOR_DOUBLE_TAP_MS
        && Math.abs(event.clientX - prevTap.x) <= OCR_OVERLAY_QUICK_EDITOR_TAP_MOVE_PX
        && Math.abs(event.clientY - prevTap.y) <= OCR_OVERLAY_QUICK_EDITOR_TAP_MOVE_PX
      )

      if (isDoubleTap) {
        state.lastTap = null
        event.preventDefault()
        event.stopPropagation()
        state.selectedItem = { pageUrl, itemId }
        renderReader(shadow, state)
        return
      }
      state.lastTap = { key, at: now, x: event.clientX, y: event.clientY }

      if (state.dragEnabledItemKey !== key) return

      event.preventDefault()
      event.stopPropagation()
      const startClientX = event.clientX
      const startClientY = event.clientY
      const override = getItemOverride(state, pageUrl, itemId)
      const startDx = override.dx || 0
      const startDy = override.dy || 0
      const refSize = state.imageNaturalSizeByUrl.get(pageUrl) || { width: 1, height: 1 }

      const handleMove = (moveEvent) => {
        const wrap = shadow.querySelector(`.mtl-image-wrap[data-page-url="${cssEscape(pageUrl)}"]`)
        if (!wrap) return
        const rect = wrap.getBoundingClientRect()
        if (rect.width <= 0 || rect.height <= 0) return
        const zoomFactor = state.zoom / 100
        const renderedWidth = Math.max(1, rect.width / zoomFactor)
        const renderedHeight = Math.max(1, rect.height / zoomFactor)
        const deltaClientX = (moveEvent.clientX - startClientX) / zoomFactor
        const deltaClientY = (moveEvent.clientY - startClientY) / zoomFactor
        override.dx = startDx + (deltaClientX * refSize.width) / renderedWidth
        override.dy = startDy + (deltaClientY * refSize.height) / renderedHeight
        renderReader(shadow, state)
      }
      const handleEnd = () => {
        shadow.removeEventListener('pointermove', handleMove)
        shadow.removeEventListener('pointerup', handleEnd)
        shadow.removeEventListener('pointercancel', handleEnd)
      }
      shadow.addEventListener('pointermove', handleMove)
      shadow.addEventListener('pointerup', handleEnd)
      shadow.addEventListener('pointercancel', handleEnd)
      return
    }

    if (!state.isSelectionMode) return
    const wrapEl = event.target instanceof Element ? event.target.closest('.mtl-image-wrap') : null
    if (!wrapEl) return

    const pageUrl = wrapEl.getAttribute('data-page-url')
    const imgEl = wrapEl.querySelector('img')
    if (!imgEl) return

    let rect = imgEl.getBoundingClientRect()
    if (rect.width <= 0 || rect.height <= 0) return

    event.preventDefault()

    const startXPercent = clampRange(((event.clientX - rect.left) / rect.width) * 100, 0, 100)
    const startYPercent = clampRange(((event.clientY - rect.top) / rect.height) * 100, 0, 100)
    state.selectionDraft = { pageUrl, x1: startXPercent, y1: startYPercent, x2: startXPercent, y2: startYPercent }

    let draftEl = wrapEl.querySelector('.mtl-selection-draft')
    if (!draftEl) {
      draftEl = document.createElement('div')
      draftEl.className = 'mtl-selection-draft'
      wrapEl.appendChild(draftEl)
    }
    const applyDraftStyle = () => {
      const d = state.selectionDraft
      if (!d) return
      const left = Math.min(d.x1, d.x2)
      const top = Math.min(d.y1, d.y2)
      draftEl.style.left = `${left}%`
      draftEl.style.top = `${top}%`
      draftEl.style.width = `${Math.abs(d.x2 - d.x1)}%`
      draftEl.style.height = `${Math.abs(d.y2 - d.y1)}%`
    }
    applyDraftStyle()

    try { wrapEl.setPointerCapture(event.pointerId) } catch {}

    const handleMove = (moveEvent) => {
      if (!state.selectionDraft) return
      rect = imgEl.getBoundingClientRect()
      if (rect.width <= 0 || rect.height <= 0) return
      state.selectionDraft.x2 = clampRange(((moveEvent.clientX - rect.left) / rect.width) * 100, 0, 100)
      state.selectionDraft.y2 = clampRange(((moveEvent.clientY - rect.top) / rect.height) * 100, 0, 100)
      applyDraftStyle()
    }
    const finishSelection = () => {
      wrapEl.removeEventListener('pointermove', handleMove)
      wrapEl.removeEventListener('pointerup', finishSelection)
      wrapEl.removeEventListener('pointercancel', finishSelection)
      try { wrapEl.releasePointerCapture(event.pointerId) } catch {}
      const created = finalizeManualSelection(state, pageUrl)
      if (created) {
        state.isSelectionMode = false
      }
      renderReader(shadow, state)
      if (created) {
        void runManualSelectionOcr(shadow, state, pageUrl, created.itemId, created.box)
      }
    }
    wrapEl.addEventListener('pointermove', handleMove)
    wrapEl.addEventListener('pointerup', finishSelection)
    wrapEl.addEventListener('pointercancel', finishSelection)
  })
}

function finalizeManualSelection(state, pageUrl) {
  const draft = state.selectionDraft
  state.selectionDraft = null
  if (!draft) return null

  const widthPercent = Math.abs(draft.x2 - draft.x1)
  const heightPercent = Math.abs(draft.y2 - draft.y1)
  if (widthPercent < 1.5 || heightPercent < 1.5) return null

  const refSize = state.imageNaturalSizeByUrl.get(pageUrl)
  if (!refSize || !refSize.width || !refSize.height) return null

  let processed = state.processedByUrl.get(pageUrl)
  if (!processed) {
    processed = { width: refSize.width, height: refSize.height, detections: [] }
    state.processedByUrl.set(pageUrl, processed)
  }

  const x1 = (Math.min(draft.x1, draft.x2) / 100) * refSize.width
  const y1 = (Math.min(draft.y1, draft.y2) / 100) * refSize.height
  const x2 = (Math.max(draft.x1, draft.x2) / 100) * refSize.width
  const y2 = (Math.max(draft.y1, draft.y2) / 100) * refSize.height
  const box = [x1, y1, x2, y2]

  const nextId = processed.detections.reduce((max, it) => Math.max(max, (it.det_id ?? it.id ?? -1) + 1), 0)
  processed.detections.push({
    det_id: nextId,
    box,
    ocr_text: '',
    translatedText: 'OCR...',
    manual: true,
    hasText: true,
    pending: true,
  })
  return { itemId: nextId, box }
}

function updateManualDetection(state, pageUrl, itemId, patch) {
  const processed = state.processedByUrl.get(pageUrl)
  if (!processed || !Array.isArray(processed.detections)) return
  const detection = processed.detections.find((it) => (it.det_id ?? it.id) === itemId)
  if (!detection) return
  Object.assign(detection, patch)
  processed.textDetectionsCount = processed.detections.filter((it) => it.hasText !== false).length
  state.processedByUrl.set(pageUrl, processed)
}

async function runManualSelectionOcr(shadow, state, pageUrl, itemId, box) {
  const refSize = state.imageNaturalSizeByUrl.get(pageUrl)
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'MTL_OCR_TRANSLATE_CROP',
      payload: {
        imageUrl: pageUrl,
        pageUrl: window.location.href,
        box,
        refSize: refSize ? { width: refSize.width, height: refSize.height } : null,
        settings: state.settings,
      },
    })
    if (!response?.ok) throw new Error(response?.error || 'Falha ao processar a área selecionada.')

    updateManualDetection(state, pageUrl, itemId, {
      ocr_text: response.ocrText || '',
      translatedText: response.translatedText || response.ocrText || '[sem texto detectado]',
      hasText: response.hasText !== false,
      pending: false,
    })

    chrome.runtime.sendMessage({
      type: 'MTL_UPDATE_PAGE_CACHE',
      payload: {
        imageUrl: pageUrl,
        settings: state.settings,
        result: state.processedByUrl.get(pageUrl),
      },
    }).catch(() => {})
  } catch (error) {
    updateManualDetection(state, pageUrl, itemId, {
      ocr_text: '',
      translatedText: `Erro: ${error instanceof Error ? error.message : 'falha no OCR'}`,
      hasText: false,
      pending: false,
    })
  } finally {
    renderReader(shadow, state)
  }
}

async function createSectionForPages(shadow, state) {
  state.isSyncingSection = true
  state.activeStatus = 'Criando seção no site...'
  renderReader(shadow, state)
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'MTL_CREATE_SECTION_FROM_PAGES',
      payload: {
        title: getMangaTitle(),
        pageUrl: window.location.href,
        pages: state.pages.map((page, index) => ({
          url: page.url,
          alt: page.alt,
          index,
        })),
        settings: state.settings,
      },
    })
    if (!response?.ok) throw new Error(response?.error || 'Não foi possível criar a seção no site.')
    state.syncedSectionId = response.sectionId || null
    state.sectionOrderUrls = Array.isArray(response.uploadedUrls) ? response.uploadedUrls : null
    setCachedSectionIdForPage(window.location.href, state.syncedSectionId)
    state.activeStatus = response.skippedCount > 0
      ? `Seção criada no site. ${response.skippedCount} imagem(ns) não puderam ser enviada(s).`
      : 'Seção criada no site.'
    return true
  } catch (error) {
    state.error = error instanceof Error ? error.message : 'Não foi possível criar a seção no site.'
    recordExtensionLog(state, 'error', 'Falha ao criar seção no site.', logDetailsFromError(error))
    return false
  } finally {
    state.isSyncingSection = false
    renderReader(shadow, state)
  }
}

async function reprocessSyncedSection(shadow, state) {
  state.isSyncingSection = true
  state.activeStatus = 'Reprocessando seção no site...'
  renderReader(shadow, state)
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'MTL_REPROCESS_SECTION',
      payload: { sectionId: state.syncedSectionId, settings: state.settings },
    })
    if (!response?.ok) throw new Error(response?.error || 'Não foi possível reprocessar a seção no site.')
    return true
  } catch (error) {
    state.error = error instanceof Error ? error.message : 'Não foi possível reprocessar a seção no site.'
    recordExtensionLog(state, 'error', 'Falha ao reprocessar seção no site.', logDetailsFromError(error))
    return false
  } finally {
    state.isSyncingSection = false
    renderReader(shadow, state)
  }
}

async function ensureSectionSynced(shadow, state, options = {}) {
  if (state.syncedSectionId) {
    state.isSyncingSection = true
    state.activeStatus = 'Verificando seção no site...'
    renderReader(shadow, state)
    const check = await chrome.runtime.sendMessage({
      type: 'MTL_CHECK_SECTION',
      payload: { sectionId: state.syncedSectionId, settings: state.settings },
    }).catch(() => null)
    state.isSyncingSection = false

    if (check?.ok && check.exists === true) {
      return options.force ? await reprocessSyncedSection(shadow, state) : true
    }

    if (check?.ok && check.exists === false) {
      state.syncedSectionId = null
      setCachedSectionIdForPage(window.location.href, null)
    } else {
      state.error = check?.error || 'Não foi possível verificar a seção no site.'
      recordExtensionLog(state, 'error', 'Falha ao verificar seção no site.', state.error)
      renderReader(shadow, state)
      return false
    }
  }

  return await createSectionForPages(shadow, state)
}

const SECTION_SYNC_INTERVAL_MS = 1500
const SECTION_SYNC_TIMEOUT_MS = 30 * 60 * 1000

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function mapOrderToPageUrl(state, orderIndex) {
  if (Array.isArray(state.sectionOrderUrls) && state.sectionOrderUrls[orderIndex]) {
    return state.sectionOrderUrls[orderIndex]
  }
  const page = state.pages[orderIndex]
  return page ? page.url : null
}

function applyServerImageToPage(state, pageUrl, image) {
  const items = Array.isArray(image?.ocr?.items) ? image.ocr.items : []
  const detections = items.map((item, idx) => {
    const box = Array.isArray(item.box) ? item.box.map(Number) : [0, 0, 0, 0]
    const ocrText = typeof item.ocr_text === 'string' ? item.ocr_text : ''
    const translatedText = typeof item.translated_text === 'string' ? item.translated_text : ''
    return {
      id: Number(item.det_id ?? item.id ?? idx + 1),
      det_id: Number(item.det_id ?? item.id ?? idx + 1),
      box,
      ocr_text: ocrText,
      ocrText,
      translatedText: translatedText || ocrText,
      hasText: Boolean(ocrText || translatedText),
    }
  })

  const measured = state.imageNaturalSizeByUrl.get(pageUrl)
  const result = {
    width: measured?.width || 0,
    height: measured?.height || 0,
    detections,
    textDetectionsCount: detections.filter((d) => d.hasText).length,
    rawDetectionsCount: detections.length,
    source: 'site-section',
    extractedAt: Date.now(),
  }
  state.processedByUrl.set(pageUrl, result)

  chrome.runtime.sendMessage({
    type: 'MTL_UPDATE_PAGE_CACHE',
    payload: { imageUrl: pageUrl, settings: state.settings, result },
  }).catch(() => {})
}

function isServerImageDone(image) {
  const status = String(image?.translation_status || '')
  const imgStatus = String(image?.status || '')
  return status === 'extracted' || status === 'translated' || status === 'completed' || imgStatus === 'completed'
}

function isServerImageFailed(image) {
  return String(image?.status || '') === 'error' || String(image?.translation_status || '') === 'failed'
}

function isServerImageResolved(image) {
  if (isServerImageDone(image) || isServerImageFailed(image)) return true
  if (image && image.selected_for_processing === false) return true
  return false
}

async function processAllPages(shadow, state, options = {}) {
  if (state.isProcessing || state.isBatchProcessing) return
  const force = Boolean(options.force)
  const shouldUseSection = options.syncSection && isAutoSectionCreationEnabled(state.settings)

  if (shouldUseSection) {
    const synced = await ensureSectionSynced(shadow, state, { force })
    if (!synced) return
  }
  if (!shouldUseSection && options.syncSection) {
    await processAllPagesDirectly(shadow, state, { force })
    return
  }
  if (!state.syncedSectionId) return

  state.isSyncingSection = false
  state.isBatchProcessing = true
  state.batchProgress = { current: 0, total: state.pages.length, failures: 0 }
  state.activeStatus = 'Aguardando o site traduzir as páginas...'
  renderReader(shadow, state)

  const startedAt = Date.now()
  let done = false
  let lastError = ''
  const appliedOrders = new Set()

  while (!done && Date.now() - startedAt < SECTION_SYNC_TIMEOUT_MS) {
    const response = await chrome.runtime.sendMessage({
      type: 'MTL_GET_SECTION',
      payload: { sectionId: state.syncedSectionId, settings: state.settings },
    }).catch(() => null)

    if (response?.ok && response.exists === false) {
      lastError = 'A seção foi removida no site.'
      break
    }
    if (!response?.ok || !response.section) {
      lastError = response?.error || 'Falha ao consultar a seção.'
      await sleep(SECTION_SYNC_INTERVAL_MS)
      continue
    }

    const images = Array.isArray(response.section.images) ? response.section.images : []
    let resolved = 0
    let failures = 0
    for (const image of images) {
      const order = Number(image.order_index)
      const pageUrl = mapOrderToPageUrl(state, order)
      if (isServerImageDone(image)) {
        resolved += 1
        if (pageUrl && !appliedOrders.has(order)) {
          appliedOrders.add(order)
          applyServerImageToPage(state, pageUrl, image)
        }
      } else if (isServerImageResolved(image)) {
        resolved += 1
        if (isServerImageFailed(image)) failures += 1
      }
    }

    state.batchProgress = { current: resolved, total: images.length || state.pages.length, failures }
    renderReader(shadow, state)

    done = images.length > 0 && resolved >= images.length
    if (!done) await sleep(SECTION_SYNC_INTERVAL_MS)
    else {
      state.activeStatus = failures > 0
        ? `Concluído: ${images.length - failures}/${images.length} página(s) traduzida(s), ${failures} com falha.`
        : `${images.length} página(s) traduzida(s) com sucesso.`
    }
  }

  if (!done && !state.activeStatus) {
    state.error = lastError || 'Tempo esgotado aguardando o site processar a seção.'
  }
  if (!done && lastError) {
    state.error = lastError
    recordExtensionLog(state, 'error', 'Falha ao sincronizar tradução da seção.', lastError)
  }

  state.isBatchProcessing = false
  state.batchProgress = null
  renderReader(shadow, state)
}

async function processAllPagesDirectly(shadow, state, options = {}) {
  const force = Boolean(options.force)
  state.isSyncingSection = false
  state.isBatchProcessing = true
  state.batchProgress = { current: 0, total: state.pages.length, failures: 0 }
  state.activeStatus = 'Traduzindo sem criar seção...'
  recordExtensionLog(state, 'info', 'Tradução iniciada sem criação automática de seção.')
  renderReader(shadow, state)

  let failures = 0
  for (let index = 0; index < state.pages.length; index += 1) {
    const page = state.pages[index]
    if (!page) continue
    if (!force && state.processedByUrl.has(page.url)) {
      state.batchProgress = { current: index + 1, total: state.pages.length, failures }
      renderReader(shadow, state)
      continue
    }

    state.processingPageUrl = page.url
    state.activeStatus = `Traduzindo página ${index + 1} de ${state.pages.length} sem criar seção...`
    renderReader(shadow, state)

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'MTL_EXTRACT_AND_TRANSLATE_IMAGE',
        payload: {
          imageUrl: page.url,
          pageUrl: window.location.href,
          force,
          settings: state.settings,
        },
      })
      if (!response?.ok) throw new Error(response?.error || 'Falha ao traduzir a imagem.')
      state.processedByUrl.set(page.url, response.result)
      recordExtensionLog(state, 'info', `Página ${index + 1} traduzida sem criar seção.`)
    } catch (error) {
      failures += 1
      recordExtensionLog(state, 'error', `Falha ao traduzir página ${index + 1}.`, logDetailsFromError(error))
    } finally {
      state.processingPageUrl = null
      state.batchProgress = { current: index + 1, total: state.pages.length, failures }
      renderReader(shadow, state)
    }
  }

  state.activeStatus = failures > 0
    ? `Concluído sem seção: ${state.pages.length - failures}/${state.pages.length} página(s) traduzida(s), ${failures} com falha.`
    : `${state.pages.length} página(s) traduzida(s) sem criar seção.`
  state.isBatchProcessing = false
  state.batchProgress = null
  renderReader(shadow, state)
}

function renderReader(shadow, state) {
  const page = state.pages[state.pageIndex]
  const processed = page ? state.processedByUrl.get(page.url) : null
  const detections = processed?.detections || []
  const imageStage = shadow.querySelector('.mtl-image-stage')
  const footer = shadow.querySelector('.mtl-footer')
  const pageSelect = shadow.querySelector('select[name="page"]')
  const status = shadow.querySelector('.mtl-status')
  const zoomLabel = shadow.querySelector('.mtl-zoom')
  const textButton = shadow.querySelector('[data-action="toggle-text"]')
  const pageCounter = shadow.querySelector('.mtl-page-counter')
  const translatedBadge = shadow.querySelector('.mtl-translated-badge')

  if (pageSelect) {
    pageSelect.innerHTML = state.pages.map((item, index) => (
      `<option value="${index}" ${index === state.pageIndex ? 'selected' : ''}>Página ${index + 1}${state.processedByUrl.has(item.url) ? ' (Traduzida)' : ''}</option>`
    )).join('')
  }

  if (zoomLabel) zoomLabel.textContent = `${state.zoom}%`
  if (pageCounter) pageCounter.textContent = `${state.pageIndex + 1} / ${state.pages.length}`
  if (translatedBadge) {
    const textDetectionsCount = detections.filter((item) => item.hasText !== false).length
    if (page && state.processingPageUrl === page.url) {
      translatedBadge.textContent = 'Processando'
      translatedBadge.className = 'mtl-badge mtl-badge-processing mtl-translated-badge'
    } else {
      translatedBadge.textContent = textDetectionsCount > 0 ? 'Traduzida' : detections.length > 0 ? 'Sem OCR' : 'Original'
      translatedBadge.className = textDetectionsCount > 0
        ? 'mtl-badge mtl-badge-success mtl-translated-badge'
        : detections.length > 0
          ? 'mtl-badge mtl-badge-warning mtl-translated-badge'
          : 'mtl-badge mtl-translated-badge'
    }
  }
  if (status) {
    const textDetectionsCount = detections.filter((item) => item.hasText !== false).length
    if (state.isSyncingSection) {
      status.textContent = state.activeStatus || 'Sincronizando seção no site...'
    } else if (state.isBatchProcessing && state.batchProgress) {
      status.textContent = `Traduzindo página ${state.batchProgress.current} de ${state.batchProgress.total}...`
    } else if (state.isProcessing) {
      status.textContent = 'Extraindo balões e traduzindo...'
    } else if (detections.length > 0) {
      status.textContent = `${detections.length} balões detectados, ${textDetectionsCount} com texto OCR`
    } else {
      status.textContent = state.error || state.activeStatus || 'Imagem original'
    }
  }
  if (textButton) textButton.textContent = state.textMode === 'translated' ? 'Tradução' : 'Original'

  const translateTrigger = shadow.querySelector('.mtl-translate-trigger')
  if (translateTrigger) {
    const allPagesProcessed = state.pages.length > 0
      && state.pages.every((item) => state.processedByUrl.has(item.url))
    const isBusy = state.isProcessing || state.isBatchProcessing || state.isSyncingSection
    const translateLabel = translateTrigger.querySelector('.mtl-translate-label') || translateTrigger.querySelector('span')
    translateLabel.textContent = state.isBatchProcessing && state.batchProgress
      ? `Traduzindo ${state.batchProgress.current}/${state.batchProgress.total}`
      : isBusy
        ? 'Processando...'
        : allPagesProcessed
          ? 'Reprocessar'
          : 'Traduzir'
    translateTrigger.disabled = isBusy || state.pages.length === 0
    translateTrigger.classList.toggle('mtl-translate-trigger-busy', isBusy)
  }

  const progress = shadow.querySelector('.mtl-progress')
  if (progress) {
    const bp = state.batchProgress
    const showProgress = state.isSyncingSection || state.isBatchProcessing || Boolean(bp)
    progress.hidden = !showProgress
    if (showProgress) {
      const text = progress.querySelector('.mtl-progress-text')
      const count = progress.querySelector('.mtl-progress-count')
      const fill = progress.querySelector('.mtl-progress-fill')
      if (state.isSyncingSection && !bp) {
        if (text) text.textContent = state.activeStatus || 'Sincronizando com o site...'
        if (count) count.textContent = ''
        if (fill) fill.style.width = '8%'
      } else if (bp) {
        const pct = bp.total > 0 ? Math.round((bp.current / bp.total) * 100) : 0
        if (text) text.textContent = `Traduzindo páginas... ${pct}%`
        if (count) {
          count.innerHTML = `${bp.current}/${bp.total}`
            + (bp.failures > 0 ? ` · <span class="mtl-progress-fail">${bp.failures} falha(s)</span>` : '')
        }
        if (fill) fill.style.width = `${pct}%`
      }
    }
  }

  const viewModeButton = shadow.querySelector('[data-action="toggle-view-mode"]')
  if (viewModeButton) {
    viewModeButton.classList.toggle('mtl-icon-button-active', state.viewMode === 'scroll')
    viewModeButton.title = state.viewMode === 'scroll' ? 'Modo paginado' : 'Modo rolagem contínua'
  }

  const fontTrigger = shadow.querySelector('[data-action="toggle-font-panel"]')
  const fontPanel = shadow.querySelector('.mtl-font-panel')
  if (fontTrigger) fontTrigger.classList.toggle('mtl-font-trigger-open', state.isFontPanelOpen)
  if (fontPanel) fontPanel.hidden = !state.isFontPanelOpen

  const settingsToggle = shadow.querySelector('[data-action="toggle-settings-menu"]')
  const settingsMenu = shadow.querySelector('.mtl-settings-menu')
  const autoSectionStatus = shadow.querySelector('[data-role="auto-section-status"]')
  const autoSectionEnabled = isAutoSectionCreationEnabled(state.settings)
  if (settingsToggle) {
    settingsToggle.classList.toggle('mtl-icon-button-active', state.isSettingsMenuOpen)
    settingsToggle.setAttribute('aria-expanded', String(state.isSettingsMenuOpen))
  }
  if (settingsMenu) settingsMenu.hidden = !state.isSettingsMenuOpen
  if (autoSectionStatus) {
    autoSectionStatus.textContent = autoSectionEnabled ? 'Ligada' : 'Desligada'
    autoSectionStatus.classList.toggle('mtl-settings-status-off', !autoSectionEnabled)
  }

  const logsPanel = shadow.querySelector('.mtl-logs-panel')
  const logsList = shadow.querySelector('[data-role="logs-list"]')
  const logsCopyStatus = shadow.querySelector('[data-role="logs-copy-status"]')
  if (logsPanel) logsPanel.hidden = !state.isLogsPanelOpen
  shadow.querySelector('[data-action="logs-tab-events"]')?.classList.toggle('mtl-logs-tab-on', state.logsTab !== 'network')
  shadow.querySelector('[data-action="logs-tab-network"]')?.classList.toggle('mtl-logs-tab-on', state.logsTab === 'network')
  if (logsCopyStatus) logsCopyStatus.textContent = state.logsCopyStatus || ''
  if (logsList) {
    if (state.isLoadingLogs) {
      logsList.innerHTML = '<div class="mtl-logs-empty">Carregando logs...</div>'
    } else if (state.logsTab === 'network') {
      const networkLogs = Array.isArray(state.networkLogs) ? state.networkLogs : []
      logsList.innerHTML = networkLogs.length === 0
        ? '<div class="mtl-logs-empty">Nenhum request registrado ainda.</div>'
        : networkLogs.slice().reverse().map(renderNetworkLogRow).join('')
    } else if (!Array.isArray(state.logs) || state.logs.length === 0) {
      logsList.innerHTML = '<div class="mtl-logs-empty">Nenhum evento registrado nesta extensão.</div>'
    } else {
      logsList.innerHTML = state.logs.slice().reverse().map(renderEventLogRow).join('')
    }
  }

  const reportPanel = shadow.querySelector('.mtl-report-panel')
  if (reportPanel) {
    reportPanel.hidden = !state.isReportPanelOpen
    const target = state.reportTarget
    const options = reportPanel.querySelector('[data-role="report-reasons"]')
    const original = reportPanel.querySelector('[data-role="report-original"]')
    const translated = reportPanel.querySelector('[data-role="report-translated"]')
    const status = reportPanel.querySelector('[data-role="report-status"]')
    const submit = reportPanel.querySelector('[data-action="submit-report"]')
    const cancel = reportPanel.querySelector('[data-role="report-cancel"]')
    const formContent = reportPanel.querySelector('[data-role="report-form-content"]')
    const successContent = reportPanel.querySelector('[data-role="report-success"]')
    const submitted = state.reportSubmitted === true
    if (options) options.innerHTML = renderReportReasonOptions(state.reportReason)
    if (original) original.textContent = target?.ocrText || 'Sem texto OCR registrado.'
    if (translated) translated.textContent = target?.translatedText || 'Sem tradução registrada.'
    if (formContent) formContent.hidden = submitted
    if (successContent) successContent.hidden = !submitted
    if (cancel) cancel.hidden = submitted
    if (status) {
      status.textContent = state.reportStatus || ''
      status.hidden = submitted || !state.reportStatus
    }
    if (submit) {
      submit.disabled = state.isSubmittingReport || (!target && !submitted)
      submit.textContent = submitted ? 'Continuar' : state.isSubmittingReport ? 'Enviando...' : 'Enviar'
    }
  }

  const topbarMoreToggle = shadow.querySelector('.mtl-more-toggle')
  const topbarSecondary = shadow.querySelector('.mtl-actions-secondary')
  if (topbarMoreToggle) {
    topbarMoreToggle.classList.toggle('mtl-icon-button-active', state.isTopbarMoreOpen)
    topbarMoreToggle.setAttribute('aria-expanded', String(state.isTopbarMoreOpen))
  }
  if (topbarSecondary) topbarSecondary.hidden = !state.isTopbarMoreOpen
  const fontScaleLabel = shadow.querySelector('[data-role="font-scale-label"]')
  if (fontScaleLabel) fontScaleLabel.textContent = `${Math.round((state.ocrOverlayFontScale / OCR_OVERLAY_DEFAULT_FONT_SCALE) * 100)}%`
  const densityLabel = shadow.querySelector('[data-role="density-label"]')
  if (densityLabel) densityLabel.textContent = state.ocrOverlayDensity.toFixed(1)
  const opacityLabel = shadow.querySelector('[data-role="opacity-label"]')
  if (opacityLabel) opacityLabel.textContent = `${Math.round(state.ocrOverlayOpacity * 100)}%`
  const fontFamilySelect = shadow.querySelector('select[data-role="font-family"]')
  if (fontFamilySelect && fontFamilySelect.value !== state.ocrOverlayFontFamily) {
    fontFamilySelect.value = state.ocrOverlayFontFamily
  }
  shadow.querySelector('[data-action="text-mode-translated"]')?.classList.toggle('mtl-panel-choice-on', state.textMode === 'translated')
  shadow.querySelector('[data-action="text-mode-original"]')?.classList.toggle('mtl-panel-choice-on', state.textMode === 'original')
  shadow.querySelector('[data-action="global-shape-rect"]')?.classList.toggle('mtl-panel-choice-on', state.ocrOverlayGlobalShape === 'rect')
  shadow.querySelector('[data-action="global-shape-oval"]')?.classList.toggle('mtl-panel-choice-on', state.ocrOverlayGlobalShape === 'oval')
  const selectionButton = shadow.querySelector('[data-action="toggle-selection-mode"]')
  if (selectionButton) {
    selectionButton.textContent = state.isSelectionMode ? 'Seleção ligada' : 'Selecionar área'
    selectionButton.classList.toggle('mtl-panel-choice-on', state.isSelectionMode)
  }

  if (imageStage) {
    imageStage.classList.toggle('mtl-image-stage-scroll', state.viewMode === 'scroll')
    if (state.viewMode === 'scroll') {
      imageStage.innerHTML = state.pages.map((item) => renderPageWrap(item, state)).join('')
      state.pages.forEach((item) => updateRenderedImageSize(shadow, state, item.url))
    } else if (page) {
      imageStage.innerHTML = renderPageWrap(page, state)
      updateRenderedImageSize(shadow, state, page.url)
    } else {
      imageStage.innerHTML = ''
    }
  }

  if (footer) {
    footer.classList.toggle('mtl-footer-hidden', state.viewMode === 'scroll')
    footer.querySelector('[data-action="prev"]').disabled = state.pageIndex === 0
    footer.querySelector('[data-action="next"]').disabled = state.pageIndex >= state.pages.length - 1
  }
}

function renderPageWrap(page, state) {
  const processed = state.processedByUrl.get(page.url)
  const detections = processed?.detections || []
  const displayUrl = processed?.imageDataUrl || page.url || ''
  const isProcessingThisPage = state.processingPageUrl === page.url
  const refSize = resolveOverlayReferenceSize(page, processed, state)
  const displayedSize = state.imageRenderSizeByUrl.get(page.url) || refSize
  const overlayHtml = state.overlayMode && detections.length > 0
    ? `<div class="mtl-overlay${state.isSelectionMode ? ' mtl-overlay-locked' : ''}">${detections.map((item) => renderOverlayItem(item, refSize, displayedSize, state, page.url)).join('')}</div>`
    : ''
  const selectionDraftHtml = state.isSelectionMode && state.selectionDraft && state.selectionDraft.pageUrl === page.url
    ? renderSelectionDraft(state.selectionDraft)
    : ''
  const emptyStateHtml = !isProcessingThisPage && processed && detections.length === 0
    ? '<div class="mtl-empty-overlay">Nenhum balão detectado pelo OCR nesta página.</div>'
    : ''
  const busyHtml = isProcessingThisPage
    ? `<div class="mtl-busy"><svg class="mtl-spin" viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg><span>Processando...</span></div>`
    : ''

  const quickEditorHtml = state.selectedItem && state.selectedItem.pageUrl === page.url
    ? renderQuickEditor(state, detections, refSize)
    : ''

  return `
    <div class="mtl-image-wrap" data-page-url="${escapeAttr(page.url)}" style="zoom:${state.zoom / 100}; max-width:900px">
      <img src="${escapeAttr(displayUrl)}" alt="${escapeAttr(page.alt)}" data-page-url="${escapeAttr(page.url)}">
      ${busyHtml}
      ${overlayHtml}
      ${selectionDraftHtml}
      ${emptyStateHtml}
      ${quickEditorHtml}
    </div>
  `
}

function renderSelectionDraft(draft) {
  const left = Math.min(draft.x1, draft.x2)
  const top = Math.min(draft.y1, draft.y2)
  const width = Math.abs(draft.x2 - draft.x1)
  const height = Math.abs(draft.y2 - draft.y1)
  return `<div class="mtl-selection-draft" style="left:${left}%; top:${top}%; width:${width}%; height:${height}%"></div>`
}

function itemOverrideKey(pageUrl, itemId) {
  return `${pageUrl}::${itemId}`
}

function getItemOverride(state, pageUrl, itemId) {
  const key = itemOverrideKey(pageUrl, itemId)
  let override = state.itemOverrides.get(key)
  if (!override) {
    override = { shape: null, fontScale: 1, sizeScale: 1, density: 1, hidden: false, dx: 0, dy: 0 }
    state.itemOverrides.set(key, override)
  }
  return override
}

function renderOverlayItem(item, refSize, displayedSize, state, pageUrl) {
  const override = state.itemOverrides.get(itemOverrideKey(pageUrl, item.det_id ?? item.id))
  if (override?.hidden) return ''

  const width = Number(refSize.width) || 1
  const height = Number(refSize.height) || 1
  const itemId = item.det_id ?? item.id
  const dx = override?.dx || 0
  const dy = override?.dy || 0
  const sizeScale = override?.sizeScale ?? 1
  const [rawX1, rawY1, rawX2, rawY2] = item.box
  const x1 = rawX1 + dx
  const y1 = rawY1 + dy
  const x2 = rawX2 + dx
  const y2 = rawY2 + dy
  const boxWidth = Math.max(1, x2 - x1)
  const boxHeight = Math.max(1, y2 - y1)
  const insetX = (boxWidth * OCR_OVERLAY_DEFAULT_BOX_INSET) / 100
  const insetY = (boxHeight * OCR_OVERLAY_DEFAULT_BOX_INSET) / 100
  const cx = (x1 + x2) / 2
  const cy = (y1 + y2) / 2
  const scaledHalfW = ((boxWidth - insetX * 2) * sizeScale) / 2
  const scaledHalfH = ((boxHeight - insetY * 2) * sizeScale) / 2
  const adjustedX1 = clampRange(cx - scaledHalfW, 0, width)
  const adjustedY1 = clampRange(cy - scaledHalfH, 0, height)
  const adjustedX2 = clampRange(cx + scaledHalfW, 0, width)
  const adjustedY2 = clampRange(cy + scaledHalfH, 0, height)
  const adjustedWidth = Math.max(1, adjustedX2 - adjustedX1)
  const adjustedHeight = Math.max(1, adjustedY2 - adjustedY1)
  const text = state.textMode === 'translated'
    ? item.translatedText || item.ocr_text || item.ocrText || '[sem texto OCR]'
    : item.ocr_text || item.ocrText || item.translatedText || '[sem texto OCR]'
  const ratioX = Math.max(1, displayedSize.width || width) / width
  const ratioY = Math.max(1, displayedSize.height || height) / height
  const displayedWidth = Math.max(1, adjustedWidth * ratioX)
  const displayedHeight = Math.max(1, adjustedHeight * ratioY)
  const itemFontScale = override?.fontScale ?? 1
  const effectiveFontScale = state.ocrOverlayFontScale * itemFontScale
  const baseFontPxUnscaled = adjustedHeight * 0.23 * Math.min(ratioX, ratioY) * effectiveFontScale
  const baseFontPx = baseFontPxUnscaled
  const compactText = text.replace(/\s+/g, ' ').trim()
  const explicitLineCount = Math.max(1, text.split('\n').length)
  const approxCharsPerLine = Math.max(1, Math.floor(displayedWidth / Math.max(1, baseFontPxUnscaled * 0.56)))
  const longestWordLength = compactText
    .split(/\s+/)
    .reduce((max, token) => Math.max(max, token.length), 1)
  const estimatedLineCount = Math.max(
    explicitLineCount,
    Math.ceil(Math.max(1, compactText.length) / approxCharsPerLine)
  )
  const maxFontByHeight = displayedHeight / Math.max(1, estimatedLineCount * 1.2)
  const maxFontByWidth = displayedWidth / Math.max(2, longestWordLength * 0.62)
  const fontSize = clampRange(
    Math.min(baseFontPx, maxFontByHeight, maxFontByWidth),
    2,
    120
  )
  const itemDensity = override?.density ?? 1
  const backgroundAlpha = clampRange(0.88 * state.ocrOverlayDensity * itemDensity * state.ocrOverlayOpacity, 0.08, 0.98)
  const shape = override?.shape || state.ocrOverlayGlobalShape
  const isSelected = state.selectedItem?.pageUrl === pageUrl && state.selectedItem?.itemId === itemId
  const dragEnabled = state.dragEnabledItemKey === itemOverrideKey(pageUrl, itemId)
  const fontFamilyCss = (OCR_OVERLAY_FONT_FAMILIES[state.ocrOverlayFontFamily] || OCR_OVERLAY_FONT_FAMILIES[OCR_OVERLAY_FONT_FAMILY_DEFAULT]).css

  return `
    <div class="mtl-box${shape === 'oval' ? ' mtl-box-oval' : ''}${isSelected ? ' mtl-box-selected' : ''}${dragEnabled ? ' mtl-box-draggable' : ''}"
      data-ocr-item-key="${escapeAttr(itemOverrideKey(pageUrl, itemId))}"
      data-item-id="${itemId}"
      data-page-url="${escapeAttr(pageUrl)}"
      style="
      left:${(adjustedX1 / width) * 100}%;
      top:${(adjustedY1 / height) * 100}%;
      width:${Math.max(2, (adjustedWidth / width) * 100)}%;
      height:${Math.max(2, (adjustedHeight / height) * 100)}%;
      background-color:rgba(255, 255, 255, ${backgroundAlpha});
    ">
      <span style="font-size:${fontSize}px; font-family:${fontFamilyCss}">${escapeHtml(text)}</span>
    </div>
  `
}

function renderQuickEditor(state, detections, refSize) {
  const { pageUrl, itemId } = state.selectedItem
  const item = detections.find((it) => (it.det_id ?? it.id) === itemId)
  if (!item) return ''
  const override = getItemOverride(state, pageUrl, itemId)
  const key = itemOverrideKey(pageUrl, itemId)
  const dragEnabled = state.dragEnabledItemKey === key
  const fontLabel = `${Math.round((override.fontScale ?? 1) * 100)}%`
  const sizeLabel = `${Math.round((override.sizeScale ?? 1) * 100)}%`
  const densityLabel = `${Math.round((override.density ?? 1) * 100)}%`
  const shape = override.shape || state.ocrOverlayGlobalShape

  const [x1, y1, x2] = item.box
  const width = Math.max(1, Number(refSize.width) || 1)
  const height = Math.max(1, Number(refSize.height) || 1)
  const leftPercent = clampRange(((x1 + x2) / 2 / width) * 100, 0, 100)
  const topPercent = clampRange((y1 / height) * 100, 0, 100)

  return `
    <div class="mtl-quick-editor" style="left:${leftPercent}%; top:${topPercent}%">
      <div class="mtl-qe-row mtl-qe-header">
        <p class="mtl-qe-title">Balão #${itemId}</p>
        <button type="button" class="mtl-qe-close" data-action="quick-editor-close">Fechar</button>
      </div>
      <div class="mtl-qe-row">
        <span class="mtl-qe-label">Arrastar</span>
        <button type="button" class="mtl-qe-toggle${dragEnabled ? ' mtl-qe-toggle-on' : ''}" data-action="quick-editor-toggle-drag">${dragEnabled ? 'Habilitado' : 'Desligado'}</button>
      </div>
      <div class="mtl-qe-row">
        <span class="mtl-qe-label">Tipo</span>
        <div class="mtl-qe-group">
          <button type="button" class="mtl-qe-mini${shape === 'rect' ? ' mtl-qe-mini-on' : ''}" data-action="quick-editor-shape-rect">Ret</button>
          <button type="button" class="mtl-qe-mini${shape === 'oval' ? ' mtl-qe-mini-on' : ''}" data-action="quick-editor-shape-oval">Oval</button>
        </div>
      </div>
      <div class="mtl-qe-row">
        <span class="mtl-qe-label">Fonte</span>
        <div class="mtl-qe-group">
          <button type="button" class="mtl-qe-step" data-action="quick-editor-font-dec">-</button>
          <span class="mtl-qe-value">${fontLabel}</span>
          <button type="button" class="mtl-qe-step" data-action="quick-editor-font-inc">+</button>
        </div>
      </div>
      <div class="mtl-qe-row">
        <span class="mtl-qe-label">Tamanho</span>
        <div class="mtl-qe-group">
          <button type="button" class="mtl-qe-step" data-action="quick-editor-size-dec">-</button>
          <span class="mtl-qe-value">${sizeLabel}</span>
          <button type="button" class="mtl-qe-step" data-action="quick-editor-size-inc">+</button>
        </div>
      </div>
      <div class="mtl-qe-row">
        <span class="mtl-qe-label">Densidade</span>
        <div class="mtl-qe-group">
          <button type="button" class="mtl-qe-step" data-action="quick-editor-density-dec">-</button>
          <span class="mtl-qe-value">${densityLabel}</span>
          <button type="button" class="mtl-qe-step" data-action="quick-editor-density-inc">+</button>
        </div>
      </div>
      <div class="mtl-qe-row">
        <button type="button" class="mtl-qe-report" data-action="quick-editor-report">Reportar</button>
        <button type="button" class="mtl-qe-delete" data-action="quick-editor-delete">Excluir</button>
        <button type="button" class="mtl-qe-reset" data-action="quick-editor-reset">Resetar</button>
      </div>
    </div>
  `
}

function resolveOverlayReferenceSize(page, processed, state) {
  const processedWidth = Number(processed?.width)
  const processedHeight = Number(processed?.height)
  if (Number.isFinite(processedWidth) && processedWidth > 0 && Number.isFinite(processedHeight) && processedHeight > 0) {
    return { width: processedWidth, height: processedHeight }
  }

  const measured = state.imageNaturalSizeByUrl.get(page.url)
  if (measured?.width > 0 && measured?.height > 0) return measured

  return {
    width: Math.max(1, Number(page.width) || 1),
    height: Math.max(1, Number(page.height) || 1),
  }
}

function updateRenderedImageSize(shadow, state, pageUrl) {
  const image = shadow.querySelector(`img[data-page-url="${cssEscape(pageUrl)}"]`)
  if (!(image instanceof HTMLImageElement)) return

  const rect = image.getBoundingClientRect()
  if (rect.width <= 0 || rect.height <= 0) return
  state.imageRenderSizeByUrl.set(pageUrl, {
    width: rect.width,
    height: rect.height,
  })
}

function clampRange(value, min, max) {
  if (!Number.isFinite(value)) return min
  return Math.max(min, Math.min(max, value))
}

function cssEscape(value) {
  if (globalThis.CSS?.escape) return globalThis.CSS.escape(value)
  return String(value).replaceAll('\\', '\\\\').replaceAll('"', '\\"')
}

function buildReaderMarkup() {
  return `
    <style>${readerCss()}</style>
    <section class="mtl-reader" aria-label="Manga Translator Local Reader">
      <header class="mtl-topbar">
        <button class="mtl-icon-button" type="button" data-action="close" title="Fechar" aria-label="Fechar">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>
        <div class="mtl-title">
          <strong>Manga Translator Local</strong>
          <span class="mtl-status">Imagem original</span>
        </div>
        <div class="mtl-badges">
          <span class="mtl-badge mtl-translated-badge">Original</span>
          <span class="mtl-badge mtl-page-counter">1 / 1</span>
        </div>
        <div class="mtl-actions">
          <div class="mtl-settings-menu-wrap">
            <button class="mtl-icon-button mtl-settings-toggle" type="button" data-action="toggle-settings-menu" title="Configurações rápidas" aria-label="Configurações rápidas" aria-expanded="false">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.65 1.65 0 0 0 15 19.4a1.65 1.65 0 0 0-1 .6l-.09.09a2 2 0 0 1-3.82-1v-.09A1.65 1.65 0 0 0 9 17.6a1.65 1.65 0 0 0-1.82-.33l-.06.03a2 2 0 1 1-2-3.46l.06-.03A1.65 1.65 0 0 0 5.6 12a1.65 1.65 0 0 0-.6-1l-.09-.09a2 2 0 0 1 1-3.82H6a1.65 1.65 0 0 0 1.4-1.09 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 12 4.6a1.65 1.65 0 0 0 1-.6l.09-.09a2 2 0 0 1 3.82 1V5a1.65 1.65 0 0 0 1.09 1.4 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 12c0 .35.11.69.33 1l.03.06a2 2 0 1 1-3.46 2l-.03-.06A1.65 1.65 0 0 0 15 14.4"/></svg>
            </button>
            <div class="mtl-settings-menu" hidden>
              <p class="mtl-panel-label">Configurações rápidas</p>
              <button type="button" class="mtl-settings-menu-item" data-action="open-logs">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M8 13h8"/><path d="M8 17h5"/></svg>
                <span>Logs</span>
              </button>
              <button type="button" class="mtl-settings-menu-item" data-action="toggle-auto-section">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
                <span>Criação de seção</span>
                <small data-role="auto-section-status" class="mtl-settings-status-off">Desligada</small>
              </button>
            </div>
          </div>
          <button class="mtl-icon-button" type="button" data-action="open-account" title="Conta e configurações" aria-label="Conta e configurações">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 21a8 8 0 0 0-16 0"/><circle cx="12" cy="7" r="4"/></svg>
          </button>
          <div class="mtl-actions-secondary" hidden>
            <button class="mtl-icon-button" type="button" data-action="zoom-out" title="Diminuir zoom" aria-label="Diminuir zoom">
              <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" x2="16.65" y1="21" y2="16.65"/><line x1="8" x2="14" y1="11" y2="11"/></svg>
            </button>
            <span class="mtl-zoom">100%</span>
            <button class="mtl-icon-button" type="button" data-action="zoom-in" title="Aumentar zoom" aria-label="Aumentar zoom">
              <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" x2="16.65" y1="21" y2="16.65"/><line x1="11" x2="11" y1="8" y2="14"/><line x1="8" x2="14" y1="11" y2="11"/></svg>
            </button>
            <button class="mtl-icon-button" type="button" data-action="toggle-view-mode" title="Alternar modo de leitura" aria-label="Alternar modo de leitura">
              <svg viewBox="0 0 24 24" aria-hidden="true"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M21 9H3"/><path d="M21 15H3"/></svg>
            </button>
            <div class="mtl-font-popover-wrap">
              <button class="mtl-font-trigger" type="button" data-action="toggle-font-panel" aria-label="Abrir ajuste de fonte do overlay OCR">
                <span class="mtl-font-trigger-label">Aa</span>
                <svg viewBox="0 0 24 24" aria-hidden="true" class="mtl-chevron"><path d="m6 9 6 6 6-6"/></svg>
              </button>
              <div class="mtl-font-panel" hidden>
                <p class="mtl-panel-label">Tamanho da fonte</p>
                <div class="mtl-panel-row">
                  <button type="button" class="mtl-panel-step" data-action="font-scale-dec" aria-label="Diminuir fonte do overlay OCR">-</button>
                  <span class="mtl-panel-value" data-role="font-scale-label">100%</span>
                  <button type="button" class="mtl-panel-step" data-action="font-scale-inc" aria-label="Aumentar fonte do overlay OCR">+</button>
                </div>
                <p class="mtl-panel-label">Tipo de fonte</p>
                <select class="mtl-panel-select" data-role="font-family"></select>
                <p class="mtl-panel-label">Texto exibido</p>
                <div class="mtl-panel-grid2">
                  <button type="button" class="mtl-panel-choice" data-action="text-mode-translated">Traduzido</button>
                  <button type="button" class="mtl-panel-choice" data-action="text-mode-original">Original</button>
                </div>
                <p class="mtl-panel-label">Densidade</p>
                <div class="mtl-panel-row">
                  <button type="button" class="mtl-panel-step" data-action="density-dec" aria-label="Diminuir densidade do overlay OCR">-</button>
                  <span class="mtl-panel-value" data-role="density-label">2.0</span>
                  <button type="button" class="mtl-panel-step" data-action="density-inc" aria-label="Aumentar densidade do overlay OCR">+</button>
                </div>
                <p class="mtl-panel-label">Opacidade</p>
                <div class="mtl-panel-row">
                  <button type="button" class="mtl-panel-step" data-action="opacity-dec" aria-label="Diminuir opacidade do overlay OCR">-</button>
                  <span class="mtl-panel-value" data-role="opacity-label">100%</span>
                  <button type="button" class="mtl-panel-step" data-action="opacity-inc" aria-label="Aumentar opacidade do overlay OCR">+</button>
                </div>
                <p class="mtl-panel-label">Formato global</p>
                <div class="mtl-panel-grid2">
                  <button type="button" class="mtl-panel-choice" data-action="global-shape-rect">Retângulo</button>
                  <button type="button" class="mtl-panel-choice" data-action="global-shape-oval">Oval</button>
                </div>
                <p class="mtl-panel-label">Seleção de área</p>
                <button type="button" class="mtl-panel-choice mtl-panel-choice-full" data-action="toggle-selection-mode">Selecionar área</button>
                <p class="mtl-panel-hint">Esta opção seleciona a área que deseja traduzir manualmente.</p>
                <p class="mtl-panel-hint">2x no balão para editar. Ative "Arrastar" no menu para mover.</p>
              </div>
            </div>
          </div>
          <button class="mtl-icon-button mtl-more-toggle" type="button" data-action="toggle-topbar-more" title="Mais opções" aria-label="Mais opções" aria-expanded="false">
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></svg>
          </button>
          <button type="button" class="mtl-primary mtl-translate-trigger" data-action="process-all-pages">
            <span class="mtl-translate-spinner" aria-hidden="true"></span>
            <span class="mtl-translate-label">Traduzir</span>
          </button>
        </div>
      </header>
      <div class="mtl-progress" hidden>
        <div class="mtl-progress-head">
          <span class="mtl-progress-text">Processando...</span>
          <span class="mtl-progress-count"></span>
        </div>
        <div class="mtl-progress-track"><div class="mtl-progress-fill"></div></div>
      </div>
      <div class="mtl-image-stage"></div>
      <footer class="mtl-footer">
        <button type="button" data-action="prev">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>
          <span>Ant.</span>
        </button>
        <select name="page" aria-label="Página"></select>
        <button type="button" data-action="next">
          <span>Próx.</span>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>
        </button>
      </footer>
      <div class="mtl-logs-panel" role="dialog" aria-label="Logs da extensão" hidden>
        <div class="mtl-logs-card">
          <div class="mtl-logs-topstrip"></div>
          <div class="mtl-logs-head">
            <div class="mtl-logs-title">
              <div class="mtl-logs-heading">
                <strong>Logs</strong>
                <span>Eventos e requisições da extensão</span>
              </div>
              <div class="mtl-logs-tabs" role="tablist" aria-label="Tipo de log">
                <button type="button" data-action="logs-tab-events">Eventos</button>
                <button type="button" data-action="logs-tab-network">DevTools</button>
              </div>
            </div>
            <div class="mtl-logs-actions">
              <span data-role="logs-copy-status"></span>
              <button type="button" data-action="copy-logs">Copiar</button>
              <button type="button" data-action="clear-logs">Limpar</button>
              <button type="button" class="mtl-logs-close" data-action="close-logs" title="Fechar logs" aria-label="Fechar logs">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </button>
            </div>
          </div>
          <div class="mtl-logs-list" data-role="logs-list"></div>
        </div>
      </div>
      <div class="mtl-report-panel" role="dialog" aria-label="Reportar problema na tradução" hidden>
        <div class="mtl-report-card">
          <div class="mtl-report-head">
            <div>
              <strong>Reportar tradução</strong>
              <span>Ajude a revisar este balão</span>
            </div>
            <button type="button" class="mtl-report-close" data-action="close-report-modal" title="Fechar reporte" aria-label="Fechar reporte">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>
          <div class="mtl-report-body">
            <div class="mtl-report-form-content" data-role="report-form-content">
              <p class="mtl-report-info">
                Ao enviar, a área selecionada do balão e a tradução correspondente serão encaminhadas aos administradores para análise. Essas informações serão usadas para revisar erros e melhorar as traduções.
              </p>
              <div class="mtl-report-preview">
                <div>
                  <span>Texto detectado</span>
                  <p data-role="report-original">Sem texto OCR registrado.</p>
                </div>
                <div>
                  <span>Tradução exibida</span>
                  <p data-role="report-translated">Sem tradução registrada.</p>
                </div>
              </div>
              <fieldset class="mtl-report-options">
                <legend>Motivo</legend>
                <div data-role="report-reasons">${renderReportReasonOptions(MTL_TRANSLATION_REPORT_DEFAULT_REASON)}</div>
              </fieldset>
              <p class="mtl-report-consent">
                Clicar em Enviar confirma que você concorda com o envio dessas informações para análise administrativa.
              </p>
              <p class="mtl-report-status" data-role="report-status" hidden></p>
            </div>
            <div class="mtl-report-success" data-role="report-success" hidden>
              <strong>Report enviado com sucesso</strong>
              <p>Obrigado pelo feedback. A equipe vai analisar este balão para revisar problemas e melhorar as próximas traduções.</p>
            </div>
            <div class="mtl-report-actions">
              <button type="button" data-role="report-cancel" data-action="close-report-modal">Cancelar</button>
              <button type="button" class="mtl-primary" data-action="submit-report">Enviar</button>
            </div>
          </div>
        </div>
      </div>
    </section>
  `
}

function readerCss() {
  return `
    @import url('https://fonts.googleapis.com/css2?family=Bangers&family=Carter+One&family=Rubik+Mono+One&family=Audiowide&family=Permanent+Marker&family=Kalam&family=Luckiest+Guy&family=Changa+One&family=Bebas+Neue&family=Anton&family=Teko&family=Noto+Sans+KR&display=swap');
    :host { color-scheme: dark; }
    :host {
      --background: oklch(0.12 0.01 260);
      --foreground: oklch(0.95 0 0);
      --card: oklch(0.16 0.01 260);
      --card-foreground: oklch(0.95 0 0);
      --popover: oklch(0.16 0.01 260);
      --popover-foreground: oklch(0.95 0 0);
      --primary: oklch(0.65 0.2 330);
      --primary-foreground: oklch(0.98 0 0);
      --secondary: oklch(0.22 0.01 260);
      --secondary-foreground: oklch(0.95 0 0);
      --muted: oklch(0.22 0.01 260);
      --muted-foreground: oklch(0.65 0 0);
      --accent: oklch(0.55 0.15 280);
      --accent-foreground: oklch(0.98 0 0);
      --destructive: oklch(0.55 0.2 25);
      --destructive-foreground: oklch(0.98 0 0);
      --border: oklch(0.28 0.01 260);
      --input: oklch(0.22 0.01 260);
      --ring: oklch(0.65 0.2 330);
      --radius: 0.75rem;
    }
    * { box-sizing: border-box; }
    .mtl-reader {
      position: fixed;
      inset: 0;
      z-index: 2147483647;
      display: grid;
      grid-template-rows: auto 1fr auto;
      background: var(--background);
      color: var(--foreground);
      font-family: Geist, Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    button, select {
      min-height: 34px;
      border: 1px solid var(--border);
      border-radius: calc(var(--radius) - 2px);
      background: var(--input);
      color: var(--foreground);
      font: inherit;
    }
    button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 0 10px;
      cursor: pointer;
    }
    button svg {
      width: 18px;
      height: 18px;
      fill: none;
      stroke: currentColor;
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
      flex: none;
    }
    .mtl-icon-button {
      width: 36px;
      padding: 0;
    }
    .mtl-icon-button-active {
      border-color: var(--accent);
      background: color-mix(in oklch, var(--accent) 25%, var(--input));
      color: var(--foreground);
    }
    .mtl-primary {
      border-color: var(--primary);
      background: var(--primary);
      color: var(--primary-foreground);
    }
    button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    @keyframes mtl-spin {
      to { transform: rotate(360deg); }
    }
    .mtl-spin {
      animation: mtl-spin 1s linear infinite;
    }
    .mtl-topbar, .mtl-footer {
      display: flex;
      align-items: center;
      gap: 10px;
      border-color: var(--border);
      background: var(--card);
      padding: 10px;
    }
    .mtl-topbar {
      border-bottom: 1px solid var(--border);
    }
    .mtl-footer {
      justify-content: center;
      border-top: 1px solid var(--border);
    }
    .mtl-footer-hidden {
      display: none;
    }
    .mtl-logs-panel[hidden] {
      display: none;
    }
    .mtl-logs-panel {
      position: fixed;
      inset: 0;
      z-index: 40;
      display: flex;
      align-items: center;
      justify-content: center;
      background: color-mix(in oklch, var(--background) 82%, transparent);
      backdrop-filter: blur(6px);
      padding: 16px;
    }
    .mtl-logs-card {
      position: relative;
      display: flex;
      flex-direction: column;
      width: min(760px, 100%);
      max-height: min(620px, calc(100vh - 32px));
      overflow: hidden;
      border: 1px solid color-mix(in oklch, var(--primary) 28%, var(--border));
      border-radius: calc(var(--radius) + 4px);
      background: var(--card);
      color: var(--card-foreground);
      box-shadow:
        0 24px 60px rgb(0 0 0 / 50%),
        0 0 40px -12px color-mix(in oklch, var(--primary) 45%, transparent);
      animation: mtl-auth-pop 0.24s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .mtl-logs-topstrip {
      position: absolute;
      inset: 0 0 auto 0;
      height: 3px;
      background: linear-gradient(90deg, var(--primary), var(--accent), var(--primary));
    }
    .mtl-logs-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      border-bottom: 1px solid var(--border);
      padding: 12px 14px;
    }
    .mtl-logs-title {
      display: flex;
      align-items: center;
      gap: 12px;
      min-width: 0;
    }
    .mtl-logs-heading {
      display: grid;
      line-height: 1.25;
    }
    .mtl-logs-heading strong {
      font-size: 14px;
    }
    .mtl-logs-heading span {
      color: var(--muted-foreground);
      font-size: 11px;
    }
    .mtl-logs-close {
      width: 28px;
      height: 28px;
      min-height: 28px;
      padding: 0;
      border-color: transparent;
      background: transparent;
      color: var(--muted-foreground);
      transition: color 0.15s ease, background 0.15s ease, border-color 0.15s ease;
    }
    .mtl-logs-close svg {
      width: 15px;
      height: 15px;
    }
    .mtl-logs-close:hover {
      color: var(--foreground);
      background: color-mix(in oklch, var(--destructive) 16%, transparent);
      border-color: color-mix(in oklch, var(--destructive) 40%, var(--border));
    }
    .mtl-logs-tabs {
      display: flex;
      align-items: center;
      gap: 4px;
      border: 1px solid var(--border);
      border-radius: 8px;
      background: var(--input);
      padding: 3px;
    }
    .mtl-logs-tabs button {
      min-height: 28px;
      border: 0;
      border-radius: 6px;
      background: transparent;
      padding: 0 9px;
      font-size: 12px;
    }
    .mtl-logs-tabs button.mtl-logs-tab-on {
      background: var(--primary);
      color: var(--primary-foreground);
    }
    .mtl-logs-actions {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .mtl-logs-actions [data-role="logs-copy-status"] {
      min-width: 56px;
      color: var(--muted-foreground);
      font-size: 11px;
      text-align: right;
    }
    .mtl-logs-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
      overflow: auto;
      padding: 12px;
    }
    .mtl-logs-empty {
      border: 1px dashed var(--border);
      border-radius: 8px;
      color: var(--muted-foreground);
      padding: 18px;
      text-align: center;
      font-size: 13px;
    }
    .mtl-log-row {
      border: 1px solid var(--border);
      border-left: 4px solid var(--muted-foreground);
      border-radius: 8px;
      background: color-mix(in oklch, var(--muted) 45%, transparent);
      padding: 8px 10px;
    }
    .mtl-log-error {
      border-left-color: var(--destructive);
    }
    .mtl-log-warn {
      border-left-color: #facc15;
    }
    .mtl-log-info {
      border-left-color: var(--primary);
    }
    .mtl-log-meta {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
      color: var(--muted-foreground);
      font-size: 11px;
    }
    .mtl-network-meta em {
      color: var(--foreground);
      font-style: normal;
      font-weight: 700;
    }
    .mtl-log-copy {
      min-height: 20px;
      margin-left: auto;
      border-color: transparent;
      background: transparent;
      color: var(--muted-foreground);
      padding: 0 4px;
      font-size: 10px;
      opacity: 0.62;
    }
    .mtl-log-copy:hover {
      border-color: var(--border);
      background: color-mix(in oklch, var(--muted) 70%, transparent);
      color: var(--foreground);
      opacity: 1;
    }
    .mtl-log-row p {
      margin: 5px 0 0;
      font-size: 13px;
      line-height: 1.35;
      word-break: break-word;
    }
    .mtl-log-row pre {
      max-height: 160px;
      overflow: auto;
      margin: 6px 0 0;
      border-radius: 6px;
      background: rgb(0 0 0 / 28%);
      padding: 8px;
      color: var(--muted-foreground);
      font-size: 11px;
      white-space: pre-wrap;
      word-break: break-word;
    }
    .mtl-network-row details {
      margin-top: 6px;
    }
    .mtl-network-row summary {
      cursor: pointer;
      color: var(--muted-foreground);
      font-size: 12px;
    }
    .mtl-report-panel[hidden] {
      display: none;
    }
    .mtl-report-panel {
      position: fixed;
      inset: 0;
      z-index: 45;
      display: flex;
      align-items: center;
      justify-content: center;
      background: color-mix(in oklch, var(--background) 82%, transparent);
      backdrop-filter: blur(6px);
      padding: 16px;
    }
    .mtl-report-card {
      width: min(560px, 100%);
      max-height: min(650px, calc(100vh - 32px));
      overflow: auto;
      border: 1px solid color-mix(in oklch, var(--primary) 28%, var(--border));
      border-radius: calc(var(--radius) + 4px);
      background: var(--card);
      color: var(--card-foreground);
      box-shadow: 0 24px 60px rgb(0 0 0 / 50%);
      animation: mtl-auth-pop 0.24s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .mtl-report-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      border-bottom: 1px solid var(--border);
      padding: 14px;
    }
    .mtl-report-head > div {
      display: grid;
      line-height: 1.25;
    }
    .mtl-report-head strong {
      font-size: 15px;
    }
    .mtl-report-head span {
      color: var(--muted-foreground);
      font-size: 12px;
    }
    .mtl-report-close {
      width: 30px;
      height: 30px;
      min-height: 30px;
      padding: 0;
      border-color: transparent;
      background: transparent;
      color: var(--muted-foreground);
    }
    .mtl-report-close:hover {
      border-color: var(--border);
      color: var(--foreground);
    }
    .mtl-report-body {
      display: grid;
      gap: 12px;
      padding: 14px;
    }
    .mtl-report-form-content {
      display: grid;
      gap: 12px;
    }
    .mtl-report-form-content[hidden],
    .mtl-report-success[hidden] {
      display: none;
    }
    .mtl-report-info,
    .mtl-report-consent,
    .mtl-report-status {
      margin: 0;
      color: var(--muted-foreground);
      font-size: 12px;
      line-height: 1.45;
    }
    .mtl-report-preview {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
    }
    .mtl-report-preview > div {
      min-width: 0;
      border: 1px solid var(--border);
      border-radius: 8px;
      background: color-mix(in oklch, var(--muted) 35%, transparent);
      padding: 10px;
    }
    .mtl-report-preview span,
    .mtl-report-options legend {
      color: var(--muted-foreground);
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
    }
    .mtl-report-preview p {
      margin: 5px 0 0;
      max-height: 86px;
      overflow: auto;
      font-size: 13px;
      line-height: 1.35;
      white-space: pre-wrap;
      word-break: break-word;
    }
    .mtl-report-options {
      display: grid;
      gap: 8px;
      min-width: 0;
      margin: 0;
      border: 0;
      padding: 0;
    }
    .mtl-report-options > div {
      display: grid;
      gap: 8px;
    }
    .mtl-report-option {
      display: flex;
      align-items: center;
      gap: 8px;
      min-height: 38px;
      border: 1px solid var(--border);
      border-radius: 8px;
      background: var(--input);
      padding: 8px 10px;
      font-size: 13px;
    }
    .mtl-report-option input {
      flex: none;
      accent-color: color-mix(in oklch, var(--primary) 80%, white);
    }
    .mtl-report-status {
      border: 1px solid color-mix(in oklch, var(--primary) 30%, var(--border));
      border-radius: 8px;
      background: color-mix(in oklch, var(--primary) 12%, transparent);
      color: var(--foreground);
      padding: 9px 10px;
    }
    .mtl-report-success {
      display: grid;
      gap: 8px;
      border: 1px solid color-mix(in oklch, var(--primary) 32%, var(--border));
      border-radius: 8px;
      background: color-mix(in oklch, var(--primary) 12%, transparent);
      padding: 18px;
      text-align: center;
    }
    .mtl-report-success strong {
      font-size: 16px;
    }
    .mtl-report-success p {
      margin: 0;
      color: var(--muted-foreground);
      font-size: 13px;
      line-height: 1.45;
    }
    .mtl-report-actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      flex-wrap: wrap;
    }
    .mtl-title {
      display: grid;
      min-width: 160px;
      margin-right: auto;
      line-height: 1.2;
    }
    .mtl-title strong {
      font-size: 14px;
    }
    .mtl-title span {
      color: var(--muted-foreground);
      font-size: 12px;
    }
    .mtl-actions {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
      justify-content: flex-end;
    }
    .mtl-actions-secondary {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
    }
    .mtl-actions-secondary[hidden] { display: none; }
    .mtl-settings-menu-wrap {
      position: relative;
      z-index: 30;
    }
    .mtl-settings-menu[hidden] {
      display: none;
    }
    .mtl-settings-menu {
      position: absolute;
      top: calc(100% + 8px);
      left: 0;
      right: auto;
      z-index: 25;
      display: flex;
      flex-direction: column;
      gap: 8px;
      width: min(224px, calc(100vw - 20px));
      border: 1px solid var(--border);
      border-radius: var(--radius);
      background: var(--popover);
      color: var(--popover-foreground);
      padding: 10px;
      box-shadow: 0 12px 32px rgb(0 0 0 / 35%);
    }
    .mtl-settings-menu > .mtl-panel-label {
      margin: 0;
    }
    .mtl-settings-menu-item {
      justify-content: flex-start;
      width: 100%;
      min-height: 32px;
      text-align: left;
      font-size: 12px;
      gap: 8px;
      transition: border-color 0.15s ease, background 0.15s ease;
    }
    .mtl-settings-menu-item svg {
      width: 15px;
      height: 15px;
      color: var(--muted-foreground);
    }
    .mtl-settings-menu-item:hover {
      border-color: var(--accent);
      background: color-mix(in oklch, var(--accent) 18%, var(--input));
    }
    .mtl-settings-menu-item:hover svg {
      color: var(--foreground);
    }
    .mtl-settings-menu-item span {
      flex: 1;
    }
    .mtl-settings-menu-item small {
      border-radius: 999px;
      background: rgb(34 197 94 / 16%);
      color: #86efac;
      padding: 2px 6px;
      font-size: 10px;
      font-weight: 700;
    }
    .mtl-settings-menu-item small.mtl-settings-status-off {
      background: color-mix(in oklch, var(--muted) 70%, transparent);
      color: var(--muted-foreground);
    }
    @keyframes mtl-sheet-up {
      from { opacity: 0.6; transform: translateY(24px); }
      to { opacity: 1; transform: translateY(0); }
    }
    
    .mtl-more-toggle { display: none; }
    
    @media (min-width: 721px) {
      .mtl-actions-secondary[hidden] {
        display: flex !important;
      }
    }
    .mtl-badges {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
    }
    .mtl-badge {
      display: inline-flex;
      align-items: center;
      min-height: 22px;
      border-radius: 999px;
      background: var(--muted);
      color: var(--muted-foreground);
      padding: 0 8px;
      font-size: 12px;
      white-space: nowrap;
    }
    .mtl-badge-success {
      background: rgb(34 197 94 / 18%);
      color: #86efac;
    }
    .mtl-badge-warning {
      background: rgb(234 179 8 / 18%);
      color: #fde68a;
    }
    .mtl-badge-processing {
      background: color-mix(in oklch, var(--primary) 20%, transparent);
      color: var(--primary);
    }
    .mtl-zoom {
      min-width: 46px;
      text-align: center;
      color: var(--muted-foreground);
      font-size: 12px;
    }
    .mtl-image-stage {
      overflow: auto;
      padding: 16px;
      background: color-mix(in oklch, var(--muted) 30%, transparent);
    }
    .mtl-image-stage-scroll {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
    }
    .mtl-image-wrap {
      position: relative;
      margin: 0 auto;
      min-width: 280px;
      width: 100%;
      transform-origin: top center;
    }
    .mtl-image-wrap img {
      display: block;
      width: 100%;
      height: auto;
      margin: 0 auto;
      background: var(--muted);
    }
    .mtl-overlay {
      position: absolute;
      inset: 0;
      pointer-events: none;
    }
    .mtl-overlay-locked {
      pointer-events: auto;
    }
    .mtl-box {
      position: absolute;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      border: 0;
      border-radius: 4px;
      color: rgba(15, 23, 42, 0.96);
      padding: 0 4px;
      text-align: center;
      line-height: 1.12;
      font-weight: 700;
      text-wrap: balance;
      box-shadow: none;
      filter: none;
      backdrop-filter: none;
    }
    .mtl-box span {
      display: block;
      width: 100%;
      max-width: 100%;
      max-height: 100%;
      overflow: hidden;
      white-space: pre-wrap;
      word-break: break-word;
      overflow-wrap: anywhere;
      font-family: "Arial Narrow", "Roboto Condensed", "HelveticaNeue-CondensedBold", Impact, sans-serif;
      text-shadow: none;
    }
    .mtl-busy {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 8px;
      background: rgb(0 0 0 / 45%);
      color: #fff;
      font-weight: 700;
    }
    .mtl-busy svg {
      width: 28px;
      height: 28px;
      fill: none;
      stroke: currentColor;
      stroke-width: 2;
      stroke-linecap: round;
    }
    .mtl-capture-mode .mtl-topbar,
    .mtl-capture-mode .mtl-footer,
    .mtl-capture-mode .mtl-busy,
    .mtl-capture-mode .mtl-overlay,
    .mtl-capture-mode .mtl-empty-overlay {
      visibility: hidden;
    }
    .mtl-empty-overlay {
      position: absolute;
      left: 50%;
      top: 18px;
      transform: translateX(-50%);
      max-width: min(520px, calc(100% - 24px));
      border: 1px solid var(--border);
      border-radius: 8px;
      background: color-mix(in oklch, var(--card) 92%, transparent);
      color: var(--foreground);
      padding: 10px 12px;
      font-size: 13px;
      text-align: center;
      box-shadow: 0 8px 28px rgb(0 0 0 / 28%);
    }
    select[name="page"] {
      width: min(260px, 42vw);
      padding: 0 10px;
    }
    
    @media (max-width: 720px) {
      .mtl-topbar {
        align-items: stretch;
        flex-wrap: wrap;
        padding: 8px 10px;
        gap: 6px;
      }
      .mtl-title {
        min-width: 0;
        flex: 1;
      }
      
      .mtl-title strong {
        display: none;
      }
      .mtl-badges {
        gap: 4px;
      }
      .mtl-badge {
        min-height: 20px;
        padding: 0 6px;
        font-size: 11px;
      }
      .mtl-actions {
        width: 100%;
        justify-content: flex-start;
        gap: 8px;
      }
      .mtl-settings-menu {
        position: fixed;
        inset: auto 0 0 0;
        top: auto;
        width: auto;
        max-height: min(70dvh, 420px);
        overflow: auto;
        gap: 10px;
        border-bottom: 0;
        border-radius: 16px 16px 0 0;
        padding: 20px 14px calc(14px + env(safe-area-inset-bottom, 0px));
        box-shadow: 0 -18px 48px rgb(0 0 0 / 45%);
        animation: mtl-sheet-up 0.22s cubic-bezier(0.16, 1, 0.3, 1);
      }
      .mtl-settings-menu::before {
        content: '';
        position: fixed;
        inset: 0;
        z-index: -1;
        background: color-mix(in oklch, var(--background) 62%, transparent);
        backdrop-filter: blur(3px);
      }
      .mtl-settings-menu::after {
        content: '';
        position: absolute;
        top: 7px;
        left: 50%;
        width: 42px;
        height: 4px;
        transform: translateX(-50%);
        border-radius: 999px;
        background: color-mix(in oklch, var(--muted-foreground) 45%, transparent);
      }
      .mtl-settings-menu > .mtl-panel-label {
        font-size: 12px;
      }
      .mtl-settings-menu-item {
        min-height: 44px;
        font-size: 13px;
        border-radius: 10px;
      }
      .mtl-settings-menu-item svg {
        width: 17px;
        height: 17px;
      }
      .mtl-settings-menu-item small {
        font-size: 11px;
        padding: 3px 8px;
      }
      .mtl-logs-panel {
        align-items: stretch;
        justify-content: stretch;
        padding: 8px;
      }
      .mtl-logs-card {
        width: 100%;
        max-height: none;
        height: calc(100dvh - 16px);
        border-radius: 10px;
      }
      .mtl-logs-head {
        align-items: stretch;
        flex-direction: column;
        gap: 8px;
        padding: 10px;
      }
      .mtl-logs-title {
        align-items: stretch;
        flex-direction: column;
        gap: 8px;
      }
      .mtl-logs-tabs {
        width: 100%;
      }
      .mtl-logs-tabs button {
        flex: 1 1 0;
      }
      .mtl-logs-actions {
        width: 100%;
        justify-content: flex-end;
        flex-wrap: wrap;
      }
      .mtl-logs-actions [data-role="logs-copy-status"] {
        order: 10;
        width: 100%;
        min-width: 0;
        text-align: right;
      }
      .mtl-logs-list {
        min-height: 0;
        padding: 8px;
      }
      .mtl-log-row {
        padding: 8px;
      }
      .mtl-log-copy {
        margin-left: 0;
      }
      .mtl-report-panel {
        align-items: stretch;
        justify-content: stretch;
        padding: 8px;
      }
      .mtl-report-card {
        width: 100%;
        max-height: none;
        height: calc(100dvh - 16px);
        border-radius: 10px;
      }
      .mtl-report-head {
        padding: 12px;
      }
      .mtl-report-body {
        padding: 12px;
      }
      .mtl-report-preview {
        grid-template-columns: 1fr;
      }
      .mtl-report-actions {
        display: grid;
        grid-template-columns: 1fr 1fr;
      }
      
      .mtl-actions > .mtl-icon-button {
        flex: none;
      }
      .mtl-more-toggle {
        display: inline-flex;
      }
      .mtl-translate-trigger {
        flex: 1 1 auto;
      }
      .mtl-actions-secondary {
        flex-basis: 100%;
        order: 5;
        justify-content: center;
        margin-top: 4px;
        padding-top: 8px;
        border-top: 1px dashed var(--border);
      }
      .mtl-actions-secondary > * {
        flex: 1 1 auto;
      }
      .mtl-image-stage {
        padding: 8px;
      }
      .mtl-auth-overlay {
        padding: 10px;
      }
      .mtl-auth-modal {
        max-width: 100%;
        padding: 16px;
        gap: 12px;
      }
      .mtl-auth-grid {
        grid-template-columns: 1fr;
      }
    }

    
    .mtl-font-popover-wrap {
      position: relative;
    }
    .mtl-font-trigger {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      min-width: 52px;
      border-color: color-mix(in oklch, var(--primary) 40%, var(--border));
      background: color-mix(in oklch, var(--primary) 12%, var(--input));
      color: var(--primary);
      padding: 0 8px;
    }
    .mtl-font-trigger-label {
      font-size: 11px;
      font-weight: 600;
    }
    .mtl-chevron {
      width: 14px;
      height: 14px;
      transition: transform 0.15s ease;
    }
    .mtl-font-trigger-open {
      border-color: var(--primary);
      background: var(--primary);
      color: var(--primary-foreground);
    }
    .mtl-font-trigger-open .mtl-chevron {
      transform: rotate(180deg);
    }
    .mtl-font-panel[hidden] {
      display: none;
    }
    .mtl-font-panel {
      position: absolute;
      top: calc(100% + 8px);
      right: 0;
      z-index: 20;
      display: flex;
      flex-direction: column;
      gap: 8px;
      width: 224px;
      border: 1px solid var(--border);
      border-radius: var(--radius);
      background: var(--popover);
      color: var(--popover-foreground);
      padding: 10px;
      box-shadow: 0 12px 32px rgb(0 0 0 / 35%);
    }
    .mtl-panel-label {
      margin: 4px 0 0;
      color: var(--muted-foreground);
      font-size: 11px;
    }
    .mtl-panel-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 4px;
    }
    .mtl-panel-step {
      width: 28px;
      min-height: 28px;
      padding: 0;
    }
    .mtl-panel-value {
      min-width: 64px;
      text-align: center;
      font-size: 13px;
      font-weight: 600;
    }
    .mtl-panel-select {
      width: 100%;
      min-height: 32px;
      font-size: 12px;
    }
    .mtl-panel-grid2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 4px;
    }
    .mtl-panel-choice {
      min-height: 32px;
      font-size: 12px;
    }
    .mtl-panel-choice-full {
      width: 100%;
    }
    .mtl-panel-choice-on {
      border-color: var(--primary);
      background: var(--primary);
      color: var(--primary-foreground);
    }
    .mtl-panel-hint {
      margin: 2px 0 0;
      color: var(--muted-foreground);
      font-size: 10px;
      line-height: 1.4;
    }

    .mtl-translate-trigger {
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }

    
    .mtl-progress {
      display: flex;
      flex-direction: column;
      gap: 6px;
      padding: 10px 14px;
      border-bottom: 1px solid var(--border);
      background: color-mix(in oklch, var(--primary) 8%, var(--card));
    }
    .mtl-progress[hidden] { display: none; }
    .mtl-progress-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      font-size: 12px;
    }
    .mtl-progress-text {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-weight: 600;
      color: var(--foreground);
    }
    .mtl-progress-text::before {
      content: '';
      width: 13px;
      height: 13px;
      border: 2px solid color-mix(in oklch, var(--primary) 40%, transparent);
      border-top-color: var(--primary);
      border-radius: 50%;
      animation: mtl-spin 0.7s linear infinite;
      flex: none;
    }
    .mtl-progress-count {
      color: var(--muted-foreground);
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
    }
    .mtl-progress-track {
      position: relative;
      height: 6px;
      border-radius: 999px;
      background: color-mix(in oklch, var(--muted) 60%, transparent);
      overflow: hidden;
    }
    .mtl-progress-fill {
      position: absolute;
      inset: 0 auto 0 0;
      width: 0%;
      border-radius: 999px;
      background: linear-gradient(90deg, var(--primary), var(--accent));
      transition: width 0.25s ease;
    }
    .mtl-progress-fail {
      color: #fca5a5;
      font-weight: 600;
    }
    .mtl-translate-trigger-busy {
      opacity: 1 !important;
      cursor: progress !important;
      border-color: color-mix(in oklch, var(--primary) 55%, var(--border));
      background: color-mix(in oklch, var(--primary) 70%, var(--card));
      color: var(--primary-foreground);
    }
    .mtl-translate-trigger-busy .mtl-translate-spinner {
      display: inline-block;
    }
    .mtl-translate-spinner {
      display: none;
      width: 14px;
      height: 14px;
      border: 2px solid color-mix(in oklch, var(--primary-foreground) 45%, transparent);
      border-top-color: var(--primary-foreground);
      border-radius: 50%;
      animation: mtl-spin 0.7s linear infinite;
      flex: none;
    }

    
    .mtl-selection-draft {
      position: absolute;
      z-index: 15;
      border: 2px dashed var(--primary);
      background: color-mix(in oklch, var(--primary) 18%, transparent);
      pointer-events: none;
    }

    
    .mtl-box {
      pointer-events: auto;
      cursor: pointer;
    }
    .mtl-box-oval {
      border-radius: 999px;
    }
    .mtl-box-selected {
      box-shadow: 0 0 0 2px color-mix(in oklch, var(--primary) 60%, transparent);
    }
    .mtl-box-draggable {
      cursor: grab;
      touch-action: none;
    }
    .mtl-box-draggable:active {
      cursor: grabbing;
    }
    .mtl-overlay-locked .mtl-box {
      pointer-events: none;
    }

    
    .mtl-quick-editor {
      position: absolute;
      z-index: 30;
      display: flex;
      flex-direction: column;
      gap: 6px;
      width: 200px;
      transform: translate(-50%, -100%);
      margin-top: -10px;
      border: 1px solid var(--border);
      border-radius: var(--radius);
      background: var(--popover);
      color: var(--popover-foreground);
      padding: 8px;
      font-size: 11px;
      box-shadow: 0 12px 32px rgb(0 0 0 / 35%);
    }
    .mtl-qe-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 6px;
    }
    .mtl-qe-header {
      gap: 8px;
    }
    .mtl-qe-title {
      margin: 0;
      overflow: hidden;
      font-weight: 600;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .mtl-qe-close {
      min-height: 22px;
      padding: 0 6px;
      font-size: 11px;
    }
    .mtl-qe-label {
      color: var(--muted-foreground);
    }
    .mtl-qe-group {
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .mtl-qe-toggle, .mtl-qe-mini {
      min-height: 22px;
      padding: 0 8px;
      font-size: 11px;
    }
    .mtl-qe-toggle-on, .mtl-qe-mini-on {
      border-color: var(--primary);
      background: var(--primary);
      color: var(--primary-foreground);
    }
    .mtl-qe-step {
      width: 22px;
      min-height: 22px;
      padding: 0;
      font-size: 11px;
    }
    .mtl-qe-value {
      min-width: 40px;
      text-align: center;
      font-weight: 600;
    }
    .mtl-qe-delete {
      border-color: var(--destructive);
      background: color-mix(in oklch, var(--destructive) 18%, transparent);
      color: var(--destructive);
      min-height: 24px;
      padding: 0 8px;
      font-size: 11px;
    }
    .mtl-qe-report {
      min-height: 24px;
      border-color: color-mix(in oklch, var(--accent) 45%, var(--border));
      background: color-mix(in oklch, var(--accent) 12%, transparent);
      color: var(--foreground);
      padding: 0 8px;
      font-size: 11px;
    }
    .mtl-qe-reset {
      min-height: 24px;
      padding: 0 8px;
      font-size: 11px;
    }

    
    .mtl-auth-overlay {
      position: absolute;
      inset: 0;
      z-index: 500;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
    }
    .mtl-auth-overlay[hidden] { display: none; }
    .mtl-support-overlay {
      position: absolute;
      inset: 0;
      z-index: 510;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
    }
    .mtl-support-overlay[hidden] { display: none; }
    .mtl-support-body {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 14px;
      text-align: center;
    }
    .mtl-support-mark {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 64px;
      height: 64px;
      border-radius: 18px;
      background: color-mix(in oklch, var(--primary) 12%, transparent);
      color: var(--foreground);
    }
    .mtl-support-mark svg {
      width: 36px;
      height: 36px;
      stroke: none;
    }
    .mtl-support-star {
      position: absolute;
      top: -9px;
      right: -7px;
      font-size: 17px;
      color: #fbbf24;
      text-shadow: 0 0 8px rgb(251 191 36 / 70%);
    }
    .mtl-support-body h2 {
      margin: 0;
      font-size: 19px;
      font-weight: 700;
      color: var(--foreground);
    }
    .mtl-support-body p {
      margin: 0;
      color: var(--muted-foreground);
      font-size: 13px;
      line-height: 1.55;
    }
    .mtl-support-body p strong {
      color: var(--foreground);
    }
    .mtl-support-repo {
      display: flex;
      flex-direction: column;
      gap: 2px;
      width: 100%;
      border: 1px solid var(--border);
      border-radius: 10px;
      background: color-mix(in oklch, var(--muted) 35%, transparent);
      padding: 10px 12px;
      text-decoration: none;
      text-align: left;
      transition: border-color 0.15s ease, background 0.15s ease;
    }
    .mtl-support-repo:hover {
      border-color: color-mix(in oklch, var(--primary) 55%, var(--border));
      background: color-mix(in oklch, var(--muted) 55%, transparent);
    }
    .mtl-support-repo-name {
      color: var(--foreground);
      font-size: 13px;
      font-weight: 700;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .mtl-support-repo-hint {
      color: var(--muted-foreground);
      font-size: 11px;
    }
    .mtl-support-star-button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      width: 100%;
      min-height: 38px;
      border: 1px solid var(--primary);
      border-radius: calc(var(--radius) - 2px);
      text-decoration: none;
      font-size: 13px;
      font-weight: 600;
    }
    .mtl-support-later {
      width: 100%;
      min-height: 34px;
      border-color: transparent;
      background: transparent;
      color: var(--muted-foreground);
      font-size: 13px;
    }
    .mtl-support-later:hover {
      color: var(--foreground);
      background: color-mix(in oklch, var(--muted) 55%, transparent);
    }
    .mtl-auth-backdrop {
      position: absolute;
      inset: 0;
      background: color-mix(in oklch, var(--background) 82%, transparent);
      backdrop-filter: blur(6px);
    }
    .mtl-auth-modal {
      position: relative;
      width: 100%;
      max-width: 350px;
      max-height: calc(100% - 32px);
      overflow-y: auto;
      overflow-x: hidden;
      
      overscroll-behavior: contain;
      -webkit-overflow-scrolling: touch;
      display: flex;
      flex-direction: column;
      gap: 16px;
      border: 1px solid color-mix(in oklch, var(--primary) 28%, var(--border));
      border-radius: calc(var(--radius) + 4px);
      
      background:
        radial-gradient(160px 160px at calc(100% + 30px) -40px, color-mix(in oklch, var(--primary) 20%, transparent), transparent 70%),
        radial-gradient(170px 170px at -40px calc(100% + 40px), color-mix(in oklch, var(--accent) 16%, transparent), transparent 70%),
        radial-gradient(120% 60% at 100% 0%, color-mix(in oklch, var(--accent) 10%, transparent), transparent 60%),
        var(--card);
      color: var(--card-foreground);
      padding: 22px 20px 16px;
      box-shadow:
        0 24px 60px rgb(0 0 0 / 50%),
        0 0 40px -12px color-mix(in oklch, var(--primary) 45%, transparent);
      animation: mtl-auth-pop 0.24s cubic-bezier(0.16, 1, 0.3, 1);
    }
    @keyframes mtl-auth-pop {
      0% { opacity: 0; transform: translateY(10px) scale(0.97); }
      100% { opacity: 1; transform: translateY(0) scale(1); }
    }
    
    .mtl-auth-topstrip {
      position: absolute;
      inset: 0 0 auto 0;
      height: 3px;
      background: linear-gradient(90deg, var(--primary), var(--accent), var(--primary));
    }

    
    .mtl-auth-close {
      position: absolute;
      top: 12px;
      right: 12px;
      z-index: 2;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      min-height: 28px;
      padding: 0;
      border: 1px solid transparent;
      border-radius: 8px;
      background: transparent;
      color: var(--muted-foreground);
      cursor: pointer;
      transition: color 0.15s ease, background 0.15s ease, border-color 0.15s ease;
    }
    .mtl-auth-close svg {
      width: 15px;
      height: 15px;
      fill: none;
      stroke: currentColor;
      stroke-width: 2;
      stroke-linecap: round;
    }
    .mtl-auth-close:hover {
      color: var(--foreground);
      background: color-mix(in oklch, var(--destructive) 16%, transparent);
      border-color: color-mix(in oklch, var(--destructive) 40%, var(--border));
    }
    .mtl-auth-brand {
      position: relative;
      display: flex;
      align-items: center;
      gap: 11px;
      
      padding-right: 32px;
    }
    .mtl-auth-brand-mark {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      border-radius: 12px;
      background: linear-gradient(135deg, var(--primary), var(--accent));
      color: var(--primary-foreground);
      flex: none;
      box-shadow: 0 0 18px -4px color-mix(in oklch, var(--primary) 70%, transparent);
    }
    .mtl-auth-brand-mark svg {
      width: 21px;
      height: 21px;
      fill: none;
      stroke: currentColor;
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
    .mtl-auth-sparkle {
      position: absolute;
      top: -7px;
      right: -7px;
      font-size: 12px;
      color: var(--accent);
      text-shadow: 0 0 8px color-mix(in oklch, var(--accent) 80%, transparent);
      animation: mtl-auth-twinkle 2.4s ease-in-out infinite;
    }
    @keyframes mtl-auth-twinkle {
      0%, 100% { transform: scale(0.7) rotate(0deg); opacity: 0.45; }
      50% { transform: scale(1.1) rotate(30deg); opacity: 1; }
    }
    .mtl-auth-brand-text strong {
      display: block;
      font-size: 14.5px;
      letter-spacing: 0.01em;
    }
    .mtl-auth-brand-text strong em {
      font-style: normal;
      background: linear-gradient(100deg, color-mix(in oklch, var(--primary) 75%, white 25%), color-mix(in oklch, var(--accent) 60%, white 40%));
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
    }
    .mtl-auth-brand-text span { display: block; color: var(--muted-foreground); font-size: 11.5px; margin-top: 1px; }

    .mtl-auth-screen { position: relative; display: flex; flex-direction: column; gap: 14px; }
    .mtl-auth-screen[hidden] { display: none; }

    
    .mtl-auth-loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      padding: 20px 0 12px;
    }
    .mtl-auth-loading-ring {
      width: 28px;
      height: 28px;
      border-radius: 999px;
      border: 3px solid color-mix(in oklch, var(--primary) 25%, transparent);
      border-top-color: var(--primary);
      animation: mtl-spin 0.8s linear infinite;
    }
    .mtl-auth-hint { margin: 0; color: var(--muted-foreground); font-size: 13px; text-align: center; }

    
    .mtl-auth-offline {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
      padding: 10px 4px 4px;
      text-align: center;
    }
    .mtl-auth-offline-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 58px;
      height: 58px;
      border-radius: 999px;
      border: 1px solid color-mix(in oklch, var(--destructive) 40%, var(--border));
      background:
        radial-gradient(70% 70% at 50% 30%, color-mix(in oklch, var(--destructive) 22%, transparent), transparent),
        color-mix(in oklch, var(--destructive) 8%, var(--card));
      color: var(--destructive);
      box-shadow: 0 0 26px -8px color-mix(in oklch, var(--destructive) 55%, transparent);
      animation: mtl-auth-offline-pulse 2.4s ease-in-out infinite;
    }
    @keyframes mtl-auth-offline-pulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.05); }
    }
    .mtl-auth-offline-icon svg {
      width: 26px;
      height: 26px;
      fill: none;
      stroke: currentColor;
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
    .mtl-auth-offline strong { font-size: 16px; margin-top: 4px; }
    .mtl-auth-offline p {
      margin: 0;
      color: var(--muted-foreground);
      font-size: 12.5px;
      line-height: 1.55;
      max-width: 260px;
    }
    .mtl-auth-offline-url {
      display: inline;
      color: var(--foreground);
      font-weight: 600;
      word-break: break-all;
    }
    .mtl-auth-retry {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      width: 100%;
      min-height: 40px;
      margin-top: 8px;
      font-weight: 700;
      font-size: 13px;
      border: none;
      border-radius: calc(var(--radius) - 2px);
      background: linear-gradient(120deg, var(--primary), color-mix(in oklch, var(--primary) 65%, var(--accent)));
      color: var(--primary-foreground);
      box-shadow: 0 8px 22px -8px color-mix(in oklch, var(--primary) 75%, transparent);
      transition: filter 0.15s ease, transform 0.15s ease;
    }
    .mtl-auth-retry:hover { filter: brightness(1.08); }
    .mtl-auth-retry:active { transform: translateY(1px); }
    .mtl-auth-retry svg {
      width: 15px;
      height: 15px;
      fill: none;
      stroke: currentColor;
      stroke-width: 2.2;
      stroke-linecap: round;
      stroke-linejoin: round;
    }

    
    .mtl-auth-welcome {
      display: flex;
      flex-direction: column;
      gap: 2px;
      padding-top: 2px;
    }
    .mtl-auth-welcome strong { font-size: 17px; }
    .mtl-auth-welcome span { color: var(--muted-foreground); font-size: 12.5px; }

    
    .mtl-auth-terms-cards {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .mtl-auth-terms-card {
      display: flex;
      align-items: flex-start;
      gap: 9px;
      border-radius: calc(var(--radius) - 4px);
      background: color-mix(in oklch, var(--muted) 35%, transparent);
      padding: 8px 10px;
    }
    .mtl-auth-terms-card svg {
      width: 14px;
      height: 14px;
      flex: none;
      margin-top: 1px;
      fill: none;
      stroke: var(--primary);
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
    .mtl-auth-terms-card p {
      margin: 0;
      color: var(--muted-foreground);
      font-size: 10.5px;
      line-height: 1.5;
    }
    .mtl-auth-terms-card-warn {
      background: rgb(245 158 11 / 10%);
      border: 1px solid rgb(245 158 11 / 22%);
    }
    .mtl-auth-terms-card-warn svg { stroke: #f59e0b; }

    .mtl-auth-terms-accept {
      display: flex;
      align-items: flex-start;
      gap: 9px;
      border-radius: calc(var(--radius) - 4px);
      padding: 8px;
      cursor: pointer;
      transition: background 0.15s ease, box-shadow 0.15s ease;
    }
    .mtl-auth-terms-accept:hover { background: color-mix(in oklch, var(--muted) 30%, transparent); }
    .mtl-auth-terms-accept-error {
      background: color-mix(in oklch, var(--destructive) 10%, transparent);
      box-shadow: 0 0 0 1px color-mix(in oklch, var(--destructive) 50%, transparent);
    }
    .mtl-auth-terms-accept input[type="checkbox"] {
      appearance: auto;
      -webkit-appearance: auto;
      width: 15px;
      height: 15px;
      margin: 2px 0 0;
      flex: none;
      accent-color: var(--primary);
      cursor: pointer;
    }
    .mtl-auth-terms-accept span {
      color: var(--muted-foreground);
      font-size: 11.5px;
      line-height: 1.55;
    }
    .mtl-auth-terms-accept a {
      color: var(--primary);
      text-decoration: underline;
      text-underline-offset: 2px;
    }
    .mtl-auth-terms-error {
      margin: -6px 0 0;
      padding: 0 8px;
      color: var(--destructive);
      font-size: 11px;
    }
    .mtl-auth-terms-error[hidden] { display: none; }

    
    .mtl-auth-system-line {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      border: 1px solid color-mix(in oklch, var(--border) 70%, transparent);
      border-radius: 999px;
      background: color-mix(in oklch, var(--muted) 40%, transparent);
      padding: 5px 12px;
      font-size: 11px;
      color: var(--muted-foreground);
    }
    .mtl-auth-system-line span { flex: none; text-transform: uppercase; letter-spacing: 0.06em; font-size: 9.5px; }
    .mtl-auth-system-line strong {
      flex: 1;
      min-width: 0;
      color: var(--foreground);
      font-weight: 600;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      text-align: right;
    }

    
    .mtl-auth-section-label {
      display: flex;
      align-items: center;
      gap: 10px;
      color: var(--muted-foreground);
      font-size: 10.5px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }
    .mtl-auth-section-label::before,
    .mtl-auth-section-label::after {
      content: '';
      flex: 1;
      height: 1px;
      background: linear-gradient(90deg, transparent, color-mix(in oklch, var(--primary) 35%, var(--border)), transparent);
    }

    .mtl-auth-panel { display: flex; flex-direction: column; gap: 10px; }
    .mtl-auth-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
      gap: 8px;
    }
    .mtl-auth-form { display: flex; flex-direction: column; gap: 14px; }
    .mtl-auth-form label,
    .mtl-auth-panel label,
    .mtl-auth-grid label {
      display: flex;
      flex-direction: column;
      gap: 5px;
      min-width: 0;
      font-size: 11.5px;
      font-weight: 500;
      color: var(--muted-foreground);
    }

    
    .mtl-auth-field {
      position: relative;
      display: flex;
      align-items: center;
    }
    .mtl-auth-field svg {
      position: absolute;
      left: 11px;
      width: 15px;
      height: 15px;
      fill: none;
      stroke: var(--muted-foreground);
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
      pointer-events: none;
      transition: stroke 0.15s ease;
    }
    .mtl-auth-field:focus-within svg { stroke: var(--primary); }
    .mtl-auth-field input { padding-left: 34px !important; }

    .mtl-auth-form input,
    .mtl-auth-panel select {
      width: 100%;
      min-width: 0;
      max-width: 100%;
      box-sizing: border-box;
      min-height: 38px;
      border: 1px solid var(--border);
      border-radius: calc(var(--radius) - 2px);
      background: var(--input);
      color: var(--foreground);
      padding: 0 10px;
      font: inherit;
      font-size: 13px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      transition: border-color 0.15s ease, box-shadow 0.15s ease;
    }
    .mtl-auth-form input::placeholder { color: color-mix(in oklch, var(--muted-foreground) 65%, transparent); }
    .mtl-auth-form input:focus,
    .mtl-auth-panel select:focus {
      outline: none;
      border-color: color-mix(in oklch, var(--primary) 65%, var(--border));
      box-shadow: 0 0 0 3px color-mix(in oklch, var(--primary) 22%, transparent);
    }
    .mtl-auth-form input[aria-invalid="true"] {
      border-color: var(--destructive);
      box-shadow: 0 0 0 3px color-mix(in oklch, var(--destructive) 18%, transparent);
    }

    
    .mtl-auth-panel select {
      appearance: none;
      -webkit-appearance: none;
      padding-right: 30px;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23a887c2' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 9px center;
      cursor: pointer;
    }

    
    .mtl-auth-submit, .mtl-auth-continue {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      width: 100%;
      min-height: 42px;
      font-weight: 700;
      font-size: 13.5px;
      letter-spacing: 0.01em;
      border: none;
      border-radius: calc(var(--radius) - 2px);
      background: linear-gradient(120deg, var(--primary), color-mix(in oklch, var(--primary) 65%, var(--accent)));
      color: var(--primary-foreground);
      box-shadow: 0 8px 22px -8px color-mix(in oklch, var(--primary) 75%, transparent);
      transition: transform 0.15s ease, box-shadow 0.15s ease, filter 0.15s ease;
    }
    .mtl-auth-submit svg, .mtl-auth-continue svg {
      width: 16px;
      height: 16px;
      fill: none;
      stroke: currentColor;
      stroke-width: 2.2;
      stroke-linecap: round;
      stroke-linejoin: round;
      transition: transform 0.2s ease;
    }
    .mtl-auth-submit:hover, .mtl-auth-continue:hover {
      filter: brightness(1.08);
      box-shadow: 0 10px 26px -8px color-mix(in oklch, var(--primary) 90%, transparent);
    }
    .mtl-auth-submit:hover svg { transform: translateX(3px); }
    .mtl-auth-submit:active, .mtl-auth-continue:active { transform: translateY(1px) scale(0.99); }
    .mtl-auth-submit.is-busy, .mtl-auth-continue.is-busy, .mtl-auth-danger.is-busy {
      opacity: 0.7;
      pointer-events: none;
    }

    .mtl-auth-error {
      display: flex;
      align-items: center;
      gap: 8px;
      border: 1px solid color-mix(in oklch, var(--destructive) 45%, var(--border));
      border-radius: calc(var(--radius) - 2px);
      background: color-mix(in oklch, var(--destructive) 14%, transparent);
      color: var(--destructive);
      padding: 8px 10px;
      font-size: 12px;
    }
    .mtl-auth-error svg {
      width: 16px;
      height: 16px;
      flex: none;
      fill: none;
      stroke: currentColor;
      stroke-width: 2;
    }
    .mtl-auth-error[hidden] { display: none; }

    
    .mtl-auth-user-card {
      position: relative;
      overflow: hidden;
      border: 1px solid color-mix(in oklch, var(--primary) 30%, var(--border));
      border-radius: calc(var(--radius) - 2px);
      background:
        radial-gradient(130% 120% at 0% 0%, color-mix(in oklch, var(--primary) 13%, transparent), transparent 55%),
        color-mix(in oklch, var(--primary) 5%, var(--card));
      padding: 12px;
    }
    .mtl-auth-user-row { display: flex; align-items: center; gap: 11px; }
    .mtl-auth-avatar-wrap { position: relative; flex: none; }
    .mtl-auth-avatar {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      border-radius: 999px;
      background: linear-gradient(135deg, var(--primary), var(--accent));
      color: var(--primary-foreground);
      font-weight: 700;
      font-size: 13px;
      box-shadow:
        0 0 0 2px var(--card),
        0 0 0 3.5px color-mix(in oklch, var(--primary) 55%, transparent);
    }
    .mtl-auth-online-dot {
      position: absolute;
      right: -1px;
      bottom: -1px;
      width: 11px;
      height: 11px;
      border-radius: 999px;
      background: #4ade80;
      border: 2px solid var(--card);
      box-shadow: 0 0 6px rgb(74 222 128 / 60%);
    }
    .mtl-auth-user-info { display: flex; flex-direction: column; min-width: 0; flex: 1; }
    .mtl-auth-user-info span {
      color: color-mix(in oklch, var(--primary) 80%, white 20%);
      font-size: 9.5px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.07em;
    }
    .mtl-auth-user-info strong {
      font-size: 13.5px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .mtl-auth-user-info small {
      color: var(--muted-foreground);
      font-size: 11px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    
    .mtl-auth-danger {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      flex: none;
      min-height: 28px;
      border: 1px solid color-mix(in oklch, var(--destructive) 40%, var(--border));
      border-radius: 999px;
      background: color-mix(in oklch, var(--destructive) 12%, transparent);
      color: var(--destructive);
      padding: 0 11px;
      font-size: 11.5px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.15s ease, border-color 0.15s ease;
    }
    .mtl-auth-danger:hover {
      background: color-mix(in oklch, var(--destructive) 22%, transparent);
      border-color: color-mix(in oklch, var(--destructive) 60%, var(--border));
    }
    .mtl-auth-danger svg {
      width: 13px;
      height: 13px;
      fill: none;
      stroke: currentColor;
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
    }

    .mtl-auth-status {
      min-height: 14px;
      margin: 0;
      color: var(--muted-foreground);
      font-size: 11px;
      text-align: center;
    }
  `
}

function showInlineToast(message) {
  const toast = document.createElement('div')
  toast.textContent = message
  toast.style.cssText = [
    'position:fixed',
    'right:16px',
    'bottom:16px',
    'z-index:2147483647',
    'background:#151820',
    'color:#fff',
    'border:1px solid #353b47',
    'border-radius:8px',
    'padding:10px 12px',
    'font:13px system-ui,sans-serif',
    'box-shadow:0 10px 35px rgb(0 0 0 / 35%)',
  ].join(';')
  document.documentElement.append(toast)
  window.setTimeout(() => toast.remove(), 2800)
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function escapeAttr(value) {
  return escapeHtml(value).replaceAll('`', '&#096;')
}
