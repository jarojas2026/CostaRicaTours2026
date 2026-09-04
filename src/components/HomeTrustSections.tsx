import React from 'react';
import { 
  Sparkles, 
  Compass, 
  CreditCard, 
  QrCode, 
  Star, 
  CheckCircle, 
  ShieldCheck, 
  Users, 
  PhoneCall, 
  ArrowRight,
  HeartHandshake,
  Award
} from 'lucide-react';
import { motion } from 'motion/react';
import { Language } from '../types';

interface HomeTrustSectionsProps {
  language: Language;
  onOpenCustomFunnel: () => void;
  onOpenItineraryPlanner: () => void;
  onExploreTours: () => void;
}

export const HomeTrustSections: React.FC<HomeTrustSectionsProps> = ({
  language,
  onOpenCustomFunnel,
  onOpenItineraryPlanner,
  onExploreTours
}) => {
  const isEs = language === 'es';

  const steps = [
    {
      num: '01',
      icon: Compass,
      title: isEs ? '1. Explorá y Personalizá' : '1. Explore & Customize',
      desc: isEs 
        ? 'Elegí entre más de 25 tours oficiales con guías certificados o dejá que nuestros Asistentes IA diseñen tu itinerario a la medida.'
        : 'Choose from 25+ official certified tours or let our AI assistants craft your tailored day-by-day itinerary.',
      badge: isEs ? 'Catálogo 100% Verificado' : '100% Verified Catalog'
    },
    {
      num: '02',
      icon: CreditCard,
      title: isEs ? '2. Reservá con Pago Protegido' : '2. Secure Protected Booking',
      desc: isEs 
        ? 'Pagá en segundos con Stripe, PayPal, tarjetas internacionales o SINPE Móvil local con cifrado bancario de 256 bits.'
        : 'Pay in seconds with Stripe, PayPal, international cards, or local SINPE Móvil with 256-bit bank encryption.',
      badge: isEs ? 'Cancelación Gratuita' : 'Free Cancellation'
    },
    {
      num: '03',
      icon: QrCode,
      title: isEs ? '3. Recibí tu Voucher QR al Instante' : '3. Instant QR Voucher in Minutes',
      desc: isEs 
        ? 'Recibí tu confirmación oficial y código QR directo en tu WhatsApp y correo electrónico, listo para mostrar a tu operador local.'
        : 'Get your official booking confirmation & entry QR code directly on WhatsApp and email, ready to scan with your guide.',
      badge: isEs ? 'Soporte 24/7 en Destino' : '24/7 On-Ground Support'
    }
  ];

  const testimonials = [
    {
      name: 'Sarah & Mark Miller',
      country: isEs ? 'California, EE. UU.' : 'California, USA',
      flag: '🇺🇸',
      rating: 5,
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
      tour: isEs ? 'Combo Volcán Arenal & Termales' : 'Arenal Volcano & Hot Springs Combo',
      text: isEs 
        ? '¡Fue el mejor día de nuestras vacaciones en Costa Rica! La caminata por la colada de lava fue fascinante y las termales de Baldi al atardecer fueron pura relajación. El guía conocía cada ave y perezoso.'
        : 'The absolute highlight of our trip to Costa Rica! The lava trail hike was breathtaking and the evening thermal pools at Baldi were pure bliss. Our guide spotted 4 sloths and a toucan!',
      date: isEs ? 'Hace 4 días' : '4 days ago'
    },
    {
      name: 'Gonzalo Fernández',
      country: isEs ? 'Madrid, España' : 'Madrid, Spain',
      flag: '🇪🇸',
      rating: 5,
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
      tour: isEs ? 'Monteverde Extreme Canopy & Puentes' : 'Monteverde Extreme Zipline & Bridges',
      text: isEs 
        ? 'Impresionante tirarse en el cable Superman de 1.5 km volando sobre la niebla del bosque nuboso de Monteverde. Los puentes colgantes valen totalmente la pena, vimos 2 quetzales. ¡Pura Vida!'
        : 'Incredible flying over the cloud forest mist on the 1.5km Superman cable. The hanging bridges are magical and we even saw two Resplendent Quetzals. Top-notch safety and guides!',
      date: isEs ? 'Hace 1 semana' : '1 week ago'
    },
    {
      name: 'Elena Rostova',
      country: isEs ? 'Múnich, Alemania' : 'Munich, Germany',
      flag: '🇩🇪',
      rating: 5,
      avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=200&q=80',
      tour: isEs ? 'Parque Nacional Manuel Antonio' : 'Manuel Antonio National Park Safari',
      text: isEs 
        ? 'Vimos 6 perezosos gracias al telescopio HD del guía. Las fotos que tomamos a través del lente del telescopio parecen de revista National Geographic. La playa del parque es paradisíaca.'
        : 'We saw 6 sloths thanks to the guide’s high-power spotting telescope. The photos we captured look straight out of National Geographic. The white sand beach inside the park is paradise.',
      date: isEs ? 'Hace 2 semanas' : '2 weeks ago'
    },
    {
      name: 'David K. & Friends',
      country: isEs ? 'Toronto, Canadá' : 'Toronto, Canada',
      flag: '🇨🇦',
      rating: 5,
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80',
      tour: isEs ? 'Rafting Río Pacuare Clase IV' : 'Pacuare River Whitewater Rafting Class IV',
      text: isEs 
        ? 'World-class whitewater rafting! El cañón del Río Pacuare entre cascadas y selva virgen es surreal. El equipo de seguridad es súper profesional y el almuerzo en la ribera del río fue un 10/10.'
        : 'World-class whitewater rafting! The Pacuare canyon surrounded by waterfalls and untouched jungle is surreal. Outstanding safety team and the riverside lunch was 10/10.',
      date: isEs ? 'Hace 2 semanas' : '2 weeks ago'
    }
  ];

  const partners = [
    { name: 'SINAC', subtitle: isEs ? 'Parques Nacionales Oficial' : 'Official National Parks', icon: '🌿' },
    { name: 'ICT Costa Rica', subtitle: isEs ? 'Instituto Turismo' : 'Tourism Board Partner', icon: '🇨🇷' },
    { name: 'CANATUR', subtitle: isEs ? 'Cámara Nacional Turismo' : 'National Chamber of Tourism', icon: '🏅' },
    { name: 'Selvatura Park', subtitle: isEs ? 'Monteverde Canopy' : 'Monteverde Canopy', icon: '🌲' },
    { name: 'Baldi Hot Springs', subtitle: isEs ? 'Aguas Termales Arenal' : 'Arenal Thermal Springs', icon: '🌋' },
    { name: 'Pacuare Outdoor', subtitle: isEs ? 'Rafting Certificado' : 'Certified Whitewater', icon: '🚣' },
    { name: 'Sansa Airlines', subtitle: isEs ? 'Vuelos Domésticos' : 'Domestic Flights', icon: '✈️' }
  ];

  return (
    <div className="space-y-24 py-16">
      
      {/* 1. SECCIÓN CÓMO FUNCIONA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/30 text-emerald-300 text-xs font-bold uppercase tracking-widest mb-3">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            {isEs ? 'Simple & Seguro' : 'Simple & Safe'}
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            {isEs ? '¿Cómo funciona CostaRicaTours?' : 'How CostaRicaTours Works'}
          </h2>
          <p className="mt-3 text-base text-neutral-300">
            {isEs 
              ? 'Desde la primera consulta con nuestra IA hasta tu regreso a casa, una experiencia de viaje fluida y sin complicaciones.'
              : 'From your first AI consultation to your flight back home, a smooth and stress-free travel experience.'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={step.num}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.15 }}
                className="relative bg-gradient-to-b from-stone-900 to-stone-950 p-8 rounded-3xl border border-white/10 hover:border-amber-500/60 transition-all duration-300 group shadow-xl hover:shadow-2xl hover:-translate-y-1.5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-600/30 to-amber-500/20 border border-teal-500/40 flex items-center justify-center text-amber-400 group-hover:scale-110 group-hover:bg-amber-500/20 transition-all">
                      <Icon className="w-7 h-7" />
                    </div>
                    <span className="text-3xl font-black text-teal-300/40 font-mono select-none">
                      {step.num}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold text-white group-hover:text-amber-300 transition-colors">
                    {step.title}
                  </h3>
                  <p className="mt-3 text-neutral-300 text-sm leading-relaxed">
                    {step.desc}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-white/10 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-teal-400 shrink-0" />
                  <span className="text-xs font-semibold text-teal-200">
                    {step.badge}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* 2. SECCIÓN TESTIMONIOS REALES */}
      <section className="bg-gradient-to-b from-stone-950 via-stone-900 to-stone-950 py-16 border-y border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-bold uppercase tracking-wider mb-2">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                {isEs ? '4.98 / 5 Estrellas en +1,200 Reseñas' : '4.98 / 5 Stars from +1,200 Reviews'}
              </div>
              <h2 className="text-3xl sm:text-4xl font-black text-white">
                {isEs ? 'Viajeros felices viviendo el Pura Vida' : 'Happy Travelers Living Pura Vida'}
              </h2>
            </div>
            <button
              onClick={onExploreTours}
              className="inline-flex items-center gap-2 text-sm font-bold text-amber-400 hover:text-amber-300 transition-colors cursor-pointer"
            >
              <span>{isEs ? 'Ver todos los tours disponibles' : 'View all available tours'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {testimonials.map((item, idx) => (
              <motion.div
                key={item.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: idx * 0.1 }}
                className="bg-stone-900/90 backdrop-blur-md rounded-2xl p-6 border border-white/10 hover:border-amber-400/50 transition-all flex flex-col justify-between shadow-lg"
              >
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <img 
                      src={item.avatar} 
                      alt={item.name}
                      className="w-11 h-11 rounded-full object-cover border-2 border-amber-400/80 shadow"
                    />
                    <div>
                      <h4 className="text-sm font-bold text-white leading-tight">
                        {item.name}
                      </h4>
                      <p className="text-xs text-neutral-400 flex items-center gap-1.5 mt-0.5">
                        <span>{item.flag}</span>
                        <span>{item.country}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 mb-2.5">
                    {[...Array(item.rating)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                    ))}
                    <span className="text-xs text-emerald-400 font-semibold ml-1.5 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3 text-emerald-400" />
                      {isEs ? 'Verificado' : 'Verified'}
                    </span>
                  </div>

                  <p className="text-xs font-semibold text-amber-300/90 mb-2">
                    {item.tour}
                  </p>

                  <p className="text-neutral-300 text-xs leading-relaxed italic">
                    "{item.text}"
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-emerald-900/30 text-[11px] text-neutral-400">
                  {item.date}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. SECCIÓN NUESTROS PROVEEDORES Y ALIADOS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-900/40 border border-emerald-600/30 text-emerald-300 text-xs font-bold uppercase tracking-wider mb-2">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            {isEs ? 'Garantía de Calidad' : 'Quality Assurance'}
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white">
            {isEs ? 'Operadores y Aliados Oficiales de Costa Rica' : 'Official Costa Rican Operators & Partners'}
          </h2>
          <p className="mt-2 text-sm text-neutral-300">
            {isEs 
              ? 'Trabajamos directamente con empresas locales acreditadas por el Instituto Costarricense de Turismo y SINAC.'
              : 'Direct partnership with accredited local operators under the Costa Rica Tourism Board and SINAC standards.'}
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-4">
          {partners.map((p) => (
            <div 
              key={p.name}
              className="bg-stone-900/60 border border-white/10 hover:border-teal-500/50 rounded-2xl p-4 flex flex-col items-center justify-center text-center transition-all hover:scale-105"
            >
              <span className="text-2xl mb-1">{p.icon}</span>
              <span className="text-xs font-bold text-white mt-1 leading-tight">{p.name}</span>
              <span className="text-[10px] text-teal-300/80 mt-0.5">{p.subtitle}</span>
            </div>
          ))}
        </div>
      </section>

      {/* 4. BANNER CTA ALTO IMPACTO: ARMÁ TU VIAJE A MEDIDA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-stone-900 via-stone-850 to-stone-900 border-2 border-amber-500/40 p-8 sm:p-12 shadow-[0_10px_40px_rgba(0,0,0,0.5)]">
          {/* Subtle background glow */}
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-teal-500/20 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-8 space-y-4 text-left">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-black uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                {isEs ? 'Concierge VIP & Asesoría Gratuita' : 'VIP Concierge & Free Consultation'}
              </div>

              <h3 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                {isEs ? '¿Buscás una experiencia 100% personalizada en Costa Rica?' : 'Looking for a 100% Tailored Costa Rican Experience?'}
              </h3>

              <p className="text-base text-neutral-200 leading-relaxed max-w-2xl">
                {isEs 
                  ? 'Nuestra inteligencia artificial especializada y equipo de concierges locales diseñan tu aventura ideal en menos de 2 minutos: transporte privado o shuttle, hoteles con encanto y los mejores tours con cupos garantizados.'
                  : 'Our dedicated travel AI and local concierge specialists will craft your dream itinerary in under 2 minutes: private or shuttle transport, charming boutique stays, and premier tours with guaranteed spots.'}
              </p>

              <div className="flex flex-wrap gap-4 pt-2 text-xs text-neutral-300 font-medium">
                <span className="flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-amber-400" />
                  {isEs ? 'Sin compromisos ni cargos ocultos' : 'No hidden fees or obligations'}
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-amber-400" />
                  {isEs ? 'Presupuesto ajustado a tus fechas' : 'Custom budget & dates'}
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-amber-400" />
                  {isEs ? 'Atención en Español e Inglés' : 'English & Spanish support'}
                </span>
              </div>
            </div>

            <div className="lg:col-span-4 flex flex-col gap-3">
              <button
                onClick={onOpenCustomFunnel}
                className="w-full bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-400 hover:to-amber-500 text-white font-black text-base uppercase py-4 px-6 rounded-2xl shadow-[0_4px_25px_rgba(255,140,0,0.5)] transition-all transform hover:-translate-y-1 active:translate-y-0 flex items-center justify-center gap-3 cursor-pointer border border-amber-300/50"
              >
                <Sparkles className="w-5 h-5 text-amber-100 animate-pulse" />
                <span>{isEs ? 'Armar mi Viaje a Medida' : 'Build My Custom Trip'}</span>
              </button>

              <button
                onClick={onOpenItineraryPlanner}
                className="w-full bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-sm py-3 px-6 rounded-2xl transition-all flex items-center justify-center gap-2 cursor-pointer backdrop-blur-md"
              >
                <Compass className="w-4 h-4 text-amber-400" />
                <span>{isEs ? 'Generar Itinerario con IA' : 'Generate AI Itinerary'}</span>
              </button>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
};
