/**
 * Pipeline de leads: vista admin/operador, cambio de estado y resumen diario.
 *
 * - GET  /api/admin/leads                 (requireOperator) lista, ?status=
 * - GET  /api/admin/leads/:id             (requireOperator) detalle con candidatos y borradores
 * - PATCH /api/admin/leads/:id/status     (requireOperator) máquina de estados con evidencia
 * - POST /api/leads/quote-request        (público, rate-limit) solicitud de cotización desde
 *   /tour/:id con source "tour_page"; exige consentimiento Ley 8968 y un tour del catálogo.
 * - POST /api/internal/leads/digest       (X-Operator-Key = OPERATOR_API_KEY) resumen diario;
 *   solo registra (dry-run) salvo LEADS_DIGEST_ENABLED=true.
 */

import crypto from 'crypto';
import type express from 'express';
import { requireOperator } from '../authMiddleware';
import { buildLeadDigest, buildTourPageLeadInput, captureLeadAndNotify, getLead, isLeadStatus, listLeads, transitionLead, LEAD_STATUSES } from '../leadPipeline';
import { createRouter, adminAccessPayload, chatLimiter } from './shared';
import { parseTourQuoteLeadPayload } from '../../shared/tourQuoteRequest';
import { TOURS } from '../../src/data/toursData';
import { quoteRequestGuard } from '../formAbuseGuard';

export const leadsRouter = createRouter();

function hasOperatorKey(req: express.Request): boolean {
  const secret = process.env.OPERATOR_API_KEY;
  const provided = req.headers['x-operator-key'];
  if (!secret || typeof provided !== 'string' || !provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(secret);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

leadsRouter.get('/api/admin/leads', requireOperator, async (req, res) => {
  const status = req.query.status ? String(req.query.status) : undefined;
  if (status && !isLeadStatus(status)) return res.status(400).json({ success: false, error: `Estado inválido. Use: ${LEAD_STATUSES.join(', ')}` });
  const leads = await listLeads({ status: status as any, limit: Number(req.query.limit) || 100 });
  res.json({ success: true, statuses: LEAD_STATUSES, leads });
});

leadsRouter.get('/api/admin/leads/:id', requireOperator, async (req, res) => {
  const lead = await getLead(String(req.params.id));
  if (!lead) return res.status(404).json({ success: false, error: 'Lead no encontrado.' });
  res.json({ success: true, lead });
});

leadsRouter.patch('/api/admin/leads/:id/status', requireOperator, async (req, res) => {
  const access = adminAccessPayload(req);
  const result = await transitionLead(
    String(req.params.id),
    req.body?.status,
    { by: String(access.email || access.uid || access.role || 'operator'), role: access.role },
    { note: req.body?.note, evidence: req.body?.evidence },
  );
  if (!result.ok) {
    const code = result.error === 'not_found' ? 404 : result.error === 'admin_required' ? 403 : result.error === 'invalid_transition' ? 409 : 400;
    return res.status(code).json({ success: false, error: result.error, message: result.message });
  }
  res.json({ success: true, lead: result.lead });
});

leadsRouter.post('/api/leads/quote-request', chatLimiter, quoteRequestGuard, async (req, res) => {
  const parsed = parseTourQuoteLeadPayload(req.body);
  if (!parsed.ok) return res.status(400).json({ success: false, error: parsed.error });
  const tour = TOURS.find(t => t.id === parsed.payload.tourId);
  if (!tour) return res.status(404).json({ success: false, error: 'tour_not_found' });
  if (process.env.LEADS_PIPELINE_ENABLED === 'false') return res.status(503).json({ success: false, error: 'leads_disabled' });
  try {
    const { lead } = await captureLeadAndNotify(buildTourPageLeadInput(parsed.payload, tour));
    res.status(202).json({ success: true, status: lead.status, message: parsed.payload.language === 'en' ? 'Request received. We will send you a quote with confirmed availability and price before any payment.' : 'Solicitud recibida. Te enviaremos la cotización con disponibilidad y precio confirmados antes de cualquier pago.' });
  } catch (error: any) {
    console.warn('[leads] solicitud de cotización fallida:', error?.message || error);
    res.status(500).json({ success: false, error: 'lead_capture_failed' });
  }
});

leadsRouter.post('/api/internal/leads/digest', async (req, res) => {
  if (!hasOperatorKey(req)) return res.status(401).json({ success: false, error: 'No autorizado' });
  const leads = await listLeads({ limit: 500 });
  const digest = buildLeadDigest(leads);
  const enabled = process.env.LEADS_DIGEST_ENABLED === 'true';
  const dryRun = !enabled || req.body?.dryRun === true;
  console.log(`[leads-digest] ${dryRun ? 'DRY-RUN' : 'ENVÍO'}\n${digest.text}`);
  let delivered = false;
  if (!dryRun) {
    const { createAlert } = await import('../alertService');
    await createAlert({
      source: 'Resumen diario de leads',
      severity: digest.stale.length ? 'warning' : 'info',
      title: `Leads: ${digest.total} total, ${digest.stale.length} sin respuesta >24h`,
      message: digest.text,
      metadata: { byStatus: digest.byStatus, staleIds: digest.stale.map(s => s.id) },
    });
    delivered = true;
  }
  res.json({ success: true, dryRun, delivered, digest });
});
