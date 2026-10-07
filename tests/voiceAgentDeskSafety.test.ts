import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  buildVoiceCallStatusUpdate,
  buildVoiceTransferStatusUpdate,
  createHumanTransferResult,
  createInboundVoiceResponse,
  createVoiceRecoveryResponse,
  handleVoiceTurn,
  verifyVoiceSignature,
  voiceAgentDeskConfig
} from '../backend/voiceAgentDeskService';

function withEnv(values: Record<string, string | undefined>, run: () => void | Promise<void>) {
  const previous = Object.fromEntries(Object.keys(values).map(key => [key, process.env[key]]));
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  return Promise.resolve(run()).finally(() => {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });
}

test('voice provider callbacks require a valid timing-safe signature', async () => {
  await withEnv({ VOICE_PROVIDER_AUTH_TOKEN: 'test-provider-secret' }, () => {
    const url = 'https://example.test/api/voice/status?provider=twilio';
    const params = { CallStatus: 'in-progress', CallSid: 'CA123' };
    const signature = crypto.createHmac('sha1', 'test-provider-secret')
      .update(url + 'CallSidCA123CallStatusin-progress')
      .digest('base64');

    assert.equal(verifyVoiceSignature(url, params, signature), true);
    assert.equal(verifyVoiceSignature(url, { ...params, CallSid: 'CA456' }, signature), false);
    assert.equal(verifyVoiceSignature(url, params, undefined), false);
  });
});

test('active voice call status does not record an end time; terminal status does', () => {
  assert.deepEqual(buildVoiceCallStatusUpdate('in-progress', '2026-09-30T12:00:00.000Z'), {
    status: 'in-progress', updatedAt: '2026-09-30T12:00:00.000Z'
  });
  assert.deepEqual(buildVoiceCallStatusUpdate('completed', '2026-09-30T12:01:00.000Z'), {
    status: 'completed', updatedAt: '2026-09-30T12:01:00.000Z', endedAt: '2026-09-30T12:01:00.000Z'
  });
  assert.deepEqual(buildVoiceTransferStatusUpdate('no-answer', '2026-09-30T12:02:00.000Z'), {
    humanTransferStatus: 'no-answer', humanTransferUpdatedAt: '2026-09-30T12:02:00.000Z'
  });
});

test('Agent Desk supports multiple valid human numbers and does not announce unavailable handoff', async () => {
  await withEnv({ VOICE_AGENT_DESK_ENABLED: 'true', VOICE_HUMAN_NUMBERS: '+50688881234,+14155552671', VOICE_HUMAN_NUMBER: '' }, () => {
    assert.equal(voiceAgentDeskConfig().humanTransferConfigured, true);
    const twiml = createInboundVoiceResponse({ callId: 'CA1', responseUrl: 'https://example.test/respond', humanTransferAvailable: true });
    assert.match(twiml, /marque 0/i);
    assert.match(twiml, /<Gather[^>]*><Say[\s\S]*<\/Say><\/Gather>/);
    assert.doesNotMatch(twiml, /bargeIn=|después del tono/);
  });

  await withEnv({ VOICE_AGENT_DESK_ENABLED: 'true', VOICE_HUMAN_NUMBERS: '', VOICE_HUMAN_NUMBER: '' }, () => {
    const twiml = createInboundVoiceResponse({ callId: 'CA1', responseUrl: 'https://example.test/respond', humanTransferAvailable: false });
    assert.doesNotMatch(twiml, /press 0|marque 0/i);
  });
});

test('silence is bounded and unsupported DTMF does not enter the AI intent pipeline', async () => {
  await withEnv({ VOICE_AGENT_DESK_ENABLED: 'true', VOICE_HUMAN_NUMBERS: '', VOICE_HUMAN_NUMBER: '' }, async () => {
    const shared = { callId: 'CA1', responseUrl: 'https://example.test/api/voice/respond' };
    const retry = await handleVoiceTurn({ ...shared, silenceCount: 0 });
    assert.match(retry, /silenceCount=1/);
    const ended = await handleVoiceTurn({ ...shared, silenceCount: 2 });
    assert.match(ended, /<Hangup\/>/);
    const badDigit = await handleVoiceTurn({ ...shared, digits: '4' });
    assert.match(badDigit, /Diga lo que necesita/);
    assert.doesNotMatch(badDigit, /marque 0/);
    assert.doesNotMatch(badDigit, /DTMF request/);
  });
});

test('technical voice failures collect new input with bounded retries and no business replay', async () => {
  await withEnv({ VOICE_AGENT_DESK_ENABLED: 'true', VOICE_HUMAN_NUMBERS: '+50688881234', VOICE_HUMAN_NUMBER: '' }, async () => {
    const input = { responseUrl: 'https://example.test/api/voice/respond?language=es&hotelName=A%26B', language: 'es' as const };
    for (const recoveryCount of [0, 1]) {
      const result = createVoiceRecoveryResponse({ ...input, recoveryCount });
      assert.match(result, new RegExp(`recoveryCount=${recoveryCount + 1}`));
      assert.match(result, /<Gather input="speech dtmf"/);
      assert.match(result, /marque 0/i);
      assert.match(result, /No repita un pago/);
      assert.doesNotMatch(result, /<Redirect|<Dial|<Hangup/);
      assert.match(result, /&amp;/);
    }
    for (const recoveryCount of [2, 3, -1, NaN, Infinity, 0.5]) {
      const result = createVoiceRecoveryResponse({ ...input, recoveryCount });
      assert.match(result, /<Hangup\/>/);
      assert.doesNotMatch(result, /<Gather|<Redirect|<Dial/);
    }
    const handoff = await handleVoiceTurn({ callId: 'CA-test', digits: '0', responseUrl: input.responseUrl, humanTransferUrl: 'https://example.test/api/voice/human-transfer' });
    assert.match(handoff, /<Dial/);
  });
});

test('English recovery does not offer an unconfigured human line', async () => {
  await withEnv({ VOICE_HUMAN_NUMBERS: '', VOICE_HUMAN_NUMBER: '' }, () => {
    const result = createVoiceRecoveryResponse({ responseUrl: 'https://example.test/api/voice/respond?language=en', language: 'en' });
    assert.match(result, /language="en-US"/);
    assert.match(result, /Do not repeat a payment/);
    assert.match(result, /WhatsApp/);
    assert.doesNotMatch(result, /press 0|<Dial/i);
  });
});

test('signed inbound and speech route failures return actionable recovery TwiML', () => {
  const server = readFileSync(new URL('../server.ts', import.meta.url), 'utf8');
  for (const [route, end] of [['incoming', 'respond'], ['respond', 'human-transfer']]) {
    const handler = server.slice(server.indexOf(`app.post('/api/voice/${route}'`), server.indexOf(`app.post('/api/voice/${end}'`));
    assert.match(handler, /verifyVoiceSignature/);
    assert.match(handler, /status\(200\)\.type\('text\/xml'\)\.send\(createVoiceRecoveryResponse/);
    assert.match(handler, /recoveryCount: Number\(req.query\?\.recoveryCount/);
  }
});

test('failed human transfer returns the traveler to voice assistance; successful transfer ends cleanly', () => {
  const failed = createHumanTransferResult({ status: 'no-answer', responseUrl: 'https://example.test/api/voice/respond' });
  assert.match(failed, /No contestó un agente humano/);
  assert.match(failed, /<Gather/);
  const successful = createHumanTransferResult({ status: 'completed', responseUrl: 'https://example.test/api/voice/respond' });
  assert.match(successful, /<Response><\/Response>/);
});

test('human-transfer and call-status webhooks authenticate before updating call state', () => {
  const server = readFileSync(new URL('../server.ts', import.meta.url), 'utf8');
  const transfer = server.slice(server.indexOf("app.post('/api/voice/human-transfer'"), server.indexOf("app.get('/api/voice/calls/:callId'"));
  const status = server.slice(server.indexOf("app.post('/api/voice/status'"), server.indexOf("app.get('/api/weather/destinations'"));
  assert.match(transfer, /verifyVoiceSignature/);
  assert.match(transfer, /callback\.origin === publicOrigin && callback\.pathname === '\/api\/voice\/respond'/);
  assert.match(status, /verifyVoiceSignature/);
  assert.match(status, /rememberVoiceCallStatus/);
  assert.match(status, /rememberVoiceCallEnd/);
});
