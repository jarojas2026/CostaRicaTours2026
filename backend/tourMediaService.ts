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

export interface TourMediaAuditItem {
  tourId: string;
  score: number;
  issues: string[];
  primaryUrl: string;
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

function getActivityFocus(tour: Tour): string[] {
  const text = (tour.title.es + ' ' + tour.description.es + ' ' + tour.category).toLowerCase();
  const rules: Array<[string, string[]]> = [
    ['whale_watching', ['ballena', 'delfín', 'whale', 'dolphin']],
    ['snorkeling', ['snorkel', 'buceo', 'isla del caño', 'cano island']],
    ['rafting', ['rafting', 'río', 'river', 'rápidos']],
    ['canopy', ['canopy', 'zipline', 'tirolesa', 'puentes']],
    ['surf', ['surf', 'ola', 'playa']],
    ['volcanoes', ['volcán', 'volcano', 'lava', 'termal']],
    ['waterfalls', ['catarata', 'cascada', 'waterfall']],
    ['wildlife', ['perezoso', 'mono', 'fauna', 'wildlife', 'animal']],
    ['culture', ['café', 'coffee', 'cacao', 'chocolate', 'cultura', 'indígena']],
    ['hiking', ['senderismo', 'hiking', 'caminata', 'trail']],
    ['beaches', ['playa', 'beach', 'catamarán', 'sunset']],
  ];
  const matched = rules.filter(([, keywords]) => keywords.some(keyword => text.includes(keyword))).map(([name]) => name);
  return matched.length ? matched : [tour.category];
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
  const activityFocus = getActivityFocus(tour);
  const galleryUrls = urls.slice(1);

  const primary: TourImageAsset = {
    url: primaryUrl,
    role: 'hero',
    alt: buildAlt(tour, 'hero'),
    tags: [...buildTags(tour), ...activityFocus],
    position: 0,
    sourceKind: 'curated',
    sourceReference: primaryUrl.includes('images.unsplash.com') ? 'Unsplash' : 'project-curated',
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
      'activity focus: ' + activityFocus.join(', '),
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


/**
 * Audita todo el catálogo para detectar imágenes repetidas, galerías insuficientes
 * y falta de enfoque visual en la actividad que realmente se vende.
 */
export function auditTourMedia(tours: Tour[]): TourMediaAuditItem[] {
  const profiles = tours.map(tour => getTourMediaProfile(tour));
  const heroUsage = new Map<string, string[]>();
  for (const profile of profiles) {
    const ids = heroUsage.get(profile.primary.url) || [];
    ids.push(profile.tourId);
    heroUsage.set(profile.primary.url, ids);
  }
  return profiles.map(profile => {
    const issues: string[] = [];
    const duplicateCount = heroUsage.get(profile.primary.url)?.length || 0;
    if (duplicateCount > 1) issues.push(`hero_repeated_across_${duplicateCount}_tours`);
    if (profile.gallery.length < 1) issues.push('gallery_missing');
    if (profile.primary.url === profile.gallery[0]?.url) issues.push('hero_gallery_duplicate');
    const score = Math.max(0, 100 - issues.length * 30 - (duplicateCount > 1 ? 15 : 0));
    return { tourId: profile.tourId, score, issues, primaryUrl: profile.primary.url };
  });
}
