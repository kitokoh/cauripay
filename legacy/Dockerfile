# legacy/ — image de l'agrégateur v0.1 (API Fastify + dashboard compilé)
FROM node:22-alpine AS build
WORKDIR /app
# Serveur
COPY legacy/server/package.json legacy/server/package-lock.json ./legacy/server/
RUN cd legacy/server && npm ci --no-audit --no-fund
COPY legacy/server ./legacy/server
RUN cd legacy/server && npm run build
# Dashboard (servi par le serveur en production)
COPY legacy/dashboard/package.json ./legacy/dashboard/
RUN cd legacy/dashboard && npm ci --no-audit --no-fund
COPY legacy/dashboard ./legacy/dashboard
RUN cd legacy/dashboard && npm run build

FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app/legacy/server
COPY --from=build /app/legacy/server/node_modules ./node_modules
COPY --from=build /app/legacy/server/dist ./dist
COPY --from=build /app/legacy/server/src ./src
COPY --from=build /app/legacy/dashboard/dist ../dashboard/dist
COPY legacy/server/package.json ./package.json
RUN mkdir -p /app/data
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 CMD wget -qO- http://127.0.0.1:4000/health || exit 1
USER node
CMD ["node", "dist/index.js"]
