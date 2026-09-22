import React, { useEffect, useState } from 'react';
import { BrainCircuit, ChevronRight, Code2, Database, DollarSign, Gavel, LineChart, ShieldCheck, ShoppingBag, UserRound, Wrench, Zap } from 'lucide-react';
import { Language } from '../types';
import { auth } from '../firebase';

const ICONS:any={owner:UserRound,business_intelligence:LineChart,sales:ShoppingBag,operations:Zap,finance:DollarSign,accounting:Database,legal_compliance:Gavel,technology:Code2};

export const AIExecutiveArchitecturePage: React.FC<{language: Language}> = ({language}) => {
  const es=language==='es';
  const [data,setData]=useState<any>(null);
  useEffect(()=>{(async()=>{const u=auth.currentUser;if(!u)return;const token=await u.getIdToken();const r=await fetch('/api/admin/ai-architecture',{headers:{Authorization:'Bearer '+token}});if(r.ok)setData(await r.json());})().catch(()=>undefined)},[]);
  const units=data?.units||[];
  return <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-7 space-y-6">
    <section className="overflow-hidden rounded-[34px] border border-violet-400/20 bg-gradient-to-br from-[#160b2a] via-[#090611] to-[#03110b] p-7 md:p-9 shadow-2xl">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
        <div><div className="flex items-center gap-2 text-violet-300 text-[10px] font-black uppercase tracking-[.24em]"><BrainCircuit size={17}/> {es?'Arquitectura ejecutiva IA':'Executive AI architecture'}</div>
        <h1 className="mt-3 text-4xl md:text-6xl font-black tracking-tight text-white">{es?'Sistema Operativo Inteligente de la Empresa':'Intelligent Company Operating System'}</h1>
        <p className="mt-4 max-w-4xl text-sm md:text-base leading-7 text-stone-300">{es?'Ocho unidades especializadas comparten datos y memoria, pero cada una tiene límites, herramientas y responsabilidades explícitas. El propietario mantiene la autoridad final.':'Eight specialized units share data and memory while keeping explicit boundaries, tools and responsibilities. The owner remains the final authority.'}</p></div>
        <div className="min-w-[260px] rounded-3xl border border-emerald-400/20 bg-emerald-500/10 p-5"><div className="text-[10px] font-black uppercase tracking-widest text-emerald-300">Governance loop</div><div className="mt-3 text-sm font-black text-white">Evidence → Proposal → Approval → Execution → Verification → Audit</div><div className="mt-3 text-xs text-stone-400">{es?'Código siempre mediante PR revisable.':'Code always through a reviewable PR.'}</div></div>
      </div>
    </section>
    <section className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
      {units.map((u:any)=>{const Icon=ICONS[u.id]||ShieldCheck; return <article key={u.id} className="group rounded-3xl border border-white/10 bg-[#080c0a] p-5 hover:border-violet-400/30 hover:-translate-y-1 transition-all">
        <div className="flex items-start justify-between"><div className="w-11 h-11 rounded-2xl bg-violet-500/10 flex items-center justify-center"><Icon size={21} className="text-violet-300"/></div><ChevronRight size={16} className="text-stone-600 group-hover:text-violet-300 transition"/></div>
        <h2 className="mt-5 text-lg font-black text-white">{u.title}</h2><p className="mt-2 text-xs leading-5 text-stone-400">{u.mission}</p>
        <div className="mt-5"><div className="text-[9px] uppercase tracking-widest font-black text-emerald-300">{es?'Habilidades':'Capabilities'}</div><div className="mt-2 flex flex-wrap gap-1.5">{(u.capabilities||[]).map((x:string)=><span key={x} className="rounded-full bg-white/5 px-2 py-1 text-[9px] text-stone-300">{x}</span>)}</div></div>
        <div className="mt-5 border-t border-white/5 pt-4"><div className="text-[9px] uppercase tracking-widest font-black text-amber-300">{es?'Puede proponer':'Can propose'}</div><ul className="mt-2 space-y-1 text-[10px] text-stone-400">{(u.proposes||[]).slice(0,4).map((x:string)=><li key={x}>• {x}</li>)}</ul></div>
        <div className="mt-4 rounded-2xl border border-rose-400/10 bg-rose-500/5 p-3"><div className="text-[9px] uppercase tracking-widest font-black text-rose-300">{es?'Límites':'Boundaries'}</div><div className="mt-1 text-[10px] leading-4 text-stone-400">{(u.forbidden||[]).slice(0,2).join(' · ')}</div></div>
      </article>})}
    </section>
    <section className="rounded-3xl border border-white/10 bg-[#080c0a] p-6">
      <div className="flex items-center gap-2"><Wrench className="text-amber-300" size={19}/><h2 className="font-black text-white">{es?'Cómo crece la plataforma':'How the platform evolves'}</h2></div>
      <div className="mt-5 grid md:grid-cols-3 gap-4">
        {[[es?'1. Detectar':'1. Detect','La IA observa datos reales, errores, oportunidades y señales de los viajeros.'],[es?'2. Proponer':'2. Propose','Formula cambios con evidencia, impacto, riesgo, archivos afectados y pruebas.'],[es?'3. Gobernar':'3. Govern','El propietario o colaborador autorizado aprueba, rechaza, ejecuta y deja trazabilidad.']].map(([t,d])=><div key={t} className="rounded-2xl bg-white/[.03] p-4"><div className="text-sm font-black text-white">{t}</div><div className="mt-2 text-xs leading-5 text-stone-400">{d}</div></div>)}
      </div>
    </section>
  </div>;
};
