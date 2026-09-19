import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '../firebase';
import { Tour } from '../types';
import { TOURS } from '../data/toursData';

interface ToursContextType {
  tours: Tour[];
  loading: boolean;
  favorites: string[];
  toggleFavorite: (tourId: string) => void;
  isFavorite: (tourId: string) => boolean;
}

const ToursContext = createContext<ToursContextType>({ 
  tours: TOURS, 
  loading: false,
  favorites: [],
  toggleFavorite: () => {},
  isFavorite: () => false
});

export const ToursProvider = ({ children }: { children: ReactNode }) => {
  const [tours, setTours] = useState<Tour[]>(TOURS);
  const [loading, setLoading] = useState(false);
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
        const fetchedTours: Tour[] = [];
        snapshot.forEach((doc) => {
          fetchedTours.push(doc.data() as Tour);
        });
        if (fetchedTours.length > 0) {
          fetchedTours.sort((a, b) => (a.id || '').localeCompare(b.id || ''));
          setTours(fetchedTours);
        } else {
          setTours(TOURS);
        }
        setLoading(false);
      }, (err) => {
        console.warn("Error fetching tours from Firestore, falling back to local dataset:", err);
        setTours(TOURS);
        setLoading(false);
      });

      return () => unsubscribe();
    } catch (e) {
      console.warn("Firestore query failed:", e);
      setTours(TOURS);
      setLoading(false);
    }
  }, []);

  return (
    <ToursContext.Provider value={{ 
      tours: tours.length > 0 ? tours : TOURS, 
      loading,
      favorites,
      toggleFavorite,
      isFavorite
    }}>
      {children}
    </ToursContext.Provider>
  );
};

export const useTours = () => useContext(ToursContext);
