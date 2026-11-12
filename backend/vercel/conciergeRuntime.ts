/**
 * Concierge en proceso para Vercel (Hobby, $0).
 *
 * Ejecuta el mismo manejador canónico `/api/gemini/concierge` del backend
 * Express (agentsRouter: comprensión determinista, redacción de contactos,
 * herramientas de conocimiento y proveedores IA configurados, p. ej. Groq vía
 * `openai_compat`) dentro de la función de Vercel, sin Cloud Run.
 *
 * Este archivo se empaqueta con esbuild en `api/_lib/conciergeRuntime.mjs`
 * (`npm run build:concierge-runtime`) porque las funciones de Vercel se emiten
 * como ESM y el backend usa imports relativos sin extensión.
 *
 * Degradación segura:
 * - Sin credenciales de Firebase en Vercel, Firestore queda desactivado
 *   (sin memoria de conversación ni registro de leads); nunca espera ADC.
 * - Sin clave de IA, o si el motor falla o se agota el tiempo, responde con
 *   las respuestas deterministas de conocimiento (emergencias → 911 + CCSS).
 */
import http from 'node:http';
import net from 'node:net';
import express, { type Express } from 'express';

export type ConciergeRuntimeResult = { status: number; body: any };

const CONCIERGE_PATH = '/api/gemini/concierge';
const DEFAULT_DEADLINE_MS = 50_000;

let appPromise: Promise<Express> | null = null;

/** Firestore Admin solo con credencial explícita; fuera de Google no hay ADC. */
export function configureVercelRuntimeEnv(env: NodeJS.ProcessEnv = process.env) {
  const hasExplicitCredential = String(env.FIREBASE_SERVICE_ACCOUNT || '').trim().length > 0;
  if (!hasExplicitCredential && env.CRT_FIRESTORE_ADMIN_DISABLED === undefined) {
    env.CRT_FIRESTORE_ADMIN_DISABLED = 'true';
  }
  // Sin almacén no hay leads que guardar: no se intenta el pipeline (ni avisos).
  if (env.CRT_FIRESTORE_ADMIN_DISABLED === 'true' && env.LEADS_PIPELINE_ENABLED === undefined) {
    env.LEADS_PIPELINE_ENABLED = 'false';
  }
}

async function buildApp(): Promise<Express> {
  const [{ agentsRouter }, { llmLimiter }, { installAsyncRouteSafety, apiErrorHandler }] = await Promise.all([
    import('../routes/agents'),
    import('../routes/shared'),
    import('../asyncRoutes'),
  ]);
  const app = express();
  installAsyncRouteSafety(app);
  app.set('trust proxy', 1);
  // Mismo presupuesto por IP que el backend (memoria por instancia en Vercel).
  app.use(CONCIERGE_PATH, llmLimiter);
  app.use(agentsRouter);
  app.use((_req, res) => res.status(404).json({ success: false, error: 'api_route_not_found' }));
  app.use(apiErrorHandler);
  return app;
}

function getApp(): Promise<Express> {
  if (!appPromise) {
    appPromise = buildApp().catch(err => {
      appPromise = null; // un fallo de carga no envenena la siguiente solicitud
      throw err;
    });
  }
  return appPromise;
}

function clientIp(headers: Record<string, unknown>): string {
  const forwarded = String(headers['x-forwarded-for'] || '').split(',')[0].trim();
  return forwarded || String(headers['x-real-ip'] || '').trim() || '0.0.0.0';
}

function pickHeaders(headers: Record<string, unknown>): Record<string, string> {
  // Solo lo que el manejador canónico usa; nada de infraestructura.
  const out: Record<string, string> = { 'content-type': 'application/json' };
  for (const name of ['x-chat-session-token', 'accept-language', 'user-agent']) {
    const value = headers[name];
    if (typeof value === 'string' && value) out[name] = value;
  }
  return out;
}

/** Respuesta determinista sin modelo (emergencias, guías ICT, parques, catálogo). */
export async function deterministicConciergeFallback(body: any): Promise<ConciergeRuntimeResult> {
  const message = String(body?.message || '');
  const lang: 'es' | 'en' = body?.language === 'en' ? 'en' : 'es';
  try {
    const { knowledgeToolReply } = await import('../knowledgeReplies');
    const { redactBusinessContactsText } = await import('../assistantContactRedaction');
    const toolReply = knowledgeToolReply(message, lang);
    if (toolReply) {
      return { status: 200, body: { success: true, reply: redactBusinessContactsText(toolReply, lang), source: 'knowledge_tools', aiAvailable: false } };
    }
    const { TOURS } = await import('../../src/data/toursData');
    const { understandConciergeMessage, deterministicConciergeReply } = await import('../conciergeUnderstanding');
    const understanding = understandConciergeMessage(message, TOURS, { requestedLanguage: lang });
    const reply = deterministicConciergeReply(understanding);
    if (reply) {
      return { status: 200, body: { success: true, reply: redactBusinessContactsText(reply, lang), source: 'deterministic_extraction', aiAvailable: false } };
    }
  } catch (err: any) {
    console.warn('[concierge-runtime] fallback determinista no disponible:', err?.message || err);
  }
  return {
    status: 200,
    body: {
      success: false,
      error: 'assistant_temporarily_unavailable',
      aiAvailable: false,
      reply: lang === 'en'
        ? 'Our assistant is temporarily unavailable. If this is an emergency, call 911 (free, nationwide). For tours, write to us on WhatsApp.'
        : 'Nuestro asistente no está disponible por el momento. Si es una emergencia, llama al 911 (gratis, todo el país). Para tours, escríbenos por WhatsApp.',
    },
  };
}

/**
 * Ejecuta el concierge canónico en proceso. `body` ya viene normalizado por la
 * fachada pública (message, language, history, context, sessionId, agentId,
 * engine). Nunca lanza: ante cualquier fallo devuelve la respuesta determinista.
 */
export async function runConciergeInProcess(
  body: Record<string, unknown>,
  headers: Record<string, unknown> = {},
  options: { deadlineMs?: number } = {},
): Promise<ConciergeRuntimeResult> {
  configureVercelRuntimeEnv();
  let app: Express;
  try {
    app = await getApp();
  } catch (err: any) {
    console.error('[concierge-runtime] no se pudo cargar el concierge:', err?.message || err);
    return deterministicConciergeFallback(body);
  }

  const req = new http.IncomingMessage(new net.Socket());
  req.method = 'POST';
  req.url = CONCIERGE_PATH;
  req.headers = pickHeaders(headers);
  Object.defineProperty(req, 'ip', { value: clientIp(headers), configurable: true, enumerable: true });
  (req as any).body = body;
  const res = new http.ServerResponse(req);

  const deadlineMs = options.deadlineMs ?? DEFAULT_DEADLINE_MS;
  return new Promise<ConciergeRuntimeResult>(resolve => {
    let settled = false;
    let status = 200;
    const finish = (result: ConciergeRuntimeResult | Promise<ConciergeRuntimeResult>) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      Promise.resolve(result).then(resolve, () => resolve(deterministicConciergeFallback(body)));
    };
    const timer = setTimeout(() => {
      console.warn('[concierge-runtime] tiempo agotado; respuesta determinista');
      finish(deterministicConciergeFallback(body));
    }, deadlineMs);

    // Captura la respuesta JSON del manejador (después de redactar contactos).
    // Se define como propiedad propia: Express cambia el prototipo de req/res.
    Object.assign(res, {
      status(code: number) { status = code; return res; },
      json(payload: unknown) { finish({ status, body: payload }); return res; },
      send(payload: unknown) {
        let parsed = payload;
        if (typeof payload === 'string') { try { parsed = JSON.parse(payload); } catch { /* texto plano */ } }
        finish({ status, body: parsed });
        return res;
      },
      setHeader() { return res; },
      set() { return res; },
      end() { finish({ status, body: null }); return res; },
    });

    try {
      app(req as any, res as any, (err?: unknown) => {
        if (err) console.error('[concierge-runtime]', (err as any)?.message || err);
        finish(deterministicConciergeFallback(body));
      });
    } catch (err: any) {
      console.error('[concierge-runtime]', err?.message || err);
      finish(deterministicConciergeFallback(body));
    }
  });
}
