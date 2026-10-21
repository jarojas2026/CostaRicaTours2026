import { getAllBookings, getWeeklyConversionMetrics, getFirestoreDb } from './bookingService';
import { getAlerts } from './alertService';
import { getOperationalProviderOverview } from './operationalProviderRegistryService';
import { getNativeEngineStatus, getNativeAutomationLogs } from './nativeAutomationEngine';
import { getSelfDevelopmentOverview } from './selfDevelopmentEngine';
import { buildAgentRegistrySeed, listRegisteredAgents } from './agentRegistryService';
import { listSkillVersions } from './skillGenome';
import { getEmailOperationsSnapshot } from './emailOperationsAgent';
import { projectAgentOffice } from './agentOfficeProjection';
import { getAiCallStats, getBreakerStates } from './aiRouter';
import { LEAD_STATUSES, OPEN_STATUSES, STALE_AFTER_MS, isActionableLead, isLeadStatus, leadTriageOf, listLeads, type LeadRecord, type LeadStatus } from './leadPipeline';
const money=(v:any)=>Number.isFinite(Number(v))?Math.round(Number(v)*100)/100:0;
export async function getAdminControlCenterSnapshot(){
 const leadsSection=await getLeadsEvidence();
 const aiSection=getAiEvidence();
 const [bookings,alerts,conversion,selfDevelopment,providers]=await Promise.all([getAllBookings(),getAlerts({resolved:false}),getWeeklyConversionMetrics().catch(()=>null),getSelfDevelopmentOverview().catch(()=>null),getOperationalProviderOverview().catch(()=>({sourceOfTruth:'unavailable',totalProviders:0,activeProviders:0,activeOrdersCount:0,providers:[],recentServiceOrders:[],legacyDirectoryExcluded:true}))]);
 const now=Date.now();
 const confirmed=bookings.filter((b:any)=>['confirmada','confirmed','completada','completed'].includes(String(b.status||'').toLowerCase()));
 const pending=bookings.filter((b:any)=>['pending','pendiente','pendiente_pago','hold'].includes(String(b.status||b.paymentStatus||'').toLowerCase()));
 const failed=bookings.filter((b:any)=>['rejected','rechazada','cancelled','cancelada','error'].includes(String(b.status||'').toLowerCase()));
 const upcoming=bookings.filter((b:any)=>{const t=new Date(String(b.date||'')+'T'+String(b.time||'00:00:00')).getTime();return Number.isFinite(t)&&t>=now&&t<=now+72*60*60*1000;});
 const revenue=confirmed.reduce((s:number,b:any)=>s+money(b.totalUSD),0),db=getFirestoreDb();let journeys:any[]=[],inbox:any[]=[],evaluations:any[]=[],memories:any[]=[];
 if(db){const [j,i,e,m]=await Promise.all([db.collection('traveler_journeys').orderBy('updatedAt','desc').limit(100).get().catch(()=>({docs:[]} as any)),db.collection('provider_inbox_events').orderBy('processedAt','desc').limit(30).get().catch(()=>({docs:[]} as any)),db.collection('ai_evaluations').orderBy('createdAt','desc').limit(30).get().catch(()=>({docs:[]} as any)),db.collection('agent_memory').limit(100).get().catch(()=>({docs:[]} as any))]);journeys=j.docs||[];inbox=i.docs||[];evaluations=e.docs||[];memories=m.docs||[];}
 const journeyData=journeys.map((d:any)=>({id:d.id,...d.data()})),pipeline={discovery:0,verification:0,readyToQuote:0,recovery:0,total:journeyData.length};
 journeyData.forEach((j:any)=>{const s=String(j.sales?.stage||j.status||'').toUpperCase();if(s==='DISCOVERY'||s==='PLANNING')pipeline.discovery++;else if(s==='VERIFICATION'||s==='VERIFICATION_COMPLETE')pipeline.verification++;else if(s==='READY_TO_QUOTE')pipeline.readyToQuote++;else if(s==='RECOVERY')pipeline.recovery++;});
 const providerList=((providers as any).providers||[]).slice(0,30).map((p:any)=>({id:p.id,name:p.name,region:p.region,status:p.operationalStatus||'active',verified:p.verified===true,sourceCollection:p.sourceCollection,contactName:p.contactName,phone:p.phone,whatsapp:p.whatsapp,email:p.email,officialEmail:p.officialEmail,activeTours:p.activeTours||[],activeOrdersCount:p.activeOrdersCount,slaTargetMinutes:p.slaTargetMinutes,averageResponseMinutes:p.averageResponseMinutes,observedAcceptanceRate:p.observedAcceptanceRate,completedOrdersCount:p.completedOrdersCount,cstLevel:p.cstLevel,ictLicense:p.ictLicense,insPolicyNumber:p.insPolicyNumber}));
 // Agent status comes from the dedicated registry heartbeat, not from generic
 // event activity. Events are sampled only to expose the latest event type.
 let registryAgents = await listRegisteredAgents().catch(() => []);
 const registryPersisted = registryAgents.length > 0;
 if (!registryPersisted) registryAgents = buildAgentRegistrySeed(new Date());

 let officeEvents: any[] = [];
 if (db) {
  try {
   const officeSample = await db.collection('agent_events').orderBy('createdAt', 'desc').limit(120).get();
   officeEvents = officeSample.docs.map((doc: any) => doc.data());
  } catch {
   console.warn('Agent office event sample unavailable; heartbeat status remains authoritative.');
  }
 }
 const agentOffice = projectAgentOffice(registryAgents, officeEvents, new Date().toISOString(), registryPersisted);
 const adminAgents = registryAgents.map((agent:any)=>({
  id:agent.id,
  mission:agent.mission?.es||agent.mission||'',
  missionEn:agent.mission?.en||'',
  office:agent.office||null,
  status:agent.status||'no_signal',
  capabilities:agent.permissions?.read||[],
  writableDomains:agent.permissions?.write||[],
  escalation:agent.permissions?.escalation||[],
  autonomyLevel:Number.isInteger(agent.autonomyLevel)?agent.autonomyLevel:null
 }));
 return{generatedAt:new Date().toISOString(),leads:leadsSection,ai:aiSection,agentOffice,business:{totalBookings:bookings.length,confirmedBookings:confirmed.length,pendingBookings:pending.length,failedOrCancelled:failed.length,upcoming72h:upcoming.length,// Deprecated field stays null: a confirmed booking is not evidence of cash collection.
    revenueUSD:null,confirmedBookingValueUSD:revenue,
    financialEvidence:{
      bookingValueSource:'getAllBookings',
      bookingValueCoverage:'not_certified',
      verifiedCollectionsUSD:null,
      collectionsState:'unavailable',
      note:'Confirmed booking value does not represent paid or reconciled cash.'
    },averageBookingUSD:confirmed.length?money(revenue/confirmed.length):0},conversion,alerts:{unresolved:alerts.length,critical:alerts.filter((a:any)=>a.severity==='critical').length,warning:alerts.filter((a:any)=>a.severity==='warning').length,recent:alerts.slice(0,20)},agents:adminAgents,automation:{engine:getNativeEngineStatus(),recentLogs:getNativeAutomationLogs(50),providerInbox:{mode:'Gmail OAuth + native cron every minute',configured:Boolean(process.env.GMAIL_CLIENT_ID&&process.env.GMAIL_CLIENT_SECRET&&process.env.GMAIL_REFRESH_TOKEN)},emailOperations:await getEmailOperationsSnapshot(20)},providers:{sourceOfTruth:(providers as any).sourceOfTruth||'firestore_verified_providers',legacyDirectoryExcluded:true,observedAt:(providers as any).observedAt||new Date().toISOString(),total:(providers as any).totalProviders||0,active:(providers as any).activeProviders||0,activeOrders:(providers as any).activeOrdersCount||0,list:providerList,recentServiceOrders:((providers as any).recentServiceOrders||[]).slice(0,25)},evolution:{selfDevelopment:selfDevelopment||{enabled:false},skills:listSkillVersions().map((s:any)=>({id:s.id,version:s.version,lifecycle:s.lifecycle,exposure:s.exposure,routingScore:s.routingScore})),recentEvaluations:evaluations.map((d:any)=>({id:d.id,...d.data()})).slice(0,20)},documents:{journeys:journeys.length,inboxEvents:inbox.length,evaluations:evaluations.length,memories:memories.length},journeyPipeline:pipeline,journeyRecent:journeyData.slice(0,20).map((j:any)=>({id:j.journeyId||j.id,updatedAt:j.updatedAt,stage:j.sales?.stage||j.status||'unknown',nextAction:j.sales?.nextAction||'',travelers:j.traveler?.travelers||0,profile:j.traveler?.profile||'',regions:j.planning?.regions||[]})),providerInbox:inbox.map((d:any)=>({id:d.id,...d.data()})).slice(0,30)};
}
// ---------------------------------------------------------------------------
// Sección "leads": agregados calculados en servidor (ventana 90 días).
// Reglas: sin cifras inventadas (null + state 'unavailable'), sin PII (solo
// conteos, ids de tour y códigos de región/idioma/origen), sin índices
// compuestos (un único rango por createdAt).
// ---------------------------------------------------------------------------

export type EvidenceState = 'measured' | 'partial' | 'unavailable';
export interface EvidenceEnvelope<T> { value: T | null; state: EvidenceState; source: string; observedAt: string; note?: string }

export const LEADS_WINDOW_DAYS = 90;
export const LEADS_MAX_DOCS = 5000;
const DAY_MS = 24 * 60 * 60 * 1000;
const CR_OFFSET_MS = -6 * 60 * 60 * 1000; // Costa Rica: UTC-6 todo el año.
const QUOTED_OR_LATER: readonly LeadStatus[] = ['cotizando', 'esperando_operador', 'confirmado_por_escrito', 'pagado'];
const CONFIRMED_LEAD: readonly LeadStatus[] = ['confirmado_por_escrito', 'pagado'];
type LeadCount = { key: string; label?: string; count: number };

/** Fecha calendario de Costa Rica (YYYY-MM-DD). */
export function crDay(ms: number): string { return new Date(ms + CR_OFFSET_MS).toISOString().slice(0, 10); }

function leadPercentile(sorted: number[], p: number): number | null {
  if (!sorted.length) return null;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil(p * sorted.length) - 1));
  return Math.round(sorted[idx] * 10) / 10;
}
function bumpCount(map: Map<string, LeadCount>, key: string, label?: string) {
  const c = map.get(key);
  if (c) c.count += 1; else map.set(key, { key, ...(label ? { label: String(label).slice(0, 80) } : {}), count: 1 });
}
const topCounts = (map: Map<string, LeadCount>, n: number) => Array.from(map.values()).sort((a, b) => b.count - a.count || a.key.localeCompare(b.key)).slice(0, n);

/** Horas desde la creación hasta la primera transición hecha por una persona (no `system*`). */
export function firstResponseHours(lead: LeadRecord): number | null {
  const created = Date.parse(lead.createdAt);
  if (!Number.isFinite(created)) return null;
  const human = (lead.statusHistory || []).find(ch => ch.from !== null && !String(ch.by || '').startsWith('system'));
  if (!human) return null;
  const at = Date.parse(human.at);
  return Number.isFinite(at) && at >= created ? (at - created) / 3_600_000 : null;
}

/** Agregados puros (testeables sin Firestore). KPIs sobre leads accionables; triaje aparte. */
export function computeLeadMetrics(all: readonly LeadRecord[], now: Date = new Date()) {
  const nowMs = now.getTime();
  const leads = all.filter(l => l && l.status && l.createdAt).map(l => ({ ...l, triage: l.triage || leadTriageOf(l) }));
  const actionable = leads.filter(isActionableLead);
  const today = crDay(nowMs);
  const perDayMap = new Map<string, number>();
  for (let i = 29; i >= 0; i--) perDayMap.set(crDay(nowMs - i * DAY_MS), 0);
  const heat = Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => 0));
  const byTour = new Map<string, LeadCount>(), byRegion = new Map<string, LeadCount>(), byLanguage = new Map<string, LeadCount>(), bySource = new Map<string, LeadCount>();
  const current = Object.fromEntries(LEAD_STATUSES.map(s => [s, 0])) as Record<LeadStatus, number>;
  const reachedCount = Object.fromEntries(LEAD_STATUSES.map(s => [s, 0])) as Record<LeadStatus, number>;
  const hours: number[] = [];
  let kToday = 0, k7 = 0, k30 = 0, quoted = 0, confirmed = 0, stale = 0, withConsent = 0, openNoResponse = 0;
  for (const lead of actionable) {
    const created = Date.parse(lead.createdAt);
    if (!Number.isFinite(created)) continue;
    const age = nowMs - created, day = crDay(created);
    if (day === today) kToday++;
    if (age <= 7 * DAY_MS) k7++;
    if (age <= 30 * DAY_MS) k30++;
    if (perDayMap.has(day)) perDayMap.set(day, (perDayMap.get(day) || 0) + 1);
    const local = new Date(created + CR_OFFSET_MS);
    heat[(local.getUTCDay() + 6) % 7][local.getUTCHours()] += 1;
    if (lead.request?.tourId) bumpCount(byTour, lead.request.tourId, lead.request.tourTitle);
    bumpCount(byRegion, lead.request?.region || 'sin_region', lead.request?.regionLabel);
    bumpCount(byLanguage, lead.language || 'desconocido');
    bumpCount(bySource, lead.firstSource || 'desconocido');
    if (isLeadStatus(lead.status)) current[lead.status]++;
    const reached = new Set<LeadStatus>();
    for (const ch of lead.statusHistory || []) if (isLeadStatus(ch.to)) reached.add(ch.to);
    if (isLeadStatus(lead.status)) reached.add(lead.status);
    for (const s of reached) reachedCount[s]++;
    if (QUOTED_OR_LATER.some(s => reached.has(s))) { quoted++; if (CONFIRMED_LEAD.some(s => reached.has(s))) confirmed++; }
    const h = firstResponseHours(lead);
    if (h !== null) hours.push(h); else if (OPEN_STATUSES.includes(lead.status)) openNoResponse++;
    if (OPEN_STATUSES.includes(lead.status) && nowMs - Date.parse(lead.lastActivityAt || lead.createdAt) > STALE_AFTER_MS) stale++;
    if (lead.consent?.dataProcessing === true) withConsent++;
  }
  hours.sort((a, b) => a - b);
  const triage: Record<string, number> = { activo: 0, spam: 0, duplicado: 0, descartado: 0 };
  for (const l of leads) { const st = l.triage?.state || 'activo'; triage[st] = (triage[st] || 0) + 1; }
  const has = actionable.length > 0;
  return {
    window: { days: LEADS_WINDOW_DAYS, timezone: 'America/Costa_Rica' },
    totals: { all: leads.length, actionable: actionable.length },
    kpis: { today: kToday, last7d: k7, last30d: k30 },
    perDay: Array.from(perDayMap, ([date, count]) => ({ date, count })),
    funnel: LEAD_STATUSES.map(status => ({ status, current: current[status], reached: reachedCount[status] })),
    byTour: topCounts(byTour, 10), byRegion: topCounts(byRegion, 12), byLanguage: topCounts(byLanguage, 8), bySource: topCounts(bySource, 8),
    byCountry: null, // el lead no captura país: dato inexistente, no cero
    firstResponse: { medianHours: leadPercentile(hours, 0.5), p90Hours: leadPercentile(hours, 0.9), responded: hours.length, openWithoutResponse: openNoResponse },
    conversion: { quoted, confirmed, rate: quoted ? Math.round((confirmed / quoted) * 1000) / 10 : null, definition: 'De los leads que llegaron a cotizando o más, % que llegó a confirmado_por_escrito o pagado.' },
    unanswered24h: stale,
    consent: { withConsent, rate: has ? Math.round((withConsent / actionable.length) * 1000) / 10 : null },
    heatmap: has ? { rows: 'lunes..domingo', cols: '0..23 h (CR)', values: heat } : null,
    triage,
  };
}
export type LeadMetrics = ReturnType<typeof computeLeadMetrics>;

/** Envuelve los agregados de leads en un sobre de evidencia; nunca lanza. */
export async function getLeadsEvidence(now: Date = new Date()): Promise<EvidenceEnvelope<LeadMetrics>> {
  const observedAt = now.toISOString();
  try {
    const db = getFirestoreDb();
    if (!db) {
      // Sin Firestore (dev/tests): almacén en memoria del pipeline, no es la verdad de producción.
      const leads = await listLeads({ limit: 500 });
      return { value: computeLeadMetrics(leads, now), state: 'partial', source: 'memory:leads', observedAt, note: 'Firestore no configurado: almacén en memoria de esta instancia.' };
    }
    const from = new Date(now.getTime() - LEADS_WINDOW_DAYS * DAY_MS).toISOString();
    const snap = await db.collection('leads').where('createdAt', '>=', from).limit(LEADS_MAX_DOCS).get();
    const leads = snap.docs.map((d: any) => ({ ...(d.data() as LeadRecord), id: d.id }));
    const truncated = snap.size >= LEADS_MAX_DOCS;
    return { value: computeLeadMetrics(leads, now), state: truncated ? 'partial' : 'measured', source: 'firestore:leads', observedAt, ...(truncated ? { note: `Muestra truncada a ${LEADS_MAX_DOCS} leads.` } : {}) };
  } catch (error: any) {
    console.warn('[control-center] leads no disponibles:', error?.message || error);
    return { value: null, state: 'unavailable', source: 'firestore:leads', observedAt, note: 'No se pudieron leer los leads.' };
  }
}

// ---------------------------------------------------------------------------
// Sección "ai": latencia p50/p95 y fallos por proveedor observados por aiRouter
// en ESTA instancia (memoria acotada, 24 h). Sin muestras → value con nulls y
// state 'unavailable'; nunca se inventa salud.
// ---------------------------------------------------------------------------
export type AiStats = ReturnType<typeof getAiCallStats> & { breakers: ReturnType<typeof getBreakerStates> };
export function getAiEvidence(now: Date = new Date()): EvidenceEnvelope<AiStats> {
  const observedAt = now.toISOString();
  try {
    const calls = getAiCallStats(now.getTime());
    const value = { ...calls, breakers: getBreakerStates(now.getTime()) };
    return {
      value,
      state: calls.total ? 'partial' : 'unavailable',
      source: 'aiRouter:instance_memory',
      observedAt,
      note: calls.total ? 'Solo esta instancia, últimas 24 h, máx. ' + calls.sampleLimit + ' llamadas; no persiste tras reinicios.' : 'Sin llamadas de IA observadas en esta instancia en 24 h.',
    };
  } catch {
    return { value: null, state: 'unavailable', source: 'aiRouter:instance_memory', observedAt, note: 'Estadística de IA no disponible.' };
  }
}
