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
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-[60] bg-[#02130c]/95 backdrop-blur-2xl border-t border-emerald-500/25 safe-area-bottom pb-[env(safe-area-inset-bottom)] shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
      <nav className="flex justify-around items-center h-16 px-1 max-w-lg mx-auto">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleTabSelect(item.id)}
              className={`relative flex flex-col items-center justify-center w-full h-full space-y-0.5 transition-all cursor-pointer ${
                isActive 
                  ? 'text-amber-400 font-black' 
                  : 'text-emerald-200/60 hover:text-white'
              }`}
            >
              {item.badge && !isActive && (
                <span className="absolute top-1 right-2 text-[8px] bg-amber-400 text-stone-950 font-black px-1.5 py-0.2 rounded-full scale-90 shadow-sm">
                  {item.badge}
                </span>
              )}
              
              <div className={`p-1.5 rounded-xl transition-all ${
                isActive ? 'bg-amber-400/15 text-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.25)]' : ''
              }`}>
                {item.icon}
              </div>

              <span className={`text-[9px] uppercase tracking-wider line-clamp-1 ${
                isActive ? 'font-black text-amber-400' : 'font-semibold text-emerald-200/60'
              }`}>
                {item.label}
              </span>

              {isActive && (
                <div className="w-5 h-0.5 bg-amber-400 rounded-full shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
};
