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
import { pickTourPhotos } from './photoCatalog';

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
  const [image, galleryImage] = pickTourPhotos({ id: row.id, region: row.region, category: row.category, title: { es: row.titleEs, en: row.titleEn } });
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
    gallery: [image, galleryImage],
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
