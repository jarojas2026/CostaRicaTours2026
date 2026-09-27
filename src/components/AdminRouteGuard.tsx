import React, { useEffect, useState } from 'react';
import { onIdTokenChanged } from 'firebase/auth';
import { auth, signInWithGoogle, signOut } from '../firebase';
import type { Language } from '../types';

export function AdminRouteGuard({ language = 'es', children }: { language?: Language; children: React.ReactNode }) {
  const es = language === 'es';
  const [status, setStatus] = useState<'loading' | 'signed-out' | 'allowed' | 'denied' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);
  const [signingIn, setSigningIn] = useState(false);

  useEffect(() => {
    let generation = 0;
    let controller: AbortController | undefined;
    const unsubscribe = onIdTokenChanged(auth, async (user) => {
      const current = ++generation;
      controller?.abort();
      setStatus(user ? 'loading' : 'signed-out');
      if (!user) return;
      const request = new AbortController();
      controller = request;
      const timeout = window.setTimeout(() => request.abort(), 15000);
      try {
        const token = await user.getIdToken();
        if (current !== generation) return;
        const response = await fetch('/api/admin/access-policy', {
          headers: { Authorization: 'Bearer ' + token },
          signal: request.signal,
        });
        if (current !== generation) return;
        if (response.status === 401 || response.status === 403) {
          setStatus('denied');
          return;
        }
        if (!response.ok) throw new Error('Access check unavailable');
        const policy = await response.json();
        if (current === generation) setStatus(policy.allowed === true ? 'allowed' : 'denied');
      } catch {
        if (current === generation) setStatus('error');
      } finally {
        window.clearTimeout(timeout);
      }
    });
    return () => { generation++; controller?.abort(); unsubscribe(); };
  }, [attempt]);

  async function login() {
    setSigningIn(true);
    try { await signInWithGoogle(); } catch { setStatus('error'); }
    finally { setSigningIn(false); }
  }

  if (status === 'allowed') return <>{children}</>;
  return (
    <section className="max-w-xl mx-auto my-12 p-8 rounded-3xl border border-emerald-500/30 bg-[#051c14] text-stone-100 space-y-5" aria-live="polite">
      <h1 className="text-2xl font-black">{es ? 'Administración' : 'Administration'}</h1>
      <p>{status === 'loading'
        ? (es ? 'Verificando acceso administrativo…' : 'Checking administrator access…')
        : status === 'signed-out'
          ? (es ? 'Inicia sesión con tu cuenta administrativa.' : 'Sign in with your administrator account.')
          : status === 'denied'
            ? (es ? 'Esta cuenta no tiene acceso administrativo.' : 'This account does not have administrator access.')
            : (es ? 'No se pudo verificar el acceso. Comprueba la conexión con el servidor e inténtalo de nuevo.' : 'Access could not be verified. Check the server connection and try again.')}</p>
      {status !== 'loading' && (
        <div className="flex flex-wrap gap-3">
          {!auth.currentUser ? <button disabled={signingIn} onClick={login} className="rounded-xl px-4 py-3 bg-amber-400 text-stone-950 font-bold">{es ? 'Iniciar sesión con Google' : 'Sign in with Google'}</button>
            : <button onClick={async () => { try { await signOut(); } catch { setStatus('error'); } }} className="rounded-xl px-4 py-3 border border-emerald-400/40">{es ? 'Cerrar sesión para cambiar de cuenta' : 'Sign out to switch accounts'}</button>}
          <button onClick={() => setAttempt(value => value + 1)} className="rounded-xl px-4 py-3 border border-emerald-400/40">{es ? 'Reintentar' : 'Retry'}</button>
        </div>
      )}
    </section>
  );
}
