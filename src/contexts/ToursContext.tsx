import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '../firebase';
import { Tour } from '../types';

interface ToursContextType {
  tours: Tour[];
  loading: boolean;
}

const ToursContext = createContext<ToursContextType>({ tours: [], loading: true });

export const ToursProvider = ({ children }: { children: ReactNode }) => {
  const [tours, setTours] = useState<Tour[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'tours'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedTours: Tour[] = [];
      snapshot.forEach((doc) => {
        fetchedTours.push(doc.data() as Tour);
      });
      // Optionally sort by ID or price to keep consistent order
      fetchedTours.sort((a, b) => a.id.localeCompare(b.id));
      setTours(fetchedTours);
      setLoading(false);
    }, (err) => {
      console.error("Error fetching tours:", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <ToursContext.Provider value={{ tours, loading }}>
      {children}
    </ToursContext.Provider>
  );
};

export const useTours = () => useContext(ToursContext);
