import { randomUUID } from 'crypto';
import { getFirestoreDb } from './bookingService';

export type AIProvider = 'google' | 'anthropic' | 'openai' | 'other' | 'unknown';
export type MeasurementMode = 'provider_usage' | 'request_estimate' | 'configured_estimate' | 'unmeasured';

export interface AIResourceTelemetryEvent {
  id: string;
  createdAt: string;
  operation: string;
  agentId?: string;
  provider: AIProvider;
  model: string;
  region?: string;
  sessionId?: string;
  userId?: string;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  inputChars?: number;
  outputChars?: number;
  durationMs: number;
  success: boolean;
  estimatedCostUSD: number | null;
  estimatedEnergyKWh: number | null;
  estimatedWaterLiters: number | null;
  measurementMode: MeasurementMode;
  assumptions: string[];
  errorType?: string;
}

type TelemetryConfig = {
  enabled: boolean;
  persist: boolean;
  sampleRate: number;
  inputUSDPerMillionTokens: number;
  outputUSDPerMillionTokens: number;
  kWhPerMillionTokens: number;
  litersPerKWh: number;
};

function envNumber(name: string): number | null {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return null;
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : null;
}

function clampTokens(value: unknown): number | undefined {
  const valueAsNumber = Number(value);
  return Number.isFinite(valueAsNumber) && valueAsNumber >= 0 ? Math.round(valueAsNumber) : undefined;
}

function estimateTokensFromChars(chars: unknown): number | undefined {
  const n = Number(chars);
  return Number.isFinite(n) && n > 0 ? Math.max(1, Math.ceil(n / 4)) : undefined;
}

function inferProvider(model: string): AIProvider {
  const normalized = String(model || '').toLowerCase();
  if (normalized.includes('gemini') || normalized.includes('google')) return 'google';
  if (normalized.includes('claude') || normalized.includes('anthropic')) return 'anthropic';
  if (normalized.includes('gpt-') || normalized.includes('openai')) return 'openai';
  return normalized ? 'other' : 'unknown';
}

export function getAIResourceTelemetryConfig(): TelemetryConfig {
  const sampleRate = envNumber('AI_TELEMETRY_SAMPLE_RATE');
  return {
    enabled: process.env.AI_TELEMETRY_ENABLED !== 'false',
    persist: process.env.AI_TELEMETRY_PERSIST !== 'false',
    sampleRate: Math.max(0, Math.min(1, sampleRate ?? 1)),
    inputUSDPerMillionTokens: envNumber('AI_TELEMETRY_INPUT_USD_PER_MILLION_TOKENS') ?? 0,
    outputUSDPerMillionTokens: envNumber('AI_TELEMETRY_OUTPUT_USD_PER_MILLION_TOKENS') ?? 0,
    kWhPerMillionTokens: envNumber('AI_TELEMETRY_KWH_PER_MILLION_TOKENS') ?? 0,
    litersPerKWh: envNumber('AI_TELEMETRY_LITERS_PER_KWH') ?? 0
  };
}

export function extractGeminiUsage(response: any) {
  const usage = response?.usageMetadata || response?.usage_metadata || {};
  const inputTokens = clampTokens(usage.promptTokenCount ?? usage.inputTokenCount);
  const outputTokens = clampTokens(usage.candidatesTokenCount ?? usage.outputTokenCount);
  const totalTokens = clampTokens(usage.totalTokenCount) ?? (
    inputTokens !== undefined || outputTokens !== undefined
      ? (inputTokens || 0) + (outputTokens || 0)
      : undefined
  );
  return { inputTokens, outputTokens, totalTokens, outputText: typeof response?.text === 'string' ? response.text : undefined };
}

export function extractClaudeUsage(response: any) {
  const usage = response?.usage || {};
  const inputTokens = clampTokens(usage.input_tokens);
  const outputTokens = clampTokens(usage.output_tokens);
  const totalTokens = inputTokens !== undefined || outputTokens !== undefined
    ? (inputTokens || 0) + (outputTokens || 0)
    : undefined;
  let outputText = '';
  for (const block of Array.isArray(response?.content) ? response.content : []) {
    if (block?.type === 'text' && typeof block.text === 'string') outputText += block.text;
  }
  return { inputTokens, outputTokens, totalTokens, outputText };
}

function calculateCost(inputTokens: number | undefined, outputTokens: number | undefined, config: TelemetryConfig) {
  if (inputTokens === undefined && outputTokens === undefined) return null;
  if (config.inputUSDPerMillionTokens === 0 && config.outputUSDPerMillionTokens === 0) return null;
  return Number((
    ((inputTokens || 0) / 1_000_000) * config.inputUSDPerMillionTokens +
    ((outputTokens || 0) / 1_000_000) * config.outputUSDPerMillionTokens
  ).toFixed(8));
}

function calculateEnergy(totalTokens: number | undefined, config: TelemetryConfig) {
  if (totalTokens === undefined || config.kWhPerMillionTokens <= 0) return null;
  return Number(((totalTokens / 1_000_000) * config.kWhPerMillionTokens).toFixed(8));
}

function calculateWater(energyKWh: number | null, config: TelemetryConfig) {
  if (energyKWh === null || config.litersPerKWh <= 0) return null;
  return Number((energyKWh * config.litersPerKWh).toFixed(8));
}

export async function recordAIResourceTelemetry(input: {
  operation: string;
  agentId?: string;
  provider?: AIProvider;
  model: string;
  region?: string;
  sessionId?: string;
  userId?: string;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  inputChars?: number;
  outputChars?: number;
  durationMs: number;
  success: boolean;
  assumptions?: string[];
  errorType?: string;
}): Promise<AIResourceTelemetryEvent | null> {
  const config = getAIResourceTelemetryConfig();
  if (!config.enabled || Math.random() > config.sampleRate) return null;

  const inputTokens = clampTokens(input.inputTokens) ?? estimateTokensFromChars(input.inputChars);
  const outputTokens = clampTokens(input.outputTokens) ?? estimateTokensFromChars(input.outputChars);
  const totalTokens = clampTokens(input.totalTokens) ?? (
    inputTokens !== undefined || outputTokens !== undefined
      ? (inputTokens || 0) + (outputTokens || 0)
      : undefined
  );

  const providerUsageKnown =
    input.inputTokens !== undefined ||
    input.outputTokens !== undefined ||
    input.totalTokens !== undefined;

  const assumptions = [...(input.assumptions || [])];
  if (!providerUsageKnown && (input.inputChars || input.outputChars)) {
    assumptions.push('Token count estimated at approximately 4 characters per token; this is not provider billing data.');
  }
  const estimatedCostUSD = calculateCost(inputTokens, outputTokens, config);
  const estimatedEnergyKWh = calculateEnergy(totalTokens, config);
  const estimatedWaterLiters = calculateWater(estimatedEnergyKWh, config);

  if (estimatedCostUSD === null) {
    assumptions.push('AI cost is not measured until provider billing/token pricing is configured.');
  }
  if (estimatedEnergyKWh === null) {
    assumptions.push('Energy is not measured until AI_TELEMETRY_KWH_PER_MILLION_TOKENS is configured from a documented methodology.');
  }
  if (estimatedWaterLiters === null) {
    assumptions.push('Water is not measured until energy and AI_TELEMETRY_LITERS_PER_KWH are configured from a documented methodology.');
  }

  const measurementMode: MeasurementMode = providerUsageKnown
    ? 'provider_usage'
    : (input.inputChars || input.outputChars ? 'request_estimate' : 'unmeasured');

  const event: AIResourceTelemetryEvent = {
    id: `air_${randomUUID()}`,
    createdAt: new Date().toISOString(),
    operation: String(input.operation || 'ai.call').slice(0, 120),
    agentId: input.agentId ? String(input.agentId).slice(0, 120) : undefined,
    provider: input.provider || inferProvider(input.model),
    model: String(input.model || 'unknown').slice(0, 160),
    region: input.region ? String(input.region).slice(0, 80) : undefined,
    sessionId: input.sessionId ? String(input.sessionId).slice(0, 160) : undefined,
    userId: input.userId ? String(input.userId).slice(0, 160) : undefined,
    inputTokens,
    outputTokens,
    totalTokens,
    inputChars: Number.isFinite(Number(input.inputChars)) ? Number(input.inputChars) : undefined,
    outputChars: Number.isFinite(Number(input.outputChars)) ? Number(input.outputChars) : undefined,
    durationMs: Math.max(0, Math.round(Number(input.durationMs) || 0)),
    success: Boolean(input.success),
    estimatedCostUSD,
    estimatedEnergyKWh,
    estimatedWaterLiters,
    measurementMode,
    assumptions: Array.from(new Set(assumptions)).slice(0, 12),
    errorType: input.errorType ? String(input.errorType).slice(0, 160) : undefined
  };

  if (config.persist) {
    try {
      const db = getFirestoreDb();
      if (db) await db.collection('ai_resource_telemetry').doc(event.id).set(event);
    } catch (error) {
      console.warn('No se pudo persistir la telemetría de recursos IA:', error);
    }
  }

  return event;
}

export async function withAIResourceTelemetry<T>(input: {
  operation: string;
  agentId?: string;
  provider?: AIProvider;
  model: string;
  region?: string;
  sessionId?: string;
  userId?: string;
  inputText?: string;
  extractUsage?: (result: T) => { inputTokens?: number; outputTokens?: number; totalTokens?: number; outputText?: string };
}, call: () => Promise<T>): Promise<T> {
  const startedAt = Date.now();
  try {
    const result = await call();
    const usage = input.extractUsage ? input.extractUsage(result) : {};
    await recordAIResourceTelemetry({
      ...input,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      totalTokens: usage.totalTokens,
      inputChars: input.inputText?.length,
      outputChars: usage.outputText?.length,
      durationMs: Date.now() - startedAt,
      success: true
    });
    return result;
  } catch (error: any) {
    await recordAIResourceTelemetry({
      ...input,
      inputTokens: undefined,
      outputTokens: undefined,
      totalTokens: undefined,
      inputChars: input.inputText?.length,
      durationMs: Date.now() - startedAt,
      success: false,
      errorType: error?.name || 'AI_CALL_ERROR'
    });
    throw error;
  }
}

function emptyTotals() {
  return { calls: 0, successes: 0, failures: 0, inputTokens: 0, outputTokens: 0, totalTokens: 0, estimatedCostUSD: 0, estimatedEnergyKWh: 0, estimatedWaterLiters: 0 };
}

export async function getAIResourceTelemetrySnapshot(options: { hours?: number; limit?: number } = {}) {
  const hours = Math.max(1, Math.min(168, Number(options.hours) || 24));
  const limit = Math.max(1, Math.min(2000, Number(options.limit) || 500));
  const since = Date.now() - hours * 60 * 60 * 1000;
  const db = getFirestoreDb();

  if (!db) {
    return {
      available: false,
      generatedAt: new Date().toISOString(),
      rangeHours: hours,
      totals: emptyTotals(),
      models: [],
      measurement: { providerUsageEvents: 0, estimatedEvents: 0, unmeasuredEvents: 0 },
      assumptions: ['Firestore unavailable; no persisted AI resource telemetry is available.']
    };
  }

  try {
    const snap = await db.collection('ai_resource_telemetry').orderBy('createdAt', 'desc').limit(limit).get();
    const events = snap.docs
      .map((doc) => doc.data() as AIResourceTelemetryEvent)
      .filter((event) => new Date(event.createdAt).getTime() >= since);

    const totals = events.reduce((acc, event) => {
      acc.calls += 1;
      if (event.success) acc.successes += 1;
      else acc.failures += 1;
      acc.inputTokens += Number(event.inputTokens || 0);
      acc.outputTokens += Number(event.outputTokens || 0);
      acc.totalTokens += Number(event.totalTokens || 0);
      acc.estimatedCostUSD += Number(event.estimatedCostUSD || 0);
      acc.estimatedEnergyKWh += Number(event.estimatedEnergyKWh || 0);
      acc.estimatedWaterLiters += Number(event.estimatedWaterLiters || 0);
      return acc;
    }, emptyTotals());

    const models = Array.from(new Set(events.map((event) => event.model))).slice(0, 30);
    const measurement = {
      providerUsageEvents: events.filter((event) => event.measurementMode === 'provider_usage').length,
      estimatedEvents: events.filter((event) => event.measurementMode === 'request_estimate' || event.measurementMode === 'configured_estimate').length,
      unmeasuredEvents: events.filter((event) => event.measurementMode === 'unmeasured').length
    };

    return {
      available: true,
      generatedAt: new Date().toISOString(),
      rangeHours: hours,
      totals: {
        ...totals,
        estimatedCostUSD: Number(totals.estimatedCostUSD.toFixed(8)),
        estimatedEnergyKWh: Number(totals.estimatedEnergyKWh.toFixed(8)),
        estimatedWaterLiters: Number(totals.estimatedWaterLiters.toFixed(8))
      },
      models,
      measurement,
      assumptions: Array.from(new Set(events.flatMap((event) => event.assumptions || []))).slice(0, 20)
    };
  } catch (error) {
    return {
      available: false,
      generatedAt: new Date().toISOString(),
      rangeHours: hours,
      totals: emptyTotals(),
      models: [],
      measurement: { providerUsageEvents: 0, estimatedEvents: 0, unmeasuredEvents: 0 },
      assumptions: [`Telemetry read failed: ${error instanceof Error ? error.message : 'unknown error'}`]
    };
  }
}
