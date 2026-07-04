FROM node:20-bookworm-slim AS deps
WORKDIR /app
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-bookworm-slim AS builder
WORKDIR /app
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
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3080
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*
COPY --from=builder /app .
EXPOSE 3080
CMD ["npm", "run", "start"]
