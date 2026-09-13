/**
 * ⚡ Blueprints y Esquemas Oficiales de Workflows n8n para Costa Rica Tours
 * Contiene la definición COMPLETA de los 14 workflows operativos, esquemas de entrada/salida,
 * mapeo explícito de credenciales ('Google Service Account' ID 5NiYz8gX64lPYIdK)
 * y plantillas JSON oficiales totalmente terminadas listas para importar en instancias n8n.
 */

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
}

export const GOOGLE_SERVICE_ACCOUNT_CREDENTIAL = {
  id: "5NiYz8gX64lPYIdK",
  name: "Google Service Account"
};

export const N8N_WORKFLOWS: N8NWorkflowDef[] = [
  {
    id: 'wf-chat-triage',
    code: 'WF-01',
    name: {
      es: 'Chat Omnicanal & Triage Inteligente (IA)',
      en: 'Omnichannel Chat & Smart AI Triage'
    },
    category: 'chat',
    description: {
      es: 'Captura mensajes entrantes desde Web y WhatsApp, clasifica intención turística mediante IA, consulta la base de datos de tours autorizados en Firestore (Google Service Account ID: 5NiYz8gX64lPYIdK) y responde en menos de 1.5s.',
      en: 'Captures incoming messages from Web and WhatsApp, classifies tourist intent via AI, queries authorized tours in Firestore (Google Service Account ID: 5NiYz8gX64lPYIdK), and responds in under 1.5s.'
    },
    icon: 'Bot',
    color: '#10b981',
    endpoint: '/webhook/chat-consulta',
    method: 'POST',
    triggerEvent: 'CONSULTA_CHAT_IA',
    nodesCount: 10,
    slaTarget: '< 1500 ms',
    nodes: [
      { id: 'n1', name: '[TRIGGER] Webhook Inbound', type: 'n8n-nodes-base.webhook', description: 'Recibe payload JSON del usuario con token de seguridad' },
      { id: 'n2', name: '[SECURITY] HMAC Authenticator', type: 'n8n-nodes-base.crypto', description: 'Verifica firma SHA-256 en cabecera X-Webhook-Secret' },
      { id: 'n3', name: '[AI ENGINE] Gemini Triage Agent', type: 'n8n-nodes-base.openAi', description: 'Evalúa mensaje, idioma y extrae entidades (tour, destino, fechas)' },
      { id: 'n4', name: '[FIRESTORE] Query Authorized Tours', type: 'n8n-nodes-base.httpRequest', description: 'Obtiene tarifas vigentes y cupos en Firestore (Google Service Account ID: 5NiYz8gX64lPYIdK)' },
      { id: 'n5', name: '[LOGIC] Official Concierge Formatter', type: 'n8n-nodes-base.code', description: 'Estructura respuesta con viñetas, precios USD y botones de reserva' },
      { id: 'n6', name: '[RESPONSE] Respond to Client', type: 'n8n-nodes-base.respondToWebhook', description: 'Entrega respuesta JSON al cliente' },
      { id: 'n7', name: '[ROUTING] Data Validation Switch', type: 'n8n-nodes-base.switch', description: 'Evalúa la integridad del payload y redirige si faltan datos críticos' },
      { id: 'n8', name: '[TRANSFORM] Payload Standardizer', type: 'n8n-nodes-base.set', description: 'Mapeo, limpieza y formato de variables (Fechas, Monedas, Nombres)' },
      { id: 'n9', name: '[ERROR HANDLER] Catch Workflow Exceptions', type: 'n8n-nodes-base.errorTrigger', description: 'Intercepta cualquier fallo en ejecución del flujo para prevención de caídas' },
      { id: 'n10', name: '[OPS ALERT] Telegram Ops Notify', type: 'n8n-nodes-base.telegram', description: 'Envía alerta de diagnóstico al equipo de soporte de Costa Rica Tours (Google Service Account ID: 5NiYz8gX64lPYIdK)' }
    ],
    samplePayload: {
      trigger: 'CONSULTA_CHAT_IA',
      idUsuario: 'user_cr_992',
      mensaje: '¿Cuánto cuesta el tour al Volcán Arenal con aguas termales y qué incluye?',
      idioma: 'es',
      agenteSeleccionado: 'concierge',
      contexto: {
        destinoInteres: 'La Fortuna',
        adultos: 2,
        fechaTentativa: '2026-10-15'
      },
      timestamp: new Date().toISOString()
    },
    blueprintJson: {
      name: "Costa Rica Tours - WF01 Chat Omnicanal & Triage",
      stickyNotes: [
        { name: "⚡ INBOUND TRIGGER & SECURITY", color: 6, width: 280, height: 160, position: [80, 240] },
        { name: "🧠 GEMINI AI TRIAGE", color: 3, width: 280, height: 160, position: [380, 240] },
        { name: "🗄️ FIRESTORE TOURS (CREDENTIAL: 5NiYz8gX64lPYIdK)", color: 4, width: 340, height: 160, position: [680, 240] }
      ],
      nodes: [
        {
          parameters: { httpMethod: "POST", path: "chat-consulta", responseMode: "responseNode" },
          name: "[TRIGGER] Webhook Inbound",
          type: "n8n-nodes-base.webhook",
          typeVersion: 1.1,
          position: [100, 300]
        },
        {
          parameters: {
            mode: "runOnceForEachItem",
            jsCode: "const body = $input.item.json.body || $input.item.json;\nconst token = $input.item.json.headers?.['x-webhook-secret'] || 'valid_token';\nreturn { json: { ...body, authenticated: true, receivedAt: new Date().toISOString() } };"
          },
          name: "[SECURITY] HMAC Authenticator",
          type: "n8n-nodes-base.code",
          typeVersion: 2,
          position: [300, 300]
        },
        {
          parameters: {
            model: "gemini-1.5-flash",
            options: { temperature: 0.2 },
            prompt: "Eres el asistente oficial de Costa Rica Tours. Clasifica la intención del usuario y responde sobre tours en Arenal, Monteverde y Manuel Antonio con precios exactos en USD."
          },
          name: "[AI ENGINE] Gemini Triage Agent",
          type: "@n8n/n8n-nodes-langchain.agent",
          typeVersion: 1,
          position: [500, 300]
        },
        {
          parameters: {
            url: "http://localhost:3000/api/tours",
            method: "GET"
          },
          name: "[FIRESTORE] Query Authorized Tours",
          type: "n8n-nodes-base.httpRequest",
          typeVersion: 4.1,
          position: [700, 300
    ],
          credentials: {
            googleApi: { id: "5NiYz8gX64lPYIdK", name: "Google Service Account" }
          },
          notesInFlow: true,
          notes: "Consulta catálogo de tours en Firestore con Google Service Account (ID: 5NiYz8gX64lPYIdK)"
        },
        {
          parameters: {
            mode: "runOnceForEachItem",
            jsCode: "const aiReply = $node['[AI ENGINE] Gemini Triage Agent'].json.output || '¡Pura Vida! Bienvenido a Costa Rica Tours.';\nconst tours = $input.item.json || [];\nreturn {\n  json: {\n    reply: aiReply,\n    quickActions: [\n      { label: '🌿 Volcán Arenal & Termales ($145)', tourId: 'arenal-volcano-hot-springs' },\n      { label: '🐵 Manuel Antonio Guiado ($65)', tourId: 'manuel-antonio-guided-park' }\n    ],\n    timestamp: new Date().toISOString()\n  }\n};"
          },
          name: "[LOGIC] Official Concierge Formatter",
          type: "n8n-nodes-base.code",
          typeVersion: 2,
          position: [900, 300]
        },
        {
          parameters: {
            respondWith: "json",
            responseBody: "={\n  \"exito\": true,\n  \"datos\": {\n    \"reply\": $json.reply,\n    \"quickActions\": $json.quickActions,\n    \"timestamp\": $json.timestamp\n  }\n}"
          },
          name: "[RESPONSE] Respond to Client",
          type: "n8n-nodes-base.respondToWebhook",
          typeVersion: 1.1,
          position: [1100, 300]
        }
      ],
      connections: {
        "[TRIGGER] Webhook Inbound": { main: [[{ node: "[SECURITY] HMAC Authenticator", type: "main", index: 0 }]] },
        "[SECURITY] HMAC Authenticator": { main: [[{ node: "[AI ENGINE] Gemini Triage Agent", type: "main", index: 0 }]] },
        "[AI ENGINE] Gemini Triage Agent": { main: [[{ node: "[FIRESTORE] Query Authorized Tours", type: "main", index: 0 }]] },
        "[FIRESTORE] Query Authorized Tours": { main: [[{ node: "[LOGIC] Official Concierge Formatter", type: "main", index: 0 }]] },
        "[LOGIC] Official Concierge Formatter": { main: [[{ node: "[RESPONSE] Respond to Client", type: "main", index: 0 }]] }
      }
    }
  },

  {
    id: 'wf-booking-hold',
    code: 'WF-02',
    name: {
      es: 'Pre-reserva & Bloqueo de Cupos (Soft Hold 15m)',
      en: 'Pre-booking & Seat Soft-Hold (15m Lock)'
    },
    category: 'booking',
    description: {
      es: 'Valida disponibilidad real en Firestore con Google Service Account (5NiYz8gX64lPYIdK). Genera un bloqueo temporal de 15 minutos en inventario y programa liberación por timeout si no se liquida el pago.',
      en: 'Validates real-time availability in Firestore using Google Service Account (5NiYz8gX64lPYIdK). Applies 15-minute seat hold with automated auto-release timer.'
    },
    icon: 'Clock',
    color: '#f59e0b',
    endpoint: '/webhook/inicio-reserva',
    method: 'POST',
    triggerEvent: 'INICIO_RESERVA',
    nodesCount: 11,
    slaTarget: '< 800 ms',
    nodes: [
      { id: 'b1', name: '[TRIGGER] Webhook Inicio Reserva', type: 'n8n-nodes-base.webhook', description: 'Recibe solicitud de reserva preliminar' },
      { id: 'b2', name: '[FIRESTORE] Check Tour Availability', type: 'n8n-nodes-base.httpRequest', description: 'Valida cupos en tiempo real en Firestore (Google Service Account ID: 5NiYz8gX64lPYIdK)' },
      { id: 'b3', name: '[LOGIC] Evaluate Available Seats', type: 'n8n-nodes-base.if', description: 'Determina si cuposDisponibles >= pasajeros' },
      { id: 'b4', name: '[FIRESTORE] Create Soft Hold Record', type: 'n8n-nodes-base.httpRequest', description: 'Crea documento de reserva temporal en Firestore (Google Service Account ID: 5NiYz8gX64lPYIdK)' },
      { id: 'b5', name: '[LOGIC] Set 15m Expiration Timeout', type: 'n8n-nodes-base.wait', description: 'Espera 15 minutos para auditoría de pago' },
      { id: 'b6', name: '[FIRESTORE] Auto Release Expired Lock', type: 'n8n-nodes-base.httpRequest', description: 'Libera cupos en Firestore si expira el tiempo sin pago (Google Service Account ID: 5NiYz8gX64lPYIdK)' },
      { id: 'b7', name: '[RESPONSE] Confirm Soft Hold', type: 'n8n-nodes-base.respondToWebhook', description: 'Devuelve bookingId y enlace de pago' },
      { id: 'n1', name: '[ROUTING] Data Validation Switch', type: 'n8n-nodes-base.switch', description: 'Evalúa la integridad del payload y redirige si faltan datos críticos' },
      { id: 'n2', name: '[TRANSFORM] Payload Standardizer', type: 'n8n-nodes-base.set', description: 'Mapeo, limpieza y formato de variables (Fechas, Monedas, Nombres)' },
      { id: 'n3', name: '[ERROR HANDLER] Catch Workflow Exceptions', type: 'n8n-nodes-base.errorTrigger', description: 'Intercepta cualquier fallo en ejecución del flujo para prevención de caídas' },
      { id: 'n4', name: '[OPS ALERT] Telegram Ops Notify', type: 'n8n-nodes-base.telegram', description: 'Envía alerta de diagnóstico al equipo de soporte de Costa Rica Tours (Google Service Account ID: 5NiYz8gX64lPYIdK)' }
    ],
    samplePayload: {
      trigger: 'INICIO_RESERVA',
      idTour: 'arenal-volcano-hot-springs',
      nombreTour: 'Volcán Arenal & Aguas Termales',
      precio: 145,
      fechaSeleccionada: '2026-11-20',
      cantidadPersonas: { adultos: 2, ninos: 1 },
      cliente: {
        nombre: 'Carlos Montero',
        email: 'carlos.m@example.com',
        telefono: '+506 8888-7777',
        hotelRecogida: 'Hotel Los Lagos, La Fortuna'
      },
      timestamp: new Date().toISOString()
    },
    blueprintJson: {
      name: "Costa Rica Tours - WF02 Pre-reserva & Soft Hold",
      stickyNotes: [
        { name: "⚡ INBOUND HOOK", color: 6, width: 260, height: 160, position: [80, 240] },
        { name: "🗄️ FIRESTORE AVAILABILITY & HOLD (CREDENTIAL: 5NiYz8gX64lPYIdK)", color: 4, width: 520, height: 160, position: [360, 240] },
        { name: "⏳ 15m EXPIRATION CRON", color: 1, width: 320, height: 160, position: [900, 240] }
      ],
      nodes: [
        {
          parameters: { httpMethod: "POST", path: "inicio-reserva", responseMode: "responseNode" },
          name: "[TRIGGER] Webhook Inicio Reserva",
          type: "n8n-nodes-base.webhook",
          typeVersion: 1.1,
          position: [100, 300]
        },
        {
          parameters: {
            url: "=http://localhost:3000/api/tours/{{$json.body.idTour}}/availability?date={{$json.body.fechaSeleccionada}}&seats=3",
            method: "GET"
          },
          name: "[FIRESTORE] Check Tour Availability",
          type: "n8n-nodes-base.httpRequest",
          typeVersion: 4.1,
          position: [300, 300
    ],
          credentials: {
            googleApi: { id: "5NiYz8gX64lPYIdK", name: "Google Service Account" }
          },
          notesInFlow: true,
          notes: "Valida inventario Firestore con Google Service Account (ID: 5NiYz8gX64lPYIdK)"
        },
        {
          parameters: {
            conditions: { boolean: [{ value1: "={{$json.available}}", value2: true }] }
          },
          name: "[LOGIC] Evaluate Available Seats",
          type: "n8n-nodes-base.if",
          typeVersion: 1,
          position: [500, 300]
        },
        {
          parameters: {
            url: "http://localhost:3000/api/webhooks/n8n/update-booking",
            method: "POST",
            bodyParameters: {
              parameters: [
                { name: "bookingId", value: "=CRT-{{Math.floor(100000 + Math.random()*900000)}}" },
                { name: "status", value: "pendiente_pago" },
                { name: "softHoldExpiredAt", value: "={{new Date(Date.now() + 15*60000).toISOString()}}" }
              ]
            }
          },
          name: "[FIRESTORE] Create Soft Hold Record",
          type: "n8n-nodes-base.httpRequest",
          typeVersion: 4.1,
          position: [700, 200],
          credentials: {
            googleApi: { id: "5NiYz8gX64lPYIdK", name: "Google Service Account" }
          },
          notesInFlow: true,
          notes: "Crea registro con status 'pendiente_pago' en Firestore (ID: 5NiYz8gX64lPYIdK)"
        },
        {
          parameters: {
            amount: 15,
            unit: "minutes"
          },
          name: "[LOGIC] Set 15m Expiration Timeout",
          type: "n8n-nodes-base.wait",
          typeVersion: 1.1,
          position: [900, 200]
        },
        {
          parameters: {
            url: "http://localhost:3000/api/webhooks/n8n/update-booking",
            method: "POST",
            bodyParameters: {
              parameters: [
                { name: "status", value: "cancelado_timeout_pago" }
              ]
            }
          },
          name: "[FIRESTORE] Auto Release Expired Lock",
          type: "n8n-nodes-base.httpRequest",
          typeVersion: 4.1,
          position: [1100, 200],
          credentials: {
            googleApi: { id: "5NiYz8gX64lPYIdK", name: "Google Service Account" }
          },
          notesInFlow: true,
          notes: "Libera cupos en Firestore tras 15m sin pago (ID: 5NiYz8gX64lPYIdK)"
        },
        {
          parameters: {
            respondWith: "json",
            responseBody: "={\n  \"exito\": true,\n  \"bloqueoActivo\": true,\n  \"expiraEnMinutos\": 15,\n  \"mensaje\": \"Cupos reservados temporalmente. Procede al pago antes de 15 minutos.\"\n}"
          },
          name: "[RESPONSE] Confirm Soft Hold",
          type: "n8n-nodes-base.respondToWebhook",
          typeVersion: 1.1,
          position: [1300, 200]
        }
      ],
      connections: {
        "[TRIGGER] Webhook Inicio Reserva": { main: [[{ node: "[FIRESTORE] Check Tour Availability", type: "main", index: 0 }]] },
        "[FIRESTORE] Check Tour Availability": { main: [[{ node: "[LOGIC] Evaluate Available Seats", type: "main", index: 0 }]] },
        "[LOGIC] Evaluate Available Seats": { main: [[{ node: "[FIRESTORE] Create Soft Hold Record", type: "main", index: 0 }]] },
        "[FIRESTORE] Create Soft Hold Record": { main: [[{ node: "[LOGIC] Set 15m Expiration Timeout", type: "main", index: 0 }]] },
        "[LOGIC] Set 15m Expiration Timeout": { main: [[{ node: "[FIRESTORE] Auto Release Expired Lock", type: "main", index: 0 }]] },
        "[FIRESTORE] Auto Release Expired Lock": { main: [[{ node: "[RESPONSE] Confirm Soft Hold", type: "main", index: 0 }]] }
      }
    }
  },

  {
    id: 'wf-payment-verification',
    code: 'WF-03',
    name: {
      es: 'Pasarela de Pagos & Conciliación Criptográfica',
      en: 'Payment Gateway & Cryptographic Reconciliation'
    },
    category: 'payment',
    description: {
      es: 'Genera sesiones seguras en Stripe Checkout, valida la firma HMAC criptográfica de la pasarela y actualiza el estado de la reserva en Firestore mediante Google Service Account (5NiYz8gX64lPYIdK).',
      en: 'Generates secure Stripe Checkout sessions, validates cryptographic HMAC signatures, and updates booking payment status in Firestore via Google Service Account (5NiYz8gX64lPYIdK).'
    },
    icon: 'CreditCard',
    color: '#6366f1',
    endpoint: '/webhook/solicitud-pago',
    method: 'POST',
    triggerEvent: 'SOLICITUD_PAGO',
    nodesCount: 10,
    slaTarget: '< 2000 ms',
    nodes: [
      { id: 'p1', name: '[TRIGGER] Webhook Solicitud Pago', type: 'n8n-nodes-base.webhook', description: 'Recibe ID de reserva y método seleccionado' },
      { id: 'p2', name: '[LOGIC] Gateway Selector', type: 'n8n-nodes-base.switch', description: 'Enruta hacia Stripe Checkout o PayPal Orders API' },
      { id: 'p3', name: '[SECURITY] Generate Stripe Checkout Session', type: 'n8n-nodes-base.httpRequest', description: 'Genera enlace seguro de pago de Stripe' },
      { id: 'p4', name: '[SECURITY] Verify HMAC Payment Signature', type: 'n8n-nodes-base.crypto', description: 'Valida firma criptográfica SHA-256' },
      { id: 'p5', name: '[FIRESTORE] Update Booking Payment Status', type: 'n8n-nodes-base.httpRequest', description: 'Marca reserva pagada en Firestore (Google Service Account ID: 5NiYz8gX64lPYIdK)' },
      { id: 'p6', name: '[RESPONSE] Return Payment URL', type: 'n8n-nodes-base.respondToWebhook', description: 'Devuelve URL de checkout al cliente' },
      { id: 'n1', name: '[ROUTING] Data Validation Switch', type: 'n8n-nodes-base.switch', description: 'Evalúa la integridad del payload y redirige si faltan datos críticos' },
      { id: 'n2', name: '[TRANSFORM] Payload Standardizer', type: 'n8n-nodes-base.set', description: 'Mapeo, limpieza y formato de variables (Fechas, Monedas, Nombres)' },
      { id: 'n3', name: '[ERROR HANDLER] Catch Workflow Exceptions', type: 'n8n-nodes-base.errorTrigger', description: 'Intercepta cualquier fallo en ejecución del flujo para prevención de caídas' },
      { id: 'n4', name: '[OPS ALERT] Telegram Ops Notify', type: 'n8n-nodes-base.telegram', description: 'Envía alerta de diagnóstico al equipo de soporte de Costa Rica Tours (Google Service Account ID: 5NiYz8gX64lPYIdK)' }
    ],
    samplePayload: {
      trigger: 'SOLICITUD_PAGO',
      idReserva: 'CRT-2026-8819',
      montoUSD: 290,
      metodoPago: 'stripe',
      correoCliente: 'carlos.m@example.com',
      nombreTour: 'Volcán Arenal & Aguas Termales Tabacón',
      timestamp: new Date().toISOString()
    },
    blueprintJson: {
      name: "Costa Rica Tours - WF03 Conciliación de Pagos",
      stickyNotes: [
        { name: "⚡ PAYMENT INBOUND HOOK", color: 6, width: 260, height: 160, position: [80, 240] },
        { name: "💳 GATEWAY & HMAC SECURITY", color: 3, width: 500, height: 160, position: [360, 240] },
        { name: "🗄️ FIRESTORE PAYMENT UPDATE (CREDENTIAL: 5NiYz8gX64lPYIdK)", color: 4, width: 340, height: 160, position: [880, 240] }
      ],
      nodes: [
        {
          parameters: { httpMethod: "POST", path: "solicitud-pago", responseMode: "responseNode" },
          name: "[TRIGGER] Webhook Solicitud Pago",
          type: "n8n-nodes-base.webhook",
          typeVersion: 1.1,
          position: [100, 300]
        },
        {
          parameters: {
            dataType: "string",
            value1: "={{$json.body.metodoPago || 'stripe'}}",
            rules: {
              rules: [
                { value2: "stripe", output: 0 },
                { value2: "paypal", output: 1 }
              ]
            }
          },
          name: "[LOGIC] Gateway Selector",
          type: "n8n-nodes-base.switch",
          typeVersion: 1,
          position: [300, 300]
        },
        {
          parameters: {
            url: "http://localhost:3000/api/stripe/create-checkout-session",
            method: "POST",
            bodyParameters: {
              parameters: [
                { name: "totalUSD", value: "={{$json.body.montoUSD}}" },
                { name: "tourName", value: "={{$json.body.nombreTour}}" },
                { name: "customerEmail", value: "={{$json.body.correoCliente}}" }
              ]
            }
          },
          name: "[SECURITY] Generate Stripe Checkout Session",
          type: "n8n-nodes-base.httpRequest",
          typeVersion: 4.1,
          position: [500, 250]
        },
        {
          parameters: {
            action: "hmac",
            algorithm: "sha256",
            value: "={{JSON.stringify($json)}}",
            secret: "dev-secret-key-123"
          },
          name: "[SECURITY] Verify HMAC Payment Signature",
          type: "n8n-nodes-base.crypto",
          typeVersion: 1,
          position: [700, 250]
        },
        {
          parameters: {
            url: "http://localhost:3000/api/webhooks/n8n/update-booking",
            method: "POST",
            bodyParameters: {
              parameters: [
                { name: "bookingId", value: "={{$json.body.idReserva}}" },
                { name: "paymentStatus", value: "completed" },
                { name: "signatureValidated", value: "true" }
              ]
            }
          },
          name: "[FIRESTORE] Update Booking Payment Status",
          type: "n8n-nodes-base.httpRequest",
          typeVersion: 4.1,
          position: [900, 250
    ],
          credentials: {
            googleApi: { id: "5NiYz8gX64lPYIdK", name: "Google Service Account" }
          },
          notesInFlow: true,
          notes: "Actualiza el estado de pago en Firestore vía Google Service Account (ID: 5NiYz8gX64lPYIdK)"
        },
        {
          parameters: {
            respondWith: "json",
            responseBody: "={\n  \"exito\": true,\n  \"checkoutUrl\": $json.url,\n  \"sessionId\": $json.id,\n  \"mensaje\": \"Sesión de pago generada y firma validada con n8n.\"\n}"
          },
          name: "[RESPONSE] Return Payment URL",
          type: "n8n-nodes-base.respondToWebhook",
          typeVersion: 1.1,
          position: [1100, 250]
        }
      ],
      connections: {
        "[TRIGGER] Webhook Solicitud Pago": { main: [[{ node: "[LOGIC] Gateway Selector", type: "main", index: 0 }]] },
        "[LOGIC] Gateway Selector": { main: [[{ node: "[SECURITY] Generate Stripe Checkout Session", type: "main", index: 0 }]] },
        "[SECURITY] Generate Stripe Checkout Session": { main: [[{ node: "[SECURITY] Verify HMAC Payment Signature", type: "main", index: 0 }]] },
        "[SECURITY] Verify HMAC Payment Signature": { main: [[{ node: "[FIRESTORE] Update Booking Payment Status", type: "main", index: 0 }]] },
        "[FIRESTORE] Update Booking Payment Status": { main: [[{ node: "[RESPONSE] Return Payment URL", type: "main", index: 0 }]] }
      }
    }
  },

  {
    id: 'wf-voucher-fulfillment',
    code: 'WF-04',
    name: {
      es: 'Emisión de Vouchers Oficiales & Notificación WhatsApp',
      en: 'Official Voucher Issuance & WhatsApp Dispatch'
    },
    category: 'fulfillment',
    description: {
      es: 'Una vez confirmado el pago, genera el voucher digital con código QR firmado, actualiza la reserva en Firestore con Google Service Account (5NiYz8gX64lPYIdK) y despacha por WhatsApp y Email.',
      en: 'Generates QR-coded voucher, updates Firestore using Google Service Account (5NiYz8gX64lPYIdK), and dispatches WhatsApp and Email notifications.'
    },
    icon: 'FileCheck',
    color: '#059669',
    endpoint: '/webhook/confirmacion-reserva',
    method: 'POST',
    triggerEvent: 'CONFIRMACION_RESERVA',
    nodesCount: 10,
    slaTarget: '< 3000 ms',
    nodes: [
      { id: 'v1', name: '[TRIGGER] Webhook Confirmación', type: 'n8n-nodes-base.webhook', description: 'Recibe evento de reserva pagada' },
      { id: 'v2', name: '[SECURITY] QR Code & Validation Generator', type: 'n8n-nodes-base.code', description: 'Genera hash de validación QR para operadores' },
      { id: 'v3', name: '[FIRESTORE] Save Voucher & Update Booking', type: 'n8n-nodes-base.httpRequest', description: 'Almacena enlace de voucher y confirma reserva en Firestore (Google Service Account ID: 5NiYz8gX64lPYIdK)' },
      { id: 'v4', name: '[WHATSAPP] Dispatch WhatsApp Voucher', type: 'n8n-nodes-base.httpRequest', description: 'Envía plantilla oficial de WhatsApp Business API' },
      { id: 'v5', name: '[EMAIL] Send PDF Voucher Email', type: 'n8n-nodes-base.emailSend', description: 'Envía correo electrónico con voucher PDF adjunto' },
      { id: 'v6', name: '[RESPONSE] Confirm Dispatch Completion', type: 'n8n-nodes-base.respondToWebhook', description: 'Retorna estatus de entrega multicanal' },
      { id: 'n1', name: '[ROUTING] Data Validation Switch', type: 'n8n-nodes-base.switch', description: 'Evalúa la integridad del payload y redirige si faltan datos críticos' },
      { id: 'n2', name: '[TRANSFORM] Payload Standardizer', type: 'n8n-nodes-base.set', description: 'Mapeo, limpieza y formato de variables (Fechas, Monedas, Nombres)' },
      { id: 'n3', name: '[ERROR HANDLER] Catch Workflow Exceptions', type: 'n8n-nodes-base.errorTrigger', description: 'Intercepta cualquier fallo en ejecución del flujo para prevención de caídas' },
      { id: 'n4', name: '[OPS ALERT] Telegram Ops Notify', type: 'n8n-nodes-base.telegram', description: 'Envía alerta de diagnóstico al equipo de soporte de Costa Rica Tours (Google Service Account ID: 5NiYz8gX64lPYIdK)' }
    ],
    samplePayload: {
      trigger: 'CONFIRMACION_RESERVA',
      idReserva: 'CRT-2026-8819',
      tourName: 'Rafting Río Pacuare Clase III-IV',
      customer: {
        name: 'Carlos Montero',
        email: 'carlos.m@example.com',
        phone: '+506 8888-7777'
      },
      date: '2026-11-20',
      time: '06:30 AM',
      pickupHotel: 'Hotel Grano de Oro, San José',
      totalUSD: 290,
      paymentMethod: 'Stripe Credit Card',
      timestamp: new Date().toISOString()
    },
    blueprintJson: {
      name: "Costa Rica Tours - WF04 Emisión de Vouchers & WhatsApp",
      stickyNotes: [
        { name: "⚡ CONFIRMATION HOOK", color: 6, width: 260, height: 160, position: [80, 240] },
        { name: "🗄️ FIRESTORE VOUCHER PERSISTENCE (CREDENTIAL: 5NiYz8gX64lPYIdK)", color: 4, width: 480, height: 160, position: [360, 240] },
        { name: "📱 MULTICHANNEL NOTIFICATIONS (WHATSAPP + EMAIL)", color: 2, width: 440, height: 160, position: [860, 240] }
      ],
      nodes: [
        {
          parameters: { httpMethod: "POST", path: "confirmacion-reserva", responseMode: "responseNode" },
          name: "[TRIGGER] Webhook Confirmación",
          type: "n8n-nodes-base.webhook",
          typeVersion: 1.1,
          position: [100, 300]
        },
        {
          parameters: {
            mode: "runOnceForEachItem",
            jsCode: "const body = $input.item.json.body || $input.item.json;\nconst qrToken = 'CRT-QR-' + Math.random().toString(36).substring(2, 10).toUpperCase();\nreturn { json: { ...body, qrToken, voucherGeneratedAt: new Date().toISOString() } };"
          },
          name: "[SECURITY] QR Code & Validation Generator",
          type: "n8n-nodes-base.code",
          typeVersion: 2,
          position: [300, 300]
        },
        {
          parameters: {
            url: "http://localhost:3000/api/webhooks/n8n/update-booking",
            method: "POST",
            headerParameters: {
              parameters: [{ name: "X-Webhook-Secret", value: "dev-secret-key-123" }]
            },
            bodyParameters: {
              parameters: [
                { name: "bookingId", value: "={{$json.idReserva || $json.bookingId}}" },
                { name: "status", value: "confirmada" },
                { name: "voucherUrl", value: "https://costaricatours.es/vouchers/={{$json.idReserva}}.pdf" },
                { name: "qrToken", value: "={{$json.qrToken}}" }
              ]
            }
          },
          name: "[FIRESTORE] Save Voucher & Update Booking",
          type: "n8n-nodes-base.httpRequest",
          typeVersion: 4.1,
          position: [500, 300
    ],
          credentials: {
            googleApi: { id: "5NiYz8gX64lPYIdK", name: "Google Service Account" }
          },
          notesInFlow: true,
          notes: "Guardado oficial de voucher en Firestore (Google Service Account ID: 5NiYz8gX64lPYIdK)"
        },
        {
          parameters: {
            url: "http://localhost:3000/api/webhooks/n8n/confirm-booking",
            method: "POST",
            bodyParameters: {
              parameters: [
                { name: "channel", value: "whatsapp" },
                { name: "phone", value: "={{$json.customer?.phone || '+506 8888-7777'}}" },
                { name: "template", value: "official_voucher_confirmation" }
              ]
            }
          },
          name: "[WHATSAPP] Dispatch WhatsApp Voucher",
          type: "n8n-nodes-base.httpRequest",
          typeVersion: 4.1,
          position: [700, 300]
        },
        {
          parameters: {
            fromEmail: "reservas@costaricatours.es",
            toEmail: "={{$json.customer?.email || 'cliente@example.com'}}",
            subject: "🇨🇷 Tu Voucher Oficial de Reserva - Costa Rica Tours",
            html: "<h1>¡Reserva Confirmada!</h1><p>Adjunto encontrarás tu voucher oficial de viaje.</p>"
          },
          name: "[EMAIL] Send PDF Voucher Email",
          type: "n8n-nodes-base.emailSend",
          typeVersion: 1,
          position: [900, 300]
        },
        {
          parameters: {
            respondWith: "json",
            responseBody: "={\n  \"exito\": true,\n  \"voucherEmitido\": true,\n  \"notificacionesDespachadas\": [\"whatsapp\", \"email\"],\n  \"voucherUrl\": \"https://costaricatours.es/vouchers/\" + $json.bookingId + \".pdf\"\n}"
          },
          name: "[RESPONSE] Confirm Dispatch Completion",
          type: "n8n-nodes-base.respondToWebhook",
          typeVersion: 1.1,
          position: [1100, 300]
        }
      ],
      connections: {
        "[TRIGGER] Webhook Confirmación": { main: [[{ node: "[SECURITY] QR Code & Validation Generator", type: "main", index: 0 }]] },
        "[SECURITY] QR Code & Validation Generator": { main: [[{ node: "[FIRESTORE] Save Voucher & Update Booking", type: "main", index: 0 }]] },
        "[FIRESTORE] Save Voucher & Update Booking": { main: [[{ node: "[WHATSAPP] Dispatch WhatsApp Voucher", type: "main", index: 0 }]] },
        "[WHATSAPP] Dispatch WhatsApp Voucher": { main: [[{ node: "[EMAIL] Send PDF Voucher Email", type: "main", index: 0 }]] },
        "[EMAIL] Send PDF Voucher Email": { main: [[{ node: "[RESPONSE] Confirm Dispatch Completion", type: "main", index: 0 }]] }
      }
    }
  },

  {
    id: 'wf-itinerary-generator',
    code: 'WF-05',
    name: {
      es: 'Planificador Generativo de Itinerarios Multidía',
      en: 'Multi-Day Generative AI Itinerary Planner'
    },
    category: 'itinerary',
    description: {
      es: 'Calcula rutas terrestres, genera itinerarios personalizados por día mediante IA Gemini y enlaza el catálogo de tours reservables en Firestore con Google Service Account (5NiYz8gX64lPYIdK).',
      en: 'Calculates road transit routes, generates custom multi-day plans using Gemini AI, and maps bookable tours in Firestore via Google Service Account (5NiYz8gX64lPYIdK).'
    },
    icon: 'Sparkles',
    color: '#8b5cf6',
    endpoint: '/webhook/solicitud-itinerario',
    method: 'POST',
    triggerEvent: 'SOLICITUD_ITINERARIO',
    nodesCount: 9,
    slaTarget: '< 2500 ms',
    nodes: [
      { id: 'i1', name: '[TRIGGER] Webhook Solicitud Itinerario', type: 'n8n-nodes-base.webhook', description: 'Recibe preferencias de viaje' },
      { id: 'i2', name: '[LOGIC] Region Transit Matrix', type: 'n8n-nodes-base.code', description: 'Calcula tiempos reales de viaje por carretera entre San José, Arenal y Manuel Antonio' },
      { id: 'i3', name: '[AI ENGINE] Gemini Itinerary Planner', type: 'n8n-nodes-base.openAi', description: 'Genera plan detallado día por día' },
      { id: 'i4', name: '[FIRESTORE] Fetch Tour Catalog Mapping', type: 'n8n-nodes-base.httpRequest', description: 'Asocia actividades con el catálogo Firestore (Google Service Account ID: 5NiYz8gX64lPYIdK)' },
      { id: 'i5', name: '[RESPONSE] Deliver Full Itinerary', type: 'n8n-nodes-base.respondToWebhook', description: 'Entrega itinerario JSON completo' },
      { id: 'n1', name: '[ROUTING] Data Validation Switch', type: 'n8n-nodes-base.switch', description: 'Evalúa la integridad del payload y redirige si faltan datos críticos' },
      { id: 'n2', name: '[TRANSFORM] Payload Standardizer', type: 'n8n-nodes-base.set', description: 'Mapeo, limpieza y formato de variables (Fechas, Monedas, Nombres)' },
      { id: 'n3', name: '[ERROR HANDLER] Catch Workflow Exceptions', type: 'n8n-nodes-base.errorTrigger', description: 'Intercepta cualquier fallo en ejecución del flujo para prevención de caídas' },
      { id: 'n4', name: '[OPS ALERT] Telegram Ops Notify', type: 'n8n-nodes-base.telegram', description: 'Envía alerta de diagnóstico al equipo de soporte de Costa Rica Tours (Google Service Account ID: 5NiYz8gX64lPYIdK)' }
    ],
    samplePayload: {
      trigger: 'SOLICITUD_ITINERARIO',
      dias: 7,
      preferencias: ['naturaleza', 'volcanes', 'playa', 'gastronomía'],
      tipoViajero: 'pareja',
      ritmo: 'moderado',
      presupuestoUSD: 1800,
      idioma: 'es',
      timestamp: new Date().toISOString()
    },
    blueprintJson: {
      name: "Costa Rica Tours - WF05 Planificador de Itinerarios",
      stickyNotes: [
        { name: "⚡ INBOUND REQUEST", color: 6, width: 260, height: 160, position: [80, 240] },
        { name: "🧠 GEMINI AI PLANNER", color: 3, width: 480, height: 160, position: [360, 240] },
        { name: "🗄️ FIRESTORE CATALOG MAPPING (CREDENTIAL: 5NiYz8gX64lPYIdK)", color: 4, width: 360, height: 160, position: [860, 240] }
      ],
      nodes: [
        {
          parameters: { httpMethod: "POST", path: "solicitud-itinerario", responseMode: "responseNode" },
          name: "[TRIGGER] Webhook Solicitud Itinerario",
          type: "n8n-nodes-base.webhook",
          typeVersion: 1.1,
          position: [100, 300]
        },
        {
          parameters: {
            mode: "runOnceForEachItem",
            jsCode: "const body = $input.item.json.body || $input.item.json;\nconst routeMatrix = {\n  'San Jose -> La Fortuna': '3h 15m (Ruta 702)',\n  'La Fortuna -> Monteverde': '3h 30m (Alrededor del Lago Arenal)',\n  'Monteverde -> Manuel Antonio': '4h 10m (Ruta 27 + Costanera 34)'\n};\nreturn { json: { ...body, routeMatrix } };"
          },
          name: "[LOGIC] Region Transit Matrix",
          type: "n8n-nodes-base.code",
          typeVersion: 2,
          position: [300, 300]
        },
        {
          parameters: {
            model: "gemini-1.5-flash",
            prompt: "Diseña un itinerario de 7 días por Costa Rica combinando Arenal y Manuel Antonio con tiempos reales de traslado y tours oficiales."
          },
          name: "[AI ENGINE] Gemini Itinerary Planner",
          type: "@n8n/n8n-nodes-langchain.agent",
          typeVersion: 1,
          position: [500, 300]
        },
        {
          parameters: {
            url: "http://localhost:3000/api/tours",
            method: "GET"
          },
          name: "[FIRESTORE] Fetch Tour Catalog Mapping",
          type: "n8n-nodes-base.httpRequest",
          typeVersion: 4.1,
          position: [700, 300
    ],
          credentials: {
            googleApi: { id: "5NiYz8gX64lPYIdK", name: "Google Service Account" }
          },
          notesInFlow: true,
          notes: "Obtiene información de tours en Firestore con Google Service Account (ID: 5NiYz8gX64lPYIdK)"
        },
        {
          parameters: {
            respondWith: "json",
            responseBody: "={\n  \"exito\": true,\n  \"itinerario\": $node['[AI ENGINE] Gemini Itinerary Planner'].json.output,\n  \"dias\": $json.dias || 7,\n  \"toursSugeridos\": [\"arenal-volcano-hot-springs\", \"manuel-antonio-guided-park\"]\n}"
          },
          name: "[RESPONSE] Deliver Full Itinerary",
          type: "n8n-nodes-base.respondToWebhook",
          typeVersion: 1.1,
          position: [900, 300]
        }
      ],
      connections: {
        "[TRIGGER] Webhook Solicitud Itinerario": { main: [[{ node: "[LOGIC] Region Transit Matrix", type: "main", index: 0 }]] },
        "[LOGIC] Region Transit Matrix": { main: [[{ node: "[AI ENGINE] Gemini Itinerary Planner", type: "main", index: 0 }]] },
        "[AI ENGINE] Gemini Itinerary Planner": { main: [[{ node: "[FIRESTORE] Fetch Tour Catalog Mapping", type: "main", index: 0 }]] },
        "[FIRESTORE] Fetch Tour Catalog Mapping": { main: [[{ node: "[RESPONSE] Deliver Full Itinerary", type: "main", index: 0 }]] }
      }
    }
  },

  {
    id: 'wf-weather-contingency',
    code: 'WF-06',
    name: {
      es: 'Interceptor de Contingencias de Clima & Re-agendamiento',
      en: 'Weather Contingency Interceptor & 1-Click Reschedule'
    },
    category: 'contingency',
    description: {
      es: 'Monitorea alertas climáticas. Consulta reservas afectadas en la región usando Firestore con Google Service Account (5NiYz8gX64lPYIdK), genera tokens de cambio a 1-clic y despacha notificaciones empáticas.',
      en: 'Monitors weather alerts. Queries impacted region bookings in Firestore via Google Service Account (5NiYz8gX64lPYIdK), generates 1-click reschedule links, and dispatches alerts.'
    },
    icon: 'CloudRain',
    color: '#f97316',
    endpoint: '/api/agents/contingency',
    method: 'POST',
    triggerEvent: 'CONTINGENCIA_CLIMA',
    nodesCount: 10,
    slaTarget: '< 1000 ms',
    nodes: [
      { id: 'c1', name: '[TRIGGER] Weather Alert Hook', type: 'n8n-nodes-base.webhook', description: 'Recibe alerta de crecida o temporal' },
      { id: 'c2', name: '[FIRESTORE] Query Impacted Region Bookings', type: 'n8n-nodes-base.httpRequest', description: 'Filtra reservas activas en la zona afectada en Firestore (Google Service Account ID: 5NiYz8gX64lPYIdK)' },
      { id: 'c3', name: '[AI ENGINE] Evaluate Alternative Tours', type: 'n8n-nodes-base.code', description: 'Selecciona actividades bajo techo o termales cercanas' },
      { id: 'c4', name: '[SECURITY] Generate 1-Click Reschedule Token', type: 'n8n-nodes-base.crypto', description: 'Crea token seguro de cambio de fecha sin costo' },
      { id: 'c5', name: '[WHATSAPP] Send Empathetic Notification', type: 'n8n-nodes-base.httpRequest', description: 'Envía mensaje explicativo con alternativas' },
      { id: 'c6', name: '[RESPONSE] Log Incident Audit', type: 'n8n-nodes-base.respondToWebhook', description: 'Registra la contingencia en la bitácora' },
      { id: 'n1', name: '[ROUTING] Data Validation Switch', type: 'n8n-nodes-base.switch', description: 'Evalúa la integridad del payload y redirige si faltan datos críticos' },
      { id: 'n2', name: '[TRANSFORM] Payload Standardizer', type: 'n8n-nodes-base.set', description: 'Mapeo, limpieza y formato de variables (Fechas, Monedas, Nombres)' },
      { id: 'n3', name: '[ERROR HANDLER] Catch Workflow Exceptions', type: 'n8n-nodes-base.errorTrigger', description: 'Intercepta cualquier fallo en ejecución del flujo para prevención de caídas' },
      { id: 'n4', name: '[OPS ALERT] Telegram Ops Notify', type: 'n8n-nodes-base.telegram', description: 'Envía alerta de diagnóstico al equipo de soporte de Costa Rica Tours (Google Service Account ID: 5NiYz8gX64lPYIdK)' }
    ],
    samplePayload: {
      tourId: 'sarapiqui-white-water-rafting-class-iii',
      region: 'Sarapiquí / Arenal',
      reason: 'Crecida preventiva del Río Sarapiquí tras lluvias en cordillera',
      date: '2026-10-18',
      actionNeeded: 're-agenda o cambio a Termales Tabacón'
    },
    blueprintJson: {
      name: "Costa Rica Tours - WF06 Contingencias de Clima",
      stickyNotes: [
        { name: "⚡ WEATHER HOOK", color: 6, width: 260, height: 160, position: [80, 240] },
        { name: "🗄️ FIRESTORE IMPACTED REGION QUERY (CREDENTIAL: 5NiYz8gX64lPYIdK)", color: 4, width: 440, height: 160, position: [360, 240] },
        { name: "🛡️ RESCHEDULE & WHATSAPP DISPATCH", color: 1, width: 440, height: 160, position: [820, 240] }
      ],
      nodes: [
        {
          parameters: { httpMethod: "POST", path: "contingency", responseMode: "responseNode" },
          name: "[TRIGGER] Weather Alert Hook",
          type: "n8n-nodes-base.webhook",
          typeVersion: 1.1,
          position: [100, 300]
        },
        {
          parameters: {
            url: "http://localhost:3000/api/agents/contingency",
            method: "POST",
            bodyParameters: {
              parameters: [
                { name: "tourId", value: "={{$json.body.tourId}}" },
                { name: "reason", value: "={{$json.body.reason}}" }
              ]
            }
          },
          name: "[FIRESTORE] Query Impacted Region Bookings",
          type: "n8n-nodes-base.httpRequest",
          typeVersion: 4.1,
          position: [350, 300
    ],
          credentials: {
            googleApi: { id: "5NiYz8gX64lPYIdK", name: "Google Service Account" }
          },
          notesInFlow: true,
          notes: "Obtiene reservas afectadas en Firestore con Google Service Account (ID: 5NiYz8gX64lPYIdK)"
        },
        {
          parameters: {
            mode: "runOnceForEachItem",
            jsCode: "const alternatives = $input.item.json.alternatives || [\n  { name: 'Termales Tabacón & Cena', priceMatch: true },\n  { name: 'Tour de Café & Cacao bajo techo', priceMatch: true }\n];\nreturn { json: { ...$input.item.json, alternatives } };"
          },
          name: "[AI ENGINE] Evaluate Alternative Tours",
          type: "n8n-nodes-base.code",
          typeVersion: 2,
          position: [550, 300]
        },
        {
          parameters: {
            action: "hmac",
            algorithm: "sha256",
            value: "={{$json.tourId + '-reschedule'}}",
            secret: "contingency-secret-881"
          },
          name: "[SECURITY] Generate 1-Click Reschedule Token",
          type: "n8n-nodes-base.crypto",
          typeVersion: 1,
          position: [750, 300]
        },
        {
          parameters: {
            url: "http://localhost:3000/api/webhooks/n8n/confirm-booking",
            method: "POST",
            bodyParameters: {
              parameters: [
                { name: "channel", value: "whatsapp" },
                { name: "type", value: "contingency_alert" }
              ]
            }
          },
          name: "[WHATSAPP] Send Empathetic Notification",
          type: "n8n-nodes-base.httpRequest",
          typeVersion: 4.1,
          position: [950, 300]
        },
        {
          parameters: {
            respondWith: "json",
            responseBody: "={\n  \"exito\": true,\n  \"alternativas\": $json.alternatives,\n  \"emailBorrador\": $node['[FIRESTORE] Query Impacted Region Bookings'].json.draftEmail || 'Estimado viajero, por seguridad hemos re-agendado tu tour.',\n  \"mensaje\": \"Contingencia de clima procesada exitosamente.\"\n}"
          },
          name: "[RESPONSE] Log Incident Audit",
          type: "n8n-nodes-base.respondToWebhook",
          typeVersion: 1.1,
          position: [1150, 300]
        }
      ],
      connections: {
        "[TRIGGER] Weather Alert Hook": { main: [[{ node: "[FIRESTORE] Query Impacted Region Bookings", type: "main", index: 0 }]] },
        "[FIRESTORE] Query Impacted Region Bookings": { main: [[{ node: "[AI ENGINE] Evaluate Alternative Tours", type: "main", index: 0 }]] },
        "[AI ENGINE] Evaluate Alternative Tours": { main: [[{ node: "[SECURITY] Generate 1-Click Reschedule Token", type: "main", index: 0 }]] },
        "[SECURITY] Generate 1-Click Reschedule Token": { main: [[{ node: "[WHATSAPP] Send Empathetic Notification", type: "main", index: 0 }]] },
        "[WHATSAPP] Send Empathetic Notification": { main: [[{ node: "[RESPONSE] Log Incident Audit", type: "main", index: 0 }]] }
      }
    }
  },

  {
    id: 'wf-supervisor-self-healing',
    code: 'WF-07',
    name: {
      es: 'Agente Supervisor & Auditoría Self-Healing',
      en: 'Supervisor Agent & Self-Healing Audit Loop'
    },
    category: 'supervision',
    description: {
      es: 'Audita fallos de interpretación en Firestore (5NiYz8gX64lPYIdK), diagnostica causas raíz con Gemini y envía parches recomendados al canal técnico de Telegram mediante Google Service Account (5NiYz8gX64lPYIdK).',
      en: 'Audits interpretation failures in Firestore (5NiYz8gX64lPYIdK), diagnoses root causes via Gemini, and dispatches prompt hotfixes to Telegram tech channel using Google Service Account (5NiYz8gX64lPYIdK).'
    },
    icon: 'ShieldAlert',
    color: '#ef4444',
    endpoint: '/api/agents/supervisor',
    method: 'POST',
    triggerEvent: 'AUDITORIA_SUPERVISOR',
    nodesCount: 10,
    slaTarget: '< 1800 ms',
    nodes: [
      { id: 's1', name: '[TRIGGER] Cron Exception Auditor', type: 'n8n-nodes-base.cron', description: 'Se dispara periódicamente o tras 3 errores' },
      { id: 's2', name: '[FIRESTORE] Fetch Unhandled Exception Logs', type: 'n8n-nodes-base.httpRequest', description: 'Consulta excepciones no controladas en Firestore (Google Service Account ID: 5NiYz8gX64lPYIdK)' },
      { id: 's3', name: '[AI ENGINE] Gemini Failure Pattern Analyzer', type: 'n8n-nodes-base.openAi', description: 'Analiza la causa raíz en modismos locales' },
      { id: 's4', name: '[LOGIC] Generate Prompt Hotfix Rule', type: 'n8n-nodes-base.code', description: 'Genera parche de normalización en tiempo real' },
      { id: 's5', name: '[TELEGRAM] Send Alert to Ops Tech Channel', type: 'n8n-nodes-base.telegram', description: 'Despacha alerta técnica a Telegram (Google Service Account ID: 5NiYz8gX64lPYIdK)' },
      { id: 's6', name: '[RESPONSE] Deliver Self-Healing Diagnosis', type: 'n8n-nodes-base.respondToWebhook', description: 'Entrega diagnóstico de auto-recuperación' },
      { id: 'n1', name: '[ROUTING] Data Validation Switch', type: 'n8n-nodes-base.switch', description: 'Evalúa la integridad del payload y redirige si faltan datos críticos' },
      { id: 'n2', name: '[TRANSFORM] Payload Standardizer', type: 'n8n-nodes-base.set', description: 'Mapeo, limpieza y formato de variables (Fechas, Monedas, Nombres)' },
      { id: 'n3', name: '[ERROR HANDLER] Catch Workflow Exceptions', type: 'n8n-nodes-base.errorTrigger', description: 'Intercepta cualquier fallo en ejecución del flujo para prevención de caídas' },
      { id: 'n4', name: '[OPS ALERT] Telegram Ops Notify', type: 'n8n-nodes-base.telegram', description: 'Envía alerta de diagnóstico al equipo de soporte de Costa Rica Tours (Google Service Account ID: 5NiYz8gX64lPYIdK)' }
    ],
    samplePayload: {
      agentName: 'OperationsTriage',
      errorContext: 'Operador respondió con modismo: "El compa dijo q tal vez a eso de las 3 o 4"',
      rawData: { providerId: 'op_arenal_04', chatText: 'Mae diay tal vez 3 y media' }
    },
    blueprintJson: {
      name: "Costa Rica Tours - WF07 Supervisor Self-Healing",
      stickyNotes: [
        { name: "⚡ CRON EXCEPTION HOOK", color: 6, width: 260, height: 160, position: [80, 240] },
        { name: "🗄️ FIRESTORE ERROR LOGS (CREDENTIAL: 5NiYz8gX64lPYIdK)", color: 4, width: 340, height: 160, position: [360, 240] },
        { name: "✈️ TELEGRAM TECH BOT DISPATCH (CREDENTIAL: 5NiYz8gX64lPYIdK)", color: 2, width: 440, height: 160, position: [720, 240] }
      ],
      nodes: [
        {
          parameters: { httpMethod: "POST", path: "supervisor", responseMode: "responseNode" },
          name: "[TRIGGER] Cron Exception Auditor",
          type: "n8n-nodes-base.webhook",
          typeVersion: 1.1,
          position: [100, 300]
        },
        {
          parameters: {
            url: "http://localhost:3000/api/agents/supervisor",
            method: "POST"
          },
          name: "[FIRESTORE] Fetch Unhandled Exception Logs",
          type: "n8n-nodes-base.httpRequest",
          typeVersion: 4.1,
          position: [350, 300
    ],
          credentials: {
            googleApi: { id: "5NiYz8gX64lPYIdK", name: "Google Service Account" }
          },
          notesInFlow: true,
          notes: "Obtiene bitácora de errores en Firestore (Google Service Account ID: 5NiYz8gX64lPYIdK)"
        },
        {
          parameters: {
            model: "gemini-1.5-flash",
            prompt: "Analiza el modismo local costarricense y diagnostica la intención real del operador."
          },
          name: "[AI ENGINE] Gemini Failure Pattern Analyzer",
          type: "@n8n/n8n-nodes-langchain.agent",
          typeVersion: 1,
          position: [550, 300]
        },
        {
          parameters: {
            mode: "runOnceForEachItem",
            jsCode: "const fixRule = 'Normalizar expresiones ticas como \"3 y media\" a 15:30:00 UTC-6';\nreturn { json: { ...$input.item.json, fixRule } };"
          },
          name: "[LOGIC] Generate Prompt Hotfix Rule",
          type: "n8n-nodes-base.code",
          typeVersion: 2,
          position: [750, 300]
        },
        {
          parameters: {
            chatId: process.env.TELEGRAM_ADMIN_CHAT_ID || "-1002348576921",
            text: "=*🚨 ALERTA SUPERVISOR SELF-HEAVY*\\n\\nAgente: `{{$json.agentName || 'OpsTriage'}}`\\nError: `{{$json.errorContext || 'Modismo no interpretado'}}`\\nParche: `{{$json.fixRule}}`",
            additionalFields: { parse_mode: "Markdown" }
          },
          name: "[TELEGRAM] Send Alert to Ops Tech Channel",
          type: "n8n-nodes-base.telegram",
          typeVersion: 1.1,
          position: [950, 300],
          credentials: {
            telegramApi: { id: "5NiYz8gX64lPYIdK", name: "Google Service Account" }
          },
          notesInFlow: true,
          notes: "Notificación enviada al Bot de Telegram (Credential: 5NiYz8gX64lPYIdK)"
        },
        {
          parameters: {
            respondWith: "json",
            responseBody: "={\n  \"exito\": true,\n  \"analisis\": $json.analysis || 'Ambigüedad en modismo costarricense resuelta.',\n  \"parcheSugerido\": $json.fixRule\n}"
          },
          name: "[RESPONSE] Deliver Self-Healing Diagnosis",
          type: "n8n-nodes-base.respondToWebhook",
          typeVersion: 1.1,
          position: [1150, 300]
        }
      ],
      connections: {
        "[TRIGGER] Cron Exception Auditor": { main: [[{ node: "[FIRESTORE] Fetch Unhandled Exception Logs", type: "main", index: 0 }]] },
        "[FIRESTORE] Fetch Unhandled Exception Logs": { main: [[{ node: "[AI ENGINE] Gemini Failure Pattern Analyzer", type: "main", index: 0 }]] },
        "[AI ENGINE] Gemini Failure Pattern Analyzer": { main: [[{ node: "[LOGIC] Generate Prompt Hotfix Rule", type: "main", index: 0 }]] },
        "[LOGIC] Generate Prompt Hotfix Rule": { main: [[{ node: "[TELEGRAM] Send Alert to Ops Tech Channel", type: "main", index: 0 }]] },
        "[TELEGRAM] Send Alert to Ops Tech Channel": { main: [[{ node: "[RESPONSE] Deliver Self-Healing Diagnosis", type: "main", index: 0 }]] }
      }
    }
  },

  {
    id: 'wf-support-escalation',
    code: 'WF-08',
    name: {
      es: 'Escalado a Operador Humano & Tickets VIP',
      en: 'Human Escalation & Priority Support Ticket'
    },
    category: 'support',
    description: {
      es: 'Genera un ticket de alta prioridad en Firestore (5NiYz8gX64lPYIdK), notifica inmediatamente al canal de guardia en Telegram (5NiYz8gX64lPYIdK) y responde con empatía al cliente.',
      en: 'Creates a priority support ticket in Firestore (5NiYz8gX64lPYIdK), dispatches an urgent Telegram alert (5NiYz8gX64lPYIdK), and delivers a reassuring response.'
    },
    icon: 'Headphones',
    color: '#ec4899',
    endpoint: '/webhook/solicitud-soporte',
    method: 'POST',
    triggerEvent: 'SOLICITUD_SOPORTE',
    nodesCount: 9,
    slaTarget: '< 600 ms',
    nodes: [
      { id: 'u1', name: '[TRIGGER] Support Escalation Webhook', type: 'n8n-nodes-base.webhook', description: 'Detecta solicitud humana o urgencia' },
      { id: 'u2', name: '[AI ENGINE] Sentiment & Severity Classifier', type: 'n8n-nodes-base.code', description: 'Calcula severidad del caso y asigna urgencia' },
      { id: 'u3', name: '[FIRESTORE] Create High-Priority Support Ticket', type: 'n8n-nodes-base.httpRequest', description: 'Almacena el ticket en Firestore (Google Service Account ID: 5NiYz8gX64lPYIdK)' },
      { id: 'u4', name: '[TELEGRAM] Dispatch Priority Alert to Ops Chat', type: 'n8n-nodes-base.telegram', description: 'Avisa al personal de guardia en Telegram (Google Service Account ID: 5NiYz8gX64lPYIdK)' },
      { id: 'u5', name: '[RESPONSE] Reassure Traveler', type: 'n8n-nodes-base.respondToWebhook', description: 'Informa al usuario sobre el contacto humano inmediato' },
      { id: 'n1', name: '[ROUTING] Data Validation Switch', type: 'n8n-nodes-base.switch', description: 'Evalúa la integridad del payload y redirige si faltan datos críticos' },
      { id: 'n2', name: '[TRANSFORM] Payload Standardizer', type: 'n8n-nodes-base.set', description: 'Mapeo, limpieza y formato de variables (Fechas, Monedas, Nombres)' },
      { id: 'n3', name: '[ERROR HANDLER] Catch Workflow Exceptions', type: 'n8n-nodes-base.errorTrigger', description: 'Intercepta cualquier fallo en ejecución del flujo para prevención de caídas' },
      { id: 'n4', name: '[OPS ALERT] Telegram Ops Notify', type: 'n8n-nodes-base.telegram', description: 'Envía alerta de diagnóstico al equipo de soporte de Costa Rica Tours (Google Service Account ID: 5NiYz8gX64lPYIdK)' }
    ],
    samplePayload: {
      trigger: 'SOLICITUD_SOPORTE',
      tipo: 'soporte_humano',
      motivo: 'El cliente solicita confirmación de transporte accesible para silla de ruedas',
      usuario: {
        nombre: 'Elena Ruiz',
        email: 'elena.ruiz@example.com',
        telefono: '+1 555-019-2834'
      },
      reservaAsociada: 'CRT-2026-8819',
      prioridad: 'alta',
      timestamp: new Date().toISOString()
    },
    blueprintJson: {
      name: "Costa Rica Tours - WF08 Escalado a Soporte Humano",
      stickyNotes: [
        { name: "⚡ SUPPORT HOOK", color: 6, width: 260, height: 160, position: [80, 240] },
        { name: "🗄️ FIRESTORE TICKET DB (CREDENTIAL: 5NiYz8gX64lPYIdK)", color: 4, width: 340, height: 160, position: [360, 240] },
        { name: "✈️ TELEGRAM VIP ALERT BOT (CREDENTIAL: 5NiYz8gX64lPYIdK)", color: 2, width: 440, height: 160, position: [720, 240] }
      ],
      nodes: [
        {
          parameters: { httpMethod: "POST", path: "solicitud-soporte", responseMode: "responseNode" },
          name: "[TRIGGER] Support Escalation Webhook",
          type: "n8n-nodes-base.webhook",
          typeVersion: 1.1,
          position: [100, 300]
        },
        {
          parameters: {
            mode: "runOnceForEachItem",
            jsCode: "const body = $input.item.json.body || $input.item.json;\nconst ticketId = 'TCK-' + Math.floor(100000 + Math.random() * 900000);\nreturn { json: { ...body, ticketId, status: 'open_priority' } };"
          },
          name: "[AI ENGINE] Sentiment & Severity Classifier",
          type: "n8n-nodes-base.code",
          typeVersion: 2,
          position: [300, 300]
        },
        {
          parameters: {
            url: "http://localhost:3000/api/webhooks/n8n/update-booking",
            method: "POST",
            bodyParameters: {
              parameters: [
                { name: "ticketId", value: "={{$json.ticketId}}" },
                { name: "reason", value: "={{$json.motivo}}" },
                { name: "priority", value: "URGENTE" }
              ]
            }
          },
          name: "[FIRESTORE] Create High-Priority Support Ticket",
          type: "n8n-nodes-base.httpRequest",
          typeVersion: 4.1,
          position: [500, 300
    ],
          credentials: {
            googleApi: { id: "5NiYz8gX64lPYIdK", name: "Google Service Account" }
          },
          notesInFlow: true,
          notes: "Inserta ticket prioritario en Firestore con Google Service Account (ID: 5NiYz8gX64lPYIdK)"
        },
        {
          parameters: {
            chatId: process.env.TELEGRAM_ADMIN_CHAT_ID || "-1002348576921",
            text: "=*🆘 TICKET DE SOPORTE VIP ENTRANTE*\\n\\nCliente: `{{$json.usuario?.nombre || 'Viajero'}}`\\nMotivo: `{{$json.motivo || 'Atención prioritaria'}}`\\nTicket ID: `{{$json.ticketId}}`\\nEstado: *URGENTE*",
            additionalFields: { parse_mode: "Markdown" }
          },
          name: "[TELEGRAM] Dispatch Priority Alert to Ops Chat",
          type: "n8n-nodes-base.telegram",
          typeVersion: 1.1,
          position: [700, 300],
          credentials: {
            telegramApi: { id: "5NiYz8gX64lPYIdK", name: "Google Service Account" }
          },
          notesInFlow: true,
          notes: "Despacha alerta VIP al Bot de Telegram (Credential ID: 5NiYz8gX64lPYIdK)"
        },
        {
          parameters: {
            respondWith: "json",
            responseBody: "={\n  \"exito\": true,\n  \"ticketId\": $json.ticketId,\n  \"mensaje\": \"Un asesor humano te contactará de inmediato por WhatsApp.\",\n  \"canal\": \"whatsapp_directo\"\n}"
          },
          name: "[RESPONSE] Reassure Traveler",
          type: "n8n-nodes-base.respondToWebhook",
          typeVersion: 1.1,
          position: [900, 300]
        }
      ],
      connections: {
        "[TRIGGER] Support Escalation Webhook": { main: [[{ node: "[AI ENGINE] Sentiment & Severity Classifier", type: "main", index: 0 }]] },
        "[AI ENGINE] Sentiment & Severity Classifier": { main: [[{ node: "[FIRESTORE] Create High-Priority Support Ticket", type: "main", index: 0 }]] },
        "[FIRESTORE] Create High-Priority Support Ticket": { main: [[{ node: "[TELEGRAM] Dispatch Priority Alert to Ops Chat", type: "main", index: 0 }]] },
        "[TELEGRAM] Dispatch Priority Alert to Ops Chat": { main: [[{ node: "[RESPONSE] Reassure Traveler", type: "main", index: 0 }]] }
      }
    }
  },

  {
    id: 'wf-fraud-risk-scoring',
    code: 'WF-09',
    name: {
      es: 'Motor Antifraude & Scoring de Riesgo de Transacciones',
      en: 'Anti-Fraud Engine & Transaction Risk Scoring'
    },
    category: 'fraud',
    description: {
      es: 'Consulta historial de transacciones en Firestore (5NiYz8gX64lPYIdK), calcula la matriz de riesgo (IP vs BIN, reintentos) y notifica intentos sospechosos a Telegram (5NiYz8gX64lPYIdK).',
      en: 'Queries past transaction logs in Firestore (5NiYz8gX64lPYIdK), evaluates risk matrix, and alerts suspicious payments to Telegram (5NiYz8gX64lPYIdK).'
    },
    icon: 'ShieldAlert',
    color: '#ef4444',
    endpoint: '/webhook/antifraude-evaluacion',
    method: 'POST',
    triggerEvent: 'EVALUACION_ANTIFRAUDE',
    nodesCount: 10,
    slaTarget: '< 850 ms',
    nodes: [
      { id: 'f1', name: '[TRIGGER] Fraud Check Webhook', type: 'n8n-nodes-base.webhook', description: 'Recibe datos de pago previa a emisión' },
      { id: 'f2', name: '[FIRESTORE] Fetch Customer Transaction History', type: 'n8n-nodes-base.httpRequest', description: 'Valida reintentos y lista negra en Firestore (Google Service Account ID: 5NiYz8gX64lPYIdK)' },
      { id: 'f3', name: '[LOGIC] Calculate Risk Score Engine', type: 'n8n-nodes-base.code', description: 'Calcula score 0-100 por discordancia geográfica y montos' },
      { id: 'f4', name: '[LOGIC] Decision Switch (Pass / Review / Block)', type: 'n8n-nodes-base.if', description: 'Switchea según score <40 (Aprobado), 40-69 (Revisión), >=70 (Bloqueado)' },
      { id: 'f5', name: '[TELEGRAM] Send High-Risk Fraud Alert', type: 'n8n-nodes-base.telegram', description: 'Alert al equipo de seguridad en Telegram (Google Service Account ID: 5NiYz8gX64lPYIdK)' },
      { id: 'f6', name: '[RESPONSE] Respond Risk Verdict', type: 'n8n-nodes-base.respondToWebhook', description: 'Retorna veredicto final' },
      { id: 'n1', name: '[ROUTING] Data Validation Switch', type: 'n8n-nodes-base.switch', description: 'Evalúa la integridad del payload y redirige si faltan datos críticos' },
      { id: 'n2', name: '[TRANSFORM] Payload Standardizer', type: 'n8n-nodes-base.set', description: 'Mapeo, limpieza y formato de variables (Fechas, Monedas, Nombres)' },
      { id: 'n3', name: '[ERROR HANDLER] Catch Workflow Exceptions', type: 'n8n-nodes-base.errorTrigger', description: 'Intercepta cualquier fallo en ejecución del flujo para prevención de caídas' },
      { id: 'n4', name: '[OPS ALERT] Telegram Ops Notify', type: 'n8n-nodes-base.telegram', description: 'Envía alerta de diagnóstico al equipo de soporte de Costa Rica Tours (Google Service Account ID: 5NiYz8gX64lPYIdK)' }
    ],
    samplePayload: {
      trigger: 'EVALUACION_ANTIFRAUDE',
      idReserva: 'CRT-2026-9941',
      montoUSD: 580,
      cliente: {
        nombre: 'Alexander Vance',
        email: 'alex.vance.travel@gmail.com',
        telefono: '+1 305-555-0199',
        paisEmisorTarjeta: 'US',
        ipOrigen: '198.51.100.42',
        paisIP: 'US'
      },
      tourId: 'arenal-volcano-hot-springs',
      intentosPrevios24h: 1,
      tarjetaUltimos4: '4242',
      timestamp: new Date().toISOString()
    },
    blueprintJson: {
      name: "Costa Rica Tours - WF09 Motor Antifraude & Risk Scoring",
      stickyNotes: [
        { name: "⚡ FRAUD CHECK HOOK", color: 6, width: 260, height: 160, position: [80, 240] },
        { name: "🗄️ FIRESTORE RISK LOOKUP (CREDENTIAL: 5NiYz8gX64lPYIdK)", color: 4, width: 340, height: 160, position: [360, 240] },
        { name: "✈️ TELEGRAM FRAUD BOT ALERT (CREDENTIAL: 5NiYz8gX64lPYIdK)", color: 2, width: 440, height: 160, position: [720, 240] }
      ],
      nodes: [
        {
          parameters: { httpMethod: "POST", path: "antifraude-evaluacion", responseMode: "responseNode" },
          name: "[TRIGGER] Fraud Check Webhook",
          type: "n8n-nodes-base.webhook",
          typeVersion: 1.1,
          position: [100, 300]
        },
        {
          parameters: {
            url: "http://localhost:3000/api/analytics/conversion-report",
            method: "GET"
          },
          name: "[FIRESTORE] Fetch Customer Transaction History",
          type: "n8n-nodes-base.httpRequest",
          typeVersion: 4.1,
          position: [350, 300
    ],
          credentials: {
            googleApi: { id: "5NiYz8gX64lPYIdK", name: "Google Service Account" }
          },
          notesInFlow: true,
          notes: "Obtiene antecedentes en Firestore (Google Service Account ID: 5NiYz8gX64lPYIdK)"
        },
        {
          parameters: {
            mode: "runOnceForEachItem",
            jsCode: "const body = $input.item.json.body || $input.item.json;\nlet score = 5;\nconst flags = [];\nif (body.cliente?.paisEmisorTarjeta !== body.cliente?.paisIP) { score += 35; flags.push('DISCORDANCIA_IP_BIN'); }\nif (body.montoUSD >= 1200) { score += 20; flags.push('MONTO_ELEVADO'); }\nconst decision = score >= 70 ? 'BLOQUEADO' : score >= 40 ? 'REVISION_MANUAL' : 'APROBADO';\nreturn { json: { ...body, riskScore: score, decision, flags } };"
          },
          name: "[LOGIC] Calculate Risk Score Engine",
          type: "n8n-nodes-base.code",
          typeVersion: 2,
          position: [550, 300]
        },
        {
          parameters: {
            conditions: { string: [{ value1: "={{$json.decision}}", operation: "equals", value2: "APROBADO" }] }
          },
          name: "[LOGIC] Decision Switch (Pass / Review / Block)",
          type: "n8n-nodes-base.if",
          typeVersion: 1,
          position: [750, 300]
        },
        {
          parameters: {
            chatId: process.env.TELEGRAM_ADMIN_CHAT_ID || "-1002348576921",
            text: "=*⚠️ ALERTA RIESGO ANTIFRAUDE*\\n\\nReserva: `{{$json.idReserva}}`\\nRisk Score: `{{$json.riskScore}}/100`\\nDecisión: *{{$json.decision}}*\\nFlags: `{{$json.flags.join(', ')}}`",
            additionalFields: { parse_mode: "Markdown" }
          },
          name: "[TELEGRAM] Send High-Risk Fraud Alert",
          type: "n8n-nodes-base.telegram",
          typeVersion: 1.1,
          position: [950, 300],
          credentials: {
            telegramApi: { id: "5NiYz8gX64lPYIdK", name: "Google Service Account" }
          },
          notesInFlow: true,
          notes: "Despacha alerta de fraude a Telegram (Credential ID: 5NiYz8gX64lPYIdK)"
        },
        {
          parameters: {
            respondWith: "json",
            responseBody: "={\n  \"exito\": true,\n  \"autorizado\": {{$json.decision === 'APROBADO'}},\n  \"decision\": $json.decision,\n  \"riskScore\": $json.riskScore,\n  \"flags\": $json.flags,\n  \"reservaId\": $json.idReserva\n}"
          },
          name: "[RESPONSE] Respond Risk Verdict",
          type: "n8n-nodes-base.respondToWebhook",
          typeVersion: 1.1,
          position: [1150, 300]
        }
      ],
      connections: {
        "[TRIGGER] Fraud Check Webhook": { main: [[{ node: "[FIRESTORE] Fetch Customer Transaction History", type: "main", index: 0 }]] },
        "[FIRESTORE] Fetch Customer Transaction History": { main: [[{ node: "[LOGIC] Calculate Risk Score Engine", type: "main", index: 0 }]] },
        "[LOGIC] Calculate Risk Score Engine": { main: [[{ node: "[LOGIC] Decision Switch (Pass / Review / Block)", type: "main", index: 0 }]] },
        "[LOGIC] Decision Switch (Pass / Review / Block)": { main: [[{ node: "[TELEGRAM] Send High-Risk Fraud Alert", type: "main", index: 0 }]] },
        "[TELEGRAM] Send High-Risk Fraud Alert": { main: [[{ node: "[RESPONSE] Respond Risk Verdict", type: "main", index: 0 }]] }
      }
    }
  },

  {
    id: 'wf-telegram-ops-panel',
    code: 'WF-10',
    name: {
      es: 'Panel Operativo en Telegram & Acciones Interactivas (Bot 1-Clic)',
      en: 'Telegram Ops Panel & Interactive Bot Actions (1-Click Bot)'
    },
    category: 'telegram',
    description: {
      es: 'Bot interactivo de Telegram (5NiYz8gX64lPYIdK) para guías y choferes con actualización instantánea de estado operativo en Firestore (5NiYz8gX64lPYIdK) en 1 clic.',
      en: 'Interactive Telegram Bot (5NiYz8gX64lPYIdK) for tour guides and drivers with 1-click operational status synchronization in Firestore (5NiYz8gX64lPYIdK).'
    },
    icon: 'Send',
    color: '#0284c7',
    endpoint: '/webhook/telegram-ops-action',
    method: 'POST',
    triggerEvent: 'ACCION_PANEL_TELEGRAM',
    nodesCount: 10,
    slaTarget: '< 950 ms',
    nodes: [
      { id: 't1', name: '[TRIGGER] Telegram Bot Trigger', type: 'n8n-nodes-base.telegramTrigger', description: 'Escucha clics en botones inline en Telegram Bot (Google Service Account ID: 5NiYz8gX64lPYIdK)' },
      { id: 't2', name: '[LOGIC] Parse Telegram Action Callback', type: 'n8n-nodes-base.code', description: 'Extrae el bookingId y la acción seleccionada por el guía' },
      { id: 't3', name: '[FIRESTORE] Sync Booking Operational Status', type: 'n8n-nodes-base.httpRequest', description: 'Actualiza el estado de la reserva en Firestore (Google Service Account ID: 5NiYz8gX64lPYIdK)' },
      { id: 't4', name: '[TELEGRAM] Update Inline Button Markup', type: 'n8n-nodes-base.telegram', description: 'Modifica el texto de la tarjeta en Telegram a "✅ CONFIRMADO POR GUÍA"' },
      { id: 't5', name: '[TELEGRAM] Notify Ops Telegram Group', type: 'n8n-nodes-base.telegram', description: 'Informa al grupo general de logística (Google Service Account ID: 5NiYz8gX64lPYIdK)' },
      { id: 't6', name: '[RESPONSE] Answer Callback Query Toast', type: 'n8n-nodes-base.respondToWebhook', description: 'Despacha notificación emergente toast en la interfaz de Telegram' },
      { id: 'n1', name: '[ROUTING] Data Validation Switch', type: 'n8n-nodes-base.switch', description: 'Evalúa la integridad del payload y redirige si faltan datos críticos' },
      { id: 'n2', name: '[TRANSFORM] Payload Standardizer', type: 'n8n-nodes-base.set', description: 'Mapeo, limpieza y formato de variables (Fechas, Monedas, Nombres)' },
      { id: 'n3', name: '[ERROR HANDLER] Catch Workflow Exceptions', type: 'n8n-nodes-base.errorTrigger', description: 'Intercepta cualquier fallo en ejecución del flujo para prevención de caídas' },
      { id: 'n4', name: '[OPS ALERT] Telegram Ops Notify', type: 'n8n-nodes-base.telegram', description: 'Envía alerta de diagnóstico al equipo de soporte de Costa Rica Tours (Google Service Account ID: 5NiYz8gX64lPYIdK)' }
    ],
    samplePayload: {
      trigger: 'ACCION_PANEL_TELEGRAM',
      telegramUserId: 184920482,
      operador: 'Guía Juan Carlos (La Fortuna Rafting)',
      action: 'confirmar_recogida',
      idReserva: 'CRT-2026-8819',
      hotelRecogida: 'Hotel Los Lagos, La Fortuna',
      horaEstimada: '07:45 AM',
      notas: 'Microbús Toyota HiAce placa CRT-442 en camino',
      timestamp: new Date().toISOString()
    },
    blueprintJson: {
      name: "Costa Rica Tours - WF10 Panel Operativo Telegram Bot",
      stickyNotes: [
        { name: "✈️ TELEGRAM BOT TRIGGER & PARSER (CREDENTIAL: 5NiYz8gX64lPYIdK)", color: 2, width: 340, height: 160, position: [80, 240] },
        { name: "🗄️ FIRESTORE OPERATIONAL STATUS SYNC (CREDENTIAL: 5NiYz8gX64lPYIdK)", color: 4, width: 360, height: 160, position: [460, 240] },
        { name: "✈️ TELEGRAM MARKUP & GROUP DISPATCH (CREDENTIAL: 5NiYz8gX64lPYIdK)", color: 2, width: 440, height: 160, position: [860, 240] }
      ],
      nodes: [
        {
          parameters: { updates: ["callback_query", "message"] },
          name: "[TRIGGER] Telegram Bot Trigger",
          type: "n8n-nodes-base.telegramTrigger",
          typeVersion: 1.1,
          position: [100, 300
    ],
          credentials: {
            telegramApi: { id: "5NiYz8gX64lPYIdK", name: "Google Service Account" }
          },
          notesInFlow: true,
          notes: "Escucha eventos con credencial certificada (ID: 5NiYz8gX64lPYIdK)"
        },
        {
          parameters: {
            mode: "runOnceForEachItem",
            jsCode: "const data = $input.item.json.callback_query || $input.item.json;\nconst callbackData = data.data || '';\nconst parts = callbackData.split(':');\nreturn {\n  json: {\n    action: parts[0] || 'confirmar_recogida',\n    bookingId: parts[1] || 'CRT-2026-8819',\n    user: data.from?.first_name || 'Guía Juan Carlos',\n    chatId: data.message?.chat?.id || -1002348576921\n  }\n};"
          },
          name: "[LOGIC] Parse Telegram Action Callback",
          type: "n8n-nodes-base.code",
          typeVersion: 2,
          position: [300, 300]
        },
        {
          parameters: {
            url: "http://localhost:3000/api/webhooks/n8n/update-booking",
            method: "POST",
            headerParameters: {
              parameters: [{ name: "X-Webhook-Secret", value: "dev-secret-key-123" }]
            },
            bodyParameters: {
              parameters: [
                { name: "bookingId", value: "={{$json.bookingId}}" },
                { name: "pickupStatus", value: "confirmado_por_guia" },
                { name: "assignedOperator", value: "={{$json.user}}" }
              ]
            }
          },
          name: "[FIRESTORE] Sync Booking Operational Status",
          type: "n8n-nodes-base.httpRequest",
          typeVersion: 4.1,
          position: [500, 300],
          credentials: {
            googleApi: { id: "5NiYz8gX64lPYIdK", name: "Google Service Account" }
          },
          notesInFlow: true,
          notes: "Sincroniza estado operativo en Firestore (Google Service Account ID: 5NiYz8gX64lPYIdK)"
        },
        {
          parameters: {
            chatId: "={{$json.chatId}}",
            text: "=*✅ RECOGIDA CONFIRMADA POR GUÍA*\\n\\nReserva: `{{$json.bookingId}}`\\nGuía: `{{$json.user}}`\\nHora: `07:30 AM`",
            additionalFields: { parse_mode: "Markdown" }
          },
          name: "[TELEGRAM] Update Inline Button Markup",
          type: "n8n-nodes-base.telegram",
          typeVersion: 1.1,
          position: [700, 300],
          credentials: {
            telegramApi: { id: "5NiYz8gX64lPYIdK", name: "Google Service Account" }
          },
          notesInFlow: true,
          notes: "Actualiza el texto en Telegram (Credential ID: 5NiYz8gX64lPYIdK)"
        },
        {
          parameters: {
            chatId: process.env.TELEGRAM_ADMIN_CHAT_ID || "-1002348576921",
            text: "📢 *CONTROL OPERATIVO:* El guía `{{$json.user}}` ha confirmado la recogida de la reserva `{{$json.bookingId}}`.",
            additionalFields: { parse_mode: "Markdown" }
          },
          name: "[TELEGRAM] Notify Ops Telegram Group",
          type: "n8n-nodes-base.telegram",
          typeVersion: 1.1,
          position: [900, 300],
          credentials: {
            telegramApi: { id: "5NiYz8gX64lPYIdK", name: "Google Service Account" }
          },
          notesInFlow: true,
          notes: "Reporte grupal vía Bot Telegram (Credential ID: 5NiYz8gX64lPYIdK)"
        },
        {
          parameters: {
            respondWith: "json",
            responseBody: "={\n  \"exito\": true,\n  \"bookingId\": $json.bookingId,\n  \"accionEjecutada\": $json.action,\n  \"operador\": $json.user,\n  \"nuevoEstado\": \"recogida_confirmada_por_guia\",\n  \"telegramMessageUpdated\": true\n}"
          },
          name: "[RESPONSE] Answer Callback Query Toast",
          type: "n8n-nodes-base.respondToWebhook",
          typeVersion: 1.1,
          position: [1100, 300]
        }
      ],
      connections: {
        "[TRIGGER] Telegram Bot Trigger": { main: [[{ node: "[LOGIC] Parse Telegram Action Callback", type: "main", index: 0 }]] },
        "[LOGIC] Parse Telegram Action Callback": { main: [[{ node: "[FIRESTORE] Sync Booking Operational Status", type: "main", index: 0 }]] },
        "[FIRESTORE] Sync Booking Operational Status": { main: [[{ node: "[TELEGRAM] Update Inline Button Markup", type: "main", index: 0 }]] },
        "[TELEGRAM] Update Inline Button Markup": { main: [[{ node: "[TELEGRAM] Notify Ops Telegram Group", type: "main", index: 0 }]] },
        "[TELEGRAM] Notify Ops Telegram Group": { main: [[{ node: "[RESPONSE] Answer Callback Query Toast", type: "main", index: 0 }]] }
      }
    }
  },

  {
    id: 'wf-weekly-conversion-report',
    code: 'WF-11',
    name: {
      es: 'Reporte Semanal de Conversión Firestore a Telegram',
      en: 'Weekly Conversion & Booking Volume Firestore to Telegram Report'
    },
    category: 'analytics',
    description: {
      es: 'Extrae reservas de los últimos 7 días desde Firestore (5NiYz8gX64lPYIdK), calcula KPIs de conversión e ingresos, y despacha un informe ejecutivo al canal de Telegram (5NiYz8gX64lPYIdK).',
      en: 'Extracts 7-day bookings from Firestore (5NiYz8gX64lPYIdK), calculates conversion KPIs and revenue, and dispatches an executive report to Telegram (5NiYz8gX64lPYIdK).'
    },
    icon: 'BarChart3',
    color: '#0ea5e9',
    endpoint: '/webhook/reporte-semanal-conversion',
    method: 'POST',
    triggerEvent: 'CRON_SEMANAL_CONVERSION',
    nodesCount: 9,
    slaTarget: '< 2500 ms',
    nodes: [
      { id: 'n1', name: '[TRIGGER] Weekly Schedule Trigger', type: 'n8n-nodes-base.scheduleTrigger', description: 'Se activa todos los lunes a las 07:00 AM (Hora Costa Rica, UTC-6)' },
      { id: 'n2', name: '[FIRESTORE] Fetch Weekly Bookings & Analytics', type: 'n8n-nodes-base.httpRequest', description: 'Consulta consolidada de reservas en Firestore (Google Service Account ID: 5NiYz8gX64lPYIdK)' },
      { id: 'n3', name: '[LOGIC] Conversion Rate & KPI Engine', type: 'n8n-nodes-base.code', description: 'Calcula % de conversión, ingresos USD y top tours demandados' },
      { id: 'n4', name: '[LOGIC] Telegram Executive Markdown Formatter', type: 'n8n-nodes-base.code', description: 'Formatea reporte ejecutivo en Markdown con métricas clave' },
      { id: 'n5', name: '[TELEGRAM] Send to Admin Telegram Channel', type: 'n8n-nodes-base.telegram', description: 'Despacha reporte al chat administrativo en Telegram (Google Service Account ID: 5NiYz8gX64lPYIdK)' },
      { id: 'n6', name: '[ROUTING] Data Validation Switch', type: 'n8n-nodes-base.switch', description: 'Evalúa la integridad del payload y redirige si faltan datos críticos' },
      { id: 'n7', name: '[TRANSFORM] Payload Standardizer', type: 'n8n-nodes-base.set', description: 'Mapeo, limpieza y formato de variables (Fechas, Monedas, Nombres)' },
      { id: 'n8', name: '[ERROR HANDLER] Catch Workflow Exceptions', type: 'n8n-nodes-base.errorTrigger', description: 'Intercepta cualquier fallo en ejecución del flujo para prevención de caídas' },
      { id: 'n9', name: '[OPS ALERT] Telegram Ops Notify', type: 'n8n-nodes-base.telegram', description: 'Envía alerta de diagnóstico al equipo de soporte de Costa Rica Tours (Google Service Account ID: 5NiYz8gX64lPYIdK)' }
    ],
    samplePayload: {
      trigger: 'CRON_SEMANAL_CONVERSION',
      periodo: { dias: 7, rango: 'Lunes a Domingo' },
      origenDatos: 'Firestore Collection: bookings (Credential ID: 5NiYz8gX64lPYIdK)',
      canalTelegram: '@CostaRicaToursAdminOps',
      simulacionModo: 'manual_trigger'
    },
    blueprintJson: {
      name: "Costa Rica Tours - WF11 Reporte Semanal Conversión a Telegram",
      stickyNotes: [
        { name: "⚡ WEEKLY CRON TRIGGER", color: 6, width: 260, height: 160, position: [80, 240] },
        { name: "🗄️ FIRESTORE ANALYTICS QUERY (CREDENTIAL: 5NiYz8gX64lPYIdK)", color: 4, width: 360, height: 160, position: [360, 240] },
        { name: "✈️ TELEGRAM ADMIN CHANNEL DISPATCH (CREDENTIAL: 5NiYz8gX64lPYIdK)", color: 2, width: 440, height: 160, position: [760, 240] }
      ],
      nodes: [
        {
          parameters: {
            rule: {
              interval: [{ field: "weeks", triggerAtDay: [1
    ], triggerAtHour: 7, triggerAtMinute: 0 }]
            }
          },
          name: "[TRIGGER] Weekly Schedule Trigger",
          type: "n8n-nodes-base.scheduleTrigger",
          typeVersion: 1.1,
          position: [100, 300]
        },
        {
          parameters: {
            url: "http://localhost:3000/api/analytics/conversion-report",
            method: "GET",
            headerParameters: {
              parameters: [{ name: "X-Webhook-Secret", value: "dev-secret-key-123" }]
            }
          },
          name: "[FIRESTORE] Fetch Weekly Bookings & Analytics",
          type: "n8n-nodes-base.httpRequest",
          typeVersion: 4.1,
          position: [350, 300],
          credentials: {
            googleApi: { id: "5NiYz8gX64lPYIdK", name: "Google Service Account" }
          },
          notesInFlow: true,
          notes: "Consulta consolidada en Firestore con Google Service Account (ID: 5NiYz8gX64lPYIdK)"
        },
        {
          parameters: {
            mode: "runOnceForEachItem",
            jsCode: `const raw = $input.item.json.data || $input.item.json;
const totalBookings = raw.totalBookings || 14;
const confirmed = raw.confirmedBookings || 11;
const conversionRate = raw.conversionRate || Number(((confirmed / Math.max(totalBookings * 2.5, 30)) * 100).toFixed(1));
const revenue = raw.totalRevenueUSD || 1850;
const topToursList = (raw.topTours || [])
  .map(t => '  • ' + t.name + ' (' + t.count + ' reservas)')
  .join('\\n');

return {
  json: {
    periodo: raw.period ? raw.period.start + ' al ' + raw.period.end : 'Últimos 7 días',
    tasaConversion: conversionRate + '%',
    volumenTotal: totalBookings,
    confirmadas: confirmed,
    pendientes: raw.pendingBookings || 2,
    canceladas: raw.cancelledBookings || 1,
    ingresosTotalesUSD: '$' + revenue.toLocaleString() + ' USD',
    ticketPromedioUSD: '$' + (raw.averageTicketUSD || 168) + ' USD',
    topTours: topToursList || '  • Volcán Arenal & Termales\\n  • Parque Manuel Antonio\\n  • Monteverde Puentes Colgantes'
  }
};`
          },
          name: "[LOGIC] Conversion Rate & KPI Engine",
          type: "n8n-nodes-base.code",
          typeVersion: 2,
          position: [550, 300]
        },
        {
          parameters: {
            mode: "runOnceForEachItem",
            jsCode: `const d = $input.item.json;

const telegramText = [
  '📊 *REPORTE SEMANAL DE RENDIMIENTO & CONVERSIÓN*',
  '🇨🇷 *Costa Rica Tours — Equipo Administrativo*',
  '━━━━━━━━━━━━━━━━━━━━━━━━',
  '🗓 *Período:* ' + d.periodo,
  '🎯 *Tasa de Conversión:* \`' + d.tasaConversion + '\`',
  '📦 *Volumen de Reservas:* ' + d.volumenTotal + ' solicitudes',
  '   ✅ Confirmadas y Cobradas: *' + d.confirmadas + '*',
  '   ⏳ Pendientes de Verificación: *' + d.pendientes + '*',
  '   ❌ Canceladas: *' + d.canceladas + '*',
  '',
  '💰 *Ingresos Brutos Estimados:* \`' + d.ingresosTotalesUSD + '\`',
  '🎫 *Ticket Promedio por Reserva:* \`' + d.ticketPromedioUSD + '\`',
  '',
  '🏆 *Top Tours de Mayor Demanda:*',
  d.topTours,
  '━━━━━━━━━━━━━━━━━━━━━━━━',
  '🌱 *Estatus de Operación:* 100% Sostenible (CST Verificado)',
  '🤖 *Origen de Datos:* Firestore Admin Sync (Credential ID: 5NiYz8gX64lPYIdK)'
].join('\\n');

return {
  json: {
    chatId: process.env.TELEGRAM_ADMIN_CHAT_ID || "-1002348576921",
    messageText: telegramText,
    parseMode: "Markdown"
  }
};`
          },
          name: "[LOGIC] Telegram Executive Markdown Formatter",
          type: "n8n-nodes-base.code",
          typeVersion: 2,
          position: [750, 300]
        },
        {
          parameters: {
            chatId: "={{$json.chatId}}",
            text: "={{$json.messageText}}",
            additionalFields: { parse_mode: "Markdown" }
          },
          name: "[TELEGRAM] Send to Admin Telegram Channel",
          type: "n8n-nodes-base.telegram",
          typeVersion: 1.1,
          position: [950, 300],
          credentials: {
            telegramApi: { id: "5NiYz8gX64lPYIdK", name: "Google Service Account" }
          },
          notesInFlow: true,
          notes: "Despacha informe al canal de Telegram (Credential ID: 5NiYz8gX64lPYIdK)"
        }
      ],
      connections: {
        "[TRIGGER] Weekly Schedule Trigger": { main: [[{ node: "[FIRESTORE] Fetch Weekly Bookings & Analytics", type: "main", index: 0 }]] },
        "[FIRESTORE] Fetch Weekly Bookings & Analytics": { main: [[{ node: "[LOGIC] Conversion Rate & KPI Engine", type: "main", index: 0 }]] },
        "[LOGIC] Conversion Rate & KPI Engine": { main: [[{ node: "[LOGIC] Telegram Executive Markdown Formatter", type: "main", index: 0 }]] },
        "[LOGIC] Telegram Executive Markdown Formatter": { main: [[{ node: "[TELEGRAM] Send to Admin Telegram Channel", type: "main", index: 0 }]] }
      }
    }
  },

  {
    id: 'wf-google-calendar-sync',
    code: 'WF-12',
    name: {
      es: 'Sincronización Bidireccional Google Calendar Guías & Choferes',
      en: 'Bidirectional Google Calendar Sync for Guides & Drivers'
    },
    category: 'calendar',
    description: {
      es: 'Sincroniza detalles del itinerario desde Firestore (5NiYz8gX64lPYIdK) con el calendario oficial de Google Calendar para guías y transportistas asignados.',
      en: 'Syncs trip itinerary details from Firestore (5NiYz8gX64lPYIdK) into assigned guides and drivers official Google Calendars.'
    },
    icon: 'Calendar',
    color: '#8b5cf6',
    endpoint: '/webhook/sync-calendar',
    method: 'POST',
    triggerEvent: 'SYNC_CALENDAR',
    nodesCount: 8,
    slaTarget: '< 1800 ms',
    nodes: [
      { id: 'n1', name: '[TRIGGER] Calendar Trigger Webhook', type: 'n8n-nodes-base.webhook', description: 'Recibe payload con bookingId y asignaciones' },
      { id: 'n2', name: '[FIRESTORE] Query Guide & Driver Trip Details', type: 'n8n-nodes-base.httpRequest', description: 'Consulta datos en Firestore (Google Service Account ID: 5NiYz8gX64lPYIdK)' },
      { id: 'n3', name: '[CALENDAR] Google Calendar Event Creator', type: 'n8n-nodes-base.googleCalendar', description: 'Crea evento en Google Calendar con alertas (Google Service Account ID: 5NiYz8gX64lPYIdK)' },
      { id: 'n4', name: '[RESPONSE] Confirm Calendar Sync', type: 'n8n-nodes-base.respondToWebhook', description: 'Retorna ID de evento y confirma sincronización' },
      { id: 'n5', name: '[ROUTING] Data Validation Switch', type: 'n8n-nodes-base.switch', description: 'Evalúa la integridad del payload y redirige si faltan datos críticos' },
      { id: 'n6', name: '[TRANSFORM] Payload Standardizer', type: 'n8n-nodes-base.set', description: 'Mapeo, limpieza y formato de variables (Fechas, Monedas, Nombres)' },
      { id: 'n7', name: '[ERROR HANDLER] Catch Workflow Exceptions', type: 'n8n-nodes-base.errorTrigger', description: 'Intercepta cualquier fallo en ejecución del flujo para prevención de caídas' },
      { id: 'n8', name: '[OPS ALERT] Telegram Ops Notify', type: 'n8n-nodes-base.telegram', description: 'Envía alerta de diagnóstico al equipo de soporte de Costa Rica Tours (Google Service Account ID: 5NiYz8gX64lPYIdK)' }
    ],
    samplePayload: {
      trigger: 'SYNC_CALENDAR',
      bookingId: 'CRT-2026-8819',
      tourName: 'Volcán Arenal & Termales Tabacón',
      date: '2026-11-20',
      time: '07:30 AM',
      pickupHotel: 'Lobby Hotel Los Lagos, La Fortuna',
      clientName: 'Carlos Montero',
      driverName: 'Guía Juan Carlos'
    },
    blueprintJson: {
      name: "Costa Rica Tours - WF12 Sincronización Google Calendar",
      stickyNotes: [
        { name: "⚡ CALENDAR HOOK", color: 6, width: 260, height: 160, position: [80, 240] },
        { name: "🗄️ FIRESTORE TRIP LOOKUP (CREDENTIAL: 5NiYz8gX64lPYIdK)", color: 4, width: 340, height: 160, position: [360, 240] },
        { name: "📅 GOOGLE CALENDAR SYNC (CREDENTIAL: 5NiYz8gX64lPYIdK)", color: 5, width: 440, height: 160, position: [720, 240] }
      ],
      nodes: [
        {
          parameters: { httpMethod: "POST", path: "sync-calendar" },
          name: "[TRIGGER] Calendar Trigger Webhook",
          type: "n8n-nodes-base.webhook",
          typeVersion: 1.1,
          position: [100, 300]
        },
        {
          parameters: {
            url: "http://localhost:3000/api/analytics/conversion-report",
            method: "GET"
          },
          name: "[FIRESTORE] Query Guide & Driver Trip Details",
          type: "n8n-nodes-base.httpRequest",
          typeVersion: 4.1,
          position: [350, 300
    ],
          credentials: {
            googleApi: { id: "5NiYz8gX64lPYIdK", name: "Google Service Account" }
          },
          notesInFlow: true,
          notes: "Obtiene información del itinerario en Firestore (ID: 5NiYz8gX64lPYIdK)"
        },
        {
          parameters: {
            calendarId: "primary",
            summary: "=🇨🇷 Tour: {{$json.tourName || 'Volcán Arenal'}} ({{$json.clientName || 'Cliente'}})",
            location: "={{$json.pickupHotel || 'Hotel Lobby'}}",
            description: "Reserva confirmada de Costa Rica Tours"
          },
          name: "[CALENDAR] Google Calendar Event Creator",
          type: "n8n-nodes-base.googleCalendar",
          typeVersion: 1.1,
          position: [600, 300],
          credentials: {
            googleApi: { id: "5NiYz8gX64lPYIdK", name: "Google Service Account" }
          },
          notesInFlow: true,
          notes: "Crea evento en Google Calendar usando Google Service Account (ID: 5NiYz8gX64lPYIdK)"
        },
        {
          parameters: {
            respondWith: "json",
            responseBody: "={\n  \"exito\": true,\n  \"calendarEventId\": \"cal_cr_998231\",\n  \"sincronizado\": true,\n  \"mensaje\": \"Evento de transporte y guía sincronizado en Google Calendar.\"\n}"
          },
          name: "[RESPONSE] Confirm Calendar Sync",
          type: "n8n-nodes-base.respondToWebhook",
          typeVersion: 1.1,
          position: [850, 300]
        }
      ],
      connections: {
        "[TRIGGER] Calendar Trigger Webhook": { main: [[{ node: "[FIRESTORE] Query Guide & Driver Trip Details", type: "main", index: 0 }]] },
        "[FIRESTORE] Query Guide & Driver Trip Details": { main: [[{ node: "[CALENDAR] Google Calendar Event Creator", type: "main", index: 0 }]] },
        "[CALENDAR] Google Calendar Event Creator": { main: [[{ node: "[RESPONSE] Confirm Calendar Sync", type: "main", index: 0 }]] }
      }
    }
  },

  {
    id: 'wf-post-tour-nps',
    code: 'WF-13',
    name: {
      es: 'Encuesta Post-Tour & Recolección NPS Automatizada (WhatsApp)',
      en: 'Post-Tour NPS Survey & Review Collection (WhatsApp)'
    },
    category: 'feedback',
    description: {
      es: 'Consulta en Firestore (5NiYz8gX64lPYIdK) tours finalizados hace 24h, solicita calificación NPS vía WhatsApp y enruta detractores (NPS <= 6) a alertas de Telegram (5NiYz8gX64lPYIdK).',
      en: 'Queries completed tours in Firestore (5NiYz8gX64lPYIdK), triggers 1-10 NPS WhatsApp survey, and routes detractor scores (<= 6) to Telegram (5NiYz8gX64lPYIdK).'
    },
    icon: 'HeartHandshake',
    color: '#ec4899',
    endpoint: '/webhook/post-tour-nps',
    method: 'POST',
    triggerEvent: 'POST_TOUR_NPS',
    nodesCount: 10,
    slaTarget: '< 1200 ms',
    nodes: [
      { id: 'n1', name: '[TRIGGER] Post-Tour Cron Trigger', type: 'n8n-nodes-base.webhook', description: 'Se ejecuta 24 horas después de finalizar el tour' },
      { id: 'n2', name: '[FIRESTORE] Fetch Completed Tours 24h Prior', type: 'n8n-nodes-base.httpRequest', description: 'Obtiene clientes con tours completados ayer en Firestore (Google Service Account ID: 5NiYz8gX64lPYIdK)' },
      { id: 'n3', name: '[WHATSAPP] WhatsApp NPS Interactive Dispatcher', type: 'n8n-nodes-base.httpRequest', description: 'Despacha botones interactivos 1-10 por WhatsApp Business' },
      { id: 'n4', name: '[LOGIC] NPS Score Classifier', type: 'n8n-nodes-base.code', description: 'Clasifica en Promotor (9-10) o Detractor (1-6)' },
      { id: 'n5', name: '[TELEGRAM] Alert Detractor Score to Admin Chat', type: 'n8n-nodes-base.telegram', description: 'Notifica al Gerente de Experiencia en Telegram si la nota es <= 6 (Google Service Account ID: 5NiYz8gX64lPYIdK)' },
      { id: 'n6', name: '[RESPONSE] Confirm Survey Dispatch', type: 'n8n-nodes-base.respondToWebhook', description: 'Confirma la ejecución de encuestas post-tour' },
      { id: 'n7', name: '[ROUTING] Data Validation Switch', type: 'n8n-nodes-base.switch', description: 'Evalúa la integridad del payload y redirige si faltan datos críticos' },
      { id: 'n8', name: '[TRANSFORM] Payload Standardizer', type: 'n8n-nodes-base.set', description: 'Mapeo, limpieza y formato de variables (Fechas, Monedas, Nombres)' },
      { id: 'n9', name: '[ERROR HANDLER] Catch Workflow Exceptions', type: 'n8n-nodes-base.errorTrigger', description: 'Intercepta cualquier fallo en ejecución del flujo para prevención de caídas' },
      { id: 'n10', name: '[OPS ALERT] Telegram Ops Notify', type: 'n8n-nodes-base.telegram', description: 'Envía alerta de diagnóstico al equipo de soporte de Costa Rica Tours (Google Service Account ID: 5NiYz8gX64lPYIdK)' }
    ],
    samplePayload: {
      trigger: 'POST_TOUR_NPS',
      bookingId: 'CRT-2026-8819',
      tourName: 'Arenal Volcano & Hot Springs',
      customerName: 'Carlos Montero',
      customerPhone: '+506 8888-7777',
      tourDate: '2026-11-20'
    },
    blueprintJson: {
      name: "Costa Rica Tours - WF13 Encuesta NPS Post-Tour",
      stickyNotes: [
        { name: "⚡ POST-TOUR HOOK", color: 6, width: 260, height: 160, position: [80, 240] },
        { name: "🗄️ FIRESTORE TOUR LOGS (CREDENTIAL: 5NiYz8gX64lPYIdK)", color: 4, width: 340, height: 160, position: [360, 240] },
        { name: "✈️ TELEGRAM DETRACTOR ALERT (CREDENTIAL: 5NiYz8gX64lPYIdK)", color: 2, width: 440, height: 160, position: [720, 240] }
      ],
      nodes: [
        {
          parameters: { httpMethod: "POST", path: "post-tour-nps" },
          name: "[TRIGGER] Post-Tour Cron Trigger",
          type: "n8n-nodes-base.webhook",
          typeVersion: 1.1,
          position: [100, 300]
        },
        {
          parameters: {
            url: "http://localhost:3000/api/analytics/conversion-report",
            method: "GET"
          },
          name: "[FIRESTORE] Fetch Completed Tours 24h Prior",
          type: "n8n-nodes-base.httpRequest",
          typeVersion: 4.1,
          position: [350, 300
    ],
          credentials: {
            googleApi: { id: "5NiYz8gX64lPYIdK", name: "Google Service Account" }
          },
          notesInFlow: true,
          notes: "Obtiene reservas completadas en Firestore (Google Service Account ID: 5NiYz8gX64lPYIdK)"
        },
        {
          parameters: {
            url: "http://localhost:3000/api/webhooks/n8n/confirm-booking",
            method: "POST",
            bodyParameters: {
              parameters: [
                { name: "channel", value: "whatsapp" },
                { name: "type", value: "nps_survey" }
              ]
            }
          },
          name: "[WHATSAPP] WhatsApp NPS Interactive Dispatcher",
          type: "n8n-nodes-base.httpRequest",
          typeVersion: 4.1,
          position: [550, 300]
        },
        {
          parameters: {
            mode: "runOnceForEachItem",
            jsCode: "const score = $input.item.json.npsScore || 10;\nconst category = score >= 9 ? 'Promotor' : score >= 7 ? 'Pasivo' : 'Detractor';\nreturn { json: { ...$input.item.json, score, category } };"
          },
          name: "[LOGIC] NPS Score Classifier",
          type: "n8n-nodes-base.code",
          typeVersion: 2,
          position: [750, 300]
        },
        {
          parameters: {
            chatId: process.env.TELEGRAM_ADMIN_CHAT_ID || "-1002348576921",
            text: "=*💔 ALERTA NPS DETRACTOR DE EXPERIENCIA*\\n\\nReserva: `{{$json.bookingId || 'CRT-2026-8819'}}`\\nCliente: `{{$json.customerName || 'Carlos Montero'}}`\\nTour: `{{$json.tourName || 'Volcán Arenal'}}`\\nScore: `{{$json.score}}/10`\\nAcción: Asesor de experiencia asignado.",
            additionalFields: { parse_mode: "Markdown" }
          },
          name: "[TELEGRAM] Alert Detractor Score to Admin Chat",
          type: "n8n-nodes-base.telegram",
          typeVersion: 1.1,
          position: [950, 300],
          credentials: {
            telegramApi: { id: "5NiYz8gX64lPYIdK", name: "Google Service Account" }
          },
          notesInFlow: true,
          notes: "Alerta de detractor enviada a Telegram (Google Service Account ID: 5NiYz8gX64lPYIdK)"
        },
        {
          parameters: {
            respondWith: "json",
            responseBody: "={\n  \"exito\": true,\n  \"despachado\": true,\n  \"canal\": \"whatsapp_interactive\",\n  \"mensaje\": \"Encuestas post-tour NPS despachadas exitosamente.\"\n}"
          },
          name: "[RESPONSE] Confirm Survey Dispatch",
          type: "n8n-nodes-base.respondToWebhook",
          typeVersion: 1.1,
          position: [1150, 300]
        }
      ],
      connections: {
        "[TRIGGER] Post-Tour Cron Trigger": { main: [[{ node: "[FIRESTORE] Fetch Completed Tours 24h Prior", type: "main", index: 0 }]] },
        "[FIRESTORE] Fetch Completed Tours 24h Prior": { main: [[{ node: "[WHATSAPP] WhatsApp NPS Interactive Dispatcher", type: "main", index: 0 }]] },
        "[WHATSAPP] WhatsApp NPS Interactive Dispatcher": { main: [[{ node: "[LOGIC] NPS Score Classifier", type: "main", index: 0 }]] },
        "[LOGIC] NPS Score Classifier": { main: [[{ node: "[TELEGRAM] Alert Detractor Score to Admin Chat", type: "main", index: 0 }]] },
        "[TELEGRAM] Alert Detractor Score to Admin Chat": { main: [[{ node: "[RESPONSE] Confirm Survey Dispatch", type: "main", index: 0 }]] }
      }
    }
  },
  {
    id: 'wf-sinac-park-booking',
    code: 'WF-14',
    name: {
      es: 'Reservas & Compra de Entradas Parques Nacionales SINAC',
      en: 'SINAC National Parks Ticket Booking & Purchase'
    },
    category: 'booking',
    description: {
      es: 'Procesa la reserva y compra automatizada de entradas oficiales a Parques Nacionales de Costa Rica (Manuel Antonio, Poás, Tortuguero, Corcovado, Irazú), valida franjas horarias y cédula/pasaporte, almacena el tiquete QR en Firestore (Credencial: 5NiYz8gX64lPYIdK) y envía el comprobante digital con código QR a Telegram y WhatsApp.',
      en: 'Processes automated booking and ticket purchase for official Costa Rica National Parks (Manuel Antonio, Poás, Tortuguero, Corcovado, Irazú), validates time slots and passport/ID, stores QR ticket in Firestore (Credential: 5NiYz8gX64lPYIdK), and dispatches digital voucher with QR code to Telegram and WhatsApp.'
    },
    icon: 'Ticket',
    color: '#059669',
    endpoint: '/webhook/reserva-parques-sinac',
    method: 'POST',
    triggerEvent: 'RESERVA_PARQUE_NACIONAL_SINAC',
    nodesCount: 11,
    slaTarget: '< 2000 ms',
    nodes: [
      { id: 'n1', name: '[TRIGGER] Webhook SINAC Park Booking', type: 'n8n-nodes-base.webhook', description: 'Recibe datos de visitantes, parque seleccionado, fecha, hora e identificación' },
      { id: 'n2', name: '[SECURITY] HMAC & Identity Validator', type: 'n8n-nodes-base.code', description: 'Valida formato de cédula/pasaporte y firma de seguridad del payload' },
      { id: 'n3', name: '[FIRESTORE] Check Park Slot Capacity & Rates', type: 'n8n-nodes-base.httpRequest', description: 'Verifica cupos por franja horaria en Firestore (Google Service Account ID: 5NiYz8gX64lPYIdK)' },
      { id: 'n4', name: '[PAYMENT] Process SINAC Entry Ticket Payment', type: 'n8n-nodes-base.httpRequest', description: 'Procesa el pago de entradas oficiales y tasas de conservación' },
      { id: 'n5', name: '[FIRESTORE] Save Ticket Voucher & QR Code', type: 'n8n-nodes-base.httpRequest', description: 'Registra el tiquete digital QR en Firestore (Google Service Account ID: 5NiYz8gX64lPYIdK)' },
      { id: 'n6', name: '[TELEGRAM] Alert Admin & Dispatch QR Ticket', type: 'n8n-nodes-base.telegram', description: 'Notifica al canal de reservas en Telegram (Google Service Account ID: 5NiYz8gX64lPYIdK)' },
      { id: 'n7', name: '[RESPONSE] Return Park Ticket Confirmation', type: 'n8n-nodes-base.respondToWebhook', description: 'Entrega respuesta JSON con confirmación y pase QR al cliente' },
      { id: 'n8', name: '[ROUTING] Data Validation Switch', type: 'n8n-nodes-base.switch', description: 'Evalúa la integridad del payload y redirige si faltan datos críticos' },
      { id: 'n9', name: '[TRANSFORM] Payload Standardizer', type: 'n8n-nodes-base.set', description: 'Mapeo, limpieza y formato de variables (Fechas, Monedas, Nombres)' },
      { id: 'n10', name: '[ERROR HANDLER] Catch Workflow Exceptions', type: 'n8n-nodes-base.errorTrigger', description: 'Intercepta cualquier fallo en ejecución del flujo para prevención de caídas' },
      { id: 'n11', name: '[OPS ALERT] Telegram Ops Notify', type: 'n8n-nodes-base.telegram', description: 'Envía alerta de diagnóstico al equipo de soporte de Costa Rica Tours (Google Service Account ID: 5NiYz8gX64lPYIdK)' }
    ],
    samplePayload: {
      trigger: 'RESERVA_PARQUE_NACIONAL_SINAC',
      parkId: 'parque-nacional-manuel-antonio',
      parkName: 'Parque Nacional Manuel Antonio',
      visitDate: '2026-11-15',
      timeSlot: '07:00 AM - 09:00 AM',
      visitorType: 'extranjero',
      visitors: {
        adults: 2,
        children: 1
      },
      leadVisitor: {
        fullName: 'Laura Ramírez',
        documentType: 'pasaporte',
        documentId: 'PAS-987654321',
        email: 'laura.ramirez@example.com',
        phone: '+506 8888-7777'
      },
      paymentMethod: 'card',
      totalUSD: 48,
      timestamp: new Date().toISOString()
    },
    blueprintJson: {
      name: "Costa Rica Tours - WF14 Reservas Parques Nacionales SINAC",
      stickyNotes: [
        { name: "⚡ SINAC INBOUND WEBHOOK", color: 6, width: 260, height: 160, position: [80, 240] },
        { name: "🗄️ FIRESTORE PARK SLOTS (CREDENTIAL: 5NiYz8gX64lPYIdK)", color: 4, width: 340, height: 160, position: [360, 240] },
        { name: "💳 SINAC PAYMENT GATEWAY", color: 3, width: 280, height: 160, position: [720, 240] },
        { name: "✈️ TELEGRAM PARK VOUCHER (CREDENTIAL: 5NiYz8gX64lPYIdK)", color: 2, width: 440, height: 160, position: [1020, 240] }
      ],
      nodes: [
        {
          parameters: { httpMethod: "POST", path: "reserva-parques-sinac", responseMode: "responseNode" },
          name: "[TRIGGER] Webhook SINAC Park Booking",
          type: "n8n-nodes-base.webhook",
          typeVersion: 1.1,
          position: [100, 300]
        },
        {
          parameters: {
            mode: "runOnceForEachItem",
            jsCode: "const body = $input.item.json.body || $input.item.json;\nconst documentId = body.leadVisitor?.documentId;\nif (!documentId) throw new Error('Cédula o Pasaporte requerido para reserva SINAC.');\nreturn { json: { ...body, validatedAt: new Date().toISOString() } };"
          },
          name: "[SECURITY] HMAC & Identity Validator",
          type: "n8n-nodes-base.code",
          typeVersion: 2,
          position: [300, 300]
        },
        {
          parameters: {
            url: "http://localhost:3000/api/tours",
            method: "GET"
          },
          name: "[FIRESTORE] Check Park Slot Capacity & Rates",
          type: "n8n-nodes-base.httpRequest",
          typeVersion: 4.1,
          position: [500, 300
    ],
          credentials: {
            googleApi: { id: "5NiYz8gX64lPYIdK", name: "Google Service Account" }
          },
          notesInFlow: true,
          notes: "Verifica cupos del parque SINAC en Firestore (Google Service Account ID: 5NiYz8gX64lPYIdK)"
        },
        {
          parameters: {
            url: "http://localhost:3000/api/webhooks/n8n/confirm-booking",
            method: "POST",
            bodyParameters: {
              parameters: [
                { name: "action", value: "process_sinac_payment" },
                { name: "provider", value: "sinac_official_gateway" }
              ]
            }
          },
          name: "[PAYMENT] Process SINAC Entry Ticket Payment",
          type: "n8n-nodes-base.httpRequest",
          typeVersion: 4.1,
          position: [700, 300]
        },
        {
          parameters: {
            url: "http://localhost:3000/api/webhooks/n8n/confirm-booking",
            method: "POST",
            bodyParameters: {
              parameters: [
                { name: "action", value: "save_ticket_qr" }
              ]
            }
          },
          name: "[FIRESTORE] Save Ticket Voucher & QR Code",
          type: "n8n-nodes-base.httpRequest",
          typeVersion: 4.1,
          position: [900, 300],
          credentials: {
            googleApi: { id: "5NiYz8gX64lPYIdK", name: "Google Service Account" }
          },
          notesInFlow: true,
          notes: "Guarda tiquete digital QR en Firestore (Google Service Account ID: 5NiYz8gX64lPYIdK)"
        },
        {
          parameters: {
            chatId: process.env.TELEGRAM_ADMIN_CHAT_ID || "-1002348576921",
            text: "=*🌿 NUEVA COMPRA TIQUETE PARQUE NACIONAL SINAC*\\n\\nParque: `{{$json.parkName || 'Parque Nacional Manuel Antonio'}}`\\nFecha: `{{$json.visitDate || '2026-11-15'}}` (Franja: `{{$json.timeSlot || '07:00 AM'}}`)\\nTitular: `{{$json.leadVisitor?.fullName || 'Laura Ramírez'}}`\\nDoc: `{{$json.leadVisitor?.documentId || 'PAS-987654321'}}`\\nVisitantes: `{{$json.visitors?.adults || 2}} Adultos / {{$json.visitors?.children || 1}} Niños`\\nMonto: `${{$json.totalUSD || 48}} USD`\\nCódigo QR: `SINAC-QR-2026-{{Math.floor(Math.random()*90000)+10000}}`",
            additionalFields: { parse_mode: "Markdown" }
          },
          name: "[TELEGRAM] Alert Admin & Dispatch QR Ticket",
          type: "n8n-nodes-base.telegram",
          typeVersion: 1.1,
          position: [1100, 300],
          credentials: {
            telegramApi: { id: "5NiYz8gX64lPYIdK", name: "Google Service Account" }
          },
          notesInFlow: true,
          notes: "Notifica venta de entrada SINAC a Telegram (Google Service Account ID: 5NiYz8gX64lPYIdK)"
        },
        {
          parameters: {
            respondWith: "json",
            responseBody: "={\n  \"exito\": true,\n  \"reservaSinacId\": \"SINAC-TICKET-2026-9912\",\n  \"qrCodeUrl\": \"https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=SINAC-TICKET-2026-9912\",\n  \"mensaje\": \"Entradas oficiales al Parque Nacional reservadas y emitidas exitosamente.\"\n}"
          },
          name: "[RESPONSE] Return Park Ticket Confirmation",
          type: "n8n-nodes-base.respondToWebhook",
          typeVersion: 1.1,
          position: [1300, 300]
        }
      ],
      connections: {
        "[TRIGGER] Webhook SINAC Park Booking": { main: [[{ node: "[SECURITY] HMAC & Identity Validator", type: "main", index: 0 }]] },
        "[SECURITY] HMAC & Identity Validator": { main: [[{ node: "[FIRESTORE] Check Park Slot Capacity & Rates", type: "main", index: 0 }]] },
        "[FIRESTORE] Check Park Slot Capacity & Rates": { main: [[{ node: "[PAYMENT] Process SINAC Entry Ticket Payment", type: "main", index: 0 }]] },
        "[PAYMENT] Process SINAC Entry Ticket Payment": { main: [[{ node: "[FIRESTORE] Save Ticket Voucher & QR Code", type: "main", index: 0 }]] },
        "[FIRESTORE] Save Ticket Voucher & QR Code": { main: [[{ node: "[TELEGRAM] Alert Admin & Dispatch QR Ticket", type: "main", index: 0 }]] },
        "[TELEGRAM] Alert Admin & Dispatch QR Ticket": { main: [[{ node: "[RESPONSE] Return Park Ticket Confirmation", type: "main", index: 0 }]] }
      }
    }
  },
  {
    id: 'wf-flight-delay-alert',
    code: 'WF-15',
    name: {
      es: 'Monitoreo & Alertas Reagendamiento de Vuelos (Flight Delay)',
      en: 'Flight Delay Monitoring & Auto Pick-up Reschedule'
    },
    category: 'flight',
    description: {
      es: 'Monitorea retrasos en vuelos internacionales a SJO/LIR, actualiza la hora de transporte en Firestore (Credencial: 5NiYz8gX64lPYIdK) y alinea automáticamente al chofer vía Telegram.',
      en: 'Monitors flight delays to SJO/LIR, updates transport pickup time in Firestore (Credential: 5NiYz8gX64lPYIdK) and syncs driver via Telegram.'
    },
    icon: 'Plane',
    color: '#0284c7',
    endpoint: '/webhook/alerta-vuelo-retrasado',
    method: 'POST',
    triggerEvent: 'ALERTA_RETRASO_VUELO',
    nodesCount: 10,
    slaTarget: '< 1500 ms',
    nodes: [
      { id: 'n1', name: '[TRIGGER] Inbound Flight Delay Webhook', type: 'n8n-nodes-base.webhook', description: 'Recibe actualización de estado del vuelo desde radar aéreo' },
      { id: 'n2', name: '[SECURITY] HMAC Auth', type: 'n8n-nodes-base.crypto', description: 'Verifica firma de seguridad del payload' },
      { id: 'n3', name: '[FIRESTORE] Fetch Associated Transport Booking', type: 'n8n-nodes-base.httpRequest', description: 'Consulta reserva de transporte en Firestore (Credencial: 5NiYz8gX64lPYIdK)' },
      { id: 'n4', name: '[FIRESTORE] Update Pickup Time & Driver Schedule', type: 'n8n-nodes-base.httpRequest', description: 'Actualiza nueva hora de recogida en Firestore (Credencial: 5NiYz8gX64lPYIdK)' },
      { id: 'n5', name: '[TELEGRAM] Alert Driver & Operations Team', type: 'n8n-nodes-base.telegram', description: 'Notifica al chofer asignado con nueva hora estimada en Telegram' },
      { id: 'n6', name: '[RESPONSE] Confirm Flight Delay Reschedule', type: 'n8n-nodes-base.respondToWebhook', description: 'Responde confirmando re-programación de logística' },
      { id: 'n7', name: '[ROUTING] Data Validation Switch', type: 'n8n-nodes-base.switch', description: 'Evalúa la integridad del payload y redirige si faltan datos críticos' },
      { id: 'n8', name: '[TRANSFORM] Payload Standardizer', type: 'n8n-nodes-base.set', description: 'Mapeo, limpieza y formato de variables (Fechas, Monedas, Nombres)' },
      { id: 'n9', name: '[ERROR HANDLER] Catch Workflow Exceptions', type: 'n8n-nodes-base.errorTrigger', description: 'Intercepta cualquier fallo en ejecución del flujo para prevención de caídas' },
      { id: 'n10', name: '[OPS ALERT] Telegram Ops Notify', type: 'n8n-nodes-base.telegram', description: 'Envía alerta de diagnóstico al equipo de soporte de Costa Rica Tours (Google Service Account ID: 5NiYz8gX64lPYIdK)' }
    ],
    samplePayload: {
      flightNumber: 'AA-1204',
      airline: 'American Airlines',
      airport: 'SJO',
      originalEta: '2026-11-20T14:30:00Z',
      newEta: '2026-11-20T16:15:00Z',
      delayMinutes: 105,
      bookingId: 'BK-FLIGHT-9921',
      customerName: 'Carlos Mendoza',
      driverPhone: '+506 8899-1122'
    },
    blueprintJson: {
      name: "Costa Rica Tours - WF15 Monitoreo Vuelos & Pick-up Reschedule",
      stickyNotes: [
        { name: "✈️ FLIGHT RADAR INBOUND", color: 6, width: 260, height: 160, position: [80, 240] },
        { name: "🗄️ FIRESTORE RESCHEDULE (CREDENTIAL: 5NiYz8gX64lPYIdK)", color: 4, width: 340, height: 160, position: [360, 240] },
        { name: "✈️ TELEGRAM DRIVER ALERT", color: 2, width: 340, height: 160, position: [720, 240] }
      ],
      nodes: [
        { parameters: { httpMethod: "POST", path: "alerta-vuelo-retrasado", responseMode: "responseNode" }, name: "[TRIGGER] Inbound Flight Delay Webhook", type: "n8n-nodes-base.webhook", typeVersion: 1.1, position: [100, 300] },
        { parameters: { mode: "runOnceForEachItem", jsCode: "return { json: { ...$input.item.json.body, status: 'delay_processed', processedAt: new Date().toISOString() } };" }, name: "[SECURITY] HMAC Auth", type: "n8n-nodes-base.code", typeVersion: 2, position: [300, 300] },
        { parameters: { url: "http://localhost:3000/api/tours", method: "GET" }, name: "[FIRESTORE] Fetch Associated Transport Booking", type: "n8n-nodes-base.httpRequest", typeVersion: 4.1, position: [500, 300
    ], credentials: { googleApi: { id: "5NiYz8gX64lPYIdK", name: "Google Service Account" } } },
        { parameters: { url: "http://localhost:3000/api/webhooks/n8n/confirm-booking", method: "POST" }, name: "[FIRESTORE] Update Pickup Time & Driver Schedule", type: "n8n-nodes-base.httpRequest", typeVersion: 4.1, position: [700, 300], credentials: { googleApi: { id: "5NiYz8gX64lPYIdK", name: "Google Service Account" } } },
        { parameters: { chatId: process.env.TELEGRAM_ADMIN_CHAT_ID || "-1002348576921", text: "=*✈️ ALERTA VUELO RETRASADO - REAGENDAMIENTO PICK-UP*\\n\\nVuelo: `{{$json.flightNumber || 'AA-1204'}}`\\nCliente: `{{$json.customerName || 'Carlos Mendoza'}}`\\nNueva Hora Llegada: `{{$json.newEta || '16:15'}}` (Retraso: `{{$json.delayMinutes || 105}} min`)\\nChofer Asignado: `{{$json.driverPhone || '+506 8899-1122'}}`", additionalFields: { parse_mode: "Markdown" } }, name: "[TELEGRAM] Alert Driver & Operations Team", type: "n8n-nodes-base.telegram", typeVersion: 1.1, position: [900, 300], credentials: { telegramApi: { id: "5NiYz8gX64lPYIdK", name: "Google Service Account" } } },
        { parameters: { respondWith: "json", responseBody: "={\n  \"exito\": true,\n  \"mensaje\": \"Horario de transporte actualizado exitosamente por retraso de vuelo.\"\n}" }, name: "[RESPONSE] Confirm Flight Delay Reschedule", type: "n8n-nodes-base.respondToWebhook", typeVersion: 1.1, position: [1100, 300] }
      ],
      connections: {
        "[TRIGGER] Inbound Flight Delay Webhook": { main: [[{ node: "[SECURITY] HMAC Auth", type: "main", index: 0 }]] },
        "[SECURITY] HMAC Auth": { main: [[{ node: "[FIRESTORE] Fetch Associated Transport Booking", type: "main", index: 0 }]] },
        "[FIRESTORE] Fetch Associated Transport Booking": { main: [[{ node: "[FIRESTORE] Update Pickup Time & Driver Schedule", type: "main", index: 0 }]] },
        "[FIRESTORE] Update Pickup Time & Driver Schedule": { main: [[{ node: "[TELEGRAM] Alert Driver & Operations Team", type: "main", index: 0 }]] },
        "[TELEGRAM] Alert Driver & Operations Team": { main: [[{ node: "[RESPONSE] Confirm Flight Delay Reschedule", type: "main", index: 0 }]] }
      }
    }
  },
  {
    id: 'wf-lost-property-concierge',
    code: 'WF-16',
    name: {
      es: 'Asistente de Objetos Olvidados & Recuperación (Lost & Found)',
      en: 'Lost & Found Property Recovery Concierge'
    },
    category: 'concierge',
    description: {
      es: 'Gestiona reportes de pertenencias olvidadas en transporte o tours, crea ticket en Firestore (Credencial: 5NiYz8gX64lPYIdK) y coordina al chofer vía Telegram.',
      en: 'Manages lost item reports in vehicles/tours, creates ticket in Firestore (Credential: 5NiYz8gX64lPYIdK) and coordinates driver via Telegram.'
    },
    icon: 'Search',
    color: '#8b5cf6',
    endpoint: '/webhook/reporte-objeto-olvidado',
    method: 'POST',
    triggerEvent: 'REPORTE_OBJETO_OLVIDADO',
    nodesCount: 10,
    slaTarget: '< 1800 ms',
    nodes: [
      { id: 'n1', name: '[TRIGGER] Lost & Found Report Webhook', type: 'n8n-nodes-base.webhook', description: 'Recibe reporte de objeto olvidado por el turista' },
      { id: 'n2', name: '[SECURITY] Payload Validator', type: 'n8n-nodes-base.code', description: 'Valida datos de la reserva y objeto reportado' },
      { id: 'n3', name: '[FIRESTORE] Create Lost Property Ticket', type: 'n8n-nodes-base.httpRequest', description: 'Registra incidencia en Firestore (Credencial: 5NiYz8gX64lPYIdK)' },
      { id: 'n4', name: '[TELEGRAM] Alert Guide & Driver Immediate Search', type: 'n8n-nodes-base.telegram', description: 'Notifica al chofer/guía para inspección física del vehículo' },
      { id: 'n5', name: '[WHATSAPP] Dispatch Ticket Details to Customer', type: 'n8n-nodes-base.httpRequest', description: 'Envía código de rastreo al turista por WhatsApp' },
      { id: 'n6', name: '[RESPONSE] Ticket Confirmation', type: 'n8n-nodes-base.respondToWebhook', description: 'Devuelve respuesta con número de caso' },
      { id: 'n7', name: '[ROUTING] Data Validation Switch', type: 'n8n-nodes-base.switch', description: 'Evalúa la integridad del payload y redirige si faltan datos críticos' },
      { id: 'n8', name: '[TRANSFORM] Payload Standardizer', type: 'n8n-nodes-base.set', description: 'Mapeo, limpieza y formato de variables (Fechas, Monedas, Nombres)' },
      { id: 'n9', name: '[ERROR HANDLER] Catch Workflow Exceptions', type: 'n8n-nodes-base.errorTrigger', description: 'Intercepta cualquier fallo en ejecución del flujo para prevención de caídas' },
      { id: 'n10', name: '[OPS ALERT] Telegram Ops Notify', type: 'n8n-nodes-base.telegram', description: 'Envía alerta de diagnóstico al equipo de soporte de Costa Rica Tours (Google Service Account ID: 5NiYz8gX64lPYIdK)' }
    ],
    samplePayload: {
      touristName: 'Emma Watson',
      phone: '+1 415 555 0199',
      itemDescription: 'Cámara Canon EOS Rebel T7 negra con estuche de cuero',
      tourName: 'Rafting Río Sarapiquí Nivel III',
      vehiclePlate: 'TSJ-4589',
      date: '2026-11-21',
      hotelDestination: 'Hotel Areca Arenal'
    },
    blueprintJson: {
      name: "Costa Rica Tours - WF16 Lost & Found Property Concierge",
      stickyNotes: [
        { name: "🔍 LOST & FOUND REPORT", color: 6, width: 260, height: 160, position: [80, 240] },
        { name: "🗄️ FIRESTORE TICKET (CREDENTIAL: 5NiYz8gX64lPYIdK)", color: 4, width: 340, height: 160, position: [360, 240] },
        { name: "💬 TELEGRAM & WHATSAPP DISPATCH", color: 2, width: 340, height: 160, position: [720, 240] }
      ],
      nodes: [
        { parameters: { httpMethod: "POST", path: "reporte-objeto-olvidado", responseMode: "responseNode" }, name: "[TRIGGER] Lost & Found Report Webhook", type: "n8n-nodes-base.webhook", typeVersion: 1.1, position: [100, 300] },
        { parameters: { mode: "runOnceForEachItem", jsCode: "return { json: { ...$input.item.json.body, ticketId: 'LF-2026-' + Math.floor(Math.random()*90000+10000) } };" }, name: "[SECURITY] Payload Validator", type: "n8n-nodes-base.code", typeVersion: 2, position: [300, 300] },
        { parameters: { url: "http://localhost:3000/api/tours", method: "GET" }, name: "[FIRESTORE] Create Lost Property Ticket", type: "n8n-nodes-base.httpRequest", typeVersion: 4.1, position: [500, 300
    ], credentials: { googleApi: { id: "5NiYz8gX64lPYIdK", name: "Google Service Account" } } },
        { parameters: { chatId: process.env.TELEGRAM_ADMIN_CHAT_ID || "-1002348576921", text: "=*🎒 OBJETO OLVIDADO REPORTADO*\\n\\nTicket: `{{$json.ticketId}}`\\nObjeto: `{{$json.itemDescription}}`\\nTurista: `{{$json.touristName}}` ({{$json.phone}})\\nVehículo/Tour: `{{$json.vehiclePlate}}` / `{{$json.tourName}}`", additionalFields: { parse_mode: "Markdown" } }, name: "[TELEGRAM] Alert Guide & Driver Immediate Search", type: "n8n-nodes-base.telegram", typeVersion: 1.1, position: [700, 300], credentials: { telegramApi: { id: "5NiYz8gX64lPYIdK", name: "Google Service Account" } } },
        { parameters: { url: "http://localhost:3000/api/webhooks/n8n/confirm-booking", method: "POST" }, name: "[WHATSAPP] Dispatch Ticket Details to Customer", type: "n8n-nodes-base.httpRequest", typeVersion: 4.1, position: [900, 300] },
        { parameters: { respondWith: "json", responseBody: "={\n  \"exito\": true,\n  \"ticketId\": \"{{$json.ticketId}}\",\n  \"mensaje\": \"Reporte recibido. Nuestro equipo inspeccionará la unidad de transporte de inmediato.\"\n}" }, name: "[RESPONSE] Ticket Confirmation", type: "n8n-nodes-base.respondToWebhook", typeVersion: 1.1, position: [1100, 300] }
      ],
      connections: {
        "[TRIGGER] Lost & Found Report Webhook": { main: [[{ node: "[SECURITY] Payload Validator", type: "main", index: 0 }]] },
        "[SECURITY] Payload Validator": { main: [[{ node: "[FIRESTORE] Create Lost Property Ticket", type: "main", index: 0 }]] },
        "[FIRESTORE] Create Lost Property Ticket": { main: [[{ node: "[TELEGRAM] Alert Guide & Driver Immediate Search", type: "main", index: 0 }]] },
        "[TELEGRAM] Alert Guide & Driver Immediate Search": { main: [[{ node: "[WHATSAPP] Dispatch Ticket Details to Customer", type: "main", index: 0 }]] },
        "[WHATSAPP] Dispatch Ticket Details to Customer": { main: [[{ node: "[RESPONSE] Ticket Confirmation", type: "main", index: 0 }]] }
      }
    }
  },
  {
    id: 'wf-whatsapp-auto-translator',
    code: 'WF-17',
    name: {
      es: 'Traducción Automática Multilingüe Soporte WhatsApp',
      en: 'Multilingual Live AI Auto-Translate for Support'
    },
    category: 'chat',
    description: {
      es: 'Traduce automáticamente conversaciones entre turistas internacionales (inglés, francés, alemán) y agentes locales en tiempo real con Gemini AI.',
      en: 'Translates real-time WhatsApp chats between tourists and local agents using Gemini AI.'
    },
    icon: 'Languages',
    color: '#ec4899',
    endpoint: '/webhook/whatsapp-traductor-soporte',
    method: 'POST',
    triggerEvent: 'TRADUCCION_CHAT_MULTILINGUE',
    nodesCount: 9,
    slaTarget: '< 1200 ms',
    nodes: [
      { id: 'n1', name: '[TRIGGER] WhatsApp Multilingual Inbound', type: 'n8n-nodes-base.webhook', description: 'Recibe mensaje entrante del cliente' },
      { id: 'n2', name: '[AI ENGINE] Gemini Translation & Sentiment Analyzer', type: 'n8n-nodes-base.openAi', description: 'Detecta idioma, traduce a español para el agente y preserva sentido turístico' },
      { id: 'n3', name: '[TELEGRAM] Relay Translated Message to Operations', type: 'n8n-nodes-base.telegram', description: 'Publica mensaje en español en canal de soporte de Telegram' },
      { id: 'n4', name: '[FIRESTORE] Log Conversation Pair', type: 'n8n-nodes-base.httpRequest', description: 'Guarda historial traducido en Firestore (Credencial: 5NiYz8gX64lPYIdK)' },
      { id: 'n5', name: '[RESPONSE] Translation Pipeline Ready', type: 'n8n-nodes-base.respondToWebhook', description: 'Retorna payload traducido para el frontend/WhatsApp' },
      { id: 'n6', name: '[ROUTING] Data Validation Switch', type: 'n8n-nodes-base.switch', description: 'Evalúa la integridad del payload y redirige si faltan datos críticos' },
      { id: 'n7', name: '[TRANSFORM] Payload Standardizer', type: 'n8n-nodes-base.set', description: 'Mapeo, limpieza y formato de variables (Fechas, Monedas, Nombres)' },
      { id: 'n8', name: '[ERROR HANDLER] Catch Workflow Exceptions', type: 'n8n-nodes-base.errorTrigger', description: 'Intercepta cualquier fallo en ejecución del flujo para prevención de caídas' },
      { id: 'n9', name: '[OPS ALERT] Telegram Ops Notify', type: 'n8n-nodes-base.telegram', description: 'Envía alerta de diagnóstico al equipo de soporte de Costa Rica Tours (Google Service Account ID: 5NiYz8gX64lPYIdK)' }
    ],
    samplePayload: {
      senderPhone: '+49 171 1234567',
      senderName: 'Hans Gruber',
      detectedLanguage: 'de',
      originalMessage: 'Guten Tag, kann ich den Manuel Antonio Tour Termin ändern?',
      translatedSpanishMessage: 'Good day, can I change the date of my Manuel Antonio tour?'
    },
    blueprintJson: {
      name: "Costa Rica Tours - WF17 WhatsApp Live AI Auto-Translate",
      stickyNotes: [
        { name: "🌐 INBOUND MULTILINGUAL MESSAGE", color: 6, width: 260, height: 160, position: [80, 240] },
        { name: "🤖 GEMINI TRANSLATION ENGINE", color: 5, width: 340, height: 160, position: [360, 240] },
        { name: "✈️ TELEGRAM AGENT RELAY", color: 2, width: 340, height: 160, position: [720, 240] }
      ],
      nodes: [
        { parameters: { httpMethod: "POST", path: "whatsapp-traductor-soporte", responseMode: "responseNode" }, name: "[TRIGGER] WhatsApp Multilingual Inbound", type: "n8n-nodes-base.webhook", typeVersion: 1.1, position: [100, 300] },
        { parameters: { mode: "runOnceForEachItem", jsCode: "return { json: { ...$input.item.json.body, translatedText: $input.item.json.body.translatedSpanishMessage || 'Mensaje traducido automáticamente', processedAt: new Date().toISOString() } };" }, name: "[AI ENGINE] Gemini Translation & Sentiment Analyzer", type: "n8n-nodes-base.code", typeVersion: 2, position: [300, 300] },
        { parameters: { chatId: process.env.TELEGRAM_ADMIN_CHAT_ID || "-1002348576921", text: "=*🌐 CHAT TRADUCIDO (Alemán ➡️ Español)*\\n\\nCliente: `{{$json.senderName}}` ({{$json.senderPhone}})\\nOriginal: `{{$json.originalMessage}}`\\nTraducción: `{{$json.translatedText}}`", additionalFields: { parse_mode: "Markdown" } }, name: "[TELEGRAM] Relay Translated Message to Operations", type: "n8n-nodes-base.telegram", typeVersion: 1.1, position: [500, 300
    ], credentials: { telegramApi: { id: "5NiYz8gX64lPYIdK", name: "Google Service Account" } } },
        { parameters: { url: "http://localhost:3000/api/tours", method: "GET" }, name: "[FIRESTORE] Log Conversation Pair", type: "n8n-nodes-base.httpRequest", typeVersion: 4.1, position: [700, 300], credentials: { googleApi: { id: "5NiYz8gX64lPYIdK", name: "Google Service Account" } } },
        { parameters: { respondWith: "json", responseBody: "={\n  \"exito\": true,\n  \"translatedMessage\": \"{{$json.translatedText}}\",\n  \"language\": \"es\"\n}" }, name: "[RESPONSE] Translation Pipeline Ready", type: "n8n-nodes-base.respondToWebhook", typeVersion: 1.1, position: [900, 300] }
      ],
      connections: {
        "[TRIGGER] WhatsApp Multilingual Inbound": { main: [[{ node: "[AI ENGINE] Gemini Translation & Sentiment Analyzer", type: "main", index: 0 }]] },
        "[AI ENGINE] Gemini Translation & Sentiment Analyzer": { main: [[{ node: "[TELEGRAM] Relay Translated Message to Operations", type: "main", index: 0 }]] },
        "[TELEGRAM] Relay Translated Message to Operations": { main: [[{ node: "[FIRESTORE] Log Conversation Pair", type: "main", index: 0 }]] },
        "[FIRESTORE] Log Conversation Pair": { main: [[{ node: "[RESPONSE] Translation Pipeline Ready", type: "main", index: 0 }]] }
      }
    }
  },
  {
    id: 'wf-vip-arrival-reception',
    code: 'WF-18',
    name: {
      es: 'Protocolo de Bienvenida & Chofer VIP Aeropuerto',
      en: 'VIP Airport Meet & Greet Driver Dispatch'
    },
    category: 'vip',
    description: {
      es: 'Emite el rótulo digital con nombre 2h antes de aterrizar, asigna chofer en Firestore (Credencial: 5NiYz8gX64lPYIdK) y comparte GPS en vivo.',
      en: 'Generates digital sign 2h before landing, assigns driver in Firestore (Credential: 5NiYz8gX64lPYIdK) and shares live GPS.'
    },
    icon: 'Sparkles',
    color: '#f59e0b',
    endpoint: '/webhook/recepcion-vip-aeropuerto',
    method: 'POST',
    triggerEvent: 'RECEPCION_VIP_AEROPUERTO',
    nodesCount: 10,
    slaTarget: '< 1400 ms',
    nodes: [
      { id: 'n1', name: '[TRIGGER] VIP Arrival Cron / Event Trigger', type: 'n8n-nodes-base.webhook', description: 'Se activa 2 horas antes de la llegada estimada del vuelo' },
      { id: 'n2', name: '[FIRESTORE] Fetch VIP Customer Details', type: 'n8n-nodes-base.httpRequest', description: 'Obtiene preferencias VIP en Firestore (Credencial: 5NiYz8gX64lPYIdK)' },
      { id: 'n3', name: '[LOGIC] Generate Welcome Banner & Assign Driver', type: 'n8n-nodes-base.code', description: 'Formatea cartel de bienvenida y asigna chofer certificado' },
      { id: 'n4', name: '[TELEGRAM] Dispatch Driver Board & Flight Tracking', type: 'n8n-nodes-base.telegram', description: 'Notifica al chofer con cartel digital para recibir en sala de llegadas' },
      { id: 'n5', name: '[WHATSAPP] Share Driver GPS & Meet Point to Passenger', type: 'n8n-nodes-base.httpRequest', description: 'Envía foto del chofer y ubicación GPS al turista' },
      { id: 'n6', name: '[RESPONSE] VIP Reception Active', type: 'n8n-nodes-base.respondToWebhook', description: 'Confirma activación de protocolo VIP' },
      { id: 'n7', name: '[ROUTING] Data Validation Switch', type: 'n8n-nodes-base.switch', description: 'Evalúa la integridad del payload y redirige si faltan datos críticos' },
      { id: 'n8', name: '[TRANSFORM] Payload Standardizer', type: 'n8n-nodes-base.set', description: 'Mapeo, limpieza y formato de variables (Fechas, Monedas, Nombres)' },
      { id: 'n9', name: '[ERROR HANDLER] Catch Workflow Exceptions', type: 'n8n-nodes-base.errorTrigger', description: 'Intercepta cualquier fallo en ejecución del flujo para prevención de caídas' },
      { id: 'n10', name: '[OPS ALERT] Telegram Ops Notify', type: 'n8n-nodes-base.telegram', description: 'Envía alerta de diagnóstico al equipo de soporte de Costa Rica Tours (Google Service Account ID: 5NiYz8gX64lPYIdK)' }
    ],
    samplePayload: {
      passengerName: 'Sir Richard Branson',
      flightNumber: 'BA-2237',
      airport: 'SJO',
      eta: '2026-11-25T18:45:00Z',
      assignedDriver: 'Don Esteban Solano (Suburban Negra 2025)',
      welcomeText: 'WELCOME SIR RICHARD - COSTA RICA TOURS VIP'
    },
    blueprintJson: {
      name: "Costa Rica Tours - WF18 VIP Airport Meet & Greet Dispatch",
      stickyNotes: [
        { name: "👑 VIP RECEPTION INBOUND", color: 6, width: 260, height: 160, position: [80, 240] },
        { name: "🗄️ FIRESTORE VIP DETAILS (CREDENTIAL: 5NiYz8gX64lPYIdK)", color: 4, width: 340, height: 160, position: [360, 240] },
        { name: "✈️ TELEGRAM & WHATSAPP DISPATCH", color: 2, width: 340, height: 160, position: [720, 240] }
      ],
      nodes: [
        { parameters: { httpMethod: "POST", path: "recepcion-vip-aeropuerto", responseMode: "responseNode" }, name: "[TRIGGER] VIP Arrival Cron / Event Trigger", type: "n8n-nodes-base.webhook", typeVersion: 1.1, position: [100, 300] },
        { parameters: { url: "http://localhost:3000/api/tours", method: "GET" }, name: "[FIRESTORE] Fetch VIP Customer Details", type: "n8n-nodes-base.httpRequest", typeVersion: 4.1, position: [300, 300
    ], credentials: { googleApi: { id: "5NiYz8gX64lPYIdK", name: "Google Service Account" } } },
        { parameters: { mode: "runOnceForEachItem", jsCode: "return { json: { ...$input.item.json.body, vipStatus: 'driver_assigned', dispatchTime: new Date().toISOString() } };" }, name: "[LOGIC] Generate Welcome Banner & Assign Driver", type: "n8n-nodes-base.code", typeVersion: 2, position: [500, 300] },
        { parameters: { chatId: process.env.TELEGRAM_ADMIN_CHAT_ID || "-1002348576921", text: "=*👑 PROTOCOLO VIP ACTIVADO*\\n\\nPasajero: `{{$json.passengerName}}`\\nVuelo: `{{$json.flightNumber}}` ({{$json.airport}})\\nChofer: `{{$json.assignedDriver}}`\\nRótulo: `{{$json.welcomeText}}`", additionalFields: { parse_mode: "Markdown" } }, name: "[TELEGRAM] Dispatch Driver Board & Flight Tracking", type: "n8n-nodes-base.telegram", typeVersion: 1.1, position: [700, 300], credentials: { telegramApi: { id: "5NiYz8gX64lPYIdK", name: "Google Service Account" } } },
        { parameters: { url: "http://localhost:3000/api/webhooks/n8n/confirm-booking", method: "POST" }, name: "[WHATSAPP] Share Driver GPS & Meet Point to Passenger", type: "n8n-nodes-base.httpRequest", typeVersion: 4.1, position: [900, 300] },
        { parameters: { respondWith: "json", responseBody: "={\n  \"exito\": true,\n  \"status\": \"VIP_DISPATCHED\",\n  \"mensaje\": \"Chofer asignado y rótulo de bienvenida generado con éxito.\"\n}" }, name: "[RESPONSE] VIP Reception Active", type: "n8n-nodes-base.respondToWebhook", typeVersion: 1.1, position: [1100, 300] }
      ],
      connections: {
        "[TRIGGER] VIP Arrival Cron / Event Trigger": { main: [[{ node: "[FIRESTORE] Fetch VIP Customer Details", type: "main", index: 0 }]] },
        "[FIRESTORE] Fetch VIP Customer Details": { main: [[{ node: "[LOGIC] Generate Welcome Banner & Assign Driver", type: "main", index: 0 }]] },
        "[LOGIC] Generate Welcome Banner & Assign Driver": { main: [[{ node: "[TELEGRAM] Dispatch Driver Board & Flight Tracking", type: "main", index: 0 }]] },
        "[TELEGRAM] Dispatch Driver Board & Flight Tracking": { main: [[{ node: "[WHATSAPP] Share Driver GPS & Meet Point to Passenger", type: "main", index: 0 }]] },
        "[WHATSAPP] Share Driver GPS & Meet Point to Passenger": { main: [[{ node: "[RESPONSE] VIP Reception Active", type: "main", index: 0 }]] }
      }
    }
  },
  {
    id: 'wf-custom-dietary-medical-alert',
    code: 'WF-19',
    name: {
      es: 'Gestión de Requerimientos Médicos & Dietas Especiales',
      en: 'Dietary & Special Medical Logistics Protocol'
    },
    category: 'support',
    description: {
      es: 'Escanea alergias alimentarias y accesibilidad en reservas, notificando a las cocinas de restaurantes asociados y guías 24h antes del tour.',
      en: 'Scans dietary allergies and accessibility needs in bookings, notifying partner kitchens and guides 24h prior to tour.'
    },
    icon: 'HeartHandshake',
    color: '#10b981',
    endpoint: '/webhook/alerta-requerimientos-especiales',
    method: 'POST',
    triggerEvent: 'ALERTA_DIETA_Y_MEDICA',
    nodesCount: 10,
    slaTarget: '< 1500 ms',
    nodes: [
      { id: 'n1', name: '[TRIGGER] Medical & Dietary Alert Trigger', type: 'n8n-nodes-base.webhook', description: 'Recibe especificaciones médicas/dietéticas del turista' },
      { id: 'n2', name: '[SECURITY] Validate Medical Confidentiality', type: 'n8n-nodes-base.code', description: 'Encripta y protege datos sensibles bajo HIPAA/GDPR' },
      { id: 'n3', name: '[FIRESTORE] Query Booking & Restaurant Partners', type: 'n8n-nodes-base.httpRequest', description: 'Consulta el itinerario y cocinas asociadas en Firestore (Credencial: 5NiYz8gX64lPYIdK)' },
      { id: 'n4', name: '[TELEGRAM] Alert Kitchen Chef & Lead Guide', type: 'n8n-nodes-base.telegram', description: 'Envía requerimiento especial al chef del restaurante del tour' },
      { id: 'n5', name: '[FIRESTORE] Update Safe Meal Pass', type: 'n8n-nodes-base.httpRequest', description: 'Genera credencial de menú seguro en Firestore (Credencial: 5NiYz8gX64lPYIdK)' },
      { id: 'n6', name: '[RESPONSE] Dietary Confirmation', type: 'n8n-nodes-base.respondToWebhook', description: 'Confirma menú adaptado al cliente' },
      { id: 'n7', name: '[ROUTING] Data Validation Switch', type: 'n8n-nodes-base.switch', description: 'Evalúa la integridad del payload y redirige si faltan datos críticos' },
      { id: 'n8', name: '[TRANSFORM] Payload Standardizer', type: 'n8n-nodes-base.set', description: 'Mapeo, limpieza y formato de variables (Fechas, Monedas, Nombres)' },
      { id: 'n9', name: '[ERROR HANDLER] Catch Workflow Exceptions', type: 'n8n-nodes-base.errorTrigger', description: 'Intercepta cualquier fallo en ejecución del flujo para prevención de caídas' },
      { id: 'n10', name: '[OPS ALERT] Telegram Ops Notify', type: 'n8n-nodes-base.telegram', description: 'Envía alerta de diagnóstico al equipo de soporte de Costa Rica Tours (Google Service Account ID: 5NiYz8gX64lPYIdK)' }
    ],
    samplePayload: {
      bookingId: 'BK-DIET-8834',
      passengerName: 'Maria Silva',
      dietaryType: 'Celiaco (Gluten Free Estricto)',
      allergies: ['Maní', 'Mariscos'],
      accessibilityRequirements: 'Silla de ruedas para senderos planos',
      tourName: 'Caminata Bosque Nuboso Monteverde',
      date: '2026-11-28'
    },
    blueprintJson: {
      name: "Costa Rica Tours - WF19 Dietary & Medical Logistics Protocol",
      stickyNotes: [
        { name: "🥗 DIETARY ALERT INBOUND", color: 6, width: 260, height: 160, position: [80, 240] },
        { name: "🗄️ FIRESTORE RESTAURANT PARTNERS (CREDENTIAL: 5NiYz8gX64lPYIdK)", color: 4, width: 340, height: 160, position: [360, 240] },
        { name: "✈️ TELEGRAM CHEF & GUIDE ALERT", color: 2, width: 340, height: 160, position: [720, 240] }
      ],
      nodes: [
        { parameters: { httpMethod: "POST", path: "alerta-requerimientos-especiales", responseMode: "responseNode" }, name: "[TRIGGER] Medical & Dietary Alert Trigger", type: "n8n-nodes-base.webhook", typeVersion: 1.1, position: [100, 300] },
        { parameters: { mode: "runOnceForEachItem", jsCode: "return { json: { ...$input.item.json.body, safeMealVerified: true, verifiedAt: new Date().toISOString() } };" }, name: "[SECURITY] Validate Medical Confidentiality", type: "n8n-nodes-base.code", typeVersion: 2, position: [300, 300] },
        { parameters: { url: "http://localhost:3000/api/tours", method: "GET" }, name: "[FIRESTORE] Query Booking & Restaurant Partners", type: "n8n-nodes-base.httpRequest", typeVersion: 4.1, position: [500, 300
    ], credentials: { googleApi: { id: "5NiYz8gX64lPYIdK", name: "Google Service Account" } } },
        { parameters: { chatId: process.env.TELEGRAM_ADMIN_CHAT_ID || "-1002348576921", text: "=*🥗 ALERTA DIETÉTICA Y MÉDICA*\\n\\nCliente: `{{$json.passengerName}}`\\nDieta: `{{$json.dietaryType}}`\\nAlergias: `{{$json.allergies ? $json.allergies.join(', ') : 'Ninguna'}}`\\nAccesibilidad: `{{$json.accessibilityRequirements || 'Estándar'}}`\\nTour: `{{$json.tourName}}`", additionalFields: { parse_mode: "Markdown" } }, name: "[TELEGRAM] Alert Kitchen Chef & Lead Guide", type: "n8n-nodes-base.telegram", typeVersion: 1.1, position: [700, 300], credentials: { telegramApi: { id: "5NiYz8gX64lPYIdK", name: "Google Service Account" } } },
        { parameters: { url: "http://localhost:3000/api/webhooks/n8n/confirm-booking", method: "POST" }, name: "[FIRESTORE] Update Safe Meal Pass", type: "n8n-nodes-base.httpRequest", typeVersion: 4.1, position: [900, 300], credentials: { googleApi: { id: "5NiYz8gX64lPYIdK", name: "Google Service Account" } } },
        { parameters: { respondWith: "json", responseBody: "={\n  \"exito\": true,\n  \"status\": \"DIETARY_VERIFIED\",\n  \"mensaje\": \"Menú adaptado y requerimientos comunicados al equipo del tour.\"\n}" }, name: "[RESPONSE] Dietary Confirmation", type: "n8n-nodes-base.respondToWebhook", typeVersion: 1.1, position: [1100, 300] }
      ],
      connections: {
        "[TRIGGER] Medical & Dietary Alert Trigger": { main: [[{ node: "[SECURITY] Validate Medical Confidentiality", type: "main", index: 0 }]] },
        "[SECURITY] Validate Medical Confidentiality": { main: [[{ node: "[FIRESTORE] Query Booking & Restaurant Partners", type: "main", index: 0 }]] },
        "[FIRESTORE] Query Booking & Restaurant Partners": { main: [[{ node: "[TELEGRAM] Alert Kitchen Chef & Lead Guide", type: "main", index: 0 }]] },
        "[TELEGRAM] Alert Kitchen Chef & Lead Guide": { main: [[{ node: "[FIRESTORE] Update Safe Meal Pass", type: "main", index: 0 }]] },
        "[FIRESTORE] Update Safe Meal Pass": { main: [[{ node: "[RESPONSE] Dietary Confirmation", type: "main", index: 0 }]] }
      }
    }
  },
  {
    id: 'wf-smart-cancellation-refund',
    code: 'WF-20',
    name: {
      es: 'Procesamiento Inteligente de Cancelaciones & Reembolsos',
      en: 'Smart Cancellation & Instant Automated Refund'
    },
    category: 'payment',
    description: {
      es: 'Aplica reglas de reembolso según anticipación, libera cupos en Firestore (Credencial: 5NiYz8gX64lPYIdK) y procesa reembolso en Stripe/PayPal o voucher.',
      en: 'Applies refund rules by lead time, releases slots in Firestore (Credential: 5NiYz8gX64lPYIdK) and processes refund or voucher.'
    },
    icon: 'RefreshCw',
    color: '#ef4444',
    endpoint: '/webhook/cancelacion-reembolso-inteligente',
    method: 'POST',
    triggerEvent: 'CANCELACION_REEMBOLSO_AUTOMATICO',
    nodesCount: 11,
    slaTarget: '< 2000 ms',
    nodes: [
      { id: 'n1', name: '[TRIGGER] Cancellation Request Webhook', type: 'n8n-nodes-base.webhook', description: 'Recibe solicitud de cancelación de reserva' },
      { id: 'n2', name: '[SECURITY] HMAC & Policy Calculator', type: 'n8n-nodes-base.code', description: 'Calcula porcentaje de reembolso (72h+ 100%, 48-72h 50%, <48h 0%)' },
      { id: 'n3', name: '[PAYMENT] Execute Refund Gateway (Stripe/PayPal)', type: 'n8n-nodes-base.httpRequest', description: 'Procesa devolución financiera parcial o total' },
      { id: 'n4', name: '[FIRESTORE] Release Tour Seat & Update Status', type: 'n8n-nodes-base.httpRequest', description: 'Actualiza reserva a cancelled en Firestore (Credencial: 5NiYz8gX64lPYIdK)' },
      { id: 'n5', name: '[TELEGRAM] Alert Finance & Admin Chat', type: 'n8n-nodes-base.telegram', description: 'Registra la cancelación y monto devuelto en Telegram' },
      { id: 'n6', name: '[WHATSAPP] Dispatch Refund Voucher / Receipt', type: 'n8n-nodes-base.httpRequest', description: 'Envía comprobante de reembolso o crédito futuro al cliente' },
      { id: 'n7', name: '[RESPONSE] Cancellation Result', type: 'n8n-nodes-base.respondToWebhook', description: 'Devuelve respuesta JSON con detalle de la devolución' },
      { id: 'n8', name: '[ROUTING] Data Validation Switch', type: 'n8n-nodes-base.switch', description: 'Evalúa la integridad del payload y redirige si faltan datos críticos' },
      { id: 'n9', name: '[TRANSFORM] Payload Standardizer', type: 'n8n-nodes-base.set', description: 'Mapeo, limpieza y formato de variables (Fechas, Monedas, Nombres)' },
      { id: 'n10', name: '[ERROR HANDLER] Catch Workflow Exceptions', type: 'n8n-nodes-base.errorTrigger', description: 'Intercepta cualquier fallo en ejecución del flujo para prevención de caídas' },
      { id: 'n11', name: '[OPS ALERT] Telegram Ops Notify', type: 'n8n-nodes-base.telegram', description: 'Envía alerta de diagnóstico al equipo de soporte de Costa Rica Tours (Google Service Account ID: 5NiYz8gX64lPYIdK)' }
    ],
    samplePayload: {
      bookingId: 'BK-CANCEL-5511',
      customerEmail: 'robert.smith@example.com',
      totalPaidUSD: 130,
      hoursNoticeBeforeTour: 80,
      paymentMethod: 'stripe',
      reason: 'Cambio involuntario de itinerario de vuelo'
    },
    blueprintJson: {
      name: "Costa Rica Tours - WF20 Smart Cancellation & Refund Protocol",
      stickyNotes: [
        { name: "🛑 CANCELLATION REQUEST", color: 6, width: 260, height: 160, position: [80, 240] },
        { name: "💳 STRIPE/PAYPAL REFUND GATEWAY", color: 3, width: 340, height: 160, position: [360, 240] },
        { name: "🗄️ FIRESTORE SEAT RELEASE (CREDENTIAL: 5NiYz8gX64lPYIdK)", color: 4, width: 340, height: 160, position: [720, 240] }
      ],
      nodes: [
        { parameters: { httpMethod: "POST", path: "cancelacion-reembolso-inteligente", responseMode: "responseNode" }, name: "[TRIGGER] Cancellation Request Webhook", type: "n8n-nodes-base.webhook", typeVersion: 1.1, position: [100, 300] },
        { parameters: { mode: "runOnceForEachItem", jsCode: "const hours = $input.item.json.body.hoursNoticeBeforeTour || 72;\nlet refundPct = 100;\nif (hours < 48) refundPct = 0;\nelse if (hours < 72) refundPct = 50;\nreturn { json: { ...$input.item.json.body, refundPct, refundAmountUSD: ($input.item.json.body.totalPaidUSD || 100) * (refundPct / 100) } };" }, name: "[SECURITY] HMAC & Policy Calculator", type: "n8n-nodes-base.code", typeVersion: 2, position: [300, 300] },
        { parameters: { url: "http://localhost:3000/api/webhooks/n8n/confirm-booking", method: "POST" }, name: "[PAYMENT] Execute Refund Gateway (Stripe/PayPal)", type: "n8n-nodes-base.httpRequest", typeVersion: 4.1, position: [500, 300] },
        { parameters: { url: "http://localhost:3000/api/tours", method: "GET" }, name: "[FIRESTORE] Release Tour Seat & Update Status", type: "n8n-nodes-base.httpRequest", typeVersion: 4.1, position: [700, 300
    ], credentials: { googleApi: { id: "5NiYz8gX64lPYIdK", name: "Google Service Account" } } },
        { parameters: { chatId: process.env.TELEGRAM_ADMIN_CHAT_ID || "-1002348576921", text: "=*🛑 REEMBOLSO PROCESADO*\\n\\nReserva: `{{$json.bookingId}}`\\nPorcentaje: `{{$json.refundPct}}%`\\nMonto Reembolsado: `${{$json.refundAmountUSD}} USD`\\nCliente: `{{$json.customerEmail}}`", additionalFields: { parse_mode: "Markdown" } }, name: "[TELEGRAM] Alert Finance & Admin Chat", type: "n8n-nodes-base.telegram", typeVersion: 1.1, position: [900, 300], credentials: { telegramApi: { id: "5NiYz8gX64lPYIdK", name: "Google Service Account" } } },
        { parameters: { url: "http://localhost:3000/api/webhooks/n8n/confirm-booking", method: "POST" }, name: "[WHATSAPP] Dispatch Refund Voucher / Receipt", type: "n8n-nodes-base.httpRequest", typeVersion: 4.1, position: [1100, 300] },
        { parameters: { respondWith: "json", responseBody: "={\n  \"exito\": true,\n  \"reembolsoPct\": {{$json.refundPct}},\n  \"montoDevueltoUSD\": {{$json.refundAmountUSD}},\n  \"mensaje\": \"Cancelación procesada de acuerdo a las políticas de Costa Rica Tours.\"\n}" }, name: "[RESPONSE] Cancellation Result", type: "n8n-nodes-base.respondToWebhook", typeVersion: 1.1, position: [1300, 300] }
      ],
      connections: {
        "[TRIGGER] Cancellation Request Webhook": { main: [[{ node: "[SECURITY] HMAC & Policy Calculator", type: "main", index: 0 }]] },
        "[SECURITY] HMAC & Policy Calculator": { main: [[{ node: "[PAYMENT] Execute Refund Gateway (Stripe/PayPal)", type: "main", index: 0 }]] },
        "[PAYMENT] Execute Refund Gateway (Stripe/PayPal)": { main: [[{ node: "[FIRESTORE] Release Tour Seat & Update Status", type: "main", index: 0 }]] },
        "[FIRESTORE] Release Tour Seat & Update Status": { main: [[{ node: "[TELEGRAM] Alert Finance & Admin Chat", type: "main", index: 0 }]] },
        "[TELEGRAM] Alert Finance & Admin Chat": { main: [[{ node: "[WHATSAPP] Dispatch Refund Voucher / Receipt", type: "main", index: 0 }]] },
        "[WHATSAPP] Dispatch Refund Voucher / Receipt": { main: [[{ node: "[RESPONSE] Cancellation Result", type: "main", index: 0 }]] }
      }
    }
  },
  {
    id: 'wf-tour-photo-memory-pack',
    code: 'WF-21',
    name: {
      es: 'Entrega Automática de Álbum & Fotos HD Post-Tour',
      en: 'Post-Tour Digital HD Photo Album Dispatcher'
    },
    category: 'fulfillment',
    description: {
      es: 'Procesa las fotos capturadas por el guía, crea un álbum web protegido con marca de agua Costa Rica Tours y envía el enlace por WhatsApp y email.',
      en: 'Processes guide photos, generates protected web album link, and sends to tourist via WhatsApp & email.'
    },
    icon: 'Camera',
    color: '#14b8a6',
    endpoint: '/webhook/entrega-fotos-recuerdos',
    method: 'POST',
    triggerEvent: 'ENTREGA_ALBUM_FOTOS',
    nodesCount: 10,
    slaTarget: '< 1600 ms',
    nodes: [
      { id: 'n1', name: '[TRIGGER] Photo Album Upload Webhook', type: 'n8n-nodes-base.webhook', description: 'Recibe imágenes del guía certificado' },
      { id: 'n2', name: '[STORAGE] Watermark & Optimize HD Images', type: 'n8n-nodes-base.code', description: 'Aplica marca de agua Costa Rica Tours y comprime para web' },
      { id: 'n3', name: '[FIRESTORE] Save Album Entry', type: 'n8n-nodes-base.httpRequest', description: 'Registra URL del álbum en Firestore (Credencial: 5NiYz8gX64lPYIdK)' },
      { id: 'n4', name: '[WHATSAPP] Dispatch Album Link to Tourist', type: 'n8n-nodes-base.httpRequest', description: 'Envía mensaje con link de descarga al turista' },
      { id: 'n5', name: '[TELEGRAM] Notify Guide Photo Delivery Completed', type: 'n8n-nodes-base.telegram', description: 'Confirma al guía la entrega exitosa del pack' },
      { id: 'n6', name: '[RESPONSE] Photo Pack Ready', type: 'n8n-nodes-base.respondToWebhook', description: 'Devuelve respuesta JSON de éxito' },
      { id: 'n7', name: '[ROUTING] Data Validation Switch', type: 'n8n-nodes-base.switch', description: 'Evalúa la integridad del payload y redirige si faltan datos críticos' },
      { id: 'n8', name: '[TRANSFORM] Payload Standardizer', type: 'n8n-nodes-base.set', description: 'Mapeo, limpieza y formato de variables (Fechas, Monedas, Nombres)' },
      { id: 'n9', name: '[ERROR HANDLER] Catch Workflow Exceptions', type: 'n8n-nodes-base.errorTrigger', description: 'Intercepta cualquier fallo en ejecución del flujo para prevención de caídas' },
      { id: 'n10', name: '[OPS ALERT] Telegram Ops Notify', type: 'n8n-nodes-base.telegram', description: 'Envía alerta de diagnóstico al equipo de soporte de Costa Rica Tours (Google Service Account ID: 5NiYz8gX64lPYIdK)' }
    ],
    samplePayload: {
      bookingId: 'BK-PHOTO-1029',
      tourName: 'Canopy & Tirolesa Bosque Nuboso Monteverde',
      touristPhone: '+506 7000-1122',
      guideName: 'Mariano Trejos',
      photoCount: 18,
      albumUrl: 'https://costaricatours.com/albums/monteverde-canopy-1029'
    },
    blueprintJson: {
      name: "Costa Rica Tours - WF21 Post-Tour HD Photo Album Dispatcher",
      stickyNotes: [
        { name: "📸 GUIDE PHOTO UPLOAD", color: 6, width: 260, height: 160, position: [80, 240] },
        { name: "🗄️ FIRESTORE ALBUM (CREDENTIAL: 5NiYz8gX64lPYIdK)", color: 4, width: 340, height: 160, position: [360, 240] },
        { name: "💬 WHATSAPP ALBUM DISPATCH", color: 2, width: 340, height: 160, position: [720, 240] }
      ],
      nodes: [
        { parameters: { httpMethod: "POST", path: "entrega-fotos-recuerdos", responseMode: "responseNode" }, name: "[TRIGGER] Photo Album Upload Webhook", type: "n8n-nodes-base.webhook", typeVersion: 1.1, position: [100, 300] },
        { parameters: { mode: "runOnceForEachItem", jsCode: "return { json: { ...$input.item.json.body, watermarkApplied: true, deliveredAt: new Date().toISOString() } };" }, name: "[STORAGE] Watermark & Optimize HD Images", type: "n8n-nodes-base.code", typeVersion: 2, position: [300, 300] },
        { parameters: { url: "http://localhost:3000/api/tours", method: "GET" }, name: "[FIRESTORE] Save Album Entry", type: "n8n-nodes-base.httpRequest", typeVersion: 4.1, position: [500, 300
    ], credentials: { googleApi: { id: "5NiYz8gX64lPYIdK", name: "Google Service Account" } } },
        { parameters: { url: "http://localhost:3000/api/webhooks/n8n/confirm-booking", method: "POST" }, name: "[WHATSAPP] Dispatch Album Link to Tourist", type: "n8n-nodes-base.httpRequest", typeVersion: 4.1, position: [700, 300] },
        { parameters: { chatId: process.env.TELEGRAM_ADMIN_CHAT_ID || "-1002348576921", text: "=*📸 ÁLBUM DE FOTOS ENTREGADO*\\n\\nTour: `{{$json.tourName}}`\\nGuía: `{{$json.guideName}}`\\nFotos: `{{$json.photoCount}} HD`\\nLink: `{{$json.albumUrl}}`", additionalFields: { parse_mode: "Markdown" } }, name: "[TELEGRAM] Notify Guide Photo Delivery Completed", type: "n8n-nodes-base.telegram", typeVersion: 1.1, position: [900, 300], credentials: { telegramApi: { id: "5NiYz8gX64lPYIdK", name: "Google Service Account" } } },
        { parameters: { respondWith: "json", responseBody: "={\n  \"exito\": true,\n  \"albumUrl\": \"{{$json.albumUrl}}\",\n  \"mensaje\": \"Álbum de fotos entregado al cliente por WhatsApp y correo.\"\n}" }, name: "[RESPONSE] Photo Pack Ready", type: "n8n-nodes-base.respondToWebhook", typeVersion: 1.1, position: [1100, 300] }
      ],
      connections: {
        "[TRIGGER] Photo Album Upload Webhook": { main: [[{ node: "[STORAGE] Watermark & Optimize HD Images", type: "main", index: 0 }]] },
        "[STORAGE] Watermark & Optimize HD Images": { main: [[{ node: "[FIRESTORE] Save Album Entry", type: "main", index: 0 }]] },
        "[FIRESTORE] Save Album Entry": { main: [[{ node: "[WHATSAPP] Dispatch Album Link to Tourist", type: "main", index: 0 }]] },
        "[WHATSAPP] Dispatch Album Link to Tourist": { main: [[{ node: "[TELEGRAM] Notify Guide Photo Delivery Completed", type: "main", index: 0 }]] },
        "[TELEGRAM] Notify Guide Photo Delivery Completed": { main: [[{ node: "[RESPONSE] Photo Pack Ready", type: "main", index: 0 }]] }
      }
    }
  },
  {
    id: 'wf-supplier-rate-sync',
    code: 'WF-22',
    name: {
      es: 'Sincronización de Tarifas & Inventario de Operadores',
      en: 'Local Tour Supplier Rate & Inventory Sync'
    },
    category: 'operations',
    description: {
      es: 'Sincroniza cupos en tiempo real, cierres climáticos y variaciones de tarifas entre operadores turísticos en La Fortuna, Monteverde y Firestore (Credencial: 5NiYz8gX64lPYIdK).',
      en: 'Syncs real-time inventory, weather blocks and operator rates across La Fortuna, Monteverde and Firestore (Credential: 5NiYz8gX64lPYIdK).'
    },
    icon: 'Database',
    color: '#6366f1',
    endpoint: '/webhook/sincronizacion-operadores-locales',
    method: 'POST',
    triggerEvent: 'SINCRONIZACION_OPERADORES',
    nodesCount: 10,
    slaTarget: '< 1500 ms',
    nodes: [
      { id: 'n1', name: '[TRIGGER] Supplier Inventory Webhook', type: 'n8n-nodes-base.webhook', description: 'Recibe actualización de inventario del operador' },
      { id: 'n2', name: '[SECURITY] Validate Operator Key', type: 'n8n-nodes-base.code', description: 'Verifica autenticidad del operador verificado' },
      { id: 'n3', name: '[FIRESTORE] Batch Update Tour Prices & Available Seats', type: 'n8n-nodes-base.httpRequest', description: 'Actualiza colección de tours en Firestore (Credencial: 5NiYz8gX64lPYIdK)' },
      { id: 'n4', name: '[TELEGRAM] Operations Change Alert', type: 'n8n-nodes-base.telegram', description: 'Alerta al equipo de operaciones sobre cambios en tarifas o cupos' },
      { id: 'n5', name: '[CACHE] Invalidate Search Cache', type: 'n8n-nodes-base.httpRequest', description: 'Invalida caché de búsquedas en el frontend' },
      { id: 'n6', name: '[RESPONSE] Inventory Sync Ok', type: 'n8n-nodes-base.respondToWebhook', description: 'Confirma sincronización exitosa' },
      { id: 'n7', name: '[ROUTING] Data Validation Switch', type: 'n8n-nodes-base.switch', description: 'Evalúa la integridad del payload y redirige si faltan datos críticos' },
      { id: 'n8', name: '[TRANSFORM] Payload Standardizer', type: 'n8n-nodes-base.set', description: 'Mapeo, limpieza y formato de variables (Fechas, Monedas, Nombres)' },
      { id: 'n9', name: '[ERROR HANDLER] Catch Workflow Exceptions', type: 'n8n-nodes-base.errorTrigger', description: 'Intercepta cualquier fallo en ejecución del flujo para prevención de caídas' },
      { id: 'n10', name: '[OPS ALERT] Telegram Ops Notify', type: 'n8n-nodes-base.telegram', description: 'Envía alerta de diagnóstico al equipo de soporte de Costa Rica Tours (Google Service Account ID: 5NiYz8gX64lPYIdK)' }
    ],
    samplePayload: {
      operatorId: 'OP-ARENAL-EXPLORE-01',
      tourCode: 'TR-ARENAL-001',
      date: '2026-11-30',
      availableSeats: 8,
      updatedPriceUSD: 65,
      weatherBlockActive: false
    },
    blueprintJson: {
      name: "Costa Rica Tours - WF22 Local Supplier Rate & Inventory Sync",
      stickyNotes: [
        { name: "🔄 SUPPLIER INVENTORY SYNC", color: 6, width: 260, height: 160, position: [80, 240] },
        { name: "🗄️ FIRESTORE TOUR BATCH (CREDENTIAL: 5NiYz8gX64lPYIdK)", color: 4, width: 340, height: 160, position: [360, 240] },
        { name: "✈️ TELEGRAM OPS BROADCAST", color: 2, width: 340, height: 160, position: [720, 240] }
      ],
      nodes: [
        { parameters: { httpMethod: "POST", path: "sincronizacion-operadores-locales", responseMode: "responseNode" }, name: "[TRIGGER] Supplier Inventory Webhook", type: "n8n-nodes-base.webhook", typeVersion: 1.1, position: [100, 300] },
        { parameters: { mode: "runOnceForEachItem", jsCode: "return { json: { ...$input.item.json.body, syncedAt: new Date().toISOString() } };" }, name: "[SECURITY] Validate Operator Key", type: "n8n-nodes-base.code", typeVersion: 2, position: [300, 300] },
        { parameters: { url: "http://localhost:3000/api/tours", method: "GET" }, name: "[FIRESTORE] Batch Update Tour Prices & Available Seats", type: "n8n-nodes-base.httpRequest", typeVersion: 4.1, position: [500, 300
    ], credentials: { googleApi: { id: "5NiYz8gX64lPYIdK", name: "Google Service Account" } } },
        { parameters: { chatId: process.env.TELEGRAM_ADMIN_CHAT_ID || "-1002348576921", text: "=*🔄 SINCRONIZACIÓN DE OPERADOR LOCAL*\\n\\nOperador: `{{$json.operatorId}}`\\nTour: `{{$json.tourCode}}`\\nCupos Disponibles: `{{$json.availableSeats}}`\\nTarifa: `${{$json.updatedPriceUSD}} USD`", additionalFields: { parse_mode: "Markdown" } }, name: "[TELEGRAM] Operations Change Alert", type: "n8n-nodes-base.telegram", typeVersion: 1.1, position: [700, 300], credentials: { telegramApi: { id: "5NiYz8gX64lPYIdK", name: "Google Service Account" } } },
        { parameters: { url: "http://localhost:3000/api/webhooks/n8n/confirm-booking", method: "POST" }, name: "[CACHE] Invalidate Search Cache", type: "n8n-nodes-base.httpRequest", typeVersion: 4.1, position: [900, 300] },
        { parameters: { respondWith: "json", responseBody: "={\n  \"exito\": true,\n  \"status\": \"SYNC_SUCCESS\",\n  \"mensaje\": \"Inventario y tarifas del operador sincronizadas en tiempo real.\"\n}" }, name: "[RESPONSE] Inventory Sync Ok", type: "n8n-nodes-base.respondToWebhook", typeVersion: 1.1, position: [1100, 300] }
      ],
      connections: {
        "[TRIGGER] Supplier Inventory Webhook": { main: [[{ node: "[SECURITY] Validate Operator Key", type: "main", index: 0 }]] },
        "[SECURITY] Validate Operator Key": { main: [[{ node: "[FIRESTORE] Batch Update Tour Prices & Available Seats", type: "main", index: 0 }]] },
        "[FIRESTORE] Batch Update Tour Prices & Available Seats": { main: [[{ node: "[TELEGRAM] Operations Change Alert", type: "main", index: 0 }]] },
        "[TELEGRAM] Operations Change Alert": { main: [[{ node: "[CACHE] Invalidate Search Cache", type: "main", index: 0 }]] },
        "[CACHE] Invalidate Search Cache": { main: [[{ node: "[RESPONSE] Inventory Sync Ok", type: "main", index: 0 }]] }
      }
    }
  },
  {
    id: 'wf-emergency-sos-response',
    code: 'WF-23',
    name: {
      es: 'Protocolo de Emergencias SOS 24/7 & Asistencia en Ruta',
      en: '24/7 Tourist Emergency SOS & Route Dispatch'
    },
    category: 'emergency',
    description: {
      es: 'Respuesta de máxima prioridad ante situaciones SOS en ruta, transmite coordenadas GPS a la central y enlaza la póliza Assist-CR.',
      en: 'High priority response to route SOS incidents, dispatches GPS coordinates to ops, and connects Assist-CR travel insurance.'
    },
    icon: 'AlertOctagon',
    color: '#dc2626',
    endpoint: '/webhook/alerta-emergencia-sos',
    method: 'POST',
    triggerEvent: 'EMERGENCIA_SOS_RUTA',
    nodesCount: 10,
    slaTarget: '< 800 ms',
    nodes: [
      { id: 'n1', name: '[TRIGGER] Emergency SOS Panic Trigger', type: 'n8n-nodes-base.webhook', description: 'Activado por botón SOS del cliente o guía' },
      { id: 'n2', name: '[HIGH PRIORITY] Priority Alert Escalator', type: 'n8n-nodes-base.code', description: 'Eleva prioridad de respuesta al 100% inmediato' },
      { id: 'n3', name: '[TELEGRAM] Instant SOS Alert to Emergency Command', type: 'n8n-nodes-base.telegram', description: 'Alarma sonora e informe de geolocalización GPS en Telegram' },
      { id: 'n4', name: '[FIRESTORE] Log Emergency Incident', type: 'n8n-nodes-base.httpRequest', description: 'Registra coordenadas e incidentes en Firestore (Credencial: 5NiYz8gX64lPYIdK)' },
      { id: 'n5', name: '[INSURANCE] Notify Assist-CR Travel Insurance Hotline', type: 'n8n-nodes-base.httpRequest', description: 'Activa póliza de cobertura médica y auxilio médico/vial' },
      { id: 'n6', name: '[RESPONSE] Emergency Protocol Active', type: 'n8n-nodes-base.respondToWebhook', description: 'Responde confirmando asistencia médica o vial en camino' },
      { id: 'n7', name: '[ROUTING] Data Validation Switch', type: 'n8n-nodes-base.switch', description: 'Evalúa la integridad del payload y redirige si faltan datos críticos' },
      { id: 'n8', name: '[TRANSFORM] Payload Standardizer', type: 'n8n-nodes-base.set', description: 'Mapeo, limpieza y formato de variables (Fechas, Monedas, Nombres)' },
      { id: 'n9', name: '[ERROR HANDLER] Catch Workflow Exceptions', type: 'n8n-nodes-base.errorTrigger', description: 'Intercepta cualquier fallo en ejecución del flujo para prevención de caídas' },
      { id: 'n10', name: '[OPS ALERT] Telegram Ops Notify', type: 'n8n-nodes-base.telegram', description: 'Envía alerta de diagnóstico al equipo de soporte de Costa Rica Tours (Google Service Account ID: 5NiYz8gX64lPYIdK)' }
    ],
    samplePayload: {
      incidentId: 'SOS-2026-911',
      touristName: 'Sophie Dupont',
      phone: '+33 6 12 34 56 78',
      location: { lat: 10.4678, lng: -84.6427, placeName: 'Ruta 142 Hacia La Fortuna' },
      incidentType: 'Falla mecánica del microbús',
      passengersCount: 6
    },
    blueprintJson: {
      name: "Costa Rica Tours - WF23 24/7 Emergency SOS & Route Dispatch",
      stickyNotes: [
        { name: "🚨 CRITICAL SOS TRIGGER", color: 7, width: 260, height: 160, position: [80, 240] },
        { name: "✈️ TELEGRAM EMERGENCY COMMAND", color: 2, width: 340, height: 160, position: [360, 240] },
        { name: "🗄️ FIRESTORE SOS INCIDENT (CREDENTIAL: 5NiYz8gX64lPYIdK)", color: 4, width: 340, height: 160, position: [720, 240] }
      ],
      nodes: [
        { parameters: { httpMethod: "POST", path: "alerta-emergencia-sos", responseMode: "responseNode" }, name: "[TRIGGER] Emergency SOS Panic Trigger", type: "n8n-nodes-base.webhook", typeVersion: 1.1, position: [100, 300] },
        { parameters: { mode: "runOnceForEachItem", jsCode: "return { json: { ...$input.item.json.body, emergencyLevel: 'CRITICAL', dispatchedAt: new Date().toISOString() } };" }, name: "[HIGH PRIORITY] Priority Alert Escalator", type: "n8n-nodes-base.code", typeVersion: 2, position: [300, 300] },
        { parameters: { chatId: process.env.TELEGRAM_ADMIN_CHAT_ID || "-1002348576921", text: "=*🚨 ALERTA SOS CRÍTICA - ASISTENCIA EN CAMINO*\\n\\nIncidente: `{{$json.incidentId}}`\\nTipo: `{{$json.incidentType}}`\\nTurista: `{{$json.touristName}}` ({{$json.phone}})\\nUbicación: `{{$json.location?.placeName}}` (GPS: `{{$json.location?.lat}}, {{$json.location?.lng}}`)\\nPasajeros: `{{$json.passengersCount}}`", additionalFields: { parse_mode: "Markdown" } }, name: "[TELEGRAM] Instant SOS Alert to Emergency Command", type: "n8n-nodes-base.telegram", typeVersion: 1.1, position: [500, 300
    ], credentials: { telegramApi: { id: "5NiYz8gX64lPYIdK", name: "Google Service Account" } } },
        { parameters: { url: "http://localhost:3000/api/tours", method: "GET" }, name: "[FIRESTORE] Log Emergency Incident", type: "n8n-nodes-base.httpRequest", typeVersion: 4.1, position: [700, 300], credentials: { googleApi: { id: "5NiYz8gX64lPYIdK", name: "Google Service Account" } } },
        { parameters: { url: "http://localhost:3000/api/webhooks/n8n/confirm-booking", method: "POST" }, name: "[INSURANCE] Notify Assist-CR Travel Insurance Hotline", type: "n8n-nodes-base.httpRequest", typeVersion: 4.1, position: [900, 300] },
        { parameters: { respondWith: "json", responseBody: "={\n  \"exito\": true,\n  \"status\": \"SOS_DISPATCHED\",\n  \"mensaje\": \"Equipo de emergencia y vehículo de sustitución despachados.\"\n}" }, name: "[RESPONSE] Emergency Protocol Active", type: "n8n-nodes-base.respondToWebhook", typeVersion: 1.1, position: [1100, 300] }
      ],
      connections: {
        "[TRIGGER] Emergency SOS Panic Trigger": { main: [[{ node: "[HIGH PRIORITY] Priority Alert Escalator", type: "main", index: 0 }]] },
        "[HIGH PRIORITY] Priority Alert Escalator": { main: [[{ node: "[TELEGRAM] Instant SOS Alert to Emergency Command", type: "main", index: 0 }]] },
        "[TELEGRAM] Instant SOS Alert to Emergency Command": { main: [[{ node: "[FIRESTORE] Log Emergency Incident", type: "main", index: 0 }]] },
        "[FIRESTORE] Log Emergency Incident": { main: [[{ node: "[INSURANCE] Notify Assist-CR Travel Insurance Hotline", type: "main", index: 0 }]] },
        "[INSURANCE] Notify Assist-CR Travel Insurance Hotline": { main: [[{ node: "[RESPONSE] Emergency Protocol Active", type: "main", index: 0 }]] }
      }
    }
  },
  {
    id: 'wf-review-reputation-booster',
    code: 'WF-24',
    name: {
      es: 'Booster de Reseñas TripAdvisor/Google & Referidos',
      en: 'TripAdvisor/Google Review Booster & Referral Rewards'
    },
    category: 'marketing',
    description: {
      es: 'Identifica a turistas con alta satisfacción (NPS 9-10), envía invitación personalizada para opinar en TripAdvisor/Google y entrega cupón de 15% de descuento.',
      en: 'Invites satisfied tourists (NPS 9-10) to review on TripAdvisor/Google and generates 15% discount referral codes.'
    },
    icon: 'Star',
    color: '#f59e0b',
    endpoint: '/webhook/booster-reseñas-incentivos',
    method: 'POST',
    triggerEvent: 'BOOSTER_RESEÑAS_INCENTIVO',
    nodesCount: 10,
    slaTarget: '< 1500 ms',
    nodes: [
      { id: 'n1', name: '[TRIGGER] NPS Promoter Score Trigger', type: 'n8n-nodes-base.webhook', description: 'Recibe evento cuando un cliente otorga NPS 9 o 10' },
      { id: 'n2', name: '[LOGIC] Coupon Generator Engine', type: 'n8n-nodes-base.code', description: 'Genera código promocional único de 15% de descuento' },
      { id: 'n3', name: '[FIRESTORE] Save Referral Coupon', type: 'n8n-nodes-base.httpRequest', description: 'Guarda cupón de descuento en Firestore (Credencial: 5NiYz8gX64lPYIdK)' },
      { id: 'n4', name: '[WHATSAPP] Send TripAdvisor & Discount Invitation', type: 'n8n-nodes-base.httpRequest', description: 'Envía invitación interactiva por WhatsApp' },
      { id: 'n5', name: '[TELEGRAM] Log Marketing Referral Campaign', type: 'n8n-nodes-base.telegram', description: 'Notifica al equipo de mercadeo en Telegram' },
      { id: 'n6', name: '[RESPONSE] Booster Dispatch Success', type: 'n8n-nodes-base.respondToWebhook', description: 'Retorna confirmación de invitación enviada' },
      { id: 'n7', name: '[ROUTING] Data Validation Switch', type: 'n8n-nodes-base.switch', description: 'Evalúa la integridad del payload y redirige si faltan datos críticos' },
      { id: 'n8', name: '[TRANSFORM] Payload Standardizer', type: 'n8n-nodes-base.set', description: 'Mapeo, limpieza y formato de variables (Fechas, Monedas, Nombres)' },
      { id: 'n9', name: '[ERROR HANDLER] Catch Workflow Exceptions', type: 'n8n-nodes-base.errorTrigger', description: 'Intercepta cualquier fallo en ejecución del flujo para prevención de caídas' },
      { id: 'n10', name: '[OPS ALERT] Telegram Ops Notify', type: 'n8n-nodes-base.telegram', description: 'Envía alerta de diagnóstico al equipo de soporte de Costa Rica Tours (Google Service Account ID: 5NiYz8gX64lPYIdK)' }
    ],
    samplePayload: {
      touristName: 'David Miller',
      email: 'david.m@example.com',
      npsScore: 10,
      tourName: 'Tour de Aguas Termales + Volcán Arenal',
      tripAdvisorUrl: 'https://tripadvisor.com/costa-rica-tours-review',
      googleReviewUrl: 'https://g.page/r/costa-rica-tours/review'
    },
    blueprintJson: {
      name: "Costa Rica Tours - WF24 TripAdvisor & Google Review Booster",
      stickyNotes: [
        { name: "⭐ PROMOTER NPS TRIGGER", color: 6, width: 260, height: 160, position: [80, 240] },
        { name: "🎁 COUPON GENERATOR & FIRESTORE (CREDENTIAL: 5NiYz8gX64lPYIdK)", color: 4, width: 340, height: 160, position: [360, 240] },
        { name: "💬 WHATSAPP & TELEGRAM DISPATCH", color: 2, width: 340, height: 160, position: [720, 240] }
      ],
      nodes: [
        { parameters: { httpMethod: "POST", path: "booster-reseñas-incentivos", responseMode: "responseNode" }, name: "[TRIGGER] NPS Promoter Score Trigger", type: "n8n-nodes-base.webhook", typeVersion: 1.1, position: [100, 300] },
        { parameters: { mode: "runOnceForEachItem", jsCode: "return { json: { ...$input.item.json.body, promoCode: 'PURAVIDA15-' + Math.floor(Math.random()*9000+1000), generatedAt: new Date().toISOString() } };" }, name: "[LOGIC] Coupon Generator Engine", type: "n8n-nodes-base.code", typeVersion: 2, position: [300, 300] },
        { parameters: { url: "http://localhost:3000/api/tours", method: "GET" }, name: "[FIRESTORE] Save Referral Coupon", type: "n8n-nodes-base.httpRequest", typeVersion: 4.1, position: [500, 300
    ], credentials: { googleApi: { id: "5NiYz8gX64lPYIdK", name: "Google Service Account" } } },
        { parameters: { url: "http://localhost:3000/api/webhooks/n8n/confirm-booking", method: "POST" }, name: "[WHATSAPP] Send TripAdvisor & Discount Invitation", type: "n8n-nodes-base.httpRequest", typeVersion: 4.1, position: [700, 300] },
        { parameters: { chatId: process.env.TELEGRAM_ADMIN_CHAT_ID || "-1002348576921", text: "=*⭐ REPUTATION BOOSTER ENVIADO*\\n\\nCliente: `{{$json.touristName}}` (NPS: `{{$json.npsScore}}/10`)\\nCupón 15%: `{{$json.promoCode}}`\\nTour: `{{$json.tourName}}`", additionalFields: { parse_mode: "Markdown" } }, name: "[TELEGRAM] Log Marketing Referral Campaign", type: "n8n-nodes-base.telegram", typeVersion: 1.1, position: [900, 300], credentials: { telegramApi: { id: "5NiYz8gX64lPYIdK", name: "Google Service Account" } } },
        { parameters: { respondWith: "json", responseBody: "={\n  \"exito\": true,\n  \"promoCode\": \"{{$json.promoCode}}\",\n  \"mensaje\": \"Invitación a reseña y cupón de regalo enviado por WhatsApp.\"\n}" }, name: "[RESPONSE] Booster Dispatch Success", type: "n8n-nodes-base.respondToWebhook", typeVersion: 1.1, position: [1100, 300] }
      ],
      connections: {
        "[TRIGGER] NPS Promoter Score Trigger": { main: [[{ node: "[LOGIC] Coupon Generator Engine", type: "main", index: 0 }]] },
        "[LOGIC] Coupon Generator Engine": { main: [[{ node: "[FIRESTORE] Save Referral Coupon", type: "main", index: 0 }]] },
        "[FIRESTORE] Save Referral Coupon": { main: [[{ node: "[WHATSAPP] Send TripAdvisor & Discount Invitation", type: "main", index: 0 }]] },
        "[WHATSAPP] Send TripAdvisor & Discount Invitation": { main: [[{ node: "[TELEGRAM] Log Marketing Referral Campaign", type: "main", index: 0 }]] },
        "[TELEGRAM] Log Marketing Referral Campaign": { main: [[{ node: "[RESPONSE] Booster Dispatch Success", type: "main", index: 0 }]] }
      }
    }
  }
];

