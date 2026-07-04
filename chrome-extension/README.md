# Extensão Chrome: Manga Translator Local Reader

Esta extensão MV3 abre um modo leitura em qualquer página com imagens grandes de mangá e reaproveita os endpoints do sistema local:

- `/api/translate/extract` para detecção de balões e OCR.
- `/api/translate/text-batch` para tradução em lote com o mesmo cache/backend do app.

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
- "Traduzir página" envia a imagem atual para o backend local, desenha os textos traduzidos como overlay e mantém cache local por imagem/idioma por 7 dias.
- O botão de contexto do Chrome também permite abrir o leitor a partir de uma imagem específica.

## Limites conhecidos

- Sites que bloqueiam download de imagens fora do contexto da página podem impedir o OCR da extensão.
- A extensão não salva uma seção no SQLite; ela usa os mecanismos de OCR/tradução do sistema em tempo real e guarda apenas cache local do navegador.
