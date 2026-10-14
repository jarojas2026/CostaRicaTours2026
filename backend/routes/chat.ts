/**
 * Sesión y memoria de chat firmadas.
 *
 * Extraído de server.ts sin cambios de comportamiento: rutas, middlewares y
 * orden de registro se conservan (ver tests/serverRoutes.contract.test.ts).
 */

import express from 'express';
import { issueChatSession, verifyChatSessionAccess } from '../signedAccessTokens';
import { createRouter, chatSessionTokenFrom, chatLimiter } from './shared';

/** Sesión y memoria de chat. */
export const chatRouter = createRouter();

// Conversational memory is only reachable with a server-minted session id plus
// its HMAC token (x-chat-session-token). Unknown or guessed ids are rejected.
// chatSessionTokenFrom lives in ./shared (also used by the Gemini concierge).
function requireChatSession(source: 'query' | 'body' | 'either') {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const sessionId = String(
      source === 'query' ? req.query.sessionId || ''
        : source === 'body' ? req.body?.sessionId || ''
          : req.query.sessionId || req.body?.sessionId || ''
    ).trim();
    if (!sessionId) return res.status(400).json({ error: 'sessionId es requerido' });
    if (!verifyChatSessionAccess(sessionId, chatSessionTokenFrom(req))) {
      return res.status(401).json({ error: 'chat_session_unauthorized', message: 'Sesión de chat no autorizada.' });
    }
    (req as any).chatSessionId = sessionId;
    next();
  };
}

chatRouter.post('/api/chat/session', chatLimiter, (_req, res) => {
  res.status(201).json({ success: true, ...issueChatSession() });
});

chatRouter.get('/api/chat/history', requireChatSession('query'), async (req, res) => {
  try {
    const { getOperationalMemory } = await import('../memoryService');
    const sessionId = String((req as any).chatSessionId);
    const memory = await getOperationalMemory(sessionId);
    res.json({ history: memory.turns, memory: { summary: memory.summary, facts: memory.facts, preferences: memory.preferences, activeGoals: memory.activeGoals, decisions: memory.decisions, lastAgent: memory.lastAgent, lastUpdatedAt: memory.lastUpdatedAt }});
  } catch (err) { res.status(400).json({ error: err instanceof Error ? err.message : 'No se pudo cargar la memoria' }); }
});

chatRouter.post('/api/chat/history', requireChatSession('body'), async (req, res) => {
  try {
    const { saveChatHistory } = await import('../memoryService');
    const sessionId = String((req as any).chatSessionId);
    if (!Array.isArray(req.body?.history)) return res.status(400).json({ error: 'sessionId e history son requeridos' });
    const memory = await saveChatHistory(sessionId, req.body.history.slice(-100));
    res.json({ success: true, memory: { summary: memory.summary, facts: memory.facts, preferences: memory.preferences, activeGoals: memory.activeGoals, decisions: memory.decisions, lastAgent: memory.lastAgent, lastUpdatedAt: memory.lastUpdatedAt }});
  } catch (err) { res.status(400).json({ error: err instanceof Error ? err.message : 'No se pudo guardar la memoria' }); }
});

chatRouter.delete('/api/chat/history', requireChatSession('either'), async (req, res) => {
  try {
    const { clearOperationalMemory } = await import('../memoryService');
    await clearOperationalMemory(String((req as any).chatSessionId));
    res.json({ success: true });
  } catch (err) { res.status(400).json({ error: err instanceof Error ? err.message : 'No se pudo borrar la memoria' }); }
});
