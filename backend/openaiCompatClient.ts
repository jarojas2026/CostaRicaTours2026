/**
 * Cliente mínimo para APIs OpenAI-compatibles (Groq, OpenRouter). Sin SDK:
 * fetch + JSON. Nunca registra la clave, el prompt ni la respuesta. Los errores
 * llevan `status` para que aiHealth.classifyAiFailure los clasifique (429 -> quota).
 */
import { getOpenAiCompatConfig } from './aiConfig';

export type CompatMessage =
  | { role: 'system' | 'user'; content: string }
  | { role: 'assistant'; content: string | null; tool_calls?: CompatToolCall[] }
  | { role: 'tool'; tool_call_id: string; content: string };

export type CompatToolCall = { id: string; type: 'function'; function: { name: string; arguments: string } };

export async function openAiCompatChat(params: {
  messages: CompatMessage[];
  tools?: any[];
  signal?: AbortSignal;
  maxTokens?: number;
}, env: NodeJS.ProcessEnv = process.env): Promise<any> {
  const cfg = getOpenAiCompatConfig(env);
  const key = String(env.OPENAI_COMPAT_API_KEY || '').trim();
  if (!cfg.baseUrl || !key) throw Object.assign(new Error('openai_compat not configured'), { status: 401 });
  const body: Record<string, unknown> = {
    model: cfg.model,
    messages: params.messages,
    temperature: 0.4,
    max_tokens: params.maxTokens ?? cfg.maxTokens,
  };
  if (/gpt-oss/i.test(cfg.model)) body.reasoning_effort = cfg.reasoningEffort;
  if (params.tools?.length) { body.tools = params.tools; body.tool_choice = 'auto'; }
  const res = await fetch(`${cfg.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify(body),
    signal: params.signal,
  });
  if (!res.ok) {
    // Solo el código y el tipo de error del proveedor; nunca el cuerpo completo.
    let type = '';
    try { const j: any = await res.json(); type = String(j?.error?.code || j?.error?.type || '').slice(0, 60); } catch { /* ignore */ }
    throw Object.assign(new Error(`openai_compat_http_${res.status}${type ? `:${type}` : ''}`), { status: res.status });
  }
  return res.json();
}

/** Convierte declaraciones de Gemini (type: 'OBJECT') a JSON Schema de OpenAI (type: 'object'). */
export function toJsonSchema(schema: any): any {
  if (Array.isArray(schema)) return schema.map(toJsonSchema);
  if (!schema || typeof schema !== 'object') return schema;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(schema)) {
    if (k === 'type' && typeof v === 'string') out[k] = v.toLowerCase();
    else if (k === 'properties' && v && typeof v === 'object') out[k] = Object.fromEntries(Object.entries(v).map(([pk, pv]) => [pk, toJsonSchema(pv)]));
    else if (k === 'items') out[k] = toJsonSchema(v);
    else out[k] = v;
  }
  return out;
}

export function toOpenAiTools(declarations: Array<{ name: string; description?: string; parameters?: any }>) {
  return declarations.map(d => ({
    type: 'function' as const,
    function: { name: d.name, description: d.description || '', parameters: toJsonSchema(d.parameters || { type: 'OBJECT', properties: {} }) },
  }));
}
