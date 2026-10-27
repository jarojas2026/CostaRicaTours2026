/** Practical guidance, not live operational data or individual legal/medical advice. */
export type TravelTopic = 'entry'|'parks'|'weather'|'water'|'adventure'|'wildlife'|'transport'|'accessibility'|'budget'|'packing'|'connectivity'|'culture';
export interface TravelGuide { id:TravelTopic; title:{es:string;en:string}; summary:{es:string;en:string}; steps:{es:string[];en:string[]}; sourceLabel:string; }
export const TRAVEL_GUIDE_REVIEW_DATE = '2026-10-26';
export const TRAVEL_GUIDES: TravelGuide[] = [
  {
    "id": "entry",
    "title": {
      "es": "Documentos y entrada",
      "en": "Documents & entry"
    },
    "summary": {
      "es": "Revisa lo que corresponde a tu pasaporte y ruta.",
      "en": "Check what applies to your passport and route."
    },
    "steps": {
      "es": [
        "Verifica vigencia del pasaporte, visado cuando corresponda y salida del país.",
        "La estancia autorizada la determina Migración; no la deduce esta página.",
        "Confirma también los requisitos de tránsito y de la aerolínea."
      ],
      "en": [
        "Check passport validity, any required visa and onward travel.",
        "Immigration determines the permitted stay; this page does not grant it.",
        "Also check transit-country and airline requirements."
      ]
    },
    "sourceLabel": "ICT · Requisitos de entrada"
  },
  {
    "id": "parks",
    "title": {
      "es": "Entradas y acceso a parques",
      "en": "Park tickets & access"
    },
    "summary": {
      "es": "Una actividad del catálogo no garantiza una entrada.",
      "en": "A catalog activity does not guarantee park admission."
    },
    "steps": {
      "es": [
        "Consulta el parque, sector, fecha y franja de acceso correctos.",
        "Comprueba la reserva, identificación y condiciones directamente en el canal oficial.",
        "Revisa qué entradas incluye tu cotización antes de aceptarla."
      ],
      "en": [
        "Check the correct park, sector, date and entry window.",
        "Verify reservations, identification and conditions through the official channel.",
        "Review which admission fees your quote includes before accepting it."
      ]
    },
    "sourceLabel": "SINAC · Compra y reserva"
  },
  {
    "id": "weather",
    "title": {
      "es": "Clima y cambios de plan",
      "en": "Weather & changing plans"
    },
    "summary": {
      "es": "Consulta el pronóstico y los avisos antes de salir.",
      "en": "Check forecasts and advisories before departure."
    },
    "steps": {
      "es": [
        "El clima puede variar entre regiones y alturas.",
        "Consulta avisos del IMN cerca de la salida y del día de la actividad.",
        "Mantén margen para cambios; aquí no se muestra clima en vivo."
      ],
      "en": [
        "Weather can vary between regions and elevations.",
        "Check IMN advisories close to departure and the activity date.",
        "Allow room for changes; this guide does not display live weather."
      ]
    },
    "sourceLabel": "IMN · Avisos meteorológicos"
  },
  {
    "id": "water",
    "title": {
      "es": "Agua y preparación de salud",
      "en": "Water & health preparation"
    },
    "summary": {
      "es": "Confirma las condiciones del lugar donde te hospedas.",
      "en": "Confirm conditions where you are staying."
    },
    "steps": {
      "es": [
        "El ICT describe agua potable en la mayoría de zonas, con excepciones rurales.",
        "Pregunta por el suministro local y lleva una botella reutilizable.",
        "Consulta a un profesional sobre necesidades personales de salud antes de viajar."
      ],
      "en": [
        "ICT describes potable water in most areas, with rural exceptions.",
        "Ask about the local supply and carry a reusable bottle.",
        "Consult a professional about personal health needs before traveling."
      ]
    },
    "sourceLabel": "ICT · Preguntas de viaje"
  },
  {
    "id": "adventure",
    "title": {
      "es": "Aventura y requisitos",
      "en": "Adventure requirements"
    },
    "summary": {
      "es": "Los requisitos dependen de la actividad y sus condiciones.",
      "en": "Requirements depend on the activity and its conditions."
    },
    "steps": {
      "es": [
        "Confirma edad, tamaño, equipo y experiencia exigidos antes de reservar.",
        "Solicita instrucciones de seguridad y comunica dudas al guía.",
        "No deduzcas aptitud o seguridad únicamente de una foto o descripción."
      ],
      "en": [
        "Confirm age, size, equipment and experience requirements before booking.",
        "Request safety instructions and raise questions with the guide.",
        "Do not infer suitability or safety from a photograph or description alone."
      ]
    },
    "sourceLabel": "ICT · Consejos de viaje"
  },
  {
    "id": "wildlife",
    "title": {
      "es": "Fauna y visita responsable",
      "en": "Wildlife & responsible visits"
    },
    "summary": {
      "es": "Observa sin intervenir en el entorno.",
      "en": "Observe without disturbing the environment."
    },
    "steps": {
      "es": [
        "Permanece en senderos habilitados y sigue las indicaciones del área.",
        "No alimentes, persigas ni manipules fauna silvestre.",
        "Retira tus residuos; una observación de animales no está garantizada."
      ],
      "en": [
        "Stay on designated trails and follow the area instructions.",
        "Do not feed, pursue or handle wildlife.",
        "Take your litter with you; wildlife sightings are not guaranteed."
      ]
    },
    "sourceLabel": "SINAC · Visita segura y responsable"
  },
  {
    "id": "transport",
    "title": {
      "es": "Traslados y conducción",
      "en": "Transfers & driving"
    },
    "summary": {
      "es": "Planifica conexiones, equipaje y margen de llegada.",
      "en": "Plan connections, baggage and arrival buffers."
    },
    "steps": {
      "es": [
        "Confirma recogida, destino, equipaje y servicio por escrito.",
        "Consulta el estado de la ruta antes de salir y evita conexiones ajustadas.",
        "Lee las condiciones e inclusiones del alquiler o traslado."
      ],
      "en": [
        "Confirm pickup, destination, baggage and the service in writing.",
        "Check route conditions before departure and avoid tight connections.",
        "Read rental or transfer conditions and inclusions."
      ]
    },
    "sourceLabel": "ICT · Seguridad en carretera"
  },
  {
    "id": "accessibility",
    "title": {
      "es": "Accesibilidad y apoyo",
      "en": "Accessibility & assistance"
    },
    "summary": {
      "es": "Pregunta por el recorrido concreto que vas a realizar.",
      "en": "Ask about the exact route you intend to take."
    },
    "steps": {
      "es": [
        "Confirma escalones, pendientes, baños, embarque y transporte adaptado.",
        "Describe el apoyo que necesitas sin asumir que todo el lugar está adaptado.",
        "Las condiciones pueden variar por ruta, mantenimiento y clima."
      ],
      "en": [
        "Confirm steps, slopes, restrooms, boarding and adapted transport.",
        "Describe the assistance needed without assuming the whole location is accessible.",
        "Conditions can vary by route, maintenance and weather."
      ]
    },
    "sourceLabel": "ICT · Accesibilidad y preguntas"
  },
  {
    "id": "budget",
    "title": {
      "es": "Presupuesto y moneda",
      "en": "Budget & currency"
    },
    "summary": {
      "es": "Compara el total y la moneda antes de aceptar una cotización.",
      "en": "Compare the total and currency before accepting a quote."
    },
    "steps": {
      "es": [
        "Anota hospedaje, actividades, traslados y gastos personales por separado.",
        "Comprueba impuestos, inclusiones y condiciones de cambio o cancelación.",
        "El conversor usa la tasa disponible en la plataforma; no fija el tipo de tu banco."
      ],
      "en": [
        "List lodging, activities, transfers and personal spending separately.",
        "Review taxes, inclusions and change or cancellation conditions.",
        "The converter uses the available platform rate, not your bank settlement rate."
      ]
    },
    "sourceLabel": "BCCR · Tipo de cambio de referencia"
  },
  {
    "id": "packing",
    "title": {
      "es": "Equipaje para cada entorno",
      "en": "Packing for each environment"
    },
    "summary": {
      "es": "Empaca según el recorrido y las restricciones de equipaje.",
      "en": "Pack for the route and baggage restrictions."
    },
    "steps": {
      "es": [
        "Prepara capas ligeras, impermeable y calzado adecuado al terreno.",
        "Protege documentos y equipos del agua cuando corresponda.",
        "Revisa límites de equipaje de vuelos, botes y traslados."
      ],
      "en": [
        "Prepare light layers, rain protection and terrain-appropriate footwear.",
        "Protect documents and equipment from water where relevant.",
        "Check baggage limits for flights, boats and transfers."
      ]
    },
    "sourceLabel": "ICT · Planificar el viaje"
  },
  {
    "id": "connectivity",
    "title": {
      "es": "Conectividad y electricidad",
      "en": "Connectivity & power"
    },
    "summary": {
      "es": "Revisa compatibilidad y descarga lo esencial antes de salir.",
      "en": "Check compatibility and download essentials before departure."
    },
    "steps": {
      "es": [
        "Confirma roaming o compatibilidad SIM/eSIM con tu equipo y servicio.",
        "Guarda mapas e indicaciones accesibles sin señal.",
        "Comprueba enchufes y voltaje de tus dispositivos; no se garantiza cobertura."
      ],
      "en": [
        "Confirm roaming or SIM/eSIM compatibility with your device and service.",
        "Save maps and directions for use without signal.",
        "Check device plugs and voltage; coverage is not guaranteed."
      ]
    },
    "sourceLabel": "ICT · Información práctica"
  },
  {
    "id": "culture",
    "title": {
      "es": "Comunidades y cultura local",
      "en": "Communities & local culture"
    },
    "summary": {
      "es": "Acuerda el tipo de visita y respeta sus condiciones.",
      "en": "Agree on the visit format and respect local conditions."
    },
    "steps": {
      "es": [
        "Consulta idioma, duración y acceso antes de organizar una visita.",
        "Pregunta antes de fotografiar personas o espacios privados.",
        "Una experiencia publicada como idea no confirma operación ni cupos."
      ],
      "en": [
        "Ask about language, duration and access before arranging a visit.",
        "Ask before photographing people or private spaces.",
        "An experience published as inspiration does not confirm operation or spaces."
      ]
    },
    "sourceLabel": "ICT · Planificar experiencias"
  }
];
