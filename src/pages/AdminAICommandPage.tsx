import React, { useEffect, useState } from 'react';
import { Bot, BrainCircuit, CheckCircle2, Code2, History, LockKeyhole, Play, ShieldAlert, Sparkles, Wand2, XCircle, RefreshCw } from 'lucide-react';
import { Language } from '../types';
import { auth } from '../firebase';

export const AdminAICommandPage: React.FC<{language: Language}> = ({language}) => {
  const es=language==='es';
  const [prompt,setPrompt]=useState('');
  const [mode,setMode]=useState('analyze');
  const [result,setResult]=useState<any>();
  const [history,setHistory]=useState<any[]>([]);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState('');

  const token=async()=>{const u=auth.currentUser;if(!u)throw new Error(es?'Sesión administrativa requerida.':'Administrative session required.');return u.getIdToken();};
  const loadHistory=async()=>{try{const t=await token();const r=await fetch('/api/admin/ai-command/history',{headers:{Authorization:'Bearer '+t}});const j=await r.json();if(r.ok)setHistory(j.commands||[]);}catch{}};
  useEffect(()=>{loadHistory();},[]);

  const run=async()=>{
    setLoading(true);setError('');
    try{
      const t=await token();
      const r=await fetch('/api/admin/ai-command',{method:'POST',headers:{Authorization:'Bearer '+t,'Content-Type':'application/json'},body:JSON.stringify({prompt,mode})});
      const j=await r.json();if(!r.ok)throw new Error(j.error||'AI command failed');
      setResult(j);setPrompt('');await loadHistory();
    }catch(e:any){setError(e.message||'Error')}finally{setLoading(false)}
  };
  const decide=async(id:string,action:'approve'|'reject')=>{
    try{
      const t=await token();
      const r=await fetch('/api/admin/ai-command/'+encodeURIComponent(id)+'/'+action,{method:'POST',headers:{Authorization:'Bearer '+t,'Content-Type':'application/json'},body:JSON.stringify({reason:action==='reject'?(es?'Rechazada desde el centro de control.':'Rejected from control center.'):''})});
      const j=await r.json();if(!r.ok)throw new Error(j.error||'No se pudo completar la acción');
      setResult(j);await loadHistory();
    }catch(e:any){setError(e.message||'Error')}
  };

  return <div className="max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8 py-7 space-y-6">
    <section className="rounded-[32px] border border-violet-400/20 bg-gradient-to-br from-[#160d2b] via-[#080512] to-[#030208] p-7 shadow-2xl">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div><div className="flex items-center gap-2 text-violet-300 text-[10px] font-black uppercase tracking-[0.22em]"><BrainCircuit size={16}/> {es?'Sala de mando inteligente':'Intelligent command room'}</div><h1 className="mt-2 text-4xl font-black text-white">{es?'Copiloto empresarial IA':'AI business copilot'}</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-stone-300">{es?'Estudia el negocio, propone mejoras y mantiene una cadena de aprobación y auditoría. El código no se despliega directamente desde aquí.':'Study the business, propose improvements and keep an approval/audit chain. Code is never deployed directly from here.'}</p></div>
        <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-200"><b>Proposal-first</b><br/>{es?'Acciones sensibles requieren aprobación':'Sensitive actions require approval'}</div>
      </div>
    </section>

    <section className="grid xl:grid-cols-3 gap-5">
      <div className="xl:col-span-2 rounded-3xl border border-white/10 bg-[#0a0a10] p-5">
        <div className="flex flex-wrap gap-2 mb-4">{[['analyze','Analizar',Sparkles],['propose','Proponer',Wand2],['simulate','Simular',History],['code','Preparar código',Code2]].map(([v,l,I]:any)=><button key={v} onClick={()=>setMode(v)} className={`rounded-xl px-3 py-2 text-xs font-black transition ${mode===v?'bg-violet-500 text-white shadow-lg shadow-violet-900/30':'bg-white/5 text-stone-400 hover:bg-white/10'}`}><I size={14} className="inline mr-1"/>{es&&v==='analyze'?'Analizar':es&&v==='propose'?'Proponer':es&&v==='simulate'?'Simular':'Preparar código'}</button>)}</div>
        <textarea value={prompt} onChange={e=>setPrompt(e.target.value)} rows={8} placeholder={es?'Ej.: estudia ventas, margen, proveedores, riesgos y viajes abandonados; propone mejoras con impacto y pruebas.':'Example: study sales, margin, providers, risks and abandoned journeys; propose improvements with impact and tests.'} className="w-full rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-white outline-none focus:border-violet-400/50"/>
        <div className="mt-4 flex justify-between items-center"><span className="text-[10px] text-stone-500">{prompt.length}/6000</span><button onClick={run} disabled={loading||!prompt.trim()} className="inline-flex items-center gap-2 rounded-xl bg-violet-500 px-5 py-3 text-xs font-black text-white disabled:opacity-50"><Play size={15}/>{loading?'Procesando…':es?'Ejecutar IA':'Run AI'}</button></div>
      </div>
      <div className="rounded-3xl border border-emerald-400/15 bg-[#07140f] p-5"><div className="flex items-center gap-2"><LockKeyhole className="text-emerald-300" size={18}/><h2 className="font-black text-white">{es?'Gobierno humano':'Human governance'}</h2></div><ul className="mt-4 space-y-3 text-xs text-stone-300"><li><CheckCircle2 className="inline text-emerald-300 mr-2" size={14}/>Firebase + allowlist de administradores</li><li><CheckCircle2 className="inline text-emerald-300 mr-2" size={14}/>Propuesta → aprobación → ejecución segura</li><li><CheckCircle2 className="inline text-emerald-300 mr-2" size={14}/>Auditoría persistente</li><li><ShieldAlert className="inline text-amber-300 mr-2" size={14}/>Código → revisión → PR</li></ul></div>
    </section>

    {error&&<div className="rounded-2xl border border-rose-400/20 bg-rose-950/30 p-4 text-sm text-rose-200">{error}</div>}
    {result&&<section className="rounded-3xl border border-violet-400/20 bg-[#08060d] p-5"><div className="flex items-center justify-between"><div className="flex items-center gap-2"><Bot className="text-violet-300"/><h2 className="font-black text-white">{es?'Resultado / propuesta':'Result / proposal'}</h2></div><span className="rounded-full bg-amber-400/10 px-3 py-1 text-[10px] font-black text-amber-200">{result.status||'proposal'}</span></div><pre className="mt-4 max-h-[520px] overflow-auto whitespace-pre-wrap text-xs leading-6 text-stone-200">{JSON.stringify(result,null,2)}</pre></section>}

    <section className="rounded-3xl border border-white/10 bg-[#080b0a] p-5">
      <div className="flex items-center justify-between"><div className="flex items-center gap-2"><History className="text-sky-300" size={18}/><h2 className="font-black text-white">{es?'Cola de propuestas y auditoría':'Proposal & audit queue'}</h2></div><button onClick={loadHistory} className="rounded-xl border border-white/10 p-2 text-stone-300 hover:bg-white/5"><RefreshCw size={15}/></button></div>
      <div className="mt-4 space-y-3">{history.length===0?<div className="rounded-2xl bg-white/[0.03] p-4 text-xs text-stone-500">{es?'No hay propuestas guardadas.':'No saved proposals yet.'}</div>:history.map((x:any)=><div key={x.id} className="rounded-2xl border border-white/5 bg-black/20 p-4"><div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><div><div className="text-[10px] uppercase tracking-wider text-violet-300">{x.mode} · {x.status}</div><div className="mt-1 text-sm font-bold text-white">{x.prompt}</div><div className="mt-1 text-[10px] text-stone-500">{x.createdAt} · {x.actorEmail||'—'}</div></div><div className="flex gap-2">{x.status==='pending_approval'&&<><button onClick={()=>decide(x.id,'approve')} className="inline-flex items-center gap-1 rounded-xl bg-emerald-500 px-3 py-2 text-[10px] font-black text-stone-950"><CheckCircle2 size={13}/> {es?'Aprobar':'Approve'}</button><button onClick={()=>decide(x.id,'reject')} className="inline-flex items-center gap-1 rounded-xl bg-rose-500/15 px-3 py-2 text-[10px] font-black text-rose-200"><XCircle size={13}/> {es?'Rechazar':'Reject'}</button></>}</div></div></div>)}</div>
    </section>
  </div>;
};
