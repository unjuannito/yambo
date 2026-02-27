# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --legacy-peer-deps
COPY . .
RUN npm run build

# Production stage — Node.js SSR server
FROM node:20-alpine AS production
WORKDIR /app

# Copy built output (server + client bundles)
COPY --from=builder /app/build ./build
COPY --from=builder /app/package.json ./

# Install production dependencies only
RUN npm install --legacy-peer-deps --omit=dev

# Default internal backend URL (override in docker-compose / k8s)
ENV BACKEND_INTERNAL_URL=http://yambo-backend-service:8080/api

EXPOSE 3000
CMD ["npx", "react-router-serve", "./build/server/index.js"]