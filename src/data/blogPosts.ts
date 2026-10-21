/**
 * Travel guide articles (ES/EN). Facts are kept to stable, sourced
 * information (SINAC, ICT); no prices or availability are promised.
 */

type Bi = { es: string; en: string };

export interface BlogSection {
  heading: Bi;
  paragraphs: { es: string[]; en: string[] };
}

export interface BlogPost {
  slug: string;
  title: Bi;
  excerpt: Bi;
  metaDescription: Bi;
  image: string;
  imageAlt: Bi;
  date: Bi;
  author: Bi;
  sections: BlogSection[];
  sources: Array<{ href: string; label: string }>;
}

const AUTHOR: Bi = { es: 'Equipo Costa Rica Tours', en: 'Costa Rica Tours team' };
const DATE: Bi = { es: '14 oct 2026', en: 'Oct 14, 2026' };

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: 'lugares-para-visitar-en-costa-rica',
    title: {
      es: '10 lugares para visitar en Costa Rica',
      en: '10 places to visit in Costa Rica',
    },
    excerpt: {
      es: 'Volcanes, bosque nuboso, dos costas y montaña: una ruta por diez destinos y lo que conviene saber antes de ir.',
      en: 'Volcanoes, cloud forest, two coasts and mountains: ten destinations and what to know before you go.',
    },
    metaDescription: {
      es: 'Guía de 10 destinos de Costa Rica: Arenal, Monteverde, Manuel Antonio, Tortuguero, Corcovado, Marino Ballena, Poás, Rincón de la Vieja, Caribe Sur y Chirripó.',
      en: 'Guide to 10 Costa Rica destinations: Arenal, Monteverde, Manuel Antonio, Tortuguero, Corcovado, Marino Ballena, Poás, Rincón de la Vieja, South Caribbean and Chirripó.',
    },
    image: 'https://images.unsplash.com/photo-1651261932254-fd342bc4d999?auto=format&fit=crop&w=1200&q=85',
    imageAlt: { es: 'Paisaje de Costa Rica', en: 'Costa Rica landscape' },
    date: DATE,
    author: AUTHOR,
    sections: [
      {
        heading: { es: 'Antes de empezar', en: 'Before you start' },
        paragraphs: {
          es: [
            'Costa Rica es pequeña en el mapa, pero los traslados por montaña toman tiempo. Conviene agrupar destinos por región en lugar de cruzar el país varias veces. Horarios, tarifas y requisitos de los parques cambian: confírmalos en el sitio oficial del SINAC antes de viajar.',
          ],
          en: [
            'Costa Rica looks small on the map, but mountain roads take time. Group destinations by region instead of crossing the country several times. Park hours, fees and requirements change: confirm them on SINAC’s official site before you travel.',
          ],
        },
      },
      {
        heading: { es: '1. Volcán Arenal y La Fortuna', en: '1. Arenal Volcano and La Fortuna' },
        paragraphs: {
          es: ['El cono del Arenal domina la zona norte. Alrededor hay senderos del Parque Nacional Volcán Arenal, aguas termales, puentes colgantes y ríos para rafting. Es una buena base de dos o tres noches.'],
          en: ['Arenal’s cone dominates the northern region. Around it you find Arenal Volcano National Park trails, hot springs, hanging bridges and rafting rivers. It works well as a two- or three-night base.'],
        },
      },
      {
        heading: { es: '2. Monteverde', en: '2. Monteverde' },
        paragraphs: {
          es: ['Bosque nuboso con reservas privadas y públicas, puentes colgantes y caminatas nocturnas. Lleva abrigo: en las alturas hace fresco y llueve con frecuencia.'],
          en: ['Cloud forest with private and public reserves, hanging bridges and night walks. Bring a warm layer: it is cool and often rainy at altitude.'],
        },
      },
      {
        heading: { es: '3. Manuel Antonio', en: '3. Manuel Antonio' },
        paragraphs: {
          es: ['En el Pacífico Central, el parque nacional combina playas y bosque con monos y perezosos. Tiene control de capacidad; compra la entrada en el sistema oficial del SINAC y revisa los días de cierre.'],
          en: ['On the Central Pacific, the national park combines beaches and forest with monkeys and sloths. Capacity is controlled; buy your ticket through SINAC’s official system and check closing days.'],
        },
      },
      {
        heading: { es: '4. Tortuguero', en: '4. Tortuguero' },
        paragraphs: {
          es: ['Canales y playas en el Caribe Norte, accesibles en bote o avioneta. Es conocido por la anidación de tortugas marinas; los tours nocturnos de desove se hacen con guía autorizado y en temporada.'],
          en: ['Canals and beaches on the North Caribbean coast, reached by boat or small plane. It is known for sea-turtle nesting; night nesting tours run with an authorized guide and only in season.'],
        },
      },
      {
        heading: { es: '5. Corcovado y la península de Osa', en: '5. Corcovado and the Osa Peninsula' },
        paragraphs: {
          es: ['Uno de los lugares más biodiversos del país. Desde 2014 el ingreso al Parque Nacional Corcovado requiere guía certificado. Se llega desde Bahía Drake o Puerto Jiménez.'],
          en: ['One of the most biodiverse places in the country. Since 2014 entry to Corcovado National Park requires a certified guide. Access is from Drake Bay or Puerto Jiménez.'],
        },
      },
      {
        heading: { es: '6. Uvita y Parque Nacional Marino Ballena', en: '6. Uvita and Marino Ballena National Park' },
        paragraphs: {
          es: ['Primer parque nacional marino del país, con la famosa “cola de ballena” que se recorre en marea baja. Las ballenas jorobadas llegan en dos temporadas (ver nuestra guía de ballenas).'],
          en: ['The country’s first marine national park, with the famous “whale tail” sandbar you can walk at low tide. Humpback whales arrive in two seasons (see our whale guide).'],
        },
      },
      {
        heading: { es: '7. Volcán Poás', en: '7. Poás Volcano' },
        paragraphs: {
          es: ['Cerca del Valle Central, ideal para medio día. El ingreso al sector del cráter es solo con reservación en línea del SINAC y el acceso puede cambiar según la actividad volcánica.'],
          en: ['Close to the Central Valley, good for half a day. Entry to the crater sector is by SINAC online reservation only, and access can change with volcanic activity.'],
        },
      },
      {
        heading: { es: '8. Rincón de la Vieja (Guanacaste)', en: '8. Rincón de la Vieja (Guanacaste)' },
        paragraphs: {
          es: ['Paisaje volcánico con fumarolas, pailas de barro y cataratas, a poca distancia de Liberia y las playas de Guanacaste.'],
          en: ['Volcanic landscape with fumaroles, mud pots and waterfalls, a short drive from Liberia and Guanacaste’s beaches.'],
        },
      },
      {
        heading: { es: '9. Caribe Sur: Cahuita y Puerto Viejo', en: '9. South Caribbean: Cahuita and Puerto Viejo' },
        paragraphs: {
          es: ['Playas, arrecife y cultura afrocaribeña. El Parque Nacional Cahuita protege bosque costero y arrecife de coral.'],
          en: ['Beaches, reef and Afro-Caribbean culture. Cahuita National Park protects coastal forest and coral reef.'],
        },
      },
      {
        heading: { es: '10. Chirripó y Pérez Zeledón', en: '10. Chirripó and Pérez Zeledón' },
        paragraphs: {
          es: ['El Cerro Chirripó es la cumbre más alta del país. El ascenso suele hacerse en dos días con noche en el albergue, con cupos limitados que se reservan por el sistema del SINAC. San Isidro de El General, en Pérez Zeledón, es la puerta de entrada.'],
          en: ['Cerro Chirripó is the country’s highest peak. The climb is usually done over two days with a night at the base lodge, with limited spots booked through SINAC’s system. San Isidro de El General, in Pérez Zeledón, is the gateway.'],
        },
      },
      {
        heading: { es: '¿Quieres armar la ruta?', en: 'Want help building the route?' },
        paragraphs: {
          es: ['Cuéntanos fechas, número de personas e intereses. Te proponemos un orden lógico y confirmamos operador, precio y cupo antes de cualquier pago.'],
          en: ['Tell us your dates, party size and interests. We will suggest a logical order and confirm operator, price and availability before any payment.'],
        },
      },
    ],
    sources: [
      { href: 'https://www.sinac.go.cr', label: 'SINAC — Sistema Nacional de Áreas de Conservación' },
      { href: 'https://www.sinac.go.cr/en-us/ac/acosa/pnc/pages/default.aspx', label: 'SINAC — Parque Nacional Corcovado' },
      { href: 'https://ticotimes.net/2014/02/01/new-rule-requires-guides-to-accompany-visitors-in-corcovado-national-park', label: 'The Tico Times (2014) — Corcovado guide requirement' },
    ],
  },
  {
    slug: 'ballenas-marino-ballena-temporadas',
    title: {
      es: 'Cuándo ver ballenas en Marino Ballena (Uvita)',
      en: 'When to see whales in Marino Ballena (Uvita)',
    },
    excerpt: {
      es: 'Las ballenas jorobadas llegan al Pacífico Sur en dos temporadas al año. Te contamos cuándo y cómo verlas con respeto.',
      en: 'Humpback whales reach the South Pacific in two seasons a year. When to go and how to watch them responsibly.',
    },
    metaDescription: {
      es: 'Temporadas de ballenas jorobadas en el Parque Nacional Marino Ballena: hemisferio norte (diciembre–abril) y sur (julio–noviembre), según el SINAC.',
      en: 'Humpback whale seasons in Marino Ballena National Park: northern population (December–April) and southern (July–November), according to SINAC.',
    },
    image: 'https://images.unsplash.com/photo-1549488344-1f9b8d2bd1f3?auto=format&fit=crop&q=80',
    imageAlt: { es: 'Ballena jorobada en el océano', en: 'Humpback whale in the ocean' },
    date: DATE,
    author: AUTHOR,
    sections: [
      {
        heading: { es: 'Dos temporadas, dos poblaciones', en: 'Two seasons, two populations' },
        paragraphs: {
          es: [
            'Según el SINAC, las ballenas jorobadas visitan el Parque Nacional Marino Ballena en dos temporadas: las que vienen del hemisferio norte, de diciembre a abril, y las del hemisferio sur, de julio a noviembre. Llegan a aguas cálidas para reproducirse y criar.',
            'Los delfines residentes pueden observarse durante todo el año.',
          ],
          en: [
            'According to SINAC, humpback whales visit Marino Ballena National Park in two seasons: whales from the northern hemisphere from December to April, and from the southern hemisphere from July to November. They come to warm waters to breed and raise their calves.',
            'Resident dolphins can be seen all year round.',
          ],
        },
      },
      {
        heading: { es: 'El parque', en: 'The park' },
        paragraphs: {
          es: [
            'Marino Ballena fue el primer parque nacional marino de Costa Rica. Se creó por decreto en 1989 y su creación se formalizó en 1992. Tiene cuatro sectores de acceso oficial: Uvita, Colonia, Ballena y Piñuela.',
            'Su símbolo es el tómbolo con forma de cola de ballena en Punta Uvita, que solo se puede caminar con marea baja: revisa la tabla de mareas.',
          ],
          en: [
            'Marino Ballena was Costa Rica’s first marine national park. It was created by decree in 1989 and formally established in 1992. It has four official access sectors: Uvita, Colonia, Ballena and Piñuela.',
            'Its icon is the whale-tail-shaped sandbar at Punta Uvita, which can only be walked at low tide: check the tide table.',
          ],
        },
      },
      {
        heading: { es: 'Cómo verlas con respeto', en: 'How to watch them responsibly' },
        paragraphs: {
          es: [
            'Elige un operador con permisos vigentes que respete las distancias y tiempos de observación, sin perseguir ni rodear a los animales. Ningún operador serio puede garantizar avistamientos: la naturaleza no se agenda.',
            'Las condiciones del mar cambian; los tours pueden reprogramarse por clima.',
          ],
          en: [
            'Choose an operator with current permits that respects viewing distances and times and never chases or surrounds the animals. No serious operator can guarantee sightings: nature does not keep a schedule.',
            'Sea conditions change; tours may be rescheduled because of weather.',
          ],
        },
      },
      {
        heading: { es: 'Planifica tu salida', en: 'Plan your trip' },
        paragraphs: {
          es: ['Indícanos fecha y número de personas y te confirmamos operador, precio y cupo antes de cualquier pago. La entrada al parque se paga al SINAC.'],
          en: ['Tell us the date and party size and we will confirm operator, price and availability before any payment. The park entrance fee is paid to SINAC.'],
        },
      },
    ],
    sources: [
      { href: 'https://www.sinac.go.cr/ES/ac/acosa/pnmb/Paginas/default.aspx', label: 'SINAC — Parque Nacional Marino Ballena' },
      { href: 'https://diquis.go.cr/es/mapa-atractivos/parque-nacional-marino-ballena', label: 'Diquís — Parque Nacional Marino Ballena' },
    ],
  },
  {
    slug: 'viaje-sostenible-costa-rica',
    title: {
      es: 'Cómo planificar un viaje sostenible a Costa Rica',
      en: 'How to plan a sustainable trip to Costa Rica',
    },
    excerpt: {
      es: 'Certificaciones que existen de verdad, normas de los parques y pequeñas decisiones que reducen tu huella.',
      en: 'Certifications that actually exist, park rules and small choices that reduce your footprint.',
    },
    metaDescription: {
      es: 'Consejos prácticos para viajar de forma sostenible en Costa Rica: CST del ICT, normas del SINAC, fauna, comunidades y protección de la niñez.',
      en: 'Practical tips for sustainable travel in Costa Rica: ICT’s CST certification, SINAC rules, wildlife, communities and child protection.',
    },
    image: 'https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?auto=format&fit=crop&q=80',
    imageAlt: { es: 'Bosque tropical en Costa Rica', en: 'Tropical forest in Costa Rica' },
    date: DATE,
    author: AUTHOR,
    sections: [
      {
        heading: { es: 'Busca la CST del ICT', en: 'Look for ICT’s CST' },
        paragraphs: {
          es: [
            'La Certificación para la Sostenibilidad Turística (CST) es un programa voluntario del Instituto Costarricense de Turismo (ICT) que evalúa la gestión sostenible de empresas turísticas. Tiene niveles (básico y élite). Pide al hotel u operador que te indique su certificación vigente.',
          ],
          en: [
            'The Certification for Sustainable Tourism (CST) is a voluntary program of the Costa Rican Tourism Board (ICT) that assesses how sustainably tourism businesses are managed. It has levels (basic and elite). Ask your hotel or operator for its current certification.',
          ],
        },
      },
      {
        heading: { es: 'Contrata guías y operadores habilitados', en: 'Hire licensed guides and operators' },
        paragraphs: {
          es: ['El ICT y el SINAC recomiendan verificar que el operador o guía tenga las certificaciones del ICT o los permisos de operación correspondientes. En algunos parques, como Corcovado, el guía certificado es obligatorio.'],
          en: ['ICT and SINAC recommend checking that your operator or guide holds ICT certifications or the corresponding operating permits. In some parks, such as Corcovado, a certified guide is mandatory.'],
        },
      },
      {
        heading: { es: 'Respeta las normas de los parques', en: 'Follow park rules' },
        paragraphs: {
          es: ['Entra por accesos oficiales y en horario, quédate en los senderos, no alimentes la fauna y llévate tu basura. Compra entradas en el sistema oficial del SINAC cuando se requiera reservación.'],
          en: ['Use official entrances and opening hours, stay on trails, do not feed wildlife and take your trash with you. Buy tickets on SINAC’s official system when a reservation is required.'],
        },
      },
      {
        heading: { es: 'Muévete con menos huella', en: 'Travel with a lighter footprint' },
        paragraphs: {
          es: ['Agrupa destinos por región para reducir kilómetros, considera buses o shuttles compartidos, lleva botella reutilizable y evita plásticos de un solo uso.'],
          en: ['Group destinations by region to cut distance, consider buses or shared shuttles, carry a reusable bottle and avoid single-use plastics.'],
        },
      },
      {
        heading: { es: 'Gasta en lo local', en: 'Spend locally' },
        paragraphs: {
          es: ['Come en sodas, compra artesanía directamente a quien la hace y elige experiencias comunitarias. Así el gasto turístico se queda en la comunidad.'],
          en: ['Eat at local sodas, buy crafts directly from makers and choose community-run experiences, so tourism spending stays in the community.'],
        },
      },
      {
        heading: { es: 'Protege a la niñez', en: 'Protect children' },
        paragraphs: {
          es: ['Costa Rica tiene un Código de Conducta del ICT contra la explotación sexual comercial de niñas, niños y adolescentes en el turismo. Si ves algo sospechoso, llama al 911 o a la línea del PANI 1147.'],
          en: ['Costa Rica has an ICT Code of Conduct against the commercial sexual exploitation of children and adolescents in tourism. If you see something suspicious, call 911 or the PANI line 1147.'],
        },
      },
    ],
    sources: [
      { href: 'https://pani.go.cr/', label: 'PANI' },
      { href: 'https://www.sinac.go.cr', label: 'SINAC' },
    ],
  },
];

export const findBlogPost = (slug: string | undefined): BlogPost | undefined =>
  BLOG_POSTS.find(post => post.slug === slug);
