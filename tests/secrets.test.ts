import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

const originalCwd = process.cwd()
let tempDir = ''

describe('secret encryption', () => {
  beforeAll(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'manga-translator-secrets-'))
    process.chdir(tempDir)
  })

  afterAll(() => {
    process.chdir(originalCwd)
    if (tempDir) fs.rmSync(tempDir, { recursive: true, force: true })
  })

  it('round-trips encrypted values using the local instance key', async () => {
    vi.resetModules()
    const { decryptSecret, encryptSecret } = await import('../lib/security/secrets')

    const encrypted = encryptSecret('openrouter-test-key')

    expect(encrypted).toMatch(/^v1:/)
    expect(encrypted).not.toContain('openrouter-test-key')
    expect(decryptSecret(encrypted)).toBe('openrouter-test-key')
    expect(fs.existsSync(path.join(tempDir, 'storage', 'instance.key'))).toBe(true)
  })

  it('returns null for invalid or tampered payloads', async () => {
    vi.resetModules()
    const { decryptSecret, encryptSecret } = await import('../lib/security/secrets')

    const encrypted = encryptSecret('sensitive-value')
    const tampered = encrypted.replace(/.$/, encrypted.endsWith('A') ? 'B' : 'A')

    expect(decryptSecret('not-a-valid-payload')).toBeNull()
    expect(decryptSecret(tampered)).toBeNull()
  })
})
