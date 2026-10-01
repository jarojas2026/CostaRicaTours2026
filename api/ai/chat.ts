import type { VercelRequest, VercelResponse } from '@vercel/node';
import gatewayHandler from '../[...path].js';

/**
 * Backwards-compatible traveler chat facade.
 *
 * The floating WhatsApp-style assistant historically posts to `/api/ai/chat`.
 * Keep that public contract, but normalize every request into the canonical
 * concierge/tool loop instead of exposing a second chat engine or a legacy
 * mutation path. The canonical loop owns memory, live tools and safe booking
 * transitions.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('allow', 'POST');
    return res.status(405).json({ success: false, error: 'method_not_allowed' });
  }

  const input = req.body && typeof req.body === 'object' ? req.body : {};
  const message = String(input.message || '').trim();
  if (!message) {
    return res.status(400).json({ success: false, error: 'message_required' });
  }

  const proxyReq = {
    ...req,
    url: '/api/gemini/concierge',
    body: {
      message: message.slice(0, 8000),
      language: input.language === 'en' ? 'en' : 'es',
      history: Array.isArray(input.history) ? input.history.slice(-12) : [],
      context: input.context && typeof input.context === 'object'
        ? { ...input.context, channel: input.context.channel || 'web:ai-chat' }
        : { channel: 'web:ai-chat' },
      sessionId: input.sessionId ? String(input.sessionId).slice(0, 180) : undefined,
      agentId: 'concierge',
      engine: 'auto',
    },
  } as VercelRequest;

  res.setHeader('cache-control', 'no-store, max-age=0');
  return gatewayHandler(proxyReq, res);
}
