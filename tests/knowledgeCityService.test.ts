import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateKnowledgeArticle, isKnowledgeEligible, rankKnowledgeArticles,
  KnowledgeValidationError, type KnowledgeArticle
} from '../backend/knowledgeCityService';

const at = new Date('2026-10-11T12:00:00.000Z');
const input = {
  category: 'support', visibility: 'public', status: 'published',
  titleEs: 'Cambios y cancelaciones de excursiones', titleEn: 'Tour changes and cancellations',
  bodyEs: 'Las solicitudes de cancelación requieren revisión del equipo de soporte y la política particular.',
  bodyEn: 'Cancellation requests require support review and the applicable booking policy.',
  sourceRef: 'policy:customer-service', sourceUrl: '',
  verifiedAt: '2026-10-10T11:00:00Z', expiresAt: '2026-11-10T11:00:00Z'
};

function published(extra: Record<string, unknown> = {}) {
  return validateKnowledgeArticle({ ...input, ...extra }, 'admin@example.com', undefined, at);
}

test('published knowledge requires recent proof and a future expiry', () => {
  const article = published();
  assert.equal(article.status, 'published');
  assert.equal(article.reviewedBy, 'admin@example.com');
  assert.equal(article.version, 1);
  assert.equal(isKnowledgeEligible(article, 'public', at), true);
  assert.throws(() => published({ sourceRef: '', sourceUrl: '' }), KnowledgeValidationError);
  assert.throws(() => published({ expiresAt: '2026-10-10T12:00:00Z' }), KnowledgeValidationError);
  assert.throws(() => published({ verifiedAt: '2026-01-01T00:00:00Z' }), KnowledgeValidationError);
  assert.throws(() => published({ verifiedAt: '2026-12-01T00:00:00Z' }), KnowledgeValidationError);
  assert.throws(() => published({ sourceUrl: 'http://localhost/internal', sourceRef: '' }), KnowledgeValidationError);
  assert.throws(() => published({ sourceUrl: 'https://secret@example.com/path', sourceRef: '' }), KnowledgeValidationError);
});

test('drafts cannot be used as verified answers, even with a title match', () => {
  const draft = published({ status: 'draft', verifiedAt: '', expiresAt: '' });
  assert.equal(isKnowledgeEligible(draft, 'public', at), false);
  assert.deepEqual(rankKnowledgeArticles([draft], 'cancelaciones', 'es', 'public', at), []);
});

test('knowledge retrieval is bilingual, visibility-scoped and freshness-aware', () => {
  const publicArticle = published();
  const internalArticle = published({ visibility: 'internal', titleEs: 'Cancelaciones internas', titleEn: 'Internal cancellations' });
  const stale = published({ titleEs: 'Cancelaciones vencidas', titleEn: 'Expired cancellations', expiresAt: '2026-10-12T12:00:00Z' });
  const many = [publicArticle, internalArticle, stale];
  assert.deepEqual(rankKnowledgeArticles(many, 'cancellation', 'en', 'public', at).map(x => x.id).includes(internalArticle.id), false);
  assert.equal(rankKnowledgeArticles(many, 'cancelaciones', 'es', 'public', at).length, 2);
  assert.equal(rankKnowledgeArticles(many, 'cancelaciones', 'es', 'public', new Date('2026-10-13T00:00:00Z')).length, 1);
  assert.equal(rankKnowledgeArticles(many, 'cancelaciones', 'es', 'internal', at).length, 3);
});

test('published records carry versions and cannot silently promote invalid future content', () => {
  const existing = published();
  const next = validateKnowledgeArticle({ bodyEn: 'A revised response' }, 'reviewer@example.com', existing, at);
  assert.equal(next.id, existing.id);
  assert.equal(next.version, 2);
  assert.equal(next.reviewedBy, 'reviewer@example.com');
  assert.throws(() => validateKnowledgeArticle({ status: 'published', sourceRef: '', sourceUrl: '' }, 'reviewer@example.com', existing, at), KnowledgeValidationError);
});

test('unverified articles are not used for public guidance and empty searches return no matches', () => {
  const article = published();
  assert.deepEqual(rankKnowledgeArticles([article], '', 'es', 'public', at), []);
  assert.deepEqual(rankKnowledgeArticles([article], '!!!!!', 'es', 'public', at), []);
  assert.equal(isKnowledgeEligible({ ...article, reviewedBy: '' } as KnowledgeArticle, 'public', at), false);
});
