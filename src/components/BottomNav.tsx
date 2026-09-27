import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, Compass, Bot, Route } from 'lucide-react';
import { Language } from '../types';

interface BottomNavProps {
  language: Language;
  activeTab: string;
}

export const BottomNav: React.FC<BottomNavProps> = ({ language, activeTab }) => {
  const navigate = useNavigate();
  const t = (es: string, en: string) => language === 'es' ? es : en;

  const handleTabSelect = (tab: string) => {
    if (tab === 'home') navigate('/');
    else navigate(`/${tab}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Revenue-first mobile navigation: keep the customer focused on discovery,
  // booking, trip management and one unified AI concierge. Secondary utilities
  // (map, flights, culture, tools) remain available inside the journey/home UI.
  const navItems = [
    { id: 'home', label: t('Explorar', 'Explore'), icon: <Home className="w-5 h-5" /> },
    { id: 'tours', label: t('Reservar', 'Book'), icon: <Compass className="w-5 h-5" /> },
    { id: 'trip', label: t('Mi viaje', 'My trip'), icon: <Route className="w-5 h-5" /> },
    {
      id: 'ai',
      label: t('Asistente', 'Assistant'),
      icon: <Bot className="w-5 h-5" />,
      badge: '24/7'
    },
  ];

  const normalizedActiveTab = activeTab === 'itinerary' || activeTab === 'bookings'
    ? 'trip'
    : activeTab;

  return (
    <div className="lg:hidden fixed bottom-3 left-4 right-4 z-[60] max-w-md mx-auto pointer-events-auto">
      <nav
        className="grid grid-cols-4 items-center h-14 px-2 bg-[#02140c]/90 backdrop-blur-2xl border border-emerald-500/30 rounded-full shadow-[0_10px_30px_rgba(0,0,0,0.4)]"
        aria-label={t('Navegación principal', 'Primary navigation')}
      >
        {navItems.map((item) => {
          const isActive = normalizedActiveTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleTabSelect(item.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`relative flex flex-col items-center justify-center w-full h-full space-y-0.5 transition-all cursor-pointer ${
                isActive
                  ? 'text-emerald-300 font-extrabold'
                  : 'text-stone-400 hover:text-white'
              }`}
            >
              {item.badge && !isActive && (
                <span className="absolute top-1 right-2 text-[8px] bg-amber-400 text-stone-950 font-black px-1.5 py-0.2 rounded-full scale-90 shadow-sm">
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
