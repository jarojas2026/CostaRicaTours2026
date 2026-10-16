import { GoogleGenAI } from '@google/genai';

/** Explicit Vertex opt-in uses Cloud Run ADC; no uploaded private key is needed. */
export function geminiOptions(env: NodeJS.ProcessEnv = process.env) {
  const httpOptions = { timeout: 20_000, headers: { 'User-Agent': 'costa-rica-tours' } };
  if (env.GOOGLE_GENAI_USE_VERTEXAI?.toLowerCase() === 'true') {
    const project = env.GOOGLE_CLOUD_PROJECT || env.GCP_PROJECT;
    const location = env.GOOGLE_CLOUD_LOCATION || env.VERTEX_AI_REGION;
    return project && location ? { vertexai: true, project, location, httpOptions } : null;
  }
  const apiKey = env.GEMINI_API_KEY?.trim();
  return apiKey && !apiKey.startsWith('AQ.') && apiKey.length >= 20
    ? { vertexai: false, apiKey, httpOptions } : null;
}

let client: GoogleGenAI | null = null;
export function getGeminiClient() {
  const options = geminiOptions();
  if (!options) return null;
  return client ??= new GoogleGenAI(options);
}

export function getConciergeModel() {
  // Preserve the current default; operators can select a model enabled in their project.
  return process.env.GEMINI_MODEL?.trim() || 'gemini-3.5-flash';
}
