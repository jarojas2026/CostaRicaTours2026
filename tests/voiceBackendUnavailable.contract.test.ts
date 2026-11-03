import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync('src/App.tsx', 'utf8');
const assistant = readFileSync('src/components/AIAssistant.tsx', 'utf8');
const voiceConcierge = readFileSync('src/components/VoiceConcierge.tsx', 'utf8');
const voiceRoute = readFileSync('backend/routes/voice.ts', 'utf8');

test('voice health endpoint exposes only readiness status and never provider config/secrets', () => {
  const health = voiceRoute.slice(voiceRoute.indexOf("voiceRouter.get('/api/voice/health'"), voiceRoute.indexOf("voiceRouter.get('/api/voice/config'"));
  assert.match(health, /config\.enabled && config\.ready/);
  assert.match(health, /status/);
  assert.match(health, /messageCode/);
  assert.doesNotMatch(health, /publicBaseUrl|missing|primaryHandler|VOICE_PROVIDER_AUTH_TOKEN|process\.env/);
});

test('AIAssistant no longer activates browser mic and shows Coming soon in Spanish/English', () => {
  assert.doesNotMatch(assistant, /data-testid="assistant-mic"/);
  assert.doesNotMatch(assistant, /useSpeechRecognition\(/);
  assert.match(assistant, /Dictado por voz: próximamente/);
  assert.match(assistant, /Voice dictation: coming soon/);
});

test('standalone voice concierge mic is disabled and displays Coming soon', () => {
  assert.doesNotMatch(voiceConcierge, /data-testid="voice-concierge-mic"/);
  assert.doesNotMatch(voiceConcierge, /useSpeechRecognition\(/);
  assert.match(voiceConcierge, /voice-concierge-coming-soon/);
  assert.match(voiceConcierge, /Voice dictation: coming soon/);
});

test('retired /conserje prototype route redirects without loading the prototype page', () => {
  assert.match(app, /path="\/conserje"/);
  assert.match(app, /lazy\(\(\) => import\('\.\/pages\/VoiceConciergePage'\)/);
});
