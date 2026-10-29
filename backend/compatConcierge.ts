/**
 * Concierge sobre proveedor OpenAI-compatible (Groq gratis). Usa solo herramientas
 * de lectura (sin efectos): las reservas se inician desde la ficha del tour, donde
 * el servidor valida disponibilidad, consentimiento y pago. Devuelve null ante
 * cualquier fallo para que el flujo existente aplique su respaldo determinista.
 */
import { callProvider, redactPii } from './aiRouter';
import { getAiConfig } from './aiConfig';
import { openAiCompatChat, toOpenAiTools, type CompatMessage } from './openaiCompatClient';

export const COMPAT_READ_ONLY_TOOLS = [
  'search_operator_tours', 'search_tours', 'check_availability', 'quote_price', 'lookup_booking',
  'cancellation_policy', 'park_info', 'nearest_services', 'season_advice',
  // Fase C (lectura)
  'get_product', 'get_policies',
] as const;

const MAX_CONTEXT_CHARS = 3500;
const MAX_TOOL_RESULT_CHARS = 2500;
const MAX_ROUNDS = 3;

export function buildCompatSystemPrompt(isEn: boolean) {
  return [
    isEn ? 'You are the travel assistant of Costa Rica Tours. Reply in English.' : 'Eres el asistente de viajes de Costa Rica Tours. Responde en español.',
    'Be warm, concise (max ~120 words) and practical. Use the tools to look up tours, availability, quotes, bookings, parks and nearby services.',
    'For details of one tour (inclusions, duration, minimum age, what to bring) call get_product with its id. For cancellation or terms questions call get_policies and quote only that text.',
    'For ANY question about tours or activities, ALWAYS call search_operator_tours (full catalog of ~590 tours, use the region and activity, e.g. query "rafting", region "arenal") before answering. Never say an activity is unavailable without searching it first.',
    'RULES (mandatory):',
    '- Never invent tours, prices, availability, ratings, schedules or providers. Use only tool results or the verified context. If unknown, say so.',
    '- Ground every answer in the KNOWLEDGE BASE snippets, tool results or verified context. If the answer is not there, say you do not have that information and offer a quote or human follow-up.',
    '- Prices are operator reference prices subject to confirmation; availability is confirmed with the local operator before any payment.',
    '- Never reveal operator/provider names, phones, emails, addresses or websites. If asked: "We work with local operators; we verify their ICT tourism declaration before confirming each booking." The operator identity is shared in the booking confirmation.',
    '- To book: tell the customer to open the tour page and use "Consultar disponibilidad / Request a quote"; our team confirms with the operator and then sends the secure payment link. Never say a booking or payment is confirmed unless lookup_booking says so.',
    '- Never ask for card numbers. Emergencies in Costa Rica: 911.',
  ].join('\n');
}

export function selectCompatTools(declarations: Array<{ name: string }>, registry: Record<string, { sideEffect?: boolean }>) {
  const allowed = new Set<string>(COMPAT_READ_ONLY_TOOLS);
  return declarations.filter(d => allowed.has(d.name) && registry[d.name] && registry[d.name].sideEffect !== true);
}

export async function runCompatConcierge(params: {
  message: string;
  isEn: boolean;
  history: Array<{ role: string; text: string }>;
  liveToolContext: string;
  agentId: string;
}): Promise<{ reply: string; modelUsed: string; agentId: string; quickActions: Array<{ label: string; action: string; data?: any }> } | null> {
  const cfg = getAiConfig();
  const safe = (t: string) => (cfg.allowExternalPii ? t : redactPii(t));
  try {
    const { GEMINI_FUNCTION_DECLARATIONS, AGENT_TOOL_REGISTRY, executeAgentTool } = await import('./agentTools');
    const tools = toOpenAiTools(selectCompatTools(GEMINI_FUNCTION_DECLARATIONS as any, AGENT_TOOL_REGISTRY as any) as any);
    const messages: CompatMessage[] = [{ role: 'system', content: buildCompatSystemPrompt(params.isEn) }];
    for (const h of params.history.slice(-6)) {
      const text = safe(String(h.text || '')).slice(0, 800);
      if (text) messages.push(h.role === 'user' ? { role: 'user', content: text } : { role: 'assistant', content: text });
    }
    const ctx = params.liveToolContext ? `VERIFIED CONTEXT:\n${safe(params.liveToolContext).slice(0, MAX_CONTEXT_CHARS)}\n\n` : '';
    messages.push({ role: 'user', content: `${ctx}${safe(params.message)}` });

    let model = '';
    for (let round = 0; round <= MAX_ROUNDS; round++) {
      const response: any = await callProvider('openai_compat', 'concierge', signal => openAiCompatChat({
        messages, tools: round < MAX_ROUNDS ? tools : undefined, signal,
      }));
      model = String(response?.model || model);
      const msg = response?.choices?.[0]?.message || {};
      const calls = Array.isArray(msg.tool_calls) ? msg.tool_calls.slice(0, 4) : [];
      if (!calls.length) {
        const reply = String(msg.content || '').trim();
        if (!reply) return null;
        const quickActions: Array<{ label: string; action: string; data?: any }> = [];
        if (/reserv|book|precio|price|cost/i.test(params.message)) quickActions.push({ label: params.isEn ? '📅 Book Now' : '📅 Reservar Ahora', action: 'book' });
        quickActions.push({ label: params.isEn ? '💬 Direct WhatsApp' : '💬 WhatsApp Directo', action: 'direct_whatsapp' });
        return { reply, modelUsed: model, agentId: params.agentId, quickActions };
      }
      messages.push({ role: 'assistant', content: msg.content ?? null, tool_calls: calls });
      for (const call of calls) {
        const name = String(call?.function?.name || '');
        let content: string;
        if (!(COMPAT_READ_ONLY_TOOLS as readonly string[]).includes(name)) {
          content = JSON.stringify({ error: 'tool_not_allowed' });
        } else {
          try {
            const args = JSON.parse(String(call?.function?.arguments || '{}') || '{}');
            const result = await executeAgentTool(name as any, args);
            content = JSON.stringify({ result });
          } catch (err: any) {
            content = JSON.stringify({ error: String(err?.message || 'tool_failed').slice(0, 200) });
          }
        }
        messages.push({ role: 'tool', tool_call_id: String(call.id || name), content: safe(content).slice(0, MAX_TOOL_RESULT_CHARS) });
      }
    }
    return null;
  } catch {
    // callProvider ya registró la observación y abrió el breaker si correspondía.
    return null;
  }
}
