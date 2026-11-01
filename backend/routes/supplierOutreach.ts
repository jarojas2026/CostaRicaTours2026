/**
 * Asistente de proveedores (solo dueño/admin).
 *
 * - POST /api/admin/supplier-directory/outreach-suggestions (requireAdmin)
 *   Filtros: provincia, tipo, prioridad (alta|media|baja), canal (whatsapp|email), limit (≤25), drafts (≤5).
 *   Lee `supplier_directory` (SOLO LECTURA) y devuelve proveedores ordenados con BORRADORES de mensaje
 *   (Groq gratis o plantilla determinista). No envía nada ni escribe `estado_contacto`.
 */
import { getFirestoreDb } from '../bookingService';
import { listSupplierDirectory } from '../supplierDirectory';
import { buildOutreachSuggestions, OUTREACH_MIN_MARGIN_PCT, parseOutreachFilters } from '../supplierOutreachAssistant';
import { createRouter, requireAdmin } from './shared';

export const supplierOutreachRouter = createRouter();

supplierOutreachRouter.post('/api/admin/supplier-directory/outreach-suggestions', requireAdmin, async (req, res) => {
  const input = { ...(req.query as Record<string, unknown>), ...((req.body && typeof req.body === 'object') ? req.body : {}) };
  const parsed = parseOutreachFilters(input);
  if (!parsed.ok) return res.status(400).json({ success: false, error: parsed.error });
  const { provincia, tipo } = parsed.filters;
  // Solo lectura; prioridad y canal se filtran en memoria tras puntuar.
  const result = await listSupplierDirectory(getFirestoreDb() as any, { provincia, tipo, limit: 300 });
  if (!result.available) return res.status(503).json({ success: false, error: 'storage_unavailable' });
  const suggestions = await buildOutreachSuggestions(result.entries as any, parsed.filters);
  res.json({
    success: true,
    filters: parsed.filters,
    minMarginPct: OUTREACH_MIN_MARGIN_PCT,
    suggestions,
    sent: false,
    writes: false,
    disclaimer: 'Borradores para revisión humana: no se envió ningún mensaje ni se cambió el estado de contacto.',
  });
});
