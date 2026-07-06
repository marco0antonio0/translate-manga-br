import { NextRequest, NextResponse } from 'next/server'
import { readdir, readFile } from 'fs/promises'
import { join } from 'path'
import AdmZip from 'adm-zip'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const extensionDir = join(process.cwd(), 'chrome-extension')
    const zip = new AdmZip()
    const filename = 'manga-translator-extension-chrome.zip'

    const files = await readdir(extensionDir, { withFileTypes: true })

    for (const file of files) {
      const filePath = join(extensionDir, file.name)
      if (file.isFile()) {
        const content = await readFile(filePath)
        zip.addFile(file.name, content)
      }
    }

    const buffer = zip.toBuffer()

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
        'Content-Length': String(buffer.byteLength),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch (error) {
    console.error('Error creating extension zip:', error)
    return NextResponse.json(
      { error: 'Falha ao gerar download da extensão' },
      { status: 500 }
    )
  }
}
