# ---------- Base ----------
FROM node:20-alpine AS base
WORKDIR /app

ENV CI=true
RUN corepack enable


# ---------- Dependencies ----------
FROM base AS deps

COPY package.json .
COPY pnpm-lock.yaml .
COPY custom.d.ts .
COPY tsconfig.json .
COPY nest-cli.json .
COPY apps/service/package.json apps/service/package.json
COPY apps/service/pnpm-lock.yaml apps/service/pnpm-lock.yaml

RUN pnpm install -r --frozen-lockfile


# ---------- Builder ----------
FROM base AS builder

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/service/node_modules ./apps/service/node_modules
COPY . .

RUN pnpm run build service


# ---------- Production ----------
FROM node:20-alpine
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV CI=true

RUN corepack enable

COPY --from=builder /app/dist ./dist

COPY package.json .
COPY pnpm-lock.yaml .

RUN pnpm install -r --prod --frozen-lockfile

EXPOSE 3000

CMD ["node", "dist/apps/service/main.js"]