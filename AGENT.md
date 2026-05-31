# AGENT.md

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
