import type { Metadata } from 'next'
import { Analytics } from '@vercel/analytics/next'
import { Toaster } from '@/components/ui/sonner'
import './globals.css'

const siteUrl = 'http://localhost:3080/'
const siteName = 'MangaIOTranslate'
const defaultTitle = 'MangaIOTranslate | Tradutor de Manga Brasileiro com IA'
const defaultDescription =
  'Tradutor de manga brasileiro online com IA. Traduza manga e manhwa para o português do Brasil no PC e celular, com qualidade visual e layout original preservado.'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: defaultTitle,
    template: `%s | ${siteName}`,
  },
  description: defaultDescription,
  applicationName: siteName,
  keywords: [
    'tradutor de manga brasileiro',
    'tradutor de manga em portugues',
    'tradutor de manga pt br',
    'traduzir manga para portugues do brasil',
    'manga em portugues brasileiro',
    'manhwa em portugues',
    'tradutor de mangá',
    'tradutor de manga',
    'tradução de mangá',
    'traduzir manga',
    'tradutor de manhwa brasileiro',
    'manga traduzido para o brasileiro',
    'como traduzir manga em portugues',
    'como traduzir manga pelo celular',
    'como traduzir manhwa em portugues',
    'traduzir manhwa para o portugues',
    'tradutor de manga online brasileiro',
    'tradutor de quadrinhos brasileiro',
    'manga traduzido pt br',
    'traduzir de manhwa gratis',
    'tradutor de quadrinhos gratis',
    'tradutor de manga para pc',
    'tradutor de manga online',
    'manga translator',
    'ocr manga',
    'tradução de quadrinhos',
    'manga em pt br',
    'manhwa pt br',
  ],
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    url: '/',
    title: defaultTitle,
    description: defaultDescription,
    siteName,
    locale: 'pt_BR',
    images: [
      {
        url: '/image-preview-link.png',
        width: 1259,
        height: 744,
        type: 'image/png',
        alt: 'MangaIOTranslate - Tradutor de Manga Brasileiro com IA',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: defaultTitle,
    description: defaultDescription,
    images: ['/image-preview-link.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR">
      <body className="font-sans antialiased">
        {children}
        <Analytics />
        <Toaster position="bottom-center" richColors />
      </body>
    </html>
  )
}
