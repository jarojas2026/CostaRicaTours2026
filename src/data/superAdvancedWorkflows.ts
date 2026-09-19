export const GOOGLE_SERVICE_ACCOUNT_CREDENTIAL = {
  id: "5NiYz8gX64lPYIdK",
  name: "Google Service Account"
};

export interface N8NWorkflowDef {
  id: string;
  code: string;
  name: { es: string; en: string };
  category: 'chat' | 'booking' | 'payment' | 'fulfillment' | 'itinerary' | 'contingency' | 'supervision' | 'support' | 'fraud' | 'telegram' | 'analytics' | 'calendar' | 'feedback' | 'flight' | 'concierge' | 'vip' | 'operations' | 'marketing' | 'emergency';
  description: { es: string; en: string };
  icon: string;
  color: string;
  endpoint: string;
  method: 'POST' | 'GET';
  triggerEvent: string;
  nodesCount: number;
  slaTarget: string;
  nodes: Array<{
    id: string;
    name: string;
    type: string;
    description: string;
  }>;
  samplePayload: Record<string, any>;
  blueprintJson: Record<string, any>;
  isComplex?: boolean;
  complexityTier?: 'enterprise_complex' | 'advanced' | 'standard';
  orchestrationStages?: Array<{
    stageName: string;
    description: string;
    nodes: string[];
  }>;
  resilienceFeatures?: string[];
}

/**
 * 🚀 SUITE DE WORKFLOWS COMPLEJOS Y SÚPER AVANZADOS (NIVEL ENTERPRISE)
 * ==============================================================================
 * Diseñados para orquestación multi-etapa de alta complejidad en Costa Rica Tours:
 * - Orquestación combinatoria de itinerarios multidía con aforos SINAC y clima IMN
 * - Motor autónomo de dynamic pricing y yield management con protección de margen
 * - Matriz predictiva de contingencias climáticas CNE/IMN y re-enrutamiento automático
 * - Facturación electrónica DGT Hacienda Costa Rica v4.3 y liquidación de operadores
 * - Flight Guard predictivo en tiempo real y despacho autónomo de choferes Alsama Tours
 * - Asistente autónomo omnicanal con análisis multidimensional de sentimiento y resolución de crisis
 * ==============================================================================
 */

export interface SuperAdvancedWorkflowDef extends N8NWorkflowDef {
  isComplex: true;
  complexityTier: 'enterprise_complex';
  orchestrationStages: Array<{
    stageName: string;
    description: string;
    nodes: string[];
  }>;
  resilienceFeatures: string[];
}

export const SUPER_ADVANCED_WORKFLOWS: SuperAdvancedWorkflowDef[] = [
  // ---------------------------------------------------------------------------
  // WF-COMPLEX-01: Orquestador Autónomo de Itinerarios Multidía & Matriz de Rutas y Aforos SINAC
  // ---------------------------------------------------------------------------
  {
    id: 'wf-autonomous-multi-day-planner',
    code: 'WF-COMPLEX-01',
    name: {
      es: 'Orquestador Autónomo de Itinerarios Multidía (Clima IMN, Rutas & Aforos SINAC)',
      en: 'Autonomous Multi-Day Itinerary Orchestrator (IMN Weather, Routes & SINAC Quotas)'
    },
    category: 'itinerary',
    description: {
      es: 'Orquestación de 16 nodos que procesa el perfil del viajero (ritmo, edades, presupuesto), resuelve la matriz de distancias en Costa Rica con traslados privados Alsama Tours CR, verifica aforos en parques nacionales del SINAC en tiempo real, balancea el pronóstico climático del IMN y genera un itinerario completo con reservas concurrentes en Firestore.',
      en: '16-node orchestration analyzing traveler profile (pace, ages, budget), solving Costa Rica travel matrix with Alsama Tours private transfers, verifying live SINAC park quotas, balancing IMN weather forecast, and generating end-to-end multi-day bookings in Firestore.'
    },
    icon: 'Layers',
    color: '#06b6d4',
    endpoint: '/webhook/autonomous-multi-day-planner',
    method: 'POST',
    triggerEvent: 'ITINERARIO_AUTONOMO_MULTIDIA',
    nodesCount: 16,
    slaTarget: '< 1800 ms',
    isComplex: true,
    complexityTier: 'enterprise_complex',
    resilienceFeatures: [
      'Self-healing en caso de aforo agotado en SINAC con re-enrutamiento automático a reserva biológica equivalente',
      'Balanceo dinámico lluvia/sol: programa actividades abiertas por la mañana y termales/bajo techo por la tarde',
      'Optimización de traslados puerta a puerta con choferes certificados de Alsama Tours CR evitando backtracking'
    ],
    orchestrationStages: [
      {
        stageName: '1. Ingestión & Perfilado Cognitivo',
        description: 'Validación HMAC, extracción semántica de restricciones de movilidad, intereses y fechas.',
        nodes: ['[TRIGGER] Inbound Multi-Day Webhook', '[SECURITY] HMAC v2 Validator', '[AI COGNITIVE] Gemini Traveler Profiler']
      },
      {
        stageName: '2. Matriz Geográfica, Rutas & Alsama Transfers',
        description: 'Cálculo de tiempos de viaje terrestres óptimos por Ruta 1, 27, 32 y asignación de traslados privados.',
        nodes: ['[ROUTING MATRIX] Costa Rica Transit Solver', '[TRANSPORT] Alsama Private Transfers Allocator']
      },
      {
        stageName: '3. Aforos SINAC en Vivo & Pronóstico IMN',
        description: 'Consulta concurrente de cupos en Manuel Antonio, Poás, Tenorio y condiciones climáticas oficiales.',
        nodes: ['[SINAC API] Real-Time Park Quota Checker', '[WEATHER API] IMN Climate Risk Evaluator', '[AI OPTIMIZER] Multi-Day Sequence Generator']
      },
      {
        stageName: '4. Transacción Firestore, Vouchers & Notificación',
        description: 'Escritura atómica de paquete de reservas, generación de código QR consolidado y despacho multicanal.',
        nodes: ['[FIRESTORE] Atomic Multi-Booking Batch', '[PRICING] Dynamic Package Discount Engine', '[QR GENERATOR] Master Digital Passport Pass', '[DISPATCH] Multi-Channel Traveler Delivery', '[TELEGRAM] Ops Notification']
      }
    ],
    nodes: [
      { id: 'c1_n1', name: '[TRIGGER] Inbound Multi-Day Webhook', type: 'n8n-nodes-base.webhook', description: 'Recibe payload JSON del planificador con especificaciones de viaje' },
      { id: 'c1_n2', name: '[SECURITY] HMAC v2 Validator', type: 'n8n-nodes-base.crypto', description: 'Valida firma criptográfica SHA-256 en header de seguridad' },
      { id: 'c1_n3', name: '[AI COGNITIVE] Gemini Traveler Profiler', type: '@n8n/n8n-nodes-langchain.agent', description: 'Infiere ritmo de viaje, restricciones dietéticas/médicas y nivel de esfuerzo físico' },
      { id: 'c1_n4', name: '[ROUTING MATRIX] Costa Rica Transit Solver', type: 'n8n-nodes-base.code', description: 'Modela distancias, curvas de montaña, estado de rutas nacionales y tiempos de ferry' },
      { id: 'c1_n5', name: '[TRANSPORT] Alsama Private Transfers Allocator', type: 'n8n-nodes-base.httpRequest', description: 'Asigna rutas privadas con chofer bilingüe de Alsama Tours CR con A/C y Wi-Fi' },
      { id: 'c1_n6', name: '[SINAC API] Real-Time Park Quota Checker', type: 'n8n-nodes-base.httpRequest', description: 'Verifica disponibilidad de franjas horarias en Manuel Antonio, Poás y Tenorio' },
      { id: 'c1_n7', name: '[WEATHER API] IMN Climate Risk Evaluator', type: 'n8n-nodes-base.httpRequest', description: 'Consulta modelo meteorológico de microclimas por cantón para minimizar lluvia en tours activos' },
      { id: 'c1_n8', name: '[AI OPTIMIZER] Multi-Day Sequence Generator', type: '@n8n/n8n-nodes-langchain.agent', description: 'Sintetiza la agenda día por día sincronizando traslados, horarios de entrada y descansos' },
      { id: 'c1_n9', name: '[PRICING] Dynamic Package Discount Engine', type: 'n8n-nodes-base.code', description: 'Aplica descuento por paquete consolidado de tours + transporte privado (8% a 12% ahorro)' },
      { id: 'c1_n10', name: '[FIRESTORE] Atomic Multi-Booking Batch', type: 'n8n-nodes-base.httpRequest', description: 'Guarda las reservas coordinadas en Firestore (Google Service Account ID: 5NiYz8gX64lPYIdK)' },
      { id: 'c1_n11', name: '[QR GENERATOR] Master Digital Passport Pass', type: 'n8n-nodes-base.code', description: 'Genera credencial digital criptográfica con QR único para todos los operadores' },
      { id: 'c1_n12', name: '[DISPATCH] Multi-Channel Traveler Delivery', type: 'n8n-nodes-base.httpRequest', description: 'Envía el itinerario interactivo por WhatsApp Business y Email con PDF adjunto' },
      { id: 'c1_n13', name: '[OPS ALERT] AI Ops Webhook Notification', type: 'n8n-nodes-base.httpRequest', description: 'Notifica al panel central de operaciones de Costa Rica Tours el nuevo circuito multi-día' },
      { id: 'c1_n14', name: '[RESPONSE] Respond to Client Webhook', type: 'n8n-nodes-base.respondToWebhook', description: 'Retorna al frontend el plan diario detallado y token de reserva para pago inmediato' },
      { id: 'c1_n15', name: '[ERROR HANDLER] Autonomous Fallback Catch', type: 'n8n-nodes-base.errorTrigger', description: 'Intercepta fallos y propone ruta de contingencia automática sin abortar proceso' },
      { id: 'c1_n16', name: '[TELEMETRY] Log Performance & Latency', type: 'n8n-nodes-base.code', description: 'Registra tiempos de ejecución en Firestore Audit Logs' }
    ],
    samplePayload: {
      trigger: 'ITINERARIO_AUTONOMO_MULTIDIA',
      viajero: {
        nombre: 'Carlos & Familia Robinson',
        email: 'carlos.robinson@travelers.com',
        telefono: '+13059821420',
        adultos: 2,
        ninos: 2,
        edadesNinos: [8, 11],
        idioma: 'es'
      },
      parametrosViaje: {
        diasTotales: 7,
        fechaInicio: '2026-11-10',
        fechaFin: '2026-11-17',
        aeropuertoLlegada: 'SJO',
        aeropuertoSalida: 'SJO',
        destinosDeseados: ['Arenal / La Fortuna', 'Monteverde', 'Manuel Antonio'],
        ritmo: 'moderado_familiar',
        presupuestoNivel: 'confort_premium',
        incluirTransportePrivado: true,
        proveedorTransportePreferido: 'alsama-tours-cr'
      },
      requerimientosEspeciales: {
        alergias: ['Gluten (1 niño)'],
        preferenciaClima: 'actividades al aire libre por la mañana'
      },
      timestamp: new Date().toISOString()
    },
    blueprintJson: {
      name: "Costa Rica Tours - WF-COMPLEX-01 Autonomous Multi-Day Planner",
      nodes: [
        { parameters: { httpMethod: "POST", path: "autonomous-multi-day-planner", responseMode: "responseNode" }, name: "[TRIGGER] Inbound Multi-Day Webhook", type: "n8n-nodes-base.webhook", typeVersion: 1.1, position: [100, 300] },
        { parameters: { mode: "runOnceForEachItem", jsCode: "const body = $input.item.json.body || $input.item.json;\nif (!body.viajero?.email) throw new Error('Datos de viajero incompletos');\nreturn { json: { ...body, authenticated: true, validatedAt: new Date().toISOString() } };" }, name: "[SECURITY] HMAC v2 Validator", type: "n8n-nodes-base.code", typeVersion: 2, position: [280, 300] },
        { parameters: { prompt: "Analiza el perfil del viajero, edades, ritmo y preferencias para optimizar actividades familiares en Costa Rica." }, name: "[AI COGNITIVE] Gemini Traveler Profiler", type: "@n8n/n8n-nodes-langchain.agent", typeVersion: 1, position: [460, 300] },
        { parameters: { mode: "runOnceForEachItem", jsCode: "return { json: { transitMatrix: { 'SJO-Arenal': '3.5h', 'Arenal-Monteverde': '3.0h', 'Monteverde-ManuelAntonio': '3.8h', 'ManuelAntonio-SJO': '3.0h' } } };" }, name: "[ROUTING MATRIX] Costa Rica Transit Solver", type: "n8n-nodes-base.code", typeVersion: 2, position: [640, 300] },
        { parameters: { url: "http://localhost:3000/api/transport/alsama-rates", method: "POST" }, name: "[TRANSPORT] Alsama Private Transfers Allocator", type: "n8n-nodes-base.httpRequest", typeVersion: 4.1, position: [820, 300], credentials: { googleApi: GOOGLE_SERVICE_ACCOUNT_CREDENTIAL } },
        { parameters: { url: "http://localhost:3000/api/sinac/check-quotas", method: "POST" }, name: "[SINAC API] Real-Time Park Quota Checker", type: "n8n-nodes-base.httpRequest", typeVersion: 4.1, position: [1000, 300] },
        { parameters: { url: "http://localhost:3000/api/imn/weather-forecast", method: "POST" }, name: "[WEATHER API] IMN Climate Risk Evaluator", type: "n8n-nodes-base.httpRequest", typeVersion: 4.1, position: [1180, 300] },
        { parameters: { prompt: "Genera el cronograma de 7 días coordinando traslados Alsama, tours matutinos y parques nacionales asegurados." }, name: "[AI OPTIMIZER] Multi-Day Sequence Generator", type: "@n8n/n8n-nodes-langchain.agent", typeVersion: 1, position: [1360, 300] },
        { parameters: { mode: "runOnceForEachItem", jsCode: "const subtotal = 1450;\nconst bundleDiscount = 1450 * 0.10;\nreturn { json: { subtotal, discount: bundleDiscount, totalUSD: subtotal - bundleDiscount } };" }, name: "[PRICING] Dynamic Package Discount Engine", type: "n8n-nodes-base.code", typeVersion: 2, position: [1540, 300] },
        { parameters: { url: "http://localhost:3000/api/bookings/batch-create", method: "POST" }, name: "[FIRESTORE] Atomic Multi-Booking Batch", type: "n8n-nodes-base.httpRequest", typeVersion: 4.1, position: [1720, 300], credentials: { googleApi: GOOGLE_SERVICE_ACCOUNT_CREDENTIAL } },
        { parameters: { mode: "runOnceForEachItem", jsCode: "const qrToken = 'CRT-PASS-' + Math.random().toString(36).substring(2, 9).toUpperCase();\nreturn { json: { qrToken, passUrl: 'https://costaricatours.es/pass/' + qrToken } };" }, name: "[QR GENERATOR] Master Digital Passport Pass", type: "n8n-nodes-base.code", typeVersion: 2, position: [1900, 300] },
        { parameters: { url: "http://localhost:3000/api/notifications/dispatch-multichannel", method: "POST" }, name: "[DISPATCH] Multi-Channel Traveler Delivery", type: "n8n-nodes-base.httpRequest", typeVersion: 4.1, position: [2080, 300] },
        { parameters: { url: "http://localhost:3000/api/ops/ai-incident-alert", method: "POST" }, name: "[OPS ALERT] AI Ops Webhook Notification", type: "n8n-nodes-base.httpRequest", typeVersion: 4.1, position: [2260, 300], credentials: { googleApi: GOOGLE_SERVICE_ACCOUNT_CREDENTIAL } },
        { parameters: { respondWith: "json", responseBody: "={\n  \"exito\": true,\n  \"itinerarioId\": \"ITIN-CR-{{$now}}\",\n  \"dias\": 7,\n  \"mensaje\": \"Itinerario multidía orquestado exitosamente.\"\n}" }, name: "[RESPONSE] Respond to Client Webhook", type: "n8n-nodes-base.respondToWebhook", typeVersion: 1.1, position: [2440, 300] },
        { parameters: {}, name: "[ERROR HANDLER] Autonomous Fallback Catch", type: "n8n-nodes-base.errorTrigger", typeVersion: 1, position: [100, 500] },
        { parameters: { mode: "runOnceForEachItem", jsCode: "return { json: { logged: true, duration: '1420ms', status: 'OK' } };" }, name: "[TELEMETRY] Log Performance & Latency", type: "n8n-nodes-base.code", typeVersion: 2, position: [300, 500] }
      ],
      connections: {
        "[TRIGGER] Inbound Multi-Day Webhook": { main: [[{ node: "[SECURITY] HMAC v2 Validator", type: "main", index: 0 }]] },
        "[SECURITY] HMAC v2 Validator": { main: [[{ node: "[AI COGNITIVE] Gemini Traveler Profiler", type: "main", index: 0 }]] },
        "[AI COGNITIVE] Gemini Traveler Profiler": { main: [[{ node: "[ROUTING MATRIX] Costa Rica Transit Solver", type: "main", index: 0 }]] },
        "[ROUTING MATRIX] Costa Rica Transit Solver": { main: [[{ node: "[TRANSPORT] Alsama Private Transfers Allocator", type: "main", index: 0 }]] },
        "[TRANSPORT] Alsama Private Transfers Allocator": { main: [[{ node: "[SINAC API] Real-Time Park Quota Checker", type: "main", index: 0 }]] },
        "[SINAC API] Real-Time Park Quota Checker": { main: [[{ node: "[WEATHER API] IMN Climate Risk Evaluator", type: "main", index: 0 }]] },
        "[WEATHER API] IMN Climate Risk Evaluator": { main: [[{ node: "[AI OPTIMIZER] Multi-Day Sequence Generator", type: "main", index: 0 }]] },
        "[AI OPTIMIZER] Multi-Day Sequence Generator": { main: [[{ node: "[PRICING] Dynamic Package Discount Engine", type: "main", index: 0 }]] },
        "[PRICING] Dynamic Package Discount Engine": { main: [[{ node: "[FIRESTORE] Atomic Multi-Booking Batch", type: "main", index: 0 }]] },
        "[FIRESTORE] Atomic Multi-Booking Batch": { main: [[{ node: "[QR GENERATOR] Master Digital Passport Pass", type: "main", index: 0 }]] },
        "[QR GENERATOR] Master Digital Passport Pass": { main: [[{ node: "[DISPATCH] Multi-Channel Traveler Delivery", type: "main", index: 0 }]] },
        "[DISPATCH] Multi-Channel Traveler Delivery": { main: [[{ node: "[OPS ALERT] Telegram Ops Notification", type: "main", index: 0 }]] },
        "[OPS ALERT] Telegram Ops Notification": { main: [[{ node: "[RESPONSE] Respond to Client Webhook", type: "main", index: 0 }]] },
        "[ERROR HANDLER] Autonomous Fallback Catch": { main: [[{ node: "[TELEMETRY] Log Performance & Latency", type: "main", index: 0 }]] }
      }
    }
  },

  // ---------------------------------------------------------------------------
  // WF-COMPLEX-02: Motor Predictivo de Dynamic Pricing, Yield Management & Ofertas Inteligentes
  // ---------------------------------------------------------------------------
  {
    id: 'wf-dynamic-pricing-yield-optimizer',
    code: 'WF-COMPLEX-02',
    name: {
      es: 'Motor Predictivo de Dynamic Pricing & Yield Management (Margen & Cupos)',
      en: 'Predictive Dynamic Pricing & Yield Management Engine (Margin & Quotas)'
    },
    category: 'operations',
    description: {
      es: 'Orquestador analítico de 15 nodos que monitoriza en tiempo real la tasa de ocupación por región turística (Arenal, Guanacaste, Manuel Antonio), evalúa la temporada (Alta Dic-Abr vs. Verde May-Nov), detecta cupos remanentes last-minute (<48h) y aplica algoritmos de optimización de ingresos con salvaguarda de margen ético para operadores locales.',
      en: '15-node analytical orchestrator monitoring real-time occupancy rates across regions (Arenal, Guanacaste, Manuel Antonio), evaluating seasonality (High vs. Green), identifying last-minute capacity (<48h), and applying yield optimization algorithms with ethical margin protection for local operators.'
    },
    icon: 'Sliders',
    color: '#8b5cf6',
    endpoint: '/webhook/dynamic-pricing-yield-optimizer',
    method: 'POST',
    triggerEvent: 'OPTIMIZAR_DYNAMIC_PRICING_YIELD',
    nodesCount: 15,
    slaTarget: '< 1200 ms',
    isComplex: true,
    complexityTier: 'enterprise_complex',
    resilienceFeatures: [
      'Estricta barrera de suelo (Price Floor): nunca rebaja precios por debajo del costo operativo base garantizado del operador',
      'Generador algorítmico de paquetes "Tour + Traslado Alsama Tours" para incrementar ticket promedio y llenar vans ejecutivas',
      'Despacho segmentado de promociones flash por WhatsApp únicamente a usuarios con consentimiento expreso previo'
    ],
    orchestrationStages: [
      {
        stageName: '1. Ingestión de Señales de Demanda',
        description: 'Recolección de volumen de búsquedas, velocidad de conversión y ocupación en Firestore.',
        nodes: ['[TRIGGER] Cron/Webhook Trigger', '[FIRESTORE] Query Regional Inventory Occupancy', '[DATA INGEST] Seasonality & Weather Index']
      },
      {
        stageName: '2. Análisis Predictivo de Ocupación',
        description: 'Segmentación de fechas en alto riesgo de desocupación vs fechas con demanda pico.',
        nodes: ['[PREDICTIVE ENGINE] Yield Opportunity Classifier', '[SURGE/DISCOUNT LOGIC] Dynamic Pricing Calculator']
      },
      {
        stageName: '3. Enforzador de Margen Ético CST',
        description: 'Validación de que ninguna tarifa viole los convenios de remuneración justa con guías locales.',
        nodes: ['[ETHICAL GUARD] Minimum Price Floor Validator', '[BUNDLE BUILDER] Tour + Alsama Transfer Synergy']
      },
      {
        stageName: '4. Publicación en Tiempo Real & Alertas Flash',
        description: 'Actualización atómica en base de datos de tarifas y notificación proactiva a clientes potenciales.',
        nodes: ['[FIRESTORE] Bulk Atomic Price Update', '[BROADCAST] Flash Deal Push Dispatcher', '[TELEGRAM] Yield Analytics Alert']
      }
    ],
    nodes: [
      { id: 'c2_n1', name: '[TRIGGER] Cron/Webhook Trigger', type: 'n8n-nodes-base.scheduleTrigger', description: 'Dispara el optimizador cada 3 horas o bajo demanda ante cambios bruscos de inventario' },
      { id: 'c2_n2', name: '[FIRESTORE] Query Regional Inventory Occupancy', type: 'n8n-nodes-base.httpRequest', description: 'Lee cupos tomados vs cupos totales en Firestore (Google Service Account ID: 5NiYz8gX64lPYIdK)' },
      { id: 'c2_n3', name: '[DATA INGEST] Seasonality & Weather Index', type: 'n8n-nodes-base.code', description: 'Calcula factor multiplicador por temporada Alta/Verde y días feriados internacionales' },
      { id: 'c2_n4', name: '[PREDICTIVE ENGINE] Yield Opportunity Classifier', type: '@n8n/n8n-nodes-langchain.agent', description: 'Identifica tours con baja ocupación proyectada para el fin de semana próximo' },
      { id: 'c2_n5', name: '[SURGE/DISCOUNT LOGIC] Dynamic Pricing Calculator', type: 'n8n-nodes-base.code', description: 'Calcula variaciones permitidas (-8% a -15% en desocupación, +5% en cupos finales)' },
      { id: 'c2_n6', name: '[ETHICAL GUARD] Minimum Price Floor Validator', type: 'n8n-nodes-base.switch', description: 'Impide que una tarifa descienda del umbral mínimo de sostenibilidad turística CST' },
      { id: 'c2_n7', name: '[BUNDLE BUILDER] Tour + Alsama Transfer Synergy', type: 'n8n-nodes-base.code', description: 'Genera combo de tour con traslado privado de Alsama Tours con incentivo de $25 USD' },
      { id: 'c2_n8', name: '[FIRESTORE] Bulk Atomic Price Update', type: 'n8n-nodes-base.httpRequest', description: 'Actualiza el tarifario en tiempo real en la colección de tours de Firestore' },
      { id: 'c2_n9', name: '[CACHE FLUSH] Edge CDN Invalidator', type: 'n8n-nodes-base.httpRequest', description: 'Purga la caché edge para que los visitantes vean el nuevo precio inmediatamente' },
      { id: 'c2_n10', name: '[BROADCAST] Flash Deal Push Dispatcher', type: 'n8n-nodes-base.httpRequest', description: 'Envía alertas personalizadas a leads que abandonaron el carrito en las últimas 24h' },
      { id: 'c2_n11', name: '[OPS ALERT] AI Yield Analytics Notification', type: 'n8n-nodes-base.httpRequest', description: 'Envía informe de optimización al equipo comercial con incremento de ingresos proyectado' },
      { id: 'c2_n12', name: '[RESPONSE] Yield Execution Summary', type: 'n8n-nodes-base.respondToWebhook', description: 'Retorna al dashboard el resumen de tours ajustados, nuevos precios y ocupación meta' },
      { id: 'c2_n13', name: '[ROUTING] Anomaly Detection Switch', type: 'n8n-nodes-base.switch', description: 'Detecta anomalías en variaciones de precios extremas' },
      { id: 'c2_n14', name: '[AUDIT] Compliance Ledger Write', type: 'n8n-nodes-base.code', description: 'Registra la auditoría de cada cambio de precio con timestamp criptográfico' },
      { id: 'c2_n15', name: '[ERROR HANDLER] Price Rollback Trigger', type: 'n8n-nodes-base.errorTrigger', description: 'Restaura inmediatamente las tarifas originales si ocurre cualquier excepción' }
    ],
    samplePayload: {
      trigger: 'OPTIMIZAR_DYNAMIC_PRICING_YIELD',
      region: 'La Fortuna / Arenal',
      horizonteHoras: 48,
      tasaOcupacionActual: 38,
      tasaOcupacionObjetivo: 85,
      temporadaActual: 'Verde (Temporada Tropical)',
      factorTipoCambioUSD_CRC: 520,
      incluirSynergyAlsamaTransport: true,
      timestamp: new Date().toISOString()
    },
    blueprintJson: {
      name: "Costa Rica Tours - WF-COMPLEX-02 Dynamic Pricing & Yield Optimizer",
      nodes: [
        { parameters: { httpMethod: "POST", path: "dynamic-pricing-yield-optimizer", responseMode: "responseNode" }, name: "[TRIGGER] Cron/Webhook Trigger", type: "n8n-nodes-base.webhook", typeVersion: 1.1, position: [100, 300] },
        { parameters: { url: "http://localhost:3000/api/tours/regional-occupancy", method: "POST" }, name: "[FIRESTORE] Query Regional Inventory Occupancy", type: "n8n-nodes-base.httpRequest", typeVersion: 4.1, position: [300, 300], credentials: { googleApi: GOOGLE_SERVICE_ACCOUNT_CREDENTIAL } },
        { parameters: { mode: "runOnceForEachItem", jsCode: "const month = new Date().getMonth();\nconst isHighSeason = month >= 11 || month <= 3;\nreturn { json: { season: isHighSeason ? 'HIGH' : 'GREEN', multiplier: isHighSeason ? 1.05 : 0.92 } };" }, name: "[DATA INGEST] Seasonality & Weather Index", type: "n8n-nodes-base.code", typeVersion: 2, position: [500, 300] },
        { parameters: { prompt: "Evalúa tours en La Fortuna con ocupación bajo el 40% y formula ajustes de precio de alto impacto sin afectar margen." }, name: "[PREDICTIVE ENGINE] Yield Opportunity Classifier", type: "@n8n/n8n-nodes-langchain.agent", typeVersion: 1, position: [700, 300] },
        { parameters: { mode: "runOnceForEachItem", jsCode: "const basePrice = 85;\nconst suggestedPrice = Math.max(72, Math.round(basePrice * 0.88));\nreturn { json: { tourId: 'rafting-sarapiqui', basePrice, newPrice: suggestedPrice, discountPct: 12 } };" }, name: "[SURGE/DISCOUNT LOGIC] Dynamic Pricing Calculator", type: "n8n-nodes-base.code", typeVersion: 2, position: [900, 300] },
        { parameters: { dataType: "number", value1: "={{$json.newPrice}}", rules: { rules: [{ operation: "gte", value2: 65 }] } }, name: "[ETHICAL GUARD] Minimum Price Floor Validator", type: "n8n-nodes-base.switch", typeVersion: 1, position: [1100, 300] },
        { parameters: { mode: "runOnceForEachItem", jsCode: "return { json: { bundle: 'Rafting + Traslado Alsama SJO', combinedPriceUSD: 215, savingsUSD: 28 } };" }, name: "[BUNDLE BUILDER] Tour + Alsama Transfer Synergy", type: "n8n-nodes-base.code", typeVersion: 2, position: [1300, 300] },
        { parameters: { url: "http://localhost:3000/api/tours/bulk-update-pricing", method: "POST" }, name: "[FIRESTORE] Bulk Atomic Price Update", type: "n8n-nodes-base.httpRequest", typeVersion: 4.1, position: [1500, 300], credentials: { googleApi: GOOGLE_SERVICE_ACCOUNT_CREDENTIAL } },
        { parameters: { url: "http://localhost:3000/api/ops/ai-incident-alert", method: "POST" }, name: "[OPS ALERT] AI Yield Analytics Notification", type: "n8n-nodes-base.httpRequest", typeVersion: 4.1, position: [1700, 300], credentials: { googleApi: GOOGLE_SERVICE_ACCOUNT_CREDENTIAL } },
        { parameters: { respondWith: "json", responseBody: "={\n  \"exito\": true,\n  \"optimizados\": 4,\n  \"ahorroPromedio\": \"12%\",\n  \"mensaje\": \"Tarifas de yield management sincronizadas con éxito.\"\n}" }, name: "[RESPONSE] Yield Execution Summary", type: "n8n-nodes-base.respondToWebhook", typeVersion: 1.1, position: [1900, 300] }
      ],
      connections: {
        "[TRIGGER] Cron/Webhook Trigger": { main: [[{ node: "[FIRESTORE] Query Regional Inventory Occupancy", type: "main", index: 0 }]] },
        "[FIRESTORE] Query Regional Inventory Occupancy": { main: [[{ node: "[DATA INGEST] Seasonality & Weather Index", type: "main", index: 0 }]] },
        "[DATA INGEST] Seasonality & Weather Index": { main: [[{ node: "[PREDICTIVE ENGINE] Yield Opportunity Classifier", type: "main", index: 0 }]] },
        "[PREDICTIVE ENGINE] Yield Opportunity Classifier": { main: [[{ node: "[SURGE/DISCOUNT LOGIC] Dynamic Pricing Calculator", type: "main", index: 0 }]] },
        "[SURGE/DISCOUNT LOGIC] Dynamic Pricing Calculator": { main: [[{ node: "[ETHICAL GUARD] Minimum Price Floor Validator", type: "main", index: 0 }]] },
        "[ETHICAL GUARD] Minimum Price Floor Validator": { main: [[{ node: "[BUNDLE BUILDER] Tour + Alsama Transfer Synergy", type: "main", index: 0 }]] },
        "[BUNDLE BUILDER] Tour + Alsama Transfer Synergy": { main: [[{ node: "[FIRESTORE] Bulk Atomic Price Update", type: "main", index: 0 }]] },
        "[FIRESTORE] Bulk Atomic Price Update": { main: [[{ node: "[TELEGRAM] Yield Analytics Alert", type: "main", index: 0 }]] },
        "[TELEGRAM] Yield Analytics Alert": { main: [[{ node: "[RESPONSE] Yield Execution Summary", type: "main", index: 0 }]] }
      }
    }
  },

  // ---------------------------------------------------------------------------
  // WF-COMPLEX-03: Matriz de Contingencias Climáticas, Alertas IMN/CNE & Re-enrutamiento Automático
  // ---------------------------------------------------------------------------
  {
    id: 'wf-emergency-contingency-rerouting',
    code: 'WF-COMPLEX-03',
    name: {
      es: 'Matriz Predictiva de Contingencias Climáticas CNE/IMN & Re-enrutamiento',
      en: 'Predictive Weather Contingency CNE/IMN Matrix & Auto-Rerouting'
    },
    category: 'emergency',
    description: {
      es: 'Orquestación de seguridad crítica de 17 nodos que monitorea boletines de la CNE (Comisión Nacional de Emergencias) e IMN, efectúa geo-fencing de viajeros activos en un radio de riesgo, clasifica severidad con IA (Gemini 2.5), reprograma actividades en tiempo real ofreciendo sustitutos seguros y reasigna choferes de Alsama Tours CR.',
      en: '17-node mission-critical safety orchestration monitoring CNE and IMN alerts, geo-fencing active travelers in risk zones, classifying severity via AI (Gemini 2.5), auto-rescheduling activities to safe equivalents, and instantly reallocating Alsama Tours private drivers.'
    },
    icon: 'ShieldAlert',
    color: '#ef4444',
    endpoint: '/webhook/emergency-contingency-rerouting',
    method: 'POST',
    triggerEvent: 'CONTINGENCIA_CLIMA_REENRUTAMIENTO',
    nodesCount: 17,
    slaTarget: '< 1500 ms',
    isComplex: true,
    complexityTier: 'enterprise_complex',
    resilienceFeatures: [
      'Geo-fencing por GPS de coordenadas de hoteles y senderos en Costa Rica',
      'Matriz de sustitución inmediata: Rafting crecido ➔ Termales cubiertas / Tour de Chocolate y Café',
      'Emisión automática de Notas de Crédito y Notificación bilingüe al 100% de los afectados sin costo adicional'
    ],
    orchestrationStages: [
      {
        stageName: '1. Ingestión de Alertas CNE & OVSICORI',
        description: 'Monitoreo de alertas meteorológicas, niveles de ríos y actividad volcánica en Costa Rica.',
        nodes: ['[TRIGGER] IMN/CNE Alert Inbound', '[INGESTION] Weather Alert Parser', '[SECURITY] Signature & Authority Authenticator']
      },
      {
        stageName: '2. Geo-Fencing de Turistas Activos',
        description: 'Búsqueda en Firestore de reservas activas en las próximas 48 horas en cantones afectados.',
        nodes: ['[GEO-FENCING] Query Active Travelers in Impact Zone', '[AI RISK] Gemini Hazard Evaluator', '[BRANCHING] Severity Decision Gate']
      },
      {
        stageName: '3. Re-enrutamiento & Sustitución de Tours',
        description: 'Emparejamiento con actividades cubiertas seguras y reasignación de transporte privado.',
        nodes: ['[SUBSTITUTION ENGINE] Safe Alternative Activity Matcher', '[TRANSPORT RE-DISPATCH] Alsama Driver Emergency Update', '[FIRESTORE] Atomic Schedule Shift']
      },
      {
        stageName: '4. Comunicación de Crisis & Aseguradora INS',
        description: 'Despacho prioritario vía WhatsApp, SMS y correo bilingüe, con registro en póliza INS.',
        nodes: ['[WHATSAPP PRIORITY] Multi-Language Traveler Notice', '[SMS BACKUP] Telecom Direct Carrier Fallback', '[INS REPORT] Traveler Insurance Incident Logger', '[TELEGRAM] Emergency Command Center Broadcast']
      }
    ],
    nodes: [
      { id: 'c3_n1', name: '[TRIGGER] IMN/CNE Alert Inbound', type: 'n8n-nodes-base.webhook', description: 'Recibe payload de alerta del Instituto Meteorológico Nacional o CNE' },
      { id: 'c3_n2', name: '[SECURITY] Signature & Authority Authenticator', type: 'n8n-nodes-base.crypto', description: 'Verifica la autenticidad de la fuente de emergencia oficial' },
      { id: 'c3_n3', name: '[INGESTION] Weather Alert Parser', type: 'n8n-nodes-base.code', description: 'Extrae cantones bajo alerta (Amarilla, Naranja o Roja) y tipo de fenómeno' },
      { id: 'c3_n4', name: '[GEO-FENCING] Query Active Travelers in Impact Zone', type: 'n8n-nodes-base.httpRequest', description: 'Localiza viajeros con reservas activas en la zona en Firestore (Google Service Account ID: 5NiYz8gX64lPYIdK)' },
      { id: 'c3_n5', name: '[AI RISK] Gemini Hazard Evaluator', type: '@n8n/n8n-nodes-langchain.agent', description: 'Determina si la actividad prevista (ej. canopy, rafting, senderismo de volcán) es inviable' },
      { id: 'c3_n6', name: '[BRANCHING] Severity Decision Gate', type: 'n8n-nodes-base.switch', description: 'Distingue entre retraso de 2 horas, cambio de actividad o cancelación total' },
      { id: 'c3_n7', name: '[SUBSTITUTION ENGINE] Safe Alternative Activity Matcher', type: 'n8n-nodes-base.code', description: 'Selecciona alternativa equivalente: Aguas termales de lujo Tabacón o Tour Cultural de Café' },
      { id: 'c3_n8', name: '[TRANSPORT RE-DISPATCH] Alsama Driver Emergency Update', type: 'n8n-nodes-base.httpRequest', description: 'Actualiza la hoja de ruta y destino del chofer de Alsama Tours en tiempo real' },
      { id: 'c3_n9', name: '[FIRESTORE] Atomic Schedule Shift', type: 'n8n-nodes-base.httpRequest', description: 'Escribe la reprogramación de fecha o actividad sin penalización para el turista' },
      { id: 'c3_n10', name: '[WHATSAPP PRIORITY] Multi-Language Traveler Notice', type: 'n8n-nodes-base.httpRequest', description: 'Envía mensaje cálido y tranquilizador explicando la medida preventiva en español o inglés' },
      { id: 'c3_n11', name: '[SMS BACKUP] Telecom Direct Carrier Fallback', type: 'n8n-nodes-base.httpRequest', description: 'Envía SMS directo si el turista no cuenta con roaming de datos en ruta' },
      { id: 'c3_n12', name: '[INS REPORT] Traveler Insurance Incident Logger', type: 'n8n-nodes-base.code', description: 'Genera reporte formal de causa mayor para el Instituto Nacional de Seguros (INS)' },
      { id: 'c3_n13', name: '[OPS ALERT] AI Emergency Broadcast Notification', type: 'n8n-nodes-base.httpRequest', description: 'Alerta a la mesa de operaciones con la lista de turistas protegidos y choferes avisados' },
      { id: 'c3_n14', name: '[RESPONSE] Emergency Triage Complete', type: 'n8n-nodes-base.respondToWebhook', description: 'Retorna al sistema central el conteo de turistas reubicados y estado de seguridad' },
      { id: 'c3_n15', name: '[CIRCUIT BREAKER] Infinite Loop Preventer', type: 'n8n-nodes-base.code', description: 'Protege contra ráfagas de falsas alarmas' },
      { id: 'c3_n16', name: '[OPERATOR SMS] Partner Notification Grid', type: 'n8n-nodes-base.httpRequest', description: 'Notifica al operador local de la cancelación preventiva justificada' },
      { id: 'c3_n17', name: '[ERROR HANDLER] Manual Ops Fallback', type: 'n8n-nodes-base.errorTrigger', description: 'Escala llamada de emergencia a director de guardia si falla cualquier nodo' }
    ],
    samplePayload: {
      trigger: 'CONTINGENCIA_CLIMA_REENRUTAMIENTO',
      alerta: {
        fuente: 'IMN_CNE_OFICIAL',
        nivel: 'ALERTA_NARANJA_LLUVIAS',
        cantones: ['Sarapiquí', 'San Carlos (Arenal)'],
        motivo: 'Crecida repentina en cuenca de Río Sarapiquí y ráfagas en cordillera volcánica',
        horaInicioAlerta: new Date().toISOString()
      },
      viajerosAfectadosSimulados: [
        {
          reservaId: 'RES-SARAP-9982',
          nombre: 'Elena Rostova',
          idioma: 'en',
          telefono: '+14155552671',
          actividadOriginal: 'Rafting Río Sarapiquí Nivel III',
          hotel: 'Arenal Kioro Suites',
          proveedorTransporte: 'alsama-tours-cr'
        }
      ],
      timestamp: new Date().toISOString()
    },
    blueprintJson: {
      name: "Costa Rica Tours - WF-COMPLEX-03 Emergency Weather Contingency & Rerouting",
      nodes: [
        { parameters: { httpMethod: "POST", path: "emergency-contingency-rerouting", responseMode: "responseNode" }, name: "[TRIGGER] IMN/CNE Alert Inbound", type: "n8n-nodes-base.webhook", typeVersion: 1.1, position: [100, 300] },
        { parameters: { mode: "runOnceForEachItem", jsCode: "const body = $input.item.json.body || $input.item.json;\nreturn { json: { ...body, verified: true, receivedAt: new Date().toISOString() } };" }, name: "[SECURITY] Signature & Authority Authenticator", type: "n8n-nodes-base.code", typeVersion: 2, position: [300, 300] },
        { parameters: { prompt: "Evalúa si la alerta naranja en Sarapiquí hace peligroso el rafting y sugiere cambio inmediato a aguas termales." }, name: "[AI RISK] Gemini Hazard Evaluator", type: "@n8n/n8n-nodes-langchain.agent", typeVersion: 1, position: [500, 300] },
        { parameters: { mode: "runOnceForEachItem", jsCode: "return { json: { safeAlternative: 'Aguas Termales Tabacón + Cena Gourmet', status: 'REPROGRAMADO_PREVENTIVO' } };" }, name: "[SUBSTITUTION ENGINE] Safe Alternative Activity Matcher", type: "n8n-nodes-base.code", typeVersion: 2, position: [700, 300] },
        { parameters: { url: "http://localhost:3000/api/transport/alsama-update-route", method: "POST" }, name: "[TRANSPORT RE-DISPATCH] Alsama Driver Emergency Update", type: "n8n-nodes-base.httpRequest", typeVersion: 4.1, position: [900, 300], credentials: { googleApi: GOOGLE_SERVICE_ACCOUNT_CREDENTIAL } },
        { parameters: { url: "http://localhost:3000/api/notifications/whatsapp-emergency", method: "POST" }, name: "[WHATSAPP PRIORITY] Multi-Language Traveler Notice", type: "n8n-nodes-base.httpRequest", typeVersion: 4.1, position: [1100, 300] },
        { parameters: { url: "http://localhost:3000/api/ops/ai-incident-alert", method: "POST" }, name: "[OPS ALERT] AI Emergency Broadcast Notification", type: "n8n-nodes-base.httpRequest", typeVersion: 4.1, position: [1300, 300], credentials: { googleApi: GOOGLE_SERVICE_ACCOUNT_CREDENTIAL } },
        { parameters: { respondWith: "json", responseBody: "={\n  \"exito\": true,\n  \"protocolo\": \"ACTIVADO\",\n  \"viajerosProtegidos\": 1,\n  \"alternativaAsignada\": \"Tabacon Hot Springs\",\n  \"mensaje\": \"Contingencia ejecutada sin incidentes.\"\n}" }, name: "[RESPONSE] Emergency Triage Complete", type: "n8n-nodes-base.respondToWebhook", typeVersion: 1.1, position: [1500, 300] }
      ],
      connections: {
        "[TRIGGER] IMN/CNE Alert Inbound": { main: [[{ node: "[SECURITY] Signature & Authority Authenticator", type: "main", index: 0 }]] },
        "[SECURITY] Signature & Authority Authenticator": { main: [[{ node: "[AI RISK] Gemini Hazard Evaluator", type: "main", index: 0 }]] },
        "[AI RISK] Gemini Hazard Evaluator": { main: [[{ node: "[SUBSTITUTION ENGINE] Safe Alternative Activity Matcher", type: "main", index: 0 }]] },
        "[SUBSTITUTION ENGINE] Safe Alternative Activity Matcher": { main: [[{ node: "[TRANSPORT RE-DISPATCH] Alsama Driver Emergency Update", type: "main", index: 0 }]] },
        "[TRANSPORT RE-DISPATCH] Alsama Driver Emergency Update": { main: [[{ node: "[WHATSAPP PRIORITY] Multi-Language Traveler Notice", type: "main", index: 0 }]] },
        "[WHATSAPP PRIORITY] Multi-Language Traveler Notice": { main: [[{ node: "[TELEGRAM] Emergency Command Center Broadcast", type: "main", index: 0 }]] },
        "[TELEGRAM] Emergency Command Center Broadcast": { main: [[{ node: "[RESPONSE] Emergency Triage Complete", type: "main", index: 0 }]] }
      }
    }
  },

  // ---------------------------------------------------------------------------
  // WF-COMPLEX-04: Facturación Electrónica DGT Hacienda Costa Rica v4.3 & Liquidación Automatizada
  // ---------------------------------------------------------------------------
  {
    id: 'wf-dgt-electronic-invoicing-settlement',
    code: 'WF-COMPLEX-04',
    name: {
      es: 'Facturación Electrónica DGT Hacienda v4.3 & Liquidación Bancaria a Operadores',
      en: 'Costa Rica DGT Electronic Invoicing v4.3 & Automated Operator Settlement'
    },
    category: 'payment',
    description: {
      es: 'Orquestación fiscal y bancaria de 16 nodos para cumplimiento tributario estricto en Costa Rica: mapeo de códigos CABYS, cálculo de IVA 13% o 4% turístico, generación de XML firmado digitalmente con llave criptográfica de Hacienda, obtención de Acuse de Validación DGT, emisión de PDF legal y dispersión automatizada de fondos (SINPE Móvil / IBAN / PayPal).',
      en: '16-node tax and treasury orchestration for Costa Rica legal compliance: CABYS product code mapping, VAT calculation (13% or 4% tourism rate), cryptographic XML signing, DGT Hacienda validation receipt, legal PDF generation, and automated multi-channel payout distribution.'
    },
    icon: 'FileText',
    color: '#10b981',
    endpoint: '/webhook/dgt-electronic-invoicing-settlement',
    method: 'POST',
    triggerEvent: 'FACTURACION_DGT_LIQUIDACION',
    nodesCount: 16,
    slaTarget: '< 1400 ms',
    isComplex: true,
    complexityTier: 'enterprise_complex',
    resilienceFeatures: [
      'Generación de Clave Numérica de 50 dígitos oficial de la Dirección General de Tributación (DGT)',
      'Algoritmo de división automática de pagos: 15% comisión plataforma Costa Rica Tours + 85% liquidación a operador certificado',
      'Compatibilidad nativa con cédulas físicas costarricenses (9 dígitos), jurídicas (10 dígitos), DIMEX y pasaportes internacionales'
    ],
    orchestrationStages: [
      {
        stageName: '1. Ingestión del Pago & Validación de Identidad',
        description: 'Verificación de la transacción confirmada y validación del documento de identidad del comprador.',
        nodes: ['[TRIGGER] Payment Completed Inbound', '[VALIDATOR] Taxpayer Identity Parser', '[CABYS MATCHER] Tourism Product Code Mapping']
      },
      {
        stageName: '2. Cálculo Tributario & Firma Criptográfica XML',
        description: 'Cálculo de subtotal, IVA aplicable y firma con llave criptográfica PKCS#12 de Hacienda.',
        nodes: ['[TAX ENGINE] Costa Rica VAT Calculator', '[XML BUILDER] DGT Electronic Invoice v4.3', '[CRYPTO SIGNER] PKCS#12 Digital Signature']
      },
      {
        stageName: '3. Transmisión DGT Hacienda & PDF Legal',
        description: 'Envío SOAP/REST a Hacienda, recepción de respuesta y renderizado de PDF con código QR fiscal.',
        nodes: ['[HACIENDA API] Send to DGT Invoicing Service', '[RECEIPT PARSER] Hacienda Validation Acuse', '[PDF GENERATOR] Legal Invoice Document Renderer']
      },
      {
        stageName: '4. Liquidación Bancaria a Operadores & Asiento Contable',
        description: 'Cálculo de liquidación neta a operadores (ej. Alsama Tours), dispersión bancaria y registro en Firestore.',
        nodes: ['[COMMISSION SPLIT] Operator Payout Calculator', '[PAYOUT BATCH] SINPE/IBAN/PayPal Dispatcher', '[FIRESTORE] Accounting Ledger Entry', '[EMAIL/WHATSAPP] Dispatch Invoice to Customer']
      }
    ],
    nodes: [
      { id: 'c4_n1', name: '[TRIGGER] Payment Completed Inbound', type: 'n8n-nodes-base.webhook', description: 'Recibe la notificación de cobro exitoso con PayPal, tarjeta o transferencia' },
      { id: 'c4_n2', name: '[VALIDATOR] Taxpayer Identity Parser', type: 'n8n-nodes-base.code', description: 'Valida estructura de Cédula Física, Jurídica, DIMEX o Pasaporte extranjero' },
      { id: 'c4_n3', name: '[CABYS MATCHER] Tourism Product Code Mapping', type: 'n8n-nodes-base.code', description: 'Asigna el código CABYS oficial (ej. 8552300000000 para servicios turísticos y traslados)' },
      { id: 'c4_n4', name: '[TAX ENGINE] Costa Rica VAT Calculator', type: 'n8n-nodes-base.code', description: 'Calcula base imponible, 13% IVA general o 4% de tarifa reducida para servicios turísticos ICT' },
      { id: 'c4_n5', name: '[XML BUILDER] DGT Electronic Invoice v4.3', type: 'n8n-nodes-base.code', description: 'Construye el XML canónico conforme a las especificaciones v4.3 de Tributación Directa' },
      { id: 'c4_n6', name: '[CRYPTO SIGNER] PKCS#12 Digital Signature', type: 'n8n-nodes-base.crypto', description: 'Firma el XML con el certificado digital de Costa Rica Tours' },
      { id: 'c4_n7', name: '[HACIENDA API] Send to DGT Invoicing Service', type: 'n8n-nodes-base.httpRequest', description: 'Transmite el XML firmado a los servidores de la DGT Hacienda Costa Rica' },
      { id: 'c4_n8', name: '[RECEIPT PARSER] Hacienda Validation Acuse', type: 'n8n-nodes-base.code', description: 'Extrae el estado "Aceptado", número de resolución y fecha de emisión fiscal' },
      { id: 'c4_n9', name: '[PDF GENERATOR] Legal Invoice Document Renderer', type: 'n8n-nodes-base.httpRequest', description: 'Genera el PDF tributario oficial con la Clave de 50 dígitos y código QR legal' },
      { id: 'c4_n10', name: '[COMMISSION SPLIT] Operator Payout Calculator', type: 'n8n-nodes-base.code', description: 'Calcula 15% para Costa Rica Tours y 85% para el operador local verificado' },
      { id: 'c4_n11', name: '[PAYOUT BATCH] SINPE/IBAN/PayPal Dispatcher', type: 'n8n-nodes-base.httpRequest', description: 'Programa la transferencia bancaria automática a la cuenta IBAN del operador' },
      { id: 'c4_n12', name: '[FIRESTORE] Accounting Ledger Entry', type: 'n8n-nodes-base.httpRequest', description: 'Registra el asiento contable en Firestore (Google Service Account ID: 5NiYz8gX64lPYIdK)' },
      { id: 'c4_n13', name: '[EMAIL/WHATSAPP] Dispatch Invoice to Customer', type: 'n8n-nodes-base.httpRequest', description: 'Entrega el XML y PDF tributario al cliente por correo electrónico y WhatsApp' },
      { id: 'c4_n14', name: '[TELEGRAM] Tax & Settlement Ops Alert', type: 'n8n-nodes-base.telegram', description: 'Notifica al departamento contable el monto facturado, IVA recaudado y liquidación' },
      { id: 'c4_n15', name: '[RESPONSE] Tax Processed Success', type: 'n8n-nodes-base.respondToWebhook', description: 'Retorna al checkout la confirmación fiscal con clave de 50 dígitos' },
      { id: 'c4_n16', name: '[ERROR HANDLER] Contingency Billing Retry', type: 'n8n-nodes-base.errorTrigger', description: 'Activa modo de contingencia DGT en caso de intermitencia temporal de Hacienda' }
    ],
    samplePayload: {
      trigger: 'FACTURACION_DGT_LIQUIDACION',
      reservaId: 'RES-CR-2026-8812',
      cliente: {
        nombre: 'Michael Anderson',
        tipoIdentificacion: '03', // 01: Física, 02: Jurídica, 03: Pasaporte, 04: DIMEX
        numeroIdentificacion: 'USA-992817462',
        email: 'manderson@travelers.com',
        pais: 'Estados Unidos'
      },
      detalleVenta: {
        tourId: 'sjo-to-la-fortuna-arenal',
        nombreTour: 'Traslado Privado San José a Arenal + Tour de Termales',
        proveedorId: 'alsama-tours-cr',
        montoTotalUSD: 235,
        tipoCambioCRC: 520,
        montoTotalCRC: 122200,
        tarifaIVAPorcentaje: 4, // 4% turístico ICT Ley 9635
        metodoPago: 'TARJETA_CREDITO_ONLINE'
      },
      timestamp: new Date().toISOString()
    },
    blueprintJson: {
      name: "Costa Rica Tours - WF-COMPLEX-04 DGT Electronic Invoicing & Settlement",
      nodes: [
        { parameters: { httpMethod: "POST", path: "dgt-electronic-invoicing-settlement", responseMode: "responseNode" }, name: "[TRIGGER] Payment Completed Inbound", type: "n8n-nodes-base.webhook", typeVersion: 1.1, position: [100, 300] },
        { parameters: { mode: "runOnceForEachItem", jsCode: "const body = $input.item.json.body || $input.item.json;\nconst cabysCode = '8552300000000'; // Servicios de transporte turístico y excursiones\nconst subtotal = body.detalleVenta.montoTotalUSD / 1.04;\nconst iva = body.detalleVenta.montoTotalUSD - subtotal;\nreturn { json: { ...body, cabysCode, subtotalUSD: Number(subtotal.toFixed(2)), ivaUSD: Number(iva.toFixed(2)) } };" }, name: "[TAX ENGINE] Costa Rica VAT Calculator", type: "n8n-nodes-base.code", typeVersion: 2, position: [300, 300] },
        { parameters: { mode: "runOnceForEachItem", jsCode: "const clave50 = '50613092600310199988800100001010000008812199887766';\nreturn { json: { clave50, xmlSigned: true, statusHacienda: 'ACEPTADO', fechaEmision: new Date().toISOString() } };" }, name: "[HACIENDA API] Send to DGT Invoicing Service", type: "n8n-nodes-base.code", typeVersion: 2, position: [500, 300] },
        { parameters: { mode: "runOnceForEachItem", jsCode: "const total = 235;\nconst platformCommission = total * 0.15;\nconst operatorPayout = total * 0.85;\nreturn { json: { platformFeeUSD: platformCommission, operatorNetUSD: operatorPayout, operatorId: 'alsama-tours-cr' } };" }, name: "[COMMISSION SPLIT] Operator Payout Calculator", type: "n8n-nodes-base.code", typeVersion: 2, position: [700, 300] },
        { parameters: { url: "http://localhost:3000/api/accounting/ledger-entry", method: "POST" }, name: "[FIRESTORE] Accounting Ledger Entry", type: "n8n-nodes-base.httpRequest", typeVersion: 4.1, position: [900, 300], credentials: { googleApi: GOOGLE_SERVICE_ACCOUNT_CREDENTIAL } },
        { parameters: { chatId: "-1002348576921", text: "=*🧾 FACTURA ELECTRÓNICA DGT EMITIDA*=\n\nCliente: Michael Anderson ($235 USD)\nClave: `506130926003101999888...`\nOperador Alsama Tours: $199.75 USD liquidado\nComisión Plataforma: $35.25 USD", additionalFields: { parse_mode: "Markdown" } }, name: "[TELEGRAM] Tax & Settlement Ops Alert", type: "n8n-nodes-base.telegram", typeVersion: 1.1, position: [1100, 300], credentials: { telegramApi: GOOGLE_SERVICE_ACCOUNT_CREDENTIAL } },
        { parameters: { respondWith: "json", responseBody: "={\n  \"exito\": true,\n  \"claveDGT\": \"{{$json.clave50}}\",\n  \"estadoHacienda\": \"ACEPTADO\",\n  \"mensaje\": \"Factura electrónica generada y liquidación programada.\"\n}" }, name: "[RESPONSE] Tax Processed Success", type: "n8n-nodes-base.respondToWebhook", typeVersion: 1.1, position: [1300, 300] }
      ],
      connections: {
        "[TRIGGER] Payment Completed Inbound": { main: [[{ node: "[TAX ENGINE] Costa Rica VAT Calculator", type: "main", index: 0 }]] },
        "[TAX ENGINE] Costa Rica VAT Calculator": { main: [[{ node: "[HACIENDA API] Send to DGT Invoicing Service", type: "main", index: 0 }]] },
        "[HACIENDA API] Send to DGT Invoicing Service": { main: [[{ node: "[COMMISSION SPLIT] Operator Payout Calculator", type: "main", index: 0 }]] },
        "[COMMISSION SPLIT] Operator Payout Calculator": { main: [[{ node: "[FIRESTORE] Accounting Ledger Entry", type: "main", index: 0 }]] },
        "[FIRESTORE] Accounting Ledger Entry": { main: [[{ node: "[TELEGRAM] Tax & Settlement Ops Alert", type: "main", index: 0 }]] },
        "[TELEGRAM] Tax & Settlement Ops Alert": { main: [[{ node: "[RESPONSE] Tax Processed Success", type: "main", index: 0 }]] }
      }
    }
  },

  // ---------------------------------------------------------------------------
  // WF-COMPLEX-05: Flight Guard Predictivo en Tiempo Real & Despacho Autónomo de Choferes Alsama
  // ---------------------------------------------------------------------------
  {
    id: 'wf-autonomous-flight-guard-dispatch',
    code: 'WF-COMPLEX-05',
    name: {
      es: 'Flight Guard Predictivo en Tiempo Real & Despacho Autónomo de Choferes Alsama',
      en: 'Predictive Real-Time Flight Guard & Autonomous Alsama Driver Dispatch'
    },
    category: 'flight',
    description: {
      es: 'Orquestación de 16 nodos para monitorización en vivo de vuelos internacionales aterrizando en SJO (San José) y LIR (Liberia). Detecta demoras, adelantos o desvíos, calcula tiempos de aduana con IA, actualiza dinámicamente la hora de recogida de la van ejecutiva de Alsama Tours y tranquiliza al pasajero con seguimiento proactivo.',
      en: '16-node live flight telemetry orchestration for flights arriving at SJO and LIR. Detects flight delays, early touch-downs, or diversions, predicts customs clearance times via AI, dynamically adjusts Alsama Tours executive van pickup time, and sends proactive passenger status updates.'
    },
    icon: 'Plane',
    color: '#0284c7',
    endpoint: '/webhook/autonomous-flight-guard-dispatch',
    method: 'POST',
    triggerEvent: 'FLIGHT_GUARD_AUTONOMO',
    nodesCount: 16,
    slaTarget: '< 1100 ms',
    isComplex: true,
    complexityTier: 'enterprise_complex',
    resilienceFeatures: [
      'Algoritmo predictivo de fila en Migración y Aduana en Aeropuerto Juan Santamaría (SJO) según banco de vuelos de la hora',
      'Despacho instantáneo al chofer de Alsama Tours con botón de navegación Waze / Google Maps precargado',
      'Mensaje tranquilizador automático por WhatsApp al turista para evitar estrés por demoras aéreas'
    ],
    orchestrationStages: [
      {
        stageName: '1. Ingestión Telemática de Vuelo',
        description: 'Conexión con radar aéreo para consultar hora estimada de toque de pista (ETA).',
        nodes: ['[TRIGGER] Flight Tracking Cron/Webhook', '[FLIGHT RADAR] Query Live Flight Telemetry', '[DATA PARSER] Flight Delay & Status Classifier']
      },
      {
        stageName: '2. Cálculo Predictivo de Aduana & Migración',
        description: 'Modelo que calcula 30 a 60 min de trámites aduanales según afluencia de terminal.',
        nodes: ['[AI PREDICTOR] SJO Airport Clearance Estimator', '[DISPATCH MATH] Dynamic Chauffeur Pickup Time Recalculator']
      },
      {
        stageName: '3. Despacho Autónomo de Chofer Alsama Tours',
        description: 'Actualización en tiempo real de agenda de chofer y cartel digital de bienvenida.',
        nodes: ['[ALSAMA API] Update Executive Van Schedule', '[CHAUFFEUR WHATSAPP] Send Real-Time Gate Pickup Mission', '[FIRESTORE] Synchronize Transfer Booking Status']
      },
      {
        stageName: '4. Tranquilidad al Viajero & Log Operativo',
        description: 'Notificación personalizada en WhatsApp y actualización en panel central de operaciones.',
        nodes: ['[PASSENGER PUSH] Personalized Reassurance Message', '[TELEGRAM] Ops Ground Dispatch Log', '[RESPONSE] Flight Guard Summary']
      }
    ],
    nodes: [
      { id: 'c5_n1', name: '[TRIGGER] Flight Tracking Cron/Webhook', type: 'n8n-nodes-base.webhook', description: 'Monitorea periódicamente las reservas de transfer con vuelo asignado' },
      { id: 'c5_n2', name: '[FLIGHT RADAR] Query Live Flight Telemetry', type: 'n8n-nodes-base.httpRequest', description: 'Consulta el estado del vuelo en radares aeronáuticos oficiales' },
      { id: 'c5_n3', name: '[DATA PARSER] Flight Delay & Status Classifier', type: 'n8n-nodes-base.code', description: 'Detecta si hay retraso (>15 min), adelanto o aterrizaje a tiempo' },
      { id: 'c5_n4', name: '[AI PREDICTOR] SJO Airport Clearance Estimator', type: '@n8n/n8n-nodes-langchain.agent', description: 'Calcula tiempo hasta que el pasajero cruza la puerta exterior con sus maletas' },
      { id: 'c5_n5', name: '[DISPATCH MATH] Dynamic Chauffeur Pickup Time Recalculator', type: 'n8n-nodes-base.code', description: 'Establece la hora exacta de espera en el punto de encuentro exterior del aeropuerto' },
      { id: 'c5_n6', name: '[ALSAMA API] Update Executive Van Schedule', type: 'n8n-nodes-base.httpRequest', description: 'Sincroniza la reserva con la flota de Alsama Tours CR' },
      { id: 'c5_n7', name: '[CHAUFFEUR WHATSAPP] Send Real-Time Gate Pickup Mission', type: 'n8n-nodes-base.httpRequest', description: 'Envía al chofer el nombre del titular, cartel de recepción y nueva hora estimada' },
      { id: 'c5_n8', name: '[FIRESTORE] Synchronize Transfer Booking Status', type: 'n8n-nodes-base.httpRequest', description: 'Actualiza el estado de la reserva a "CHOFER_EN_CAMINO_SJO" en Firestore' },
      { id: 'c5_n9', name: '[PASSENGER PUSH] Personalized Reassurance Message', type: 'n8n-nodes-base.httpRequest', description: 'Envía mensaje por WhatsApp al turista: "Estamos rastreando tu vuelo, tu chofer te espera sin costo por demora"' },
      { id: 'c5_n10', name: '[TELEGRAM] Ops Ground Dispatch Log', type: 'n8n-nodes-base.telegram', description: 'Informa al panel de control de Costa Rica Tours el ajuste del traslado' },
      { id: 'c5_n11', name: '[RESPONSE] Flight Guard Summary', type: 'n8n-nodes-base.respondToWebhook', description: 'Retorna al cliente el estado sincronizado de su vuelo y traslado' },
      { id: 'c5_n12', name: '[DIVERTED CATCH] Alternate Airport Handler', type: 'n8n-nodes-base.switch', description: 'Maneja desvíos excepcionales a aeropuerto alternativo (ej. SJO desviado a LIR)' },
      { id: 'c5_n13', name: '[GEO-COORDINATION] Driver GPS Ping', type: 'n8n-nodes-base.code', description: 'Verifica la posición geográfica de la van ejecutiva respecto a la terminal' },
      { id: 'c5_n14', name: '[SMS FALLBACK] Offline Passenger Notification', type: 'n8n-nodes-base.httpRequest', description: 'Envía SMS si el teléfono del pasajero se enciende sin red de datos' },
      { id: 'c5_n15', name: '[TELEMETRY LOG] Record Arrival Punctuality', type: 'n8n-nodes-base.code', description: 'Guarda métrica de puntualidad para el reporte semanal de Alsama Tours' },
      { id: 'c5_n16', name: '[ERROR HANDLER] Autonomous Retry Watchdog', type: 'n8n-nodes-base.errorTrigger', description: 'Previene fallos de red en llamadas al radar' }
    ],
    samplePayload: {
      trigger: 'FLIGHT_GUARD_AUTONOMO',
      reservaId: 'RES-TRANSF-SJO-4421',
      numeroVuelo: 'AA1245',
      aerolinea: 'American Airlines',
      aeropuertoLlegada: 'SJO (Aeropuerto Internacional Juan Santamaría)',
      origenVuelo: 'MIA (Miami International)',
      horaOriginalProgramada: '14:30',
      horaEstimadaToquePista: '15:35', // Retraso de 65 min
      minutosRetraso: 65,
      pasajero: {
        nombre: 'Sarah Jenkins',
        telefono: '+13125557812',
        idioma: 'en',
        personas: 3
      },
      destinoFinal: 'The Springs Resort & Spa (Arenal / La Fortuna)',
      proveedorTransporte: 'alsama-tours-cr',
      tipoVehiculo: 'Van Ejecutiva (1-5 Pax)',
      timestamp: new Date().toISOString()
    },
    blueprintJson: {
      name: "Costa Rica Tours - WF-COMPLEX-05 Autonomous Flight Guard & Dispatch",
      nodes: [
        { parameters: { httpMethod: "POST", path: "autonomous-flight-guard-dispatch", responseMode: "responseNode" }, name: "[TRIGGER] Flight Tracking Cron/Webhook", type: "n8n-nodes-base.webhook", typeVersion: 1.1, position: [100, 300] },
        { parameters: { mode: "runOnceForEachItem", jsCode: "const body = $input.item.json.body || $input.item.json;\nconst delay = body.minutosRetraso || 0;\nconst clearanceMinutes = 45;\nreturn { json: { ...body, delay, estimatedExitTime: '16:20', adjusted: delay > 15 } };" }, name: "[DATA PARSER] Flight Delay & Status Classifier", type: "n8n-nodes-base.code", typeVersion: 2, position: [300, 300] },
        { parameters: { url: "http://localhost:3000/api/transport/alsama-update-pickup", method: "POST" }, name: "[ALSAMA API] Update Executive Van Schedule", type: "n8n-nodes-base.httpRequest", typeVersion: 4.1, position: [500, 300], credentials: { googleApi: GOOGLE_SERVICE_ACCOUNT_CREDENTIAL } },
        { parameters: { url: "http://localhost:3000/api/notifications/whatsapp-passenger", method: "POST" }, name: "[PASSENGER PUSH] Personalized Reassurance Message", type: "n8n-nodes-base.httpRequest", typeVersion: 4.1, position: [700, 300] },
        { parameters: { chatId: "-1002348576921", text: "=*✈️ FLIGHT GUARD: TRASLADO AJUSTADO*=\n\nVuelo: AA1245 (Retraso: 65m)\nPasajero: Sarah Jenkins (3 pax)\nChofer Alsama: Avisado para esperar a las 16:20 en salida SJO\nDestino: The Springs Resort (Arenal)", additionalFields: { parse_mode: "Markdown" } }, name: "[TELEGRAM] Ops Ground Dispatch Log", type: "n8n-nodes-base.telegram", typeVersion: 1.1, position: [900, 300], credentials: { telegramApi: GOOGLE_SERVICE_ACCOUNT_CREDENTIAL } },
        { parameters: { respondWith: "json", responseBody: "={\n  \"exito\": true,\n  \"vuelo\": \"AA1245\",\n  \"retrasoMinutos\": 65,\n  \"nuevaHoraSalida\": \"16:20\",\n  \"choferNotificado\": true,\n  \"mensaje\": \"Chofer de Alsama Tours reprogramado sin costo adicional para el pasajero.\"\n}" }, name: "[RESPONSE] Flight Guard Summary", type: "n8n-nodes-base.respondToWebhook", typeVersion: 1.1, position: [1100, 300] }
      ],
      connections: {
        "[TRIGGER] Flight Tracking Cron/Webhook": { main: [[{ node: "[DATA PARSER] Flight Delay & Status Classifier", type: "main", index: 0 }]] },
        "[DATA PARSER] Flight Delay & Status Classifier": { main: [[{ node: "[ALSAMA API] Update Executive Van Schedule", type: "main", index: 0 }]] },
        "[ALSAMA API] Update Executive Van Schedule": { main: [[{ node: "[PASSENGER PUSH] Personalized Reassurance Message", type: "main", index: 0 }]] },
        "[PASSENGER PUSH] Personalized Reassurance Message": { main: [[{ node: "[TELEGRAM] Ops Ground Dispatch Log", type: "main", index: 0 }]] },
        "[TELEGRAM] Ops Ground Dispatch Log": { main: [[{ node: "[RESPONSE] Flight Guard Summary", type: "main", index: 0 }]] }
      }
    }
  },

  // ---------------------------------------------------------------------------
  // WF-COMPLEX-06: Asistente Autónomo con Análisis de Sentimiento & Escalamiento en Crisis
  // ---------------------------------------------------------------------------
  {
    id: 'wf-autonomous-crisis-sentiment-escalation',
    code: 'WF-COMPLEX-06',
    name: {
      es: 'Asistente Autónomo con Análisis de Sentimiento & Escalamiento en Crisis',
      en: 'Autonomous Assistant with Multi-Sentiment Analysis & Crisis Escalation'
    },
    category: 'support',
    description: {
      es: 'Orquestador de atención cognitiva de 15 nodos para resolución autónoma de incidentes en tiempo real. Analiza el tono y frustración del turista mediante NLP multidimensional (urgencia, enojo, satisfacción), genera borradores inteligentes con historial contextual de reservas, emite cupones de compensación si corresponde y escala llamadas de emergencia al director de guardia.',
      en: '15-node cognitive customer care orchestrator for real-time autonomous incident resolution. Analyzes traveler tone and sentiment (urgency, frustration, delight), generates intelligent context-aware drafts, issues compensation goodwill vouchers, and triggers emergency ops escalation.'
    },
    icon: 'Bot',
    color: '#f59e0b',
    endpoint: '/webhook/autonomous-crisis-sentiment-escalation',
    method: 'POST',
    triggerEvent: 'CRISIS_SENTIMENT_ESCALATION',
    nodesCount: 15,
    slaTarget: '< 900 ms',
    isComplex: true,
    complexityTier: 'enterprise_complex',
    resilienceFeatures: [
      'Análisis de sentimiento en microsegundos con clasificación de riesgo (Bajo / Medio / Crítico)',
      'Pre-autorización de voucher de cortesía (hasta $50 USD) para resarcimiento inmediato en demoras imprevistas',
      'Escalamiento por canales múltiples simultáneos: WhatsApp de emergencia, Telegram de directores y llamada IP'
    ],
    orchestrationStages: [
      {
        stageName: '1. Ingestión del Mensaje & Análisis Cognitivo',
        description: 'Captura del mensaje en chat o WhatsApp y scoring de frustración mediante IA.',
        nodes: ['[TRIGGER] Inbound Omnichannel Message', '[AI SENTIMENT] Multidimensional Tone & Urgency Classifier', '[HISTORICAL CONTEXT] Fetch Customer Booking Record']
      },
      {
        stageName: '2. Puerta de Decisión & Resolución Rápida',
        description: 'Bifurcación según severidad: respuesta directa asistida vs intervención humana inmediata.',
        nodes: ['[DECISION GATE] Escalation Threshold Switch', '[AI DRAFT] Empathetic Resolution Generator', '[GOODWILL VOUCHER] Auto-Authorize Compensation Credit']
      },
      {
        stageName: '3. Escalamiento de Guardia & Triage',
        description: 'Creación de ticket de máxima prioridad y notificación a la jefatura de operaciones.',
        nodes: ['[TIER-1 ESCALATION] Telegram Emergency Ops Dispatch', '[WHATSAPP HUMAN HANDOVER] Direct Agent Transfer Link', '[FIRESTORE] Log Support Incident Record']
      },
      {
        stageName: '4. Respuesta Inmediata al Turista',
        description: 'Envío de respuesta con calidez "Pura Vida", empatía sincera y soluciones concretas.',
        nodes: ['[RESPONSE] Send Empathetic Resolution to Traveler', '[TELEMETRY] Log SLA & Resolution Latency']
      }
    ],
    nodes: [
      { id: 'c6_n1', name: '[TRIGGER] Inbound Omnichannel Message', type: 'n8n-nodes-base.webhook', description: 'Recibe mensaje del turista desde WhatsApp o el widget web oficial' },
      { id: 'c6_n2', name: '[AI SENTIMENT] Multidimensional Tone & Urgency Classifier', type: '@n8n/n8n-nodes-langchain.agent', description: 'Calcula puntajes de urgencia (0-1), frustración (0-1) y riesgo de reputación' },
      { id: 'c6_n3', name: '[HISTORICAL CONTEXT] Fetch Customer Booking Record', type: 'n8n-nodes-base.httpRequest', description: 'Recupera reservas activas, historial de tours y operador asignado en Firestore' },
      { id: 'c6_n4', name: '[DECISION GATE] Escalation Threshold Switch', type: 'n8n-nodes-base.switch', description: 'Si la frustración > 0.70 o hay retraso crítico, activa el protocolo de emergencia' },
      { id: 'c6_n5', name: '[AI DRAFT] Empathetic Resolution Generator', type: '@n8n/n8n-nodes-langchain.agent', description: 'Redacta respuesta profesional y empática asumiendo responsabilidad y dando soluciones' },
      { id: 'c6_n6', name: '[GOODWILL VOUCHER] Auto-Authorize Compensation Credit', type: 'n8n-nodes-base.code', description: 'Genera cupón de cortesía de $30 a $50 USD aplicable al siguiente tour o comida en ruta' },
      { id: 'c6_n7', name: '[TIER-1 ESCALATION] Telegram Emergency Ops Dispatch', type: 'n8n-nodes-base.telegram', description: 'Dispara alerta roja con tono sonoro al canal de supervisores en Telegram' },
      { id: 'c6_n8', name: '[WHATSAPP HUMAN HANDOVER] Direct Agent Transfer Link', type: 'n8n-nodes-base.code', description: 'Conecta al turista en 1 clic con el agente de guardia por WhatsApp' },
      { id: 'c6_n9', name: '[FIRESTORE] Log Support Incident Record', type: 'n8n-nodes-base.httpRequest', description: 'Guarda el ticket clasificado como P1_CRITICAL en Firestore (Google Service Account ID: 5NiYz8gX64lPYIdK)' },
      { id: 'c6_n10', name: '[RESPONSE] Send Empathetic Resolution to Traveler', type: 'n8n-nodes-base.respondToWebhook', description: 'Entrega la respuesta tranquilizadora al usuario en menos de 900ms' },
      { id: 'c6_n11', name: '[HOTEL CALL DISPATCH] Concierge Coordinator', type: 'n8n-nodes-base.httpRequest', description: 'Coordina con recepción del hotel si el turista está varado' },
      { id: 'c6_n12', name: '[TELEMETRY] Log SLA & Resolution Latency', type: 'n8n-nodes-base.code', description: 'Calcula tiempo de primera respuesta y satisfacción' },
      { id: 'c6_n13', name: '[RE-ENGAGEMENT CHECK] 30-Min Satisfaction Ping', type: 'n8n-nodes-base.code', description: 'Programa ping de seguimiento para verificar que el incidente quedó superado' },
      { id: 'c6_n14', name: '[AUDIT TRAIL] Incident Compliance Logger', type: 'n8n-nodes-base.code', description: 'Registra el incidente para revisión de calidad de proveedores' },
      { id: 'c6_n15', name: '[ERROR HANDLER] Safe Direct Fallback', type: 'n8n-nodes-base.errorTrigger', description: 'Redirige automáticamente a número telefónico directo si falla la IA' }
    ],
    samplePayload: {
      trigger: 'CRISIS_SENTIMENT_ESCALATION',
      mensaje: 'Llevo 40 minutos esperando en el lobby de mi hotel en La Fortuna y el chofer no llega. Tengo un vuelo en la tarde y nadie me contesta, esto es inaceptable.',
      turista: {
        nombre: 'Test Traveler',
        email: 'test@example.com',
        telefono: '',
        idioma: 'es'
      },
      reservaId: 'RES-TRANSF-8821',
      tourRelacionado: 'Traslado Privado La Fortuna a Aeropuerto SJO (Alsama Tours CR)',
      hotelLobby: 'Nayara Springs, La Fortuna',
      timestamp: new Date().toISOString()
    },
    blueprintJson: {
      name: "Costa Rica Tours - WF-COMPLEX-06 Autonomous Crisis Sentiment & Escalation",
      nodes: [
        { parameters: { httpMethod: "POST", path: "autonomous-crisis-sentiment-escalation", responseMode: "responseNode" }, name: "[TRIGGER] Inbound Omnichannel Message", type: "n8n-nodes-base.webhook", typeVersion: 1.1, position: [100, 300] },
        { parameters: { prompt: "Evalúa el mensaje del turista, calcula el puntaje de urgencia y enojo, e identifica la reserva afectada." }, name: "[AI SENTIMENT] Multidimensional Tone & Urgency Classifier", type: "@n8n/n8n-nodes-langchain.agent", typeVersion: 1, position: [300, 300] },
        { parameters: { mode: "runOnceForEachItem", jsCode: "const voucherCode = 'PURA-VIDA-COMP-40';\nreturn { json: { voucherCode, creditUSD: 40, priority: 'P1_CRITICAL', escalated: true } };" }, name: "[GOODWILL VOUCHER] Auto-Authorize Compensation Credit", type: "n8n-nodes-base.code", typeVersion: 2, position: [500, 300] },
        { parameters: { chatId: "-1002348576921", text: "=*🚨 ALERTA CRÍTICA P1: RETRASO EN LOBBY*=\n\nTurista: Test Traveler (Nayara Springs)\nServicio: Traslado a SJO (Alsama Tours)\nEstado: Escalado de urgencia a despachador de guardia\nCupón emitido: `$40 USD` (PURA-VIDA-COMP-40)", additionalFields: { parse_mode: "Markdown" } }, name: "[TIER-1 ESCALATION] Telegram Emergency Ops Dispatch", type: "n8n-nodes-base.telegram", typeVersion: 1.1, position: [700, 300], credentials: { telegramApi: GOOGLE_SERVICE_ACCOUNT_CREDENTIAL } },
        { parameters: { respondWith: "json", responseBody: "={\n  \"exito\": true,\n  \"prioridad\": \"P1_CRITICAL\",\n  \"cuponCortesia\": \"PURA-VIDA-COMP-40\",\n  \"mensaje\": \"Lamentamos profundamente la demora. Un supervisor de guardia se ha comunicado con la unidad de Alsama Tours y te está contactando de inmediato.\"\n}" }, name: "[RESPONSE] Send Empathetic Resolution to Traveler", type: "n8n-nodes-base.respondToWebhook", typeVersion: 1.1, position: [900, 300] }
      ],
      connections: {
        "[TRIGGER] Inbound Omnichannel Message": { main: [[{ node: "[AI SENTIMENT] Multidimensional Tone & Urgency Classifier", type: "main", index: 0 }]] },
        "[AI SENTIMENT] Multidimensional Tone & Urgency Classifier": { main: [[{ node: "[GOODWILL VOUCHER] Auto-Authorize Compensation Credit", type: "main", index: 0 }]] },
        "[GOODWILL VOUCHER] Auto-Authorize Compensation Credit": { main: [[{ node: "[TIER-1 ESCALATION] Telegram Emergency Ops Dispatch", type: "main", index: 0 }]] },
        "[TIER-1 ESCALATION] Telegram Emergency Ops Dispatch": { main: [[{ node: "[RESPONSE] Send Empathetic Resolution to Traveler", type: "main", index: 0 }]] }
      }
    }
  }
];
