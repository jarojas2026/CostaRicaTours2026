import { getFirestoreDb } from './bookingService';
import { getProvidersOverview } from './providerCommunicationService';

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

export async function listVerifiedOperationalProviders(): Promise<OperationalProvider[]> {
  const db = getFirestoreDb();
  if (!db) return [];

  const byId = new Map<string, OperationalProvider>();
  for (const collectionName of ['operators', 'proveedores'] as const) {
    const snap = await db.collection(collectionName).get().catch(() => null);
    if (!snap) continue;
    for (const doc of snap.docs || []) {
      const provider = normalizeProvider(doc.id, doc.data() || {}, collectionName);
      if (!provider) continue;
      // Prefer the canonical operators collection when an ID exists in both.
      if (!byId.has(provider.id) || collectionName === 'operators') byId.set(provider.id, provider);
    }
  }
  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export async function getOperationalProviderOverview() {
  const providers = await listVerifiedOperationalProviders();
  // Service-order state is real runtime state; legacy provider metadata is deliberately discarded.
  const orderOverview = getProvidersOverview();
  const orders = Array.isArray(orderOverview.recentServiceOrders) ? orderOverview.recentServiceOrders : [];
  const providerIds = new Set(providers.map(provider => provider.id));
  const operationalOrders = orders.filter((order: any) => providerIds.has(String(order.providerId || '')));

  return {
    sourceOfTruth: 'firestore_verified_providers',
    observedAt: new Date().toISOString(),
    totalProviders: providers.length,
    activeProviders: providers.length,
    providers: providers.map(provider => {
      const providerOrders = operationalOrders.filter((order: any) => String(order.providerId) === provider.id);
      const completed = providerOrders.filter((order: any) => order.status === 'completed');
      const confirmed = providerOrders.filter((order: any) => ['confirmed', 'in_progress', 'completed'].includes(String(order.status)));
      return {
        ...provider,
        totalOrdersAssigned: providerOrders.length,
        activeOrdersCount: providerOrders.filter((order: any) => ['dispatched', 'confirmed', 'in_progress'].includes(String(order.status))).length,
        observedAcceptanceRate: providerOrders.length ? Math.round((confirmed.length / providerOrders.length) * 1000) / 10 : null,
        completedOrdersCount: completed.length
      };
    }),
    recentServiceOrders: operationalOrders.slice(0, 25),
    activeOrdersCount: operationalOrders.filter((order: any) => ['dispatched', 'confirmed', 'in_progress'].includes(String(order.status))).length,
    legacyDirectoryExcluded: true
  };
}
