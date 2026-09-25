import { Tour } from '../src/types';

export type TourImageRole = 'hero' | 'gallery' | 'activity' | 'destination';

export interface TourImageAsset {
  url: string;
  role: TourImageRole;
  alt: string;
  tags: string[];
  position: number;
  sourceKind: 'curated' | 'provider' | 'customer';
  sourceReference?: string;
  focalPoint?: { x: number; y: number };
}

export interface TourMediaProfile {
  tourId: string;
  primary: TourImageAsset;
  gallery: TourImageAsset[];
  visualIntent: string[];
  imagePolicy: {
    preferActivityOverGenericDestination: boolean;
    avoidRepeatedImages: boolean;
    requireHttpsForRemoteAssets: boolean;
  };
}

const REGION_TAGS: Record<string, string[]> = {
  arenal: ['Arenal', 'La Fortuna', 'volcano', 'rainforest', 'hot springs'],
  monteverde: ['Monteverde', 'cloud forest', 'canopy', 'hanging bridges'],
  manuel_antonio: ['Manuel Antonio', 'rainforest', 'beach', 'wildlife'],
  guanacaste: ['Guanacaste', 'Pacific coast', 'beach', 'sunset'],
  tortuguero: ['Tortuguero', 'canals', 'rainforest', 'wildlife'],
  pacuare: ['Pacuare', 'river', 'rafting', 'rainforest'],
  sjo: ['San José', 'Central Valley', 'volcano', 'coffee'],
  osa: ['Osa', 'Corcovado', 'rainforest', 'wildlife', 'Pacific coast'],
  caribe: ['Caribbean', 'beach', 'rainforest', 'wildlife'],
  caribe_sur: ['Cahuita', 'Puerto Viejo', 'Caribbean', 'beach', 'rainforest'],
};

const CATEGORY_TAGS: Record<string, string[]> = {
  volcanoes: ['volcano', 'nature', 'hiking'],
  wildlife: ['wildlife', 'animals', 'nature'],
  canopy: ['canopy', 'zipline', 'adventure', 'rainforest'],
  beaches: ['beach', 'ocean', 'coast'],
  rafting: ['rafting', 'river', 'adventure'],
  culture: ['culture', 'coffee', 'local experience'],
  hiking: ['hiking', 'trail', 'nature'],
  waterfalls: ['waterfall', 'nature', 'hiking'],
  surf: ['surf', 'beach', 'ocean'],
  snorkeling: ['snorkeling', 'ocean', 'marine life'],
  whale_watching: ['whales', 'marine life', 'ocean'],
  combos: ['tour', 'nature', 'adventure'],
  multiday: ['Costa Rica', 'nature', 'adventure'],
};

function isUsableImageUrl(url: string): boolean {
  return /^https:\/\//i.test(url) || /^\/[^/]/.test(url);
}

function normalizeRemoteImage(url: string): string {
  if (!url.startsWith('https://images.unsplash.com/')) return url;
  const separator = url.includes('?') ? '&' : '?';
  if (/[?&]auto=format/.test(url)) return url;
  return url + separator + 'auto=format&fit=crop&w=1400&q=85';
}

function uniqueImages(urls: string[]): string[] {
  return [...new Set(urls.filter(isUsableImageUrl))];
}

function buildTags(tour: Tour): string[] {
  return [...new Set([
    ...(CATEGORY_TAGS[tour.category] || []),
    ...(REGION_TAGS[tour.region] || []),
    tour.title.es,
    tour.category,
    tour.region,
  ])];
}

function buildAlt(tour: Tour, role: TourImageRole): string {
  const activity = tour.category === 'whale_watching'
    ? 'avistamiento de ballenas'
    : tour.category === 'snorkeling'
      ? 'snorkel'
      : tour.category === 'rafting'
        ? 'rafting'
        : tour.category === 'canopy'
          ? 'canopy y aventura'
          : tour.category === 'volcanoes'
            ? 'volcán y naturaleza'
            : 'experiencia turística';
  const prefix = role === 'hero' ? '' : role === 'gallery' ? 'Experiencia: ' : '';
  return prefix + tour.title.es + ' — ' + activity + ' en Costa Rica';
}

export function getTourMediaProfile(tour: Tour): TourMediaProfile {
  const urls = uniqueImages([tour.image, ...(Array.isArray(tour.gallery) ? tour.gallery : [])])
    .map(normalizeRemoteImage);

  const primaryUrl = urls[0] || tour.image;
  const galleryUrls = urls.slice(1);

  const primary: TourImageAsset = {
    url: primaryUrl,
    role: 'hero',
    alt: buildAlt(tour, 'hero'),
    tags: buildTags(tour),
    position: 0,
    sourceKind: 'curated',
  };

  const gallery = galleryUrls.map((url, index): TourImageAsset => ({
    url,
    role: 'gallery',
    alt: buildAlt(tour, 'gallery'),
    tags: buildTags(tour),
    position: index + 1,
    sourceKind: 'curated',
  }));

  return {
    tourId: tour.id,
    primary,
    gallery,
    visualIntent: [
      'show the actual activity whenever possible',
      'show the destination context second',
      'avoid generic Costa Rica stock imagery',
      'avoid repeating the same image across unrelated tours',
    ],
    imagePolicy: {
      preferActivityOverGenericDestination: true,
      avoidRepeatedImages: true,
      requireHttpsForRemoteAssets: true,
    },
  };
}

export function getTourMediaById(tourId: string, tours: Tour[]): TourMediaProfile | null {
  const tour = tours.find(item => item.id === tourId);
  return tour ? getTourMediaProfile(tour) : null;
}
