/**
 * Counter Digital.
 *
 * Extraído de server.ts sin cambios de comportamiento: rutas, middlewares y
 * orden de registro se conservan (ver tests/serverRoutes.contract.test.ts).
 */

import { redactAssistantReplyMiddleware } from '../assistantContactRedaction';
import { askCounterDesk, getCounterOperationsSnapshot, organizeCounterDesk } from '../counterDeskService';
import { createRouter, requireAdmin, counterLimiter } from './shared';

/** Counter Digital. */
export const counterRouter = createRouter();

// ==========================================
// 🛎️ COUNTER DESK FULL STACK + ORGANIZADOR IA
// ==========================================
// Atención pública: usa el mismo conocimiento operativo del backend.
// Operaciones internas: snapshot/organización protegidos por autenticación.
counterRouter.post('/api/counter/ask', counterLimiter, redactAssistantReplyMiddleware, async (req, res) => {
  try {
    const result = await askCounterDesk({
      message: req.body?.message,
      sessionId: req.body?.sessionId,
      language: req.body?.language,
      context: req.body?.context
    });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Error en Counter Agent' });
  }
});

counterRouter.get('/api/counter/operations', requireAdmin, async (_req, res) => {
  try {
    res.json({ success: true, snapshot: await getCounterOperationsSnapshot() });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Error al obtener operaciones' });
  }
});

counterRouter.get('/api/counter/autopilot', requireAdmin, async (_req, res) => {
  try {
    const { runCounterSafeAutopilot } = await import('../counterDeskService');
    res.json(await runCounterSafeAutopilot());
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Error del autopilot' });
  }
});

counterRouter.post('/api/counter/organize', requireAdmin, async (_req, res) => {
  try {
    res.json(await organizeCounterDesk());
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Error del organizador IA' });
  }
});
