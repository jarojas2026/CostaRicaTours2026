import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Accessibility,
  BedDouble,
  Bird,
  Bus,
  CalendarDays,
  Coffee,
  HeartPulse,
  Map,
  MessageCircle,
  Ticket,
  Trees,
  Users,
  Waves,
  type LucideIcon
} from 'lucide-react';
import { requestCustomerIntake } from '../utils/customerIntake';
import type { Language, TourCategory } from '../types';

type TravelStyle =
  | 'families'
  | 'solo'
  | 'couples'
  | 'groups'
  | 'adventure'
  | 'nature'
  | 'food'
  | 'wellness'
  | 'accessible';

interface ServicesSectionProps {
  language: Language;
  onNavigateTab?: (tab: 'tours') => void;
  setSelectedCategory?: (category: TourCategory | 'all') => void;
  onOpenCustomFunnel?: () => void;
}

interface TravelStyleOption {
  id: 'all' | TravelStyle;
  titleEs: string;
  titleEn: string;
}

interface TravelService {
  id: string;
  icon: LucideIcon;
  titleEs: string;
  titleEn: string;
  descEs: string;
  descEn: string;
  audiences: TravelStyle[];
  catalogCategory?: TourCategory;
  opensPlanner?: boolean;
}

const TRAVEL_STYLES: TravelStyleOption[] = [
  { id: 'all', titleEs: 'Todos', titleEn: 'All' },
  { id: 'families', titleEs: 'Familias', titleEn: 'Families' },
  { id: 'solo', titleEs: 'Viajo solo/a', titleEn: 'Solo travel' },
  { id: 'couples', titleEs: 'Parejas', titleEn: 'Couples' },
  { id: 'groups', titleEs: 'Grupos y amigos', titleEn: 'Groups & friends' },
  { id: 'adventure', titleEs: 'Aventura', titleEn: 'Adventure' },
  { id: 'nature', titleEs: 'Naturaleza', titleEn: 'Nature' },
  { id: 'food', titleEs: 'Comida y cultura', titleEn: 'Food & culture' },
  { id: 'wellness', titleEs: 'Bienestar', titleEn: 'Wellness' },
  { id: 'accessible', titleEs: 'Accesibilidad', titleEn: 'Accessibility' }
];

const TRAVEL_SERVICES: TravelService[] = [
  {
    id: 'adventure-tours',
    icon: Map,
    titleEs: 'Tours y aventura',
    titleEn: 'Tours & adventure',
    descEs: 'Canopy, rafting, caminatas, cataratas y otras actividades. Consulta la ficha y confirma cupo y requisitos.',
    descEn: 'Ziplining, rafting, hikes, waterfalls and more. Review each listing and confirm capacity and requirements.',
    audiences: ['families', 'solo', 'groups', 'adventure'],
    catalogCategory: 'adventure'
  },
  {
    id: 'nature-birding',
    icon: Bird,
    titleEs: 'Fauna, aves y naturaleza',
    titleEn: 'Wildlife, birds & nature',
    descEs: 'Ideas para observación de aves, senderos y vida silvestre; los avistamientos nunca se garantizan.',
    descEn: 'Ideas for birdwatching, trails and wildlife; sightings are never guaranteed.',
    audiences: ['families', 'solo', 'couples', 'groups', 'nature'],
    catalogCategory: 'wildlife'
  },
  {
    id: 'coffee-gastronomy',
    icon: Coffee,
    titleEs: 'Café, cacao y gastronomía',
    titleEn: 'Coffee, cacao & cuisine',
    descEs: 'Degustaciones, fincas y cocina local; confirma menú, dieta, ubicación y horario con cada proveedor.',
    descEn: 'Tastings, farms and local cuisine; confirm menus, dietary options, location and schedule with each provider.',
    audiences: ['families', 'solo', 'couples', 'groups', 'food'],
    catalogCategory: 'gastronomy'
  },
  {
    id: 'rural-community',
    icon: Trees,
    titleEs: 'Turismo rural y comunitario',
    titleEn: 'Rural & community tourism',
    descEs: 'Experiencias de campo, artesanía y tradiciones locales para conocer el territorio con respeto.',
    descEn: 'Farm, craft and local-tradition experiences to connect respectfully with the region.',
    audiences: ['families', 'solo', 'couples', 'groups', 'food', 'nature'],
    catalogCategory: 'rural'
  },
  {
    id: 'coastal-marine',
    icon: Waves,
    titleEs: 'Playas y experiencias marinas',
    titleEn: 'Beaches & marine experiences',
    descEs: 'Surf, kayak, snorkel y navegación; salidas, condiciones del mar y equipo dependen del proveedor.',
    descEn: 'Surfing, kayaking, snorkeling and boating; departures, sea conditions and equipment depend on the provider.',
    audiences: ['families', 'couples', 'groups', 'adventure', 'nature'],
    catalogCategory: 'beaches'
  },
  {
    id: 'wellness-thermal',
    icon: HeartPulse,
    titleEs: 'Bienestar, termales y yoga',
    titleEn: 'Wellness, hot springs & yoga',
    descEs: 'Opciones de relajación y naturaleza. Solicita cotización y confirma servicios, horarios y condiciones.',
    descEn: 'Relaxation and nature options. Request a quote and confirm services, hours and terms.',
    audiences: ['solo', 'couples', 'wellness', 'nature']
  },
  {
    id: 'family-accessible',
    icon: Accessibility,
    titleEs: 'Familias y necesidades de accesibilidad',
    titleEn: 'Families & accessibility needs',
    descEs: 'Cuéntanos el ritmo, edades y requisitos de acceso; verificaremos qué opciones pueden atenderlos.',
    descEn: 'Tell us your pace, age ranges and access requirements; we will check which options can accommodate them.',
    audiences: ['families', 'groups', 'accessible']
  },
  {
    id: 'airport-ground-transport',
    icon: Bus,
    titleEs: 'Traslados y transporte terrestre',
    titleEn: 'Transfers & ground transport',
    descEs: 'Consulta traslado al aeropuerto, shuttle o transporte privado; ruta, operador y precio se confirman primero.',
    descEn: 'Ask about airport transfers, shuttles or private rides; route, provider and price are confirmed first.',
    audiences: ['families', 'solo', 'couples', 'groups', 'accessible']
  },
  {
    id: 'lodging-stays',
    icon: BedDouble,
    titleEs: 'Hospedaje y estancias en naturaleza',
    titleEn: 'Lodging & nature stays',
    descEs: 'Busca ecolodges, hospedajes rurales o camping según ruta y presupuesto; consulta disponibilidad real.',
    descEn: 'Explore ecolodges, rural stays or camping by route and budget; ask for live availability.',
    audiences: ['families', 'solo', 'couples', 'groups', 'nature', 'accessible']
  },
  {
    id: 'custom-multiday',
    icon: CalendarDays,
    titleEs: 'Viajes a medida de varios días',
    titleEn: 'Custom multi-day journeys',
    descEs: 'Combina regiones, noches, traslados y actividades sin itinerarios imposibles. Diseña una propuesta inicial.',
    descEn: 'Combine regions, nights, transfers and activities with realistic routing. Build an initial proposal.',
    audiences: ['families', 'solo', 'couples', 'groups', 'adventure', 'nature', 'food', 'wellness', 'accessible'],
    opensPlanner: true
  },
  {
    id: 'parks-attractions',
    icon: Ticket,
    titleEs: 'Parques, entradas y atractivos',
    titleEn: 'Parks, tickets & attractions',
    descEs: 'Pregunta por entradas y reglas de acceso. Cupos, tarifas y reservas se verifican con la fuente oficial u operador.',
    descEn: 'Ask about tickets and access rules. Quotas, fees and reservations are checked with the official source or provider.',
    audiences: ['families', 'solo', 'couples', 'groups', 'nature']
  },
  {
    id: 'groups-events',
    icon: Users,
    titleEs: 'Grupos, celebraciones y eventos',
    titleEn: 'Groups, celebrations & events',
    descEs: 'Solicita una propuesta privada para amistades, celebración o grupo de trabajo; no es una reserva automática.',
    descEn: 'Request a private proposal for friends, celebrations or work groups; this is not an instant booking.',
    audiences: ['couples', 'groups', 'food', 'wellness']
  }
];

export const ServicesSection: React.FC<ServicesSectionProps> = ({
  language,
  onNavigateTab,
  setSelectedCategory,
  onOpenCustomFunnel
}) => {
  const [activeStyle, setActiveStyle] = useState<TravelStyleOption['id']>('all');
  const isEs = language === 'es';
  const style = TRAVEL_STYLES.find((option) => option.id === activeStyle);
  const visibleServices = TRAVEL_SERVICES.filter((service) => (
    activeStyle === 'all' || service.audiences.includes(activeStyle)
  ));

  const handleServiceClick = (service: TravelService) => {
    if (service.catalogCategory && onNavigateTab) {
      setSelectedCategory?.(service.catalogCategory);
      onNavigateTab('tours');
      return;
    }

    if (service.opensPlanner && onOpenCustomFunnel) {
      onOpenCustomFunnel();
      return;
    }

    const serviceName = isEs ? service.titleEs : service.titleEn;
    const audienceLabel = activeStyle === 'all'
      ? (isEs ? 'sin preferencia seleccionada' : 'no preference selected')
      : (isEs ? style?.titleEs : style?.titleEn) || '';
    const message = isEs
      ? 'Hola, quiero consultar ' + serviceName + ' en Costa Rica. Perfil de viaje: ' + audienceLabel + '.'
      : 'Hello, I would like to ask about ' + serviceName + ' in Costa Rica. Traveler profile: ' + audienceLabel + '.';

    requestCustomerIntake({
      message,
      language,
      source: 'service-inquiry:' + service.id,
      context: {
        serviceId: service.id,
        serviceName,
        travelerProfile: activeStyle,
        requestType: service.opensPlanner ? 'custom-itinerary' : 'quote',
        providerVerificationRequired: true,
        availabilityAndPriceMustBeConfirmed: true,
        page: window.location.pathname
      }
    });
  };

  return (
    <section aria-labelledby="travel-services-heading" className="py-16 bg-[#041711] border-y border-emerald-500/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mb-8">
          <span className="inline-flex items-center rounded-full border border-amber-400/40 bg-amber-400/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-amber-300">
            {isEs ? 'Experiencias para distintas formas de viajar' : 'Experiences for different ways to travel'}
          </span>
          <h2 id="travel-services-heading" className="mt-4 text-3xl md:text-4xl font-black uppercase tracking-tight text-white">
            {isEs ? 'Más Costa Rica, a tu manera' : 'More Costa Rica, your way'}
          </h2>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-stone-300">
            {isEs
              ? 'Explora por interés o perfil. Las opciones de catálogo llevan a los tours publicados; los demás servicios generan una consulta para verificar proveedor, precio y disponibilidad antes de reservar.'
              : 'Explore by interest or traveler profile. Catalog options open published tours; other services create an inquiry so provider, price and availability can be verified before booking.'}
          </p>
        </div>

        <div className="mb-8 flex flex-wrap gap-2" role="group" aria-label={isEs ? 'Filtrar servicios por perfil de viaje' : 'Filter services by traveler profile'}>
          {TRAVEL_STYLES.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setActiveStyle(option.id)}
              aria-pressed={activeStyle === option.id}
              className={
                activeStyle === option.id
                  ? 'rounded-full border border-amber-400 bg-amber-400 px-4 py-2 text-sm font-bold text-stone-950'
                  : 'rounded-full border border-emerald-500/30 bg-[#082218] px-4 py-2 text-sm font-semibold text-emerald-100 hover:border-amber-400/60'
              }
            >
              {isEs ? option.titleEs : option.titleEn}
            </button>
          ))}
        </div>

        <p className="mb-4 text-sm text-emerald-100/70" aria-live="polite">
          {visibleServices.length} {isEs ? 'opciones para' : 'options for'} {isEs ? style?.titleEs.toLowerCase() : style?.titleEn.toLowerCase()}
        </p>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {visibleServices.map((service, index) => {
            const Icon = service.icon;
            const actionLabel = service.catalogCategory
              ? (isEs ? 'Explorar tours' : 'Explore tours')
              : service.opensPlanner
                ? (isEs ? 'Diseñar mi viaje' : 'Plan my trip')
                : (isEs ? 'Solicitar cotización' : 'Request a quote');

            return (
              <motion.article
                key={service.id}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: Math.min(index * 0.035, 0.2) }}
                className="flex h-full flex-col rounded-3xl border border-emerald-500/20 bg-[#082218] p-6 shadow-lg shadow-black/10"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-400/10 text-amber-300">
                    <Icon aria-hidden="true" className="h-6 w-6" />
                  </div>
                  <span className="rounded-full border border-emerald-400/20 bg-emerald-950/70 px-3 py-1 text-xs font-semibold text-emerald-100">
                    {service.catalogCategory
                      ? (isEs ? 'En catálogo' : 'In catalog')
                      : service.opensPlanner
                        ? (isEs ? 'A tu medida' : 'Custom')
                        : (isEs ? 'Bajo consulta' : 'By inquiry')}
                  </span>
                </div>

                <h3 className="mt-4 text-xl font-bold text-white">{isEs ? service.titleEs : service.titleEn}</h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-stone-300">{isEs ? service.descEs : service.descEn}</p>
                <p className="mt-4 text-xs leading-relaxed text-emerald-100/70">
                  {isEs
                    ? 'Precio final, cupo, proveedor y condiciones se confirman antes de reservar o pagar.'
                    : 'Final price, capacity, provider and terms are confirmed before booking or payment.'}
                </p>

                <button
                  type="button"
                  onClick={() => handleServiceClick(service)}
                  className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-amber-400 px-4 py-3 text-sm font-bold text-stone-950 transition-colors hover:bg-amber-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-200"
                  aria-label={(isEs ? 'Servicio: ' : 'Service: ') + (isEs ? service.titleEs : service.titleEn)}
                >
                  <MessageCircle aria-hidden="true" className="h-4 w-4" />
                  {actionLabel}
                </button>
              </motion.article>
            );
          })}
        </div>

        {visibleServices.length === 0 && (
          <p className="rounded-2xl border border-emerald-500/20 bg-[#082218] p-6 text-emerald-100">
            {isEs ? 'No hay opciones para ese perfil todavía.' : 'There are no options for this profile yet.'}
          </p>
        )}
      </div>
    </section>
  );
};
