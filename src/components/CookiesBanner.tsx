import React, { useState, useEffect } from 'react';
import { Language } from '../types';
import { Cookie, X, Check, Settings, ShieldAlert } from 'lucide-react';

interface CookiesBannerProps {
  language: Language;
}

export const CookiesBanner: React.FC<CookiesBannerProps> = ({ language }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('cookie-consent');
    if (!consent) {
      setIsVisible(true);
    }
  }, []);

  const handleAcceptAll = () => {
    localStorage.setItem('cookie-consent', 'all');
    setIsVisible(false);
  };

  const handleReject = () => {
    localStorage.setItem('cookie-consent', 'essential');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[110] bg-emerald-950 border-t border-amber-500/30 p-4 sm:p-6 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] animate-in slide-in-from-bottom-full duration-500">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        
        <div className="flex items-start gap-4 max-w-3xl">
          <div className="w-10 h-10 rounded-full bg-emerald-900/50 border border-amber-500/30 flex items-center justify-center shrink-0 shadow-lg">
            <Cookie className="w-5 h-5 text-amber-400" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-white font-black uppercase tracking-wider text-sm">
              {language === 'es' ? 'Privacidad y Cookies' : 'Privacy & Cookies'}
            </h3>
            <p className="text-emerald-100/80 text-xs leading-relaxed">
              {language === 'es' 
                ? 'Usamos cookies para mejorar tu experiencia, analizar tráfico y personalizar contenido. Puedes aceptar todas, rechazar las no esenciales o personalizar tu elección. Más detalles en nuestra Política de Privacidad.'
                : 'We use cookies to improve your experience, analyze traffic, and personalize content. You can accept all, reject non-essential ones, or customize your choice. More details in our Privacy Policy.'}
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full md:w-auto shrink-0">
          <button
            onClick={handleReject}
            className="px-5 py-2.5 rounded-xl border border-white/20 text-neutral-300 hover:text-white hover:bg-white/5 font-bold text-xs uppercase tracking-wider transition-colors text-center"
          >
            {language === 'es' ? 'Rechazar' : 'Reject'}
          </button>
          
          <button
            onClick={handleAcceptAll}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-teal-600 hover:from-amber-500 hover:to-amber-500 text-white font-black text-xs uppercase tracking-wider shadow-lg hover:scale-105 transition-all text-center flex items-center justify-center gap-1.5"
          >
            <Check className="w-3.5 h-3.5" />
            {language === 'es' ? 'Aceptar Todas' : 'Accept All'}
          </button>
        </div>
      </div>
    </div>
  );
};
