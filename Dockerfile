# ============================================================
# Dockerfile para Costa Rica Tours — pensado para Google Cloud Run
# ============================================================
# Este archivo tiene 2 "etapas" (multi-stage build):
#
# Etapa 1 ("builder"): instala TODAS las dependencias (incluidas las
# de desarrollo) y compila el proyecto — exactamente los mismos pasos
# que ya probamos localmente: "npm run build".
#
# Etapa 2 ("runner"): copia SOLO lo necesario para ejecutar en
# producción (el resultado ya compilado + las dependencias de
# producción), dejando fuera herramientas de desarrollo. Esto hace
# la imagen final más pequeña y rápida de desplegar.
# ============================================================

# ---------- Etapa 1: Build ----------
FROM node:22-slim AS builder

WORKDIR /app

ENV NODE_OPTIONS="--max-old-space-size=2048"

# Copiamos primero solo los archivos de dependencias para aprovechar el cache
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund --include=optional

# Copiamos el código fuente y compilamos
COPY . .
RUN npm run build

# Limpiamos dependencias de desarrollo para reducir el tamaño final
RUN npm prune --omit=dev --no-audit --no-fund

# ---------- Etapa 2: Producción ----------
FROM node:22-slim AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

# Copiamos solo los artefactos necesarios para la ejecución
COPY package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

# Puerto estándar de ejecución (3000 por defecto en AI Studio, configurable por PORT en Cloud Run)
EXPOSE 3000

CMD ["node", "dist/server.cjs"]
