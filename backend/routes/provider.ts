/**
 * Proveedores: operación, portal, estado y payouts.
 *
 * Extraído de server.ts sin cambios de comportamiento: rutas, middlewares y
 * orden de registro se conservan (ver tests/serverRoutes.contract.test.ts).
 */

import { resolveOperatorAccess } from '../authMiddleware';
import { getBookingById } from '../bookingService';
import { getNativeEngineStatus } from '../nativeAutomationEngine';
import { executeCustomerBookingConfirmation } from '../nativeWorkflows';
import { executeAutomatedProviderPayouts } from '../providerPayoutService';
import { getProvidersOverview, handleProviderAction } from '../providerCommunicationService';
import { verifyProviderPortalToken } from '../providerPortalService';
import { toProviderPortalOrder } from '../providerPortalView';
import { getFirestoreDb } from '../bookingService';
import { createRouter, requireAdmin } from './shared';

/** Estado del motor nativo y acciones de proveedores. */
export const providerOpsRouter = createRouter();

// ==========================================
// ⚡ MOTOR DE AUTOMATIZACIÓN 100% EN CÓDIGO NATIVO
// ==========================================
// Ejecución directa en Node.js/Express y Firestore con 0ms de latencia externa,
// eliminando por completo la dependencia de servicios externos de orquestación.

// Estado y monitoreo del motor nativo
providerOpsRouter.get(['/api/native-engine/status', '/api/native/status'], (req, res) => {
  res.json(getNativeEngineStatus());
});

// API para Provider Hub & Self-Development Hub
providerOpsRouter.get('/api/providers', (req, res) => {
  res.json(getProvidersOverview());
});

providerOpsRouter.post('/api/providers/action', requireAdmin, async (req, res) => {
  try {
    const { orderId, action, notes } = req.body;
    const result = await handleProviderAction({ orderId, action, notes });
    if (!result.success && result.message?.includes('NOT_FOUND')) {
      return res.status(404).json(result);
    }
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/** Portal de proveedores, catálogo, estado y payouts. */
export const providerPortalRouter = createRouter();

// 1.1 Endpoint legado de respuesta del proveedor retirado.
// Las mutaciones públicas sólo se aceptan mediante /api/provider/portal/action con token firmado.
providerPortalRouter.all(['/api/provider/respond', '/webhook/provider-response', '/api/webhooks/provider-response'], (_req, res) => {
  res.status(410).json({
    success: false,
    error: 'Endpoint legado retirado. Use el portal seguro del proveedor con enlace firmado.'
  });
});

/**
 * 1.15 Portal operativo seguro del proveedor.
 * El token firmado identifica exactamente una orden + proveedor y caduca.
 */
providerPortalRouter.get('/api/provider/portal', async (req, res) => {
  try {
    const capability = verifyProviderPortalToken(String(req.query.token || ''));
    if (!capability) return res.status(401).json({ success: false, error: 'Enlace de proveedor inválido o vencido.' });

    const db = getFirestoreDb();
    if (!db) return res.status(503).json({ success: false, error: 'Portal operativo no disponible sin Firestore.' });

    let snap = await db.collection('service_orders').doc(capability.orderId).get();
    if (!snap.exists) {
      const byBooking = await db.collection('service_orders').where('bookingId', '==', capability.orderId).limit(1).get();
      if (!byBooking.empty) snap = byBooking.docs[0] as any;
    }
    if (!snap.exists) return res.status(404).json({ success: false, error: 'Solicitud de reserva no encontrada.' });

    const order: any = { id: snap.id, ...snap.data() };
    if (String(order.providerId) !== capability.providerId) {
      return res.status(403).json({ success: false, error: 'Este enlace no corresponde al proveedor asignado.' });
    }

    return res.json({
      success: true,
      expiresAt: capability.exp,
      order: toProviderPortalOrder(order)
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error?.message || 'No se pudo cargar la solicitud.' });
  }
});

providerPortalRouter.post('/api/provider/portal/action', async (req, res) => {
  try {
    const capability = verifyProviderPortalToken(String(req.body?.token || ''));
    if (!capability) return res.status(401).json({ success: false, error: 'Enlace de proveedor inválido o vencido.' });

    const action = String(req.body?.action || '').trim();
    if (!['confirm', 'reject', 'delay', 'no_show', 'complete'].includes(action)) {
      return res.status(400).json({ success: false, error: 'Acción de proveedor no válida.' });
    }

    const db = getFirestoreDb();
    if (!db) return res.status(503).json({ success: false, error: 'Portal operativo no disponible sin Firestore.' });
    let snap = await db.collection('service_orders').doc(capability.orderId).get();
    if (!snap.exists) {
      const byBooking = await db.collection('service_orders').where('bookingId', '==', capability.orderId).limit(1).get();
      if (!byBooking.empty) snap = byBooking.docs[0] as any;
    }
    if (!snap.exists) return res.status(404).json({ success: false, error: 'Solicitud de reserva no encontrada.' });

    const order: any = snap.data() || {};
    if (String(order.providerId) !== capability.providerId) {
      return res.status(403).json({ success: false, error: 'Este enlace no corresponde al proveedor asignado.' });
    }
    if (!['dispatched', 'reassigned'].includes(String(order.status)) && action !== 'complete' && !(action === 'confirm' && order.status === 'confirmed')) {
      return res.status(409).json({ success: false, error: 'Esta solicitud ya no está pendiente de respuesta.', status: order.status });
    }

    const result = await handleProviderAction({
      orderId: snap.id,
      expectedProviderId: capability.providerId,
      action: action as any,
      notes: String(req.body?.notes || '').trim().slice(0, 1200) || undefined,
      operatorContact: String(req.body?.operatorContact || '').trim().slice(0, 180) || undefined,
      estimatedDelayMinutes: Number(req.body?.estimatedDelayMinutes) || undefined,
      assignedGuide: String(req.body?.assignedGuide || '').trim().slice(0, 180) || undefined,
      assignedVehicle: String(req.body?.assignedVehicle || '').trim().slice(0, 120) || undefined
    });

    if (!result.success) return res.status(409).json(result);
    return res.json({
      success: true,
      message: result.message,
      action,
      order: {
        id: result.order.id,
        status: result.order.status,
        notes: result.order.notes || '',
        assignedGuide: result.order.assignedGuide || '',
        assignedVehicle: result.order.assignedVehicle || ''
      }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error?.message || 'No se pudo registrar la respuesta.' });
  }
});

// 1.2 Catálogo legado de operadores deshabilitado: la fuente operativa es Firestore.
providerPortalRouter.get(['/api/provider/catalog', '/api/operators/catalog'], (_req, res) => {
  res.status(410).json({
    success: false,
    error: 'El catálogo estático de proveedores fue retirado. Los proveedores operativos deben provenir de Firestore y estar activos/verificados.',
    sourceOfTruth: 'firestore',
    provenance: 'LIVE_VERIFIED'
  });
});

// 1.3 Consulta de Estado de Despacho del Proveedor para una Reserva
// Full detail requires operations/admin. The Vercel zero-trust gateway reads
// provider evidence through Cloud Run IAM (x-crt-gateway marker set by the
// gateway itself, never forwarded from a browser) and only receives the
// minimal evidence fields it needs to gate payment creation.
providerPortalRouter.get(['/api/provider/status/:bookingId', '/api/operators/status/:bookingId'], async (req, res) => {
  try {
    const bookingId = String(req.params.bookingId || '').trim();
    const gatewayEvidenceCall = req.headers['x-crt-gateway'] === 'vercel-oidc-wif-provider-evidence';
    const operator = gatewayEvidenceCall ? null : await resolveOperatorAccess(req);
    if (!gatewayEvidenceCall && !operator?.ok) {
      return res.status(operator?.status || 401).json({ success: false, error: operator?.error || 'No autorizado' });
    }

    const found = bookingId ? await getBookingById(bookingId) : null;
    if (!found) {
      return res.status(404).json({ success: false, error: 'Reserva no encontrada.' });
    }

    if (gatewayEvidenceCall) {
      return res.json({
        success: true,
        bookingId,
        providerStatus: found.providerStatus || 'pending',
        providerConfirmedAt: found.providerConfirmedAt || null
      });
    }

    res.json({
      success: true,
      bookingId,
      status: found.status,
      providerId: found.providerId || null,
      providerName: found.providerName || found.providerInfo?.name || null,
      providerStatus: found.providerStatus || 'pending',
      assignedGuide: found.assignedGuide || 'Por asignar',
      assignedVehicle: found.assignedVehicle || 'Por asignar',
      providerDispatchedAt: found.providerDispatchedAt || null,
      providerConfirmedAt: found.providerConfirmedAt || null,
      tourName: found.tourName,
      date: found.date,
      time: found.time
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'No se pudo consultar el estado del proveedor.' });
  }
});

// 2. Confirmación de Reserva al Cliente (Webhook)
providerPortalRouter.post(['/webhook/cliente-confirmacion', '/webhook/confirmacion-cliente', '/api/webhooks/customer-confirmation'], async (req, res) => {
  try {
    const authHeader = req.headers['x-webhook-secret'] as string;
    const result = await executeCustomerBookingConfirmation(req.body, authHeader);
    res.json(result);
  } catch (error: any) {
    const status = error.message.includes('No autorizado') ? 401 : 500;
    res.status(status).json({ success: false, error: error.message });
  }
});

// 3. Ejecución manual de liquidaciones a proveedores.
// El cron interno invoca providerPayoutService directamente; no existe webhook público.
providerPortalRouter.post('/api/payouts/run-batch', requireAdmin, async (_req, res) => {
  try {
    const result = await executeAutomatedProviderPayouts();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

providerPortalRouter.post('/webhook/pagos-proveedores-batch', (_req, res) => {
  res.status(410).json({
    success: false,
    error: 'Webhook legado retirado. Las liquidaciones se ejecutan por el cron interno o por un administrador autenticado.'
  });
});
