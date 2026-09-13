import React, { useState, useEffect } from 'react';
import { Home, Compass, Map, Bot, Bus, Coffee, Sparkles, Plane } from 'lucide-react';
import { Language } from '../types';

interface BottomNavProps {
  language: Language;
  activeTab: string;
  setActiveTab: (tab: any) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ language, activeTab, setActiveTab }) => {
  const t = (es: string, en: string) => language === 'es' ? es : en;
  
  

  const handleTabSelect = (tab: any) => {
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  

  const navItems = [
    { id: 'home', label: t('Inicio', 'Home'), icon: <Home className="w-5 h-5" /> },
    { id: 'tours', label: t('Tours', 'Tours'), icon: <Compass className="w-5 h-5" /> },
    { id: 'map', label: t('Mapa', 'Map'), icon: <Map className="w-5 h-5" /> },
    { 
      id: 'ai', 
      label: t('Asistente', 'AI Assistant'), 
      icon: <Bot className="w-5 h-5" />,
      badge: 'Smart'
    },
    { id: 'flights', label: t('Vuelos', 'Flights'), icon: <Plane className="w-5 h-5" /> },
  ];

  return (
    <div className="lg:hidden fixed bottom-3 left-4 right-4 z-[60] max-w-md mx-auto pointer-events-auto">
      <nav className="flex justify-around items-center h-14 px-2 bg-[#02140c]/90 backdrop-blur-2xl border border-emerald-500/30 rounded-full shadow-[0_10px_30px_rgba(0,0,0,0.4)]">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleTabSelect(item.id)}
              className={`relative flex flex-col items-center justify-center w-full h-full space-y-0.5 transition-all cursor-pointer ${
                isActive 
                  ? 'text-emerald-300 font-extrabold' 
                  : 'text-stone-400 hover:text-white'
              }`}
            >
              {item.badge && !isActive && (
                <span className="absolute top-1 right-2 text-[8px] bg-emerald-500 text-stone-950 font-black px-1.5 py-0.2 rounded-full scale-90 shadow-sm">
                  {item.badge}
                </span>
              )}
              
              <div className={`p-1 rounded-xl transition-all ${
                isActive ? 'bg-emerald-500/20 text-emerald-300 scale-105' : ''
              }`}>
                {item.icon}
              </div>

              <span className={`text-[9px] tracking-tight line-clamp-1 ${
                isActive ? 'font-bold text-emerald-300' : 'font-medium text-stone-400'
              }`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};
