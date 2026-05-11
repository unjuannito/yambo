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

# Install nginx, supervisord, and gettext (provides envsubst)
RUN apk add --no-cache nginx supervisor gettext

# Create a non-root user. Nginx temp paths are redirected to /tmp in
# nginx-main.conf so no pre-creation of /var/lib/nginx/* is needed.
RUN addgroup -S app && adduser -S app -G app \
    && chown -R app:app /app

# Copy built output (server + client bundles)
COPY --from=builder --chown=app:app /app/build ./build
COPY --from=builder --chown=app:app /app/package.json ./

# Install production dependencies only (needed by react-router-serve)
RUN npm install --legacy-peer-deps --omit=dev && chown -R app:app /app/node_modules

# Copy nginx and supervisord configs
COPY nginx-main.conf /etc/nginx/nginx.conf
COPY nginx.conf /etc/nginx/http.d/default.conf
COPY supervisord.conf /etc/supervisord.conf
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh

RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# BACKEND_INTERNAL_URL must be provided at runtime (docker-compose or K8s env).
# No default is set here to avoid silently pointing at the wrong backend.
# See .env.example for the expected value.
ENV BACKEND_INTERNAL_URL=""

USER app
EXPOSE 80
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["supervisord", "-c", "/etc/supervisord.conf"]