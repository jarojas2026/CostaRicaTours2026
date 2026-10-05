# Infraestructura: revisión y endurecimiento del 5 de octubre de 2026

Base inspeccionada: `21f233f406bb25b8309a3a42e4a0533eae103990`.

## Evidencia y cambios

- Main tenía Build & Type Check y despliegue Cloud Run exitosos. No había PR abiertos al iniciar.
- El gateway ya usa OIDC/WIF, conserva autorización del usuario y desactiva caché de respuestas API.
- Se comparte el intercambio de identidad de infraestructura entre solicitudes concurrentes de una instancia. Un fallo libera la renovación para permitir recuperación; no se comparte autorización del cliente.
- Se valida la configuración del control de concurrencia existente. Las pruebas verifican saturación, Retry-After y liberación única ante finish/close.
- El gate de pruebas incluye ahora archivos `.test.mjs`: la prueba existente de privacidad y recuperación bilingüe estaba fuera del comando.
- Actualizaciones compatibles de dependencias mediante `npm audit fix --ignore-scripts --legacy-peer-deps`, sin `--force`, sin degradar Firebase. El lockfile conserva las versiones efectivamente verificadas.

## Investigación utilizada

- https://docs.cloud.google.com/run/docs/about-concurrency : la concurrencia afecta recursos y escalado; debe ajustarse con mediciones. No se elevan límites de producción por intuición.
- https://docs.cloud.google.com/iam/docs/best-practices-for-using-workload-identity-federation : se conserva identidad federada sin introducir llaves de servicio.
- https://github.com/express-rate-limit/express-rate-limit/blob/main/docs/overview.mdx : el almacenamiento en memoria no comparte contadores entre instancias.
- https://firebase.google.com/docs/firestore/security/rules-query : las bibliotecas servidor omiten reglas Firestore; la autorización del backend sigue siendo necesaria.
- https://github.com/advisories/GHSA-m9gg-hp2v-232j y https://github.com/advisories/GHSA-f596-whhp-79r4 : correcciones gRPC 1.14.5 aplicadas a las dependencias compatibles de Google; Firebase cliente mantiene una dependencia fijada que requiere evaluación separada.

## Validación y límites

163 pruebas locales pasan (158 en la base), incluido un lote de 20 peticiones simultáneas: un intercambio de identidad, credenciales cliente independientes, fallo cerrado y recuperación. No es una prueba de capacidad de producción.

TypeScript y compilación de frontend/backend se verifican de nuevo tras cambiar dependencias. El entorno local impide el socket IPC de la CLI tsx; los auditores se ejecutan con `node --import tsx`. GitHub CI debe validar los comandos normales antes del merge.

El endpoint público `/api/health` respondió 200 antes del merge. Esto no demuestra una reserva completa ni entrega de correo/WhatsApp.

## Pendientes que impiden afirmar 100 %

- Confirmar scheduler externo para customer intake: el auditor existente devuelve QUEUE-001.
- Verificar limitación distribuida/perimetral y la IP efectiva detrás de Vercel/Cloud Run; los límites Express son por instancia.
- Resolver dependencias aún reportadas por npm audit sin degradar Firebase ni herramientas Vercel. El gate actual bloquea severidad crítica, no toda vulnerabilidad alta.
- Probar reservas/pagos en sandbox y entrega de notificaciones con proveedor de prueba, sin cobrar ni enviar mensajes a clientes reales.
- Medir carga, latencia y memoria; comprobar alertas, respaldos y recuperación con acceso operativo. No se han certificado en esta revisión.

Se mantienen automatización nativa, servicios de reservas, reglas de negocio y datos reales. Los documentos históricos que proponen n8n no sustituyen AGENTS.md ni la arquitectura vigente.

## Seguimiento: dependencias y gate de seguridad

El despliegue Cloud Run del merge `3dae5de` terminó correctamente (Actions run `37262484017`).

Sobre esa base, se fija `@grpc/grpc-js` en `1.14.5` mediante npm overrides. Firebase cliente traía `~1.9.0`, por lo que una actualización ordinaria del lockfile no eliminaba sus avisos. Se conserva Firebase 12.19.0 y Firebase Admin 14.5.0; no se aplica la degradación de Firebase sugerida por `npm audit fix --force`. La versión 1.14.5 corrige los dos avisos gRPC citados arriba y ya era utilizada por el backend Google.

La auditoría de producción después del cambio devuelve 3 avisos moderados, 0 altos y 0 críticos. Los tres moderados corresponden a ajv, uuid y su dependencia gaxios; las herramientas de desarrollo no están incluidas en ese conteo. El gate `audit:security:prod` ahora bloquea severidad alta y crítica, tanto en CI como en el chequeo de release. Revisar este override cuando Firebase incorpore una versión corregida; no eliminarlo mientras reaparezcan los avisos.

Se repiten las 163 pruebas, TypeScript, auditores y compilación del frontend/backend. Estas comprobaciones no sustituyen una prueba de integración contra Firestore real ni certifican el scheduler o el flujo comercial completo. Los demás pendientes anteriores siguen abiertos.
