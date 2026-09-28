import type { VercelRequest, VercelResponse } from '@vercel/node';
import gatewayHandler from '../[...path]';

/**
 * Public Counter facade.
 *
 * The historical Cloud Run `/api/agent/counter` implementation contains a
 * compatibility path that predates the canonical reservation lifecycle. The
 * public Vercel surface therefore routes Counter conversations through the
 * generic concierge/tool loop instead. That loop uses the authoritative
 * catalog/availability tools and `create_reservation`, whose server-side
 * contract requires explicit customer confirmation and creates only a
 * pending-payment reservation.
 *
 * Specialist agents still exist internally; this facade only prevents the
 * traveler-facing endpoint from selecting a legacy mutation path directly.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('allow', 'POST');
    return res.status(405).json({ success: false, error: 'method_not_allowed' });
  }

  const input = req.body && typeof req.body === 'object' ? req.body : {};
  const proxyReq = {
    ...req,
    url: '/api/gemini/concierge',
    body: {
      message: String(input.message || ''),
      language: input.language === 'en' ? 'en' : 'es',
      history: Array.isArray(input.history) ? input.history.slice(-12) : [],
      context: input.context && typeof input.context === 'object' ? input.context : {},
      sessionId: input.sessionId ? String(input.sessionId) : undefined,
      agentId: 'concierge',
      engine: 'auto',
    },
  } as VercelRequest;

  return gatewayHandler(proxyReq, res);
}
