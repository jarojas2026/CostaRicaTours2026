/**
 * Voucher PDF de confirmación (#391).
 *
 * - Solo para reservas pagadas/confirmadas cuyo pago verificó el servidor
 *   (webhook/captura: paymentStatus=completed + paymentVerifiedAt).
 * - El monto mostrado es el total de la reserva que el servidor comparó con el
 *   pago verificado; nunca un valor enviado por el cliente.
 * - El nombre del operador aparece solo en la confirmación autorizada (reserva
 *   confirmada por el proveedor). Nunca sus contactos.
 * - Sin promesas ni afirmaciones que la plataforma no haya verificado.
 */
import PDFDocument from 'pdfkit';
import { normalizeBookingLifecycle, type BookingLifecycle } from './bookingStateMachine';

export const VOUCHER_ELIGIBLE: readonly BookingLifecycle[] = ['paid', 'provider_pending', 'confirmed', 'in_operation', 'completed'];
const PROVIDER_CONFIRMED: readonly BookingLifecycle[] = ['confirmed', 'in_operation', 'completed'];

/** Números oficiales de emergencia en Costa Rica (no son contactos de negocios). */
export const OFFICIAL_EMERGENCY_PHONES = [
  { label: 'Emergencias (Sistema 9-1-1)', phone: '911' },
  { label: 'Bomberos', phone: '118' },
  { label: 'Cruz Roja', phone: '128' },
] as const;

export type VoucherIneligibleReason = 'estado_no_pagado' | 'pago_no_verificado' | 'monto_invalido';

export function voucherEligibility(booking: any): { ok: true; lifecycle: BookingLifecycle } | { ok: false; reason: VoucherIneligibleReason } {
  const lifecycle = normalizeBookingLifecycle(booking?.status, booking?.paymentStatus);
  if (!VOUCHER_ELIGIBLE.includes(lifecycle)) return { ok: false, reason: 'estado_no_pagado' };
  if (booking?.paymentStatus !== 'completed' || !booking?.paymentVerifiedAt) return { ok: false, reason: 'pago_no_verificado' };
  const amount = Number(booking?.totalUSD);
  if (!Number.isFinite(amount) || amount <= 0) return { ok: false, reason: 'monto_invalido' };
  return { ok: true, lifecycle };
}

const s = (v: unknown, fallback: string, max = 160) => {
  const t = String(v ?? '').replace(/[\u0000-\u001f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
  return t || fallback;
};

export interface VoucherContent {
  reference: string;
  title: string;
  status: string;
  rows: Array<[string, string]>;
  cancellationPolicy: string;
  operatorName: string | null;
  emergency: typeof OFFICIAL_EMERGENCY_PHONES;
  notice: string;
}

/** Contenido del voucher, o null si la reserva no es elegible. */
export function buildVoucherContent(booking: any): VoucherContent | null {
  const elig = voucherEligibility(booking);
  if (!elig.ok) return null;
  const providerStatus = String(booking.serviceOrderStatus || booking.providerStatus || '').toLowerCase();
  const providerConfirmed = PROVIDER_CONFIRMED.includes(elig.lifecycle)
    && !!booking.providerConfirmedAt && ['accepted', 'confirmed', 'confirmada'].includes(providerStatus);
  const pax = (Number(booking.adults) || 0) + (Number(booking.children) || 0) || Number(booking.passengers) || Number(booking.people) || 0;
  const amount = Math.round(Number(booking.totalUSD) * 100) / 100;
  const reference = s(booking.bookingId || booking.id, 'sin referencia', 64);
  return {
    reference,
    title: s(booking.tourName || booking.tourTitle, 'Experiencia en Costa Rica'),
    status: providerConfirmed ? 'CONFIRMADA' : 'PAGADA - confirmación del servicio en curso',
    rows: [
      ['Fecha', s(booking.date, 'Por confirmar', 40)],
      ['Hora', s(booking.time, 'Por confirmar', 40)],
      ['Punto de encuentro', s(booking.meetingPoint || booking.pickupHotel, 'Por confirmar por escrito')],
      ['Personas (pax)', pax > 0 ? String(pax) : 'Por confirmar'],
      ['Monto pagado (verificado)', `${amount.toFixed(2)} USD`],
    ],
    cancellationPolicy: s(booking.cancellationPolicy, 'Según las condiciones de cancelación confirmadas por escrito en tu cotización.', 600),
    operatorName: providerConfirmed && booking.providerName ? s(booking.providerName, '', 120) || null : null,
    emergency: OFFICIAL_EMERGENCY_PHONES,
    notice: providerConfirmed
      ? 'Presenta este comprobante el día de la actividad.'
      : 'Tu pago está verificado. Te enviaremos la confirmación final del servicio antes de la actividad.',
  };
}

export async function generateVoucherPdf(content: VoucherContent): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 48, info: { Title: `Comprobante ${content.reference}`, Author: 'Costa Rica Tours' } });
      const chunks: Buffer[] = [];
      doc.on('data', c => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      doc.rect(0, 0, 595.28, 70).fill('#041711');
      doc.fillColor('#10b981').font('Helvetica-Bold').fontSize(18).text('COSTA RICA TOURS', 48, 24);
      doc.fillColor('#ffffff').fontSize(10).text(`Comprobante ${content.reference}`, 300, 28, { width: 247, align: 'right' });
      doc.moveDown(3);
      doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(14).text(content.title, 48, 95);
      doc.font('Helvetica').fontSize(10).fillColor('#047857').text(`Estado: ${content.status}`);
      doc.moveDown(0.8).fillColor('#1e293b');
      for (const [k, v] of content.rows) doc.font('Helvetica-Bold').text(`${k}: `, { continued: true }).font('Helvetica').text(v);
      if (content.operatorName) doc.font('Helvetica-Bold').text('Operador del servicio: ', { continued: true }).font('Helvetica').text(content.operatorName);
      doc.moveDown(0.8).font('Helvetica-Bold').text('Política de cancelación');
      doc.font('Helvetica').text(content.cancellationPolicy);
      doc.moveDown(0.8).font('Helvetica-Bold').text('Teléfonos de emergencia oficiales (Costa Rica)');
      doc.font('Helvetica');
      for (const e of content.emergency) doc.text(`${e.label}: ${e.phone}`);
      doc.moveDown(0.8).fillColor('#475569').fontSize(9).text(content.notice);
      doc.end();
    } catch (e) { reject(e); }
  });
}
