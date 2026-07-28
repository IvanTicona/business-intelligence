# Contexto de build: la raíz del repo (necesita el package-lock.json del workspace)
FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
COPY back/package.json ./back/
COPY front/package.json ./front/

RUN npm ci

COPY front/ ./front/

# VITE_API_URL vacío = mismo origen. nginx proxea /api hacia el back.
ARG VITE_API_URL=""
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build --workspace front

FROM nginx:alpine

COPY front/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/front/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1
