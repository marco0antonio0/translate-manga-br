import fs from 'node:fs'
import path from 'node:path'

const rootDir = process.cwd()
const outputPath = path.join(rootDir, 'chrome-extension', 'config.js')

loadEnvFiles([
  '.env',
  '.env.local',
  `.env.${process.env.NODE_ENV || 'development'}`,
  `.env.${process.env.NODE_ENV || 'development'}.local`,
])

function loadEnvFiles(fileNames) {
  for (const fileName of fileNames) {
    const filePath = path.join(rootDir, fileName)
    if (!fs.existsSync(filePath)) continue

    const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/)
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue

      const separatorIndex = trimmed.indexOf('=')
      if (separatorIndex <= 0) continue

      const key = trimmed.slice(0, separatorIndex).trim()
      if (!key || Object.prototype.hasOwnProperty.call(process.env, key)) continue

      let value = trimmed.slice(separatorIndex + 1).trim()
      if (
        (value.startsWith('"') && value.endsWith('"'))
        || (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1)
      }
      process.env[key] = value
    }
  }
}

function normalizeBaseUrl(value) {
  if (typeof value !== 'string') return ''
  const trimmed = value.trim().replace(/\/+$/, '')
  if (!trimmed) return ''

  try {
    const url = new URL(trimmed)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return ''
    return url.toString().replace(/\/+$/, '')
  } catch {
    return ''
  }
}

function firstValid(values) {
  for (const value of values) {
    const normalized = normalizeBaseUrl(value)
    if (normalized) return normalized
  }
  return ''
}

const nextPort = process.env.NEXT_PORT || process.env.PORT || '3080'
const apiBaseUrl = firstValid([
  process.env.CHROME_EXTENSION_API_BASE_URL,
  process.env.NEXT_PUBLIC_SITE_URL,
  process.env.SITE_URL,
  process.env.APP_URL,
  process.env.PUBLIC_URL,
  `http://localhost:${nextPort}`,
])

const contents = `self.MTL_EXTENSION_CONFIG = Object.freeze({
  apiBaseUrl: ${JSON.stringify(apiBaseUrl)},
  sourceLang: ${JSON.stringify(process.env.CHROME_EXTENSION_SOURCE_LANG || 'auto')},
  targetLang: ${JSON.stringify(process.env.CHROME_EXTENSION_TARGET_LANG || 'pt-BR')},
  providerLang: ${JSON.stringify(process.env.CHROME_EXTENSION_PROVIDER_LANG || 'google')},
});
`

fs.mkdirSync(path.dirname(outputPath), { recursive: true })
fs.writeFileSync(outputPath, contents)
console.log(`[extension-config] apiBaseUrl=${apiBaseUrl}`)
