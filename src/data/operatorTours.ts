/**
 * Tours de consulta del catálogo público (ver data/fuentes/catalogo/SPEC.md).
 * Se generan con scripts/catalog/build_operator_tours.py → catalogTours.json (PÚBLICO).
 *
 * Decisión del negocio: el cliente no ve ningún dato del proveedor antes de reservar
 * (nombre, web, fuente, contactos). Esos datos viven solo en el servidor
 * (archivo interno del servidor) y la identidad del operador se revela en la
 * confirmación de la reserva. No importar datos internos del servidor desde src/.
 *
 * Todos son de consulta (catalogStatus 'inquiry'): el precio es de referencia y se
 * confirma antes de cobrar. Sin reseñas ni ratings inventados.
 */
import type { Tour, TourCategory, TourRegion } from '../types';
import data from './catalogTours.json';

export interface OperatorTourRow {
  id: string;
  slug: string;
  titleEs: string;
  titleEn: string;
  category: string;
  region: string;
  placeName: string;
  lat: number;
  lng: number;
  priceUSD: number;
  childPriceUSD?: number;
  durationHours: number;
  difficulty: string;
  descriptionEs: string;
  descriptionEn: string;
  includes: string[];
  ageMinimum?: number;
  priceNote?: string;
}

const U = (id: string) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1200&q=85`;
const CATEGORY_IMAGES: Record<TourCategory, string> = {
  volcanoes: U('1651261932254-fd342bc4d999'),
  wildlife: U('1742857235280-8633fa7b5992'),
  canopy: U('1683414903327-f5a2fcb37020'),
  beaches: U('1519793043130-c584f53c3277'),
  rafting: U('1685550903259-96799741df9e'),
  culture: U('1643400811908-ed46db6c8066'),
  multiday: U('1616563838466-520a4d28466e'),
  combos: U('1523295973995-bd4218f07a32'),
  adventure: U('1770848891773-9d866a56dd3d'),
  nature: U('1727719494784-1865317344d9'),
  hiking: U('1723144455080-6ba5b5f6b527'),
  waterfalls: U('1711882569452-967be6941ddd'),
  rural: U('1576758597367-2840b9dc1a2b'),
  gastronomy: U('1712251769863-9b64ed58b5b9'),
  surf: U('1636657795425-0db7a2b0528a'),
  snorkeling: U('1714328003874-e730ff96fdd5'),
  diving: U('1714328003874-e730ff96fdd5'),
  whale_watching: U('1712933342478-51b92117ca80'),
  kayak: U('1509392671875-6ad9dd6ccf9d'),
  fishing: U('1509392671875-6ad9dd6ccf9d'),
  family: U('1770848891773-9d866a56dd3d'),
  services: U('1544979590-37e9b47eb705'),
};

const DIFFICULTY_LABEL: Record<Tour['difficulty'], { es: string; en: string }> = {
  'fácil': { es: 'Fácil', en: 'Easy' },
  moderado: { es: 'Moderado', en: 'Moderate' },
  exigente: { es: 'Exigente', en: 'Challenging' },
  por_confirmar: { es: 'Por confirmar', en: 'To be confirmed' },
};

const durationLabel = (h: number) => {
  if (!h) return { es: 'Duración por confirmar', en: 'Duration to be confirmed' };
  // Elapsed hours do not establish the number of calendar days in a package.
  const n = Number.isInteger(h) ? String(h) : h.toFixed(1);
  return { es: `${n} h`, en: `${n} hrs` };
};

const asDifficulty = (d: string): Tour['difficulty'] =>
  d === 'fácil' || d === 'moderado' || d === 'exigente' ? d : 'por_confirmar';

export function mapOperatorTour(row: OperatorTourRow): Tour {
  const difficulty = asDifficulty(row.difficulty);
  const image = CATEGORY_IMAGES[row.category as TourCategory] ?? CATEGORY_IMAGES.nature;
  const includes = row.includes ?? [];
  const where = row.placeName;
  return {
    id: row.id,
    slug: row.slug || row.id,
    title: { es: row.titleEs, en: row.titleEn },
    subtitle: { es: where, en: where },
    category: row.category as TourCategory,
    region: row.region as TourRegion,
    image,
    gallery: [image],
    priceUSD: row.priceUSD,
    ...(row.childPriceUSD !== undefined ? { childPriceUSD: row.childPriceUSD } : {}),
    durationHours: row.durationHours,
    durationLabel: durationLabel(row.durationHours),
    difficulty,
    difficultyLabel: DIFFICULTY_LABEL[difficulty],
    rating: 0,
    reviewsCount: 0,
    reviewsVerified: false,
    ecoCert: false,
    ...(row.ageMinimum !== undefined ? { ageMinimum: row.ageMinimum } : {}),
    catalogStatus: 'inquiry',
    isDemoData: false,
    description: { es: row.descriptionEs, en: row.descriptionEn },
    highlights: { es: [], en: [] },
    inclusions: { es: includes, en: includes },
    exclusions: { es: [], en: [] },
    whatToBring: { es: [], en: [] },
    pickupHotels: [],
    departureTimes: [],
    location: { lat: row.lat, lng: row.lng, placeName: row.placeName },
    instantConfirmation: false,
    bestPriceGuaranteed: false,
    priceSource: 'precio_referencia',
    priceCheckedAt: data.reviewedAt,
    ...(row.priceNote ? { priceNote: row.priceNote } : {}),
  };
}

export const OPERATOR_TOUR_ROWS = data.tours as OperatorTourRow[];
export const OPERATOR_TOURS: Tour[] = OPERATOR_TOUR_ROWS.map(mapOperatorTour);
