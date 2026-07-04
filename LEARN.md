# 🎓 LEARN.md — Aprenda com este projeto

Guia para estudantes e novos contribuidores que querem aprender full stack, IA aplicada e colaboração open source usando um projeto real.

> Se você está chegando pelo **GitHub Student**, este projeto é um bom laboratório para praticar arquitetura real, colaboração e entrega incremental em open source.

## 🎯 O que é o projeto

O **Manga Translator Local** é uma plataforma local-first para tradução de mangás:

- **Frontend** em Next.js 16 + React 19
- **Backend de OCR/tradução** em Python + FastAPI
- **Persistência local** com SQLite

Prioridades técnicas do projeto:

- ✅ Rodar localmente com instalação simples
- ✅ Funcionar bem em hardware modesto (CPU, sem GPU)
- ✅ Arquitetura clara para facilitar evolução por contribuidores

## 👥 Para quem é este guia

- Estudantes iniciando em projetos full stack reais
- Pessoas querendo praticar IA aplicada (OCR + pipeline de visão)
- Contribuidores open source começando por issues menores

## 🧱 Stack e o que você pode aprender com cada parte

| Tecnologia | Pontos de estudo |
| --- | --- |
| **Next.js 16 + React 19 + TypeScript** | App Router, componentes de UI, integração com APIs internas |
| **FastAPI (Python)** | Endpoints de OCR/tradução, organização por serviços |
| **SQLite** | Modelagem simples, consultas, evolução de schema com migrações |
| **Docker Compose** | Ambiente reprodutível para desenvolvimento e teste |
| **ONNX Runtime** | Inferência de modelos (YOLO + PaddleOCR) em CPU |

## 🗺️ Arquitetura resumida

| Diretório | Papel |
| --- | --- |
| `app/api/*` | Backend local (BFF + regras de domínio) |
| `components/*` | UI e fluxo de usuário |
| `lib/backend/*` | Regras de negócio e repositórios |
| `python-api/*` | Pipeline de OCR/tradução |
| `storage/*` | Banco local e artefatos processados |

### Fluxo técnico atual

1. O usuário cria uma seção e envia imagens pelo painel.
2. A rota `app/api/sections/route.ts` recebe o `FormData`.
3. O backend local grava metadados no SQLite e arquivos em `storage/sections`.
4. `lib/backend/sections/sections.repository.ts` inicia o processamento em segundo plano.
5. `lib/model-gateway.ts` chama a FastAPI em `python-api/`.
6. A API Python detecta boxes com YOLO ONNX e extrai texto com PaddleOCR ONNX.
7. O texto extraído é traduzido pelo provider selecionado (Google ou OpenRouter).
8. O resultado volta para o SQLite e o leitor exibe a imagem original com overlay editável.

## 🛤️ Trilha de aprendizado sugerida

- [ ] **1.** Suba o projeto localmente (`npm run dev` ou `docker compose up -d --build`)
- [ ] **2.** Navegue pelo fluxo completo: setup → login → criação de seção → leitura
- [ ] **3.** Leia as rotas de seção em `app/api/sections/*`
- [ ] **4.** Entenda o repositório principal em `lib/backend/sections/sections.repository.ts`
- [ ] **5.** Explore o pipeline Python em `python-api/app/services/*`
- [ ] **6.** Faça uma melhoria pequena e abra um PR com evidência de teste

## 🤝 Como contribuir (passo a passo)

1. Faça **fork** do repositório.
2. Crie uma branch: `feat/nome-curto` ou `fix/nome-curto`.
3. Implemente mudanças **pequenas e focadas**.
4. Valide localmente:

   ```bash
   npx tsc --noEmit
   npm run build
   ```

   Suba com Docker quando aplicável.
5. Abra o PR descrevendo: problema resolvido, abordagem, arquivos alterados e evidência (log/print).

O guia completo está em [CONTRIBUTING.md](CONTRIBUTING.md).

## 💡 Ideias de primeiras issues

Boas portas de entrada para quem está começando:

- 🗨️ Mensagens de erro mais acionáveis em fluxos de API
- 🧪 Testes para rotas críticas (`/api/setup`, `/api/auth/*`, `/api/sections/*`)
- ⏳ Melhorar estados de loading no leitor
- 📖 Documentar troubleshooting de Docker e modelos OCR
- ✅ Criar checklist de validação pré-PR

## ⭐ Contribuições que ajudam muito

- Correções de bugs de fluxo (setup/login/leitor)
- Melhorias de UX e acessibilidade
- Robustez de tratamento de erro
- Performance em CPU
- Documentação técnica e guias de uso
- Cobertura de testes

## 📏 Boas práticas para PR

- Não misture refactor grande com correção funcional.
- Mantenha nomes de função/variável claros.
- Preserve compatibilidade com o ambiente **local-first**.
- Se alterar comportamento público, atualize o README.
- O build atual do Next ignora erros TypeScript — rode `npx tsc --noEmit` separadamente.

## 🔐 Regras de segurança e dados

- Não commitar `storage/`
- Não commitar `.env` com credenciais reais
- Tratar API keys como segredo (ex.: OpenRouter)

## 🙋 Como pedir ajuda

Se ficar bloqueado, abra uma issue ou discussion com:

- Contexto, o que tentou e o erro encontrado
- Logs relevantes
- Sua hipótese do problema

Isso acelera a revisão e aumenta a chance de merge rápido. 🚀
