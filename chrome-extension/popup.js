const screens = {
  loading: document.querySelector('#loadingScreen'),
  login: document.querySelector('#loginScreen'),
  main: document.querySelector('#mainScreen'),
}

const loginFields = {
  email: document.querySelector('#loginEmail'),
  password: document.querySelector('#loginPassword'),
}
const loginPanel = document.querySelector('#loginPanel')
const loginForm = document.querySelector('#loginForm')
const loginSystemUrlEl = document.querySelector('#loginSystemUrl')
const loginError = document.querySelector('#loginError')
const loginErrorText = loginError.querySelector('span')
const loginSubmit = document.querySelector('#loginSubmit')

const fields = {
  sourceLang: document.querySelector('#sourceLang'),
  targetLang: document.querySelector('#targetLang'),
  providerLang: document.querySelector('#providerLang'),
}
const systemUrlEl = document.querySelector('#systemUrl')
const avatarEl = document.querySelector('.avatar')
const userNameEl = document.querySelector('#userName')
const userEmailEl = document.querySelector('#userEmail')
const logoutButton = document.querySelector('#logoutButton')
const statusEl = document.querySelector('#status')
const openReaderButton = document.querySelector('#openReader')

const LANGUAGE_OPTIONS = [
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
const TARGET_LANGUAGE_OPTIONS = LANGUAGE_OPTIONS.filter((language) => language.code !== 'auto')
const GOOGLE_PROVIDER = { value: 'google', label: 'Google Translate' }

init()

async function init() {
  showScreen('loading')
  try {
    populateLanguageSelect(fields.sourceLang, LANGUAGE_OPTIONS)
    populateLanguageSelect(fields.targetLang, TARGET_LANGUAGE_OPTIONS)

    const settings = await chrome.runtime.sendMessage({ type: 'MTL_GET_SETTINGS' })
    await populateProviderSelect(settings)
    fillFormFromSettings(settings)

    const session = await chrome.runtime.sendMessage({ type: 'MTL_CHECK_SESSION', payload: { settings } })
    if (session?.ok && session.authenticated) {
      fillUserInfo(session.user)
      showScreen('main')
      return
    }

    if (!session?.ok && session?.error) {
      showLoginError(session.error)
    }
    showScreen('login')
  } catch {
    showLoginError('Não foi possível verificar o sistema.')
    showScreen('login')
  }
}

function fillFormFromSettings(settings) {
  loginSystemUrlEl.textContent = settings.apiBaseUrl
  systemUrlEl.textContent = settings.apiBaseUrl
  setSelectValue(fields.sourceLang, settings.sourceLang, 'auto')
  setSelectValue(fields.targetLang, settings.targetLang, 'pt-BR')
  setSelectValue(fields.providerLang, settings.providerLang, GOOGLE_PROVIDER.value)
}

function fillUserInfo(user) {
  const name = user?.name || user?.email || 'Usuário'
  userNameEl.textContent = name
  userEmailEl.textContent = user?.email || ''
  avatarEl.textContent = getInitials(name)
}

function getInitials(value) {
  const normalized = String(value || '').trim()
  if (!normalized) return 'U'
  const parts = normalized.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  }
  return normalized.slice(0, 2).toUpperCase()
}

function showScreen(name) {
  for (const [key, el] of Object.entries(screens)) {
    el.hidden = key !== name
  }
}

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault()
  clearLoginError()
  const email = loginFields.email.value.trim()
  const password = loginFields.password.value
  if (!email || !password) {
    showLoginError('Informe email e senha.')
    return
  }

  setBusy(true, loginSubmit)
  try {
    const currentSettings = await chrome.runtime.sendMessage({ type: 'MTL_GET_SETTINGS' })
    await chrome.runtime.sendMessage({
      type: 'MTL_SAVE_SETTINGS',
      settings: currentSettings,
    })

    const response = await chrome.runtime.sendMessage({
      type: 'MTL_LOGIN',
      payload: { email, password, settings: currentSettings },
    })

    if (!response?.ok || !response.authenticated) {
      showLoginError(response?.error || 'Não foi possível entrar.')
      return
    }

    loginFields.password.value = ''
    const settings = await chrome.runtime.sendMessage({ type: 'MTL_GET_SETTINGS' })
    await populateProviderSelect(settings)
    fillFormFromSettings(settings)
    fillUserInfo(response.user)
    showScreen('main')
  } finally {
    setBusy(false, loginSubmit)
  }
})

logoutButton.addEventListener('click', async () => {
  setBusy(true, logoutButton)
  try {
    const settings = await chrome.runtime.sendMessage({ type: 'MTL_GET_SETTINGS' })
    const response = await chrome.runtime.sendMessage({ type: 'MTL_LOGOUT', payload: { settings } })
    if (!response?.ok) {
      showStatus(response?.error || 'Não foi possível sair.')
      return
    }
    showScreen('login')
  } finally {
    setBusy(false, logoutButton)
  }
})

openReaderButton.addEventListener('click', async () => {
  setBusy(true, openReaderButton)
  try {
    const saved = await persistSettings()
    if (!saved) return

    const session = await chrome.runtime.sendMessage({
      type: 'MTL_CHECK_SESSION',
      payload: { settings: readSettingsFromForm() },
    })
    if (!session?.ok || !session.authenticated) {
      showScreen('login')
      showLoginError(session?.error || 'Entre no sistema antes de abrir o leitor.')
      return
    }

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (!tab?.id) {
      showStatus('Nenhuma aba ativa encontrada.')
      return
    }

    try {
      await chrome.tabs.sendMessage(tab.id, { type: 'MTL_OPEN_READER' })
      window.close()
    } catch {
      showStatus('Recarregue a página e tente abrir o leitor novamente.')
    }
  } finally {
    setBusy(false, openReaderButton)
  }
})

for (const field of Object.values(fields)) {
  field.addEventListener('change', async () => {
    await persistSettings({ silent: true })
  })
}

function populateLanguageSelect(select, options) {
  select.replaceChildren(...options.map((language) => {
    const option = document.createElement('option')
    option.value = language.code
    option.textContent = language.name
    return option
  }))
}

async function populateProviderSelect(settings) {
  const options = [GOOGLE_PROVIDER]
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

  const currentValue = fields.providerLang.value || settings?.providerLang || GOOGLE_PROVIDER.value
  fields.providerLang.replaceChildren(...options.map((provider) => {
    const option = document.createElement('option')
    option.value = provider.value
    option.textContent = provider.label
    return option
  }))
  setSelectValue(fields.providerLang, currentValue, GOOGLE_PROVIDER.value)
}

function setSelectValue(select, value, fallback) {
  const normalized = String(value || '').trim()
  const hasOption = Array.from(select.options).some((option) => option.value === normalized)
  select.value = hasOption ? normalized : fallback
}

async function persistSettings(options = {}) {
  const response = await chrome.runtime.sendMessage({
    type: 'MTL_SAVE_SETTINGS',
    settings: readSettingsFromForm(),
  })
  if (!response?.ok) {
    showStatus('Não foi possível salvar as configurações.')
    return false
  }
  if (!options.silent) showStatus('Configurações salvas.')
  return true
}

function readSettingsFromForm() {
  return {
    sourceLang: fields.sourceLang.value,
    targetLang: fields.targetLang.value,
    providerLang: fields.providerLang.value,
  }
}

function setBusy(isBusy, triggerButton) {
  openReaderButton.disabled = isBusy
  loginSubmit.disabled = isBusy
  logoutButton.disabled = isBusy
  if (triggerButton) triggerButton.classList.toggle('is-busy', isBusy)
}

function showLoginError(message) {
  loginErrorText.textContent = message
  loginError.hidden = false
  loginPanel.classList.add('has-error')
  loginFields.email.setAttribute('aria-invalid', 'true')
  loginFields.password.setAttribute('aria-invalid', 'true')
}

function clearLoginError() {
  loginErrorText.textContent = ''
  loginError.hidden = true
  loginPanel.classList.remove('has-error')
  loginFields.email.removeAttribute('aria-invalid')
  loginFields.password.removeAttribute('aria-invalid')
}

loginFields.email.addEventListener('input', clearLoginError)
loginFields.password.addEventListener('input', clearLoginError)

function showStatus(message) {
  statusEl.textContent = message
  window.setTimeout(() => {
    if (statusEl.textContent === message) statusEl.textContent = ''
  }, 2500)
}
