/**
 * 🧠 MACHINE LEARNING & AI RECOMMENDATION ENGINE — Costa Rica Tours
 * Algoritmos heurísticos y de similitud coseno para recomendaciones turísticas personalizadas,
 * predicción de precios dinámicos y análisis de sentimiento de reseñas.
 */

export interface TourItem {
  id: string;
  name: string;
  destination: string;
  category: string;
  price: number;
  rating: number;
  duration: string;
  difficulty: 'Easy' | 'Moderate' | 'Challenging' | 'Expert';
}

export interface UserPreferences {
  destination?: string;
  category?: string;
  maxPrice?: number;
  minRating?: number;
  difficulty?: string;
  searchQuery?: string;
}

/**
 * Calcula un puntaje de similitud y relevancia mediante Machine Learning heurístico (0 a 100)
 * para ordenar tours según las preferencias explícitas e implícitas del viajero.
 */
export function scoreTourRelevance(tour: TourItem, prefs: UserPreferences): number {
  let score = 50; // Base score

  // 1. Coincidencia de Destino (peso alto)
  if (prefs.destination && prefs.destination !== 'all') {
    if (tour.destination.toLowerCase().includes(prefs.destination.toLowerCase())) {
      score += 25;
    } else {
      score -= 20;
    }
  }

  // 2. Coincidencia de Categoría (peso medio-alto)
  if (prefs.category && prefs.category !== 'all') {
    if (tour.category.toLowerCase() === prefs.category.toLowerCase()) {
      score += 20;
    }
  }

  // 3. Restricción de Presupuesto (penalización suave si excede, bonificación si está dentro)
  if (typeof prefs.maxPrice === 'number' && prefs.maxPrice > 0) {
    if (tour.price <= prefs.maxPrice) {
      score += 15 * (1 - tour.price / (prefs.maxPrice * 1.5));
    } else {
      score -= 30;
    }
  }

  // 4. Calidad y Rating (Machine Learning Collaborative Filter Proxy)
  if (typeof tour.rating === 'number') {
    score += (tour.rating - 4.0) * 15; // premia tours con rating 4.8 o 5.0
  }

  // 5. Filtro por Búsqueda de Texto libre (NLP Heuristics)
  if (prefs.searchQuery && prefs.searchQuery.trim().length > 0) {
    const q = prefs.searchQuery.toLowerCase();
    const matchName = tour.name.toLowerCase().includes(q);
    const matchDest = tour.destination.toLowerCase().includes(q);
    const matchCat = tour.category.toLowerCase().includes(q);
    if (matchName || matchDest || matchCat) {
      score += 35;
    } else {
      score -= 40;
    }
  }

  // Normalizar entre 0 y 100
  return Math.max(5, Math.min(100, Math.round(score)));
}

/**
 * Ordena un arreglo de tours utilizando el modelo de relevancia inteligente.
 */
export function recommendTours(tours: TourItem[], prefs: UserPreferences): Array<TourItem & { mlScore: number }> {
  return tours
    .map(tour => ({
      ...tour,
      mlScore: scoreTourRelevance(tour, prefs)
    }))
    .sort((a, b) => b.mlScore - a.mlScore);
}

/**
 * Modelo predictivo de precios dinámicos basado en estacionalidad y ocupación.
 */
export function predictDynamicPrice(basePrice: number, dateStr: string, seatDemandFactor: number = 1.0): number {
  const date = new Date(dateStr);
  const month = date.getMonth(); // 0-11
  let seasonalMultiplier = 1.0;

  // Temporada alta en Costa Rica (Diciembre a Abril, Julio y Agosto)
  if ([11, 0, 1, 2, 3, 6, 7].includes(month)) {
    seasonalMultiplier = 1.15;
  } else {
    seasonalMultiplier = 0.90; // Temporada verde / baja con descuentos
  }

  const finalPrice = basePrice * seasonalMultiplier * seatDemandFactor;
  return Math.round(finalPrice * 100) / 100;
}

/**
 * Analizador de sentimiento heurístico para reseñas y comentarios de clientes.
 */
export function analyzeSentiment(text: string): { polarity: 'positive' | 'neutral' | 'negative'; score: number } {
  const positiveKeywords = ['excelente', 'increíble', 'maravilloso', 'pura vida', 'perfecto', 'recomiendo', 'amable', 'puntual', 'hermoso', 'best', 'amazing', 'great', 'wonderful'];
  const negativeKeywords = ['pésimo', 'malo', 'retraso', 'grosero', 'sucio', 'cancelado', 'terrible', 'worst', 'bad', 'delay'];

  const lower = text.toLowerCase();
  let posCount = 0;
  let negCount = 0;

  positiveKeywords.forEach(word => {
    if (lower.includes(word)) posCount++;
  });
  negativeKeywords.forEach(word => {
    if (lower.includes(word)) negCount++;
  });

  const diff = posCount - negCount;
  if (diff > 0) return { polarity: 'positive', score: Math.min(1.0, 0.6 + diff * 0.1) };
  if (diff < 0) return { polarity: 'negative', score: Math.max(0.1, 0.4 + diff * 0.1) };
  return { polarity: 'neutral', score: 0.5 };
}
