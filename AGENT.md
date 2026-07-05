# AGENT.md

## Contexto do projeto (para agentes)

Snapshot técnico para orientar agentes de IA trabalhando neste repositório:

- **Arquitetura**: aplicação única Next.js 16 (App Router) — frontend, backend (route handlers em `app/api/*`) e inferência ONNX no mesmo processo Node. **Não existe mais serviço Python**; o pipeline de detecção (YOLO) e OCR (PaddleOCR v5) roda em `lib/server/manga-ocr-node.ts` via `onnxruntime-node` + `sharp`, com modelos em `models/` (versionados via Git LFS).
- **Domínio**: `lib/backend/*` (controller/service/repository) com persistência SQLite (`better-sqlite3`) em `storage/local.sqlite`; migrações em `lib/backend/shared/migrations/`.
- **Extensão** (`chrome-extension/`): Chrome MV3 + Firefox MV2. Exige login; o site processa e a extensão consome os resultados via polling de `GET /api/sections/{id}`. A URL do backend é gerada em `chrome-extension/config.js` pelo script `scripts/generate-extension-config.mjs` (roda nos hooks `predev`/`prebuild`/`prestart`).
- **Deploy**: `docker-compose.yml` com um único serviço (`nextjs`), volume `./storage`, porta 3080. `CHROME_EXTENSION_API_BASE_URL` precisa existir no build **e** no runtime (o `prestart` regenera o config).
- **Cuidados recorrentes**: o build do Next ignora erros TS — use `npx tsc --noEmit` como verificação real; use `npm` (não pnpm/bun) para reproduzir Docker/CI; nunca commitar `storage/` ou segredos; cookie de sessão da extensão é `SameSite=None; Secure` (emitido no login quando a origem é de extensão).
- **Docs relacionadas**: `README.md` (visão geral), `CONTRIBUTING.md` (fluxo de PR), `chrome-extension/README.md` (extensão), `SECURITY.md` (vulnerabilidades).

## Objetivo
Este arquivo define o padrão para criação e manutenção de issues neste repositório por agentes (Codex) e colaboradores.

## Prefixo obrigatório
- Toda issue criada como sugestão do agente deve usar o prefixo no título:
  - `[codex-suggestion]`

## Padrão de título
- Formato recomendado:
  - `[codex-suggestion] [Categoria] Resumo curto da task`
- Exemplos de categoria:
  - `[Feature]`
  - `[Bug]`
  - `[Refactor]`
  - `[Quality]`
  - `[Docs/Legal]`
  - `[Observability]`
  - `[Queue]`
  - `[DB]`
  - `[API]`

## Template de descrição da issue
Usar a estrutura abaixo sempre que possível:

```md
## Contexto
Descreva o problema atual e impacto.

## Objetivo
Resultado esperado da task.

## Escopo
- Item 1
- Item 2
- Item 3

## Critérios de aceite
- [ ] Critério verificável 1
- [ ] Critério verificável 2
- [ ] Critério verificável 3

## Checklist técnico
- [ ] Passo técnico 1
- [ ] Passo técnico 2
- [ ] Passo técnico 3
```

## Labels personalizadas
Aplicar labels para facilitar filtros e priorização.

### Labels de tipo (`type:*`)
- `type:bug`
- `type:feature`
- `type:enhancement`
- `type:refactor`
- `type:quality`
- `type:docs`

### Labels de área (`area:*`)
- `area:ui`
- `area:frontend`
- `area:api`
- `area:database`
- `area:queue`
- `area:observability`
- `area:tests`
- `area:validation`
- `area:translation`
- `area:export`
- `area:legal`
- `area:docs`

### Labels de prioridade (`priority:*`)
- `priority:high`
- `priority:medium`
- `priority:low`

### Labels de status (`status:*`)
- `status:backlog`
- `status:in-progress`
- `status:blocked`
- `status:done`

## Regras de rotulagem
- Toda issue deve ter ao menos:
  - 1 label `type:*`
  - 1 label `area:*`
  - 1 label `priority:*`
  - 1 label `status:*`
- Evitar duplicidade entre label padrão do GitHub e label customizada equivalente.
  - Ex.: preferir padronizar em `type:enhancement` em vez de manter `enhancement` + `type:enhancement`.

## Fluxo recomendado para o agente
1. Verificar se já existe issue semelhante aberta.
2. Se não existir, criar issue com prefixo `[codex-suggestion]`.
3. Preencher descrição com template padrão.
4. Aplicar labels customizadas obrigatórias.
5. Relacionar issue com contexto técnico (arquivos/rotas impactadas).

## Atualização de issues existentes
- Ao revisar tasks existentes:
  - normalizar labels para o padrão deste arquivo;
  - atualizar `status:*` conforme andamento real;
  - refinar critérios de aceite se estiverem vagos.

## Convenções de linguagem
- Linguagem principal: português (pt-BR).
- Títulos curtos e objetivos.
- Critérios de aceite devem ser testáveis.

## Observação
Estas regras valem para issues de planejamento e melhoria contínua. Hotfix urgente pode usar descrição enxuta inicialmente, mas deve ser normalizado depois.
