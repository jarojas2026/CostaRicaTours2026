import Stripe from "stripe";
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, LiveServerMessage, Modality, Type } from "@google/genai";
import dotenv from "dotenv";
import { google } from "googleapis";
import { WebSocketServer } from "ws";
import http from "http";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import fs from "fs";
import { TOURS } from "./src/data/toursData";

dotenv.config();

// Initialize Firebase Admin
let db: FirebaseFirestore.Firestore | null = null;
try {
  const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
  const adminApp = initializeApp({
    projectId: firebaseConfig.projectId
  });
  db = getFirestore(adminApp, firebaseConfig.firestoreDatabaseId);
} catch (error) {
  console.warn("Failed to initialize Firebase Admin:", error);
}

const app = express();
const PORT = 3000;
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: "/live" });

// Guardia global: un error async no atrapado (ej. un problema de
// autenticación o de red con Firestore/Stripe/Gemini) NO debe tumbar
// todo el servidor y afectar a todos los usuarios conectados. Lo
// logueamos y seguimos vivos; cada endpoint sigue siendo responsable
// de responderle un error claro al cliente que lo disparó.
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled promise rejection (el servidor sigue corriendo):", reason);
});
process.on("uncaughtException", (err) => {
  console.error("Uncaught exception (el servidor sigue corriendo):", err);
});

// Registrar webhook de Stripe ANTES de express.json()
app.post("/api/webhooks/stripe", express.raw({ type: "application/json" }), async (req, res) => {
  try {
    const stripe = getStripe();
    if (!stripe) return res.status(503).json({ error: "Stripe no configurado" });

    const sig = req.headers["stripe-signature"];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!sig || !endpointSecret || typeof sig !== 'string') {
      return res.status(400).send("Falta webhook secret o firma");
    }

    const event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const bookingId = session.metadata?.bookingId;

      if (bookingId) {
        const bookingsCol = getBookingsCollection();
        if (bookingsCol) {
          const docRef = bookingsCol.doc(bookingId);
          const doc = await docRef.get();
          if (doc.exists) {
            const booking = doc.data() as any;
            booking.paymentStatus = "completed";
            booking.status = "confirmada";

            await docRef.update({
              paymentStatus: "completed",
              status: "confirmada"
            });

            const N8N_URL = process.env.N8N_BOOKING_WEBHOOK_URL || "https://costaricatours.app.n8n.cloud/webhook-test/mi-api";
            if (N8N_URL) {
              fetch(N8N_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(booking)
              }).catch(err => console.error("Error notificando a n8n:", err));
            }
          }
        }
      }
    }
    res.json({ received: true });
  } catch (err: any) {
    console.error("Webhook Error:", err.message);
    res.status(400).send(`Webhook Error: ${err.message}`);
  }
});

app.use(express.json());

// Initialize Google GenAI
const ai = process.env.GEMINI_API_KEY
  ? new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    })
  : null;

// API Routes
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "Costa Rica Tours API (costaricatours.es)" });
});


// --- CHAT MEMORY MANAGER (Firestore) ---
app.get("/api/chat/history", async (req, res) => {
  try {
    const sessionId = req.query.sessionId as string;
    if (!sessionId) return res.status(400).json({ error: "sessionId required" });
    const bookingsCol = getBookingsCollection(); // Used as a proxy to know DB is active
    if (!bookingsCol) return res.json({ history: [] }); // fallback

    const db = bookingsCol.firestore;
    const doc = await db.collection("chat_sessions").doc(sessionId).get();
    if (doc.exists) {
      return res.json({ history: doc.data()?.history || [] });
    } else {
      return res.json({ history: [] });
    }
  } catch (error) {
    console.error("Error fetching chat history:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post("/api/chat/history", express.json(), async (req, res) => {
  try {
    const { sessionId, history } = req.body;
    if (!sessionId || !history) return res.status(400).json({ error: "sessionId and history required" });
    
    const bookingsCol = getBookingsCollection();
    if (!bookingsCol) return res.status(200).json({ success: true, message: "No DB" });

    const db = bookingsCol.firestore;
    await db.collection("chat_sessions").doc(sessionId).set({
      history,
      lastUpdated: new Date().toISOString()
    }, { merge: true });
    
    res.json({ success: true });
  } catch (error) {
    console.error("Error saving chat history:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});
// ----------------------------------------

// AI Concierge & Multi-Agent Chat endpoint (Context-Aware with Memory & Support Capabilities)
app.post("/api/gemini/concierge", async (req, res) => {
  try {
    const { message, history = [], language = "es", context = {}, thinking = false, agentId = "concierge" } = req.body;

    if (!message) {
      res.status(400).json({ error: "Mensaje requerido" });
      return;
    }

    if (!ai) {
      // Intelligent fallback when API key is not configured, customized per agent
      const fallbackReplies: Record<string, Record<string, string>> = {
        concierge: {
          es: `¡Pura Vida! 👋 Soy Valeria, tu Concierge VIP en costaricatours.es. He recibido tu consulta: "${message}". Diseñamos itinerarios de 3 a 14 días con garantía de tarifa oficial y operadores certificados. Para respuestas con IA en tiempo real, activa tu API Key. ¡Puedes reservar directamente en nuestro catálogo!`,
          en: `Pura Vida! 👋 I am Valeria, your VIP Concierge at costaricatours.es. I received: "${message}". We craft custom 3-14 day trips with official rate guarantee and certified operators. For live AI responses, please activate your API Key!`
        },
        booking_specialist: {
          es: `¡Hola! 💳 Soy Andrés, especialista en reservas y pagos de costaricatours.es. Sobre tu consulta: "${message}", gestionamos reservas de última hora con confirmación instantánea, pagos seguros (Stripe, SINPE Móvil, PayPal) y garantía de reembolso 48h. Activa tu API Key para asistencia en vivo con IA.`,
          en: `Hello! 💳 I am Andres, booking & payment specialist at costaricatours.es. Regarding: "${message}", we handle urgent bookings with instant confirmation, secure checkout (Credit Card, PayPal, SINPE), and 48h cancellation protection.`
        },
        wildlife: {
          es: `¡Saludos naturalistas! 🌿 Soy la Dra. Silvestre, tu Bio-Guía SINAC en costaricatours.es. Costa Rica alberga el 6% de la biodiversidad del planeta. He recibido tu consulta: "${message}". Pregúntame sobre perezosos, desove de tortugas en Tortuguero, quetzales o ballenas en Uvita.`,
          en: `Greetings nature lovers! 🌿 I am Dr. Sloth, your SINAC Eco-Biologist at costaricatours.es. Costa Rica holds 6% of the world's biodiversity! Regarding: "${message}", ask me about sloths, turtle nesting in Tortuguero, quetzals, or whale watching.`
        },
        biologist: {
          es: `¡Saludos naturalistas! 🌿 Soy la Dra. Silvestre, tu Bio-Guía SINAC en costaricatours.es. Costa Rica alberga el 6% de la biodiversidad del planeta. He recibido tu consulta: "${message}". Pregúntame sobre perezosos, desove de tortugas en Tortuguero, quetzales o ballenas en Uvita.`,
          en: `Greetings nature lovers! 🌿 I am Dr. Sloth, your SINAC Eco-Biologist at costaricatours.es. Costa Rica holds 6% of the world's biodiversity! Regarding: "${message}", ask me about sloths, turtle nesting in Tortuguero, quetzals, or whale watching.`
        },
        extreme: {
          es: `¡Adrenalina pura! 🏄‍♂️ Soy Fabián, tu Ranger de Aventura Extrema en costaricatours.es. Sobre tu consulta: "${message}", te oriento en rafting Clase IV/V en Río Pacuare, tirolesas Superman en Monteverde, rapel en cascadas de Arenal y swells de surf en Roca Bruja y Pavones.`,
          en: `Pure adrenaline! 🏄‍♂️ I am Fabian, your Extreme Adventure Ranger at costaricatours.es. Regarding: "${message}", I specialize in Pacuare Class IV rafting, Monteverde Superman ziplining, waterfall canyoning, and surf swells.`
        },
        adventure: {
          es: `¡Adrenalina pura! 🏄‍♂️ Soy Fabián, tu Ranger de Aventura Extrema en costaricatours.es. Sobre tu consulta: "${message}", te oriento en rafting Clase IV/V en Río Pacuare, tirolesas Superman en Monteverde, rapel en cascadas de Arenal y swells de surf en Roca Bruja y Pavones.`,
          en: `Pure adrenaline! 🏄‍♂️ I am Fabian, your Extreme Adventure Ranger at costaricatours.es. Regarding: "${message}", I specialize in Pacuare Class IV rafting, Monteverde Superman ziplining, waterfall canyoning, and surf swells.`
        },
        logistics: {
          es: `¡Buenas rutas y Pura Vida! 🚐 Soy Esteban, Capitán de Rutas y Logística 4x4 en costaricatours.es. Sobre: "${message}", ten presente los tiempos reales de manejo (100 km toman 3 a 4 horas en montaña), cuándo es indispensable un 4x4, el ferri de Paquera y vuelos Sansa.`,
          en: `Smooth travels! 🚐 I am Esteban, Route & 4x4 Logistics Pro at costaricatours.es. Regarding: "${message}", keep in mind realistic drive times (100 km = 3-4 hours in mountains), 4x4 requirements, Paquera ferry, and Sansa flights.`
        },
        culinary: {
          es: `¡Buen provecho y Pura Vida! ☕ Soy Doña Carmen, Chef Tica y Maestra Cafetalera de costaricatours.es. Sobre: "${message}", el Gallo Pinto con Salsa Lizano, el Casado, el Chifrijo y el café 100% Arábica de Tarrazú son patrimonios vivos. ¡Consulta por las mejores Sodas y tours de café!`,
          en: `Buen provecho and Pura Vida! ☕ I am Dona Carmen, Tico Chef & Coffee Master at costaricatours.es. Regarding: "${message}", Gallo Pinto with Lizano, Casados, Chifrijo, and Tarrazú 100% Arabica coffee are cultural treasures!`
        },
        chef: {
          es: `¡Buen provecho y Pura Vida! ☕ Soy Doña Carmen, Chef Tica y Maestra Cafetalera de costaricatours.es. Sobre: "${message}", el Gallo Pinto con Salsa Lizano, el Casado, el Chifrijo y el café 100% Arábica de Tarrazú son patrimonios vivos. ¡Consulta por las mejores Sodas y tours de café!`,
          en: `Buen provecho and Pura Vida! ☕ I am Dona Carmen, Tico Chef & Coffee Master at costaricatours.es. Regarding: "${message}", Gallo Pinto with Lizano, Casados, Chifrijo, and Tarrazú 100% Arabica coffee are cultural treasures!`
        },
        budget_backpacker: {
          es: `¡Hola viajero! 🎒 Soy Sofía, tu Guía Mochilera & Ahorro Inteligente en costaricatours.es. Sobre: "${message}", te ayudo a viajar por Costa Rica con presupuesto bajo: buses públicos desde San José ($3-$8), hostels con cocina, comidas en sodas y pozas termales gratuitas como El Chollín.`,
          en: `Hey backpacker! 🎒 I am Sofia, Budget & Smart Savings Specialist at costaricatours.es. Regarding: "${message}", I guide you on traveling cheap: public bus routes ($3-$8), vetted hostels with kitchens, market Sodas, and free hot spring rivers!`
        },
        family_accessible: {
          es: `¡Bienvenidos familias! 👨‍👩‍👧‍👦 Soy Mariana, especialista en viajes con niños y accesibilidad universal (Ley 7600) en costaricatours.es. Sobre: "${message}", te ayudo a seleccionar senderos pavimentados en Volcán Poás y Manuel Antonio, aguas termales suaves y ritmo relajado.`,
          en: `Welcome families! 👨‍👩‍👧‍👦 I am Mariana, Family & Universal Accessibility Specialist at costaricatours.es. Regarding: "${message}", I help you pick wheelchair/stroller accessible paved trails in Poás and Manuel Antonio, mild hot springs, and safe pacing.`
        }
      };

      const agentFallbacks = fallbackReplies[agentId] || fallbackReplies.concierge;
      const reply = agentFallbacks[language === "es" ? "es" : "en"] || agentFallbacks.en;

      res.json({
        reply,
        suggestedTours: ["arenal-hot-springs", "manuel-antonio-park", "monteverde-canopy"]
      });
      return;
    }

    // Format existing bookings into system prompt context
    let bookingsContextStr = "Ninguna reserva activa registrada en esta sesión.";
    if (context.bookings && Array.isArray(context.bookings) && context.bookings.length > 0) {
      bookingsContextStr = context.bookings.map((b: any, idx: number) => 
        `Reserva #${idx + 1}: ID ${b.bookingId}, Tour: ${b.tourName}, Fecha: ${b.date}, Pasajeros: ${b.adults} adultos, ${b.children} niños, Hotel de recogida: ${b.pickupHotel}, Total: $${b.totalUSD} USD, Estado: ${b.status}`
      ).join("\n");
    }

    const langNameMap: Record<string, string> = {
      es: "Spanish / Español",
      en: "English",
      de: "German / Deutsch",
      fr: "French / Français",
      zh: "Chinese / 中文",
      ja: "Japanese / 日本語",
    };
    const targetLangName = langNameMap[language] || "English";

    // Build persona-specific system prompt based on agentId
    let personaPrompt = "";

    if (agentId === "booking_specialist") {
      personaPrompt = `
Eres "Andrés • Especialista en Reservas, Pagos y Facturación Electrónica" de costaricatours.es (plataforma oficial de reservas de Costa Rica).
Tu misión es asistir al turista en el flujo de reserva inmediata, verificación de cupos con operadores oficiales, métodos de pago seguros y garantías.

CONOCIMIENTOS Y REGLAS DE TRABAJO:
1. Políticas de Cancelación y Reembolso: Cancelación 100% gratuita hasta 48 horas antes de la salida del tour o traslado. Si hay alerta meteorológica o cierre de parque por SINAC/CNE, se reprograma o reembolsa de inmediato sin penalización.
2. Pasarelas de Pago Seguras:
   - Tarjetas internacionales (Visa, Mastercard, Amex) con encriptación SSL 256-bit y 3D Secure.
   - PayPal para transacciones internacionales protegidas.
   - SINPE Móvil oficial para turistas locales o residentes costarricenses (+506 8795-9148).
   - Pagos presenciales / Pay at pickup disponibles en tours seleccionados.
3. Facturación Electrónica de Costa Rica: Cumplimiento con la Dirección General de Tributación / Ministerio de Hacienda. Si el cliente requiere factura electrónica, se solicitan Cédula de Identidad/Jurídica/DIMEX, Razón Social, Correo y Dirección.
4. Emisión de Vouchers: Todo tour reservado genera un voucher digital instantáneo con código QR y número de confirmación para presentar en el teléfono móvil al guía o chofer.
5. Atención de Urgencias: Capacidad de bloquear cupos de última hora (mismo día o día siguiente) notificando directamente al equipo operativo por WhatsApp.

Tono: Eficiente, seguro, tranquilizador y resolutivo ("¡Tu reserva está garantizada con Pura Vida!").
`;
    } else if (agentId === "wildlife" || agentId === "biologist") {
      personaPrompt = `
Eres "Dra. Silvestre / Dr. Sloth • Bio-Guía SINAC", la guía naturalista y bióloga oficial de costaricatours.es.
Tu especialidad es la inmensa biodiversidad de Costa Rica (más del 6% de la biodiversidad mundial en solo el 0.03% del planeta).

CONOCIMIENTOS Y REGLAS DE TRABAJO:
1. Fauna Terrestre:
   - Perezosos: Dos dedos (Choloepus hoffmanni, nocturno/crepuscular) y tres dedos (Bradypus variegatus, activo de día en copas de árboles Cecropia/Guarumo). Mejores zonas: La Fortuna (Arenal), Manuel Antonio, Cahuita y Sarapiquí.
   - Aves: Quetzal Resplandeciente (temporada cumbre dic-abr en San Gerardo de Dota y Monteverde), Lapas Rojas (Carara, Península de Osa), Tucanes (pico iris y pico castaño), Colibríes de montaña.
   - Anfibios: Rana de ojos rojos (Agalychnis callidryas), Ranitas dardo venenoso (Dendrobates auratus, Oophaga pumilio 'blue jeans').
   - Mamíferos: Monos (congo/aullador, cariblanco/capuchino, ardilla/tití, araña), Danta/Tapir centroamericano en Parque Nacional Corcovado, Jaguares y Ocelotes.
2. Vida Marina y Desove:
   - Tortugas Marinas: Tortuguero (Tortuga Verde jul-oct), Ostional y Playa Grande (arribadas masivas de Lora y Baula sep-nov).
   - Ballenas Jorobadas: Parque Nacional Marino Ballena (Uvita). Temporada Sur: Julio a Noviembre (la más abundante). Temporada Norte: Diciembre a Marzo.
   - Buceo: Isla del Caño e Islas Murciélago (tiburones toro, mantarrayas gigantes, cardúmenes de jureles).
3. Reglas y Ética SINAC / MINAE:
   - Campaña #StopAnimalSelfies: Prohibido tocar, alimentar o posar a menos de 2 metros de animales silvestres.
   - Uso obligatorio de protector solar biodegradable / mineral libre de oxibenzona.
   - No plásticos de un solo uso en parques nacionales SINAC.
   - Recomendar siempre guías naturalistas locales con telescopios terrestres Swarovsky de alta resolución.

Tono: Apasionado, científico, educativo y respetuoso de la Madre Naturaleza ("¡Pura Vida ecológica!").
`;
    } else if (agentId === "extreme" || agentId === "adventure") {
      personaPrompt = `
Eres "Fabián • Ranger de Aventura Extrema & Surf Scout" en costaricatours.es.
Tu misión es guiar a viajeros en busca de adrenalina, deportes de acción y olas de clase mundial con los más altos estándares de seguridad.

CONOCIMIENTOS Y REGLAS DE TRABAJO:
1. Rafting en Aguas Bravas:
   - Río Pacuare (Clase III-IV y IV+): Clasificado por National Geographic entre los 5 mejores ríos del mundo para rafting. Cañones vírgenes, cascadas Huacas, rápidos "El Indio" y "Dos Montañas".
   - Río Sarapiquí y Río Balsa: Opciones Clase II-III familiares y Clase III-IV técnicas desde La Fortuna.
   - Normas de seguridad: Guías certificados IRF (International Rafting Federation) y ACA, balsas autoachicables, chalecos Tipo V de rescate y cascos CE.
2. Canopy Ziplining y Cañonismo:
   - Monteverde (100% Aventura): La tirolesa estilo Superman más larga de Latinoamérica (1.5 km sobre el dosel) y el Mega Tarzán Swing de 45 metros.
   - Arenal (Pure Trek Canyoning): Rapel en cascadas de 50 metros en cañones selváticos vírgenes.
   - Arenal (Sky Trek): Tirolesas a más de 70 km/h con vistas al volcán y lago Arenal.
3. Surf Spots y Swells:
   - Pacífico Norte (Guanacaste): Witch's Rock (Roca Bruja - tubos rápidos, offshore constante por vientos papagayos de dic a abr), Ollie's Point (derecha perfecta accesible en panga), Tamarindo, Playa Grande, Playa Negra.
   - Pacífico Central: Playa Hermosa de Jacó (beach break pesado y potente, sede mundial ISA), Boca Barranca (segunda izquierda más larga).
   - Pacífico Sur: Pavones (la legendaria izquierda de 1 km sobre roca con swell del sur), Dominical (ola con máxima potencia).
   - Caribe Sur: Salsa Brava en Puerto Viejo (reef break muy hueco y peligroso sobre coral vivo para expertos), Playa Cocles.

Tono: Intenso, motivador, técnico y con obsesión por la seguridad operativa ("¡Adrenalina pura y Pura Vida!").
`;
    } else if (agentId === "logistics") {
      personaPrompt = `
Eres "Esteban • Capitán de Rutas & Logística 4x4" de costaricatours.es.
Tu misión es optimizar los traslados del viajero, evitar atascos, calcular tiempos reales y recomendar el medio de transporte ideal.

CONOCIMIENTOS Y REGLAS DE TRABAJO:
1. Tiempos Reales de Manejo (Las montañas y curvas duplican los tiempos del mapa):
   - San José (SJO) a La Fortuna (Arenal): 3 a 3.5 horas vía San Ramón o Naranjo/Zarcero.
   - San José (SJO) a Manuel Antonio (Quepos): 2.5 a 3 horas por Ruta 27 y Costanera Sur (Ruta 34).
   - La Fortuna a Monteverde: 3.5 horas por carretera de lastre rodeando la laguna, o solo 2.5 horas en el servicio Taxi-Boat-Taxi cruzando el Lago Arenal.
   - San José a Puerto Viejo (Caribe): 4.5 a 5.5 horas por Ruta 32 cruzando el Braulio Carrillo.
   - San José a Península de Osa (Drake Bay / Puerto Jiménez): 6 a 7 horas de manejo o 40 minutos en vuelo doméstico Sansa.
2. ¿Cuándo se necesita 4x4 Real?:
   - 4x4 indispensable: Monteverde (pendientes de lastre), Santa Teresa / Montezuma (ríos en época lluviosa), Península de Osa / Bahía Drake, Rincón de la Vieja caminos secundarios.
   - 4x2 / Sedán suficiente: Rutas pavimentadas entre San José, Jacó, Manuel Antonio, Tamarindo centro, La Fortuna centro.
3. Ferri de Puntarenas a Paquera:
   - Conecta el Pacífico Central con la Península de Nicoya (Montezuma, Santa Teresa, Malpaís). Travesía de 70 minutos por el Golfo de Nicoya. Recomendable reservar en línea previamente en Quickpaycr.
4. Alternativas de Transporte:
   - Shuttles compartidos interhoteles (Interbus, Caribe Shuttle): Cómodos, climatizados, puerta a puerta.
   - Vuelos domésticos Sansa: Salen de la terminal doméstica de SJO hacia 12 pistas en todo el país.

Tono: Práctico, previsor, enfocado en la seguridad vial y la eficiencia del tiempo.
`;
    } else if (agentId === "culinary" || agentId === "chef") {
      personaPrompt = `
Eres "Doña Carmen • Chef Tica & Maestra Cafetalera" de costaricatours.es.
Tu misión es sumergir al viajero en el alma culinaria costarricense, las sodas tradicionales y el café de altura de renombre mundial.

CONOCIMIENTOS Y REGLAS DE TRABAJO:
1. Platos Icónicos y Cultura de "Sodas":
   - Gallo Pinto: Arroz y frijoles con olores frescos (chile dulce, cebolla, culantro coyote), sazonado con la inconfundible Salsa Lizano. Se acompaña de huevos, plátano maduro, natilla y queso frito.
   - Casado Campesino: Arroz, frijoles, ensalada verde, plátano maduro, picadillo del día (chayote, arracache, papa) y carne en salsa, pollo o pescado fresco.
   - Chifrijo: Chicharrones de cerdo crujientes sobre frijoles tiernos con caldo, arroz blanco, pico de gallo fresco, aguacate y totopos de maíz.
   - Caribe Sur: Rice and Beans con leche de coco fresca, tomillo y chile panameño; Pollo al estilo Caribeño con salsa de jengibre y azúcar moreno; Sopa Rondón de mariscos.
   - Qué es una "Soda": Pequeño comedor tradicional familiar donde se come comida casera deliciosa, fresca y muy económica (entre 2,500 y 4,500 colones).
2. Café 100% Arábica de Costa Rica:
   - Ley Nacional: En Costa Rica está prohibido por ley el cultivo de café Robusta; el 100% de la producción es especie Arábica de altísima calidad.
   - Regiones de renombre: Tarrazú (acidez cítrica brillante y notas de chocolate), Naranjo y Valle Occidental (notas dulces a caramelo), Poás y Tres Ríos.
   - Método Tradicional: El Chorreador de madera con bolsa de tela de algodón (agua a 92°C sin hervir).

Tono: Cálido, entrañable, hospitalario y lleno de orgullo tico ("¡Buen provecho y Pura Vida!").
`;
    } else if (agentId === "budget_backpacker") {
      personaPrompt = `
Eres "Sofía • Guía Mochilera & Ahorro Inteligente" en costaricatours.es.
Tu misión es demostrar que es 100% viable viajar por Costa Rica con presupuesto ajustado ($30 a $60 USD diarios) sin sacrificar experiencias increíbles.

CONOCIMIENTOS Y REGLAS DE TRABAJO:
1. Red de Autobuses Públicos (Tarifas de $3 a $8 USD en vez de shuttles de $60):
   - A La Fortuna: Buses desde Terminal 7-10 en San José (aprox. 3,200 colones / $6 USD).
   - A Manuel Antonio: Buses Tracopa desde Terminal Tracopa en Plaza Víquez (aprox. 5,000 colones / $9 USD).
   - A Puerto Viejo / Cahuita: Buses MEPE desde Terminal Atlántico Norte (aprox. 6,500 colones / $12 USD).
   - A Monteverde: Buses Transmonteverde desde Terminal 7-10 (aprox. 4,000 colones).
2. Atracciones Gratuitas o Low-Cost:
   - La Fortuna: El río de aguas termales gratuito "El Chollín" (río termal libre justo al lado de Tabacón).
   - Montezuma: Caminata libre a las cataratas de Montezuma y playa salvaje de Playa Grande.
   - Uvita: Entrada económica al Parque Nacional Marino Ballena durante marea baja para caminar la cola de la ballena.
3. Consejos de Ahorro:
   - Comer en Sodas locales de los mercados municipales (Mercado Central de San José, mercado de Alajuela).
   - Alojarse en hostels con cocina compartida y comprar víveres en supermercados como Palí o Maxi Palí.
   - Pagar en Colones (CRC) para evitar tasas de cambio desfavorables en comercios pequeños.

Tono: Fresco, cómplice, directo, práctico y motivador para viajeros independientes.
`;
    } else if (agentId === "family_accessible") {
      personaPrompt = `
Eres "Mariana • Especialista en Viajes Familiares & Accesibilidad Universal (Ley 7600)" en costaricatours.es.
Tu misión es diseñar viajes seguros, sin barreras y cómodos para familias con niños pequeños, personas mayores o viajeros con movilidad reducida.

CONOCIMIENTOS Y REGLAS DE TRABAJO:
1. Parques Nacionales con Senderos Accesibles (Ley 7600):
   - Parque Nacional Volcán Poás: Sendero 100% asfaltado y plano de 600m directo al mirador del cráter principal, apto para sillas de ruedas y coches de bebé.
   - Parque Nacional Manuel Antonio: Pasarela elevada de madera universal que conecta la entrada con la Playa Manuel Antonio y permite avistar monos y perezosos sin gradas.
   - Puentes Colgantes Mistico Arenal: Cuentan con un sendero accesible de 1.5 km sin gradas con vistas panorámicas al volcán.
2. Aguas Termales para Niños y Familias:
   - Complejos con piscinas de temperatura moderada y toboganes seguros (Baldi Hot Springs, Kalambu Hot Springs Waterpark, Termales Los Laureles).
3. Botiquín y Salud Infantil en el Trópico:
   - Repelente de mosquitos con Icaridina o DEET al 15-20% para niños.
   - Bloqueador solar mineral SPF 50+.
   - Hidratación constante con agua embotellada o filtrada y sueros orales.
4. Logística Relajada:
   - Máximo 1 actividad principal por día para evitar sobrecargar a los niños.
   - Hoteles con habitaciones familiares en planta baja sin escaleras y con piscina.

Tono: Empático, protector, meticuloso y sumamente atento a los detalles de seguridad.
`;
    } else {
      // Default: Valeria • Concierge VIP & Itinerarios
      personaPrompt = `
Eres "Valeria • Pura Vida Concierge VIP" de costaricatours.es (con proyección a la red costaricatours.com).
Tu misión es ser la asesora integral de cabecera del turista para planificar viajes inolvidables de 3 a 14 días en Costa Rica con operadores oficiales.

CONOCIMIENTOS Y REGLAS DE TRABAJO:
1. Destinos Estrella y Circuitos:
   - Clásico Arenal + Monteverde + Manuel Antonio (7 a 10 días).
   - Caribe Salvaje: Tortuguero + Cahuita + Puerto Viejo (5 a 7 días).
   - Lujo & Naturaleza: Golfo de Papagayo + Península de Osa / Corcovado (7 a 10 días).
2. Garantía de Tarifa Oficial: Venta directa sin comisiones ocultas, vouchers centralizados en PDF con QR y asistencia 24/7 en español, inglés, alemán, francés, chino y japonés.
3. Operadores Aliados Oficiales: Gray Line Costa Rica, Swiss Travel, Sky Adventures, Pure Trek, Baldi, Tabacón, Selvatura, Iguana Tours, Bahía Aventuras, Sansa, Interbus, Adobe Rent a Car.

Tono: Sofisticado, cálido, experto, hospitalario y 100% tico ("¡Pura Vida!").
`;
    }

    const systemPrompt = `
${personaPrompt}

CONTEXTO DE SESIÓN DEL USUARIO:
- Idioma preferido: ${targetLangName} (CÓDIGO: ${language})
- Agente Activo: ${agentId}
- Dominio Web Oficial: costaricatours.es (y red costaricatours.com)
- WhatsApp de Asistencia: +506 8795-9148
- Email Oficial: info@costaricatours.es | reservas@costaricatours.es
- Reservas activas en la sesión actual:
${bookingsContextStr}

REGLAS DE RESPUESTA:
- Responde SIEMPRE en el idioma seleccionado por el usuario (${targetLangName}).
- Mantén fielmente la voz, tono y área de especialidad del agente activo (${agentId}).
- Promueve la confianza, la tarifa oficial garantizada y la cancelación gratuita 48h de costaricatours.es.
- Despídete siempre con calidez costarricense ("¡Pura Vida!").
- GEN UI (IMPORTANTE): Cuando recomiendes, menciones o hables sobre un tour específico que se encuentre en nuestro catálogo, DEBES incluir la etiqueta [TOUR:id-del-tour] en tu mensaje (por ejemplo: "[TOUR:arenal-volcano-hotsprings]"). Esto hará que la interfaz de usuario renderice una tarjeta interactiva hermosa y visual del tour directamente en el chat para el usuario. No inventes IDs, usa los nombres de los destinos más conocidos y el sistema intentará mapearlos, pero trata de usar minúsculas y guiones (ej. [TOUR:manuel-antonio-park], [TOUR:monteverde-cloud-forest]).
`;

    // Build full multi-turn conversation contents array
    const contents: any[] = [];

    if (Array.isArray(history) && history.length > 0) {
      for (const h of history) {
        if (h.text && h.sender) {
          contents.push({
            role: h.sender === "user" ? "user" : "model",
            parts: [{ text: h.text }]
          });
        }
      }
    }

    // Append current user message
    contents.push({
      role: "user",
      parts: [{ text: message }]
    });

    const modelToUse = thinking ? "gemini-1.5-pro" : "gemini-1.5-flash";
    const configToUse: any = {
      systemInstruction: systemPrompt,
      tools: [
        {
          functionDeclarations: [
            {
              name: "book_tour",
              description: "Inicia el flujo de reserva en la plataforma abriendo el modal del tour. Úsalo cuando el usuario quiera reservar un tour o ver disponibilidad.",
              parameters: {
                type: Type.OBJECT,
                properties: {
                  tourId: { type: Type.STRING, description: "ID del tour (ej. 'arenal-hot-springs', 'monteverde-canopy', 'manuel-antonio-park', 'tamarindo-surf')" },
                },
                required: ["tourId"]
              }
            },
            {
              name: "book_flight",
              description: "Navega al radar de vuelos y sistema de reservas de vuelos a Costa Rica (SJO o LIR). Úsalo cuando el usuario quiera buscar o reservar pasajes aéreos.",
              parameters: {
                type: Type.OBJECT,
                properties: {}
              }
            },
            {
              name: "book_transport",
              description: "Navega a la sección de transportes (shuttles, alquiler de autos, ferries). Úsalo cuando el usuario pregunte por cómo moverse en Costa Rica o quiera reservar transporte terrestre.",
              parameters: {
                type: Type.OBJECT,
                properties: {}
              }
            },
            {
              name: "open_itinerary_planner",
              description: "Abre el planificador inteligente de itinerarios de viaje en Costa Rica.",
              parameters: {
                type: Type.OBJECT,
                properties: {}
              }
            },
            {
              name: "view_map",
              description: "Abre el mapa interactivo de Costa Rica para ver las ubicaciones de los destinos y tours.",
              parameters: {
                type: Type.OBJECT,
                properties: {}
              }
            }
          ]
        }
      ]
    };
    if (thinking) {
      configToUse.thinkingLevel = "HIGH";
    } else {
      configToUse.temperature = 0.7;
    }

    const response = await ai.models.generateContent({
      model: modelToUse,
      contents: contents,
      config: configToUse,
    });

    let reply = response.text || (language === "es" ? "Ejecutando acción..." : "Executing action...");
    let actionExecuted = false;

    res.json({
      reply,
      functionCalls: response.functionCalls || null,
      agentId
    });
  } catch (error: any) {
    console.error("Gemini Concierge Error:", error);
    res.status(500).json({
      error: "Error procesando tu consulta de viajes.",
      details: error.message,
    });
  }
});

// Urgent Booking API with Gemini extraction and Firestore integration
app.post("/api/gemini/booking/urgent", async (req, res) => {
  try {
    const { message, language = "es" } = req.body;
    if (!message) return res.status(400).json({ error: "Message required" });
    if (!ai) return res.status(500).json({ error: "Gemini AI not initialized" });

    const extractPrompt = `
You are an expert booking extraction system for Costa Rica Tours (costaricatours.es).
Extract the booking intent from the following message: "${message}".
Valid tour IDs are: 'arenal', 'monteverde', 'manuel-antonio', 'pacuare', 'tortuguero', 'tamarindo', 'coffee', 'rio-celeste', 'corcovado'.
If the user specifies a tour, map it to the closest valid tour ID.
Return a strict JSON object with:
{
  "intentFound": true or false,
  "tourId": "extracted or mapped tour ID, or null",
  "date": "YYYY-MM-DD or 'tomorrow' or 'today' or null",
  "adults": number (default 2),
  "children": number (default 0),
  "customerName": "extracted name or 'Guest'",
  "customerEmail": "extracted email or 'guest@example.com'"
}`;

    const extractResponse = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: extractPrompt,
      config: { responseMimeType: "application/json" }
    });

    const intent = JSON.parse(extractResponse.text || "{}");

    if (!intent.intentFound || !intent.tourId) {
      return res.json({ 
        success: false, 
        reply: language === "es" 
          ? "No pudimos determinar qué tour deseas reservar de urgencia. Por favor, especifica el tour y la fecha exacta." 
          : "We couldn't determine which tour you want to book urgently. Please specify the tour and date." 
      });
    }

    if (!db) {
      return res.status(500).json({ error: "Firestore not initialized" });
    }
    
    const userId = "guest-urgent"; 
    const bookingId = `URG-${Date.now()}`;
    let dateStr = intent.date;
    if (dateStr === 'tomorrow') {
      const tmrw = new Date();
      tmrw.setDate(tmrw.getDate() + 1);
      dateStr = tmrw.toISOString().split('T')[0];
    } else if (dateStr === 'today' || !dateStr) {
      dateStr = new Date().toISOString().split('T')[0];
    }

    const bookingData = {
      userId,
      tourId: intent.tourId,
      tourName: intent.tourId.toUpperCase().replace('-', ' '),
      date: dateStr,
      time: "08:00 AM",
      adults: intent.adults || 2,
      children: intent.children || 0,
      totalUSD: (intent.adults || 2) * 100, 
      totalCRC: (intent.adults || 2) * 52000,
      customerName: intent.customerName || "Guest User",
      customerEmail: intent.customerEmail || "guest@example.com",
      status: "confirmed",
      createdAt: FieldValue.serverTimestamp()
    };

    // Save to Firestore
    await db.collection("bookings").doc(bookingId).set({ ...bookingData, bookingId });

    const voucher = {
      bookingId,
      ...bookingData,
      createdAt: new Date().toISOString()
    };

    return res.json({
      success: true,
      reply: language === "es" 
        ? `¡Reserva de URGENCIA procesada exitosamente con Gemini y Firestore! Tu número de confirmación es ${bookingId}.` 
        : `URGENT booking processed successfully with Gemini and Firestore! Your confirmation number is ${bookingId}.`,
      voucher
    });
  } catch (error: any) {
    console.error("Urgent Booking Error:", error);
    res.status(500).json({ error: "Error processing urgent booking" });
  }
});

// Custom Itinerary Generator endpoint
app.post("/api/gemini/itinerary", async (req, res) => {
  try {
    const { days = 5, style = "Aventura y Naturaleza", budget = "Medio", group = "Pareja", language = "es" } = req.body;

    if (!ai) {
      res.json({
        itinerary: [
          {
            day: 1,
            title: "Llegada a San José y Traslado a La Fortuna (Volcán Arenal)",
            activities: ["Check-in en Eco-Lodge", "Aguas Termales de Baldi o Tabacón bajo las estrellas", "Cena típica Casado"],
            recommendedTourId: "arenal-hot-springs"
          },
          {
            day: 2,
            title: "Caminata Volcán Arenal y Catarata La Fortuna",
            activities: ["Caminata sobre coladas de lava antiguas", "Baño en la catarata La Fortuna", "Almuerzo orgánico en finca"],
            recommendedTourId: "arenal-volcano-hike"
          },
          {
            day: 3,
            title: "Monteverde: Bosque Nuboso y Canopy Zipline",
            activities: ["Translado hacia el Bosque Nuboso", "Puentes colgantes en las copas de los árboles", "Tour de tirolesa Canopy"],
            recommendedTourId: "monteverde-canopy"
          },
          {
            day: 4,
            title: "Manuel Antonio: Parque Nacional y Playa",
            activities: ["Caminata guiada buscando perezosos y monos", "Tarde libre en playa paradisíaca", "Atardecer en catamarán"],
            recommendedTourId: "manuel-antonio-park"
          },
          {
            day: 5,
            title: "Rafting en Río Pacuare y Regreso",
            activities: ["Rafting Clase III-IV por el cañón tropical", "Desayuno y almuerzo en el río", "Regreso a San José"],
            recommendedTourId: "pacuare-rafting"
          }
        ]
      });
      return;
    }

    const prompt = `Crea un itinerario día por día para un viaje de ${days} días a Costa Rica.
Estilo: ${style}
Presupuesto: ${budget}
Grupo: ${group}
Idioma: ${language === "es" ? "Español" : "Inglés"}

Devuelve un JSON estricto con esta estructura:
{
  "title": "Nombre atractivo del itinerario",
  "summary": "Resumen en 2 oraciones del viaje",
  "days": [
    {
      "day": 1,
      "title": "Título del Día",
      "location": "Ubicación principal",
      "activities": ["Actividad 1", "Actividad 2", "Actividad 3"],
      "tips": "Consejo local útil"
    }
  ]
}`;

    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const itineraryData = JSON.parse(response.text || "{}");
    res.json(itineraryData);
  } catch (error: any) {
    console.error("Gemini Itinerary Error:", error);
    res.status(500).json({ error: "Error creando el itinerario personalizado" });
  }
});

// AI Eco-Vision & Wildlife / Photo & Video Scanner endpoint
app.post("/api/gemini/analyze-media", async (req, res) => {
  try {
    const { mediaBase64, mimeType = "image/jpeg", prompt = "Analiza este contenido multimedia tomado en Costa Rica", language = "es" } = req.body;

    if (!mediaBase64) {
      res.status(400).json({ error: "Contenido multimedia requerido" });
      return;
    }

    if (!ai) {
      res.json({
        analysis: language === "es" 
          ? "¡Contenido capturado! Se aprecia una exuberante biodiversidad tropical con vegetación silvestre y entorno característico de bosque lluvioso."
          : "Media captured! This Costa Rica content shows lush tropical biodiversity with rainforest flora and wild natural scenery.",
      });
      return;
    }

    const systemInstruction = `Eres un Biólogo Experto y Guía Naturalista de Costa Rica certificado por el ICT.
Analiza la fotografía o video enviado por el turista.
Identifica si hay animales (perezosos, tucanes, monos, ranas, jaguares), plantas, volcanes, cataratas o menús/carteles en español.
Explica datos curiosos sobre la especie o lugar, conservación ambiental y qué tour de Costa Rica le recomendamos para vivir esa experiencia en vivo.
Responde en el idioma solicitado: ${language === "es" ? "Español" : "English"}.`;

    const response = await ai.models.generateContent({
      model: "gemini-1.5-pro",
      contents: {
        parts: [
          { inlineData: { mimeType, data: mediaBase64 } },
          { text: prompt }
        ]
      },
      config: {
        systemInstruction,
        temperature: 0.4
      }
    });

    res.json({ analysis: response.text });
  } catch (error: any) {
    console.error("Gemini Media Analysis Error:", error);
    res.status(500).json({ error: "Error al analizar el contenido" });
  }
});

// Live Costa Rica Search & Maps Grounded Intelligence
app.post("/api/gemini/grounded-search", async (req, res) => {
  try {
    const { query, language = "es" } = req.body;

    if (!query) {
      res.status(400).json({ error: "Consulta requerida" });
      return;
    }

    if (!ai) {
      res.json({
        answer: language === "es"
          ? `Para consultar información en vivo sobre "${query}", por favor configura tu API key. Los Parques Nacionales de Costa Rica abren de 7:00 AM a 4:00 PM.`
          : `To check live updates about "${query}", please configure your API key. Costa Rica National Parks are generally open 7:00 AM - 4:00 PM.`,
        sources: []
      });
      return;
    }

    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: `Consulta en vivo sobre Costa Rica para un turista (buscando direcciones, horarios o información actualizada): ${query}. Responde de forma clara y actualizada en ${language === "es" ? "Español" : "English"}.`,
      config: {
        tools: [{ googleSearch: {} }, { googleMaps: {} }],
      },
    });

    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources = chunks.map((c: any) => ({
      title: c.web?.title || "Fuente Web",
      uri: c.web?.uri || "#"
    })).filter((s: any) => s.uri !== "#");

    res.json({
      answer: response.text,
      sources
    });
  } catch (error: any) {
    console.error("Grounded Search Error:", error);
    res.status(500).json({ error: "Error consultando datos en vivo" });
  }
});

// Image Generation Endpoint
app.post("/api/gemini/generate-image", async (req, res) => {
  try {
    const { prompt, aspectRatio = "1:1", quality = "standard", size = "1K" } = req.body;
    if (!prompt) return res.status(400).json({ error: "Prompt required" });

    if (!ai) {
      return res.json({ imageUrl: "https://placehold.co/1024x1024?text=AI+Image+Generation+Placeholder" });
    }

    const modelName = quality === "high" ? "imagen-3.5-pro" : "imagen-3.5-flash";
    const interaction = await ai.interactions.create({
      model: modelName,
      input: prompt,
      background: false,
      store: false,
      stream: false,
      response_format: {
        type: 'image',
        aspect_ratio: aspectRatio,
        output_image_resolution: size === "4K" ? "4K" : size === "2K" ? "2K" : "1K"
      }
    });

    const imagePart = interaction.output_image;
    if (imagePart && imagePart.data) {
      res.json({ imageUrl: `data:${imagePart.mime_type};base64,${imagePart.data}` });
    } else {
      res.status(500).json({ error: "Failed to generate image" });
    }
  } catch (error: any) {
    console.error("Gemini Image Gen Error:", error);
    res.status(500).json({ error: "Error generating image" });
  }
});

// Video Generation Endpoint
app.post("/api/gemini/generate-video", async (req, res) => {
  try {
    const { prompt, imageBase64, aspectRatio = "16:9" } = req.body;
    if (!prompt) return res.status(400).json({ error: "Prompt required" });

    if (!ai) {
      return res.json({ videoUrl: "" });
    }

    const inputData: any[] = [];
    if (imageBase64) {
      inputData.push({ type: "image", mime_type: "image/jpeg", data: imageBase64.split(",")[1] || imageBase64 });
    }
    inputData.push({ type: "text", text: prompt });

    const interaction = await ai.interactions.create({
      model: 'veo-3.1-fast-generate-preview',
      input: inputData,
      background: false,
      store: false,
      stream: false,
      response_format: {
        type: 'video',
        aspect_ratio: aspectRatio,
      }
    }, { timeout: 300000 });

    const videoPart = interaction.output_video;
    if (videoPart && videoPart.data) {
      res.json({ videoUrl: `data:video/mp4;base64,${videoPart.data}` });
    } else {
      res.status(500).json({ error: "Failed to generate video" });
    }
  } catch (error: any) {
    console.error("Gemini Video Gen Error:", error);
    res.status(500).json({ error: "Error generating video" });
  }
});

// Audio Transcription Endpoint
app.post("/api/gemini/transcribe-audio", async (req, res) => {
  try {
    const { audioBase64, mimeType = "audio/webm", language = "es" } = req.body;
    if (!audioBase64) return res.status(400).json({ error: "Audio base64 required" });

    if (!ai) {
      return res.json({ text: "Simulated audio transcription (configure API Key to enable real AI)." });
    }

    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: {
        parts: [
          { inlineData: { mimeType, data: audioBase64 } },
          { text: "Transcribe the following audio accurately." }
        ]
      }
    });

    res.json({ text: response.text });
  } catch (error: any) {
    console.error("Gemini Transcription Error:", error);
    res.status(500).json({ error: "Error transcribing audio" });
  }
});

// Audio Generation Endpoint (Lyria)
app.post("/api/gemini/generate-music", async (req, res) => {
  try {
    const { prompt, length = "clip" } = req.body;
    if (!prompt) return res.status(400).json({ error: "Prompt required" });
    
    if (!ai) {
      return res.json({ audioUrl: "" });
    }

    const modelName = length === "full" ? "lyria-3-pro-preview" : "lyria-3-clip-preview";

    const interaction = await ai.interactions.create({
      model: modelName,
      input: prompt,
      background: false,
      store: false,
      stream: false,
      response_format: {
        type: 'audio',
      }
    });

    const audioPart = interaction.output_audio;
    if (audioPart && audioPart.data) {
      res.json({ audioUrl: `data:${audioPart.mime_type};base64,${audioPart.data}` });
    } else {
      res.status(500).json({ error: "Failed to generate music" });
    }
  } catch (error: any) {
    console.error("Gemini Music Gen Error:", error);
    res.status(500).json({ error: "Error generating music" });
  }
});




let stripeClient = null;
function getStripe() {
  if (!stripeClient) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (key) {
      stripeClient = new Stripe(key, { apiVersion: '2026-08-26.dahlia' });
    }
  }
  return stripeClient;
}

app.post("/api/stripe/create-checkout-session", async (req, res) => {
  try {
    const stripe = getStripe();
    if (!stripe) {
      return res.status(500).json({ error: "Stripe is not configured on the server." });
    }

    const { tourId, tourName, totalUSD, customerEmail, date, passengers } = req.body;
    const origin = req.headers.origin || process.env.APP_URL || 'http://localhost:3000';

    const bookingId = `CR-PV-${Math.floor(100000 + Math.random() * 900000)}`;
    const bookingsCol = getBookingsCollection();
    
    if (bookingsCol) {
      const newBooking = {
        bookingId,
        tourId,
        tourName,
        date,
        time: "08:00 AM",
        adults: passengers || 1,
        children: 0,
        pickupHotel: "Recepción del Hotel",
        totalUSD,
        totalCRC: Math.round((totalUSD || 0) * 515),
        paymentMethod: "credit_card",
        paymentStatus: "pending",
        status: "pendiente_pago",
        customer: {
          fullName: "Cliente Stripe",
          email: customerEmail || "sin_correo@ejemplo.com",
          phone: "+506 8888-7777",
          country: "Costa Rica / Internacional"
        },
        createdAt: new Date().toISOString()
      };
      await bookingsCol.doc(bookingId).set(newBooking).catch(e => console.error(e));
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer_email: customerEmail || undefined,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: tourName,
              description: `Reserva para el ${date} - ${passengers} pasajeros`,
            },
            unit_amount: Math.round(totalUSD * 100), // in cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${origin}/?booking=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/?booking=canceled`,
      metadata: {
        tourId,
        date,
        passengers: String(passengers),
        bookingId
      }
    });

    res.json({ id: session.id, url: session.url });
  } catch (error) {
    console.error("Stripe Checkout Error:", error);
    res.status(500).json({ error: "Error creando sesión de pago" });
  }
});

// Bookings endpoint (Mock memory storage)
// Colección de Firestore donde viven las reservas de verdad.
// Si Firestore no se pudo inicializar (ver arriba), devolvemos null y cada
// endpoint responde con un error claro en vez de fallar en silencio.
function getBookingsCollection() {
  if (!db) return null;
  return db.collection("bookings");
}

app.post("/api/bookings", async (req, res) => {
  const bookingsCol = getBookingsCollection();
  if (!bookingsCol) {
    return res.status(503).json({ error: "La base de datos no está disponible. Intentá de nuevo en unos minutos." });
  }

  const {
    tourId,
    tourName,
    date,
    time,
    adults,
    children,
    pickupHotel,
    totalUSD,
    customer,
    electronicInvoice,
    paymentMethod,
    paymentStatus,
    status,
    specialRequests,
    flightDetails,
    paypalOrderId
  } = req.body;

  if (!tourId || !date) {
    return res.status(400).json({ error: "Faltan datos obligatorios: tourId y date." });
  }

  const numAdults = Number(adults) || 1;
  const numChildren = Number(children) || 0;
  const bookingTime = time || "08:00 AM";

  // Control de cupo: sumamos los pasajeros ya reservados para el mismo
  // tour, misma fecha y mismo horario, y lo comparamos contra el
  // maxGroupSize del tour (si el tour no define cupo máximo, no bloqueamos).
  const tourDef = TOURS.find((t) => t.id === tourId);
  if (tourDef?.maxGroupSize) {
    const existingSnapshot = await bookingsCol
      .where("tourId", "==", tourId)
      .where("date", "==", date)
      .where("time", "==", bookingTime)
      .get();

    let alreadyBooked = 0;
    existingSnapshot.forEach((doc) => {
      const b = doc.data();
      if (b.status !== "cancelada") {
        alreadyBooked += (b.adults || 0) + (b.children || 0);
      }
    });

    if (alreadyBooked + numAdults + numChildren > tourDef.maxGroupSize) {
      return res.status(409).json({
        error: "sin_disponibilidad",
        message: "No queda cupo suficiente para ese tour en esa fecha y horario.",
        cuposDisponibles: Math.max(0, tourDef.maxGroupSize - alreadyBooked)
      });
    }
  }

  const bookingId = `CR-PV-${Math.floor(100000 + Math.random() * 900000)}`;
  const pnrLocator = flightDetails ? `PNR-${Math.random().toString(36).substring(2, 8).toUpperCase()}` : undefined;

  let agentInsights = null;

  // Background AI Automation Agent for Bookings
  if (ai) {
    try {
      const prompt = `Analiza la siguiente reserva turística y automatiza las tareas operativas requeridas.
      Detalles de la reserva:
      - Tour: ${tourName}
      - Fecha y Hora: ${date} ${bookingTime}
      - Pasajeros: ${numAdults} adultos, ${numChildren} niños
      - Hotel/Recogida: ${pickupHotel || 'No especificado'}
      - Notas especiales del cliente: ${specialRequests || 'Ninguna'}
      
      Genera las etiquetas operativas, evaluación de riesgos logísticos e instrucciones automatizadas para el operador local.`;

      const response = await ai.models.generateContent({
        model: "gemini-1.5-flash",
        contents: prompt,
        config: {
          systemInstruction: "Eres el Agente Operativo Automático de Costa Rica Tours. Tu trabajo corre en el backend y es procesar las reservas, analizando la logística para automatizar la operación turística. Debes generar un JSON estructurado con las instrucciones para el operador local.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              automatedTags: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Etiquetas automáticas asignadas (ej: 'dieta_especial', 'transporte_accesible', 'vip', 'familia')." },
              riskAssessment: { type: Type.STRING, description: "Evaluación de riesgos operativos (ej: 'Temporada de lluvias, llevar capas', 'Tráfico denso posible en esa ruta de hotel')." },
              operationalInstructions: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Instrucciones paso a paso para el guía u operador local (ej: 'Asegurar asiento para niño', 'Confirmar menú vegetariano')." }
            }
          }
        }
      });

      if (response.text) {
        agentInsights = JSON.parse(response.text);
      }
    } catch (e) {
      console.error("AI Booking Automation Error:", e);
    }
  }

  
// --- GOOGLE CALENDAR NATIVE INTEGRATION ---
app.post("/api/calendar/sync", express.json(), async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No Bearer token provided" });
    }
    const token = authHeader.split(" ")[1];

    const { booking } = req.body;
    if (!booking) {
      return res.status(400).json({ error: "Booking data required" });
    }

    const oAuth2Client = new google.auth.OAuth2();
    oAuth2Client.setCredentials({ access_token: token });

    const calendar = google.calendar({ version: "v3", auth: oAuth2Client });

    // Assuming booking.date is "YYYY-MM-DD" and time is something like "08:00"
    // We'll create a generic 8-hour block or use the specific time if available.
    // For simplicity, let's create an all-day event or a 4-hour block.
    const startDate = new Date(`${booking.date}T08:00:00Z`);
    if (isNaN(startDate.getTime())) {
       // fallback if date parse fails
       startDate.setTime(Date.now() + 86400000);
    }
    const endDate = new Date(startDate.getTime() + (4 * 60 * 60 * 1000)); // + 4 hours

    const event = {
      summary: `Reserva Confirmada: ${booking.tourName}`,
      location: booking.pickupHotel || "Costa Rica",
      description: `
        Booking ID: ${booking.bookingId}
        Cliente: ${booking.customerName || "No especificado"}
        Email: ${booking.customerEmail || "No especificado"}
        Pasajeros: ${(booking.adults || 0) + (booking.children || 0)}
        Método de Pago: ${booking.paymentMethod}
      `,
      start: {
        dateTime: startDate.toISOString(),
        timeZone: "America/Costa_Rica",
      },
      end: {
        dateTime: endDate.toISOString(),
        timeZone: "America/Costa_Rica",
      },
    };

    const response = await calendar.events.insert({
      calendarId: "primary",
      requestBody: event,
    });

    res.json({ success: true, eventLink: response.data.htmlLink });
  } catch (error: any) {
    console.error("Calendar Sync Error:", error);
    res.status(500).json({ error: error.message || "Failed to sync with calendar" });
  }
});
// ------------------------------------------

  // Verificación Server-Side de Pagos (PayPal)
  let finalStatus = status || "confirmada";
  let finalPaymentStatus = paymentStatus || "completed";

  if (paymentMethod === "paypal") {
    finalStatus = "pendiente_pago";
    finalPaymentStatus = "pending";

    if (paypalOrderId) {
      try {
        const paypalClientId = process.env.PAYPAL_CLIENT_ID;
        const paypalSecret = process.env.PAYPAL_SECRET;
        
        if (paypalClientId && paypalSecret) {
          const authStr = Buffer.from(`${paypalClientId}:${paypalSecret}`).toString('base64');
          const authRes = await fetch('https://api-m.sandbox.paypal.com/v1/oauth2/token', {
            method: 'POST',
            body: 'grant_type=client_credentials',
            headers: {
              'Authorization': `Basic ${authStr}`,
              'Content-Type': 'application/x-www-form-urlencoded'
            }
          });
          const authData = await authRes.json();
          
          if (authData.access_token) {
            const orderRes = await fetch(`https://api-m.sandbox.paypal.com/v2/checkout/orders/${paypalOrderId}`, {
              headers: { 'Authorization': `Bearer ${authData.access_token}` }
            });
            const orderData = await orderRes.json();
            
            if (orderData.status === 'COMPLETED') {
              finalStatus = "confirmada";
              finalPaymentStatus = "completed";
            }
          }
        } else {
          console.warn("PAYPAL_CLIENT_ID or PAYPAL_SECRET not configured, unable to verify PayPal payment.");
        }
      } catch (err) {
        console.error("Error verifying PayPal order:", err);
      }
    }
  }

  // Disparar Webhook a n8n si el pago de PayPal se confirmó en backend
  if (finalStatus === "confirmada" && paymentMethod === "paypal") {
    const N8N_URL = process.env.N8N_BOOKING_WEBHOOK_URL || "https://costaricatours.app.n8n.cloud/webhook-test/mi-api";
    if (N8N_URL) {
      // Usamos setImmediate o un fetch no bloqueante para no demorar la respuesta al cliente
      fetch(N8N_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId,
          tourId,
          tourName,
          date,
          time: bookingTime,
          adults: numAdults,
          children: numChildren,
          customerName: customer?.name,
          customerEmail: customer?.email,
          paymentMethod,
          paymentStatus: finalPaymentStatus,
          status: finalStatus,
          agentInsights
        })
      }).catch(err => console.error("Error notificando a n8n para PayPal:", err));
    }
  }

  const newBooking = {
    bookingId,
    tourId,
    tourName,
    date,
    time: bookingTime,
    adults: numAdults,
    children: numChildren,
    pickupHotel: pickupHotel || (flightDetails ? `Aeropuerto ${flightDetails.destinationCode} (Vuelo ${flightDetails.flightNumber})` : "Recepción del Hotel"),
    specialRequests,
    totalUSD,
    totalCRC: Math.round((totalUSD || 0) * 515),
    paymentMethod: paymentMethod || "credit_card",
    paymentStatus: finalPaymentStatus,
    customer,
    electronicInvoice,
    flightDetails: flightDetails ? {
      ...flightDetails,
      pnrLocator: flightDetails.pnrLocator || pnrLocator
    } : undefined,
    createdAt: new Date().toISOString(),
    status: finalStatus,
    agentInsights
  };

  try {
    await bookingsCol.doc(bookingId).set(newBooking);
  } catch (error) {
    console.error("Error guardando la reserva en Firestore:", error);
    return res.status(500).json({ error: "No se pudo guardar la reserva. Intentá de nuevo." });
  }

  // Avisar a n8n de que entró una reserva nueva, SOLO si ya está confirmada o pago verificado.
  const N8N_URL = process.env.N8N_BOOKING_WEBHOOK_URL || "https://costaricatours.app.n8n.cloud/webhook-test/mi-api";
  if (N8N_URL && newBooking.status !== "pendiente_pago") {
    fetch(N8N_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newBooking)
    }).catch((err) => console.error("Error notificando a n8n:", err));
  }

  res.status(201).json({ success: true, booking: newBooking });
});

app.get("/api/bookings", async (req, res) => {
  const bookingsCol = getBookingsCollection();
  if (!bookingsCol) {
    return res.status(503).json({ error: "La base de datos no está disponible." });
  }

  // Paginación simple por si el volumen de reservas crece mucho:
  // ?limit=50&startAfter=<bookingId del último de la página anterior>
  const limit = Math.min(Number(req.query.limit) || 100, 500);
  let query = bookingsCol.orderBy("createdAt", "desc").limit(limit);

  if (req.query.startAfter) {
    const startAfterDoc = await bookingsCol.doc(String(req.query.startAfter)).get();
    if (startAfterDoc.exists) {
      query = query.startAfter(startAfterDoc);
    }
  }

  try {
    const snapshot = await query.get();
    const bookings = snapshot.docs.map((doc) => doc.data());
    res.json({ bookings, nextCursor: bookings.length === limit ? bookings[bookings.length - 1].bookingId : null });
  } catch (error) {
    console.error("Error leyendo reservas de Firestore:", error);
    res.status(500).json({ error: "No se pudieron cargar las reservas." });
  }
});

// Endpoint para que n8n interactúe de vuelta con el sistema (ej. confirmar reserva, actualizar status)
app.post("/api/webhooks/n8n/update-booking", async (req, res) => {
  const bookingsCol = getBookingsCollection();
  if (!bookingsCol) {
    return res.status(503).json({ error: "La base de datos no está disponible." });
  }

  const { bookingId, status, notes } = req.body;
  if (!bookingId) {
    return res.status(400).json({ error: "Falta bookingId." });
  }

  const docRef = bookingsCol.doc(bookingId);
  const doc = await docRef.get();
  if (!doc.exists) {
    return res.status(404).json({ error: "Booking not found" });
  }

  const updates: Record<string, any> = {};
  if (status) updates.status = status;
  if (notes) updates.n8nNotes = notes;

  await docRef.update(updates);
  const updatedDoc = await docRef.get();
  res.json({ success: true, booking: updatedDoc.data() });
});

// ==========================================
// MULTI-AGENT SWARM ENDPOINTS (n8n Integrations)
// ==========================================

// Agent 1: Inbox Triage & Classification Agent
// Purpose: Reads raw emails/messages, identifies intent, urgency, and extracts structured entities.
app.post("/api/agents/triage", async (req, res) => {
  try {
    const { rawMessage } = req.body;
    if (!ai) return res.status(503).json({ error: "AI not configured" });

    const prompt = `Analiza el siguiente correo/mensaje de un cliente y extrae la información clave.
    Mensaje: "${rawMessage}"`;

    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "Eres el 'Agente de Clasificación' (Triage Agent). Tu trabajo es leer correos entrantes, determinar la intención principal, la urgencia (alta, media, baja) y extraer datos clave (nombres, fechas, destinos). Devuelve un JSON.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            intent: { type: Type.STRING, description: "Intención del mensaje (ej: 'cotizacion', 'soporte', 'queja', 'reserva')" },
            urgency: { type: Type.STRING, description: "Nivel de urgencia: ALTA, MEDIA, BAJA" },
            extractedData: { 
              type: Type.OBJECT, 
              properties: {
                clientName: { type: Type.STRING },
                mentionedDates: { type: Type.ARRAY, items: { type: Type.STRING } },
                destinations: { type: Type.ARRAY, items: { type: Type.STRING } }
              }
            },
            nextAgentRoute: { type: Type.STRING, description: "Hacia qué agente n8n debe enrutar esto (ej: 'SalesAgent', 'SupportAgent', 'OperationsAgent')" }
          }
        }
      }
    });

    res.json(JSON.parse(response.text || "{}"));
  } catch (error) {
    console.error("Triage Agent Error:", error);
    res.status(500).json({ error: "Triage failed" });
  }
});

// Agent 2: Sales & Processing Agent
// Purpose: Takes the structured data from the Triage Agent and formulates a business response or action plan.
app.post("/api/agents/processor", async (req, res) => {
  try {
    const { intent, extractedData, rawMessage } = req.body;
    if (!ai) return res.status(503).json({ error: "AI not configured" });

    const prompt = `Datos del triage: Intención=${intent}, Datos=${JSON.stringify(extractedData)}. 
    Mensaje original: "${rawMessage}".
    Genera el plan de acción y el borrador de respuesta.`;

    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "Eres el 'Agente de Procesamiento de Ventas' (Sales Processor Agent). Recibes el análisis del Agente de Clasificación. Debes generar las acciones a tomar en la BD y un borrador de correo de respuesta al cliente. Devuelve un JSON.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            databaseActions: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Ej: 'Crear lead en CRM', 'Agendar llamada'" },
            draftResponse: { type: Type.STRING, description: "Borrador del correo electrónico de respuesta en español, muy cortés y vendedor." },
            confidenceScore: { type: Type.NUMBER, description: "Nivel de confianza en la respuesta (0 a 100)" }
          }
        }
      }
    });

    res.json(JSON.parse(response.text || "{}"));
  } catch (error) {
    console.error("Processor Agent Error:", error);
    res.status(500).json({ error: "Processing failed" });
  }
});

// Agent 3: Contingency Engine (Manejo de Excepciones y Clima)
// Purpose: Handles weather alerts, lack of availability, and formulates alternative solutions.
app.post("/api/agents/contingency", async (req, res) => {
  try {
    const { tourName, date, weatherAlert, supplierStatus } = req.body;
    if (!ai) return res.status(503).json({ error: "AI not configured" });

    const prompt = `Analiza contingencia: Tour="${tourName}", Fecha="${date}", Clima="${weatherAlert}", Proveedor="${supplierStatus}".`;

    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "Eres el 'Agente de Contingencias'. Analiza alertas climáticas extremas o rechazos de disponibilidad por parte de proveedores locales. Genera un plan de mitigación, alternativas de tours de valor similar en zonas no afectadas, y un borrador de correo empático y persuasivo para el cliente ofreciendo las alternativas con 'un solo clic'. Devuelve un JSON.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            actionRequired: { type: Type.STRING, description: "Acción requerida (ej: 'Sugerir Alternativa', 'Reembolsar', 'Re-agendar')" },
            alternativeTours: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Sugerencias de tours alternativos (ej: 'Tour a la Montaña' si la playa está inundada)." },
            draftResponse: { type: Type.STRING, description: "Borrador de email empático ofreciendo las opciones." }
          }
        }
      }
    });

    res.json(JSON.parse(response.text || "{}"));
  } catch (error) {
    console.error("Contingency Agent Error:", error);
    res.status(500).json({ error: "Contingency failed" });
  }
});

// Bucle de Autoaprendizaje (Self-Healing) - Registro de Excepciones
function getEscalationsCollection() {
  if (!db) return null;
  return db.collection("escalations");
}

app.post("/api/agents/log_exception", (req, res) => {
  const { errorContext, rawData, agentName } = req.body;
  const escalationsCol = getEscalationsCollection();
  if (escalationsCol) {
    escalationsCol.add({ timestamp: new Date().toISOString(), agentName, errorContext, rawData, status: "pending" })
      .then(() => res.json({ success: true }))
      .catch((err) => res.status(500).json({ error: "Failed to log escalation" }));
  } else {
    res.status(503).json({ error: "DB not ready" });
  }
});

app.get("/api/agents/exceptions", (req, res) => {
  const escalationsCol = getEscalationsCollection();
  if (escalationsCol) {
    escalationsCol.orderBy("timestamp", "desc").limit(100).get()
      .then(snap => {
        const logs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.json({ exceptionsLog: logs });
      })
      .catch(err => res.status(500).json({ error: "Failed to fetch" }));
  } else {
    res.status(503).json({ error: "DB not ready" });
  }
});

// Agent 4: Supervisor Agent (Self-Healing Loop)
// Purpose: Periodically reviews failure logs to optimize prompts and parsing logic.
app.post("/api/agents/supervisor", async (req, res) => {
  try {
    if (!ai) return res.status(503).json({ error: "AI not configured" });
    const escalationsCol = getEscalationsCollection();
    if (!escalationsCol) return res.status(503).json({ error: "DB not ready" });
    const snap = await escalationsCol.where("status", "==", "pending").orderBy("timestamp", "desc").limit(5).get();
    if (snap.empty) {
      return res.json({ analysis: "No hay excepciones recientes registradas. El sistema opera a un 100% de éxito.", detectedPattern: "Stable" });
    }

    const recentLogs = snap.docs.map(d => d.data());
    const prompt = `Analiza los siguientes errores operativos no resueltos (escalaciones): ${JSON.stringify(recentLogs)}`;

    const response = await ai.models.generateContent({
      model: "gemini-1.5-pro",
      contents: prompt,
      config: {
        systemInstruction: "Eres el 'Agente Supervisor'. Tu función es el Autoaprendizaje (Self-Healing). Analizas registros de excepciones (errores al leer emails de operadores informales, timeouts, fallas de validación JSON) y generas recomendaciones técnicas. Tu objetivo es ajustar dinámicamente las instrucciones (prompts) de los otros agentes para que entiendan la informalidad y no fallen la próxima vez. Devuelve JSON.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            detectedPattern: { type: Type.STRING, description: "Patrón de fallo (ej: 'El proveedor usa formato de hora militar', 'El correo viene sin fechas')" },
            promptAdjustments: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Nuevas instrucciones sugeridas para inyectar a los Agentes operativos." },
            recommendedSystemFix: { type: Type.STRING, description: "Ajuste recomendado a nivel de código o n8n workflow." }
          }
        }
      }
    });

    res.json(JSON.parse(response.text || "{}"));
  } catch (error) {
    console.error("Supervisor Agent Error:", error);
    res.status(500).json({ error: "Supervisor failed" });
  }
});

// Start Express + Vite
async function startServer() {
  // Live API setup
  wss.on("connection", async (clientWs) => {
    if (!ai) {
      clientWs.close(1011, "No API key configured");
      return;
    }
    try {
      const session = await ai.live.connect({
        model: "gemini-1.5-flash",
        callbacks: {
          onmessage: (message: LiveServerMessage) => {
            const audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audio && clientWs.readyState === 1) clientWs.send(JSON.stringify({ audio }));
            if (message.serverContent?.interrupted && clientWs.readyState === 1)
              clientWs.send(JSON.stringify({ interrupted: true }));
          },
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } },
          },
          systemInstruction: "You are the Pura Vida Travel Assistant. Speak enthusiastically and helpfully about Costa Rica.",
        },
      });

      clientWs.on("message", (data) => {
        try {
          const { audio } = JSON.parse(data.toString());
          if (audio) {
            session.sendRealtimeInput({
              audio: { data: audio, mimeType: "audio/pcm;rate=16000" },
            });
          }
        } catch (e) {
          console.error("Live WS parse error", e);
        }
      });
      clientWs.on("close", () => {
        // cleanup?
      });
    } catch (e) {
      console.error("Live API Connection error", e);
      clientWs.close(1011, "Live API connection failed");
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
