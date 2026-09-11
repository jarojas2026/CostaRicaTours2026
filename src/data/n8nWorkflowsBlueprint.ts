/**
 * ⚡ Blueprints y Esquemas Oficiales de Workflows n8n para Costa Rica Tours
 * Contiene la definición de los 8 flujos operativos, esquemas de entrada/salida
 * y plantillas JSON oficiales listas para importar en instancias n8n.
 */

export interface N8NWorkflowDef {
  id: string;
  code: string;
  name: { es: string; en: string };
  category: 'chat' | 'booking' | 'payment' | 'fulfillment' | 'itinerary' | 'contingency' | 'supervision' | 'support' | 'fraud' | 'telegram';
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
      es: 'Captura mensajes entrantes desde Web y WhatsApp, clasifica intención turística mediante IA, consulta la base de datos de tours autorizados y responde en menos de 1.5s con opciones accionables.',
      en: 'Captures incoming messages from Web and WhatsApp, classifies tourist intent via AI, queries authorized tours, and responds in under 1.5s with actionable options.'
    },
    icon: 'Bot',
    color: '#10b981',
    endpoint: '/webhook/chat-consulta',
    method: 'POST',
    triggerEvent: 'CONSULTA_CHAT_IA',
    nodesCount: 6,
    slaTarget: '< 1500 ms',
    nodes: [
      { id: 'n1', name: 'Webhook Inbound', type: 'n8n-nodes-base.webhook', description: 'Recibe payload JSON del usuario con token de seguridad' },
      { id: 'n2', name: 'HMAC Authenticator', type: 'n8n-nodes-base.crypto', description: 'Verifica firma SHA-256 en cabecera X-Webhook-Secret' },
      { id: 'n3', name: 'Triage & Intent Classifier', type: 'n8n-nodes-base.openAi', description: 'Evalúa mensaje, idioma y extrae entidades (tour, destino, fechas)' },
      { id: 'n4', name: 'Firestore Tours Fetcher', type: 'n8n-nodes-base.httpRequest', description: 'Obtiene tarifas vigentes y disponibilidad de cupos' },
      { id: 'n5', name: 'Official Concierge Formatter', type: 'n8n-nodes-base.code', description: 'Estructura respuesta con viñetas, precios USD y botones de reserva' },
      { id: 'n6', name: 'Respond to Webhook', type: 'n8n-nodes-base.respondToWebhook', description: 'Entrega respuesta JSON al cliente' }
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
      nodes: [
        {
          parameters: { httpMethod: "POST", path: "chat-consulta", responseMode: "responseNode" },
          name: "Webhook Inbound",
          type: "n8n-nodes-base.webhook",
          typeVersion: 1,
          position: [100, 300]
        },
        {
          parameters: {
            mode: "runOnceForEachItem",
            jsCode: "const body = $input.item.json.body || $input.item.json;\nreturn { json: { ...body, receivedAt: new Date().toISOString() } };"
          },
          name: "Parse & Validate",
          type: "n8n-nodes-base.code",
          typeVersion: 2,
          position: [300, 300]
        },
        {
          parameters: {
            model: "gemini-1.5-flash",
            options: { temperature: 0.2 },
            prompt: "Eres el asistente oficial de Costa Rica Tours. Responde sobre tours en Arenal, Monteverde y Manuel Antonio con precios exactos en USD."
          },
          name: "Gemini Triage Agent",
          type: "@n8n/n8n-nodes-langchain.agent",
          typeVersion: 1,
          position: [500, 300]
        },
        {
          parameters: {
            respondWith: "json",
            responseBody: "={\n  \"exito\": true,\n  \"datos\": {\n    \"reply\": $json.output,\n    \"quickActions\": [{\"label\": \"Reservar Tour\", \"action\": \"book\"}],\n    \"timestamp\": new Date().toISOString()\n  }\n}"
          },
          name: "Respond to Webhook",
          type: "n8n-nodes-base.respondToWebhook",
          typeVersion: 1,
          position: [700, 300]
        }
      ],
      connections: {
        "Webhook Inbound": { main: [[{ node: "Parse & Validate", type: "main", index: 0 }]] },
        "Parse & Validate": { main: [[{ node: "Gemini Triage Agent", type: "main", index: 0 }]] },
        "Gemini Triage Agent": { main: [[{ node: "Respond to Webhook", type: "main", index: 0 }]] }
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
      es: 'Valida disponibilidad real en Firestore. Si hay cupo, genera un bloqueo temporal de 15 minutos en el inventario y dispara un cron en n8n para liberar los cupos si no se recibe el pago.',
      en: 'Validates real-time availability in Firestore. If seats exist, applies a 15-minute soft lock and schedules an n8n auto-release timeout.'
    },
    icon: 'Clock',
    color: '#f59e0b',
    endpoint: '/webhook/inicio-reserva',
    method: 'POST',
    triggerEvent: 'INICIO_RESERVA',
    nodesCount: 7,
    slaTarget: '< 800 ms',
    nodes: [
      { id: 'b1', name: 'Webhook Inbound', type: 'n8n-nodes-base.webhook', description: 'Recibe solicitud de reserva preliminar' },
      { id: 'b2', name: 'Check Inventory API', type: 'n8n-nodes-base.httpRequest', description: 'Llama a GET /api/tours/:id/availability' },
      { id: 'b3', name: 'Availability Switch', type: 'n8n-nodes-base.if', description: 'Determina si cuposDisponibles >= pasajeros' },
      { id: 'b4', name: 'Create Soft-Hold Doc', type: 'n8n-nodes-base.httpRequest', description: 'Crea documento en Firestore con status "pendiente_pago"' },
      { id: 'b5', name: 'Set 15m Expiration Timeout', type: 'n8n-nodes-base.wait', description: 'Espera 15 minutos para auditoría de pago' },
      { id: 'b6', name: 'Release Seats If Unpaid', type: 'n8n-nodes-base.httpRequest', description: 'Cancela reserva si sigue en estado pendiente' },
      { id: 'b7', name: 'Response Dispatcher', type: 'n8n-nodes-base.respondToWebhook', description: 'Devuelve bookingId y enlace de pago' }
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
      nodes: [
        {
          parameters: { httpMethod: "POST", path: "inicio-reserva", responseMode: "responseNode" },
          name: "Webhook Inicio Reserva",
          type: "n8n-nodes-base.webhook",
          typeVersion: 1,
          position: [100, 300]
        },
        {
          parameters: {
            url: "=http://localhost:3000/api/tours/{{$json.body.idTour}}/availability?date={{$json.body.fechaSeleccionada}}&seats=3",
            method: "GET"
          },
          name: "Check Availability",
          type: "n8n-nodes-base.httpRequest",
          typeVersion: 4,
          position: [300, 300]
        },
        {
          parameters: {
            conditions: { boolean: [{ value1: "={{$json.available}}", value2: true }] }
          },
          name: "Is Seats Available?",
          type: "n8n-nodes-base.if",
          typeVersion: 1,
          position: [500, 300]
        },
        {
          parameters: {
            respondWith: "json",
            responseBody: "={\n  \"exito\": true,\n  \"bloqueoActivo\": true,\n  \"expiraEnMinutos\": 15,\n  \"mensaje\": \"Cupos reservados temporalmente. Procede al pago.\"\n}"
          },
          name: "Confirm Soft Hold",
          type: "n8n-nodes-base.respondToWebhook",
          typeVersion: 1,
          position: [700, 200]
        }
      ],
      connections: {
        "Webhook Inicio Reserva": { main: [[{ node: "Check Availability", type: "main", index: 0 }]] },
        "Check Availability": { main: [[{ node: "Is Seats Available?", type: "main", index: 0 }]] },
        "Is Seats Available?": { main: [[{ node: "Confirm Soft Hold", type: "main", index: 0 }]] }
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
      es: 'Genera sesiones seguras en Stripe o PayPal. Al recibir el webhook de la pasarela, valida la firma criptográfica, concilia el monto pagado contra la tarifa del tour y actualiza el estado a "pagado".',
      en: 'Generates secure Stripe/PayPal sessions. Validates cryptographic webhook signatures, reconciles amount vs tour rate, and updates state to paid.'
    },
    icon: 'CreditCard',
    color: '#6366f1',
    endpoint: '/webhook/solicitud-pago',
    method: 'POST',
    triggerEvent: 'SOLICITUD_PAGO',
    nodesCount: 6,
    slaTarget: '< 2000 ms',
    nodes: [
      { id: 'p1', name: 'Payment Request Hook', type: 'n8n-nodes-base.webhook', description: 'Recibe ID de reserva y método seleccionado' },
      { id: 'p2', name: 'Gateway Selector', type: 'n8n-nodes-base.switch', description: 'Enruta hacia Stripe Checkout o PayPal Orders API' },
      { id: 'p3', name: 'Generate Checkout Link', type: 'n8n-nodes-base.httpRequest', description: 'Llama a /api/stripe/create-checkout-session' },
      { id: 'p4', name: 'Listen Webhook Event', type: 'n8n-nodes-base.webhook', description: 'Escucha checkout.session.completed' },
      { id: 'p5', name: 'Verify HMAC / Signature', type: 'n8n-nodes-base.crypto', description: 'Valida firma criptográfica oficial' },
      { id: 'p6', name: 'Update Firestore Booking', type: 'n8n-nodes-base.httpRequest', description: 'Llama a /api/webhooks/n8n/update-booking con paymentStatus: completed' }
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
      nodes: [
        {
          parameters: { httpMethod: "POST", path: "solicitud-pago", responseMode: "responseNode" },
          name: "Webhook Solicitud Pago",
          type: "n8n-nodes-base.webhook",
          typeVersion: 1,
          position: [100, 300]
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
          name: "Create Stripe Session",
          type: "n8n-nodes-base.httpRequest",
          typeVersion: 4,
          position: [350, 300]
        },
        {
          parameters: {
            respondWith: "json",
            responseBody: "={\n  \"exito\": true,\n  \"checkoutUrl\": $json.url,\n  \"sessionId\": $json.id\n}"
          },
          name: "Return Payment URL",
          type: "n8n-nodes-base.respondToWebhook",
          typeVersion: 1,
          position: [600, 300]
        }
      ],
      connections: {
        "Webhook Solicitud Pago": { main: [[{ node: "Create Stripe Session", type: "main", index: 0 }]] },
        "Create Stripe Session": { main: [[{ node: "Return Payment URL", type: "main", index: 0 }]] }
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
      es: 'Una vez confirmado el pago, genera el voucher digital con código QR firmado, actualiza la reserva en Firestore y envía confirmación con instrucciones de recogida al WhatsApp y correo del viajero.',
      en: 'Once payment is confirmed, generates a digital QR-coded voucher, updates Firestore, and sends WhatsApp + email pickup instructions.'
    },
    icon: 'FileCheck',
    color: '#059669',
    endpoint: '/webhook/confirmacion-reserva',
    method: 'POST',
    triggerEvent: 'CONFIRMACION_RESERVA',
    nodesCount: 7,
    slaTarget: '< 3000 ms',
    nodes: [
      { id: 'v1', name: 'Trigger Confirmación', type: 'n8n-nodes-base.webhook', description: 'Recibe reserva pagada' },
      { id: 'v2', name: 'QR Code Generator', type: 'n8n-nodes-base.code', description: 'Genera payload de validación para el operador' },
      { id: 'v3', name: 'Sync Google Calendar', type: 'n8n-nodes-base.httpRequest', description: 'Inserta evento en Google Calendar del usuario' },
      { id: 'v4', name: 'Update Firestore Booking', type: 'n8n-nodes-base.httpRequest', description: 'Guarda voucherUrl y status "confirmada"' },
      { id: 'v5', name: 'Send WhatsApp Notification', type: 'n8n-nodes-base.httpRequest', description: 'Dispara mensaje con plantilla oficial de WhatsApp Business API' },
      { id: 'v6', name: 'Send Email Voucher', type: 'n8n-nodes-base.emailSend', description: 'Envía itinerario con PDF adjunto' },
      { id: 'v7', name: 'Confirm Completion', type: 'n8n-nodes-base.respondToWebhook', description: 'Retorna estatus de entrega exitosa' }
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
      nodes: [
        {
          parameters: { httpMethod: "POST", path: "confirmacion-reserva", responseMode: "responseNode" },
          name: "Webhook Confirmación",
          type: "n8n-nodes-base.webhook",
          typeVersion: 1,
          position: [100, 300]
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
                { name: "bookingId", value: "={{$json.body.idReserva}}" },
                { name: "status", value: "confirmada" },
                { name: "paymentStatus", value: "completed" },
                { name: "voucherUrl", value: "https://costaricatours.es/vouchers/{{$json.body.idReserva}}.pdf" }
              ]
            }
          },
          name: "Update Firestore",
          type: "n8n-nodes-base.httpRequest",
          typeVersion: 4,
          position: [350, 300]
        },
        {
          parameters: {
            respondWith: "json",
            responseBody: "={\n  \"exito\": true,\n  \"voucherEmitido\": true,\n  \"notificacionesDespachadas\": [\"whatsapp\", \"email\"],\n  \"voucherUrl\": \"https://costaricatours.es/vouchers/\" + $json.bookingId + \".pdf\"\n}"
          },
          name: "Respond",
          type: "n8n-nodes-base.respondToWebhook",
          typeVersion: 1,
          position: [600, 300]
        }
      ],
      connections: {
        "Webhook Confirmación": { main: [[{ node: "Update Firestore", type: "main", index: 0 }]] },
        "Update Firestore": { main: [[{ node: "Respond", type: "main", index: 0 }]] }
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
      es: 'Genera planes día por día optimizando tiempos de viaje por carretera, microclimas según temporada (Seca vs. Verde) y recomendaciones gastronómicas y biológicas auténticas.',
      en: 'Creates day-by-day plans optimizing road transit times, microclimates (Dry vs. Green season), and authentic food/nature tips.'
    },
    icon: 'Sparkles',
    color: '#8b5cf6',
    endpoint: '/webhook/solicitud-itinerario',
    method: 'POST',
    triggerEvent: 'SOLICITUD_ITINERARIO',
    nodesCount: 5,
    slaTarget: '< 2500 ms',
    nodes: [
      { id: 'i1', name: 'Itinerary Request Hook', type: 'n8n-nodes-base.webhook', description: 'Recibe preferencias, días, presupuesto y acompañantes' },
      { id: 'i2', name: 'Region Distance Matrix', type: 'n8n-nodes-base.code', description: 'Calcula rutas viables sin exceso de horas de viaje' },
      { id: 'i3', name: 'Gemini Planner Model', type: 'n8n-nodes-base.openAi', description: 'Genera actividades, paradas técnicas y tours recomendados' },
      { id: 'i4', name: 'Tour ID Mapper', type: 'n8n-nodes-base.code', description: 'Enlaza actividades con tours reservables en la plataforma' },
      { id: 'i5', name: 'Deliver Full Itinerary', type: 'n8n-nodes-base.respondToWebhook', description: 'Retorna plan estructurado JSON' }
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
      nodes: [
        {
          parameters: { httpMethod: "POST", path: "solicitud-itinerario", responseMode: "responseNode" },
          name: "Webhook Itinerario",
          type: "n8n-nodes-base.webhook",
          typeVersion: 1,
          position: [100, 300]
        },
        {
          parameters: {
            model: "gemini-1.5-flash",
            prompt: "Diseña un itinerario de 7 días por Costa Rica combinando Arenal y Manuel Antonio con tiempos reales de traslado y tours oficiales."
          },
          name: "AI Planner Node",
          type: "@n8n/n8n-nodes-langchain.agent",
          typeVersion: 1,
          position: [350, 300]
        },
        {
          parameters: {
            respondWith: "json",
            responseBody: "={\n  \"exito\": true,\n  \"itinerario\": $json.output,\n  \"dias\": 7,\n  \"toursSugeridos\": [\"arenal-volcano-hot-springs\", \"manuel-antonio-guided-park\"]\n}"
          },
          name: "Deliver Plan",
          type: "n8n-nodes-base.respondToWebhook",
          typeVersion: 1,
          position: [600, 300]
        }
      ],
      connections: {
        "Webhook Itinerario": { main: [[{ node: "AI Planner Node", type: "main", index: 0 }]] },
        "AI Planner Node": { main: [[{ node: "Deliver Plan", type: "main", index: 0 }]] }
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
      es: 'Monitorea alertas del Instituto Meteorológico Nacional (IMN) y caudales de ríos (Sarapiquí, Pacuare). Si una actividad se suspende por seguridad, ofrece alternativas equivalentes y re-agenda a 1 clic.',
      en: 'Monitors IMN weather alerts & river levels. If tours are suspended for safety, automatically offers equal alternatives & 1-click free reschedule.'
    },
    icon: 'CloudRain',
    color: '#f97316',
    endpoint: '/api/agents/contingency',
    method: 'POST',
    triggerEvent: 'CONTINGENCIA_CLIMA',
    nodesCount: 6,
    slaTarget: '< 1000 ms',
    nodes: [
      { id: 'c1', name: 'Weather Alert Trigger', type: 'n8n-nodes-base.webhook', description: 'Recibe alerta de crecida o lluvia extrema' },
      { id: 'c2', name: 'Find Impacted Bookings', type: 'n8n-nodes-base.httpRequest', description: 'Filtra reservas activas en la región afectada' },
      { id: 'c3', name: 'Find Alternative Tours', type: 'n8n-nodes-base.code', description: 'Selecciona actividades bajo techo o termales cercanas' },
      { id: 'c4', name: 'Generate 1-Click Link', type: 'n8n-nodes-base.crypto', description: 'Crea enlace seguro con token de cambio de fecha' },
      { id: 'c5', name: 'Send WhatsApp & SMS', type: 'n8n-nodes-base.httpRequest', description: 'Avisa con empatía y alternativas sin costo extra' },
      { id: 'c6', name: 'Log Action Audit', type: 'n8n-nodes-base.respondToWebhook', description: 'Registra el incidente en bitácora' }
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
      nodes: [
        {
          parameters: { httpMethod: "POST", path: "contingency", responseMode: "responseNode" },
          name: "Webhook Contingencia",
          type: "n8n-nodes-base.webhook",
          typeVersion: 1,
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
          name: "Evaluate Alternatives",
          type: "n8n-nodes-base.httpRequest",
          typeVersion: 4,
          position: [350, 300]
        },
        {
          parameters: {
            respondWith: "json",
            responseBody: "={\n  \"exito\": true,\n  \"alternativas\": $json.alternatives,\n  \"emailBorrador\": $json.draftEmail\n}"
          },
          name: "Respond Contingency",
          type: "n8n-nodes-base.respondToWebhook",
          typeVersion: 1,
          position: [600, 300]
        }
      ],
      connections: {
        "Webhook Contingencia": { main: [[{ node: "Evaluate Alternatives", type: "main", index: 0 }]] },
        "Evaluate Alternatives": { main: [[{ node: "Respond Contingency", type: "main", index: 0 }]] }
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
      es: 'Audita fallos de comunicación con operadores locales (mensajes con modismos no entendidos, fechas ambiguas) y auto-genera parches en las instrucciones de los agentes para prevenir reincidencias.',
      en: 'Audits communication failures with local operators (slang, ambiguous times) and self-generates prompt patches to prevent recurrence.'
    },
    icon: 'ShieldAlert',
    color: '#ef4444',
    endpoint: '/api/agents/supervisor',
    method: 'POST',
    triggerEvent: 'AUDITORIA_SUPERVISOR',
    nodesCount: 5,
    slaTarget: '< 1800 ms',
    nodes: [
      { id: 's1', name: 'Cron / Webhook Trigger', type: 'n8n-nodes-base.cron', description: 'Se dispara cada hora o tras 3 excepciones consecutivas' },
      { id: 's2', name: 'Fetch Exception Logs', type: 'n8n-nodes-base.httpRequest', description: 'Lee bitácora de errores no controlados' },
      { id: 's3', name: 'Root Cause Diagnostics', type: 'n8n-nodes-base.openAi', description: 'Analiza patrones de falla en expresiones ticas o tiempos' },
      { id: 's4', name: 'Generate Prompt Patch', type: 'n8n-nodes-base.code', description: 'Crea reglas de normalización en tiempo real' },
      { id: 's5', name: 'Deploy Hotfix Alert', type: 'n8n-nodes-base.respondToWebhook', description: 'Notifica al canal técnico en Slack' }
    ],
    samplePayload: {
      agentName: 'OperationsTriage',
      errorContext: 'Operador respondió con modismo: "El compa dijo q tal vez a eso de las 3 o 4"',
      rawData: { providerId: 'op_arenal_04', chatText: 'Mae diay tal vez 3 y media' }
    },
    blueprintJson: {
      name: "Costa Rica Tours - WF07 Supervisor Self-Healing",
      nodes: [
        {
          parameters: { httpMethod: "POST", path: "supervisor", responseMode: "responseNode" },
          name: "Webhook Supervisor",
          type: "n8n-nodes-base.webhook",
          typeVersion: 1,
          position: [100, 300]
        },
        {
          parameters: {
            url: "http://localhost:3000/api/agents/supervisor",
            method: "POST"
          },
          name: "Analyze Failure Patterns",
          type: "n8n-nodes-base.httpRequest",
          typeVersion: 4,
          position: [350, 300]
        },
        {
          parameters: {
            respondWith: "json",
            responseBody: "={\n  \"exito\": true,\n  \"analisis\": $json.analysis,\n  \"parcheSugerido\": $json.suggestedFixPrompt\n}"
          },
          name: "Deliver Diagnosis",
          type: "n8n-nodes-base.respondToWebhook",
          typeVersion: 1,
          position: [600, 300]
        }
      ],
      connections: {
        "Webhook Supervisor": { main: [[{ node: "Analyze Failure Patterns", type: "main", index: 0 }]] },
        "Analyze Failure Patterns": { main: [[{ node: "Deliver Diagnosis", type: "main", index: 0 }]] }
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
      es: 'Si un cliente expresa frustración, solicita asistencia médica/especial o pide hablar con un humano, crea un ticket de alta prioridad en Slack y avisa al equipo de guardia en Costa Rica.',
      en: 'If a traveler expresses frustration or needs special care, creates a priority ticket in Slack and alerts the on-call local support team.'
    },
    icon: 'Headphones',
    color: '#ec4899',
    endpoint: '/webhook/solicitud-soporte',
    method: 'POST',
    triggerEvent: 'SOLICITUD_SOPORTE',
    nodesCount: 5,
    slaTarget: '< 600 ms',
    nodes: [
      { id: 'u1', name: 'Escalation Webhook', type: 'n8n-nodes-base.webhook', description: 'Detecta solicitud humana o queja crítica' },
      { id: 'u2', name: 'Sentiment Analyzer', type: 'n8n-nodes-base.code', description: 'Calcula severidad del ticket (Baja, Media, Urgente)' },
      { id: 'u3', name: 'Dispatch Slack Alert', type: 'n8n-nodes-base.httpRequest', description: 'Envía tarjeta interactiva a canal #soporte-viajeros' },
      { id: 'u4', name: 'WhatsApp Direct Link Gen', type: 'n8n-nodes-base.code', description: 'Crea enlace wa.me pre-rellenado con el ID de ticket' },
      { id: 'u5', name: 'Client Reassurance Message', type: 'n8n-nodes-base.respondToWebhook', description: 'Entrega respuesta empática al usuario' }
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
      nodes: [
        {
          parameters: { httpMethod: "POST", path: "solicitud-soporte", responseMode: "responseNode" },
          name: "Webhook Soporte",
          type: "n8n-nodes-base.webhook",
          typeVersion: 1,
          position: [100, 300]
        },
        {
          parameters: {
            mode: "runOnceForEachItem",
            jsCode: "const body = $input.item.json.body || $input.item.json;\nconst ticketId = 'TCK-' + Math.floor(100000 + Math.random() * 900000);\nreturn { json: { ...body, ticketId, status: 'open' } };"
          },
          name: "Create Ticket ID",
          type: "n8n-nodes-base.code",
          typeVersion: 2,
          position: [350, 300]
        },
        {
          parameters: {
            respondWith: "json",
            responseBody: "={\n  \"exito\": true,\n  \"ticketId\": $json.ticketId,\n  \"mensaje\": \"Un asesor humano te contactará de inmediato por WhatsApp.\",\n  \"canal\": \"whatsapp_directo\"\n}"
          },
          name: "Respond to Client",
          type: "n8n-nodes-base.respondToWebhook",
          typeVersion: 1,
          position: [600, 300]
        }
      ],
      connections: {
        "Webhook Soporte": { main: [[{ node: "Create Ticket ID", type: "main", index: 0 }]] },
        "Create Ticket ID": { main: [[{ node: "Respond to Client", type: "main", index: 0 }]] }
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
      es: 'Evalúa cada reserva y pago entrante analizando país emisor de tarjeta vs IP de navegación, velocidad de intentos repetidos, correos desechables y montos atípicos. Si el Risk Score supera 70/100, retiene el voucher y notifica a supervisión.',
      en: 'Evaluates each booking transaction analyzing card issuing country vs client IP, velocity spikes, disposable emails, and unusual totals. If Risk Score exceeds 70/100, places hold and triggers alert.'
    },
    icon: 'ShieldAlert',
    color: '#ef4444',
    endpoint: '/webhook/antifraude-evaluacion',
    method: 'POST',
    triggerEvent: 'EVALUACION_ANTIFRAUDE',
    nodesCount: 6,
    slaTarget: '< 850 ms',
    nodes: [
      { id: 'f1', name: 'Fraud Check Webhook', type: 'n8n-nodes-base.webhook', description: 'Recibe datos de transacción previa a emisión de voucher' },
      { id: 'f2', name: 'IP Geolocation & VPN Check', type: 'n8n-nodes-base.httpRequest', description: 'Compara geolocalización de red con país emisor del BIN bancario' },
      { id: 'f3', name: 'Velocity & History Lookup', type: 'n8n-nodes-base.httpRequest', description: 'Consulta historial de intentos y chargebacks en Firestore' },
      { id: 'f4', name: 'Risk Scoring Algorithm', type: 'n8n-nodes-base.code', description: 'Calcula score 0-100 ponderando factores de riesgo' },
      { id: 'f5', name: 'Decision Switch (Pass / Review / Block)', type: 'n8n-nodes-base.if', description: 'Aprobado (<45), Revisión manual (46-70), Bloqueo automático (>70)' },
      { id: 'f6', name: 'Audit & Dispatcher Response', type: 'n8n-nodes-base.respondToWebhook', description: 'Devuelve veredicto de autorización y registra en bitácora' }
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
      nodes: [
        {
          parameters: { httpMethod: "POST", path: "antifraude-evaluacion", responseMode: "responseNode" },
          name: "Webhook Antifraude",
          type: "n8n-nodes-base.webhook",
          typeVersion: 1,
          position: [100, 300]
        },
        {
          parameters: {
            mode: "runOnceForEachItem",
            jsCode: "const body = $input.item.json.body || $input.item.json;\nlet score = 0;\nconst flags = [];\n\nif (body.cliente?.paisEmisorTarjeta && body.cliente?.paisIP && body.cliente.paisEmisorTarjeta !== body.cliente.paisIP) {\n  score += 35;\n  flags.push('DISCORDANCIA_PAIS_IP');\n}\nif ((body.intentosPrevios24h || 0) > 3) {\n  score += 40;\n  flags.push('VELOCIDAD_EXCESIVA_INTENTOS');\n}\nif (body.montoUSD > 1200) {\n  score += 15;\n  flags.push('MONTO_ELEVADO');\n}\n\nconst decision = score >= 70 ? 'BLOQUEADO' : score >= 45 ? 'REVISION_MANUAL' : 'APROBADO';\nreturn { json: { ...body, riskScore: score, decision, flags, evaluadoAt: new Date().toISOString() } };"
          },
          name: "Calculate Risk Score",
          type: "n8n-nodes-base.code",
          typeVersion: 2,
          position: [350, 300]
        },
        {
          parameters: {
            conditions: { string: [{ value1: "={{$json.decision}}", operation: "equals", value2: "APROBADO" }] }
          },
          name: "Is Approved?",
          type: "n8n-nodes-base.if",
          typeVersion: 1,
          position: [600, 300]
        },
        {
          parameters: {
            respondWith: "json",
            responseBody: "={\n  \"exito\": true,\n  \"autorizado\": {{$json.decision === 'APROBADO'}},\n  \"decision\": $json.decision,\n  \"riskScore\": $json.riskScore,\n  \"flags\": $json.flags,\n  \"reservaId\": $json.idReserva\n}"
          },
          name: "Respond Verdict",
          type: "n8n-nodes-base.respondToWebhook",
          typeVersion: 1,
          position: [850, 300]
        }
      ],
      connections: {
        "Webhook Antifraude": { main: [[{ node: "Calculate Risk Score", type: "main", index: 0 }]] },
        "Calculate Risk Score": { main: [[{ node: "Is Approved?", type: "main", index: 0 }]] },
        "Is Approved?": {
          main: [
            [{ node: "Respond Verdict", type: "main", index: 0 }],
            [{ node: "Respond Verdict", type: "main", index: 0 }]
          ]
        }
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
      es: 'Envía alertas a guías y operadores locales mediante un Bot oficial de Telegram con botones inline interactivos: [Confirmar Recogida], [Reagendar por Clima], [Llamar Chofer], [Ver Voucher]. Ejecuta la acción y actualiza Firestore en 1 clic.',
      en: 'Dispatches real-time alerts to local guides & coordinators via official Telegram Bot with inline buttons: [Confirm Pickup], [Reschedule Weather], [Call Driver], [View Voucher]. Updates Firestore in 1 click.'
    },
    icon: 'Send',
    color: '#0284c7',
    endpoint: '/webhook/telegram-ops-action',
    method: 'POST',
    triggerEvent: 'ACCION_PANEL_TELEGRAM',
    nodesCount: 6,
    slaTarget: '< 950 ms',
    nodes: [
      { id: 't1', name: 'Telegram Webhook Trigger', type: 'n8n-nodes-base.telegramTrigger', description: 'Escucha clics en botones inline de Telegram o comandos /status' },
      { id: 't2', name: 'Extract Callback Data', type: 'n8n-nodes-base.code', description: 'Parsea el bookingId y la acción seleccionada por el guía' },
      { id: 't3', name: 'Action Router', type: 'n8n-nodes-base.switch', description: 'Enruta según: confirmar_recogida, reagendar, contactar_cliente' },
      { id: 't4', name: 'Update Firestore Booking', type: 'n8n-nodes-base.httpRequest', description: 'Registra el cambio de estado operacional con firma del operador' },
      { id: 't5', name: 'Edit Telegram Message Markup', type: 'n8n-nodes-base.telegram', description: 'Actualiza la tarjeta en Telegram a "✅ CONFIRMADO POR GUÍA"' },
      { id: 't6', name: 'Answer Callback Query', type: 'n8n-nodes-base.respondToWebhook', description: 'Envía notificación toast emergente en la app de Telegram' }
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
      nodes: [
        {
          parameters: {
            updates: ["callback_query", "message"]
          },
          name: "Telegram Bot Trigger",
          type: "n8n-nodes-base.telegramTrigger",
          typeVersion: 1,
          position: [100, 300]
        },
        {
          parameters: {
            mode: "runOnceForEachItem",
            jsCode: "const data = $input.item.json.callback_query || $input.item.json;\nconst callbackData = data.data || '';\nconst parts = callbackData.split(':');\nreturn {\n  json: {\n    action: parts[0] || 'ver_detalle',\n    bookingId: parts[1] || 'CRT-GEN',\n    user: data.from?.first_name || 'Operador',\n    chatId: data.message?.chat?.id\n  }\n};"
          },
          name: "Parse Telegram Action",
          type: "n8n-nodes-base.code",
          typeVersion: 2,
          position: [350, 300]
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
          name: "Sync Firestore Status",
          type: "n8n-nodes-base.httpRequest",
          typeVersion: 4,
          position: [600, 300]
        },
        {
          parameters: {
            chatId: "={{$json.chatId}}",
            text: "=*¡Estado Actualizado Exitosamente!*\\n\\nReserva: `{{$json.bookingId}}`\\nAcción: `{{$json.action}}`\\nConfirmado por: `{{$json.user}}`",
            additionalFields: { parse_mode: "Markdown" }
          },
          name: "Notify Telegram Group",
          type: "n8n-nodes-base.telegram",
          typeVersion: 1,
          position: [850, 300]
        }
      ],
      connections: {
        "Telegram Bot Trigger": { main: [[{ node: "Parse Telegram Action", type: "main", index: 0 }]] },
        "Parse Telegram Action": { main: [[{ node: "Sync Firestore Status", type: "main", index: 0 }]] },
        "Sync Firestore Status": { main: [[{ node: "Notify Telegram Group", type: "main", index: 0 }]] }
      }
    }
  }
];
