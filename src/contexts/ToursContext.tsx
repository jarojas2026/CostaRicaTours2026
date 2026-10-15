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


export const ToursProvider = ({ children }: { children: ReactNode }) => {
  // The ~180 kB local catalog is a lazily loaded chunk (src/data/loadTours.ts).
  const localTours = useLocalTours();
  // null = Firestore has not answered (or failed): fall back to the local catalog.
  const [remoteTours, setRemoteTours] = useState<RemoteTourDoc[] | null>(null);
  const [favorites, setFavorites] = useState<string[]>(() => {
    const saved = localStorage.getItem('costa_rica_tours_favorites');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('costa_rica_tours_favorites', JSON.stringify(favorites));
  }, [favorites]);

  const toggleFavorite = (tourId: string) => {
    setFavorites(prev =>
      prev.includes(tourId)
        ? prev.filter(id => id !== tourId)
        : [...prev, tourId]
    );
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
