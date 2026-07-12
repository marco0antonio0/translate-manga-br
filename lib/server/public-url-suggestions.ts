import 'server-only'

import os from 'node:os'
import { headers } from 'next/headers'

export interface PublicUrlSuggestions {
  domainUrl: string | null
  lanUrls: string[]
}

function isLocalHostname(hostname: string) {
  return ['localhost', '127.0.0.1', '::1', '[::1]'].includes(hostname.toLowerCase())
}

export async function getPublicUrlSuggestions(): Promise<PublicUrlSuggestions> {
  const headerList = await headers()
  const host = headerList.get('x-forwarded-host') || headerList.get('host') || ''
  const proto = headerList.get('x-forwarded-proto') || 'http'

  let hostname = ''
  let port = ''
  try {
    const parsed = new URL(`${proto}://${host}`)
    hostname = parsed.hostname
    port = parsed.port
  } catch {
  }

  // Acessado por domínio ou IP externo → esse endereço serve direto como URL pública
  const domainUrl = hostname && !isLocalHostname(hostname)
    ? `${proto}://${host}`
    : null

  // IPs da máquina onde o projeto roda, para acesso via rede local
  const lanPort = port || process.env.PORT || '3080'
  const lanUrls: string[] = []
  for (const interfaces of Object.values(os.networkInterfaces())) {
    for (const net of interfaces || []) {
      if (net.family === 'IPv4' && !net.internal) {
        lanUrls.push(`http://${net.address}:${lanPort}`)
      }
    }
  }

  return { domainUrl, lanUrls: lanUrls.slice(0, 3) }
}
