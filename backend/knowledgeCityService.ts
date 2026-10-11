/**
 * Costa Rica Tours Knowledge City: a governed, read-through knowledge layer.
 * Sales and support keep their existing Firestore sources of truth. This module
 * never confirms inventory, payments, refunds, or reservations.
 */
import { randomUUID } from 'node:crypto';
import { getFirestoreDb } from './bookingService';

export type KnowledgeCategory = 'sales' | 'support' | 'logistics' | 'policies' | 'destinations' | 'operations';
export type KnowledgeStatus = 'draft' | 'published' | 'archived';
export type KnowledgeVisibility = 'public' | 'internal';
export type KnowledgeArticle = {
  id: string;
  category: KnowledgeCategory;
  visibility: KnowledgeVisibility;
  status: KnowledgeStatus;
  titleEs: string;
  titleEn: string;
  bodyEs: string;
  bodyEn: string;
  sourceUrl: string;
  sourceRef: string;
  verifiedAt: string;
  expiresAt: string;
  reviewedBy: string;
  createdAt: string;
  updatedAt: string;
  version: number;
};

const CATEGORIES: KnowledgeCategory[] = ['sales', 'support', 'logistics', 'policies', 'destinations', 'operations'];
const STATUS: KnowledgeStatus[] = ['draft', 'published', 'archived'];
const VISIBILITY: KnowledgeVisibility[] = ['public', 'internal'];
const ARTICLE_COLLECTION = 'knowledge_city_articles';
const MAX_SCAN = 200;
const clean = (value: unknown, max: number) => typeof value === 'string' ? value.trim().slice(0, max) : '';

export class KnowledgeValidationError extends Error {}

function requiredText(value: unknown, field: string, max: number) {
  const text = clean(value, max + 1);
  if (!text || text.length > max) throw new KnowledgeValidationError('Invalid field: ' + field);
  return text;
}

function validIso(value: unknown): string {
  const raw = clean(value, 40);
  if (!raw || !Number.isFinite(Date.parse(raw))) return '';
  return new Date(raw).toISOString();
}

export function validateKnowledgeArticle(input: Record<string, unknown>, actor: string, previous?: KnowledgeArticle, at = new Date()): KnowledgeArticle {
  const now = at.toISOString();
  const category = input.category ?? previous?.category;
  const visibility = input.visibility ?? previous?.visibility;
  const status = input.status ?? previous?.status ?? 'draft';
  if (!CATEGORIES.includes(category as KnowledgeCategory)) throw new KnowledgeValidationError('Invalid category');
  if (!VISIBILITY.includes(visibility as KnowledgeVisibility)) throw new KnowledgeValidationError('Invalid visibility');
  if (!STATUS.includes(status as KnowledgeStatus)) throw new KnowledgeValidationError('Invalid status');
  const titleEs = requiredText(input.titleEs ?? previous?.titleEs, 'titleEs', 160);
  const titleEn = requiredText(input.titleEn ?? previous?.titleEn, 'titleEn', 160);
  const bodyEs = requiredText(input.bodyEs ?? previous?.bodyEs, 'bodyEs', 3000);
  const bodyEn = requiredText(input.bodyEn ?? previous?.bodyEn, 'bodyEn', 3000);
  const sourceUrl = clean(input.sourceUrl ?? previous?.sourceUrl, 600);
  const sourceRef = clean(input.sourceRef ?? previous?.sourceRef, 200);
  if (sourceUrl && (!/^https:\/\/[^ \n\r]+$/i.test(sourceUrl) || sourceUrl.includes('@'))) {
    throw new KnowledgeValidationError('Only public HTTPS source URLs are allowed');
  }
  if (sourceRef && !/^(catalog|policy|provider|ict|sinac):[a-z0-9_./:-]{2,150}$/i.test(sourceRef)) {
    throw new KnowledgeValidationError('Invalid evidence reference');
  }
  const verifiedAt = validIso(input.verifiedAt ?? previous?.verifiedAt);
  const expiresAt = validIso(input.expiresAt ?? previous?.expiresAt);
  const editor = requiredText(actor, 'reviewer', 200);

  if (status === 'published') {
    const checked = Date.parse(verifiedAt);
    const expiry = Date.parse(expiresAt);
    if (!sourceUrl && !sourceRef) throw new KnowledgeValidationError('Publishing requires an evidence source');
    if (!Number.isFinite(checked) || checked > at.getTime() || at.getTime() - checked > 180 * 86400000) {
      throw new KnowledgeValidationError('Publishing requires a recent verification');
    }
    if (!Number.isFinite(expiry) || expiry <= at.getTime() || expiry - at.getTime() > 365 * 86400000) {
      throw new KnowledgeValidationError('Publishing requires a valid expiry within one year');
    }
  }
  // ReviewedBy is set from the authenticated administrator; never the request body.
  return {
    id: previous?.id ?? 'kn_' + randomUUID().replace(/-/g, ''),
    category: category as KnowledgeCategory,
    visibility: visibility as KnowledgeVisibility,
    status: status as KnowledgeStatus,
    titleEs, titleEn, bodyEs, bodyEn, sourceUrl, sourceRef, verifiedAt, expiresAt,
    reviewedBy: editor,
    createdAt: previous?.createdAt ?? now,
    updatedAt: now,
    version: (previous?.version ?? 0) + 1
  };
}

export function isKnowledgeEligible(article: KnowledgeArticle, audience: KnowledgeVisibility, at = new Date()): boolean {
  return article.status === 'published'
    && (audience === 'internal' || article.visibility === 'public')
    && Boolean(article.sourceUrl || article.sourceRef)
    && Boolean(article.reviewedBy)
    && Number.isFinite(Date.parse(article.verifiedAt))
    && Date.parse(article.verifiedAt) <= at.getTime()
    && at.getTime() - Date.parse(article.verifiedAt) <= 180 * 86400000
    && Number.isFinite(Date.parse(article.expiresAt))
    && Date.parse(article.expiresAt) > at.getTime();
}

const tokens = (value: string) => (value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').match(/[a-z0-9]{3,}/g) || [])
  .filter(word => !['para','como','este','esta','with','from','what','have','sobre','tour','tours','costa','rica'].includes(word));

export function rankKnowledgeArticles(articles: KnowledgeArticle[], query: string, language: 'es' | 'en', audience: KnowledgeVisibility = 'public', at = new Date()) {
  const terms = [...new Set(tokens(query).slice(0, 20))];
  if (terms.length === 0) return [];
  return articles
    .filter(article => isKnowledgeEligible(article, audience, at))
    .map(article => {
      const title = tokens(language === 'en' ? article.titleEn : article.titleEs);
      const body = tokens(language === 'en' ? article.bodyEn : article.bodyEs);
      const score = terms.reduce((value, term) => value + (title.includes(term) ? 5 : 0) + (body.includes(term) ? 1 : 0), 0);
      return { article, score };
    })
    .filter(hit => hit.score > 0)
    .sort((a, b) => b.score - a.score || a.article.id.localeCompare(b.article.id))
    .slice(0, 4)
    .map(hit => hit.article);
}

function requireDb() {
  const db = getFirestoreDb();
  if (!db) throw new Error('Knowledge Firestore storage unavailable');
  return db;
}

export async function listKnowledgeArticles() {
  const snap = await requireDb().collection(ARTICLE_COLLECTION).limit(MAX_SCAN).get();
  return snap.docs.map(doc => doc.data() as KnowledgeArticle);
}

export async function searchPublishedKnowledge(query: string, language: 'es' | 'en' = 'es') {
  const found = await listKnowledgeArticles();
  return rankKnowledgeArticles(found, clean(query, 300), language, 'public');
}

export async function saveKnowledgeArticle(input: Record<string, unknown>, actor: string, id?: string) {
  const db = requireDb();
  if (id && !/^kn_[a-f0-9]{32}$/.test(id)) throw new KnowledgeValidationError('Invalid article ID');
  const ref = id ? db.collection(ARTICLE_COLLECTION).doc(id) : db.collection(ARTICLE_COLLECTION).doc();
  // Only an administrator can write through the protected API; the transaction
  // also prevents racing edits from overwriting one another silently.
  return db.runTransaction(async transaction => {
    const snapshot = id ? await transaction.get(ref) : null;
    if (id && !snapshot?.exists) throw new KnowledgeValidationError('Article not found');
    const previous = snapshot?.exists ? snapshot.data() as KnowledgeArticle : undefined;
    const expectedVersion = input.expectedVersion;
    if (previous && (!Number.isSafeInteger(expectedVersion) || expectedVersion !== previous.version)) {
      throw new KnowledgeValidationError('Stale article version; reload before editing');
    }
    const next = validateKnowledgeArticle(input, actor, previous);
    transaction.set(db.collection(ARTICLE_COLLECTION).doc(next.id), next);
    return next;
  });
}

export async function getKnowledgeCityOverview() {
  const db = requireDb();
  const sources = await Promise.allSettled([
    db.collection(ARTICLE_COLLECTION).limit(MAX_SCAN).get(),
    db.collection('bookings').orderBy('createdAt', 'desc').limit(100).get(),
    db.collection('organizational_flow_events').orderBy('createdAt', 'desc').limit(100).get()
  ]);
  const docs = (i: number): Record<string, any>[] => {
    const source = sources[i];
    return source?.status === 'fulfilled' ? source.value.docs.map(doc => doc.data()) : [];
  };
  const articles = docs(0) as KnowledgeArticle[];
  const bookings = docs(1);
  const events = docs(2);
  const current = new Date();
  return {
    generatedAt: current.toISOString(),
    synchronization: {
      mode: 'read_through',
      sales: sources[1].status === 'fulfilled' ? 'connected' : 'unavailable',
      support: sources[2].status === 'fulfilled' ? 'connected' : 'unavailable',
      knowledge: sources[0].status === 'fulfilled' ? 'connected' : 'unavailable',
      maxRowsPerSource: 100
    },
    knowledge: {
      totalSampled: articles.length,
      published: articles.filter(x => isKnowledgeEligible(x, 'internal', current)).length,
      expired: articles.filter(x => x.status === 'published' && !isKnowledgeEligible(x, 'internal', current)).length,
      drafts: articles.filter(x => x.status === 'draft').length
    },
    sales: {
      sampledBookings: bookings.length,
      awaitingAction: bookings.filter(x => /pending|pendiente|hold|provider_pending/i.test(String(x.status || ''))).length,
      confirmed: bookings.filter(x => /^(confirmed|confirmada|completed|completada)$/i.test(String(x.status || ''))).length
    },
    support: {
      sampledEvents: events.length,
      pendingReview: events.filter(x => /pending|escalat|human|review/i.test(String(x.status || '') + ' ' + String(x.nextAction || ''))).length
    }
  };
}
