/**
 * Draft legal pages (ES/EN). They describe the CURRENT operating model:
 * Costa Rica Tours is an intermediary that receives inquiries; nothing is
 * booked until operator, price and availability are confirmed in writing.
 * Marked as preliminary until reviewed by a Costa Rican lawyer.
 */

export type LegalPageId = 'terms' | 'cancellation' | 'privacy' | 'sinac-escnna';

type Bi = { es: string; en: string };

export interface LegalSection {
  heading: Bi;
  paragraphs: { es: string[]; en: string[] };
  links?: Array<{ href: string; label: Bi }>;
}

export interface LegalPageContent {
  id: LegalPageId;
  path: string;
  title: Bi;
  metaDescription: Bi;
  intro: Bi;
  sections: LegalSection[];
}

export const LEGAL_LAST_UPDATED: Bi = {
  es: 'Última actualización: 14 de octubre de 2026',
  en: 'Last updated: October 14, 2026',
};

export const LEGAL_DRAFT_NOTICE: Bi = {
  es: 'Versión preliminar, en revisión legal.',
  en: 'Preliminary version, under legal review.',
};

export const LEGAL_CONTACT = {
  controller: 'Jose A. Rojas',
  email: 'jarojas800@gmail.com',
  phoneDisplay: '+506 8795 9148',
  phoneHref: 'tel:+50687959148',
  location: 'Pérez Zeledón, San José, Costa Rica',
};

const contactSection: LegalSection = {
  heading: { es: 'Contacto', en: 'Contact' },
  paragraphs: {
    es: [
      `Responsable: ${LEGAL_CONTACT.controller}, ${LEGAL_CONTACT.location}.`,
      `Correo: ${LEGAL_CONTACT.email} · WhatsApp / teléfono: ${LEGAL_CONTACT.phoneDisplay}.`,
    ],
    en: [
      `Responsible person: ${LEGAL_CONTACT.controller}, ${LEGAL_CONTACT.location}.`,
      `Email: ${LEGAL_CONTACT.email} · WhatsApp / phone: ${LEGAL_CONTACT.phoneDisplay}.`,
    ],
  },
};

export const LEGAL_PAGES: Record<LegalPageId, LegalPageContent> = {
  terms: {
    id: 'terms',
    path: '/terms',
    title: { es: 'Términos y Condiciones', en: 'Terms & Conditions' },
    metaDescription: {
      es: 'Cómo funciona Costa Rica Tours: plataforma intermediaria de consultas. Ninguna reserva existe hasta confirmar por escrito operador, precio y cupo.',
      en: 'How Costa Rica Tours works: an inquiry intermediary. No booking exists until operator, price and availability are confirmed in writing.',
    },
    intro: {
      es: 'Estos términos explican qué hace y qué no hace Costa Rica Tours hoy. Al usar el sitio, el asistente o WhatsApp aceptas este funcionamiento.',
      en: 'These terms explain what Costa Rica Tours does and does not do today. By using the website, the assistant or WhatsApp you accept this way of working.',
    },
    sections: [
      {
        heading: { es: '1. Quiénes somos y qué hacemos', en: '1. Who we are and what we do' },
        paragraphs: {
          es: [
            `Costa Rica Tours es un proyecto gestionado por ${LEGAL_CONTACT.controller} desde ${LEGAL_CONTACT.location}. Actuamos como intermediario: recibimos tu consulta, buscamos un operador local adecuado y te transmitimos su propuesta.`,
            'No somos el operador de los tours, traslados, hospedajes ni parques que aparecen en el sitio. El servicio lo presta el operador que se te identifique por escrito antes de pagar.',
            'Trabajamos con operadores locales; verificamos su declaratoria turística del ICT antes de confirmar cada reserva. En el catálogo no publicamos el nombre ni los datos de contacto de los operadores: la identidad del operador se indica en la confirmación de la reserva, antes de cualquier pago.',
          ],
          en: [
            `Costa Rica Tours is a project run by ${LEGAL_CONTACT.controller} from ${LEGAL_CONTACT.location}. We act as an intermediary: we receive your inquiry, look for a suitable local operator and pass on its proposal.`,
            'We do not operate the tours, transfers, lodging or parks shown on the site. The service is provided by the operator identified to you in writing before any payment.',
            'We work with local operators; we verify their ICT tourism declaration before confirming each booking. The catalog does not publish operators’ names or contact details: the operator’s identity is provided in the booking confirmation, before any payment.',
          ],
        },
      },
      {
        heading: { es: '2. El catálogo no es una oferta ni una reserva', en: '2. The catalog is not an offer or a booking' },
        paragraphs: {
          es: [
            'Las fichas, fotos, duraciones y precios del sitio son información de referencia. Los precios mostrados son precios de referencia en dólares (US$); las conversiones a otras monedas son aproximadas.',
            'Una consulta, una cotización, una respuesta del asistente de IA o un mensaje de WhatsApp no constituyen una reserva. Una reserva solo existe cuando confirmamos por escrito: el operador, la fecha, el número de personas, el precio final y el cupo disponible, y tú aceptas esas condiciones.',
          ],
          en: [
            'Listings, photos, durations and prices on the site are reference information. Prices shown are reference prices in US dollars (US$); conversions to other currencies are approximate.',
            'An inquiry, a quote, an answer from the AI assistant or a WhatsApp message is not a booking. A booking only exists once we confirm in writing the operator, date, party size, final price and availability, and you accept those conditions.',
          ],
        },
      },
      {
        heading: { es: '3. Asistente de IA', en: '3. AI assistant' },
        paragraphs: {
          es: [
            'El asistente genera respuestas automáticas que pueden contener errores. Úsalo como orientación; precios, horarios, requisitos y disponibilidad deben confirmarse con una persona antes de decidir o pagar.',
          ],
          en: [
            'The assistant generates automatic answers that may contain mistakes. Use it as guidance; prices, schedules, requirements and availability must be confirmed with a person before deciding or paying.',
          ],
        },
      },
      {
        heading: { es: '4. Pagos', en: '4. Payments' },
        paragraphs: {
          es: [
            'No solicitamos pagos antes de la confirmación escrita descrita en el punto 2. La forma de pago, quién la recibe (la plataforma o el operador) y el comprobante se indican en esa confirmación.',
            'Las entradas a parques nacionales se compran y pagan directamente al SINAC en su sitio oficial; no las vendemos ni cobramos.',
          ],
          en: [
            'We do not request payment before the written confirmation described in section 2. The payment method, who receives it (the platform or the operator) and the receipt are stated in that confirmation.',
            'National park tickets are bought and paid directly to SINAC on its official website; we do not sell or charge for them.',
          ],
        },
      },
      {
        heading: { es: '5. Tus responsabilidades', en: '5. Your responsibilities' },
        paragraphs: {
          es: [
            'Darnos datos veraces (fechas, número de personas, edades y condiciones de salud relevantes para actividades de aventura), respetar las indicaciones del operador y las normas de las áreas protegidas.',
          ],
          en: [
            'Provide accurate information (dates, party size, ages and health conditions relevant to adventure activities), and follow the operator’s instructions and protected-area rules.',
          ],
        },
      },
      {
        heading: { es: '6. Consumidor y legislación aplicable', en: '6. Consumer rights and applicable law' },
        paragraphs: {
          es: [
            'Estos términos se rigen por la legislación de Costa Rica, incluida la Ley N.º 7472 de Promoción de la Competencia y Defensa Efectiva del Consumidor. Nada en estos términos limita los derechos que esa ley te reconoce; puedes acudir al MEIC si consideras vulnerados tus derechos como consumidor.',
          ],
          en: [
            'These terms are governed by the laws of Costa Rica, including Law No. 7472 on the Promotion of Competition and Effective Consumer Protection. Nothing in these terms limits the rights that law grants you; you may contact MEIC (Ministry of Economy, Industry and Commerce) if you believe your consumer rights were infringed.',
          ],
        },
      },
      {
        heading: { es: '7. Cambios', en: '7. Changes' },
        paragraphs: {
          es: ['Podemos actualizar estos términos. La fecha de la última actualización aparece en esta página; los cambios no afectan reservas ya confirmadas por escrito.'],
          en: ['We may update these terms. The date of the last update appears on this page; changes do not affect bookings already confirmed in writing.'],
        },
      },
      contactSection,
    ],
  },
  cancellation: {
    id: 'cancellation',
    path: '/cancellation',
    title: { es: 'Política de Cancelación', en: 'Cancellation Policy' },
    metaDescription: {
      es: 'Cancelaciones y cambios: aplica la política del operador confirmado, comunicada por escrito antes de cualquier pago.',
      en: 'Cancellations and changes: the confirmed operator’s policy applies, shared in writing before any payment.',
    },
    intro: {
      es: 'Como intermediarios, no tenemos una política de cancelación única: cada experiencia la presta un operador distinto, con sus propias condiciones.',
      en: 'As an intermediary we do not have a single cancellation policy: each experience is provided by a different operator with its own conditions.',
    },
    sections: [
      {
        heading: { es: 'Antes de confirmar', en: 'Before confirmation' },
        paragraphs: {
          es: ['Mientras tu solicitud sea solo una consulta o una cotización, puedes retirarla en cualquier momento sin costo: no hay reserva ni pago.'],
          en: ['While your request is only an inquiry or a quote you can withdraw it at any time at no cost: there is no booking and no payment.'],
        },
      },
      {
        heading: { es: 'Después de confirmar', en: 'After confirmation' },
        paragraphs: {
          es: [
            'Antes de cualquier pago te enviaremos por escrito la política de cancelación, cambios y reembolsos del operador confirmado (plazos, porcentajes y excepciones). Esa es la política que aplica a tu reserva.',
            'Si el operador cancela por clima, seguridad, cierre de un parque u otra causa, te informaremos las opciones que ofrezca (cambio de fecha, alternativa o reembolso según su política).',
          ],
          en: [
            'Before any payment we will send you, in writing, the confirmed operator’s cancellation, change and refund policy (deadlines, percentages and exceptions). That is the policy that applies to your booking.',
            'If the operator cancels due to weather, safety, a park closure or another cause, we will tell you the options it offers (new date, alternative or refund according to its policy).',
          ],
        },
      },
      {
        heading: { es: 'Entradas a parques nacionales', en: 'National park tickets' },
        paragraphs: {
          es: ['Las entradas compradas en el sitio oficial del SINAC se rigen por las condiciones del SINAC.'],
          en: ['Tickets bought on SINAC’s official website follow SINAC’s conditions.'],
        },
        links: [{ href: 'https://serviciosenlinea.sinac.go.cr', label: { es: 'Servicios en línea del SINAC', en: 'SINAC online services' } }],
      },
      contactSection,
    ],
  },
  privacy: {
    id: 'privacy',
    path: '/privacy',
    title: { es: 'Privacidad y Datos Personales', en: 'Privacy & Personal Data' },
    metaDescription: {
      es: 'Cómo tratamos tus datos según la Ley 8968 de Costa Rica: solo para responder tu consulta. Responsable: Jose A. Rojas.',
      en: 'How we handle your data under Costa Rica’s Law 8968: only to answer your inquiry. Data controller: Jose A. Rojas.',
    },
    intro: {
      es: 'Tratamos tus datos personales conforme a la Ley N.º 8968 de Protección de la Persona frente al Tratamiento de sus Datos Personales de Costa Rica.',
      en: 'We process your personal data in accordance with Costa Rica’s Law No. 8968 on the Protection of Individuals regarding the Processing of their Personal Data.',
    },
    sections: [
      {
        heading: { es: 'Responsable', en: 'Data controller' },
        paragraphs: {
          es: [`${LEGAL_CONTACT.controller}, ${LEGAL_CONTACT.location}. Correo ${LEGAL_CONTACT.email}, teléfono/WhatsApp ${LEGAL_CONTACT.phoneDisplay}.`],
          en: [`${LEGAL_CONTACT.controller}, ${LEGAL_CONTACT.location}. Email ${LEGAL_CONTACT.email}, phone/WhatsApp ${LEGAL_CONTACT.phoneDisplay}.`],
        },
      },
      {
        heading: { es: 'Qué datos recogemos', en: 'What data we collect' },
        paragraphs: {
          es: [
            'Los que nos das al consultar: nombre, correo o teléfono/WhatsApp, fechas, número y edades de los viajeros, y el contenido de tus mensajes (formulario, asistente de IA o WhatsApp).',
            'Datos técnicos básicos del uso del sitio (por ejemplo, páginas visitadas y errores) para que funcione y para mejorarlo.',
          ],
          en: [
            'The data you give us when you ask: name, email or phone/WhatsApp, dates, number and ages of travelers, and the content of your messages (form, AI assistant or WhatsApp).',
            'Basic technical usage data (for example pages visited and errors) to run and improve the site.',
          ],
        },
      },
      {
        heading: { es: 'Para qué los usamos', en: 'What we use them for' },
        paragraphs: {
          es: [
            'Solo para responder tu consulta y gestionar la cotización o reserva que pidas. Para confirmar disponibilidad compartimos con el operador local únicamente los datos necesarios para ese servicio.',
            'No vendemos tus datos ni los usamos para publicidad de terceros. Los mensajes al asistente de IA se procesan con proveedores de tecnología para generar la respuesta; evita incluir datos sensibles (salud, pasaporte, tarjetas) en el chat.',
          ],
          en: [
            'Only to answer your inquiry and manage the quote or booking you request. To confirm availability we share with the local operator only the data needed for that service.',
            'We do not sell your data or use it for third-party advertising. Messages to the AI assistant are processed by technology providers to generate the answer; avoid sharing sensitive data (health, passport, cards) in the chat.',
          ],
        },
      },
      {
        heading: { es: 'Conservación', en: 'Retention' },
        paragraphs: {
          es: ['Conservamos los datos mientras sean necesarios para atender tu consulta o reserva y cumplir obligaciones legales; después los eliminamos o anonimizamos.'],
          en: ['We keep data while needed to handle your inquiry or booking and meet legal obligations; afterwards we delete or anonymize it.'],
        },
      },
      {
        heading: { es: 'Tus derechos', en: 'Your rights' },
        paragraphs: {
          es: [
            `Puedes pedir acceso, rectificación, actualización o eliminación de tus datos, o retirar tu consentimiento, escribiendo a ${LEGAL_CONTACT.email}. Responderemos dentro de los plazos de la Ley 8968.`,
            'Si consideras que no atendimos tu solicitud, puedes acudir a la Agencia de Protección de Datos de los Habitantes (PRODHAB).',
          ],
          en: [
            `You may request access, correction, update or deletion of your data, or withdraw consent, by writing to ${LEGAL_CONTACT.email}. We will answer within the deadlines set by Law 8968.`,
            'If you believe we did not handle your request, you may contact Costa Rica’s Data Protection Agency (PRODHAB).',
          ],
        },
      },
      {
        heading: { es: 'Cookies', en: 'Cookies' },
        paragraphs: {
          es: ['Usamos almacenamiento local y cookies necesarias para recordar preferencias (idioma, moneda, favoritos) y el historial del chat en tu dispositivo. Puedes borrarlos desde tu navegador.'],
          en: ['We use local storage and necessary cookies to remember preferences (language, currency, favorites) and chat history on your device. You can clear them from your browser.'],
        },
      },
    ],
  },
  'sinac-escnna': {
    id: 'sinac-escnna',
    path: '/sinac-escnna',
    title: { es: 'Normas SINAC & ESCNNA', en: 'SINAC Rules & ESCNNA Policy' },
    metaDescription: {
      es: 'Normas básicas para visitar áreas protegidas del SINAC y nuestra política de tolerancia cero contra la explotación sexual comercial de niñas, niños y adolescentes (ESCNNA).',
      en: 'Basic rules for visiting SINAC protected areas and our zero-tolerance policy against the commercial sexual exploitation of children and adolescents (ESCNNA).',
    },
    intro: {
      es: 'Turismo responsable significa proteger la naturaleza y, sobre todo, a las personas menores de edad.',
      en: 'Responsible tourism means protecting nature and, above all, children and adolescents.',
    },
    sections: [
      {
        heading: { es: 'Tolerancia cero ESCNNA', en: 'Zero tolerance: ESCNNA' },
        paragraphs: {
          es: [
            'Costa Rica Tours rechaza de forma absoluta la explotación sexual comercial de niñas, niños y adolescentes (ESCNNA). Nos guiamos por el Código de Conducta del Instituto Costarricense de Turismo (ICT) para la protección de personas menores de edad en viajes y turismo. (Aún no somos una empresa adherida formalmente a ese Código.)',
            'No prestaremos ni intermediaremos ningún servicio a quien muestre intención de explotar a una persona menor de edad, y reportaremos cualquier situación sospechosa a las autoridades.',
            'Si sabes o sospechas de un caso: llama al 911 (emergencias), a la línea del PANI 1147, o a la línea confidencial del OIJ 800-8000-645.',
          ],
          en: [
            'Costa Rica Tours absolutely rejects the commercial sexual exploitation of children and adolescents (ESCNNA). We follow the Costa Rican Tourism Board (ICT) Code of Conduct for the protection of minors in travel and tourism. (We are not yet a formally registered signatory of that Code.)',
            'We will not provide or broker any service to anyone showing intent to exploit a minor, and we will report any suspicious situation to the authorities.',
            'If you know of or suspect a case: call 911 (emergencies), the PANI child line 1147, or the OIJ confidential line 800-8000-645.',
          ],
        },
        links: [
          { href: 'https://www.ict.go.cr/es/sostenibilidad/codigo-de-conducta.html', label: { es: 'Código de Conducta (ICT)', en: 'Code of Conduct (ICT)' } },
          { href: 'https://pani.go.cr/', label: { es: 'Patronato Nacional de la Infancia (PANI)', en: 'National Child Welfare Agency (PANI)' } },
        ],
      },
      {
        heading: { es: 'Normas básicas en áreas protegidas (SINAC)', en: 'Basic rules in protected areas (SINAC)' },
        paragraphs: {
          es: [
            'Resumen orientativo; las normas oficiales y vigentes de cada parque las publica el SINAC.',
            'Compra tu entrada en el sistema oficial del SINAC cuando el parque lo requiera; algunos sectores solo admiten ingreso con reservación en línea y cupo limitado.',
            'Entra por los accesos oficiales y respeta el horario de cada sector.',
            'No alimentes ni toques la fauna, mantén distancia y no extraigas plantas, animales, conchas ni rocas.',
            'Permanece en los senderos marcados y sigue las indicaciones de guardaparques. En algunos parques (por ejemplo, Corcovado) es obligatorio ingresar con guía certificado.',
            'Llévate tu basura y evita plásticos de un solo uso.',
            'Si contratas un operador o guía, verifica que cuente con las certificaciones del ICT o los permisos de operación correspondientes.',
          ],
          en: [
            'Orientation summary only; official, current rules for each park are published by SINAC.',
            'Buy your ticket through SINAC’s official system when the park requires it; some sectors only allow entry with an online reservation and limited capacity.',
            'Enter through official access points and respect each sector’s opening hours.',
            'Do not feed or touch wildlife, keep your distance, and do not remove plants, animals, shells or rocks.',
            'Stay on marked trails and follow park rangers’ instructions. Some parks (for example Corcovado) require entry with a certified guide.',
            'Take your trash with you and avoid single-use plastics.',
            'If you hire an operator or guide, check that it holds ICT certifications or the corresponding operating permits.',
          ],
        },
        links: [
          { href: 'https://www.sinac.go.cr', label: { es: 'Sitio oficial del SINAC', en: 'Official SINAC website' } },
          { href: 'https://serviciosenlinea.sinac.go.cr', label: { es: 'Compra de entradas (SINAC)', en: 'Ticket purchase (SINAC)' } },
        ],
      },
      contactSection,
    ],
  },
};

export const LEGAL_PAGE_ORDER: LegalPageId[] = ['terms', 'cancellation', 'privacy', 'sinac-escnna'];
