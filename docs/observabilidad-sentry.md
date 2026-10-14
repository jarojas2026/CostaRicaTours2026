# Monitoreo de errores con Sentry (opt-in)

El monitoreo está **apagado por defecto**. Solo se activa cuando se define un DSN; sin DSN no se carga ningún SDK ni se envía nada.

## Variables de entorno

| Variable | Dónde | Descripción |
| --- | --- | --- |
| `SENTRY_DSN` | Servidor (Cloud Run / `server.ts`) | DSN del proyecto Node. Activa `@sentry/node`. |
| `SENTRY_ENVIRONMENT` | Servidor | Opcional. Por defecto `NODE_ENV`. |
| `SENTRY_RELEASE` | Servidor | Opcional. Por defecto `K_REVISION` (revisión de Cloud Run). |
| `SENTRY_TRACES_SAMPLE_RATE` | Servidor | Opcional, 0–1. Por defecto `0` (solo errores, sin trazas). |
| `VITE_SENTRY_DSN` | Build del frontend (Vercel / `vite build`) | DSN del proyecto React. Activa `@sentry/react`. Se incrusta en el bundle en tiempo de build. |
| `VITE_SENTRY_ENVIRONMENT` | Frontend | Opcional. Por defecto el `mode` de Vite. |
| `VITE_SENTRY_RELEASE` | Frontend | Opcional. |
| `VITE_SENTRY_TRACES_SAMPLE_RATE` | Frontend | Opcional, 0–1. Por defecto `0`. |

Un DSN no es un secreto (se publica en el bundle), pero conviene restringir los dominios permitidos en el proyecto de Sentry.

## Qué se captura

- **Servidor:** errores 5xx que llegan a `apiErrorHandler` (`backend/asyncRoutes.ts`), con el método y la ruta como tags; excepciones no capturadas mediante las integraciones por defecto del SDK. Los 4xx (errores del cliente) no se reportan.
- **Frontend:** errores capturados por `ErrorBoundary` (con el component stack) y errores globales del navegador. El SDK se carga con `import()` en un chunk aparte, fuera del bundle inicial; los errores que ocurren mientras carga se encolan (máx. 20).

## Privacidad (sin PII)

- `dataCollection` (reemplazo de `sendDefaultPii` en el SDK v11): sin datos de usuario, cookies, cuerpos HTTP, query params, entradas/salidas de IA, datos de consultas, argumentos de colas ni variables locales; de las cabeceras solo `content-type` y `user-agent`.
- `beforeSend`, `beforeSendTransaction` y `beforeBreadcrumb` pasan por `shared/observability/scrubPii.ts`: elimina `user`, `cookies`, `data` y `query_string` del request, quita la query de la URL, redacta claves sensibles (`authorization`, `cookie`, `x-chat-session-token`, `x-crt-internal-token`, `email`, `phone`, `password`, `token`…) y reemplaza correos y teléfonos en cualquier texto por `[email]` / `[phone]`.
- Cubierto por `tests/sentryObservability.contract.test.ts`.

## Activación

1. Crear dos proyectos en Sentry (Node y React) y copiar sus DSN.
2. Cloud Run: añadir `SENTRY_DSN` a las variables del servicio (no requiere Secret Manager).
3. Vercel: añadir `VITE_SENTRY_DSN` a las variables de build y redeplegar.
