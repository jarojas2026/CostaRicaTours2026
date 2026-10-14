/**
 * Composición de la aplicación Express (sin efectos secundarios).
 *
 * createApp() registra middlewares globales, limitadores y los routers de
 * dominio en el mismo orden que el server.ts monolítico. No escucha puertos ni
 * arranca workers: eso queda en server.ts, lo que permite inspeccionar las rutas
 * en tests (tests/serverRoutes.contract.test.ts).
 */
import express, { type Express } from 'express';
import { installAsyncRouteSafety, apiErrorHandler } from './asyncRoutes';
import { commerceAdminRouter } from './commerceAdminRouter';
import { knowledgeCityRouter } from './knowledgeCityRouter';
import { digitalCityApplicationRouter } from './digitalCityApplicationRouter';
import { generalApiLimiter, apiAdmission, llmLimiter } from './routes/shared';
import { domainRouters } from './routes';

type RawBodyRequest = express.Request & { rawBody?: Buffer };

export function createApp(): Express {
  const app = express();
  // Every async handler registered below forwards rejections to next(err).
  installAsyncRouteSafety(app);

  app.set('trust proxy', 1);
  app.use(express.json({ limit: '256kb', verify: (req, _res, buf) => { (req as RawBodyRequest).rawBody = Buffer.from(buf); } }));
  app.use(express.urlencoded({ extended: true, limit: '32kb', parameterLimit: 100 }));

  app.use('/api/', generalApiLimiter, apiAdmission.middleware);
  // Stricter per-IP budget for routes that spend LLM / model tokens.
  app.use(['/api/agents', '/api/agent/counter', '/api/claude', '/api/gemini', '/api/massive', '/api/ai', '/api/ml', '/api/counter/ask'], llmLimiter);
  // Admin routers are mounted after the global limiter so they share its budget.
  app.use('/api/admin/commerce', commerceAdminRouter);
  app.use('/api/admin/knowledge', knowledgeCityRouter);
  app.use('/api/digital-city/applications', digitalCityApplicationRouter);

  // Domain routers (backend/routes) in the original registration order.
  for (const router of domainRouters) app.use(router);

  // Unknown API paths must remain API errors; never let the production SPA
  // fallback disguise a missing backend route as a successful HTML response.
  app.use('/api', (req, res) => {
    return res.status(404).json({
      success: false,
      error: 'api_route_not_found',
      message: 'Ruta de API no encontrada. / API route not found.',
    });
  });

  // Async handler rejections (see installAsyncRouteSafety) end here instead of
  // crashing the process or leaking stack traces.
  app.use(apiErrorHandler);

  return app;
}
