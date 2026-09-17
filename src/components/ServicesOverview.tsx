import React from 'react';
import { TOURIST_SERVICES, TouristService } from '../data/toursData';
import { Language, Currency } from '../types';
import { Bus, Car, Hotel, UserCheck, Wifi, ArrowRight, ShieldCheck } from 'lucide-react';
import { getLangText } from '../utils/i18n';

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
    <section className="bg-white py-12 px-4 sm:px-6 lg:px-8 border-t border-black/10">
      <div className="max-w-7xl mx-auto space-y-8">
        
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-4 py-1 bg-[#041711] text-amber-400 rounded-full text-xs font-bold uppercase tracking-widest border border-emerald-500/20">
            <ShieldCheck className="w-3.5 h-3.5" />
            {language === 'es' ? 'Logística y Complementos' : 'Logistics & Extras'}
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-[#041711] uppercase tracking-tight">
            {language === 'es' ? 'Servicios Esenciales para tu Viaje' : 'Essential Services for Your Trip'}
          </h2>
          <p className="text-xs sm:text-sm text-stone-600 max-w-2xl mx-auto">
            {language === 'es'
              ? 'Reserva traslados directos desde el aeropuerto, alquiler de autos 4x4, pases de día en termales y conexión a internet.'
              : 'Book airport shuttles, 4x4 rentals, hot springs day passes, and 5G tourist SIM cards.'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {TOURIST_SERVICES.map((srv) => (
            <div
              key={srv.id}
              className="bg-white p-6 rounded-[2rem] border-2 border-stone-100 hover:border-amber-500 transition-all flex flex-col justify-between space-y-4 shadow-xl"
            >
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <div className="p-3 bg-stone-50 rounded-2xl border border-stone-100">
                    {getIcon(srv.icon)}
                  </div>
                  <span className="bg-amber-500 text-stone-950 text-[10px] font-black uppercase px-3 py-1 rounded-full">
                    {getLangText(srv.badge, language)}
                  </span>
                </div>

                <h3 className="text-base font-black text-[#041711] uppercase leading-snug">
                  {getLangText(srv.title, language)}
                </h3>

                <p className="text-xs text-stone-600 leading-relaxed">
                  {getLangText(srv.description, language)}
                </p>
              </div>

              <div className="pt-4 border-t border-stone-100 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase text-stone-400 block font-bold">{language === 'es' ? 'Desde' : 'From'}</span>
                  <span className="text-lg font-black text-amber-600">
                    ${srv.priceUSD} USD <span className="text-xs font-normal text-stone-400">/ service</span>
                  </span>
                </div>

                <button
                  onClick={() => onBookService(srv)}
                  className="bg-[#041711] hover:bg-[#072a1c] text-white text-xs font-black uppercase px-4 py-2.5 rounded-full transition-colors flex items-center gap-1.5"
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
