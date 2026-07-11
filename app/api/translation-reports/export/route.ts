import { NextResponse } from 'next/server'
import AdmZip from 'adm-zip'

import { requireAdmin } from '@/app/api/_shared/proxy'
import { translationReportsService } from '@/lib/backend/translation-reports/translation-reports.module'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const DATA_URL_PATTERN = /^data:image\/(png|jpeg|webp);base64,(.+)$/

export async function GET() {
  const access = await requireAdmin()
  if ('response' in access) return access.response

  try {
    const reports = translationReportsService.list()
    const zip = new AdmZip()
    const entries = []

    for (const report of reports) {
      let imageFile: string | null = null
      const match = report.image_crop.match(DATA_URL_PATTERN)
      if (match) {
        const extension = match[1] === 'jpeg' ? 'jpg' : match[1]
        imageFile = `images/report-${String(report.id).padStart(4, '0')}.${extension}`
        zip.addFile(imageFile, Buffer.from(match[2], 'base64'))
      }

      entries.push({
        id: report.id,
        reason: report.reason,
        status: report.status,
        page_url: report.page_url,
        image_url: report.image_url,
        item_id: report.item_id,
        box: report.box,
        ocr_text: report.ocr_text,
        translated_text: report.translated_text,
        corrected_text: report.corrected_text,
        source_lang: report.metadata?.source_lang ?? '',
        target_lang: report.metadata?.target_lang ?? '',
        provider_lang: report.metadata?.provider_lang ?? '',
        created_at: report.created_at,
        image_file: imageFile,
      })
    }

    const dataset = {
      exported_at: new Date().toISOString(),
      total: entries.length,
      with_image: entries.filter((entry) => entry.image_file).length,
      with_correction: entries.filter((entry) => entry.corrected_text).length,
      reports: entries,
    }
    zip.addFile('dataset.json', Buffer.from(JSON.stringify(dataset, null, 2), 'utf-8'))

    const buffer = zip.toBuffer()
    const filename = `translation-reports-${new Date().toISOString().slice(0, 10)}.zip`

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
        'Content-Length': String(buffer.byteLength),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    })
  } catch (error) {
    console.error('translation reports export error:', error)
    return NextResponse.json(
      { message: 'Falha ao exportar os reports.' },
      { status: 500 }
    )
  }
}
