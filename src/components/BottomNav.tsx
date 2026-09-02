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
    <div className={`xl:hidden fixed bottom-0 left-0 right-0 z-[100] bg-[#0A2315]/95 backdrop-blur-2xl border-t border-teal-500/30 safe-area-bottom pb-[env(safe-area-inset-bottom)]`}>
      <nav className="flex justify-around items-center h-16 px-1 max-w-lg mx-auto">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleTabSelect(item.id)}
              className={`relative flex flex-col items-center justify-center w-full h-full space-y-1 transition-all cursor-pointer ${
                isActive 
                  ? 'text-orange-400 font-black' 
                  : 'text-neutral-400 hover:text-teal-300'
              }`}
            >
              {item.badge && !isActive && (
                <span className="absolute top-1 right-2 text-[8px] bg-orange-400 text-stone-950 font-black px-1 rounded-full scale-90">
                  {item.badge}
                </span>
              )}
              
              <div className={`p-1 rounded-xl transition-all ${
                isActive ? 'bg-stone-900/80 shadow-sm scale-110' : ''
              }`}>
                {item.icon}
              </div>

              <span className="text-[9px] font-bold uppercase tracking-wider line-clamp-1">
                {item.label}
              </span>

              {isActive && (
                <div className="w-4 h-0.5 bg-orange-400 rounded-full mt-0.5" />
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
};
