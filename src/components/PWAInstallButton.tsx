import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Language } from '../types';
import { Download, X, Smartphone } from 'lucide-react';
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

  const btnText = language === 'es' ? 'App Móvil' : 'Install App';

  const handleClick = async () => {
    if (isInstallable) {
      await install();
    } else {
      setShowGuide(true);
    }
  };

  return (
    <>
      <button
        onClick={handleClick}
        className="flex items-center gap-1.5 bg-emerald-950/70 hover:bg-emerald-900/80 px-2.5 sm:px-3 py-1.5 rounded-xl border border-emerald-500/40 text-[11px] font-bold text-emerald-200 hover:text-white transition-all cursor-pointer shadow-sm group"
        title={language === 'es' ? 'Instalar Aplicación Móvil PWA' : 'Install PWA Mobile App'}
      >
        <Download className="w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition-transform" />
        <span className="hidden sm:inline">{btnText}</span>
      </button>

      <AnimatePresence>
        {showGuide && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="w-full max-w-sm rounded-[2rem] bg-[#07241a] border border-emerald-500/40 p-6 sm:p-8 shadow-[0_10px_50px_rgba(0,0,0,0.8)] text-stone-100 relative"
            >
              <button 
                onClick={() => setShowGuide(false)}
                className="absolute top-4 right-4 p-2 text-emerald-400 hover:text-white rounded-full bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/30 transition-colors"
                aria-label="Cerrar guía"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-amber-400/20 text-amber-400 flex items-center justify-center border border-amber-400/30">
                  <Smartphone className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-black text-white">
                  {language === 'es' ? 'Instalar App Costa Rica' : 'Install Costa Rica App'}
                </h3>
              </div>
              
              <div className="space-y-3.5 text-xs text-stone-200 bg-[#051c14] p-4 rounded-2xl border border-emerald-500/20">
                {isIOS ? (
                  <>
                    <p className="flex items-start gap-2.5">
                      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-amber-400 text-stone-950 font-black text-[10px] shrink-0 mt-0.5">1</span>
                      <span>{language === 'es' ? 'Toca el botón' : 'Tap the'} <strong className="text-amber-300">{language === 'es' ? 'Compartir' : 'Share'}</strong> {language === 'es' ? 'en la barra de Safari.' : 'button in Safari.'}</span>
                    </p>
                    <p className="flex items-start gap-2.5">
                      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-amber-400 text-stone-950 font-black text-[10px] shrink-0 mt-0.5">2</span>
                      <span>{language === 'es' ? 'Selecciona' : 'Select'} <strong className="text-amber-300">{language === 'es' ? 'Agregar a Inicio' : 'Add to Home Screen'}</strong>.</span>
                    </p>
                  </>
                ) : (
                  <>
                    <p className="flex items-start gap-2.5">
                      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-amber-400 text-stone-950 font-black text-[10px] shrink-0 mt-0.5">1</span>
                      <span>{language === 'es' ? 'Abre el menú de opciones (⋮) de tu navegador.' : 'Open your browser menu (⋮).'}</span>
                    </p>
                    <p className="flex items-start gap-2.5">
                      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-amber-400 text-stone-950 font-black text-[10px] shrink-0 mt-0.5">2</span>
                      <span>{language === 'es' ? 'Toca' : 'Tap'} <strong className="text-amber-300">{language === 'es' ? 'Instalar aplicación' : 'Install app'}</strong> {language === 'es' ? 'o' : 'or'} <strong className="text-amber-300">{language === 'es' ? 'Agregar a pantalla principal' : 'Add to Home'}</strong>.</span>
                    </p>
                  </>
                )}
              </div>
              
              <button
                onClick={() => setShowGuide(false)}
                className="mt-6 w-full rounded-full bg-amber-500 hover:bg-amber-400 py-3 text-xs font-black text-stone-950 uppercase tracking-wider transition-colors shadow-lg cursor-pointer"
              >
                {language === 'es' ? '¡Entendido!' : 'Got it!'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
