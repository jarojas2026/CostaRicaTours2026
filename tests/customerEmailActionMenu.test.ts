import test from 'node:test';
import assert from 'node:assert/strict';
import { customerEmailActionMenu, customerReviewAcknowledgement } from '../backend/customerEmailActionMenu';

for (const lang of ['es','en','en-US']) {
  test('email action menu is bilingual and non-committal: ' + lang, () => {
    const menu = customerEmailActionMenu(lang);
    for (const num of [1,2,3,4,5]) assert.match(menu, new RegExp(num + '\\.'));
    assert.ok(menu.length > 220);
    assert.doesNotMatch(menu, /https?:|@|OS-CR-|<script|providerId|refund approved|reembolso aprobado/);
    assert.match(menu, lang === 'es' ? /no confirma reserva/i : /does not confirm a booking/i);
    const ack = customerReviewAcknowledgement(lang);
    assert.match(ack, lang === 'es' ? /No se ha aplicado ningún cambio/i : /No requested booking change/i);
    assert.ok(ack.includes(menu));
  });
}
