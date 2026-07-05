# Extensão do navegador: Manga Translator Local Reader

Esta extensão abre um modo leitura em qualquer página com imagens grandes de mangá e usa o backend do sistema como fonte única de processamento: **o site detecta, extrai e traduz; a extensão acompanha o progresso e exibe o resultado**.

Endpoints consumidos:

- `/api/auth/login`, `/api/auth/logout`, `/api/auth/me` — sessão da extensão (login obrigatório no popup).
- `/api/sections` — cria a seção no site com as imagens coletadas da página.
- `/api/sections/{id}` — polling do progresso e leitura dos boxes OCR/tradução já processados.
- `/api/sections/{id}/reprocess` — reprocessa a seção quando o usuário pede "Reprocessar".
- `/api/ocr-image/queue` + `/api/ocr-image/job` — OCR de área selecionada manualmente no leitor.
- `/api/translate/text-batch` — tradução em lote (mesmo cache/backend do app).
- `/api/translate/extract` — detecção/OCR avulso (caminho legado, ainda disponível).

Existem dois manifests:

- `manifest.json`: Chrome/Chromium, Manifest V3.
- `manifest.firefox.json`: Firefox Mobile, Manifest V2 com background script clássico.

## Como instalar

1. Suba o sistema local normalmente:

   ```bash
   npm run dev
   ```

2. Abra `chrome://extensions`.
3. Ative o modo desenvolvedor.
4. Clique em "Carregar sem compactação".
5. Selecione a pasta `chrome-extension` deste repositório.
6. Clique no ícone da extensão e **faça login** com um usuário do sistema.
7. Abra uma página de mangá e use "Abrir leitor nesta aba".

Também é possível baixar o pacote pronto pelo próprio site em `/extensao` (ou direto em `/download-extensao`).

## Como instalar no Firefox Mobile

1. Baixe `/download-extensao?target=firefox`.
2. Use o fluxo de extensão temporária/debug do Firefox para Android.
3. Instale o ZIP gerado para Firefox. Dentro dele, `manifest.firefox.json` é entregue como `manifest.json`.
4. Faça login no popup e use "Abrir leitor nesta aba" em uma página de mangá.

## Autenticação

O popup possui fluxo de sessão completo (verificação, login e logout) usando os cookies do backend com `credentials: 'include'`. Em produção (HTTPS), o backend emite o cookie de sessão com `SameSite=None; Secure` quando o login vem de uma origem de extensão — sem isso o cookie não seria enviado nas requisições cross-site. Se você atualizou o servidor, **refaça o login** na extensão para renovar o cookie.

## URL do backend

Por padrão, a extensão aponta para `http://localhost:3080` no desenvolvimento local. No Docker Compose, o build usa `https://open-manga.agevon.com` como URL padrão. A URL não é editável no popup: ela é gerada em `chrome-extension/config.js` quando você roda `npm run dev`, `npm run build` ou `npm run start`.

Para apontar a extensão para outro host, defina uma destas variáveis antes do comando:

```bash
CHROME_EXTENSION_API_BASE_URL=https://seu-dominio.exemplo npm run build
```

A ordem de resolução é:

1. `CHROME_EXTENSION_API_BASE_URL`
2. `NEXT_PUBLIC_SITE_URL`
3. `SITE_URL`
4. `APP_URL`
5. `PUBLIC_URL`
6. `http://localhost:${NEXT_PORT:-3080}`

No Docker Compose, `CHROME_EXTENSION_API_BASE_URL` é definida como build arg **e** como variável de runtime (o `prestart` regenera o `config.js` ao subir o container).

## Como funciona a tradução

1. O leitor coleta as imagens grandes da página atual e ordena pela posição no documento.
2. "Traduzir" verifica se já existe uma seção para esta página:
   - o ID fica cacheado em `localStorage` por URL, mas a **fonte da verdade é o servidor** — a extensão confirma via `GET /api/sections/{id}`;
   - se a seção existe, ela é reutilizada (nada é duplicado); se foi deletada no site, uma nova é criada.
3. Se necessário, cria a seção enviando as imagens — o **site processa tudo** (YOLO + OCR + tradução).
4. A extensão faz polling do progresso e vai pintando o overlay página a página, com barra de progresso (`X/Y`, falhas em vermelho).
5. Os resultados são cacheados localmente (`chrome.storage`) para o leitor abrir já traduzido nas próximas visitas.

Ao reabrir o leitor numa página que já tem seção, a extensão sincroniza automaticamente o que o site já traduziu — inclusive se o processamento ainda estiver em andamento.

## Recursos do leitor

- **Modos de leitura**: paginado ou rolagem contínua, com zoom.
- **Painel "Aa"**: fonte (8 famílias), tamanho, densidade, opacidade, texto traduzido/original e formato global dos balões (retângulo/oval).
- **Editor rápido**: toque duplo em um balão abre controles individuais (fonte, tamanho, densidade, forma, arrastar, ocultar, resetar).
- **Seleção de área**: desenhe um retângulo sobre a imagem para OCR + tradução manual daquela região (usa a fila de OCR do site). O modo desliga sozinho após a seleção.
- **Traduzir / Reprocessar**: o botão principal alterna conforme o estado das páginas e mostra "Processando..." com spinner durante o trabalho.

## Limites conhecidos

- Sites que bloqueiam download de imagens fora do contexto da página podem impedir o envio das imagens para o site.
- Sites que exigem autenticação/cookies próprios para servir imagens podem impedir o download pelo background da extensão.
- No Firefox Mobile, a instalação depende do suporte de extensões temporárias/debug do Firefox para Android.
- A seleção manual de área não é persistida no servidor — fica no cache local da extensão.
