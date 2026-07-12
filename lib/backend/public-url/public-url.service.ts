import 'server-only'

import { db } from '@/lib/backend/shared/database.module'

const EXTENSION_PUBLIC_URL_KV = 'manga:extension:public_url'

type SavePublicUrlResult =
  | { ok: true; publicUrl: string }
  | { ok: false; error: string }

function getKv(key: string): string | null {
  const row = db.prepare('SELECT value FROM kv_store WHERE key = ? LIMIT 1')
    .get(key) as { value?: string } | undefined
  return row?.value ? String(row.value) : null
}

function setKv(key: string, value: string) {
  db.prepare(`
    INSERT INTO kv_store (key, value, expires_at)
    VALUES (?, ?, NULL)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, expires_at = NULL
  `).run(key, value)
}

function deleteKv(key: string) {
  db.prepare('DELETE FROM kv_store WHERE key = ?').run(key)
}

export function normalizePublicUrl(rawValue: unknown): SavePublicUrlResult {
  const value = typeof rawValue === 'string' ? rawValue.trim() : ''
  if (!value) {
    return { ok: false, error: 'Informe a URL pública do servidor.' }
  }

  let parsed: URL
  try {
    parsed = new URL(value)
  } catch {
    return { ok: false, error: 'Informe uma URL http(s) válida.' }
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return { ok: false, error: 'A URL deve começar com http:// ou https://.' }
  }

  parsed.hash = ''
  parsed.search = ''
  parsed.pathname = parsed.pathname.replace(/\/+$/, '')

  return { ok: true, publicUrl: parsed.toString().replace(/\/+$/, '') }
}

export class PublicUrlService {
  getPublicUrl(): string | null {
    return getKv(EXTENSION_PUBLIC_URL_KV)
  }

  getStatus() {
    const publicUrl = this.getPublicUrl()
    return {
      configured: Boolean(publicUrl),
      publicUrl,
    }
  }

  savePublicUrl(rawValue: unknown): SavePublicUrlResult {
    const normalized = normalizePublicUrl(rawValue)
    if (!normalized.ok) return normalized

    setKv(EXTENSION_PUBLIC_URL_KV, normalized.publicUrl)
    return normalized
  }

  clearPublicUrl() {
    deleteKv(EXTENSION_PUBLIC_URL_KV)
  }

  buildExtensionConfig(publicUrl: string) {
    return `self.MTL_EXTENSION_CONFIG = Object.freeze({\n  apiBaseUrl: ${JSON.stringify(publicUrl)},\n});\n`
  }
}

export const publicUrlService = new PublicUrlService()
