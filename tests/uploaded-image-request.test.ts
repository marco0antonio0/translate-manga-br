import { describe, expect, it } from 'vitest'
import { parseUploadedImageRequest } from '../lib/server/uploaded-image-request'

const pngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47])

describe('uploaded image request parsing', () => {
  it('accepts multipart file uploads', async () => {
    const formData = new FormData()
    formData.append('file', new Blob([pngBytes], { type: 'image/png' }), 'page.png')

    const image = await parseUploadedImageRequest(new Request('http://localhost/api/translate/extract', {
      method: 'POST',
      body: formData,
    }))

    expect(image?.mime).toBe('image/png')
    expect(image?.name).toBe('page.png')
    expect([...image!.buffer]).toEqual([...pngBytes])
  })

  it('accepts a raw image request body', async () => {
    const image = await parseUploadedImageRequest(new Request('http://localhost/api/translate/extract', {
      method: 'POST',
      headers: { 'Content-Type': 'image/png' },
      body: pngBytes,
    }))

    expect(image?.mime).toBe('image/png')
    expect([...image!.buffer]).toEqual([...pngBytes])
  })

  it('accepts JSON data URLs', async () => {
    const image = await parseUploadedImageRequest(new Request('http://localhost/api/translate/extract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName: 'crop.png',
        dataUrl: `data:image/png;base64,${Buffer.from(pngBytes).toString('base64')}`,
      }),
    }))

    expect(image?.mime).toBe('image/png')
    expect(image?.name).toBe('crop.png')
    expect([...image!.buffer]).toEqual([...pngBytes])
  })

  it('rejects JSON without an image payload', async () => {
    const image = await parseUploadedImageRequest(new Request('http://localhost/api/translate/extract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: true }),
    }))

    expect(image).toBeNull()
  })
})
