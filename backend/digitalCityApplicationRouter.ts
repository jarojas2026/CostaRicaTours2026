import { Router, type Request, type Response, type NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { getFirebaseAdminAuth } from './firebaseAdminRuntime';
import { requireOperator } from './authMiddleware';
import {
  CityApplicationError, listCityApplicationsForReview, listMyCityApplications,
  submitCityApplication, triageCityApplication, resubmitCityApplication, withdrawCityApplication, type CityApplicationStatus
} from './digitalCityApplicationService';

export const digitalCityApplicationRouter = Router();
const intakeLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false,
  message: { error: 'Demasiadas solicitudes de inscripción. Intente nuevamente más tarde.' }
});

async function requireVerifiedApplicant(req: Request, res: Response, next: NextFunction) {
  const auth = String(req.headers.authorization || '');
  if (!auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Inicie sesión antes de enviar una solicitud.' });
  try {
    const decoded = await getFirebaseAdminAuth().verifyIdToken(auth.slice(7).trim(), true);
    if (!decoded.uid || decoded.email_verified !== true) {
      return res.status(403).json({ error: 'Verifique su correo electrónico antes de participar.' });
    }
    (req as any).cityApplicantUid = decoded.uid;
    return next();
  } catch {
    return res.status(401).json({ error: 'Sesión inválida o expirada.' });
  }
}

function failure(res: Response, error: unknown) {
  if (error instanceof CityApplicationError) {
    const status = error.code === 'not_found' ? 404 : error.code === 'storage_unavailable' ? 503 : error.code === 'rate_limited' ? 429 : error.code === 'invalid_transition' ? 409 : 400;
    return res.status(status).json({ error: error.message, code: error.code });
  }
  console.error('City application storage request failed', error instanceof Error ? error.name : 'unknown');
  return res.status(503).json({ error: 'La solicitud no pudo procesarse; no se confirma ningún registro.' });
}

// Applications are private drafts for moderation, not public directory entities.
digitalCityApplicationRouter.post('/', intakeLimiter, requireVerifiedApplicant, async (req, res) => {
  try {
    const data = await submitCityApplication(req.body || {}, (req as any).cityApplicantUid);
    return res.status(data.idempotent ? 200 : 201).json({
      id: data.application.id, status: data.application.status,
      createdAt: data.application.createdAt, idempotent: data.idempotent,
      published: false, verified: false, bookable: false, paymentEnabled: false
    });
  } catch (error) { return failure(res, error); }
});

digitalCityApplicationRouter.get('/mine', requireVerifiedApplicant, async (req, res) => {
  try {
    const applications = await listMyCityApplications((req as any).cityApplicantUid);
    return res.json({ applications });
  } catch (error) { return failure(res, error); }
});

// Revision-guarded private amendments: never accept an applicant UID from body.
digitalCityApplicationRouter.patch('/:id/resubmit', intakeLimiter, requireVerifiedApplicant, async (req, res) => {
  try {
    const result = await resubmitCityApplication(
      String(req.params.id || ''), (req as any).cityApplicantUid,
      req.body || {}, Number(req.body?.expectedRevision)
    );
    return res.json(result);
  } catch (error) { return failure(res, error); }
});

// Withdrawal minimizes the applicant's public-facing fields. It is not a
// substitute for legally reviewed, full erasure/retention handling.
digitalCityApplicationRouter.post('/:id/withdraw', intakeLimiter, requireVerifiedApplicant, async (req, res) => {
  try {
    const result = await withdrawCityApplication(
      String(req.params.id || ''), (req as any).cityApplicantUid,
      Number(req.body?.expectedRevision)
    );
    return res.json(result);
  } catch (error) { return failure(res, error); }
});

// Operator API keys cannot authorize moderation. Strictly require admin role.
digitalCityApplicationRouter.use('/admin', requireOperator, (req, res, next) => {
  if ((req as any).adminAccess?.role !== 'admin' || !(req as any).user?.uid) {
    return res.status(403).json({ error: 'Solo un administrador autenticado puede revisar solicitudes.' });
  }
  return next();
});

digitalCityApplicationRouter.get('/admin/queue', async (_req, res) => {
  try { return res.json({ applications: await listCityApplicationsForReview() }); }
  catch (error) { return failure(res, error); }
});

digitalCityApplicationRouter.post('/admin/:id/triage', intakeLimiter, async (req, res) => {
  try {
    const outcome = await triageCityApplication(
      String(req.params.id || ''),
      (req as any).user.uid,
      String(req.body?.status || '') as CityApplicationStatus,
      String(req.body?.reason || '')
    );
    return res.json(outcome);
  } catch (error) { return failure(res, error); }
});
