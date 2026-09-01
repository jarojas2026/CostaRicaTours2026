import re

with open('src/data/toursData.ts', 'r', encoding='utf-8') as f:
    content = f.read()

combo_tour = """export const TOURS: Tour[] = [
  {
    id: 'sjo-3-in-1-combo',
    title: {
      es: 'Combo 3-en-1: Volcán Poás, Doka Coffee & Cataratas La Paz',
      en: '3-in-1 Combo: Poás Volcano, Doka Coffee Estate & La Paz Waterfalls'
    },
    subtitle: {
      es: 'El tour de 1 día más popular desde San José',
      en: 'The most popular 1-day tour from San Jose'
    },
    category: 'combos',
    region: 'sjo',
    image: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=1200&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=800&q=80'
    ],
    priceUSD: 145,
    durationHours: 10,
    durationLabel: { es: 'Día Completo (10 hrs)', en: 'Full Day (10 hrs)' },
    difficulty: 'fácil',
    difficultyLabel: { es: 'Fácil - Todas las edades', en: 'Easy - All ages' },
    rating: 4.9,
    reviewsCount: 845,
    featured: true,
    bestseller: true,
    ecoCert: true,
    tourType: 'group',
    maxGroupSize: 15,
    freeCancellation: true,
    description: {
      es: 'Aprovecha al máximo tu estadía en San José con este increíble Combo de 1 Día. Primero visitaremos las plantaciones de café Doka Estate para desayunar y hacer el tour del café. Luego subiremos al cráter principal del Volcán Poás (uno de los cráteres tipo géiser más grandes del mundo). Terminamos en los espectaculares Jardines de la Catarata La Paz, donde almorzaremos un buffet típico y caminaremos por el aviario, mariposario y las cataratas mágicas. Salida desde San José.',
      en: 'Maximize your stay in San Jose with this incredible 1-Day Combo. First, we visit Doka Estate coffee plantations for breakfast and the coffee tour. Then we ascend to the main crater of Poás Volcano (one of the largest geyser-type craters in the world). We finish at the spectacular La Paz Waterfall Gardens, where we will have a traditional buffet lunch and walk through the aviary, butterfly observatory, and magical waterfalls. Departs from San Jose.'
    },
    highlights: {
      es: ['Tour guiado de café', 'Entrada al Parque Nacional Volcán Poás', 'Santuario de Vida Silvestre La Paz', 'Desayuno y almuerzo buffet incluidos', 'Transporte desde tu hotel en San José'],
      en: ['Guided coffee tour', 'Poás Volcano National Park entrance', 'La Paz Waterfall Wildlife Sanctuary', 'Breakfast and buffet lunch included', 'Roundtrip transport from San Jose hotels']
    },
    includes: {
      es: ['Transporte A/C', 'Guía bilingüe certificado', 'Desayuno', 'Almuerzo', 'Todas las entradas'],
      en: ['A/C Transportation', 'Bilingual certified guide', 'Breakfast', 'Lunch', 'All entrance fees']
    },
    notIncluded: {
      es: ['Propinas', 'Gastos personales'],
      en: ['Gratuities', 'Personal expenses']
    },
    whatToBring: {
      es: ['Abrigo ligero', 'Zapatos cómodos', 'Cámara', 'Impermeable'],
      en: ['Light jacket', 'Comfortable walking shoes', 'Camera', 'Raincoat']
    },
    itinerary: [
      {
        title: { es: '6:30 AM - Recogida en San José', en: '6:30 AM - San Jose Pickup' },
        description: { es: 'Recogida en los principales hoteles del Gran Área Metropolitana.', en: 'Pickup from major hotels in the Greater Metropolitan Area.' }
      },
      {
        title: { es: '8:00 AM - Doka Estate', en: '8:00 AM - Doka Estate' },
        description: { es: 'Desayuno típico y tour inmersivo de café.', en: 'Traditional breakfast and immersive coffee tour.' }
      },
      {
        title: { es: '10:30 AM - Volcán Poás', en: '10:30 AM - Poás Volcano' },
        description: { es: 'Caminata hasta el mirador del cráter principal.', en: 'Walk to the main crater viewpoint.' }
      },
      {
        title: { es: '12:30 PM - La Paz Waterfall Gardens', en: '12:30 PM - La Paz Waterfall Gardens' },
        description: { es: 'Almuerzo buffet y caminata por las cataratas y santuario de animales.', en: 'Buffet lunch and walk through the waterfalls and animal sanctuary.' }
      }
    ]
  },"""

content = content.replace("export const TOURS: Tour[] = [", combo_tour)

with open('src/data/toursData.ts', 'w', encoding='utf-8') as f:
    f.write(content)
