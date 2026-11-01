# Plan de despliegue internacional a costo $0 (borrador)

> Fecha: 26-oct-2026. Estado: **plan, nada desplegado**. Solo documentación.
> Reglas vigentes (AGENTS.md §00): costo $0, no borrar nada, Stripe solo TEST, no tocar `api/[...path].ts`, `Header` ni `BottomNav`, no fusionar sin OK de Gabriel, nada de deploys a GCP sin autorización escrita.

## 0. Situación actual
- Frontend: Vercel plan **Hobby** → https://costaricatours2026.vercel.app. `/api` se reenvía a Cloud Run (`CLOUD_RUN_BACKEND_URL`).
- Backend: Cloud Run `costa-rica-tours` (us-central1, proyecto `gen-lang-client-0782739149`), Express 5 + Firestore + Groq. **Pausado**: facturación GCP desactivada, recursos apagados el 26-oct-2026 → `/api` responde 503.
- `.github/workflows/deploy-cloud-run.yml` ya usa `--min-instances=0`, `--max-instances=20`, `512Mi`, `1 vCPU`, pero **se dispara solo** tras cada CI verde en `main` (`workflow_run`). Mientras la facturación esté apagada falla sin costo; si se reactiva, cada merge construiría y subiría una imagen nueva.

## 1. Opciones para el backend

Precios verificados el 26-oct-2026 en las páginas oficiales (enlaces al final).

### A. Cloud Run optimizado (recomendada)
Configuración: mínimo 0 instancias, facturación por solicitud, Container/On-Demand Scanning **desactivado**, política de retención de Artifact Registry que conserve 2 imágenes, deploy **solo manual** (`workflow_dispatch`), alerta de presupuesto en $1.

- Capa gratis mensual (facturación por solicitud, us-central1): **180.000 vCPU-segundos, 360.000 GiB-segundos y 2 millones de solicitudes**. Con 1 vCPU/512 MiB son ~50 horas de CPU activa al mes: sobra para el tráfico de arranque.
- Pasado eso: $0,000024 por vCPU-s, $0,0000025 por GiB-s, $0,40 por millón de solicitudes. Con mínimo 0 no se cobra tiempo ocioso.
- Costos ocultos a controlar: Container Scanning (~$0,26 por imagen, causa principal de la deuda de octubre), almacenamiento de imágenes en Artifact Registry por encima de su capa gratis (339 GB acumulados: aplicar retención; **no borrar** sin OK), Cloud Build si se usa (preferir build en GitHub Actions).
- **Requisito**: la capa gratis solo aplica con una cuenta de facturación activa → hay que saldar la deuda de octubre ($24,22, verificar si el crédito del caso 76812024 la cubre) y reactivar la facturación. **Necesita autorización escrita de Gabriel.**
- Pros: cero migración de código, Firestore y secretos ya están en GCP, mismo pipeline. Contras: exige tarjeta/facturación activa; un error de configuración puede generar costo (mitigar con alerta y deploy manual).

### B. Mover el backend a funciones de Vercel
- Hobby incluye 1.000.000 de invocaciones, 4 h de CPU activa y 360 GB-h de memoria al mes.
- **Bloqueo legal**: Vercel Hobby es solo para uso personal no comercial. "Cualquier método de solicitar o procesar pagos" o "anunciar la venta de un producto o servicio" es uso comercial y exige Pro ($20/mes) o Enterprise. Esto ya aplica al **frontend** actual en cuanto venda.
- Además: hay que adaptar Express 5 a funciones serverless, revisar duración máxima y tocar el enrutamiento de `/api` (relacionado con `api/[...path].ts`, que no se puede tocar sin autorización).
- Veredicto: no resuelve el costo $0 para una agencia que cobra.

### C. Netlify Free (frontend y/o funciones)
- Plan Free $0 para siempre, **300 créditos/mes con límite duro** (no cobra; al agotarse pausa **todos** los proyectos hasta el mes siguiente). Deploy de producción: 15 créditos; ancho de banda: 20 créditos/GB; solicitudes: 2 créditos por 10.000; cómputo: 10 créditos por GB-hora.
- El repo ya trae `netlify.toml` (SPA + cabeceras).
- Pros: dominio propio con SSL gratis, no cobra nunca en Free. Contras: 300 créditos se van rápido (20 deploys = todo el mes); migrar Express a Netlify Functions es trabajo; **sin verificar** en sus términos si Free permite uso comercial (la página de precios no lo prohíbe).

### D. Otras gratuitas (sin verificar a fondo)
- Cloudflare Pages/Workers (free): candidato fuerte para el frontend estático; Express no corre tal cual en Workers.
- Render/Koyeb free: el servidor se duerme tras inactividad (arranques lentos) y límites cambian seguido.
- Oracle Always Free: en pausa por decisión de Gabriel (pide tarjeta).

### Recomendación
1. **Backend: opción A** (Cloud Run optimizado), activada solo cuando Gabriel autorice por escrito pagar la deuda y reactivar facturación.
2. **Frontend**: Vercel Hobby no permite vender. Para mantener $0 de forma legítima, evaluar mover el frontend estático a **Cloudflare Pages o Netlify Free** (sin tocar código de la app), o pasar a Vercel Pro ($20/mes) cuando entre la primera venta.
3. Hasta entonces, el sitio puede seguir como **vitrina sin pagos reales** (Stripe TEST).

## 2. Checklist de preparación internacional

### Dominio `mycostaricatours.com`
- [ ] Confirmar quién es el registrador y la fecha de vencimiento (sin verificar).
- [ ] Apuntar DNS al hosting elegido (CNAME/ALIAS) y activar SSL automático.
- [ ] Redirigir `www` → raíz (o al revés) y `costaricatours2026.vercel.app` → dominio propio.
- [ ] Actualizar `APP_URL`, `PUBLIC_BASE_URL`, canonical, `public/robots.txt` y `public/sitemap.xml` (hoy apuntan a `costaricatours2026.vercel.app`).
- [ ] Correo del dominio: ver `docs/correo-dominio-propio.md` (SPF, DKIM, DMARC).

### i18n ES/EN
- [x] ES y EN habilitados (`src/i18n/locales.ts`), detección por `?lang=`, navegador y moneda (CRC/USD/EUR).
- [x] `hreflang` en `RouteMetadata` y en el sitemap.
- [ ] Migrar los ~1.500 ternarios `es ? … : …` restantes al catálogo (`docs/i18n.md` → "Qué falta"), priorizando reserva, checkout y correos. Header queda fuera (regla).
- [ ] Revisión humana de los textos EN de tours más vendidos.

### SEO
- [ ] Sitemap y robots con el dominio final; enviar a Google Search Console y Bing Webmaster (gratis).
- [ ] Datos estructurados `TouristTrip`/`Product` con precio y `Organization` en fichas.
- [ ] Título y descripción únicos por tour en ES y EN; imágenes con `alt` y peso optimizado.
- [ ] Medir Core Web Vitals (Lighthouse/PageSpeed, gratis).

### Aviso legal y privacidad
- [x] Rutas `/terms`, `/privacy`, `/cancellation`, `/sinac-escnna` y banner de cookies existen.
- [ ] Verificar datos de empresa, licencias ICT y fechas publicados (issue #193).
- [ ] Privacidad alineada a Ley 8968 (Costa Rica) y GDPR/CCPA para clientes de EE. UU. y Europa: responsable, finalidades, encargados (Firebase, Groq, Stripe, Sentry), derechos ARCO y contacto.
- [ ] Consentimiento de cookies real (no cargar analítica antes de aceptar).

### Pagos
- [ ] Stripe permanece en **TEST** (guard `ALLOW_STRIPE_LIVE`) hasta que Gabriel decida. Pasar a LIVE requiere: cuenta verificada, webhook de producción, prueba E2E (#174) y su OK escrito.
- [ ] Pagos a proveedores: solo manuales, registrados por el dueño. Nunca SINPE ni transferencias por cuenta del cliente.

### Variables de entorno (sin valores; los secretos van al gestor de secretos)
- Núcleo: `APP_URL`, `PUBLIC_BASE_URL`, `GCP_PROJECT`/`GOOGLE_CLOUD_PROJECT`, `FIREBASE_PROJECT_ID`, `FIRESTORE_DATABASE_ID`, `CLOUD_RUN_BACKEND_URL` (en el hosting del frontend).
- Seguridad: `PAYMENT_HMAC_SECRET`, `OPERATOR_API_KEY`, `WEBHOOK_SECRET`, `PROVIDER_ACTION_SECRET`, `AGENT_INTERNAL_TOKEN`, `CUSTOMER_INTAKE_JOB_TOKEN`.
- IA: clave de Groq (y `GEMINI_API_KEY` si se usa).
- Pagos: claves Stripe **TEST**, `ALLOW_STRIPE_LIVE` sin definir; PayPal en `sandbox`.
- Operación: `OWNER_EMAIL`, `ADMIN_ALERT_EMAIL`, `ENABLE_PROVIDER_PAYOUTS=false`, `SENTRY_DSN`/`VITE_SENTRY_DSN`.
- [ ] Revisar `.env.example` y dejar fuera del frontend todo lo que no empiece con `VITE_`.

## 3. Bloqueos actuales para salir online
1. **Facturación GCP desactivada** → backend 503. Deuda de octubre $24,22 (verificar crédito del caso 76812024). Reactivar requiere OK escrito de Gabriel.
2. **Deploy automático** en `deploy-cloud-run.yml` tras cada merge a `main`: cambiarlo a solo manual antes de reactivar (issue #444).
3. **Vercel Hobby no permite uso comercial** (pagos o venta de servicios).
4. **P0 #317**: rotar la credencial de la cuenta de servicio de GCP que se compartió fuera del gestor de secretos.
5. **Reglas de Firestore** de #455 sin publicar (requiere GCP activo).
6. Dominio propio aún no conectado; sitemap/robots/canonical apuntan a `*.vercel.app`.
7. Leads de prueba en producción (#331): marcarlos como prueba (regla de no borrar).
8. Stripe en TEST: no hay cobro real todavía (decisión de Gabriel).

## 4. PRs abiertos pendientes del OK de Gabriel
- **#465** `fix/codex-revision-pr446-452`: saca el libro `supplierPayouts` de rutas de operador y limita el panel de intake a la consulta vigente. Mergeable, sin conflictos. Recomendado fusionar (mejora seguridad).
- **#466** `feat/conserje-voz-jarvis`: prototipo de conserje por voz en `/conserje` (Web Speech API, $0). Mergeable; queda pendiente el comentario de Codex sobre preservar contexto en seguimientos. No desplegado.
- No se fusiona ninguno sin autorización explícita.

## 5. Orden propuesto (cuando Gabriel autorice)
1. Fusionar #465. 2. PR: `deploy-cloud-run.yml` solo manual. 3. Rotar credencial (#317). 4. Gabriel paga deuda y reactiva facturación con alerta de $1, scanning apagado y retención de 2 imágenes. 5. Deploy manual único y verificación de `/api/health`. 6. Publicar reglas Firestore. 7. Mover frontend a hosting gratuito comercial o Vercel Pro y conectar `mycostaricatours.com`. 8. SEO y Search Console. 9. Prueba E2E en TEST. 10. Decisión de Gabriel sobre Stripe LIVE.

## Fuentes (consultadas 26-oct-2026)
- Cloud Run pricing: https://cloud.google.com/run/pricing
- Vercel Fair Use (uso comercial): https://vercel.com/docs/limits/fair-use-guidelines
- Netlify pricing: https://www.netlify.com/pricing/
