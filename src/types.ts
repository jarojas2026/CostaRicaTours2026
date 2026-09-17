export type Language = 'es' | 'en' | 'de' | 'fr' | 'zh' | 'ja';
export type Currency = string;

export type Localized<T> = {
  es: T;
} & Partial<Record<Language, T>>;

export type TourCategory = 
  | 'volcanoes'
  | 'wildlife'
  | 'canopy'
  | 'beaches'
  | 'rafting'
  | 'culture'
  | 'multiday'
  | 'combos'
  | 'adventure'
  | 'nature'
  | 'hiking'
  | 'waterfalls'
  | 'rural'
  | 'gastronomy'
  | 'surf'
  | 'snorkeling'
  | 'diving'
  | 'whale_watching'
  | 'kayak'
  | 'fishing'
  | 'family';

export type TourRegion =
  | 'arenal'
  | 'monteverde'
  | 'manuel_antonio'
  | 'guanacaste'
  | 'tortuguero'
  | 'pacuare'
  | 'san_jose'
  | 'sjo'
  | 'caribe'
  | 'osa'
  | 'marino_ballena'
  | 'perez_zeledon'
  | 'dominical'
  | 'uvita'
  | 'puerto_viejo'
  | 'cahuita'
  | 'jaco'
  | 'cartago'
  | 'turrialba'
  | 'corcovado'
  | 'golfo_dulce';

export interface Tour {
  id: string;
  title: Localized<string>;
  subtitle: Localized<string>;
  category: TourCategory;
  region: TourRegion;
  image: string;
  gallery: string[];
  priceUSD: number;
  durationHours: number;
  durationLabel: Localized<string>;
  difficulty: 'fácil' | 'moderado' | 'exigente';
  difficultyLabel: Localized<string>;
  rating: number;
  reviewsCount: number;
  featured?: boolean;
  bestseller?: boolean;
  ecoCert: boolean;
  tourType?: 'private' | 'group';
  maxGroupSize?: number;
  ageMinimum?: number;
  // ID y nombre del operador local que ejecuta el tour
  providerId?: string;
  operatorName?: string;
  operatorLogo?: string;
  // Indicador explícito si el dato o precio es una demostración no confirmada
  isDemoData?: boolean;
  freeCancellation?: boolean;
  description: Localized<string>;
  highlights: Localized<string[]>;
  inclusions: Localized<string[]>;
  exclusions: Localized<string[]>;
  whatToBring: Localized<string[]>;
  medicalRestrictions?: Localized<string[]>;
  pickupHotels: string[];
  departureTimes: string[];
  itinerarySteps?: {
    time?: string;
    title: Localized<string>;
    desc: Localized<string>;
  }[];
  faqs?: {
    q: Localized<string>;
    a: Localized<string>;
  }[];
  location: {
    lat: number;
    lng: number;
    placeName: string;
  };
  instantConfirmation?: boolean;
  bestPriceGuaranteed?: boolean;
  verifiedBadge?: Localized<string>;
}

export interface OperatorProfile {
  id: string;
  name: string;
  slug: string;
  tagline: Localized<string>;
  description: Localized<string>;
  location: string;
  region: TourRegion;
  rating: number;
  reviewsCount: number;
  yearsExperience: number;
  verifiedBadge: boolean;
  commissionRate: number; // e.g. 0.20 for 20%
  contact: {
    phone: string;
    whatsapp: string;
    email: string;
    website?: string;
  };
  specialties: Localized<string[]>;
  cancellationPolicy: Localized<string>;
  avatarUrl?: string;
  coverImage?: string;
}

export interface BlogArticle {
  id: string;
  slug: string;
  title: Localized<string>;
  summary: Localized<string>;
  content: Localized<string>;
  coverImage: string;
  author: {
    name: string;
    role: Localized<string>;
    avatar?: string;
  };
  date: string;
  readTimeMinutes: number;
  categories: string[];
  tags: string[];
  relatedTourIds: string[];
  seoTitle: Localized<string>;
  seoDescription: Localized<string>;
}

export interface CategoryInfo {
  id: TourCategory;
  name: Localized<string>;
  iconName: string;
  description: Localized<string>;
}

export interface RegionInfo {
  id: TourRegion;
  name: string;
  tagline: Localized<string>;
  image: string;
  coordinates: { x: number; y: number }; // percentage on SVG map
}

export interface Review {
  id: string;
  tourId: string;
  userName: string;
  userCountry: string;
  rating: number;
  date: string;
  comment: string;
  verified: boolean;
  avatarUrl?: string;
}

export interface BookingRequest {
  bookingId?: string;
  tourId: string;
  tourName: string;
  date: string;
  time: string;
  adults: number;
  children: number;
  pickupHotel: string;
  specialRequests?: string;
  totalUSD: number;
  totalCRC: number;
  dynamicFields?: {
    weightKg?: number;
    dietaryRestrictions?: string;
    specialNeeds?: string;
  };
  softHoldExpiresAt?: string;
  agentInsights?: {
    automatedTags: string[];
    riskAssessment: string;
    operationalInstructions: string[];
  };
  fraudRiskScore?: 'bajo' | 'medio' | 'alto' | string;
  fraudRiskJustification?: string;
  customer: {
    fullName: string;
    email: string;
    phone: string;
    country: string;
  };
  paymentMethod?: 'credit_card' | 'sinpe_movil' | 'pay_at_pickup' | 'paypal' | string;
  paymentStatus?: 'pending' | 'completed' | 'on_arrival' | string;
  paypalOrderId?: string;
  electronicInvoice?: {
    wantsInvoice: boolean;
    idType: string;
    idNumber: string;
    legalName: string;
    email: string;
    phone?: string;
    provincia?: string;
    canton?: string;
    distrito?: string;
    address: string;
  };
  flightDetails?: {
    flightNumber: string;
    airline: string;
    originCode: string;
    originCity: string;
    destinationCode: string;
    departureTime: string;
    arrivalTime: string;
    cabinClass: string;
    includesBaggage: boolean;
    includesAirportTransfer: boolean;
    passengerCount: number;
    pnrLocator?: string;
  };
  status?: 'disponible' | 'solicitada' | 'confirmada' | 'pagada' | string;
  createdAt?: string;
}

export interface FlightRoute {
  id: string;
  airline: string;
  airlineCode: string;
  airlineLogo: string;
  flightNumber: string;
  aircraft: string;
  originCountry: string;
  originCountryCode: string;
  originCity: Localized<string>;
  originAirportCode: string;
  originAirportName: string;
  destinationAirportCode: 'SJO' | 'LIR';
  destinationCity: Localized<string>;
  destinationAirportName: string;
  departureTime: string;
  arrivalTime: string;
  duration: string;
  durationMinutes: number;
  stops: number;
  stopDetails?: Localized<string>;
  basePriceUSD: number;
  cabinClass: 'Economy' | 'Premium Economy' | 'Business';
  includedBaggage: {
    personalItem: boolean;
    carryOnKg: number;
    checkedBagKg: number;
  };
  frequency: Localized<string>;
  features: Localized<string[]>;
  co2EcoRating?: string;
  popularityScore: number;
}

export interface FlightSearchFilters {
  originCountry: string;
  originAirport: string;
  destinationAirport: 'all' | 'SJO' | 'LIR';
  cabinClass: 'all' | 'Economy' | 'Premium Economy' | 'Business';
  directOnly: boolean;
  maxPriceUSD: number;
  sortBy: 'cheapest' | 'fastest' | 'recommended';
}

export interface FilterState {
  searchQuery: string;
  category: TourCategory | 'all';
  region: TourRegion | 'all';
  maxPriceUSD: number;
  difficulty: 'all' | 'fácil' | 'moderado' | 'exigente';
  duration: 'all' | 'half_day' | 'full_day' | 'multiday';
  sortBy: 'popular' | 'price_asc' | 'price_desc' | 'rating';
}

export type AgentId = 
  | 'counter_agent'
  | 'router'
  | 'concierge' 
  | 'booking_specialist'
  | 'biologist' 
  | 'wildlife'
  | 'chef' 
  | 'culinary'
  | 'logistics' 
  | 'adventure'
  | 'extreme'
  | 'budget_backpacker'
  | 'family_accessible'
  | 'climate'
  | 'legal_visa'
  | 'health_safety'
  | 'eco_sustainability'
  | 'events_culture'
  | 'currency_budget'
  | 'customer_service';

export type AgentCategory = 'ROUTER' | 'SERVICIO' | 'RESERVAS' | 'INFORMACION' | 'LOGISTICA';

export interface MultiAgentEscalation {
  escalated: boolean;
  level: 'none' | 'human_support' | 'emergency';
  reason?: string;
  emergencyContact?: string;
}

export interface MultiAgentContextHandover {
  transferredFrom?: AgentCategory;
  transferredTo?: AgentCategory;
  handoverReason?: string;
  accumulatedEntities?: {
    tourName?: string;
    tourId?: string;
    date?: string;
    time?: string;
    paxAdults?: number;
    paxChildren?: number;
    customerName?: string;
    customerEmail?: string;
    specialNeeds?: string;
    bookingCode?: string;
    currency?: string;
  };
}

export type AgentWorkflowCategory = 'all' | 'booking' | 'nature_adventure' | 'logistics_food' | 'specialized' | 'planning_support';

export interface AIAgent {
  id: AgentId;
  workflowCategory: 'booking' | 'nature_adventure' | 'logistics_food' | 'specialized' | 'planning_support';
  name: Localized<string>;
  role: Localized<string>;
  badge: Localized<string>;
  avatarEmoji: string;
  themeColor: string;
  bgGradient: string;
  borderColor: string;
  description: Localized<string>;
  welcomeMessage: Localized<string>;
  suggestedQuestions: Localized<string[]>;
  specialtyTags: Localized<string[]>;
  workflowSteps?: Localized<string[]>;
}
