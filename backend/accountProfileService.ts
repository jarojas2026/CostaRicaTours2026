import { getFirestoreDb } from './bookingService';
import { getOperationalMemory } from './memoryService';
export type AccountRole = 'customer' | 'operator' | 'admin';
export interface AccountProfile { uid:string; email:string|null; displayName:string|null; photoURL:string|null; role:AccountRole; createdAt:string; updatedAt:string; lastSeenAt:string; travelerCanonicalId?:string|null; }
function normalizeRole(v:unknown):AccountRole { return v==='admin'||v==='operator'?v:'customer'; }
export async function syncAccountProfile(input:{uid:string;email?:string|null;displayName?:string|null;photoURL?:string|null;role?:string|null}):Promise<AccountProfile>{
 const db=getFirestoreDb(); const now=new Date().toISOString(); const uid=String(input.uid).slice(0,160); const role=normalizeRole(input.role);
 const base:AccountProfile={uid,email:input.email?String(input.email).trim().toLowerCase().slice(0,254):null,displayName:input.displayName?String(input.displayName).slice(0,160):null,photoURL:input.photoURL?String(input.photoURL).slice(0,1000):null,role,createdAt:now,updatedAt:now,lastSeenAt:now,travelerCanonicalId:null};
 if(!db) return base; const ref=db.collection('account_profiles').doc(uid); const snap=await ref.get(); const existing=snap.exists?(snap.data()||{}):{};
 const profile:AccountProfile={...base,...existing,uid,email:base.email||existing.email||null,displayName:base.displayName||existing.displayName||null,photoURL:base.photoURL||existing.photoURL||null,role:role!=='customer'?role:normalizeRole(existing.role),createdAt:existing.createdAt||now,updatedAt:now,lastSeenAt:now,travelerCanonicalId:existing.travelerCanonicalId||null};
 await ref.set(profile,{merge:true}); return profile;
}
export async function getAccountProfile(uid:string):Promise<AccountProfile|null>{ const db=getFirestoreDb(); if(!db)return null; const snap=await db.collection('account_profiles').doc(String(uid).slice(0,160)).get(); return snap.exists?(snap.data() as AccountProfile):null; }
export async function getPersonalAIContext(uid:string){ const profile=await getAccountProfile(uid); const memory=await getOperationalMemory('account_'+String(uid).slice(0,140)).catch(()=>null); return {profile,memory:memory?{summary:memory.summary,facts:memory.facts,preferences:memory.preferences,activeGoals:memory.activeGoals,decisions:memory.decisions,lastUpdatedAt:memory.lastUpdatedAt}:null}; }