import { db } from '@/lib/backend/shared/database.module'
import { decryptSecret, encryptSecret } from '@/lib/security/secrets'

const OPENROUTER_KEY_KV = 'manga:openrouter:api_key'
const OPENROUTER_MODEL_KV = 'manga:openrouter:model'

export class OpenRouterRepository {
  private getKv(key: string): string | null {
    const row = db.prepare('SELECT value FROM kv_store WHERE key = ? LIMIT 1')
      .get(key) as { value?: string } | undefined
    return row?.value ? String(row.value) : null
  }

  private setKv(key: string, value: string) {
    db.prepare(`
      INSERT INTO kv_store (key, value, expires_at)
      VALUES (?, ?, NULL)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, expires_at = NULL
    `).run(key, value)
  }

  private deleteKv(key: string) {
    db.prepare('DELETE FROM kv_store WHERE key = ?').run(key)
  }

  getApiKey(): string | null {
    const raw = this.getKv(OPENROUTER_KEY_KV)
    if (!raw) return null

    const decrypted = decryptSecret(raw)
    if (decrypted) return decrypted

    // Migração automática de valor legado em texto puro.
    this.setKv(OPENROUTER_KEY_KV, encryptSecret(raw))
    return raw
  }

  setApiKey(apiKey: string) {
    this.setKv(OPENROUTER_KEY_KV, encryptSecret(apiKey))
  }

  getSelectedModel(): string | null {
    return this.getKv(OPENROUTER_MODEL_KV)
  }

  setSelectedModel(model: string) {
    this.setKv(OPENROUTER_MODEL_KV, model)
  }

  clear() {
    this.deleteKv(OPENROUTER_KEY_KV)
    this.deleteKv(OPENROUTER_MODEL_KV)
  }
}
