import { google } from 'googleapis';
import { GoogleGenAI } from '@google/genai';
import { getFirestoreDb, findBookingByCodeOrEmail } from './bookingService';
import { handleProviderAction, REGISTERED_PROVIDERS } from './providerCommunicationService';
import { processChatInquiry, runTriage } from './aiAssistantService';
import { resolveTravelerIdentity } from './travelerIdentityService';
import { rememberTurn } from './memoryService';
import { sendEmail } from './notificationService';
import { emitOperationalEvent } from './operationalEventBus';

type MailProvider = 'gmail' | 'outlook';
type MailMessage = {
  id: string;
  threadId?: string;
  provider: MailProvider;
  from: string;
  to?: string;
  subject: string;
  text: string;
  receivedAt?: string;
  raw?: any;
};

type Classification = {
  kind: 'customer_request' | 'provider_response' | 'internal' | 'spam' | 'unknown';
  confidence: number;
  intent: string;
  shouldAct: boolean;
  reason: string;
};

const clean = (v: unknown, max = 12000) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
const emailOf = (v: string) => (v.match(/<([^>]+)>/)?.[1] || v).trim().toLowerCase();
const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const base64url = (v: string) => Buffer.from(v).toString('base64url');

function decodeGmail(v = '') {
  return Buffer.from(v.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
}

function gmailHeader(message: any, name: string) {
  return clean((message.payload?.headers || []).find((h: any) => String(h.name).toLowerCase() === name.toLowerCase())?.value, 600);
}

function gmailParts(part: any, out: string[] = []) {
  if (!part) return out;
  if (part.mimeType === 'text/plain' && part.body?.data) out.push(decodeGmail(part.body.data));
  for (const child of part.parts || []) gmailParts(child, out);
  return out;
}

async function gmailClient() {
  const { GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN } = process.env;
  if (!GMAIL_CLIENT_ID || !GMAIL_CLIENT_SECRET || !GMAIL_REFRESH_TOKEN) return null;
  const auth = new google.auth.OAuth2(GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET);
  auth.setCredentials({ refresh_token: GMAIL_REFRESH_TOKEN });
  return google.gmail({ version: 'v1', auth });
}

async function outlookAccessToken() {
  const clientId = process.env.OUTLOOK_CLIENT_ID;
  const clientSecret = process.env.OUTLOOK_CLIENT_SECRET;
  const refreshToken = process.env.OUTLOOK_REFRESH_TOKEN;
  const tenant = process.env.OUTLOOK_TENANT_ID || 'common';
  if (!clientId || !clientSecret || !refreshToken) return null;
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    scope: 'https://graph.microsoft.com/.default offline_access'
  });
  const response = await fetch(`https://login.microsoftonline.com/${encodeURIComponent(tenant)}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body
  });
  if (!response.ok) throw new Error(`Outlook OAuth failed: ${response.status}`);
  const data = await response.json() as any;
  return String(data.access_token || '');
}

async function classifyMail(subject: string, body: string, from: string): Promise<Classification> {
  const input = `FROM: ${from}\nSUBJECT: ${subject}\nBODY: ${body.slice(0, 9000)}`;
  if (process.env.GEMINI_API_KEY) {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          'Clasifica un correo entrante para una agencia de viajes de Costa Rica.',
          'Devuelve SOLO JSON: {"kind":"customer_request|provider_response|internal|spam|unknown","confidence":0..1,"intent":"...","shouldAct":true|false,"reason":"..."}.',
          'customer_request incluye solicitudes de cotización, disponibilidad, reservas, cambios o información.',
          'provider_response incluye respuestas sobre una orden operativa o disponibilidad enviada por la agencia.',
          'Nunca inventes entidades ni confirmaciones. Si hay duda, shouldAct=false.',
          input
        ].join('\n')
      });
      const raw = (response.text || '').trim().replace(/^\`\`\`json\s*|\s*\`\`\`$/gi, '');
      const parsed = JSON.parse(raw);
      if (['customer_request', 'provider_response', 'internal', 'spam', 'unknown'].includes(parsed.kind)) {
        return {
          kind: parsed.kind,
          confidence: Math.max(0, Math.min(1, Number(parsed.confidence) || 0)),
          intent: clean(parsed.intent, 120) || 'general_inquiry',
          shouldAct: Boolean(parsed.shouldAct),
          reason: clean(parsed.reason, 500) || 'Clasificación IA'
        };
      }
    } catch {
      // Deterministic fallback below.
    }
  }

  const s = `${subject} ${body}`.toLowerCase();
  if (/unsubscribe|viagra|casino|crypto giveaway|prince of|winner/i.test(s)) return { kind: 'spam', confidence: .94, intent: 'spam', shouldAct: false, reason: 'Patrones de spam.' };
  if (/os-cr-[a-z0-9-]+/i.test(s) || /confirmad|disponible|no hay cupo|rechaz|accepted|confirmed|available|unavailable/i.test(s)) {
    return { kind: 'provider_response', confidence: .78, intent: 'provider_response', shouldAct: false, reason: 'Patrones de respuesta operativa.' };
  }
  if (/reserv|availability|disponib|tour|excurs|traslado|transfer|cotiz|price|precio|booking|viaje|itinerario/i.test(s)) {
    return { kind: 'customer_request', confidence: .76, intent: 'travel_request', shouldAct: true, reason: 'Solicitud turística detectada.' };
  }
  return { kind: 'unknown', confidence: .45, intent: 'general_inquiry', shouldAct: false, reason: 'Evidencia insuficiente.' };
}

function riskyCustomerRequest(message: string) {
  return /refund|reembolso|chargeback|fraud|estafa|demanda|lawyer|legal|emergency|emergencia|medical|médic|password|contraseña|credit card|tarjeta/i.test(message);
}

async function claimEvent(id: string, provider: MailProvider, from: string, subject: string) {
  const db = getFirestoreDb();
  if (!db) return true;
  const ref = db.collection('email_operation_events').doc(`${provider}_${id}`.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 180));
  return db.runTransaction(async (tx: any) => {
    const snap = await tx.get(ref);
    if (snap.exists) return false;
    tx.create(ref, {
      id: ref.id,
      provider,
      messageId: id,
      from,
      subject,
      status: 'processing',
      attempts: 1,
      claimedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    return true;
  });
}

async function recordEvent(mail: MailMessage, patch: Record<string, any>) {
  const db = getFirestoreDb();
  if (!db) return;
  const ref = db.collection('email_operation_events').doc(`${mail.provider}_${mail.id}`.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 180));
  await ref.set({
    id: ref.id,
    provider: mail.provider,
    messageId: mail.id,
    threadId: mail.threadId || null,
    from: mail.from,
    to: mail.to || null,
    subject: mail.subject,
    updatedAt: new Date().toISOString(),
    ...patch
  }, { merge: true });
}

async function sendGmailReply(client: any, mail: MailMessage, text: string) {
  const to = emailOf(mail.from);
  if (!isEmail(to)) throw new Error('Remitente de correo no válido.');
  const subject = /^re:/i.test(mail.subject) ? mail.subject : `Re: ${mail.subject}`;
  const raw = [
    `To: ${to}`,
    `Subject: =?UTF-8?B?${base64url(subject)}?=`,
    'Content-Type: text/plain; charset=utf-8',
    'MIME-Version: 1.0',
    '',
    text
  ].join('\r\n');
  await client.users.messages.send({
    userId: process.env.GMAIL_INBOX_USER || 'me',
    requestBody: { raw: base64url(raw), ...(mail.threadId ? { threadId: mail.threadId } : {}) }
  });
}

async function sendOutlookReply(token: string, mail: MailMessage, text: string) {
  const mailbox = encodeURIComponent(process.env.OUTLOOK_MAILBOX_USER || '');
  const id = encodeURIComponent(mail.id);
  const response = await fetch(`https://graph.microsoft.com/v1.0/users/${mailbox}/messages/${id}/reply`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ comment: text })
  });
  if (!response.ok) throw new Error(`Outlook reply failed: ${response.status}`);
}

async function listGmailMessages(): Promise<MailMessage[]> {
  const client = await gmailClient();
  if (!client) return [];
  const userId = process.env.GMAIL_INBOX_USER || 'me';
  const list = await client.users.messages.list({ userId, q: 'in:inbox is:unread newer_than:14d', maxResults: 50 });
  const out: MailMessage[] = [];
  for (const item of list.data.messages || []) {
    if (!item.id) continue;
    const full = await client.users.messages.get({ userId, id: item.id, format: 'full' });
    out.push({
      id: item.id,
      threadId: full.data.threadId || undefined,
      provider: 'gmail',
      from: emailOf(gmailHeader(full.data, 'From')),
      to: gmailHeader(full.data, 'To'),
      subject: gmailHeader(full.data, 'Subject'),
      text: clean(gmailParts(full.data.payload).join('\n') || full.data.snippet, 12000),
      receivedAt: gmailHeader(full.data, 'Date'),
      raw: full.data
    });
  }
  return out;
}

async function listOutlookMessages(): Promise<MailMessage[]> {
  const token = await outlookAccessToken();
  if (!token || !process.env.OUTLOOK_MAILBOX_USER) return [];
  const mailbox = encodeURIComponent(process.env.OUTLOOK_MAILBOX_USER || 'me');
  const url = `https://graph.microsoft.com/v1.0/users/${mailbox}/mailFolders/inbox/messages?$filter=isRead%20eq%20false&$top=50&$orderby=receivedDateTime%20desc&$select=id,conversationId,subject,body,from,toRecipients,receivedDateTime,hasAttachments`;
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error(`Outlook inbox failed: ${response.status}`);
  const data = await response.json() as any;
  return (data.value || []).map((m: any) => ({
    id: String(m.id),
    threadId: m.conversationId,
    provider: 'outlook' as const,
    from: String(m.from?.emailAddress?.address || '').toLowerCase(),
    to: String(m.toRecipients?.[0]?.emailAddress?.address || ''),
    subject: clean(m.subject, 600),
    text: clean(m.body?.content || '', 12000),
    receivedAt: m.receivedDateTime,
    raw: m
  }));
}

async function markRead(mail: MailMessage) {
  if (mail.provider === 'gmail') {
    const client = await gmailClient();
    if (client) await client.users.messages.modify({ userId: process.env.GMAIL_INBOX_USER || 'me', id: mail.id, requestBody: { removeLabelIds: ['UNREAD'] } });
    return;
  }
  const token = await outlookAccessToken();
  if (!token) return;
  const mailbox = encodeURIComponent(process.env.OUTLOOK_MAILBOX_USER || 'me');
  await fetch(`https://graph.microsoft.com/v1.0/users/${mailbox}/messages/${encodeURIComponent(mail.id)}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ isRead: true })
  });
}

async function processProviderResponseEmail(mail: MailMessage) {
  const providers = new Set(REGISTERED_PROVIDERS.flatMap((p: any) => [p.officialEmail, p.email]).filter(Boolean).map((x: any) => String(x).toLowerCase()));
  if (!providers.has(mail.from.toLowerCase())) {
    await recordEvent(mail, { status: 'needs_human_review', reason: 'Remitente no coincide con un proveedor operativo conocido.' });
    return { status: 'needs_human_review' };
  }
  const source = `${mail.subject}\n${mail.text}`;
  const orderId = source.match(/OS-CR-[A-Z0-9-]+/i)?.[0]?.toUpperCase();
  if (!orderId) {
    await recordEvent(mail, { status: 'needs_human_review', reason: 'No se encontró una orden operacional verificable.' });
    return { status: 'needs_human_review' };
  }
  let action: 'confirm' | 'reject' | 'delay' | 'no_show' | 'complete' | null = null;
  if (/no hay cupo|sin disponibilidad|no podemos|rechaz|declin|not available|unavailable/i.test(source)) action = 'reject';
  else if (/no show|no-show|no se presentó/i.test(source)) action = 'no_show';
  else if (/servicio completado|completed|completado/i.test(source)) action = 'complete';
  else if (/demora|delay|más tiempo|more time|pending|en revisión/i.test(source)) action = 'delay';
  else if (/confirmad|confirm|aceptad|cupo garant|we can accommodate|available/i.test(source)) action = 'confirm';
  if (!action) {
    await recordEvent(mail, { status: 'needs_human_review', orderId, reason: 'Respuesta de proveedor ambigua.' });
    return { status: 'needs_human_review', orderId };
  }
  const result = await handleProviderAction({ orderId, action, notes: clean(mail.text, 1500), operatorContact: mail.from });
  if (!result.success) throw new Error(result.message);
  const booking = await findBookingByCodeOrEmail(result.order.bookingId).catch(() => null);
  const customerEmail = booking?.customerEmail || booking?.customer?.email;
  if (customerEmail && isEmail(String(customerEmail))) {
    await sendEmail({
      to: String(customerEmail),
      subject: action === 'confirm' ? 'Reserva confirmada • Costa Rica Tours' : 'Actualización de tu reserva • Costa Rica Tours',
      text: result.message
    }).catch(() => undefined);
  }
  await markRead(mail);
  await recordEvent(mail, {
    status: 'completed',
    orderId,
    providerAction: action,
    confidence: .9,
    autonomous: true,
    resultMessage: result.message,
    completedAt: new Date().toISOString()
  });
  await emitOperationalEvent({
    type: 'provider.response.email.autonomous_completed',
    source: 'email_operations_agent',
    conversationId: result.order.bookingId,
    payload: { provider: mail.provider, messageId: mail.id, from: mail.from, orderId, action }
  }).catch(() => undefined);
  return { status: 'completed', orderId, action };
}

async function processCustomerEmail(mail: MailMessage, classification: Classification) {
  const identity = await resolveTravelerIdentity({
    email: mail.from,
    sessionId: `email_${mail.provider}_${mail.id}`,
    channel: `email:${mail.provider}`
  });
  const triage = await runTriage(mail.text || mail.subject);
  const intent = clean(triage?.intent || classification.intent, 120);
  const confidence = Number(triage?.confidence) || classification.confidence;
  const risk = riskyCustomerRequest(`${mail.subject}\n${mail.text}`);
  const autonomous = !risk && confidence >= 0.72;

  const assistant = await processChatInquiry(
    `${mail.subject}\n\n${mail.text}`,
    /[\u00C0-\u024F]/.test(mail.text) || /hola|reserva|precio|disponibilidad/i.test(mail.text) ? 'es' : 'en',
    [],
    'auto',
    identity.sessionId,
    { allowMutations: autonomous }
  );

  await rememberTurn(identity.sessionId, { role: 'user', text: `${mail.subject}\n${mail.text}`, agentId: 'email_operations_agent' }, { agentId: 'email_operations_agent', activeGoal: intent });
  await rememberTurn(identity.sessionId, { role: 'assistant', text: assistant.reply, agentId: assistant.agentId || 'concierge' }, { agentId: assistant.agentId || 'concierge', decision: autonomous ? 'email_autonomous' : 'email_review' });

  if (!autonomous) {
    await recordEvent(mail, {
      status: 'needs_human_review',
      intent,
      confidence,
      risk,
      reason: risk ? 'Solicitud sensible requiere revisión.' : 'Confianza insuficiente para mutación automática.',
      aiReply: assistant.reply.slice(0, 6000)
    });
    return { status: 'needs_human_review', reply: assistant.reply, intent, confidence, risk };
  }

  const reply = assistant.reply.trim() || 'Recibimos tu solicitud y estamos verificando disponibilidad.';
  if (mail.provider === 'gmail') {
    const client = await gmailClient();
    if (!client) throw new Error('Gmail no disponible para responder.');
    await sendGmailReply(client, mail, reply);
  } else {
    const token = await outlookAccessToken();
    if (!token) throw new Error('Outlook no disponible para responder.');
    await sendOutlookReply(token, mail, reply);
  }

  await markRead(mail);
  await recordEvent(mail, {
    status: 'completed',
    intent,
    confidence,
    risk,
    autonomous: true,
    reply: reply.slice(0, 6000),
    completedAt: new Date().toISOString()
  });
  await emitOperationalEvent({
    type: 'email.request.autonomous_completed',
    source: 'email_operations_agent',
    conversationId: identity.sessionId,
    payload: { provider: mail.provider, messageId: mail.id, from: mail.from, intent, confidence }
  }).catch(() => undefined);

  return { status: 'completed', reply, intent, confidence, risk };
}

export async function processEmailOperationsOnce() {
  const startedAt = Date.now();
  const results: any[] = [];
  let messages: MailMessage[] = [];
  const errors: string[] = [];
  try { messages.push(...await listGmailMessages()); } catch (error: any) { errors.push(`gmail: ${clean(error?.message, 500)}`); }
  try { messages.push(...await listOutlookMessages()); } catch (error: any) { errors.push(`outlook: ${clean(error?.message, 500)}`); }

  for (const mail of messages) {
    try {
      if (!mail.id || !isEmail(mail.from)) continue;
      const claimed = await claimEvent(mail.id, mail.provider, mail.from, mail.subject);
      if (!claimed) continue;

      const classification = await classifyMail(mail.subject, mail.text, mail.from);
      if (classification.kind === 'spam' || classification.kind === 'internal' || classification.kind === 'unknown' || classification.confidence < 0.70) {
        await recordEvent(mail, { status: 'ignored', classification, completedAt: new Date().toISOString() });
        await markRead(mail);
        results.push({ provider: mail.provider, id: mail.id, status: 'ignored', kind: classification.kind });
        continue;
      }

      if (classification.kind === 'provider_response') {
        const result = await processProviderResponseEmail(mail);
        results.push({ provider: mail.provider, id: mail.id, ...result });
        continue;
      }

      const result = await processCustomerEmail(mail, classification);
      results.push({ provider: mail.provider, id: mail.id, ...result });
    } catch (error: any) {
      errors.push(`${mail.provider}/${mail.id}: ${clean(error?.message, 700)}`);
      await recordEvent(mail, { status: 'error', error: clean(error?.message, 700), retryable: true });
    }
  }

  return {
    enabled: Boolean(process.env.GMAIL_CLIENT_ID || process.env.OUTLOOK_CLIENT_ID),
    scanned: messages.length,
    results,
    errors,
    durationMs: Date.now() - startedAt,
    checkedAt: new Date().toISOString()
  };
}

export async function getEmailOperationsSnapshot(limit = 60) {
  const db = getFirestoreDb();
  if (!db) return { configured: false, events: [], providers: { gmail: false, outlook: false } };
  const snap = await db.collection('email_operation_events').orderBy('updatedAt', 'desc').limit(Math.max(1, Math.min(100, limit))).get().catch(() => ({ docs: [] } as any));
  return {
    configured: Boolean(process.env.GMAIL_CLIENT_ID || process.env.OUTLOOK_CLIENT_ID),
    providers: {
      gmail: Boolean(process.env.GMAIL_CLIENT_ID && process.env.GMAIL_CLIENT_SECRET && process.env.GMAIL_REFRESH_TOKEN),
      outlook: Boolean(process.env.OUTLOOK_CLIENT_ID && process.env.OUTLOOK_CLIENT_SECRET && process.env.OUTLOOK_REFRESH_TOKEN)
    },
    events: (snap.docs || []).map((d: any) => ({ id: d.id, ...d.data() }))
  };
}
