/**
 * Monitoreo de errores del servidor con Sentry — opt-in.
 *
 * Solo se activa cuando SENTRY_DSN está definido. @sentry/node se carga con
 * import dinámico, así que sin DSN no se carga ni se inicializa nada. Nunca se
 * envía PII: dataCollection sin datos personales (equivalente a sendDefaultPii=false) y cada evento pasa por scrubEvent (correos,
 * teléfonos, usuario, cookies, cuerpos y query strings).
 */
import { scrubEvent, scrubValue } from '../../shared/observability/scrubPii';

type SentryNode = typeof import('@sentry/node');

let sentry: SentryNode | null = null;

function sampleRate(raw: string | undefined, fallback: number): number {
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 && value <= 1 ? value : fallback;
}

/** Inicializa Sentry si SENTRY_DSN existe. Devuelve true cuando quedó activo. */
export async function initServerSentry(env: NodeJS.ProcessEnv = process.env): Promise<boolean> {
  const dsn = env.SENTRY_DSN?.trim();
  if (!dsn) return false;
  if (sentry) return true;
  const Sentry = await import('@sentry/node');
  Sentry.init({
    dsn,
    environment: env.SENTRY_ENVIRONMENT || env.NODE_ENV || 'development',
    release: env.SENTRY_RELEASE || env.K_REVISION || undefined,
    // SDK v11 replaced sendDefaultPii with dataCollection: collect nothing personal.
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: { request: { allow: ['content-type', 'user-agent'] }, response: false },
      httpBodies: [],
      urlQueryParams: false,
      genAI: { inputs: false, outputs: false },
      databaseQueryData: false,
      queues: false,
      stackFrameVariables: false,
    },
    // Solo errores por defecto; trazas de rendimiento únicamente si se piden.
    tracesSampleRate: sampleRate(env.SENTRY_TRACES_SAMPLE_RATE, 0),
    beforeSend: (event) => scrubEvent(event),
    beforeSendTransaction: (event) => scrubEvent(event),
    beforeBreadcrumb: (breadcrumb) => scrubValue(breadcrumb),
  });
  sentry = Sentry;
  return true;
}

/** Reporta una excepción si Sentry está activo; no hace nada en caso contrario. */
export function captureServerException(error: unknown, context?: { method?: string; path?: string }): void {
  if (!sentry) return;
  sentry.withScope((scope) => {
    if (context?.method) scope.setTag('http.method', context.method);
    if (context?.path) scope.setTag('http.route', context.path);
    sentry?.captureException(error);
  });
}

/** Solo para tests: indica si el cliente quedó inicializado. */
export function isServerSentryActive(): boolean {
  return sentry !== null;
}
