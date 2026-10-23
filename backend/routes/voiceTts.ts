/**
 * Voz de servidor (TTS) — endpoints admin. Apagado por defecto (ELEVENLABS_ENABLED).
 * Con el flag apagado responde { fallback: 'browser' } y el cliente usa Web Speech.
 * La respuesta nunca nombra al proveedor.
 */
import { elevenLabsStatus, getTtsAuditLog, synthesizeSpeech } from '../elevenLabsVoice';
import { createRouter, requireAdmin } from './shared';

export const voiceTtsRouter = createRouter();

voiceTtsRouter.get('/api/voice/tts/status', requireAdmin, async (_req, res) => {
  res.json({ success: true, status: elevenLabsStatus(), audit: getTtsAuditLog().slice(-20) });
});

voiceTtsRouter.post('/api/voice/tts', requireAdmin, async (req, res) => {
  const actor = String((req as any).adminAccess?.uid || (req as any).adminAccess?.role || 'admin');
  const result = await synthesizeSpeech({ text: String(req.body?.text ?? ''), language: String(req.body?.language ?? 'es'), actor });
  if (!result.ok) return res.json({ success: true, fallback: 'browser' });
  res.setHeader('Content-Type', result.contentType);
  res.setHeader('Cache-Control', 'private, max-age=3600');
  res.send(result.audio);
});
