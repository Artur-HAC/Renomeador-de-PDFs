# Imagem base enxuta com Node 20 (exigido pelo package.json)
FROM node:20-alpine AS base
WORKDIR /app

# Habilita o pnpm via corepack (o projeto usa pnpm-lock.yaml)
RUN corepack enable

# --- Etapa de dependências ---
FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod

# --- Imagem final ---
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000

# Copia as dependências já instaladas
COPY --from=deps /app/node_modules ./node_modules

# Copia o código da aplicação
COPY package.json pnpm-lock.yaml ./
COPY server.mjs ./
COPY api ./api
COPY public ./public
COPY index.html style.css ./

# Roda como usuário sem privilégios
USER node

EXPOSE 3000

CMD ["node", "server.mjs"]
