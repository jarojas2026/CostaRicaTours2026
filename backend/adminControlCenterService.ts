/**
 * Executive control center for the business owner.
 * Read-only operational aggregation: bookings, sales, finance, legal, agents,
 * automations, providers, failures, traveler documents and system evolution.
 */
import { getAllBookings, getWeeklyConversionMetrics, getFirestoreDb } from './bookingService';
import { getAlerts } from './alertService';
import { getProvidersOverview } from './providerCommunicationService';
import { getNativeEngineStatus, getNativeAutomationLogs } from './nativeAutomationEngine';
import { getSelfDevelopmentOverview } from './selfDevelopmentEngine';
import { AGENT_IDENTITIES } from './agentKnowledgeFabric';
import { listSkillVersions } from './skillGenome';
import { getFinancialLegalSnapshot } from './financialLegalControlService';

function money(value:any){const n=Number(value);return Number.isFinite(n)?Math.round(n*100)/100:0;}

export async function getAdminControlCenterSnapshot(){
  const [bookings,alerts,providers,conversion,selfDevelopment,financial]=await Promise.all([
    getAllBookings(),getAlerts({resolved:false}),Promise.resolve(getProvidersOverview()),
    getWeeklyConversionMetrics().catch(()=>null),getSelfDevelopmentOverview().catch(()=>null),
    getFinancialLegalSnapshot().catch(()=>null)
  ]);
  const now=Date.now();
  const upcoming=bookings.filter((b:any)=>{const d=new Date(String(b.date||'')+'T'+String(b.time||'00:00:00')).getTime();return Number.isFinite(d)&&d>=now&&d<=now+72*60*60*1000;});
  const confirmed=bookings.filter((b:any)=>['confirmada','confirmed','completada','completed'].includes(String(b.status||'').toLowerCase()));
  const pending=bookings.filter((b:any)=>['pending','pendiente','pendiente_pago','hold'].includes(String(b.status||b.paymentStatus||'').toLowerCase()));
  const failures=bookings.filter((b:any)=>['rechazada','rejected','cancelada','cancelled','error'].includes(String(b.status||'').toLowerCase()));
  const revenue=confirmed.reduce((sum:number,b:any)=>sum+money(b.totalUSD),0);
  const providerList:any[]=Array.isArray((providers as any)?.providers)?(providers as any).providers:(Array.isArray(providers)?providers as any[]);
  const db=getFirestoreDb();
  let documents={journeys:0,inboxEvents:0,evaluations:0,memories:0};let recentInbox:any[]=[];let recentEvaluations:any[]=[];
  if(db){
    const [journeys,inbox,evaluations,memories]=await Promise.all([
      db.collection('traveler_journeys').limit(200).get().catch(()=>({size:0} as any)),
      db.collection('provider_inbox_events').orderBy('processedAt','desc').limit(20).get().catch(()=>({size:0,docs:[]} as any)),
      db.collection('ai_evaluations').orderBy('createdAt','desc').limit(20).get().catch(()=>({size:0,docs:[]} as any)),
      db.collection('agent_memory').limit(200).get().catch(()=>({size:0} as any))
    ]);
    documents={journeys:journeys.size||0,inboxEvents:inbox.size||0,evaluations:evaluations.size||0,memories:memories.size||0};
    recentInbox=(inbox.docs||[]).map((d:any)=>({id:d.id,...d.data()}));
    recentEvaluations=(evaluations.docs||[]).map((d:any)=>({id:d.id,...d.data()}));
  }
  const recentBookings=bookings.slice().sort((a:any,b:any)=>String(b.createdAt||'').localeCompare(String(a.createdAt||''))).slice(0,25).map((b:any)=>({id:b.bookingId||b.id,customer:b.customer?.fullName||b.customerName||'—',email:b.customer?.email||b.email||'—',tour:b.tourName||b.tourId||'—',date:b.date||'—',status:b.status||'—',totalUSD:money(b.totalUSD)}));
  const skills=listSkillVersions().map((s:any)=>({id:s.id,version:s.version,lifecycle:s.lifecycle,exposure:s.exposure,routingScore:s.routingScore}));
  return {
    generatedAt:new Date().toISOString(),
    business:{totalBookings:bookings.length,confirmedBookings:confirmed.length,pendingBookings:pending.length,failedOrCancelled:failures.length,upcoming72h:upcoming.length,revenueUSD:revenue,averageBookingUSD:confirmed.length?money(revenue/confirmed.length):0},
    financial:financial,
    conversion,
    alerts:{unresolved:alerts.length,critical:alerts.filter((a:any)=>a.severity==='critical').length,warning:alerts.filter((a:any)=>a.severity==='warning').length,recent:alerts.slice(0,15).map((a:any)=>({id:a.id,severity:a.severity,title:a.title,message:a.message,bookingId:a.bookingId,providerId:a.providerId,createdAt:a.createdAt}))},
    agents:AGENT_IDENTITIES.map((a:any)=>({id:a.id,mission:a.mission,capabilities:a.canRead||[],writableDomains:a.canWrite||[],escalation:a.escalation||[]})),
    automation:{engine:getNativeEngineStatus(),recentLogs:getNativeAutomationLogs(40),providerInbox:{mode:'Gmail OAuth + native cron every minute',configured:Boolean(process.env.GMAIL_CLIENT_ID&&process.env.GMAIL_CLIENT_SECRET&&process.env.GMAIL_REFRESH_TOKEN)}},
    recentBookings,
    providers:providerList.slice(0,30).map(p=>({id:p.id,name:p.name,region:p.region,status:p.status,slaTargetMinutes:p.slaTargetMinutes,averageResponseMinutes:p.averageResponseMinutes,acceptanceRate:p.acceptanceRate})),
    evolution:{selfDevelopment:selfDevelopment||{enabled:false},skills,recentEvaluations:recentEvaluations.map(e=>({id:e.id,agentId:e.agentId,score:e.score,grounded:e.grounded,safety:e.avoidedUnsafeAction,createdAt:e.createdAt,notes:e.notes}))},
    documents,providerInbox:recentInbox
  };
}
