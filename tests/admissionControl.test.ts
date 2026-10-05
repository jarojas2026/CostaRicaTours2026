import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import test from 'node:test';
import type { Request, Response } from 'express';
import { createInFlightLimiter } from '../backend/admissionControl';

test('admission rejects overflow and releases each response exactly once', () => {
  const limiter = createInFlightLimiter(2, 3);
  function request() {
    let admitted = false;
    const response = Object.assign(new EventEmitter(), {
      statusCode: 200,
      headers: {} as Record<string, string>,
      body: null as any,
      setHeader(name: string, value: string) { this.headers[name] = value; },
      status(code: number) { this.statusCode = code; return this; },
      json(body: unknown) { this.body = body; return this; },
    });
    limiter.middleware({} as Request, response as unknown as Response, () => { admitted = true; });
    return { response, admitted };
  }
  const first = request();
  const second = request();
  assert.equal(first.admitted && second.admitted, true);
  for (let i = 0; i < 100; i++) {
    const rejected = request();
    assert.equal(rejected.admitted, false);
    assert.equal(rejected.response.statusCode, 503);
    assert.equal(rejected.response.headers['Retry-After'], '3');
    assert.equal(rejected.response.body.code, 'ADMISSION_CONTROL_BUSY');
  }
  assert.equal(limiter.getInFlightCount(), 2);
  first.response.emit('finish');
  first.response.emit('close');
  assert.equal(limiter.getInFlightCount(), 1);
  const replacement = request();
  assert.equal(replacement.admitted, true);
  second.response.emit('close');
  second.response.emit('finish');
  replacement.response.emit('finish');
  assert.equal(limiter.getInFlightCount(), 0);
});

test('invalid admission configuration cannot silently disable protection', () => {
  for (const value of [NaN, Infinity, 0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => createInFlightLimiter(value), RangeError);
    assert.throws(() => createInFlightLimiter(2, value), RangeError);
  }
});
