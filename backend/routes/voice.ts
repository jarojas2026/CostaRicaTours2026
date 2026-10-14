/**
 * Agente de voz (webhooks firmados del proveedor).
 *
 * Extraído de server.ts sin cambios de comportamiento: rutas, middlewares y
 * orden de registro se conservan (ver tests/serverRoutes.contract.test.ts).
 */

import { createInboundVoiceResponse, createHumanTransferResult, createVoiceRecoveryResponse, handleVoiceTurn, voiceAgentDeskConfig, voiceHumanTransferAvailable, verifyVoiceSignature, rememberVoiceCallStart, rememberVoiceCallEnd, rememberVoiceCallStatus, rememberVoiceHumanTransferStatus, getVoiceCallSession } from '../voiceAgentDeskService';
import { createRouter, requireAdmin } from './shared';

/** Agente de voz. */
export const voiceRouter = createRouter();

// ==========================================
// ☎️ PORTABLE VOICE AGENT DESK
// Compatible with Twilio-style Voice webhooks and PBX/SIP forwarding.
// Hotels can forward a room phone to one DID and keep the integration provider-neutral.
// No credentials are stored in the repository.
// ==========================================
voiceRouter.use(['/api/voice/incoming', '/api/voice/respond', '/api/voice/human-transfer', '/api/voice/status'], (req, res, next) => {
  const config = voiceAgentDeskConfig();
  if (!config.ready) return res.status(503).send('Voice configuration pending');
  const params = Object.fromEntries(Object.entries(req.body || {}).map(([k, v]) => [k, String(v ?? '')]));
  const signature = req.headers['x-twilio-signature'];
  const baseUrl = String(config.publicBaseUrl).replace(/\/$/, '');
  if (!verifyVoiceSignature(`${baseUrl}${req.originalUrl}`, params, typeof signature === 'string' ? signature : undefined)) {
    return res.status(403).send('Unauthorized');
  }
  if (!/^CA[a-fA-F0-9]{32}$/.test(String(req.body?.CallSid || ''))) return res.status(400).send('Invalid CallSid');
  next();
});

voiceRouter.get('/api/voice/config', requireAdmin, async (_req, res) => {
  res.json({ success: true, config: voiceAgentDeskConfig() });
});

voiceRouter.post('/api/voice/incoming', async (req, res) => {
  const language = String(req.query?.language || req.body?.language || '').toLowerCase().startsWith('en') ? 'en' : 'es';
  let responseUrl = `${voiceAgentDeskConfig().publicBaseUrl}/api/voice/respond?language=${language}`;
  try {
    const params = Object.fromEntries(Object.entries(req.body || {}).map(([k, v]) => [k, String(v ?? '')]));
    const signature = req.headers['x-twilio-signature'];
    const baseUrl = voiceAgentDeskConfig().publicBaseUrl;
    if (!verifyVoiceSignature(`${baseUrl}${req.originalUrl}`, params, typeof signature === 'string' ? signature : undefined)) {
      return res.status(403).type('text/xml').send('<?xml version="1.0" encoding="UTF-8"?><Response><Say>Unauthorized</Say></Response>');
    }
    const callId = String(req.body?.CallSid || req.body?.callId || `call_${Date.now()}`);
    const hotelId = String(req.query?.hotelId || req.body?.hotelId || '').trim() || undefined;
    const hotelName = String(req.query?.hotelName || req.body?.hotelName || '').trim() || undefined;
    const room = String(req.query?.room || req.body?.room || '').trim() || undefined;
    responseUrl = `${baseUrl}/api/voice/respond?hotelId=${encodeURIComponent(hotelId || '')}&hotelName=${encodeURIComponent(hotelName || '')}&room=${encodeURIComponent(room || '')}&language=${language}`;
    await rememberVoiceCallStart({ callId, from: req.body?.From, to: req.body?.To, hotelId, hotelName, room, language, startedAt: new Date().toISOString() });
    const twiml = createInboundVoiceResponse({
      callId, language, hotelName, room, responseUrl,
      humanTransferAvailable: voiceHumanTransferAvailable()
    });
    res.type('text/xml').send(twiml);
  } catch (err: any) {
    console.warn('[Voice] Incoming call setup failed; offering safe recovery.');
    res.status(200).type('text/xml').send(createVoiceRecoveryResponse({ responseUrl, language, recoveryCount: Number(req.query?.recoveryCount || 0) }));
  }
});

voiceRouter.post('/api/voice/respond', async (req, res) => {
  const language = String(req.query?.language || req.body?.language || '').toLowerCase().startsWith('en') ? 'en' : 'es';
  let responseUrl = `${voiceAgentDeskConfig().publicBaseUrl}/api/voice/respond?language=${language}`;
  try {
    const params = Object.fromEntries(Object.entries(req.body || {}).map(([k, v]) => [k, String(v ?? '')]));
    const signature = req.headers['x-twilio-signature'];
    const baseUrl = voiceAgentDeskConfig().publicBaseUrl;
    if (!verifyVoiceSignature(`${baseUrl}${req.originalUrl}`, params, typeof signature === 'string' ? signature : undefined)) {
      return res.status(403).type('text/xml').send('<?xml version="1.0" encoding="UTF-8"?><Response><Say>Unauthorized</Say></Response>');
    }
    const callId = String(req.body?.CallSid || req.body?.callId || `call_${Date.now()}`);
    const hotelId = String(req.query?.hotelId || req.body?.hotelId || '').trim() || undefined;
    const hotelName = String(req.query?.hotelName || req.body?.hotelName || '').trim() || undefined;
    const room = String(req.query?.room || req.body?.room || '').trim() || undefined;
    responseUrl = `${baseUrl}/api/voice/respond?hotelId=${encodeURIComponent(hotelId || '')}&hotelName=${encodeURIComponent(hotelName || '')}&room=${encodeURIComponent(room || '')}&language=${language}`;
    const transferUrl = new URL(`${baseUrl}/api/voice/human-transfer`);
    transferUrl.searchParams.set('callId', callId);
    transferUrl.searchParams.set('language', language);
    transferUrl.searchParams.set('responseUrl', responseUrl);
    const humanTransferUrl = transferUrl.toString();
    const twiml = await handleVoiceTurn({
      callId,
      speech: req.body?.SpeechResult,
      digits: req.body?.Digits,
      language,
      hotelId,
      hotelName,
      room,
      from: req.body?.From,
      silenceCount: Number(req.query?.silenceCount || 0),
      responseUrl,
      humanTransferUrl
    });
    res.type('text/xml').send(twiml);
  } catch (err: any) {
    console.warn('[Voice] Turn failed; previous business operation will not be replayed.');
    res.status(200).type('text/xml').send(createVoiceRecoveryResponse({ responseUrl, language, recoveryCount: Number(req.query?.recoveryCount || 0) }));
  }
});

voiceRouter.post('/api/voice/human-transfer', async (req, res) => {
  const params = Object.fromEntries(Object.entries(req.body || {}).map(([k, v]) => [k, String(v ?? '')]));
  const signature = req.headers['x-twilio-signature'];
  const baseUrl = voiceAgentDeskConfig().publicBaseUrl;
  if (!verifyVoiceSignature(`${baseUrl}${req.originalUrl}`, params, typeof signature === 'string' ? signature : undefined)) {
    return res.status(403).type('text/xml').send('<?xml version="1.0" encoding="UTF-8"?><Response><Say>Unauthorized</Say></Response>');
  }
  const status = String(req.body?.DialCallStatus || req.query?.status || 'unknown').toLowerCase();
  const callId = String(req.query?.callId || '').trim();
  if (!callId) return res.status(400).type('text/xml').send('<?xml version="1.0" encoding="UTF-8"?><Response><Say>Call identifier required</Say></Response>');
  await rememberVoiceHumanTransferStatus(callId, status);
  if (status === 'completed') await rememberVoiceCallEnd(callId, 'completed');
  const language = String(req.query?.language || '').toLowerCase().startsWith('en') ? 'en' : 'es';
  const responseUrl = String(req.query?.responseUrl || '');
  let safeResponseUrl = false;
  try {
    const callback = new URL(responseUrl);
    const publicOrigin = new URL(baseUrl).origin;
    safeResponseUrl = callback.origin === publicOrigin && callback.pathname === '/api/voice/respond';
  } catch {}
  if (!safeResponseUrl) {
    return res.type('text/xml').send('<?xml version="1.0" encoding="UTF-8"?><Response><Hangup/></Response>');
  }
  res.type('text/xml').send(createHumanTransferResult({ status, responseUrl, language }));
});

voiceRouter.get('/api/voice/calls/:callId', requireAdmin, async (req, res) => {
  try {
    const callId = String(req.params.callId || '').trim();
    if (!callId) return res.status(400).json({ success: false, error: 'callId requerido' });
    const session = await getVoiceCallSession(callId);
    if (!session) return res.status(404).json({ success: false, error: 'Llamada no encontrada' });
    res.json({ success: true, session });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'No se pudo recuperar la llamada' });
  }
});

voiceRouter.post('/api/voice/status', async (req, res) => {
  try {
    const params = Object.fromEntries(Object.entries(req.body || {}).map(([k, v]) => [k, String(v ?? '')]));
    const signature = req.headers['x-twilio-signature'];
    const baseUrl = voiceAgentDeskConfig().publicBaseUrl;
    if (!verifyVoiceSignature(`${baseUrl}${req.originalUrl}`, params, typeof signature === 'string' ? signature : undefined)) {
      return res.status(403).send();
    }
    const callId = String(req.body?.CallSid || req.body?.callId || '');
    if (!callId) return res.status(400).send();
    const status = String(req.body?.CallStatus || 'unknown').toLowerCase();
    if (['completed', 'busy', 'failed', 'no-answer', 'canceled', 'cancelled'].includes(status)) {
      await rememberVoiceCallEnd(callId, status);
    } else {
      await rememberVoiceCallStatus(callId, status);
    }
  } catch {
    return res.status(503).send('Unable to persist call status');
  }
  res.status(204).send();
});
