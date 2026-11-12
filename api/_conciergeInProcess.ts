import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Concierge en proceso dentro de Vercel (sin Cloud Run, costo $0).
 *
 * `CONCIERGE_UPSTREAM=cloud_run` conserva el proxy histórico al backend privado
 * para volver atrás sin cambiar código. Por defecto el bucle canónico del
 * concierge corre en esta misma función (bundle de `backend/vercel/conciergeRuntime.ts`).
 */
export function conciergeUsesCloudRun(env: NodeJS.ProcessEnv = process.env): boolean {
  return String(env.CONCIERGE_UPSTREAM || '').trim().toLowerCase() === 'cloud_run';
}

function requestHeaders(req: VercelRequest): Record<string, unknown> {
  // IncomingMessage.headers puede ser un getter del prototipo.
  const headers = (req as Partial<VercelRequest> | null | undefined)?.headers;
  return headers && typeof headers === 'object' ? headers as Record<string, unknown> : {};
}

export async function respondInProcess(req: VercelRequest, res: VercelResponse, body: Record<string, unknown>) {
  res.setHeader('cache-control', 'no-store, max-age=0');
  res.setHeader('x-crt-concierge-runtime', 'vercel-in-process');
  let result: { status: number; body: any };
  try {
    // Import dinámico con ruta literal: Vercel (nft) lo incluye en la función.
    const runtime = await import('./_lib/conciergeRuntime.mjs');
    result = await runtime.runConciergeInProcess(body, requestHeaders(req));
  } catch (error: any) {
    console.error('[concierge-in-process]', error?.message || error);
    const en = body.language === 'en';
    result = {
      status: 200,
      body: {
        success: false,
        error: 'assistant_temporarily_unavailable',
        aiAvailable: false,
        reply: en
          ? 'Our assistant is temporarily unavailable. If this is an emergency, call 911 (free, nationwide). For tours, write to us on WhatsApp.'
          : 'Nuestro asistente no está disponible por el momento. Si es una emergencia, llama al 911 (gratis, todo el país). Para tours, escríbenos por WhatsApp.',
      },
    };
  }
  return res.status(result.status).json(result.body);
}
