# Multi-stage Dockerfile for Costa Rica Tours Unified Full-Stack Platform
FROM node:22-alpine AS builder

WORKDIR /app

# Install build dependencies
COPY package*.json ./
RUN npm ci --include=optional --legacy-peer-deps

# Copy full application code & build frontend + backend bundle
COPY . .
RUN npm run build

# Production runtime container
FROM node:22-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

COPY package*.json ./
RUN npm ci --omit=dev --legacy-peer-deps

# Copy compiled frontend and bundled backend server from builder.
# Keep the non-secret Firebase applet config in the runtime image because the
# backend resolves the named Firestore database from this file before opening
# the Admin SDK client. Credentials still come exclusively from Cloud Run ADC.
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public
COPY --from=builder /app/firebase-applet-config.json ./firebase-applet-config.json

EXPOSE 3000

CMD ["node", "dist/server.cjs"]
