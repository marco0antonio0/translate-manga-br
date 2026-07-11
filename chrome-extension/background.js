try {
  importScripts('config.js')
} catch {
}

const DEFAULT_SETTINGS = {
  apiBaseUrl: resolveConfiguredApiBaseUrl(),
  sourceLang: resolveConfiguredValue('sourceLang', 'auto'),
  targetLang: resolveConfiguredValue('targetLang', 'pt-BR'),
  providerLang: resolveConfiguredValue('providerLang', 'google'),
  autoCreateSections: false,
}

const IMAGE_CACHE_PREFIX = 'reader:image:'
const LOG_STORAGE_KEY = 'mtl:extension-logs'
const NETWORK_LOG_STORAGE_KEY = 'mtl:extension-network-logs'
const LOG_LIMIT = 200
const LOG_PREVIEW_LIMIT = 4000

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

  if (message.type === 'MTL_GET_LOGS') {
    getExtensionLogs().then(sendResponse)
    return true
  }

  if (message.type === 'MTL_CLEAR_LOGS') {
    clearExtensionLogs(message.payload).then(sendResponse)
    return true
  }

  if (message.type === 'MTL_ADD_LOG') {
    addExtensionLog(message.payload).then(sendResponse)
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

async function getSectionDetail(rawPayload) {
  try {
    const payload = rawPayload && typeof rawPayload === 'object' ? rawPayload : {}
    const settings = normalizeSettings({ ...(await getSettings()), ...payload.settings })
    const sectionId = Number(payload.sectionId)
    if (!Number.isFinite(sectionId) || sectionId <= 0) {
      throw new Error('Seção inválida.')
    }

    const response = await trackedFetch(buildApiUrl(settings.apiBaseUrl, `/api/sections/${sectionId}`), {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
    }, { label: 'Buscar seção' })
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

async function checkSectionExists(rawPayload) {
  try {
    const payload = rawPayload && typeof rawPayload === 'object' ? rawPayload : {}
    const settings = normalizeSettings({ ...(await getSettings()), ...payload.settings })
    const sectionId = Number(payload.sectionId)
    if (!Number.isFinite(sectionId) || sectionId <= 0) {
      return { ok: true, exists: false }
    }

    const response = await trackedFetch(buildApiUrl(settings.apiBaseUrl, `/api/sections/${sectionId}`), {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
    }, { label: 'Verificar seção' })
    if (response.status === 404) return { ok: true, exists: false }
    if (!response.ok) {
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

function isNetworkFetchError(error) {
  const message = error instanceof Error ? error.message : String(error || '')
  return /failed to fetch|networkerror|fetch failed|load failed|network request failed/i.test(message)
}

function networkErrorResult(fallback, error) {
  if (isNetworkFetchError(error)) {
    return {
      ok: false,
      network: true,
      error: 'Não foi possível conectar ao servidor.',
    }
  }
  return { ok: false, error: toErrorMessage(error, fallback) }
}

async function checkSession(rawPayload) {
  try {
    const payload = rawPayload && typeof rawPayload === 'object' ? rawPayload : {}
    const settings = normalizeSettings({ ...(await getSettings()), ...payload.settings })
    const response = await trackedFetch(buildApiUrl(settings.apiBaseUrl, '/api/auth/me'), {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
    }, { label: 'Verificar sessão' })
    if (!response.ok) return { ok: true, authenticated: false }

    const user = await readJson(response)
    return { ok: true, authenticated: true, user }
  } catch (error) {
    return networkErrorResult('Não foi possível verificar a sessão.', error)
  }
}

async function login(rawPayload) {
  try {
    const payload = rawPayload && typeof rawPayload === 'object' ? rawPayload : {}
    const settings = normalizeSettings({ ...(await getSettings()), ...payload.settings })
    const email = typeof payload.email === 'string' ? payload.email.trim() : ''
    const password = typeof payload.password === 'string' ? payload.password : ''
    if (!email || !password) throw new Error('Informe email e senha.')

    const response = await trackedFetch(buildApiUrl(settings.apiBaseUrl, '/api/auth/login'), {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    }, { label: 'Login' })
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
    return networkErrorResult('Não foi possível entrar.', error)
  }
}

async function logout(rawPayload) {
  try {
    const payload = rawPayload && typeof rawPayload === 'object' ? rawPayload : {}
    const settings = normalizeSettings({ ...(await getSettings()), ...payload.settings })
    const response = await trackedFetch(buildApiUrl(settings.apiBaseUrl, '/api/auth/logout'), {
      method: 'POST',
      credentials: 'include',
    }, { label: 'Logout' })
    if (!response.ok) {
      const body = await readJson(response)
      throw new Error(toErrorMessage(body, `Falha ao sair (HTTP ${response.status}).`))
    }
    return { ok: true }
  } catch (error) {
    return networkErrorResult('Não foi possível sair.', error)
  }
}

async function getOpenRouterStatus(rawPayload) {
  try {
    const payload = rawPayload && typeof rawPayload === 'object' ? rawPayload : {}
    const settings = normalizeSettings({ ...(await getSettings()), ...payload.settings })
    const response = await trackedFetch(buildApiUrl(settings.apiBaseUrl, '/api/openrouter'), {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
    }, { label: 'OpenRouter status' })
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

    const response = await trackedFetch(buildApiUrl(settings.apiBaseUrl, '/api/sections'), {
      method: 'POST',
      credentials: 'include',
      body: formData,
    }, { label: 'Criar seção', pageCount: pages.length, uploadedCount: appendedCount, skippedCount })
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

    const response = await trackedFetch(buildApiUrl(settings.apiBaseUrl, `/api/sections/${sectionId}/reprocess`), {
      method: 'POST',
      credentials: 'include',
    }, { label: 'Reprocessar seção' })
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
  const response = await trackedFetch(imageUrl, {
    method: 'GET',
    credentials: 'include',
    cache: 'no-store',
    referrer: isHttpUrl(pageUrl) ? pageUrl : undefined,
    referrerPolicy: 'unsafe-url',
  }, { label: 'Baixar imagem para seção' })
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
  const autoCreateSections = raw.autoCreateSections === true

  return { apiBaseUrl, sourceLang, targetLang, providerLang, autoCreateSections }
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

    const imageResponse = await trackedFetch(imageUrl, {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
      referrer: isHttpUrl(pageUrl) ? pageUrl : undefined,
      referrerPolicy: 'unsafe-url',
    }, { label: 'Baixar imagem para OCR' })
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
    const screenshotBlob = await (await trackedFetch(screenshotUrl, {}, { label: 'Ler captura visível' })).blob()
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
  const contentType = blob.type && blob.type.startsWith('image/') ? blob.type : 'image/png'

  const extractResponse = await trackedFetch(buildApiUrl(settings.apiBaseUrl, '/api/translate/extract'), {
    method: 'POST',
    headers: {
      'Content-Type': contentType,
      'X-File-Name': fileName || 'image.png',
    },
    body: blob,
  }, { label: 'Extrair OCR' })
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

const OCR_QUEUE_POLL_INTERVAL_MS = 900
const OCR_QUEUE_POLL_TIMEOUT_MS = 45000

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

    const imageResponse = await trackedFetch(imageUrl, {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
      referrer: isHttpUrl(pageUrl) ? pageUrl : undefined,
      referrerPolicy: 'unsafe-url',
    }, { label: 'Baixar imagem para recorte OCR' })
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

async function ocrImageViaQueue(settings, blob, fileName) {
  const formData = new FormData()
  formData.append('file', blob, fileName || 'crop.png')

  const queueResponse = await trackedFetch(buildApiUrl(settings.apiBaseUrl, '/api/ocr-image/queue'), {
    method: 'POST',
    credentials: 'include',
    body: formData,
  }, { label: 'Enfileirar OCR da seleção' })
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

    const pollResponse = await trackedFetch(
      buildApiUrl(settings.apiBaseUrl, `/api/ocr-image/job?${params.toString()}`),
      { method: 'GET', credentials: 'include', cache: 'no-store' },
      { label: 'Consultar OCR da seleção' }
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
  const response = await trackedFetch(buildApiUrl(settings.apiBaseUrl, '/api/translate/text-batch'), {
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
  }, { label: 'Traduzir textos', textCount: texts.length })
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

async function getExtensionLogs() {
  try {
    const stored = await chrome.storage.local.get({ [LOG_STORAGE_KEY]: [], [NETWORK_LOG_STORAGE_KEY]: [] })
    const logs = Array.isArray(stored[LOG_STORAGE_KEY]) ? stored[LOG_STORAGE_KEY] : []
    const networkLogs = Array.isArray(stored[NETWORK_LOG_STORAGE_KEY]) ? stored[NETWORK_LOG_STORAGE_KEY] : []
    return { ok: true, logs, networkLogs }
  } catch (error) {
    return { ok: false, logs: [], networkLogs: [], error: toErrorMessage(error, 'Não foi possível ler os logs.') }
  }
}

async function clearExtensionLogs(rawPayload) {
  try {
    const payload = rawPayload && typeof rawPayload === 'object' ? rawPayload : {}
    const kind = payload.kind === 'network' ? 'network' : payload.kind === 'events' ? 'events' : 'all'
    const patch = {}
    if (kind === 'events' || kind === 'all') patch[LOG_STORAGE_KEY] = []
    if (kind === 'network' || kind === 'all') patch[NETWORK_LOG_STORAGE_KEY] = []
    await chrome.storage.local.set(patch)
    return { ok: true, logs: [], networkLogs: [] }
  } catch (error) {
    return { ok: false, error: toErrorMessage(error, 'Não foi possível limpar os logs.') }
  }
}

async function addExtensionLog(rawPayload) {
  try {
    const payload = rawPayload && typeof rawPayload === 'object' ? rawPayload : {}
    const entry = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      time: new Date().toISOString(),
      level: normalizeLogLevel(payload.level),
      message: String(payload.message || 'Evento da extensão').slice(0, 500),
      details: payload.details == null ? '' : String(payload.details).slice(0, 2000),
      pageUrl: typeof payload.pageUrl === 'string' ? payload.pageUrl.slice(0, 500) : '',
    }
    const stored = await chrome.storage.local.get({ [LOG_STORAGE_KEY]: [] })
    const current = Array.isArray(stored[LOG_STORAGE_KEY]) ? stored[LOG_STORAGE_KEY] : []
    const logs = [...current, entry].slice(-LOG_LIMIT)
    await chrome.storage.local.set({ [LOG_STORAGE_KEY]: logs })
    return { ok: true, entry }
  } catch (error) {
    return { ok: false, error: toErrorMessage(error, 'Não foi possível registrar o log.') }
  }
}

function normalizeLogLevel(value) {
  const level = String(value || '').toLowerCase()
  return level === 'error' || level === 'warn' || level === 'info' ? level : 'info'
}

async function trackedFetch(input, init = {}, context = {}) {
  const startedAt = Date.now()
  const request = describeFetchRequest(input, init)
  try {
    const response = await fetch(input, init)
    const responseBody = await readResponsePreview(response)
    await addNetworkLog({
      ...request,
      context,
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      durationMs: Date.now() - startedAt,
      responseHeaders: headersToObject(response.headers),
      responseBody,
    })
    return response
  } catch (error) {
    await addNetworkLog({
      ...request,
      context,
      ok: false,
      status: 0,
      statusText: 'FETCH_ERROR',
      durationMs: Date.now() - startedAt,
      error: toErrorMessage(error, 'Falha no request.'),
      errorStack: error instanceof Error ? String(error.stack || '') : '',
    })
    throw error
  }
}

function describeFetchRequest(input, init = {}) {
  const inputRequest = input instanceof Request ? input : null
  const method = String(init.method || inputRequest?.method || 'GET').toUpperCase()
  const url = inputRequest?.url || String(input || '')
  const headers = headersToObject(init.headers || inputRequest?.headers || {})
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    time: new Date().toISOString(),
    method,
    url: limitText(url, 1200),
    requestHeaders: sanitizeHeaders(headers),
    requestBody: describeRequestBody(init.body),
  }
}

function headersToObject(headersLike) {
  const output = {}
  try {
    const headers = headersLike instanceof Headers ? headersLike : new Headers(headersLike)
    headers.forEach((value, key) => {
      output[key] = value
    })
  } catch {
  }
  return output
}

function sanitizeHeaders(headers) {
  const output = {}
  for (const [key, value] of Object.entries(headers || {})) {
    output[key] = /authorization|cookie|token|secret|key/i.test(key)
      ? '[redacted]'
      : limitText(String(value), 500)
  }
  return output
}

function describeRequestBody(body) {
  if (body == null) return ''
  if (body instanceof FormData) {
    const entries = []
    for (const [field, value] of body.entries()) {
      if (value instanceof Blob) {
        entries.push({
          field,
          fileName: value instanceof File ? value.name : undefined,
          type: value.type || 'application/octet-stream',
          size: value.size,
        })
      } else {
        entries.push({ field, value: redactText(String(value)) })
      }
    }
    return JSON.stringify({ type: 'FormData', entries })
  }
  if (body instanceof Blob) {
    return JSON.stringify({ type: 'Blob', mime: body.type || 'application/octet-stream', size: body.size })
  }
  if (body instanceof URLSearchParams) {
    return redactText(body.toString())
  }
  if (typeof body === 'string') {
    return redactText(body)
  }
  if (body instanceof ArrayBuffer) {
    return JSON.stringify({ type: 'ArrayBuffer', byteLength: body.byteLength })
  }
  if (ArrayBuffer.isView(body)) {
    return JSON.stringify({ type: body.constructor?.name || 'TypedArray', byteLength: body.byteLength })
  }
  return `[${Object.prototype.toString.call(body)}]`
}

async function readResponsePreview(response) {
  const contentType = response.headers.get('content-type') || ''
  const contentLength = Number(response.headers.get('content-length')) || 0
  const isTextLike = /json|text\/|javascript|xml|x-www-form-urlencoded/i.test(contentType)
  if (!isTextLike) {
    return `[body not previewed; content-type=${contentType || 'unknown'}; content-length=${contentLength || 'unknown'}]`
  }
  try {
    return limitText(await response.clone().text(), LOG_PREVIEW_LIMIT)
  } catch {
    return ''
  }
}

async function addNetworkLog(entry) {
  try {
    const stored = await chrome.storage.local.get({ [NETWORK_LOG_STORAGE_KEY]: [] })
    const current = Array.isArray(stored[NETWORK_LOG_STORAGE_KEY]) ? stored[NETWORK_LOG_STORAGE_KEY] : []
    const logs = [...current, entry].slice(-LOG_LIMIT)
    await chrome.storage.local.set({ [NETWORK_LOG_STORAGE_KEY]: logs })
  } catch {
  }
}

function redactText(value) {
  let text = limitText(String(value || ''), LOG_PREVIEW_LIMIT)
  try {
    const parsed = JSON.parse(text)
    return JSON.stringify(redactObject(parsed), null, 2)
  } catch {
  }
  return text.replace(/("(?:password|token|apiKey|api_key|authorization|secret)"\s*:\s*")[^"]*(")/gi, '$1[redacted]$2')
}

function redactObject(value) {
  if (Array.isArray(value)) return value.map(redactObject)
  if (!value || typeof value !== 'object') return value
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [
    key,
    /password|token|apiKey|api_key|authorization|secret/i.test(key) ? '[redacted]' : redactObject(item),
  ]))
}

function limitText(value, limit = LOG_PREVIEW_LIMIT) {
  const text = String(value || '')
  return text.length > limit ? `${text.slice(0, limit)}...[truncated ${text.length - limit} chars]` : text
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
