import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { LoaderCircle } from 'lucide-react';
import { auth } from '../firebase';

export const AdminRouteGuard: React.FC<{ children: React.ReactNode; language: 'es' | 'en' }> = ({ children, language }) => {
  const location = useLocation();
  const [state, setState] = useState<'checking'|'allowed'|'denied'>('checking');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const user = auth.currentUser;
        if (!user) { if (!cancelled) setState('denied'); return; }
        const token = await user.getIdToken();
        const response = await fetch('/api/admin/access-policy', { headers: { Authorization: 'Bearer ' + token } });
        if (!cancelled) setState(response.ok ? 'allowed' : 'denied');
      } catch {
        if (!cancelled) setState('denied');
      }
    })();
    return () => { cancelled = true; };
  }, [location.pathname]);

  if (state === 'checking') return <div className="min-h-[70vh] flex items-center justify-center"><div className="rounded-3xl border border-emerald-400/20 bg-[#06140e] px-6 py-5 text-center"><LoaderCircle className="mx-auto animate-spin text-amber-300" size={24}/><div className="mt-3 text-xs font-black text-stone-200">{language === 'es' ? 'Verificando acceso administrativo…' : 'Verifying administrative access…'}</div></div></div>;
  if (state === 'denied') return <Navigate to="/" replace state={{ from: location.pathname }} />;
  return <>{children}</>;
};
