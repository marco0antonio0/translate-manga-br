try {
  importScripts('config.js')
} catch {
}

const DEFAULT_SETTINGS = {
  apiBaseUrl: resolveConfiguredApiBaseUrl(),
  sourceLang: resolveConfiguredValue('sourceLang', 'auto'),
  targetLang: resolveConfiguredValue('targetLang', 'pt-BR'),
  providerLang: resolveConfiguredValue('providerLang', 'google'),
}

const IMAGE_CACHE_PREFIX = 'reader:image:'

function resolveConfiguredApiBaseUrl() {
  const config = globalThis.MTL_EXTENSION_CONFIG && typeof globalThis.MTL_EXTENSION_CONFIG === 'object'
    ? globalThis.MTL_EXTENSION_CONFIG
    : {}
  return typeof config.apiBaseUrl === 'string' && config.apiBaseUrl.trim()
    ? config.apiBaseUrl.trim()
    : 'http://localhost:3080'
}

function resolveConfiguredValue(key, fallback) {
  const config = globalThis.MTL_EXTENSION_CONFIG && typeof globalThis.MTL_EXTENSION_CONFIG === 'object'
    ? globalThis.MTL_EXTENSION_CONFIG
    : {}
  return typeof config[key] === 'string' && config[key].trim()
    ? config[key].trim()
    : fallback
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'mtl-open-reader',
    title: 'Abrir no Manga Translator Local',
    contexts: ['page', 'image'],
  })
})

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== 'mtl-open-reader' || !tab?.id) return
  void openReaderInTab(tab, info.srcUrl || '')
})

// Sem popup: o clique no ícone abre o leitor direto na aba ativa (com o
// modal de login/config por cima).
const mtlActionApi = chrome.action
if (mtlActionApi?.onClicked) {
  mtlActionApi.onClicked.addListener((tab) => {
    void openReaderInTab(tab, '')
  })
}

async function openReaderInTab(tab, imageUrl) {
  if (!tab?.id) return
  const payload = { type: 'MTL_OPEN_READER', imageUrl: imageUrl || '' }

  try {
    await chrome.tabs.sendMessage(tab.id, payload)
    return
  } catch {
    // Provavelmente o content script ainda não foi injetado nesta aba
    // (aberta antes da instalação/atualização da extensão). Injeta e tenta de novo.
  }

  try {
    if (chrome.scripting?.executeScript) {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content-script.js'],
      })
    } else if (chrome.tabs?.executeScript) {
      await chrome.tabs.executeScript(tab.id, { file: 'content-script.js' })
    } else {
      return
    }
    await chrome.tabs.sendMessage(tab.id, payload)
  } catch (error) {
    console.error('MTL: não foi possível abrir o leitor nesta aba.', error)
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || typeof message !== 'object') return false

  if (message.type === 'MTL_GET_SETTINGS') {
    getSettings().then(sendResponse)
    return true
  }

  if (message.type === 'MTL_SAVE_SETTINGS') {
    saveSettings(message.settings).then(sendResponse)
    return true
  }

  if (message.type === 'MTL_EXTRACT_AND_TRANSLATE_IMAGE') {
    extractAndTranslateImage(message.payload).then(sendResponse)
    return true
  }

  if (message.type === 'MTL_CAPTURE_EXTRACT_TRANSLATE') {
    captureExtractAndTranslate(message.payload, sender).then(sendResponse)
    return true
  }

  if (message.type === 'MTL_TRANSLATE_TEXTS') {
    translateTexts(message.payload).then(sendResponse)
    return true
  }

  if (message.type === 'MTL_GET_OPENROUTER_STATUS') {
    getOpenRouterStatus(message.payload).then(sendResponse)
    return true
  }

  if (message.type === 'MTL_CREATE_SECTION_FROM_PAGES') {
    createSectionFromPages(message.payload).then(sendResponse)
    return true
  }

  if (message.type === 'MTL_REPROCESS_SECTION') {
    reprocessSection(message.payload).then(sendResponse)
    return true
  }

  if (message.type === 'MTL_CHECK_SESSION') {
    checkSession(message.payload).then(sendResponse)
    return true
  }

  if (message.type === 'MTL_LOGIN') {
    login(message.payload).then(sendResponse)
    return true
  }

  if (message.type === 'MTL_LOGOUT') {
    logout(message.payload).then(sendResponse)
    return true
  }

  if (message.type === 'MTL_OCR_TRANSLATE_CROP') {
    ocrTranslateCrop(message.payload).then(sendResponse)
    return true
  }

  if (message.type === 'MTL_UPDATE_PAGE_CACHE') {
    updatePageCache(message.payload).then(sendResponse)
    return true
  }

  if (message.type === 'MTL_CHECK_SECTION') {
    checkSectionExists(message.payload).then(sendResponse)
    return true
  }

  if (message.type === 'MTL_GET_SECTION') {
    getSectionDetail(message.payload).then(sendResponse)
    return true
  }

  return false
})

// Busca o detalhe completo da seção (imagens + itens de OCR já processados pelo site).
async function getSectionDetail(rawPayload) {
  try {
    const payload = rawPayload && typeof rawPayload === 'object' ? rawPayload : {}
    const settings = normalizeSettings({ ...(await getSettings()), ...payload.settings })
    const sectionId = Number(payload.sectionId)
    if (!Number.isFinite(sectionId) || sectionId <= 0) {
      throw new Error('Seção inválida.')
    }

    const response = await fetch(buildApiUrl(settings.apiBaseUrl, `/api/sections/${sectionId}`), {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
    })
    if (response.status === 404) return { ok: true, exists: false, section: null }
    const body = await readJson(response)
    if (!response.ok) {
      throw new Error(toErrorMessage(body, `Falha ao buscar seção (HTTP ${response.status}).`))
    }
    return { ok: true, exists: true, section: body }
  } catch (error) {
    return { ok: false, error: toErrorMessage(error, 'Não foi possível buscar a seção no site.') }
  }
}

// Verifica no site se uma seção ainda existe (GET /api/sections/{id}).
async function checkSectionExists(rawPayload) {
  try {
    const payload = rawPayload && typeof rawPayload === 'object' ? rawPayload : {}
    const settings = normalizeSettings({ ...(await getSettings()), ...payload.settings })
    const sectionId = Number(payload.sectionId)
    if (!Number.isFinite(sectionId) || sectionId <= 0) {
      return { ok: true, exists: false }
    }

    const response = await fetch(buildApiUrl(settings.apiBaseUrl, `/api/sections/${sectionId}`), {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
    })
    if (response.status === 404) return { ok: true, exists: false }
    if (!response.ok) {
      // Erros como 401/500 não confirmam ausência: sinaliza indefinido.
      return { ok: false, exists: null, status: response.status }
    }
    const section = await readJson(response)
    return { ok: true, exists: true, section }
  } catch (error) {
    return { ok: false, exists: null, error: toErrorMessage(error, 'Falha ao verificar seção no site.') }
  }
}

async function updatePageCache(rawPayload) {
  try {
    const payload = rawPayload && typeof rawPayload === 'object' ? rawPayload : {}
    const settings = normalizeSettings({ ...(await getSettings()), ...payload.settings })
    const imageUrl = typeof payload.imageUrl === 'string' ? payload.imageUrl : ''
    const result = payload.result && typeof payload.result === 'object' ? payload.result : null
    if (!imageUrl || !result || !Array.isArray(result.detections)) return { ok: false }

    const toPersist = Number.isFinite(Number(result.extractedAt))
      ? result
      : { ...result, extractedAt: Date.now() }
    const cacheKey = buildImageCacheKey(imageUrl, settings)
    await chrome.storage.local.set({ [cacheKey]: toPersist })
    return { ok: true }
  } catch (error) {
    return { ok: false, error: toErrorMessage(error, 'Falha ao atualizar cache da página.') }
  }
}

async function checkSession(rawPayload) {
  try {
    const payload = rawPayload && typeof rawPayload === 'object' ? rawPayload : {}
    const settings = normalizeSettings({ ...(await getSettings()), ...payload.settings })
    const response = await fetch(buildApiUrl(settings.apiBaseUrl, '/api/auth/me'), {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
    })
    if (!response.ok) return { ok: true, authenticated: false }

    const user = await readJson(response)
    return { ok: true, authenticated: true, user }
  } catch (error) {
    return { ok: false, error: toErrorMessage(error, 'Não foi possível verificar a sessão.') }
  }
}

async function login(rawPayload) {
  try {
    const payload = rawPayload && typeof rawPayload === 'object' ? rawPayload : {}
    const settings = normalizeSettings({ ...(await getSettings()), ...payload.settings })
    const email = typeof payload.email === 'string' ? payload.email.trim() : ''
    const password = typeof payload.password === 'string' ? payload.password : ''
    if (!email || !password) throw new Error('Informe email e senha.')

    const response = await fetch(buildApiUrl(settings.apiBaseUrl, '/api/auth/login'), {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const body = await readJson(response)
    if (!response.ok) {
      throw new Error(toErrorMessage(body, `Falha ao entrar (HTTP ${response.status}).`))
    }

    const sessionResponse = await checkSession(payload)
    if (!sessionResponse?.ok || !sessionResponse.authenticated) {
      throw new Error(sessionResponse?.error || 'Login enviado, mas a sessão não foi confirmada pelo servidor.')
    }

    return { ok: true, authenticated: true, user: sessionResponse.user || null }
  } catch (error) {
    return { ok: false, error: toErrorMessage(error, 'Não foi possível entrar.') }
  }
}

async function logout(rawPayload) {
  try {
    const payload = rawPayload && typeof rawPayload === 'object' ? rawPayload : {}
    const settings = normalizeSettings({ ...(await getSettings()), ...payload.settings })
    const response = await fetch(buildApiUrl(settings.apiBaseUrl, '/api/auth/logout'), {
      method: 'POST',
      credentials: 'include',
    })
    if (!response.ok) {
      const body = await readJson(response)
      throw new Error(toErrorMessage(body, `Falha ao sair (HTTP ${response.status}).`))
    }
    return { ok: true }
  } catch (error) {
    return { ok: false, error: toErrorMessage(error, 'Não foi possível sair.') }
  }
}

async function getOpenRouterStatus(rawPayload) {
  try {
    const payload = rawPayload && typeof rawPayload === 'object' ? rawPayload : {}
    const settings = normalizeSettings({ ...(await getSettings()), ...payload.settings })
    const response = await fetch(buildApiUrl(settings.apiBaseUrl, '/api/openrouter'), {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
    })
    if (response.status === 401 || response.status === 403) {
      return { ok: true, available: false, availableModels: [], selectedModel: null }
    }

    const body = await readJson(response)
    if (!response.ok) {
      throw new Error(toErrorMessage(body, `Falha ao verificar OpenRouter (HTTP ${response.status}).`))
    }

    const availableModels = Array.isArray(body?.availableModels)
      ? body.availableModels.map((model) => String(model || '').trim()).filter(Boolean)
      : []
    const selectedModel = typeof body?.selectedModel === 'string' && body.selectedModel.trim()
      ? body.selectedModel.trim()
      : null
    const available = Boolean(body?.hasApiKey && body?.isValid && availableModels.length > 0)

    return { ok: true, available, availableModels, selectedModel }
  } catch (error) {
    return {
      ok: false,
      available: false,
      availableModels: [],
      selectedModel: null,
      error: toErrorMessage(error, 'Não foi possível verificar o OpenRouter.'),
    }
  }
}

async function createSectionFromPages(rawPayload) {
  try {
    const payload = rawPayload && typeof rawPayload === 'object' ? rawPayload : {}
    const settings = normalizeSettings({ ...(await getSettings()), ...payload.settings })
    const pages = Array.isArray(payload.pages) ? payload.pages : []
    const title = normalizeSectionTitle(payload.title)
    const pageUrl = typeof payload.pageUrl === 'string' ? payload.pageUrl : ''
    if (pages.length === 0) throw new Error('Nenhuma imagem encontrada para criar a seção.')

    const formData = new FormData()
    formData.append('name', title)
    formData.append('priority', '10')
    formData.append('source_lang', settings.sourceLang)
    formData.append('target_lang', settings.targetLang)
    formData.append('provider_lang', settings.providerLang)

    let appendedCount = 0
    let skippedCount = 0
    // URLs efetivamente enviadas, na mesma ordem em que viram order_index no site.
    const uploadedUrls = []
    for (let index = 0; index < pages.length; index += 1) {
      const page = pages[index] && typeof pages[index] === 'object' ? pages[index] : {}
      const imageUrl = typeof page.url === 'string' ? page.url : ''
      if (!imageUrl) {
        skippedCount += 1
        continue
      }

      try {
        const blob = await downloadImageForSection(imageUrl, pageUrl)
        const fileName = sectionImageFileName(page, imageUrl, appendedCount)
        formData.append('files', blob, fileName)
        uploadedUrls.push(imageUrl)
        appendedCount += 1
      } catch {
        skippedCount += 1
      }
    }

    if (appendedCount === 0) {
      throw new Error('Não foi possível baixar nenhuma imagem para criar a seção.')
    }

    const response = await fetch(buildApiUrl(settings.apiBaseUrl, '/api/sections'), {
      method: 'POST',
      credentials: 'include',
      body: formData,
    })
    const body = await readJson(response)
    if (!response.ok) {
      throw new Error(toErrorMessage(body, `Falha ao criar seção (HTTP ${response.status}).`))
    }

    const sectionId = Number(body?.section?.id || body?.id)
    return {
      ok: true,
      sectionId: Number.isFinite(sectionId) && sectionId > 0 ? sectionId : null,
      uploadedCount: appendedCount,
      skippedCount,
      uploadedUrls,
    }
  } catch (error) {
    return { ok: false, error: toErrorMessage(error, 'Não foi possível criar a seção no site.') }
  }
}

async function reprocessSection(rawPayload) {
  try {
    const payload = rawPayload && typeof rawPayload === 'object' ? rawPayload : {}
    const settings = normalizeSettings({ ...(await getSettings()), ...payload.settings })
    const sectionId = Number(payload.sectionId)
    if (!Number.isFinite(sectionId) || sectionId <= 0) {
      throw new Error('Seção inválida para reprocessar.')
    }

    const response = await fetch(buildApiUrl(settings.apiBaseUrl, `/api/sections/${sectionId}/reprocess`), {
      method: 'POST',
      credentials: 'include',
    })
    const body = await readJson(response)
    if (!response.ok) {
      throw new Error(toErrorMessage(body, `Falha ao reprocessar seção (HTTP ${response.status}).`))
    }
    return { ok: true, sectionId }
  } catch (error) {
    return { ok: false, error: toErrorMessage(error, 'Não foi possível reprocessar a seção no site.') }
  }
}

async function downloadImageForSection(imageUrl, pageUrl) {
  const response = await fetch(imageUrl, {
    method: 'GET',
    credentials: 'include',
    cache: 'no-store',
    referrer: isHttpUrl(pageUrl) ? pageUrl : undefined,
    referrerPolicy: 'unsafe-url',
  })
  if (!response.ok) throw new Error(`Imagem HTTP ${response.status}`)

  const blob = await response.blob()
  if (blob.type && !blob.type.startsWith('image/')) {
    throw new Error('URL não retornou uma imagem.')
  }
  return blob.type
    ? blob
    : new Blob([await blob.arrayBuffer()], { type: guessImageMimeType(imageUrl) })
}

function normalizeSectionTitle(value) {
  const normalized = typeof value === 'string'
    ? value.replace(/\s+/g, ' ').trim()
    : ''
  return (normalized || 'Mangá importado do navegador').slice(0, 180)
}

function sectionImageFileName(page, imageUrl, index) {
  const rawName = typeof page.alt === 'string' ? page.alt : ''
  const base = rawName.replace(/\.[a-z0-9]{2,5}$/i, '').replace(/[^\w.-]+/g, '-').replace(/^-+|-+$/g, '')
  const extension = (() => {
    try {
      const path = new URL(imageUrl).pathname
      const match = path.match(/\.([a-z0-9]{2,5})$/i)
      return match ? `.${match[1].toLowerCase()}` : `.${guessImageMimeType(imageUrl).split('/')[1] || 'png'}`
    } catch {
      return '.png'
    }
  })()
  return `${String(index + 1).padStart(4, '0')}-${base || 'pagina'}${extension}`
}

async function getSettings() {
  const stored = await chrome.storage.sync.get(DEFAULT_SETTINGS)
  return normalizeSettings(stored)
}

async function saveSettings(rawSettings) {
  const settings = normalizeSettings(rawSettings)
  await chrome.storage.sync.set(settings)
  return { ok: true, settings }
}

function normalizeSettings(rawValue) {
  const raw = rawValue && typeof rawValue === 'object' ? rawValue : {}
  const apiBaseUrl = DEFAULT_SETTINGS.apiBaseUrl
  const sourceLang = normalizeLang(raw.sourceLang, DEFAULT_SETTINGS.sourceLang)
  const targetLang = normalizeLang(raw.targetLang, DEFAULT_SETTINGS.targetLang)
  const providerLang = normalizeLang(raw.providerLang, DEFAULT_SETTINGS.providerLang)

  return { apiBaseUrl, sourceLang, targetLang, providerLang }
}

function normalizeBaseUrl(value, fallback) {
  if (typeof value !== 'string') return fallback
  const trimmed = value.trim().replace(/\/+$/, '')
  if (!trimmed) return fallback

  try {
    const url = new URL(trimmed)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return fallback
    return url.toString().replace(/\/+$/, '')
  } catch {
    return fallback
  }
}

function normalizeLang(value, fallback) {
  if (typeof value !== 'string') return fallback
  const trimmed = value.trim()
  return trimmed || fallback
}

function buildApiUrl(apiBaseUrl, path) {
  return `${normalizeBaseUrl(apiBaseUrl, DEFAULT_SETTINGS.apiBaseUrl)}${path}`
}

async function extractAndTranslateImage(rawPayload) {
  try {
    const payload = rawPayload && typeof rawPayload === 'object' ? rawPayload : {}
    const settings = normalizeSettings({ ...(await getSettings()), ...payload.settings })
    const imageUrl = typeof payload.imageUrl === 'string' ? payload.imageUrl : ''
    const pageUrl = typeof payload.pageUrl === 'string' ? payload.pageUrl : ''
    const force = Boolean(payload.force)
    if (!imageUrl) throw new Error('Imagem sem URL.')

    const cacheKey = buildImageCacheKey(imageUrl, settings)
    const cached = force ? {} : await chrome.storage.local.get(cacheKey)
    if (!force && isValidImageCache(cached[cacheKey])) {
      return { ok: true, cached: true, result: cached[cacheKey] }
    }

    const imageResponse = await fetch(imageUrl, {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
      referrer: isHttpUrl(pageUrl) ? pageUrl : undefined,
      referrerPolicy: 'unsafe-url',
    })
    if (!imageResponse.ok) {
      throw new Error(`Não foi possível baixar a imagem. HTTP ${imageResponse.status}.`)
    }

    const rawBlob = await imageResponse.blob()
    if (rawBlob.type && !rawBlob.type.startsWith('image/')) {
      throw new Error('O endereço selecionado não retornou uma imagem.')
    }
    const sourceImageBlob = rawBlob.type
      ? rawBlob
      : new Blob([rawBlob], { type: guessImageMimeType(imageUrl) })
    const imageBlob = await convertImageBlobToPng(sourceImageBlob).catch(() => sourceImageBlob)

    const result = await extractAndTranslateBlob({
      blob: imageBlob,
      fileName: imageFileNameFromUrl(imageUrl, imageBlob.type || 'image/png'),
      settings,
    })

    if (Array.isArray(result.detections) && result.detections.length > 0) {
      await chrome.storage.local.set({ [cacheKey]: result })
    } else {
      await chrome.storage.local.remove(cacheKey)
    }
    return { ok: true, cached: false, result }
  } catch (error) {
    return { ok: false, error: toErrorMessage(error, 'Falha ao processar imagem.') }
  }
}

async function captureExtractAndTranslate(rawPayload, sender) {
  try {
    if (!sender.tab?.windowId) {
      throw new Error('A aba ativa não está disponível para captura.')
    }

    const payload = rawPayload && typeof rawPayload === 'object' ? rawPayload : {}
    const settings = normalizeSettings({ ...(await getSettings()), ...payload.settings })
    const rect = normalizeCaptureRect(payload.rect)
    const devicePixelRatio = toPositiveNumber(payload.devicePixelRatio) || 1
    if (!rect) throw new Error('Área de captura inválida.')

    const screenshotUrl = await chrome.tabs.captureVisibleTab(sender.tab.windowId, {
      format: 'png',
    })
    const screenshotBlob = await (await fetch(screenshotUrl)).blob()
    const croppedBlob = await cropImageBlob(screenshotBlob, rect, devicePixelRatio)
    const imageDataUrl = await blobToDataUrl(croppedBlob)
    const result = await extractAndTranslateBlob({
      blob: croppedBlob,
      fileName: 'browser-visible-page.png',
      settings,
    })

    return {
      ok: true,
      result: {
        ...result,
        imageDataUrl,
        source: 'visible-tab-capture',
      },
    }
  } catch (error) {
    return { ok: false, error: toErrorMessage(error, 'Falha ao capturar e processar imagem visível.') }
  }
}

async function extractAndTranslateBlob({ blob, fileName, settings }) {
  const formData = new FormData()
  formData.append('file', blob, fileName)

  const extractResponse = await fetch(buildApiUrl(settings.apiBaseUrl, '/api/translate/extract'), {
    method: 'POST',
    body: formData,
  })
  const extractPayload = await readJson(extractResponse)
  if (!extractResponse.ok) {
    throw new Error(toErrorMessage(extractPayload, 'Erro ao extrair texto da imagem.'))
  }

  const detections = normalizeDetections(extractPayload)
  const texts = detections
    .filter((item) => item.hasText)
    .map((item) => item.ocrText)
    .filter(Boolean)
  const translations = texts.length > 0
    ? await translateBatch(settings, texts)
    : []

  let cursor = 0
  const translatedDetections = detections.map((item) => {
    if (!item.hasText) return item
    const translatedText = translations[cursor] || item.ocrText
    cursor += 1
    return { ...item, translatedText }
  })

  return {
    width: toPositiveNumber(extractPayload?.width) || 0,
    height: toPositiveNumber(extractPayload?.height) || 0,
    rawDetectionsCount: Array.isArray(extractPayload?.detections) ? extractPayload.detections.length : 0,
    textDetectionsCount: translatedDetections.filter((item) => item.hasText).length,
    detections: translatedDetections,
    sourceLang: settings.sourceLang,
    targetLang: settings.targetLang,
    providerLang: settings.providerLang,
    extractedAt: Date.now(),
  }
}

// Constantes de polling da fila de OCR — iguais às de components/section-reader.tsx.
const OCR_QUEUE_POLL_INTERVAL_MS = 900
const OCR_QUEUE_POLL_TIMEOUT_MS = 45000

// Replica o fluxo do site para uma área selecionada manualmente:
// baixa a imagem original, recorta a área, faz OCR via fila e traduz o texto.
async function ocrTranslateCrop(rawPayload) {
  try {
    const payload = rawPayload && typeof rawPayload === 'object' ? rawPayload : {}
    const settings = normalizeSettings({ ...(await getSettings()), ...payload.settings })
    const imageUrl = typeof payload.imageUrl === 'string' ? payload.imageUrl : ''
    const pageUrl = typeof payload.pageUrl === 'string' ? payload.pageUrl : ''
    const box = Array.isArray(payload.box) ? payload.box.map(Number) : null
    const refSize = payload.refSize && typeof payload.refSize === 'object' ? payload.refSize : null
    if (!imageUrl) throw new Error('Imagem sem URL para OCR da área.')
    if (!box || box.length !== 4 || !box.every(Number.isFinite)) {
      throw new Error('Área inválida para OCR.')
    }

    const imageResponse = await fetch(imageUrl, {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
      referrer: isHttpUrl(pageUrl) ? pageUrl : undefined,
      referrerPolicy: 'unsafe-url',
    })
    if (!imageResponse.ok) {
      throw new Error(`Não foi possível baixar a imagem. HTTP ${imageResponse.status}.`)
    }
    const rawBlob = await imageResponse.blob()
    const sourceImageBlob = rawBlob.type
      ? rawBlob
      : new Blob([rawBlob], { type: guessImageMimeType(imageUrl) })

    const croppedBlob = await cropImageBlobToBox(sourceImageBlob, box, refSize)
    const ocrText = (await ocrImageViaQueue(settings, croppedBlob, 'overlay-selection.png')).trim()
    const baseText = ocrText || '[sem texto detectado]'
    const translations = ocrText ? await translateBatch(settings, [baseText]) : []
    const translatedText = translations[0] || baseText

    return { ok: true, ocrText: baseText, translatedText, hasText: Boolean(ocrText) }
  } catch (error) {
    return { ok: false, error: toErrorMessage(error, 'Falha ao processar a área selecionada.') }
  }
}

// Recorta um box (em coordenadas do refSize) direto do blob da imagem original.
async function cropImageBlobToBox(blob, box, refSize) {
  if (typeof createImageBitmap !== 'function' || typeof OffscreenCanvas === 'undefined') {
    throw new Error('Recorte de área não está disponível neste navegador.')
  }
  const bitmap = await createImageBitmap(blob)
  try {
    const refWidth = Number(refSize?.width) || bitmap.width
    const refHeight = Number(refSize?.height) || bitmap.height
    const scaleX = bitmap.width / Math.max(1, refWidth)
    const scaleY = bitmap.height / Math.max(1, refHeight)

    const [x1Raw, y1Raw, x2Raw, y2Raw] = box
    const x1 = Math.min(x1Raw, x2Raw)
    const y1 = Math.min(y1Raw, y2Raw)
    const x2 = Math.max(x1Raw, x2Raw)
    const y2 = Math.max(y1Raw, y2Raw)

    const cropX = Math.max(0, Math.floor(x1 * scaleX))
    const cropY = Math.max(0, Math.floor(y1 * scaleY))
    const cropW = Math.max(1, Math.min(bitmap.width - cropX, Math.ceil((x2 - x1) * scaleX)))
    const cropH = Math.max(1, Math.min(bitmap.height - cropY, Math.ceil((y2 - y1) * scaleY)))
    if (cropW <= 1 || cropH <= 1) throw new Error('Área muito pequena para OCR.')

    const canvas = new OffscreenCanvas(cropW, cropH)
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Falha ao preparar recorte da área selecionada.')
    context.drawImage(bitmap, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH)
    return await canvas.convertToBlob({ type: 'image/png' })
  } finally {
    bitmap.close?.()
  }
}

// Enfileira o OCR e faz polling até concluir — mesma sequência de rotas do site.
async function ocrImageViaQueue(settings, blob, fileName) {
  const formData = new FormData()
  formData.append('file', blob, fileName || 'crop.png')

  const queueResponse = await fetch(buildApiUrl(settings.apiBaseUrl, '/api/ocr-image/queue'), {
    method: 'POST',
    credentials: 'include',
    body: formData,
  })
  const queueData = await readJson(queueResponse)
  if (!queueResponse.ok) {
    throw new Error(toErrorMessage(queueData, 'Falha ao enfileirar OCR da área selecionada.'))
  }

  const redis = queueData?.redis && typeof queueData.redis === 'object' ? queueData.redis : {}
  const asStr = (value) => (typeof value === 'string' && value.trim() ? value.trim() : null)
  const jobKey = asStr(queueData?.job_id) || asStr(redis.job_key) || asStr(queueData?.job_key)
  const queueKey = asStr(redis.queue_key) || asStr(queueData?.queue_key)
  if (!jobKey) throw new Error('A fila OCR não retornou job_key para polling.')

  const startedAt = Date.now()
  while (Date.now() - startedAt <= OCR_QUEUE_POLL_TIMEOUT_MS) {
    const params = new URLSearchParams()
    params.set('job_key', jobKey)
    if (queueKey) params.set('queue_key', queueKey)

    const pollResponse = await fetch(
      buildApiUrl(settings.apiBaseUrl, `/api/ocr-image/job?${params.toString()}`),
      { method: 'GET', credentials: 'include', cache: 'no-store' }
    )
    const pollData = await readJson(pollResponse)
    if (pollResponse.ok && pollData) {
      const status = String(pollData.status || '').toLowerCase()
      const job = pollData.job && typeof pollData.job === 'object' ? pollData.job : null
      if (status === 'done') {
        return typeof job?.extracted_text === 'string' ? job.extracted_text : ''
      }
      if (status === 'failed' || status === 'timeout') {
        throw new Error(
          asStr(job?.error_message) || asStr(pollData.message) || 'Falha no processamento OCR da área selecionada.'
        )
      }
    }
    await new Promise((resolve) => setTimeout(resolve, OCR_QUEUE_POLL_INTERVAL_MS))
  }
  throw new Error('Timeout aguardando OCR da área selecionada na fila.')
}

async function translateTexts(rawPayload) {
  try {
    const payload = rawPayload && typeof rawPayload === 'object' ? rawPayload : {}
    const settings = normalizeSettings({ ...(await getSettings()), ...payload.settings })
    const texts = Array.isArray(payload.texts)
      ? payload.texts.map((item) => String(item || '').trim()).filter(Boolean)
      : []
    if (texts.length === 0) return { ok: true, translations: [] }
    return { ok: true, translations: await translateBatch(settings, texts) }
  } catch (error) {
    return { ok: false, error: toErrorMessage(error, 'Falha ao traduzir textos.') }
  }
}

async function translateBatch(settings, texts) {
  const response = await fetch(buildApiUrl(settings.apiBaseUrl, '/api/translate/text-batch'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      source_lang: settings.sourceLang,
      target_lang: settings.targetLang,
      provider_lang: settings.providerLang,
      texts,
    }),
  })
  const payload = await readJson(response)
  if (!response.ok) {
    throw new Error(toErrorMessage(payload, 'Erro ao traduzir textos em lote.'))
  }
  return Array.isArray(payload?.translations)
    ? payload.translations.map((item, index) => String(item || texts[index] || ''))
    : texts
}

async function readJson(response) {
  try {
    return await response.json()
  } catch {
    return null
  }
}

function normalizeDetections(payload) {
  if (!payload || !Array.isArray(payload.detections)) return []

  return payload.detections.map((entry, index) => {
    const box = Array.isArray(entry?.box) ? entry.box.map(Number) : []
    const normalizedBox = box.length === 4 && box.every(Number.isFinite)
      ? [
        Math.min(box[0], box[2]),
        Math.min(box[1], box[3]),
        Math.max(box[0], box[2]),
        Math.max(box[1], box[3]),
      ]
      : null
    const ocrText = typeof entry?.ocr_text === 'string' ? entry.ocr_text.trim() : ''
    if (!normalizedBox) return null

    return {
      id: Number.isFinite(Number(entry.det_id)) ? Number(entry.det_id) : index + 1,
      box: normalizedBox,
      ocrText,
      translatedText: ocrText,
      hasText: ocrText.length > 0,
      confidence: Number.isFinite(Number(entry.conf)) ? Number(entry.conf) : null,
    }
  }).filter(Boolean)
}

async function convertImageBlobToPng(blob) {
  if (blob.type === 'image/png') return blob
  if (typeof createImageBitmap !== 'function' || typeof OffscreenCanvas === 'undefined') return blob

  const bitmap = await createImageBitmap(blob)
  try {
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height)
    const context = canvas.getContext('2d')
    if (!context) return blob
    context.drawImage(bitmap, 0, 0)
    return await canvas.convertToBlob({ type: 'image/png' })
  } finally {
    bitmap.close?.()
  }
}

function normalizeCaptureRect(value) {
  if (!value || typeof value !== 'object') return null
  const x = Number(value.x)
  const y = Number(value.y)
  const width = Number(value.width)
  const height = Number(value.height)
  if (![x, y, width, height].every(Number.isFinite)) return null
  if (width < 16 || height < 16) return null
  return {
    x: Math.max(0, x),
    y: Math.max(0, y),
    width: Math.max(1, width),
    height: Math.max(1, height),
  }
}

async function cropImageBlob(blob, rect, devicePixelRatio) {
  if (typeof createImageBitmap !== 'function' || typeof OffscreenCanvas === 'undefined') {
    throw new Error('Captura por recorte não está disponível neste navegador.')
  }

  const bitmap = await createImageBitmap(blob)
  try {
    const sourceX = Math.max(0, Math.floor(rect.x * devicePixelRatio))
    const sourceY = Math.max(0, Math.floor(rect.y * devicePixelRatio))
    const sourceWidth = Math.max(1, Math.min(bitmap.width - sourceX, Math.floor(rect.width * devicePixelRatio)))
    const sourceHeight = Math.max(1, Math.min(bitmap.height - sourceY, Math.floor(rect.height * devicePixelRatio)))
    if (sourceWidth <= 1 || sourceHeight <= 1) {
      throw new Error('A área capturada ficou fora da tela visível.')
    }

    const canvas = new OffscreenCanvas(sourceWidth, sourceHeight)
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Não foi possível preparar o recorte da captura.')
    context.drawImage(
      bitmap,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      0,
      0,
      sourceWidth,
      sourceHeight
    )
    return await canvas.convertToBlob({ type: 'image/png' })
  } finally {
    bitmap.close?.()
  }
}

async function blobToDataUrl(blob) {
  const buffer = await blob.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  let binary = ''
  const chunkSize = 0x8000
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize))
  }
  return `data:${blob.type || 'image/png'};base64,${btoa(binary)}`
}

function buildImageCacheKey(imageUrl, settings) {
  return `${IMAGE_CACHE_PREFIX}${hashString([
    imageUrl,
    settings.apiBaseUrl,
    settings.sourceLang,
    settings.targetLang,
    settings.providerLang,
  ].join('\n'))}`
}

function hashString(value) {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(16)
}

function isValidImageCache(value) {
  if (!value || typeof value !== 'object') return false
  if (!Array.isArray(value.detections) || value.detections.length === 0) return false
  const extractedAt = Number(value.extractedAt)
  return Number.isFinite(extractedAt) && Date.now() - extractedAt < 7 * 24 * 60 * 60 * 1000
}

function guessImageMimeType(imageUrl) {
  const path = (() => {
    try {
      return new URL(imageUrl).pathname.toLowerCase()
    } catch {
      return String(imageUrl).toLowerCase()
    }
  })()

  if (path.endsWith('.jpg') || path.endsWith('.jpeg')) return 'image/jpeg'
  if (path.endsWith('.webp')) return 'image/webp'
  if (path.endsWith('.gif')) return 'image/gif'
  return 'image/png'
}

function isHttpUrl(value) {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

function imageFileNameFromUrl(imageUrl, mimeType) {
  const extension = mimeType.includes('jpeg') ? 'jpg'
    : mimeType.includes('webp') ? 'webp'
      : mimeType.includes('gif') ? 'gif'
        : 'png'
  try {
    const pathname = new URL(imageUrl).pathname
    const last = pathname.split('/').filter(Boolean).pop()
    if (last && /\.[a-z0-9]{2,5}$/i.test(last)) return last
  } catch {
  }
  return `browser-manga-page.${extension}`
}

function toPositiveNumber(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

function toErrorMessage(value, fallback) {
  if (value instanceof Error && value.message) return value.message
  if (value && typeof value === 'object') {
    const message = typeof value.message === 'string' ? value.message : ''
    const error = typeof value.error === 'string' ? value.error : ''
    return message || error || fallback
  }
  return fallback
}
