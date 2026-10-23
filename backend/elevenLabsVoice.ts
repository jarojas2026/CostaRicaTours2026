/**
 * Voz de servidor (TTS) para "Escuchar respuesta" — adaptador opcional y de pago.
 *
 * Gasto real $0 por defecto: ELEVENLABS_ENABLED=false (o ausente) y nada sale
 * de la instancia. El cliente sigue usando la voz gratuita del navegador
 * (Web Speech API, AIAssistant.tsx). Si el flag está activo pero falta la clave,
 * se supera el tope diario o el proveedor falla, el resultado es
 * { ok:false, fallback:'browser' } y el navegador habla igual (fallback silencioso).
 *
 * Reglas:
 * - La clave solo se lee en el servidor (ELEVENLABS_API_KEY desde env/Secret
 *   Manager). Nunca VITE_*, nunca se registra ni se devuelve.
 * - El nombre del proveedor nunca llega al cliente: la respuesta pública solo
 *   dice "audio" o "fallback".
 * - Caché en memoria por hash(idioma|voz|texto) para no pagar dos veces lo mismo.
 * - Tope diario de caracteres (ELEVENLABS_DAILY_CHAR_CAP, por defecto 10000) por
 *   instancia; el store durable llega con el adaptador de estado compartido.
 * - Registro de auditoría sin texto: solo hash, caracteres, idioma, resultado.
 *
 * Variables: ELEVENLABS_ENABLED, ELEVENLABS_API_KEY, ELEVENLABS_VOICE_ID_ES,
 * ELEVENLABS_VOICE_ID_EN, ELEVENLABS_MODEL_ID, ELEVENLABS_DAILY_CHAR_CAP,
 * ELEVENLABS_MAX_TEXT_CHARS, ELEVENLABS_BASE_URL (solo para tests/proxy).
 */
import crypto from 'node:crypto';

type Env = NodeJS.ProcessEnv | Record<string, string | undefined>;
export type TtsLanguage = 'es' | 'en';
export type TtsFallbackReason = 'disabled' | 'not_configured' | 'empty_text' | 'cap_reached' | 'provider_error' | 'timeout';
export type TtsResult =
  | { ok: true; audio: Buffer; contentType: 'audio/mpeg'; cached: boolean; chars: number }
  | { ok: false; fallback: 'browser'; reason: TtsFallbackReason };

export type TtsAuditEntry = { at: string; textHash: string; chars: number; language: TtsLanguage; outcome: 'audio' | 'cached' | TtsFallbackReason; actor?: string };

const str = (v: string | undefined) => String(v ?? '').trim();
const int = (v: string | undefined, def: number, min: number, max: number) => {
  const n = Number(str(v));
  return Number.isFinite(n) && n > 0 ? Math.min(max, Math.max(min, Math.round(n))) : def;
};

export function elevenLabsConfig(env: Env = process.env) {
  const enabled = str(env.ELEVENLABS_ENABLED).toLowerCase() === 'true';
  const key = str(env.ELEVENLABS_API_KEY);
  const voiceEs = str(env.ELEVENLABS_VOICE_ID_ES);
  const voiceEn = str(env.ELEVENLABS_VOICE_ID_EN) || voiceEs;
  return {
    enabled,
    configured: key.length >= 20 && Boolean(voiceEs),
    modelId: str(env.ELEVENLABS_MODEL_ID) || 'eleven_multilingual_v2',
    voiceEs,
    voiceEn,
    dailyCharCap: int(env.ELEVENLABS_DAILY_CHAR_CAP, 10_000, 100, 1_000_000),
    maxTextChars: int(env.ELEVENLABS_MAX_TEXT_CHARS, 600, 50, 5_000),
    baseUrl: (str(env.ELEVENLABS_BASE_URL) || 'https://api.elevenlabs.io').replace(/\/+$/, ''),
    timeoutMs: int(env.ELEVENLABS_TIMEOUT_MS, 10_000, 1_000, 30_000),
  };
}

/** Estado público para el panel admin: nunca incluye la clave. */
export function elevenLabsStatus(env: Env = process.env) {
  const cfg = elevenLabsConfig(env);
  return {
    enabled: cfg.enabled,
    configured: cfg.configured,
    dailyCharCap: cfg.dailyCharCap,
    usedToday: usage.day === utcDay() ? usage.chars : 0,
    cacheEntries: cache.size,
    fallback: 'browser' as const,
  };
}

/** Limpia texto de marcas internas antes de sintetizar. */
export function cleanTtsText(text: string, maxChars: number) {
  return String(text ?? '')
    .replace(/\[TOUR:[^\]]+\]/g, '')
    .replace(/[*_#`>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxChars);
}

const CACHE_LIMIT = 50;
const cache = new Map<string, Buffer>();
const usage = { day: '', chars: 0 };
const AUDIT_LIMIT = 200;
const audit: TtsAuditEntry[] = [];
const utcDay = (now = Date.now()) => new Date(now).toISOString().slice(0, 10);

export function resetElevenLabsState() { cache.clear(); usage.day = ''; usage.chars = 0; audit.length = 0; }
export function getTtsAuditLog() { return audit.slice(); }

function record(entry: TtsAuditEntry) {
  audit.push(entry);
  if (audit.length > AUDIT_LIMIT) audit.shift();
  console.info('[tts]', JSON.stringify({ outcome: entry.outcome, chars: entry.chars, language: entry.language, textHash: entry.textHash }));
}

export async function synthesizeSpeech(
  input: { text: string; language?: string; actor?: string },
  deps: { env?: Env; fetchImpl?: typeof fetch; now?: () => number } = {},
): Promise<TtsResult> {
  const env = deps.env ?? process.env;
  const now = deps.now ?? Date.now;
  const cfg = elevenLabsConfig(env);
  const language: TtsLanguage = str(input.language).toLowerCase().startsWith('en') ? 'en' : 'es';
  const text = cleanTtsText(input.text, cfg.maxTextChars);
  const voice = language === 'en' ? cfg.voiceEn : cfg.voiceEs;
  const textHash = crypto.createHash('sha256').update(`${language}|${voice}|${cfg.modelId}|${text}`).digest('hex').slice(0, 24);
  const base = { at: new Date(now()).toISOString(), textHash, chars: text.length, language, actor: input.actor };
  const fail = (reason: TtsFallbackReason): TtsResult => { record({ ...base, outcome: reason }); return { ok: false, fallback: 'browser', reason }; };

  if (!cfg.enabled) return fail('disabled');
  if (!cfg.configured) return fail('not_configured');
  if (!text) return fail('empty_text');

  const hit = cache.get(textHash);
  if (hit) {
    cache.delete(textHash); cache.set(textHash, hit);
    record({ ...base, outcome: 'cached' });
    return { ok: true, audio: hit, contentType: 'audio/mpeg', cached: true, chars: text.length };
  }

  const day = utcDay(now());
  if (usage.day !== day) { usage.day = day; usage.chars = 0; }
  if (usage.chars + text.length > cfg.dailyCharCap) return fail('cap_reached');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), cfg.timeoutMs);
  try {
    const res = await (deps.fetchImpl ?? fetch)(`${cfg.baseUrl}/v1/text-to-speech/${encodeURIComponent(voice)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'audio/mpeg', 'xi-api-key': str(env.ELEVENLABS_API_KEY) },
      body: JSON.stringify({ text, model_id: cfg.modelId }),
      signal: controller.signal,
    });
    if (!res.ok) return fail('provider_error');
    const audio = Buffer.from(await res.arrayBuffer());
    if (!audio.length) return fail('provider_error');
    usage.chars += text.length;
    cache.set(textHash, audio);
    if (cache.size > CACHE_LIMIT) cache.delete(cache.keys().next().value as string);
    record({ ...base, outcome: 'audio' });
    return { ok: true, audio, contentType: 'audio/mpeg', cached: false, chars: text.length };
  } catch (error: any) {
    return fail(error?.name === 'AbortError' ? 'timeout' : 'provider_error');
  } finally {
    clearTimeout(timer);
  }
}
