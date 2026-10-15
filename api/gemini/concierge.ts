import type { VercelRequest, VercelResponse } from '@vercel/node';
import gatewayHandler from '../[...path].js';

/**
 * Public Concierge facade.
 *
 * The browser should not select an internal specialist implementation or model
 * engine directly. Requests are normalized to the canonical concierge/tool
 * loop, while internal routing remains available behind the Cloud Run service.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('allow', 'POST');
    return res.status(405).json({ success: false, error: 'method_not_allowed' });
  }

  const input = req.body && typeof req.body === 'object' ? req.body : {};
  const proxyReq = {
    ...req,
    // IncomingMessage.headers/method pueden ser getters del prototipo: el spread los pierde en Vercel
    // y el gateway respondía 503 backend_gateway_unavailable (igual que se corrigió en api/ai/chat.ts).
    headers: req.headers,
    method: req.method,
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
