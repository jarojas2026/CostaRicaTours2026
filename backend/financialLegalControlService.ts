/**
 * Financial, accounting and legal-control layer for the human admin center.
 * Additive: derives operational figures from real bookings and stores only
 * configurable controls/records. It is not a substitute for a Costa Rican
 * CPA, tax attorney or official Hacienda validation.
 */
import { getAllBookings, getFirestoreDb } from './bookingService';
import { getPlatformControls } from './platformControlService';

const DEFAULTS = {
  currency:'USD', iva_rate:0.13, tax_mode:'inclusive', payment_fee_rate:0,
  provider_commission_rate:0, fiscal_document_required:true,
  electronic_invoicing_enabled:false, accounting_period_lock:false,
  require_financial_approval:true, require_refund_approval:true,
  require_provider_payout_approval:true, legal_review_required_for_policy_changes:true
} as const;

function num(v:any){const n=Number(v);return Number.isFinite(n)?n:0;}
function money(v:any){return Math.round(num(v)*100)/100;}
function normalizeStatus(v:any){return String(v||'').trim().toLowerCase();}

async function readControls(){
  const platform=await getPlatformControls();
  const p:any=platform.values||{};
  const mapped={
    ...DEFAULTS,
    currency:p.financial_currency??DEFAULTS.currency,
    iva_rate:p.financial_iva_rate??DEFAULTS.iva_rate,
    tax_mode:p.financial_tax_mode??DEFAULTS.tax_mode,
    payment_fee_rate:p.financial_payment_fee_rate??DEFAULTS.payment_fee_rate,
    provider_commission_rate:p.financial_provider_commission_rate??DEFAULTS.provider_commission_rate,
    fiscal_document_required:p.fiscal_document_required??DEFAULTS.fiscal_document_required,
    electronic_invoicing_enabled:p.electronic_invoicing_enabled??DEFAULTS.electronic_invoicing_enabled,
    accounting_period_lock:p.accounting_period_lock??DEFAULTS.accounting_period_lock,
    require_financial_approval:p.require_financial_approval??DEFAULTS.require_financial_approval,
    require_refund_approval:p.require_refund_approval??DEFAULTS.require_refund_approval,
    require_provider_payout_approval:p.require_provider_payout_approval??DEFAULTS.require_provider_payout_approval,
    legal_review_required_for_policy_changes:p.legal_review_required_for_policy_changes??DEFAULTS.legal_review_required_for_policy_changes
  };
  return {values:mapped,source:platform.source};
}
export async function getFinancialLegalControls(){return readControls();}

export async function updateFinancialLegalControls(input:Record<string,unknown>){
  const db=getFirestoreDb();
  if(db&&Object.keys(input||{}).length) await db.collection('financial_controls').doc('global').set({...input,updatedAt:new Date().toISOString()},{merge:true});
  return readControls();
}
function isRevenueBooking(b:any){const s=normalizeStatus(b.status),p=normalizeStatus(b.paymentStatus);return ['confirmada','confirmed','completada','completed'].includes(s)||['paid','completed','succeeded'].includes(p);}
function isCancelled(b:any){return ['cancelada','cancelled','refunded'].includes(normalizeStatus(b.status));}

export async function getFinancialLegalSnapshot(){
  const [bookings,controlsResult]=await Promise.all([getAllBookings(),readControls()]);
  const c:any=controlsResult.values;
  const revenueBookings=bookings.filter(isRevenueBooking);
  const cancelled=bookings.filter(isCancelled);
  const grossSales=money(revenueBookings.reduce((s,b)=>s+num(b.totalUSD),0));
  const refunds=money(bookings.reduce((s,b)=>s+num(b.refundAmountUSD),0));
  const paymentFees=money(grossSales*num(c.payment_fee_rate));
  const providerPayables=money(revenueBookings.reduce((s,b)=>{
    if(b.providerPayoutUSD!==undefined)return s+num(b.providerPayoutUSD);
    if(b.providerCommissionUSD!==undefined)return s+num(b.providerCommissionUSD);
    return s+num(b.totalUSD)*num(c.provider_commission_rate);
  },0));
  const netSales=money(grossSales-refunds);
  const iva=c.tax_mode==='inclusive'?money(netSales-(netSales/(1+num(c.iva_rate)))):money(netSales*num(c.iva_rate));
  const subtotal=c.tax_mode==='inclusive'?money(netSales-iva):netSales;
  const grossMargin=money(netSales-paymentFees-providerPayables);
  const unpaid=bookings.filter(b=>['pending','pendiente','pendiente_pago','hold'].includes(normalizeStatus(b.paymentStatus||b.status)));
  const unissuedFiscalDocuments=c.fiscal_document_required?revenueBookings.filter(b=>!b.electronicInvoice&&!b.fiscalDocumentNumber).length:0;
  const payoutPending=revenueBookings.filter(b=>!b.providerPayoutStatus||['pending','pendiente'].includes(normalizeStatus(b.providerPayoutStatus))).length;
  const accountsReceivable=money(unpaid.reduce((s,b)=>s+num(b.totalUSD),0));
  const cashCollected=money(grossSales-refunds);
  const paymentMethods:Record<string,number>={};
  for(const b of revenueBookings){const key=String(b.paymentMethod||'unknown');paymentMethods[key]=money((paymentMethods[key]||0)+num(b.totalUSD));}
  const byTour:Record<string,{bookings:number;revenueUSD:number;providerPayableUSD:number}>={};
  for(const b of revenueBookings){
    const key=b.tourName||b.tourId||'Tour'; byTour[key] ||= {bookings:0,revenueUSD:0,providerPayableUSD:0};
    byTour[key].bookings+=1; byTour[key].revenueUSD=money(byTour[key].revenueUSD+num(b.totalUSD));
    byTour[key].providerPayableUSD=money(byTour[key].providerPayableUSD+(b.providerPayoutUSD!==undefined?num(b.providerPayoutUSD):0));
  }
  const legal=await getLegalComplianceSnapshot(bookings,c);
  return {
    generatedAt:new Date().toISOString(),controls:c,source:controlsResult.source,
    kpis:{grossSalesUSD:grossSales,refundsUSD:refunds,netSalesUSD:netSales,taxableBaseUSD:subtotal,ivaUSD:iva,paymentFeesUSD:paymentFees,providerPayablesUSD:providerPayables,grossMarginUSD:grossMargin,operatingProfitProxyUSD:grossMargin,accountsReceivableUSD:accountsReceivable,cashCollectedUSD:cashCollected,cancelledBookings:cancelled.length,unpaidBookings:unpaid.length,unissuedFiscalDocuments,providerPayoutsPending:payoutPending},
    cashFlow:{inflowsUSD:cashCollected,outflowsKnownUSD:money(refunds+paymentFees+providerPayables),netKnownCashFlowUSD:money(cashCollected-refunds-paymentFees-providerPayables)},
    paymentMethods,
    tourProfitability:Object.entries(byTour).map(([tour,v])=>({tour,...v,contributionUSD:money(v.revenueUSD-v.providerPayableUSD)})).sort((a,b)=>b.contributionUSD-a.contributionUSD).slice(0,20),
    accounting:{basis:'booking-ledger',revenueRecognition:'confirmed_or_paid_booking',openReceivables:accountsReceivable,taxMode:c.tax_mode,warning:'Completar gastos operativos, activos, pasivos, cuentas bancarias y asientos contables para estados financieros completos.'},
    legal
  };
}
async function getLegalComplianceSnapshot(bookings:any[],controls:any){
  const db=getFirestoreDb(); let records:any[]=[];
  if(db){try{const snap=await db.collection('legal_compliance').orderBy('updatedAt','desc').limit(50).get();records=snap.docs.map(d=>({id:d.id,...d.data()}));}catch{}}
  const required=[
    {id:'electronic_invoicing',label:'Comprobantes electrónicos / facturación',status:controls.electronic_invoicing_enabled?'configured':'review_required',priority:'high'},
    {id:'tax_configuration',label:'Configuración y revisión tributaria',status:'review_required',priority:'high'},
    {id:'terms_conditions',label:'Términos y condiciones de venta',status:'review_required',priority:'high'},
    {id:'privacy_policy',label:'Privacidad y tratamiento de datos',status:'review_required',priority:'high'},
    {id:'refund_policy',label:'Política de cancelación y reembolsos',status:'review_required',priority:'medium'},
    {id:'provider_contracts',label:'Contratos y condiciones con proveedores',status:'review_required',priority:'medium'},
    {id:'travel_insurance',label:'Política/consentimiento de seguro cuando aplique',status:'review_required',priority:'medium'},
    {id:'records_retention',label:'Retención y trazabilidad de registros',status:'review_required',priority:'medium'}
  ];
  const merged=required.map(item=>{const saved=records.find(r=>r.id===item.id);return {...item,...(saved||{})};});
  return {complianceScore:Math.round((merged.filter(x=>x.status==='compliant'||x.status==='configured').length/merged.length)*100),items:merged,fiscalDocumentsPending:controls.fiscal_document_required?bookings.filter(isRevenueBooking).filter(b=>!b.electronicInvoice&&!b.fiscalDocumentNumber).length:0,disclaimer:'El estado es de control interno. La validación jurídica, tributaria y contable debe realizarse con profesionales y fuentes oficiales de Costa Rica.'};
}
export async function recordFinancialEvent(event:Record<string,any>){const db=getFirestoreDb();const payload={...event,createdAt:new Date().toISOString()};if(!db)return{stored:false,payload};const ref=await db.collection('financial_audit_log').add(payload);return{stored:true,id:ref.id,payload};}
export async function getFinancialAuditLog(){const db=getFirestoreDb();if(!db)return[];try{const snap=await db.collection('financial_audit_log').orderBy('createdAt','desc').limit(100).get();return snap.docs.map(d=>({id:d.id,...d.data()}));}catch{return[];}}
