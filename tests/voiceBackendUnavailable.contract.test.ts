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

const voiceFlags = readFileSync('src/config/voiceFlags.ts', 'utf8');

// Regla del proyecto: no borrar código, desactivar con bandera. El dictado usa la Web Speech API del
// navegador ($0, sin backend); VITE_VOICE_DICTATION=off lo apaga y muestra "Próximamente".
test('voice dictation is controlled by a flag (VITE_VOICE_DICTATION=off) instead of deleting the mic', async () => {
  assert.match(voiceFlags, /VITE_VOICE_DICTATION/);
  const { isVoiceDictationEnabled } = await import('../src/config/voiceFlags');
  assert.equal(isVoiceDictationEnabled(undefined), true);
  assert.equal(isVoiceDictationEnabled('off'), false);
  assert.equal(isVoiceDictationEnabled(' OFF '), false);
  assert.equal(isVoiceDictationEnabled('on'), true);
});

test('AIAssistant keeps the browser mic behind the flag and shows Coming soon in Spanish/English when off', () => {
  assert.match(assistant, /useSpeechRecognition\(/);
  assert.match(assistant, /const showMic = VOICE_DICTATION_ENABLED && speech\.supported/);
  assert.match(assistant, /\{showMic && <button[\s\S]*?data-testid="assistant-mic"/);
  assert.match(assistant, /\{!VOICE_DICTATION_ENABLED && <p data-testid="assistant-voice-coming-soon"/);
  assert.match(assistant, /Dictado por voz: próximamente/);
  assert.match(assistant, /Voice dictation: coming soon/);
});

test('standalone voice concierge keeps the mic behind the flag and displays Coming soon when off', () => {
  assert.match(voiceConcierge, /useSpeechRecognition\(/);
  assert.match(voiceConcierge, /\{VOICE_DICTATION_ENABLED && speech\.supported && \(\s*<button type="button" data-testid="voice-concierge-mic"/);
  assert.match(voiceConcierge, /\{!VOICE_DICTATION_ENABLED && <p data-testid="voice-concierge-coming-soon"/);
  assert.match(voiceConcierge, /Voice dictation: coming soon/);
});

test('retired /conserje prototype route redirects without loading the prototype page', () => {
  assert.match(app, /path="\/conserje"/);
  assert.match(app, /lazy\(\(\) => import\('\.\/pages\/VoiceConciergePage'\)/);
});
