/** Mensajes y validaciones puras de "Pagos a proveedores" en /admin/leads (testeables sin DOM). */

export type SupplierPayoutStateView = 'pendiente_aprobacion' | 'aprobado' | 'pagado_manual' | 'cancelado';

export interface SupplierPayoutView {
  id: string;
  bookingId: string;
  proveedor: string;
  montoCRC: number;
  concepto: string;
  estado: SupplierPayoutStateView;
  createdAt: string;
  createdBy: string;
  approvedAt?: string;
  approvedBy?: string;
  metodo?: 'sinpe' | 'transferencia';
  referencia?: string;
  fechaPago?: string;
  paidRecordedBy?: string;
  cancelledBy?: string;
  motivoCancelacion?: string;
  audit: { action: string; from: string | null; to: string; at: string; by: string; note?: string }[];
}

export const SUPPLIER_PAYOUT_STATE_LABEL: Record<SupplierPayoutStateView, { es: string; en: string }> = {
  pendiente_aprobacion: { es: 'Pendiente de aprobación', en: 'Pending approval' },
  aprobado: { es: 'Aprobado (sin pagar)', en: 'Approved (not paid yet)' },
  pagado_manual: { es: 'Pago manual registrado', en: 'Manual payment recorded' },
  cancelado: { es: 'Cancelado', en: 'Cancelled' },
};

const MESSAGES: Record<string, { es: string; en: string }> = {
  customer_payment_not_verified: { es: 'El pago del cliente no está verificado por el servidor. No se registró nada.', en: 'The customer payment is not verified by the server. Nothing was recorded.' },
  lead_without_booking: { es: 'El lead no tiene una reserva enlazada. No se registró nada.', en: 'Lead has no linked booking. Nothing was recorded.' },
  booking_not_found: { es: 'La reserva enlazada no existe.', en: 'Linked booking not found.' },
  invalid_transition: { es: 'Ese cambio de estado no está permitido.', en: 'That state change is not allowed.' },
  idempotency_conflict: { es: 'Esta solicitud ya se registró con otros datos. Revisa el formulario y vuelve a enviarlo; no se registró nada nuevo.', en: 'This request was already recorded with different data. Review the form and submit again; nothing new was recorded.' },
  duplicate_reference: { es: 'Esa referencia ya está registrada en otro pago de este lead.', en: 'That reference is already recorded on another payment of this lead.' },
  agent_not_allowed: { es: 'Ningún agente de IA puede aprobar ni registrar pagos.', en: 'No AI agent can approve or record payments.' },
  forbidden: { es: 'Solo el dueño puede gestionar pagos a proveedores.', en: 'Only the owner can manage supplier payments.' },
  payout_not_found: { es: 'Pago a proveedor no encontrado.', en: 'Supplier payment not found.' },
  not_found: { es: 'Lead no encontrado.', en: 'Lead not found.' },
};

/** Traduce el error del backend a un mensaje honesto: nunca afirma que se pagó o transfirió. */
export function describeSupplierPayoutError(httpStatus: number, body: any, es: boolean): string {
  const code = typeof body?.error === 'string' ? body.error : '';
  const known = MESSAGES[code];
  if (known) return es ? known.es : known.en;
  if (code === 'invalid_input' && typeof body?.message === 'string') return body.message;
  if (httpStatus === 401 || httpStatus === 403) return es ? 'Solo el dueño puede gestionar pagos a proveedores.' : 'Only the owner can manage supplier payments.';
  if (httpStatus >= 500) return es ? 'Servicio no disponible ahora. No se registró ningún cambio.' : 'Service unavailable. No change was recorded.';
  return es ? `Error ${httpStatus || ''}`.trim() : `Error ${httpStatus || ''}`.trim();
}

/** Mismas reglas que el backend (parseCreateInput / parseMarkPaidInput). */
export function validateSupplierPayoutForm(form: { proveedor: string; montoCRC: string; concepto: string }, es: boolean): string | null {
  if (form.proveedor.trim().length < 2) return es ? 'Indica el proveedor.' : 'Enter the supplier.';
  if (!/^\d+(\.\d{1,2})?$/.test(form.montoCRC.trim()) || Number(form.montoCRC) <= 0 || Number(form.montoCRC) > 50_000_000) return es ? 'Monto en colones inválido.' : 'Invalid CRC amount.';
  if (form.concepto.trim().length < 3) return es ? 'Indica el concepto.' : 'Enter the concept.';
  return null;
}

export function validateManualPaymentForm(form: { referencia: string; fechaPago: string }, es: boolean): string | null {
  if (!/^[A-Za-z0-9-]{4,40}$/.test(form.referencia.trim())) return es ? 'Referencia inválida (4-40: letras, números o guiones).' : 'Invalid reference (4-40: letters, digits or hyphens).';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(form.fechaPago.trim())) return es ? 'Fecha de pago requerida.' : 'Payment date required.';
  return null;
}

export function formatCRC(amount: number, es: boolean): string {
  return `₡${amount.toLocaleString(es ? 'es-CR' : 'en-US', { maximumFractionDigits: 2 })}`;
}
