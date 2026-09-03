import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Language } from '../types';
import { Download, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface PWAInstallButtonProps {
  language: Language;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ language }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  const btnText = language === 'es' ? 'Instalar App' : 'Install App';

  const handleClick = async () => {
    if (isInstallable) {
      const success = await install();
      if (!success) setShowGuide(true);
    } else {
      setShowGuide(true);
    }
  };

  return (
    <>
      <button
        onClick={handleClick}
        className={`flex items-center gap-2 rounded-full px-2.5 sm:px-4 py-2 sm:py-2 text-xs font-bold uppercase tracking-wider transition shadow-md ${
          isInstallable 
            ? 'bg-stone-900 text-white hover:bg-stone-800' 
            : 'bg-white text-stone-900 border border-stone-200 hover:bg-stone-50'
        }`}
      >
        <Download className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">{btnText}</span>
      </button>

      <AnimatePresence>
        {showGuide && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-sm rounded-[2rem] bg-white p-6 sm:p-8 shadow-2xl relative"
            >
              <button 
                onClick={() => setShowGuide(false)}
                className="absolute top-4 right-4 p-2 text-stone-400 hover:text-stone-900 rounded-full bg-stone-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              <h3 className="text-xl font-black text-stone-900 mb-4 font-heading">
                {language === 'es' ? 'Instalar Aplicación' : 'Install Application'}
              </h3>
              
              <div className="space-y-4 text-sm text-stone-600 font-medium bg-stone-50 p-5 rounded-2xl border border-stone-100">
                {isIOS ? (
                  <>
                    <p className="flex items-start gap-3">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-orange-100 text-orange-600 font-bold shrink-0">1</span>
                      <span>{language === 'es' ? 'Toca el botón' : 'Tap the'} <strong>{language === 'es' ? 'Compartir' : 'Share'}</strong> {language === 'es' ? 'en la barra inferior de Safari.' : 'button in Safari toolbar.'}</span>
                    </p>
                    <p className="flex items-start gap-3">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-orange-100 text-orange-600 font-bold shrink-0">2</span>
                      <span>{language === 'es' ? 'Desliza hacia abajo y selecciona' : 'Scroll down and select'} <strong>{language === 'es' ? 'Agregar a Inicio' : 'Add to Home Screen'}</strong>.</span>
                    </p>
                  </>
                ) : (
                  <>
                    <p className="flex items-start gap-3">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-orange-100 text-orange-600 font-bold shrink-0">1</span>
                      <span>{language === 'es' ? 'Abre el menú de opciones (⋮) de tu navegador.' : 'Open your browser options menu (⋮).'}</span>
                    </p>
                    <p className="flex items-start gap-3">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-orange-100 text-orange-600 font-bold shrink-0">2</span>
                      <span>{language === 'es' ? 'Selecciona' : 'Select'} <strong>{language === 'es' ? 'Instalar aplicación' : 'Install app'}</strong> {language === 'es' ? 'o' : 'or'} <strong>{language === 'es' ? 'Agregar a inicio' : 'Add to Home screen'}</strong>.</span>
                    </p>
                  </>
                )}
              </div>
              
              <button
                onClick={() => setShowGuide(false)}
                className="mt-6 w-full rounded-full bg-stone-900 py-3.5 text-sm font-bold text-white hover:bg-stone-800 uppercase tracking-wider"
              >
                {language === 'es' ? 'Entendido' : 'Got it'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
