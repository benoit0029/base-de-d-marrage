# Build multi-étapes pour une image de production minimale.
FROM node:22-slim AS base

# --- Dépendances ---
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# --- Build ---
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

# --- CLI Prisma isolé (avec toutes ses dépendances transitives, ex. "effect") ---
# Le build "standalone" de Next.js ne trace que ce que le code applicatif
# importe : il omet le CLI Prisma (une devDependency, utilisée seulement au
# démarrage du conteneur pour `migrate deploy`), et copier ses fichiers un
# par un est fragile. On l'installe donc à part, dans un dossier neuf, pour
# obtenir l'arborescence complète et correcte.
FROM base AS prisma-cli
WORKDIR /prisma-cli
RUN npm install prisma@6.19.3

# --- Image finale ---
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=prisma-cli /prisma-cli/node_modules ./node_modules

# Volumes montés par docker-compose : documents capturés + logos uploadés.
RUN mkdir -p /app/.data/documents /app/public/uploads/logos \
  && chown -R nextjs:nodejs /app/.data /app/public/uploads

USER nextjs
EXPOSE 3000
ENV PORT=3000 HOSTNAME=0.0.0.0

CMD ["sh", "-c", "node node_modules/prisma/build/index.js migrate deploy && node server.js"]
