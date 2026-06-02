#!/usr/bin/env node

import { existsSync, mkdirSync, writeFileSync } from "node:fs"
import { spawnSync } from "node:child_process"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = resolve(__dirname, "..")
const pythonApiDir = resolve(rootDir, "python-api")
const pythonRequirements = resolve(pythonApiDir, "requirements.txt")
const pythonVenv = resolve(pythonApiDir, ".venv", "bin", "python")
const reportDir = resolve(rootDir, "storage", "security")
const reportJsonPath = resolve(reportDir, "dependency-risk-report.json")
const reportMdPath = resolve(reportDir, "dependency-risk-report.md")
const timeoutMs = Number.parseInt(process.env.SECURITY_AUDIT_TIMEOUT_MS ?? "180000", 10)
const enablePipAudit = process.env.SECURITY_ENABLE_PIP_AUDIT === "1"
const failSeverities = new Set(["high", "critical"])
const watchedPackages = new Set([
  "next",
  "jspdf",
  "firebase",
  "pdfjs-dist",
  "socket.io-client",
  "torch",
  "torchvision",
  "ultralytics",
  "onnxruntime",
])
const compromiseKeywords = [
  "malware",
  "compromise",
  "compromised",
  "hijack",
  "supply chain",
  "account takeover",
  "backdoor",
  "typosquat",
  "credential theft",
]

function runCommand(command, args, cwd = rootDir) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    timeout: timeoutMs,
    killSignal: "SIGTERM",
    env: {
      ...process.env,
      npm_config_loglevel: "error",
      PIP_DISABLE_PIP_VERSION_CHECK: "1",
    },
  })

  return {
    ok: result.status === 0,
    status: result.status,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    error: result.error?.message ?? null,
  }
}

function parseJson(raw) {
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function pickMessage(...values) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim()
    }
  }
  return "Erro desconhecido."
}

function resolvePythonBin() {
  const candidates = existsSync(pythonVenv) ? [pythonVenv, "python3"] : ["python3"]

  for (const candidate of candidates) {
    const result = runCommand(candidate, ["-m", "pip_audit", "--version"])
    if (result.ok) {
      return {
        bin: candidate,
        available: true,
        checked: candidates,
      }
    }
  }

  return {
    bin: null,
    available: false,
    checked: candidates,
  }
}

function normalizeNpmAudit(audit) {
  if (!audit?.vulnerabilities) {
    return []
  }

  return Object.values(audit.vulnerabilities).map((item) => {
    const advisories = Array.isArray(item.via)
      ? item.via.filter((entry) => typeof entry === "object")
      : []

    return {
      source: "npm-audit",
      ecosystem: "npm",
      package: item.name,
      severity: item.severity ?? "unknown",
      direct: Boolean(item.isDirect),
      advisories: advisories.map((entry) => ({
        title: entry.title ?? "Untitled advisory",
        url: entry.url ?? null,
        severity: entry.severity ?? item.severity ?? "unknown",
      })),
      fixAvailable: item.fixAvailable ?? false,
    }
  })
}

function normalizePipAudit(audit) {
  const dependencies = Array.isArray(audit) ? audit : audit?.dependencies
  if (!Array.isArray(dependencies)) {
    return []
  }

  return dependencies
    .filter((dependency) => Array.isArray(dependency.vulns) && dependency.vulns.length > 0)
    .map((dependency) => ({
      source: "pip-audit",
      ecosystem: "pip",
      package: dependency.name,
      severity: "unknown",
      direct: true,
      advisories: dependency.vulns.map((entry) => ({
        title: entry.id ?? "Python advisory",
        url: entry.aliases?.[0] ?? null,
        severity: "unknown",
      })),
      fixAvailable: dependency.vulns.some((entry) => Array.isArray(entry.fix_versions) && entry.fix_versions.length > 0),
    }))
}

function normalizeNpmSignatures(audit) {
  const auditedPackages = Array.isArray(audit?.auditedPackages) ? audit.auditedPackages : []
  const invalid = auditedPackages.filter((pkg) => {
    if (pkg?.verified === false) return true
    if (pkg?.verifiedAttestations === false) return true
    return false
  })

  return invalid.map((pkg) => ({
    source: "npm-audit-signatures",
    ecosystem: "npm",
    package: pkg.name ?? pkg.package ?? "unknown",
    severity: "high",
    direct: false,
    advisories: [
      {
        title: "Falha na verificacao de assinatura/proveniencia do pacote npm",
        url: "https://docs.npmjs.com/cli/v11/commands/npm-audit/",
        severity: "high",
      },
    ],
    fixAvailable: false,
  }))
}

function looksLikeCompromise(finding) {
  const content = finding.advisories
    .map((item) => `${item.title} ${item.url ?? ""}`)
    .join(" ")
    .toLowerCase()

  return compromiseKeywords.some((keyword) => content.includes(keyword))
}

function countSeverities(findings) {
  const counts = {
    critical: 0,
    high: 0,
    moderate: 0,
    low: 0,
    unknown: 0,
  }

  for (const finding of findings) {
    counts[finding.severity] = (counts[finding.severity] ?? 0) + 1
  }

  return counts
}

function toBlockingFindings(findings) {
  return findings.filter((finding) => {
    if (failSeverities.has(finding.severity)) return true
    if (watchedPackages.has(finding.package)) return true
    return looksLikeCompromise(finding)
  })
}

function renderMarkdown(report) {
  const lines = [
    "# Relatorio de risco de dependencias",
    "",
    `Gerado em: ${report.generatedAt}`,
    "",
    "## Resumo",
    "",
    `- Status geral: ${report.status}`,
    `- Falhas de execucao: ${report.executionErrors.length}`,
    `- Achados totais: ${report.findings.length}`,
    `- Criticos: ${report.counts.critical}`,
    `- Altos: ${report.counts.high}`,
    `- Moderados: ${report.counts.moderate}`,
    `- Baixos: ${report.counts.low}`,
    `- Severidade desconhecida: ${report.counts.unknown}`,
    "",
    "## Itens bloqueantes",
    "",
  ]

  if (report.blockingFindings.length === 0) {
    lines.push("- Nenhum item bloqueante encontrado.")
  } else {
    for (const finding of report.blockingFindings) {
      const advisory = finding.advisories[0]
      const url = advisory?.url ? ` (${advisory.url})` : ""
      lines.push(`- [${finding.source}] ${finding.package} | severidade=${finding.severity} | ${advisory?.title ?? "Sem titulo"}${url}`)
    }
  }

  if (report.executionErrors.length > 0) {
    lines.push("", "## Erros de execucao", "")
    for (const error of report.executionErrors) {
      lines.push(`- ${error.tool}: ${error.message}`)
    }
  }

  if (report.findings.length > 0) {
    lines.push("", "## Todos os achados", "")
    for (const finding of report.findings) {
      const advisory = finding.advisories[0]
      const url = advisory?.url ? ` (${advisory.url})` : ""
      lines.push(`- [${finding.source}] ${finding.package} | severidade=${finding.severity} | ${advisory?.title ?? "Sem titulo"}${url}`)
    }
  }

  lines.push(
    "",
    "## Tecnicas aplicadas",
    "",
    "- `npm audit` para vulnerabilidades conhecidas no ecossistema npm.",
    "- `npm audit signatures` para validar assinatura e proveniencia no registro npm.",
    "- `pip-audit` opcional, desativado por padrao neste projeto.",
    "- Lista de pacotes observados para elevar sensibilidade em componentes criticos.",
    ""
  )

  return `${lines.join("\n")}\n`
}

mkdirSync(reportDir, { recursive: true })

const findings = []
const executionErrors = []
const generatedAt = new Date().toISOString()
const pipAuditRuntime = resolvePythonBin()

const npmAuditResult = runCommand("npm", ["audit", "--json"])
const npmAudit = parseJson(npmAuditResult.stdout)
if (npmAudit) {
  findings.push(...normalizeNpmAudit(npmAudit))
} else {
  executionErrors.push({
    tool: "npm audit",
    message: pickMessage(npmAuditResult.error, npmAuditResult.stderr, npmAuditResult.stdout),
  })
}

const npmSignaturesResult = runCommand("npm", ["audit", "signatures", "--json"])
const npmSignatures = parseJson(npmSignaturesResult.stdout)
if (npmSignatures) {
  findings.push(...normalizeNpmSignatures(npmSignatures))
} else {
  executionErrors.push({
    tool: "npm audit signatures",
    message: pickMessage(npmSignaturesResult.error, npmSignaturesResult.stderr, npmSignaturesResult.stdout),
  })
}

if (enablePipAudit && !pipAuditRuntime.available) {
  console.warn(`pip-audit indisponivel; checagem Python ignorada. Interpretadores verificados: ${pipAuditRuntime.checked.join(", ")}`)
} else if (enablePipAudit) {
  const pipAuditResult = runCommand(pipAuditRuntime.bin, [
    "-m",
    "pip_audit",
    "-r",
    pythonRequirements,
    "-f",
    "json",
    "--timeout",
    "120",
  ])
  const pipAudit = parseJson(pipAuditResult.stdout)
  if (pipAudit) {
    findings.push(...normalizePipAudit(pipAudit))
  } else {
    console.warn(`pip-audit falhou e sera ignorado: ${pickMessage(pipAuditResult.error, pipAuditResult.stderr, pipAuditResult.stdout)}`)
  }
}

const counts = countSeverities(findings)
const blockingFindings = toBlockingFindings(findings)
const status = executionErrors.length > 0 || blockingFindings.length > 0 ? "fail" : "pass"

const report = {
  generatedAt,
  status,
  counts,
  watchedPackages: [...watchedPackages],
  executionErrors,
  findings,
  blockingFindings,
}

writeFileSync(reportJsonPath, `${JSON.stringify(report, null, 2)}\n`)
writeFileSync(reportMdPath, renderMarkdown(report))

console.log(`Relatorio salvo em ${reportMdPath}`)

if (status !== "pass") {
  console.error(`Monitoramento falhou: ${blockingFindings.length} item(ns) bloqueante(s), ${executionErrors.length} erro(s) de execucao.`)
  process.exit(1)
}
