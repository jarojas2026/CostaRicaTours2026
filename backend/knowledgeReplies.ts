/**
 * Respuestas basadas en herramientas cuando no hay modelo de IA disponible
 * (sin clave, cuota agotada o error). Nunca inventa: solo devuelve lo que
 * dicen el catálogo, el listado ICT, SINAC o las capas del mapa, con su fuente.
 */
import { TOURS } from '../src/data/toursData';
import { findGuides, findNearestServices, getParkInfo, loadLayer } from './nationalKnowledgeService';

const norm = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

/** Poblados frecuentes para ubicar al viajero sin GPS (coordenadas aproximadas del centro). */
export const TOWNS: { names: string[]; lat: number; lng: number; label: string }[] = [
  { names: ['san isidro de el general', 'san isidro del general', 'perez zeledon', 'san isidro'], lat: 9.3727, lng: -83.7036, label: 'San Isidro de El General' },
  { names: ['la fortuna', 'arenal'], lat: 10.4678, lng: -84.6427, label: 'La Fortuna' },
  { names: ['monteverde', 'santa elena'], lat: 10.3125, lng: -84.8250, label: 'Monteverde' },
  { names: ['quepos', 'manuel antonio'], lat: 9.4310, lng: -84.1620, label: 'Quepos' },
  { names: ['liberia'], lat: 10.6346, lng: -85.4377, label: 'Liberia' },
  { names: ['tamarindo'], lat: 10.2993, lng: -85.8371, label: 'Tamarindo' },
  { names: ['nosara'], lat: 9.9776, lng: -85.6533, label: 'Nosara' },
  { names: ['samara'], lat: 9.8817, lng: -85.5286, label: 'Sámara' },
  { names: ['nicoya'], lat: 10.1483, lng: -85.4520, label: 'Nicoya' },
  { names: ['jaco'], lat: 9.6146, lng: -84.6290, label: 'Jacó' },
  { names: ['puntarenas'], lat: 9.9763, lng: -84.8384, label: 'Puntarenas' },
  { names: ['uvita'], lat: 9.1630, lng: -83.7370, label: 'Uvita' },
  { names: ['dominical'], lat: 9.2530, lng: -83.8600, label: 'Dominical' },
  { names: ['puerto jimenez'], lat: 8.5350, lng: -83.3050, label: 'Puerto Jiménez' },
  { names: ['drake', 'bahia drake'], lat: 8.6950, lng: -83.6720, label: 'Bahía Drake' },
  { names: ['golfito'], lat: 8.6390, lng: -83.1660, label: 'Golfito' },
  { names: ['puerto viejo de talamanca', 'puerto viejo'], lat: 9.6560, lng: -82.7540, label: 'Puerto Viejo' },
  { names: ['cahuita'], lat: 9.7360, lng: -82.8420, label: 'Cahuita' },
  { names: ['limon', 'puerto limon'], lat: 9.9907, lng: -83.0350, label: 'Limón' },
  { names: ['tortuguero'], lat: 10.5420, lng: -83.5020, label: 'Tortuguero' },
  { names: ['sarapiqui', 'puerto viejo de sarapiqui'], lat: 10.4520, lng: -84.0170, label: 'Puerto Viejo de Sarapiquí' },
  { names: ['turrialba'], lat: 9.9050, lng: -83.6840, label: 'Turrialba' },
  { names: ['cartago'], lat: 9.8640, lng: -83.9190, label: 'Cartago' },
  { names: ['alajuela'], lat: 10.0163, lng: -84.2116, label: 'Alajuela' },
  { names: ['heredia'], lat: 9.9980, lng: -84.1170, label: 'Heredia' },
  { names: ['san jose', 'san josé'], lat: 9.9325, lng: -84.0796, label: 'San José' },
];

export function findTown(message: string) {
  const m = norm(message);
  return TOWNS.find((t) => t.names.some((n) => m.includes(norm(n))));
}

const LANGS: [RegExp, string, string][] = [
  [/\b(german|aleman|deutsch)/, 'alemán', 'German'], [/\b(french|frances|francais)/, 'francés', 'French'],
  [/\b(japanese|japones)/, 'japonés', 'Japanese'], [/\b(english|ingles)/, 'inglés', 'English'],
  [/\b(italian|italiano)/, 'italiano', 'Italian'], [/\b(portuguese|portugues)/, 'portugués', 'Portuguese'],
  [/\b(chinese|chino|mandarin)/, 'chino', 'Chinese'], [/\b(russian|ruso)/, 'ruso', 'Russian'], [/\b(dutch|holandes)/, 'holandés', 'Dutch'],
];
const GUIDE_ZONES = ['osa', 'drake', 'corcovado', 'tortuguero', 'cahuita', 'arenal', 'monteverde', 'manuel antonio', 'guanacaste', 'caribe', 'chirripo', 'puntarenas', 'limon', 'san jose', 'alajuela', 'heredia', 'cartago'];

const CATEGORY_WORDS: [RegExp, string][] = [
  [/rafting|aguas (bravas|rapidas)|whitewater/, 'rafting'], [/canopy|zip ?line|tirolesa|canopi/, 'canopy'],
  [/snorkel/, 'snorkeling'], [/buceo|diving|scuba/, 'diving'], [/ballena|whale/, 'whale_watching'],
  [/surf/, 'surf'], [/kayak/, 'kayak'], [/pesca|fishing/, 'fishing'], [/cafe|coffee|chocolate|cacao/, 'gastronomy'],
  [/perezoso|sloth|fauna|wildlife|animales|aves|birding|birdwatching/, 'wildlife'], [/catarata|waterfall/, 'waterfalls'],
  [/caminata|hiking|senderismo|hike/, 'hiking'], [/volcan|volcano/, 'volcanoes'], [/cultura|indigena|culture/, 'culture'],
];
const REGION_WORDS: [RegExp, string[]][] = [
  [/arenal|la fortuna/, ['arenal']], [/monteverde/, ['monteverde']], [/manuel antonio|quepos/, ['manuel_antonio']],
  [/guanacaste|tamarindo|liberia|papagayo|nosara|samara/, ['guanacaste']], [/tortuguero/, ['tortuguero']],
  [/pacuare|turrialba/, ['pacuare', 'turrialba']], [/osa|drake|corcovado|puerto jimenez/, ['osa', 'corcovado']],
  [/uvita|ballena/, ['uvita', 'marino_ballena']], [/dominical/, ['dominical']], [/jaco/, ['jaco']],
  [/puerto viejo|cahuita|caribe/, ['caribe_sur', 'caribe', 'puerto_viejo', 'cahuita']], [/sarapiqui/, ['sarapiqui']],
  [/san jose|valle central/, ['san_jose', 'sjo']], [/perez zeledon|san isidro|chirripo/, ['perez_zeledon']], [/golfito/, ['golfito', 'golfo_dulce']],
];

function budgetFrom(m: string): number | undefined {
  const r = m.match(/(?:menos de|under|less than|max(?:imo)?|hasta|below|por debajo de|<)\s*\$?\s*(\d{2,5})/);
  return r ? Number(r[1]) : undefined;
}

function emergencyReply(message: string, es: boolean): string | undefined {
  const m = norm(message);
  if (!/(hospital|me siento mal|emergencia|emergency|ambulanc|doctor|medico|clinica|clinic|sick|herid|injur|accidente|accident|ebais|farmacia|pharmacy)/.test(m)) return undefined;
  const town = findTown(message);
  const lines = [es ? '🚨 Si es una emergencia, llama ya al 911 (gratis, todo el país).' : '🚨 If this is an emergency, call 911 now (free, nationwide).'];
  if (!town) {
    lines.push(es ? 'Dime en qué pueblo o ciudad estás y te digo el hospital y el EBAIS más cercanos.' : 'Tell me which town you are in and I will give you the nearest hospital and clinic.');
    return lines.join('\n');
  }
  const pharmacy = /farmacia|pharmacy/.test(m);
  const hospitals = pharmacy ? null : findNearestServices(town.lat, town.lng, 'hospital', 2, 'Hospital');
  const clinics = findNearestServices(town.lat, town.lng, pharmacy ? 'farmacia' : 'hospital', 2, pharmacy ? undefined : 'Sede de Área');
  const fmt = (r: any) => `• ${r.name} (${r.type}) — ${r.distanceKm} km${r.address ? `, ${r.address}` : ''}`;
  if (hospitals?.results?.length) lines.push(es ? `Hospitales CCSS más cercanos a ${town.label}:` : `Nearest public (CCSS) hospitals to ${town.label}:`, ...hospitals.results.map(fmt));
  if (clinics.results?.length) lines.push(pharmacy ? (es ? 'Farmacias cercanas:' : 'Nearby pharmacies:') : (es ? 'Áreas de salud cercanas:' : 'Nearby health centers:'), ...clinics.results.map(fmt));
  lines.push(es ? 'Distancias en línea recta, desde el centro del poblado. Fuente: red CCSS y OpenStreetMap.' : 'Straight-line distances from the town centre. Source: CCSS network and OpenStreetMap.');
  return lines.join('\n');
}

function guidesReply(message: string, es: boolean): string | undefined {
  const m = norm(message);
  if (!/(guia|guide)/.test(m) || /(guia de viaje|travel guide book)/.test(m)) return undefined;
  const lang = LANGS.find(([re]) => re.test(m));
  const zone = GUIDE_ZONES.find((z) => m.includes(z));
  const r = findGuides({ language: lang?.[1], region: zone, limit: 5 });
  const langLabel = lang ? (es ? lang[1] : lang[2]) : '';
  if (!r.totalMatches) {
    return es ? `No encuentro guías ICT${langLabel ? ` que hablen ${langLabel}` : ''}${zone ? ` en ${zone}` : ''} en el listado oficial. Podemos buscar en zonas cercanas.`
      : `I can't find ICT guides${langLabel ? ` speaking ${langLabel}` : ''}${zone ? ` in ${zone}` : ''} in the official list. We can look in nearby areas.`;
  }
  const lines = [es
    ? `Hay ${r.totalMatches} guías acreditados por el ICT${langLabel ? ` que hablan ${langLabel}` : ''}${zone ? ` en la zona de ${zone}` : ''}. Algunos:`
    : `There are ${r.totalMatches} ICT-accredited guides${langLabel ? ` speaking ${langLabel}` : ''}${zone ? ` in the ${zone} area` : ''}. Some of them:`];
  for (const g of r.guides) lines.push(`• ${g.name} — ${g.languages.join(', ')}${g.specialties.length ? ` · ${g.specialties.slice(0, 2).join(', ')}` : ''}`);
  if (r.associations.length) lines.push((es ? 'Asociación de guías: ' : 'Guide association: ') + r.associations.slice(0, 2).map((a) => `${a.name} (${a.zone})`).join(', '));
  lines.push(es ? 'Te coordinamos el guía por WhatsApp; la disponibilidad y la tarifa se confirman con el guía.' : 'We can arrange the guide via WhatsApp; availability and rate are confirmed with the guide.');
  lines.push(es ? `Fuente: listado oficial ICT (${r.asOf}).` : `Source: official ICT list (${r.asOf}).`);
  return lines.join('\n');
}

const PARK_KEYS = ['poas', 'irazu', 'turrialba', 'braulio carrillo', 'tapanti', 'los quetzales', 'cangreja', 'guayabo', 'arenal', 'tenorio', 'rio celeste', 'palo verde', 'rincon de la vieja', 'santa rosa', 'barra honda', 'las baulas', 'ostional', 'cabo blanco', 'manuel antonio', 'carara', 'corcovado', 'isla del cano', 'marino ballena', 'piedras blancas', 'chirripo', 'la amistad', 'cahuita', 'tortuguero', 'isla del coco', 'gandoca', 'hitoy cerere', 'juan castro blanco'];

function parkReply(message: string, es: boolean): string | undefined {
  const m = norm(message);
  if (!/(parque|park|entrada|entry|fee|tarifa|reserva|horario|hours|cuesta|cost)/.test(m)) return undefined;
  let key = PARK_KEYS.find((k) => m.includes(k));
  if (key === 'rio celeste') key = 'tenorio';
  if (!key) return undefined;
  const r = getParkInfo(key, 2);
  if (!r.success || !r.results?.length) return undefined;
  const lines: string[] = [];
  for (const p of r.results) {
    lines.push(`🏞️ ${p.name}`);
    if (p.foreignFee) lines.push(es ? `• Extranjeros: ${p.foreignFee}` : `• Foreign visitors: ${p.foreignFee}`);
    if (p.residentFee) lines.push(es ? `• Nacionales y residentes: ${p.residentFee}` : `• Residents: ${p.residentFee}`);
    if (p.hours) lines.push(es ? `• Horario: ${p.hours}` : `• Hours: ${p.hours}`);
    if (p.notes) lines.push(`• ${p.notes}`);
    if (p.booking) lines.push(es ? `• Reserva oficial: ${p.booking}` : `• Official booking: ${p.booking}`);
  }
  lines.push(es ? 'Fuente: SINAC. Confirma la tarifa y el cupo al reservar.' : 'Source: SINAC. Confirm the fee and space when booking.');
  return lines.join('\n');
}

function toursReply(message: string, es: boolean): string | undefined {
  const m = norm(message);
  const cat = CATEGORY_WORDS.find(([re]) => re.test(m))?.[1];
  const regions = REGION_WORDS.find(([re]) => re.test(m))?.[1];
  const budget = budgetFrom(m);
  if (!cat && !(regions && budget)) return undefined;
  const pool = TOURS.filter((t) => (!cat || t.category === cat) && (!regions || regions.includes(t.region)));
  const priced = pool.filter((t) => t.priceUSD > 0 && (!budget || t.priceUSD <= budget)).sort((a, b) => a.priceUSD - b.priceUSD);
  if (!pool.length) return undefined;
  const lines: string[] = [];
  if (!priced.length) {
    lines.push(es ? `Tengo ${pool.length} opciones${budget ? `, pero ninguna con precio publicado de hasta $${budget}` : ''}. Algunas:` : `I have ${pool.length} options${budget ? `, but none with a published price up to $${budget}` : ''}. Some:`);
    for (const t of pool.slice(0, 3)) lines.push(`• ${es ? t.title.es : t.title.en}${t.priceUSD > 0 ? ` — US$${t.priceUSD}` : ''}${t.operatorName ? ` (${t.operatorName})` : ''}`);
  } else {
    lines.push(es ? `Estas son ${Math.min(priced.length, 4)} opciones${budget ? ` de hasta $${budget}` : ''}, de menor a mayor precio:` : `Here are ${Math.min(priced.length, 4)} options${budget ? ` up to $${budget}` : ''}, cheapest first:`);
    for (const t of priced.slice(0, 4)) {
      const where = t.location?.placeName ? `, ${t.location.placeName}` : '';
      lines.push(`• ${es ? t.title.es : t.title.en} — US$${t.priceUSD}${t.operatorName ? ` · ${t.operatorName}` : ''}${where}`);
    }
  }
  lines.push(es ? 'Son precios publicados por el operador o tarifas de referencia: confirmamos fecha y disponibilidad antes de cualquier pago.' : 'These are operator-published or reference prices: we confirm date and availability before any payment.');
  return lines.join('\n');
}

function bookingReply(message: string, es: boolean): string | undefined {
  const m = norm(message);
  if (!/(reserv|book|booking|apart)/.test(m)) return undefined;
  return es
    ? 'Con gusto lo gestiono. Para pedir la reserva necesito: el tour, la fecha, cuántos adultos y niños, y dónde te recogemos. La reserva solo queda confirmada cuando el operador confirma por escrito; nada se cobra antes.'
    : 'Happy to arrange it. To request the booking I need: the tour, the date, how many adults and children, and your pickup location. It is only confirmed once the operator confirms in writing; nothing is charged before that.';
}

/** Devuelve una respuesta verificable o undefined si la consulta no encaja en ninguna herramienta. */
export function knowledgeToolReply(message: string, language: 'es' | 'en'): string | undefined {
  const es = language !== 'en';
  void loadLayer; // capas cargadas bajo demanda por las herramientas
  return emergencyReply(message, es) ?? guidesReply(message, es) ?? parkReply(message, es) ?? toursReply(message, es) ?? bookingReply(message, es);
}
