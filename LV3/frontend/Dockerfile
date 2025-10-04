# --- ベースステージ ---
FROM node:24-alpine AS base
WORKDIR /app
RUN npm install -g pnpm

# --- 依存関係ステージ ---
FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm fetch

# --- ビルダーステージ ---
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Voltaを使わないCI環境を想定し、package.jsonのエンジン指定を尊重させる
RUN corepack enable && pnpm build

# --- 実行ステージ ---
FROM base AS runner
ENV NODE_ENV production
# セキュリティのため非rootユーザーで実行
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
USER nextjs
EXPOSE 3000
ENV PORT 3000
CMD ["node", "server.js"]