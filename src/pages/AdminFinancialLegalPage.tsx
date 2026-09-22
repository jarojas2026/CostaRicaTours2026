import React, { useEffect, useState } from 'react';
import { Calculator, Scale, WalletCards, FileCheck2, ShieldCheck, RefreshCw, Save, AlertTriangle, BookOpen, Landmark } from 'lucide-react';
import { auth } from '../firebase';
import { Language } from '../types';

interface Props { language: Language; }

const money = (n:number) => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:2}).format(Number(n)||0);

export const AdminFinancialLegalPage: React.FC<Props> = ({ language }) => {
  const es = language === 'es';
  const [data,setData] = useState<any>(null);
  const [controls,setControls] = useState<any>({});
  const [message,setMessage] = useState('');
  const [loading,setLoading] = useState(true);

  const token = async () => {
    const user = auth.currentUser;
    if (!user) throw new Error(es ? 'Inicia sesión como administrador.' : 'Sign in as administrator.');
    return user.getIdToken();
  };

  const load = async () => {
    setLoading(true);
    try {
      const t = await token();
      const [a,b] = await Promise.all([
        fetch('/api/admin/financial-legal',{headers:{Authorization:'Bearer '+t}}),
        fetch('/api/admin/financial-controls',{headers:{Authorization:'Bearer '+t}})
      ]);
      const aj=await a.json(); const bj=await b.json();
      if(!a.ok) throw new Error(aj.error || 'No se pudo cargar el módulo.');
      setData(aj); if(b.ok) setControls(bj.values || {});
    } catch(e:any){ setMessage(e?.message || 'Error'); }
    finally{ setLoading(false); }
  };

  const save = async () => {
    try {
      const t=await token();
      const r=await fetch('/api/admin/financial-controls',{method:'PATCH',headers:{Authorization:'Bearer '+t,'Content-Type':'application/json'},body:JSON.stringify(controls)});
      const j=await r.json(); if(!r.ok) throw new Error(j.error || 'No se pudo guardar.');
      setControls(j.values || controls); setMessage(es?'Controles financieros guardados.':'Financial controls saved.');
      await load();
    } catch(e:any){ setMessage(e?.message || 'Error'); }
  };

  useEffect(()=>{ load(); const id=window.setInterval(load,60000); return()=>window.clearInterval(id); },[]);

  const k=data?.kpis||{};
  const legal=data?.legal||{items:[]};

  const toggle=(key:string)=><button type="button" onClick={()=>setControls((x:any)=>({...x,[key]:!x[key]}))} className={`mt-2 w-full rounded-xl px-3 py-2 text-left text-xs font-black ${controls[key]?'bg-emerald-500/20 text-emerald-300':'bg-rose-500/15 text-rose-300'}`}>{controls[key]?'ON':'OFF'}</button>;

  return <div className="max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8 py-7 space-y-6">
    <section className="rounded-[32px] border border-amber-400/20 bg-gradient-to-br from-[#071e14] via-[#041711] to-[#020b07] p-6 md:p-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div><div className="text-amber-300 text-[10px] font-black uppercase tracking-[.22em]">{es?'Gobierno financiero y legal':'Financial & legal governance'}</div><h1 className="mt-2 text-3xl md:text-5xl font-black text-white">{es?'Control financiero, contable y legal':'Financial, accounting & legal control'}</h1><p className="mt-3 max-w-4xl text-sm leading-6 text-stone-300">{es?'Tesorería, rentabilidad, impuestos, cuentas por cobrar, pagos a proveedores, trazabilidad contable y checklist jurídico en una sola consola humana.':'Treasury, profitability, tax controls, receivables, provider payouts, accounting traceability and legal checklist in one human console.'}</p></div>
        <button onClick={load} className="inline-flex items-center gap-2 rounded-xl bg-amber-400 px-4 py-3 font-black text-stone-950"><RefreshCw size={16}/>{es?'Actualizar':'Refresh'}</button>
      </div>
    </section>

    <section className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">
      {[
        ['Ventas brutas',money(k.grossSalesUSD)],['Ventas netas',money(k.netSalesUSD)],['IVA calculado',money(k.ivaUSD)],['Cuentas por cobrar',money(k.accountsReceivableUSD)],
        ['Pagos proveedores',money(k.providerPayablesUSD)],['Margen contribución',money(k.grossMarginUSD)],['Reembolsos',money(k.refundsUSD)],['Documentos fiscales',k.unissuedFiscalDocuments??0]
      ].map(([a,b])=><div key={String(a)} className="rounded-2xl border border-emerald-500/15 bg-[#061d14] p-4"><div className="text-xl font-black text-white">{b}</div><div className="mt-1 text-[9px] uppercase tracking-wider text-stone-500">{a}</div></div>)}
    </section>

    <section className="grid xl:grid-cols-3 gap-5">
      <div className="xl:col-span-2 rounded-3xl border border-sky-400/15 bg-[#06121b] p-5">
        <div className="flex items-center gap-2"><WalletCards className="text-sky-300" size={18}/><h2 className="font-black text-white">{es?'Tesorería y contabilidad':'Treasury & accounting'}</h2></div>
        <div className="mt-4 grid md:grid-cols-3 gap-3">
          {[['Entradas de caja',money(data?.cashFlow?.inflowsUSD)],['Salidas conocidas',money(data?.cashFlow?.outflowsKnownUSD)],['Flujo neto conocido',money(data?.cashFlow?.netKnownCashFlowUSD)]].map(([a,b])=><div key={String(a)} className="rounded-2xl bg-black/20 border border-white/5 p-4"><div className="text-lg font-black text-white">{b}</div><div className="text-[10px] text-stone-500">{a}</div></div>)}
        </div>
        <div className="mt-4 overflow-x-auto"><table className="w-full text-left text-xs"><thead className="text-[9px] uppercase text-stone-500"><tr><th className="p-2">Tour</th><th className="p-2">Reservas</th><th className="p-2">Ingresos</th><th className="p-2">Proveedor</th><th className="p-2">Contribución</th></tr></thead><tbody>{(data?.tourProfitability||[]).map((r:any)=><tr key={r.tour} className="border-t border-white/5"><td className="p-2 text-white">{r.tour}</td><td className="p-2">{r.bookings}</td><td className="p-2">{money(r.revenueUSD)}</td><td className="p-2">{money(r.providerPayableUSD)}</td><td className="p-2 text-emerald-300">{money(r.contributionUSD)}</td></tr>)}</tbody></table></div>
      </div>

      <div className="rounded-3xl border border-amber-400/15 bg-[#171106] p-5">
        <div className="flex items-center gap-2"><Calculator className="text-amber-300" size={18}/><h2 className="font-black text-white">{es?'Parámetros tributarios':'Tax controls'}</h2></div>
        <label className="block mt-4 text-xs text-stone-300">IVA ({Math.round((controls.iva_rate||0)*100)}%)<input type="number" min="0" max="100" step=".1" value={Math.round((controls.iva_rate||0)*100)} onChange={e=>setControls((x:any)=>({...x,iva_rate:Number(e.target.value)/100}))} className="mt-2 w-full rounded-xl bg-black/30 border border-white/10 px-3 py-2 text-white"/></label>
        <label className="block mt-3 text-xs text-stone-300">{es?'Tratamiento del precio':'Tax mode'}<select value={controls.tax_mode||'inclusive'} onChange={e=>setControls((x:any)=>({...x,tax_mode:e.target.value}))} className="mt-2 w-full rounded-xl bg-black/30 border border-white/10 px-3 py-2 text-white"><option value="inclusive">{es?'IVA incluido':'Tax inclusive'}</option><option value="exclusive">{es?'IVA adicional':'Tax exclusive'}</option></select></label>
        <label className="block mt-3 text-xs text-stone-300">{es?'Comisión de pago':'Payment fee'} (%)<input type="number" min="0" max="100" step=".1" value={Math.round((controls.payment_fee_rate||0)*100)} onChange={e=>setControls((x:any)=>({...x,payment_fee_rate:Number(e.target.value)/100}))} className="mt-2 w-full rounded-xl bg-black/30 border border-white/10 px-3 py-2 text-white"/></label>
        <label className="block mt-3 text-xs text-stone-300">{es?'Costo/comisión proveedor':'Provider cost'} (%)<input type="number" min="0" max="100" step=".1" value={Math.round((controls.provider_commission_rate||0)*100)} onChange={e=>setControls((x:any)=>({...x,provider_commission_rate:Number(e.target.value)/100}))} className="mt-2 w-full rounded-xl bg-black/30 border border-white/10 px-3 py-2 text-white"/></label>
        <button onClick={save} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-amber-400 px-4 py-2 text-sm font-black text-stone-950"><Save size={14}/>{es?'Guardar':'Save'}</button>
      </div>
    </section>

    <section className="rounded-3xl border border-cyan-400/15 bg-[#06161c] p-5">
      <div className="flex items-center gap-2"><Landmark className="text-cyan-300" size={18}/><h2 className="font-black text-white">{es?'Libro contable, conciliación y auditoría':'Ledger, reconciliation & audit'}</h2></div>
      <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          ['Asientos',data?.accounting?.control?.journalEntries||0],
          ['Conciliaciones',data?.accounting?.control?.bankReconciliations||0],
          ['Pendientes',data?.accounting?.control?.openReconciliations||0],
          ['Eventos auditoría',data?.accounting?.control?.auditEvents||0],
          ['Período',data?.accounting?.control?.periodStatus||'open']
        ].map(([a,b])=><div key={String(a)} className="rounded-2xl border border-white/5 bg-black/20 p-3"><div className="text-lg font-black text-white">{b}</div><div className="text-[9px] uppercase text-stone-500">{a}</div></div>)}
      </div>
      <div className="mt-4 overflow-x-auto"><table className="w-full text-left text-xs"><thead className="text-[9px] uppercase text-stone-500"><tr><th className="p-2">Código</th><th className="p-2">{es?'Cuenta':'Account'}</th></tr></thead><tbody>{(data?.accounting?.control?.chartOfAccounts||[]).map((x:any)=><tr key={x.code} className="border-t border-white/5"><td className="p-2 text-cyan-300">{x.code}</td><td className="p-2 text-white">{x.name}</td></tr>)}</tbody></table></div>
    </section>

    <section className="grid xl:grid-cols-2 gap-5">
      <div className="rounded-3xl border border-emerald-500/15 bg-[#061d14] p-5"><div className="flex items-center gap-2"><FileCheck2 className="text-emerald-300" size={18}/><h2 className="font-black text-white">{es?'Control de facturación y cierres':'Invoicing & period control'}</h2></div>
        <div className="mt-4 grid sm:grid-cols-2 gap-3">{[['fiscal_document_required','Documento fiscal requerido'],['electronic_invoicing_enabled','Facturación electrónica conectada'],['accounting_period_lock','Bloqueo de período contable'],['require_financial_approval','Aprobación financiera'],['require_refund_approval','Aprobación de reembolsos'],['require_provider_payout_approval','Aprobación de pagos a proveedores']].map(([key,label])=><div key={key} className="rounded-2xl border border-white/5 bg-black/20 p-3"><div className="text-xs font-bold text-white">{label}</div>{toggle(String(key))}</div>)}</div>
      </div>
      <div className="rounded-3xl border border-violet-400/15 bg-[#0b0a18] p-5"><div className="flex items-center gap-2"><Scale className="text-violet-300" size={18}/><h2 className="font-black text-white">{es?'Cumplimiento legal':'Legal compliance'}</h2><span className="ml-auto text-2xl font-black text-white">{legal.complianceScore??0}%</span></div>
        <div className="mt-4 space-y-2">{(legal.items||[]).map((x:any)=><div key={x.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-black/20 p-3"><div><div className="text-xs font-bold text-white">{x.label}</div><div className="text-[10px] text-stone-500">{x.priority}</div></div><span className={`text-[10px] font-black ${x.status==='compliant'||x.status==='configured'?'text-emerald-300':'text-amber-300'}`}>{x.status}</span></div>)}</div>
        <div className="mt-4 text-[10px] leading-4 text-stone-500">{legal.disclaimer}</div>
      </div>
    </section>

    <section className="rounded-3xl border border-rose-400/15 bg-[#170b0b] p-5">
      <div className="flex items-center gap-2"><AlertTriangle className="text-rose-300" size={18}/><h2 className="font-black text-white">{es?'Alertas de gobierno':'Governance alerts'}</h2></div>
      <div className="mt-3 grid md:grid-cols-3 gap-3">
        <div className="rounded-2xl bg-black/20 p-4"><div className="text-xs text-stone-400">{es?'Facturas/documentos pendientes':'Pending fiscal documents'}</div><div className="text-2xl font-black text-white">{k.unissuedFiscalDocuments||0}</div></div>
        <div className="rounded-2xl bg-black/20 p-4"><div className="text-xs text-stone-400">{es?'Cuentas por cobrar':'Receivables'}</div><div className="text-2xl font-black text-white">{money(k.accountsReceivableUSD)}</div></div>
        <div className="rounded-2xl bg-black/20 p-4"><div className="text-xs text-stone-400">{es?'Pagos a proveedores pendientes':'Provider payouts pending'}</div><div className="text-2xl font-black text-white">{k.providerPayoutsPending||0}</div></div>
      </div>
    </section>

    <section className="rounded-3xl border border-sky-400/15 bg-[#06121b] p-5">
      <div className="flex items-center gap-2"><BookOpen className="text-sky-300" size={18}/><h2 className="font-black text-white">{es?'Libro auxiliar por método de pago':'Payment-method ledger'}</h2></div>
      <div className="mt-3 overflow-x-auto"><table className="w-full text-left text-xs"><tbody>{Object.entries(data?.paymentMethods||{}).map(([k,v])=><tr key={k} className="border-t border-white/5"><td className="p-2 text-white">{k}</td><td className="p-2">{money(Number(v))}</td></tr>)}</tbody></table></div>
    </section>

    <div className="rounded-2xl border border-amber-400/20 bg-amber-400/5 p-4 text-xs text-amber-100"><Landmark size={15} className="inline mr-2"/>{es?'El módulo separa cálculo operativo de cumplimiento legal: no marca obligaciones como cumplidas sin evidencia. La configuración tributaria debe validarse con Hacienda y un profesional contable/tributario antes de usarla para declaraciones.':'The module separates operational calculations from legal compliance and never marks obligations compliant without evidence. Tax configuration should be validated with Hacienda and a qualified accounting/tax professional before filing.'}</div>
  </div>;
};
