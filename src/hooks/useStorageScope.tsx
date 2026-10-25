import React, { useSyncExternalStore } from 'react';
import { getStorageScopeKey, subscribeStorageScope, type StorageScopeKey } from '../utils/privateStorage';

/** Ámbito de almacenamiento activo ('anon' o `u:<uid>`); re-renderiza al cambiar de identidad. */
export function useStorageScope(): StorageScopeKey {
  return useSyncExternalStore(subscribeStorageScope, getStorageScopeKey, () => 'anon' as StorageScopeKey);
}

/**
 * Remonta el componente cuando cambia la identidad (inicio/cierre de sesión),
 * para que su estado en memoria (chat, borradores, itinerarios) nunca se
 * muestre a otra persona y se rehidrate desde el ámbito correcto.
 */
export function withStorageScope<P extends object>(Component: React.ComponentType<P>): React.FC<P> {
  const Scoped: React.FC<P> = (props) => {
    const scope = useStorageScope();
    return <Component key={scope} {...props} />;
  };
  Scoped.displayName = `WithStorageScope(${Component.displayName || Component.name || 'Component'})`;
  return Scoped;
}
