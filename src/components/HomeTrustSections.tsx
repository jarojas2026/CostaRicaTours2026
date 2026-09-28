import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Compass, CreditCard, CheckCircle2, ArrowRight, ShieldCheck, Bot, Route, MessageCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { Language } from '../types';

interface HomeTrustSectionsProps {
  language: Language;
  onOpenCustomFunnel: () => void;
}

export const HomeTrustSections: React.FC<HomeTrustSectionsProps> = ({
  language,
  onOpenCustomFunnel,
}) => {
  const isEs = language === 'es';
  const navigate = useNavigate();

  const steps = [
    {
      num: '01',
      icon: Compass,
      title: isEs ? 'Explorá experiencias' : 'Explore experiences',
      desc: isEs
        ? 'Compará tours, destinos y actividades del catálogo y usá el asistente para ordenar opciones según fechas, intereses y logística.'
        : 'Compare tours, destinations and activities from the catalog, and use the assistant to organize options around dates, interests and logistics.',
    },
    {
      num: '02',
      icon: CreditCard,
      title: isEs ? 'Solicitá y verificá' : 'Request and verify',
      desc: isEs
        ? 'La disponibilidad, el precio aplicable y el estado del pago se verifican durante el proceso. Una solicitud no se presenta como confirmada antes de completar esas verificaciones.'
        : 'Availability, applicable price and payment state are checked during the process. A request is not shown as confirmed before those checks are completed.',
    },
    {
      num: '03',
      icon: CheckCircle2,
      title: isEs ? 'Confirmación operativa' : 'Operational confirmation',
      desc: isEs
        ? 'La reserva final se confirma cuando el pago correspondiente y la operación del proveedor quedan validados. El estado se mantiene visible en Mis Reservas.'
        : 'The final booking is confirmed after the relevant payment and provider operation have been validated. The status remains visible in My Bookings.',
    },
  ];

  const capabilities = [
    {
      icon: Bot,
      title: isEs ? 'Asistente de viaje' : 'Travel assistant',
      desc: isEs
        ? 'Ayuda a descubrir opciones, preparar itinerarios y continuar una solicitud sin presentar información estática como si fuera una verificación en vivo.'
        : 'Helps discover options, prepare itineraries and continue a request without presenting static information as live verification.',
    },
    {
      icon: Route,
      title: isEs ? 'Planificación conectada' : 'Connected planning',
      desc: isEs
        ? 'El itinerario combina catálogo, memoria del viajero, geografía y servicios de verificación cuando están disponibles.'
        : 'The itinerary combines the catalog, traveler context, geography and verification services when available.',
    },
    {
      icon: ShieldCheck,
      title: isEs ? 'Estados claros' : 'Clear booking states',
      desc: isEs
        ? 'Pago verificado, proveedor pendiente y reserva confirmada son estados distintos. La plataforma no los trata como equivalentes.'
        : 'Payment verified, provider pending and booking confirmed are different states. The platform does not treat them as equivalent.',
    },
  ];

  return (
    <div className="space-y-20 py-16">
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/30 text-emerald-300 text-xs font-bold uppercase tracking-widest mb-3">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            {isEs ? 'Planificá con información clara' : 'Plan with clear information'}
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            {isEs ? 'Cómo funciona una reserva' : 'How a booking works'}
          </h2>
          <p className="mt-3 text-base text-emerald-100/80">
            {isEs
              ? 'La plataforma separa recomendación, verificación y confirmación para que siempre sepas qué está listo y qué todavía requiere una acción operativa.'
              : 'The platform separates recommendation, verification and confirmation so you can always see what is ready and what still requires an operational step.'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={step.num}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, delay: idx * 0.1 }}
                className="modern-card p-8"
              >
                <div className="flex items-center justify-between mb-6">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-600/30 to-amber-500/20 border border-teal-500/40 flex items-center justify-center text-amber-400">
                    <Icon className="w-7 h-7" />
                  </div>
                  <span className="text-3xl font-black text-teal-300/40 font-mono">{step.num}</span>
                </div>
                <h3 className="text-xl font-bold text-white">{step.title}</h3>
                <p className="mt-3 text-emerald-100/80 text-sm leading-relaxed">{step.desc}</p>
              </motion.div>
            );
          })}
        </div>
      </section>

      <section className="bg-[#051c14]/90 py-16 border-y border-emerald-500/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-5 mb-10">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold uppercase tracking-wider mb-3">
                <ShieldCheck className="w-3.5 h-3.5" />
                {isEs ? 'Transparencia operativa' : 'Operational transparency'}
              </div>
              <h2 className="text-3xl sm:text-4xl font-black text-white">
                {isEs ? 'Tecnología que acompaña el viaje' : 'Technology that supports the journey'}
              </h2>
              <p className="mt-3 text-sm sm:text-base text-emerald-100/75 leading-relaxed">
                {isEs
                  ? 'Los módulos de IA, memoria, clima, disponibilidad, reservas y proveedores se coordinan detrás de la experiencia del viajero. Cuando una fuente viva no está disponible, la interfaz debe decirlo en lugar de inventar una respuesta.'
                  : 'AI, memory, weather, availability, booking and provider modules coordinate behind the traveler experience. When a live source is unavailable, the interface should say so instead of inventing an answer.'}
              </p>
            </div>
            <button
              onClick={() => navigate('/ai')}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 text-sm font-black text-stone-950 hover:bg-emerald-400 transition-colors"
            >
              {isEs ? 'Abrir asistente' : 'Open assistant'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {capabilities.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="rounded-2xl border border-emerald-500/20 bg-[#031710]/80 p-6">
                <Icon className="w-6 h-6 text-emerald-400" />
                <h3 className="mt-4 text-lg font-bold text-white">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-emerald-100/70">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-emerald-500/25 bg-gradient-to-br from-emerald-950/80 to-[#031710] p-7 sm:p-10 flex flex-col lg:flex-row lg:items-center justify-between gap-7">
          <div className="max-w-3xl">
            <h2 className="text-2xl sm:text-3xl font-black text-white">
              {isEs ? '¿No sabés qué reservar todavía?' : 'Not sure what to book yet?'}
            </h2>
            <p className="mt-3 text-emerald-100/75 leading-relaxed">
              {isEs
                ? 'Contanos fechas, cantidad de viajeros e intereses. El planificador puede construir una propuesta y señalar qué elementos necesitan verificación antes de reservar.'
                : 'Share your dates, party size and interests. The planner can build a proposal and indicate which items need verification before booking.'}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 shrink-0">
            <button
              onClick={onOpenCustomFunnel}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-400 px-5 py-3 text-sm font-black text-stone-950 hover:bg-amber-300 transition-colors"
            >
              <Route className="w-4 h-4" />
              {isEs ? 'Planear mi viaje' : 'Plan my trip'}
            </button>
            <a
              href="https://wa.me/50687959148?text=Hola%20Costa%20Rica%20Tours,%20quisiera%20ayuda%20para%20planificar%20mi%20viaje."
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-400/40 px-5 py-3 text-sm font-bold text-emerald-200 hover:bg-emerald-950/70 transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              WhatsApp
            </a>
          </div>
        </div>
      </section>
    </div>
  );
};
