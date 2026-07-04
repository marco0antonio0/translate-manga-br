# Extensão do navegador: Manga Translator Local Reader

Esta extensão abre um modo leitura em qualquer página com imagens grandes de mangá e reaproveita os endpoints do sistema local:

- `/api/translate/extract` para detecção de balões e OCR.
- `/api/translate/text-batch` para tradução em lote com o mesmo cache/backend do app.
- `/api/sections` para criar uma seção no site em background quando o leitor traduz as páginas.

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
6. Abra uma página de mangá, clique no ícone da extensão e use "Abrir leitor nesta aba".

## Como instalar no Firefox Mobile

1. Baixe `/download-extensao?target=firefox`.
2. Use o fluxo de extensão temporária/debug do Firefox para Android.
3. Instale o ZIP gerado para Firefox. Dentro dele, `manifest.firefox.json` é entregue como `manifest.json`.
4. Abra uma página de mangá, clique no ícone da extensão e use "Abrir leitor nesta aba".

Por padrão, a extensão aponta para `http://localhost:3080` no desenvolvimento local (`npm run dev` ou `bun run dev`). No Docker Compose, o build usa `https://open-manga.agevon.com` como URL padrão. A URL não é editável no popup: ela é gerada em `chrome-extension/config.js` quando você roda `npm run dev`, `bun run dev`, `npm run build` ou `npm run start`.

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

No Docker Compose, `CHROME_EXTENSION_API_BASE_URL` também é repassada como build arg. O padrão do `docker-compose.yml` é `https://open-manga.agevon.com`.

## Uso

- O leitor coleta imagens grandes da página atual e ordena pela posição no documento.
- "Traduzir" cria uma seção no site em background, envia as imagens coletadas e processa as páginas no leitor.
- O botão de contexto do Chrome também permite abrir o leitor a partir de uma imagem específica.

## Limites conhecidos

- Sites que bloqueiam download de imagens fora do contexto da página podem impedir o OCR da extensão.
- No Firefox Mobile, a instalação depende do suporte de extensões temporárias/debug do Firefox para Android.
- Sites que exigem autenticação/cookies próprios para servir imagens podem impedir o download das imagens pelo background da extensão.
