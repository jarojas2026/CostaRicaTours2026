import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '../firebase';
import { Tour } from '../types';
import { useLocalTours } from '../hooks/useLocalTours';

interface ToursContextType {
  tours: Tour[];
  loading: boolean;
  favorites: string[];
  toggleFavorite: (tourId: string) => void;
  isFavorite: (tourId: string) => boolean;
}

const ToursContext = createContext<ToursContextType>({
  tours: [],
  loading: true,
  favorites: [],
  toggleFavorite: () => {},
  isFavorite: () => false
});

import { mergeRemoteTours, type RemoteTourDoc } from '../utils/mergeRemoteTours';
import { getPersonalJSON, getStorageScopeKey, setPersonalJSON } from '../utils/privateStorage';
import { useStorageScope } from '../hooks/useStorageScope';

const FAVORITES_KEY = 'costa_rica_tours_favorites' as const;


export const ToursProvider = ({ children }: { children: ReactNode }) => {
  // The ~180 kB local catalog is a lazily loaded chunk (src/data/loadTours.ts).
  const localTours = useLocalTours();
  // null = Firestore has not answered (or failed): fall back to the local catalog.
  const [remoteTours, setRemoteTours] = useState<RemoteTourDoc[] | null>(null);
  // Favoritos personales: se leen del ámbito activo (visitante → sessionStorage,
  // usuario → clave con uid) y se recargan al cambiar de identidad, sin
  // escribir nunca la lista de una persona en el ámbito de otra.
  const storageScope = useStorageScope();
  const readFavorites = () => {
    const saved = getPersonalJSON<unknown>(FAVORITES_KEY, []);
    return Array.isArray(saved) ? saved.filter((id): id is string => typeof id === 'string') : [];
  };
  const [favoritesState, setFavoritesState] = useState<{ scope: string; ids: string[] }>(() => ({ scope: storageScope, ids: readFavorites() }));
  const favorites = favoritesState.scope === storageScope ? favoritesState.ids : [];

  useEffect(() => {
    if (favoritesState.scope !== storageScope) setFavoritesState({ scope: storageScope, ids: readFavorites() });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageScope]);

  const toggleFavorite = (tourId: string) => {
    setFavoritesState(prev => {
      const current = prev.scope === getStorageScopeKey() ? prev.ids : readFavorites();
      const ids = current.includes(tourId) ? current.filter(id => id !== tourId) : [...current, tourId];
      setPersonalJSON(FAVORITES_KEY, ids);
      return { scope: getStorageScopeKey(), ids };
    });
  };

  const isFavorite = (tourId: string) => favorites.includes(tourId);

  useEffect(() => {
    try {
      const q = query(collection(db, 'tours'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const fetchedTours: RemoteTourDoc[] = [];
        snapshot.forEach((doc) => {
          fetchedTours.push({ tour: doc.data() as Tour, docId: doc.id });
        });
        setRemoteTours(fetchedTours);
      }, (err) => {
        console.warn("Error fetching tours from Firestore, falling back to local dataset:", err);
        setRemoteTours(null);
      });

      return () => unsubscribe();
    } catch (e) {
      console.warn("Firestore query failed:", e);
      setRemoteTours(null);
    }
  }, []);

  const tours = useMemo<Tour[]>(
    () => remoteTours && remoteTours.length > 0 ? mergeRemoteTours(remoteTours, localTours) : [...localTours],
    [remoteTours, localTours]
  );

  return (
    <ToursContext.Provider value={{
      tours,
      loading: tours.length === 0,
      favorites,
      toggleFavorite,
      isFavorite
    }}>
      {children}
    </ToursContext.Provider>
  );
};

export const useTours = () => useContext(ToursContext);
