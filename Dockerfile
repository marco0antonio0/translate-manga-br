# syntax=docker/dockerfile:1

# Stage único de deps+build: evita copiar node_modules entre stages (~40s).
# O cache mount do npm reaproveita os pacotes baixados entre builds, então
# mudanças no lockfile não baixam tudo de novo.
FROM node:20-bookworm AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci

ARG CHROME_EXTENSION_API_BASE_URL
ARG NEXT_PUBLIC_SITE_URL
ARG SITE_URL
ARG APP_URL
ARG PUBLIC_URL
ENV NEXT_TELEMETRY_DISABLED=1
ENV SKIP_DB_BOOTSTRAP=1
ENV CHROME_EXTENSION_API_BASE_URL=$CHROME_EXTENSION_API_BASE_URL
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
ENV SITE_URL=$SITE_URL
ENV APP_URL=$APP_URL
ENV PUBLIC_URL=$PUBLIC_URL

COPY . .
RUN npm run build

# O onnxruntime-node embarca binários de todas as plataformas (~500MB);
# só linux/x64 interessa no container. Poda antes de copiar pro runner.
RUN cd node_modules/onnxruntime-node/bin/napi-v6 \
  && rm -rf win32 darwin \
  && find linux -mindepth 1 -maxdepth 1 -type d ! -name x64 -exec rm -rf {} +

# Runner mínimo com o output standalone do Next: só o server traçado
# (node_modules podados, modelos e chrome-extension inclusos via
# outputFileTracingIncludes). Imagem muito menor e cópia de segundos,
# em vez de arrastar os 1.5GB do /app inteiro.
FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3080
ENV HOSTNAME=0.0.0.0

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Pacotes nativos que carregam bibliotecas via dlopen em runtime — o file
# tracing do Next não enxerga dlopen e entrega versões incompletas (ex.:
# "libonnxruntime.so.1: cannot open shared object file"). Copia os pacotes
# completos do builder por cima dos traçados.
COPY --from=builder /app/node_modules/onnxruntime-node ./node_modules/onnxruntime-node
COPY --from=builder /app/node_modules/sharp ./node_modules/sharp

EXPOSE 3080
CMD ["node", "server.js"]
