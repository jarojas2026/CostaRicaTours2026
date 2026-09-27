import React,{useEffect,useState} from 'react';
import {useNavigate} from 'react-router-dom';
import type { Language } from '../types';
import {auth} from '../firebase';

export function AdminRouteGuard({ language = 'es', children }: { language?: Language; children: React.ReactNode }) {
  const navigate=useNavigate();
  const [state,setState]=useState<'checking'|'allowed'|'denied'>('checking');
  useEffect(()=>{let active=true;(async()=>{try{const user=auth.currentUser;if(!user){if(active)setState('denied');return;}const token=await user.getIdToken();const response=await fetch('/api/admin/access-check',{headers:{Authorization:'Bearer '+token}});if(active)setState(response.ok?'allowed':'denied');}catch{if(active)setState('denied');}})();return()=>{active=false;};},[]);
  useEffect(()=>{if(state==='denied')navigate('/login',{replace:true});},[state,navigate]);
  if(state==='checking') return <main className="min-h-[50vh] flex items-center justify-center text-emerald-300"><div className="rounded-2xl border border-emerald-400/20 bg-emerald-950/20 px-5 py-4 text-sm font-bold">{language==='es'?'Verificando acceso seguro…':'Verifying secure access…'}</div></main>;
  return state==='allowed'?<>{children}</>:null;
}
