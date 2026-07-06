import { describe, expect, it } from 'vitest'
import {
  isExtensionOrigin,
  isStateChangingMethod,
  isTrustedOrigin,
  isTrustedOriginOrExtension,
} from '../lib/security/request-guards'

function requestWithHeaders(headers: HeadersInit, url = 'http://localhost:3080/api/example') {
  return new Request(url, { headers })
}

describe('request origin guards', () => {
  it('identifies state-changing HTTP methods', () => {
    expect(isStateChangingMethod('GET')).toBe(false)
    expect(isStateChangingMethod('HEAD')).toBe(false)
    expect(isStateChangingMethod('POST')).toBe(true)
    expect(isStateChangingMethod('PUT')).toBe(true)
    expect(isStateChangingMethod('PATCH')).toBe(true)
    expect(isStateChangingMethod('DELETE')).toBe(true)
  })

  it('accepts same-origin requests using host from the request URL', () => {
    const request = requestWithHeaders({
      origin: 'http://localhost:3080',
      host: 'localhost:3080',
    })

    expect(isTrustedOrigin(request)).toBe(true)
  })

  it('accepts same-origin requests behind a proxy', () => {
    const request = requestWithHeaders({
      origin: 'https://open-manga.example.com',
      host: '127.0.0.1:3080',
      'x-forwarded-host': 'open-manga.example.com',
      'x-forwarded-proto': 'https',
    })

    expect(isTrustedOrigin(request)).toBe(true)
  })

  it('rejects cross-origin browser requests by default', () => {
    const request = requestWithHeaders({
      origin: 'https://attacker.example.com',
      host: 'localhost:3080',
    })

    expect(isTrustedOrigin(request)).toBe(false)
    expect(isTrustedOriginOrExtension(request)).toBe(false)
  })

  it('accepts only configured extension origins for extension-aware routes', () => {
    const previousAllowedOrigins = process.env.EXTENSION_ALLOWED_ORIGINS
    process.env.EXTENSION_ALLOWED_ORIGINS = 'chrome-extension://abc123'

    try {
      const allowed = requestWithHeaders({
        origin: 'chrome-extension://abc123',
        host: 'localhost:3080',
      })
      const unlisted = requestWithHeaders({
        origin: 'chrome-extension://other',
        host: 'localhost:3080',
      })

      expect(isTrustedOrigin(allowed)).toBe(false)
      expect(isTrustedOriginOrExtension(allowed)).toBe(true)
      expect(isTrustedOriginOrExtension(unlisted)).toBe(false)
      expect(isExtensionOrigin(allowed)).toBe(true)
    } finally {
      if (previousAllowedOrigins === undefined) {
        delete process.env.EXTENSION_ALLOWED_ORIGINS
      } else {
        process.env.EXTENSION_ALLOWED_ORIGINS = previousAllowedOrigins
      }
    }
  })
})
