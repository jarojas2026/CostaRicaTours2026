import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { validateOperatorProspects } from '../src/data/operators/operatorProspects.ts';

const data = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'src', 'data', 'operators', 'operatorProspects.json'), 'utf8'));

test('operator prospects dataset is valid and fully sourced', () => {
  assert.deepEqual(validateOperatorProspects(data), []);
  assert.ok(data.operators.length >= 40, 'expected the regional prospect list');
});

test('no operator is presented as verified or contracted without evidence', () => {
  for (const op of data.operators) {
    if (op.verification === 'verificado_ict' || op.partnershipStatus === 'acuerdo_firmado') {
      assert.ok(op.notes && /declaratoria|contrato|acuerdo/i.test(op.notes), `${op.id} needs evidence notes before being marked verified/contracted`);
    }
  }
});

test('validator rejects malformed data', () => {
  assert.notDeepEqual(validateOperatorProspects({ operators: [{ id: 'X Y' }], catalogMatches: [] }), []);
});
