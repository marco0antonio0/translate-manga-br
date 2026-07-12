#!/bin/sh
set -eu

mkdir -p /app/storage /app/chrome-extension

node <<'NODE'
const fs = require('node:fs')
const path = require('node:path')

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

const outputPath = path.join('/app', 'chrome-extension', 'config.js')
fs.mkdirSync(path.dirname(outputPath), { recursive: true })
fs.writeFileSync(outputPath, contents)
console.log(`[extension-config] apiBaseUrl=${apiBaseUrl}`)
NODE

exec "$@"
