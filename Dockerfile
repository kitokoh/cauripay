# ---------- Build de production (multi-stage) ----------

# Étape 1 : dépendances + build
FROM node:22-alpine AS build
WORKDIR /app
# Cache npm : copier les manifests d'abord
COPY package.json package-lock.json ./
COPY server/package.json server/
COPY dashboard/package.json dashboard/
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build

# Étape 2 : runtime minimal (deps prod + dist)
FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json ./
COPY server/package.json server/
COPY dashboard/package.json dashboard/
RUN npm ci --omit=dev --no-audit --no-fund
COPY --from=build /app/server/dist server/dist
COPY --from=build /app/dashboard/dist dashboard/dist
RUN mkdir -p /app/data
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://127.0.0.1:4000/health || exit 1
USER node
CMD ["node", "server/dist/index.js"]
