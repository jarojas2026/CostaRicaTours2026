/**
 * Monitoreo de errores del frontend con Sentry — opt-in y lazy.
 *
 * Solo se activa si VITE_SENTRY_DSN está definido en el build. @sentry/react se
 * carga con import dinámico en un chunk aparte, fuera del bundle inicial. Los
 * errores capturados antes de que el SDK termine de cargar se encolan (máx. 20).
 * Sin PII: dataCollection sin datos personales (equivalente a sendDefaultPii=false) y scrubEvent en cada evento y breadcrumb.
 */
import { scrubEvent, scrubValue } from '../../shared/observability/scrubPii';

type SentryReact = typeof import('@sentry/react');

interface PendingError {
  error: unknown;
  componentStack?: string;
}

const MAX_PENDING = 20;
let sentry: SentryReact | null = null;
let loading: Promise<SentryReact | null> | null = null;
const pending: PendingError[] = [];

function sampleRate(raw: string | undefined, fallback: number): number {
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 && value <= 1 ? value : fallback;
}

export function initClientSentry(env: ImportMetaEnv = import.meta.env): Promise<SentryReact | null> {
  const dsn = env.VITE_SENTRY_DSN?.trim();
  if (!dsn) return Promise.resolve(null);
  loading ??= import('@sentry/react')
    .then((Sentry) => {
      Sentry.init({
        dsn,
        environment: env.VITE_SENTRY_ENVIRONMENT || env.MODE,
        release: env.VITE_SENTRY_RELEASE || undefined,
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
        tracesSampleRate: sampleRate(env.VITE_SENTRY_TRACES_SAMPLE_RATE, 0),
        beforeSend: (event) => scrubEvent(event),
        beforeBreadcrumb: (breadcrumb) => scrubValue(breadcrumb),
      });
      sentry = Sentry;
      for (const item of pending.splice(0)) send(item);
      return Sentry;
    })
    .catch((error: unknown) => {
      console.warn('Sentry no se pudo cargar; el monitoreo queda desactivado.', error);
      pending.length = 0;
      return null;
    });
  return loading;
}

function send({ error, componentStack }: PendingError): void {
  sentry?.withScope((scope) => {
    if (componentStack) scope.setContext('react', { componentStack });
    sentry?.captureException(error);
  });
}

/** Reporta un error de UI (p. ej. desde ErrorBoundary) si el monitoreo está activo. */
export function reportClientError(error: unknown, componentStack?: string): void {
  if (sentry) return send({ error, componentStack });
  if (loading && pending.length < MAX_PENDING) pending.push({ error, componentStack });
}
