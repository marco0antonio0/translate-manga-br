# Política de Segurança

## Versões suportadas

O projeto está em evolução ativa. Correções de segurança são aplicadas apenas na branch `main`.

| Versão | Suportada |
| --- | --- |
| `main` | ✅ |
| Branches/tags anteriores | ❌ |

## Reportando uma vulnerabilidade

**Não abra issue pública para vulnerabilidades.**

Prefira um destes canais privados:

1. **GitHub Security Advisories** — [Report a vulnerability](https://github.com/marco0antonio0/translate-manga-br/security/advisories/new) (preferencial)
2. **E-mail** — entre em contato com o mantenedor via perfil do GitHub ([@marco0antonio0](https://github.com/marco0antonio0))

Inclua no report:

- Descrição da vulnerabilidade e impacto potencial
- Passos para reproduzir (PoC, se possível)
- Versão/commit afetado
- Sugestão de correção (opcional)

Você pode esperar uma primeira resposta em até **7 dias**. Pedimos que a divulgação pública aguarde a correção estar disponível (divulgação coordenada).

## Escopo

Especialmente relevantes para este projeto:

- Bypass de autenticação/sessão (cookie `httpOnly`, validação de origem)
- Acesso indevido ao setup inicial (`ALLOW_REMOTE_SETUP`)
- Vazamento de chaves criptografadas em repouso (`lib/security/secrets.ts`)
- Path traversal / acesso indevido a arquivos em `storage/`
- Injeção via uploads de imagem processados pelo pipeline ONNX local

## Práticas do projeto

- Dependabot semanal para npm e GitHub Actions
- Auditoria local: `npm run security:deps`
- Chaves sensíveis criptografadas em repouso
- Relatórios locais em `storage/security/`
