# Guia de Contribuição

Obrigado pelo interesse em contribuir com o **Manga Translator Local**! 🎉

Toda contribuição é bem-vinda — de correção de typo a features novas. Este documento explica como participar de forma que sua contribuição seja revisada e integrada rapidamente.

## 📋 Sumário

- [Código de conduta](#-código-de-conduta)
- [Como posso ajudar?](#-como-posso-ajudar)
- [Setup do ambiente](#%EF%B8%8F-setup-do-ambiente)
- [Fluxo de contribuição](#-fluxo-de-contribuição)
- [Padrões de commit](#-padrões-de-commit)
- [Checklist antes do PR](#-checklist-antes-do-pr)
- [Estrutura do projeto](#-estrutura-do-projeto)
- [Reportando bugs](#-reportando-bugs)
- [Segurança](#-segurança)

## 📜 Código de conduta

Este projeto adota um [Código de Conduta](CODE_OF_CONDUCT.md). Ao participar, você concorda em segui-lo.

## 💡 Como posso ajudar?

| Tipo | Exemplos |
| --- | --- |
| 🐛 Bugs | Fluxos de setup, login, criação de seção e leitor |
| 🎨 UX | Acessibilidade, estados de loading, mensagens de erro |
| ⚡ Performance | Otimizações do pipeline em CPU |
| 🧪 Testes | Cobertura de rotas críticas (`/api/setup`, `/api/auth/*`, `/api/sections/*`) |
| 📝 Docs | Guias, troubleshooting, tradução |

Novo em open source? O [LEARN.md](LEARN.md) tem uma trilha de aprendizado e ideias de primeiras issues.

## 🛠️ Setup do ambiente

### Pré-requisitos

- Node.js 20+ (`.nvmrc` aponta 22 para desenvolvimento local; Docker usa Node 20)
- Python 3.11+
- Docker (opcional, recomendado para validação de ambiente)

### Instalação

```bash
git clone https://github.com/<seu-usuario>/translate-manga-br.git
cd translate-manga-br
npm install
npm run dev
```

Com Docker:

```bash
docker compose up -d --build
```

> [!NOTE]
> O Dockerfile atual usa `npm ci` e `package-lock.json`. Embora o repositório ainda tenha outros lockfiles (`pnpm-lock.yaml`, `bun.lock`), **use `npm`** para reproduzir o fluxo atual de Docker e CI.

## 🔀 Fluxo de contribuição

1. **Fork** o repositório.
2. **Crie uma branch** descritiva:
   - `feat/nome-curto` — nova funcionalidade
   - `fix/nome-curto` — correção de bug
   - `docs/nome-curto` — documentação
3. **Implemente** mudanças pequenas e focadas — um problema por PR.
4. **Valide localmente** (veja o [checklist](#-checklist-antes-do-pr)).
5. **Abra o Pull Request** com contexto suficiente para revisão:
   - Problema observado
   - Causa raiz (se identificada)
   - Solução aplicada
   - Arquivos principais alterados
   - Evidência de validação (logs, prints, passos de reprodução)

> [!TIP]
> Contribuições pequenas e frequentes são revisadas mais rápido. Evite misturar refactor grande com correção funcional.

## 📝 Padrões de commit

Seguimos o estilo [Conventional Commits](https://www.conventionalcommits.org/pt-br/):

```text
feat: adicionar suporte a preview de PDF
fix: corrigir loop de polling em seção sem imagens selecionadas
refactor: extrair validação de sessão para middleware
docs: documentar troubleshooting do better-sqlite3
chore: atualizar dependências do Radix UI
```

## ✅ Checklist antes do PR

Execute pelo menos:

```bash
npx tsc --noEmit   # o build do Next ignora erros TS — este é o check de verdade
npm run build
```

Se a mudança impacta ambiente/container:

```bash
docker compose up -d --build
```

Observações conhecidas:

- O script `npm run lint` existe, mas `eslint` ainda não está declarado nas dependências — pode falhar em ambientes novos.
- Se o build falhar por binding nativo ausente de `better-sqlite3`, rode `npm rebuild better-sqlite3`.

## 📁 Estrutura do projeto

| Área | Responsabilidade |
| --- | --- |
| `app/api/*` | Rotas e regras no backend local |
| `components/*` | Interface |
| `lib/backend/*` | Domínio e persistência |
| `python-api/*` | OCR/tradução |
| `storage/*` | Dados locais (**não versionar** conteúdo gerado) |

### Diretrizes de código

- Prefira mudanças simples e legíveis.
- Preserve compatibilidade com a proposta **local-first**.
- Sem alterações de estilo em arquivos não relacionados.
- Atualize README/LEARN quando o comportamento público mudar.

## 🐛 Reportando bugs

Ao abrir uma issue, inclua:

- **Ambiente** — OS, Node, Python, Docker
- **Passos para reproduzir**
- **Comportamento esperado vs atual**
- **Logs relevantes**

Para sugestões de melhoria, inclua motivação, impacto esperado e alternativas consideradas.

## 🔐 Segurança

- **Nunca** commite `.env` com segredos.
- **Nunca** commite dados de execução em `storage/`.
- Trate chaves de API como confidenciais.
- Vulnerabilidades devem ser reportadas conforme a [política de segurança](SECURITY.md) — **não** abra issue pública.

---

Ficou com dúvida? Abra uma [Discussion](https://github.com/marco0antonio0/translate-manga-br/discussions) ou uma issue. Boas contribuições! 💜
