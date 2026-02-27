# ── Stage 1: Build ──────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --legacy-peer-deps
COPY . .
RUN npm run build

# ── Stage 2: Production (nginx + Node SSR via supervisord) ─────
FROM node:20-alpine AS production
WORKDIR /app

# Install nginx and supervisord
RUN apk add --no-cache nginx supervisor

# Copy built output (server + client bundles)
COPY --from=builder /app/build ./build
COPY --from=builder /app/package.json ./

# Install production dependencies only (needed by react-router-serve)
RUN npm install --legacy-peer-deps --omit=dev

# Copy nginx and supervisord configs
COPY nginx.conf /etc/nginx/http.d/default.conf
COPY supervisord.conf /etc/supervisord.conf

# Default internal backend URL (override in docker-compose / k8s)
ENV BACKEND_INTERNAL_URL=http://yambo-backend-service:8080/api

EXPOSE 80
CMD ["supervisord", "-c", "/etc/supervisord.conf"]