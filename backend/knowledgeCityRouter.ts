import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { requireOperator } from './authMiddleware';
import {
  KnowledgeValidationError,
  getKnowledgeCityOverview,
  listKnowledgeArticles,
  saveKnowledgeArticle
} from './knowledgeCityService';

export const knowledgeCityRouter = Router();
knowledgeCityRouter.use(requireOperator);
knowledgeCityRouter.use(rateLimit({ windowMs: 60_000, limit: 30, standardHeaders: true, legacyHeaders: false }));
knowledgeCityRouter.use((_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});

function requireKnowledgeAdmin(req: any, res: any, next: any) {
  if (req.adminAccess?.role !== 'admin' || !req.adminAccess.email) {
    return res.status(403).json({ error: 'Only authenticated administrators can publish knowledge' });
  }
  next();
}
function respondError(error: unknown, res: any) {
  if (error instanceof KnowledgeValidationError) return res.status(422).json({ error: error.message });
  if (error instanceof Error && error.message.includes('storage unavailable')) return res.status(503).json({ error: 'Knowledge storage unavailable' });
  console.warn('[knowledge-city] request failed', error instanceof Error ? error.name : 'unknown');
  return res.status(500).json({ error: 'Knowledge request failed' });
}

knowledgeCityRouter.get('/overview', async (_req, res) => {
  try {
    return res.json(await getKnowledgeCityOverview());
  } catch (error) { return respondError(error, res); }
});

knowledgeCityRouter.get('/articles', async (_req, res) => {
  try {
    const articles = await listKnowledgeArticles();
    // Admin-only body access. Operators can see metrics but not private playbooks.
    const role = (_req as any).adminAccess?.role;
    return res.json({ articles: role === 'admin' ? articles : articles.filter(x => x.visibility === 'public' && x.status === 'published') });
  } catch (error) { return respondError(error, res); }
});

knowledgeCityRouter.post('/articles', requireKnowledgeAdmin, async (req, res) => {
  try {
    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) throw new KnowledgeValidationError('Invalid request body');
    const article = await saveKnowledgeArticle(req.body, (req as any).adminAccess.email);
    return res.status(201).json({ article });
  } catch (error) { return respondError(error, res); }
});

knowledgeCityRouter.put('/articles/:id', requireKnowledgeAdmin, async (req, res) => {
  try {
    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) throw new KnowledgeValidationError('Invalid request body');
    const article = await saveKnowledgeArticle(req.body, (req as any).adminAccess.email, String(req.params.id));
    return res.json({ article });
  } catch (error) { return respondError(error, res); }
});
