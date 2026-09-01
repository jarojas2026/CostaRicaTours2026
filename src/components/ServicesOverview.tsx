import React from 'react';
import { TOURIST_SERVICES, TouristService } from '../data/toursData';
import { Language, Currency } from '../types';
import { Bus, Car, Hotel, UserCheck, Wifi, ArrowRight, ShieldCheck } from 'lucide-react';

interface ServicesOverviewProps {
  language: Language;
  currency: Currency;
  onBookService: (service: TouristService) => void;
}

export const ServicesOverview: React.FC<ServicesOverviewProps> = ({
  language,
  currency,
  onBookService
}) => {
  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'Bus': return <Bus className="w-6 h-6 text-[#FF8C00]" />;
      case 'Car': return <Car className="w-6 h-6 text-[#FF8C00]" />;
      case 'UserCheck': return <UserCheck className="w-6 h-6 text-[#FF8C00]" />;
      case 'Hotel': return <Hotel className="w-6 h-6 text-[#FF8C00]" />;
      case 'Wifi': return <Wifi className="w-6 h-6 text-[#FF8C00]" />;
      default: return <Bus className="w-6 h-6 text-[#FF8C00]" />;
    }
  };

  return (
    <section className="bg-emerald-950 py-12 px-4 sm:px-6 lg:px-8 border-t border-white/10">
      <div className="max-w-7xl mx-auto space-y-8">
        
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-4 py-1 bg-emerald-950 text-amber-400 rounded-full text-xs font-bold uppercase tracking-widest border border-white/10">
            <ShieldCheck className="w-3.5 h-3.5 text-[#FF8C00]" />
            {language === 'es' ? 'Logística y Complementos' : 'Logistics & Extras'}
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-white uppercase tracking-tight">
            {language === 'es' ? 'Servicios Esenciales para tu Viaje' : 'Essential Services for Your Trip'}
          </h2>
          <p className="text-xs sm:text-sm text-[#A7F3D0] max-w-2xl mx-auto">
            {language === 'es'
              ? 'Reserva traslados directos desde el aeropuerto, alquiler de autos 4x4, pases de día en termales y conexión a internet.'
              : 'Book airport shuttles, 4x4 rentals, hot springs day passes, and 5G tourist SIM cards.'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {TOURIST_SERVICES.map((srv) => (
            <div
              key={srv.id}
              className="bg-emerald-950 p-6 rounded-[2rem] border-2 border-white/10 hover:border-amber-500 transition-all flex flex-col justify-between space-y-4 shadow-xl"
            >
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <div className="p-3 bg-emerald-950 rounded-2xl border border-white/10">
                    {getIcon(srv.icon)}
                  </div>
                  <span className="bg-[#FF8C00] text-white text-[10px] font-black uppercase px-3 py-1 rounded-full">
                    {srv.badge[language]}
                  </span>
                </div>

                <h3 className="text-base font-black text-white uppercase leading-snug">
                  {srv.title[language]}
                </h3>

                <p className="text-xs text-[#A7F3D0] leading-relaxed">
                  {srv.description[language]}
                </p>
              </div>

              <div className="pt-4 border-t border-white/10 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase text-[#A7F3D0] block font-bold">Desde</span>
                  <span className="text-lg font-black text-amber-400">
                    ${srv.priceUSD} USD <span className="text-xs font-normal text-white/70">/ servicio</span>
                  </span>
                </div>

                <button
                  onClick={() => onBookService(srv)}
                  className="bg-emerald-950 hover:bg-emerald-900 text-amber-400 border border-white/10 hover:border-amber-500 text-xs font-black uppercase px-4 py-2.5 rounded-full transition-colors flex items-center gap-1.5"
                >
                  <span>{language === 'es' ? 'Consultar' : 'Inquire'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};
