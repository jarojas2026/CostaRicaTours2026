/**
 * Provider inbox agent.
 * Reads the configured Gmail inbox every minute, validates sender + order ID,
 * classifies provider replies and updates the real service order/booking lifecycle.
 */
import { google } from 'googleapis';
import { GoogleGenAI } from '@google/genai';
import { getFirestoreDb, findBookingByCodeOrEmail } from './bookingService';
import { handleProviderAction, REGISTERED_PROVIDERS } from './providerCommunicationService';
import { sendEmail, sendWhatsAppMessage } from './notificationService';
import { emitOperationalEvent } from './operationalEventBus';

function clean(value: unknown, max = 6000) {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
}
function decodeBase64Url(value = '') {
  return Buffer.from(value.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
}
function collectTextParts(part: any, output: string[] = []) {
  if (!part) return output;
  if (part.mimeType === 'text/plain' && part.body?.data) output.push(decodeBase64Url(part.body.data));
  for (const child of part.parts || []) collectTextParts(child, output);
  return output;
}
function header(message: any, name: string) {
  const found = (message.payload?.headers || []).find((h: any) => String(h.name).toLowerCase() === name.toLowerCase());
  return clean(found?.value, 500);
}
function senderEmail(value: string) {
  return value.match(/<([^>]+)>/)?.[1]?.toLowerCase() || value.toLowerCase().replace(/^.*\s+/, '');
}
function knownProviderEmails() {
  return new Set(REGISTERED_PROVIDERS.flatMap(p => [p.officialEmail, p.email]).filter(Boolean).map(x => String(x).trim().toLowerCase()));
}
async function gmailClient() {
  const clientId = process.env.GMAIL_CLIENT_ID, clientSecret = process.env.GMAIL_CLIENT_SECRET, refreshToken = process.env.GMAIL_REFRESH_TOKEN;
  if (!clientId || !clientSecret || !refreshToken) return null;
  const oauth = new google.auth.OAuth2(clientId, clientSecret);
  oauth.setCredentials({ refresh_token: refreshToken });
  return google.gmail({ version: 'v1', auth: oauth });
}
async function classifyReply(subject: string, body: string) {
  const text = (subject + '\n' + body).slice(0, 12000);
  const ai = process.env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }) : null;
  if (ai) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          'Clasifica una respuesta real de un proveedor turístico. No inventes datos.',
          'Devuelve SOLO JSON: {"action":"confirm|reject|delay|no_show|complete|unknown","confidence":0-1,"notes":"..."}',
          'confirm = acepta/garantiza cupo; reject = no puede atender; delay = solicita más tiempo; no_show = indica que el servicio no se realizó; complete = servicio completado.',
          text
        ].join('\n')
      });
      const parsed = JSON.parse((response.text || '{}').trim().replace(/^json\s*/i, ''));
      if (['confirm','reject','delay','no_show','complete'].includes(parsed.action)) {
        return { action: parsed.action, confidence: Math.max(0, Math.min(1, Number(parsed.confidence) || 0)), notes: clean(parsed.notes, 1000) };
      }
    } catch {}
  }
  const lower = text.toLowerCase();
  if (/no podemos|no hay cupo|sin disponibilidad|rechaz|unavailable|declin|not available/.test(lower)) return { action: 'reject' as const, confidence: 0.86, notes: 'Clasificación determinista por lenguaje de rechazo.' };
  if (/confirmad|confirm|aceptad|available|we can accommodate|cupo garant/.test(lower)) return { action: 'confirm' as const, confidence: 0.84, notes: 'Clasificación determinista por lenguaje de confirmación.' };
  if (/demora|delay|más tiempo|more time|pending/.test(lower)) return { action: 'delay' as const, confidence: 0.76, notes: 'Clasificación determinista por lenguaje de demora.' };
  return { action: 'unknown' as const, confidence: 0, notes: 'No hay evidencia suficiente para una transición automática.' };
}
async function notifyCustomer(order: any, action: string, notes: string) {
  const booking = await findBookingByCodeOrEmail(order.bookingId).catch(() => null);
  const customer = booking?.customer || {};
  const email = booking?.customerEmail || customer.email;
  const phone = booking?.customerPhone || customer.phone;
  const name = booking?.customerName || customer.fullName || customer.name || 'Viajero';
  const copy: Record<string, string> = {
    confirm: 'Hola ' + name + '. Buenas noticias: el proveedor ' + order.providerName + ' confirmó la disponibilidad de ' + order.tourName + ' para ' + order.date + '. Estamos preparando el siguiente paso de tu reserva.',
    reject: 'Hola ' + name + '. El proveedor ' + order.providerName + ' nos informó que no puede atender ' + order.tourName + ' para ' + order.date + '. Podemos buscar otra fecha, horario o experiencia similar.',
    delay: 'Hola ' + name + '. Tu solicitud sigue en revisión con ' + order.providerName + '. Aún no la presentamos como confirmada. Te avisaremos apenas tengamos una respuesta definitiva.',
    no_show: 'Hola ' + name + '. Detectamos un reporte operativo de no-show para ' + order.tourName + '. Nuestro equipo está revisando el caso.',
    complete: 'Hola ' + name + '. El proveedor marcó el servicio ' + order.tourName + ' como completado. Gracias por viajar con nosotros.'
  };
  const message = copy[action] || copy.delay;
  const detail = notes ? '\n\nNota del proveedor: ' + notes : '';
  if (email && /@/.test(email)) await sendEmail({
    to: email,
    subject: action === 'confirm' ? 'Tu solicitud fue confirmada • Costa Rica Tours' : 'Actualización de tu solicitud • Costa Rica Tours',
    html: '<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;padding:24px"><h2>' + message + '</h2><p>' + detail.replace(/\n/g, '<br>') + '</p><p>Seguimos contigo paso a paso. ¡Pura Vida! 🇨🇷</p></div>'
  }).catch(() => undefined);
  if (phone) await sendWhatsAppMessage({ toPhone: String(phone), customerName: name, message: message + detail, bookingId: order.bookingId }).catch(() => undefined);
}
export async function processProviderInboxOnce() {
  const gmail = await gmailClient();
  if (!gmail) return { enabled: false, processed: 0, ignored: 0, errors: 0, reason: 'Gmail OAuth no configurado.' };
  const db = getFirestoreDb();
  const known = knownProviderEmails();
  const userId = process.env.GMAIL_INBOX_USER || 'me';
  const list = await gmail.users.messages.list({ userId, q: 'in:inbox is:unread newer_than:7d', maxResults: 50 });
  const messages = list.data.messages || [];
  let processed = 0, ignored = 0, errors = 0;
  for (const item of messages) {
    if (!item.id) continue;
    try {
      if (db && (await db.collection('provider_inbox_events').doc(item.id).get()).exists) continue;
      const full = await gmail.users.messages.get({ userId, id: item.id, format: 'full' });
      const from = senderEmail(header(full.data, 'From')), subject = header(full.data, 'Subject');
      const body = clean(collectTextParts(full.data.payload).join('\n') || full.data.snippet, 12000);
      const orderId = (subject + '\n' + body).match(/OS-CR-[A-Z0-9-]+/i)?.[0]?.toUpperCase();
      if (!known.has(from) || !orderId) {
        ignored++;
        if (db) await db.collection('provider_inbox_events').doc(item.id).set({ messageId: item.id, from, subject, orderId: orderId || null, status: 'ignored', processedAt: new Date().toISOString() });
        continue;
      }
      const classification = await classifyReply(subject, body);
      if (classification.action === 'unknown' || classification.confidence < 0.65) {
        ignored++;
        if (db) await db.collection('provider_inbox_events').doc(item.id).set({ messageId: item.id, from, subject, orderId, status: 'needs_human_review', classification, processedAt: new Date().toISOString() });
        continue;
      }
      const result = await handleProviderAction({ orderId, action: classification.action, notes: classification.notes, operatorContact: from });
      if (!result.success) throw new Error(result.message);
      await notifyCustomer(result.order, classification.action, classification.notes);
      await emitOperationalEvent({ type: 'provider.response.processed', source: 'provider_inbox_agent', conversationId: result.order.bookingId, payload: { orderId, action: classification.action, confidence: classification.confidence, from } }).catch(() => undefined);
      if (db) await db.collection('provider_inbox_events').doc(item.id).set({ messageId: item.id, from, subject, orderId, status: 'processed', classification, result: { success: result.success, message: result.message }, processedAt: new Date().toISOString() });
      processed++;
    } catch (error: any) {
      errors++;
      if (db) await db.collection('provider_inbox_events').doc(item.id).set({ messageId: item.id, status: 'error', error: clean(error?.message, 800), processedAt: new Date().toISOString() }, { merge: true });
    }
  }
  return { enabled: true, processed, ignored, errors, scanned: messages.length, checkedAt: new Date().toISOString() };
}
