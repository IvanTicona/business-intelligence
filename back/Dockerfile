# Contexto de build: la raíz del repo (necesita el package-lock.json del workspace)
FROM node:22-alpine

ENV NODE_ENV=production
WORKDIR /app

# Los tres package.json + el lockfile: npm ci exige que el workspace esté completo
COPY package.json package-lock.json ./
COPY back/package.json ./back/
COPY front/package.json ./front/

RUN npm ci --omit=dev --workspace back --include-workspace-root \
  && npm cache clean --force

COPY back/src ./back/src

USER node
EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:4000/health || exit 1

CMD ["node", "back/src/server.js"]
