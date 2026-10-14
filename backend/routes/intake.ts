/**
 * Entrada de clientes (formularios y WhatsApp).
 *
 * Extraído de server.ts sin cambios de comportamiento: rutas, middlewares y
 * orden de registro se conservan (ver tests/serverRoutes.contract.test.ts).
 */

import express from 'express';
import crypto from 'crypto';
import { hasInternalJobToken } from '../internalJobAuth';
import { processCustomerIntake, enqueueCustomerIntakeJob, processPendingCustomerIntakeJobs } from '../customerIntakeGateway';
import { getFirestoreDb } from '../bookingService';
import { withDistributedAutomationLock } from '../cronEngine';
import { createRouter, chatLimiter, intakeAdmission } from './shared';

/** Customer intake y webhooks de WhatsApp. */
export const customerIntakeRouter = createRouter();

// Health check endpoint
customerIntakeRouter.post('/api/customer-intake', chatLimiter, intakeAdmission.middleware, async (req, res) => {
  try {
    // Public web intake never trusts channel-prefixed session ids (wa_, voice_,
    // trav_...) or unverified contact data to link to an existing traveler.
    const requestedSessionId = String(req.body?.sessionId || '').trim();
    const result = await processCustomerIntake({
      message: req.body?.message || req.body?.mensaje,
      language: req.body?.language || req.body?.idioma,
      sessionId: /^web_[A-Za-z0-9-]{8,80}$/.test(requestedSessionId) ? requestedSessionId : undefined,
      source: req.body?.source || 'web',
      context: req.body?.context,
      customer: req.body?.customer
    });
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ success: false, error: error?.message || 'No se pudo procesar la solicitud.' });
  }
});

/**
 * WhatsApp Business inbound gateway.
 * Webhook verification/signature happens before the message enters the same AI
 * intake, memory and agent loop used by the website. No WhatsApp credential is
 * required at build time; production delivery requires the Meta secrets.
 */
function verifyWhatsAppSignature(req: express.Request): boolean {
  const appSecret = process.env.WHATSAPP_APP_SECRET || process.env.META_APP_SECRET;
  if (!appSecret) return false;
  const signature = String(req.headers['x-hub-signature-256'] || '');
  if (!signature.startsWith('sha256=')) return false;
  const rawBody = (req as any).rawBody as Buffer | undefined;
  if (!rawBody) return false;
  const expected = `sha256=${crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex')}`;
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

async function claimWhatsAppInboundMessage(messageId: string): Promise<boolean> {
  const id = String(messageId || '').trim().slice(0, 180);
  if (!id) return false;
  const db = getFirestoreDb();
  if (!db) return true;
  const ref = db.collection('whatsapp_inbound_events').doc(id.replace(/[^A-Za-z0-9_-]/g, '_'));
  return db.runTransaction(async (tx: any) => {
    const snapshot = await tx.get(ref);
    if (snapshot.exists) {
      const data = snapshot.data() || {};
      const claimedAt = Date.parse(String(data.claimedAt || data.receivedAt || ''));
      const stale = Number.isFinite(claimedAt) && Date.now() - claimedAt > 10 * 60 * 1000;
      if (!stale) return false;
    }
    tx.set(ref, { messageId: id, receivedAt: new Date().toISOString(), claimedAt: new Date().toISOString(), status: 'claimed' }, { merge: true });
    return true;
  });
}

async function releaseWhatsAppInboundMessage(messageId: string): Promise<void> {
  const db = getFirestoreDb();
  if (!db) return;
  const id = String(messageId || '').trim().slice(0, 180);
  if (!id) return;
  await db.collection('whatsapp_inbound_events').doc(id.replace(/[^A-Za-z0-9_-]/g, '_')).delete().catch(() => {});
}

customerIntakeRouter.get('/api/webhooks/whatsapp', (req, res) => {
  const mode = String(req.query['hub.mode'] || '');
  const token = String(req.query['hub.verify_token'] || '');
  const challenge = String(req.query['hub.challenge'] || '');
  const configuredToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || process.env.WHATSAPP_VERIFY_TOKEN || '';
  if (mode === 'subscribe' && configuredToken && token === configuredToken) {
    return res.status(200).send(challenge);
  }
  return res.status(403).send('Forbidden');
});

customerIntakeRouter.post('/api/webhooks/whatsapp', async (req, res) => {
  if (!verifyWhatsAppSignature(req)) {
    return res.status(401).json({ success: false, error: 'Firma de WhatsApp no válida.' });
  }

  const entries = Array.isArray(req.body?.entry) ? req.body.entry : [];
  const queued: string[] = [];

  for (const entry of entries) {
    const changes = Array.isArray(entry?.changes) ? entry.changes : [];
    for (const change of changes) {
      const value = change?.value || {};
      const messages = Array.isArray(value.messages) ? value.messages : [];
      const contacts = Array.isArray(value.contacts) ? value.contacts : [];

      for (const message of messages) {
        const messageId = String(message?.id || '').trim();
        const from = String(message?.from || '').replace(/[^0-9]/g, '');
        const messageType = String(message?.type || 'unknown').trim().toLowerCase();
        const textBody = String(message?.text?.body || '').trim();
        const mediaOnly = !textBody && ['audio', 'image', 'video', 'document', 'sticker'].includes(messageType);
        if (!messageId || !from || (!textBody && !mediaOnly)) continue;
        const intakeMessage = textBody || `El viajero envió un mensaje multimedia de tipo ${messageType}. Se requiere revisión humana del contenido.`;
        if (!(await claimWhatsAppInboundMessage(messageId))) continue;

        const profileName = String(contacts.find((c: any) => String(c?.wa_id || '') === from)?.profile?.name || '').trim();
        try {
          const job = await enqueueCustomerIntakeJob({
            message: intakeMessage,
            language: /\b(the|please|hello|hi|book|tour|availability)\b/i.test(textBody) && !/[¿¡áéíóúñ]/i.test(textBody) ? 'en' : 'es',
            sessionId: `wa_${from}`,
            source: 'whatsapp:inbound',
            context: { channel: 'whatsapp', messageId, waId: from, mediaType: mediaOnly ? messageType : undefined, requiresHumanMediaReview: mediaOnly },
            customer: { name: profileName, phone: from }
          }, { replyToWhatsApp: from, messageId, trust: { verifiedPhone: true } });
          queued.push(job.jobId);
        } catch (error) {
          await releaseWhatsAppInboundMessage(messageId);
          throw error;
        }
      }
    }
  }

  // Meta gets a fast acknowledgement; durable Firestore jobs are processed separately.
  return res.status(200).json({ success: true, queued });
});

customerIntakeRouter.post('/api/internal/customer-intake/process', async (req, res) => {
  const configured = process.env.CUSTOMER_INTAKE_JOB_TOKEN;
  if (!hasInternalJobToken(req.headers as Record<string, string | string[] | undefined>, configured)) {
    return res.status(401).json({ success: false, error: 'No autorizado.' });
  }
  try {
    const result = await withDistributedAutomationLock(
      'customer-intake-worker-5s',
      () => processPendingCustomerIntakeJobs(Number(req.body?.limit || 10))
    );
    if (!result) return res.status(409).json({ success: false, error: 'automation_lock_busy' });
    return res.json({ success: true, ...result });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error?.message || 'No se pudo procesar la cola.' });
  }
});
