import { useEffect, useState } from 'react';
import { onIdTokenChanged, type User } from 'firebase/auth';
import { auth } from '../firebase';
import { checkAdminAccessPolicy, createAdminAccessCache, hasProviderClaims, type AdminAccessStatus } from '../utils/accountRoles';
import { subscribeStorageScope } from '../utils/privateStorage';

// Caché en memoria por uid compartida por Header y BottomNav. Se vacía al
// cambiar de identidad (inicio/cierre de sesión). Nada se guarda en el navegador.
const adminAccessCache = createAdminAccessCache();
subscribeStorageScope(() => adminAccessCache.clear());

export interface AccountRoles {
  user: User | null;
  adminStatus: AdminAccessStatus;
  isAdmin: boolean;
  isProvider: boolean;
}

/**
 * Roles visibles del usuario actual para mostrar accesos en el menú.
 * Solo visual: cada ruta protegida vuelve a verificar en el backend.
 */
export function useAdminAccess(): AccountRoles {
  const [state, setState] = useState<AccountRoles>({ user: auth.currentUser, adminStatus: auth.currentUser ? 'checking' : 'signed-out', isAdmin: false, isProvider: false });

  useEffect(() => {
    let generation = 0;
    const unsubscribe = onIdTokenChanged(auth, async (user) => {
      const current = ++generation;
      if (!user) {
        setState({ user: null, adminStatus: 'signed-out', isAdmin: false, isProvider: false });
        return;
      }
      const cached = adminAccessCache.peek(user.uid);
      setState(prev => ({ user, adminStatus: cached ?? 'checking', isAdmin: cached === 'allowed', isProvider: prev.user?.uid === user.uid ? prev.isProvider : false }));
      try {
        const tokenResult = await user.getIdTokenResult();
        if (current !== generation) return;
        const isProvider = hasProviderClaims(tokenResult.claims as Record<string, unknown>);
        setState(prev => ({ ...prev, isProvider }));
        const result = await adminAccessCache.resolve(user.uid, () => {
          const controller = new AbortController();
          const timeout = window.setTimeout(() => controller.abort(), 15000);
          return checkAdminAccessPolicy(tokenResult.token, fetch, controller.signal)
            .finally(() => window.clearTimeout(timeout));
        });
        if (current === generation) setState(prev => ({ ...prev, adminStatus: result, isAdmin: result === 'allowed' }));
      } catch {
        if (current === generation) setState(prev => ({ ...prev, adminStatus: 'error', isAdmin: false }));
      }
    });
    return () => { generation++; unsubscribe(); };
  }, []);

  return state;
}
