<div align="center">

<a href="https://github.com/marco0antonio0/translate-manga-br">
  <img alt="Manga Translator Local" src="images/Gemini_Generated_Image_vfdkflvfdkflvfdk 1.png" width="180">
</a>

# 🈂️ Manga Translator Local

### Traduza mangás na sua máquina. Detecte balões · Extraia texto · Traduza · Leia

<samp>Plataforma local-first de OCR, tradução e leitura editável de mangás —<br>
IA rodando em CPU, seus dados ficam com você.</samp>

<br>
<br>

[![GitHub Stars](https://img.shields.io/github/stars/marco0antonio0/translate-manga-br?style=for-the-badge&logo=github&color=FFD700&labelColor=1a1a2e)](https://github.com/marco0antonio0/translate-manga-br/stargazers) [![License](https://img.shields.io/badge/license-MIT-8A2BE2?style=for-the-badge&labelColor=1a1a2e)](LICENSE) [![PRs Welcome](https://img.shields.io/badge/PRs-welcome-2ea44f?style=for-the-badge&labelColor=1a1a2e)](CONTRIBUTING.md)

[![Next.js](https://img.shields.io/badge/Next.js_16-000000?style=flat-square&logo=next.js)](https://nextjs.org) [![React](https://img.shields.io/badge/React_19-149ECA?style=flat-square&logo=react&logoColor=white)](https://react.dev) [![TypeScript](https://img.shields.io/badge/TypeScript_5-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org) [![SQLite](https://img.shields.io/badge/SQLite-003B57?style=flat-square&logo=sqlite&logoColor=white)](https://www.sqlite.org) [![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat-square&logo=docker&logoColor=white)](https://docs.docker.com/compose/) [![ONNX](https://img.shields.io/badge/ONNX_Runtime-5C5C5C?style=flat-square&logo=onnx&logoColor=white)](https://onnxruntime.ai)

<br>

<kbd><a href="#-instalação-rápida-para-produção-docker-compose">&nbsp;🚀 Instalar&nbsp;</a></kbd> &nbsp;&nbsp; <kbd><a href="#-quick-start">&nbsp;🛠️ Dev&nbsp;</a></kbd> &nbsp;&nbsp; <kbd><a href="#-features">&nbsp;✨ Features&nbsp;</a></kbd> &nbsp;&nbsp; <kbd><a href="#-benchmarks-em-cpu">&nbsp;📊 Benchmarks&nbsp;</a></kbd> &nbsp;&nbsp; <kbd><a href="#%EF%B8%8F-arquitetura">&nbsp;🏗️ Arquitetura&nbsp;</a></kbd> &nbsp;&nbsp; <kbd><a href="#-documentação">&nbsp;📚 Docs&nbsp;</a></kbd> &nbsp;&nbsp; <kbd><a href="#-contribuindo">&nbsp;🤝 Contribuir&nbsp;</a></kbd>

<br>
<br>

<img alt="Preview do projeto" src="images/Group 19 (1).png" width="880">

<sub>📖 Painel web, leitor com overlay editável e pipeline de IA — tudo local.</sub>

</div>

<br>

<div align="center">

`📤 upload` &nbsp;→&nbsp; `🎯 detecção YOLO` &nbsp;→&nbsp; `🔍 OCR PaddleOCR` &nbsp;→&nbsp; `🌐 tradução` &nbsp;→&nbsp; `📖 leitura editável`

</div>

---

## 📖 Visão geral

**Manga Translator Local** é uma aplicação full stack para traduzir páginas de mangá em ambiente local. O projeto combina painel web, detecção de balões de texto com YOLO, OCR com PaddleOCR, tradução e um leitor com overlay editável.

O princípio central é **local-first**: processamento e armazenamento ficam sob controle do usuário (SQLite + arquivos em `storage/`). A única exceção são os provedores externos de tradução — Google Translate ou OpenRouter — quando selecionados.

## 🚀 Instalação rápida para produção (Docker Compose)

Este é o caminho recomendado para **usar a aplicação pronta**, sem clonar o repositório, sem Dockerfile e sem build local. Crie uma pasta no servidor, salve o conteúdo abaixo como `docker-compose.yml` e suba o serviço.

```yaml
services:
  nextjs:
    image: ${NEXTJS_IMAGE:-ghcr.io/marco0antonio0/translate-manga-br:latest}
    container_name: manga-nextjs
    ports:
      - "${NEXTJS_PORT:-3080}:3080"
    environment:
      NODE_ENV: "production"
      ALLOW_REMOTE_SETUP: "1"
      SECTION_IMAGE_PROCESSING_CONCURRENCY: "2"
      CHROME_EXTENSION_API_BASE_URL: "http://localhost:3080"
      NEXT_PUBLIC_SITE_URL: "http://localhost:3080"
      SITE_URL: "http://localhost:3080"
      APP_URL: "http://localhost:3080"
      PUBLIC_URL: "http://localhost:3080"
    volumes:
      - "${MANGA_STORAGE_DIR:-./storage}:/app/storage"
    healthcheck:
      test: ["CMD", "node", "-e", "fetch('http://127.0.0.1:3080/api/setup/status').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]
      interval: 30s
      timeout: 5s
      retries: 5
      start_period: 20s
    restart: unless-stopped
```

Suba a aplicação:

```bash
mkdir -p manga-translator
cd manga-translator
nano docker-compose.yml
docker compose up -d
```

Acesse:

```text
http://IP_DO_SERVIDOR:3080
```

Na primeira execução, abra `/setup` para criar o administrador. O diretório `storage/` será criado ao lado do compose e guardará o SQLite, uploads, chaves locais da instância e arquivos gerados. Para usar outro domínio, troque as URLs em `CHROME_EXTENSION_API_BASE_URL`, `NEXT_PUBLIC_SITE_URL`, `SITE_URL`, `APP_URL` e `PUBLIC_URL` antes de subir.

## 📊 Benchmarks em CPU

Os números abaixo foram coletados em uma implantação CPU-only com Debian, 6 CPUs lógicas, 6.78 GiB de RAM e ONNX Runtime usando o provider `cpu`. Os tempos usam `created_at → updated_at` como proxy observacional de duração; portanto, medem o fluxo persistido da aplicação, não latência pura de OCR.

![Benchmark público sintético em CPU](docs/benchmark-public-synthetic.svg)

O benchmark público usa três páginas sintéticas redistribuíveis em `examples/`, processadas com Google Translate e OpenRouter. O relatório agregado está em [`benchmarks/public-synthetic-sections-37-38-2026-07-06.json`](benchmarks/public-synthetic-sections-37-38-2026-07-06.json).

![Benchmark privado agregado e anônimo](docs/benchmark-private-aggregate.svg)

A carga privada é mantida apenas como evidência operacional agregada/anônima. Imagens, títulos, texto OCR, traduções, usuários, e-mails, hashes, chaves e overlays não foram exportados. Detalhes e limitações estão em [`docs/benchmark.md`](docs/benchmark.md).

## ✨ Features

| | Feature | Descrição |
| --- | --- | --- |
| 📤 | **Upload e organização** | Envie páginas e organize por seções em uma biblioteca |
| 🎯 | **Detecção de balões** | Modelo YOLO ONNX local localiza as caixas de texto |
| 🔍 | **OCR local** | Extração de texto com PaddleOCR ONNX, sem depender de nuvem |
| 🌐 | **Tradução flexível** | Google Translate ou OpenRouter (modelo configurável no painel) |
| 📖 | **Leitor editável** | Imagem original com caixas de diálogo ajustáveis (texto, posição, tamanho, aparência) |
| 🔗 | **Compartilhamento** | Link público de leitura por seção |
| 👥 | **Multiusuário** | Setup inicial de admin e gestão de usuários |
| ⏱️ | **Fila global** | Acompanhe o processamento de todas as seções |
| 💾 | **Persistência local** | SQLite + arquivos em `storage/`, com migrações versionadas |

## 🚀 Quick Start

### Pré-requisitos

- **Node.js 20+** (`.nvmrc` aponta 22 para desenvolvimento local; Docker usa Node 20)
- **Git LFS** (necessário para baixar os modelos ONNX em `models/`)
- **Docker + Docker Compose** (opcional, para execução conteinerizada)

### Desenvolvimento local

```bash
git clone https://github.com/marco0antonio0/translate-manga-br.git
cd translate-manga-br
git lfs install
git lfs pull
npm install
npm run dev
```

| Serviço | URL |
| --- | --- |
| Web | <http://localhost:3080> |

> [!TIP]
> Na primeira execução, acesse **`/setup`** para criar o usuário administrador.

### Preparar servidor Ubuntu

Em um servidor Ubuntu limpo, instale Docker, Docker Compose e Git LFS antes de clonar/subir o projeto:

```bash
apt-get update
apt-get install -y ca-certificates curl gnupg git git-lfs

install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc

. /etc/os-release
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu ${VERSION_CODENAME} stable" > /etc/apt/sources.list.d/docker.list

apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
systemctl enable --now docker

git lfs install
```

Depois clone o repositório e baixe os arquivos grandes versionados via LFS:

```bash
mkdir -p ~/workspace
cd ~/workspace
git clone https://github.com/marco0antonio0/translate-manga-br.git
cd translate-manga-br
git lfs pull
```

Validação rápida:

```bash
docker --version
docker compose version
git lfs version
```

### Docker Compose

```bash
docker compose up -d --build   # subir
docker compose down            # parar
```

No Compose, há apenas o serviço Next.js. A detecção de balões, o OCR, a tradução, a persistência SQLite e a interface rodam no mesmo app.

### Desenvolvimento com Docker Compose (build local)

O `docker-compose.yml` do repositório é voltado para desenvolvimento/build local: ele constrói a imagem Next.js a partir do checkout e monta `./storage` como volume persistente.

```bash
docker compose up -d --build
```

Para atualizar uma instalação existente:

```bash
git pull
docker compose up -d --build
```

Para parar sem apagar dados:

```bash
docker compose down
```

Os dados de usuário, banco SQLite, imagens enviadas e artefatos gerados ficam em `storage/`.

### Extensão do navegador

A extensão fica em `chrome-extension/` (Chrome/Chromium MV3, incluindo Kiwi Browser no Android) e abre um modo leitura em qualquer página de mangá. Ela exige **login** com um usuário do sistema e usa o site como fonte única de processamento: cria a seção, o backend processa (YOLO + OCR + tradução) e a extensão acompanha o progresso exibindo o overlay traduzido. Detalhes em [chrome-extension/README.md](chrome-extension/README.md).

A URL do backend é gerada em `chrome-extension/config.js`.

Em desenvolvimento, `npm run dev` usa:

```bash
CHROME_EXTENSION_API_BASE_URL=http://localhost:3080
```

No Docker Compose, a URL padrão configurada é:

```bash
CHROME_EXTENSION_API_BASE_URL=https://open-manga.agevon.com
```

Para trocar a URL da extensão em outro ambiente, defina `CHROME_EXTENSION_API_BASE_URL` antes do build/start.

```bash
CHROME_EXTENSION_API_BASE_URL=https://seu-dominio.example.com npm run build
```

Depois, baixe a extensão pela rota:

```bash
http://localhost:3080/download-extensao
```

ou pela página:

```bash
http://localhost:3080/extensao
```

### Verificação rápida

Depois de subir o app:

```bash
curl http://localhost:3080/api/setup/status
```

Para testar OCR/detecção com uma imagem local:

```bash
curl -X POST \
  -F "file=@storage/sections/8/images/0010.png;type=image/png" \
  http://localhost:3080/api/translate/extract
```

## 🏗️ Arquitetura

O frontend Next.js serve a interface e os route handlers locais. O domínio em `lib/backend/*` persiste seções, imagens, status e caixas no SQLite, enquanto `lib/server/manga-ocr-node.ts` executa detecção e OCR ONNX dentro do próprio processo Node.js usando `onnxruntime-node` e `sharp`.

### Estrutura do repositório

```text
app/              # páginas, layouts e route handlers do Next.js
chrome-extension/ # extensão Chrome/Chromium para usar OCR/tradução no navegador
components/       # componentes de UI e fluxo de usuário
docs/             # diagramas e documentação auxiliar
lib/              # backend local, domínio, segurança e integrações
models/           # modelos ONNX e dicionários do OCR/detector
scripts/          # automação de desenvolvimento, extensão e auditoria
storage/          # SQLite e dados gerados localmente (não versionado)
```

| Módulo | Responsabilidade |
| --- | --- |
| `app/api/*` | BFF/backend local da aplicação |
| `chrome-extension/` | Extensão para abrir um modo leitura em páginas externas e chamar os endpoints locais de OCR/tradução |
| `lib/backend/*` | Regras de domínio, repositórios e acesso ao SQLite |
| `lib/server/manga-ocr-node.ts` | Runtime Node/ONNX de detecção de boxes e OCR |
| `models/` | Modelos YOLO/PaddleOCR ONNX usados pelo runtime local |
| `storage/` | Banco local, imagens enviadas e artefatos gerados |

### Modelos locais

Os modelos ficam versionados em `models/`:

| Arquivo | Uso |
| --- | --- |
| `yolo.onnx` | Detecção de balões/caixas de texto |
| `paddleocr_v5_rec.onnx` | Reconhecimento OCR principal |
| `paddleocr_v5_dict.txt` | Dicionário do OCR principal |
| `paddleocr_v5_latin_rec.onnx` | Reconhecimento OCR latino de fallback |
| `paddleocr_v5_latin_dict.txt` | Dicionário do fallback latino |
| `paddleocr_v5_det.onnx` | Modelo de detecção OCR mantido para evolução do runtime |
| `paddleocr_det.onnx`, `paddleocr_rec.onnx`, `paddleocr_dict.txt` | Modelos/dicionário legados para compatibilidade |

Variáveis opcionais permitem substituir caminhos dos modelos sem alterar código:

| Variável | Padrão |
| --- | --- |
| `DETECT_MODEL_PATH` | `models/yolo.onnx` |
| `OCR_REC_ONNX_PATH` | `models/paddleocr_v5_rec.onnx` |
| `OCR_REC_DICT_PATH` | `models/paddleocr_v5_dict.txt` |
| `OCR_LATIN_REC_ONNX_PATH` | `models/paddleocr_v5_latin_rec.onnx` |
| `OCR_LATIN_REC_DICT_PATH` | `models/paddleocr_v5_latin_dict.txt` |

O build standalone do Next inclui `models/**/*` via `outputFileTracingIncludes` em `next.config.mjs`.

## 🔄 Fluxo de processamento

<p align="center">
  <img alt="Fluxograma do processamento atual" src="docs/fluxograma-processo.svg" width="100%">
</p>

1. O usuário cria uma seção no painel e envia imagens.
2. O backend Next.js recebe o `FormData`, valida sessão e dados.
3. Metadados são gravados no SQLite e imagens em `storage/sections`.
4. O backend chama o runtime Node/ONNX em `lib/server/manga-ocr-node.ts`.
5. O Next.js detecta os balões com YOLO ONNX e extrai o texto com PaddleOCR ONNX.
6. O texto extraído é traduzido pelo provider escolhido.
7. OCR, tradução e status são gravados no SQLite.
8. O leitor renderiza a imagem original com caixas de diálogo editáveis.

> [!NOTE]
> Google Translate e OpenRouter dependem de rede externa. O OpenRouter exige API key cadastrada por um admin em `/inicio/preferencias` — a chave é armazenada criptografada em repouso (`lib/security/secrets.ts`).

## 🧠 Modelos utilizados

- **Detecção de balões** — modelo YOLOv8/ONNX treinado por Marco Antonio da Silva Mesquita.
- **OCR** — PaddleOCR com modelos ONNX locais.
- **Renderização editável** — feita no frontend, sobre a imagem original, a partir dos boxes detectados e textos traduzidos.

## 🗺️ Rotas principais

| Rota | Descrição |
| --- | --- |
| `/` | Tela pública inicial |
| `/setup` | Configuração inicial do administrador |
| `/login` | Autenticação |
| `/inicio` | Painel principal |
| `/inicio/secoes` | Biblioteca de seções |
| `/inicio/secoes/nova` | Criação de seção e upload |
| `/inicio/secoes/[id]` | Leitor privado da seção |
| `/inicio/fila-global` | Fila global de processamento |
| `/inicio/usuarios` | Gestão de usuários |
| `/inicio/preferencias` | Preferências e OpenRouter |
| `/publico/secoes/[key]` | Leitor público por link |
| `/download-extensao` | Download do pacote da extensão |
| `/extensao` | Página com instruções da extensão |
| `/termos` | Termos e privacidade |

## ⚙️ Configuração

| Variável | Uso |
| --- | --- |
| `ALLOW_REMOTE_SETUP` | Permite setup inicial remoto quando definido como `1` |
| `SKIP_DB_BOOTSTRAP` | Pula bootstrap/migrações SQLite em cenários controlados |
| `CHROME_EXTENSION_API_BASE_URL` | URL gravada no `chrome-extension/config.js` durante dev/build/start |
| `EXTENSION_ALLOWED_ORIGINS` | Lista (separada por vírgula) de origens `chrome-extension://<id>` autorizadas nas rotas de login/logout, além das detectadas automaticamente |
| `NODE_OCR_INTRA_OP_THREADS` | Quantidade de threads internas do ONNX Runtime para OCR/detecção. Padrão: automático |
| `SECTION_IMAGE_PROCESSING_CONCURRENCY` | Quantidade de páginas/imagens processadas em paralelo por seção. Padrão local: `2` |
| `DETECT_MODEL_PATH` | Caminho opcional para substituir `models/yolo.onnx` |
| `OCR_REC_ONNX_PATH` | Caminho opcional para substituir `models/paddleocr_v5_rec.onnx` |
| `OCR_REC_DICT_PATH` | Caminho opcional para substituir `models/paddleocr_v5_dict.txt` |
| `OCR_LATIN_REC_ONNX_PATH` | Caminho opcional para substituir `models/paddleocr_v5_latin_rec.onnx` |
| `OCR_LATIN_REC_DICT_PATH` | Caminho opcional para substituir `models/paddleocr_v5_latin_dict.txt` |

Exemplos:

```bash
# desenvolvimento local
SECTION_IMAGE_PROCESSING_CONCURRENCY=5 npm run dev

# URL da extensão em desenvolvimento
CHROME_EXTENSION_API_BASE_URL=http://localhost:3080 npm run dev

# Docker Compose
SECTION_IMAGE_PROCESSING_CONCURRENCY=5 docker compose up -d --build
```

<details>
<summary><b>Configurando o OpenRouter</b></summary>

1. Acesse `/inicio/preferencias` com usuário admin.
2. Informe a API key do OpenRouter.
3. Selecione o modelo disponível.
4. Salve e use o provider na criação/processamento de seções.

A chave é armazenada criptografada em repouso usando `lib/security/secrets.ts`.

</details>

## 🗃️ Banco de dados e migrações

O schema SQLite é versionado em `lib/backend/shared/migrations/`.

- **Banco local:** `storage/local.sqlite`
- **Tabela de controle:** `schema_migrations`
- **Aplicação:** automática no bootstrap da aplicação
- **Compatibilidade:** migrações idempotentes com `IF NOT EXISTS`

> [!IMPORTANT]
> Faça backup antes de upgrades:
> ```bash
> cp storage/local.sqlite storage/local.sqlite.bak.$(date +%Y%m%d-%H%M%S)
> ```

## 🧰 Comandos úteis

| Comando | Descrição |
| --- | --- |
| `npm run dev` | Sobe o Next.js com OCR/ONNX local na porta 3080 |
| `npm run dev:web` | Sobe apenas o Next.js na porta 3080 |
| `npm run typecheck` | Valida TypeScript explicitamente |
| `npm run lint` | Executa ESLint com as regras do Next.js |
| `npm test` | Executa a suíte automatizada com Vitest |
| `npm run build` | Build de produção do Next.js |
| `npm run start` | Inicia build de produção na porta 3080 |
| `npm run security:deps` | Executa auditoria npm e assinaturas/proveniência |

## 🩺 Troubleshooting

<details>
<summary><b><code>better-sqlite3</code> sem binding nativo</b></summary>

Sintoma: erro dizendo que `better_sqlite3.node` não foi encontrado.

```bash
npm rebuild better-sqlite3
```

Se persistir, reinstale dependências com a mesma versão de Node usada no projeto.

</details>

<details>
<summary><b>Modelo ONNX não encontrado</b></summary>

Sintoma: erro parecido com `YOLO não encontrado` ou `PP-OCR recognition não encontrado`.

Confirme que a pasta `models/` existe e contém os arquivos ONNX:

```bash
ls models
```

Em builds standalone/Docker, confirme se os modelos foram incluídos:

```bash
find .next/standalone/models -maxdepth 1 -type f
```

</details>

<details>
<summary><b>Porta 3080 ocupada</b></summary>

O script `npm run dev` tenta encerrar processos antigos do próprio projeto. Para evitar o encerramento automático:

```bash
AUTO_KILL_DEV_PORTS=false npm run dev
```

Também é possível trocar portas:

```bash
NEXT_PORT=3090 npm run dev
```

</details>


## 🔐 Segurança e privacidade

- Sessão local com cookie `httpOnly`.
- Rotas mutáveis protegidas por validação de origem.
- Setup inicial bloqueado para acesso não-local, salvo quando `ALLOW_REMOTE_SETUP=1`.
- Chaves sensíveis do OpenRouter criptografadas em repouso.
- Dados gerados ficam em `storage/`, que não deve ser versionado.
- Dependabot semanal (npm, GitHub Actions) + auditoria local com `npm run security:deps` — relatórios em `storage/security/`.

Encontrou uma vulnerabilidade? Veja a [política de segurança](SECURITY.md).

## 📚 Documentação

| Documento | Conteúdo |
| --- | --- |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Fluxo de contribuição, padrões de commit e validação pré-PR |
| [LEARN.md](LEARN.md) | Trilha de aprendizado para estudantes e novos contribuidores |
| [SECURITY.md](SECURITY.md) | Política de report de vulnerabilidades |
| [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) | Código de conduta da comunidade |
| [AGENT.md](AGENT.md) | Contexto para agentes de IA trabalhando no repositório |

> [!NOTE]
> Os textos legais (termos, privacidade, aceites) são centralizados em `lib/legal-content.ts` e consumidos por `app/termos/page.tsx` e `components/terms-modal.tsx`. Para alterá-los, edite apenas esse arquivo.

## 🤝 Contribuindo

Contribuições são muito bem-vindas! As áreas onde ajuda é mais valiosa:

- 🐛 Correções de bugs no fluxo de setup, login, criação de seção e leitor
- 🎨 Melhorias de UX e acessibilidade
- 🛟 Robustez de erros e estados de loading
- ⚡ Performance em CPU
- 🧪 Testes e validações automatizadas
- 📝 Documentação técnica

Antes de abrir um PR, rode pelo menos:

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

Leia o guia completo em [CONTRIBUTING.md](CONTRIBUTING.md). Novo em open source? Comece pelo [LEARN.md](LEARN.md).

## 📄 Licença

Este projeto é open source sob a **licença MIT** — use, modifique, distribua e até venda livremente, contanto que mantenha o aviso de copyright e a licença original.

Leia os termos completos em [LICENSE](LICENSE).

## ⭐ Apoie o projeto

Se este projeto te ajudou, considere deixar uma estrela no repositório — isso ajuda na visibilidade e motiva a evolução contínua.

<div align="center">

**[⬆ Voltar ao topo](#readme)**

Feito com ❤️ por [Marco Antonio](https://github.com/marco0antonio0)

</div>
