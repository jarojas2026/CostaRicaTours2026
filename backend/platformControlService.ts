/**
 * Human admin platform controls.
 * Additive layer: operational, financial, accounting and governance parameters.
 */
import { getFirestoreDb } from './bookingService';

export type PlatformControlKey =
  | 'ai_autonomy_level' | 'max_agent_tool_rounds' | 'journey_adaptation_enabled'
  | 'live_availability_required' | 'weather_context_enabled' | 'human_handoff_enabled'
  | 'provider_auto_coordination' | 'sales_followup_enabled' | 'risk_escalation_enabled'
  | 'learning_reflection_enabled' | 'financial_currency' | 'financial_iva_rate'
  | 'financial_tax_mode' | 'financial_payment_fee_rate' | 'financial_provider_commission_rate'
  | 'fiscal_document_required' | 'electronic_invoicing_enabled' | 'accounting_period_lock'
  | 'require_financial_approval' | 'require_refund_approval' | 'require_provider_payout_approval'
  | 'legal_review_required_for_policy_changes';

const DEFAULTS: Record<PlatformControlKey, string | number | boolean> = {
  ai_autonomy_level:'supervised', max_agent_tool_rounds:3, journey_adaptation_enabled:true,
  live_availability_required:true, weather_context_enabled:true, human_handoff_enabled:true,
  provider_auto_coordination:true, sales_followup_enabled:true, risk_escalation_enabled:true,
  learning_reflection_enabled:true, financial_currency:'USD', financial_iva_rate:0.13,
  financial_tax_mode:'inclusive', financial_payment_fee_rate:0, financial_provider_commission_rate:0,
  fiscal_document_required:true, electronic_invoicing_enabled:false, accounting_period_lock:false,
  require_financial_approval:true, require_refund_approval:true,
  require_provider_payout_approval:true, legal_review_required_for_policy_changes:true
};

export async function getPlatformControls() {
  const db=getFirestoreDb();
  if(!db) return {values:{...DEFAULTS},source:'defaults'};
  try {
    const snap=await db.collection('platform_control').doc('global').get();
    return {values:{...DEFAULTS,...(snap.exists?snap.data():{})},source:snap.exists?'firestore':'defaults'};
  } catch { return {values:{...DEFAULTS},source:'defaults'}; }
}

export async function updatePlatformControls(input:Record<string,unknown>) {
  const allowed=new Set(Object.keys(DEFAULTS));
  const sanitized:Record<string,string|number|boolean>={};
  const booleanKeys=new Set(Object.keys(DEFAULTS).filter(k=>typeof DEFAULTS[k as PlatformControlKey]==='boolean'));
  const numericKeys=new Set(['max_agent_tool_rounds','financial_iva_rate','financial_payment_fee_rate','financial_provider_commission_rate']);
  for(const [key,value] of Object.entries(input||{})){
    if(!allowed.has(key)) continue;
    if(booleanKeys.has(key) && typeof value==='boolean') sanitized[key]=value;
    else if(numericKeys.has(key) && Number.isFinite(Number(value))){
      const max=key==='max_agent_tool_rounds'?10:1;
      sanitized[key]=Math.max(0,Math.min(max,Number(value)));
    } else if(typeof value==='string' && ['ai_autonomy_level','financial_currency','financial_tax_mode'].includes(key)){
      const valid=key==='financial_currency'?['USD','CRC']:key==='financial_tax_mode'?['inclusive','exclusive']:['supervised','assisted','high'];
      if(valid.includes(value)) sanitized[key]=value;
    }
  }
  const db=getFirestoreDb();
  if(db&&Object.keys(sanitized).length) await db.collection('platform_control').doc('global').set({...sanitized,updatedAt:new Date().toISOString()},{merge:true});
  return getPlatformControls();
}
