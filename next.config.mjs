/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // Pacotes nativos (bindings .node) não podem ser bundlados pelo Turbopack:
  // sem isto o build falha em ambiente limpo (Docker) ao coletar page data
  // ("Failed to load external module sharp-<hash>").
  serverExternalPackages: ['sharp', 'onnxruntime-node', 'better-sqlite3'],
  outputFileTracingIncludes: {
    '/api/translate/extract': ['./models/**/*'],
    '/api/ocr-image/queue': ['./models/**/*'],
    '/api/sections/**/*': ['./models/**/*'],
  },
  experimental: {
    proxyClientMaxBodySize: '100mb',
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  turbopack: {},
  images: {
    unoptimized: true,
  },
  webpack: (config) => {
    // Handle pdf.js worker
    config.resolve.alias.canvas = false
    return config
  },
}

export default nextConfig
