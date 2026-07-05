const READER_HOST_ID = 'manga-translator-local-reader-host'
const PAGE_SECTION_CACHE_PREFIX = 'mtl:page-section:'
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

// Ajustes por balão (painel do duplo toque) — mesmos min/max/step de components/section-reader.tsx.
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

// Portão de autenticação/config sobre o leitor (substitui o antigo popup).
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

// Referências do leitor atualmente aberto na página, usadas para reabrir o
// modal de auth (ícone da extensão / botão de conta) sem recriar o leitor.
let activeReaderShadow = null
let activeReaderState = null

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
    // ignore localStorage errors
  }
}

// --- Portão de autenticação/config sobre o leitor -------------------------
// Substitui o antigo popup: o leitor já abre por baixo, e este modal (login
// e depois config) fica por cima até o usuário confirmar.

function buildAuthOverlayMarkup() {
  return `
    <div class="mtl-auth-overlay" hidden>
      <div class="mtl-auth-backdrop"></div>
      <div class="mtl-auth-modal" role="dialog" aria-modal="true" aria-label="Manga Translator Local">
        <div class="mtl-auth-brand">
          <div class="mtl-auth-brand-mark">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
          </div>
          <div>
            <strong>Manga Translator Local</strong>
            <span>Leitor do navegador</span>
          </div>
        </div>

        <div class="mtl-auth-screen" data-screen="loading">
          <p class="mtl-auth-hint">Verificando sessão...</p>
        </div>

        <div class="mtl-auth-screen" data-screen="login" hidden>
          <div class="mtl-auth-system-line">
            <span>Sistema</span>
            <strong data-role="login-system-url">—</strong>
          </div>
          <form class="mtl-auth-form" data-role="login-form">
            <div class="mtl-auth-panel" data-role="login-panel">
              <label>
                Email
                <input data-role="login-email" type="email" placeholder="voce@exemplo.com" autocomplete="username">
              </label>
              <label>
                Senha
                <input data-role="login-password" type="password" placeholder="••••••••" autocomplete="current-password">
              </label>
            </div>
            <button type="submit" class="mtl-primary mtl-auth-submit" data-role="login-submit">Entrar</button>
          </form>
          <div class="mtl-auth-error" data-role="login-error" hidden>
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 8v5"/><path d="M12 16h.01"/></svg>
            <span data-role="login-error-text"></span>
          </div>
        </div>

        <div class="mtl-auth-screen" data-screen="main" hidden>
          <div class="mtl-auth-user-card">
            <div class="mtl-auth-user-row">
              <div class="mtl-auth-avatar" aria-hidden="true" data-role="avatar">U</div>
              <div class="mtl-auth-user-info">
                <span>Conectado</span>
                <strong data-role="user-name">—</strong>
                <small data-role="user-email">—</small>
              </div>
            </div>
            <button type="button" class="mtl-auth-danger" data-role="logout-button">Sair da conta</button>
          </div>

          <div class="mtl-auth-system-line">
            <span>Sistema</span>
            <strong data-role="system-url">—</strong>
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

          <button type="button" class="mtl-primary mtl-auth-continue" data-role="continue-button">Iniciar leitor</button>
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
  }
  overlay._mtlEls = els

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
        mtlShowLoginError(els, response?.error || 'Não foi possível entrar.')
        return
      }

      els.loginPassword.value = ''
      const settings = await chrome.runtime.sendMessage({ type: 'MTL_GET_SETTINGS' })
      await mtlPopulateProviderSelect(els, settings)
      mtlFillFormFromSettings(els, settings)
      mtlFillUserInfo(els, response.user)
      mtlShowAuthScreen(overlay, 'main')
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

  // Nunca deixa clique/scroll vazar para o leitor por baixo enquanto o portão está aberto.
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
      mtlShowAuthScreen(overlay, 'main')
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
    // Reader já aberto e nenhuma imagem específica pedida (ex.: clicou no
    // ícone de novo): não recria tudo, só reabre o portão de auth/config.
    if (existingHost && activeReaderShadow && activeReaderState && !message.imageUrl) {
      void runAuthGate(activeReaderShadow, activeReaderState)
      return
    }
    openReader(message.imageUrl || '')
  }
})

// Muitos sites de leitura têm atalhos de teclado globais (ex.: "m" para
// menu, setas para navegar) registrados em document/window que chamam
// preventDefault() no keydown — isso cancela a digitação mesmo com um input
// da extensão focado dentro do Shadow DOM, já que o evento ainda bubbla até
// lá. Barra a propagação de eventos de teclado que saem do nosso host antes
// que cheguem à página, sem afetar atalhos do site quando o foco está fora.
function stopKeyEventPropagation(event) {
  event.stopPropagation()
}

function attachKeyEventGuards(host) {
  const types = ['keydown', 'keyup', 'keypress', 'beforeinput', 'input']
  types.forEach((type) => {
    host.addEventListener(type, stopKeyEventPropagation, true)
  })
  return () => {
    types.forEach((type) => {
      host.removeEventListener(type, stopKeyEventPropagation, true)
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
  const removeKeyEventGuards = attachKeyEventGuards(host)

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
    // Painel "Aa" (config. global do overlay) — mesmos campos de section-reader.tsx.
    isFontPanelOpen: false,
    ocrOverlayFontScale: OCR_OVERLAY_DEFAULT_FONT_SCALE,
    ocrOverlayFontFamily: OCR_OVERLAY_FONT_FAMILY_DEFAULT,
    ocrOverlayDensity: OCR_OVERLAY_DENSITY_DEFAULT,
    ocrOverlayOpacity: OCR_OVERLAY_OPACITY_DEFAULT,
    ocrOverlayGlobalShape: 'rect',
    isSelectionMode: false,
    selectionDraft: null,
    // Ajustes por balão: chave `${pageUrl}::${itemId}` -> { shape, fontScale, sizeScale, density, hidden, dx, dy }.
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
  state.cleanupFns.push(removeKeyEventGuards)

  activeReaderShadow = shadow
  activeReaderState = state

  shadow.innerHTML = buildReaderMarkup(state)
  bindReader(shadow, host, state)
  renderReader(shadow, state)
  void loadSettings(state, shadow)
  // O leitor já fica visível (imagens, controles) por baixo; o portão de
  // auth/config sobe por cima e só libera o uso após login + confirmação.
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

  // Se já existe uma seção cacheada para esta página, puxa do site o que já foi
  // traduzido (sem reprocessar), para o leitor abrir já atualizado.
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
    // Seção não existe mais: limpa o cache local.
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
  // Ainda processando no site → acompanha o progresso até terminar.
  if (!allDone) void processAllPages(shadow, state, { force: false, syncSection: false })
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
    if (!target.closest('.mtl-quick-editor') && !target.closest('[data-ocr-item-key]') && state.selectedItem) {
      state.selectedItem = null
      renderReader(shadow, state)
    }

    if (!action) return

    if (action === 'close') {
      state.cleanupFns.forEach((cleanup) => cleanup())
      state.cleanupFns = []
      host.remove()
      if (activeReaderState === state) {
        activeReaderShadow = null
        activeReaderState = null
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
    if (action === 'toggle-overlay') {
      state.overlayMode = !state.overlayMode
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
      // Feedback imediato: marca sincronização e re-renderiza antes do await.
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
        // Re-consulta o wrap: renderReader reconstrói o innerHTML e detacha o nó antigo.
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

    // Cria/atualiza o retângulo de seleção diretamente no DOM.
    // NÃO chamamos renderReader durante o arrasto: ele reconstrói o innerHTML
    // do stage e destrói o <img>, deixando imgEl detached (getBoundingClientRect
    // passa a retornar 0x0 e a seleção congela).
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
        // Ao concluir uma seleção válida, desliga o modo seleção (igual ao site).
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

// Replica o fluxo do site (handleCreateOverlaySelectionBox): recorta a área,
// faz OCR via fila e traduz, atualizando o balão manual com o resultado.
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

    // Persiste no cache da página para o balão manual sobreviver ao recarregar o leitor.
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

function processCurrentPage(shadow, state, options = {}) {
  return processPageAt(shadow, state, state.pageIndex, options)
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
    // Mapa order_index -> URL da página (na ordem em que foram enviadas ao site).
    state.sectionOrderUrls = Array.isArray(response.uploadedUrls) ? response.uploadedUrls : null
    setCachedSectionIdForPage(window.location.href, state.syncedSectionId)
    state.activeStatus = response.skippedCount > 0
      ? `Seção criada no site. ${response.skippedCount} imagem(ns) não puderam ser enviada(s).`
      : 'Seção criada no site.'
    return true
  } catch (error) {
    state.error = error instanceof Error ? error.message : 'Não foi possível criar a seção no site.'
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
    return false
  } finally {
    state.isSyncingSection = false
    renderReader(shadow, state)
  }
}

async function ensureSectionSynced(shadow, state, options = {}) {
  // Se temos um ID (memória ou cache local), confirmamos no site se a seção
  // ainda existe. Deletada no site → o cache local não vale, cria de novo.
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
      // Seção existe: recupera. Só reprocessa se o usuário pediu (force).
      return options.force ? await reprocessSyncedSection(shadow, state) : true
    }

    if (check?.ok && check.exists === false) {
      // Confirmadamente deletada: limpa o cache e segue para criação.
      state.syncedSectionId = null
      setCachedSectionIdForPage(window.location.href, null)
    } else {
      // Não deu para confirmar (offline/401/500): não arrisca duplicar.
      state.error = check?.error || 'Não foi possível verificar a seção no site.'
      renderReader(shadow, state)
      return false
    }
  }

  return await createSectionForPages(shadow, state)
}

// Constantes de polling do estado da seção no site.
const SECTION_SYNC_INTERVAL_MS = 1500
const SECTION_SYNC_TIMEOUT_MS = 30 * 60 * 1000

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Resolve a URL da página a partir do order_index do site.
// Usa o mapa preciso (upload) quando disponível; senão assume ordem 1:1.
function mapOrderToPageUrl(state, orderIndex) {
  if (Array.isArray(state.sectionOrderUrls) && state.sectionOrderUrls[orderIndex]) {
    return state.sectionOrderUrls[orderIndex]
  }
  const page = state.pages[orderIndex]
  return page ? page.url : null
}

// Converte uma imagem já processada pelo site em um "processed" do leitor.
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

  // Persiste no cache para sobreviver ao recarregar o leitor.
  chrome.runtime.sendMessage({
    type: 'MTL_UPDATE_PAGE_CACHE',
    payload: { imageUrl: pageUrl, settings: state.settings, result },
  }).catch(() => {})
}

function isServerImageDone(image) {
  const status = String(image?.translation_status || '')
  const imgStatus = String(image?.status || '')
  // 'extracted' e 'translated' são ambos estados terminais de sucesso no site.
  return status === 'extracted' || status === 'translated' || status === 'completed' || imgStatus === 'completed'
}

function isServerImageFailed(image) {
  return String(image?.status || '') === 'error' || String(image?.translation_status || '') === 'failed'
}

// Imagem "resolvida" = não está mais pendente de processamento (concluída,
// falhou, ou não foi marcada para processar). Usada para saber se o lote acabou.
function isServerImageResolved(image) {
  if (isServerImageDone(image) || isServerImageFailed(image)) return true
  if (image && image.selected_for_processing === false) return true
  return false
}

// Novo fluxo: o site é a única fonte de processamento. A extensão cria/verifica
// a seção e faz polling do progresso, consumindo os resultados já traduzidos.
async function processAllPages(shadow, state, options = {}) {
  if (state.isProcessing || state.isBatchProcessing) return
  const force = Boolean(options.force)

  if (options.syncSection) {
    const synced = await ensureSectionSynced(shadow, state, { force })
    if (!synced) return
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
  const appliedOrders = new Set() // evita re-aplicar/re-cachear a mesma imagem

  while (!done && Date.now() - startedAt < SECTION_SYNC_TIMEOUT_MS) {
    const response = await chrome.runtime.sendMessage({
      type: 'MTL_GET_SECTION',
      payload: { sectionId: state.syncedSectionId, settings: state.settings },
    }).catch(() => null)

    if (response?.ok && response.exists === false) {
      // Seção sumiu no meio do caminho (deletada): interrompe.
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
  }

  state.isBatchProcessing = false
  state.batchProgress = null
  renderReader(shadow, state)
}

async function processPageAt(shadow, state, pageIndex, options = {}) {
  const page = state.pages[pageIndex]
  if (!page || state.isProcessing) return false

  let succeeded = false
  state.isProcessing = true
  state.processingPageUrl = page.url
  state.error = ''
  state.activeStatus = 'Extraindo balões e traduzindo...'
  renderReader(shadow, state)

  try {
    const response = await chrome.runtime.sendMessage({
      type: 'MTL_EXTRACT_AND_TRANSLATE_IMAGE',
      payload: {
        imageUrl: page.url,
        pageUrl: window.location.href,
        settings: state.settings,
        force: Boolean(options.force),
      },
    })
    if (!response?.ok) throw new Error(response?.error || 'Falha ao processar imagem.')
    let result = response.result
    let count = Array.isArray(result?.detections) ? result.detections.length : 0

    if (count === 0) {
      state.activeStatus = 'Tentando captura visual da página...'
      renderReader(shadow, state)
      const captured = await captureVisibleReaderImage(shadow, state, page)
      if (captured?.ok && Array.isArray(captured.result?.detections) && captured.result.detections.length > 0) {
        result = captured.result
        count = result.detections.length
      } else if (captured?.error) {
        result = {
          ...result,
          fallbackError: captured.error,
        }
      }
    }

    state.processedByUrl.set(page.url, result)
    succeeded = true
    const textCount = Number(result?.textDetectionsCount) || 0
    state.activeStatus = count > 0
      ? `${count} balões detectados, ${textCount} com texto OCR`
      : result?.fallbackError
        ? `OCR sem balões. Captura visual também falhou: ${result.fallbackError}`
        : 'OCR concluído, mas nenhum balão foi detectado nesta imagem.'
  } catch (error) {
    const originalError = error instanceof Error ? error.message : 'Falha ao processar imagem.'
    state.activeStatus = 'Download da imagem falhou. Tentando captura visual...'
    renderReader(shadow, state)

    const captured = await captureVisibleReaderImage(shadow, state, page)
    if (captured?.ok) {
      state.processedByUrl.set(page.url, captured.result)
      succeeded = true
      const count = Array.isArray(captured.result?.detections) ? captured.result.detections.length : 0
      const textCount = Number(captured.result?.textDetectionsCount) || 0
      state.error = ''
      state.activeStatus = count > 0
        ? `${count} balões detectados, ${textCount} com texto OCR`
        : `Captura visual processada, mas sem balões. Erro original: ${originalError}`
    } else {
      state.error = `${originalError} | Captura visual: ${captured?.error || 'falhou'}`
      state.activeStatus = ''
    }
  } finally {
    state.isProcessing = false
    state.processingPageUrl = null
    renderReader(shadow, state)
  }

  return succeeded
}

async function captureVisibleReaderImage(shadow, state, page) {
  const reader = shadow.querySelector('.mtl-reader')
  const image = shadow.querySelector(`img[data-page-url="${cssEscape(page.url)}"]`)
  if (!(reader instanceof HTMLElement) || !(image instanceof HTMLImageElement)) {
    return { ok: false, error: 'Imagem do leitor não encontrada para captura.' }
  }

  const rect = image.getBoundingClientRect()
  const clippedRect = {
    x: Math.max(0, rect.left),
    y: Math.max(0, rect.top),
    width: Math.min(window.innerWidth, rect.right) - Math.max(0, rect.left),
    height: Math.min(window.innerHeight, rect.bottom) - Math.max(0, rect.top),
  }
  if (clippedRect.width < 16 || clippedRect.height < 16) {
    return { ok: false, error: 'A imagem não está visível o suficiente para captura.' }
  }

  reader.classList.add('mtl-capture-mode')
  try {
    await nextFrame()
    await nextFrame()
    return await chrome.runtime.sendMessage({
      type: 'MTL_CAPTURE_EXTRACT_TRANSLATE',
      payload: {
        rect: clippedRect,
        devicePixelRatio: window.devicePixelRatio || 1,
        settings: state.settings,
      },
    })
  } finally {
    reader.classList.remove('mtl-capture-mode')
  }
}

function nextFrame() {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()))
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
  const overlayButton = shadow.querySelector('[data-action="toggle-overlay"]')
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
  if (overlayButton) overlayButton.textContent = state.overlayMode ? 'Overlay OCR' : 'Imagem limpa'
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
          <button class="mtl-icon-button" type="button" data-action="open-account" title="Conta e configurações" aria-label="Conta e configurações">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 21a8 8 0 0 0-16 0"/><circle cx="12" cy="7" r="4"/></svg>
          </button>
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
          <button type="button" data-action="toggle-overlay">Overlay OCR</button>
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
      }
      .mtl-title {
        min-width: 0;
        flex: 1;
      }
      .mtl-actions {
        width: 100%;
        justify-content: stretch;
      }
      .mtl-actions button {
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

    /* Painel "Aa" (config. global do overlay) */
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

    /* Barra de progresso do lote de tradução */
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

    /* Seleção manual de área */
    .mtl-selection-draft {
      position: absolute;
      z-index: 15;
      border: 2px dashed var(--primary);
      background: color-mix(in oklch, var(--primary) 18%, transparent);
      pointer-events: none;
    }

    /* Balões interativos (drag / seleção / duplo toque) */
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

    /* Editor rápido (duplo toque no balão) */
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
    .mtl-qe-reset {
      min-height: 24px;
      padding: 0 8px;
      font-size: 11px;
    }

    /* Portão de autenticação/config sobre o leitor (substitui o antigo popup) */
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
    .mtl-auth-backdrop {
      position: absolute;
      inset: 0;
      background: color-mix(in oklch, var(--background) 82%, transparent);
      backdrop-filter: blur(6px);
    }
    .mtl-auth-modal {
      position: relative;
      width: 100%;
      max-width: 340px;
      max-height: calc(100% - 32px);
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 14px;
      border: 1px solid var(--border);
      border-radius: var(--radius);
      background: var(--card);
      color: var(--card-foreground);
      padding: 20px;
      box-shadow: 0 24px 60px rgb(0 0 0 / 45%);
      animation: mtl-auth-pop 0.22s cubic-bezier(0.16, 1, 0.3, 1);
    }
    @keyframes mtl-auth-pop {
      0% { opacity: 0; transform: translateY(8px) scale(0.98); }
      100% { opacity: 1; transform: translateY(0) scale(1); }
    }
    .mtl-auth-brand {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .mtl-auth-brand-mark {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      border-radius: 10px;
      background: linear-gradient(135deg, var(--primary), var(--accent));
      color: var(--primary-foreground);
      flex: none;
    }
    .mtl-auth-brand-mark svg {
      width: 20px;
      height: 20px;
      fill: none;
      stroke: currentColor;
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
    .mtl-auth-brand strong { display: block; font-size: 14px; }
    .mtl-auth-brand span { display: block; color: var(--muted-foreground); font-size: 12px; }

    .mtl-auth-screen { display: flex; flex-direction: column; gap: 14px; }
    .mtl-auth-screen[hidden] { display: none; }
    .mtl-auth-hint { color: var(--muted-foreground); font-size: 13px; text-align: center; padding: 12px 0; }

    .mtl-auth-system-line {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      font-size: 12px;
      color: var(--muted-foreground);
    }
    .mtl-auth-system-line span { flex: none; }
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

    .mtl-auth-panel { display: flex; flex-direction: column; gap: 10px; }
    .mtl-auth-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
      gap: 8px;
    }
    .mtl-auth-form { display: flex; flex-direction: column; gap: 12px; }
    .mtl-auth-form label,
    .mtl-auth-panel label,
    .mtl-auth-grid label {
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: 0;
      font-size: 12px;
      color: var(--muted-foreground);
    }
    .mtl-auth-form input,
    .mtl-auth-panel select {
      width: 100%;
      min-width: 0;
      max-width: 100%;
      box-sizing: border-box;
      min-height: 36px;
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
    }
    .mtl-auth-form input[aria-invalid="true"] { border-color: var(--destructive); }

    .mtl-auth-submit, .mtl-auth-continue {
      width: 100%;
      min-height: 38px;
      font-weight: 600;
    }
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
      display: flex;
      flex-direction: column;
      gap: 10px;
      border: 1px solid var(--border);
      border-radius: calc(var(--radius) - 2px);
      background: color-mix(in oklch, var(--primary) 8%, var(--card));
      padding: 12px;
    }
    .mtl-auth-user-row { display: flex; align-items: center; gap: 10px; }
    .mtl-auth-avatar {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      border-radius: 999px;
      background: linear-gradient(135deg, var(--primary), var(--accent));
      color: var(--primary-foreground);
      font-weight: 700;
      font-size: 13px;
      flex: none;
    }
    .mtl-auth-user-info { display: flex; flex-direction: column; min-width: 0; }
    .mtl-auth-user-info span { color: var(--muted-foreground); font-size: 11px; }
    .mtl-auth-user-info strong {
      font-size: 13px;
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
      min-height: 32px;
      border: 1px solid color-mix(in oklch, var(--destructive) 45%, var(--border));
      border-radius: calc(var(--radius) - 2px);
      background: color-mix(in oklch, var(--destructive) 14%, transparent);
      color: var(--destructive);
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
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
