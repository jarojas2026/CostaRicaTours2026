import React from 'react';
import { motion } from 'motion/react';
import { Bus, Map, Tent, Calendar, Navigation, Ticket, MessageCircle } from 'lucide-react';
import { Language } from '../types';

interface ServicesSectionProps {
  language: Language;
}

export const ServicesSection: React.FC<ServicesSectionProps> = ({ language }) => {
  const services = [
    {
      id: 'tours',
      icon: <Map className="w-8 h-8 text-teal-600" />,
      titleEs: 'Tours y Actividades',
      titleEn: 'Tours & Activities',
      descEs: 'Descubre los mejores destinos turísticos y experiencias únicas en todo el país.',
      descEn: 'Discover the best tourist destinations and unique experiences across the country.'
    },
    {
      id: 'transport',
      icon: <Bus className="w-8 h-8 text-teal-600" />,
      titleEs: 'Transporte',
      titleEn: 'Transportation',
      descEs: 'Shuttles compartidos, privados y alquiler de vehículos con cobertura nacional.',
      descEn: 'Shared and private shuttles, and vehicle rentals with nationwide coverage.'
    },
    {
      id: 'lodging',
      icon: <Tent className="w-8 h-8 text-teal-600" />,
      titleEs: 'Alojamiento',
      titleEn: 'Lodging',
      descEs: 'Desde ecolodges inmersos en la selva hasta resorts de lujo frente al mar.',
      descEn: 'From ecolodges immersed in the jungle to luxury beachfront resorts.'
    },
    {
      id: 'itinerary',
      icon: <Calendar className="w-8 h-8 text-teal-600" />,
      titleEs: 'Diseño de Itinerarios',
      titleEn: 'Itinerary Planning',
      descEs: 'Organización a la medida para aprovechar al máximo tu tiempo y presupuesto.',
      descEn: 'Tailor-made organization to make the most of your time and budget.'
    },
    {
      id: 'guides',
      icon: <Navigation className="w-8 h-8 text-teal-600" />,
      titleEs: 'Guías Locales',
      titleEn: 'Local Guides',
      descEs: 'Guías expertos locales para acompañarte en tu aventura.',
      descEn: 'Local expert guides to accompany you on your adventure.'
    },
    {
      id: 'tickets',
      icon: <Ticket className="w-8 h-8 text-teal-600" />,
      titleEs: 'Entradas',
      titleEn: 'Tickets',
      descEs: 'Gestión de entradas a parques nacionales y reservas biológicas.',
      descEn: 'Management of tickets to national parks and biological reserves.'
    }
  ];

  const handleServiceClick = (serviceId: string, titleEs: string, titleEn: string) => {
    const serviceName = language === 'es' ? titleEs : titleEn;
    const defaultMessage = language === 'es' 
      ? `Hola Costa Rica Tours (costaricatours.es), quisiera más información sobre sus servicios de: ${serviceName}`
      : `Hello Costa Rica Tours (costaricatours.es), I would like more information about your services for: ${serviceName}`;
    
    const text = encodeURIComponent(defaultMessage);
    const whatsappUrl = `https://wa.me/50687959148?text=${text}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <section className="py-16 bg-transparent border-b border-emerald-900/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-black text-white uppercase tracking-tight mb-4">
            {language === 'es' ? 'Nuestros Servicios' : 'Our Services'}
          </h2>
          <p className="text-neutral-400 max-w-2xl mx-auto text-lg">
            {language === 'es' 
              ? 'Somos tu socio integral en Costa Rica. Te ofrecemos todo lo necesario para que tu viaje sea perfecto.' 
              : 'We are your comprehensive partner in Costa Rica. We offer everything you need to make your trip perfect.'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service, index) => (
            <motion.div
              key={service.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="bg-emerald-950/60 backdrop-blur-md p-8 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.3)] hover:shadow-[0_0_30px_rgba(99,102,241,0.2)] border border-white/10 hover:border-amber-500/50 transition-all duration-300 flex flex-col group relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-[50px] -translate-y-1/2 translate-x-1/2 group-hover:bg-amber-400/20 transition-colors"></div>
              
              <div className="bg-emerald-900 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 shadow-md border border-white/10/50 group-hover:scale-110 transition-transform">
                {service.icon}
              </div>
              <h3 className="text-xl font-bold text-white mb-2 uppercase tracking-wide">
                {language === 'es' ? service.titleEs : service.titleEn}
              </h3>
              <p className="text-emerald-100/70 leading-relaxed flex-1">
                {language === 'es' ? service.descEs : service.descEn}
              </p>
              
              <button
                onClick={() => handleServiceClick(service.id, service.titleEs, service.titleEn)}
                className="mt-6 flex items-center gap-2 text-amber-400 hover:text-amber-300 font-bold uppercase text-sm tracking-wider transition-colors z-10"
              >
                <MessageCircle className="w-5 h-5" />
                {language === 'es' ? 'Consultar ahora' : 'Inquire Now'}
              </button>
            </motion.div>
          ))}
        </div>

        </div>
    </section>
  );
};
