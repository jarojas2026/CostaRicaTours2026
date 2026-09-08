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
FROM node:20-slim AS builder

WORKDIR /app

# Copiamos primero solo los archivos de dependencias para aprovechar
# el cache de Docker: si no cambian las dependencias, no se vuelven a
# instalar en cada build, ahorrando tiempo y minutos de CI.
COPY package.json package-lock.json ./
RUN npm ci

# Ahora sí copiamos el resto del código y compilamos.
COPY . .
RUN npm run build

# ---------- Etapa 2: Producción ----------
FROM node:20-slim AS runner

WORKDIR /app
ENV NODE_ENV=production

# Solo dependencias de producción (más liviano, sin herramientas de
# desarrollo como Vite, TypeScript, esbuild, etc.)
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copiamos el resultado ya compilado desde la etapa "builder":
# dist/ contiene tanto el frontend (HTML/JS/CSS) como server.cjs
# (el backend ya empaquetado en un solo archivo).
COPY --from=builder /app/dist ./dist

# Cloud Run le indica a la aplicación en qué puerto escuchar mediante
# la variable de entorno PORT (normalmente 8080). server.ts ya está
# preparado para leerla (const PORT = process.env.PORT || 3000).
EXPOSE 8080

CMD ["node", "dist/server.cjs"]
