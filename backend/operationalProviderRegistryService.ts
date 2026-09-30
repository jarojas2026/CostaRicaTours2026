import { getFirestoreDb } from './bookingService';

export type OperationalProvider = {
  id: string;
  name: string;
  verified: true;
  active: true;
  sourceCollection: 'operators' | 'proveedores';
  region?: string;
  category?: string;
  contactName?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  officialEmail?: string;
  activeTours: string[];
  slaTargetMinutes?: number;
  operationalStatus?: string;
  cstLevel?: number;
  insPolicyNumber?: string;
  ictLicense?: string;
  updatedAt?: string;
};

const clean = (value: unknown, max = 400) => String(value ?? '').trim().slice(0, max);
const PROVIDER_LIMIT = Math.max(25, Math.min(1000, Number(process.env.OPERATIONAL_PROVIDER_READ_LIMIT || 250)));
const ORDER_LIMIT = Math.max(25, Math.min(1000, Number(process.env.OPERATIONAL_ORDER_READ_LIMIT || 250)));

function listStrings(value: unknown) {
  return Array.isArray(value) ? value.map(v => clean(v, 160)).filter(Boolean) : [];
}

function normalizeProvider(id: string, data: Record<string, any>, sourceCollection: OperationalProvider['sourceCollection']): OperationalProvider | null {
  const verified = data.verified === true || data.verificado === true;
  const active = (data.active === true || data.activo === true) && String(data.status || data.estado || '').toLowerCase() !== 'inactivo';
  if (!verified || !active) return null;

  return {
    id,
    name: clean(data.name || data.nombre || id, 240),
    verified: true,
    active: true,
    sourceCollection,
    region: clean(data.region || data.zona, 160) || undefined,
    category: clean(data.category || data.categoria, 120) || undefined,
    contactName: clean(data.contactName || data.contacto, 180) || undefined,
    phone: clean(data.phone || data.telefono, 80) || undefined,
    whatsapp: clean(data.whatsapp, 80) || undefined,
    email: clean(data.email, 240) || undefined,
    officialEmail: clean(data.officialEmail || data.emailOperativo, 240) || undefined,
    activeTours: listStrings(data.activeTours || data.tours),
    slaTargetMinutes: Number.isFinite(Number(data.slaTargetMinutes)) ? Number(data.slaTargetMinutes) : undefined,
    operationalStatus: clean(data.status || data.estado || 'active', 80) || 'active',
    cstLevel: Number.isFinite(Number(data.cstLevel)) ? Number(data.cstLevel) : undefined,
    insPolicyNumber: clean(data.insPolicyNumber, 160) || undefined,
    ictLicense: clean(data.ictLicense, 160) || undefined,
    updatedAt: clean(data.updatedAt || data.updated_at, 80) || undefined
  };
}

async function readProviderCollection(collectionName: OperationalProvider['sourceCollection']) {
  const db = getFirestoreDb();
  if (!db) return [] as any[];
  try {
    const canonical = collectionName === 'operators'
      ? db.collection(collectionName).where('verified', '==', true).where('active', '==', true).limit(PROVIDER_LIMIT)
      : db.collection(collectionName).where('verificado', '==', true).where('activo', '==', true).limit(PROVIDER_LIMIT);
    const snap = await canonical.get();
    return snap.docs || [];
  } catch {
    // Backward-compatible fallback for records that still use mixed field names.
    const snap = await db.collection(collectionName).limit(PROVIDER_LIMIT).get().catch(() => null);
    return snap?.docs || [];
  }
}

async function readRecentServiceOrders() {
  const db = getFirestoreDb();
  if (!db) return [] as any[];
  try {
    const snap = await db.collection('service_orders').orderBy('dispatchedAt', 'desc').limit(ORDER_LIMIT).get();
    return (snap.docs || []).map((doc: any) => ({ id: doc.id, ...(doc.data() || {}) }));
  } catch {
    const snap = await db.collection('service_orders').limit(ORDER_LIMIT).get().catch(() => null);
    return (snap?.docs || []).map((doc: any) => ({ id: doc.id, ...(doc.data() || {}) }))
      .sort((a: any, b: any) => Date.parse(String(b.dispatchedAt || b.updatedAt || '')) - Date.parse(String(a.dispatchedAt || a.updatedAt || '')));
  }
}

export async function listVerifiedOperationalProviders(): Promise<OperationalProvider[]> {
  const db = getFirestoreDb();
  if (!db) return [];

  const byId = new Map<string, OperationalProvider>();
  for (const collectionName of ['operators', 'proveedores'] as const) {
    const docs = await readProviderCollection(collectionName);
    for (const doc of docs) {
      const provider = normalizeProvider(doc.id, doc.data() || {}, collectionName);
      if (!provider) continue;
      // Prefer the canonical operators collection when an ID exists in both.
      if (!byId.has(provider.id) || collectionName === 'operators') byId.set(provider.id, provider);
    }
  }
  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export async function getOperationalProviderOverview() {
  const [providers, orders] = await Promise.all([
    listVerifiedOperationalProviders(),
    readRecentServiceOrders()
  ]);
  const providerIds = new Set(providers.map(provider => provider.id));
  const operationalOrders = orders.filter((order: any) => providerIds.has(String(order.providerId || '')));

  return {
    sourceOfTruth: 'firestore_verified_providers_and_service_orders',
    observedAt: new Date().toISOString(),
    totalProviders: providers.length,
    activeProviders: providers.length,
    providers: providers.map(provider => {
      const providerOrders = operationalOrders.filter((order: any) => String(order.providerId) === provider.id);
      const completed = providerOrders.filter((order: any) => order.status === 'completed');
      const accepted = providerOrders.filter((order: any) => ['confirmed', 'in_progress', 'completed'].includes(String(order.status)));
      const responseSamples = providerOrders
        .map((order: any) => {
          const dispatched = Date.parse(String(order.dispatchedAt || ''));
          const responded = Date.parse(String(order.confirmedAt || order.rejectedAt || order.updatedAt || ''));
          return Number.isFinite(dispatched) && Number.isFinite(responded) && responded >= dispatched ? (responded - dispatched) / 60_000 : null;
        })
        .filter((value): value is number => value !== null && Number.isFinite(value));
      return {
        ...provider,
        totalOrdersAssigned: providerOrders.length,
        activeOrdersCount: providerOrders.filter((order: any) => ['dispatched', 'confirmed', 'in_progress'].includes(String(order.status))).length,
        observedAcceptanceRate: providerOrders.length ? Math.round((accepted.length / providerOrders.length) * 1000) / 10 : null,
        averageResponseMinutes: responseSamples.length ? Math.round((responseSamples.reduce((sum: number, value: number) => sum + value, 0) / responseSamples.length) * 10) / 10 : null,
        completedOrdersCount: completed.length
      };
    }),
    recentServiceOrders: operationalOrders.slice(0, 25),
    activeOrdersCount: operationalOrders.filter((order: any) => ['dispatched', 'confirmed', 'in_progress'].includes(String(order.status))).length,
    legacyDirectoryExcluded: true,
    readWindow: { providersPerCollection: PROVIDER_LIMIT, serviceOrders: ORDER_LIMIT }
  };
}
