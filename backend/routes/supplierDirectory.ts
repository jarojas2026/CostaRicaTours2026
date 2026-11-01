/**
 * Directorio de proveedores (prospección), solo lectura para el panel admin.
 *
 * - GET /api/admin/supplier-directory (requireAdmin: owner/admin; una clave de operador no basta)
 *   ?provincia= &tipo= &estado= &limit= (≤500). Lee `supplier_directory` (colección solo de servidor).
 *
 * No hay rutas de escritura: la importación es por scripts/importSupplierDirectory.ts (dry-run por
 * defecto) y la conversión a operador pendiente es manual (backend/supplierDirectory.ts).
 */
import { getFirestoreDb } from '../bookingService';
import { listSupplierDirectory, parseSupplierDirectoryFilters } from '../supplierDirectory';
import { CR_PROVINCES, ICT_TOURISM_REGIONS, SUPPLIER_CONTACT_STATES, SUPPLIER_TYPES } from '../../shared/supplierDirectory';
import { createRouter, requireAdmin } from './shared';

export const supplierDirectoryRouter = createRouter();

supplierDirectoryRouter.get('/api/admin/supplier-directory', requireAdmin, async (req, res) => {
  const parsed = parseSupplierDirectoryFilters(req.query as Record<string, unknown>);
  if (!parsed.ok) return res.status(400).json({ success: false, error: parsed.error });
  const result = await listSupplierDirectory(getFirestoreDb() as any, parsed.filters);
  if (!result.available) return res.status(503).json({ success: false, error: 'storage_unavailable' });
  res.json({
    success: true,
    filters: parsed.filters,
    options: { provincias: CR_PROVINCES, tipos: SUPPLIER_TYPES, estados: SUPPLIER_CONTACT_STATES, regionesIct: ICT_TOURISM_REGIONS },
    entries: result.entries,
    truncated: result.entries.length === parsed.filters.limit,
    disclaimer: 'Prospectos de fuente pública: no son operadores verificados ni aliados con contrato.',
  });
});
