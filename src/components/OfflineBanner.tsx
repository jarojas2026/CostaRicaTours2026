import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi, ShieldCheck, QrCode } from 'lucide-react';
import { BookingRequest } from '../types';

interface OfflineBannerProps {
  language?: 'es' | 'en';
}

export const OfflineBanner: React.FC<OfflineBannerProps> = ({ language = 'es' }) => {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [showOfflineModal, setShowOfflineModal] = useState<boolean>(false);
  const [cachedBookings, setCachedBookings] = useState<BookingRequest[]>([]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => {
      setIsOnline(false);
      // Load cached bookings from localStorage
      try {
        const saved = localStorage.getItem('cr_tours_my_bookings');
        if (saved) {
          setCachedBookings(JSON.parse(saved));
        }
      } catch (e) {
        console.error('Error loading offline bookings', e);
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <>
      <div className="bg-amber-500 text-stone-950 px-4 py-2 text-xs font-bold flex items-center justify-between sticky top-0 z-50 shadow-md">
        <div className="flex items-center gap-2">
          <WifiOff className="w-4 h-4 animate-pulse" />
          <span>
            {language === 'es' 
              ? 'Modo sin conexión activado (Estás explorando reservas guardadas)' 
              : 'Offline mode active (Browsing saved bookings)'}
          </span>
        </div>
        <button
          onClick={() => setShowOfflineModal(true)}
          className="bg-stone-950 text-amber-400 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider hover:bg-stone-900 transition-all cursor-pointer shadow-sm flex items-center gap-1"
        >
          <QrCode className="w-3 h-3" />
          <span>{language === 'es' ? 'Ver Vouchers Offline' : 'View Offline Vouchers'}</span>
        </button>
      </div>

      {showOfflineModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <div className="bg-[#052118] border border-emerald-500/30 rounded-3xl p-6 max-w-lg w-full shadow-2xl text-white space-y-6 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-emerald-500/20 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-400/20 text-amber-400 flex items-center justify-center font-bold">
                  📱
                </div>
                <div>
                  <h3 className="text-lg font-bold">
                    {language === 'es' ? 'Tus Vouchers Guardados (Offline)' : 'Your Saved Offline Vouchers'}
                  </h3>
                  <p className="text-xs text-stone-300">
                    {language === 'es' ? 'Disponibles sin señal en la selva o montaña' : 'Available without signal in rainforest or mountains'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowOfflineModal(false)}
                className="w-9 h-9 bg-emerald-950 text-stone-300 hover:text-white rounded-full flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            {cachedBookings.length === 0 ? (
              <div className="text-center py-8 text-stone-400 space-y-3">
                <ShieldCheck className="w-12 h-12 text-emerald-500 mx-auto opacity-50" />
                <p className="text-sm">
                  {language === 'es' 
                    ? 'No hay reservas almacenadas en este dispositivo todavía.' 
                    : 'No bookings stored on this device yet.'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {cachedBookings.map((b, idx) => (
                  <div key={idx} className="bg-[#03140e] border border-emerald-500/25 p-4 rounded-2xl space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-mono text-amber-400 font-bold">{b.bookingId}</span>
                      <span className="bg-emerald-500/20 text-emerald-300 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase">
                        {b.status}
                      </span>
                    </div>
                    <h4 className="font-bold text-base text-white">{b.tourName}</h4>
                    <div className="text-xs text-stone-300 grid grid-cols-2 gap-1 pt-1">
                      <div>📅 Fecha: <strong className="text-white">{b.date}</strong></div>
                      <div>👥 Personas: <strong className="text-white">{b.adults} Ad.</strong></div>
                      <div>👤 Titular: <strong className="text-white">{b.customerName}</strong></div>
                      <div>💵 Total: <strong className="text-amber-400">${b.totalUSD}</strong></div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => setShowOfflineModal(false)}
              className="w-full btn-primary"
            >
              {language === 'es' ? 'Cerrar' : 'Close'}
            </button>
          </div>
        </div>
      )}
    </>
  );
};
