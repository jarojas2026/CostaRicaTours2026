/**
 * Pipeline de leads: vista admin/operador, cambio de estado y resumen diario.
 *
 * - GET  /api/admin/leads                 (requireOperator) lista, ?status= &priority= &triage=
 * - POST /api/admin/leads/triage          (requireOperator) descartar/restaurar en bloque (reversible)
 * - GET  /api/admin/leads/:id             (requireOperator) detalle con candidatos y borradores
 * - PATCH /api/admin/leads/:id/status     (requireOperator) máquina de estados con evidencia
 * - POST /api/admin/leads/:id/payment-link (requireOwner) enlace de checkout Stripe TEST de la
 *   reserva enlazada al lead (reutiliza createStripeCheckoutForBooking; no marca nada como pagado).
 * - POST /api/admin/leads/:id/link-booking (requireOwner) enlaza una reserva existente al lead;
 *   no sobrescribe otra salvo force=true; registra el cambio en lead.bookingHistory.
 * - GET  /api/admin/leads/:id/payment-status (requireOwner) solo lectura: estado de pago de la
 *   reserva enlazada y elegibilidad del voucher (misma regla que /api/bookings/:id/download-pdf).
 * - GET  /api/admin/leads/:id/supplier-payouts (requireOwner) pagos a proveedores del lead.
 * - POST /api/admin/leads/:id/supplier-payouts (requireOwner) registra un pago a proveedor
 *   pendiente_aprobacion; exige pago del cliente verificado por el servidor.
 * - POST /api/admin/leads/:id/supplier-payouts/:payoutId/approve|mark-paid|cancel (requireOwner)
 *   aprobar, registrar el pago MANUAL (referencia SINPE/transferencia + fecha) o cancelar.
 *   El sistema nunca ejecuta pagos ni llama a SINPE (docs/REGLAS_PLATAFORMA.md §7).
 * - POST /api/leads/quote-request        (público, rate-limit) solicitud de cotización desde
 *   /tour/:id con source "tour_page"; exige consentimiento Ley 8968 y un tour del catálogo.
 * - POST /api/leads/map-service-request (público, mismo antiabuso) consulta de un servicio del
 *   mapa (hotel/parque/transporte) con source "map_service"; Ley 8968; nunca /api/bookings.
 * - POST /api/internal/leads/digest       (X-Operator-Key = OPERATOR_API_KEY) resumen diario;
 *   solo registra (dry-run) salvo LEADS_DIGEST_ENABLED=true.
 */

import crypto from 'crypto';
import type express from 'express';
import { requireOperator, requireOwner } from '../authMiddleware';
import { createLeadPaymentLink } from '../leadPaymentLink';
import { getLeadPaymentStatus, linkLeadBooking } from '../leadBookingLink';
import { approveSupplierPayout, cancelSupplierPayout, createSupplierPayout, listSupplierPayouts, markSupplierPayoutPaid, type SupplierPayoutActor } from '../leadSupplierPayouts';
import { getBookingById } from '../bookingService';
import { createStripeCheckoutForBooking } from './payments';
import { buildLeadDigest, buildMapServiceLeadInput, buildTourPageLeadInput, captureLeadAndNotify, getLead, isLeadStatus, listLeads, mutateLead, transitionLead, triageLeads, LEAD_STATUSES } from '../leadPipeline';
import { isLeadPriority, isLeadTriageState, LEAD_PRIORITIES, LEAD_TRIAGE_STATES } from '../leadTriage';
import { createRouter, adminAccessPayload, chatLimiter } from './shared';
import { leadPublicReference, parseTourQuoteLeadPayload } from '../../shared/tourQuoteRequest';
import { TOURS } from '../../src/data/toursData';
import { MAP_TOURISM_SERVICES } from '../../src/data/mapServicesData';
import { parseMapServiceQuoteLeadPayload } from '../../shared/mapServiceQuoteRequest';
import { quoteRequestDailyGuard, quoteRequestGuard } from '../formAbuseGuard';

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
  const priority = req.query.priority ? String(req.query.priority) : undefined;
  if (priority && !isLeadPriority(priority)) return res.status(400).json({ success: false, error: `Prioridad inválida. Use: ${LEAD_PRIORITIES.join(', ')}` });
  const triage = req.query.triage ? String(req.query.triage) : undefined;
  if (triage && !isLeadTriageState(triage)) return res.status(400).json({ success: false, error: `Triaje inválido. Use: ${LEAD_TRIAGE_STATES.join(', ')}` });
  const leads = await listLeads({ status: status as any, priority: priority as any, triage: triage as any, limit: Number(req.query.limit) || 100 });
  res.json({ success: true, statuses: LEAD_STATUSES, priorities: LEAD_PRIORITIES, triageStates: LEAD_TRIAGE_STATES, leads });
});

leadsRouter.post('/api/admin/leads/triage', requireOperator, async (req, res) => {
  const ids = Array.isArray(req.body?.ids) ? req.body.ids.filter((id: unknown) => typeof id === 'string') : [];
  const action = req.body?.action;
  if (!ids.length || ids.length > 100) return res.status(400).json({ success: false, error: 'ids_required', message: 'Envía de 1 a 100 ids.' });
  if (action !== 'descartar' && action !== 'restaurar') return res.status(400).json({ success: false, error: 'invalid_action', message: 'action: descartar | restaurar' });
  const access = adminAccessPayload(req);
  const note = typeof req.body?.note === 'string' ? req.body.note.trim().slice(0, 200) : undefined;
  const result = await triageLeads(ids, action === 'descartar' ? 'descartado' : 'activo', { by: String(access.email || access.uid || access.role || 'operator') }, note);
  let alertsResolved = 0;
  if (action === 'descartar' && result.updated.length) {
    // Un lead descartado deja de pesar en "Riesgo operativo": se resuelven sus alertas abiertas.
    try {
      const { getAlerts, updateAlert } = await import('../alertService');
      const discarded = new Set(result.updated.map(l => l.id));
      const open = await getAlerts({ resolved: false });
      for (const alert of open) {
        if (alert.metadata && discarded.has(String((alert.metadata as any).leadId || ''))) {
          const updated = await updateAlert(alert.id, { resolved: true });
          if (updated.success) alertsResolved += 1;
        }
      }
    } catch (error: any) {
      console.warn('[leads] no se pudieron resolver alertas de leads descartados:', error?.message || error);
    }
  }
  res.json({ success: true, updated: result.updated.map(l => ({ id: l.id, triage: l.triage })), notFound: result.notFound, alertsResolved });
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

leadsRouter.post('/api/admin/leads/:id/payment-link', requireOwner, async (req, res) => {
  const result = await createLeadPaymentLink(String(req.params.id), { getLead, createCheckout: createStripeCheckoutForBooking });
  res.status(result.status).json(result.body);
});

leadsRouter.post('/api/admin/leads/:id/link-booking', requireOwner, async (req, res) => {
  const access = adminAccessPayload(req);
  const result = await linkLeadBooking(String(req.params.id), req.body, { by: String(access.email || access.uid || access.role || 'owner') }, { getBooking: getBookingById, mutateLead });
  res.status(result.status).json(result.body);
});

leadsRouter.get('/api/admin/leads/:id/payment-status', requireOwner, async (req, res) => {
  const result = await getLeadPaymentStatus(String(req.params.id), { getLead, getBooking: getBookingById });
  res.setHeader('Cache-Control', 'private, no-store');
  res.status(result.status).json(result.body);
});

/** Actor de pagos a proveedores: lo fija el servidor desde la sesión (nunca el body). Estas rutas son humanas. */
function supplierPayoutActor(req: express.Request): SupplierPayoutActor {
  const access = adminAccessPayload(req);
  return { by: String(access.email || access.uid || 'owner'), role: access.role, authMethod: (req as any).adminAccess?.authMethod ?? null, kind: 'human' };
}

const supplierPayoutDeps = { getLead, getBooking: getBookingById, mutateLead };

leadsRouter.get('/api/admin/leads/:id/supplier-payouts', requireOwner, async (req, res) => {
  const result = await listSupplierPayouts(String(req.params.id), supplierPayoutDeps);
  res.setHeader('Cache-Control', 'private, no-store');
  res.status(result.status).json(result.body);
});

leadsRouter.post('/api/admin/leads/:id/supplier-payouts', requireOwner, async (req, res) => {
  const result = await createSupplierPayout(String(req.params.id), req.body, supplierPayoutActor(req), supplierPayoutDeps);
  res.status(result.status).json(result.body);
});

leadsRouter.post('/api/admin/leads/:id/supplier-payouts/:payoutId/approve', requireOwner, async (req, res) => {
  const result = await approveSupplierPayout(String(req.params.id), String(req.params.payoutId), supplierPayoutActor(req), supplierPayoutDeps);
  res.status(result.status).json(result.body);
});

leadsRouter.post('/api/admin/leads/:id/supplier-payouts/:payoutId/mark-paid', requireOwner, async (req, res) => {
  const result = await markSupplierPayoutPaid(String(req.params.id), String(req.params.payoutId), req.body, supplierPayoutActor(req), supplierPayoutDeps);
  res.status(result.status).json(result.body);
});

leadsRouter.post('/api/admin/leads/:id/supplier-payouts/:payoutId/cancel', requireOwner, async (req, res) => {
  const result = await cancelSupplierPayout(String(req.params.id), String(req.params.payoutId), req.body, supplierPayoutActor(req), supplierPayoutDeps);
  res.status(result.status).json(result.body);
});

leadsRouter.post('/api/leads/quote-request', chatLimiter, quoteRequestGuard, quoteRequestDailyGuard, async (req, res) => {
  const parsed = parseTourQuoteLeadPayload(req.body);
  if (!parsed.ok) return res.status(400).json({ success: false, error: parsed.error });
  const tour = TOURS.find(t => t.id === parsed.payload.tourId);
  if (!tour) return res.status(404).json({ success: false, error: 'tour_not_found' });
  if (process.env.LEADS_PIPELINE_ENABLED === 'false') return res.status(503).json({ success: false, error: 'leads_disabled' });
  try {
    const { lead } = await captureLeadAndNotify(buildTourPageLeadInput(parsed.payload, tour));
    res.status(202).json({ success: true, status: lead.status, reference: leadPublicReference(lead.id), message: parsed.payload.language === 'en' ? 'Request received. We will send you a quote with confirmed availability and price before any payment.' : 'Solicitud recibida. Te enviaremos la cotización con disponibilidad y precio confirmados antes de cualquier pago.' });
  } catch (error: any) {
    console.warn('[leads] solicitud de cotización fallida:', error?.message || error);
    res.status(500).json({ success: false, error: 'lead_capture_failed' });
  }
});

leadsRouter.post('/api/leads/map-service-request', chatLimiter, quoteRequestGuard, quoteRequestDailyGuard, async (req, res) => {
  const parsed = parseMapServiceQuoteLeadPayload(req.body);
  if (!parsed.ok) return res.status(400).json({ success: false, error: parsed.error });
  const service = MAP_TOURISM_SERVICES.find(s => s.id === parsed.payload.serviceId);
  if (!service) return res.status(404).json({ success: false, error: 'service_not_found' });
  if (process.env.LEADS_PIPELINE_ENABLED === 'false') return res.status(503).json({ success: false, error: 'leads_disabled' });
  try {
    const { lead } = await captureLeadAndNotify(buildMapServiceLeadInput(parsed.payload, service));
    res.status(202).json({ success: true, status: lead.status, reference: leadPublicReference(lead.id), message: parsed.payload.language === 'en' ? 'Request received. We will send you a quote with confirmed availability and price before any payment.' : 'Solicitud recibida. Te enviaremos la cotización con disponibilidad y precio confirmados antes de cualquier pago.' });
  } catch (error: any) {
    console.warn('[leads] consulta de servicio del mapa fallida:', error?.message || error);
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
