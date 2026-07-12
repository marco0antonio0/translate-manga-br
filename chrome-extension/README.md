# Extensão do navegador: Manga Translator Local Reader

Esta extensão abre um modo leitura em qualquer página com imagens grandes de mangá e usa o backend do sistema como fonte única de processamento: **o site detecta, extrai e traduz; a extensão acompanha o progresso e exibe o resultado**.

Endpoints consumidos:

- `/api/auth/login`, `/api/auth/logout`, `/api/auth/me` — sessão da extensão (login obrigatório no modal de auth do leitor).
- `/api/sections` — cria a seção no site com as imagens coletadas da página.
- `/api/sections/{id}` — polling do progresso e leitura dos boxes OCR/tradução já processados.
- `/api/sections/{id}/reprocess` — reprocessa a seção quando o usuário pede "Reprocessar".
- `/api/ocr-image/queue` + `/api/ocr-image/job` — OCR de área selecionada manualmente no leitor.
- `/api/translate/text-batch` — tradução em lote (mesmo cache/backend do app).
- `/api/translate/extract` — detecção/OCR avulso (caminho legado, ainda disponível).

A extensão usa `manifest.json` em Manifest V3 para Chrome/Chromium. No Android, o fluxo suportado é pelo Kiwi Browser ou outro navegador Chromium com suporte a extensões.

## Como instalar

1. Suba o sistema local normalmente:

   ```bash
   npm run dev
   ```

2. Abra `chrome://extensions`.
3. Ative o modo desenvolvedor.
4. Clique em "Carregar sem compactação".
5. Selecione a pasta `chrome-extension` deste repositório.
6. Abra uma página de mangá e clique no ícone da extensão: o leitor abre na hora, com um modal de login por cima.
7. **Faça login** com um usuário do sistema e confirme a tela de configurações (idiomas/provider) para liberar o leitor.

Também é possível baixar o pacote pronto pelo próprio site em `/extensao` (ou direto em `/download-extensao`).

## Autenticação

Não há mais popup separado: clicar no ícone da extensão abre o leitor imediatamente na aba atual, com um modal sobreposto que guia o acesso — primeiro a tela de login, depois a tela de configurações (sistema, idiomas, provider). Só ao confirmar essa segunda tela ("Iniciar leitor") o modal fecha e o leitor (já aberto por baixo) fica utilizável. Reabrir o ícone (ou o botão de conta no topo do leitor) com o leitor já aberto reexibe o mesmo modal, útil para logout ou trocar idiomas/provider sem perder o progresso da leitura.

Esse modal usa os cookies do backend com `credentials: 'include'`. Em produção (HTTPS), o backend emite o cookie de sessão com `SameSite=None; Secure` quando o login vem de uma origem de extensão — sem isso o cookie não seria enviado nas requisições cross-site. Se você atualizou o servidor, **refaça o login** na extensão para renovar o cookie.

## URL do backend

Por padrão, a pasta local `chrome-extension/` aponta para `http://localhost:3080` no desenvolvimento. Em produção, o administrador configura a URL pública dentro do sistema em `/inicio/preferencias`, na aba **Extensão**.

O ZIP baixado em `/extensao` ou `/download-extensao` recebe um `config.js` gerado no momento do download com a URL pública salva no banco. Enquanto essa URL não estiver configurada, usuários comuns não veem a página da extensão e o download não é liberado.

Quando a URL configurada for um IP em HTTP, como `http://192.168.0.10:3080`, a extensão usa um token local para contornar a limitação de cookie seguro em HTTP. Quando a URL for domínio, use HTTPS; nesse caso o login continua usando cookie `SameSite=None; Secure`.

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
- No Android, instale pelo Kiwi Browser usando o ZIP baixado em `/download-extensao`.
- A seleção manual de área não é persistida no servidor — fica no cache local da extensão.
