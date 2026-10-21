import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// #326: los agentes y textos públicos no deben prometer un "voucher QR" que no está verificado.
const files = [
  '.agents/AGENTS.md',
  '.agents/skills/crear_reserva/SKILL.md',
  'backend/routes/agents.ts',
  'backend/aiAssistantService.ts',
  'src/data/aiAgentsData.ts',
  'src/components/CronDashboard.tsx',
];
const promise = /emisi[oó]n de voucher QR|voucher (digital )?(con )?(c[oó]digo )?QR|QR voucher|QR-Gutschein|QR-Voucher|voucher QR|QRバウチャー|QRコード入りバウチャー|bon QR/i;

test('#326 no prompt or public text promises a QR voucher', () => {
  for (const file of files) {
    const code = readFileSync(file, 'utf8')
      .split('\n')
      .filter(line => !/No emite voucher QR|nunca promete voucher QR|No prometas vouchers, códigos QR/.test(line))
      .join('\n');
    assert.doesNotMatch(code, promise, `${file} still promises a QR voucher`);
  }
});
