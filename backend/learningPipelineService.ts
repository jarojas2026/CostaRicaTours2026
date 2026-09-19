/**
 * Step 9 — Training/fine-tuning preparation pipeline.
 * Produces privacy-minimized JSONL-ready examples and a versioned manifest.
 * Actual model training is intentionally external to the request-serving process.
 */
import crypto from 'crypto';
import { buildTrainingExamples } from './learningEngine';

function scrub(text: string): string {
  return String(text || '')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+.[A-Z]{2,}/gi, '[EMAIL]')
    .replace(/(?:\+?506[ -]?)?[0-9]{4}[ -]?[0-9]{4}/g, '[PHONE]')
    .replace(/\b(?:CRT-[A-Z0-9-]+|CR-PV-\d+|CR-HLD-\d+)\b/gi, '[BOOKING_ID]')
    .slice(0, 6000);
}

export async function buildLearningDataset(limit = 500) {
  const examples = await buildTrainingExamples(Math.min(limit, 500));
  const usable = examples.filter(x => x.outcome === 'success' || x.outcome === 'human_corrected');
  const records = usable.map(x => ({
    messages: [
      { role: 'user', content: scrub(x.instruction) },
      { role: 'assistant', content: scrub(x.response) }
    ],
    metadata: { outcome: x.outcome, reward: x.reward }
  }));
  const jsonl = records.map(x => JSON.stringify(x)).join('\n');
  const version = crypto.createHash('sha256').update(jsonl).digest('hex').slice(0, 12);
  return {
    version,
    examples: records.length,
    jsonl,
    manifest: {
      format: 'jsonl',
      privacy: 'emails/phones/booking IDs scrubbed',
      eligibleOutcomes: ['success', 'human_corrected'],
      createdAt: new Date().toISOString(),
      nextStep: 'Submit the versioned dataset to an approved training/fine-tuning job; never train from raw production PII.'
    }
  };
}
