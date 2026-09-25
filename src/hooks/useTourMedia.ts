import { useEffect, useState } from 'react';

export interface TourMediaAsset {
  url: string;
  role: 'hero' | 'gallery' | 'activity' | 'destination';
  alt: string;
  tags: string[];
  position: number;
  sourceKind: 'curated' | 'provider' | 'customer';
  sourceReference?: string;
  focalPoint?: { x: number; y: number };
}

export interface TourMediaProfile {
  tourId: string;
  primary: TourMediaAsset | null;
  gallery: TourMediaAsset[];
  visualIntent: string[];
  imagePolicy: string[];
}

const mediaCache = new Map<string, TourMediaProfile>();

export function useTourMedia(tourId: string | undefined, fallback?: {
  image?: string;
  gallery?: string[];
  title?: string;
}) {
  const [media, setMedia] = useState<TourMediaProfile | null>(() => {
    if (!tourId) return null;
    return mediaCache.get(tourId) || null;
  });
  const [loading, setLoading] = useState(Boolean(tourId && !mediaCache.has(tourId)));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tourId) {
      setMedia(null);
      setLoading(false);
      return;
    }

    const cached = mediaCache.get(tourId);
    if (cached) {
      setMedia(cached);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError(null);

    fetch(`/api/tours/${encodeURIComponent(tourId)}/media`, {
      signal: controller.signal,
      headers: { Accept: 'application/json' }
    })
      .then(async (response) => {
        const payload = await response.json().catch(() => null);
        if (!response.ok) throw new Error(payload?.error || 'No se pudo cargar la galería.');
        return payload?.media as TourMediaProfile;
      })
      .then((profile) => {
        if (!profile) throw new Error('Perfil multimedia vacío.');
        mediaCache.set(tourId, profile);
        setMedia(profile);
      })
      .catch((err: any) => {
        if (err?.name !== 'AbortError') setError(err?.message || 'Error multimedia');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [tourId]);

  const fallbackAssets: TourMediaAsset[] = [
    ...(fallback?.image ? [{
      url: fallback.image,
      role: 'hero' as const,
      alt: fallback.title || 'Experiencia de Costa Rica',
      tags: [],
      position: 0,
      sourceKind: 'curated' as const
    }] : []),
    ...(fallback?.gallery || [])
      .filter((url) => url && url !== fallback?.image)
      .map((url, index) => ({
        url,
        role: 'gallery' as const,
        alt: fallback?.title || 'Experiencia de Costa Rica',
        tags: [],
        position: index + 1,
        sourceKind: 'curated' as const
      }))
  ];

  const assets = media
    ? [media.primary, ...media.gallery].filter(Boolean) as TourMediaAsset[]
    : fallbackAssets;

  return {
    media,
    assets,
    loading,
    error
  };
}
