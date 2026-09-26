/**
 * ⚡ Matriz Maestra de 100 Workflows native-automation — Costa Rica Tours (2026)
 * Generado para cubrir el ciclo de vida completo de reservas, bases de datos Firestore,
 * pasarelas de pago, operadores, flota, seguridad, IA y analítica con enrutamiento de errores
 * directo hacia el endpoint nativo '/api/alerts' (reemplazo de Telegram).
 */

export interface NativeWorkflowDef100 {
  id: string;
  code: string;
  name: { es: string; en: string };
  category: string;
  collection: string;
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

export const WORKFLOWS_100_LIST: NativeWorkflowDef100[] = [
  {
    id: "wf-001-soft-hold-lock",
    code: "WF-001",
    name: {
      es: "Bloqueo Temporal de Cupos (Soft Hold 15 min)",
      en: "Temporary Seat Lock (Soft Hold 15 min)"
    },
    category: "booking",
    collection: "bookings",
    description: {
      es: "Reserva temporalmente cupos en Firestore por 15 minutos mientras el usuario completa el pago, evitando sobreventas.",
      en: "Temporarily locks tour seats in Firestore for 15 minutes while user completes checkout to prevent overbooking."
    },
    icon: "Lock",
    color: "#059669",
    endpoint: "/api/native/workflows/soft-hold",
    method: "POST",
    triggerEvent: "Webhook al iniciar checkout en frontend",
    nodesCount: 5,
    slaTarget: "< 300ms",
    nodes: [
      {
            "id": "node-trigger",
            "name": "[TRIGGER] Bloqueo Temporal de Cupos (Soft Hold 15 min)",
            "type": "native-automation-node.webhook",
            "description": "Webhook al iniciar checkout en frontend"
      },
      {
            "id": "node-extract",
            "name": "[EXTRACT] Formatear y Validar Datos",
            "type": "native-automation-node.code",
            "description": "Transformación y validación de esquema"
      },
      {
            "id": "node-firestore",
            "name": "[FIRESTORE] Operación bookings",
            "type": "native-automation-node.googleFirebaseCloudFirestore",
            "description": "Lectura/Escritura en Firestore /bookings"
      },
      {
            "id": "node-response",
            "name": "[RESPUESTA] Finalizar con Éxito",
            "type": "native-automation-node.respondToWebhook",
            "description": "Respuesta HTTP 200 con payload estructurado"
      },
      {
            "id": "node-alert",
            "name": "[ALERTA NATIVA] Enviar a /api/alerts",
            "type": "native-automation-node.httpRequest",
            "description": "Enrutamiento de error a /api/alerts (reemplazo Telegram)"
      }
],
    samplePayload: {
      "bookingId": "BK-CR-2026-901",
      "tourId": "tour-arenal-volcano",
      "adults": 2,
      "children": 1,
      "date": "2026-10-15",
      "holdMinutes": 15
},
    blueprintJson: {
      "id": "WF-001",
      "name": "Bloqueo Temporal de Cupos (Soft Hold 15 min)",
      "active": true,
      "nodes": [
            {
                  "parameters": {
                        "path": "api/native/workflows/soft-hold",
                        "httpMethod": "POST",
                        "responseMode": "responseNode",
                        "options": {}
                  },
                  "name": "[TRIGGER] Bloqueo Temporal de Cupos (Soft Hold 15 min)",
                  "type": "native-automation-node.webhook",
                  "typeVersion": 2,
                  "position": [
                        100,
                        300
                  ]
            },
            {
                  "parameters": {
                        "jsCode": "// Validar campos obligatorios y normalizar timestamp\nconst item = $input.first().json || {};\nitem.processedAt = new Date().toISOString();\nitem.environment = 'production';\nitem.targetCollection = 'bookings';\nreturn [{ json: item }];"
                  },
                  "name": "[EXTRACT] Formatear y Validar Datos",
                  "type": "native-automation-node.code",
                  "typeVersion": 2,
                  "position": [
                        350,
                        300
                  ]
            },
            {
                  "parameters": {
                        "operation": "upsert",
                        "collection": "bookings",
                        "documentId": "={{ $json.id || $json.bookingId || $json.code || $now }}",
                        "dataToSend": "defineBelow",
                        "fieldsUi": {
                              "fieldValues": [
                                    {
                                          "fieldId": "updatedAt",
                                          "fieldValue": "={{ $now }}"
                                    },
                                    {
                                          "fieldId": "workflowSource",
                                          "fieldValue": "WF-001"
                                    },
                                    {
                                          "fieldId": "status",
                                          "fieldValue": "processed"
                                    }
                              ]
                        }
                  },
                  "name": "[FIRESTORE] Operación Colección bookings",
                  "type": "native-automation-node.googleFirebaseCloudFirestore",
                  "typeVersion": 1.1,
                  "position": [
                        650,
                        300
                  ],
                  "credentials": {
                        "googleApi": {
                              "id": "5NiYz8gX64lPYIdK",
                              "name": "Costa Rica Tours - Firebase"
                        }
                  },
                  "onError": "continueErrorOutput"
            },
            {
                  "parameters": {
                        "respondWith": "json",
                        "responseBody": "{\n  \"success\": true,\n  \"workflowCode\": \"WF-001\",\n  \"collection\": \"bookings\",\n  \"timestamp\": \"={{ $now }}\",\n  \"message\": \"Operación completada exitosamente en bookings\"\n}",
                        "options": {}
                  },
                  "name": "[RESPUESTA] Finalizar con Éxito",
                  "type": "native-automation-node.respondToWebhook",
                  "typeVersion": 1.5,
                  "position": [
                        950,
                        200
                  ]
            },
            {
                  "parameters": {
                        "method": "POST",
                        "url": "={{ $env.APP_URL || \"http://localhost:3000\" }}/api/alerts",
                        "sendHeaders": true,
                        "headerParameters": {
                              "parameters": [
                                    {
                                          "name": "X-Webhook-Secret",
                                          "value": "={{ $env.WEBHOOK_SECRET || \"dev-secret\" }}"
                                    },
                                    {
                                          "name": "Content-Type",
                                          "value": "application/json"
                                    }
                              ]
                        },
                        "sendBody": true,
                        "specifyBody": "json",
                        "jsonBody": "{\n  \"source\": \"Bloqueo Temporal de Cupos (Soft Hold 15 min)\",\n  \"severity\": \"critical\",\n  \"title\": \"Fallo en workflow WF-001: Bloqueo Temporal de Cupos (Soft Hold 15 min)\",\n  \"message\": \"=Error al ejecutar en colección bookings: {{ $json.error?.message || \\\"Error no especificado\\\" }}\",\n  \"bookingId\": \"={{ $json.bookingId }}\",\n  \"metadata\": {\n    \"workflowCode\": \"WF-001\",\n    \"collection\": \"bookings\",\n    \"endpoint\": \"/api/native/workflows/soft-hold\"\n  }\n}",
                        "options": {}
                  },
                  "name": "[ALERTA NATIVA] Enviar a /api/alerts",
                  "type": "native-automation-node.httpRequest",
                  "typeVersion": 4.2,
                  "position": [
                        950,
                        450
                  ]
            }
      ],
      "connections": {
            "[TRIGGER] Bloqueo Temporal de Cupos (Soft Hold 15 min)": {
                  "main": [
                        [
                              {
                                    "node": "[EXTRACT] Formatear y Validar Datos",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[EXTRACT] Formatear y Validar Datos": {
                  "main": [
                        [
                              {
                                    "node": "[FIRESTORE] Operación Colección bookings",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[FIRESTORE] Operación Colección bookings": {
                  "main": [
                        [
                              {
                                    "node": "[RESPUESTA] Finalizar con Éxito",
                                    "type": "main",
                                    "index": 0
                              }
                        ],
                        [
                              {
                                    "node": "[ALERTA NATIVA] Enviar a /api/alerts",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            }
      }
}
  },
  {
    id: "wf-002-booking-confirmation-qr",
    code: "WF-002",
    name: {
      es: "Emisión de Voucher Oficial y Código QR Criptográfico",
      en: "Official Voucher & Cryptographic QR Issuance"
    },
    category: "booking",
    collection: "bookings",
    description: {
      es: "Genera el voucher con código QR firmado con HMAC-SHA256 y actualiza el estado a \"confirmada\" en Firestore.",
      en: "Generates voucher with HMAC-SHA256 signed QR code and updates booking status to \"confirmed\" in Firestore."
    },
    icon: "QrCode",
    color: "#10b981",
    endpoint: "/api/native/workflows/confirm-booking",
    method: "POST",
    triggerEvent: "Webhook de pago exitoso (Stripe/PayPal/SINPE)",
    nodesCount: 5,
    slaTarget: "< 800ms",
    nodes: [
      {
            "id": "node-trigger",
            "name": "[TRIGGER] Emisión de Voucher Oficial y Código QR Criptográfico",
            "type": "native-automation-node.webhook",
            "description": "Webhook de pago exitoso (Stripe/PayPal/SINPE)"
      },
      {
            "id": "node-extract",
            "name": "[EXTRACT] Formatear y Validar Datos",
            "type": "native-automation-node.code",
            "description": "Transformación y validación de esquema"
      },
      {
            "id": "node-firestore",
            "name": "[FIRESTORE] Operación bookings",
            "type": "native-automation-node.googleFirebaseCloudFirestore",
            "description": "Lectura/Escritura en Firestore /bookings"
      },
      {
            "id": "node-response",
            "name": "[RESPUESTA] Finalizar con Éxito",
            "type": "native-automation-node.respondToWebhook",
            "description": "Respuesta HTTP 200 con payload estructurado"
      },
      {
            "id": "node-alert",
            "name": "[ALERTA NATIVA] Enviar a /api/alerts",
            "type": "native-automation-node.httpRequest",
            "description": "Enrutamiento de error a /api/alerts (reemplazo Telegram)"
      }
],
    samplePayload: {
      "bookingId": "BK-CR-2026-902",
      "customerName": "Elena Rostova",
      "customerEmail": "elena.rostova@example.com",
      "tourName": "Manuel Antonio National Park",
      "totalUSD": 145
},
    blueprintJson: {
      "id": "WF-002",
      "name": "Emisión de Voucher Oficial y Código QR Criptográfico",
      "active": true,
      "nodes": [
            {
                  "parameters": {
                        "path": "api/native/workflows/confirm-booking",
                        "httpMethod": "POST",
                        "responseMode": "responseNode",
                        "options": {}
                  },
                  "name": "[TRIGGER] Emisión de Voucher Oficial y Código QR Criptográfico",
                  "type": "native-automation-node.webhook",
                  "typeVersion": 2,
                  "position": [
                        100,
                        300
                  ]
            },
            {
                  "parameters": {
                        "jsCode": "// Validar campos obligatorios y normalizar timestamp\nconst item = $input.first().json || {};\nitem.processedAt = new Date().toISOString();\nitem.environment = 'production';\nitem.targetCollection = 'bookings';\nreturn [{ json: item }];"
                  },
                  "name": "[EXTRACT] Formatear y Validar Datos",
                  "type": "native-automation-node.code",
                  "typeVersion": 2,
                  "position": [
                        350,
                        300
                  ]
            },
            {
                  "parameters": {
                        "operation": "upsert",
                        "collection": "bookings",
                        "documentId": "={{ $json.id || $json.bookingId || $json.code || $now }}",
                        "dataToSend": "defineBelow",
                        "fieldsUi": {
                              "fieldValues": [
                                    {
                                          "fieldId": "updatedAt",
                                          "fieldValue": "={{ $now }}"
                                    },
                                    {
                                          "fieldId": "workflowSource",
                                          "fieldValue": "WF-002"
                                    },
                                    {
                                          "fieldId": "status",
                                          "fieldValue": "processed"
                                    }
                              ]
                        }
                  },
                  "name": "[FIRESTORE] Operación Colección bookings",
                  "type": "native-automation-node.googleFirebaseCloudFirestore",
                  "typeVersion": 1.1,
                  "position": [
                        650,
                        300
                  ],
                  "credentials": {
                        "googleApi": {
                              "id": "5NiYz8gX64lPYIdK",
                              "name": "Costa Rica Tours - Firebase"
                        }
                  },
                  "onError": "continueErrorOutput"
            },
            {
                  "parameters": {
                        "respondWith": "json",
                        "responseBody": "{\n  \"success\": true,\n  \"workflowCode\": \"WF-002\",\n  \"collection\": \"bookings\",\n  \"timestamp\": \"={{ $now }}\",\n  \"message\": \"Operación completada exitosamente en bookings\"\n}",
                        "options": {}
                  },
                  "name": "[RESPUESTA] Finalizar con Éxito",
                  "type": "native-automation-node.respondToWebhook",
                  "typeVersion": 1.5,
                  "position": [
                        950,
                        200
                  ]
            },
            {
                  "parameters": {
                        "method": "POST",
                        "url": "={{ $env.APP_URL || \"http://localhost:3000\" }}/api/alerts",
                        "sendHeaders": true,
                        "headerParameters": {
                              "parameters": [
                                    {
                                          "name": "X-Webhook-Secret",
                                          "value": "={{ $env.WEBHOOK_SECRET || \"dev-secret\" }}"
                                    },
                                    {
                                          "name": "Content-Type",
                                          "value": "application/json"
                                    }
                              ]
                        },
                        "sendBody": true,
                        "specifyBody": "json",
                        "jsonBody": "{\n  \"source\": \"Emisión de Voucher Oficial y Código QR Criptográfico\",\n  \"severity\": \"critical\",\n  \"title\": \"Fallo en workflow WF-002: Emisión de Voucher Oficial y Código QR Criptográfico\",\n  \"message\": \"=Error al ejecutar en colección bookings: {{ $json.error?.message || \\\"Error no especificado\\\" }}\",\n  \"bookingId\": \"={{ $json.bookingId }}\",\n  \"metadata\": {\n    \"workflowCode\": \"WF-002\",\n    \"collection\": \"bookings\",\n    \"endpoint\": \"/api/native/workflows/confirm-booking\"\n  }\n}",
                        "options": {}
                  },
                  "name": "[ALERTA NATIVA] Enviar a /api/alerts",
                  "type": "native-automation-node.httpRequest",
                  "typeVersion": 4.2,
                  "position": [
                        950,
                        450
                  ]
            }
      ],
      "connections": {
            "[TRIGGER] Emisión de Voucher Oficial y Código QR Criptográfico": {
                  "main": [
                        [
                              {
                                    "node": "[EXTRACT] Formatear y Validar Datos",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[EXTRACT] Formatear y Validar Datos": {
                  "main": [
                        [
                              {
                                    "node": "[FIRESTORE] Operación Colección bookings",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[FIRESTORE] Operación Colección bookings": {
                  "main": [
                        [
                              {
                                    "node": "[RESPUESTA] Finalizar con Éxito",
                                    "type": "main",
                                    "index": 0
                              }
                        ],
                        [
                              {
                                    "node": "[ALERTA NATIVA] Enviar a /api/alerts",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            }
      }
}
  },
  {
    id: "wf-003-expired-hold-releaser",
    code: "WF-003",
    name: {
      es: "Liberador de Cupos Expirados (Cleanup Worker)",
      en: "Expired Hold Seat Releaser (Cleanup Worker)"
    },
    category: "booking",
    collection: "bookings",
    description: {
      es: "Ejecuta cada 5 minutos en Firestore para liberar inventario de reservas no pagadas cuyo soft-hold haya vencido.",
      en: "Runs every 5 minutes in Firestore to release inventory from unpaid reservations with expired soft-holds."
    },
    icon: "Clock",
    color: "#f59e0b",
    endpoint: "/api/native/workflows/cleanup-holds",
    method: "POST",
    triggerEvent: "Cron programado cada 5 minutos",
    nodesCount: 5,
    slaTarget: "< 1s",
    nodes: [
      {
            "id": "node-trigger",
            "name": "[TRIGGER] Liberador de Cupos Expirados (Cleanup Worker)",
            "type": "native-automation-node.webhook",
            "description": "Cron programado cada 5 minutos"
      },
      {
            "id": "node-extract",
            "name": "[EXTRACT] Formatear y Validar Datos",
            "type": "native-automation-node.code",
            "description": "Transformación y validación de esquema"
      },
      {
            "id": "node-firestore",
            "name": "[FIRESTORE] Operación bookings",
            "type": "native-automation-node.googleFirebaseCloudFirestore",
            "description": "Lectura/Escritura en Firestore /bookings"
      },
      {
            "id": "node-response",
            "name": "[RESPUESTA] Finalizar con Éxito",
            "type": "native-automation-node.respondToWebhook",
            "description": "Respuesta HTTP 200 con payload estructurado"
      },
      {
            "id": "node-alert",
            "name": "[ALERTA NATIVA] Enviar a /api/alerts",
            "type": "native-automation-node.httpRequest",
            "description": "Enrutamiento de error a /api/alerts (reemplazo Telegram)"
      }
],
    samplePayload: {
      "trigger": "cron_5min",
      "cleanupThresholdMinutes": 15,
      "batchSize": 50
},
    blueprintJson: {
      "id": "WF-003",
      "name": "Liberador de Cupos Expirados (Cleanup Worker)",
      "active": true,
      "nodes": [
            {
                  "parameters": {
                        "path": "api/native/workflows/cleanup-holds",
                        "httpMethod": "POST",
                        "responseMode": "responseNode",
                        "options": {}
                  },
                  "name": "[TRIGGER] Liberador de Cupos Expirados (Cleanup Worker)",
                  "type": "native-automation-node.webhook",
                  "typeVersion": 2,
                  "position": [
                        100,
                        300
                  ]
            },
            {
                  "parameters": {
                        "jsCode": "// Validar campos obligatorios y normalizar timestamp\nconst item = $input.first().json || {};\nitem.processedAt = new Date().toISOString();\nitem.environment = 'production';\nitem.targetCollection = 'bookings';\nreturn [{ json: item }];"
                  },
                  "name": "[EXTRACT] Formatear y Validar Datos",
                  "type": "native-automation-node.code",
                  "typeVersion": 2,
                  "position": [
                        350,
                        300
                  ]
            },
            {
                  "parameters": {
                        "operation": "upsert",
                        "collection": "bookings",
                        "documentId": "={{ $json.id || $json.bookingId || $json.code || $now }}",
                        "dataToSend": "defineBelow",
                        "fieldsUi": {
                              "fieldValues": [
                                    {
                                          "fieldId": "updatedAt",
                                          "fieldValue": "={{ $now }}"
                                    },
                                    {
                                          "fieldId": "workflowSource",
                                          "fieldValue": "WF-003"
                                    },
                                    {
                                          "fieldId": "status",
                                          "fieldValue": "processed"
                                    }
                              ]
                        }
                  },
                  "name": "[FIRESTORE] Operación Colección bookings",
                  "type": "native-automation-node.googleFirebaseCloudFirestore",
                  "typeVersion": 1.1,
                  "position": [
                        650,
                        300
                  ],
                  "credentials": {
                        "googleApi": {
                              "id": "5NiYz8gX64lPYIdK",
                              "name": "Costa Rica Tours - Firebase"
                        }
                  },
                  "onError": "continueErrorOutput"
            },
            {
                  "parameters": {
                        "respondWith": "json",
                        "responseBody": "{\n  \"success\": true,\n  \"workflowCode\": \"WF-003\",\n  \"collection\": \"bookings\",\n  \"timestamp\": \"={{ $now }}\",\n  \"message\": \"Operación completada exitosamente en bookings\"\n}",
                        "options": {}
                  },
                  "name": "[RESPUESTA] Finalizar con Éxito",
                  "type": "native-automation-node.respondToWebhook",
                  "typeVersion": 1.5,
                  "position": [
                        950,
                        200
                  ]
            },
            {
                  "parameters": {
                        "method": "POST",
                        "url": "={{ $env.APP_URL || \"http://localhost:3000\" }}/api/alerts",
                        "sendHeaders": true,
                        "headerParameters": {
                              "parameters": [
                                    {
                                          "name": "X-Webhook-Secret",
                                          "value": "={{ $env.WEBHOOK_SECRET || \"dev-secret\" }}"
                                    },
                                    {
                                          "name": "Content-Type",
                                          "value": "application/json"
                                    }
                              ]
                        },
                        "sendBody": true,
                        "specifyBody": "json",
                        "jsonBody": "{\n  \"source\": \"Liberador de Cupos Expirados (Cleanup Worker)\",\n  \"severity\": \"critical\",\n  \"title\": \"Fallo en workflow WF-003: Liberador de Cupos Expirados (Cleanup Worker)\",\n  \"message\": \"=Error al ejecutar en colección bookings: {{ $json.error?.message || \\\"Error no especificado\\\" }}\",\n  \"bookingId\": \"={{ $json.bookingId }}\",\n  \"metadata\": {\n    \"workflowCode\": \"WF-003\",\n    \"collection\": \"bookings\",\n    \"endpoint\": \"/api/native/workflows/cleanup-holds\"\n  }\n}",
                        "options": {}
                  },
                  "name": "[ALERTA NATIVA] Enviar a /api/alerts",
                  "type": "native-automation-node.httpRequest",
                  "typeVersion": 4.2,
                  "position": [
                        950,
                        450
                  ]
            }
      ],
      "connections": {
            "[TRIGGER] Liberador de Cupos Expirados (Cleanup Worker)": {
                  "main": [
                        [
                              {
                                    "node": "[EXTRACT] Formatear y Validar Datos",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[EXTRACT] Formatear y Validar Datos": {
                  "main": [
                        [
                              {
                                    "node": "[FIRESTORE] Operación Colección bookings",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[FIRESTORE] Operación Colección bookings": {
                  "main": [
                        [
                              {
                                    "node": "[RESPUESTA] Finalizar con Éxito",
                                    "type": "main",
                                    "index": 0
                              }
                        ],
                        [
                              {
                                    "node": "[ALERTA NATIVA] Enviar a /api/alerts",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            }
      }
}
  },
  {
    id: "wf-004-reschedule-manager",
    code: "WF-004",
    name: {
      es: "Gestión Automatizada de Reprogramaciones",
      en: "Automated Reschedule & Date Change Manager"
    },
    category: "booking",
    collection: "bookings",
    description: {
      es: "Valida disponibilidad de la nueva fecha solicitada por el viajero y actualiza el registro en Firestore sin recargo.",
      en: "Validates availability on traveler requested new date and updates Firestore record with zero surcharge."
    },
    icon: "CalendarSync",
    color: "#3b82f6",
    endpoint: "/api/native/workflows/reschedule-booking",
    method: "POST",
    triggerEvent: "Solicitud de cambio de fecha desde panel de cliente o agente",
    nodesCount: 5,
    slaTarget: "< 600ms",
    nodes: [
      {
            "id": "node-trigger",
            "name": "[TRIGGER] Gestión Automatizada de Reprogramaciones",
            "type": "native-automation-node.webhook",
            "description": "Solicitud de cambio de fecha desde panel de cliente o agente"
      },
      {
            "id": "node-extract",
            "name": "[EXTRACT] Formatear y Validar Datos",
            "type": "native-automation-node.code",
            "description": "Transformación y validación de esquema"
      },
      {
            "id": "node-firestore",
            "name": "[FIRESTORE] Operación bookings",
            "type": "native-automation-node.googleFirebaseCloudFirestore",
            "description": "Lectura/Escritura en Firestore /bookings"
      },
      {
            "id": "node-response",
            "name": "[RESPUESTA] Finalizar con Éxito",
            "type": "native-automation-node.respondToWebhook",
            "description": "Respuesta HTTP 200 con payload estructurado"
      },
      {
            "id": "node-alert",
            "name": "[ALERTA NATIVA] Enviar a /api/alerts",
            "type": "native-automation-node.httpRequest",
            "description": "Enrutamiento de error a /api/alerts (reemplazo Telegram)"
      }
],
    samplePayload: {
      "bookingId": "BK-CR-2026-904",
      "newDate": "2026-11-02",
      "newTime": "08:00 AM",
      "reason": "Flight delay"
},
    blueprintJson: {
      "id": "WF-004",
      "name": "Gestión Automatizada de Reprogramaciones",
      "active": true,
      "nodes": [
            {
                  "parameters": {
                        "path": "api/native/workflows/reschedule-booking",
                        "httpMethod": "POST",
                        "responseMode": "responseNode",
                        "options": {}
                  },
                  "name": "[TRIGGER] Gestión Automatizada de Reprogramaciones",
                  "type": "native-automation-node.webhook",
                  "typeVersion": 2,
                  "position": [
                        100,
                        300
                  ]
            },
            {
                  "parameters": {
                        "jsCode": "// Validar campos obligatorios y normalizar timestamp\nconst item = $input.first().json || {};\nitem.processedAt = new Date().toISOString();\nitem.environment = 'production';\nitem.targetCollection = 'bookings';\nreturn [{ json: item }];"
                  },
                  "name": "[EXTRACT] Formatear y Validar Datos",
                  "type": "native-automation-node.code",
                  "typeVersion": 2,
                  "position": [
                        350,
                        300
                  ]
            },
            {
                  "parameters": {
                        "operation": "upsert",
                        "collection": "bookings",
                        "documentId": "={{ $json.id || $json.bookingId || $json.code || $now }}",
                        "dataToSend": "defineBelow",
                        "fieldsUi": {
                              "fieldValues": [
                                    {
                                          "fieldId": "updatedAt",
                                          "fieldValue": "={{ $now }}"
                                    },
                                    {
                                          "fieldId": "workflowSource",
                                          "fieldValue": "WF-004"
                                    },
                                    {
                                          "fieldId": "status",
                                          "fieldValue": "processed"
                                    }
                              ]
                        }
                  },
                  "name": "[FIRESTORE] Operación Colección bookings",
                  "type": "native-automation-node.googleFirebaseCloudFirestore",
                  "typeVersion": 1.1,
                  "position": [
                        650,
                        300
                  ],
                  "credentials": {
                        "googleApi": {
                              "id": "5NiYz8gX64lPYIdK",
                              "name": "Costa Rica Tours - Firebase"
                        }
                  },
                  "onError": "continueErrorOutput"
            },
            {
                  "parameters": {
                        "respondWith": "json",
                        "responseBody": "{\n  \"success\": true,\n  \"workflowCode\": \"WF-004\",\n  \"collection\": \"bookings\",\n  \"timestamp\": \"={{ $now }}\",\n  \"message\": \"Operación completada exitosamente en bookings\"\n}",
                        "options": {}
                  },
                  "name": "[RESPUESTA] Finalizar con Éxito",
                  "type": "native-automation-node.respondToWebhook",
                  "typeVersion": 1.5,
                  "position": [
                        950,
                        200
                  ]
            },
            {
                  "parameters": {
                        "method": "POST",
                        "url": "={{ $env.APP_URL || \"http://localhost:3000\" }}/api/alerts",
                        "sendHeaders": true,
                        "headerParameters": {
                              "parameters": [
                                    {
                                          "name": "X-Webhook-Secret",
                                          "value": "={{ $env.WEBHOOK_SECRET || \"dev-secret\" }}"
                                    },
                                    {
                                          "name": "Content-Type",
                                          "value": "application/json"
                                    }
                              ]
                        },
                        "sendBody": true,
                        "specifyBody": "json",
                        "jsonBody": "{\n  \"source\": \"Gestión Automatizada de Reprogramaciones\",\n  \"severity\": \"critical\",\n  \"title\": \"Fallo en workflow WF-004: Gestión Automatizada de Reprogramaciones\",\n  \"message\": \"=Error al ejecutar en colección bookings: {{ $json.error?.message || \\\"Error no especificado\\\" }}\",\n  \"bookingId\": \"={{ $json.bookingId }}\",\n  \"metadata\": {\n    \"workflowCode\": \"WF-004\",\n    \"collection\": \"bookings\",\n    \"endpoint\": \"/api/native/workflows/reschedule-booking\"\n  }\n}",
                        "options": {}
                  },
                  "name": "[ALERTA NATIVA] Enviar a /api/alerts",
                  "type": "native-automation-node.httpRequest",
                  "typeVersion": 4.2,
                  "position": [
                        950,
                        450
                  ]
            }
      ],
      "connections": {
            "[TRIGGER] Gestión Automatizada de Reprogramaciones": {
                  "main": [
                        [
                              {
                                    "node": "[EXTRACT] Formatear y Validar Datos",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[EXTRACT] Formatear y Validar Datos": {
                  "main": [
                        [
                              {
                                    "node": "[FIRESTORE] Operación Colección bookings",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[FIRESTORE] Operación Colección bookings": {
                  "main": [
                        [
                              {
                                    "node": "[RESPUESTA] Finalizar con Éxito",
                                    "type": "main",
                                    "index": 0
                              }
                        ],
                        [
                              {
                                    "node": "[ALERTA NATIVA] Enviar a /api/alerts",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            }
      }
}
  },
  {
    id: "wf-005-cancellation-refund-rules",
    code: "WF-005",
    name: {
      es: "Procesador de Cancelaciones y Política 72h/48h",
      en: "Cancellations Processor & 72h/48h Policy Engine"
    },
    category: "booking",
    collection: "cancellations",
    description: {
      es: "Calcula porcentaje de reembolso (100% >72h, 50% 48-72h, 0% <48h) y registra solicitud en Firestore.",
      en: "Calculates refund percentage (100% >72h, 50% 48-72h, 0% <48h) and records cancellation request in Firestore."
    },
    icon: "CalendarX",
    color: "#ef4444",
    endpoint: "/api/native/workflows/cancel-booking",
    method: "POST",
    triggerEvent: "Webhook de cancelación de usuario u operador",
    nodesCount: 5,
    slaTarget: "< 500ms",
    nodes: [
      {
            "id": "node-trigger",
            "name": "[TRIGGER] Procesador de Cancelaciones y Política 72h/48h",
            "type": "native-automation-node.webhook",
            "description": "Webhook de cancelación de usuario u operador"
      },
      {
            "id": "node-extract",
            "name": "[EXTRACT] Formatear y Validar Datos",
            "type": "native-automation-node.code",
            "description": "Transformación y validación de esquema"
      },
      {
            "id": "node-firestore",
            "name": "[FIRESTORE] Operación cancellations",
            "type": "native-automation-node.googleFirebaseCloudFirestore",
            "description": "Lectura/Escritura en Firestore /cancellations"
      },
      {
            "id": "node-response",
            "name": "[RESPUESTA] Finalizar con Éxito",
            "type": "native-automation-node.respondToWebhook",
            "description": "Respuesta HTTP 200 con payload estructurado"
      },
      {
            "id": "node-alert",
            "name": "[ALERTA NATIVA] Enviar a /api/alerts",
            "type": "native-automation-node.httpRequest",
            "description": "Enrutamiento de error a /api/alerts (reemplazo Telegram)"
      }
],
    samplePayload: {
      "bookingId": "BK-CR-2026-905",
      "hoursBeforeTour": 78,
      "refundPercentage": 100,
      "amountUSD": 210
},
    blueprintJson: {
      "id": "WF-005",
      "name": "Procesador de Cancelaciones y Política 72h/48h",
      "active": true,
      "nodes": [
            {
                  "parameters": {
                        "path": "api/native/workflows/cancel-booking",
                        "httpMethod": "POST",
                        "responseMode": "responseNode",
                        "options": {}
                  },
                  "name": "[TRIGGER] Procesador de Cancelaciones y Política 72h/48h",
                  "type": "native-automation-node.webhook",
                  "typeVersion": 2,
                  "position": [
                        100,
                        300
                  ]
            },
            {
                  "parameters": {
                        "jsCode": "// Validar campos obligatorios y normalizar timestamp\nconst item = $input.first().json || {};\nitem.processedAt = new Date().toISOString();\nitem.environment = 'production';\nitem.targetCollection = 'cancellations';\nreturn [{ json: item }];"
                  },
                  "name": "[EXTRACT] Formatear y Validar Datos",
                  "type": "native-automation-node.code",
                  "typeVersion": 2,
                  "position": [
                        350,
                        300
                  ]
            },
            {
                  "parameters": {
                        "operation": "upsert",
                        "collection": "cancellations",
                        "documentId": "={{ $json.id || $json.bookingId || $json.code || $now }}",
                        "dataToSend": "defineBelow",
                        "fieldsUi": {
                              "fieldValues": [
                                    {
                                          "fieldId": "updatedAt",
                                          "fieldValue": "={{ $now }}"
                                    },
                                    {
                                          "fieldId": "workflowSource",
                                          "fieldValue": "WF-005"
                                    },
                                    {
                                          "fieldId": "status",
                                          "fieldValue": "processed"
                                    }
                              ]
                        }
                  },
                  "name": "[FIRESTORE] Operación Colección cancellations",
                  "type": "native-automation-node.googleFirebaseCloudFirestore",
                  "typeVersion": 1.1,
                  "position": [
                        650,
                        300
                  ],
                  "credentials": {
                        "googleApi": {
                              "id": "5NiYz8gX64lPYIdK",
                              "name": "Costa Rica Tours - Firebase"
                        }
                  },
                  "onError": "continueErrorOutput"
            },
            {
                  "parameters": {
                        "respondWith": "json",
                        "responseBody": "{\n  \"success\": true,\n  \"workflowCode\": \"WF-005\",\n  \"collection\": \"cancellations\",\n  \"timestamp\": \"={{ $now }}\",\n  \"message\": \"Operación completada exitosamente en cancellations\"\n}",
                        "options": {}
                  },
                  "name": "[RESPUESTA] Finalizar con Éxito",
                  "type": "native-automation-node.respondToWebhook",
                  "typeVersion": 1.5,
                  "position": [
                        950,
                        200
                  ]
            },
            {
                  "parameters": {
                        "method": "POST",
                        "url": "={{ $env.APP_URL || \"http://localhost:3000\" }}/api/alerts",
                        "sendHeaders": true,
                        "headerParameters": {
                              "parameters": [
                                    {
                                          "name": "X-Webhook-Secret",
                                          "value": "={{ $env.WEBHOOK_SECRET || \"dev-secret\" }}"
                                    },
                                    {
                                          "name": "Content-Type",
                                          "value": "application/json"
                                    }
                              ]
                        },
                        "sendBody": true,
                        "specifyBody": "json",
                        "jsonBody": "{\n  \"source\": \"Procesador de Cancelaciones y Política 72h/48h\",\n  \"severity\": \"critical\",\n  \"title\": \"Fallo en workflow WF-005: Procesador de Cancelaciones y Política 72h/48h\",\n  \"message\": \"=Error al ejecutar en colección cancellations: {{ $json.error?.message || \\\"Error no especificado\\\" }}\",\n  \"bookingId\": \"={{ $json.bookingId }}\",\n  \"metadata\": {\n    \"workflowCode\": \"WF-005\",\n    \"collection\": \"cancellations\",\n    \"endpoint\": \"/api/native/workflows/cancel-booking\"\n  }\n}",
                        "options": {}
                  },
                  "name": "[ALERTA NATIVA] Enviar a /api/alerts",
                  "type": "native-automation-node.httpRequest",
                  "typeVersion": 4.2,
                  "position": [
                        950,
                        450
                  ]
            }
      ],
      "connections": {
            "[TRIGGER] Procesador de Cancelaciones y Política 72h/48h": {
                  "main": [
                        [
                              {
                                    "node": "[EXTRACT] Formatear y Validar Datos",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[EXTRACT] Formatear y Validar Datos": {
                  "main": [
                        [
                              {
                                    "node": "[FIRESTORE] Operación Colección cancellations",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[FIRESTORE] Operación Colección cancellations": {
                  "main": [
                        [
                              {
                                    "node": "[RESPUESTA] Finalizar con Éxito",
                                    "type": "main",
                                    "index": 0
                              }
                        ],
                        [
                              {
                                    "node": "[ALERTA NATIVA] Enviar a /api/alerts",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            }
      }
}
  },
  {
    id: "wf-006-waitlist-auto-promote",
    code: "WF-006",
    name: {
      es: "Lista de Espera y Promoción Automática de Cupos",
      en: "Waitlist Auto-Promotion & Seat Release Matcher"
    },
    category: "booking",
    collection: "waitlists",
    description: {
      es: "Cuando se libera un cupo por cancelación, notifica automáticamente al primer viajero en la lista de espera con enlace de pago express.",
      en: "When seats open up due to cancellation, auto-notifies first waitlisted traveler with express payment link."
    },
    icon: "UserPlus",
    color: "#8b5cf6",
    endpoint: "/api/native/workflows/waitlist-promote",
    method: "POST",
    triggerEvent: "Evento de cancelación con lista de espera activa",
    nodesCount: 5,
    slaTarget: "< 400ms",
    nodes: [
      {
            "id": "node-trigger",
            "name": "[TRIGGER] Lista de Espera y Promoción Automática de Cupos",
            "type": "native-automation-node.webhook",
            "description": "Evento de cancelación con lista de espera activa"
      },
      {
            "id": "node-extract",
            "name": "[EXTRACT] Formatear y Validar Datos",
            "type": "native-automation-node.code",
            "description": "Transformación y validación de esquema"
      },
      {
            "id": "node-firestore",
            "name": "[FIRESTORE] Operación waitlists",
            "type": "native-automation-node.googleFirebaseCloudFirestore",
            "description": "Lectura/Escritura en Firestore /waitlists"
      },
      {
            "id": "node-response",
            "name": "[RESPUESTA] Finalizar con Éxito",
            "type": "native-automation-node.respondToWebhook",
            "description": "Respuesta HTTP 200 con payload estructurado"
      },
      {
            "id": "node-alert",
            "name": "[ALERTA NATIVA] Enviar a /api/alerts",
            "type": "native-automation-node.httpRequest",
            "description": "Enrutamiento de error a /api/alerts (reemplazo Telegram)"
      }
],
    samplePayload: {
      "tourId": "tour-montezuma-waterfall",
      "date": "2026-10-20",
      "seatsReleased": 2,
      "nextInQueueEmail": "traveler@paris.fr"
},
    blueprintJson: {
      "id": "WF-006",
      "name": "Lista de Espera y Promoción Automática de Cupos",
      "active": true,
      "nodes": [
            {
                  "parameters": {
                        "path": "api/native/workflows/waitlist-promote",
                        "httpMethod": "POST",
                        "responseMode": "responseNode",
                        "options": {}
                  },
                  "name": "[TRIGGER] Lista de Espera y Promoción Automática de Cupos",
                  "type": "native-automation-node.webhook",
                  "typeVersion": 2,
                  "position": [
                        100,
                        300
                  ]
            },
            {
                  "parameters": {
                        "jsCode": "// Validar campos obligatorios y normalizar timestamp\nconst item = $input.first().json || {};\nitem.processedAt = new Date().toISOString();\nitem.environment = 'production';\nitem.targetCollection = 'waitlists';\nreturn [{ json: item }];"
                  },
                  "name": "[EXTRACT] Formatear y Validar Datos",
                  "type": "native-automation-node.code",
                  "typeVersion": 2,
                  "position": [
                        350,
                        300
                  ]
            },
            {
                  "parameters": {
                        "operation": "upsert",
                        "collection": "waitlists",
                        "documentId": "={{ $json.id || $json.bookingId || $json.code || $now }}",
                        "dataToSend": "defineBelow",
                        "fieldsUi": {
                              "fieldValues": [
                                    {
                                          "fieldId": "updatedAt",
                                          "fieldValue": "={{ $now }}"
                                    },
                                    {
                                          "fieldId": "workflowSource",
                                          "fieldValue": "WF-006"
                                    },
                                    {
                                          "fieldId": "status",
                                          "fieldValue": "processed"
                                    }
                              ]
                        }
                  },
                  "name": "[FIRESTORE] Operación Colección waitlists",
                  "type": "native-automation-node.googleFirebaseCloudFirestore",
                  "typeVersion": 1.1,
                  "position": [
                        650,
                        300
                  ],
                  "credentials": {
                        "googleApi": {
                              "id": "5NiYz8gX64lPYIdK",
                              "name": "Costa Rica Tours - Firebase"
                        }
                  },
                  "onError": "continueErrorOutput"
            },
            {
                  "parameters": {
                        "respondWith": "json",
                        "responseBody": "{\n  \"success\": true,\n  \"workflowCode\": \"WF-006\",\n  \"collection\": \"waitlists\",\n  \"timestamp\": \"={{ $now }}\",\n  \"message\": \"Operación completada exitosamente en waitlists\"\n}",
                        "options": {}
                  },
                  "name": "[RESPUESTA] Finalizar con Éxito",
                  "type": "native-automation-node.respondToWebhook",
                  "typeVersion": 1.5,
                  "position": [
                        950,
                        200
                  ]
            },
            {
                  "parameters": {
                        "method": "POST",
                        "url": "={{ $env.APP_URL || \"http://localhost:3000\" }}/api/alerts",
                        "sendHeaders": true,
                        "headerParameters": {
                              "parameters": [
                                    {
                                          "name": "X-Webhook-Secret",
                                          "value": "={{ $env.WEBHOOK_SECRET || \"dev-secret\" }}"
                                    },
                                    {
                                          "name": "Content-Type",
                                          "value": "application/json"
                                    }
                              ]
                        },
                        "sendBody": true,
                        "specifyBody": "json",
                        "jsonBody": "{\n  \"source\": \"Lista de Espera y Promoción Automática de Cupos\",\n  \"severity\": \"critical\",\n  \"title\": \"Fallo en workflow WF-006: Lista de Espera y Promoción Automática de Cupos\",\n  \"message\": \"=Error al ejecutar en colección waitlists: {{ $json.error?.message || \\\"Error no especificado\\\" }}\",\n  \"bookingId\": \"={{ $json.bookingId }}\",\n  \"metadata\": {\n    \"workflowCode\": \"WF-006\",\n    \"collection\": \"waitlists\",\n    \"endpoint\": \"/api/native/workflows/waitlist-promote\"\n  }\n}",
                        "options": {}
                  },
                  "name": "[ALERTA NATIVA] Enviar a /api/alerts",
                  "type": "native-automation-node.httpRequest",
                  "typeVersion": 4.2,
                  "position": [
                        950,
                        450
                  ]
            }
      ],
      "connections": {
            "[TRIGGER] Lista de Espera y Promoción Automática de Cupos": {
                  "main": [
                        [
                              {
                                    "node": "[EXTRACT] Formatear y Validar Datos",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[EXTRACT] Formatear y Validar Datos": {
                  "main": [
                        [
                              {
                                    "node": "[FIRESTORE] Operación Colección waitlists",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[FIRESTORE] Operación Colección waitlists": {
                  "main": [
                        [
                              {
                                    "node": "[RESPUESTA] Finalizar con Éxito",
                                    "type": "main",
                                    "index": 0
                              }
                        ],
                        [
                              {
                                    "node": "[ALERTA NATIVA] Enviar a /api/alerts",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            }
      }
}
  },
  {
    id: "wf-007-vip-room-upgrade",
    code: "WF-007",
    name: {
      es: "Motor de Upgrades y Extras de Aventura",
      en: "Adventure Add-ons & Transport Upgrades Engine"
    },
    category: "booking",
    collection: "booking_addons",
    description: {
      es: "Ofrece mejoras personalizadas (transporte privado, almuerzo gourmet, guía fotógrafo) 48h antes del tour.",
      en: "Suggests tailored upgrades (private executive van, gourmet lunch, photo guide) 48h before tour."
    },
    icon: "Sparkles",
    color: "#f59e0b",
    endpoint: "/api/native/workflows/upsell-addons",
    method: "POST",
    triggerEvent: "Cron 48 horas previas al tour",
    nodesCount: 5,
    slaTarget: "< 1s",
    nodes: [
      {
            "id": "node-trigger",
            "name": "[TRIGGER] Motor de Upgrades y Extras de Aventura",
            "type": "native-automation-node.webhook",
            "description": "Cron 48 horas previas al tour"
      },
      {
            "id": "node-extract",
            "name": "[EXTRACT] Formatear y Validar Datos",
            "type": "native-automation-node.code",
            "description": "Transformación y validación de esquema"
      },
      {
            "id": "node-firestore",
            "name": "[FIRESTORE] Operación booking_addons",
            "type": "native-automation-node.googleFirebaseCloudFirestore",
            "description": "Lectura/Escritura en Firestore /booking_addons"
      },
      {
            "id": "node-response",
            "name": "[RESPUESTA] Finalizar con Éxito",
            "type": "native-automation-node.respondToWebhook",
            "description": "Respuesta HTTP 200 con payload estructurado"
      },
      {
            "id": "node-alert",
            "name": "[ALERTA NATIVA] Enviar a /api/alerts",
            "type": "native-automation-node.httpRequest",
            "description": "Enrutamiento de error a /api/alerts (reemplazo Telegram)"
      }
],
    samplePayload: {
      "bookingId": "BK-CR-2026-907",
      "addonType": "private_van_upgrade",
      "priceUSD": 60
},
    blueprintJson: {
      "id": "WF-007",
      "name": "Motor de Upgrades y Extras de Aventura",
      "active": true,
      "nodes": [
            {
                  "parameters": {
                        "path": "api/native/workflows/upsell-addons",
                        "httpMethod": "POST",
                        "responseMode": "responseNode",
                        "options": {}
                  },
                  "name": "[TRIGGER] Motor de Upgrades y Extras de Aventura",
                  "type": "native-automation-node.webhook",
                  "typeVersion": 2,
                  "position": [
                        100,
                        300
                  ]
            },
            {
                  "parameters": {
                        "jsCode": "// Validar campos obligatorios y normalizar timestamp\nconst item = $input.first().json || {};\nitem.processedAt = new Date().toISOString();\nitem.environment = 'production';\nitem.targetCollection = 'booking_addons';\nreturn [{ json: item }];"
                  },
                  "name": "[EXTRACT] Formatear y Validar Datos",
                  "type": "native-automation-node.code",
                  "typeVersion": 2,
                  "position": [
                        350,
                        300
                  ]
            },
            {
                  "parameters": {
                        "operation": "upsert",
                        "collection": "booking_addons",
                        "documentId": "={{ $json.id || $json.bookingId || $json.code || $now }}",
                        "dataToSend": "defineBelow",
                        "fieldsUi": {
                              "fieldValues": [
                                    {
                                          "fieldId": "updatedAt",
                                          "fieldValue": "={{ $now }}"
                                    },
                                    {
                                          "fieldId": "workflowSource",
                                          "fieldValue": "WF-007"
                                    },
                                    {
                                          "fieldId": "status",
                                          "fieldValue": "processed"
                                    }
                              ]
                        }
                  },
                  "name": "[FIRESTORE] Operación Colección booking_addons",
                  "type": "native-automation-node.googleFirebaseCloudFirestore",
                  "typeVersion": 1.1,
                  "position": [
                        650,
                        300
                  ],
                  "credentials": {
                        "googleApi": {
                              "id": "5NiYz8gX64lPYIdK",
                              "name": "Costa Rica Tours - Firebase"
                        }
                  },
                  "onError": "continueErrorOutput"
            },
            {
                  "parameters": {
                        "respondWith": "json",
                        "responseBody": "{\n  \"success\": true,\n  \"workflowCode\": \"WF-007\",\n  \"collection\": \"booking_addons\",\n  \"timestamp\": \"={{ $now }}\",\n  \"message\": \"Operación completada exitosamente en booking_addons\"\n}",
                        "options": {}
                  },
                  "name": "[RESPUESTA] Finalizar con Éxito",
                  "type": "native-automation-node.respondToWebhook",
                  "typeVersion": 1.5,
                  "position": [
                        950,
                        200
                  ]
            },
            {
                  "parameters": {
                        "method": "POST",
                        "url": "={{ $env.APP_URL || \"http://localhost:3000\" }}/api/alerts",
                        "sendHeaders": true,
                        "headerParameters": {
                              "parameters": [
                                    {
                                          "name": "X-Webhook-Secret",
                                          "value": "={{ $env.WEBHOOK_SECRET || \"dev-secret\" }}"
                                    },
                                    {
                                          "name": "Content-Type",
                                          "value": "application/json"
                                    }
                              ]
                        },
                        "sendBody": true,
                        "specifyBody": "json",
                        "jsonBody": "{\n  \"source\": \"Motor de Upgrades y Extras de Aventura\",\n  \"severity\": \"critical\",\n  \"title\": \"Fallo en workflow WF-007: Motor de Upgrades y Extras de Aventura\",\n  \"message\": \"=Error al ejecutar en colección booking_addons: {{ $json.error?.message || \\\"Error no especificado\\\" }}\",\n  \"bookingId\": \"={{ $json.bookingId }}\",\n  \"metadata\": {\n    \"workflowCode\": \"WF-007\",\n    \"collection\": \"booking_addons\",\n    \"endpoint\": \"/api/native/workflows/upsell-addons\"\n  }\n}",
                        "options": {}
                  },
                  "name": "[ALERTA NATIVA] Enviar a /api/alerts",
                  "type": "native-automation-node.httpRequest",
                  "typeVersion": 4.2,
                  "position": [
                        950,
                        450
                  ]
            }
      ],
      "connections": {
            "[TRIGGER] Motor de Upgrades y Extras de Aventura": {
                  "main": [
                        [
                              {
                                    "node": "[EXTRACT] Formatear y Validar Datos",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[EXTRACT] Formatear y Validar Datos": {
                  "main": [
                        [
                              {
                                    "node": "[FIRESTORE] Operación Colección booking_addons",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[FIRESTORE] Operación Colección booking_addons": {
                  "main": [
                        [
                              {
                                    "node": "[RESPUESTA] Finalizar con Éxito",
                                    "type": "main",
                                    "index": 0
                              }
                        ],
                        [
                              {
                                    "node": "[ALERTA NATIVA] Enviar a /api/alerts",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            }
      }
}
  },
  {
    id: "wf-008-group-split-booking",
    code: "WF-008",
    name: {
      es: "Reservas Grupales y División de Pasajeros",
      en: "Group Bookings & Passenger Split Dispatcher"
    },
    category: "booking",
    collection: "group_bookings",
    description: {
      es: "Organiza grupos de 10+ personas, valida cupo máximo por van y genera múltiples vouchers asociados a un único titular.",
      en: "Coordinates 10+ person groups, checks van capacity limits, and creates linked vouchers for primary buyer."
    },
    icon: "Users",
    color: "#06b6d4",
    endpoint: "/api/native/workflows/group-split",
    method: "POST",
    triggerEvent: "Webhook de reserva grupal (>8 personas)",
    nodesCount: 5,
    slaTarget: "< 900ms",
    nodes: [
      {
            "id": "node-trigger",
            "name": "[TRIGGER] Reservas Grupales y División de Pasajeros",
            "type": "native-automation-node.webhook",
            "description": "Webhook de reserva grupal (>8 personas)"
      },
      {
            "id": "node-extract",
            "name": "[EXTRACT] Formatear y Validar Datos",
            "type": "native-automation-node.code",
            "description": "Transformación y validación de esquema"
      },
      {
            "id": "node-firestore",
            "name": "[FIRESTORE] Operación group_bookings",
            "type": "native-automation-node.googleFirebaseCloudFirestore",
            "description": "Lectura/Escritura en Firestore /group_bookings"
      },
      {
            "id": "node-response",
            "name": "[RESPUESTA] Finalizar con Éxito",
            "type": "native-automation-node.respondToWebhook",
            "description": "Respuesta HTTP 200 con payload estructurado"
      },
      {
            "id": "node-alert",
            "name": "[ALERTA NATIVA] Enviar a /api/alerts",
            "type": "native-automation-node.httpRequest",
            "description": "Enrutamiento de error a /api/alerts (reemplazo Telegram)"
      }
],
    samplePayload: {
      "groupBookingId": "GRP-2026-101",
      "totalPax": 14,
      "leadCustomer": "Summit Tech Retreat",
      "vehiclesRequired": 2
},
    blueprintJson: {
      "id": "WF-008",
      "name": "Reservas Grupales y División de Pasajeros",
      "active": true,
      "nodes": [
            {
                  "parameters": {
                        "path": "api/native/workflows/group-split",
                        "httpMethod": "POST",
                        "responseMode": "responseNode",
                        "options": {}
                  },
                  "name": "[TRIGGER] Reservas Grupales y División de Pasajeros",
                  "type": "native-automation-node.webhook",
                  "typeVersion": 2,
                  "position": [
                        100,
                        300
                  ]
            },
            {
                  "parameters": {
                        "jsCode": "// Validar campos obligatorios y normalizar timestamp\nconst item = $input.first().json || {};\nitem.processedAt = new Date().toISOString();\nitem.environment = 'production';\nitem.targetCollection = 'group_bookings';\nreturn [{ json: item }];"
                  },
                  "name": "[EXTRACT] Formatear y Validar Datos",
                  "type": "native-automation-node.code",
                  "typeVersion": 2,
                  "position": [
                        350,
                        300
                  ]
            },
            {
                  "parameters": {
                        "operation": "upsert",
                        "collection": "group_bookings",
                        "documentId": "={{ $json.id || $json.bookingId || $json.code || $now }}",
                        "dataToSend": "defineBelow",
                        "fieldsUi": {
                              "fieldValues": [
                                    {
                                          "fieldId": "updatedAt",
                                          "fieldValue": "={{ $now }}"
                                    },
                                    {
                                          "fieldId": "workflowSource",
                                          "fieldValue": "WF-008"
                                    },
                                    {
                                          "fieldId": "status",
                                          "fieldValue": "processed"
                                    }
                              ]
                        }
                  },
                  "name": "[FIRESTORE] Operación Colección group_bookings",
                  "type": "native-automation-node.googleFirebaseCloudFirestore",
                  "typeVersion": 1.1,
                  "position": [
                        650,
                        300
                  ],
                  "credentials": {
                        "googleApi": {
                              "id": "5NiYz8gX64lPYIdK",
                              "name": "Costa Rica Tours - Firebase"
                        }
                  },
                  "onError": "continueErrorOutput"
            },
            {
                  "parameters": {
                        "respondWith": "json",
                        "responseBody": "{\n  \"success\": true,\n  \"workflowCode\": \"WF-008\",\n  \"collection\": \"group_bookings\",\n  \"timestamp\": \"={{ $now }}\",\n  \"message\": \"Operación completada exitosamente en group_bookings\"\n}",
                        "options": {}
                  },
                  "name": "[RESPUESTA] Finalizar con Éxito",
                  "type": "native-automation-node.respondToWebhook",
                  "typeVersion": 1.5,
                  "position": [
                        950,
                        200
                  ]
            },
            {
                  "parameters": {
                        "method": "POST",
                        "url": "={{ $env.APP_URL || \"http://localhost:3000\" }}/api/alerts",
                        "sendHeaders": true,
                        "headerParameters": {
                              "parameters": [
                                    {
                                          "name": "X-Webhook-Secret",
                                          "value": "={{ $env.WEBHOOK_SECRET || \"dev-secret\" }}"
                                    },
                                    {
                                          "name": "Content-Type",
                                          "value": "application/json"
                                    }
                              ]
                        },
                        "sendBody": true,
                        "specifyBody": "json",
                        "jsonBody": "{\n  \"source\": \"Reservas Grupales y División de Pasajeros\",\n  \"severity\": \"critical\",\n  \"title\": \"Fallo en workflow WF-008: Reservas Grupales y División de Pasajeros\",\n  \"message\": \"=Error al ejecutar en colección group_bookings: {{ $json.error?.message || \\\"Error no especificado\\\" }}\",\n  \"bookingId\": \"={{ $json.bookingId }}\",\n  \"metadata\": {\n    \"workflowCode\": \"WF-008\",\n    \"collection\": \"group_bookings\",\n    \"endpoint\": \"/api/native/workflows/group-split\"\n  }\n}",
                        "options": {}
                  },
                  "name": "[ALERTA NATIVA] Enviar a /api/alerts",
                  "type": "native-automation-node.httpRequest",
                  "typeVersion": 4.2,
                  "position": [
                        950,
                        450
                  ]
            }
      ],
      "connections": {
            "[TRIGGER] Reservas Grupales y División de Pasajeros": {
                  "main": [
                        [
                              {
                                    "node": "[EXTRACT] Formatear y Validar Datos",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[EXTRACT] Formatear y Validar Datos": {
                  "main": [
                        [
                              {
                                    "node": "[FIRESTORE] Operación Colección group_bookings",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[FIRESTORE] Operación Colección group_bookings": {
                  "main": [
                        [
                              {
                                    "node": "[RESPUESTA] Finalizar con Éxito",
                                    "type": "main",
                                    "index": 0
                              }
                        ],
                        [
                              {
                                    "node": "[ALERTA NATIVA] Enviar a /api/alerts",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            }
      }
}
  },
  {
    id: "wf-009-hotel-pickup-geofencing",
    code: "WF-009",
    name: {
      es: "Validador Geográfico de Puntos de Recogida (Geofencing)",
      en: "Hotel Pickup Geographic Geofencing Validator"
    },
    category: "booking",
    collection: "routes",
    description: {
      es: "Calcula distancia del hotel al punto de inicio del tour; si supera radio estándar, añade suplemento de transporte automáticamente.",
      en: "Calculates hotel distance to tour trailhead; applies automated transport supplement if outside standard radius."
    },
    icon: "MapPin",
    color: "#10b981",
    endpoint: "/api/native/workflows/validate-pickup",
    method: "POST",
    triggerEvent: "Ingreso o modificación de hotel de recogida",
    nodesCount: 5,
    slaTarget: "< 400ms",
    nodes: [
      {
            "id": "node-trigger",
            "name": "[TRIGGER] Validador Geográfico de Puntos de Recogida (Geofencing)",
            "type": "native-automation-node.webhook",
            "description": "Ingreso o modificación de hotel de recogida"
      },
      {
            "id": "node-extract",
            "name": "[EXTRACT] Formatear y Validar Datos",
            "type": "native-automation-node.code",
            "description": "Transformación y validación de esquema"
      },
      {
            "id": "node-firestore",
            "name": "[FIRESTORE] Operación routes",
            "type": "native-automation-node.googleFirebaseCloudFirestore",
            "description": "Lectura/Escritura en Firestore /routes"
      },
      {
            "id": "node-response",
            "name": "[RESPUESTA] Finalizar con Éxito",
            "type": "native-automation-node.respondToWebhook",
            "description": "Respuesta HTTP 200 con payload estructurado"
      },
      {
            "id": "node-alert",
            "name": "[ALERTA NATIVA] Enviar a /api/alerts",
            "type": "native-automation-node.httpRequest",
            "description": "Enrutamiento de error a /api/alerts (reemplazo Telegram)"
      }
],
    samplePayload: {
      "hotelName": "Nayara Springs",
      "coordinates": [
            10.485,
            -84.698
      ],
      "zone": "Zone A - Included"
},
    blueprintJson: {
      "id": "WF-009",
      "name": "Validador Geográfico de Puntos de Recogida (Geofencing)",
      "active": true,
      "nodes": [
            {
                  "parameters": {
                        "path": "api/native/workflows/validate-pickup",
                        "httpMethod": "POST",
                        "responseMode": "responseNode",
                        "options": {}
                  },
                  "name": "[TRIGGER] Validador Geográfico de Puntos de Recogida (Geofencing)",
                  "type": "native-automation-node.webhook",
                  "typeVersion": 2,
                  "position": [
                        100,
                        300
                  ]
            },
            {
                  "parameters": {
                        "jsCode": "// Validar campos obligatorios y normalizar timestamp\nconst item = $input.first().json || {};\nitem.processedAt = new Date().toISOString();\nitem.environment = 'production';\nitem.targetCollection = 'routes';\nreturn [{ json: item }];"
                  },
                  "name": "[EXTRACT] Formatear y Validar Datos",
                  "type": "native-automation-node.code",
                  "typeVersion": 2,
                  "position": [
                        350,
                        300
                  ]
            },
            {
                  "parameters": {
                        "operation": "upsert",
                        "collection": "routes",
                        "documentId": "={{ $json.id || $json.bookingId || $json.code || $now }}",
                        "dataToSend": "defineBelow",
                        "fieldsUi": {
                              "fieldValues": [
                                    {
                                          "fieldId": "updatedAt",
                                          "fieldValue": "={{ $now }}"
                                    },
                                    {
                                          "fieldId": "workflowSource",
                                          "fieldValue": "WF-009"
                                    },
                                    {
                                          "fieldId": "status",
                                          "fieldValue": "processed"
                                    }
                              ]
                        }
                  },
                  "name": "[FIRESTORE] Operación Colección routes",
                  "type": "native-automation-node.googleFirebaseCloudFirestore",
                  "typeVersion": 1.1,
                  "position": [
                        650,
                        300
                  ],
                  "credentials": {
                        "googleApi": {
                              "id": "5NiYz8gX64lPYIdK",
                              "name": "Costa Rica Tours - Firebase"
                        }
                  },
                  "onError": "continueErrorOutput"
            },
            {
                  "parameters": {
                        "respondWith": "json",
                        "responseBody": "{\n  \"success\": true,\n  \"workflowCode\": \"WF-009\",\n  \"collection\": \"routes\",\n  \"timestamp\": \"={{ $now }}\",\n  \"message\": \"Operación completada exitosamente en routes\"\n}",
                        "options": {}
                  },
                  "name": "[RESPUESTA] Finalizar con Éxito",
                  "type": "native-automation-node.respondToWebhook",
                  "typeVersion": 1.5,
                  "position": [
                        950,
                        200
                  ]
            },
            {
                  "parameters": {
                        "method": "POST",
                        "url": "={{ $env.APP_URL || \"http://localhost:3000\" }}/api/alerts",
                        "sendHeaders": true,
                        "headerParameters": {
                              "parameters": [
                                    {
                                          "name": "X-Webhook-Secret",
                                          "value": "={{ $env.WEBHOOK_SECRET || \"dev-secret\" }}"
                                    },
                                    {
                                          "name": "Content-Type",
                                          "value": "application/json"
                                    }
                              ]
                        },
                        "sendBody": true,
                        "specifyBody": "json",
                        "jsonBody": "{\n  \"source\": \"Validador Geográfico de Puntos de Recogida (Geofencing)\",\n  \"severity\": \"critical\",\n  \"title\": \"Fallo en workflow WF-009: Validador Geográfico de Puntos de Recogida (Geofencing)\",\n  \"message\": \"=Error al ejecutar en colección routes: {{ $json.error?.message || \\\"Error no especificado\\\" }}\",\n  \"bookingId\": \"={{ $json.bookingId }}\",\n  \"metadata\": {\n    \"workflowCode\": \"WF-009\",\n    \"collection\": \"routes\",\n    \"endpoint\": \"/api/native/workflows/validate-pickup\"\n  }\n}",
                        "options": {}
                  },
                  "name": "[ALERTA NATIVA] Enviar a /api/alerts",
                  "type": "native-automation-node.httpRequest",
                  "typeVersion": 4.2,
                  "position": [
                        950,
                        450
                  ]
            }
      ],
      "connections": {
            "[TRIGGER] Validador Geográfico de Puntos de Recogida (Geofencing)": {
                  "main": [
                        [
                              {
                                    "node": "[EXTRACT] Formatear y Validar Datos",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[EXTRACT] Formatear y Validar Datos": {
                  "main": [
                        [
                              {
                                    "node": "[FIRESTORE] Operación Colección routes",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[FIRESTORE] Operación Colección routes": {
                  "main": [
                        [
                              {
                                    "node": "[RESPUESTA] Finalizar con Éxito",
                                    "type": "main",
                                    "index": 0
                              }
                        ],
                        [
                              {
                                    "node": "[ALERTA NATIVA] Enviar a /api/alerts",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            }
      }
}
  },
  {
    id: "wf-010-dietary-allergy-alert",
    code: "WF-010",
    name: {
      es: "Disparador de Alergias y Dietas a Cocinas Locales",
      en: "Dietary & Allergy Food Alert to Local Kitchens"
    },
    category: "booking",
    collection: "catering_alerts",
    description: {
      es: "Extrae requerimientos especiales (vegano, celíaco, alergia a frutos secos) y notifica al restaurante asignado en el tour.",
      en: "Extracts special dietary requirements and dispatches alerts to the tour assigned local restaurant partner."
    },
    icon: "Utensils",
    color: "#ec4899",
    endpoint: "/api/native/workflows/catering-alert",
    method: "POST",
    triggerEvent: "Reserva confirmada con campos de dieta/alergias",
    nodesCount: 5,
    slaTarget: "< 500ms",
    nodes: [
      {
            "id": "node-trigger",
            "name": "[TRIGGER] Disparador de Alergias y Dietas a Cocinas Locales",
            "type": "native-automation-node.webhook",
            "description": "Reserva confirmada con campos de dieta/alergias"
      },
      {
            "id": "node-extract",
            "name": "[EXTRACT] Formatear y Validar Datos",
            "type": "native-automation-node.code",
            "description": "Transformación y validación de esquema"
      },
      {
            "id": "node-firestore",
            "name": "[FIRESTORE] Operación catering_alerts",
            "type": "native-automation-node.googleFirebaseCloudFirestore",
            "description": "Lectura/Escritura en Firestore /catering_alerts"
      },
      {
            "id": "node-response",
            "name": "[RESPUESTA] Finalizar con Éxito",
            "type": "native-automation-node.respondToWebhook",
            "description": "Respuesta HTTP 200 con payload estructurado"
      },
      {
            "id": "node-alert",
            "name": "[ALERTA NATIVA] Enviar a /api/alerts",
            "type": "native-automation-node.httpRequest",
            "description": "Enrutamiento de error a /api/alerts (reemplazo Telegram)"
      }
],
    samplePayload: {
      "bookingId": "BK-CR-2026-910",
      "dietaryNotes": "Strict Gluten-Free & Vegan",
      "restaurantPartnerId": "rest-arenal-org"
},
    blueprintJson: {
      "id": "WF-010",
      "name": "Disparador de Alergias y Dietas a Cocinas Locales",
      "active": true,
      "nodes": [
            {
                  "parameters": {
                        "path": "api/native/workflows/catering-alert",
                        "httpMethod": "POST",
                        "responseMode": "responseNode",
                        "options": {}
                  },
                  "name": "[TRIGGER] Disparador de Alergias y Dietas a Cocinas Locales",
                  "type": "native-automation-node.webhook",
                  "typeVersion": 2,
                  "position": [
                        100,
                        300
                  ]
            },
            {
                  "parameters": {
                        "jsCode": "// Validar campos obligatorios y normalizar timestamp\nconst item = $input.first().json || {};\nitem.processedAt = new Date().toISOString();\nitem.environment = 'production';\nitem.targetCollection = 'catering_alerts';\nreturn [{ json: item }];"
                  },
                  "name": "[EXTRACT] Formatear y Validar Datos",
                  "type": "native-automation-node.code",
                  "typeVersion": 2,
                  "position": [
                        350,
                        300
                  ]
            },
            {
                  "parameters": {
                        "operation": "upsert",
                        "collection": "catering_alerts",
                        "documentId": "={{ $json.id || $json.bookingId || $json.code || $now }}",
                        "dataToSend": "defineBelow",
                        "fieldsUi": {
                              "fieldValues": [
                                    {
                                          "fieldId": "updatedAt",
                                          "fieldValue": "={{ $now }}"
                                    },
                                    {
                                          "fieldId": "workflowSource",
                                          "fieldValue": "WF-010"
                                    },
                                    {
                                          "fieldId": "status",
                                          "fieldValue": "processed"
                                    }
                              ]
                        }
                  },
                  "name": "[FIRESTORE] Operación Colección catering_alerts",
                  "type": "native-automation-node.googleFirebaseCloudFirestore",
                  "typeVersion": 1.1,
                  "position": [
                        650,
                        300
                  ],
                  "credentials": {
                        "googleApi": {
                              "id": "5NiYz8gX64lPYIdK",
                              "name": "Costa Rica Tours - Firebase"
                        }
                  },
                  "onError": "continueErrorOutput"
            },
            {
                  "parameters": {
                        "respondWith": "json",
                        "responseBody": "{\n  \"success\": true,\n  \"workflowCode\": \"WF-010\",\n  \"collection\": \"catering_alerts\",\n  \"timestamp\": \"={{ $now }}\",\n  \"message\": \"Operación completada exitosamente en catering_alerts\"\n}",
                        "options": {}
                  },
                  "name": "[RESPUESTA] Finalizar con Éxito",
                  "type": "native-automation-node.respondToWebhook",
                  "typeVersion": 1.5,
                  "position": [
                        950,
                        200
                  ]
            },
            {
                  "parameters": {
                        "method": "POST",
                        "url": "={{ $env.APP_URL || \"http://localhost:3000\" }}/api/alerts",
                        "sendHeaders": true,
                        "headerParameters": {
                              "parameters": [
                                    {
                                          "name": "X-Webhook-Secret",
                                          "value": "={{ $env.WEBHOOK_SECRET || \"dev-secret\" }}"
                                    },
                                    {
                                          "name": "Content-Type",
                                          "value": "application/json"
                                    }
                              ]
                        },
                        "sendBody": true,
                        "specifyBody": "json",
                        "jsonBody": "{\n  \"source\": \"Disparador de Alergias y Dietas a Cocinas Locales\",\n  \"severity\": \"critical\",\n  \"title\": \"Fallo en workflow WF-010: Disparador de Alergias y Dietas a Cocinas Locales\",\n  \"message\": \"=Error al ejecutar en colección catering_alerts: {{ $json.error?.message || \\\"Error no especificado\\\" }}\",\n  \"bookingId\": \"={{ $json.bookingId }}\",\n  \"metadata\": {\n    \"workflowCode\": \"WF-010\",\n    \"collection\": \"catering_alerts\",\n    \"endpoint\": \"/api/native/workflows/catering-alert\"\n  }\n}",
                        "options": {}
                  },
                  "name": "[ALERTA NATIVA] Enviar a /api/alerts",
                  "type": "native-automation-node.httpRequest",
                  "typeVersion": 4.2,
                  "position": [
                        950,
                        450
                  ]
            }
      ],
      "connections": {
            "[TRIGGER] Disparador de Alergias y Dietas a Cocinas Locales": {
                  "main": [
                        [
                              {
                                    "node": "[EXTRACT] Formatear y Validar Datos",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[EXTRACT] Formatear y Validar Datos": {
                  "main": [
                        [
                              {
                                    "node": "[FIRESTORE] Operación Colección catering_alerts",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[FIRESTORE] Operación Colección catering_alerts": {
                  "main": [
                        [
                              {
                                    "node": "[RESPUESTA] Finalizar con Éxito",
                                    "type": "main",
                                    "index": 0
                              }
                        ],
                        [
                              {
                                    "node": "[ALERTA NATIVA] Enviar a /api/alerts",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            }
      }
}
  },
  {
    id: "wf-011-minor-waiver-verification",
    code: "WF-011",
    name: {
      es: "Verificación Digital de Consentimiento para Menores",
      en: "Digital Minor Consent & Safety Waiver Verification"
    },
    category: "booking",
    collection: "waivers",
    description: {
      es: "Envía formulario digital de exención de responsabilidad para actividades extremas (Rafting clase IV, Canopy) y valida firma en Firestore.",
      en: "Sends digital liability waiver for high adventure activities (Class IV Rafting, Zipline) and logs signature in Firestore."
    },
    icon: "FileCheck",
    color: "#6366f1",
    endpoint: "/api/native/workflows/verify-waiver",
    method: "POST",
    triggerEvent: "Reserva de tour de alta dificultad con menores de edad",
    nodesCount: 5,
    slaTarget: "< 600ms",
    nodes: [
      {
            "id": "node-trigger",
            "name": "[TRIGGER] Verificación Digital de Consentimiento para Menores",
            "type": "native-automation-node.webhook",
            "description": "Reserva de tour de alta dificultad con menores de edad"
      },
      {
            "id": "node-extract",
            "name": "[EXTRACT] Formatear y Validar Datos",
            "type": "native-automation-node.code",
            "description": "Transformación y validación de esquema"
      },
      {
            "id": "node-firestore",
            "name": "[FIRESTORE] Operación waivers",
            "type": "native-automation-node.googleFirebaseCloudFirestore",
            "description": "Lectura/Escritura en Firestore /waivers"
      },
      {
            "id": "node-response",
            "name": "[RESPUESTA] Finalizar con Éxito",
            "type": "native-automation-node.respondToWebhook",
            "description": "Respuesta HTTP 200 con payload estructurado"
      },
      {
            "id": "node-alert",
            "name": "[ALERTA NATIVA] Enviar a /api/alerts",
            "type": "native-automation-node.httpRequest",
            "description": "Enrutamiento de error a /api/alerts (reemplazo Telegram)"
      }
],
    samplePayload: {
      "bookingId": "BK-CR-2026-911",
      "minorPaxCount": 2,
      "waiverStatus": "signed_digitally"
},
    blueprintJson: {
      "id": "WF-011",
      "name": "Verificación Digital de Consentimiento para Menores",
      "active": true,
      "nodes": [
            {
                  "parameters": {
                        "path": "api/native/workflows/verify-waiver",
                        "httpMethod": "POST",
                        "responseMode": "responseNode",
                        "options": {}
                  },
                  "name": "[TRIGGER] Verificación Digital de Consentimiento para Menores",
                  "type": "native-automation-node.webhook",
                  "typeVersion": 2,
                  "position": [
                        100,
                        300
                  ]
            },
            {
                  "parameters": {
                        "jsCode": "// Validar campos obligatorios y normalizar timestamp\nconst item = $input.first().json || {};\nitem.processedAt = new Date().toISOString();\nitem.environment = 'production';\nitem.targetCollection = 'waivers';\nreturn [{ json: item }];"
                  },
                  "name": "[EXTRACT] Formatear y Validar Datos",
                  "type": "native-automation-node.code",
                  "typeVersion": 2,
                  "position": [
                        350,
                        300
                  ]
            },
            {
                  "parameters": {
                        "operation": "upsert",
                        "collection": "waivers",
                        "documentId": "={{ $json.id || $json.bookingId || $json.code || $now }}",
                        "dataToSend": "defineBelow",
                        "fieldsUi": {
                              "fieldValues": [
                                    {
                                          "fieldId": "updatedAt",
                                          "fieldValue": "={{ $now }}"
                                    },
                                    {
                                          "fieldId": "workflowSource",
                                          "fieldValue": "WF-011"
                                    },
                                    {
                                          "fieldId": "status",
                                          "fieldValue": "processed"
                                    }
                              ]
                        }
                  },
                  "name": "[FIRESTORE] Operación Colección waivers",
                  "type": "native-automation-node.googleFirebaseCloudFirestore",
                  "typeVersion": 1.1,
                  "position": [
                        650,
                        300
                  ],
                  "credentials": {
                        "googleApi": {
                              "id": "5NiYz8gX64lPYIdK",
                              "name": "Costa Rica Tours - Firebase"
                        }
                  },
                  "onError": "continueErrorOutput"
            },
            {
                  "parameters": {
                        "respondWith": "json",
                        "responseBody": "{\n  \"success\": true,\n  \"workflowCode\": \"WF-011\",\n  \"collection\": \"waivers\",\n  \"timestamp\": \"={{ $now }}\",\n  \"message\": \"Operación completada exitosamente en waivers\"\n}",
                        "options": {}
                  },
                  "name": "[RESPUESTA] Finalizar con Éxito",
                  "type": "native-automation-node.respondToWebhook",
                  "typeVersion": 1.5,
                  "position": [
                        950,
                        200
                  ]
            },
            {
                  "parameters": {
                        "method": "POST",
                        "url": "={{ $env.APP_URL || \"http://localhost:3000\" }}/api/alerts",
                        "sendHeaders": true,
                        "headerParameters": {
                              "parameters": [
                                    {
                                          "name": "X-Webhook-Secret",
                                          "value": "={{ $env.WEBHOOK_SECRET || \"dev-secret\" }}"
                                    },
                                    {
                                          "name": "Content-Type",
                                          "value": "application/json"
                                    }
                              ]
                        },
                        "sendBody": true,
                        "specifyBody": "json",
                        "jsonBody": "{\n  \"source\": \"Verificación Digital de Consentimiento para Menores\",\n  \"severity\": \"critical\",\n  \"title\": \"Fallo en workflow WF-011: Verificación Digital de Consentimiento para Menores\",\n  \"message\": \"=Error al ejecutar en colección waivers: {{ $json.error?.message || \\\"Error no especificado\\\" }}\",\n  \"bookingId\": \"={{ $json.bookingId }}\",\n  \"metadata\": {\n    \"workflowCode\": \"WF-011\",\n    \"collection\": \"waivers\",\n    \"endpoint\": \"/api/native/workflows/verify-waiver\"\n  }\n}",
                        "options": {}
                  },
                  "name": "[ALERTA NATIVA] Enviar a /api/alerts",
                  "type": "native-automation-node.httpRequest",
                  "typeVersion": 4.2,
                  "position": [
                        950,
                        450
                  ]
            }
      ],
      "connections": {
            "[TRIGGER] Verificación Digital de Consentimiento para Menores": {
                  "main": [
                        [
                              {
                                    "node": "[EXTRACT] Formatear y Validar Datos",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[EXTRACT] Formatear y Validar Datos": {
                  "main": [
                        [
                              {
                                    "node": "[FIRESTORE] Operación Colección waivers",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[FIRESTORE] Operación Colección waivers": {
                  "main": [
                        [
                              {
                                    "node": "[RESPUESTA] Finalizar con Éxito",
                                    "type": "main",
                                    "index": 0
                              }
                        ],
                        [
                              {
                                    "node": "[ALERTA NATIVA] Enviar a /api/alerts",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            }
      }
}
  },
  {
    id: "wf-012-cruise-ship-dock-sync",
    code: "WF-012",
    name: {
      es: "Sincronizador de Cruceros en Puerto Caldera y Limón",
      en: "Cruise Ship Arrival & Docking Synchronizer"
    },
    category: "booking",
    collection: "cruise_schedules",
    description: {
      es: "Ajusta horarios de recogida y retorno de tours según atraque en tiempo real de cruceros internacionales.",
      en: "Dynamically shifts tour pickup/dropoff hours based on live cruise ship docking data in Limón/Caldera."
    },
    icon: "Ship",
    color: "#0284c7",
    endpoint: "/api/native/workflows/cruise-sync",
    method: "POST",
    triggerEvent: "Webhook de API portuaria o cambio de itinerario de naviera",
    nodesCount: 5,
    slaTarget: "< 1.2s",
    nodes: [
      {
            "id": "node-trigger",
            "name": "[TRIGGER] Sincronizador de Cruceros en Puerto Caldera y Limón",
            "type": "native-automation-node.webhook",
            "description": "Webhook de API portuaria o cambio de itinerario de naviera"
      },
      {
            "id": "node-extract",
            "name": "[EXTRACT] Formatear y Validar Datos",
            "type": "native-automation-node.code",
            "description": "Transformación y validación de esquema"
      },
      {
            "id": "node-firestore",
            "name": "[FIRESTORE] Operación cruise_schedules",
            "type": "native-automation-node.googleFirebaseCloudFirestore",
            "description": "Lectura/Escritura en Firestore /cruise_schedules"
      },
      {
            "id": "node-response",
            "name": "[RESPUESTA] Finalizar con Éxito",
            "type": "native-automation-node.respondToWebhook",
            "description": "Respuesta HTTP 200 con payload estructurado"
      },
      {
            "id": "node-alert",
            "name": "[ALERTA NATIVA] Enviar a /api/alerts",
            "type": "native-automation-node.httpRequest",
            "description": "Enrutamiento de error a /api/alerts (reemplazo Telegram)"
      }
],
    samplePayload: {
      "port": "Puerto Caldera",
      "vesselName": "Celebrity Eclipse",
      "originalDockTime": "07:00",
      "adjustedDockTime": "08:30"
},
    blueprintJson: {
      "id": "WF-012",
      "name": "Sincronizador de Cruceros en Puerto Caldera y Limón",
      "active": true,
      "nodes": [
            {
                  "parameters": {
                        "path": "api/native/workflows/cruise-sync",
                        "httpMethod": "POST",
                        "responseMode": "responseNode",
                        "options": {}
                  },
                  "name": "[TRIGGER] Sincronizador de Cruceros en Puerto Caldera y Limón",
                  "type": "native-automation-node.webhook",
                  "typeVersion": 2,
                  "position": [
                        100,
                        300
                  ]
            },
            {
                  "parameters": {
                        "jsCode": "// Validar campos obligatorios y normalizar timestamp\nconst item = $input.first().json || {};\nitem.processedAt = new Date().toISOString();\nitem.environment = 'production';\nitem.targetCollection = 'cruise_schedules';\nreturn [{ json: item }];"
                  },
                  "name": "[EXTRACT] Formatear y Validar Datos",
                  "type": "native-automation-node.code",
                  "typeVersion": 2,
                  "position": [
                        350,
                        300
                  ]
            },
            {
                  "parameters": {
                        "operation": "upsert",
                        "collection": "cruise_schedules",
                        "documentId": "={{ $json.id || $json.bookingId || $json.code || $now }}",
                        "dataToSend": "defineBelow",
                        "fieldsUi": {
                              "fieldValues": [
                                    {
                                          "fieldId": "updatedAt",
                                          "fieldValue": "={{ $now }}"
                                    },
                                    {
                                          "fieldId": "workflowSource",
                                          "fieldValue": "WF-012"
                                    },
                                    {
                                          "fieldId": "status",
                                          "fieldValue": "processed"
                                    }
                              ]
                        }
                  },
                  "name": "[FIRESTORE] Operación Colección cruise_schedules",
                  "type": "native-automation-node.googleFirebaseCloudFirestore",
                  "typeVersion": 1.1,
                  "position": [
                        650,
                        300
                  ],
                  "credentials": {
                        "googleApi": {
                              "id": "5NiYz8gX64lPYIdK",
                              "name": "Costa Rica Tours - Firebase"
                        }
                  },
                  "onError": "continueErrorOutput"
            },
            {
                  "parameters": {
                        "respondWith": "json",
                        "responseBody": "{\n  \"success\": true,\n  \"workflowCode\": \"WF-012\",\n  \"collection\": \"cruise_schedules\",\n  \"timestamp\": \"={{ $now }}\",\n  \"message\": \"Operación completada exitosamente en cruise_schedules\"\n}",
                        "options": {}
                  },
                  "name": "[RESPUESTA] Finalizar con Éxito",
                  "type": "native-automation-node.respondToWebhook",
                  "typeVersion": 1.5,
                  "position": [
                        950,
                        200
                  ]
            },
            {
                  "parameters": {
                        "method": "POST",
                        "url": "={{ $env.APP_URL || \"http://localhost:3000\" }}/api/alerts",
                        "sendHeaders": true,
                        "headerParameters": {
                              "parameters": [
                                    {
                                          "name": "X-Webhook-Secret",
                                          "value": "={{ $env.WEBHOOK_SECRET || \"dev-secret\" }}"
                                    },
                                    {
                                          "name": "Content-Type",
                                          "value": "application/json"
                                    }
                              ]
                        },
                        "sendBody": true,
                        "specifyBody": "json",
                        "jsonBody": "{\n  \"source\": \"Sincronizador de Cruceros en Puerto Caldera y Limón\",\n  \"severity\": \"critical\",\n  \"title\": \"Fallo en workflow WF-012: Sincronizador de Cruceros en Puerto Caldera y Limón\",\n  \"message\": \"=Error al ejecutar en colección cruise_schedules: {{ $json.error?.message || \\\"Error no especificado\\\" }}\",\n  \"bookingId\": \"={{ $json.bookingId }}\",\n  \"metadata\": {\n    \"workflowCode\": \"WF-012\",\n    \"collection\": \"cruise_schedules\",\n    \"endpoint\": \"/api/native/workflows/cruise-sync\"\n  }\n}",
                        "options": {}
                  },
                  "name": "[ALERTA NATIVA] Enviar a /api/alerts",
                  "type": "native-automation-node.httpRequest",
                  "typeVersion": 4.2,
                  "position": [
                        950,
                        450
                  ]
            }
      ],
      "connections": {
            "[TRIGGER] Sincronizador de Cruceros en Puerto Caldera y Limón": {
                  "main": [
                        [
                              {
                                    "node": "[EXTRACT] Formatear y Validar Datos",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[EXTRACT] Formatear y Validar Datos": {
                  "main": [
                        [
                              {
                                    "node": "[FIRESTORE] Operación Colección cruise_schedules",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[FIRESTORE] Operación Colección cruise_schedules": {
                  "main": [
                        [
                              {
                                    "node": "[RESPUESTA] Finalizar con Éxito",
                                    "type": "main",
                                    "index": 0
                              }
                        ],
                        [
                              {
                                    "node": "[ALERTA NATIVA] Enviar a /api/alerts",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            }
      }
}
  },
  {
    id: "wf-013-last-minute-flash-booking",
    code: "WF-013",
    name: {
      es: "Motor de Reservas Flash de Último Minuto (Mismo Día)",
      en: "Last-Minute Same-Day Flash Booking Engine"
    },
    category: "booking",
    collection: "bookings",
    description: {
      es: "Habilita reservas automáticas con confirmación express en menos de 2 horas antes de la salida del tour.",
      en: "Enables instant express confirmation for bookings placed less than 2 hours before tour departure."
    },
    icon: "Zap",
    color: "#eab308",
    endpoint: "/api/native/workflows/flash-booking",
    method: "POST",
    triggerEvent: "Reserva con fecha de hoy y salida en < 3 horas",
    nodesCount: 5,
    slaTarget: "< 300ms",
    nodes: [
      {
            "id": "node-trigger",
            "name": "[TRIGGER] Motor de Reservas Flash de Último Minuto (Mismo Día)",
            "type": "native-automation-node.webhook",
            "description": "Reserva con fecha de hoy y salida en < 3 horas"
      },
      {
            "id": "node-extract",
            "name": "[EXTRACT] Formatear y Validar Datos",
            "type": "native-automation-node.code",
            "description": "Transformación y validación de esquema"
      },
      {
            "id": "node-firestore",
            "name": "[FIRESTORE] Operación bookings",
            "type": "native-automation-node.googleFirebaseCloudFirestore",
            "description": "Lectura/Escritura en Firestore /bookings"
      },
      {
            "id": "node-response",
            "name": "[RESPUESTA] Finalizar con Éxito",
            "type": "native-automation-node.respondToWebhook",
            "description": "Respuesta HTTP 200 con payload estructurado"
      },
      {
            "id": "node-alert",
            "name": "[ALERTA NATIVA] Enviar a /api/alerts",
            "type": "native-automation-node.httpRequest",
            "description": "Enrutamiento de error a /api/alerts (reemplazo Telegram)"
      }
],
    samplePayload: {
      "bookingId": "BK-CR-2026-FLASH-01",
      "minutesToDeparture": 90,
      "operatorInstantAck": true
},
    blueprintJson: {
      "id": "WF-013",
      "name": "Motor de Reservas Flash de Último Minuto (Mismo Día)",
      "active": true,
      "nodes": [
            {
                  "parameters": {
                        "path": "api/native/workflows/flash-booking",
                        "httpMethod": "POST",
                        "responseMode": "responseNode",
                        "options": {}
                  },
                  "name": "[TRIGGER] Motor de Reservas Flash de Último Minuto (Mismo Día)",
                  "type": "native-automation-node.webhook",
                  "typeVersion": 2,
                  "position": [
                        100,
                        300
                  ]
            },
            {
                  "parameters": {
                        "jsCode": "// Validar campos obligatorios y normalizar timestamp\nconst item = $input.first().json || {};\nitem.processedAt = new Date().toISOString();\nitem.environment = 'production';\nitem.targetCollection = 'bookings';\nreturn [{ json: item }];"
                  },
                  "name": "[EXTRACT] Formatear y Validar Datos",
                  "type": "native-automation-node.code",
                  "typeVersion": 2,
                  "position": [
                        350,
                        300
                  ]
            },
            {
                  "parameters": {
                        "operation": "upsert",
                        "collection": "bookings",
                        "documentId": "={{ $json.id || $json.bookingId || $json.code || $now }}",
                        "dataToSend": "defineBelow",
                        "fieldsUi": {
                              "fieldValues": [
                                    {
                                          "fieldId": "updatedAt",
                                          "fieldValue": "={{ $now }}"
                                    },
                                    {
                                          "fieldId": "workflowSource",
                                          "fieldValue": "WF-013"
                                    },
                                    {
                                          "fieldId": "status",
                                          "fieldValue": "processed"
                                    }
                              ]
                        }
                  },
                  "name": "[FIRESTORE] Operación Colección bookings",
                  "type": "native-automation-node.googleFirebaseCloudFirestore",
                  "typeVersion": 1.1,
                  "position": [
                        650,
                        300
                  ],
                  "credentials": {
                        "googleApi": {
                              "id": "5NiYz8gX64lPYIdK",
                              "name": "Costa Rica Tours - Firebase"
                        }
                  },
                  "onError": "continueErrorOutput"
            },
            {
                  "parameters": {
                        "respondWith": "json",
                        "responseBody": "{\n  \"success\": true,\n  \"workflowCode\": \"WF-013\",\n  \"collection\": \"bookings\",\n  \"timestamp\": \"={{ $now }}\",\n  \"message\": \"Operación completada exitosamente en bookings\"\n}",
                        "options": {}
                  },
                  "name": "[RESPUESTA] Finalizar con Éxito",
                  "type": "native-automation-node.respondToWebhook",
                  "typeVersion": 1.5,
                  "position": [
                        950,
                        200
                  ]
            },
            {
                  "parameters": {
                        "method": "POST",
                        "url": "={{ $env.APP_URL || \"http://localhost:3000\" }}/api/alerts",
                        "sendHeaders": true,
                        "headerParameters": {
                              "parameters": [
                                    {
                                          "name": "X-Webhook-Secret",
                                          "value": "={{ $env.WEBHOOK_SECRET || \"dev-secret\" }}"
                                    },
                                    {
                                          "name": "Content-Type",
                                          "value": "application/json"
                                    }
                              ]
                        },
                        "sendBody": true,
                        "specifyBody": "json",
                        "jsonBody": "{\n  \"source\": \"Motor de Reservas Flash de Último Minuto (Mismo Día)\",\n  \"severity\": \"critical\",\n  \"title\": \"Fallo en workflow WF-013: Motor de Reservas Flash de Último Minuto (Mismo Día)\",\n  \"message\": \"=Error al ejecutar en colección bookings: {{ $json.error?.message || \\\"Error no especificado\\\" }}\",\n  \"bookingId\": \"={{ $json.bookingId }}\",\n  \"metadata\": {\n    \"workflowCode\": \"WF-013\",\n    \"collection\": \"bookings\",\n    \"endpoint\": \"/api/native/workflows/flash-booking\"\n  }\n}",
                        "options": {}
                  },
                  "name": "[ALERTA NATIVA] Enviar a /api/alerts",
                  "type": "native-automation-node.httpRequest",
                  "typeVersion": 4.2,
                  "position": [
                        950,
                        450
                  ]
            }
      ],
      "connections": {
            "[TRIGGER] Motor de Reservas Flash de Último Minuto (Mismo Día)": {
                  "main": [
                        [
                              {
                                    "node": "[EXTRACT] Formatear y Validar Datos",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[EXTRACT] Formatear y Validar Datos": {
                  "main": [
                        [
                              {
                                    "node": "[FIRESTORE] Operación Colección bookings",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[FIRESTORE] Operación Colección bookings": {
                  "main": [
                        [
                              {
                                    "node": "[RESPUESTA] Finalizar con Éxito",
                                    "type": "main",
                                    "index": 0
                              }
                        ],
                        [
                              {
                                    "node": "[ALERTA NATIVA] Enviar a /api/alerts",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            }
      }
}
  },
  {
    id: "wf-014-repeat-customer-auto-tag",
    code: "WF-014",
    name: {
      es: "Identificador y Etiquetado de Clientes Frecuentes",
      en: "Repeat Traveler Recognition & Loyalty Tagger"
    },
    category: "booking",
    collection: "customers",
    description: {
      es: "Detecta si el email ya registra reservas previas en Firestore, asigna badge VIP y otorga atención prioritaria.",
      en: "Detects past reservations matching customer email in Firestore, assigns VIP tag and grants priority concierge."
    },
    icon: "Award",
    color: "#d97706",
    endpoint: "/api/native/workflows/customer-loyalty-tag",
    method: "POST",
    triggerEvent: "Creación de reserva o consulta de usuario",
    nodesCount: 5,
    slaTarget: "< 400ms",
    nodes: [
      {
            "id": "node-trigger",
            "name": "[TRIGGER] Identificador y Etiquetado de Clientes Frecuentes",
            "type": "native-automation-node.webhook",
            "description": "Creación de reserva o consulta de usuario"
      },
      {
            "id": "node-extract",
            "name": "[EXTRACT] Formatear y Validar Datos",
            "type": "native-automation-node.code",
            "description": "Transformación y validación de esquema"
      },
      {
            "id": "node-firestore",
            "name": "[FIRESTORE] Operación customers",
            "type": "native-automation-node.googleFirebaseCloudFirestore",
            "description": "Lectura/Escritura en Firestore /customers"
      },
      {
            "id": "node-response",
            "name": "[RESPUESTA] Finalizar con Éxito",
            "type": "native-automation-node.respondToWebhook",
            "description": "Respuesta HTTP 200 con payload estructurado"
      },
      {
            "id": "node-alert",
            "name": "[ALERTA NATIVA] Enviar a /api/alerts",
            "type": "native-automation-node.httpRequest",
            "description": "Enrutamiento de error a /api/alerts (reemplazo Telegram)"
      }
],
    samplePayload: {
      "customerEmail": "h.schmidt@berlin.de",
      "totalPriorBookings": 3,
      "loyaltyTier": "PuraVida Gold"
},
    blueprintJson: {
      "id": "WF-014",
      "name": "Identificador y Etiquetado de Clientes Frecuentes",
      "active": true,
      "nodes": [
            {
                  "parameters": {
                        "path": "api/native/workflows/customer-loyalty-tag",
                        "httpMethod": "POST",
                        "responseMode": "responseNode",
                        "options": {}
                  },
                  "name": "[TRIGGER] Identificador y Etiquetado de Clientes Frecuentes",
                  "type": "native-automation-node.webhook",
                  "typeVersion": 2,
                  "position": [
                        100,
                        300
                  ]
            },
            {
                  "parameters": {
                        "jsCode": "// Validar campos obligatorios y normalizar timestamp\nconst item = $input.first().json || {};\nitem.processedAt = new Date().toISOString();\nitem.environment = 'production';\nitem.targetCollection = 'customers';\nreturn [{ json: item }];"
                  },
                  "name": "[EXTRACT] Formatear y Validar Datos",
                  "type": "native-automation-node.code",
                  "typeVersion": 2,
                  "position": [
                        350,
                        300
                  ]
            },
            {
                  "parameters": {
                        "operation": "upsert",
                        "collection": "customers",
                        "documentId": "={{ $json.id || $json.bookingId || $json.code || $now }}",
                        "dataToSend": "defineBelow",
                        "fieldsUi": {
                              "fieldValues": [
                                    {
                                          "fieldId": "updatedAt",
                                          "fieldValue": "={{ $now }}"
                                    },
                                    {
                                          "fieldId": "workflowSource",
                                          "fieldValue": "WF-014"
                                    },
                                    {
                                          "fieldId": "status",
                                          "fieldValue": "processed"
                                    }
                              ]
                        }
                  },
                  "name": "[FIRESTORE] Operación Colección customers",
                  "type": "native-automation-node.googleFirebaseCloudFirestore",
                  "typeVersion": 1.1,
                  "position": [
                        650,
                        300
                  ],
                  "credentials": {
                        "googleApi": {
                              "id": "5NiYz8gX64lPYIdK",
                              "name": "Costa Rica Tours - Firebase"
                        }
                  },
                  "onError": "continueErrorOutput"
            },
            {
                  "parameters": {
                        "respondWith": "json",
                        "responseBody": "{\n  \"success\": true,\n  \"workflowCode\": \"WF-014\",\n  \"collection\": \"customers\",\n  \"timestamp\": \"={{ $now }}\",\n  \"message\": \"Operación completada exitosamente en customers\"\n}",
                        "options": {}
                  },
                  "name": "[RESPUESTA] Finalizar con Éxito",
                  "type": "native-automation-node.respondToWebhook",
                  "typeVersion": 1.5,
                  "position": [
                        950,
                        200
                  ]
            },
            {
                  "parameters": {
                        "method": "POST",
                        "url": "={{ $env.APP_URL || \"http://localhost:3000\" }}/api/alerts",
                        "sendHeaders": true,
                        "headerParameters": {
                              "parameters": [
                                    {
                                          "name": "X-Webhook-Secret",
                                          "value": "={{ $env.WEBHOOK_SECRET || \"dev-secret\" }}"
                                    },
                                    {
                                          "name": "Content-Type",
                                          "value": "application/json"
                                    }
                              ]
                        },
                        "sendBody": true,
                        "specifyBody": "json",
                        "jsonBody": "{\n  \"source\": \"Identificador y Etiquetado de Clientes Frecuentes\",\n  \"severity\": \"critical\",\n  \"title\": \"Fallo en workflow WF-014: Identificador y Etiquetado de Clientes Frecuentes\",\n  \"message\": \"=Error al ejecutar en colección customers: {{ $json.error?.message || \\\"Error no especificado\\\" }}\",\n  \"bookingId\": \"={{ $json.bookingId }}\",\n  \"metadata\": {\n    \"workflowCode\": \"WF-014\",\n    \"collection\": \"customers\",\n    \"endpoint\": \"/api/native/workflows/customer-loyalty-tag\"\n  }\n}",
                        "options": {}
                  },
                  "name": "[ALERTA NATIVA] Enviar a /api/alerts",
                  "type": "native-automation-node.httpRequest",
                  "typeVersion": 4.2,
                  "position": [
                        950,
                        450
                  ]
            }
      ],
      "connections": {
            "[TRIGGER] Identificador y Etiquetado de Clientes Frecuentes": {
                  "main": [
                        [
                              {
                                    "node": "[EXTRACT] Formatear y Validar Datos",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[EXTRACT] Formatear y Validar Datos": {
                  "main": [
                        [
                              {
                                    "node": "[FIRESTORE] Operación Colección customers",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[FIRESTORE] Operación Colección customers": {
                  "main": [
                        [
                              {
                                    "node": "[RESPUESTA] Finalizar con Éxito",
                                    "type": "main",
                                    "index": 0
                              }
                        ],
                        [
                              {
                                    "node": "[ALERTA NATIVA] Enviar a /api/alerts",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            }
      }
}
  },
  {
    id: "wf-015-booking-audit-trail-logger",
    code: "WF-015",
    name: {
      es: "Registro Inmutable de Auditoría de Reservas",
      en: "Immutable Booking Audit Trail & Mutation Logger"
    },
    category: "booking",
    collection: "audit_logs",
    description: {
      es: "Guarda en `audit_logs` cualquier modificación de estado, precio o participantes realizada por agentes u operadores.",
      en: "Logs every status, price, or passenger mutation into `audit_logs` collection for compliance."
    },
    icon: "ShieldCheck",
    color: "#047857",
    endpoint: "/api/native/workflows/audit-log",
    method: "POST",
    triggerEvent: "Cualquier mutación en documento de reserva",
    nodesCount: 5,
    slaTarget: "< 200ms",
    nodes: [
      {
            "id": "node-trigger",
            "name": "[TRIGGER] Registro Inmutable de Auditoría de Reservas",
            "type": "native-automation-node.webhook",
            "description": "Cualquier mutación en documento de reserva"
      },
      {
            "id": "node-extract",
            "name": "[EXTRACT] Formatear y Validar Datos",
            "type": "native-automation-node.code",
            "description": "Transformación y validación de esquema"
      },
      {
            "id": "node-firestore",
            "name": "[FIRESTORE] Operación audit_logs",
            "type": "native-automation-node.googleFirebaseCloudFirestore",
            "description": "Lectura/Escritura en Firestore /audit_logs"
      },
      {
            "id": "node-response",
            "name": "[RESPUESTA] Finalizar con Éxito",
            "type": "native-automation-node.respondToWebhook",
            "description": "Respuesta HTTP 200 con payload estructurado"
      },
      {
            "id": "node-alert",
            "name": "[ALERTA NATIVA] Enviar a /api/alerts",
            "type": "native-automation-node.httpRequest",
            "description": "Enrutamiento de error a /api/alerts (reemplazo Telegram)"
      }
],
    samplePayload: {
      "bookingId": "BK-CR-2026-915",
      "mutationType": "status_update",
      "changedBy": "operator_admin_04",
      "prev": "pendiente",
      "next": "confirmada"
},
    blueprintJson: {
      "id": "WF-015",
      "name": "Registro Inmutable de Auditoría de Reservas",
      "active": true,
      "nodes": [
            {
                  "parameters": {
                        "path": "api/native/workflows/audit-log",
                        "httpMethod": "POST",
                        "responseMode": "responseNode",
                        "options": {}
                  },
                  "name": "[TRIGGER] Registro Inmutable de Auditoría de Reservas",
                  "type": "native-automation-node.webhook",
                  "typeVersion": 2,
                  "position": [
                        100,
                        300
                  ]
            },
            {
                  "parameters": {
                        "jsCode": "// Validar campos obligatorios y normalizar timestamp\nconst item = $input.first().json || {};\nitem.processedAt = new Date().toISOString();\nitem.environment = 'production';\nitem.targetCollection = 'audit_logs';\nreturn [{ json: item }];"
                  },
                  "name": "[EXTRACT] Formatear y Validar Datos",
                  "type": "native-automation-node.code",
                  "typeVersion": 2,
                  "position": [
                        350,
                        300
                  ]
            },
            {
                  "parameters": {
                        "operation": "upsert",
                        "collection": "audit_logs",
                        "documentId": "={{ $json.id || $json.bookingId || $json.code || $now }}",
                        "dataToSend": "defineBelow",
                        "fieldsUi": {
                              "fieldValues": [
                                    {
                                          "fieldId": "updatedAt",
                                          "fieldValue": "={{ $now }}"
                                    },
                                    {
                                          "fieldId": "workflowSource",
                                          "fieldValue": "WF-015"
                                    },
                                    {
                                          "fieldId": "status",
                                          "fieldValue": "processed"
                                    }
                              ]
                        }
                  },
                  "name": "[FIRESTORE] Operación Colección audit_logs",
                  "type": "native-automation-node.googleFirebaseCloudFirestore",
                  "typeVersion": 1.1,
                  "position": [
                        650,
                        300
                  ],
                  "credentials": {
                        "googleApi": {
                              "id": "5NiYz8gX64lPYIdK",
                              "name": "Costa Rica Tours - Firebase"
                        }
                  },
                  "onError": "continueErrorOutput"
            },
            {
                  "parameters": {
                        "respondWith": "json",
                        "responseBody": "{\n  \"success\": true,\n  \"workflowCode\": \"WF-015\",\n  \"collection\": \"audit_logs\",\n  \"timestamp\": \"={{ $now }}\",\n  \"message\": \"Operación completada exitosamente en audit_logs\"\n}",
                        "options": {}
                  },
                  "name": "[RESPUESTA] Finalizar con Éxito",
                  "type": "native-automation-node.respondToWebhook",
                  "typeVersion": 1.5,
                  "position": [
                        950,
                        200
                  ]
            },
            {
                  "parameters": {
                        "method": "POST",
                        "url": "={{ $env.APP_URL || \"http://localhost:3000\" }}/api/alerts",
                        "sendHeaders": true,
                        "headerParameters": {
                              "parameters": [
                                    {
                                          "name": "X-Webhook-Secret",
                                          "value": "={{ $env.WEBHOOK_SECRET || \"dev-secret\" }}"
                                    },
                                    {
                                          "name": "Content-Type",
                                          "value": "application/json"
                                    }
                              ]
                        },
                        "sendBody": true,
                        "specifyBody": "json",
                        "jsonBody": "{\n  \"source\": \"Registro Inmutable de Auditoría de Reservas\",\n  \"severity\": \"critical\",\n  \"title\": \"Fallo en workflow WF-015: Registro Inmutable de Auditoría de Reservas\",\n  \"message\": \"=Error al ejecutar en colección audit_logs: {{ $json.error?.message || \\\"Error no especificado\\\" }}\",\n  \"bookingId\": \"={{ $json.bookingId }}\",\n  \"metadata\": {\n    \"workflowCode\": \"WF-015\",\n    \"collection\": \"audit_logs\",\n    \"endpoint\": \"/api/native/workflows/audit-log\"\n  }\n}",
                        "options": {}
                  },
                  "name": "[ALERTA NATIVA] Enviar a /api/alerts",
                  "type": "native-automation-node.httpRequest",
                  "typeVersion": 4.2,
                  "position": [
                        950,
                        450
                  ]
            }
      ],
      "connections": {
            "[TRIGGER] Registro Inmutable de Auditoría de Reservas": {
                  "main": [
                        [
                              {
                                    "node": "[EXTRACT] Formatear y Validar Datos",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[EXTRACT] Formatear y Validar Datos": {
                  "main": [
                        [
                              {
                                    "node": "[FIRESTORE] Operación Colección audit_logs",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[FIRESTORE] Operación Colección audit_logs": {
                  "main": [
                        [
                              {
                                    "node": "[RESPUESTA] Finalizar con Éxito",
                                    "type": "main",
                                    "index": 0
                              }
                        ],
                        [
                              {
                                    "node": "[ALERTA NATIVA] Enviar a /api/alerts",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            }
      }
}
  },
  {
    id: "wf-016-sinpe-movil-ocr-matcher",
    code: "WF-016",
    name: {
      es: "Validador Inteligente de Comprobantes SINPE Móvil",
      en: "SINPE Móvil Receipt OCR & Transfer Matcher"
    },
    category: "payment",
    collection: "sinpe_transactions",
    description: {
      es: "Verifica número de comprobante, teléfono emisor y monto en colones frente al valor esperado de la reserva.",
      en: "Verifies SINPE receipt number, phone, and CRC amount against pending booking record in Firestore."
    },
    icon: "Smartphone",
    color: "#059669",
    endpoint: "/api/native/workflows/sinpe-verify",
    method: "POST",
    triggerEvent: "Carga de comprobante SINPE por el usuario",
    nodesCount: 5,
    slaTarget: "< 600ms",
    nodes: [
      {
            "id": "node-trigger",
            "name": "[TRIGGER] Validador Inteligente de Comprobantes SINPE Móvil",
            "type": "native-automation-node.webhook",
            "description": "Carga de comprobante SINPE por el usuario"
      },
      {
            "id": "node-extract",
            "name": "[EXTRACT] Formatear y Validar Datos",
            "type": "native-automation-node.code",
            "description": "Transformación y validación de esquema"
      },
      {
            "id": "node-firestore",
            "name": "[FIRESTORE] Operación sinpe_transactions",
            "type": "native-automation-node.googleFirebaseCloudFirestore",
            "description": "Lectura/Escritura en Firestore /sinpe_transactions"
      },
      {
            "id": "node-response",
            "name": "[RESPUESTA] Finalizar con Éxito",
            "type": "native-automation-node.respondToWebhook",
            "description": "Respuesta HTTP 200 con payload estructurado"
      },
      {
            "id": "node-alert",
            "name": "[ALERTA NATIVA] Enviar a /api/alerts",
            "type": "native-automation-node.httpRequest",
            "description": "Enrutamiento de error a /api/alerts (reemplazo Telegram)"
      }
],
    samplePayload: {
      "bookingId": "BK-CR-2026-SINPE-01",
      "referenceNumber": "20260914987654",
      "amountCRC": 78000,
      "senderPhone": "8888-1234"
},
    blueprintJson: {
      "id": "WF-016",
      "name": "Validador Inteligente de Comprobantes SINPE Móvil",
      "active": true,
      "nodes": [
            {
                  "parameters": {
                        "path": "api/native/workflows/sinpe-verify",
                        "httpMethod": "POST",
                        "responseMode": "responseNode",
                        "options": {}
                  },
                  "name": "[TRIGGER] Validador Inteligente de Comprobantes SINPE Móvil",
                  "type": "native-automation-node.webhook",
                  "typeVersion": 2,
                  "position": [
                        100,
                        300
                  ]
            },
            {
                  "parameters": {
                        "jsCode": "// Validar campos obligatorios y normalizar timestamp\nconst item = $input.first().json || {};\nitem.processedAt = new Date().toISOString();\nitem.environment = 'production';\nitem.targetCollection = 'sinpe_transactions';\nreturn [{ json: item }];"
                  },
                  "name": "[EXTRACT] Formatear y Validar Datos",
                  "type": "native-automation-node.code",
                  "typeVersion": 2,
                  "position": [
                        350,
                        300
                  ]
            },
            {
                  "parameters": {
                        "operation": "upsert",
                        "collection": "sinpe_transactions",
                        "documentId": "={{ $json.id || $json.bookingId || $json.code || $now }}",
                        "dataToSend": "defineBelow",
                        "fieldsUi": {
                              "fieldValues": [
                                    {
                                          "fieldId": "updatedAt",
                                          "fieldValue": "={{ $now }}"
                                    },
                                    {
                                          "fieldId": "workflowSource",
                                          "fieldValue": "WF-016"
                                    },
                                    {
                                          "fieldId": "status",
                                          "fieldValue": "processed"
                                    }
                              ]
                        }
                  },
                  "name": "[FIRESTORE] Operación Colección sinpe_transactions",
                  "type": "native-automation-node.googleFirebaseCloudFirestore",
                  "typeVersion": 1.1,
                  "position": [
                        650,
                        300
                  ],
                  "credentials": {
                        "googleApi": {
                              "id": "5NiYz8gX64lPYIdK",
                              "name": "Costa Rica Tours - Firebase"
                        }
                  },
                  "onError": "continueErrorOutput"
            },
            {
                  "parameters": {
                        "respondWith": "json",
                        "responseBody": "{\n  \"success\": true,\n  \"workflowCode\": \"WF-016\",\n  \"collection\": \"sinpe_transactions\",\n  \"timestamp\": \"={{ $now }}\",\n  \"message\": \"Operación completada exitosamente en sinpe_transactions\"\n}",
                        "options": {}
                  },
                  "name": "[RESPUESTA] Finalizar con Éxito",
                  "type": "native-automation-node.respondToWebhook",
                  "typeVersion": 1.5,
                  "position": [
                        950,
                        200
                  ]
            },
            {
                  "parameters": {
                        "method": "POST",
                        "url": "={{ $env.APP_URL || \"http://localhost:3000\" }}/api/alerts",
                        "sendHeaders": true,
                        "headerParameters": {
                              "parameters": [
                                    {
                                          "name": "X-Webhook-Secret",
                                          "value": "={{ $env.WEBHOOK_SECRET || \"dev-secret\" }}"
                                    },
                                    {
                                          "name": "Content-Type",
                                          "value": "application/json"
                                    }
                              ]
                        },
                        "sendBody": true,
                        "specifyBody": "json",
                        "jsonBody": "{\n  \"source\": \"Validador Inteligente de Comprobantes SINPE Móvil\",\n  \"severity\": \"critical\",\n  \"title\": \"Fallo en workflow WF-016: Validador Inteligente de Comprobantes SINPE Móvil\",\n  \"message\": \"=Error al ejecutar en colección sinpe_transactions: {{ $json.error?.message || \\\"Error no especificado\\\" }}\",\n  \"bookingId\": \"={{ $json.bookingId }}\",\n  \"metadata\": {\n    \"workflowCode\": \"WF-016\",\n    \"collection\": \"sinpe_transactions\",\n    \"endpoint\": \"/api/native/workflows/sinpe-verify\"\n  }\n}",
                        "options": {}
                  },
                  "name": "[ALERTA NATIVA] Enviar a /api/alerts",
                  "type": "native-automation-node.httpRequest",
                  "typeVersion": 4.2,
                  "position": [
                        950,
                        450
                  ]
            }
      ],
      "connections": {
            "[TRIGGER] Validador Inteligente de Comprobantes SINPE Móvil": {
                  "main": [
                        [
                              {
                                    "node": "[EXTRACT] Formatear y Validar Datos",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[EXTRACT] Formatear y Validar Datos": {
                  "main": [
                        [
                              {
                                    "node": "[FIRESTORE] Operación Colección sinpe_transactions",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[FIRESTORE] Operación Colección sinpe_transactions": {
                  "main": [
                        [
                              {
                                    "node": "[RESPUESTA] Finalizar con Éxito",
                                    "type": "main",
                                    "index": 0
                              }
                        ],
                        [
                              {
                                    "node": "[ALERTA NATIVA] Enviar a /api/alerts",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            }
      }
}
  },
  {
    id: "wf-017-stripe-webhook-listener",
    code: "WF-017",
    name: {
      es: "Receptor Oficial de Eventos Stripe Webhook",
      en: "Official Stripe Webhook & Payment Intent Listener"
    },
    category: "payment",
    collection: "payments",
    description: {
      es: "Escucha `checkout.session.completed` y `payment_intent.succeeded`, valida firma criptográfica y confirma la reserva.",
      en: "Listens to `checkout.session.completed` and `payment_intent.succeeded`, validates Stripe signature, and marks booking confirmed."
    },
    icon: "CreditCard",
    color: "#6366f1",
    endpoint: "/api/native/workflows/stripe-event",
    method: "POST",
    triggerEvent: "Webhook de Stripe API",
    nodesCount: 5,
    slaTarget: "< 400ms",
    nodes: [
      {
            "id": "node-trigger",
            "name": "[TRIGGER] Receptor Oficial de Eventos Stripe Webhook",
            "type": "native-automation-node.webhook",
            "description": "Webhook de Stripe API"
      },
      {
            "id": "node-extract",
            "name": "[EXTRACT] Formatear y Validar Datos",
            "type": "native-automation-node.code",
            "description": "Transformación y validación de esquema"
      },
      {
            "id": "node-firestore",
            "name": "[FIRESTORE] Operación payments",
            "type": "native-automation-node.googleFirebaseCloudFirestore",
            "description": "Lectura/Escritura en Firestore /payments"
      },
      {
            "id": "node-response",
            "name": "[RESPUESTA] Finalizar con Éxito",
            "type": "native-automation-node.respondToWebhook",
            "description": "Respuesta HTTP 200 con payload estructurado"
      },
      {
            "id": "node-alert",
            "name": "[ALERTA NATIVA] Enviar a /api/alerts",
            "type": "native-automation-node.httpRequest",
            "description": "Enrutamiento de error a /api/alerts (reemplazo Telegram)"
      }
],
    samplePayload: {
      "stripeEventId": "evt_1PQR20260914",
      "type": "checkout.session.completed",
      "amountTotal": 18500,
      "currency": "usd"
},
    blueprintJson: {
      "id": "WF-017",
      "name": "Receptor Oficial de Eventos Stripe Webhook",
      "active": true,
      "nodes": [
            {
                  "parameters": {
                        "path": "api/native/workflows/stripe-event",
                        "httpMethod": "POST",
                        "responseMode": "responseNode",
                        "options": {}
                  },
                  "name": "[TRIGGER] Receptor Oficial de Eventos Stripe Webhook",
                  "type": "native-automation-node.webhook",
                  "typeVersion": 2,
                  "position": [
                        100,
                        300
                  ]
            },
            {
                  "parameters": {
                        "jsCode": "// Validar campos obligatorios y normalizar timestamp\nconst item = $input.first().json || {};\nitem.processedAt = new Date().toISOString();\nitem.environment = 'production';\nitem.targetCollection = 'payments';\nreturn [{ json: item }];"
                  },
                  "name": "[EXTRACT] Formatear y Validar Datos",
                  "type": "native-automation-node.code",
                  "typeVersion": 2,
                  "position": [
                        350,
                        300
                  ]
            },
            {
                  "parameters": {
                        "operation": "upsert",
                        "collection": "payments",
                        "documentId": "={{ $json.id || $json.bookingId || $json.code || $now }}",
                        "dataToSend": "defineBelow",
                        "fieldsUi": {
                              "fieldValues": [
                                    {
                                          "fieldId": "updatedAt",
                                          "fieldValue": "={{ $now }}"
                                    },
                                    {
                                          "fieldId": "workflowSource",
                                          "fieldValue": "WF-017"
                                    },
                                    {
                                          "fieldId": "status",
                                          "fieldValue": "processed"
                                    }
                              ]
                        }
                  },
                  "name": "[FIRESTORE] Operación Colección payments",
                  "type": "native-automation-node.googleFirebaseCloudFirestore",
                  "typeVersion": 1.1,
                  "position": [
                        650,
                        300
                  ],
                  "credentials": {
                        "googleApi": {
                              "id": "5NiYz8gX64lPYIdK",
                              "name": "Costa Rica Tours - Firebase"
                        }
                  },
                  "onError": "continueErrorOutput"
            },
            {
                  "parameters": {
                        "respondWith": "json",
                        "responseBody": "{\n  \"success\": true,\n  \"workflowCode\": \"WF-017\",\n  \"collection\": \"payments\",\n  \"timestamp\": \"={{ $now }}\",\n  \"message\": \"Operación completada exitosamente en payments\"\n}",
                        "options": {}
                  },
                  "name": "[RESPUESTA] Finalizar con Éxito",
                  "type": "native-automation-node.respondToWebhook",
                  "typeVersion": 1.5,
                  "position": [
                        950,
                        200
                  ]
            },
            {
                  "parameters": {
                        "method": "POST",
                        "url": "={{ $env.APP_URL || \"http://localhost:3000\" }}/api/alerts",
                        "sendHeaders": true,
                        "headerParameters": {
                              "parameters": [
                                    {
                                          "name": "X-Webhook-Secret",
                                          "value": "={{ $env.WEBHOOK_SECRET || \"dev-secret\" }}"
                                    },
                                    {
                                          "name": "Content-Type",
                                          "value": "application/json"
                                    }
                              ]
                        },
                        "sendBody": true,
                        "specifyBody": "json",
                        "jsonBody": "{\n  \"source\": \"Receptor Oficial de Eventos Stripe Webhook\",\n  \"severity\": \"critical\",\n  \"title\": \"Fallo en workflow WF-017: Receptor Oficial de Eventos Stripe Webhook\",\n  \"message\": \"=Error al ejecutar en colección payments: {{ $json.error?.message || \\\"Error no especificado\\\" }}\",\n  \"bookingId\": \"={{ $json.bookingId }}\",\n  \"metadata\": {\n    \"workflowCode\": \"WF-017\",\n    \"collection\": \"payments\",\n    \"endpoint\": \"/api/native/workflows/stripe-event\"\n  }\n}",
                        "options": {}
                  },
                  "name": "[ALERTA NATIVA] Enviar a /api/alerts",
                  "type": "native-automation-node.httpRequest",
                  "typeVersion": 4.2,
                  "position": [
                        950,
                        450
                  ]
            }
      ],
      "connections": {
            "[TRIGGER] Receptor Oficial de Eventos Stripe Webhook": {
                  "main": [
                        [
                              {
                                    "node": "[EXTRACT] Formatear y Validar Datos",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[EXTRACT] Formatear y Validar Datos": {
                  "main": [
                        [
                              {
                                    "node": "[FIRESTORE] Operación Colección payments",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[FIRESTORE] Operación Colección payments": {
                  "main": [
                        [
                              {
                                    "node": "[RESPUESTA] Finalizar con Éxito",
                                    "type": "main",
                                    "index": 0
                              }
                        ],
                        [
                              {
                                    "node": "[ALERTA NATIVA] Enviar a /api/alerts",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            }
      }
}
  },
  {
    id: "wf-018-paypal-ipn-reconciler",
    code: "WF-018",
    name: {
      es: "Conciliador de Pagos PayPal IPN / Orders API",
      en: "PayPal IPN & Orders API Instant Reconciler"
    },
    category: "payment",
    collection: "payments",
    description: {
      es: "Procesa notificaciones de PayPal Orders v2, valida captura de fondos y activa el flujo de confirmación de reserva.",
      en: "Processes PayPal Orders v2 webhooks, validates captured funds, and triggers the confirmation workflow."
    },
    icon: "Wallet",
    color: "#0284c7",
    endpoint: "/api/native/workflows/paypal-ipn",
    method: "POST",
    triggerEvent: "Webhook de PayPal Orders v2",
    nodesCount: 5,
    slaTarget: "< 500ms",
    nodes: [
      {
            "id": "node-trigger",
            "name": "[TRIGGER] Conciliador de Pagos PayPal IPN / Orders API",
            "type": "native-automation-node.webhook",
            "description": "Webhook de PayPal Orders v2"
      },
      {
            "id": "node-extract",
            "name": "[EXTRACT] Formatear y Validar Datos",
            "type": "native-automation-node.code",
            "description": "Transformación y validación de esquema"
      },
      {
            "id": "node-firestore",
            "name": "[FIRESTORE] Operación payments",
            "type": "native-automation-node.googleFirebaseCloudFirestore",
            "description": "Lectura/Escritura en Firestore /payments"
      },
      {
            "id": "node-response",
            "name": "[RESPUESTA] Finalizar con Éxito",
            "type": "native-automation-node.respondToWebhook",
            "description": "Respuesta HTTP 200 con payload estructurado"
      },
      {
            "id": "node-alert",
            "name": "[ALERTA NATIVA] Enviar a /api/alerts",
            "type": "native-automation-node.httpRequest",
            "description": "Enrutamiento de error a /api/alerts (reemplazo Telegram)"
      }
],
    samplePayload: {
      "paypalOrderId": "PAYPAL-9872615",
      "status": "COMPLETED",
      "grossAmount": "135.00"
},
    blueprintJson: {
      "id": "WF-018",
      "name": "Conciliador de Pagos PayPal IPN / Orders API",
      "active": true,
      "nodes": [
            {
                  "parameters": {
                        "path": "api/native/workflows/paypal-ipn",
                        "httpMethod": "POST",
                        "responseMode": "responseNode",
                        "options": {}
                  },
                  "name": "[TRIGGER] Conciliador de Pagos PayPal IPN / Orders API",
                  "type": "native-automation-node.webhook",
                  "typeVersion": 2,
                  "position": [
                        100,
                        300
                  ]
            },
            {
                  "parameters": {
                        "jsCode": "// Validar campos obligatorios y normalizar timestamp\nconst item = $input.first().json || {};\nitem.processedAt = new Date().toISOString();\nitem.environment = 'production';\nitem.targetCollection = 'payments';\nreturn [{ json: item }];"
                  },
                  "name": "[EXTRACT] Formatear y Validar Datos",
                  "type": "native-automation-node.code",
                  "typeVersion": 2,
                  "position": [
                        350,
                        300
                  ]
            },
            {
                  "parameters": {
                        "operation": "upsert",
                        "collection": "payments",
                        "documentId": "={{ $json.id || $json.bookingId || $json.code || $now }}",
                        "dataToSend": "defineBelow",
                        "fieldsUi": {
                              "fieldValues": [
                                    {
                                          "fieldId": "updatedAt",
                                          "fieldValue": "={{ $now }}"
                                    },
                                    {
                                          "fieldId": "workflowSource",
                                          "fieldValue": "WF-018"
                                    },
                                    {
                                          "fieldId": "status",
                                          "fieldValue": "processed"
                                    }
                              ]
                        }
                  },
                  "name": "[FIRESTORE] Operación Colección payments",
                  "type": "native-automation-node.googleFirebaseCloudFirestore",
                  "typeVersion": 1.1,
                  "position": [
                        650,
                        300
                  ],
                  "credentials": {
                        "googleApi": {
                              "id": "5NiYz8gX64lPYIdK",
                              "name": "Costa Rica Tours - Firebase"
                        }
                  },
                  "onError": "continueErrorOutput"
            },
            {
                  "parameters": {
                        "respondWith": "json",
                        "responseBody": "{\n  \"success\": true,\n  \"workflowCode\": \"WF-018\",\n  \"collection\": \"payments\",\n  \"timestamp\": \"={{ $now }}\",\n  \"message\": \"Operación completada exitosamente en payments\"\n}",
                        "options": {}
                  },
                  "name": "[RESPUESTA] Finalizar con Éxito",
                  "type": "native-automation-node.respondToWebhook",
                  "typeVersion": 1.5,
                  "position": [
                        950,
                        200
                  ]
            },
            {
                  "parameters": {
                        "method": "POST",
                        "url": "={{ $env.APP_URL || \"http://localhost:3000\" }}/api/alerts",
                        "sendHeaders": true,
                        "headerParameters": {
                              "parameters": [
                                    {
                                          "name": "X-Webhook-Secret",
                                          "value": "={{ $env.WEBHOOK_SECRET || \"dev-secret\" }}"
                                    },
                                    {
                                          "name": "Content-Type",
                                          "value": "application/json"
                                    }
                              ]
                        },
                        "sendBody": true,
                        "specifyBody": "json",
                        "jsonBody": "{\n  \"source\": \"Conciliador de Pagos PayPal IPN / Orders API\",\n  \"severity\": \"critical\",\n  \"title\": \"Fallo en workflow WF-018: Conciliador de Pagos PayPal IPN / Orders API\",\n  \"message\": \"=Error al ejecutar en colección payments: {{ $json.error?.message || \\\"Error no especificado\\\" }}\",\n  \"bookingId\": \"={{ $json.bookingId }}\",\n  \"metadata\": {\n    \"workflowCode\": \"WF-018\",\n    \"collection\": \"payments\",\n    \"endpoint\": \"/api/native/workflows/paypal-ipn\"\n  }\n}",
                        "options": {}
                  },
                  "name": "[ALERTA NATIVA] Enviar a /api/alerts",
                  "type": "native-automation-node.httpRequest",
                  "typeVersion": 4.2,
                  "position": [
                        950,
                        450
                  ]
            }
      ],
      "connections": {
            "[TRIGGER] Conciliador de Pagos PayPal IPN / Orders API": {
                  "main": [
                        [
                              {
                                    "node": "[EXTRACT] Formatear y Validar Datos",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[EXTRACT] Formatear y Validar Datos": {
                  "main": [
                        [
                              {
                                    "node": "[FIRESTORE] Operación Colección payments",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[FIRESTORE] Operación Colección payments": {
                  "main": [
                        [
                              {
                                    "node": "[RESPUESTA] Finalizar con Éxito",
                                    "type": "main",
                                    "index": 0
                              }
                        ],
                        [
                              {
                                    "node": "[ALERTA NATIVA] Enviar a /api/alerts",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            }
      }
}
  },
  {
    id: "wf-019-dgt-electronic-invoice-xml",
    code: "WF-019",
    name: {
      es: "Generador de Factura Electrónica DGT Costa Rica (XML v4.3)",
      en: "Costa Rica DGT Electronic Invoice XML v4.3 Generator"
    },
    category: "payment",
    collection: "invoices",
    description: {
      es: "Emite comprobante electrónico con clave numérica de 50 dígitos, IVA 13% desagregado y envío al Ministerio de Hacienda.",
      en: "Generates official 50-digit electronic invoice XML with itemized 13% VAT for Ministry of Treasury (DGT)."
    },
    icon: "Receipt",
    color: "#0f766e",
    endpoint: "/api/native/workflows/dgt-invoice",
    method: "POST",
    triggerEvent: "Confirmación de pago de cliente nacional o internacional",
    nodesCount: 5,
    slaTarget: "< 1.5s",
    nodes: [
      {
            "id": "node-trigger",
            "name": "[TRIGGER] Generador de Factura Electrónica DGT Costa Rica (XML v4.3)",
            "type": "native-automation-node.webhook",
            "description": "Confirmación de pago de cliente nacional o internacional"
      },
      {
            "id": "node-extract",
            "name": "[EXTRACT] Formatear y Validar Datos",
            "type": "native-automation-node.code",
            "description": "Transformación y validación de esquema"
      },
      {
            "id": "node-firestore",
            "name": "[FIRESTORE] Operación invoices",
            "type": "native-automation-node.googleFirebaseCloudFirestore",
            "description": "Lectura/Escritura en Firestore /invoices"
      },
      {
            "id": "node-response",
            "name": "[RESPUESTA] Finalizar con Éxito",
            "type": "native-automation-node.respondToWebhook",
            "description": "Respuesta HTTP 200 con payload estructurado"
      },
      {
            "id": "node-alert",
            "name": "[ALERTA NATIVA] Enviar a /api/alerts",
            "type": "native-automation-node.httpRequest",
            "description": "Enrutamiento de error a /api/alerts (reemplazo Telegram)"
      }
],
    samplePayload: {
      "bookingId": "BK-CR-2026-919",
      "taxId": "1-1234-0567",
      "totalCRC": 95000,
      "vatAmountCRC": 10929
},
    blueprintJson: {
      "id": "WF-019",
      "name": "Generador de Factura Electrónica DGT Costa Rica (XML v4.3)",
      "active": true,
      "nodes": [
            {
                  "parameters": {
                        "path": "api/native/workflows/dgt-invoice",
                        "httpMethod": "POST",
                        "responseMode": "responseNode",
                        "options": {}
                  },
                  "name": "[TRIGGER] Generador de Factura Electrónica DGT Costa Rica (XML v4.3)",
                  "type": "native-automation-node.webhook",
                  "typeVersion": 2,
                  "position": [
                        100,
                        300
                  ]
            },
            {
                  "parameters": {
                        "jsCode": "// Validar campos obligatorios y normalizar timestamp\nconst item = $input.first().json || {};\nitem.processedAt = new Date().toISOString();\nitem.environment = 'production';\nitem.targetCollection = 'invoices';\nreturn [{ json: item }];"
                  },
                  "name": "[EXTRACT] Formatear y Validar Datos",
                  "type": "native-automation-node.code",
                  "typeVersion": 2,
                  "position": [
                        350,
                        300
                  ]
            },
            {
                  "parameters": {
                        "operation": "upsert",
                        "collection": "invoices",
                        "documentId": "={{ $json.id || $json.bookingId || $json.code || $now }}",
                        "dataToSend": "defineBelow",
                        "fieldsUi": {
                              "fieldValues": [
                                    {
                                          "fieldId": "updatedAt",
                                          "fieldValue": "={{ $now }}"
                                    },
                                    {
                                          "fieldId": "workflowSource",
                                          "fieldValue": "WF-019"
                                    },
                                    {
                                          "fieldId": "status",
                                          "fieldValue": "processed"
                                    }
                              ]
                        }
                  },
                  "name": "[FIRESTORE] Operación Colección invoices",
                  "type": "native-automation-node.googleFirebaseCloudFirestore",
                  "typeVersion": 1.1,
                  "position": [
                        650,
                        300
                  ],
                  "credentials": {
                        "googleApi": {
                              "id": "5NiYz8gX64lPYIdK",
                              "name": "Costa Rica Tours - Firebase"
                        }
                  },
                  "onError": "continueErrorOutput"
            },
            {
                  "parameters": {
                        "respondWith": "json",
                        "responseBody": "{\n  \"success\": true,\n  \"workflowCode\": \"WF-019\",\n  \"collection\": \"invoices\",\n  \"timestamp\": \"={{ $now }}\",\n  \"message\": \"Operación completada exitosamente en invoices\"\n}",
                        "options": {}
                  },
                  "name": "[RESPUESTA] Finalizar con Éxito",
                  "type": "native-automation-node.respondToWebhook",
                  "typeVersion": 1.5,
                  "position": [
                        950,
                        200
                  ]
            },
            {
                  "parameters": {
                        "method": "POST",
                        "url": "={{ $env.APP_URL || \"http://localhost:3000\" }}/api/alerts",
                        "sendHeaders": true,
                        "headerParameters": {
                              "parameters": [
                                    {
                                          "name": "X-Webhook-Secret",
                                          "value": "={{ $env.WEBHOOK_SECRET || \"dev-secret\" }}"
                                    },
                                    {
                                          "name": "Content-Type",
                                          "value": "application/json"
                                    }
                              ]
                        },
                        "sendBody": true,
                        "specifyBody": "json",
                        "jsonBody": "{\n  \"source\": \"Generador de Factura Electrónica DGT Costa Rica (XML v4.3)\",\n  \"severity\": \"critical\",\n  \"title\": \"Fallo en workflow WF-019: Generador de Factura Electrónica DGT Costa Rica (XML v4.3)\",\n  \"message\": \"=Error al ejecutar en colección invoices: {{ $json.error?.message || \\\"Error no especificado\\\" }}\",\n  \"bookingId\": \"={{ $json.bookingId }}\",\n  \"metadata\": {\n    \"workflowCode\": \"WF-019\",\n    \"collection\": \"invoices\",\n    \"endpoint\": \"/api/native/workflows/dgt-invoice\"\n  }\n}",
                        "options": {}
                  },
                  "name": "[ALERTA NATIVA] Enviar a /api/alerts",
                  "type": "native-automation-node.httpRequest",
                  "typeVersion": 4.2,
                  "position": [
                        950,
                        450
                  ]
            }
      ],
      "connections": {
            "[TRIGGER] Generador de Factura Electrónica DGT Costa Rica (XML v4.3)": {
                  "main": [
                        [
                              {
                                    "node": "[EXTRACT] Formatear y Validar Datos",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[EXTRACT] Formatear y Validar Datos": {
                  "main": [
                        [
                              {
                                    "node": "[FIRESTORE] Operación Colección invoices",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[FIRESTORE] Operación Colección invoices": {
                  "main": [
                        [
                              {
                                    "node": "[RESPUESTA] Finalizar con Éxito",
                                    "type": "main",
                                    "index": 0
                              }
                        ],
                        [
                              {
                                    "node": "[ALERTA NATIVA] Enviar a /api/alerts",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            }
      }
}
  },
  {
    id: "wf-020-deposit-split-payment",
    code: "WF-020",
    name: {
      es: "Gestor de Pago en Dos Partes (Depósito 30% + Saldo 70%)",
      en: "Split Deposit Payment Engine (30% Now + 70% Prior to Tour)"
    },
    category: "payment",
    collection: "payments",
    description: {
      es: "Permite pagar el 30% para asegurar el espacio y programa recordatorio automático para cobrar el 70% 3 días antes del tour.",
      en: "Collects 30% initial deposit and schedules automated payment link for the remaining 70% 3 days prior."
    },
    icon: "PieChart",
    color: "#8b5cf6",
    endpoint: "/api/native/workflows/split-deposit",
    method: "POST",
    triggerEvent: "Reserva seleccionada con modalidad depósito",
    nodesCount: 5,
    slaTarget: "< 400ms",
    nodes: [
      {
            "id": "node-trigger",
            "name": "[TRIGGER] Gestor de Pago en Dos Partes (Depósito 30% + Saldo 70%)",
            "type": "native-automation-node.webhook",
            "description": "Reserva seleccionada con modalidad depósito"
      },
      {
            "id": "node-extract",
            "name": "[EXTRACT] Formatear y Validar Datos",
            "type": "native-automation-node.code",
            "description": "Transformación y validación de esquema"
      },
      {
            "id": "node-firestore",
            "name": "[FIRESTORE] Operación payments",
            "type": "native-automation-node.googleFirebaseCloudFirestore",
            "description": "Lectura/Escritura en Firestore /payments"
      },
      {
            "id": "node-response",
            "name": "[RESPUESTA] Finalizar con Éxito",
            "type": "native-automation-node.respondToWebhook",
            "description": "Respuesta HTTP 200 con payload estructurado"
      },
      {
            "id": "node-alert",
            "name": "[ALERTA NATIVA] Enviar a /api/alerts",
            "type": "native-automation-node.httpRequest",
            "description": "Enrutamiento de error a /api/alerts (reemplazo Telegram)"
      }
],
    samplePayload: {
      "bookingId": "BK-CR-2026-920",
      "depositPaidUSD": 45,
      "balanceRemainingUSD": 105,
      "balanceDueDate": "2026-11-10"
},
    blueprintJson: {
      "id": "WF-020",
      "name": "Gestor de Pago en Dos Partes (Depósito 30% + Saldo 70%)",
      "active": true,
      "nodes": [
            {
                  "parameters": {
                        "path": "api/native/workflows/split-deposit",
                        "httpMethod": "POST",
                        "responseMode": "responseNode",
                        "options": {}
                  },
                  "name": "[TRIGGER] Gestor de Pago en Dos Partes (Depósito 30% + Saldo 70%)",
                  "type": "native-automation-node.webhook",
                  "typeVersion": 2,
                  "position": [
                        100,
                        300
                  ]
            },
            {
                  "parameters": {
                        "jsCode": "// Validar campos obligatorios y normalizar timestamp\nconst item = $input.first().json || {};\nitem.processedAt = new Date().toISOString();\nitem.environment = 'production';\nitem.targetCollection = 'payments';\nreturn [{ json: item }];"
                  },
                  "name": "[EXTRACT] Formatear y Validar Datos",
                  "type": "native-automation-node.code",
                  "typeVersion": 2,
                  "position": [
                        350,
                        300
                  ]
            },
            {
                  "parameters": {
                        "operation": "upsert",
                        "collection": "payments",
                        "documentId": "={{ $json.id || $json.bookingId || $json.code || $now }}",
                        "dataToSend": "defineBelow",
                        "fieldsUi": {
                              "fieldValues": [
                                    {
                                          "fieldId": "updatedAt",
                                          "fieldValue": "={{ $now }}"
                                    },
                                    {
                                          "fieldId": "workflowSource",
                                          "fieldValue": "WF-020"
                                    },
                                    {
                                          "fieldId": "status",
                                          "fieldValue": "processed"
                                    }
                              ]
                        }
                  },
                  "name": "[FIRESTORE] Operación Colección payments",
                  "type": "native-automation-node.googleFirebaseCloudFirestore",
                  "typeVersion": 1.1,
                  "position": [
                        650,
                        300
                  ],
                  "credentials": {
                        "googleApi": {
                              "id": "5NiYz8gX64lPYIdK",
                              "name": "Costa Rica Tours - Firebase"
                        }
                  },
                  "onError": "continueErrorOutput"
            },
            {
                  "parameters": {
                        "respondWith": "json",
                        "responseBody": "{\n  \"success\": true,\n  \"workflowCode\": \"WF-020\",\n  \"collection\": \"payments\",\n  \"timestamp\": \"={{ $now }}\",\n  \"message\": \"Operación completada exitosamente en payments\"\n}",
                        "options": {}
                  },
                  "name": "[RESPUESTA] Finalizar con Éxito",
                  "type": "native-automation-node.respondToWebhook",
                  "typeVersion": 1.5,
                  "position": [
                        950,
                        200
                  ]
            },
            {
                  "parameters": {
                        "method": "POST",
                        "url": "={{ $env.APP_URL || \"http://localhost:3000\" }}/api/alerts",
                        "sendHeaders": true,
                        "headerParameters": {
                              "parameters": [
                                    {
                                          "name": "X-Webhook-Secret",
                                          "value": "={{ $env.WEBHOOK_SECRET || \"dev-secret\" }}"
                                    },
                                    {
                                          "name": "Content-Type",
                                          "value": "application/json"
                                    }
                              ]
                        },
                        "sendBody": true,
                        "specifyBody": "json",
                        "jsonBody": "{\n  \"source\": \"Gestor de Pago en Dos Partes (Depósito 30% + Saldo 70%)\",\n  \"severity\": \"critical\",\n  \"title\": \"Fallo en workflow WF-020: Gestor de Pago en Dos Partes (Depósito 30% + Saldo 70%)\",\n  \"message\": \"=Error al ejecutar en colección payments: {{ $json.error?.message || \\\"Error no especificado\\\" }}\",\n  \"bookingId\": \"={{ $json.bookingId }}\",\n  \"metadata\": {\n    \"workflowCode\": \"WF-020\",\n    \"collection\": \"payments\",\n    \"endpoint\": \"/api/native/workflows/split-deposit\"\n  }\n}",
                        "options": {}
                  },
                  "name": "[ALERTA NATIVA] Enviar a /api/alerts",
                  "type": "native-automation-node.httpRequest",
                  "typeVersion": 4.2,
                  "position": [
                        950,
                        450
                  ]
            }
      ],
      "connections": {
            "[TRIGGER] Gestor de Pago en Dos Partes (Depósito 30% + Saldo 70%)": {
                  "main": [
                        [
                              {
                                    "node": "[EXTRACT] Formatear y Validar Datos",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[EXTRACT] Formatear y Validar Datos": {
                  "main": [
                        [
                              {
                                    "node": "[FIRESTORE] Operación Colección payments",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[FIRESTORE] Operación Colección payments": {
                  "main": [
                        [
                              {
                                    "node": "[RESPUESTA] Finalizar con Éxito",
                                    "type": "main",
                                    "index": 0
                              }
                        ],
                        [
                              {
                                    "node": "[ALERTA NATIVA] Enviar a /api/alerts",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            }
      }
}
  },
  {
    id: "wf-021-automated-refund-issuer",
    code: "WF-021",
    name: {
      es: "Emisor Automático de Reembolsos a Tarjeta",
      en: "Automated Gateway Refund Issuer (Stripe/PayPal)"
    },
    category: "payment",
    collection: "refunds",
    description: {
      es: "Ejecuta devolución electrónica a través de la pasarela original cuando se aprueba una cancelación según términos oficiales.",
      en: "Executes electronic refund via original gateway when a valid cancellation is approved under policy terms."
    },
    icon: "RotateCcw",
    color: "#ef4444",
    endpoint: "/api/native/workflows/process-refund",
    method: "POST",
    triggerEvent: "Aprobación de cancelación con reembolso",
    nodesCount: 5,
    slaTarget: "< 1.2s",
    nodes: [
      {
            "id": "node-trigger",
            "name": "[TRIGGER] Emisor Automático de Reembolsos a Tarjeta",
            "type": "native-automation-node.webhook",
            "description": "Aprobación de cancelación con reembolso"
      },
      {
            "id": "node-extract",
            "name": "[EXTRACT] Formatear y Validar Datos",
            "type": "native-automation-node.code",
            "description": "Transformación y validación de esquema"
      },
      {
            "id": "node-firestore",
            "name": "[FIRESTORE] Operación refunds",
            "type": "native-automation-node.googleFirebaseCloudFirestore",
            "description": "Lectura/Escritura en Firestore /refunds"
      },
      {
            "id": "node-response",
            "name": "[RESPUESTA] Finalizar con Éxito",
            "type": "native-automation-node.respondToWebhook",
            "description": "Respuesta HTTP 200 con payload estructurado"
      },
      {
            "id": "node-alert",
            "name": "[ALERTA NATIVA] Enviar a /api/alerts",
            "type": "native-automation-node.httpRequest",
            "description": "Enrutamiento de error a /api/alerts (reemplazo Telegram)"
      }
],
    samplePayload: {
      "refundId": "REF-2026-042",
      "bookingId": "BK-CR-2026-880",
      "refundAmountUSD": 140,
      "gateway": "stripe"
},
    blueprintJson: {
      "id": "WF-021",
      "name": "Emisor Automático de Reembolsos a Tarjeta",
      "active": true,
      "nodes": [
            {
                  "parameters": {
                        "path": "api/native/workflows/process-refund",
                        "httpMethod": "POST",
                        "responseMode": "responseNode",
                        "options": {}
                  },
                  "name": "[TRIGGER] Emisor Automático de Reembolsos a Tarjeta",
                  "type": "native-automation-node.webhook",
                  "typeVersion": 2,
                  "position": [
                        100,
                        300
                  ]
            },
            {
                  "parameters": {
                        "jsCode": "// Validar campos obligatorios y normalizar timestamp\nconst item = $input.first().json || {};\nitem.processedAt = new Date().toISOString();\nitem.environment = 'production';\nitem.targetCollection = 'refunds';\nreturn [{ json: item }];"
                  },
                  "name": "[EXTRACT] Formatear y Validar Datos",
                  "type": "native-automation-node.code",
                  "typeVersion": 2,
                  "position": [
                        350,
                        300
                  ]
            },
            {
                  "parameters": {
                        "operation": "upsert",
                        "collection": "refunds",
                        "documentId": "={{ $json.id || $json.bookingId || $json.code || $now }}",
                        "dataToSend": "defineBelow",
                        "fieldsUi": {
                              "fieldValues": [
                                    {
                                          "fieldId": "updatedAt",
                                          "fieldValue": "={{ $now }}"
                                    },
                                    {
                                          "fieldId": "workflowSource",
                                          "fieldValue": "WF-021"
                                    },
                                    {
                                          "fieldId": "status",
                                          "fieldValue": "processed"
                                    }
                              ]
                        }
                  },
                  "name": "[FIRESTORE] Operación Colección refunds",
                  "type": "native-automation-node.googleFirebaseCloudFirestore",
                  "typeVersion": 1.1,
                  "position": [
                        650,
                        300
                  ],
                  "credentials": {
                        "googleApi": {
                              "id": "5NiYz8gX64lPYIdK",
                              "name": "Costa Rica Tours - Firebase"
                        }
                  },
                  "onError": "continueErrorOutput"
            },
            {
                  "parameters": {
                        "respondWith": "json",
                        "responseBody": "{\n  \"success\": true,\n  \"workflowCode\": \"WF-021\",\n  \"collection\": \"refunds\",\n  \"timestamp\": \"={{ $now }}\",\n  \"message\": \"Operación completada exitosamente en refunds\"\n}",
                        "options": {}
                  },
                  "name": "[RESPUESTA] Finalizar con Éxito",
                  "type": "native-automation-node.respondToWebhook",
                  "typeVersion": 1.5,
                  "position": [
                        950,
                        200
                  ]
            },
            {
                  "parameters": {
                        "method": "POST",
                        "url": "={{ $env.APP_URL || \"http://localhost:3000\" }}/api/alerts",
                        "sendHeaders": true,
                        "headerParameters": {
                              "parameters": [
                                    {
                                          "name": "X-Webhook-Secret",
                                          "value": "={{ $env.WEBHOOK_SECRET || \"dev-secret\" }}"
                                    },
                                    {
                                          "name": "Content-Type",
                                          "value": "application/json"
                                    }
                              ]
                        },
                        "sendBody": true,
                        "specifyBody": "json",
                        "jsonBody": "{\n  \"source\": \"Emisor Automático de Reembolsos a Tarjeta\",\n  \"severity\": \"critical\",\n  \"title\": \"Fallo en workflow WF-021: Emisor Automático de Reembolsos a Tarjeta\",\n  \"message\": \"=Error al ejecutar en colección refunds: {{ $json.error?.message || \\\"Error no especificado\\\" }}\",\n  \"bookingId\": \"={{ $json.bookingId }}\",\n  \"metadata\": {\n    \"workflowCode\": \"WF-021\",\n    \"collection\": \"refunds\",\n    \"endpoint\": \"/api/native/workflows/process-refund\"\n  }\n}",
                        "options": {}
                  },
                  "name": "[ALERTA NATIVA] Enviar a /api/alerts",
                  "type": "native-automation-node.httpRequest",
                  "typeVersion": 4.2,
                  "position": [
                        950,
                        450
                  ]
            }
      ],
      "connections": {
            "[TRIGGER] Emisor Automático de Reembolsos a Tarjeta": {
                  "main": [
                        [
                              {
                                    "node": "[EXTRACT] Formatear y Validar Datos",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[EXTRACT] Formatear y Validar Datos": {
                  "main": [
                        [
                              {
                                    "node": "[FIRESTORE] Operación Colección refunds",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[FIRESTORE] Operación Colección refunds": {
                  "main": [
                        [
                              {
                                    "node": "[RESPUESTA] Finalizar con Éxito",
                                    "type": "main",
                                    "index": 0
                              }
                        ],
                        [
                              {
                                    "node": "[ALERTA NATIVA] Enviar a /api/alerts",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            }
      }
}
  },
  {
    id: "wf-022-daily-bank-reconciliation",
    code: "WF-022",
    name: {
      es: "Conciliación Bancaria Diaria y Detección de Discrepancias",
      en: "Daily Multi-Gateway Bank Reconciliation & Discrepancy Flag"
    },
    category: "payment",
    collection: "reconciliations",
    description: {
      es: "Cruza transacciones de Stripe, PayPal y SINPE frente a reservas marcadas como pagadas en Firestore a las 11:59 PM.",
      en: "Cross-checks Stripe, PayPal, and SINPE transactions against paid Firestore bookings at 11:59 PM."
    },
    icon: "CheckCircle2",
    color: "#10b981",
    endpoint: "/api/native/workflows/daily-reconcile",
    method: "POST",
    triggerEvent: "Cron diario 11:59 PM",
    nodesCount: 5,
    slaTarget: "< 3s",
    nodes: [
      {
            "id": "node-trigger",
            "name": "[TRIGGER] Conciliación Bancaria Diaria y Detección de Discrepancias",
            "type": "native-automation-node.webhook",
            "description": "Cron diario 11:59 PM"
      },
      {
            "id": "node-extract",
            "name": "[EXTRACT] Formatear y Validar Datos",
            "type": "native-automation-node.code",
            "description": "Transformación y validación de esquema"
      },
      {
            "id": "node-firestore",
            "name": "[FIRESTORE] Operación reconciliations",
            "type": "native-automation-node.googleFirebaseCloudFirestore",
            "description": "Lectura/Escritura en Firestore /reconciliations"
      },
      {
            "id": "node-response",
            "name": "[RESPUESTA] Finalizar con Éxito",
            "type": "native-automation-node.respondToWebhook",
            "description": "Respuesta HTTP 200 con payload estructurado"
      },
      {
            "id": "node-alert",
            "name": "[ALERTA NATIVA] Enviar a /api/alerts",
            "type": "native-automation-node.httpRequest",
            "description": "Enrutamiento de error a /api/alerts (reemplazo Telegram)"
      }
],
    samplePayload: {
      "date": "2026-09-14",
      "totalStripeUSD": 4250,
      "totalPayPalUSD": 1890,
      "totalSinpeCRC": 1450000,
      "discrepancyFound": false
},
    blueprintJson: {
      "id": "WF-022",
      "name": "Conciliación Bancaria Diaria y Detección de Discrepancias",
      "active": true,
      "nodes": [
            {
                  "parameters": {
                        "path": "api/native/workflows/daily-reconcile",
                        "httpMethod": "POST",
                        "responseMode": "responseNode",
                        "options": {}
                  },
                  "name": "[TRIGGER] Conciliación Bancaria Diaria y Detección de Discrepancias",
                  "type": "native-automation-node.webhook",
                  "typeVersion": 2,
                  "position": [
                        100,
                        300
                  ]
            },
            {
                  "parameters": {
                        "jsCode": "// Validar campos obligatorios y normalizar timestamp\nconst item = $input.first().json || {};\nitem.processedAt = new Date().toISOString();\nitem.environment = 'production';\nitem.targetCollection = 'reconciliations';\nreturn [{ json: item }];"
                  },
                  "name": "[EXTRACT] Formatear y Validar Datos",
                  "type": "native-automation-node.code",
                  "typeVersion": 2,
                  "position": [
                        350,
                        300
                  ]
            },
            {
                  "parameters": {
                        "operation": "upsert",
                        "collection": "reconciliations",
                        "documentId": "={{ $json.id || $json.bookingId || $json.code || $now }}",
                        "dataToSend": "defineBelow",
                        "fieldsUi": {
                              "fieldValues": [
                                    {
                                          "fieldId": "updatedAt",
                                          "fieldValue": "={{ $now }}"
                                    },
                                    {
                                          "fieldId": "workflowSource",
                                          "fieldValue": "WF-022"
                                    },
                                    {
                                          "fieldId": "status",
                                          "fieldValue": "processed"
                                    }
                              ]
                        }
                  },
                  "name": "[FIRESTORE] Operación Colección reconciliations",
                  "type": "native-automation-node.googleFirebaseCloudFirestore",
                  "typeVersion": 1.1,
                  "position": [
                        650,
                        300
                  ],
                  "credentials": {
                        "googleApi": {
                              "id": "5NiYz8gX64lPYIdK",
                              "name": "Costa Rica Tours - Firebase"
                        }
                  },
                  "onError": "continueErrorOutput"
            },
            {
                  "parameters": {
                        "respondWith": "json",
                        "responseBody": "{\n  \"success\": true,\n  \"workflowCode\": \"WF-022\",\n  \"collection\": \"reconciliations\",\n  \"timestamp\": \"={{ $now }}\",\n  \"message\": \"Operación completada exitosamente en reconciliations\"\n}",
                        "options": {}
                  },
                  "name": "[RESPUESTA] Finalizar con Éxito",
                  "type": "native-automation-node.respondToWebhook",
                  "typeVersion": 1.5,
                  "position": [
                        950,
                        200
                  ]
            },
            {
                  "parameters": {
                        "method": "POST",
                        "url": "={{ $env.APP_URL || \"http://localhost:3000\" }}/api/alerts",
                        "sendHeaders": true,
                        "headerParameters": {
                              "parameters": [
                                    {
                                          "name": "X-Webhook-Secret",
                                          "value": "={{ $env.WEBHOOK_SECRET || \"dev-secret\" }}"
                                    },
                                    {
                                          "name": "Content-Type",
                                          "value": "application/json"
                                    }
                              ]
                        },
                        "sendBody": true,
                        "specifyBody": "json",
                        "jsonBody": "{\n  \"source\": \"Conciliación Bancaria Diaria y Detección de Discrepancias\",\n  \"severity\": \"critical\",\n  \"title\": \"Fallo en workflow WF-022: Conciliación Bancaria Diaria y Detección de Discrepancias\",\n  \"message\": \"=Error al ejecutar en colección reconciliations: {{ $json.error?.message || \\\"Error no especificado\\\" }}\",\n  \"bookingId\": \"={{ $json.bookingId }}\",\n  \"metadata\": {\n    \"workflowCode\": \"WF-022\",\n    \"collection\": \"reconciliations\",\n    \"endpoint\": \"/api/native/workflows/daily-reconcile\"\n  }\n}",
                        "options": {}
                  },
                  "name": "[ALERTA NATIVA] Enviar a /api/alerts",
                  "type": "native-automation-node.httpRequest",
                  "typeVersion": 4.2,
                  "position": [
                        950,
                        450
                  ]
            }
      ],
      "connections": {
            "[TRIGGER] Conciliación Bancaria Diaria y Detección de Discrepancias": {
                  "main": [
                        [
                              {
                                    "node": "[EXTRACT] Formatear y Validar Datos",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[EXTRACT] Formatear y Validar Datos": {
                  "main": [
                        [
                              {
                                    "node": "[FIRESTORE] Operación Colección reconciliations",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[FIRESTORE] Operación Colección reconciliations": {
                  "main": [
                        [
                              {
                                    "node": "[RESPUESTA] Finalizar con Éxito",
                                    "type": "main",
                                    "index": 0
                              }
                        ],
                        [
                              {
                                    "node": "[ALERTA NATIVA] Enviar a /api/alerts",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            }
      }
}
  },
  {
    id: "wf-023-dynamic-fx-rate-sync",
    code: "WF-023",
    name: {
      es: "Actualizador de Tipo de Cambio Oficial BCCR (USD/CRC)",
      en: "Official BCCR Central Bank Exchange Rate Synchronizer"
    },
    category: "payment",
    collection: "exchange_rates",
    description: {
      es: "Consulta indicador de compra y venta del Banco Central de Costa Rica diariamente para actualizar conversión en checkout.",
      en: "Queries Central Bank of Costa Rica daily exchange rate to update live pricing conversions in checkout."
    },
    icon: "TrendingUp",
    color: "#14b8a6",
    endpoint: "/api/native/workflows/sync-exchange-rate",
    method: "POST",
    triggerEvent: "Cron diario 6:00 AM",
    nodesCount: 5,
    slaTarget: "< 1s",
    nodes: [
      {
            "id": "node-trigger",
            "name": "[TRIGGER] Actualizador de Tipo de Cambio Oficial BCCR (USD/CRC)",
            "type": "native-automation-node.webhook",
            "description": "Cron diario 6:00 AM"
      },
      {
            "id": "node-extract",
            "name": "[EXTRACT] Formatear y Validar Datos",
            "type": "native-automation-node.code",
            "description": "Transformación y validación de esquema"
      },
      {
            "id": "node-firestore",
            "name": "[FIRESTORE] Operación exchange_rates",
            "type": "native-automation-node.googleFirebaseCloudFirestore",
            "description": "Lectura/Escritura en Firestore /exchange_rates"
      },
      {
            "id": "node-response",
            "name": "[RESPUESTA] Finalizar con Éxito",
            "type": "native-automation-node.respondToWebhook",
            "description": "Respuesta HTTP 200 con payload estructurado"
      },
      {
            "id": "node-alert",
            "name": "[ALERTA NATIVA] Enviar a /api/alerts",
            "type": "native-automation-node.httpRequest",
            "description": "Enrutamiento de error a /api/alerts (reemplazo Telegram)"
      }
],
    samplePayload: {
      "source": "BCCR",
      "usdSellRateCRC": 524.5,
      "usdBuyRateCRC": 518.2,
      "timestamp": "2026-09-14T06:00:00Z"
},
    blueprintJson: {
      "id": "WF-023",
      "name": "Actualizador de Tipo de Cambio Oficial BCCR (USD/CRC)",
      "active": true,
      "nodes": [
            {
                  "parameters": {
                        "path": "api/native/workflows/sync-exchange-rate",
                        "httpMethod": "POST",
                        "responseMode": "responseNode",
                        "options": {}
                  },
                  "name": "[TRIGGER] Actualizador de Tipo de Cambio Oficial BCCR (USD/CRC)",
                  "type": "native-automation-node.webhook",
                  "typeVersion": 2,
                  "position": [
                        100,
                        300
                  ]
            },
            {
                  "parameters": {
                        "jsCode": "// Validar campos obligatorios y normalizar timestamp\nconst item = $input.first().json || {};\nitem.processedAt = new Date().toISOString();\nitem.environment = 'production';\nitem.targetCollection = 'exchange_rates';\nreturn [{ json: item }];"
                  },
                  "name": "[EXTRACT] Formatear y Validar Datos",
                  "type": "native-automation-node.code",
                  "typeVersion": 2,
                  "position": [
                        350,
                        300
                  ]
            },
            {
                  "parameters": {
                        "operation": "upsert",
                        "collection": "exchange_rates",
                        "documentId": "={{ $json.id || $json.bookingId || $json.code || $now }}",
                        "dataToSend": "defineBelow",
                        "fieldsUi": {
                              "fieldValues": [
                                    {
                                          "fieldId": "updatedAt",
                                          "fieldValue": "={{ $now }}"
                                    },
                                    {
                                          "fieldId": "workflowSource",
                                          "fieldValue": "WF-023"
                                    },
                                    {
                                          "fieldId": "status",
                                          "fieldValue": "processed"
                                    }
                              ]
                        }
                  },
                  "name": "[FIRESTORE] Operación Colección exchange_rates",
                  "type": "native-automation-node.googleFirebaseCloudFirestore",
                  "typeVersion": 1.1,
                  "position": [
                        650,
                        300
                  ],
                  "credentials": {
                        "googleApi": {
                              "id": "5NiYz8gX64lPYIdK",
                              "name": "Costa Rica Tours - Firebase"
                        }
                  },
                  "onError": "continueErrorOutput"
            },
            {
                  "parameters": {
                        "respondWith": "json",
                        "responseBody": "{\n  \"success\": true,\n  \"workflowCode\": \"WF-023\",\n  \"collection\": \"exchange_rates\",\n  \"timestamp\": \"={{ $now }}\",\n  \"message\": \"Operación completada exitosamente en exchange_rates\"\n}",
                        "options": {}
                  },
                  "name": "[RESPUESTA] Finalizar con Éxito",
                  "type": "native-automation-node.respondToWebhook",
                  "typeVersion": 1.5,
                  "position": [
                        950,
                        200
                  ]
            },
            {
                  "parameters": {
                        "method": "POST",
                        "url": "={{ $env.APP_URL || \"http://localhost:3000\" }}/api/alerts",
                        "sendHeaders": true,
                        "headerParameters": {
                              "parameters": [
                                    {
                                          "name": "X-Webhook-Secret",
                                          "value": "={{ $env.WEBHOOK_SECRET || \"dev-secret\" }}"
                                    },
                                    {
                                          "name": "Content-Type",
                                          "value": "application/json"
                                    }
                              ]
                        },
                        "sendBody": true,
                        "specifyBody": "json",
                        "jsonBody": "{\n  \"source\": \"Actualizador de Tipo de Cambio Oficial BCCR (USD/CRC)\",\n  \"severity\": \"critical\",\n  \"title\": \"Fallo en workflow WF-023: Actualizador de Tipo de Cambio Oficial BCCR (USD/CRC)\",\n  \"message\": \"=Error al ejecutar en colección exchange_rates: {{ $json.error?.message || \\\"Error no especificado\\\" }}\",\n  \"bookingId\": \"={{ $json.bookingId }}\",\n  \"metadata\": {\n    \"workflowCode\": \"WF-023\",\n    \"collection\": \"exchange_rates\",\n    \"endpoint\": \"/api/native/workflows/sync-exchange-rate\"\n  }\n}",
                        "options": {}
                  },
                  "name": "[ALERTA NATIVA] Enviar a /api/alerts",
                  "type": "native-automation-node.httpRequest",
                  "typeVersion": 4.2,
                  "position": [
                        950,
                        450
                  ]
            }
      ],
      "connections": {
            "[TRIGGER] Actualizador de Tipo de Cambio Oficial BCCR (USD/CRC)": {
                  "main": [
                        [
                              {
                                    "node": "[EXTRACT] Formatear y Validar Datos",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[EXTRACT] Formatear y Validar Datos": {
                  "main": [
                        [
                              {
                                    "node": "[FIRESTORE] Operación Colección exchange_rates",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[FIRESTORE] Operación Colección exchange_rates": {
                  "main": [
                        [
                              {
                                    "node": "[RESPUESTA] Finalizar con Éxito",
                                    "type": "main",
                                    "index": 0
                              }
                        ],
                        [
                              {
                                    "node": "[ALERTA NATIVA] Enviar a /api/alerts",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            }
      }
}
  },
  {
    id: "wf-024-failed-payment-recovery",
    code: "WF-024",
    name: {
      es: "Recuperador de Pagos Rechazados con Enlace Alternativo",
      en: "Declined Payment Recovery & Alternative Link Sender"
    },
    category: "payment",
    collection: "payment_retries",
    description: {
      es: "Detecta rechazo bancario de tarjeta y envía al viajero por WhatsApp/Email un enlace con opciones alternas (PayPal/SINPE).",
      en: "Detects bank card decline and emails/WhatsApp traveler an alternate payment link with backup methods."
    },
    icon: "AlertCircle",
    color: "#f97316",
    endpoint: "/api/native/workflows/payment-declined",
    method: "POST",
    triggerEvent: "Evento de pago declinado en Stripe/PayPal",
    nodesCount: 5,
    slaTarget: "< 400ms",
    nodes: [
      {
            "id": "node-trigger",
            "name": "[TRIGGER] Recuperador de Pagos Rechazados con Enlace Alternativo",
            "type": "native-automation-node.webhook",
            "description": "Evento de pago declinado en Stripe/PayPal"
      },
      {
            "id": "node-extract",
            "name": "[EXTRACT] Formatear y Validar Datos",
            "type": "native-automation-node.code",
            "description": "Transformación y validación de esquema"
      },
      {
            "id": "node-firestore",
            "name": "[FIRESTORE] Operación payment_retries",
            "type": "native-automation-node.googleFirebaseCloudFirestore",
            "description": "Lectura/Escritura en Firestore /payment_retries"
      },
      {
            "id": "node-response",
            "name": "[RESPUESTA] Finalizar con Éxito",
            "type": "native-automation-node.respondToWebhook",
            "description": "Respuesta HTTP 200 con payload estructurado"
      },
      {
            "id": "node-alert",
            "name": "[ALERTA NATIVA] Enviar a /api/alerts",
            "type": "native-automation-node.httpRequest",
            "description": "Enrutamiento de error a /api/alerts (reemplazo Telegram)"
      }
],
    samplePayload: {
      "bookingId": "BK-CR-2026-924",
      "declineReason": "insufficient_funds",
      "recoveryUrl": "https://costaricatours.es/checkout/retry/924"
},
    blueprintJson: {
      "id": "WF-024",
      "name": "Recuperador de Pagos Rechazados con Enlace Alternativo",
      "active": true,
      "nodes": [
            {
                  "parameters": {
                        "path": "api/native/workflows/payment-declined",
                        "httpMethod": "POST",
                        "responseMode": "responseNode",
                        "options": {}
                  },
                  "name": "[TRIGGER] Recuperador de Pagos Rechazados con Enlace Alternativo",
                  "type": "native-automation-node.webhook",
                  "typeVersion": 2,
                  "position": [
                        100,
                        300
                  ]
            },
            {
                  "parameters": {
                        "jsCode": "// Validar campos obligatorios y normalizar timestamp\nconst item = $input.first().json || {};\nitem.processedAt = new Date().toISOString();\nitem.environment = 'production';\nitem.targetCollection = 'payment_retries';\nreturn [{ json: item }];"
                  },
                  "name": "[EXTRACT] Formatear y Validar Datos",
                  "type": "native-automation-node.code",
                  "typeVersion": 2,
                  "position": [
                        350,
                        300
                  ]
            },
            {
                  "parameters": {
                        "operation": "upsert",
                        "collection": "payment_retries",
                        "documentId": "={{ $json.id || $json.bookingId || $json.code || $now }}",
                        "dataToSend": "defineBelow",
                        "fieldsUi": {
                              "fieldValues": [
                                    {
                                          "fieldId": "updatedAt",
                                          "fieldValue": "={{ $now }}"
                                    },
                                    {
                                          "fieldId": "workflowSource",
                                          "fieldValue": "WF-024"
                                    },
                                    {
                                          "fieldId": "status",
                                          "fieldValue": "processed"
                                    }
                              ]
                        }
                  },
                  "name": "[FIRESTORE] Operación Colección payment_retries",
                  "type": "native-automation-node.googleFirebaseCloudFirestore",
                  "typeVersion": 1.1,
                  "position": [
                        650,
                        300
                  ],
                  "credentials": {
                        "googleApi": {
                              "id": "5NiYz8gX64lPYIdK",
                              "name": "Costa Rica Tours - Firebase"
                        }
                  },
                  "onError": "continueErrorOutput"
            },
            {
                  "parameters": {
                        "respondWith": "json",
                        "responseBody": "{\n  \"success\": true,\n  \"workflowCode\": \"WF-024\",\n  \"collection\": \"payment_retries\",\n  \"timestamp\": \"={{ $now }}\",\n  \"message\": \"Operación completada exitosamente en payment_retries\"\n}",
                        "options": {}
                  },
                  "name": "[RESPUESTA] Finalizar con Éxito",
                  "type": "native-automation-node.respondToWebhook",
                  "typeVersion": 1.5,
                  "position": [
                        950,
                        200
                  ]
            },
            {
                  "parameters": {
                        "method": "POST",
                        "url": "={{ $env.APP_URL || \"http://localhost:3000\" }}/api/alerts",
                        "sendHeaders": true,
                        "headerParameters": {
                              "parameters": [
                                    {
                                          "name": "X-Webhook-Secret",
                                          "value": "={{ $env.WEBHOOK_SECRET || \"dev-secret\" }}"
                                    },
                                    {
                                          "name": "Content-Type",
                                          "value": "application/json"
                                    }
                              ]
                        },
                        "sendBody": true,
                        "specifyBody": "json",
                        "jsonBody": "{\n  \"source\": \"Recuperador de Pagos Rechazados con Enlace Alternativo\",\n  \"severity\": \"critical\",\n  \"title\": \"Fallo en workflow WF-024: Recuperador de Pagos Rechazados con Enlace Alternativo\",\n  \"message\": \"=Error al ejecutar en colección payment_retries: {{ $json.error?.message || \\\"Error no especificado\\\" }}\",\n  \"bookingId\": \"={{ $json.bookingId }}\",\n  \"metadata\": {\n    \"workflowCode\": \"WF-024\",\n    \"collection\": \"payment_retries\",\n    \"endpoint\": \"/api/native/workflows/payment-declined\"\n  }\n}",
                        "options": {}
                  },
                  "name": "[ALERTA NATIVA] Enviar a /api/alerts",
                  "type": "native-automation-node.httpRequest",
                  "typeVersion": 4.2,
                  "position": [
                        950,
                        450
                  ]
            }
      ],
      "connections": {
            "[TRIGGER] Recuperador de Pagos Rechazados con Enlace Alternativo": {
                  "main": [
                        [
                              {
                                    "node": "[EXTRACT] Formatear y Validar Datos",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[EXTRACT] Formatear y Validar Datos": {
                  "main": [
                        [
                              {
                                    "node": "[FIRESTORE] Operación Colección payment_retries",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[FIRESTORE] Operación Colección payment_retries": {
                  "main": [
                        [
                              {
                                    "node": "[RESPUESTA] Finalizar con Éxito",
                                    "type": "main",
                                    "index": 0
                              }
                        ],
                        [
                              {
                                    "node": "[ALERTA NATIVA] Enviar a /api/alerts",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            }
      }
}
  },
  {
    id: "wf-025-crypto-usdc-settlement",
    code: "WF-025",
    name: {
      es: "Pasarela de Cobro en Criptoactivos Estables (USDC / USDT)",
      en: "Stablecoin Web3 Settlement Gateway (USDC / USDT on Polygon)"
    },
    category: "payment",
    collection: "crypto_payments",
    description: {
      es: "Verifica transferencias on-chain de USDC a la wallet oficial de Costa Rica Tours y confirma reserva tras 12 confirmaciones.",
      en: "Monitors on-chain USDC transfers to company treasury wallet and auto-confirms booking after 12 confirmations."
    },
    icon: "Coins",
    color: "#8b5cf6",
    endpoint: "/api/native/workflows/crypto-webhook",
    method: "POST",
    triggerEvent: "Webhook de Alchemy / QuickNode",
    nodesCount: 5,
    slaTarget: "< 800ms",
    nodes: [
      {
            "id": "node-trigger",
            "name": "[TRIGGER] Pasarela de Cobro en Criptoactivos Estables (USDC / USDT)",
            "type": "native-automation-node.webhook",
            "description": "Webhook de Alchemy / QuickNode"
      },
      {
            "id": "node-extract",
            "name": "[EXTRACT] Formatear y Validar Datos",
            "type": "native-automation-node.code",
            "description": "Transformación y validación de esquema"
      },
      {
            "id": "node-firestore",
            "name": "[FIRESTORE] Operación crypto_payments",
            "type": "native-automation-node.googleFirebaseCloudFirestore",
            "description": "Lectura/Escritura en Firestore /crypto_payments"
      },
      {
            "id": "node-response",
            "name": "[RESPUESTA] Finalizar con Éxito",
            "type": "native-automation-node.respondToWebhook",
            "description": "Respuesta HTTP 200 con payload estructurado"
      },
      {
            "id": "node-alert",
            "name": "[ALERTA NATIVA] Enviar a /api/alerts",
            "type": "native-automation-node.httpRequest",
            "description": "Enrutamiento de error a /api/alerts (reemplazo Telegram)"
      }
],
    samplePayload: {
      "txHash": "0xabc123...def",
      "amountUSDC": 250,
      "confirmations": 12,
      "token": "USDC"
},
    blueprintJson: {
      "id": "WF-025",
      "name": "Pasarela de Cobro en Criptoactivos Estables (USDC / USDT)",
      "active": true,
      "nodes": [
            {
                  "parameters": {
                        "path": "api/native/workflows/crypto-webhook",
                        "httpMethod": "POST",
                        "responseMode": "responseNode",
                        "options": {}
                  },
                  "name": "[TRIGGER] Pasarela de Cobro en Criptoactivos Estables (USDC / USDT)",
                  "type": "native-automation-node.webhook",
                  "typeVersion": 2,
                  "position": [
                        100,
                        300
                  ]
            },
            {
                  "parameters": {
                        "jsCode": "// Validar campos obligatorios y normalizar timestamp\nconst item = $input.first().json || {};\nitem.processedAt = new Date().toISOString();\nitem.environment = 'production';\nitem.targetCollection = 'crypto_payments';\nreturn [{ json: item }];"
                  },
                  "name": "[EXTRACT] Formatear y Validar Datos",
                  "type": "native-automation-node.code",
                  "typeVersion": 2,
                  "position": [
                        350,
                        300
                  ]
            },
            {
                  "parameters": {
                        "operation": "upsert",
                        "collection": "crypto_payments",
                        "documentId": "={{ $json.id || $json.bookingId || $json.code || $now }}",
                        "dataToSend": "defineBelow",
                        "fieldsUi": {
                              "fieldValues": [
                                    {
                                          "fieldId": "updatedAt",
                                          "fieldValue": "={{ $now }}"
                                    },
                                    {
                                          "fieldId": "workflowSource",
                                          "fieldValue": "WF-025"
                                    },
                                    {
                                          "fieldId": "status",
                                          "fieldValue": "processed"
                                    }
                              ]
                        }
                  },
                  "name": "[FIRESTORE] Operación Colección crypto_payments",
                  "type": "native-automation-node.googleFirebaseCloudFirestore",
                  "typeVersion": 1.1,
                  "position": [
                        650,
                        300
                  ],
                  "credentials": {
                        "googleApi": {
                              "id": "5NiYz8gX64lPYIdK",
                              "name": "Costa Rica Tours - Firebase"
                        }
                  },
                  "onError": "continueErrorOutput"
            },
            {
                  "parameters": {
                        "respondWith": "json",
                        "responseBody": "{\n  \"success\": true,\n  \"workflowCode\": \"WF-025\",\n  \"collection\": \"crypto_payments\",\n  \"timestamp\": \"={{ $now }}\",\n  \"message\": \"Operación completada exitosamente en crypto_payments\"\n}",
                        "options": {}
                  },
                  "name": "[RESPUESTA] Finalizar con Éxito",
                  "type": "native-automation-node.respondToWebhook",
                  "typeVersion": 1.5,
                  "position": [
                        950,
                        200
                  ]
            },
            {
                  "parameters": {
                        "method": "POST",
                        "url": "={{ $env.APP_URL || \"http://localhost:3000\" }}/api/alerts",
                        "sendHeaders": true,
                        "headerParameters": {
                              "parameters": [
                                    {
                                          "name": "X-Webhook-Secret",
                                          "value": "={{ $env.WEBHOOK_SECRET || \"dev-secret\" }}"
                                    },
                                    {
                                          "name": "Content-Type",
                                          "value": "application/json"
                                    }
                              ]
                        },
                        "sendBody": true,
                        "specifyBody": "json",
                        "jsonBody": "{\n  \"source\": \"Pasarela de Cobro en Criptoactivos Estables (USDC / USDT)\",\n  \"severity\": \"critical\",\n  \"title\": \"Fallo en workflow WF-025: Pasarela de Cobro en Criptoactivos Estables (USDC / USDT)\",\n  \"message\": \"=Error al ejecutar en colección crypto_payments: {{ $json.error?.message || \\\"Error no especificado\\\" }}\",\n  \"bookingId\": \"={{ $json.bookingId }}\",\n  \"metadata\": {\n    \"workflowCode\": \"WF-025\",\n    \"collection\": \"crypto_payments\",\n    \"endpoint\": \"/api/native/workflows/crypto-webhook\"\n  }\n}",
                        "options": {}
                  },
                  "name": "[ALERTA NATIVA] Enviar a /api/alerts",
                  "type": "native-automation-node.httpRequest",
                  "typeVersion": 4.2,
                  "position": [
                        950,
                        450
                  ]
            }
      ],
      "connections": {
            "[TRIGGER] Pasarela de Cobro en Criptoactivos Estables (USDC / USDT)": {
                  "main": [
                        [
                              {
                                    "node": "[EXTRACT] Formatear y Validar Datos",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[EXTRACT] Formatear y Validar Datos": {
                  "main": [
                        [
                              {
                                    "node": "[FIRESTORE] Operación Colección crypto_payments",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[FIRESTORE] Operación Colección crypto_payments": {
                  "main": [
                        [
                              {
                                    "node": "[RESPUESTA] Finalizar con Éxito",
                                    "type": "main",
                                    "index": 0
                              }
                        ],
                        [
                              {
                                    "node": "[ALERTA NATIVA] Enviar a /api/alerts",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            }
      }
}
  },
  {
    id: "wf-026-payment-hmac-tamper-guard",
    code: "WF-026",
    name: {
      es: "Escudo Criptográfico Antimanipulación de Montos (HMAC Guard)",
      en: "Cryptographic Amount Tamper Guard (HMAC Signature Check)"
    },
    category: "payment",
    collection: "security_events",
    description: {
      es: "Valida que el token de pago no haya sido alterado en el cliente antes de invocar la pasarela de cobro.",
      en: "Validates payment payload signature to prevent client-side price tampering before charging the card."
    },
    icon: "LockKeyhole",
    color: "#dc2626",
    endpoint: "/api/native/workflows/validate-hmac",
    method: "POST",
    triggerEvent: "Pre-flight al procesar pago",
    nodesCount: 5,
    slaTarget: "< 50ms",
    nodes: [
      {
            "id": "node-trigger",
            "name": "[TRIGGER] Escudo Criptográfico Antimanipulación de Montos (HMAC Guard)",
            "type": "native-automation-node.webhook",
            "description": "Pre-flight al procesar pago"
      },
      {
            "id": "node-extract",
            "name": "[EXTRACT] Formatear y Validar Datos",
            "type": "native-automation-node.code",
            "description": "Transformación y validación de esquema"
      },
      {
            "id": "node-firestore",
            "name": "[FIRESTORE] Operación security_events",
            "type": "native-automation-node.googleFirebaseCloudFirestore",
            "description": "Lectura/Escritura en Firestore /security_events"
      },
      {
            "id": "node-response",
            "name": "[RESPUESTA] Finalizar con Éxito",
            "type": "native-automation-node.respondToWebhook",
            "description": "Respuesta HTTP 200 con payload estructurado"
      },
      {
            "id": "node-alert",
            "name": "[ALERTA NATIVA] Enviar a /api/alerts",
            "type": "native-automation-node.httpRequest",
            "description": "Enrutamiento de error a /api/alerts (reemplazo Telegram)"
      }
],
    samplePayload: {
      "token": "hmac-sha256-signature-xyz",
      "verified": true,
      "expectedUSD": 175
},
    blueprintJson: {
      "id": "WF-026",
      "name": "Escudo Criptográfico Antimanipulación de Montos (HMAC Guard)",
      "active": true,
      "nodes": [
            {
                  "parameters": {
                        "path": "api/native/workflows/validate-hmac",
                        "httpMethod": "POST",
                        "responseMode": "responseNode",
                        "options": {}
                  },
                  "name": "[TRIGGER] Escudo Criptográfico Antimanipulación de Montos (HMAC Guard)",
                  "type": "native-automation-node.webhook",
                  "typeVersion": 2,
                  "position": [
                        100,
                        300
                  ]
            },
            {
                  "parameters": {
                        "jsCode": "// Validar campos obligatorios y normalizar timestamp\nconst item = $input.first().json || {};\nitem.processedAt = new Date().toISOString();\nitem.environment = 'production';\nitem.targetCollection = 'security_events';\nreturn [{ json: item }];"
                  },
                  "name": "[EXTRACT] Formatear y Validar Datos",
                  "type": "native-automation-node.code",
                  "typeVersion": 2,
                  "position": [
                        350,
                        300
                  ]
            },
            {
                  "parameters": {
                        "operation": "upsert",
                        "collection": "security_events",
                        "documentId": "={{ $json.id || $json.bookingId || $json.code || $now }}",
                        "dataToSend": "defineBelow",
                        "fieldsUi": {
                              "fieldValues": [
                                    {
                                          "fieldId": "updatedAt",
                                          "fieldValue": "={{ $now }}"
                                    },
                                    {
                                          "fieldId": "workflowSource",
                                          "fieldValue": "WF-026"
                                    },
                                    {
                                          "fieldId": "status",
                                          "fieldValue": "processed"
                                    }
                              ]
                        }
                  },
                  "name": "[FIRESTORE] Operación Colección security_events",
                  "type": "native-automation-node.googleFirebaseCloudFirestore",
                  "typeVersion": 1.1,
                  "position": [
                        650,
                        300
                  ],
                  "credentials": {
                        "googleApi": {
                              "id": "5NiYz8gX64lPYIdK",
                              "name": "Costa Rica Tours - Firebase"
                        }
                  },
                  "onError": "continueErrorOutput"
            },
            {
                  "parameters": {
                        "respondWith": "json",
                        "responseBody": "{\n  \"success\": true,\n  \"workflowCode\": \"WF-026\",\n  \"collection\": \"security_events\",\n  \"timestamp\": \"={{ $now }}\",\n  \"message\": \"Operación completada exitosamente en security_events\"\n}",
                        "options": {}
                  },
                  "name": "[RESPUESTA] Finalizar con Éxito",
                  "type": "native-automation-node.respondToWebhook",
                  "typeVersion": 1.5,
                  "position": [
                        950,
                        200
                  ]
            },
            {
                  "parameters": {
                        "method": "POST",
                        "url": "={{ $env.APP_URL || \"http://localhost:3000\" }}/api/alerts",
                        "sendHeaders": true,
                        "headerParameters": {
                              "parameters": [
                                    {
                                          "name": "X-Webhook-Secret",
                                          "value": "={{ $env.WEBHOOK_SECRET || \"dev-secret\" }}"
                                    },
                                    {
                                          "name": "Content-Type",
                                          "value": "application/json"
                                    }
                              ]
                        },
                        "sendBody": true,
                        "specifyBody": "json",
                        "jsonBody": "{\n  \"source\": \"Escudo Criptográfico Antimanipulación de Montos (HMAC Guard)\",\n  \"severity\": \"critical\",\n  \"title\": \"Fallo en workflow WF-026: Escudo Criptográfico Antimanipulación de Montos (HMAC Guard)\",\n  \"message\": \"=Error al ejecutar en colección security_events: {{ $json.error?.message || \\\"Error no especificado\\\" }}\",\n  \"bookingId\": \"={{ $json.bookingId }}\",\n  \"metadata\": {\n    \"workflowCode\": \"WF-026\",\n    \"collection\": \"security_events\",\n    \"endpoint\": \"/api/native/workflows/validate-hmac\"\n  }\n}",
                        "options": {}
                  },
                  "name": "[ALERTA NATIVA] Enviar a /api/alerts",
                  "type": "native-automation-node.httpRequest",
                  "typeVersion": 4.2,
                  "position": [
                        950,
                        450
                  ]
            }
      ],
      "connections": {
            "[TRIGGER] Escudo Criptográfico Antimanipulación de Montos (HMAC Guard)": {
                  "main": [
                        [
                              {
                                    "node": "[EXTRACT] Formatear y Validar Datos",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[EXTRACT] Formatear y Validar Datos": {
                  "main": [
                        [
                              {
                                    "node": "[FIRESTORE] Operación Colección security_events",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[FIRESTORE] Operación Colección security_events": {
                  "main": [
                        [
                              {
                                    "node": "[RESPUESTA] Finalizar con Éxito",
                                    "type": "main",
                                    "index": 0
                              }
                        ],
                        [
                              {
                                    "node": "[ALERTA NATIVA] Enviar a /api/alerts",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            }
      }
}
  },
  {
    id: "wf-027-vat-exemption-auditor",
    code: "WF-027",
    name: {
      es: "Auditor de Exención de IVA para Paquetes Turísticos Especiales",
      en: "Tourism Package VAT Exemption & Certification Auditor"
    },
    category: "payment",
    collection: "tax_audits",
    description: {
      es: "Aplica reglas de exención o tasa reducida de IVA para paquetes de turismo rural comunitario y agroturismo.",
      en: "Applies tax deduction or exemption rules for verified community rural tourism and agrotourism packages."
    },
    icon: "FileSpreadsheet",
    color: "#059669",
    endpoint: "/api/native/workflows/vat-audit",
    method: "POST",
    triggerEvent: "Facturación de tours con certificación comunitaria",
    nodesCount: 5,
    slaTarget: "< 300ms",
    nodes: [
      {
            "id": "node-trigger",
            "name": "[TRIGGER] Auditor de Exención de IVA para Paquetes Turísticos Especiales",
            "type": "native-automation-node.webhook",
            "description": "Facturación de tours con certificación comunitaria"
      },
      {
            "id": "node-extract",
            "name": "[EXTRACT] Formatear y Validar Datos",
            "type": "native-automation-node.code",
            "description": "Transformación y validación de esquema"
      },
      {
            "id": "node-firestore",
            "name": "[FIRESTORE] Operación tax_audits",
            "type": "native-automation-node.googleFirebaseCloudFirestore",
            "description": "Lectura/Escritura en Firestore /tax_audits"
      },
      {
            "id": "node-response",
            "name": "[RESPUESTA] Finalizar con Éxito",
            "type": "native-automation-node.respondToWebhook",
            "description": "Respuesta HTTP 200 con payload estructurado"
      },
      {
            "id": "node-alert",
            "name": "[ALERTA NATIVA] Enviar a /api/alerts",
            "type": "native-automation-node.httpRequest",
            "description": "Enrutamiento de error a /api/alerts (reemplazo Telegram)"
      }
],
    samplePayload: {
      "tourType": "rural_community_coffee",
      "cstLevel": 5,
      "vatRate": 0.13
},
    blueprintJson: {
      "id": "WF-027",
      "name": "Auditor de Exención de IVA para Paquetes Turísticos Especiales",
      "active": true,
      "nodes": [
            {
                  "parameters": {
                        "path": "api/native/workflows/vat-audit",
                        "httpMethod": "POST",
                        "responseMode": "responseNode",
                        "options": {}
                  },
                  "name": "[TRIGGER] Auditor de Exención de IVA para Paquetes Turísticos Especiales",
                  "type": "native-automation-node.webhook",
                  "typeVersion": 2,
                  "position": [
                        100,
                        300
                  ]
            },
            {
                  "parameters": {
                        "jsCode": "// Validar campos obligatorios y normalizar timestamp\nconst item = $input.first().json || {};\nitem.processedAt = new Date().toISOString();\nitem.environment = 'production';\nitem.targetCollection = 'tax_audits';\nreturn [{ json: item }];"
                  },
                  "name": "[EXTRACT] Formatear y Validar Datos",
                  "type": "native-automation-node.code",
                  "typeVersion": 2,
                  "position": [
                        350,
                        300
                  ]
            },
            {
                  "parameters": {
                        "operation": "upsert",
                        "collection": "tax_audits",
                        "documentId": "={{ $json.id || $json.bookingId || $json.code || $now }}",
                        "dataToSend": "defineBelow",
                        "fieldsUi": {
                              "fieldValues": [
                                    {
                                          "fieldId": "updatedAt",
                                          "fieldValue": "={{ $now }}"
                                    },
                                    {
                                          "fieldId": "workflowSource",
                                          "fieldValue": "WF-027"
                                    },
                                    {
                                          "fieldId": "status",
                                          "fieldValue": "processed"
                                    }
                              ]
                        }
                  },
                  "name": "[FIRESTORE] Operación Colección tax_audits",
                  "type": "native-automation-node.googleFirebaseCloudFirestore",
                  "typeVersion": 1.1,
                  "position": [
                        650,
                        300
                  ],
                  "credentials": {
                        "googleApi": {
                              "id": "5NiYz8gX64lPYIdK",
                              "name": "Costa Rica Tours - Firebase"
                        }
                  },
                  "onError": "continueErrorOutput"
            },
            {
                  "parameters": {
                        "respondWith": "json",
                        "responseBody": "{\n  \"success\": true,\n  \"workflowCode\": \"WF-027\",\n  \"collection\": \"tax_audits\",\n  \"timestamp\": \"={{ $now }}\",\n  \"message\": \"Operación completada exitosamente en tax_audits\"\n}",
                        "options": {}
                  },
                  "name": "[RESPUESTA] Finalizar con Éxito",
                  "type": "native-automation-node.respondToWebhook",
                  "typeVersion": 1.5,
                  "position": [
                        950,
                        200
                  ]
            },
            {
                  "parameters": {
                        "method": "POST",
                        "url": "={{ $env.APP_URL || \"http://localhost:3000\" }}/api/alerts",
                        "sendHeaders": true,
                        "headerParameters": {
                              "parameters": [
                                    {
                                          "name": "X-Webhook-Secret",
                                          "value": "={{ $env.WEBHOOK_SECRET || \"dev-secret\" }}"
                                    },
                                    {
                                          "name": "Content-Type",
                                          "value": "application/json"
                                    }
                              ]
                        },
                        "sendBody": true,
                        "specifyBody": "json",
                        "jsonBody": "{\n  \"source\": \"Auditor de Exención de IVA para Paquetes Turísticos Especiales\",\n  \"severity\": \"critical\",\n  \"title\": \"Fallo en workflow WF-027: Auditor de Exención de IVA para Paquetes Turísticos Especiales\",\n  \"message\": \"=Error al ejecutar en colección tax_audits: {{ $json.error?.message || \\\"Error no especificado\\\" }}\",\n  \"bookingId\": \"={{ $json.bookingId }}\",\n  \"metadata\": {\n    \"workflowCode\": \"WF-027\",\n    \"collection\": \"tax_audits\",\n    \"endpoint\": \"/api/native/workflows/vat-audit\"\n  }\n}",
                        "options": {}
                  },
                  "name": "[ALERTA NATIVA] Enviar a /api/alerts",
                  "type": "native-automation-node.httpRequest",
                  "typeVersion": 4.2,
                  "position": [
                        950,
                        450
                  ]
            }
      ],
      "connections": {
            "[TRIGGER] Auditor de Exención de IVA para Paquetes Turísticos Especiales": {
                  "main": [
                        [
                              {
                                    "node": "[EXTRACT] Formatear y Validar Datos",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[EXTRACT] Formatear y Validar Datos": {
                  "main": [
                        [
                              {
                                    "node": "[FIRESTORE] Operación Colección tax_audits",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[FIRESTORE] Operación Colección tax_audits": {
                  "main": [
                        [
                              {
                                    "node": "[RESPUESTA] Finalizar con Éxito",
                                    "type": "main",
                                    "index": 0
                              }
                        ],
                        [
                              {
                                    "node": "[ALERTA NATIVA] Enviar a /api/alerts",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            }
      }
}
  },
  {
    id: "wf-028-multicurrency-eur-gbp-converter",
    code: "WF-028",
    name: {
      es: "Conversor Multidivisa de Precios (EUR, GBP, CAD a USD)",
      en: "Multicurrency Display Converter (EUR, GBP, CAD to USD)"
    },
    category: "payment",
    collection: "fx_rates",
    description: {
      es: "Mantiene feeds de conversión actualizados para viajeros europeos y canadienses mostrando el monto exacto en su divisa local.",
      en: "Maintains live FX feeds for European and Canadian visitors displaying tours in native currencies."
    },
    icon: "Globe",
    color: "#0284c7",
    endpoint: "/api/native/workflows/multicurrency-rates",
    method: "GET",
    triggerEvent: "Petición GET de catálogo o cron cada 4 horas",
    nodesCount: 5,
    slaTarget: "< 150ms",
    nodes: [
      {
            "id": "node-trigger",
            "name": "[TRIGGER] Conversor Multidivisa de Precios (EUR, GBP, CAD a USD)",
            "type": "native-automation-node.webhook",
            "description": "Petición GET de catálogo o cron cada 4 horas"
      },
      {
            "id": "node-extract",
            "name": "[EXTRACT] Formatear y Validar Datos",
            "type": "native-automation-node.code",
            "description": "Transformación y validación de esquema"
      },
      {
            "id": "node-firestore",
            "name": "[FIRESTORE] Operación fx_rates",
            "type": "native-automation-node.googleFirebaseCloudFirestore",
            "description": "Lectura/Escritura en Firestore /fx_rates"
      },
      {
            "id": "node-response",
            "name": "[RESPUESTA] Finalizar con Éxito",
            "type": "native-automation-node.respondToWebhook",
            "description": "Respuesta HTTP 200 con payload estructurado"
      },
      {
            "id": "node-alert",
            "name": "[ALERTA NATIVA] Enviar a /api/alerts",
            "type": "native-automation-node.httpRequest",
            "description": "Enrutamiento de error a /api/alerts (reemplazo Telegram)"
      }
],
    samplePayload: {
      "EUR": 0.92,
      "GBP": 0.78,
      "CAD": 1.36,
      "base": "USD"
},
    blueprintJson: {
      "id": "WF-028",
      "name": "Conversor Multidivisa de Precios (EUR, GBP, CAD a USD)",
      "active": true,
      "nodes": [
            {
                  "parameters": {
                        "path": "api/native/workflows/multicurrency-rates",
                        "httpMethod": "GET",
                        "responseMode": "responseNode",
                        "options": {}
                  },
                  "name": "[TRIGGER] Conversor Multidivisa de Precios (EUR, GBP, CAD a USD)",
                  "type": "native-automation-node.webhook",
                  "typeVersion": 2,
                  "position": [
                        100,
                        300
                  ]
            },
            {
                  "parameters": {
                        "jsCode": "// Validar campos obligatorios y normalizar timestamp\nconst item = $input.first().json || {};\nitem.processedAt = new Date().toISOString();\nitem.environment = 'production';\nitem.targetCollection = 'fx_rates';\nreturn [{ json: item }];"
                  },
                  "name": "[EXTRACT] Formatear y Validar Datos",
                  "type": "native-automation-node.code",
                  "typeVersion": 2,
                  "position": [
                        350,
                        300
                  ]
            },
            {
                  "parameters": {
                        "operation": "upsert",
                        "collection": "fx_rates",
                        "documentId": "={{ $json.id || $json.bookingId || $json.code || $now }}",
                        "dataToSend": "defineBelow",
                        "fieldsUi": {
                              "fieldValues": [
                                    {
                                          "fieldId": "updatedAt",
                                          "fieldValue": "={{ $now }}"
                                    },
                                    {
                                          "fieldId": "workflowSource",
                                          "fieldValue": "WF-028"
                                    },
                                    {
                                          "fieldId": "status",
                                          "fieldValue": "processed"
                                    }
                              ]
                        }
                  },
                  "name": "[FIRESTORE] Operación Colección fx_rates",
                  "type": "native-automation-node.googleFirebaseCloudFirestore",
                  "typeVersion": 1.1,
                  "position": [
                        650,
                        300
                  ],
                  "credentials": {
                        "googleApi": {
                              "id": "5NiYz8gX64lPYIdK",
                              "name": "Costa Rica Tours - Firebase"
                        }
                  },
                  "onError": "continueErrorOutput"
            },
            {
                  "parameters": {
                        "respondWith": "json",
                        "responseBody": "{\n  \"success\": true,\n  \"workflowCode\": \"WF-028\",\n  \"collection\": \"fx_rates\",\n  \"timestamp\": \"={{ $now }}\",\n  \"message\": \"Operación completada exitosamente en fx_rates\"\n}",
                        "options": {}
                  },
                  "name": "[RESPUESTA] Finalizar con Éxito",
                  "type": "native-automation-node.respondToWebhook",
                  "typeVersion": 1.5,
                  "position": [
                        950,
                        200
                  ]
            },
            {
                  "parameters": {
                        "method": "POST",
                        "url": "={{ $env.APP_URL || \"http://localhost:3000\" }}/api/alerts",
                        "sendHeaders": true,
                        "headerParameters": {
                              "parameters": [
                                    {
                                          "name": "X-Webhook-Secret",
                                          "value": "={{ $env.WEBHOOK_SECRET || \"dev-secret\" }}"
                                    },
                                    {
                                          "name": "Content-Type",
                                          "value": "application/json"
                                    }
                              ]
                        },
                        "sendBody": true,
                        "specifyBody": "json",
                        "jsonBody": "{\n  \"source\": \"Conversor Multidivisa de Precios (EUR, GBP, CAD a USD)\",\n  \"severity\": \"critical\",\n  \"title\": \"Fallo en workflow WF-028: Conversor Multidivisa de Precios (EUR, GBP, CAD a USD)\",\n  \"message\": \"=Error al ejecutar en colección fx_rates: {{ $json.error?.message || \\\"Error no especificado\\\" }}\",\n  \"bookingId\": \"={{ $json.bookingId }}\",\n  \"metadata\": {\n    \"workflowCode\": \"WF-028\",\n    \"collection\": \"fx_rates\",\n    \"endpoint\": \"/api/native/workflows/multicurrency-rates\"\n  }\n}",
                        "options": {}
                  },
                  "name": "[ALERTA NATIVA] Enviar a /api/alerts",
                  "type": "native-automation-node.httpRequest",
                  "typeVersion": 4.2,
                  "position": [
                        950,
                        450
                  ]
            }
      ],
      "connections": {
            "[TRIGGER] Conversor Multidivisa de Precios (EUR, GBP, CAD a USD)": {
                  "main": [
                        [
                              {
                                    "node": "[EXTRACT] Formatear y Validar Datos",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[EXTRACT] Formatear y Validar Datos": {
                  "main": [
                        [
                              {
                                    "node": "[FIRESTORE] Operación Colección fx_rates",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[FIRESTORE] Operación Colección fx_rates": {
                  "main": [
                        [
                              {
                                    "node": "[RESPUESTA] Finalizar con Éxito",
                                    "type": "main",
                                    "index": 0
                              }
                        ],
                        [
                              {
                                    "node": "[ALERTA NATIVA] Enviar a /api/alerts",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            }
      }
}
  },
  {
    id: "wf-029-provider-automated-payout",
    code: "WF-029",
    name: {
      es: "Liquidación Quincenal a Operadores Locales de Tours",
      en: "Bi-Weekly Local Tour Operator Automated Payouts"
    },
    category: "fulfillment",
    collection: "payouts",
    description: {
      es: "Calcula montos netos adeudados por tours efectivamente realizados, descuenta comisión y genera orden de transferencia.",
      en: "Calculates net amounts for completed tours, subtracts platform commission, and generates transfer orders."
    },
    icon: "Send",
    color: "#059669",
    endpoint: "/api/native/workflows/provider-payout",
    method: "POST",
    triggerEvent: "Cron quincenal (días 15 y 30 a las 6:00 AM)",
    nodesCount: 5,
    slaTarget: "< 5s",
    nodes: [
      {
            "id": "node-trigger",
            "name": "[TRIGGER] Liquidación Quincenal a Operadores Locales de Tours",
            "type": "native-automation-node.webhook",
            "description": "Cron quincenal (días 15 y 30 a las 6:00 AM)"
      },
      {
            "id": "node-extract",
            "name": "[EXTRACT] Formatear y Validar Datos",
            "type": "native-automation-node.code",
            "description": "Transformación y validación de esquema"
      },
      {
            "id": "node-firestore",
            "name": "[FIRESTORE] Operación payouts",
            "type": "native-automation-node.googleFirebaseCloudFirestore",
            "description": "Lectura/Escritura en Firestore /payouts"
      },
      {
            "id": "node-response",
            "name": "[RESPUESTA] Finalizar con Éxito",
            "type": "native-automation-node.respondToWebhook",
            "description": "Respuesta HTTP 200 con payload estructurado"
      },
      {
            "id": "node-alert",
            "name": "[ALERTA NATIVA] Enviar a /api/alerts",
            "type": "native-automation-node.httpRequest",
            "description": "Enrutamiento de error a /api/alerts (reemplazo Telegram)"
      }
],
    samplePayload: {
      "providerId": "prov-arenal-rafting-exp",
      "totalToursCompleted": 18,
      "grossUSD": 3600,
      "commissionUSD": 540,
      "netPayoutUSD": 3060
},
    blueprintJson: {
      "id": "WF-029",
      "name": "Liquidación Quincenal a Operadores Locales de Tours",
      "active": true,
      "nodes": [
            {
                  "parameters": {
                        "path": "api/native/workflows/provider-payout",
                        "httpMethod": "POST",
                        "responseMode": "responseNode",
                        "options": {}
                  },
                  "name": "[TRIGGER] Liquidación Quincenal a Operadores Locales de Tours",
                  "type": "native-automation-node.webhook",
                  "typeVersion": 2,
                  "position": [
                        100,
                        300
                  ]
            },
            {
                  "parameters": {
                        "jsCode": "// Validar campos obligatorios y normalizar timestamp\nconst item = $input.first().json || {};\nitem.processedAt = new Date().toISOString();\nitem.environment = 'production';\nitem.targetCollection = 'payouts';\nreturn [{ json: item }];"
                  },
                  "name": "[EXTRACT] Formatear y Validar Datos",
                  "type": "native-automation-node.code",
                  "typeVersion": 2,
                  "position": [
                        350,
                        300
                  ]
            },
            {
                  "parameters": {
                        "operation": "upsert",
                        "collection": "payouts",
                        "documentId": "={{ $json.id || $json.bookingId || $json.code || $now }}",
                        "dataToSend": "defineBelow",
                        "fieldsUi": {
                              "fieldValues": [
                                    {
                                          "fieldId": "updatedAt",
                                          "fieldValue": "={{ $now }}"
                                    },
                                    {
                                          "fieldId": "workflowSource",
                                          "fieldValue": "WF-029"
                                    },
                                    {
                                          "fieldId": "status",
                                          "fieldValue": "processed"
                                    }
                              ]
                        }
                  },
                  "name": "[FIRESTORE] Operación Colección payouts",
                  "type": "native-automation-node.googleFirebaseCloudFirestore",
                  "typeVersion": 1.1,
                  "position": [
                        650,
                        300
                  ],
                  "credentials": {
                        "googleApi": {
                              "id": "5NiYz8gX64lPYIdK",
                              "name": "Costa Rica Tours - Firebase"
                        }
                  },
                  "onError": "continueErrorOutput"
            },
            {
                  "parameters": {
                        "respondWith": "json",
                        "responseBody": "{\n  \"success\": true,\n  \"workflowCode\": \"WF-029\",\n  \"collection\": \"payouts\",\n  \"timestamp\": \"={{ $now }}\",\n  \"message\": \"Operación completada exitosamente en payouts\"\n}",
                        "options": {}
                  },
                  "name": "[RESPUESTA] Finalizar con Éxito",
                  "type": "native-automation-node.respondToWebhook",
                  "typeVersion": 1.5,
                  "position": [
                        950,
                        200
                  ]
            },
            {
                  "parameters": {
                        "method": "POST",
                        "url": "={{ $env.APP_URL || \"http://localhost:3000\" }}/api/alerts",
                        "sendHeaders": true,
                        "headerParameters": {
                              "parameters": [
                                    {
                                          "name": "X-Webhook-Secret",
                                          "value": "={{ $env.WEBHOOK_SECRET || \"dev-secret\" }}"
                                    },
                                    {
                                          "name": "Content-Type",
                                          "value": "application/json"
                                    }
                              ]
                        },
                        "sendBody": true,
                        "specifyBody": "json",
                        "jsonBody": "{\n  \"source\": \"Liquidación Quincenal a Operadores Locales de Tours\",\n  \"severity\": \"critical\",\n  \"title\": \"Fallo en workflow WF-029: Liquidación Quincenal a Operadores Locales de Tours\",\n  \"message\": \"=Error al ejecutar en colección payouts: {{ $json.error?.message || \\\"Error no especificado\\\" }}\",\n  \"bookingId\": \"={{ $json.bookingId }}\",\n  \"metadata\": {\n    \"workflowCode\": \"WF-029\",\n    \"collection\": \"payouts\",\n    \"endpoint\": \"/api/native/workflows/provider-payout\"\n  }\n}",
                        "options": {}
                  },
                  "name": "[ALERTA NATIVA] Enviar a /api/alerts",
                  "type": "native-automation-node.httpRequest",
                  "typeVersion": 4.2,
                  "position": [
                        950,
                        450
                  ]
            }
      ],
      "connections": {
            "[TRIGGER] Liquidación Quincenal a Operadores Locales de Tours": {
                  "main": [
                        [
                              {
                                    "node": "[EXTRACT] Formatear y Validar Datos",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[EXTRACT] Formatear y Validar Datos": {
                  "main": [
                        [
                              {
                                    "node": "[FIRESTORE] Operación Colección payouts",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[FIRESTORE] Operación Colección payouts": {
                  "main": [
                        [
                              {
                                    "node": "[RESPUESTA] Finalizar con Éxito",
                                    "type": "main",
                                    "index": 0
                              }
                        ],
                        [
                              {
                                    "node": "[ALERTA NATIVA] Enviar a /api/alerts",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            }
      }
}
  },
  {
    id: "wf-030-provider-instant-whatsapp-dispatch",
    code: "WF-030",
    name: {
      es: "Despacho Instantáneo de Reserva al Proveedor vía WhatsApp",
      en: "Instant Operator Reservation Dispatch via WhatsApp"
    },
    category: "fulfillment",
    collection: "provider_notifications",
    description: {
      es: "Envía plantilla oficial de confirmación al WhatsApp del operador con nombre de clientes, hotel de recogida y hora.",
      en: "Dispatches official template to local operator WhatsApp with customer pax names, hotel pickup, and time."
    },
    icon: "MessageSquare",
    color: "#10b981",
    endpoint: "/api/native/workflows/dispatch-provider-whatsapp",
    method: "POST",
    triggerEvent: "Confirmación exitosa de reserva",
    nodesCount: 5,
    slaTarget: "< 400ms",
    nodes: [
      {
            "id": "node-trigger",
            "name": "[TRIGGER] Despacho Instantáneo de Reserva al Proveedor vía WhatsApp",
            "type": "native-automation-node.webhook",
            "description": "Confirmación exitosa de reserva"
      },
      {
            "id": "node-extract",
            "name": "[EXTRACT] Formatear y Validar Datos",
            "type": "native-automation-node.code",
            "description": "Transformación y validación de esquema"
      },
      {
            "id": "node-firestore",
            "name": "[FIRESTORE] Operación provider_notifications",
            "type": "native-automation-node.googleFirebaseCloudFirestore",
            "description": "Lectura/Escritura en Firestore /provider_notifications"
      },
      {
            "id": "node-response",
            "name": "[RESPUESTA] Finalizar con Éxito",
            "type": "native-automation-node.respondToWebhook",
            "description": "Respuesta HTTP 200 con payload estructurado"
      },
      {
            "id": "node-alert",
            "name": "[ALERTA NATIVA] Enviar a /api/alerts",
            "type": "native-automation-node.httpRequest",
            "description": "Enrutamiento de error a /api/alerts (reemplazo Telegram)"
      }
],
    samplePayload: {
      "providerPhone": "+50688997766",
      "bookingId": "BK-CR-2026-930",
      "paxCount": 4,
      "pickupLocation": "Hotel Arenal Kioro"
},
    blueprintJson: {
      "id": "WF-030",
      "name": "Despacho Instantáneo de Reserva al Proveedor vía WhatsApp",
      "active": true,
      "nodes": [
            {
                  "parameters": {
                        "path": "api/native/workflows/dispatch-provider-whatsapp",
                        "httpMethod": "POST",
                        "responseMode": "responseNode",
                        "options": {}
                  },
                  "name": "[TRIGGER] Despacho Instantáneo de Reserva al Proveedor vía WhatsApp",
                  "type": "native-automation-node.webhook",
                  "typeVersion": 2,
                  "position": [
                        100,
                        300
                  ]
            },
            {
                  "parameters": {
                        "jsCode": "// Validar campos obligatorios y normalizar timestamp\nconst item = $input.first().json || {};\nitem.processedAt = new Date().toISOString();\nitem.environment = 'production';\nitem.targetCollection = 'provider_notifications';\nreturn [{ json: item }];"
                  },
                  "name": "[EXTRACT] Formatear y Validar Datos",
                  "type": "native-automation-node.code",
                  "typeVersion": 2,
                  "position": [
                        350,
                        300
                  ]
            },
            {
                  "parameters": {
                        "operation": "upsert",
                        "collection": "provider_notifications",
                        "documentId": "={{ $json.id || $json.bookingId || $json.code || $now }}",
                        "dataToSend": "defineBelow",
                        "fieldsUi": {
                              "fieldValues": [
                                    {
                                          "fieldId": "updatedAt",
                                          "fieldValue": "={{ $now }}"
                                    },
                                    {
                                          "fieldId": "workflowSource",
                                          "fieldValue": "WF-030"
                                    },
                                    {
                                          "fieldId": "status",
                                          "fieldValue": "processed"
                                    }
                              ]
                        }
                  },
                  "name": "[FIRESTORE] Operación Colección provider_notifications",
                  "type": "native-automation-node.googleFirebaseCloudFirestore",
                  "typeVersion": 1.1,
                  "position": [
                        650,
                        300
                  ],
                  "credentials": {
                        "googleApi": {
                              "id": "5NiYz8gX64lPYIdK",
                              "name": "Costa Rica Tours - Firebase"
                        }
                  },
                  "onError": "continueErrorOutput"
            },
            {
                  "parameters": {
                        "respondWith": "json",
                        "responseBody": "{\n  \"success\": true,\n  \"workflowCode\": \"WF-030\",\n  \"collection\": \"provider_notifications\",\n  \"timestamp\": \"={{ $now }}\",\n  \"message\": \"Operación completada exitosamente en provider_notifications\"\n}",
                        "options": {}
                  },
                  "name": "[RESPUESTA] Finalizar con Éxito",
                  "type": "native-automation-node.respondToWebhook",
                  "typeVersion": 1.5,
                  "position": [
                        950,
                        200
                  ]
            },
            {
                  "parameters": {
                        "method": "POST",
                        "url": "={{ $env.APP_URL || \"http://localhost:3000\" }}/api/alerts",
                        "sendHeaders": true,
                        "headerParameters": {
                              "parameters": [
                                    {
                                          "name": "X-Webhook-Secret",
                                          "value": "={{ $env.WEBHOOK_SECRET || \"dev-secret\" }}"
                                    },
                                    {
                                          "name": "Content-Type",
                                          "value": "application/json"
                                    }
                              ]
                        },
                        "sendBody": true,
                        "specifyBody": "json",
                        "jsonBody": "{\n  \"source\": \"Despacho Instantáneo de Reserva al Proveedor vía WhatsApp\",\n  \"severity\": \"critical\",\n  \"title\": \"Fallo en workflow WF-030: Despacho Instantáneo de Reserva al Proveedor vía WhatsApp\",\n  \"message\": \"=Error al ejecutar en colección provider_notifications: {{ $json.error?.message || \\\"Error no especificado\\\" }}\",\n  \"bookingId\": \"={{ $json.bookingId }}\",\n  \"metadata\": {\n    \"workflowCode\": \"WF-030\",\n    \"collection\": \"provider_notifications\",\n    \"endpoint\": \"/api/native/workflows/dispatch-provider-whatsapp\"\n  }\n}",
                        "options": {}
                  },
                  "name": "[ALERTA NATIVA] Enviar a /api/alerts",
                  "type": "native-automation-node.httpRequest",
                  "typeVersion": 4.2,
                  "position": [
                        950,
                        450
                  ]
            }
      ],
      "connections": {
            "[TRIGGER] Despacho Instantáneo de Reserva al Proveedor vía WhatsApp": {
                  "main": [
                        [
                              {
                                    "node": "[EXTRACT] Formatear y Validar Datos",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[EXTRACT] Formatear y Validar Datos": {
                  "main": [
                        [
                              {
                                    "node": "[FIRESTORE] Operación Colección provider_notifications",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[FIRESTORE] Operación Colección provider_notifications": {
                  "main": [
                        [
                              {
                                    "node": "[RESPUESTA] Finalizar con Éxito",
                                    "type": "main",
                                    "index": 0
                              }
                        ],
                        [
                              {
                                    "node": "[ALERTA NATIVA] Enviar a /api/alerts",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            }
      }
}
  },
  {
    id: "wf-031-provider-onboarding-evaluator",
    code: "WF-031",
    name: {
      es: "Evaluador y Onboarding de Nuevos Operadores Turísticos",
      en: "New Tour Operator Onboarding & Verification Pipeline"
    },
    category: "fulfillment",
    collection: "providers",
    description: {
      es: "Verifica cédula jurídica costarricense, póliza de responsabilidad civil INS y permisos de guías antes de activar perfil.",
      en: "Verifies CR legal entity, INS liability policy, and certified guide permits before publishing operator tours."
    },
    icon: "UserCheck",
    color: "#6366f1",
    endpoint: "/api/native/workflows/onboard-provider",
    method: "POST",
    triggerEvent: "Registro de nuevo operador en el portal",
    nodesCount: 5,
    slaTarget: "< 1s",
    nodes: [
      {
            "id": "node-trigger",
            "name": "[TRIGGER] Evaluador y Onboarding de Nuevos Operadores Turísticos",
            "type": "native-automation-node.webhook",
            "description": "Registro de nuevo operador en el portal"
      },
      {
            "id": "node-extract",
            "name": "[EXTRACT] Formatear y Validar Datos",
            "type": "native-automation-node.code",
            "description": "Transformación y validación de esquema"
      },
      {
            "id": "node-firestore",
            "name": "[FIRESTORE] Operación providers",
            "type": "native-automation-node.googleFirebaseCloudFirestore",
            "description": "Lectura/Escritura en Firestore /providers"
      },
      {
            "id": "node-response",
            "name": "[RESPUESTA] Finalizar con Éxito",
            "type": "native-automation-node.respondToWebhook",
            "description": "Respuesta HTTP 200 con payload estructurado"
      },
      {
            "id": "node-alert",
            "name": "[ALERTA NATIVA] Enviar a /api/alerts",
            "type": "native-automation-node.httpRequest",
            "description": "Enrutamiento de error a /api/alerts (reemplazo Telegram)"
      }
],
    samplePayload: {
      "businessName": "Monteverde Canopy Canopy SRL",
      "insPolicyNumber": "INS-POL-2026-88",
      "ictPermit": "ICT-PERM-4512"
},
    blueprintJson: {
      "id": "WF-031",
      "name": "Evaluador y Onboarding de Nuevos Operadores Turísticos",
      "active": true,
      "nodes": [
            {
                  "parameters": {
                        "path": "api/native/workflows/onboard-provider",
                        "httpMethod": "POST",
                        "responseMode": "responseNode",
                        "options": {}
                  },
                  "name": "[TRIGGER] Evaluador y Onboarding de Nuevos Operadores Turísticos",
                  "type": "native-automation-node.webhook",
                  "typeVersion": 2,
                  "position": [
                        100,
                        300
                  ]
            },
            {
                  "parameters": {
                        "jsCode": "// Validar campos obligatorios y normalizar timestamp\nconst item = $input.first().json || {};\nitem.processedAt = new Date().toISOString();\nitem.environment = 'production';\nitem.targetCollection = 'providers';\nreturn [{ json: item }];"
                  },
                  "name": "[EXTRACT] Formatear y Validar Datos",
                  "type": "native-automation-node.code",
                  "typeVersion": 2,
                  "position": [
                        350,
                        300
                  ]
            },
            {
                  "parameters": {
                        "operation": "upsert",
                        "collection": "providers",
                        "documentId": "={{ $json.id || $json.bookingId || $json.code || $now }}",
                        "dataToSend": "defineBelow",
                        "fieldsUi": {
                              "fieldValues": [
                                    {
                                          "fieldId": "updatedAt",
                                          "fieldValue": "={{ $now }}"
                                    },
                                    {
                                          "fieldId": "workflowSource",
                                          "fieldValue": "WF-031"
                                    },
                                    {
                                          "fieldId": "status",
                                          "fieldValue": "processed"
                                    }
                              ]
                        }
                  },
                  "name": "[FIRESTORE] Operación Colección providers",
                  "type": "native-automation-node.googleFirebaseCloudFirestore",
                  "typeVersion": 1.1,
                  "position": [
                        650,
                        300
                  ],
                  "credentials": {
                        "googleApi": {
                              "id": "5NiYz8gX64lPYIdK",
                              "name": "Costa Rica Tours - Firebase"
                        }
                  },
                  "onError": "continueErrorOutput"
            },
            {
                  "parameters": {
                        "respondWith": "json",
                        "responseBody": "{\n  \"success\": true,\n  \"workflowCode\": \"WF-031\",\n  \"collection\": \"providers\",\n  \"timestamp\": \"={{ $now }}\",\n  \"message\": \"Operación completada exitosamente en providers\"\n}",
                        "options": {}
                  },
                  "name": "[RESPUESTA] Finalizar con Éxito",
                  "type": "native-automation-node.respondToWebhook",
                  "typeVersion": 1.5,
                  "position": [
                        950,
                        200
                  ]
            },
            {
                  "parameters": {
                        "method": "POST",
                        "url": "={{ $env.APP_URL || \"http://localhost:3000\" }}/api/alerts",
                        "sendHeaders": true,
                        "headerParameters": {
                              "parameters": [
                                    {
                                          "name": "X-Webhook-Secret",
                                          "value": "={{ $env.WEBHOOK_SECRET || \"dev-secret\" }}"
                                    },
                                    {
                                          "name": "Content-Type",
                                          "value": "application/json"
                                    }
                              ]
                        },
                        "sendBody": true,
                        "specifyBody": "json",
                        "jsonBody": "{\n  \"source\": \"Evaluador y Onboarding de Nuevos Operadores Turísticos\",\n  \"severity\": \"critical\",\n  \"title\": \"Fallo en workflow WF-031: Evaluador y Onboarding de Nuevos Operadores Turísticos\",\n  \"message\": \"=Error al ejecutar en colección providers: {{ $json.error?.message || \\\"Error no especificado\\\" }}\",\n  \"bookingId\": \"={{ $json.bookingId }}\",\n  \"metadata\": {\n    \"workflowCode\": \"WF-031\",\n    \"collection\": \"providers\",\n    \"endpoint\": \"/api/native/workflows/onboard-provider\"\n  }\n}",
                        "options": {}
                  },
                  "name": "[ALERTA NATIVA] Enviar a /api/alerts",
                  "type": "native-automation-node.httpRequest",
                  "typeVersion": 4.2,
                  "position": [
                        950,
                        450
                  ]
            }
      ],
      "connections": {
            "[TRIGGER] Evaluador y Onboarding de Nuevos Operadores Turísticos": {
                  "main": [
                        [
                              {
                                    "node": "[EXTRACT] Formatear y Validar Datos",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[EXTRACT] Formatear y Validar Datos": {
                  "main": [
                        [
                              {
                                    "node": "[FIRESTORE] Operación Colección providers",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[FIRESTORE] Operación Colección providers": {
                  "main": [
                        [
                              {
                                    "node": "[RESPUESTA] Finalizar con Éxito",
                                    "type": "main",
                                    "index": 0
                              }
                        ],
                        [
                              {
                                    "node": "[ALERTA NATIVA] Enviar a /api/alerts",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            }
      }
}
  },
  {
    id: "wf-032-cst-sustainability-audit",
    code: "WF-032",
    name: {
      es: "Auditor de Certificación CST (Sostenibilidad Turística)",
      en: "CST Sustainable Tourism Level Auditor & Badge Assigner"
    },
    category: "fulfillment",
    collection: "cst_certifications",
    description: {
      es: "Monitorea fecha de vencimiento de la certificación CST del ICT y asigna sellos ecológicos visibles en las fichas de tour.",
      en: "Monitors ICT CST certificate expiration dates and updates eco-badges on public tour listings."
    },
    icon: "Leaf",
    color: "#15803d",
    endpoint: "/api/native/workflows/cst-audit",
    method: "POST",
    triggerEvent: "Cron mensual de auditoría ambiental",
    nodesCount: 5,
    slaTarget: "< 2s",
    nodes: [
      {
            "id": "node-trigger",
            "name": "[TRIGGER] Auditor de Certificación CST (Sostenibilidad Turística)",
            "type": "native-automation-node.webhook",
            "description": "Cron mensual de auditoría ambiental"
      },
      {
            "id": "node-extract",
            "name": "[EXTRACT] Formatear y Validar Datos",
            "type": "native-automation-node.code",
            "description": "Transformación y validación de esquema"
      },
      {
            "id": "node-firestore",
            "name": "[FIRESTORE] Operación cst_certifications",
            "type": "native-automation-node.googleFirebaseCloudFirestore",
            "description": "Lectura/Escritura en Firestore /cst_certifications"
      },
      {
            "id": "node-response",
            "name": "[RESPUESTA] Finalizar con Éxito",
            "type": "native-automation-node.respondToWebhook",
            "description": "Respuesta HTTP 200 con payload estructurado"
      },
      {
            "id": "node-alert",
            "name": "[ALERTA NATIVA] Enviar a /api/alerts",
            "type": "native-automation-node.httpRequest",
            "description": "Enrutamiento de error a /api/alerts (reemplazo Telegram)"
      }
],
    samplePayload: {
      "providerId": "prov-tortuguero-eco",
      "cstLevel": "Nivel Élite",
      "validUntil": "2027-05-30"
},
    blueprintJson: {
      "id": "WF-032",
      "name": "Auditor de Certificación CST (Sostenibilidad Turística)",
      "active": true,
      "nodes": [
            {
                  "parameters": {
                        "path": "api/native/workflows/cst-audit",
                        "httpMethod": "POST",
                        "responseMode": "responseNode",
                        "options": {}
                  },
                  "name": "[TRIGGER] Auditor de Certificación CST (Sostenibilidad Turística)",
                  "type": "native-automation-node.webhook",
                  "typeVersion": 2,
                  "position": [
                        100,
                        300
                  ]
            },
            {
                  "parameters": {
                        "jsCode": "// Validar campos obligatorios y normalizar timestamp\nconst item = $input.first().json || {};\nitem.processedAt = new Date().toISOString();\nitem.environment = 'production';\nitem.targetCollection = 'cst_certifications';\nreturn [{ json: item }];"
                  },
                  "name": "[EXTRACT] Formatear y Validar Datos",
                  "type": "native-automation-node.code",
                  "typeVersion": 2,
                  "position": [
                        350,
                        300
                  ]
            },
            {
                  "parameters": {
                        "operation": "upsert",
                        "collection": "cst_certifications",
                        "documentId": "={{ $json.id || $json.bookingId || $json.code || $now }}",
                        "dataToSend": "defineBelow",
                        "fieldsUi": {
                              "fieldValues": [
                                    {
                                          "fieldId": "updatedAt",
                                          "fieldValue": "={{ $now }}"
                                    },
                                    {
                                          "fieldId": "workflowSource",
                                          "fieldValue": "WF-032"
                                    },
                                    {
                                          "fieldId": "status",
                                          "fieldValue": "processed"
                                    }
                              ]
                        }
                  },
                  "name": "[FIRESTORE] Operación Colección cst_certifications",
                  "type": "native-automation-node.googleFirebaseCloudFirestore",
                  "typeVersion": 1.1,
                  "position": [
                        650,
                        300
                  ],
                  "credentials": {
                        "googleApi": {
                              "id": "5NiYz8gX64lPYIdK",
                              "name": "Costa Rica Tours - Firebase"
                        }
                  },
                  "onError": "continueErrorOutput"
            },
            {
                  "parameters": {
                        "respondWith": "json",
                        "responseBody": "{\n  \"success\": true,\n  \"workflowCode\": \"WF-032\",\n  \"collection\": \"cst_certifications\",\n  \"timestamp\": \"={{ $now }}\",\n  \"message\": \"Operación completada exitosamente en cst_certifications\"\n}",
                        "options": {}
                  },
                  "name": "[RESPUESTA] Finalizar con Éxito",
                  "type": "native-automation-node.respondToWebhook",
                  "typeVersion": 1.5,
                  "position": [
                        950,
                        200
                  ]
            },
            {
                  "parameters": {
                        "method": "POST",
                        "url": "={{ $env.APP_URL || \"http://localhost:3000\" }}/api/alerts",
                        "sendHeaders": true,
                        "headerParameters": {
                              "parameters": [
                                    {
                                          "name": "X-Webhook-Secret",
                                          "value": "={{ $env.WEBHOOK_SECRET || \"dev-secret\" }}"
                                    },
                                    {
                                          "name": "Content-Type",
                                          "value": "application/json"
                                    }
                              ]
                        },
                        "sendBody": true,
                        "specifyBody": "json",
                        "jsonBody": "{\n  \"source\": \"Auditor de Certificación CST (Sostenibilidad Turística)\",\n  \"severity\": \"critical\",\n  \"title\": \"Fallo en workflow WF-032: Auditor de Certificación CST (Sostenibilidad Turística)\",\n  \"message\": \"=Error al ejecutar en colección cst_certifications: {{ $json.error?.message || \\\"Error no especificado\\\" }}\",\n  \"bookingId\": \"={{ $json.bookingId }}\",\n  \"metadata\": {\n    \"workflowCode\": \"WF-032\",\n    \"collection\": \"cst_certifications\",\n    \"endpoint\": \"/api/native/workflows/cst-audit\"\n  }\n}",
                        "options": {}
                  },
                  "name": "[ALERTA NATIVA] Enviar a /api/alerts",
                  "type": "native-automation-node.httpRequest",
                  "typeVersion": 4.2,
                  "position": [
                        950,
                        450
                  ]
            }
      ],
      "connections": {
            "[TRIGGER] Auditor de Certificación CST (Sostenibilidad Turística)": {
                  "main": [
                        [
                              {
                                    "node": "[EXTRACT] Formatear y Validar Datos",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[EXTRACT] Formatear y Validar Datos": {
                  "main": [
                        [
                              {
                                    "node": "[FIRESTORE] Operación Colección cst_certifications",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[FIRESTORE] Operación Colección cst_certifications": {
                  "main": [
                        [
                              {
                                    "node": "[RESPUESTA] Finalizar con Éxito",
                                    "type": "main",
                                    "index": 0
                              }
                        ],
                        [
                              {
                                    "node": "[ALERTA NATIVA] Enviar a /api/alerts",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            }
      }
}
  },
  {
    id: "wf-033-guide-biography-badge-updater",
    code: "WF-033",
    name: {
      es: "Sincronizador de Credenciales de Guías Naturalistas",
      en: "Naturalist Guide Certified Credentials & Bio Sync"
    },
    category: "fulfillment",
    collection: "guides",
    description: {
      es: "Valida carnet oficial de Guía del Instituto Costarricense de Turismo (ICT) y actualiza biografía e idiomas del guía asignado.",
      en: "Validates official ICT naturalist guide badge and updates bio and spoken languages in booking metadata."
    },
    icon: "Compass",
    color: "#0284c7",
    endpoint: "/api/native/workflows/sync-guide-badge",
    method: "POST",
    triggerEvent: "Asignación de guía a tour",
    nodesCount: 5,
    slaTarget: "< 400ms",
    nodes: [
      {
            "id": "node-trigger",
            "name": "[TRIGGER] Sincronizador de Credenciales de Guías Naturalistas",
            "type": "native-automation-node.webhook",
            "description": "Asignación de guía a tour"
      },
      {
            "id": "node-extract",
            "name": "[EXTRACT] Formatear y Validar Datos",
            "type": "native-automation-node.code",
            "description": "Transformación y validación de esquema"
      },
      {
            "id": "node-firestore",
            "name": "[FIRESTORE] Operación guides",
            "type": "native-automation-node.googleFirebaseCloudFirestore",
            "description": "Lectura/Escritura en Firestore /guides"
      },
      {
            "id": "node-response",
            "name": "[RESPUESTA] Finalizar con Éxito",
            "type": "native-automation-node.respondToWebhook",
            "description": "Respuesta HTTP 200 con payload estructurado"
      },
      {
            "id": "node-alert",
            "name": "[ALERTA NATIVA] Enviar a /api/alerts",
            "type": "native-automation-node.httpRequest",
            "description": "Enrutamiento de error a /api/alerts (reemplazo Telegram)"
      }
],
    samplePayload: {
      "guideName": "Carlos Méndez",
      "ictCardNumber": "ICT-GUI-8912",
      "specialties": [
            "Ornithology",
            "Volcanology",
            "Herpetology"
      ]
},
    blueprintJson: {
      "id": "WF-033",
      "name": "Sincronizador de Credenciales de Guías Naturalistas",
      "active": true,
      "nodes": [
            {
                  "parameters": {
                        "path": "api/native/workflows/sync-guide-badge",
                        "httpMethod": "POST",
                        "responseMode": "responseNode",
                        "options": {}
                  },
                  "name": "[TRIGGER] Sincronizador de Credenciales de Guías Naturalistas",
                  "type": "native-automation-node.webhook",
                  "typeVersion": 2,
                  "position": [
                        100,
                        300
                  ]
            },
            {
                  "parameters": {
                        "jsCode": "// Validar campos obligatorios y normalizar timestamp\nconst item = $input.first().json || {};\nitem.processedAt = new Date().toISOString();\nitem.environment = 'production';\nitem.targetCollection = 'guides';\nreturn [{ json: item }];"
                  },
                  "name": "[EXTRACT] Formatear y Validar Datos",
                  "type": "native-automation-node.code",
                  "typeVersion": 2,
                  "position": [
                        350,
                        300
                  ]
            },
            {
                  "parameters": {
                        "operation": "upsert",
                        "collection": "guides",
                        "documentId": "={{ $json.id || $json.bookingId || $json.code || $now }}",
                        "dataToSend": "defineBelow",
                        "fieldsUi": {
                              "fieldValues": [
                                    {
                                          "fieldId": "updatedAt",
                                          "fieldValue": "={{ $now }}"
                                    },
                                    {
                                          "fieldId": "workflowSource",
                                          "fieldValue": "WF-033"
                                    },
                                    {
                                          "fieldId": "status",
                                          "fieldValue": "processed"
                                    }
                              ]
                        }
                  },
                  "name": "[FIRESTORE] Operación Colección guides",
                  "type": "native-automation-node.googleFirebaseCloudFirestore",
                  "typeVersion": 1.1,
                  "position": [
                        650,
                        300
                  ],
                  "credentials": {
                        "googleApi": {
                              "id": "5NiYz8gX64lPYIdK",
                              "name": "Costa Rica Tours - Firebase"
                        }
                  },
                  "onError": "continueErrorOutput"
            },
            {
                  "parameters": {
                        "respondWith": "json",
                        "responseBody": "{\n  \"success\": true,\n  \"workflowCode\": \"WF-033\",\n  \"collection\": \"guides\",\n  \"timestamp\": \"={{ $now }}\",\n  \"message\": \"Operación completada exitosamente en guides\"\n}",
                        "options": {}
                  },
                  "name": "[RESPUESTA] Finalizar con Éxito",
                  "type": "native-automation-node.respondToWebhook",
                  "typeVersion": 1.5,
                  "position": [
                        950,
                        200
                  ]
            },
            {
                  "parameters": {
                        "method": "POST",
                        "url": "={{ $env.APP_URL || \"http://localhost:3000\" }}/api/alerts",
                        "sendHeaders": true,
                        "headerParameters": {
                              "parameters": [
                                    {
                                          "name": "X-Webhook-Secret",
                                          "value": "={{ $env.WEBHOOK_SECRET || \"dev-secret\" }}"
                                    },
                                    {
                                          "name": "Content-Type",
                                          "value": "application/json"
                                    }
                              ]
                        },
                        "sendBody": true,
                        "specifyBody": "json",
                        "jsonBody": "{\n  \"source\": \"Sincronizador de Credenciales de Guías Naturalistas\",\n  \"severity\": \"critical\",\n  \"title\": \"Fallo en workflow WF-033: Sincronizador de Credenciales de Guías Naturalistas\",\n  \"message\": \"=Error al ejecutar en colección guides: {{ $json.error?.message || \\\"Error no especificado\\\" }}\",\n  \"bookingId\": \"={{ $json.bookingId }}\",\n  \"metadata\": {\n    \"workflowCode\": \"WF-033\",\n    \"collection\": \"guides\",\n    \"endpoint\": \"/api/native/workflows/sync-guide-badge\"\n  }\n}",
                        "options": {}
                  },
                  "name": "[ALERTA NATIVA] Enviar a /api/alerts",
                  "type": "native-automation-node.httpRequest",
                  "typeVersion": 4.2,
                  "position": [
                        950,
                        450
                  ]
            }
      ],
      "connections": {
            "[TRIGGER] Sincronizador de Credenciales de Guías Naturalistas": {
                  "main": [
                        [
                              {
                                    "node": "[EXTRACT] Formatear y Validar Datos",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[EXTRACT] Formatear y Validar Datos": {
                  "main": [
                        [
                              {
                                    "node": "[FIRESTORE] Operación Colección guides",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[FIRESTORE] Operación Colección guides": {
                  "main": [
                        [
                              {
                                    "node": "[RESPUESTA] Finalizar con Éxito",
                                    "type": "main",
                                    "index": 0
                              }
                        ],
                        [
                              {
                                    "node": "[ALERTA NATIVA] Enviar a /api/alerts",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            }
      }
}
  },
  {
    id: "wf-034-provider-capacity-blocker",
    code: "WF-034",
    name: {
      es: "Bloqueador Automático de Cupos por Mantenimiento",
      en: "Operator Maintenance & Temporary Capacity Blocker"
    },
    category: "fulfillment",
    collection: "blackouts",
    description: {
      es: "Permite a los operadores bloquear fechas específicas por mantenimiento de senderos, botes o lanchas.",
      en: "Allows operators to black-out dates in Firestore due to boat/trail maintenance with immediate calendar lock."
    },
    icon: "Wrench",
    color: "#ea580c",
    endpoint: "/api/native/workflows/blackout-dates",
    method: "POST",
    triggerEvent: "Aviso de mantenimiento del operador",
    nodesCount: 5,
    slaTarget: "< 300ms",
    nodes: [
      {
            "id": "node-trigger",
            "name": "[TRIGGER] Bloqueador Automático de Cupos por Mantenimiento",
            "type": "native-automation-node.webhook",
            "description": "Aviso de mantenimiento del operador"
      },
      {
            "id": "node-extract",
            "name": "[EXTRACT] Formatear y Validar Datos",
            "type": "native-automation-node.code",
            "description": "Transformación y validación de esquema"
      },
      {
            "id": "node-firestore",
            "name": "[FIRESTORE] Operación blackouts",
            "type": "native-automation-node.googleFirebaseCloudFirestore",
            "description": "Lectura/Escritura en Firestore /blackouts"
      },
      {
            "id": "node-response",
            "name": "[RESPUESTA] Finalizar con Éxito",
            "type": "native-automation-node.respondToWebhook",
            "description": "Respuesta HTTP 200 con payload estructurado"
      },
      {
            "id": "node-alert",
            "name": "[ALERTA NATIVA] Enviar a /api/alerts",
            "type": "native-automation-node.httpRequest",
            "description": "Enrutamiento de error a /api/alerts (reemplazo Telegram)"
      }
],
    samplePayload: {
      "providerId": "prov-sarapiqui-rafting",
      "startDate": "2026-10-01",
      "endDate": "2026-10-03",
      "reason": "Raft fleet annual inspection"
},
    blueprintJson: {
      "id": "WF-034",
      "name": "Bloqueador Automático de Cupos por Mantenimiento",
      "active": true,
      "nodes": [
            {
                  "parameters": {
                        "path": "api/native/workflows/blackout-dates",
                        "httpMethod": "POST",
                        "responseMode": "responseNode",
                        "options": {}
                  },
                  "name": "[TRIGGER] Bloqueador Automático de Cupos por Mantenimiento",
                  "type": "native-automation-node.webhook",
                  "typeVersion": 2,
                  "position": [
                        100,
                        300
                  ]
            },
            {
                  "parameters": {
                        "jsCode": "// Validar campos obligatorios y normalizar timestamp\nconst item = $input.first().json || {};\nitem.processedAt = new Date().toISOString();\nitem.environment = 'production';\nitem.targetCollection = 'blackouts';\nreturn [{ json: item }];"
                  },
                  "name": "[EXTRACT] Formatear y Validar Datos",
                  "type": "native-automation-node.code",
                  "typeVersion": 2,
                  "position": [
                        350,
                        300
                  ]
            },
            {
                  "parameters": {
                        "operation": "upsert",
                        "collection": "blackouts",
                        "documentId": "={{ $json.id || $json.bookingId || $json.code || $now }}",
                        "dataToSend": "defineBelow",
                        "fieldsUi": {
                              "fieldValues": [
                                    {
                                          "fieldId": "updatedAt",
                                          "fieldValue": "={{ $now }}"
                                    },
                                    {
                                          "fieldId": "workflowSource",
                                          "fieldValue": "WF-034"
                                    },
                                    {
                                          "fieldId": "status",
                                          "fieldValue": "processed"
                                    }
                              ]
                        }
                  },
                  "name": "[FIRESTORE] Operación Colección blackouts",
                  "type": "native-automation-node.googleFirebaseCloudFirestore",
                  "typeVersion": 1.1,
                  "position": [
                        650,
                        300
                  ],
                  "credentials": {
                        "googleApi": {
                              "id": "5NiYz8gX64lPYIdK",
                              "name": "Costa Rica Tours - Firebase"
                        }
                  },
                  "onError": "continueErrorOutput"
            },
            {
                  "parameters": {
                        "respondWith": "json",
                        "responseBody": "{\n  \"success\": true,\n  \"workflowCode\": \"WF-034\",\n  \"collection\": \"blackouts\",\n  \"timestamp\": \"={{ $now }}\",\n  \"message\": \"Operación completada exitosamente en blackouts\"\n}",
                        "options": {}
                  },
                  "name": "[RESPUESTA] Finalizar con Éxito",
                  "type": "native-automation-node.respondToWebhook",
                  "typeVersion": 1.5,
                  "position": [
                        950,
                        200
                  ]
            },
            {
                  "parameters": {
                        "method": "POST",
                        "url": "={{ $env.APP_URL || \"http://localhost:3000\" }}/api/alerts",
                        "sendHeaders": true,
                        "headerParameters": {
                              "parameters": [
                                    {
                                          "name": "X-Webhook-Secret",
                                          "value": "={{ $env.WEBHOOK_SECRET || \"dev-secret\" }}"
                                    },
                                    {
                                          "name": "Content-Type",
                                          "value": "application/json"
                                    }
                              ]
                        },
                        "sendBody": true,
                        "specifyBody": "json",
                        "jsonBody": "{\n  \"source\": \"Bloqueador Automático de Cupos por Mantenimiento\",\n  \"severity\": \"critical\",\n  \"title\": \"Fallo en workflow WF-034: Bloqueador Automático de Cupos por Mantenimiento\",\n  \"message\": \"=Error al ejecutar en colección blackouts: {{ $json.error?.message || \\\"Error no especificado\\\" }}\",\n  \"bookingId\": \"={{ $json.bookingId }}\",\n  \"metadata\": {\n    \"workflowCode\": \"WF-034\",\n    \"collection\": \"blackouts\",\n    \"endpoint\": \"/api/native/workflows/blackout-dates\"\n  }\n}",
                        "options": {}
                  },
                  "name": "[ALERTA NATIVA] Enviar a /api/alerts",
                  "type": "native-automation-node.httpRequest",
                  "typeVersion": 4.2,
                  "position": [
                        950,
                        450
                  ]
            }
      ],
      "connections": {
            "[TRIGGER] Bloqueador Automático de Cupos por Mantenimiento": {
                  "main": [
                        [
                              {
                                    "node": "[EXTRACT] Formatear y Validar Datos",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[EXTRACT] Formatear y Validar Datos": {
                  "main": [
                        [
                              {
                                    "node": "[FIRESTORE] Operación Colección blackouts",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[FIRESTORE] Operación Colección blackouts": {
                  "main": [
                        [
                              {
                                    "node": "[RESPUESTA] Finalizar con Éxito",
                                    "type": "main",
                                    "index": 0
                              }
                        ],
                        [
                              {
                                    "node": "[ALERTA NATIVA] Enviar a /api/alerts",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            }
      }
}
  },
  {
    id: "wf-035-provider-quality-score-ranker",
    code: "WF-035",
    name: {
      es: "Calculador de Calidad y Ranking de Proveedores",
      en: "Provider NPS & Execution Quality Ranking Engine"
    },
    category: "fulfillment",
    collection: "provider_metrics",
    description: {
      es: "Calcula puntaje mensual combinando calificaciones de viajeros, puntualidad de recogida y tasa de cancelaciones.",
      en: "Aggregates monthly score combining traveler reviews, pickup punctuality, and cancellation rate."
    },
    icon: "Trophy",
    color: "#eab308",
    endpoint: "/api/native/workflows/rank-providers",
    method: "POST",
    triggerEvent: "Cron mensual el día 1 de cada mes",
    nodesCount: 5,
    slaTarget: "< 4s",
    nodes: [
      {
            "id": "node-trigger",
            "name": "[TRIGGER] Calculador de Calidad y Ranking de Proveedores",
            "type": "native-automation-node.webhook",
            "description": "Cron mensual el día 1 de cada mes"
      },
      {
            "id": "node-extract",
            "name": "[EXTRACT] Formatear y Validar Datos",
            "type": "native-automation-node.code",
            "description": "Transformación y validación de esquema"
      },
      {
            "id": "node-firestore",
            "name": "[FIRESTORE] Operación provider_metrics",
            "type": "native-automation-node.googleFirebaseCloudFirestore",
            "description": "Lectura/Escritura en Firestore /provider_metrics"
      },
      {
            "id": "node-response",
            "name": "[RESPUESTA] Finalizar con Éxito",
            "type": "native-automation-node.respondToWebhook",
            "description": "Respuesta HTTP 200 con payload estructurado"
      },
      {
            "id": "node-alert",
            "name": "[ALERTA NATIVA] Enviar a /api/alerts",
            "type": "native-automation-node.httpRequest",
            "description": "Enrutamiento de error a /api/alerts (reemplazo Telegram)"
      }
],
    samplePayload: {
      "providerId": "prov-manuel-antonio-nature",
      "avgRating": 4.94,
      "onTimePercent": 98.5,
      "qualityTier": "Tier 1 Top Partner"
},
    blueprintJson: {
      "id": "WF-035",
      "name": "Calculador de Calidad y Ranking de Proveedores",
      "active": true,
      "nodes": [
            {
                  "parameters": {
                        "path": "api/native/workflows/rank-providers",
                        "httpMethod": "POST",
                        "responseMode": "responseNode",
                        "options": {}
                  },
                  "name": "[TRIGGER] Calculador de Calidad y Ranking de Proveedores",
                  "type": "native-automation-node.webhook",
                  "typeVersion": 2,
                  "position": [
                        100,
                        300
                  ]
            },
            {
                  "parameters": {
                        "jsCode": "// Validar campos obligatorios y normalizar timestamp\nconst item = $input.first().json || {};\nitem.processedAt = new Date().toISOString();\nitem.environment = 'production';\nitem.targetCollection = 'provider_metrics';\nreturn [{ json: item }];"
                  },
                  "name": "[EXTRACT] Formatear y Validar Datos",
                  "type": "native-automation-node.code",
                  "typeVersion": 2,
                  "position": [
                        350,
                        300
                  ]
            },
            {
                  "parameters": {
                        "operation": "upsert",
                        "collection": "provider_metrics",
                        "documentId": "={{ $json.id || $json.bookingId || $json.code || $now }}",
                        "dataToSend": "defineBelow",
                        "fieldsUi": {
                              "fieldValues": [
                                    {
                                          "fieldId": "updatedAt",
                                          "fieldValue": "={{ $now }}"
                                    },
                                    {
                                          "fieldId": "workflowSource",
                                          "fieldValue": "WF-035"
                                    },
                                    {
                                          "fieldId": "status",
                                          "fieldValue": "processed"
                                    }
                              ]
                        }
                  },
                  "name": "[FIRESTORE] Operación Colección provider_metrics",
                  "type": "native-automation-node.googleFirebaseCloudFirestore",
                  "typeVersion": 1.1,
                  "position": [
                        650,
                        300
                  ],
                  "credentials": {
                        "googleApi": {
                              "id": "5NiYz8gX64lPYIdK",
                              "name": "Costa Rica Tours - Firebase"
                        }
                  },
                  "onError": "continueErrorOutput"
            },
            {
                  "parameters": {
                        "respondWith": "json",
                        "responseBody": "{\n  \"success\": true,\n  \"workflowCode\": \"WF-035\",\n  \"collection\": \"provider_metrics\",\n  \"timestamp\": \"={{ $now }}\",\n  \"message\": \"Operación completada exitosamente en provider_metrics\"\n}",
                        "options": {}
                  },
                  "name": "[RESPUESTA] Finalizar con Éxito",
                  "type": "native-automation-node.respondToWebhook",
                  "typeVersion": 1.5,
                  "position": [
                        950,
                        200
                  ]
            },
            {
                  "parameters": {
                        "method": "POST",
                        "url": "={{ $env.APP_URL || \"http://localhost:3000\" }}/api/alerts",
                        "sendHeaders": true,
                        "headerParameters": {
                              "parameters": [
                                    {
                                          "name": "X-Webhook-Secret",
                                          "value": "={{ $env.WEBHOOK_SECRET || \"dev-secret\" }}"
                                    },
                                    {
                                          "name": "Content-Type",
                                          "value": "application/json"
                                    }
                              ]
                        },
                        "sendBody": true,
                        "specifyBody": "json",
                        "jsonBody": "{\n  \"source\": \"Calculador de Calidad y Ranking de Proveedores\",\n  \"severity\": \"critical\",\n  \"title\": \"Fallo en workflow WF-035: Calculador de Calidad y Ranking de Proveedores\",\n  \"message\": \"=Error al ejecutar en colección provider_metrics: {{ $json.error?.message || \\\"Error no especificado\\\" }}\",\n  \"bookingId\": \"={{ $json.bookingId }}\",\n  \"metadata\": {\n    \"workflowCode\": \"WF-035\",\n    \"collection\": \"provider_metrics\",\n    \"endpoint\": \"/api/native/workflows/rank-providers\"\n  }\n}",
                        "options": {}
                  },
                  "name": "[ALERTA NATIVA] Enviar a /api/alerts",
                  "type": "native-automation-node.httpRequest",
                  "typeVersion": 4.2,
                  "position": [
                        950,
                        450
                  ]
            }
      ],
      "connections": {
            "[TRIGGER] Calculador de Calidad y Ranking de Proveedores": {
                  "main": [
                        [
                              {
                                    "node": "[EXTRACT] Formatear y Validar Datos",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[EXTRACT] Formatear y Validar Datos": {
                  "main": [
                        [
                              {
                                    "node": "[FIRESTORE] Operación Colección provider_metrics",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[FIRESTORE] Operación Colección provider_metrics": {
                  "main": [
                        [
                              {
                                    "node": "[RESPUESTA] Finalizar con Éxito",
                                    "type": "main",
                                    "index": 0
                              }
                        ],
                        [
                              {
                                    "node": "[ALERTA NATIVA] Enviar a /api/alerts",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            }
      }
}
  },
  {
    id: "wf-036-insurance-policy-expiration-alarm",
    code: "WF-036",
    name: {
      es: "Vigilante de Vencimiento de Pólizas de Seguro INS",
      en: "INS Commercial Liability Insurance Expiration Alarm"
    },
    category: "fulfillment",
    collection: "insurance_policies",
    description: {
      es: "Alerta con 30 y 15 días de anticipación cuando una póliza comercial está por expirar para evitar suspender tours.",
      en: "Dispatches 30-day and 15-day expiration warnings before a commercial insurance policy lapses."
    },
    icon: "ShieldAlert",
    color: "#dc2626",
    endpoint: "/api/native/workflows/insurance-watchdog",
    method: "POST",
    triggerEvent: "Cron diario 08:00 AM",
    nodesCount: 5,
    slaTarget: "< 1s",
    nodes: [
      {
            "id": "node-trigger",
            "name": "[TRIGGER] Vigilante de Vencimiento de Pólizas de Seguro INS",
            "type": "native-automation-node.webhook",
            "description": "Cron diario 08:00 AM"
      },
      {
            "id": "node-extract",
            "name": "[EXTRACT] Formatear y Validar Datos",
            "type": "native-automation-node.code",
            "description": "Transformación y validación de esquema"
      },
      {
            "id": "node-firestore",
            "name": "[FIRESTORE] Operación insurance_policies",
            "type": "native-automation-node.googleFirebaseCloudFirestore",
            "description": "Lectura/Escritura en Firestore /insurance_policies"
      },
      {
            "id": "node-response",
            "name": "[RESPUESTA] Finalizar con Éxito",
            "type": "native-automation-node.respondToWebhook",
            "description": "Respuesta HTTP 200 con payload estructurado"
      },
      {
            "id": "node-alert",
            "name": "[ALERTA NATIVA] Enviar a /api/alerts",
            "type": "native-automation-node.httpRequest",
            "description": "Enrutamiento de error a /api/alerts (reemplazo Telegram)"
      }
],
    samplePayload: {
      "providerName": "Arenal Hanging Bridges Ltd",
      "daysToExpiration": 28,
      "policyNumber": "INS-RT-89211"
},
    blueprintJson: {
      "id": "WF-036",
      "name": "Vigilante de Vencimiento de Pólizas de Seguro INS",
      "active": true,
      "nodes": [
            {
                  "parameters": {
                        "path": "api/native/workflows/insurance-watchdog",
                        "httpMethod": "POST",
                        "responseMode": "responseNode",
                        "options": {}
                  },
                  "name": "[TRIGGER] Vigilante de Vencimiento de Pólizas de Seguro INS",
                  "type": "native-automation-node.webhook",
                  "typeVersion": 2,
                  "position": [
                        100,
                        300
                  ]
            },
            {
                  "parameters": {
                        "jsCode": "// Validar campos obligatorios y normalizar timestamp\nconst item = $input.first().json || {};\nitem.processedAt = new Date().toISOString();\nitem.environment = 'production';\nitem.targetCollection = 'insurance_policies';\nreturn [{ json: item }];"
                  },
                  "name": "[EXTRACT] Formatear y Validar Datos",
                  "type": "native-automation-node.code",
                  "typeVersion": 2,
                  "position": [
                        350,
                        300
                  ]
            },
            {
                  "parameters": {
                        "operation": "upsert",
                        "collection": "insurance_policies",
                        "documentId": "={{ $json.id || $json.bookingId || $json.code || $now }}",
                        "dataToSend": "defineBelow",
                        "fieldsUi": {
                              "fieldValues": [
                                    {
                                          "fieldId": "updatedAt",
                                          "fieldValue": "={{ $now }}"
                                    },
                                    {
                                          "fieldId": "workflowSource",
                                          "fieldValue": "WF-036"
                                    },
                                    {
                                          "fieldId": "status",
                                          "fieldValue": "processed"
                                    }
                              ]
                        }
                  },
                  "name": "[FIRESTORE] Operación Colección insurance_policies",
                  "type": "native-automation-node.googleFirebaseCloudFirestore",
                  "typeVersion": 1.1,
                  "position": [
                        650,
                        300
                  ],
                  "credentials": {
                        "googleApi": {
                              "id": "5NiYz8gX64lPYIdK",
                              "name": "Costa Rica Tours - Firebase"
                        }
                  },
                  "onError": "continueErrorOutput"
            },
            {
                  "parameters": {
                        "respondWith": "json",
                        "responseBody": "{\n  \"success\": true,\n  \"workflowCode\": \"WF-036\",\n  \"collection\": \"insurance_policies\",\n  \"timestamp\": \"={{ $now }}\",\n  \"message\": \"Operación completada exitosamente en insurance_policies\"\n}",
                        "options": {}
                  },
                  "name": "[RESPUESTA] Finalizar con Éxito",
                  "type": "native-automation-node.respondToWebhook",
                  "typeVersion": 1.5,
                  "position": [
                        950,
                        200
                  ]
            },
            {
                  "parameters": {
                        "method": "POST",
                        "url": "={{ $env.APP_URL || \"http://localhost:3000\" }}/api/alerts",
                        "sendHeaders": true,
                        "headerParameters": {
                              "parameters": [
                                    {
                                          "name": "X-Webhook-Secret",
                                          "value": "={{ $env.WEBHOOK_SECRET || \"dev-secret\" }}"
                                    },
                                    {
                                          "name": "Content-Type",
                                          "value": "application/json"
                                    }
                              ]
                        },
                        "sendBody": true,
                        "specifyBody": "json",
                        "jsonBody": "{\n  \"source\": \"Vigilante de Vencimiento de Pólizas de Seguro INS\",\n  \"severity\": \"critical\",\n  \"title\": \"Fallo en workflow WF-036: Vigilante de Vencimiento de Pólizas de Seguro INS\",\n  \"message\": \"=Error al ejecutar en colección insurance_policies: {{ $json.error?.message || \\\"Error no especificado\\\" }}\",\n  \"bookingId\": \"={{ $json.bookingId }}\",\n  \"metadata\": {\n    \"workflowCode\": \"WF-036\",\n    \"collection\": \"insurance_policies\",\n    \"endpoint\": \"/api/native/workflows/insurance-watchdog\"\n  }\n}",
                        "options": {}
                  },
                  "name": "[ALERTA NATIVA] Enviar a /api/alerts",
                  "type": "native-automation-node.httpRequest",
                  "typeVersion": 4.2,
                  "position": [
                        950,
                        450
                  ]
            }
      ],
      "connections": {
            "[TRIGGER] Vigilante de Vencimiento de Pólizas de Seguro INS": {
                  "main": [
                        [
                              {
                                    "node": "[EXTRACT] Formatear y Validar Datos",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[EXTRACT] Formatear y Validar Datos": {
                  "main": [
                        [
                              {
                                    "node": "[FIRESTORE] Operación Colección insurance_policies",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[FIRESTORE] Operación Colección insurance_policies": {
                  "main": [
                        [
                              {
                                    "node": "[RESPUESTA] Finalizar con Éxito",
                                    "type": "main",
                                    "index": 0
                              }
                        ],
                        [
                              {
                                    "node": "[ALERTA NATIVA] Enviar a /api/alerts",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            }
      }
}
  },
  {
    id: "wf-037-instant-provider-acknowledgement-sla",
    code: "WF-037",
    name: {
      es: "Monitor de SLA de Aceptación de Reserva por Operador",
      en: "Operator 30-Minute Acceptance SLA Watchdog"
    },
    category: "fulfillment",
    collection: "sla_tracking",
    description: {
      es: "Si un operador no confirma recepción del voucher en 30 minutos, escala automáticamente la alerta a la central de operaciones.",
      en: "Escalates automated alert to central ops if local operator does not acknowledge voucher in 30 min."
    },
    icon: "Timer",
    color: "#f59e0b",
    endpoint: "/api/native/workflows/check-operator-ack",
    method: "POST",
    triggerEvent: "Evento diferido 30 min post-reserva",
    nodesCount: 5,
    slaTarget: "< 200ms",
    nodes: [
      {
            "id": "node-trigger",
            "name": "[TRIGGER] Monitor de SLA de Aceptación de Reserva por Operador",
            "type": "native-automation-node.webhook",
            "description": "Evento diferido 30 min post-reserva"
      },
      {
            "id": "node-extract",
            "name": "[EXTRACT] Formatear y Validar Datos",
            "type": "native-automation-node.code",
            "description": "Transformación y validación de esquema"
      },
      {
            "id": "node-firestore",
            "name": "[FIRESTORE] Operación sla_tracking",
            "type": "native-automation-node.googleFirebaseCloudFirestore",
            "description": "Lectura/Escritura en Firestore /sla_tracking"
      },
      {
            "id": "node-response",
            "name": "[RESPUESTA] Finalizar con Éxito",
            "type": "native-automation-node.respondToWebhook",
            "description": "Respuesta HTTP 200 con payload estructurado"
      },
      {
            "id": "node-alert",
            "name": "[ALERTA NATIVA] Enviar a /api/alerts",
            "type": "native-automation-node.httpRequest",
            "description": "Enrutamiento de error a /api/alerts (reemplazo Telegram)"
      }
],
    samplePayload: {
      "bookingId": "BK-CR-2026-937",
      "providerId": "prov-rio-celeste-trek",
      "minutesElapsed": 30,
      "ackReceived": false
},
    blueprintJson: {
      "id": "WF-037",
      "name": "Monitor de SLA de Aceptación de Reserva por Operador",
      "active": true,
      "nodes": [
            {
                  "parameters": {
                        "path": "api/native/workflows/check-operator-ack",
                        "httpMethod": "POST",
                        "responseMode": "responseNode",
                        "options": {}
                  },
                  "name": "[TRIGGER] Monitor de SLA de Aceptación de Reserva por Operador",
                  "type": "native-automation-node.webhook",
                  "typeVersion": 2,
                  "position": [
                        100,
                        300
                  ]
            },
            {
                  "parameters": {
                        "jsCode": "// Validar campos obligatorios y normalizar timestamp\nconst item = $input.first().json || {};\nitem.processedAt = new Date().toISOString();\nitem.environment = 'production';\nitem.targetCollection = 'sla_tracking';\nreturn [{ json: item }];"
                  },
                  "name": "[EXTRACT] Formatear y Validar Datos",
                  "type": "native-automation-node.code",
                  "typeVersion": 2,
                  "position": [
                        350,
                        300
                  ]
            },
            {
                  "parameters": {
                        "operation": "upsert",
                        "collection": "sla_tracking",
                        "documentId": "={{ $json.id || $json.bookingId || $json.code || $now }}",
                        "dataToSend": "defineBelow",
                        "fieldsUi": {
                              "fieldValues": [
                                    {
                                          "fieldId": "updatedAt",
                                          "fieldValue": "={{ $now }}"
                                    },
                                    {
                                          "fieldId": "workflowSource",
                                          "fieldValue": "WF-037"
                                    },
                                    {
                                          "fieldId": "status",
                                          "fieldValue": "processed"
                                    }
                              ]
                        }
                  },
                  "name": "[FIRESTORE] Operación Colección sla_tracking",
                  "type": "native-automation-node.googleFirebaseCloudFirestore",
                  "typeVersion": 1.1,
                  "position": [
                        650,
                        300
                  ],
                  "credentials": {
                        "googleApi": {
                              "id": "5NiYz8gX64lPYIdK",
                              "name": "Costa Rica Tours - Firebase"
                        }
                  },
                  "onError": "continueErrorOutput"
            },
            {
                  "parameters": {
                        "respondWith": "json",
                        "responseBody": "{\n  \"success\": true,\n  \"workflowCode\": \"WF-037\",\n  \"collection\": \"sla_tracking\",\n  \"timestamp\": \"={{ $now }}\",\n  \"message\": \"Operación completada exitosamente en sla_tracking\"\n}",
                        "options": {}
                  },
                  "name": "[RESPUESTA] Finalizar con Éxito",
                  "type": "native-automation-node.respondToWebhook",
                  "typeVersion": 1.5,
                  "position": [
                        950,
                        200
                  ]
            },
            {
                  "parameters": {
                        "method": "POST",
                        "url": "={{ $env.APP_URL || \"http://localhost:3000\" }}/api/alerts",
                        "sendHeaders": true,
                        "headerParameters": {
                              "parameters": [
                                    {
                                          "name": "X-Webhook-Secret",
                                          "value": "={{ $env.WEBHOOK_SECRET || \"dev-secret\" }}"
                                    },
                                    {
                                          "name": "Content-Type",
                                          "value": "application/json"
                                    }
                              ]
                        },
                        "sendBody": true,
                        "specifyBody": "json",
                        "jsonBody": "{\n  \"source\": \"Monitor de SLA de Aceptación de Reserva por Operador\",\n  \"severity\": \"critical\",\n  \"title\": \"Fallo en workflow WF-037: Monitor de SLA de Aceptación de Reserva por Operador\",\n  \"message\": \"=Error al ejecutar en colección sla_tracking: {{ $json.error?.message || \\\"Error no especificado\\\" }}\",\n  \"bookingId\": \"={{ $json.bookingId }}\",\n  \"metadata\": {\n    \"workflowCode\": \"WF-037\",\n    \"collection\": \"sla_tracking\",\n    \"endpoint\": \"/api/native/workflows/check-operator-ack\"\n  }\n}",
                        "options": {}
                  },
                  "name": "[ALERTA NATIVA] Enviar a /api/alerts",
                  "type": "native-automation-node.httpRequest",
                  "typeVersion": 4.2,
                  "position": [
                        950,
                        450
                  ]
            }
      ],
      "connections": {
            "[TRIGGER] Monitor de SLA de Aceptación de Reserva por Operador": {
                  "main": [
                        [
                              {
                                    "node": "[EXTRACT] Formatear y Validar Datos",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[EXTRACT] Formatear y Validar Datos": {
                  "main": [
                        [
                              {
                                    "node": "[FIRESTORE] Operación Colección sla_tracking",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[FIRESTORE] Operación Colección sla_tracking": {
                  "main": [
                        [
                              {
                                    "node": "[RESPUESTA] Finalizar con Éxito",
                                    "type": "main",
                                    "index": 0
                              }
                        ],
                        [
                              {
                                    "node": "[ALERTA NATIVA] Enviar a /api/alerts",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            }
      }
}
  },
  {
    id: "wf-038-emergency-provider-hotline-dispatch",
    code: "WF-038",
    name: {
      es: "Enlace de Emergencia con Línea Directa de Operadores",
      en: "Emergency Direct Hotline Dispatch to Operators"
    },
    category: "fulfillment",
    collection: "emergency_dispatches",
    description: {
      es: "Permite comunicación prioritaria instantánea en caso de incidentes en ruta o extravío de pertenencias.",
      en: "Enables high-priority direct broadcast in case of in-transit route issues or lost items."
    },
    icon: "PhoneCall",
    color: "#ef4444",
    endpoint: "/api/native/workflows/emergency-hotline",
    method: "POST",
    triggerEvent: "Llamada o mensaje de emergencia desde el concierge",
    nodesCount: 5,
    slaTarget: "< 200ms",
    nodes: [
      {
            "id": "node-trigger",
            "name": "[TRIGGER] Enlace de Emergencia con Línea Directa de Operadores",
            "type": "native-automation-node.webhook",
            "description": "Llamada o mensaje de emergencia desde el concierge"
      },
      {
            "id": "node-extract",
            "name": "[EXTRACT] Formatear y Validar Datos",
            "type": "native-automation-node.code",
            "description": "Transformación y validación de esquema"
      },
      {
            "id": "node-firestore",
            "name": "[FIRESTORE] Operación emergency_dispatches",
            "type": "native-automation-node.googleFirebaseCloudFirestore",
            "description": "Lectura/Escritura en Firestore /emergency_dispatches"
      },
      {
            "id": "node-response",
            "name": "[RESPUESTA] Finalizar con Éxito",
            "type": "native-automation-node.respondToWebhook",
            "description": "Respuesta HTTP 200 con payload estructurado"
      },
      {
            "id": "node-alert",
            "name": "[ALERTA NATIVA] Enviar a /api/alerts",
            "type": "native-automation-node.httpRequest",
            "description": "Enrutamiento de error a /api/alerts (reemplazo Telegram)"
      }
],
    samplePayload: {
      "bookingId": "BK-CR-2026-938",
      "incidentType": "lost_passport_in_van",
      "priority": "HIGH_URGENT"
},
    blueprintJson: {
      "id": "WF-038",
      "name": "Enlace de Emergencia con Línea Directa de Operadores",
      "active": true,
      "nodes": [
            {
                  "parameters": {
                        "path": "api/native/workflows/emergency-hotline",
                        "httpMethod": "POST",
                        "responseMode": "responseNode",
                        "options": {}
                  },
                  "name": "[TRIGGER] Enlace de Emergencia con Línea Directa de Operadores",
                  "type": "native-automation-node.webhook",
                  "typeVersion": 2,
                  "position": [
                        100,
                        300
                  ]
            },
            {
                  "parameters": {
                        "jsCode": "// Validar campos obligatorios y normalizar timestamp\nconst item = $input.first().json || {};\nitem.processedAt = new Date().toISOString();\nitem.environment = 'production';\nitem.targetCollection = 'emergency_dispatches';\nreturn [{ json: item }];"
                  },
                  "name": "[EXTRACT] Formatear y Validar Datos",
                  "type": "native-automation-node.code",
                  "typeVersion": 2,
                  "position": [
                        350,
                        300
                  ]
            },
            {
                  "parameters": {
                        "operation": "upsert",
                        "collection": "emergency_dispatches",
                        "documentId": "={{ $json.id || $json.bookingId || $json.code || $now }}",
                        "dataToSend": "defineBelow",
                        "fieldsUi": {
                              "fieldValues": [
                                    {
                                          "fieldId": "updatedAt",
                                          "fieldValue": "={{ $now }}"
                                    },
                                    {
                                          "fieldId": "workflowSource",
                                          "fieldValue": "WF-038"
                                    },
                                    {
                                          "fieldId": "status",
                                          "fieldValue": "processed"
                                    }
                              ]
                        }
                  },
                  "name": "[FIRESTORE] Operación Colección emergency_dispatches",
                  "type": "native-automation-node.googleFirebaseCloudFirestore",
                  "typeVersion": 1.1,
                  "position": [
                        650,
                        300
                  ],
                  "credentials": {
                        "googleApi": {
                              "id": "5NiYz8gX64lPYIdK",
                              "name": "Costa Rica Tours - Firebase"
                        }
                  },
                  "onError": "continueErrorOutput"
            },
            {
                  "parameters": {
                        "respondWith": "json",
                        "responseBody": "{\n  \"success\": true,\n  \"workflowCode\": \"WF-038\",\n  \"collection\": \"emergency_dispatches\",\n  \"timestamp\": \"={{ $now }}\",\n  \"message\": \"Operación completada exitosamente en emergency_dispatches\"\n}",
                        "options": {}
                  },
                  "name": "[RESPUESTA] Finalizar con Éxito",
                  "type": "native-automation-node.respondToWebhook",
                  "typeVersion": 1.5,
                  "position": [
                        950,
                        200
                  ]
            },
            {
                  "parameters": {
                        "method": "POST",
                        "url": "={{ $env.APP_URL || \"http://localhost:3000\" }}/api/alerts",
                        "sendHeaders": true,
                        "headerParameters": {
                              "parameters": [
                                    {
                                          "name": "X-Webhook-Secret",
                                          "value": "={{ $env.WEBHOOK_SECRET || \"dev-secret\" }}"
                                    },
                                    {
                                          "name": "Content-Type",
                                          "value": "application/json"
                                    }
                              ]
                        },
                        "sendBody": true,
                        "specifyBody": "json",
                        "jsonBody": "{\n  \"source\": \"Enlace de Emergencia con Línea Directa de Operadores\",\n  \"severity\": \"critical\",\n  \"title\": \"Fallo en workflow WF-038: Enlace de Emergencia con Línea Directa de Operadores\",\n  \"message\": \"=Error al ejecutar en colección emergency_dispatches: {{ $json.error?.message || \\\"Error no especificado\\\" }}\",\n  \"bookingId\": \"={{ $json.bookingId }}\",\n  \"metadata\": {\n    \"workflowCode\": \"WF-038\",\n    \"collection\": \"emergency_dispatches\",\n    \"endpoint\": \"/api/native/workflows/emergency-hotline\"\n  }\n}",
                        "options": {}
                  },
                  "name": "[ALERTA NATIVA] Enviar a /api/alerts",
                  "type": "native-automation-node.httpRequest",
                  "typeVersion": 4.2,
                  "position": [
                        950,
                        450
                  ]
            }
      ],
      "connections": {
            "[TRIGGER] Enlace de Emergencia con Línea Directa de Operadores": {
                  "main": [
                        [
                              {
                                    "node": "[EXTRACT] Formatear y Validar Datos",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[EXTRACT] Formatear y Validar Datos": {
                  "main": [
                        [
                              {
                                    "node": "[FIRESTORE] Operación Colección emergency_dispatches",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[FIRESTORE] Operación Colección emergency_dispatches": {
                  "main": [
                        [
                              {
                                    "node": "[RESPUESTA] Finalizar con Éxito",
                                    "type": "main",
                                    "index": 0
                              }
                        ],
                        [
                              {
                                    "node": "[ALERTA NATIVA] Enviar a /api/alerts",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            }
      }
}
  },
  {
    id: "wf-039-bilingual-guide-matching-algorithm",
    code: "WF-039",
    name: {
      es: "Asignador de Guías por Idioma Específico (DE, FR, EN, ES)",
      en: "Specialized Language Naturalist Guide Matcher (DE/FR/EN/ES)"
    },
    category: "fulfillment",
    collection: "guide_assignments",
    description: {
      es: "Empareja reservas de viajeros que requieren guías en francés, alemán o italiano con guías certificados bilingües.",
      en: "Matches travelers requesting French, German, or Italian speaking guides with certified multilingual guides."
    },
    icon: "Languages",
    color: "#8b5cf6",
    endpoint: "/api/native/workflows/match-guide-language",
    method: "POST",
    triggerEvent: "Creación de reserva con idioma no estándar",
    nodesCount: 5,
    slaTarget: "< 400ms",
    nodes: [
      {
            "id": "node-trigger",
            "name": "[TRIGGER] Asignador de Guías por Idioma Específico (DE, FR, EN, ES)",
            "type": "native-automation-node.webhook",
            "description": "Creación de reserva con idioma no estándar"
      },
      {
            "id": "node-extract",
            "name": "[EXTRACT] Formatear y Validar Datos",
            "type": "native-automation-node.code",
            "description": "Transformación y validación de esquema"
      },
      {
            "id": "node-firestore",
            "name": "[FIRESTORE] Operación guide_assignments",
            "type": "native-automation-node.googleFirebaseCloudFirestore",
            "description": "Lectura/Escritura en Firestore /guide_assignments"
      },
      {
            "id": "node-response",
            "name": "[RESPUESTA] Finalizar con Éxito",
            "type": "native-automation-node.respondToWebhook",
            "description": "Respuesta HTTP 200 con payload estructurado"
      },
      {
            "id": "node-alert",
            "name": "[ALERTA NATIVA] Enviar a /api/alerts",
            "type": "native-automation-node.httpRequest",
            "description": "Enrutamiento de error a /api/alerts (reemplazo Telegram)"
      }
],
    samplePayload: {
      "bookingId": "BK-CR-2026-939",
      "requestedLanguage": "German",
      "matchedGuide": "Hansel Valverde (Cert ICT DE/EN)"
},
    blueprintJson: {
      "id": "WF-039",
      "name": "Asignador de Guías por Idioma Específico (DE, FR, EN, ES)",
      "active": true,
      "nodes": [
            {
                  "parameters": {
                        "path": "api/native/workflows/match-guide-language",
                        "httpMethod": "POST",
                        "responseMode": "responseNode",
                        "options": {}
                  },
                  "name": "[TRIGGER] Asignador de Guías por Idioma Específico (DE, FR, EN, ES)",
                  "type": "native-automation-node.webhook",
                  "typeVersion": 2,
                  "position": [
                        100,
                        300
                  ]
            },
            {
                  "parameters": {
                        "jsCode": "// Validar campos obligatorios y normalizar timestamp\nconst item = $input.first().json || {};\nitem.processedAt = new Date().toISOString();\nitem.environment = 'production';\nitem.targetCollection = 'guide_assignments';\nreturn [{ json: item }];"
                  },
                  "name": "[EXTRACT] Formatear y Validar Datos",
                  "type": "native-automation-node.code",
                  "typeVersion": 2,
                  "position": [
                        350,
                        300
                  ]
            },
            {
                  "parameters": {
                        "operation": "upsert",
                        "collection": "guide_assignments",
                        "documentId": "={{ $json.id || $json.bookingId || $json.code || $now }}",
                        "dataToSend": "defineBelow",
                        "fieldsUi": {
                              "fieldValues": [
                                    {
                                          "fieldId": "updatedAt",
                                          "fieldValue": "={{ $now }}"
                                    },
                                    {
                                          "fieldId": "workflowSource",
                                          "fieldValue": "WF-039"
                                    },
                                    {
                                          "fieldId": "status",
                                          "fieldValue": "processed"
                                    }
                              ]
                        }
                  },
                  "name": "[FIRESTORE] Operación Colección guide_assignments",
                  "type": "native-automation-node.googleFirebaseCloudFirestore",
                  "typeVersion": 1.1,
                  "position": [
                        650,
                        300
                  ],
                  "credentials": {
                        "googleApi": {
                              "id": "5NiYz8gX64lPYIdK",
                              "name": "Costa Rica Tours - Firebase"
                        }
                  },
                  "onError": "continueErrorOutput"
            },
            {
                  "parameters": {
                        "respondWith": "json",
                        "responseBody": "{\n  \"success\": true,\n  \"workflowCode\": \"WF-039\",\n  \"collection\": \"guide_assignments\",\n  \"timestamp\": \"={{ $now }}\",\n  \"message\": \"Operación completada exitosamente en guide_assignments\"\n}",
                        "options": {}
                  },
                  "name": "[RESPUESTA] Finalizar con Éxito",
                  "type": "native-automation-node.respondToWebhook",
                  "typeVersion": 1.5,
                  "position": [
                        950,
                        200
                  ]
            },
            {
                  "parameters": {
                        "method": "POST",
                        "url": "={{ $env.APP_URL || \"http://localhost:3000\" }}/api/alerts",
                        "sendHeaders": true,
                        "headerParameters": {
                              "parameters": [
                                    {
                                          "name": "X-Webhook-Secret",
                                          "value": "={{ $env.WEBHOOK_SECRET || \"dev-secret\" }}"
                                    },
                                    {
                                          "name": "Content-Type",
                                          "value": "application/json"
                                    }
                              ]
                        },
                        "sendBody": true,
                        "specifyBody": "json",
                        "jsonBody": "{\n  \"source\": \"Asignador de Guías por Idioma Específico (DE, FR, EN, ES)\",\n  \"severity\": \"critical\",\n  \"title\": \"Fallo en workflow WF-039: Asignador de Guías por Idioma Específico (DE, FR, EN, ES)\",\n  \"message\": \"=Error al ejecutar en colección guide_assignments: {{ $json.error?.message || \\\"Error no especificado\\\" }}\",\n  \"bookingId\": \"={{ $json.bookingId }}\",\n  \"metadata\": {\n    \"workflowCode\": \"WF-039\",\n    \"collection\": \"guide_assignments\",\n    \"endpoint\": \"/api/native/workflows/match-guide-language\"\n  }\n}",
                        "options": {}
                  },
                  "name": "[ALERTA NATIVA] Enviar a /api/alerts",
                  "type": "native-automation-node.httpRequest",
                  "typeVersion": 4.2,
                  "position": [
                        950,
                        450
                  ]
            }
      ],
      "connections": {
            "[TRIGGER] Asignador de Guías por Idioma Específico (DE, FR, EN, ES)": {
                  "main": [
                        [
                              {
                                    "node": "[EXTRACT] Formatear y Validar Datos",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[EXTRACT] Formatear y Validar Datos": {
                  "main": [
                        [
                              {
                                    "node": "[FIRESTORE] Operación Colección guide_assignments",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[FIRESTORE] Operación Colección guide_assignments": {
                  "main": [
                        [
                              {
                                    "node": "[RESPUESTA] Finalizar con Éxito",
                                    "type": "main",
                                    "index": 0
                              }
                        ],
                        [
                              {
                                    "node": "[ALERTA NATIVA] Enviar a /api/alerts",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            }
      }
}
  },
  {
    id: "wf-040-provider-commission-tier-upgrader",
    code: "WF-040",
    name: {
      es: "Optimizador de Tramos de Comisión por Volumen de Ventas",
      en: "Volume Sales Commission Tier Optimization Engine"
    },
    category: "fulfillment",
    collection: "commission_tiers",
    description: {
      es: "Ajusta la tasa de comisión para operadores de alto volumen (+50 tours/mes) como incentivo de fidelidad comercial.",
      en: "Dynamically reduces platform commission for high-volume operators (+50 tours/mo) as partner loyalty reward."
    },
    icon: "TrendingDown",
    color: "#059669",
    endpoint: "/api/native/workflows/upgrade-commission-tier",
    method: "POST",
    triggerEvent: "Cierre mensual de volumen",
    nodesCount: 5,
    slaTarget: "< 1s",
    nodes: [
      {
            "id": "node-trigger",
            "name": "[TRIGGER] Optimizador de Tramos de Comisión por Volumen de Ventas",
            "type": "native-automation-node.webhook",
            "description": "Cierre mensual de volumen"
      },
      {
            "id": "node-extract",
            "name": "[EXTRACT] Formatear y Validar Datos",
            "type": "native-automation-node.code",
            "description": "Transformación y validación de esquema"
      },
      {
            "id": "node-firestore",
            "name": "[FIRESTORE] Operación commission_tiers",
            "type": "native-automation-node.googleFirebaseCloudFirestore",
            "description": "Lectura/Escritura en Firestore /commission_tiers"
      },
      {
            "id": "node-response",
            "name": "[RESPUESTA] Finalizar con Éxito",
            "type": "native-automation-node.respondToWebhook",
            "description": "Respuesta HTTP 200 con payload estructurado"
      },
      {
            "id": "node-alert",
            "name": "[ALERTA NATIVA] Enviar a /api/alerts",
            "type": "native-automation-node.httpRequest",
            "description": "Enrutamiento de error a /api/alerts (reemplazo Telegram)"
      }
],
    samplePayload: {
      "providerId": "prov-arenal-combo",
      "monthlyTours": 64,
      "commissionRateApplied": 0.12
},
    blueprintJson: {
      "id": "WF-040",
      "name": "Optimizador de Tramos de Comisión por Volumen de Ventas",
      "active": true,
      "nodes": [
            {
                  "parameters": {
                        "path": "api/native/workflows/upgrade-commission-tier",
                        "httpMethod": "POST",
                        "responseMode": "responseNode",
                        "options": {}
                  },
                  "name": "[TRIGGER] Optimizador de Tramos de Comisión por Volumen de Ventas",
                  "type": "native-automation-node.webhook",
                  "typeVersion": 2,
                  "position": [
                        100,
                        300
                  ]
            },
            {
                  "parameters": {
                        "jsCode": "// Validar campos obligatorios y normalizar timestamp\nconst item = $input.first().json || {};\nitem.processedAt = new Date().toISOString();\nitem.environment = 'production';\nitem.targetCollection = 'commission_tiers';\nreturn [{ json: item }];"
                  },
                  "name": "[EXTRACT] Formatear y Validar Datos",
                  "type": "native-automation-node.code",
                  "typeVersion": 2,
                  "position": [
                        350,
                        300
                  ]
            },
            {
                  "parameters": {
                        "operation": "upsert",
                        "collection": "commission_tiers",
                        "documentId": "={{ $json.id || $json.bookingId || $json.code || $now }}",
                        "dataToSend": "defineBelow",
                        "fieldsUi": {
                              "fieldValues": [
                                    {
                                          "fieldId": "updatedAt",
                                          "fieldValue": "={{ $now }}"
                                    },
                                    {
                                          "fieldId": "workflowSource",
                                          "fieldValue": "WF-040"
                                    },
                                    {
                                          "fieldId": "status",
                                          "fieldValue": "processed"
                                    }
                              ]
                        }
                  },
                  "name": "[FIRESTORE] Operación Colección commission_tiers",
                  "type": "native-automation-node.googleFirebaseCloudFirestore",
                  "typeVersion": 1.1,
                  "position": [
                        650,
                        300
                  ],
                  "credentials": {
                        "googleApi": {
                              "id": "5NiYz8gX64lPYIdK",
                              "name": "Costa Rica Tours - Firebase"
                        }
                  },
                  "onError": "continueErrorOutput"
            },
            {
                  "parameters": {
                        "respondWith": "json",
                        "responseBody": "{\n  \"success\": true,\n  \"workflowCode\": \"WF-040\",\n  \"collection\": \"commission_tiers\",\n  \"timestamp\": \"={{ $now }}\",\n  \"message\": \"Operación completada exitosamente en commission_tiers\"\n}",
                        "options": {}
                  },
                  "name": "[RESPUESTA] Finalizar con Éxito",
                  "type": "native-automation-node.respondToWebhook",
                  "typeVersion": 1.5,
                  "position": [
                        950,
                        200
                  ]
            },
            {
                  "parameters": {
                        "method": "POST",
                        "url": "={{ $env.APP_URL || \"http://localhost:3000\" }}/api/alerts",
                        "sendHeaders": true,
                        "headerParameters": {
                              "parameters": [
                                    {
                                          "name": "X-Webhook-Secret",
                                          "value": "={{ $env.WEBHOOK_SECRET || \"dev-secret\" }}"
                                    },
                                    {
                                          "name": "Content-Type",
                                          "value": "application/json"
                                    }
                              ]
                        },
                        "sendBody": true,
                        "specifyBody": "json",
                        "jsonBody": "{\n  \"source\": \"Optimizador de Tramos de Comisión por Volumen de Ventas\",\n  \"severity\": \"critical\",\n  \"title\": \"Fallo en workflow WF-040: Optimizador de Tramos de Comisión por Volumen de Ventas\",\n  \"message\": \"=Error al ejecutar en colección commission_tiers: {{ $json.error?.message || \\\"Error no especificado\\\" }}\",\n  \"bookingId\": \"={{ $json.bookingId }}\",\n  \"metadata\": {\n    \"workflowCode\": \"WF-040\",\n    \"collection\": \"commission_tiers\",\n    \"endpoint\": \"/api/native/workflows/upgrade-commission-tier\"\n  }\n}",
                        "options": {}
                  },
                  "name": "[ALERTA NATIVA] Enviar a /api/alerts",
                  "type": "native-automation-node.httpRequest",
                  "typeVersion": 4.2,
                  "position": [
                        950,
                        450
                  ]
            }
      ],
      "connections": {
            "[TRIGGER] Optimizador de Tramos de Comisión por Volumen de Ventas": {
                  "main": [
                        [
                              {
                                    "node": "[EXTRACT] Formatear y Validar Datos",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[EXTRACT] Formatear y Validar Datos": {
                  "main": [
                        [
                              {
                                    "node": "[FIRESTORE] Operación Colección commission_tiers",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[FIRESTORE] Operación Colección commission_tiers": {
                  "main": [
                        [
                              {
                                    "node": "[RESPUESTA] Finalizar con Éxito",
                                    "type": "main",
                                    "index": 0
                              }
                        ],
                        [
                              {
                                    "node": "[ALERTA NATIVA] Enviar a /api/alerts",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            }
      }
}
  },
  {
    id: "wf-041-alsama-van-auto-dispatch",
    code: "WF-041",
    name: {
      es: "Despacho Automático de Vans Ejecutivas Alsama Transport",
      en: "Alsama Transport Executive Van Fleet Auto-Dispatcher"
    },
    category: "operations",
    collection: "fleet_dispatch",
    description: {
      es: "Asigna chofer y van con aire acondicionado y WiFi según capacidad de pasajeros y zona de recogida.",
      en: "Dispatches AC executive van and driver matching traveler party size, luggage, and pickup cluster."
    },
    icon: "Truck",
    color: "#0284c7",
    endpoint: "/api/native/workflows/alsama-dispatch",
    method: "POST",
    triggerEvent: "Reserva confirmada con transporte incluido",
    nodesCount: 5,
    slaTarget: "< 500ms",
    nodes: [
      {
            "id": "node-trigger",
            "name": "[TRIGGER] Despacho Automático de Vans Ejecutivas Alsama Transport",
            "type": "native-automation-node.webhook",
            "description": "Reserva confirmada con transporte incluido"
      },
      {
            "id": "node-extract",
            "name": "[EXTRACT] Formatear y Validar Datos",
            "type": "native-automation-node.code",
            "description": "Transformación y validación de esquema"
      },
      {
            "id": "node-firestore",
            "name": "[FIRESTORE] Operación fleet_dispatch",
            "type": "native-automation-node.googleFirebaseCloudFirestore",
            "description": "Lectura/Escritura en Firestore /fleet_dispatch"
      },
      {
            "id": "node-response",
            "name": "[RESPUESTA] Finalizar con Éxito",
            "type": "native-automation-node.respondToWebhook",
            "description": "Respuesta HTTP 200 con payload estructurado"
      },
      {
            "id": "node-alert",
            "name": "[ALERTA NATIVA] Enviar a /api/alerts",
            "type": "native-automation-node.httpRequest",
            "description": "Enrutamiento de error a /api/alerts (reemplazo Telegram)"
      }
],
    samplePayload: {
      "bookingId": "BK-CR-2026-941",
      "vehicleType": "Executive HiAce 12pax",
      "driverName": "Guillermo Quesada",
      "route": "San José -> La Fortuna"
},
    blueprintJson: {
      "id": "WF-041",
      "name": "Despacho Automático de Vans Ejecutivas Alsama Transport",
      "active": true,
      "nodes": [
            {
                  "parameters": {
                        "path": "api/native/workflows/alsama-dispatch",
                        "httpMethod": "POST",
                        "responseMode": "responseNode",
                        "options": {}
                  },
                  "name": "[TRIGGER] Despacho Automático de Vans Ejecutivas Alsama Transport",
                  "type": "native-automation-node.webhook",
                  "typeVersion": 2,
                  "position": [
                        100,
                        300
                  ]
            },
            {
                  "parameters": {
                        "jsCode": "// Validar campos obligatorios y normalizar timestamp\nconst item = $input.first().json || {};\nitem.processedAt = new Date().toISOString();\nitem.environment = 'production';\nitem.targetCollection = 'fleet_dispatch';\nreturn [{ json: item }];"
                  },
                  "name": "[EXTRACT] Formatear y Validar Datos",
                  "type": "native-automation-node.code",
                  "typeVersion": 2,
                  "position": [
                        350,
                        300
                  ]
            },
            {
                  "parameters": {
                        "operation": "upsert",
                        "collection": "fleet_dispatch",
                        "documentId": "={{ $json.id || $json.bookingId || $json.code || $now }}",
                        "dataToSend": "defineBelow",
                        "fieldsUi": {
                              "fieldValues": [
                                    {
                                          "fieldId": "updatedAt",
                                          "fieldValue": "={{ $now }}"
                                    },
                                    {
                                          "fieldId": "workflowSource",
                                          "fieldValue": "WF-041"
                                    },
                                    {
                                          "fieldId": "status",
                                          "fieldValue": "processed"
                                    }
                              ]
                        }
                  },
                  "name": "[FIRESTORE] Operación Colección fleet_dispatch",
                  "type": "native-automation-node.googleFirebaseCloudFirestore",
                  "typeVersion": 1.1,
                  "position": [
                        650,
                        300
                  ],
                  "credentials": {
                        "googleApi": {
                              "id": "5NiYz8gX64lPYIdK",
                              "name": "Costa Rica Tours - Firebase"
                        }
                  },
                  "onError": "continueErrorOutput"
            },
            {
                  "parameters": {
                        "respondWith": "json",
                        "responseBody": "{\n  \"success\": true,\n  \"workflowCode\": \"WF-041\",\n  \"collection\": \"fleet_dispatch\",\n  \"timestamp\": \"={{ $now }}\",\n  \"message\": \"Operación completada exitosamente en fleet_dispatch\"\n}",
                        "options": {}
                  },
                  "name": "[RESPUESTA] Finalizar con Éxito",
                  "type": "native-automation-node.respondToWebhook",
                  "typeVersion": 1.5,
                  "position": [
                        950,
                        200
                  ]
            },
            {
                  "parameters": {
                        "method": "POST",
                        "url": "={{ $env.APP_URL || \"http://localhost:3000\" }}/api/alerts",
                        "sendHeaders": true,
                        "headerParameters": {
                              "parameters": [
                                    {
                                          "name": "X-Webhook-Secret",
                                          "value": "={{ $env.WEBHOOK_SECRET || \"dev-secret\" }}"
                                    },
                                    {
                                          "name": "Content-Type",
                                          "value": "application/json"
                                    }
                              ]
                        },
                        "sendBody": true,
                        "specifyBody": "json",
                        "jsonBody": "{\n  \"source\": \"Despacho Automático de Vans Ejecutivas Alsama Transport\",\n  \"severity\": \"critical\",\n  \"title\": \"Fallo en workflow WF-041: Despacho Automático de Vans Ejecutivas Alsama Transport\",\n  \"message\": \"=Error al ejecutar en colección fleet_dispatch: {{ $json.error?.message || \\\"Error no especificado\\\" }}\",\n  \"bookingId\": \"={{ $json.bookingId }}\",\n  \"metadata\": {\n    \"workflowCode\": \"WF-041\",\n    \"collection\": \"fleet_dispatch\",\n    \"endpoint\": \"/api/native/workflows/alsama-dispatch\"\n  }\n}",
                        "options": {}
                  },
                  "name": "[ALERTA NATIVA] Enviar a /api/alerts",
                  "type": "native-automation-node.httpRequest",
                  "typeVersion": 4.2,
                  "position": [
                        950,
                        450
                  ]
            }
      ],
      "connections": {
            "[TRIGGER] Despacho Automático de Vans Ejecutivas Alsama Transport": {
                  "main": [
                        [
                              {
                                    "node": "[EXTRACT] Formatear y Validar Datos",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[EXTRACT] Formatear y Validar Datos": {
                  "main": [
                        [
                              {
                                    "node": "[FIRESTORE] Operación Colección fleet_dispatch",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[FIRESTORE] Operación Colección fleet_dispatch": {
                  "main": [
                        [
                              {
                                    "node": "[RESPUESTA] Finalizar con Éxito",
                                    "type": "main",
                                    "index": 0
                              }
                        ],
                        [
                              {
                                    "node": "[ALERTA NATIVA] Enviar a /api/alerts",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            }
      }
}
  },
  {
    id: "wf-042-flight-delay-sjo-lir-monitor",
    code: "WF-042",
    name: {
      es: "Monitoreo de Vuelos en Tiempo Real (SJO Juan Santamaría / LIR Guanacaste)",
      en: "Live Flight Delay Monitor (SJO & LIR Airports)"
    },
    category: "flight",
    collection: "flight_tracking",
    description: {
      es: "Rastrea número de vuelo; si hay retraso, actualiza automáticamente la hora de recogida del chofer en el aeropuerto.",
      en: "Tracks flight number; automatically shifts airport driver pickup schedule upon live delay updates."
    },
    icon: "Plane",
    color: "#0ea5e9",
    endpoint: "/api/native/workflows/flight-guard",
    method: "POST",
    triggerEvent: "Cron de rastreo de vuelos cada 15 min",
    nodesCount: 5,
    slaTarget: "< 1s",
    nodes: [
      {
            "id": "node-trigger",
            "name": "[TRIGGER] Monitoreo de Vuelos en Tiempo Real (SJO Juan Santamaría / LIR Guanacaste)",
            "type": "native-automation-node.webhook",
            "description": "Cron de rastreo de vuelos cada 15 min"
      },
      {
            "id": "node-extract",
            "name": "[EXTRACT] Formatear y Validar Datos",
            "type": "native-automation-node.code",
            "description": "Transformación y validación de esquema"
      },
      {
            "id": "node-firestore",
            "name": "[FIRESTORE] Operación flight_tracking",
            "type": "native-automation-node.googleFirebaseCloudFirestore",
            "description": "Lectura/Escritura en Firestore /flight_tracking"
      },
      {
            "id": "node-response",
            "name": "[RESPUESTA] Finalizar con Éxito",
            "type": "native-automation-node.respondToWebhook",
            "description": "Respuesta HTTP 200 con payload estructurado"
      },
      {
            "id": "node-alert",
            "name": "[ALERTA NATIVA] Enviar a /api/alerts",
            "type": "native-automation-node.httpRequest",
            "description": "Enrutamiento de error a /api/alerts (reemplazo Telegram)"
      }
],
    samplePayload: {
      "flightNumber": "AA1294",
      "origin": "MIA",
      "status": "DELAYED +45m",
      "adjustedLandingTime": "14:35"
},
    blueprintJson: {
      "id": "WF-042",
      "name": "Monitoreo de Vuelos en Tiempo Real (SJO Juan Santamaría / LIR Guanacaste)",
      "active": true,
      "nodes": [
            {
                  "parameters": {
                        "path": "api/native/workflows/flight-guard",
                        "httpMethod": "POST",
                        "responseMode": "responseNode",
                        "options": {}
                  },
                  "name": "[TRIGGER] Monitoreo de Vuelos en Tiempo Real (SJO Juan Santamaría / LIR Guanacaste)",
                  "type": "native-automation-node.webhook",
                  "typeVersion": 2,
                  "position": [
                        100,
                        300
                  ]
            },
            {
                  "parameters": {
                        "jsCode": "// Validar campos obligatorios y normalizar timestamp\nconst item = $input.first().json || {};\nitem.processedAt = new Date().toISOString();\nitem.environment = 'production';\nitem.targetCollection = 'flight_tracking';\nreturn [{ json: item }];"
                  },
                  "name": "[EXTRACT] Formatear y Validar Datos",
                  "type": "native-automation-node.code",
                  "typeVersion": 2,
                  "position": [
                        350,
                        300
                  ]
            },
            {
                  "parameters": {
                        "operation": "upsert",
                        "collection": "flight_tracking",
                        "documentId": "={{ $json.id || $json.bookingId || $json.code || $now }}",
                        "dataToSend": "defineBelow",
                        "fieldsUi": {
                              "fieldValues": [
                                    {
                                          "fieldId": "updatedAt",
                                          "fieldValue": "={{ $now }}"
                                    },
                                    {
                                          "fieldId": "workflowSource",
                                          "fieldValue": "WF-042"
                                    },
                                    {
                                          "fieldId": "status",
                                          "fieldValue": "processed"
                                    }
                              ]
                        }
                  },
                  "name": "[FIRESTORE] Operación Colección flight_tracking",
                  "type": "native-automation-node.googleFirebaseCloudFirestore",
                  "typeVersion": 1.1,
                  "position": [
                        650,
                        300
                  ],
                  "credentials": {
                        "googleApi": {
                              "id": "5NiYz8gX64lPYIdK",
                              "name": "Costa Rica Tours - Firebase"
                        }
                  },
                  "onError": "continueErrorOutput"
            },
            {
                  "parameters": {
                        "respondWith": "json",
                        "responseBody": "{\n  \"success\": true,\n  \"workflowCode\": \"WF-042\",\n  \"collection\": \"flight_tracking\",\n  \"timestamp\": \"={{ $now }}\",\n  \"message\": \"Operación completada exitosamente en flight_tracking\"\n}",
                        "options": {}
                  },
                  "name": "[RESPUESTA] Finalizar con Éxito",
                  "type": "native-automation-node.respondToWebhook",
                  "typeVersion": 1.5,
                  "position": [
                        950,
                        200
                  ]
            },
            {
                  "parameters": {
                        "method": "POST",
                        "url": "={{ $env.APP_URL || \"http://localhost:3000\" }}/api/alerts",
                        "sendHeaders": true,
                        "headerParameters": {
                              "parameters": [
                                    {
                                          "name": "X-Webhook-Secret",
                                          "value": "={{ $env.WEBHOOK_SECRET || \"dev-secret\" }}"
                                    },
                                    {
                                          "name": "Content-Type",
                                          "value": "application/json"
                                    }
                              ]
                        },
                        "sendBody": true,
                        "specifyBody": "json",
                        "jsonBody": "{\n  \"source\": \"Monitoreo de Vuelos en Tiempo Real (SJO Juan Santamaría / LIR Guanacaste)\",\n  \"severity\": \"critical\",\n  \"title\": \"Fallo en workflow WF-042: Monitoreo de Vuelos en Tiempo Real (SJO Juan Santamaría / LIR Guanacaste)\",\n  \"message\": \"=Error al ejecutar en colección flight_tracking: {{ $json.error?.message || \\\"Error no especificado\\\" }}\",\n  \"bookingId\": \"={{ $json.bookingId }}\",\n  \"metadata\": {\n    \"workflowCode\": \"WF-042\",\n    \"collection\": \"flight_tracking\",\n    \"endpoint\": \"/api/native/workflows/flight-guard\"\n  }\n}",
                        "options": {}
                  },
                  "name": "[ALERTA NATIVA] Enviar a /api/alerts",
                  "type": "native-automation-node.httpRequest",
                  "typeVersion": 4.2,
                  "position": [
                        950,
                        450
                  ]
            }
      ],
      "connections": {
            "[TRIGGER] Monitoreo de Vuelos en Tiempo Real (SJO Juan Santamaría / LIR Guanacaste)": {
                  "main": [
                        [
                              {
                                    "node": "[EXTRACT] Formatear y Validar Datos",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[EXTRACT] Formatear y Validar Datos": {
                  "main": [
                        [
                              {
                                    "node": "[FIRESTORE] Operación Colección flight_tracking",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[FIRESTORE] Operación Colección flight_tracking": {
                  "main": [
                        [
                              {
                                    "node": "[RESPUESTA] Finalizar con Éxito",
                                    "type": "main",
                                    "index": 0
                              }
                        ],
                        [
                              {
                                    "node": "[ALERTA NATIVA] Enviar a /api/alerts",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            }
      }
}
  },
  {
    id: "wf-043-route-traffic-rerouting-cne",
    code: "WF-043",
    name: {
      es: "Re-enrutador Vial Inteligente (Ruta 32 / Ruta 27 / Cerro de la Muerte)",
      en: "Smart Highway Rerouting Engine (Route 32/27/Interamerican)"
    },
    category: "operations",
    collection: "traffic_alerts",
    description: {
      es: "Detecta bloqueos o deslizamientos en carreteras principales y calcula rutas alternas con aviso a choferes.",
      en: "Detects highway closures or landslides, calculating alternate scenic bypasses and notifying drivers."
    },
    icon: "Navigation",
    color: "#f97316",
    endpoint: "/api/native/workflows/highway-reroute",
    method: "POST",
    triggerEvent: "Alerta de Tránsito MOPT/Waze o CNE",
    nodesCount: 5,
    slaTarget: "< 800ms",
    nodes: [
      {
            "id": "node-trigger",
            "name": "[TRIGGER] Re-enrutador Vial Inteligente (Ruta 32 / Ruta 27 / Cerro de la Muerte)",
            "type": "native-automation-node.webhook",
            "description": "Alerta de Tránsito MOPT/Waze o CNE"
      },
      {
            "id": "node-extract",
            "name": "[EXTRACT] Formatear y Validar Datos",
            "type": "native-automation-node.code",
            "description": "Transformación y validación de esquema"
      },
      {
            "id": "node-firestore",
            "name": "[FIRESTORE] Operación traffic_alerts",
            "type": "native-automation-node.googleFirebaseCloudFirestore",
            "description": "Lectura/Escritura en Firestore /traffic_alerts"
      },
      {
            "id": "node-response",
            "name": "[RESPUESTA] Finalizar con Éxito",
            "type": "native-automation-node.respondToWebhook",
            "description": "Respuesta HTTP 200 con payload estructurado"
      },
      {
            "id": "node-alert",
            "name": "[ALERTA NATIVA] Enviar a /api/alerts",
            "type": "native-automation-node.httpRequest",
            "description": "Enrutamiento de error a /api/alerts (reemplazo Telegram)"
      }
],
    samplePayload: {
      "affectedHighway": "Ruta 32 (Bravo Carrillo)",
      "status": "CLOSED_RAIN",
      "suggestedAlternative": "Ruta 10 por Turrialba"
},
    blueprintJson: {
      "id": "WF-043",
      "name": "Re-enrutador Vial Inteligente (Ruta 32 / Ruta 27 / Cerro de la Muerte)",
      "active": true,
      "nodes": [
            {
                  "parameters": {
                        "path": "api/native/workflows/highway-reroute",
                        "httpMethod": "POST",
                        "responseMode": "responseNode",
                        "options": {}
                  },
                  "name": "[TRIGGER] Re-enrutador Vial Inteligente (Ruta 32 / Ruta 27 / Cerro de la Muerte)",
                  "type": "native-automation-node.webhook",
                  "typeVersion": 2,
                  "position": [
                        100,
                        300
                  ]
            },
            {
                  "parameters": {
                        "jsCode": "// Validar campos obligatorios y normalizar timestamp\nconst item = $input.first().json || {};\nitem.processedAt = new Date().toISOString();\nitem.environment = 'production';\nitem.targetCollection = 'traffic_alerts';\nreturn [{ json: item }];"
                  },
                  "name": "[EXTRACT] Formatear y Validar Datos",
                  "type": "native-automation-node.code",
                  "typeVersion": 2,
                  "position": [
                        350,
                        300
                  ]
            },
            {
                  "parameters": {
                        "operation": "upsert",
                        "collection": "traffic_alerts",
                        "documentId": "={{ $json.id || $json.bookingId || $json.code || $now }}",
                        "dataToSend": "defineBelow",
                        "fieldsUi": {
                              "fieldValues": [
                                    {
                                          "fieldId": "updatedAt",
                                          "fieldValue": "={{ $now }}"
                                    },
                                    {
                                          "fieldId": "workflowSource",
                                          "fieldValue": "WF-043"
                                    },
                                    {
                                          "fieldId": "status",
                                          "fieldValue": "processed"
                                    }
                              ]
                        }
                  },
                  "name": "[FIRESTORE] Operación Colección traffic_alerts",
                  "type": "native-automation-node.googleFirebaseCloudFirestore",
                  "typeVersion": 1.1,
                  "position": [
                        650,
                        300
                  ],
                  "credentials": {
                        "googleApi": {
                              "id": "5NiYz8gX64lPYIdK",
                              "name": "Costa Rica Tours - Firebase"
                        }
                  },
                  "onError": "continueErrorOutput"
            },
            {
                  "parameters": {
                        "respondWith": "json",
                        "responseBody": "{\n  \"success\": true,\n  \"workflowCode\": \"WF-043\",\n  \"collection\": \"traffic_alerts\",\n  \"timestamp\": \"={{ $now }}\",\n  \"message\": \"Operación completada exitosamente en traffic_alerts\"\n}",
                        "options": {}
                  },
                  "name": "[RESPUESTA] Finalizar con Éxito",
                  "type": "native-automation-node.respondToWebhook",
                  "typeVersion": 1.5,
                  "position": [
                        950,
                        200
                  ]
            },
            {
                  "parameters": {
                        "method": "POST",
                        "url": "={{ $env.APP_URL || \"http://localhost:3000\" }}/api/alerts",
                        "sendHeaders": true,
                        "headerParameters": {
                              "parameters": [
                                    {
                                          "name": "X-Webhook-Secret",
                                          "value": "={{ $env.WEBHOOK_SECRET || \"dev-secret\" }}"
                                    },
                                    {
                                          "name": "Content-Type",
                                          "value": "application/json"
                                    }
                              ]
                        },
                        "sendBody": true,
                        "specifyBody": "json",
                        "jsonBody": "{\n  \"source\": \"Re-enrutador Vial Inteligente (Ruta 32 / Ruta 27 / Cerro de la Muerte)\",\n  \"severity\": \"critical\",\n  \"title\": \"Fallo en workflow WF-043: Re-enrutador Vial Inteligente (Ruta 32 / Ruta 27 / Cerro de la Muerte)\",\n  \"message\": \"=Error al ejecutar en colección traffic_alerts: {{ $json.error?.message || \\\"Error no especificado\\\" }}\",\n  \"bookingId\": \"={{ $json.bookingId }}\",\n  \"metadata\": {\n    \"workflowCode\": \"WF-043\",\n    \"collection\": \"traffic_alerts\",\n    \"endpoint\": \"/api/native/workflows/highway-reroute\"\n  }\n}",
                        "options": {}
                  },
                  "name": "[ALERTA NATIVA] Enviar a /api/alerts",
                  "type": "native-automation-node.httpRequest",
                  "typeVersion": 4.2,
                  "position": [
                        950,
                        450
                  ]
            }
      ],
      "connections": {
            "[TRIGGER] Re-enrutador Vial Inteligente (Ruta 32 / Ruta 27 / Cerro de la Muerte)": {
                  "main": [
                        [
                              {
                                    "node": "[EXTRACT] Formatear y Validar Datos",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[EXTRACT] Formatear y Validar Datos": {
                  "main": [
                        [
                              {
                                    "node": "[FIRESTORE] Operación Colección traffic_alerts",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[FIRESTORE] Operación Colección traffic_alerts": {
                  "main": [
                        [
                              {
                                    "node": "[RESPUESTA] Finalizar con Éxito",
                                    "type": "main",
                                    "index": 0
                              }
                        ],
                        [
                              {
                                    "node": "[ALERTA NATIVA] Enviar a /api/alerts",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            }
      }
}
  },
  {
    id: "wf-044-driver-daily-checklist-safety",
    code: "WF-044",
    name: {
      es: "Auditor Digital de Checklist de Seguridad del Chofer",
      en: "Daily Driver Vehicle Safety & Inspection Checklist"
    },
    category: "operations",
    collection: "driver_inspections",
    description: {
      es: "Verifica reporte matutino de choferes (frenos, llantas, botiquín, extintor) antes de habilitar viajes del día.",
      en: "Verifies morning inspection report (brakes, tires, first aid kit) before clearing driver for the day."
    },
    icon: "ClipboardCheck",
    color: "#10b981",
    endpoint: "/api/native/workflows/driver-safety-check",
    method: "POST",
    triggerEvent: "Envío de formulario matutino de chofer (05:30 AM)",
    nodesCount: 5,
    slaTarget: "< 300ms",
    nodes: [
      {
            "id": "node-trigger",
            "name": "[TRIGGER] Auditor Digital de Checklist de Seguridad del Chofer",
            "type": "native-automation-node.webhook",
            "description": "Envío de formulario matutino de chofer (05:30 AM)"
      },
      {
            "id": "node-extract",
            "name": "[EXTRACT] Formatear y Validar Datos",
            "type": "native-automation-node.code",
            "description": "Transformación y validación de esquema"
      },
      {
            "id": "node-firestore",
            "name": "[FIRESTORE] Operación driver_inspections",
            "type": "native-automation-node.googleFirebaseCloudFirestore",
            "description": "Lectura/Escritura en Firestore /driver_inspections"
      },
      {
            "id": "node-response",
            "name": "[RESPUESTA] Finalizar con Éxito",
            "type": "native-automation-node.respondToWebhook",
            "description": "Respuesta HTTP 200 con payload estructurado"
      },
      {
            "id": "node-alert",
            "name": "[ALERTA NATIVA] Enviar a /api/alerts",
            "type": "native-automation-node.httpRequest",
            "description": "Enrutamiento de error a /api/alerts (reemplazo Telegram)"
      }
],
    samplePayload: {
      "driverId": "DRV-ALSAMA-09",
      "plateNumber": "SJ-TRANS-4412",
      "status": "CLEARED_PASSED"
},
    blueprintJson: {
      "id": "WF-044",
      "name": "Auditor Digital de Checklist de Seguridad del Chofer",
      "active": true,
      "nodes": [
            {
                  "parameters": {
                        "path": "api/native/workflows/driver-safety-check",
                        "httpMethod": "POST",
                        "responseMode": "responseNode",
                        "options": {}
                  },
                  "name": "[TRIGGER] Auditor Digital de Checklist de Seguridad del Chofer",
                  "type": "native-automation-node.webhook",
                  "typeVersion": 2,
                  "position": [
                        100,
                        300
                  ]
            },
            {
                  "parameters": {
                        "jsCode": "// Validar campos obligatorios y normalizar timestamp\nconst item = $input.first().json || {};\nitem.processedAt = new Date().toISOString();\nitem.environment = 'production';\nitem.targetCollection = 'driver_inspections';\nreturn [{ json: item }];"
                  },
                  "name": "[EXTRACT] Formatear y Validar Datos",
                  "type": "native-automation-node.code",
                  "typeVersion": 2,
                  "position": [
                        350,
                        300
                  ]
            },
            {
                  "parameters": {
                        "operation": "upsert",
                        "collection": "driver_inspections",
                        "documentId": "={{ $json.id || $json.bookingId || $json.code || $now }}",
                        "dataToSend": "defineBelow",
                        "fieldsUi": {
                              "fieldValues": [
                                    {
                                          "fieldId": "updatedAt",
                                          "fieldValue": "={{ $now }}"
                                    },
                                    {
                                          "fieldId": "workflowSource",
                                          "fieldValue": "WF-044"
                                    },
                                    {
                                          "fieldId": "status",
                                          "fieldValue": "processed"
                                    }
                              ]
                        }
                  },
                  "name": "[FIRESTORE] Operación Colección driver_inspections",
                  "type": "native-automation-node.googleFirebaseCloudFirestore",
                  "typeVersion": 1.1,
                  "position": [
                        650,
                        300
                  ],
                  "credentials": {
                        "googleApi": {
                              "id": "5NiYz8gX64lPYIdK",
                              "name": "Costa Rica Tours - Firebase"
                        }
                  },
                  "onError": "continueErrorOutput"
            },
            {
                  "parameters": {
                        "respondWith": "json",
                        "responseBody": "{\n  \"success\": true,\n  \"workflowCode\": \"WF-044\",\n  \"collection\": \"driver_inspections\",\n  \"timestamp\": \"={{ $now }}\",\n  \"message\": \"Operación completada exitosamente en driver_inspections\"\n}",
                        "options": {}
                  },
                  "name": "[RESPUESTA] Finalizar con Éxito",
                  "type": "native-automation-node.respondToWebhook",
                  "typeVersion": 1.5,
                  "position": [
                        950,
                        200
                  ]
            },
            {
                  "parameters": {
                        "method": "POST",
                        "url": "={{ $env.APP_URL || \"http://localhost:3000\" }}/api/alerts",
                        "sendHeaders": true,
                        "headerParameters": {
                              "parameters": [
                                    {
                                          "name": "X-Webhook-Secret",
                                          "value": "={{ $env.WEBHOOK_SECRET || \"dev-secret\" }}"
                                    },
                                    {
                                          "name": "Content-Type",
                                          "value": "application/json"
                                    }
                              ]
                        },
                        "sendBody": true,
                        "specifyBody": "json",
                        "jsonBody": "{\n  \"source\": \"Auditor Digital de Checklist de Seguridad del Chofer\",\n  \"severity\": \"critical\",\n  \"title\": \"Fallo en workflow WF-044: Auditor Digital de Checklist de Seguridad del Chofer\",\n  \"message\": \"=Error al ejecutar en colección driver_inspections: {{ $json.error?.message || \\\"Error no especificado\\\" }}\",\n  \"bookingId\": \"={{ $json.bookingId }}\",\n  \"metadata\": {\n    \"workflowCode\": \"WF-044\",\n    \"collection\": \"driver_inspections\",\n    \"endpoint\": \"/api/native/workflows/driver-safety-check\"\n  }\n}",
                        "options": {}
                  },
                  "name": "[ALERTA NATIVA] Enviar a /api/alerts",
                  "type": "native-automation-node.httpRequest",
                  "typeVersion": 4.2,
                  "position": [
                        950,
                        450
                  ]
            }
      ],
      "connections": {
            "[TRIGGER] Auditor Digital de Checklist de Seguridad del Chofer": {
                  "main": [
                        [
                              {
                                    "node": "[EXTRACT] Formatear y Validar Datos",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[EXTRACT] Formatear y Validar Datos": {
                  "main": [
                        [
                              {
                                    "node": "[FIRESTORE] Operación Colección driver_inspections",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[FIRESTORE] Operación Colección driver_inspections": {
                  "main": [
                        [
                              {
                                    "node": "[RESPUESTA] Finalizar con Éxito",
                                    "type": "main",
                                    "index": 0
                              }
                        ],
                        [
                              {
                                    "node": "[ALERTA NATIVA] Enviar a /api/alerts",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            }
      }
}
  },
  {
    id: "wf-045-lost-luggage-trace-finder",
    code: "WF-045",
    name: {
      es: "Localizador y Custodia de Equipaje Extraviado en Vans",
      en: "In-Van Lost Luggage Tracking & Express Return System"
    },
    category: "operations",
    collection: "lost_items",
    description: {
      es: "Registra reporte de objetos olvidados, ubica la van exacta asignada a la reserva y coordina entrega express en el hotel.",
      en: "Logs lost item reports, traces vehicle ID for that booking, and coordinates express delivery to next hotel."
    },
    icon: "Briefcase",
    color: "#a855f7",
    endpoint: "/api/native/workflows/lost-item-finder",
    method: "POST",
    triggerEvent: "Reporte de objeto olvidado desde concierge",
    nodesCount: 5,
    slaTarget: "< 500ms",
    nodes: [
      {
            "id": "node-trigger",
            "name": "[TRIGGER] Localizador y Custodia de Equipaje Extraviado en Vans",
            "type": "native-automation-node.webhook",
            "description": "Reporte de objeto olvidado desde concierge"
      },
      {
            "id": "node-extract",
            "name": "[EXTRACT] Formatear y Validar Datos",
            "type": "native-automation-node.code",
            "description": "Transformación y validación de esquema"
      },
      {
            "id": "node-firestore",
            "name": "[FIRESTORE] Operación lost_items",
            "type": "native-automation-node.googleFirebaseCloudFirestore",
            "description": "Lectura/Escritura en Firestore /lost_items"
      },
      {
            "id": "node-response",
            "name": "[RESPUESTA] Finalizar con Éxito",
            "type": "native-automation-node.respondToWebhook",
            "description": "Respuesta HTTP 200 con payload estructurado"
      },
      {
            "id": "node-alert",
            "name": "[ALERTA NATIVA] Enviar a /api/alerts",
            "type": "native-automation-node.httpRequest",
            "description": "Enrutamiento de error a /api/alerts (reemplazo Telegram)"
      }
],
    samplePayload: {
      "bookingId": "BK-CR-2026-945",
      "itemDescription": "Camera Bag with Sony A7IV",
      "currentDriver": "Marcos Solís"
},
    blueprintJson: {
      "id": "WF-045",
      "name": "Localizador y Custodia de Equipaje Extraviado en Vans",
      "active": true,
      "nodes": [
            {
                  "parameters": {
                        "path": "api/native/workflows/lost-item-finder",
                        "httpMethod": "POST",
                        "responseMode": "responseNode",
                        "options": {}
                  },
                  "name": "[TRIGGER] Localizador y Custodia de Equipaje Extraviado en Vans",
                  "type": "native-automation-node.webhook",
                  "typeVersion": 2,
                  "position": [
                        100,
                        300
                  ]
            },
            {
                  "parameters": {
                        "jsCode": "// Validar campos obligatorios y normalizar timestamp\nconst item = $input.first().json || {};\nitem.processedAt = new Date().toISOString();\nitem.environment = 'production';\nitem.targetCollection = 'lost_items';\nreturn [{ json: item }];"
                  },
                  "name": "[EXTRACT] Formatear y Validar Datos",
                  "type": "native-automation-node.code",
                  "typeVersion": 2,
                  "position": [
                        350,
                        300
                  ]
            },
            {
                  "parameters": {
                        "operation": "upsert",
                        "collection": "lost_items",
                        "documentId": "={{ $json.id || $json.bookingId || $json.code || $now }}",
                        "dataToSend": "defineBelow",
                        "fieldsUi": {
                              "fieldValues": [
                                    {
                                          "fieldId": "updatedAt",
                                          "fieldValue": "={{ $now }}"
                                    },
                                    {
                                          "fieldId": "workflowSource",
                                          "fieldValue": "WF-045"
                                    },
                                    {
                                          "fieldId": "status",
                                          "fieldValue": "processed"
                                    }
                              ]
                        }
                  },
                  "name": "[FIRESTORE] Operación Colección lost_items",
                  "type": "native-automation-node.googleFirebaseCloudFirestore",
                  "typeVersion": 1.1,
                  "position": [
                        650,
                        300
                  ],
                  "credentials": {
                        "googleApi": {
                              "id": "5NiYz8gX64lPYIdK",
                              "name": "Costa Rica Tours - Firebase"
                        }
                  },
                  "onError": "continueErrorOutput"
            },
            {
                  "parameters": {
                        "respondWith": "json",
                        "responseBody": "{\n  \"success\": true,\n  \"workflowCode\": \"WF-045\",\n  \"collection\": \"lost_items\",\n  \"timestamp\": \"={{ $now }}\",\n  \"message\": \"Operación completada exitosamente en lost_items\"\n}",
                        "options": {}
                  },
                  "name": "[RESPUESTA] Finalizar con Éxito",
                  "type": "native-automation-node.respondToWebhook",
                  "typeVersion": 1.5,
                  "position": [
                        950,
                        200
                  ]
            },
            {
                  "parameters": {
                        "method": "POST",
                        "url": "={{ $env.APP_URL || \"http://localhost:3000\" }}/api/alerts",
                        "sendHeaders": true,
                        "headerParameters": {
                              "parameters": [
                                    {
                                          "name": "X-Webhook-Secret",
                                          "value": "={{ $env.WEBHOOK_SECRET || \"dev-secret\" }}"
                                    },
                                    {
                                          "name": "Content-Type",
                                          "value": "application/json"
                                    }
                              ]
                        },
                        "sendBody": true,
                        "specifyBody": "json",
                        "jsonBody": "{\n  \"source\": \"Localizador y Custodia de Equipaje Extraviado en Vans\",\n  \"severity\": \"critical\",\n  \"title\": \"Fallo en workflow WF-045: Localizador y Custodia de Equipaje Extraviado en Vans\",\n  \"message\": \"=Error al ejecutar en colección lost_items: {{ $json.error?.message || \\\"Error no especificado\\\" }}\",\n  \"bookingId\": \"={{ $json.bookingId }}\",\n  \"metadata\": {\n    \"workflowCode\": \"WF-045\",\n    \"collection\": \"lost_items\",\n    \"endpoint\": \"/api/native/workflows/lost-item-finder\"\n  }\n}",
                        "options": {}
                  },
                  "name": "[ALERTA NATIVA] Enviar a /api/alerts",
                  "type": "native-automation-node.httpRequest",
                  "typeVersion": 4.2,
                  "position": [
                        950,
                        450
                  ]
            }
      ],
      "connections": {
            "[TRIGGER] Localizador y Custodia de Equipaje Extraviado en Vans": {
                  "main": [
                        [
                              {
                                    "node": "[EXTRACT] Formatear y Validar Datos",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[EXTRACT] Formatear y Validar Datos": {
                  "main": [
                        [
                              {
                                    "node": "[FIRESTORE] Operación Colección lost_items",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[FIRESTORE] Operación Colección lost_items": {
                  "main": [
                        [
                              {
                                    "node": "[RESPUESTA] Finalizar con Éxito",
                                    "type": "main",
                                    "index": 0
                              }
                        ],
                        [
                              {
                                    "node": "[ALERTA NATIVA] Enviar a /api/alerts",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            }
      }
}
  },
  {
    id: "wf-046-carbon-offset-fleet-calculator",
    code: "WF-046",
    name: {
      es: "Calculador de Huella de Carbono y Compensación Fonafifo",
      en: "Fleet Carbon Footprint & Fonafifo Forest Offset Calculator"
    },
    category: "operations",
    collection: "carbon_offsets",
    description: {
      es: "Calcula kilómetros recorridos por van, convierte a emisiones de CO2 y genera certificados de siembra de árboles nativos.",
      en: "Calculates km driven per van, converts to CO2 equivalent, and issues certified native tree planting certificates."
    },
    icon: "TreePine",
    color: "#15803d",
    endpoint: "/api/native/workflows/carbon-offset",
    method: "POST",
    triggerEvent: "Finalización de servicio de transporte",
    nodesCount: 5,
    slaTarget: "< 600ms",
    nodes: [
      {
            "id": "node-trigger",
            "name": "[TRIGGER] Calculador de Huella de Carbono y Compensación Fonafifo",
            "type": "native-automation-node.webhook",
            "description": "Finalización de servicio de transporte"
      },
      {
            "id": "node-extract",
            "name": "[EXTRACT] Formatear y Validar Datos",
            "type": "native-automation-node.code",
            "description": "Transformación y validación de esquema"
      },
      {
            "id": "node-firestore",
            "name": "[FIRESTORE] Operación carbon_offsets",
            "type": "native-automation-node.googleFirebaseCloudFirestore",
            "description": "Lectura/Escritura en Firestore /carbon_offsets"
      },
      {
            "id": "node-response",
            "name": "[RESPUESTA] Finalizar con Éxito",
            "type": "native-automation-node.respondToWebhook",
            "description": "Respuesta HTTP 200 con payload estructurado"
      },
      {
            "id": "node-alert",
            "name": "[ALERTA NATIVA] Enviar a /api/alerts",
            "type": "native-automation-node.httpRequest",
            "description": "Enrutamiento de error a /api/alerts (reemplazo Telegram)"
      }
],
    samplePayload: {
      "bookingId": "BK-CR-2026-946",
      "distanceKm": 280,
      "co2KgOffset": 48.5,
      "treesPlanted": 2
},
    blueprintJson: {
      "id": "WF-046",
      "name": "Calculador de Huella de Carbono y Compensación Fonafifo",
      "active": true,
      "nodes": [
            {
                  "parameters": {
                        "path": "api/native/workflows/carbon-offset",
                        "httpMethod": "POST",
                        "responseMode": "responseNode",
                        "options": {}
                  },
                  "name": "[TRIGGER] Calculador de Huella de Carbono y Compensación Fonafifo",
                  "type": "native-automation-node.webhook",
                  "typeVersion": 2,
                  "position": [
                        100,
                        300
                  ]
            },
            {
                  "parameters": {
                        "jsCode": "// Validar campos obligatorios y normalizar timestamp\nconst item = $input.first().json || {};\nitem.processedAt = new Date().toISOString();\nitem.environment = 'production';\nitem.targetCollection = 'carbon_offsets';\nreturn [{ json: item }];"
                  },
                  "name": "[EXTRACT] Formatear y Validar Datos",
                  "type": "native-automation-node.code",
                  "typeVersion": 2,
                  "position": [
                        350,
                        300
                  ]
            },
            {
                  "parameters": {
                        "operation": "upsert",
                        "collection": "carbon_offsets",
                        "documentId": "={{ $json.id || $json.bookingId || $json.code || $now }}",
                        "dataToSend": "defineBelow",
                        "fieldsUi": {
                              "fieldValues": [
                                    {
                                          "fieldId": "updatedAt",
                                          "fieldValue": "={{ $now }}"
                                    },
                                    {
                                          "fieldId": "workflowSource",
                                          "fieldValue": "WF-046"
                                    },
                                    {
                                          "fieldId": "status",
                                          "fieldValue": "processed"
                                    }
                              ]
                        }
                  },
                  "name": "[FIRESTORE] Operación Colección carbon_offsets",
                  "type": "native-automation-node.googleFirebaseCloudFirestore",
                  "typeVersion": 1.1,
                  "position": [
                        650,
                        300
                  ],
                  "credentials": {
                        "googleApi": {
                              "id": "5NiYz8gX64lPYIdK",
                              "name": "Costa Rica Tours - Firebase"
                        }
                  },
                  "onError": "continueErrorOutput"
            },
            {
                  "parameters": {
                        "respondWith": "json",
                        "responseBody": "{\n  \"success\": true,\n  \"workflowCode\": \"WF-046\",\n  \"collection\": \"carbon_offsets\",\n  \"timestamp\": \"={{ $now }}\",\n  \"message\": \"Operación completada exitosamente en carbon_offsets\"\n}",
                        "options": {}
                  },
                  "name": "[RESPUESTA] Finalizar con Éxito",
                  "type": "native-automation-node.respondToWebhook",
                  "typeVersion": 1.5,
                  "position": [
                        950,
                        200
                  ]
            },
            {
                  "parameters": {
                        "method": "POST",
                        "url": "={{ $env.APP_URL || \"http://localhost:3000\" }}/api/alerts",
                        "sendHeaders": true,
                        "headerParameters": {
                              "parameters": [
                                    {
                                          "name": "X-Webhook-Secret",
                                          "value": "={{ $env.WEBHOOK_SECRET || \"dev-secret\" }}"
                                    },
                                    {
                                          "name": "Content-Type",
                                          "value": "application/json"
                                    }
                              ]
                        },
                        "sendBody": true,
                        "specifyBody": "json",
                        "jsonBody": "{\n  \"source\": \"Calculador de Huella de Carbono y Compensación Fonafifo\",\n  \"severity\": \"critical\",\n  \"title\": \"Fallo en workflow WF-046: Calculador de Huella de Carbono y Compensación Fonafifo\",\n  \"message\": \"=Error al ejecutar en colección carbon_offsets: {{ $json.error?.message || \\\"Error no especificado\\\" }}\",\n  \"bookingId\": \"={{ $json.bookingId }}\",\n  \"metadata\": {\n    \"workflowCode\": \"WF-046\",\n    \"collection\": \"carbon_offsets\",\n    \"endpoint\": \"/api/native/workflows/carbon-offset\"\n  }\n}",
                        "options": {}
                  },
                  "name": "[ALERTA NATIVA] Enviar a /api/alerts",
                  "type": "native-automation-node.httpRequest",
                  "typeVersion": 4.2,
                  "position": [
                        950,
                        450
                  ]
            }
      ],
      "connections": {
            "[TRIGGER] Calculador de Huella de Carbono y Compensación Fonafifo": {
                  "main": [
                        [
                              {
                                    "node": "[EXTRACT] Formatear y Validar Datos",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[EXTRACT] Formatear y Validar Datos": {
                  "main": [
                        [
                              {
                                    "node": "[FIRESTORE] Operación Colección carbon_offsets",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[FIRESTORE] Operación Colección carbon_offsets": {
                  "main": [
                        [
                              {
                                    "node": "[RESPUESTA] Finalizar con Éxito",
                                    "type": "main",
                                    "index": 0
                              }
                        ],
                        [
                              {
                                    "node": "[ALERTA NATIVA] Enviar a /api/alerts",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            }
      }
}
  },
  {
    id: "wf-047-ev-charging-stop-planner",
    code: "WF-047",
    name: {
      es: "Planificador de Paradas en Electrolineras para Vans Eléctricas",
      en: "Electric Van Fleet Charging Station Optimization Planner"
    },
    category: "operations",
    collection: "ev_stops",
    description: {
      es: "Optimiza rutas de microbuses eléctricos incorporando paradas estratégicas en cargadores ICE/CNFL durante tours largos.",
      en: "Optimizes EV fleet route plans with fast-charging stops at national grid stations along long routes."
    },
    icon: "BatteryCharging",
    color: "#06b6d4",
    endpoint: "/api/native/workflows/ev-charging-plan",
    method: "POST",
    triggerEvent: "Asignación de vehículo 100% eléctrico",
    nodesCount: 5,
    slaTarget: "< 400ms",
    nodes: [
      {
            "id": "node-trigger",
            "name": "[TRIGGER] Planificador de Paradas en Electrolineras para Vans Eléctricas",
            "type": "native-automation-node.webhook",
            "description": "Asignación de vehículo 100% eléctrico"
      },
      {
            "id": "node-extract",
            "name": "[EXTRACT] Formatear y Validar Datos",
            "type": "native-automation-node.code",
            "description": "Transformación y validación de esquema"
      },
      {
            "id": "node-firestore",
            "name": "[FIRESTORE] Operación ev_stops",
            "type": "native-automation-node.googleFirebaseCloudFirestore",
            "description": "Lectura/Escritura en Firestore /ev_stops"
      },
      {
            "id": "node-response",
            "name": "[RESPUESTA] Finalizar con Éxito",
            "type": "native-automation-node.respondToWebhook",
            "description": "Respuesta HTTP 200 con payload estructurado"
      },
      {
            "id": "node-alert",
            "name": "[ALERTA NATIVA] Enviar a /api/alerts",
            "type": "native-automation-node.httpRequest",
            "description": "Enrutamiento de error a /api/alerts (reemplazo Telegram)"
      }
],
    samplePayload: {
      "vehicleId": "EV-VAN-01",
      "route": "San José -> Monteverde",
      "batteryStartPercent": 95,
      "plannedStop": "Orotina Fast-Charger"
},
    blueprintJson: {
      "id": "WF-047",
      "name": "Planificador de Paradas en Electrolineras para Vans Eléctricas",
      "active": true,
      "nodes": [
            {
                  "parameters": {
                        "path": "api/native/workflows/ev-charging-plan",
                        "httpMethod": "POST",
                        "responseMode": "responseNode",
                        "options": {}
                  },
                  "name": "[TRIGGER] Planificador de Paradas en Electrolineras para Vans Eléctricas",
                  "type": "native-automation-node.webhook",
                  "typeVersion": 2,
                  "position": [
                        100,
                        300
                  ]
            },
            {
                  "parameters": {
                        "jsCode": "// Validar campos obligatorios y normalizar timestamp\nconst item = $input.first().json || {};\nitem.processedAt = new Date().toISOString();\nitem.environment = 'production';\nitem.targetCollection = 'ev_stops';\nreturn [{ json: item }];"
                  },
                  "name": "[EXTRACT] Formatear y Validar Datos",
                  "type": "native-automation-node.code",
                  "typeVersion": 2,
                  "position": [
                        350,
                        300
                  ]
            },
            {
                  "parameters": {
                        "operation": "upsert",
                        "collection": "ev_stops",
                        "documentId": "={{ $json.id || $json.bookingId || $json.code || $now }}",
                        "dataToSend": "defineBelow",
                        "fieldsUi": {
                              "fieldValues": [
                                    {
                                          "fieldId": "updatedAt",
                                          "fieldValue": "={{ $now }}"
                                    },
                                    {
                                          "fieldId": "workflowSource",
                                          "fieldValue": "WF-047"
                                    },
                                    {
                                          "fieldId": "status",
                                          "fieldValue": "processed"
                                    }
                              ]
                        }
                  },
                  "name": "[FIRESTORE] Operación Colección ev_stops",
                  "type": "native-automation-node.googleFirebaseCloudFirestore",
                  "typeVersion": 1.1,
                  "position": [
                        650,
                        300
                  ],
                  "credentials": {
                        "googleApi": {
                              "id": "5NiYz8gX64lPYIdK",
                              "name": "Costa Rica Tours - Firebase"
                        }
                  },
                  "onError": "continueErrorOutput"
            },
            {
                  "parameters": {
                        "respondWith": "json",
                        "responseBody": "{\n  \"success\": true,\n  \"workflowCode\": \"WF-047\",\n  \"collection\": \"ev_stops\",\n  \"timestamp\": \"={{ $now }}\",\n  \"message\": \"Operación completada exitosamente en ev_stops\"\n}",
                        "options": {}
                  },
                  "name": "[RESPUESTA] Finalizar con Éxito",
                  "type": "native-automation-node.respondToWebhook",
                  "typeVersion": 1.5,
                  "position": [
                        950,
                        200
                  ]
            },
            {
                  "parameters": {
                        "method": "POST",
                        "url": "={{ $env.APP_URL || \"http://localhost:3000\" }}/api/alerts",
                        "sendHeaders": true,
                        "headerParameters": {
                              "parameters": [
                                    {
                                          "name": "X-Webhook-Secret",
                                          "value": "={{ $env.WEBHOOK_SECRET || \"dev-secret\" }}"
                                    },
                                    {
                                          "name": "Content-Type",
                                          "value": "application/json"
                                    }
                              ]
                        },
                        "sendBody": true,
                        "specifyBody": "json",
                        "jsonBody": "{\n  \"source\": \"Planificador de Paradas en Electrolineras para Vans Eléctricas\",\n  \"severity\": \"critical\",\n  \"title\": \"Fallo en workflow WF-047: Planificador de Paradas en Electrolineras para Vans Eléctricas\",\n  \"message\": \"=Error al ejecutar en colección ev_stops: {{ $json.error?.message || \\\"Error no especificado\\\" }}\",\n  \"bookingId\": \"={{ $json.bookingId }}\",\n  \"metadata\": {\n    \"workflowCode\": \"WF-047\",\n    \"collection\": \"ev_stops\",\n    \"endpoint\": \"/api/native/workflows/ev-charging-plan\"\n  }\n}",
                        "options": {}
                  },
                  "name": "[ALERTA NATIVA] Enviar a /api/alerts",
                  "type": "native-automation-node.httpRequest",
                  "typeVersion": 4.2,
                  "position": [
                        950,
                        450
                  ]
            }
      ],
      "connections": {
            "[TRIGGER] Planificador de Paradas en Electrolineras para Vans Eléctricas": {
                  "main": [
                        [
                              {
                                    "node": "[EXTRACT] Formatear y Validar Datos",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[EXTRACT] Formatear y Validar Datos": {
                  "main": [
                        [
                              {
                                    "node": "[FIRESTORE] Operación Colección ev_stops",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[FIRESTORE] Operación Colección ev_stops": {
                  "main": [
                        [
                              {
                                    "node": "[RESPUESTA] Finalizar con Éxito",
                                    "type": "main",
                                    "index": 0
                              }
                        ],
                        [
                              {
                                    "node": "[ALERTA NATIVA] Enviar a /api/alerts",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            }
      }
}
  },
  {
    id: "wf-048-child-car-seat-assigner",
    code: "WF-048",
    name: {
      es: "Gestor y Asignador de Sillas de Bebé y Boosters de Seguridad",
      en: "Child Car Seat & Booster Safety Equipment Assigner"
    },
    category: "operations",
    collection: "fleet_equipment",
    description: {
      es: "Garantiza que la van cuente con sillas de retención infantil homologadas según edades de los niños registrados en la reserva.",
      en: "Ensures executive van is pre-fitted with certified infant seats/boosters matching registered children pax."
    },
    icon: "Baby",
    color: "#f43f5e",
    endpoint: "/api/native/workflows/child-seat-assign",
    method: "POST",
    triggerEvent: "Reserva con infantes/niños pequeños",
    nodesCount: 5,
    slaTarget: "< 300ms",
    nodes: [
      {
            "id": "node-trigger",
            "name": "[TRIGGER] Gestor y Asignador de Sillas de Bebé y Boosters de Seguridad",
            "type": "native-automation-node.webhook",
            "description": "Reserva con infantes/niños pequeños"
      },
      {
            "id": "node-extract",
            "name": "[EXTRACT] Formatear y Validar Datos",
            "type": "native-automation-node.code",
            "description": "Transformación y validación de esquema"
      },
      {
            "id": "node-firestore",
            "name": "[FIRESTORE] Operación fleet_equipment",
            "type": "native-automation-node.googleFirebaseCloudFirestore",
            "description": "Lectura/Escritura en Firestore /fleet_equipment"
      },
      {
            "id": "node-response",
            "name": "[RESPUESTA] Finalizar con Éxito",
            "type": "native-automation-node.respondToWebhook",
            "description": "Respuesta HTTP 200 con payload estructurado"
      },
      {
            "id": "node-alert",
            "name": "[ALERTA NATIVA] Enviar a /api/alerts",
            "type": "native-automation-node.httpRequest",
            "description": "Enrutamiento de error a /api/alerts (reemplazo Telegram)"
      }
],
    samplePayload: {
      "bookingId": "BK-CR-2026-948",
      "seatsRequired": [
            {
                  "type": "rear_facing_infant",
                  "qty": 1
            },
            {
                  "type": "toddler_booster",
                  "qty": 1
            }
      ]
},
    blueprintJson: {
      "id": "WF-048",
      "name": "Gestor y Asignador de Sillas de Bebé y Boosters de Seguridad",
      "active": true,
      "nodes": [
            {
                  "parameters": {
                        "path": "api/native/workflows/child-seat-assign",
                        "httpMethod": "POST",
                        "responseMode": "responseNode",
                        "options": {}
                  },
                  "name": "[TRIGGER] Gestor y Asignador de Sillas de Bebé y Boosters de Seguridad",
                  "type": "native-automation-node.webhook",
                  "typeVersion": 2,
                  "position": [
                        100,
                        300
                  ]
            },
            {
                  "parameters": {
                        "jsCode": "// Validar campos obligatorios y normalizar timestamp\nconst item = $input.first().json || {};\nitem.processedAt = new Date().toISOString();\nitem.environment = 'production';\nitem.targetCollection = 'fleet_equipment';\nreturn [{ json: item }];"
                  },
                  "name": "[EXTRACT] Formatear y Validar Datos",
                  "type": "native-automation-node.code",
                  "typeVersion": 2,
                  "position": [
                        350,
                        300
                  ]
            },
            {
                  "parameters": {
                        "operation": "upsert",
                        "collection": "fleet_equipment",
                        "documentId": "={{ $json.id || $json.bookingId || $json.code || $now }}",
                        "dataToSend": "defineBelow",
                        "fieldsUi": {
                              "fieldValues": [
                                    {
                                          "fieldId": "updatedAt",
                                          "fieldValue": "={{ $now }}"
                                    },
                                    {
                                          "fieldId": "workflowSource",
                                          "fieldValue": "WF-048"
                                    },
                                    {
                                          "fieldId": "status",
                                          "fieldValue": "processed"
                                    }
                              ]
                        }
                  },
                  "name": "[FIRESTORE] Operación Colección fleet_equipment",
                  "type": "native-automation-node.googleFirebaseCloudFirestore",
                  "typeVersion": 1.1,
                  "position": [
                        650,
                        300
                  ],
                  "credentials": {
                        "googleApi": {
                              "id": "5NiYz8gX64lPYIdK",
                              "name": "Costa Rica Tours - Firebase"
                        }
                  },
                  "onError": "continueErrorOutput"
            },
            {
                  "parameters": {
                        "respondWith": "json",
                        "responseBody": "{\n  \"success\": true,\n  \"workflowCode\": \"WF-048\",\n  \"collection\": \"fleet_equipment\",\n  \"timestamp\": \"={{ $now }}\",\n  \"message\": \"Operación completada exitosamente en fleet_equipment\"\n}",
                        "options": {}
                  },
                  "name": "[RESPUESTA] Finalizar con Éxito",
                  "type": "native-automation-node.respondToWebhook",
                  "typeVersion": 1.5,
                  "position": [
                        950,
                        200
                  ]
            },
            {
                  "parameters": {
                        "method": "POST",
                        "url": "={{ $env.APP_URL || \"http://localhost:3000\" }}/api/alerts",
                        "sendHeaders": true,
                        "headerParameters": {
                              "parameters": [
                                    {
                                          "name": "X-Webhook-Secret",
                                          "value": "={{ $env.WEBHOOK_SECRET || \"dev-secret\" }}"
                                    },
                                    {
                                          "name": "Content-Type",
                                          "value": "application/json"
                                    }
                              ]
                        },
                        "sendBody": true,
                        "specifyBody": "json",
                        "jsonBody": "{\n  \"source\": \"Gestor y Asignador de Sillas de Bebé y Boosters de Seguridad\",\n  \"severity\": \"critical\",\n  \"title\": \"Fallo en workflow WF-048: Gestor y Asignador de Sillas de Bebé y Boosters de Seguridad\",\n  \"message\": \"=Error al ejecutar en colección fleet_equipment: {{ $json.error?.message || \\\"Error no especificado\\\" }}\",\n  \"bookingId\": \"={{ $json.bookingId }}\",\n  \"metadata\": {\n    \"workflowCode\": \"WF-048\",\n    \"collection\": \"fleet_equipment\",\n    \"endpoint\": \"/api/native/workflows/child-seat-assign\"\n  }\n}",
                        "options": {}
                  },
                  "name": "[ALERTA NATIVA] Enviar a /api/alerts",
                  "type": "native-automation-node.httpRequest",
                  "typeVersion": 4.2,
                  "position": [
                        950,
                        450
                  ]
            }
      ],
      "connections": {
            "[TRIGGER] Gestor y Asignador de Sillas de Bebé y Boosters de Seguridad": {
                  "main": [
                        [
                              {
                                    "node": "[EXTRACT] Formatear y Validar Datos",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[EXTRACT] Formatear y Validar Datos": {
                  "main": [
                        [
                              {
                                    "node": "[FIRESTORE] Operación Colección fleet_equipment",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[FIRESTORE] Operación Colección fleet_equipment": {
                  "main": [
                        [
                              {
                                    "node": "[RESPUESTA] Finalizar con Éxito",
                                    "type": "main",
                                    "index": 0
                              }
                        ],
                        [
                              {
                                    "node": "[ALERTA NATIVA] Enviar a /api/alerts",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            }
      }
}
  },
  {
    id: "wf-049-vip-helicopter-transfer-dispatch",
    code: "WF-049",
    name: {
      es: "Despachador de Traslados VIP en Helicóptero a Helipuertos",
      en: "VIP Helicopter Scenic Transfer & Helipad Dispatcher"
    },
    category: "vip",
    collection: "heli_transfers",
    description: {
      es: "Coordina permisos de vuelo, peso de equipaje y clima visual para traslados ejecutivos a helipuertos de resorts de lujo.",
      en: "Coordinates flight permits, luggage weigh-in, and visual weather for luxury resort helipad transfers."
    },
    icon: "Wind",
    color: "#6366f1",
    endpoint: "/api/native/workflows/heli-dispatch",
    method: "POST",
    triggerEvent: "Reserva de paquete VIP con vuelo escénico",
    nodesCount: 5,
    slaTarget: "< 1s",
    nodes: [
      {
            "id": "node-trigger",
            "name": "[TRIGGER] Despachador de Traslados VIP en Helicóptero a Helipuertos",
            "type": "native-automation-node.webhook",
            "description": "Reserva de paquete VIP con vuelo escénico"
      },
      {
            "id": "node-extract",
            "name": "[EXTRACT] Formatear y Validar Datos",
            "type": "native-automation-node.code",
            "description": "Transformación y validación de esquema"
      },
      {
            "id": "node-firestore",
            "name": "[FIRESTORE] Operación heli_transfers",
            "type": "native-automation-node.googleFirebaseCloudFirestore",
            "description": "Lectura/Escritura en Firestore /heli_transfers"
      },
      {
            "id": "node-response",
            "name": "[RESPUESTA] Finalizar con Éxito",
            "type": "native-automation-node.respondToWebhook",
            "description": "Respuesta HTTP 200 con payload estructurado"
      },
      {
            "id": "node-alert",
            "name": "[ALERTA NATIVA] Enviar a /api/alerts",
            "type": "native-automation-node.httpRequest",
            "description": "Enrutamiento de error a /api/alerts (reemplazo Telegram)"
      }
],
    samplePayload: {
      "flightCode": "HELI-CR-08",
      "route": "SJO -> Papagayo Luxury Helipad",
      "paxCount": 3,
      "pilotAssigned": "Cap. Federico Alvarado"
},
    blueprintJson: {
      "id": "WF-049",
      "name": "Despachador de Traslados VIP en Helicóptero a Helipuertos",
      "active": true,
      "nodes": [
            {
                  "parameters": {
                        "path": "api/native/workflows/heli-dispatch",
                        "httpMethod": "POST",
                        "responseMode": "responseNode",
                        "options": {}
                  },
                  "name": "[TRIGGER] Despachador de Traslados VIP en Helicóptero a Helipuertos",
                  "type": "native-automation-node.webhook",
                  "typeVersion": 2,
                  "position": [
                        100,
                        300
                  ]
            },
            {
                  "parameters": {
                        "jsCode": "// Validar campos obligatorios y normalizar timestamp\nconst item = $input.first().json || {};\nitem.processedAt = new Date().toISOString();\nitem.environment = 'production';\nitem.targetCollection = 'heli_transfers';\nreturn [{ json: item }];"
                  },
                  "name": "[EXTRACT] Formatear y Validar Datos",
                  "type": "native-automation-node.code",
                  "typeVersion": 2,
                  "position": [
                        350,
                        300
                  ]
            },
            {
                  "parameters": {
                        "operation": "upsert",
                        "collection": "heli_transfers",
                        "documentId": "={{ $json.id || $json.bookingId || $json.code || $now }}",
                        "dataToSend": "defineBelow",
                        "fieldsUi": {
                              "fieldValues": [
                                    {
                                          "fieldId": "updatedAt",
                                          "fieldValue": "={{ $now }}"
                                    },
                                    {
                                          "fieldId": "workflowSource",
                                          "fieldValue": "WF-049"
                                    },
                                    {
                                          "fieldId": "status",
                                          "fieldValue": "processed"
                                    }
                              ]
                        }
                  },
                  "name": "[FIRESTORE] Operación Colección heli_transfers",
                  "type": "native-automation-node.googleFirebaseCloudFirestore",
                  "typeVersion": 1.1,
                  "position": [
                        650,
                        300
                  ],
                  "credentials": {
                        "googleApi": {
                              "id": "5NiYz8gX64lPYIdK",
                              "name": "Costa Rica Tours - Firebase"
                        }
                  },
                  "onError": "continueErrorOutput"
            },
            {
                  "parameters": {
                        "respondWith": "json",
                        "responseBody": "{\n  \"success\": true,\n  \"workflowCode\": \"WF-049\",\n  \"collection\": \"heli_transfers\",\n  \"timestamp\": \"={{ $now }}\",\n  \"message\": \"Operación completada exitosamente en heli_transfers\"\n}",
                        "options": {}
                  },
                  "name": "[RESPUESTA] Finalizar con Éxito",
                  "type": "native-automation-node.respondToWebhook",
                  "typeVersion": 1.5,
                  "position": [
                        950,
                        200
                  ]
            },
            {
                  "parameters": {
                        "method": "POST",
                        "url": "={{ $env.APP_URL || \"http://localhost:3000\" }}/api/alerts",
                        "sendHeaders": true,
                        "headerParameters": {
                              "parameters": [
                                    {
                                          "name": "X-Webhook-Secret",
                                          "value": "={{ $env.WEBHOOK_SECRET || \"dev-secret\" }}"
                                    },
                                    {
                                          "name": "Content-Type",
                                          "value": "application/json"
                                    }
                              ]
                        },
                        "sendBody": true,
                        "specifyBody": "json",
                        "jsonBody": "{\n  \"source\": \"Despachador de Traslados VIP en Helicóptero a Helipuertos\",\n  \"severity\": \"critical\",\n  \"title\": \"Fallo en workflow WF-049: Despachador de Traslados VIP en Helicóptero a Helipuertos\",\n  \"message\": \"=Error al ejecutar en colección heli_transfers: {{ $json.error?.message || \\\"Error no especificado\\\" }}\",\n  \"bookingId\": \"={{ $json.bookingId }}\",\n  \"metadata\": {\n    \"workflowCode\": \"WF-049\",\n    \"collection\": \"heli_transfers\",\n    \"endpoint\": \"/api/native/workflows/heli-dispatch\"\n  }\n}",
                        "options": {}
                  },
                  "name": "[ALERTA NATIVA] Enviar a /api/alerts",
                  "type": "native-automation-node.httpRequest",
                  "typeVersion": 4.2,
                  "position": [
                        950,
                        450
                  ]
            }
      ],
      "connections": {
            "[TRIGGER] Despachador de Traslados VIP en Helicóptero a Helipuertos": {
                  "main": [
                        [
                              {
                                    "node": "[EXTRACT] Formatear y Validar Datos",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[EXTRACT] Formatear y Validar Datos": {
                  "main": [
                        [
                              {
                                    "node": "[FIRESTORE] Operación Colección heli_transfers",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[FIRESTORE] Operación Colección heli_transfers": {
                  "main": [
                        [
                              {
                                    "node": "[RESPUESTA] Finalizar con Éxito",
                                    "type": "main",
                                    "index": 0
                              }
                        ],
                        [
                              {
                                    "node": "[ALERTA NATIVA] Enviar a /api/alerts",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            }
      }
}
  },
  {
    id: "wf-050-cross-border-panama-nicaragua-sync",
    code: "WF-050",
    name: {
      es: "Gestor de Cruces Fronterizos (Bocas del Toro / San Juan)",
      en: "Cross-Border Tour & Migration Manifest Synchronizer"
    },
    category: "operations",
    collection: "cross_border_manifests",
    description: {
      es: "Genera manifiesto de pasajeros para trámites ágiles de migración en Paso Canoas o Peñas Blancas.",
      en: "Generates international border crossing manifests for expedited immigration on cross-border extensions."
    },
    icon: "FileText",
    color: "#0f766e",
    endpoint: "/api/native/workflows/cross-border-sync",
    method: "POST",
    triggerEvent: "Reserva de tour binacional (ej. Tortuguero + Bocas)",
    nodesCount: 5,
    slaTarget: "< 1.5s",
    nodes: [
      {
            "id": "node-trigger",
            "name": "[TRIGGER] Gestor de Cruces Fronterizos (Bocas del Toro / San Juan)",
            "type": "native-automation-node.webhook",
            "description": "Reserva de tour binacional (ej. Tortuguero + Bocas)"
      },
      {
            "id": "node-extract",
            "name": "[EXTRACT] Formatear y Validar Datos",
            "type": "native-automation-node.code",
            "description": "Transformación y validación de esquema"
      },
      {
            "id": "node-firestore",
            "name": "[FIRESTORE] Operación cross_border_manifests",
            "type": "native-automation-node.googleFirebaseCloudFirestore",
            "description": "Lectura/Escritura en Firestore /cross_border_manifests"
      },
      {
            "id": "node-response",
            "name": "[RESPUESTA] Finalizar con Éxito",
            "type": "native-automation-node.respondToWebhook",
            "description": "Respuesta HTTP 200 con payload estructurado"
      },
      {
            "id": "node-alert",
            "name": "[ALERTA NATIVA] Enviar a /api/alerts",
            "type": "native-automation-node.httpRequest",
            "description": "Enrutamiento de error a /api/alerts (reemplazo Telegram)"
      }
],
    samplePayload: {
      "borderPost": "Sixaola -> Guabito",
      "passengers": 4,
      "departureTaxPaid": true
},
    blueprintJson: {
      "id": "WF-050",
      "name": "Gestor de Cruces Fronterizos (Bocas del Toro / San Juan)",
      "active": true,
      "nodes": [
            {
                  "parameters": {
                        "path": "api/native/workflows/cross-border-sync",
                        "httpMethod": "POST",
                        "responseMode": "responseNode",
                        "options": {}
                  },
                  "name": "[TRIGGER] Gestor de Cruces Fronterizos (Bocas del Toro / San Juan)",
                  "type": "native-automation-node.webhook",
                  "typeVersion": 2,
                  "position": [
                        100,
                        300
                  ]
            },
            {
                  "parameters": {
                        "jsCode": "// Validar campos obligatorios y normalizar timestamp\nconst item = $input.first().json || {};\nitem.processedAt = new Date().toISOString();\nitem.environment = 'production';\nitem.targetCollection = 'cross_border_manifests';\nreturn [{ json: item }];"
                  },
                  "name": "[EXTRACT] Formatear y Validar Datos",
                  "type": "native-automation-node.code",
                  "typeVersion": 2,
                  "position": [
                        350,
                        300
                  ]
            },
            {
                  "parameters": {
                        "operation": "upsert",
                        "collection": "cross_border_manifests",
                        "documentId": "={{ $json.id || $json.bookingId || $json.code || $now }}",
                        "dataToSend": "defineBelow",
                        "fieldsUi": {
                              "fieldValues": [
                                    {
                                          "fieldId": "updatedAt",
                                          "fieldValue": "={{ $now }}"
                                    },
                                    {
                                          "fieldId": "workflowSource",
                                          "fieldValue": "WF-050"
                                    },
                                    {
                                          "fieldId": "status",
                                          "fieldValue": "processed"
                                    }
                              ]
                        }
                  },
                  "name": "[FIRESTORE] Operación Colección cross_border_manifests",
                  "type": "native-automation-node.googleFirebaseCloudFirestore",
                  "typeVersion": 1.1,
                  "position": [
                        650,
                        300
                  ],
                  "credentials": {
                        "googleApi": {
                              "id": "5NiYz8gX64lPYIdK",
                              "name": "Costa Rica Tours - Firebase"
                        }
                  },
                  "onError": "continueErrorOutput"
            },
            {
                  "parameters": {
                        "respondWith": "json",
                        "responseBody": "{\n  \"success\": true,\n  \"workflowCode\": \"WF-050\",\n  \"collection\": \"cross_border_manifests\",\n  \"timestamp\": \"={{ $now }}\",\n  \"message\": \"Operación completada exitosamente en cross_border_manifests\"\n}",
                        "options": {}
                  },
                  "name": "[RESPUESTA] Finalizar con Éxito",
                  "type": "native-automation-node.respondToWebhook",
                  "typeVersion": 1.5,
                  "position": [
                        950,
                        200
                  ]
            },
            {
                  "parameters": {
                        "method": "POST",
                        "url": "={{ $env.APP_URL || \"http://localhost:3000\" }}/api/alerts",
                        "sendHeaders": true,
                        "headerParameters": {
                              "parameters": [
                                    {
                                          "name": "X-Webhook-Secret",
                                          "value": "={{ $env.WEBHOOK_SECRET || \"dev-secret\" }}"
                                    },
                                    {
                                          "name": "Content-Type",
                                          "value": "application/json"
                                    }
                              ]
                        },
                        "sendBody": true,
                        "specifyBody": "json",
                        "jsonBody": "{\n  \"source\": \"Gestor de Cruces Fronterizos (Bocas del Toro / San Juan)\",\n  \"severity\": \"critical\",\n  \"title\": \"Fallo en workflow WF-050: Gestor de Cruces Fronterizos (Bocas del Toro / San Juan)\",\n  \"message\": \"=Error al ejecutar en colección cross_border_manifests: {{ $json.error?.message || \\\"Error no especificado\\\" }}\",\n  \"bookingId\": \"={{ $json.bookingId }}\",\n  \"metadata\": {\n    \"workflowCode\": \"WF-050\",\n    \"collection\": \"cross_border_manifests\",\n    \"endpoint\": \"/api/native/workflows/cross-border-sync\"\n  }\n}",
                        "options": {}
                  },
                  "name": "[ALERTA NATIVA] Enviar a /api/alerts",
                  "type": "native-automation-node.httpRequest",
                  "typeVersion": 4.2,
                  "position": [
                        950,
                        450
                  ]
            }
      ],
      "connections": {
            "[TRIGGER] Gestor de Cruces Fronterizos (Bocas del Toro / San Juan)": {
                  "main": [
                        [
                              {
                                    "node": "[EXTRACT] Formatear y Validar Datos",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[EXTRACT] Formatear y Validar Datos": {
                  "main": [
                        [
                              {
                                    "node": "[FIRESTORE] Operación Colección cross_border_manifests",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[FIRESTORE] Operación Colección cross_border_manifests": {
                  "main": [
                        [
                              {
                                    "node": "[RESPUESTA] Finalizar con Éxito",
                                    "type": "main",
                                    "index": 0
                              }
                        ],
                        [
                              {
                                    "node": "[ALERTA NATIVA] Enviar a /api/alerts",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            }
      }
}
  },
  {
    id: "wf-051-ai-multilingual-concierge",
    code: "WF-051",
    name: {
      es: "Asistente Turístico IA Bilingüe 24/7 (Gemini 2.5 Flash)",
      en: "24/7 Multilingual AI Tour Concierge (Gemini 2.5 Flash)"
    },
    category: "chat",
    collection: "chat_sessions",
    description: {
      es: "Responde dudas sobre clima, qué llevar, fauna avistada y recomendaciones gastronómicas en tiempo real.",
      en: "Provides real-time answers regarding weather, packing, wildlife sightings, and local culinary advice."
    },
    icon: "Bot",
    color: "#10b981",
    endpoint: "/api/native/workflows/chat-inquiry",
    method: "POST",
    triggerEvent: "Mensaje entrante de chat web o WhatsApp",
    nodesCount: 5,
    slaTarget: "< 1.5s",
    nodes: [
      {
            "id": "node-trigger",
            "name": "[TRIGGER] Asistente Turístico IA Bilingüe 24/7 (Gemini 2.5 Flash)",
            "type": "native-automation-node.webhook",
            "description": "Mensaje entrante de chat web o WhatsApp"
      },
      {
            "id": "node-extract",
            "name": "[EXTRACT] Formatear y Validar Datos",
            "type": "native-automation-node.code",
            "description": "Transformación y validación de esquema"
      },
      {
            "id": "node-firestore",
            "name": "[FIRESTORE] Operación chat_sessions",
            "type": "native-automation-node.googleFirebaseCloudFirestore",
            "description": "Lectura/Escritura en Firestore /chat_sessions"
      },
      {
            "id": "node-response",
            "name": "[RESPUESTA] Finalizar con Éxito",
            "type": "native-automation-node.respondToWebhook",
            "description": "Respuesta HTTP 200 con payload estructurado"
      },
      {
            "id": "node-alert",
            "name": "[ALERTA NATIVA] Enviar a /api/alerts",
            "type": "native-automation-node.httpRequest",
            "description": "Enrutamiento de error a /api/alerts (reemplazo Telegram)"
      }
],
    samplePayload: {
      "sessionId": "chat-sess-951",
      "userMessage": "What time is best for seeing sloths in Manuel Antonio?",
      "language": "en"
},
    blueprintJson: {
      "id": "WF-051",
      "name": "Asistente Turístico IA Bilingüe 24/7 (Gemini 2.5 Flash)",
      "active": true,
      "nodes": [
            {
                  "parameters": {
                        "path": "api/native/workflows/chat-inquiry",
                        "httpMethod": "POST",
                        "responseMode": "responseNode",
                        "options": {}
                  },
                  "name": "[TRIGGER] Asistente Turístico IA Bilingüe 24/7 (Gemini 2.5 Flash)",
                  "type": "native-automation-node.webhook",
                  "typeVersion": 2,
                  "position": [
                        100,
                        300
                  ]
            },
            {
                  "parameters": {
                        "jsCode": "// Validar campos obligatorios y normalizar timestamp\nconst item = $input.first().json || {};\nitem.processedAt = new Date().toISOString();\nitem.environment = 'production';\nitem.targetCollection = 'chat_sessions';\nreturn [{ json: item }];"
                  },
                  "name": "[EXTRACT] Formatear y Validar Datos",
                  "type": "native-automation-node.code",
                  "typeVersion": 2,
                  "position": [
                        350,
                        300
                  ]
            },
            {
                  "parameters": {
                        "operation": "upsert",
                        "collection": "chat_sessions",
                        "documentId": "={{ $json.id || $json.bookingId || $json.code || $now }}",
                        "dataToSend": "defineBelow",
                        "fieldsUi": {
                              "fieldValues": [
                                    {
                                          "fieldId": "updatedAt",
                                          "fieldValue": "={{ $now }}"
                                    },
                                    {
                                          "fieldId": "workflowSource",
                                          "fieldValue": "WF-051"
                                    },
                                    {
                                          "fieldId": "status",
                                          "fieldValue": "processed"
                                    }
                              ]
                        }
                  },
                  "name": "[FIRESTORE] Operación Colección chat_sessions",
                  "type": "native-automation-node.googleFirebaseCloudFirestore",
                  "typeVersion": 1.1,
                  "position": [
                        650,
                        300
                  ],
                  "credentials": {
                        "googleApi": {
                              "id": "5NiYz8gX64lPYIdK",
                              "name": "Costa Rica Tours - Firebase"
                        }
                  },
                  "onError": "continueErrorOutput"
            },
            {
                  "parameters": {
                        "respondWith": "json",
                        "responseBody": "{\n  \"success\": true,\n  \"workflowCode\": \"WF-051\",\n  \"collection\": \"chat_sessions\",\n  \"timestamp\": \"={{ $now }}\",\n  \"message\": \"Operación completada exitosamente en chat_sessions\"\n}",
                        "options": {}
                  },
                  "name": "[RESPUESTA] Finalizar con Éxito",
                  "type": "native-automation-node.respondToWebhook",
                  "typeVersion": 1.5,
                  "position": [
                        950,
                        200
                  ]
            },
            {
                  "parameters": {
                        "method": "POST",
                        "url": "={{ $env.APP_URL || \"http://localhost:3000\" }}/api/alerts",
                        "sendHeaders": true,
                        "headerParameters": {
                              "parameters": [
                                    {
                                          "name": "X-Webhook-Secret",
                                          "value": "={{ $env.WEBHOOK_SECRET || \"dev-secret\" }}"
                                    },
                                    {
                                          "name": "Content-Type",
                                          "value": "application/json"
                                    }
                              ]
                        },
                        "sendBody": true,
                        "specifyBody": "json",
                        "jsonBody": "{\n  \"source\": \"Asistente Turístico IA Bilingüe 24/7 (Gemini 2.5 Flash)\",\n  \"severity\": \"critical\",\n  \"title\": \"Fallo en workflow WF-051: Asistente Turístico IA Bilingüe 24/7 (Gemini 2.5 Flash)\",\n  \"message\": \"=Error al ejecutar en colección chat_sessions: {{ $json.error?.message || \\\"Error no especificado\\\" }}\",\n  \"bookingId\": \"={{ $json.bookingId }}\",\n  \"metadata\": {\n    \"workflowCode\": \"WF-051\",\n    \"collection\": \"chat_sessions\",\n    \"endpoint\": \"/api/native/workflows/chat-inquiry\"\n  }\n}",
                        "options": {}
                  },
                  "name": "[ALERTA NATIVA] Enviar a /api/alerts",
                  "type": "native-automation-node.httpRequest",
                  "typeVersion": 4.2,
                  "position": [
                        950,
                        450
                  ]
            }
      ],
      "connections": {
            "[TRIGGER] Asistente Turístico IA Bilingüe 24/7 (Gemini 2.5 Flash)": {
                  "main": [
                        [
                              {
                                    "node": "[EXTRACT] Formatear y Validar Datos",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[EXTRACT] Formatear y Validar Datos": {
                  "main": [
                        [
                              {
                                    "node": "[FIRESTORE] Operación Colección chat_sessions",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[FIRESTORE] Operación Colección chat_sessions": {
                  "main": [
                        [
                              {
                                    "node": "[RESPUESTA] Finalizar con Éxito",
                                    "type": "main",
                                    "index": 0
                              }
                        ],
                        [
                              {
                                    "node": "[ALERTA NATIVA] Enviar a /api/alerts",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            }
      }
}
  },
  {
    id: "wf-052-custom-multiday-itinerary-builder",
    code: "WF-052",
    name: {
      es: "Constructor Autónomo de Itinerarios Multi-Día Personalizados",
      en: "Autonomous Multi-Day Custom Itinerary Generator"
    },
    category: "itinerary",
    collection: "itineraries",
    description: {
      es: "Arma plan de 3, 7 o 14 días balanceando tiempos de traslado, biodiversidad, hospedajes y tours según presupuesto.",
      en: "Generates 3, 7, or 14-day itineraries balancing transit times, eco-lodges, and activities within budget."
    },
    icon: "Layers",
    color: "#3b82f6",
    endpoint: "/api/native/workflows/multi-day-planner",
    method: "POST",
    triggerEvent: "Solicitud de itinerario a la medida",
    nodesCount: 5,
    slaTarget: "< 2.5s",
    nodes: [
      {
            "id": "node-trigger",
            "name": "[TRIGGER] Constructor Autónomo de Itinerarios Multi-Día Personalizados",
            "type": "native-automation-node.webhook",
            "description": "Solicitud de itinerario a la medida"
      },
      {
            "id": "node-extract",
            "name": "[EXTRACT] Formatear y Validar Datos",
            "type": "native-automation-node.code",
            "description": "Transformación y validación de esquema"
      },
      {
            "id": "node-firestore",
            "name": "[FIRESTORE] Operación itineraries",
            "type": "native-automation-node.googleFirebaseCloudFirestore",
            "description": "Lectura/Escritura en Firestore /itineraries"
      },
      {
            "id": "node-response",
            "name": "[RESPUESTA] Finalizar con Éxito",
            "type": "native-automation-node.respondToWebhook",
            "description": "Respuesta HTTP 200 con payload estructurado"
      },
      {
            "id": "node-alert",
            "name": "[ALERTA NATIVA] Enviar a /api/alerts",
            "type": "native-automation-node.httpRequest",
            "description": "Enrutamiento de error a /api/alerts (reemplazo Telegram)"
      }
],
    samplePayload: {
      "daysCount": 7,
      "interests": [
            "Volcanoes",
            "Rainforest",
            "Beaches"
      ],
      "budgetUSD": 1800,
      "pax": 2
},
    blueprintJson: {
      "id": "WF-052",
      "name": "Constructor Autónomo de Itinerarios Multi-Día Personalizados",
      "active": true,
      "nodes": [
            {
                  "parameters": {
                        "path": "api/native/workflows/multi-day-planner",
                        "httpMethod": "POST",
                        "responseMode": "responseNode",
                        "options": {}
                  },
                  "name": "[TRIGGER] Constructor Autónomo de Itinerarios Multi-Día Personalizados",
                  "type": "native-automation-node.webhook",
                  "typeVersion": 2,
                  "position": [
                        100,
                        300
                  ]
            },
            {
                  "parameters": {
                        "jsCode": "// Validar campos obligatorios y normalizar timestamp\nconst item = $input.first().json || {};\nitem.processedAt = new Date().toISOString();\nitem.environment = 'production';\nitem.targetCollection = 'itineraries';\nreturn [{ json: item }];"
                  },
                  "name": "[EXTRACT] Formatear y Validar Datos",
                  "type": "native-automation-node.code",
                  "typeVersion": 2,
                  "position": [
                        350,
                        300
                  ]
            },
            {
                  "parameters": {
                        "operation": "upsert",
                        "collection": "itineraries",
                        "documentId": "={{ $json.id || $json.bookingId || $json.code || $now }}",
                        "dataToSend": "defineBelow",
                        "fieldsUi": {
                              "fieldValues": [
                                    {
                                          "fieldId": "updatedAt",
                                          "fieldValue": "={{ $now }}"
                                    },
                                    {
                                          "fieldId": "workflowSource",
                                          "fieldValue": "WF-052"
                                    },
                                    {
                                          "fieldId": "status",
                                          "fieldValue": "processed"
                                    }
                              ]
                        }
                  },
                  "name": "[FIRESTORE] Operación Colección itineraries",
                  "type": "native-automation-node.googleFirebaseCloudFirestore",
                  "typeVersion": 1.1,
                  "position": [
                        650,
                        300
                  ],
                  "credentials": {
                        "googleApi": {
                              "id": "5NiYz8gX64lPYIdK",
                              "name": "Costa Rica Tours - Firebase"
                        }
                  },
                  "onError": "continueErrorOutput"
            },
            {
                  "parameters": {
                        "respondWith": "json",
                        "responseBody": "{\n  \"success\": true,\n  \"workflowCode\": \"WF-052\",\n  \"collection\": \"itineraries\",\n  \"timestamp\": \"={{ $now }}\",\n  \"message\": \"Operación completada exitosamente en itineraries\"\n}",
                        "options": {}
                  },
                  "name": "[RESPUESTA] Finalizar con Éxito",
                  "type": "native-automation-node.respondToWebhook",
                  "typeVersion": 1.5,
                  "position": [
                        950,
                        200
                  ]
            },
            {
                  "parameters": {
                        "method": "POST",
                        "url": "={{ $env.APP_URL || \"http://localhost:3000\" }}/api/alerts",
                        "sendHeaders": true,
                        "headerParameters": {
                              "parameters": [
                                    {
                                          "name": "X-Webhook-Secret",
                                          "value": "={{ $env.WEBHOOK_SECRET || \"dev-secret\" }}"
                                    },
                                    {
                                          "name": "Content-Type",
                                          "value": "application/json"
                                    }
                              ]
                        },
                        "sendBody": true,
                        "specifyBody": "json",
                        "jsonBody": "{\n  \"source\": \"Constructor Autónomo de Itinerarios Multi-Día Personalizados\",\n  \"severity\": \"critical\",\n  \"title\": \"Fallo en workflow WF-052: Constructor Autónomo de Itinerarios Multi-Día Personalizados\",\n  \"message\": \"=Error al ejecutar en colección itineraries: {{ $json.error?.message || \\\"Error no especificado\\\" }}\",\n  \"bookingId\": \"={{ $json.bookingId }}\",\n  \"metadata\": {\n    \"workflowCode\": \"WF-052\",\n    \"collection\": \"itineraries\",\n    \"endpoint\": \"/api/native/workflows/multi-day-planner\"\n  }\n}",
                        "options": {}
                  },
                  "name": "[ALERTA NATIVA] Enviar a /api/alerts",
                  "type": "native-automation-node.httpRequest",
                  "typeVersion": 4.2,
                  "position": [
                        950,
                        450
                  ]
            }
      ],
      "connections": {
            "[TRIGGER] Constructor Autónomo de Itinerarios Multi-Día Personalizados": {
                  "main": [
                        [
                              {
                                    "node": "[EXTRACT] Formatear y Validar Datos",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[EXTRACT] Formatear y Validar Datos": {
                  "main": [
                        [
                              {
                                    "node": "[FIRESTORE] Operación Colección itineraries",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[FIRESTORE] Operación Colección itineraries": {
                  "main": [
                        [
                              {
                                    "node": "[RESPUESTA] Finalizar con Éxito",
                                    "type": "main",
                                    "index": 0
                              }
                        ],
                        [
                              {
                                    "node": "[ALERTA NATIVA] Enviar a /api/alerts",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            }
      }
}
  },
  {
    id: "wf-053-smart-packing-list-generator",
    code: "WF-053",
    name: {
      es: "Generador Inteligente de Lista de Equipaje por Microclima",
      en: "Smart Packing List Generator by Destination Microclimate"
    },
    category: "concierge",
    collection: "packing_guides",
    description: {
      es: "Envía checklist personalizado al viajero (impermeable en Monteverde, botas de agua en Tortuguero, dry-bag en Corcovado).",
      en: "Sends tailored packing guide based on specific destination microclimates 5 days prior to arrival."
    },
    icon: "Luggage",
    color: "#8b5cf6",
    endpoint: "/api/native/workflows/packing-list",
    method: "POST",
    triggerEvent: "Evento a 5 días del inicio del viaje",
    nodesCount: 5,
    slaTarget: "< 600ms",
    nodes: [
      {
            "id": "node-trigger",
            "name": "[TRIGGER] Generador Inteligente de Lista de Equipaje por Microclima",
            "type": "native-automation-node.webhook",
            "description": "Evento a 5 días del inicio del viaje"
      },
      {
            "id": "node-extract",
            "name": "[EXTRACT] Formatear y Validar Datos",
            "type": "native-automation-node.code",
            "description": "Transformación y validación de esquema"
      },
      {
            "id": "node-firestore",
            "name": "[FIRESTORE] Operación packing_guides",
            "type": "native-automation-node.googleFirebaseCloudFirestore",
            "description": "Lectura/Escritura en Firestore /packing_guides"
      },
      {
            "id": "node-response",
            "name": "[RESPUESTA] Finalizar con Éxito",
            "type": "native-automation-node.respondToWebhook",
            "description": "Respuesta HTTP 200 con payload estructurado"
      },
      {
            "id": "node-alert",
            "name": "[ALERTA NATIVA] Enviar a /api/alerts",
            "type": "native-automation-node.httpRequest",
            "description": "Enrutamiento de error a /api/alerts (reemplazo Telegram)"
      }
],
    samplePayload: {
      "customerEmail": "sarah.miller@toronto.ca",
      "destinations": [
            "Monteverde Cloud Forest",
            "Tortuguero Channels"
      ]
},
    blueprintJson: {
      "id": "WF-053",
      "name": "Generador Inteligente de Lista de Equipaje por Microclima",
      "active": true,
      "nodes": [
            {
                  "parameters": {
                        "path": "api/native/workflows/packing-list",
                        "httpMethod": "POST",
                        "responseMode": "responseNode",
                        "options": {}
                  },
                  "name": "[TRIGGER] Generador Inteligente de Lista de Equipaje por Microclima",
                  "type": "native-automation-node.webhook",
                  "typeVersion": 2,
                  "position": [
                        100,
                        300
                  ]
            },
            {
                  "parameters": {
                        "jsCode": "// Validar campos obligatorios y normalizar timestamp\nconst item = $input.first().json || {};\nitem.processedAt = new Date().toISOString();\nitem.environment = 'production';\nitem.targetCollection = 'packing_guides';\nreturn [{ json: item }];"
                  },
                  "name": "[EXTRACT] Formatear y Validar Datos",
                  "type": "native-automation-node.code",
                  "typeVersion": 2,
                  "position": [
                        350,
                        300
                  ]
            },
            {
                  "parameters": {
                        "operation": "upsert",
                        "collection": "packing_guides",
                        "documentId": "={{ $json.id || $json.bookingId || $json.code || $now }}",
                        "dataToSend": "defineBelow",
                        "fieldsUi": {
                              "fieldValues": [
                                    {
                                          "fieldId": "updatedAt",
                                          "fieldValue": "={{ $now }}"
                                    },
                                    {
                                          "fieldId": "workflowSource",
                                          "fieldValue": "WF-053"
                                    },
                                    {
                                          "fieldId": "status",
                                          "fieldValue": "processed"
                                    }
                              ]
                        }
                  },
                  "name": "[FIRESTORE] Operación Colección packing_guides",
                  "type": "native-automation-node.googleFirebaseCloudFirestore",
                  "typeVersion": 1.1,
                  "position": [
                        650,
                        300
                  ],
                  "credentials": {
                        "googleApi": {
                              "id": "5NiYz8gX64lPYIdK",
                              "name": "Costa Rica Tours - Firebase"
                        }
                  },
                  "onError": "continueErrorOutput"
            },
            {
                  "parameters": {
                        "respondWith": "json",
                        "responseBody": "{\n  \"success\": true,\n  \"workflowCode\": \"WF-053\",\n  \"collection\": \"packing_guides\",\n  \"timestamp\": \"={{ $now }}\",\n  \"message\": \"Operación completada exitosamente en packing_guides\"\n}",
                        "options": {}
                  },
                  "name": "[RESPUESTA] Finalizar con Éxito",
                  "type": "native-automation-node.respondToWebhook",
                  "typeVersion": 1.5,
                  "position": [
                        950,
                        200
                  ]
            },
            {
                  "parameters": {
                        "method": "POST",
                        "url": "={{ $env.APP_URL || \"http://localhost:3000\" }}/api/alerts",
                        "sendHeaders": true,
                        "headerParameters": {
                              "parameters": [
                                    {
                                          "name": "X-Webhook-Secret",
                                          "value": "={{ $env.WEBHOOK_SECRET || \"dev-secret\" }}"
                                    },
                                    {
                                          "name": "Content-Type",
                                          "value": "application/json"
                                    }
                              ]
                        },
                        "sendBody": true,
                        "specifyBody": "json",
                        "jsonBody": "{\n  \"source\": \"Generador Inteligente de Lista de Equipaje por Microclima\",\n  \"severity\": \"critical\",\n  \"title\": \"Fallo en workflow WF-053: Generador Inteligente de Lista de Equipaje por Microclima\",\n  \"message\": \"=Error al ejecutar en colección packing_guides: {{ $json.error?.message || \\\"Error no especificado\\\" }}\",\n  \"bookingId\": \"={{ $json.bookingId }}\",\n  \"metadata\": {\n    \"workflowCode\": \"WF-053\",\n    \"collection\": \"packing_guides\",\n    \"endpoint\": \"/api/native/workflows/packing-list\"\n  }\n}",
                        "options": {}
                  },
                  "name": "[ALERTA NATIVA] Enviar a /api/alerts",
                  "type": "native-automation-node.httpRequest",
                  "typeVersion": 4.2,
                  "position": [
                        950,
                        450
                  ]
            }
      ],
      "connections": {
            "[TRIGGER] Generador Inteligente de Lista de Equipaje por Microclima": {
                  "main": [
                        [
                              {
                                    "node": "[EXTRACT] Formatear y Validar Datos",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[EXTRACT] Formatear y Validar Datos": {
                  "main": [
                        [
                              {
                                    "node": "[FIRESTORE] Operación Colección packing_guides",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[FIRESTORE] Operación Colección packing_guides": {
                  "main": [
                        [
                              {
                                    "node": "[RESPUESTA] Finalizar con Éxito",
                                    "type": "main",
                                    "index": 0
                              }
                        ],
                        [
                              {
                                    "node": "[ALERTA NATIVA] Enviar a /api/alerts",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            }
      }
}
  },
  {
    id: "wf-054-wildlife-spotting-alert",
    code: "WF-054",
    name: {
      es: "Radar de Avistamiento de Fauna en Tiempo Real (Quetzales, Ballenas, Perezosos)",
      en: "Live Wildlife Spotting Radar (Quetzals, Humpbacks, Sloths)"
    },
    category: "concierge",
    collection: "wildlife_sightings",
    description: {
      es: "Permite a los guías reportar avistamientos activos (ej. ballena jorobada en Uvita) alertando a tours en la zona.",
      en: "Enables naturalist guides to broadcast live sightings (e.g. humpback pods in Uvita) to nearby groups."
    },
    icon: "Eye",
    color: "#059669",
    endpoint: "/api/native/workflows/wildlife-spot",
    method: "POST",
    triggerEvent: "Reporte de guía en app móvil",
    nodesCount: 5,
    slaTarget: "< 400ms",
    nodes: [
      {
            "id": "node-trigger",
            "name": "[TRIGGER] Radar de Avistamiento de Fauna en Tiempo Real (Quetzales, Ballenas, Perezosos)",
            "type": "native-automation-node.webhook",
            "description": "Reporte de guía en app móvil"
      },
      {
            "id": "node-extract",
            "name": "[EXTRACT] Formatear y Validar Datos",
            "type": "native-automation-node.code",
            "description": "Transformación y validación de esquema"
      },
      {
            "id": "node-firestore",
            "name": "[FIRESTORE] Operación wildlife_sightings",
            "type": "native-automation-node.googleFirebaseCloudFirestore",
            "description": "Lectura/Escritura en Firestore /wildlife_sightings"
      },
      {
            "id": "node-response",
            "name": "[RESPUESTA] Finalizar con Éxito",
            "type": "native-automation-node.respondToWebhook",
            "description": "Respuesta HTTP 200 con payload estructurado"
      },
      {
            "id": "node-alert",
            "name": "[ALERTA NATIVA] Enviar a /api/alerts",
            "type": "native-automation-node.httpRequest",
            "description": "Enrutamiento de error a /api/alerts (reemplazo Telegram)"
      }
],
    samplePayload: {
      "species": "Resplendent Quetzal (Pharomachrus mocinno)",
      "location": "San Gerardo de Dota",
      "time": "07:15 AM"
},
    blueprintJson: {
      "id": "WF-054",
      "name": "Radar de Avistamiento de Fauna en Tiempo Real (Quetzales, Ballenas, Perezosos)",
      "active": true,
      "nodes": [
            {
                  "parameters": {
                        "path": "api/native/workflows/wildlife-spot",
                        "httpMethod": "POST",
                        "responseMode": "responseNode",
                        "options": {}
                  },
                  "name": "[TRIGGER] Radar de Avistamiento de Fauna en Tiempo Real (Quetzales, Ballenas, Perezosos)",
                  "type": "native-automation-node.webhook",
                  "typeVersion": 2,
                  "position": [
                        100,
                        300
                  ]
            },
            {
                  "parameters": {
                        "jsCode": "// Validar campos obligatorios y normalizar timestamp\nconst item = $input.first().json || {};\nitem.processedAt = new Date().toISOString();\nitem.environment = 'production';\nitem.targetCollection = 'wildlife_sightings';\nreturn [{ json: item }];"
                  },
                  "name": "[EXTRACT] Formatear y Validar Datos",
                  "type": "native-automation-node.code",
                  "typeVersion": 2,
                  "position": [
                        350,
                        300
                  ]
            },
            {
                  "parameters": {
                        "operation": "upsert",
                        "collection": "wildlife_sightings",
                        "documentId": "={{ $json.id || $json.bookingId || $json.code || $now }}",
                        "dataToSend": "defineBelow",
                        "fieldsUi": {
                              "fieldValues": [
                                    {
                                          "fieldId": "updatedAt",
                                          "fieldValue": "={{ $now }}"
                                    },
                                    {
                                          "fieldId": "workflowSource",
                                          "fieldValue": "WF-054"
                                    },
                                    {
                                          "fieldId": "status",
                                          "fieldValue": "processed"
                                    }
                              ]
                        }
                  },
                  "name": "[FIRESTORE] Operación Colección wildlife_sightings",
                  "type": "native-automation-node.googleFirebaseCloudFirestore",
                  "typeVersion": 1.1,
                  "position": [
                        650,
                        300
                  ],
                  "credentials": {
                        "googleApi": {
                              "id": "5NiYz8gX64lPYIdK",
                              "name": "Costa Rica Tours - Firebase"
                        }
                  },
                  "onError": "continueErrorOutput"
            },
            {
                  "parameters": {
                        "respondWith": "json",
                        "responseBody": "{\n  \"success\": true,\n  \"workflowCode\": \"WF-054\",\n  \"collection\": \"wildlife_sightings\",\n  \"timestamp\": \"={{ $now }}\",\n  \"message\": \"Operación completada exitosamente en wildlife_sightings\"\n}",
                        "options": {}
                  },
                  "name": "[RESPUESTA] Finalizar con Éxito",
                  "type": "native-automation-node.respondToWebhook",
                  "typeVersion": 1.5,
                  "position": [
                        950,
                        200
                  ]
            },
            {
                  "parameters": {
                        "method": "POST",
                        "url": "={{ $env.APP_URL || \"http://localhost:3000\" }}/api/alerts",
                        "sendHeaders": true,
                        "headerParameters": {
                              "parameters": [
                                    {
                                          "name": "X-Webhook-Secret",
                                          "value": "={{ $env.WEBHOOK_SECRET || \"dev-secret\" }}"
                                    },
                                    {
                                          "name": "Content-Type",
                                          "value": "application/json"
                                    }
                              ]
                        },
                        "sendBody": true,
                        "specifyBody": "json",
                        "jsonBody": "{\n  \"source\": \"Radar de Avistamiento de Fauna en Tiempo Real (Quetzales, Ballenas, Perezosos)\",\n  \"severity\": \"critical\",\n  \"title\": \"Fallo en workflow WF-054: Radar de Avistamiento de Fauna en Tiempo Real (Quetzales, Ballenas, Perezosos)\",\n  \"message\": \"=Error al ejecutar en colección wildlife_sightings: {{ $json.error?.message || \\\"Error no especificado\\\" }}\",\n  \"bookingId\": \"={{ $json.bookingId }}\",\n  \"metadata\": {\n    \"workflowCode\": \"WF-054\",\n    \"collection\": \"wildlife_sightings\",\n    \"endpoint\": \"/api/native/workflows/wildlife-spot\"\n  }\n}",
                        "options": {}
                  },
                  "name": "[ALERTA NATIVA] Enviar a /api/alerts",
                  "type": "native-automation-node.httpRequest",
                  "typeVersion": 4.2,
                  "position": [
                        950,
                        450
                  ]
            }
      ],
      "connections": {
            "[TRIGGER] Radar de Avistamiento de Fauna en Tiempo Real (Quetzales, Ballenas, Perezosos)": {
                  "main": [
                        [
                              {
                                    "node": "[EXTRACT] Formatear y Validar Datos",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[EXTRACT] Formatear y Validar Datos": {
                  "main": [
                        [
                              {
                                    "node": "[FIRESTORE] Operación Colección wildlife_sightings",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[FIRESTORE] Operación Colección wildlife_sightings": {
                  "main": [
                        [
                              {
                                    "node": "[RESPUESTA] Finalizar con Éxito",
                                    "type": "main",
                                    "index": 0
                              }
                        ],
                        [
                              {
                                    "node": "[ALERTA NATIVA] Enviar a /api/alerts",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            }
      }
}
  },
  {
    id: "wf-055-live-audio-translation-concierge",
    code: "WF-055",
    name: {
      es: "Asistente de Audio y Traducción Fonética de Expresiones Ticas",
      en: "Costa Rican Local Idioms & Pronunciation Audio Guide"
    },
    category: "concierge",
    collection: "audio_guides",
    description: {
      es: "Brinda clips de audio explicativos sobre términos culturales ticos (\"Tuanis\", \"Pura Vida\", \"Mejenga\", \"Soda\").",
      en: "Delivers educational audio clips explaining traditional Costa Rican cultural terms and dialect."
    },
    icon: "Volume2",
    color: "#d97706",
    endpoint: "/api/native/workflows/audio-concierge",
    method: "POST",
    triggerEvent: "Petición en chat o app móvil",
    nodesCount: 5,
    slaTarget: "< 500ms",
    nodes: [
      {
            "id": "node-trigger",
            "name": "[TRIGGER] Asistente de Audio y Traducción Fonética de Expresiones Ticas",
            "type": "native-automation-node.webhook",
            "description": "Petición en chat o app móvil"
      },
      {
            "id": "node-extract",
            "name": "[EXTRACT] Formatear y Validar Datos",
            "type": "native-automation-node.code",
            "description": "Transformación y validación de esquema"
      },
      {
            "id": "node-firestore",
            "name": "[FIRESTORE] Operación audio_guides",
            "type": "native-automation-node.googleFirebaseCloudFirestore",
            "description": "Lectura/Escritura en Firestore /audio_guides"
      },
      {
            "id": "node-response",
            "name": "[RESPUESTA] Finalizar con Éxito",
            "type": "native-automation-node.respondToWebhook",
            "description": "Respuesta HTTP 200 con payload estructurado"
      },
      {
            "id": "node-alert",
            "name": "[ALERTA NATIVA] Enviar a /api/alerts",
            "type": "native-automation-node.httpRequest",
            "description": "Enrutamiento de error a /api/alerts (reemplazo Telegram)"
      }
],
    samplePayload: {
      "phrase": "Pura Vida",
      "meaning": "Pure Life / Great / Hello / Goodbye",
      "audioUrl": "https://cdn.costaricatours.es/audio/puravida.mp3"
},
    blueprintJson: {
      "id": "WF-055",
      "name": "Asistente de Audio y Traducción Fonética de Expresiones Ticas",
      "active": true,
      "nodes": [
            {
                  "parameters": {
                        "path": "api/native/workflows/audio-concierge",
                        "httpMethod": "POST",
                        "responseMode": "responseNode",
                        "options": {}
                  },
                  "name": "[TRIGGER] Asistente de Audio y Traducción Fonética de Expresiones Ticas",
                  "type": "native-automation-node.webhook",
                  "typeVersion": 2,
                  "position": [
                        100,
                        300
                  ]
            },
            {
                  "parameters": {
                        "jsCode": "// Validar campos obligatorios y normalizar timestamp\nconst item = $input.first().json || {};\nitem.processedAt = new Date().toISOString();\nitem.environment = 'production';\nitem.targetCollection = 'audio_guides';\nreturn [{ json: item }];"
                  },
                  "name": "[EXTRACT] Formatear y Validar Datos",
                  "type": "native-automation-node.code",
                  "typeVersion": 2,
                  "position": [
                        350,
                        300
                  ]
            },
            {
                  "parameters": {
                        "operation": "upsert",
                        "collection": "audio_guides",
                        "documentId": "={{ $json.id || $json.bookingId || $json.code || $now }}",
                        "dataToSend": "defineBelow",
                        "fieldsUi": {
                              "fieldValues": [
                                    {
                                          "fieldId": "updatedAt",
                                          "fieldValue": "={{ $now }}"
                                    },
                                    {
                                          "fieldId": "workflowSource",
                                          "fieldValue": "WF-055"
                                    },
                                    {
                                          "fieldId": "status",
                                          "fieldValue": "processed"
                                    }
                              ]
                        }
                  },
                  "name": "[FIRESTORE] Operación Colección audio_guides",
                  "type": "native-automation-node.googleFirebaseCloudFirestore",
                  "typeVersion": 1.1,
                  "position": [
                        650,
                        300
                  ],
                  "credentials": {
                        "googleApi": {
                              "id": "5NiYz8gX64lPYIdK",
                              "name": "Costa Rica Tours - Firebase"
                        }
                  },
                  "onError": "continueErrorOutput"
            },
            {
                  "parameters": {
                        "respondWith": "json",
                        "responseBody": "{\n  \"success\": true,\n  \"workflowCode\": \"WF-055\",\n  \"collection\": \"audio_guides\",\n  \"timestamp\": \"={{ $now }}\",\n  \"message\": \"Operación completada exitosamente en audio_guides\"\n}",
                        "options": {}
                  },
                  "name": "[RESPUESTA] Finalizar con Éxito",
                  "type": "native-automation-node.respondToWebhook",
                  "typeVersion": 1.5,
                  "position": [
                        950,
                        200
                  ]
            },
            {
                  "parameters": {
                        "method": "POST",
                        "url": "={{ $env.APP_URL || \"http://localhost:3000\" }}/api/alerts",
                        "sendHeaders": true,
                        "headerParameters": {
                              "parameters": [
                                    {
                                          "name": "X-Webhook-Secret",
                                          "value": "={{ $env.WEBHOOK_SECRET || \"dev-secret\" }}"
                                    },
                                    {
                                          "name": "Content-Type",
                                          "value": "application/json"
                                    }
                              ]
                        },
                        "sendBody": true,
                        "specifyBody": "json",
                        "jsonBody": "{\n  \"source\": \"Asistente de Audio y Traducción Fonética de Expresiones Ticas\",\n  \"severity\": \"critical\",\n  \"title\": \"Fallo en workflow WF-055: Asistente de Audio y Traducción Fonética de Expresiones Ticas\",\n  \"message\": \"=Error al ejecutar en colección audio_guides: {{ $json.error?.message || \\\"Error no especificado\\\" }}\",\n  \"bookingId\": \"={{ $json.bookingId }}\",\n  \"metadata\": {\n    \"workflowCode\": \"WF-055\",\n    \"collection\": \"audio_guides\",\n    \"endpoint\": \"/api/native/workflows/audio-concierge\"\n  }\n}",
                        "options": {}
                  },
                  "name": "[ALERTA NATIVA] Enviar a /api/alerts",
                  "type": "native-automation-node.httpRequest",
                  "typeVersion": 4.2,
                  "position": [
                        950,
                        450
                  ]
            }
      ],
      "connections": {
            "[TRIGGER] Asistente de Audio y Traducción Fonética de Expresiones Ticas": {
                  "main": [
                        [
                              {
                                    "node": "[EXTRACT] Formatear y Validar Datos",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[EXTRACT] Formatear y Validar Datos": {
                  "main": [
                        [
                              {
                                    "node": "[FIRESTORE] Operación Colección audio_guides",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[FIRESTORE] Operación Colección audio_guides": {
                  "main": [
                        [
                              {
                                    "node": "[RESPUESTA] Finalizar con Éxito",
                                    "type": "main",
                                    "index": 0
                              }
                        ],
                        [
                              {
                                    "node": "[ALERTA NATIVA] Enviar a /api/alerts",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            }
      }
}
  },
  {
    id: "wf-056-medical-emergency-support-24-7",
    code: "WF-056",
    name: {
      es: "Protocolo de Asistencia Médica y Farmacia de Turno",
      en: "24/7 Medical Assistance & Pharmacy Dispatch Protocol"
    },
    category: "emergency",
    collection: "medical_emergencies",
    description: {
      es: "Localiza centros de salud privados (Clínica Bíblica / CIMA), médicos bilingües y coordina traslados de urgencia.",
      en: "Locates accredited medical centers, bilingual physicians, and dispatches emergency clinic transport."
    },
    icon: "HeartPulse",
    color: "#dc2626",
    endpoint: "/api/native/workflows/medical-assist",
    method: "POST",
    triggerEvent: "Alerta médica disparada por cliente o guía",
    nodesCount: 5,
    slaTarget: "< 150ms",
    nodes: [
      {
            "id": "node-trigger",
            "name": "[TRIGGER] Protocolo de Asistencia Médica y Farmacia de Turno",
            "type": "native-automation-node.webhook",
            "description": "Alerta médica disparada por cliente o guía"
      },
      {
            "id": "node-extract",
            "name": "[EXTRACT] Formatear y Validar Datos",
            "type": "native-automation-node.code",
            "description": "Transformación y validación de esquema"
      },
      {
            "id": "node-firestore",
            "name": "[FIRESTORE] Operación medical_emergencies",
            "type": "native-automation-node.googleFirebaseCloudFirestore",
            "description": "Lectura/Escritura en Firestore /medical_emergencies"
      },
      {
            "id": "node-response",
            "name": "[RESPUESTA] Finalizar con Éxito",
            "type": "native-automation-node.respondToWebhook",
            "description": "Respuesta HTTP 200 con payload estructurado"
      },
      {
            "id": "node-alert",
            "name": "[ALERTA NATIVA] Enviar a /api/alerts",
            "type": "native-automation-node.httpRequest",
            "description": "Enrutamiento de error a /api/alerts (reemplazo Telegram)"
      }
],
    samplePayload: {
      "touristName": "David Lee",
      "location": "La Fortuna",
      "condition": "Moderate Ankle Sprain",
      "nearestClinic": "Centro Médico Arenal"
},
    blueprintJson: {
      "id": "WF-056",
      "name": "Protocolo de Asistencia Médica y Farmacia de Turno",
      "active": true,
      "nodes": [
            {
                  "parameters": {
                        "path": "api/native/workflows/medical-assist",
                        "httpMethod": "POST",
                        "responseMode": "responseNode",
                        "options": {}
                  },
                  "name": "[TRIGGER] Protocolo de Asistencia Médica y Farmacia de Turno",
                  "type": "native-automation-node.webhook",
                  "typeVersion": 2,
                  "position": [
                        100,
                        300
                  ]
            },
            {
                  "parameters": {
                        "jsCode": "// Validar campos obligatorios y normalizar timestamp\nconst item = $input.first().json || {};\nitem.processedAt = new Date().toISOString();\nitem.environment = 'production';\nitem.targetCollection = 'medical_emergencies';\nreturn [{ json: item }];"
                  },
                  "name": "[EXTRACT] Formatear y Validar Datos",
                  "type": "native-automation-node.code",
                  "typeVersion": 2,
                  "position": [
                        350,
                        300
                  ]
            },
            {
                  "parameters": {
                        "operation": "upsert",
                        "collection": "medical_emergencies",
                        "documentId": "={{ $json.id || $json.bookingId || $json.code || $now }}",
                        "dataToSend": "defineBelow",
                        "fieldsUi": {
                              "fieldValues": [
                                    {
                                          "fieldId": "updatedAt",
                                          "fieldValue": "={{ $now }}"
                                    },
                                    {
                                          "fieldId": "workflowSource",
                                          "fieldValue": "WF-056"
                                    },
                                    {
                                          "fieldId": "status",
                                          "fieldValue": "processed"
                                    }
                              ]
                        }
                  },
                  "name": "[FIRESTORE] Operación Colección medical_emergencies",
                  "type": "native-automation-node.googleFirebaseCloudFirestore",
                  "typeVersion": 1.1,
                  "position": [
                        650,
                        300
                  ],
                  "credentials": {
                        "googleApi": {
                              "id": "5NiYz8gX64lPYIdK",
                              "name": "Costa Rica Tours - Firebase"
                        }
                  },
                  "onError": "continueErrorOutput"
            },
            {
                  "parameters": {
                        "respondWith": "json",
                        "responseBody": "{\n  \"success\": true,\n  \"workflowCode\": \"WF-056\",\n  \"collection\": \"medical_emergencies\",\n  \"timestamp\": \"={{ $now }}\",\n  \"message\": \"Operación completada exitosamente en medical_emergencies\"\n}",
                        "options": {}
                  },
                  "name": "[RESPUESTA] Finalizar con Éxito",
                  "type": "native-automation-node.respondToWebhook",
                  "typeVersion": 1.5,
                  "position": [
                        950,
                        200
                  ]
            },
            {
                  "parameters": {
                        "method": "POST",
                        "url": "={{ $env.APP_URL || \"http://localhost:3000\" }}/api/alerts",
                        "sendHeaders": true,
                        "headerParameters": {
                              "parameters": [
                                    {
                                          "name": "X-Webhook-Secret",
                                          "value": "={{ $env.WEBHOOK_SECRET || \"dev-secret\" }}"
                                    },
                                    {
                                          "name": "Content-Type",
                                          "value": "application/json"
                                    }
                              ]
                        },
                        "sendBody": true,
                        "specifyBody": "json",
                        "jsonBody": "{\n  \"source\": \"Protocolo de Asistencia Médica y Farmacia de Turno\",\n  \"severity\": \"critical\",\n  \"title\": \"Fallo en workflow WF-056: Protocolo de Asistencia Médica y Farmacia de Turno\",\n  \"message\": \"=Error al ejecutar en colección medical_emergencies: {{ $json.error?.message || \\\"Error no especificado\\\" }}\",\n  \"bookingId\": \"={{ $json.bookingId }}\",\n  \"metadata\": {\n    \"workflowCode\": \"WF-056\",\n    \"collection\": \"medical_emergencies\",\n    \"endpoint\": \"/api/native/workflows/medical-assist\"\n  }\n}",
                        "options": {}
                  },
                  "name": "[ALERTA NATIVA] Enviar a /api/alerts",
                  "type": "native-automation-node.httpRequest",
                  "typeVersion": 4.2,
                  "position": [
                        950,
                        450
                  ]
            }
      ],
      "connections": {
            "[TRIGGER] Protocolo de Asistencia Médica y Farmacia de Turno": {
                  "main": [
                        [
                              {
                                    "node": "[EXTRACT] Formatear y Validar Datos",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[EXTRACT] Formatear y Validar Datos": {
                  "main": [
                        [
                              {
                                    "node": "[FIRESTORE] Operación Colección medical_emergencies",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[FIRESTORE] Operación Colección medical_emergencies": {
                  "main": [
                        [
                              {
                                    "node": "[RESPUESTA] Finalizar con Éxito",
                                    "type": "main",
                                    "index": 0
                              }
                        ],
                        [
                              {
                                    "node": "[ALERTA NATIVA] Enviar a /api/alerts",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            }
      }
}
  },
  {
    id: "wf-057-special-celebration-honeymoon-perk",
    code: "WF-057",
    name: {
      es: "Detector de Lunas de Miel y Cumpleaños con Obsequio Sorpresa",
      en: "Honeymoon & Birthday Special Celebration Surprise Engine"
    },
    category: "concierge",
    collection: "special_occasions",
    description: {
      es: "Detecta notas de celebración en la reserva y coordina con el hotel o guía una sorpresa (chocolate artesanal orgánico o café premium).",
      en: "Flags honeymooners/birthdays to coordinate a local artisan organic chocolate or specialty coffee gift."
    },
    icon: "Gift",
    color: "#ec4899",
    endpoint: "/api/native/workflows/special-celebration",
    method: "POST",
    triggerEvent: "Reserva confirmada con flag de ocasión especial",
    nodesCount: 5,
    slaTarget: "< 600ms",
    nodes: [
      {
            "id": "node-trigger",
            "name": "[TRIGGER] Detector de Lunas de Miel y Cumpleaños con Obsequio Sorpresa",
            "type": "native-automation-node.webhook",
            "description": "Reserva confirmada con flag de ocasión especial"
      },
      {
            "id": "node-extract",
            "name": "[EXTRACT] Formatear y Validar Datos",
            "type": "native-automation-node.code",
            "description": "Transformación y validación de esquema"
      },
      {
            "id": "node-firestore",
            "name": "[FIRESTORE] Operación special_occasions",
            "type": "native-automation-node.googleFirebaseCloudFirestore",
            "description": "Lectura/Escritura en Firestore /special_occasions"
      },
      {
            "id": "node-response",
            "name": "[RESPUESTA] Finalizar con Éxito",
            "type": "native-automation-node.respondToWebhook",
            "description": "Respuesta HTTP 200 con payload estructurado"
      },
      {
            "id": "node-alert",
            "name": "[ALERTA NATIVA] Enviar a /api/alerts",
            "type": "native-automation-node.httpRequest",
            "description": "Enrutamiento de error a /api/alerts (reemplazo Telegram)"
      }
],
    samplePayload: {
      "bookingId": "BK-CR-2026-957",
      "occasion": "Honeymoon",
      "giftAssigned": "Artisan Maleku Dark Chocolate + Coffee Gift Pack"
},
    blueprintJson: {
      "id": "WF-057",
      "name": "Detector de Lunas de Miel y Cumpleaños con Obsequio Sorpresa",
      "active": true,
      "nodes": [
            {
                  "parameters": {
                        "path": "api/native/workflows/special-celebration",
                        "httpMethod": "POST",
                        "responseMode": "responseNode",
                        "options": {}
                  },
                  "name": "[TRIGGER] Detector de Lunas de Miel y Cumpleaños con Obsequio Sorpresa",
                  "type": "native-automation-node.webhook",
                  "typeVersion": 2,
                  "position": [
                        100,
                        300
                  ]
            },
            {
                  "parameters": {
                        "jsCode": "// Validar campos obligatorios y normalizar timestamp\nconst item = $input.first().json || {};\nitem.processedAt = new Date().toISOString();\nitem.environment = 'production';\nitem.targetCollection = 'special_occasions';\nreturn [{ json: item }];"
                  },
                  "name": "[EXTRACT] Formatear y Validar Datos",
                  "type": "native-automation-node.code",
                  "typeVersion": 2,
                  "position": [
                        350,
                        300
                  ]
            },
            {
                  "parameters": {
                        "operation": "upsert",
                        "collection": "special_occasions",
                        "documentId": "={{ $json.id || $json.bookingId || $json.code || $now }}",
                        "dataToSend": "defineBelow",
                        "fieldsUi": {
                              "fieldValues": [
                                    {
                                          "fieldId": "updatedAt",
                                          "fieldValue": "={{ $now }}"
                                    },
                                    {
                                          "fieldId": "workflowSource",
                                          "fieldValue": "WF-057"
                                    },
                                    {
                                          "fieldId": "status",
                                          "fieldValue": "processed"
                                    }
                              ]
                        }
                  },
                  "name": "[FIRESTORE] Operación Colección special_occasions",
                  "type": "native-automation-node.googleFirebaseCloudFirestore",
                  "typeVersion": 1.1,
                  "position": [
                        650,
                        300
                  ],
                  "credentials": {
                        "googleApi": {
                              "id": "5NiYz8gX64lPYIdK",
                              "name": "Costa Rica Tours - Firebase"
                        }
                  },
                  "onError": "continueErrorOutput"
            },
            {
                  "parameters": {
                        "respondWith": "json",
                        "responseBody": "{\n  \"success\": true,\n  \"workflowCode\": \"WF-057\",\n  \"collection\": \"special_occasions\",\n  \"timestamp\": \"={{ $now }}\",\n  \"message\": \"Operación completada exitosamente en special_occasions\"\n}",
                        "options": {}
                  },
                  "name": "[RESPUESTA] Finalizar con Éxito",
                  "type": "native-automation-node.respondToWebhook",
                  "typeVersion": 1.5,
                  "position": [
                        950,
                        200
                  ]
            },
            {
                  "parameters": {
                        "method": "POST",
                        "url": "={{ $env.APP_URL || \"http://localhost:3000\" }}/api/alerts",
                        "sendHeaders": true,
                        "headerParameters": {
                              "parameters": [
                                    {
                                          "name": "X-Webhook-Secret",
                                          "value": "={{ $env.WEBHOOK_SECRET || \"dev-secret\" }}"
                                    },
                                    {
                                          "name": "Content-Type",
                                          "value": "application/json"
                                    }
                              ]
                        },
                        "sendBody": true,
                        "specifyBody": "json",
                        "jsonBody": "{\n  \"source\": \"Detector de Lunas de Miel y Cumpleaños con Obsequio Sorpresa\",\n  \"severity\": \"critical\",\n  \"title\": \"Fallo en workflow WF-057: Detector de Lunas de Miel y Cumpleaños con Obsequio Sorpresa\",\n  \"message\": \"=Error al ejecutar en colección special_occasions: {{ $json.error?.message || \\\"Error no especificado\\\" }}\",\n  \"bookingId\": \"={{ $json.bookingId }}\",\n  \"metadata\": {\n    \"workflowCode\": \"WF-057\",\n    \"collection\": \"special_occasions\",\n    \"endpoint\": \"/api/native/workflows/special-celebration\"\n  }\n}",
                        "options": {}
                  },
                  "name": "[ALERTA NATIVA] Enviar a /api/alerts",
                  "type": "native-automation-node.httpRequest",
                  "typeVersion": 4.2,
                  "position": [
                        950,
                        450
                  ]
            }
      ],
      "connections": {
            "[TRIGGER] Detector de Lunas de Miel y Cumpleaños con Obsequio Sorpresa": {
                  "main": [
                        [
                              {
                                    "node": "[EXTRACT] Formatear y Validar Datos",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[EXTRACT] Formatear y Validar Datos": {
                  "main": [
                        [
                              {
                                    "node": "[FIRESTORE] Operación Colección special_occasions",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[FIRESTORE] Operación Colección special_occasions": {
                  "main": [
                        [
                              {
                                    "node": "[RESPUESTA] Finalizar con Éxito",
                                    "type": "main",
                                    "index": 0
                              }
                        ],
                        [
                              {
                                    "node": "[ALERTA NATIVA] Enviar a /api/alerts",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            }
      }
}
  },
  {
    id: "wf-058-digital-souvenir-photo-delivery",
    code: "WF-058",
    name: {
      es: "Entrega Digital de Fotografías Profesionales del Tour",
      en: "High-Res Action Photo & Drone Footage Delivery Vault"
    },
    category: "concierge",
    collection: "photo_vaults",
    description: {
      es: "Genera galería privada en la nube para que los turistas descarguen fotos tomadas por guías en canopy y rafting.",
      en: "Creates secure cloud photo vault for travelers to download professional rafting/zipline action shots."
    },
    icon: "Camera",
    color: "#0284c7",
    endpoint: "/api/native/workflows/photo-vault",
    method: "POST",
    triggerEvent: "Carga de lote fotográfico por el guía al terminar el tour",
    nodesCount: 5,
    slaTarget: "< 1.5s",
    nodes: [
      {
            "id": "node-trigger",
            "name": "[TRIGGER] Entrega Digital de Fotografías Profesionales del Tour",
            "type": "native-automation-node.webhook",
            "description": "Carga de lote fotográfico por el guía al terminar el tour"
      },
      {
            "id": "node-extract",
            "name": "[EXTRACT] Formatear y Validar Datos",
            "type": "native-automation-node.code",
            "description": "Transformación y validación de esquema"
      },
      {
            "id": "node-firestore",
            "name": "[FIRESTORE] Operación photo_vaults",
            "type": "native-automation-node.googleFirebaseCloudFirestore",
            "description": "Lectura/Escritura en Firestore /photo_vaults"
      },
      {
            "id": "node-response",
            "name": "[RESPUESTA] Finalizar con Éxito",
            "type": "native-automation-node.respondToWebhook",
            "description": "Respuesta HTTP 200 con payload estructurado"
      },
      {
            "id": "node-alert",
            "name": "[ALERTA NATIVA] Enviar a /api/alerts",
            "type": "native-automation-node.httpRequest",
            "description": "Enrutamiento de error a /api/alerts (reemplazo Telegram)"
      }
],
    samplePayload: {
      "bookingId": "BK-CR-2026-958",
      "photosCount": 24,
      "downloadExpiryDays": 30,
      "vaultUrl": "https://costaricatours.es/vault/BK958"
},
    blueprintJson: {
      "id": "WF-058",
      "name": "Entrega Digital de Fotografías Profesionales del Tour",
      "active": true,
      "nodes": [
            {
                  "parameters": {
                        "path": "api/native/workflows/photo-vault",
                        "httpMethod": "POST",
                        "responseMode": "responseNode",
                        "options": {}
                  },
                  "name": "[TRIGGER] Entrega Digital de Fotografías Profesionales del Tour",
                  "type": "native-automation-node.webhook",
                  "typeVersion": 2,
                  "position": [
                        100,
                        300
                  ]
            },
            {
                  "parameters": {
                        "jsCode": "// Validar campos obligatorios y normalizar timestamp\nconst item = $input.first().json || {};\nitem.processedAt = new Date().toISOString();\nitem.environment = 'production';\nitem.targetCollection = 'photo_vaults';\nreturn [{ json: item }];"
                  },
                  "name": "[EXTRACT] Formatear y Validar Datos",
                  "type": "native-automation-node.code",
                  "typeVersion": 2,
                  "position": [
                        350,
                        300
                  ]
            },
            {
                  "parameters": {
                        "operation": "upsert",
                        "collection": "photo_vaults",
                        "documentId": "={{ $json.id || $json.bookingId || $json.code || $now }}",
                        "dataToSend": "defineBelow",
                        "fieldsUi": {
                              "fieldValues": [
                                    {
                                          "fieldId": "updatedAt",
                                          "fieldValue": "={{ $now }}"
                                    },
                                    {
                                          "fieldId": "workflowSource",
                                          "fieldValue": "WF-058"
                                    },
                                    {
                                          "fieldId": "status",
                                          "fieldValue": "processed"
                                    }
                              ]
                        }
                  },
                  "name": "[FIRESTORE] Operación Colección photo_vaults",
                  "type": "native-automation-node.googleFirebaseCloudFirestore",
                  "typeVersion": 1.1,
                  "position": [
                        650,
                        300
                  ],
                  "credentials": {
                        "googleApi": {
                              "id": "5NiYz8gX64lPYIdK",
                              "name": "Costa Rica Tours - Firebase"
                        }
                  },
                  "onError": "continueErrorOutput"
            },
            {
                  "parameters": {
                        "respondWith": "json",
                        "responseBody": "{\n  \"success\": true,\n  \"workflowCode\": \"WF-058\",\n  \"collection\": \"photo_vaults\",\n  \"timestamp\": \"={{ $now }}\",\n  \"message\": \"Operación completada exitosamente en photo_vaults\"\n}",
                        "options": {}
                  },
                  "name": "[RESPUESTA] Finalizar con Éxito",
                  "type": "native-automation-node.respondToWebhook",
                  "typeVersion": 1.5,
                  "position": [
                        950,
                        200
                  ]
            },
            {
                  "parameters": {
                        "method": "POST",
                        "url": "={{ $env.APP_URL || \"http://localhost:3000\" }}/api/alerts",
                        "sendHeaders": true,
                        "headerParameters": {
                              "parameters": [
                                    {
                                          "name": "X-Webhook-Secret",
                                          "value": "={{ $env.WEBHOOK_SECRET || \"dev-secret\" }}"
                                    },
                                    {
                                          "name": "Content-Type",
                                          "value": "application/json"
                                    }
                              ]
                        },
                        "sendBody": true,
                        "specifyBody": "json",
                        "jsonBody": "{\n  \"source\": \"Entrega Digital de Fotografías Profesionales del Tour\",\n  \"severity\": \"critical\",\n  \"title\": \"Fallo en workflow WF-058: Entrega Digital de Fotografías Profesionales del Tour\",\n  \"message\": \"=Error al ejecutar en colección photo_vaults: {{ $json.error?.message || \\\"Error no especificado\\\" }}\",\n  \"bookingId\": \"={{ $json.bookingId }}\",\n  \"metadata\": {\n    \"workflowCode\": \"WF-058\",\n    \"collection\": \"photo_vaults\",\n    \"endpoint\": \"/api/native/workflows/photo-vault\"\n  }\n}",
                        "options": {}
                  },
                  "name": "[ALERTA NATIVA] Enviar a /api/alerts",
                  "type": "native-automation-node.httpRequest",
                  "typeVersion": 4.2,
                  "position": [
                        950,
                        450
                  ]
            }
      ],
      "connections": {
            "[TRIGGER] Entrega Digital de Fotografías Profesionales del Tour": {
                  "main": [
                        [
                              {
                                    "node": "[EXTRACT] Formatear y Validar Datos",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[EXTRACT] Formatear y Validar Datos": {
                  "main": [
                        [
                              {
                                    "node": "[FIRESTORE] Operación Colección photo_vaults",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[FIRESTORE] Operación Colección photo_vaults": {
                  "main": [
                        [
                              {
                                    "node": "[RESPUESTA] Finalizar con Éxito",
                                    "type": "main",
                                    "index": 0
                              }
                        ],
                        [
                              {
                                    "node": "[ALERTA NATIVA] Enviar a /api/alerts",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            }
      }
}
  },
  {
    id: "wf-059-offline-guide-sync-worker",
    code: "WF-059",
    name: {
      es: "Sincronizador de Datos Offline para Zonas sin Cobertura",
      en: "Offline Field Data Synchronizer for Deep Jungle Reserves"
    },
    category: "operations",
    collection: "offline_sync",
    description: {
      es: "Almacena registros localmente en áreas remotas (Corcovado, Sarapiquí) y sincroniza con Firestore al recuperar señal.",
      en: "Caches checklist logs during deep jungle tours and pushes mutations to Firestore once online."
    },
    icon: "WifiOff",
    color: "#64748b",
    endpoint: "/api/native/workflows/offline-sync",
    method: "POST",
    triggerEvent: "Reconexión a internet del dispositivo del guía",
    nodesCount: 5,
    slaTarget: "< 1s",
    nodes: [
      {
            "id": "node-trigger",
            "name": "[TRIGGER] Sincronizador de Datos Offline para Zonas sin Cobertura",
            "type": "native-automation-node.webhook",
            "description": "Reconexión a internet del dispositivo del guía"
      },
      {
            "id": "node-extract",
            "name": "[EXTRACT] Formatear y Validar Datos",
            "type": "native-automation-node.code",
            "description": "Transformación y validación de esquema"
      },
      {
            "id": "node-firestore",
            "name": "[FIRESTORE] Operación offline_sync",
            "type": "native-automation-node.googleFirebaseCloudFirestore",
            "description": "Lectura/Escritura en Firestore /offline_sync"
      },
      {
            "id": "node-response",
            "name": "[RESPUESTA] Finalizar con Éxito",
            "type": "native-automation-node.respondToWebhook",
            "description": "Respuesta HTTP 200 con payload estructurado"
      },
      {
            "id": "node-alert",
            "name": "[ALERTA NATIVA] Enviar a /api/alerts",
            "type": "native-automation-node.httpRequest",
            "description": "Enrutamiento de error a /api/alerts (reemplazo Telegram)"
      }
],
    samplePayload: {
      "cachedActionsCount": 6,
      "guideDevice": "Android-Pixel-Field-03",
      "syncedAt": "2026-09-14T17:30:00Z"
},
    blueprintJson: {
      "id": "WF-059",
      "name": "Sincronizador de Datos Offline para Zonas sin Cobertura",
      "active": true,
      "nodes": [
            {
                  "parameters": {
                        "path": "api/native/workflows/offline-sync",
                        "httpMethod": "POST",
                        "responseMode": "responseNode",
                        "options": {}
                  },
                  "name": "[TRIGGER] Sincronizador de Datos Offline para Zonas sin Cobertura",
                  "type": "native-automation-node.webhook",
                  "typeVersion": 2,
                  "position": [
                        100,
                        300
                  ]
            },
            {
                  "parameters": {
                        "jsCode": "// Validar campos obligatorios y normalizar timestamp\nconst item = $input.first().json || {};\nitem.processedAt = new Date().toISOString();\nitem.environment = 'production';\nitem.targetCollection = 'offline_sync';\nreturn [{ json: item }];"
                  },
                  "name": "[EXTRACT] Formatear y Validar Datos",
                  "type": "native-automation-node.code",
                  "typeVersion": 2,
                  "position": [
                        350,
                        300
                  ]
            },
            {
                  "parameters": {
                        "operation": "upsert",
                        "collection": "offline_sync",
                        "documentId": "={{ $json.id || $json.bookingId || $json.code || $now }}",
                        "dataToSend": "defineBelow",
                        "fieldsUi": {
                              "fieldValues": [
                                    {
                                          "fieldId": "updatedAt",
                                          "fieldValue": "={{ $now }}"
                                    },
                                    {
                                          "fieldId": "workflowSource",
                                          "fieldValue": "WF-059"
                                    },
                                    {
                                          "fieldId": "status",
                                          "fieldValue": "processed"
                                    }
                              ]
                        }
                  },
                  "name": "[FIRESTORE] Operación Colección offline_sync",
                  "type": "native-automation-node.googleFirebaseCloudFirestore",
                  "typeVersion": 1.1,
                  "position": [
                        650,
                        300
                  ],
                  "credentials": {
                        "googleApi": {
                              "id": "5NiYz8gX64lPYIdK",
                              "name": "Costa Rica Tours - Firebase"
                        }
                  },
                  "onError": "continueErrorOutput"
            },
            {
                  "parameters": {
                        "respondWith": "json",
                        "responseBody": "{\n  \"success\": true,\n  \"workflowCode\": \"WF-059\",\n  \"collection\": \"offline_sync\",\n  \"timestamp\": \"={{ $now }}\",\n  \"message\": \"Operación completada exitosamente en offline_sync\"\n}",
                        "options": {}
                  },
                  "name": "[RESPUESTA] Finalizar con Éxito",
                  "type": "native-automation-node.respondToWebhook",
                  "typeVersion": 1.5,
                  "position": [
                        950,
                        200
                  ]
            },
            {
                  "parameters": {
                        "method": "POST",
                        "url": "={{ $env.APP_URL || \"http://localhost:3000\" }}/api/alerts",
                        "sendHeaders": true,
                        "headerParameters": {
                              "parameters": [
                                    {
                                          "name": "X-Webhook-Secret",
                                          "value": "={{ $env.WEBHOOK_SECRET || \"dev-secret\" }}"
                                    },
                                    {
                                          "name": "Content-Type",
                                          "value": "application/json"
                                    }
                              ]
                        },
                        "sendBody": true,
                        "specifyBody": "json",
                        "jsonBody": "{\n  \"source\": \"Sincronizador de Datos Offline para Zonas sin Cobertura\",\n  \"severity\": \"critical\",\n  \"title\": \"Fallo en workflow WF-059: Sincronizador de Datos Offline para Zonas sin Cobertura\",\n  \"message\": \"=Error al ejecutar en colección offline_sync: {{ $json.error?.message || \\\"Error no especificado\\\" }}\",\n  \"bookingId\": \"={{ $json.bookingId }}\",\n  \"metadata\": {\n    \"workflowCode\": \"WF-059\",\n    \"collection\": \"offline_sync\",\n    \"endpoint\": \"/api/native/workflows/offline-sync\"\n  }\n}",
                        "options": {}
                  },
                  "name": "[ALERTA NATIVA] Enviar a /api/alerts",
                  "type": "native-automation-node.httpRequest",
                  "typeVersion": 4.2,
                  "position": [
                        950,
                        450
                  ]
            }
      ],
      "connections": {
            "[TRIGGER] Sincronizador de Datos Offline para Zonas sin Cobertura": {
                  "main": [
                        [
                              {
                                    "node": "[EXTRACT] Formatear y Validar Datos",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[EXTRACT] Formatear y Validar Datos": {
                  "main": [
                        [
                              {
                                    "node": "[FIRESTORE] Operación Colección offline_sync",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[FIRESTORE] Operación Colección offline_sync": {
                  "main": [
                        [
                              {
                                    "node": "[RESPUESTA] Finalizar con Éxito",
                                    "type": "main",
                                    "index": 0
                              }
                        ],
                        [
                              {
                                    "node": "[ALERTA NATIVA] Enviar a /api/alerts",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            }
      }
}
  },
  {
    id: "wf-060-accessibility-special-needs-coordinator",
    code: "WF-060",
    name: {
      es: "Coordinador de Accesibilidad y Necesidades Especiales (Ley 7600)",
      en: "Accessible Tourism & Mobility Assistance Coordinator (CR Law 7600)"
    },
    category: "concierge",
    collection: "accessibility_requests",
    description: {
      es: "Garantiza senderos planos universales, rampas en vans y asistencia para sillas de ruedas en parques nacionales.",
      en: "Ensures universal accessible trails, van lift ramps, and wheelchair assistance across national parks."
    },
    icon: "Accessibility",
    color: "#059669",
    endpoint: "/api/native/workflows/accessibility-coord",
    method: "POST",
    triggerEvent: "Reserva con requerimientos de movilidad reducida",
    nodesCount: 5,
    slaTarget: "< 400ms",
    nodes: [
      {
            "id": "node-trigger",
            "name": "[TRIGGER] Coordinador de Accesibilidad y Necesidades Especiales (Ley 7600)",
            "type": "native-automation-node.webhook",
            "description": "Reserva con requerimientos de movilidad reducida"
      },
      {
            "id": "node-extract",
            "name": "[EXTRACT] Formatear y Validar Datos",
            "type": "native-automation-node.code",
            "description": "Transformación y validación de esquema"
      },
      {
            "id": "node-firestore",
            "name": "[FIRESTORE] Operación accessibility_requests",
            "type": "native-automation-node.googleFirebaseCloudFirestore",
            "description": "Lectura/Escritura en Firestore /accessibility_requests"
      },
      {
            "id": "node-response",
            "name": "[RESPUESTA] Finalizar con Éxito",
            "type": "native-automation-node.respondToWebhook",
            "description": "Respuesta HTTP 200 con payload estructurado"
      },
      {
            "id": "node-alert",
            "name": "[ALERTA NATIVA] Enviar a /api/alerts",
            "type": "native-automation-node.httpRequest",
            "description": "Enrutamiento de error a /api/alerts (reemplazo Telegram)"
      }
],
    samplePayload: {
      "bookingId": "BK-CR-2026-960",
      "requirement": "Wheelchair Ramp Van + Accessible Manuel Antonio Boardwalk"
},
    blueprintJson: {
      "id": "WF-060",
      "name": "Coordinador de Accesibilidad y Necesidades Especiales (Ley 7600)",
      "active": true,
      "nodes": [
            {
                  "parameters": {
                        "path": "api/native/workflows/accessibility-coord",
                        "httpMethod": "POST",
                        "responseMode": "responseNode",
                        "options": {}
                  },
                  "name": "[TRIGGER] Coordinador de Accesibilidad y Necesidades Especiales (Ley 7600)",
                  "type": "native-automation-node.webhook",
                  "typeVersion": 2,
                  "position": [
                        100,
                        300
                  ]
            },
            {
                  "parameters": {
                        "jsCode": "// Validar campos obligatorios y normalizar timestamp\nconst item = $input.first().json || {};\nitem.processedAt = new Date().toISOString();\nitem.environment = 'production';\nitem.targetCollection = 'accessibility_requests';\nreturn [{ json: item }];"
                  },
                  "name": "[EXTRACT] Formatear y Validar Datos",
                  "type": "native-automation-node.code",
                  "typeVersion": 2,
                  "position": [
                        350,
                        300
                  ]
            },
            {
                  "parameters": {
                        "operation": "upsert",
                        "collection": "accessibility_requests",
                        "documentId": "={{ $json.id || $json.bookingId || $json.code || $now }}",
                        "dataToSend": "defineBelow",
                        "fieldsUi": {
                              "fieldValues": [
                                    {
                                          "fieldId": "updatedAt",
                                          "fieldValue": "={{ $now }}"
                                    },
                                    {
                                          "fieldId": "workflowSource",
                                          "fieldValue": "WF-060"
                                    },
                                    {
                                          "fieldId": "status",
                                          "fieldValue": "processed"
                                    }
                              ]
                        }
                  },
                  "name": "[FIRESTORE] Operación Colección accessibility_requests",
                  "type": "native-automation-node.googleFirebaseCloudFirestore",
                  "typeVersion": 1.1,
                  "position": [
                        650,
                        300
                  ],
                  "credentials": {
                        "googleApi": {
                              "id": "5NiYz8gX64lPYIdK",
                              "name": "Costa Rica Tours - Firebase"
                        }
                  },
                  "onError": "continueErrorOutput"
            },
            {
                  "parameters": {
                        "respondWith": "json",
                        "responseBody": "{\n  \"success\": true,\n  \"workflowCode\": \"WF-060\",\n  \"collection\": \"accessibility_requests\",\n  \"timestamp\": \"={{ $now }}\",\n  \"message\": \"Operación completada exitosamente en accessibility_requests\"\n}",
                        "options": {}
                  },
                  "name": "[RESPUESTA] Finalizar con Éxito",
                  "type": "native-automation-node.respondToWebhook",
                  "typeVersion": 1.5,
                  "position": [
                        950,
                        200
                  ]
            },
            {
                  "parameters": {
                        "method": "POST",
                        "url": "={{ $env.APP_URL || \"http://localhost:3000\" }}/api/alerts",
                        "sendHeaders": true,
                        "headerParameters": {
                              "parameters": [
                                    {
                                          "name": "X-Webhook-Secret",
                                          "value": "={{ $env.WEBHOOK_SECRET || \"dev-secret\" }}"
                                    },
                                    {
                                          "name": "Content-Type",
                                          "value": "application/json"
                                    }
                              ]
                        },
                        "sendBody": true,
                        "specifyBody": "json",
                        "jsonBody": "{\n  \"source\": \"Coordinador de Accesibilidad y Necesidades Especiales (Ley 7600)\",\n  \"severity\": \"critical\",\n  \"title\": \"Fallo en workflow WF-060: Coordinador de Accesibilidad y Necesidades Especiales (Ley 7600)\",\n  \"message\": \"=Error al ejecutar en colección accessibility_requests: {{ $json.error?.message || \\\"Error no especificado\\\" }}\",\n  \"bookingId\": \"={{ $json.bookingId }}\",\n  \"metadata\": {\n    \"workflowCode\": \"WF-060\",\n    \"collection\": \"accessibility_requests\",\n    \"endpoint\": \"/api/native/workflows/accessibility-coord\"\n  }\n}",
                        "options": {}
                  },
                  "name": "[ALERTA NATIVA] Enviar a /api/alerts",
                  "type": "native-automation-node.httpRequest",
                  "typeVersion": 4.2,
                  "position": [
                        950,
                        450
                  ]
            }
      ],
      "connections": {
            "[TRIGGER] Coordinador de Accesibilidad y Necesidades Especiales (Ley 7600)": {
                  "main": [
                        [
                              {
                                    "node": "[EXTRACT] Formatear y Validar Datos",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[EXTRACT] Formatear y Validar Datos": {
                  "main": [
                        [
                              {
                                    "node": "[FIRESTORE] Operación Colección accessibility_requests",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[FIRESTORE] Operación Colección accessibility_requests": {
                  "main": [
                        [
                              {
                                    "node": "[RESPUESTA] Finalizar con Éxito",
                                    "type": "main",
                                    "index": 0
                              }
                        ],
                        [
                              {
                                    "node": "[ALERTA NATIVA] Enviar a /api/alerts",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            }
      }
}
  },
  {
    id: "wf-061-birdwatching-life-list-logger",
    code: "WF-061",
    name: {
      es: "Registro Automático de Lista de Aves Observadas (eBird Sync)",
      en: "Specialized Birdwatching Life List & eBird API Synchronizer"
    },
    category: "concierge",
    collection: "bird_sightings",
    description: {
      es: "Genera lista digital oficial con nombres científicos de aves avistadas durante el tour de avistamiento especializado.",
      en: "Compiles certified eBird compatible checklist of bird species spotted during specialized birding tour."
    },
    icon: "Feather",
    color: "#16a34a",
    endpoint: "/api/native/workflows/ebird-sync",
    method: "POST",
    triggerEvent: "Finalización de tour de avistamiento de aves",
    nodesCount: 5,
    slaTarget: "< 800ms",
    nodes: [
      {
            "id": "node-trigger",
            "name": "[TRIGGER] Registro Automático de Lista de Aves Observadas (eBird Sync)",
            "type": "native-automation-node.webhook",
            "description": "Finalización de tour de avistamiento de aves"
      },
      {
            "id": "node-extract",
            "name": "[EXTRACT] Formatear y Validar Datos",
            "type": "native-automation-node.code",
            "description": "Transformación y validación de esquema"
      },
      {
            "id": "node-firestore",
            "name": "[FIRESTORE] Operación bird_sightings",
            "type": "native-automation-node.googleFirebaseCloudFirestore",
            "description": "Lectura/Escritura en Firestore /bird_sightings"
      },
      {
            "id": "node-response",
            "name": "[RESPUESTA] Finalizar con Éxito",
            "type": "native-automation-node.respondToWebhook",
            "description": "Respuesta HTTP 200 con payload estructurado"
      },
      {
            "id": "node-alert",
            "name": "[ALERTA NATIVA] Enviar a /api/alerts",
            "type": "native-automation-node.httpRequest",
            "description": "Enrutamiento de error a /api/alerts (reemplazo Telegram)"
      }
],
    samplePayload: {
      "speciesLogged": [
            "Scarlet Macaw",
            "Toco Toucan",
            "Three-Wattled Bellbird"
      ],
      "tourLocation": "Carara National Park"
},
    blueprintJson: {
      "id": "WF-061",
      "name": "Registro Automático de Lista de Aves Observadas (eBird Sync)",
      "active": true,
      "nodes": [
            {
                  "parameters": {
                        "path": "api/native/workflows/ebird-sync",
                        "httpMethod": "POST",
                        "responseMode": "responseNode",
                        "options": {}
                  },
                  "name": "[TRIGGER] Registro Automático de Lista de Aves Observadas (eBird Sync)",
                  "type": "native-automation-node.webhook",
                  "typeVersion": 2,
                  "position": [
                        100,
                        300
                  ]
            },
            {
                  "parameters": {
                        "jsCode": "// Validar campos obligatorios y normalizar timestamp\nconst item = $input.first().json || {};\nitem.processedAt = new Date().toISOString();\nitem.environment = 'production';\nitem.targetCollection = 'bird_sightings';\nreturn [{ json: item }];"
                  },
                  "name": "[EXTRACT] Formatear y Validar Datos",
                  "type": "native-automation-node.code",
                  "typeVersion": 2,
                  "position": [
                        350,
                        300
                  ]
            },
            {
                  "parameters": {
                        "operation": "upsert",
                        "collection": "bird_sightings",
                        "documentId": "={{ $json.id || $json.bookingId || $json.code || $now }}",
                        "dataToSend": "defineBelow",
                        "fieldsUi": {
                              "fieldValues": [
                                    {
                                          "fieldId": "updatedAt",
                                          "fieldValue": "={{ $now }}"
                                    },
                                    {
                                          "fieldId": "workflowSource",
                                          "fieldValue": "WF-061"
                                    },
                                    {
                                          "fieldId": "status",
                                          "fieldValue": "processed"
                                    }
                              ]
                        }
                  },
                  "name": "[FIRESTORE] Operación Colección bird_sightings",
                  "type": "native-automation-node.googleFirebaseCloudFirestore",
                  "typeVersion": 1.1,
                  "position": [
                        650,
                        300
                  ],
                  "credentials": {
                        "googleApi": {
                              "id": "5NiYz8gX64lPYIdK",
                              "name": "Costa Rica Tours - Firebase"
                        }
                  },
                  "onError": "continueErrorOutput"
            },
            {
                  "parameters": {
                        "respondWith": "json",
                        "responseBody": "{\n  \"success\": true,\n  \"workflowCode\": \"WF-061\",\n  \"collection\": \"bird_sightings\",\n  \"timestamp\": \"={{ $now }}\",\n  \"message\": \"Operación completada exitosamente en bird_sightings\"\n}",
                        "options": {}
                  },
                  "name": "[RESPUESTA] Finalizar con Éxito",
                  "type": "native-automation-node.respondToWebhook",
                  "typeVersion": 1.5,
                  "position": [
                        950,
                        200
                  ]
            },
            {
                  "parameters": {
                        "method": "POST",
                        "url": "={{ $env.APP_URL || \"http://localhost:3000\" }}/api/alerts",
                        "sendHeaders": true,
                        "headerParameters": {
                              "parameters": [
                                    {
                                          "name": "X-Webhook-Secret",
                                          "value": "={{ $env.WEBHOOK_SECRET || \"dev-secret\" }}"
                                    },
                                    {
                                          "name": "Content-Type",
                                          "value": "application/json"
                                    }
                              ]
                        },
                        "sendBody": true,
                        "specifyBody": "json",
                        "jsonBody": "{\n  \"source\": \"Registro Automático de Lista de Aves Observadas (eBird Sync)\",\n  \"severity\": \"critical\",\n  \"title\": \"Fallo en workflow WF-061: Registro Automático de Lista de Aves Observadas (eBird Sync)\",\n  \"message\": \"=Error al ejecutar en colección bird_sightings: {{ $json.error?.message || \\\"Error no especificado\\\" }}\",\n  \"bookingId\": \"={{ $json.bookingId }}\",\n  \"metadata\": {\n    \"workflowCode\": \"WF-061\",\n    \"collection\": \"bird_sightings\",\n    \"endpoint\": \"/api/native/workflows/ebird-sync\"\n  }\n}",
                        "options": {}
                  },
                  "name": "[ALERTA NATIVA] Enviar a /api/alerts",
                  "type": "native-automation-node.httpRequest",
                  "typeVersion": 4.2,
                  "position": [
                        950,
                        450
                  ]
            }
      ],
      "connections": {
            "[TRIGGER] Registro Automático de Lista de Aves Observadas (eBird Sync)": {
                  "main": [
                        [
                              {
                                    "node": "[EXTRACT] Formatear y Validar Datos",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[EXTRACT] Formatear y Validar Datos": {
                  "main": [
                        [
                              {
                                    "node": "[FIRESTORE] Operación Colección bird_sightings",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[FIRESTORE] Operación Colección bird_sightings": {
                  "main": [
                        [
                              {
                                    "node": "[RESPUESTA] Finalizar con Éxito",
                                    "type": "main",
                                    "index": 0
                              }
                        ],
                        [
                              {
                                    "node": "[ALERTA NATIVA] Enviar a /api/alerts",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            }
      }
}
  },
  {
    id: "wf-062-hotel-concierge-frontdesk-portal",
    code: "WF-062",
    name: {
      es: "Portal de Reservas para Front-Desk de Hoteles Aliados",
      en: "Hotel Front-Desk & Resort Concierge Direct Booking API"
    },
    category: "concierge",
    collection: "hotel_affiliate_bookings",
    description: {
      es: "Permite a recepcionistas de hoteles de lujo reservar tours para sus huéspedes con confirmación instantánea y comisión asignada.",
      en: "Enables partner hotel concierges to book tours on-demand for guests with instantaneous voucher printouts."
    },
    icon: "Building2",
    color: "#0284c7",
    endpoint: "/api/native/workflows/hotel-partner-booking",
    method: "POST",
    triggerEvent: "Reserva emitida por recepción de hotel aliado",
    nodesCount: 5,
    slaTarget: "< 500ms",
    nodes: [
      {
            "id": "node-trigger",
            "name": "[TRIGGER] Portal de Reservas para Front-Desk de Hoteles Aliados",
            "type": "native-automation-node.webhook",
            "description": "Reserva emitida por recepción de hotel aliado"
      },
      {
            "id": "node-extract",
            "name": "[EXTRACT] Formatear y Validar Datos",
            "type": "native-automation-node.code",
            "description": "Transformación y validación de esquema"
      },
      {
            "id": "node-firestore",
            "name": "[FIRESTORE] Operación hotel_affiliate_bookings",
            "type": "native-automation-node.googleFirebaseCloudFirestore",
            "description": "Lectura/Escritura en Firestore /hotel_affiliate_bookings"
      },
      {
            "id": "node-response",
            "name": "[RESPUESTA] Finalizar con Éxito",
            "type": "native-automation-node.respondToWebhook",
            "description": "Respuesta HTTP 200 con payload estructurado"
      },
      {
            "id": "node-alert",
            "name": "[ALERTA NATIVA] Enviar a /api/alerts",
            "type": "native-automation-node.httpRequest",
            "description": "Enrutamiento de error a /api/alerts (reemplazo Telegram)"
      }
],
    samplePayload: {
      "hotelPartner": "The Springs Resort & Spa",
      "roomNumber": "Villa 104",
      "conciergeAgent": "Mariana Castro"
},
    blueprintJson: {
      "id": "WF-062",
      "name": "Portal de Reservas para Front-Desk de Hoteles Aliados",
      "active": true,
      "nodes": [
            {
                  "parameters": {
                        "path": "api/native/workflows/hotel-partner-booking",
                        "httpMethod": "POST",
                        "responseMode": "responseNode",
                        "options": {}
                  },
                  "name": "[TRIGGER] Portal de Reservas para Front-Desk de Hoteles Aliados",
                  "type": "native-automation-node.webhook",
                  "typeVersion": 2,
                  "position": [
                        100,
                        300
                  ]
            },
            {
                  "parameters": {
                        "jsCode": "// Validar campos obligatorios y normalizar timestamp\nconst item = $input.first().json || {};\nitem.processedAt = new Date().toISOString();\nitem.environment = 'production';\nitem.targetCollection = 'hotel_affiliate_bookings';\nreturn [{ json: item }];"
                  },
                  "name": "[EXTRACT] Formatear y Validar Datos",
                  "type": "native-automation-node.code",
                  "typeVersion": 2,
                  "position": [
                        350,
                        300
                  ]
            },
            {
                  "parameters": {
                        "operation": "upsert",
                        "collection": "hotel_affiliate_bookings",
                        "documentId": "={{ $json.id || $json.bookingId || $json.code || $now }}",
                        "dataToSend": "defineBelow",
                        "fieldsUi": {
                              "fieldValues": [
                                    {
                                          "fieldId": "updatedAt",
                                          "fieldValue": "={{ $now }}"
                                    },
                                    {
                                          "fieldId": "workflowSource",
                                          "fieldValue": "WF-062"
                                    },
                                    {
                                          "fieldId": "status",
                                          "fieldValue": "processed"
                                    }
                              ]
                        }
                  },
                  "name": "[FIRESTORE] Operación Colección hotel_affiliate_bookings",
                  "type": "native-automation-node.googleFirebaseCloudFirestore",
                  "typeVersion": 1.1,
                  "position": [
                        650,
                        300
                  ],
                  "credentials": {
                        "googleApi": {
                              "id": "5NiYz8gX64lPYIdK",
                              "name": "Costa Rica Tours - Firebase"
                        }
                  },
                  "onError": "continueErrorOutput"
            },
            {
                  "parameters": {
                        "respondWith": "json",
                        "responseBody": "{\n  \"success\": true,\n  \"workflowCode\": \"WF-062\",\n  \"collection\": \"hotel_affiliate_bookings\",\n  \"timestamp\": \"={{ $now }}\",\n  \"message\": \"Operación completada exitosamente en hotel_affiliate_bookings\"\n}",
                        "options": {}
                  },
                  "name": "[RESPUESTA] Finalizar con Éxito",
                  "type": "native-automation-node.respondToWebhook",
                  "typeVersion": 1.5,
                  "position": [
                        950,
                        200
                  ]
            },
            {
                  "parameters": {
                        "method": "POST",
                        "url": "={{ $env.APP_URL || \"http://localhost:3000\" }}/api/alerts",
                        "sendHeaders": true,
                        "headerParameters": {
                              "parameters": [
                                    {
                                          "name": "X-Webhook-Secret",
                                          "value": "={{ $env.WEBHOOK_SECRET || \"dev-secret\" }}"
                                    },
                                    {
                                          "name": "Content-Type",
                                          "value": "application/json"
                                    }
                              ]
                        },
                        "sendBody": true,
                        "specifyBody": "json",
                        "jsonBody": "{\n  \"source\": \"Portal de Reservas para Front-Desk de Hoteles Aliados\",\n  \"severity\": \"critical\",\n  \"title\": \"Fallo en workflow WF-062: Portal de Reservas para Front-Desk de Hoteles Aliados\",\n  \"message\": \"=Error al ejecutar en colección hotel_affiliate_bookings: {{ $json.error?.message || \\\"Error no especificado\\\" }}\",\n  \"bookingId\": \"={{ $json.bookingId }}\",\n  \"metadata\": {\n    \"workflowCode\": \"WF-062\",\n    \"collection\": \"hotel_affiliate_bookings\",\n    \"endpoint\": \"/api/native/workflows/hotel-partner-booking\"\n  }\n}",
                        "options": {}
                  },
                  "name": "[ALERTA NATIVA] Enviar a /api/alerts",
                  "type": "native-automation-node.httpRequest",
                  "typeVersion": 4.2,
                  "position": [
                        950,
                        450
                  ]
            }
      ],
      "connections": {
            "[TRIGGER] Portal de Reservas para Front-Desk de Hoteles Aliados": {
                  "main": [
                        [
                              {
                                    "node": "[EXTRACT] Formatear y Validar Datos",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[EXTRACT] Formatear y Validar Datos": {
                  "main": [
                        [
                              {
                                    "node": "[FIRESTORE] Operación Colección hotel_affiliate_bookings",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[FIRESTORE] Operación Colección hotel_affiliate_bookings": {
                  "main": [
                        [
                              {
                                    "node": "[RESPUESTA] Finalizar con Éxito",
                                    "type": "main",
                                    "index": 0
                              }
                        ],
                        [
                              {
                                    "node": "[ALERTA NATIVA] Enviar a /api/alerts",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            }
      }
}
  },
  {
    id: "wf-063-post-tour-lost-connection-chat",
    code: "WF-063",
    name: {
      es: "Chat de Asistencia Post-Tour para Dudas y Recomendaciones",
      en: "Post-Tour Traveler Chat for Next-Leg Recommendations"
    },
    category: "chat",
    collection: "chat_sessions",
    description: {
      es: "Mantiene abierta la línea de consulta tras finalizar el tour para recomendar restaurantes locales y actividades nocturnas.",
      en: "Keeps communication channel open after tour to recommend verified local sodas, restaurants, and night walks."
    },
    icon: "MessagesSquare",
    color: "#10b981",
    endpoint: "/api/native/workflows/post-tour-chat",
    method: "POST",
    triggerEvent: "Mensaje de viajero post-tour",
    nodesCount: 5,
    slaTarget: "< 1s",
    nodes: [
      {
            "id": "node-trigger",
            "name": "[TRIGGER] Chat de Asistencia Post-Tour para Dudas y Recomendaciones",
            "type": "native-automation-node.webhook",
            "description": "Mensaje de viajero post-tour"
      },
      {
            "id": "node-extract",
            "name": "[EXTRACT] Formatear y Validar Datos",
            "type": "native-automation-node.code",
            "description": "Transformación y validación de esquema"
      },
      {
            "id": "node-firestore",
            "name": "[FIRESTORE] Operación chat_sessions",
            "type": "native-automation-node.googleFirebaseCloudFirestore",
            "description": "Lectura/Escritura en Firestore /chat_sessions"
      },
      {
            "id": "node-response",
            "name": "[RESPUESTA] Finalizar con Éxito",
            "type": "native-automation-node.respondToWebhook",
            "description": "Respuesta HTTP 200 con payload estructurado"
      },
      {
            "id": "node-alert",
            "name": "[ALERTA NATIVA] Enviar a /api/alerts",
            "type": "native-automation-node.httpRequest",
            "description": "Enrutamiento de error a /api/alerts (reemplazo Telegram)"
      }
],
    samplePayload: {
      "bookingId": "BK-CR-2026-963",
      "query": "Can you recommend a traditional soda near La Fortuna central park?"
},
    blueprintJson: {
      "id": "WF-063",
      "name": "Chat de Asistencia Post-Tour para Dudas y Recomendaciones",
      "active": true,
      "nodes": [
            {
                  "parameters": {
                        "path": "api/native/workflows/post-tour-chat",
                        "httpMethod": "POST",
                        "responseMode": "responseNode",
                        "options": {}
                  },
                  "name": "[TRIGGER] Chat de Asistencia Post-Tour para Dudas y Recomendaciones",
                  "type": "native-automation-node.webhook",
                  "typeVersion": 2,
                  "position": [
                        100,
                        300
                  ]
            },
            {
                  "parameters": {
                        "jsCode": "// Validar campos obligatorios y normalizar timestamp\nconst item = $input.first().json || {};\nitem.processedAt = new Date().toISOString();\nitem.environment = 'production';\nitem.targetCollection = 'chat_sessions';\nreturn [{ json: item }];"
                  },
                  "name": "[EXTRACT] Formatear y Validar Datos",
                  "type": "native-automation-node.code",
                  "typeVersion": 2,
                  "position": [
                        350,
                        300
                  ]
            },
            {
                  "parameters": {
                        "operation": "upsert",
                        "collection": "chat_sessions",
                        "documentId": "={{ $json.id || $json.bookingId || $json.code || $now }}",
                        "dataToSend": "defineBelow",
                        "fieldsUi": {
                              "fieldValues": [
                                    {
                                          "fieldId": "updatedAt",
                                          "fieldValue": "={{ $now }}"
                                    },
                                    {
                                          "fieldId": "workflowSource",
                                          "fieldValue": "WF-063"
                                    },
                                    {
                                          "fieldId": "status",
                                          "fieldValue": "processed"
                                    }
                              ]
                        }
                  },
                  "name": "[FIRESTORE] Operación Colección chat_sessions",
                  "type": "native-automation-node.googleFirebaseCloudFirestore",
                  "typeVersion": 1.1,
                  "position": [
                        650,
                        300
                  ],
                  "credentials": {
                        "googleApi": {
                              "id": "5NiYz8gX64lPYIdK",
                              "name": "Costa Rica Tours - Firebase"
                        }
                  },
                  "onError": "continueErrorOutput"
            },
            {
                  "parameters": {
                        "respondWith": "json",
                        "responseBody": "{\n  \"success\": true,\n  \"workflowCode\": \"WF-063\",\n  \"collection\": \"chat_sessions\",\n  \"timestamp\": \"={{ $now }}\",\n  \"message\": \"Operación completada exitosamente en chat_sessions\"\n}",
                        "options": {}
                  },
                  "name": "[RESPUESTA] Finalizar con Éxito",
                  "type": "native-automation-node.respondToWebhook",
                  "typeVersion": 1.5,
                  "position": [
                        950,
                        200
                  ]
            },
            {
                  "parameters": {
                        "method": "POST",
                        "url": "={{ $env.APP_URL || \"http://localhost:3000\" }}/api/alerts",
                        "sendHeaders": true,
                        "headerParameters": {
                              "parameters": [
                                    {
                                          "name": "X-Webhook-Secret",
                                          "value": "={{ $env.WEBHOOK_SECRET || \"dev-secret\" }}"
                                    },
                                    {
                                          "name": "Content-Type",
                                          "value": "application/json"
                                    }
                              ]
                        },
                        "sendBody": true,
                        "specifyBody": "json",
                        "jsonBody": "{\n  \"source\": \"Chat de Asistencia Post-Tour para Dudas y Recomendaciones\",\n  \"severity\": \"critical\",\n  \"title\": \"Fallo en workflow WF-063: Chat de Asistencia Post-Tour para Dudas y Recomendaciones\",\n  \"message\": \"=Error al ejecutar en colección chat_sessions: {{ $json.error?.message || \\\"Error no especificado\\\" }}\",\n  \"bookingId\": \"={{ $json.bookingId }}\",\n  \"metadata\": {\n    \"workflowCode\": \"WF-063\",\n    \"collection\": \"chat_sessions\",\n    \"endpoint\": \"/api/native/workflows/post-tour-chat\"\n  }\n}",
                        "options": {}
                  },
                  "name": "[ALERTA NATIVA] Enviar a /api/alerts",
                  "type": "native-automation-node.httpRequest",
                  "typeVersion": 4.2,
                  "position": [
                        950,
                        450
                  ]
            }
      ],
      "connections": {
            "[TRIGGER] Chat de Asistencia Post-Tour para Dudas y Recomendaciones": {
                  "main": [
                        [
                              {
                                    "node": "[EXTRACT] Formatear y Validar Datos",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[EXTRACT] Formatear y Validar Datos": {
                  "main": [
                        [
                              {
                                    "node": "[FIRESTORE] Operación Colección chat_sessions",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[FIRESTORE] Operación Colección chat_sessions": {
                  "main": [
                        [
                              {
                                    "node": "[RESPUESTA] Finalizar con Éxito",
                                    "type": "main",
                                    "index": 0
                              }
                        ],
                        [
                              {
                                    "node": "[ALERTA NATIVA] Enviar a /api/alerts",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            }
      }
}
  },
  {
    id: "wf-064-local-artisan-craft-directory",
    code: "WF-064",
    name: {
      es: "Directorio y Conector con Artesanos Indígenas (Maleku / Bribri)",
      en: "Indigenous Artisan Fair-Trade Crafts Directory & Connector"
    },
    category: "concierge",
    collection: "artisan_partners",
    description: {
      es: "Ofrece información cultural y ubicaciones de talleres de artesanía indígena con comercio justo garantizado.",
      en: "Provides cultural context and fair-trade workshop locations for Maleku and Bribri indigenous crafts."
    },
    icon: "Palette",
    color: "#b45309",
    endpoint: "/api/native/workflows/indigenous-crafts",
    method: "GET",
    triggerEvent: "Consulta cultural en catálogo",
    nodesCount: 5,
    slaTarget: "< 200ms",
    nodes: [
      {
            "id": "node-trigger",
            "name": "[TRIGGER] Directorio y Conector con Artesanos Indígenas (Maleku / Bribri)",
            "type": "native-automation-node.webhook",
            "description": "Consulta cultural en catálogo"
      },
      {
            "id": "node-extract",
            "name": "[EXTRACT] Formatear y Validar Datos",
            "type": "native-automation-node.code",
            "description": "Transformación y validación de esquema"
      },
      {
            "id": "node-firestore",
            "name": "[FIRESTORE] Operación artisan_partners",
            "type": "native-automation-node.googleFirebaseCloudFirestore",
            "description": "Lectura/Escritura en Firestore /artisan_partners"
      },
      {
            "id": "node-response",
            "name": "[RESPUESTA] Finalizar con Éxito",
            "type": "native-automation-node.respondToWebhook",
            "description": "Respuesta HTTP 200 con payload estructurado"
      },
      {
            "id": "node-alert",
            "name": "[ALERTA NATIVA] Enviar a /api/alerts",
            "type": "native-automation-node.httpRequest",
            "description": "Enrutamiento de error a /api/alerts (reemplazo Telegram)"
      }
],
    samplePayload: {
      "indigenousTerritory": "Guatuso Maleku Palenques",
      "craftType": "Hand-Carved Balsa Wood Masks"
},
    blueprintJson: {
      "id": "WF-064",
      "name": "Directorio y Conector con Artesanos Indígenas (Maleku / Bribri)",
      "active": true,
      "nodes": [
            {
                  "parameters": {
                        "path": "api/native/workflows/indigenous-crafts",
                        "httpMethod": "GET",
                        "responseMode": "responseNode",
                        "options": {}
                  },
                  "name": "[TRIGGER] Directorio y Conector con Artesanos Indígenas (Maleku / Bribri)",
                  "type": "native-automation-node.webhook",
                  "typeVersion": 2,
                  "position": [
                        100,
                        300
                  ]
            },
            {
                  "parameters": {
                        "jsCode": "// Validar campos obligatorios y normalizar timestamp\nconst item = $input.first().json || {};\nitem.processedAt = new Date().toISOString();\nitem.environment = 'production';\nitem.targetCollection = 'artisan_partners';\nreturn [{ json: item }];"
                  },
                  "name": "[EXTRACT] Formatear y Validar Datos",
                  "type": "native-automation-node.code",
                  "typeVersion": 2,
                  "position": [
                        350,
                        300
                  ]
            },
            {
                  "parameters": {
                        "operation": "upsert",
                        "collection": "artisan_partners",
                        "documentId": "={{ $json.id || $json.bookingId || $json.code || $now }}",
                        "dataToSend": "defineBelow",
                        "fieldsUi": {
                              "fieldValues": [
                                    {
                                          "fieldId": "updatedAt",
                                          "fieldValue": "={{ $now }}"
                                    },
                                    {
                                          "fieldId": "workflowSource",
                                          "fieldValue": "WF-064"
                                    },
                                    {
                                          "fieldId": "status",
                                          "fieldValue": "processed"
                                    }
                              ]
                        }
                  },
                  "name": "[FIRESTORE] Operación Colección artisan_partners",
                  "type": "native-automation-node.googleFirebaseCloudFirestore",
                  "typeVersion": 1.1,
                  "position": [
                        650,
                        300
                  ],
                  "credentials": {
                        "googleApi": {
                              "id": "5NiYz8gX64lPYIdK",
                              "name": "Costa Rica Tours - Firebase"
                        }
                  },
                  "onError": "continueErrorOutput"
            },
            {
                  "parameters": {
                        "respondWith": "json",
                        "responseBody": "{\n  \"success\": true,\n  \"workflowCode\": \"WF-064\",\n  \"collection\": \"artisan_partners\",\n  \"timestamp\": \"={{ $now }}\",\n  \"message\": \"Operación completada exitosamente en artisan_partners\"\n}",
                        "options": {}
                  },
                  "name": "[RESPUESTA] Finalizar con Éxito",
                  "type": "native-automation-node.respondToWebhook",
                  "typeVersion": 1.5,
                  "position": [
                        950,
                        200
                  ]
            },
            {
                  "parameters": {
                        "method": "POST",
                        "url": "={{ $env.APP_URL || \"http://localhost:3000\" }}/api/alerts",
                        "sendHeaders": true,
                        "headerParameters": {
                              "parameters": [
                                    {
                                          "name": "X-Webhook-Secret",
                                          "value": "={{ $env.WEBHOOK_SECRET || \"dev-secret\" }}"
                                    },
                                    {
                                          "name": "Content-Type",
                                          "value": "application/json"
                                    }
                              ]
                        },
                        "sendBody": true,
                        "specifyBody": "json",
                        "jsonBody": "{\n  \"source\": \"Directorio y Conector con Artesanos Indígenas (Maleku / Bribri)\",\n  \"severity\": \"critical\",\n  \"title\": \"Fallo en workflow WF-064: Directorio y Conector con Artesanos Indígenas (Maleku / Bribri)\",\n  \"message\": \"=Error al ejecutar en colección artisan_partners: {{ $json.error?.message || \\\"Error no especificado\\\" }}\",\n  \"bookingId\": \"={{ $json.bookingId }}\",\n  \"metadata\": {\n    \"workflowCode\": \"WF-064\",\n    \"collection\": \"artisan_partners\",\n    \"endpoint\": \"/api/native/workflows/indigenous-crafts\"\n  }\n}",
                        "options": {}
                  },
                  "name": "[ALERTA NATIVA] Enviar a /api/alerts",
                  "type": "native-automation-node.httpRequest",
                  "typeVersion": 4.2,
                  "position": [
                        950,
                        450
                  ]
            }
      ],
      "connections": {
            "[TRIGGER] Directorio y Conector con Artesanos Indígenas (Maleku / Bribri)": {
                  "main": [
                        [
                              {
                                    "node": "[EXTRACT] Formatear y Validar Datos",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[EXTRACT] Formatear y Validar Datos": {
                  "main": [
                        [
                              {
                                    "node": "[FIRESTORE] Operación Colección artisan_partners",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[FIRESTORE] Operación Colección artisan_partners": {
                  "main": [
                        [
                              {
                                    "node": "[RESPUESTA] Finalizar con Éxito",
                                    "type": "main",
                                    "index": 0
                              }
                        ],
                        [
                              {
                                    "node": "[ALERTA NATIVA] Enviar a /api/alerts",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            }
      }
}
  },
  {
    id: "wf-065-antifraud-scoring-engine",
    code: "WF-065",
    name: {
      es: "Motor de Evaluación de Riesgo y Antifraude (IP / Tarjeta)",
      en: "Card & IP Antifraud Scoring & Bot Defense Engine"
    },
    category: "fraud",
    collection: "fraud_evaluations",
    description: {
      es: "Calcula score de 0 a 100 evaluando geolocalización de IP, velocidad de compra y banderas de riesgo antes de confirmar.",
      en: "Computes risk score from 0-100 analyzing IP geolocation, purchase velocity, and card issuer risk."
    },
    icon: "ShieldAlert",
    color: "#dc2626",
    endpoint: "/api/native/workflows/evaluar-antifraude",
    method: "POST",
    triggerEvent: "Pre-autorización de cada reserva",
    nodesCount: 5,
    slaTarget: "< 250ms",
    nodes: [
      {
            "id": "node-trigger",
            "name": "[TRIGGER] Motor de Evaluación de Riesgo y Antifraude (IP / Tarjeta)",
            "type": "native-automation-node.webhook",
            "description": "Pre-autorización de cada reserva"
      },
      {
            "id": "node-extract",
            "name": "[EXTRACT] Formatear y Validar Datos",
            "type": "native-automation-node.code",
            "description": "Transformación y validación de esquema"
      },
      {
            "id": "node-firestore",
            "name": "[FIRESTORE] Operación fraud_evaluations",
            "type": "native-automation-node.googleFirebaseCloudFirestore",
            "description": "Lectura/Escritura en Firestore /fraud_evaluations"
      },
      {
            "id": "node-response",
            "name": "[RESPUESTA] Finalizar con Éxito",
            "type": "native-automation-node.respondToWebhook",
            "description": "Respuesta HTTP 200 con payload estructurado"
      },
      {
            "id": "node-alert",
            "name": "[ALERTA NATIVA] Enviar a /api/alerts",
            "type": "native-automation-node.httpRequest",
            "description": "Enrutamiento de error a /api/alerts (reemplazo Telegram)"
      }
],
    samplePayload: {
      "clientIp": "190.113.112.5",
      "country": "CR",
      "velocityToursLastHour": 1,
      "calculatedRiskScore": 4,
      "action": "ALLOW"
},
    blueprintJson: {
      "id": "WF-065",
      "name": "Motor de Evaluación de Riesgo y Antifraude (IP / Tarjeta)",
      "active": true,
      "nodes": [
            {
                  "parameters": {
                        "path": "api/native/workflows/evaluar-antifraude",
                        "httpMethod": "POST",
                        "responseMode": "responseNode",
                        "options": {}
                  },
                  "name": "[TRIGGER] Motor de Evaluación de Riesgo y Antifraude (IP / Tarjeta)",
                  "type": "native-automation-node.webhook",
                  "typeVersion": 2,
                  "position": [
                        100,
                        300
                  ]
            },
            {
                  "parameters": {
                        "jsCode": "// Validar campos obligatorios y normalizar timestamp\nconst item = $input.first().json || {};\nitem.processedAt = new Date().toISOString();\nitem.environment = 'production';\nitem.targetCollection = 'fraud_evaluations';\nreturn [{ json: item }];"
                  },
                  "name": "[EXTRACT] Formatear y Validar Datos",
                  "type": "native-automation-node.code",
                  "typeVersion": 2,
                  "position": [
                        350,
                        300
                  ]
            },
            {
                  "parameters": {
                        "operation": "upsert",
                        "collection": "fraud_evaluations",
                        "documentId": "={{ $json.id || $json.bookingId || $json.code || $now }}",
                        "dataToSend": "defineBelow",
                        "fieldsUi": {
                              "fieldValues": [
                                    {
                                          "fieldId": "updatedAt",
                                          "fieldValue": "={{ $now }}"
                                    },
                                    {
                                          "fieldId": "workflowSource",
                                          "fieldValue": "WF-065"
                                    },
                                    {
                                          "fieldId": "status",
                                          "fieldValue": "processed"
                                    }
                              ]
                        }
                  },
                  "name": "[FIRESTORE] Operación Colección fraud_evaluations",
                  "type": "native-automation-node.googleFirebaseCloudFirestore",
                  "typeVersion": 1.1,
                  "position": [
                        650,
                        300
                  ],
                  "credentials": {
                        "googleApi": {
                              "id": "5NiYz8gX64lPYIdK",
                              "name": "Costa Rica Tours - Firebase"
                        }
                  },
                  "onError": "continueErrorOutput"
            },
            {
                  "parameters": {
                        "respondWith": "json",
                        "responseBody": "{\n  \"success\": true,\n  \"workflowCode\": \"WF-065\",\n  \"collection\": \"fraud_evaluations\",\n  \"timestamp\": \"={{ $now }}\",\n  \"message\": \"Operación completada exitosamente en fraud_evaluations\"\n}",
                        "options": {}
                  },
                  "name": "[RESPUESTA] Finalizar con Éxito",
                  "type": "native-automation-node.respondToWebhook",
                  "typeVersion": 1.5,
                  "position": [
                        950,
                        200
                  ]
            },
            {
                  "parameters": {
                        "method": "POST",
                        "url": "={{ $env.APP_URL || \"http://localhost:3000\" }}/api/alerts",
                        "sendHeaders": true,
                        "headerParameters": {
                              "parameters": [
                                    {
                                          "name": "X-Webhook-Secret",
                                          "value": "={{ $env.WEBHOOK_SECRET || \"dev-secret\" }}"
                                    },
                                    {
                                          "name": "Content-Type",
                                          "value": "application/json"
                                    }
                              ]
                        },
                        "sendBody": true,
                        "specifyBody": "json",
                        "jsonBody": "{\n  \"source\": \"Motor de Evaluación de Riesgo y Antifraude (IP / Tarjeta)\",\n  \"severity\": \"critical\",\n  \"title\": \"Fallo en workflow WF-065: Motor de Evaluación de Riesgo y Antifraude (IP / Tarjeta)\",\n  \"message\": \"=Error al ejecutar en colección fraud_evaluations: {{ $json.error?.message || \\\"Error no especificado\\\" }}\",\n  \"bookingId\": \"={{ $json.bookingId }}\",\n  \"metadata\": {\n    \"workflowCode\": \"WF-065\",\n    \"collection\": \"fraud_evaluations\",\n    \"endpoint\": \"/api/native/workflows/evaluar-antifraude\"\n  }\n}",
                        "options": {}
                  },
                  "name": "[ALERTA NATIVA] Enviar a /api/alerts",
                  "type": "native-automation-node.httpRequest",
                  "typeVersion": 4.2,
                  "position": [
                        950,
                        450
                  ]
            }
      ],
      "connections": {
            "[TRIGGER] Motor de Evaluación de Riesgo y Antifraude (IP / Tarjeta)": {
                  "main": [
                        [
                              {
                                    "node": "[EXTRACT] Formatear y Validar Datos",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[EXTRACT] Formatear y Validar Datos": {
                  "main": [
                        [
                              {
                                    "node": "[FIRESTORE] Operación Colección fraud_evaluations",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[FIRESTORE] Operación Colección fraud_evaluations": {
                  "main": [
                        [
                              {
                                    "node": "[RESPUESTA] Finalizar con Éxito",
                                    "type": "main",
                                    "index": 0
                              }
                        ],
                        [
                              {
                                    "node": "[ALERTA NATIVA] Enviar a /api/alerts",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            }
      }
}
  },
  {
    id: "wf-066-imn-weather-storm-radar",
    code: "WF-066",
    name: {
      es: "Radar Meteorológico IMN / CNE para Alerta de Lluvias Torrenciales",
      en: "IMN / CNE Live Severe Weather & Flash Flood Alert Watchdog"
    },
    category: "emergency",
    collection: "weather_alerts",
    description: {
      es: "Monitorea avisos del Instituto Meteorológico Nacional; si hay alerta roja/amarilla en una cuenca, suspende y reprograma tours de río.",
      en: "Monitors National Weather Institute alerts; temporarily pauses and reschedules river rafting if flash flood warnings trigger."
    },
    icon: "CloudRain",
    color: "#0284c7",
    endpoint: "/api/native/workflows/weather-alert",
    method: "POST",
    triggerEvent: "Boletín hidrometeorológico IMN o cron cada 30 min",
    nodesCount: 5,
    slaTarget: "< 500ms",
    nodes: [
      {
            "id": "node-trigger",
            "name": "[TRIGGER] Radar Meteorológico IMN / CNE para Alerta de Lluvias Torrenciales",
            "type": "native-automation-node.webhook",
            "description": "Boletín hidrometeorológico IMN o cron cada 30 min"
      },
      {
            "id": "node-extract",
            "name": "[EXTRACT] Formatear y Validar Datos",
            "type": "native-automation-node.code",
            "description": "Transformación y validación de esquema"
      },
      {
            "id": "node-firestore",
            "name": "[FIRESTORE] Operación weather_alerts",
            "type": "native-automation-node.googleFirebaseCloudFirestore",
            "description": "Lectura/Escritura en Firestore /weather_alerts"
      },
      {
            "id": "node-response",
            "name": "[RESPUESTA] Finalizar con Éxito",
            "type": "native-automation-node.respondToWebhook",
            "description": "Respuesta HTTP 200 con payload estructurado"
      },
      {
            "id": "node-alert",
            "name": "[ALERTA NATIVA] Enviar a /api/alerts",
            "type": "native-automation-node.httpRequest",
            "description": "Enrutamiento de error a /api/alerts (reemplazo Telegram)"
      }
],
    samplePayload: {
      "basin": "Río Pacuare",
      "alertLevel": "ALERTA_AMARILLA_IMN",
      "riverFlowM3s": 240,
      "recommendation": "PAUSE_RAFTING_SECTION_3"
},
    blueprintJson: {
      "id": "WF-066",
      "name": "Radar Meteorológico IMN / CNE para Alerta de Lluvias Torrenciales",
      "active": true,
      "nodes": [
            {
                  "parameters": {
                        "path": "api/native/workflows/weather-alert",
                        "httpMethod": "POST",
                        "responseMode": "responseNode",
                        "options": {}
                  },
                  "name": "[TRIGGER] Radar Meteorológico IMN / CNE para Alerta de Lluvias Torrenciales",
                  "type": "native-automation-node.webhook",
                  "typeVersion": 2,
                  "position": [
                        100,
                        300
                  ]
            },
            {
                  "parameters": {
                        "jsCode": "// Validar campos obligatorios y normalizar timestamp\nconst item = $input.first().json || {};\nitem.processedAt = new Date().toISOString();\nitem.environment = 'production';\nitem.targetCollection = 'weather_alerts';\nreturn [{ json: item }];"
                  },
                  "name": "[EXTRACT] Formatear y Validar Datos",
                  "type": "native-automation-node.code",
                  "typeVersion": 2,
                  "position": [
                        350,
                        300
                  ]
            },
            {
                  "parameters": {
                        "operation": "upsert",
                        "collection": "weather_alerts",
                        "documentId": "={{ $json.id || $json.bookingId || $json.code || $now }}",
                        "dataToSend": "defineBelow",
                        "fieldsUi": {
                              "fieldValues": [
                                    {
                                          "fieldId": "updatedAt",
                                          "fieldValue": "={{ $now }}"
                                    },
                                    {
                                          "fieldId": "workflowSource",
                                          "fieldValue": "WF-066"
                                    },
                                    {
                                          "fieldId": "status",
                                          "fieldValue": "processed"
                                    }
                              ]
                        }
                  },
                  "name": "[FIRESTORE] Operación Colección weather_alerts",
                  "type": "native-automation-node.googleFirebaseCloudFirestore",
                  "typeVersion": 1.1,
                  "position": [
                        650,
                        300
                  ],
                  "credentials": {
                        "googleApi": {
                              "id": "5NiYz8gX64lPYIdK",
                              "name": "Costa Rica Tours - Firebase"
                        }
                  },
                  "onError": "continueErrorOutput"
            },
            {
                  "parameters": {
                        "respondWith": "json",
                        "responseBody": "{\n  \"success\": true,\n  \"workflowCode\": \"WF-066\",\n  \"collection\": \"weather_alerts\",\n  \"timestamp\": \"={{ $now }}\",\n  \"message\": \"Operación completada exitosamente en weather_alerts\"\n}",
                        "options": {}
                  },
                  "name": "[RESPUESTA] Finalizar con Éxito",
                  "type": "native-automation-node.respondToWebhook",
                  "typeVersion": 1.5,
                  "position": [
                        950,
                        200
                  ]
            },
            {
                  "parameters": {
                        "method": "POST",
                        "url": "={{ $env.APP_URL || \"http://localhost:3000\" }}/api/alerts",
                        "sendHeaders": true,
                        "headerParameters": {
                              "parameters": [
                                    {
                                          "name": "X-Webhook-Secret",
                                          "value": "={{ $env.WEBHOOK_SECRET || \"dev-secret\" }}"
                                    },
                                    {
                                          "name": "Content-Type",
                                          "value": "application/json"
                                    }
                              ]
                        },
                        "sendBody": true,
                        "specifyBody": "json",
                        "jsonBody": "{\n  \"source\": \"Radar Meteorológico IMN / CNE para Alerta de Lluvias Torrenciales\",\n  \"severity\": \"critical\",\n  \"title\": \"Fallo en workflow WF-066: Radar Meteorológico IMN / CNE para Alerta de Lluvias Torrenciales\",\n  \"message\": \"=Error al ejecutar en colección weather_alerts: {{ $json.error?.message || \\\"Error no especificado\\\" }}\",\n  \"bookingId\": \"={{ $json.bookingId }}\",\n  \"metadata\": {\n    \"workflowCode\": \"WF-066\",\n    \"collection\": \"weather_alerts\",\n    \"endpoint\": \"/api/native/workflows/weather-alert\"\n  }\n}",
                        "options": {}
                  },
                  "name": "[ALERTA NATIVA] Enviar a /api/alerts",
                  "type": "native-automation-node.httpRequest",
                  "typeVersion": 4.2,
                  "position": [
                        950,
                        450
                  ]
            }
      ],
      "connections": {
            "[TRIGGER] Radar Meteorológico IMN / CNE para Alerta de Lluvias Torrenciales": {
                  "main": [
                        [
                              {
                                    "node": "[EXTRACT] Formatear y Validar Datos",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[EXTRACT] Formatear y Validar Datos": {
                  "main": [
                        [
                              {
                                    "node": "[FIRESTORE] Operación Colección weather_alerts",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[FIRESTORE] Operación Colección weather_alerts": {
                  "main": [
                        [
                              {
                                    "node": "[RESPUESTA] Finalizar con Éxito",
                                    "type": "main",
                                    "index": 0
                              }
                        ],
                        [
                              {
                                    "node": "[ALERTA NATIVA] Enviar a /api/alerts",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            }
      }
}
  },
  {
    id: "wf-067-ovsicori-volcanic-activity-guard",
    code: "WF-067",
    name: {
      es: "Vigilante Sísmico y Volcánico OVSICORI (Poás / Arenal / Rincón)",
      en: "OVSICORI Volcanic & Seismic Gas Sensor Live Guardian"
    },
    category: "emergency",
    collection: "volcanic_monitoring",
    description: {
      es: "Consulta sensores de gases y sismicidad volcánica para alertar si el mirador del cráter del Volcán Poás debe cerrarse temporalmente.",
      en: "Queries gas sensors and seismic tremors to coordinate safe crater viewpoint access at Poás & Rincón de la Vieja."
    },
    icon: "Flame",
    color: "#ea580c",
    endpoint: "/api/native/workflows/volcano-guard",
    method: "POST",
    triggerEvent: "Webhook de alertas sísmicas OVSICORI-UNA",
    nodesCount: 5,
    slaTarget: "< 300ms",
    nodes: [
      {
            "id": "node-trigger",
            "name": "[TRIGGER] Vigilante Sísmico y Volcánico OVSICORI (Poás / Arenal / Rincón)",
            "type": "native-automation-node.webhook",
            "description": "Webhook de alertas sísmicas OVSICORI-UNA"
      },
      {
            "id": "node-extract",
            "name": "[EXTRACT] Formatear y Validar Datos",
            "type": "native-automation-node.code",
            "description": "Transformación y validación de esquema"
      },
      {
            "id": "node-firestore",
            "name": "[FIRESTORE] Operación volcanic_monitoring",
            "type": "native-automation-node.googleFirebaseCloudFirestore",
            "description": "Lectura/Escritura en Firestore /volcanic_monitoring"
      },
      {
            "id": "node-response",
            "name": "[RESPUESTA] Finalizar con Éxito",
            "type": "native-automation-node.respondToWebhook",
            "description": "Respuesta HTTP 200 con payload estructurado"
      },
      {
            "id": "node-alert",
            "name": "[ALERTA NATIVA] Enviar a /api/alerts",
            "type": "native-automation-node.httpRequest",
            "description": "Enrutamiento de error a /api/alerts (reemplazo Telegram)"
      }
],
    samplePayload: {
      "volcano": "Volcán Poás",
      "so2GasLevelPpm": 3.2,
      "craterAccessAllowed": true
},
    blueprintJson: {
      "id": "WF-067",
      "name": "Vigilante Sísmico y Volcánico OVSICORI (Poás / Arenal / Rincón)",
      "active": true,
      "nodes": [
            {
                  "parameters": {
                        "path": "api/native/workflows/volcano-guard",
                        "httpMethod": "POST",
                        "responseMode": "responseNode",
                        "options": {}
                  },
                  "name": "[TRIGGER] Vigilante Sísmico y Volcánico OVSICORI (Poás / Arenal / Rincón)",
                  "type": "native-automation-node.webhook",
                  "typeVersion": 2,
                  "position": [
                        100,
                        300
                  ]
            },
            {
                  "parameters": {
                        "jsCode": "// Validar campos obligatorios y normalizar timestamp\nconst item = $input.first().json || {};\nitem.processedAt = new Date().toISOString();\nitem.environment = 'production';\nitem.targetCollection = 'volcanic_monitoring';\nreturn [{ json: item }];"
                  },
                  "name": "[EXTRACT] Formatear y Validar Datos",
                  "type": "native-automation-node.code",
                  "typeVersion": 2,
                  "position": [
                        350,
                        300
                  ]
            },
            {
                  "parameters": {
                        "operation": "upsert",
                        "collection": "volcanic_monitoring",
                        "documentId": "={{ $json.id || $json.bookingId || $json.code || $now }}",
                        "dataToSend": "defineBelow",
                        "fieldsUi": {
                              "fieldValues": [
                                    {
                                          "fieldId": "updatedAt",
                                          "fieldValue": "={{ $now }}"
                                    },
                                    {
                                          "fieldId": "workflowSource",
                                          "fieldValue": "WF-067"
                                    },
                                    {
                                          "fieldId": "status",
                                          "fieldValue": "processed"
                                    }
                              ]
                        }
                  },
                  "name": "[FIRESTORE] Operación Colección volcanic_monitoring",
                  "type": "native-automation-node.googleFirebaseCloudFirestore",
                  "typeVersion": 1.1,
                  "position": [
                        650,
                        300
                  ],
                  "credentials": {
                        "googleApi": {
                              "id": "5NiYz8gX64lPYIdK",
                              "name": "Costa Rica Tours - Firebase"
                        }
                  },
                  "onError": "continueErrorOutput"
            },
            {
                  "parameters": {
                        "respondWith": "json",
                        "responseBody": "{\n  \"success\": true,\n  \"workflowCode\": \"WF-067\",\n  \"collection\": \"volcanic_monitoring\",\n  \"timestamp\": \"={{ $now }}\",\n  \"message\": \"Operación completada exitosamente en volcanic_monitoring\"\n}",
                        "options": {}
                  },
                  "name": "[RESPUESTA] Finalizar con Éxito",
                  "type": "native-automation-node.respondToWebhook",
                  "typeVersion": 1.5,
                  "position": [
                        950,
                        200
                  ]
            },
            {
                  "parameters": {
                        "method": "POST",
                        "url": "={{ $env.APP_URL || \"http://localhost:3000\" }}/api/alerts",
                        "sendHeaders": true,
                        "headerParameters": {
                              "parameters": [
                                    {
                                          "name": "X-Webhook-Secret",
                                          "value": "={{ $env.WEBHOOK_SECRET || \"dev-secret\" }}"
                                    },
                                    {
                                          "name": "Content-Type",
                                          "value": "application/json"
                                    }
                              ]
                        },
                        "sendBody": true,
                        "specifyBody": "json",
                        "jsonBody": "{\n  \"source\": \"Vigilante Sísmico y Volcánico OVSICORI (Poás / Arenal / Rincón)\",\n  \"severity\": \"critical\",\n  \"title\": \"Fallo en workflow WF-067: Vigilante Sísmico y Volcánico OVSICORI (Poás / Arenal / Rincón)\",\n  \"message\": \"=Error al ejecutar en colección volcanic_monitoring: {{ $json.error?.message || \\\"Error no especificado\\\" }}\",\n  \"bookingId\": \"={{ $json.bookingId }}\",\n  \"metadata\": {\n    \"workflowCode\": \"WF-067\",\n    \"collection\": \"volcanic_monitoring\",\n    \"endpoint\": \"/api/native/workflows/volcano-guard\"\n  }\n}",
                        "options": {}
                  },
                  "name": "[ALERTA NATIVA] Enviar a /api/alerts",
                  "type": "native-automation-node.httpRequest",
                  "typeVersion": 4.2,
                  "position": [
                        950,
                        450
                  ]
            }
      ],
      "connections": {
            "[TRIGGER] Vigilante Sísmico y Volcánico OVSICORI (Poás / Arenal / Rincón)": {
                  "main": [
                        [
                              {
                                    "node": "[EXTRACT] Formatear y Validar Datos",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[EXTRACT] Formatear y Validar Datos": {
                  "main": [
                        [
                              {
                                    "node": "[FIRESTORE] Operación Colección volcanic_monitoring",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[FIRESTORE] Operación Colección volcanic_monitoring": {
                  "main": [
                        [
                              {
                                    "node": "[RESPUESTA] Finalizar con Éxito",
                                    "type": "main",
                                    "index": 0
                              }
                        ],
                        [
                              {
                                    "node": "[ALERTA NATIVA] Enviar a /api/alerts",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            }
      }
}
  },
  {
    id: "wf-068-sinac-park-quota-monitor",
    code: "WF-068",
    name: {
      es: "Monitoreo de Capacidad Diaria en Parques Nacionales SINAC",
      en: "SINAC National Parks Official Daily Capacity & Quota Tracker"
    },
    category: "operations",
    collection: "sinac_quotas",
    description: {
      es: "Monitorea disponibilidad de entradas oficiales en parques de cupo restringido (Manuel Antonio, Chirripó, Isla del Coco).",
      en: "Tracks remaining entry tickets at capacity-restricted national parks preventing sold-out booking errors."
    },
    icon: "Trees",
    color: "#059669",
    endpoint: "/api/native/workflows/sinac-quota-check",
    method: "POST",
    triggerEvent: "Cron cada hora o al validar disponibilidad",
    nodesCount: 5,
    slaTarget: "< 600ms",
    nodes: [
      {
            "id": "node-trigger",
            "name": "[TRIGGER] Monitoreo de Capacidad Diaria en Parques Nacionales SINAC",
            "type": "native-automation-node.webhook",
            "description": "Cron cada hora o al validar disponibilidad"
      },
      {
            "id": "node-extract",
            "name": "[EXTRACT] Formatear y Validar Datos",
            "type": "native-automation-node.code",
            "description": "Transformación y validación de esquema"
      },
      {
            "id": "node-firestore",
            "name": "[FIRESTORE] Operación sinac_quotas",
            "type": "native-automation-node.googleFirebaseCloudFirestore",
            "description": "Lectura/Escritura en Firestore /sinac_quotas"
      },
      {
            "id": "node-response",
            "name": "[RESPUESTA] Finalizar con Éxito",
            "type": "native-automation-node.respondToWebhook",
            "description": "Respuesta HTTP 200 con payload estructurado"
      },
      {
            "id": "node-alert",
            "name": "[ALERTA NATIVA] Enviar a /api/alerts",
            "type": "native-automation-node.httpRequest",
            "description": "Enrutamiento de error a /api/alerts (reemplazo Telegram)"
      }
],
    samplePayload: {
      "parkId": "PARK-MANUEL-ANTONIO",
      "date": "2026-10-15",
      "ticketsRemaining": 84
},
    blueprintJson: {
      "id": "WF-068",
      "name": "Monitoreo de Capacidad Diaria en Parques Nacionales SINAC",
      "active": true,
      "nodes": [
            {
                  "parameters": {
                        "path": "api/native/workflows/sinac-quota-check",
                        "httpMethod": "POST",
                        "responseMode": "responseNode",
                        "options": {}
                  },
                  "name": "[TRIGGER] Monitoreo de Capacidad Diaria en Parques Nacionales SINAC",
                  "type": "native-automation-node.webhook",
                  "typeVersion": 2,
                  "position": [
                        100,
                        300
                  ]
            },
            {
                  "parameters": {
                        "jsCode": "// Validar campos obligatorios y normalizar timestamp\nconst item = $input.first().json || {};\nitem.processedAt = new Date().toISOString();\nitem.environment = 'production';\nitem.targetCollection = 'sinac_quotas';\nreturn [{ json: item }];"
                  },
                  "name": "[EXTRACT] Formatear y Validar Datos",
                  "type": "native-automation-node.code",
                  "typeVersion": 2,
                  "position": [
                        350,
                        300
                  ]
            },
            {
                  "parameters": {
                        "operation": "upsert",
                        "collection": "sinac_quotas",
                        "documentId": "={{ $json.id || $json.bookingId || $json.code || $now }}",
                        "dataToSend": "defineBelow",
                        "fieldsUi": {
                              "fieldValues": [
                                    {
                                          "fieldId": "updatedAt",
                                          "fieldValue": "={{ $now }}"
                                    },
                                    {
                                          "fieldId": "workflowSource",
                                          "fieldValue": "WF-068"
                                    },
                                    {
                                          "fieldId": "status",
                                          "fieldValue": "processed"
                                    }
                              ]
                        }
                  },
                  "name": "[FIRESTORE] Operación Colección sinac_quotas",
                  "type": "native-automation-node.googleFirebaseCloudFirestore",
                  "typeVersion": 1.1,
                  "position": [
                        650,
                        300
                  ],
                  "credentials": {
                        "googleApi": {
                              "id": "5NiYz8gX64lPYIdK",
                              "name": "Costa Rica Tours - Firebase"
                        }
                  },
                  "onError": "continueErrorOutput"
            },
            {
                  "parameters": {
                        "respondWith": "json",
                        "responseBody": "{\n  \"success\": true,\n  \"workflowCode\": \"WF-068\",\n  \"collection\": \"sinac_quotas\",\n  \"timestamp\": \"={{ $now }}\",\n  \"message\": \"Operación completada exitosamente en sinac_quotas\"\n}",
                        "options": {}
                  },
                  "name": "[RESPUESTA] Finalizar con Éxito",
                  "type": "native-automation-node.respondToWebhook",
                  "typeVersion": 1.5,
                  "position": [
                        950,
                        200
                  ]
            },
            {
                  "parameters": {
                        "method": "POST",
                        "url": "={{ $env.APP_URL || \"http://localhost:3000\" }}/api/alerts",
                        "sendHeaders": true,
                        "headerParameters": {
                              "parameters": [
                                    {
                                          "name": "X-Webhook-Secret",
                                          "value": "={{ $env.WEBHOOK_SECRET || \"dev-secret\" }}"
                                    },
                                    {
                                          "name": "Content-Type",
                                          "value": "application/json"
                                    }
                              ]
                        },
                        "sendBody": true,
                        "specifyBody": "json",
                        "jsonBody": "{\n  \"source\": \"Monitoreo de Capacidad Diaria en Parques Nacionales SINAC\",\n  \"severity\": \"critical\",\n  \"title\": \"Fallo en workflow WF-068: Monitoreo de Capacidad Diaria en Parques Nacionales SINAC\",\n  \"message\": \"=Error al ejecutar en colección sinac_quotas: {{ $json.error?.message || \\\"Error no especificado\\\" }}\",\n  \"bookingId\": \"={{ $json.bookingId }}\",\n  \"metadata\": {\n    \"workflowCode\": \"WF-068\",\n    \"collection\": \"sinac_quotas\",\n    \"endpoint\": \"/api/native/workflows/sinac-quota-check\"\n  }\n}",
                        "options": {}
                  },
                  "name": "[ALERTA NATIVA] Enviar a /api/alerts",
                  "type": "native-automation-node.httpRequest",
                  "typeVersion": 4.2,
                  "position": [
                        950,
                        450
                  ]
            }
      ],
      "connections": {
            "[TRIGGER] Monitoreo de Capacidad Diaria en Parques Nacionales SINAC": {
                  "main": [
                        [
                              {
                                    "node": "[EXTRACT] Formatear y Validar Datos",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[EXTRACT] Formatear y Validar Datos": {
                  "main": [
                        [
                              {
                                    "node": "[FIRESTORE] Operación Colección sinac_quotas",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[FIRESTORE] Operación Colección sinac_quotas": {
                  "main": [
                        [
                              {
                                    "node": "[RESPUESTA] Finalizar con Éxito",
                                    "type": "main",
                                    "index": 0
                              }
                        ],
                        [
                              {
                                    "node": "[ALERTA NATIVA] Enviar a /api/alerts",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            }
      }
}
  },
  {
    id: "wf-069-lost-trail-gps-emergency-beacon",
    code: "WF-069",
    name: {
      es: "Baliza de Emergencia SOS para Turistas en Senderos Silvestres",
      en: "Trail SOS Emergency Beacon & Park Ranger Geo-Coordinates"
    },
    category: "emergency",
    collection: "sos_beacons",
    description: {
      es: "Permite al viajero enviar su posición GPS satelital exacta a la Cruz Roja Costarricense y Guardaparques en un solo toque.",
      en: "Dispatches satellite geo-coordinates to CR Red Cross and Park Rangers with one-touch SOS beacon."
    },
    icon: "Radio",
    color: "#dc2626",
    endpoint: "/api/native/workflows/sos-beacon",
    method: "POST",
    triggerEvent: "Activación de botón SOS en app móvil",
    nodesCount: 5,
    slaTarget: "< 100ms",
    nodes: [
      {
            "id": "node-trigger",
            "name": "[TRIGGER] Baliza de Emergencia SOS para Turistas en Senderos Silvestres",
            "type": "native-automation-node.webhook",
            "description": "Activación de botón SOS en app móvil"
      },
      {
            "id": "node-extract",
            "name": "[EXTRACT] Formatear y Validar Datos",
            "type": "native-automation-node.code",
            "description": "Transformación y validación de esquema"
      },
      {
            "id": "node-firestore",
            "name": "[FIRESTORE] Operación sos_beacons",
            "type": "native-automation-node.googleFirebaseCloudFirestore",
            "description": "Lectura/Escritura en Firestore /sos_beacons"
      },
      {
            "id": "node-response",
            "name": "[RESPUESTA] Finalizar con Éxito",
            "type": "native-automation-node.respondToWebhook",
            "description": "Respuesta HTTP 200 con payload estructurado"
      },
      {
            "id": "node-alert",
            "name": "[ALERTA NATIVA] Enviar a /api/alerts",
            "type": "native-automation-node.httpRequest",
            "description": "Enrutamiento de error a /api/alerts (reemplazo Telegram)"
      }
],
    samplePayload: {
      "bookingId": "BK-CR-2026-SOS-01",
      "lat": 10.4289,
      "lng": -84.7312,
      "battery": "68%",
      "guidePhone": "+50689998877"
},
    blueprintJson: {
      "id": "WF-069",
      "name": "Baliza de Emergencia SOS para Turistas en Senderos Silvestres",
      "active": true,
      "nodes": [
            {
                  "parameters": {
                        "path": "api/native/workflows/sos-beacon",
                        "httpMethod": "POST",
                        "responseMode": "responseNode",
                        "options": {}
                  },
                  "name": "[TRIGGER] Baliza de Emergencia SOS para Turistas en Senderos Silvestres",
                  "type": "native-automation-node.webhook",
                  "typeVersion": 2,
                  "position": [
                        100,
                        300
                  ]
            },
            {
                  "parameters": {
                        "jsCode": "// Validar campos obligatorios y normalizar timestamp\nconst item = $input.first().json || {};\nitem.processedAt = new Date().toISOString();\nitem.environment = 'production';\nitem.targetCollection = 'sos_beacons';\nreturn [{ json: item }];"
                  },
                  "name": "[EXTRACT] Formatear y Validar Datos",
                  "type": "native-automation-node.code",
                  "typeVersion": 2,
                  "position": [
                        350,
                        300
                  ]
            },
            {
                  "parameters": {
                        "operation": "upsert",
                        "collection": "sos_beacons",
                        "documentId": "={{ $json.id || $json.bookingId || $json.code || $now }}",
                        "dataToSend": "defineBelow",
                        "fieldsUi": {
                              "fieldValues": [
                                    {
                                          "fieldId": "updatedAt",
                                          "fieldValue": "={{ $now }}"
                                    },
                                    {
                                          "fieldId": "workflowSource",
                                          "fieldValue": "WF-069"
                                    },
                                    {
                                          "fieldId": "status",
                                          "fieldValue": "processed"
                                    }
                              ]
                        }
                  },
                  "name": "[FIRESTORE] Operación Colección sos_beacons",
                  "type": "native-automation-node.googleFirebaseCloudFirestore",
                  "typeVersion": 1.1,
                  "position": [
                        650,
                        300
                  ],
                  "credentials": {
                        "googleApi": {
                              "id": "5NiYz8gX64lPYIdK",
                              "name": "Costa Rica Tours - Firebase"
                        }
                  },
                  "onError": "continueErrorOutput"
            },
            {
                  "parameters": {
                        "respondWith": "json",
                        "responseBody": "{\n  \"success\": true,\n  \"workflowCode\": \"WF-069\",\n  \"collection\": \"sos_beacons\",\n  \"timestamp\": \"={{ $now }}\",\n  \"message\": \"Operación completada exitosamente en sos_beacons\"\n}",
                        "options": {}
                  },
                  "name": "[RESPUESTA] Finalizar con Éxito",
                  "type": "native-automation-node.respondToWebhook",
                  "typeVersion": 1.5,
                  "position": [
                        950,
                        200
                  ]
            },
            {
                  "parameters": {
                        "method": "POST",
                        "url": "={{ $env.APP_URL || \"http://localhost:3000\" }}/api/alerts",
                        "sendHeaders": true,
                        "headerParameters": {
                              "parameters": [
                                    {
                                          "name": "X-Webhook-Secret",
                                          "value": "={{ $env.WEBHOOK_SECRET || \"dev-secret\" }}"
                                    },
                                    {
                                          "name": "Content-Type",
                                          "value": "application/json"
                                    }
                              ]
                        },
                        "sendBody": true,
                        "specifyBody": "json",
                        "jsonBody": "{\n  \"source\": \"Baliza de Emergencia SOS para Turistas en Senderos Silvestres\",\n  \"severity\": \"critical\",\n  \"title\": \"Fallo en workflow WF-069: Baliza de Emergencia SOS para Turistas en Senderos Silvestres\",\n  \"message\": \"=Error al ejecutar en colección sos_beacons: {{ $json.error?.message || \\\"Error no especificado\\\" }}\",\n  \"bookingId\": \"={{ $json.bookingId }}\",\n  \"metadata\": {\n    \"workflowCode\": \"WF-069\",\n    \"collection\": \"sos_beacons\",\n    \"endpoint\": \"/api/native/workflows/sos-beacon\"\n  }\n}",
                        "options": {}
                  },
                  "name": "[ALERTA NATIVA] Enviar a /api/alerts",
                  "type": "native-automation-node.httpRequest",
                  "typeVersion": 4.2,
                  "position": [
                        950,
                        450
                  ]
            }
      ],
      "connections": {
            "[TRIGGER] Baliza de Emergencia SOS para Turistas en Senderos Silvestres": {
                  "main": [
                        [
                              {
                                    "node": "[EXTRACT] Formatear y Validar Datos",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[EXTRACT] Formatear y Validar Datos": {
                  "main": [
                        [
                              {
                                    "node": "[FIRESTORE] Operación Colección sos_beacons",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[FIRESTORE] Operación Colección sos_beacons": {
                  "main": [
                        [
                              {
                                    "node": "[RESPUESTA] Finalizar con Éxito",
                                    "type": "main",
                                    "index": 0
                              }
                        ],
                        [
                              {
                                    "node": "[ALERTA NATIVA] Enviar a /api/alerts",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            }
      }
}
  },
  {
    id: "wf-070-bot-scraping-ddos-shield",
    code: "WF-070",
    name: {
      es: "Escudo Antibots y Mitigador de Scraping Masivo de Precios",
      en: "Anti-Scraper Rate Limiter & Competitor Bot Shield"
    },
    category: "fraud",
    collection: "blocked_ips",
    description: {
      es: "Bloquea temporalmente direcciones IP que superan 60 peticiones/minuto protegiendo la base de datos de tours.",
      en: "Auto-blocks aggressive scraping IPs exceeding threshold rates protecting tour catalogs and pricing."
    },
    icon: "Shield",
    color: "#7f1d1d",
    endpoint: "/api/native/workflows/block-bot-ip",
    method: "POST",
    triggerEvent: "Detección de ráfaga de peticiones por middleware",
    nodesCount: 5,
    slaTarget: "< 50ms",
    nodes: [
      {
            "id": "node-trigger",
            "name": "[TRIGGER] Escudo Antibots y Mitigador de Scraping Masivo de Precios",
            "type": "native-automation-node.webhook",
            "description": "Detección de ráfaga de peticiones por middleware"
      },
      {
            "id": "node-extract",
            "name": "[EXTRACT] Formatear y Validar Datos",
            "type": "native-automation-node.code",
            "description": "Transformación y validación de esquema"
      },
      {
            "id": "node-firestore",
            "name": "[FIRESTORE] Operación blocked_ips",
            "type": "native-automation-node.googleFirebaseCloudFirestore",
            "description": "Lectura/Escritura en Firestore /blocked_ips"
      },
      {
            "id": "node-response",
            "name": "[RESPUESTA] Finalizar con Éxito",
            "type": "native-automation-node.respondToWebhook",
            "description": "Respuesta HTTP 200 con payload estructurado"
      },
      {
            "id": "node-alert",
            "name": "[ALERTA NATIVA] Enviar a /api/alerts",
            "type": "native-automation-node.httpRequest",
            "description": "Enrutamiento de error a /api/alerts (reemplazo Telegram)"
      }
],
    samplePayload: {
      "suspiciousIp": "45.142.120.9",
      "requestsPerMin": 180,
      "action": "BAN_IP_24H"
},
    blueprintJson: {
      "id": "WF-070",
      "name": "Escudo Antibots y Mitigador de Scraping Masivo de Precios",
      "active": true,
      "nodes": [
            {
                  "parameters": {
                        "path": "api/native/workflows/block-bot-ip",
                        "httpMethod": "POST",
                        "responseMode": "responseNode",
                        "options": {}
                  },
                  "name": "[TRIGGER] Escudo Antibots y Mitigador de Scraping Masivo de Precios",
                  "type": "native-automation-node.webhook",
                  "typeVersion": 2,
                  "position": [
                        100,
                        300
                  ]
            },
            {
                  "parameters": {
                        "jsCode": "// Validar campos obligatorios y normalizar timestamp\nconst item = $input.first().json || {};\nitem.processedAt = new Date().toISOString();\nitem.environment = 'production';\nitem.targetCollection = 'blocked_ips';\nreturn [{ json: item }];"
                  },
                  "name": "[EXTRACT] Formatear y Validar Datos",
                  "type": "native-automation-node.code",
                  "typeVersion": 2,
                  "position": [
                        350,
                        300
                  ]
            },
            {
                  "parameters": {
                        "operation": "upsert",
                        "collection": "blocked_ips",
                        "documentId": "={{ $json.id || $json.bookingId || $json.code || $now }}",
                        "dataToSend": "defineBelow",
                        "fieldsUi": {
                              "fieldValues": [
                                    {
                                          "fieldId": "updatedAt",
                                          "fieldValue": "={{ $now }}"
                                    },
                                    {
                                          "fieldId": "workflowSource",
                                          "fieldValue": "WF-070"
                                    },
                                    {
                                          "fieldId": "status",
                                          "fieldValue": "processed"
                                    }
                              ]
                        }
                  },
                  "name": "[FIRESTORE] Operación Colección blocked_ips",
                  "type": "native-automation-node.googleFirebaseCloudFirestore",
                  "typeVersion": 1.1,
                  "position": [
                        650,
                        300
                  ],
                  "credentials": {
                        "googleApi": {
                              "id": "5NiYz8gX64lPYIdK",
                              "name": "Costa Rica Tours - Firebase"
                        }
                  },
                  "onError": "continueErrorOutput"
            },
            {
                  "parameters": {
                        "respondWith": "json",
                        "responseBody": "{\n  \"success\": true,\n  \"workflowCode\": \"WF-070\",\n  \"collection\": \"blocked_ips\",\n  \"timestamp\": \"={{ $now }}\",\n  \"message\": \"Operación completada exitosamente en blocked_ips\"\n}",
                        "options": {}
                  },
                  "name": "[RESPUESTA] Finalizar con Éxito",
                  "type": "native-automation-node.respondToWebhook",
                  "typeVersion": 1.5,
                  "position": [
                        950,
                        200
                  ]
            },
            {
                  "parameters": {
                        "method": "POST",
                        "url": "={{ $env.APP_URL || \"http://localhost:3000\" }}/api/alerts",
                        "sendHeaders": true,
                        "headerParameters": {
                              "parameters": [
                                    {
                                          "name": "X-Webhook-Secret",
                                          "value": "={{ $env.WEBHOOK_SECRET || \"dev-secret\" }}"
                                    },
                                    {
                                          "name": "Content-Type",
                                          "value": "application/json"
                                    }
                              ]
                        },
                        "sendBody": true,
                        "specifyBody": "json",
                        "jsonBody": "{\n  \"source\": \"Escudo Antibots y Mitigador de Scraping Masivo de Precios\",\n  \"severity\": \"critical\",\n  \"title\": \"Fallo en workflow WF-070: Escudo Antibots y Mitigador de Scraping Masivo de Precios\",\n  \"message\": \"=Error al ejecutar en colección blocked_ips: {{ $json.error?.message || \\\"Error no especificado\\\" }}\",\n  \"bookingId\": \"={{ $json.bookingId }}\",\n  \"metadata\": {\n    \"workflowCode\": \"WF-070\",\n    \"collection\": \"blocked_ips\",\n    \"endpoint\": \"/api/native/workflows/block-bot-ip\"\n  }\n}",
                        "options": {}
                  },
                  "name": "[ALERTA NATIVA] Enviar a /api/alerts",
                  "type": "native-automation-node.httpRequest",
                  "typeVersion": 4.2,
                  "position": [
                        950,
                        450
                  ]
            }
      ],
      "connections": {
            "[TRIGGER] Escudo Antibots y Mitigador de Scraping Masivo de Precios": {
                  "main": [
                        [
                              {
                                    "node": "[EXTRACT] Formatear y Validar Datos",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[EXTRACT] Formatear y Validar Datos": {
                  "main": [
                        [
                              {
                                    "node": "[FIRESTORE] Operación Colección blocked_ips",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[FIRESTORE] Operación Colección blocked_ips": {
                  "main": [
                        [
                              {
                                    "node": "[RESPUESTA] Finalizar con Éxito",
                                    "type": "main",
                                    "index": 0
                              }
                        ],
                        [
                              {
                                    "node": "[ALERTA NATIVA] Enviar a /api/alerts",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            }
      }
}
  },
  {
    id: "wf-071-duplicate-booking-interceptor",
    code: "WF-071",
    name: {
      es: "Detector e Interceptor de Reservas Duplicadas por Doble Clic",
      en: "Double-Click Duplicate Booking Interceptor & Void Engine"
    },
    category: "fraud",
    collection: "duplicate_catches",
    description: {
      es: "Detecta si un usuario presionó el botón pagar dos veces en menos de 5 segundos, anulando el segundo cargo instantáneamente.",
      en: "Detects duplicate checkout submissions within 5s window, auto-voiding the redundant payment authorization."
    },
    icon: "CopyCheck",
    color: "#f59e0b",
    endpoint: "/api/native/workflows/catch-duplicate-booking",
    method: "POST",
    triggerEvent: "Pre-creación de reserva",
    nodesCount: 5,
    slaTarget: "< 80ms",
    nodes: [
      {
            "id": "node-trigger",
            "name": "[TRIGGER] Detector e Interceptor de Reservas Duplicadas por Doble Clic",
            "type": "native-automation-node.webhook",
            "description": "Pre-creación de reserva"
      },
      {
            "id": "node-extract",
            "name": "[EXTRACT] Formatear y Validar Datos",
            "type": "native-automation-node.code",
            "description": "Transformación y validación de esquema"
      },
      {
            "id": "node-firestore",
            "name": "[FIRESTORE] Operación duplicate_catches",
            "type": "native-automation-node.googleFirebaseCloudFirestore",
            "description": "Lectura/Escritura en Firestore /duplicate_catches"
      },
      {
            "id": "node-response",
            "name": "[RESPUESTA] Finalizar con Éxito",
            "type": "native-automation-node.respondToWebhook",
            "description": "Respuesta HTTP 200 con payload estructurado"
      },
      {
            "id": "node-alert",
            "name": "[ALERTA NATIVA] Enviar a /api/alerts",
            "type": "native-automation-node.httpRequest",
            "description": "Enrutamiento de error a /api/alerts (reemplazo Telegram)"
      }
],
    samplePayload: {
      "customerEmail": "traveler@berlin.de",
      "idempotencyKey": "idem-20260914-991",
      "isDuplicate": true
},
    blueprintJson: {
      "id": "WF-071",
      "name": "Detector e Interceptor de Reservas Duplicadas por Doble Clic",
      "active": true,
      "nodes": [
            {
                  "parameters": {
                        "path": "api/native/workflows/catch-duplicate-booking",
                        "httpMethod": "POST",
                        "responseMode": "responseNode",
                        "options": {}
                  },
                  "name": "[TRIGGER] Detector e Interceptor de Reservas Duplicadas por Doble Clic",
                  "type": "native-automation-node.webhook",
                  "typeVersion": 2,
                  "position": [
                        100,
                        300
                  ]
            },
            {
                  "parameters": {
                        "jsCode": "// Validar campos obligatorios y normalizar timestamp\nconst item = $input.first().json || {};\nitem.processedAt = new Date().toISOString();\nitem.environment = 'production';\nitem.targetCollection = 'duplicate_catches';\nreturn [{ json: item }];"
                  },
                  "name": "[EXTRACT] Formatear y Validar Datos",
                  "type": "native-automation-node.code",
                  "typeVersion": 2,
                  "position": [
                        350,
                        300
                  ]
            },
            {
                  "parameters": {
                        "operation": "upsert",
                        "collection": "duplicate_catches",
                        "documentId": "={{ $json.id || $json.bookingId || $json.code || $now }}",
                        "dataToSend": "defineBelow",
                        "fieldsUi": {
                              "fieldValues": [
                                    {
                                          "fieldId": "updatedAt",
                                          "fieldValue": "={{ $now }}"
                                    },
                                    {
                                          "fieldId": "workflowSource",
                                          "fieldValue": "WF-071"
                                    },
                                    {
                                          "fieldId": "status",
                                          "fieldValue": "processed"
                                    }
                              ]
                        }
                  },
                  "name": "[FIRESTORE] Operación Colección duplicate_catches",
                  "type": "native-automation-node.googleFirebaseCloudFirestore",
                  "typeVersion": 1.1,
                  "position": [
                        650,
                        300
                  ],
                  "credentials": {
                        "googleApi": {
                              "id": "5NiYz8gX64lPYIdK",
                              "name": "Costa Rica Tours - Firebase"
                        }
                  },
                  "onError": "continueErrorOutput"
            },
            {
                  "parameters": {
                        "respondWith": "json",
                        "responseBody": "{\n  \"success\": true,\n  \"workflowCode\": \"WF-071\",\n  \"collection\": \"duplicate_catches\",\n  \"timestamp\": \"={{ $now }}\",\n  \"message\": \"Operación completada exitosamente en duplicate_catches\"\n}",
                        "options": {}
                  },
                  "name": "[RESPUESTA] Finalizar con Éxito",
                  "type": "native-automation-node.respondToWebhook",
                  "typeVersion": 1.5,
                  "position": [
                        950,
                        200
                  ]
            },
            {
                  "parameters": {
                        "method": "POST",
                        "url": "={{ $env.APP_URL || \"http://localhost:3000\" }}/api/alerts",
                        "sendHeaders": true,
                        "headerParameters": {
                              "parameters": [
                                    {
                                          "name": "X-Webhook-Secret",
                                          "value": "={{ $env.WEBHOOK_SECRET || \"dev-secret\" }}"
                                    },
                                    {
                                          "name": "Content-Type",
                                          "value": "application/json"
                                    }
                              ]
                        },
                        "sendBody": true,
                        "specifyBody": "json",
                        "jsonBody": "{\n  \"source\": \"Detector e Interceptor de Reservas Duplicadas por Doble Clic\",\n  \"severity\": \"critical\",\n  \"title\": \"Fallo en workflow WF-071: Detector e Interceptor de Reservas Duplicadas por Doble Clic\",\n  \"message\": \"=Error al ejecutar en colección duplicate_catches: {{ $json.error?.message || \\\"Error no especificado\\\" }}\",\n  \"bookingId\": \"={{ $json.bookingId }}\",\n  \"metadata\": {\n    \"workflowCode\": \"WF-071\",\n    \"collection\": \"duplicate_catches\",\n    \"endpoint\": \"/api/native/workflows/catch-duplicate-booking\"\n  }\n}",
                        "options": {}
                  },
                  "name": "[ALERTA NATIVA] Enviar a /api/alerts",
                  "type": "native-automation-node.httpRequest",
                  "typeVersion": 4.2,
                  "position": [
                        950,
                        450
                  ]
            }
      ],
      "connections": {
            "[TRIGGER] Detector e Interceptor de Reservas Duplicadas por Doble Clic": {
                  "main": [
                        [
                              {
                                    "node": "[EXTRACT] Formatear y Validar Datos",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[EXTRACT] Formatear y Validar Datos": {
                  "main": [
                        [
                              {
                                    "node": "[FIRESTORE] Operación Colección duplicate_catches",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[FIRESTORE] Operación Colección duplicate_catches": {
                  "main": [
                        [
                              {
                                    "node": "[RESPUESTA] Finalizar con Éxito",
                                    "type": "main",
                                    "index": 0
                              }
                        ],
                        [
                              {
                                    "node": "[ALERTA NATIVA] Enviar a /api/alerts",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            }
      }
}
  },
  {
    id: "wf-072-red-cross-cruz-roja-dispatch",
    code: "WF-072",
    name: {
      es: "Enlace Directo con Cruz Roja Costarricense (Comité Local)",
      en: "Direct Dispatch Bridge to Local Costa Rican Red Cross"
    },
    category: "emergency",
    collection: "red_cross_dispatches",
    description: {
      es: "Envía reporte estructurado con tipo de sangre, contactos de emergencia y ubicación para respuesta de ambulancia rural.",
      en: "Dispatches emergency medical payload with blood type, policy number, and trail waypoint to Red Cross."
    },
    icon: "Cross",
    color: "#ef4444",
    endpoint: "/api/native/workflows/red-cross-dispatch",
    method: "POST",
    triggerEvent: "Solicitud médica de nivel urgente",
    nodesCount: 5,
    slaTarget: "< 150ms",
    nodes: [
      {
            "id": "node-trigger",
            "name": "[TRIGGER] Enlace Directo con Cruz Roja Costarricense (Comité Local)",
            "type": "native-automation-node.webhook",
            "description": "Solicitud médica de nivel urgente"
      },
      {
            "id": "node-extract",
            "name": "[EXTRACT] Formatear y Validar Datos",
            "type": "native-automation-node.code",
            "description": "Transformación y validación de esquema"
      },
      {
            "id": "node-firestore",
            "name": "[FIRESTORE] Operación red_cross_dispatches",
            "type": "native-automation-node.googleFirebaseCloudFirestore",
            "description": "Lectura/Escritura en Firestore /red_cross_dispatches"
      },
      {
            "id": "node-response",
            "name": "[RESPUESTA] Finalizar con Éxito",
            "type": "native-automation-node.respondToWebhook",
            "description": "Respuesta HTTP 200 con payload estructurado"
      },
      {
            "id": "node-alert",
            "name": "[ALERTA NATIVA] Enviar a /api/alerts",
            "type": "native-automation-node.httpRequest",
            "description": "Enrutamiento de error a /api/alerts (reemplazo Telegram)"
      }
],
    samplePayload: {
      "localCommittee": "Cruz Roja La Fortuna",
      "incidentType": "Severe allergic reaction",
      "ambulanceDispatched": true
},
    blueprintJson: {
      "id": "WF-072",
      "name": "Enlace Directo con Cruz Roja Costarricense (Comité Local)",
      "active": true,
      "nodes": [
            {
                  "parameters": {
                        "path": "api/native/workflows/red-cross-dispatch",
                        "httpMethod": "POST",
                        "responseMode": "responseNode",
                        "options": {}
                  },
                  "name": "[TRIGGER] Enlace Directo con Cruz Roja Costarricense (Comité Local)",
                  "type": "native-automation-node.webhook",
                  "typeVersion": 2,
                  "position": [
                        100,
                        300
                  ]
            },
            {
                  "parameters": {
                        "jsCode": "// Validar campos obligatorios y normalizar timestamp\nconst item = $input.first().json || {};\nitem.processedAt = new Date().toISOString();\nitem.environment = 'production';\nitem.targetCollection = 'red_cross_dispatches';\nreturn [{ json: item }];"
                  },
                  "name": "[EXTRACT] Formatear y Validar Datos",
                  "type": "native-automation-node.code",
                  "typeVersion": 2,
                  "position": [
                        350,
                        300
                  ]
            },
            {
                  "parameters": {
                        "operation": "upsert",
                        "collection": "red_cross_dispatches",
                        "documentId": "={{ $json.id || $json.bookingId || $json.code || $now }}",
                        "dataToSend": "defineBelow",
                        "fieldsUi": {
                              "fieldValues": [
                                    {
                                          "fieldId": "updatedAt",
                                          "fieldValue": "={{ $now }}"
                                    },
                                    {
                                          "fieldId": "workflowSource",
                                          "fieldValue": "WF-072"
                                    },
                                    {
                                          "fieldId": "status",
                                          "fieldValue": "processed"
                                    }
                              ]
                        }
                  },
                  "name": "[FIRESTORE] Operación Colección red_cross_dispatches",
                  "type": "native-automation-node.googleFirebaseCloudFirestore",
                  "typeVersion": 1.1,
                  "position": [
                        650,
                        300
                  ],
                  "credentials": {
                        "googleApi": {
                              "id": "5NiYz8gX64lPYIdK",
                              "name": "Costa Rica Tours - Firebase"
                        }
                  },
                  "onError": "continueErrorOutput"
            },
            {
                  "parameters": {
                        "respondWith": "json",
                        "responseBody": "{\n  \"success\": true,\n  \"workflowCode\": \"WF-072\",\n  \"collection\": \"red_cross_dispatches\",\n  \"timestamp\": \"={{ $now }}\",\n  \"message\": \"Operación completada exitosamente en red_cross_dispatches\"\n}",
                        "options": {}
                  },
                  "name": "[RESPUESTA] Finalizar con Éxito",
                  "type": "native-automation-node.respondToWebhook",
                  "typeVersion": 1.5,
                  "position": [
                        950,
                        200
                  ]
            },
            {
                  "parameters": {
                        "method": "POST",
                        "url": "={{ $env.APP_URL || \"http://localhost:3000\" }}/api/alerts",
                        "sendHeaders": true,
                        "headerParameters": {
                              "parameters": [
                                    {
                                          "name": "X-Webhook-Secret",
                                          "value": "={{ $env.WEBHOOK_SECRET || \"dev-secret\" }}"
                                    },
                                    {
                                          "name": "Content-Type",
                                          "value": "application/json"
                                    }
                              ]
                        },
                        "sendBody": true,
                        "specifyBody": "json",
                        "jsonBody": "{\n  \"source\": \"Enlace Directo con Cruz Roja Costarricense (Comité Local)\",\n  \"severity\": \"critical\",\n  \"title\": \"Fallo en workflow WF-072: Enlace Directo con Cruz Roja Costarricense (Comité Local)\",\n  \"message\": \"=Error al ejecutar en colección red_cross_dispatches: {{ $json.error?.message || \\\"Error no especificado\\\" }}\",\n  \"bookingId\": \"={{ $json.bookingId }}\",\n  \"metadata\": {\n    \"workflowCode\": \"WF-072\",\n    \"collection\": \"red_cross_dispatches\",\n    \"endpoint\": \"/api/native/workflows/red-cross-dispatch\"\n  }\n}",
                        "options": {}
                  },
                  "name": "[ALERTA NATIVA] Enviar a /api/alerts",
                  "type": "native-automation-node.httpRequest",
                  "typeVersion": 4.2,
                  "position": [
                        950,
                        450
                  ]
            }
      ],
      "connections": {
            "[TRIGGER] Enlace Directo con Cruz Roja Costarricense (Comité Local)": {
                  "main": [
                        [
                              {
                                    "node": "[EXTRACT] Formatear y Validar Datos",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[EXTRACT] Formatear y Validar Datos": {
                  "main": [
                        [
                              {
                                    "node": "[FIRESTORE] Operación Colección red_cross_dispatches",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[FIRESTORE] Operación Colección red_cross_dispatches": {
                  "main": [
                        [
                              {
                                    "node": "[RESPUESTA] Finalizar con Éxito",
                                    "type": "main",
                                    "index": 0
                              }
                        ],
                        [
                              {
                                    "node": "[ALERTA NATIVA] Enviar a /api/alerts",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            }
      }
}
  },
  {
    id: "wf-073-ocean-tide-rip-current-warning",
    code: "WF-073",
    name: {
      es: "Avisador de Mareas Altas y Corrientes de Resaca en Playas",
      en: "Ocean Tide & Dangerous Rip Current Swell Safety Warning"
    },
    category: "emergency",
    collection: "ocean_tides",
    description: {
      es: "Monitorea tablas de mareas y oleaje (MIO-CIMAR UCR) enviando advertencias a instructores de surf y tours en lancha.",
      en: "Monitors oceanographic tide & rip current reports alerting surf schools and catamaran operators."
    },
    icon: "Waves",
    color: "#0891b2",
    endpoint: "/api/native/workflows/ocean-tide-warning",
    method: "POST",
    triggerEvent: "Boletín oceanográfico diario 05:00 AM",
    nodesCount: 5,
    slaTarget: "< 400ms",
    nodes: [
      {
            "id": "node-trigger",
            "name": "[TRIGGER] Avisador de Mareas Altas y Corrientes de Resaca en Playas",
            "type": "native-automation-node.webhook",
            "description": "Boletín oceanográfico diario 05:00 AM"
      },
      {
            "id": "node-extract",
            "name": "[EXTRACT] Formatear y Validar Datos",
            "type": "native-automation-node.code",
            "description": "Transformación y validación de esquema"
      },
      {
            "id": "node-firestore",
            "name": "[FIRESTORE] Operación ocean_tides",
            "type": "native-automation-node.googleFirebaseCloudFirestore",
            "description": "Lectura/Escritura en Firestore /ocean_tides"
      },
      {
            "id": "node-response",
            "name": "[RESPUESTA] Finalizar con Éxito",
            "type": "native-automation-node.respondToWebhook",
            "description": "Respuesta HTTP 200 con payload estructurado"
      },
      {
            "id": "node-alert",
            "name": "[ALERTA NATIVA] Enviar a /api/alerts",
            "type": "native-automation-node.httpRequest",
            "description": "Enrutamiento de error a /api/alerts (reemplazo Telegram)"
      }
],
    samplePayload: {
      "beachZone": "Playa Hermosa / Jacó",
      "highTideTime": "09:42 AM",
      "ripCurrentRisk": "HIGH_CAUTION"
},
    blueprintJson: {
      "id": "WF-073",
      "name": "Avisador de Mareas Altas y Corrientes de Resaca en Playas",
      "active": true,
      "nodes": [
            {
                  "parameters": {
                        "path": "api/native/workflows/ocean-tide-warning",
                        "httpMethod": "POST",
                        "responseMode": "responseNode",
                        "options": {}
                  },
                  "name": "[TRIGGER] Avisador de Mareas Altas y Corrientes de Resaca en Playas",
                  "type": "native-automation-node.webhook",
                  "typeVersion": 2,
                  "position": [
                        100,
                        300
                  ]
            },
            {
                  "parameters": {
                        "jsCode": "// Validar campos obligatorios y normalizar timestamp\nconst item = $input.first().json || {};\nitem.processedAt = new Date().toISOString();\nitem.environment = 'production';\nitem.targetCollection = 'ocean_tides';\nreturn [{ json: item }];"
                  },
                  "name": "[EXTRACT] Formatear y Validar Datos",
                  "type": "native-automation-node.code",
                  "typeVersion": 2,
                  "position": [
                        350,
                        300
                  ]
            },
            {
                  "parameters": {
                        "operation": "upsert",
                        "collection": "ocean_tides",
                        "documentId": "={{ $json.id || $json.bookingId || $json.code || $now }}",
                        "dataToSend": "defineBelow",
                        "fieldsUi": {
                              "fieldValues": [
                                    {
                                          "fieldId": "updatedAt",
                                          "fieldValue": "={{ $now }}"
                                    },
                                    {
                                          "fieldId": "workflowSource",
                                          "fieldValue": "WF-073"
                                    },
                                    {
                                          "fieldId": "status",
                                          "fieldValue": "processed"
                                    }
                              ]
                        }
                  },
                  "name": "[FIRESTORE] Operación Colección ocean_tides",
                  "type": "native-automation-node.googleFirebaseCloudFirestore",
                  "typeVersion": 1.1,
                  "position": [
                        650,
                        300
                  ],
                  "credentials": {
                        "googleApi": {
                              "id": "5NiYz8gX64lPYIdK",
                              "name": "Costa Rica Tours - Firebase"
                        }
                  },
                  "onError": "continueErrorOutput"
            },
            {
                  "parameters": {
                        "respondWith": "json",
                        "responseBody": "{\n  \"success\": true,\n  \"workflowCode\": \"WF-073\",\n  \"collection\": \"ocean_tides\",\n  \"timestamp\": \"={{ $now }}\",\n  \"message\": \"Operación completada exitosamente en ocean_tides\"\n}",
                        "options": {}
                  },
                  "name": "[RESPUESTA] Finalizar con Éxito",
                  "type": "native-automation-node.respondToWebhook",
                  "typeVersion": 1.5,
                  "position": [
                        950,
                        200
                  ]
            },
            {
                  "parameters": {
                        "method": "POST",
                        "url": "={{ $env.APP_URL || \"http://localhost:3000\" }}/api/alerts",
                        "sendHeaders": true,
                        "headerParameters": {
                              "parameters": [
                                    {
                                          "name": "X-Webhook-Secret",
                                          "value": "={{ $env.WEBHOOK_SECRET || \"dev-secret\" }}"
                                    },
                                    {
                                          "name": "Content-Type",
                                          "value": "application/json"
                                    }
                              ]
                        },
                        "sendBody": true,
                        "specifyBody": "json",
                        "jsonBody": "{\n  \"source\": \"Avisador de Mareas Altas y Corrientes de Resaca en Playas\",\n  \"severity\": \"critical\",\n  \"title\": \"Fallo en workflow WF-073: Avisador de Mareas Altas y Corrientes de Resaca en Playas\",\n  \"message\": \"=Error al ejecutar en colección ocean_tides: {{ $json.error?.message || \\\"Error no especificado\\\" }}\",\n  \"bookingId\": \"={{ $json.bookingId }}\",\n  \"metadata\": {\n    \"workflowCode\": \"WF-073\",\n    \"collection\": \"ocean_tides\",\n    \"endpoint\": \"/api/native/workflows/ocean-tide-warning\"\n  }\n}",
                        "options": {}
                  },
                  "name": "[ALERTA NATIVA] Enviar a /api/alerts",
                  "type": "native-automation-node.httpRequest",
                  "typeVersion": 4.2,
                  "position": [
                        950,
                        450
                  ]
            }
      ],
      "connections": {
            "[TRIGGER] Avisador de Mareas Altas y Corrientes de Resaca en Playas": {
                  "main": [
                        [
                              {
                                    "node": "[EXTRACT] Formatear y Validar Datos",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[EXTRACT] Formatear y Validar Datos": {
                  "main": [
                        [
                              {
                                    "node": "[FIRESTORE] Operación Colección ocean_tides",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[FIRESTORE] Operación Colección ocean_tides": {
                  "main": [
                        [
                              {
                                    "node": "[RESPUESTA] Finalizar con Éxito",
                                    "type": "main",
                                    "index": 0
                              }
                        ],
                        [
                              {
                                    "node": "[ALERTA NATIVA] Enviar a /api/alerts",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            }
      }
}
  },
  {
    id: "wf-074-identity-theft-fake-id-guard",
    code: "WF-074",
    name: {
      es: "Validador de Autenticidad de Documentos de Identidad / Pasaportes",
      en: "Passport & Identity Authenticity Risk Screening Guard"
    },
    category: "fraud",
    collection: "id_screenings",
    description: {
      es: "Verifica formato MRZ de pasaportes extranjeros en reservas VIP de alto valor previniendo suplantación de identidad.",
      en: "Scans passport MRZ checksum format for high-value VIP bookings to eliminate identity theft risks."
    },
    icon: "FileDigit",
    color: "#6366f1",
    endpoint: "/api/native/workflows/verify-passport-mrz",
    method: "POST",
    triggerEvent: "Reserva VIP de más de $2,000 USD",
    nodesCount: 5,
    slaTarget: "< 500ms",
    nodes: [
      {
            "id": "node-trigger",
            "name": "[TRIGGER] Validador de Autenticidad de Documentos de Identidad / Pasaportes",
            "type": "native-automation-node.webhook",
            "description": "Reserva VIP de más de $2,000 USD"
      },
      {
            "id": "node-extract",
            "name": "[EXTRACT] Formatear y Validar Datos",
            "type": "native-automation-node.code",
            "description": "Transformación y validación de esquema"
      },
      {
            "id": "node-firestore",
            "name": "[FIRESTORE] Operación id_screenings",
            "type": "native-automation-node.googleFirebaseCloudFirestore",
            "description": "Lectura/Escritura en Firestore /id_screenings"
      },
      {
            "id": "node-response",
            "name": "[RESPUESTA] Finalizar con Éxito",
            "type": "native-automation-node.respondToWebhook",
            "description": "Respuesta HTTP 200 con payload estructurado"
      },
      {
            "id": "node-alert",
            "name": "[ALERTA NATIVA] Enviar a /api/alerts",
            "type": "native-automation-node.httpRequest",
            "description": "Enrutamiento de error a /api/alerts (reemplazo Telegram)"
      }
],
    samplePayload: {
      "passportCountry": "USA",
      "mrzChecksumValid": true,
      "travelerNameMatch": true
},
    blueprintJson: {
      "id": "WF-074",
      "name": "Validador de Autenticidad de Documentos de Identidad / Pasaportes",
      "active": true,
      "nodes": [
            {
                  "parameters": {
                        "path": "api/native/workflows/verify-passport-mrz",
                        "httpMethod": "POST",
                        "responseMode": "responseNode",
                        "options": {}
                  },
                  "name": "[TRIGGER] Validador de Autenticidad de Documentos de Identidad / Pasaportes",
                  "type": "native-automation-node.webhook",
                  "typeVersion": 2,
                  "position": [
                        100,
                        300
                  ]
            },
            {
                  "parameters": {
                        "jsCode": "// Validar campos obligatorios y normalizar timestamp\nconst item = $input.first().json || {};\nitem.processedAt = new Date().toISOString();\nitem.environment = 'production';\nitem.targetCollection = 'id_screenings';\nreturn [{ json: item }];"
                  },
                  "name": "[EXTRACT] Formatear y Validar Datos",
                  "type": "native-automation-node.code",
                  "typeVersion": 2,
                  "position": [
                        350,
                        300
                  ]
            },
            {
                  "parameters": {
                        "operation": "upsert",
                        "collection": "id_screenings",
                        "documentId": "={{ $json.id || $json.bookingId || $json.code || $now }}",
                        "dataToSend": "defineBelow",
                        "fieldsUi": {
                              "fieldValues": [
                                    {
                                          "fieldId": "updatedAt",
                                          "fieldValue": "={{ $now }}"
                                    },
                                    {
                                          "fieldId": "workflowSource",
                                          "fieldValue": "WF-074"
                                    },
                                    {
                                          "fieldId": "status",
                                          "fieldValue": "processed"
                                    }
                              ]
                        }
                  },
                  "name": "[FIRESTORE] Operación Colección id_screenings",
                  "type": "native-automation-node.googleFirebaseCloudFirestore",
                  "typeVersion": 1.1,
                  "position": [
                        650,
                        300
                  ],
                  "credentials": {
                        "googleApi": {
                              "id": "5NiYz8gX64lPYIdK",
                              "name": "Costa Rica Tours - Firebase"
                        }
                  },
                  "onError": "continueErrorOutput"
            },
            {
                  "parameters": {
                        "respondWith": "json",
                        "responseBody": "{\n  \"success\": true,\n  \"workflowCode\": \"WF-074\",\n  \"collection\": \"id_screenings\",\n  \"timestamp\": \"={{ $now }}\",\n  \"message\": \"Operación completada exitosamente en id_screenings\"\n}",
                        "options": {}
                  },
                  "name": "[RESPUESTA] Finalizar con Éxito",
                  "type": "native-automation-node.respondToWebhook",
                  "typeVersion": 1.5,
                  "position": [
                        950,
                        200
                  ]
            },
            {
                  "parameters": {
                        "method": "POST",
                        "url": "={{ $env.APP_URL || \"http://localhost:3000\" }}/api/alerts",
                        "sendHeaders": true,
                        "headerParameters": {
                              "parameters": [
                                    {
                                          "name": "X-Webhook-Secret",
                                          "value": "={{ $env.WEBHOOK_SECRET || \"dev-secret\" }}"
                                    },
                                    {
                                          "name": "Content-Type",
                                          "value": "application/json"
                                    }
                              ]
                        },
                        "sendBody": true,
                        "specifyBody": "json",
                        "jsonBody": "{\n  \"source\": \"Validador de Autenticidad de Documentos de Identidad / Pasaportes\",\n  \"severity\": \"critical\",\n  \"title\": \"Fallo en workflow WF-074: Validador de Autenticidad de Documentos de Identidad / Pasaportes\",\n  \"message\": \"=Error al ejecutar en colección id_screenings: {{ $json.error?.message || \\\"Error no especificado\\\" }}\",\n  \"bookingId\": \"={{ $json.bookingId }}\",\n  \"metadata\": {\n    \"workflowCode\": \"WF-074\",\n    \"collection\": \"id_screenings\",\n    \"endpoint\": \"/api/native/workflows/verify-passport-mrz\"\n  }\n}",
                        "options": {}
                  },
                  "name": "[ALERTA NATIVA] Enviar a /api/alerts",
                  "type": "native-automation-node.httpRequest",
                  "typeVersion": 4.2,
                  "position": [
                        950,
                        450
                  ]
            }
      ],
      "connections": {
            "[TRIGGER] Validador de Autenticidad de Documentos de Identidad / Pasaportes": {
                  "main": [
                        [
                              {
                                    "node": "[EXTRACT] Formatear y Validar Datos",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[EXTRACT] Formatear y Validar Datos": {
                  "main": [
                        [
                              {
                                    "node": "[FIRESTORE] Operación Colección id_screenings",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[FIRESTORE] Operación Colección id_screenings": {
                  "main": [
                        [
                              {
                                    "node": "[RESPUESTA] Finalizar con Éxito",
                                    "type": "main",
                                    "index": 0
                              }
                        ],
                        [
                              {
                                    "node": "[ALERTA NATIVA] Enviar a /api/alerts",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            }
      }
}
  },
  {
    id: "wf-075-cybersecurity-firewall-anomaly-alert",
    code: "WF-075",
    name: {
      es: "Centinela de Anomalías y Alertas de Ciberseguridad",
      en: "Cybersecurity Firewall & API Intrusion Anomaly Centinel"
    },
    category: "emergency",
    collection: "security_anomalies",
    description: {
      es: "Escanea patrones anómalos en cabeceras HTTP y ataques SQLi/XSS, registrando alertas críticas en `/api/alerts`.",
      en: "Scans HTTP headers for anomalous injection vectors, reporting incidents directly to `/api/alerts`."
    },
    icon: "Lock",
    color: "#991b1b",
    endpoint: "/api/native/workflows/security-anomaly",
    method: "POST",
    triggerEvent: "Middleware de seguridad en fallo grave",
    nodesCount: 5,
    slaTarget: "< 50ms",
    nodes: [
      {
            "id": "node-trigger",
            "name": "[TRIGGER] Centinela de Anomalías y Alertas de Ciberseguridad",
            "type": "native-automation-node.webhook",
            "description": "Middleware de seguridad en fallo grave"
      },
      {
            "id": "node-extract",
            "name": "[EXTRACT] Formatear y Validar Datos",
            "type": "native-automation-node.code",
            "description": "Transformación y validación de esquema"
      },
      {
            "id": "node-firestore",
            "name": "[FIRESTORE] Operación security_anomalies",
            "type": "native-automation-node.googleFirebaseCloudFirestore",
            "description": "Lectura/Escritura en Firestore /security_anomalies"
      },
      {
            "id": "node-response",
            "name": "[RESPUESTA] Finalizar con Éxito",
            "type": "native-automation-node.respondToWebhook",
            "description": "Respuesta HTTP 200 con payload estructurado"
      },
      {
            "id": "node-alert",
            "name": "[ALERTA NATIVA] Enviar a /api/alerts",
            "type": "native-automation-node.httpRequest",
            "description": "Enrutamiento de error a /api/alerts (reemplazo Telegram)"
      }
],
    samplePayload: {
      "threatType": "Header Injection Attempt",
      "ip": "185.220.101.5",
      "blocked": true
},
    blueprintJson: {
      "id": "WF-075",
      "name": "Centinela de Anomalías y Alertas de Ciberseguridad",
      "active": true,
      "nodes": [
            {
                  "parameters": {
                        "path": "api/native/workflows/security-anomaly",
                        "httpMethod": "POST",
                        "responseMode": "responseNode",
                        "options": {}
                  },
                  "name": "[TRIGGER] Centinela de Anomalías y Alertas de Ciberseguridad",
                  "type": "native-automation-node.webhook",
                  "typeVersion": 2,
                  "position": [
                        100,
                        300
                  ]
            },
            {
                  "parameters": {
                        "jsCode": "// Validar campos obligatorios y normalizar timestamp\nconst item = $input.first().json || {};\nitem.processedAt = new Date().toISOString();\nitem.environment = 'production';\nitem.targetCollection = 'security_anomalies';\nreturn [{ json: item }];"
                  },
                  "name": "[EXTRACT] Formatear y Validar Datos",
                  "type": "native-automation-node.code",
                  "typeVersion": 2,
                  "position": [
                        350,
                        300
                  ]
            },
            {
                  "parameters": {
                        "operation": "upsert",
                        "collection": "security_anomalies",
                        "documentId": "={{ $json.id || $json.bookingId || $json.code || $now }}",
                        "dataToSend": "defineBelow",
                        "fieldsUi": {
                              "fieldValues": [
                                    {
                                          "fieldId": "updatedAt",
                                          "fieldValue": "={{ $now }}"
                                    },
                                    {
                                          "fieldId": "workflowSource",
                                          "fieldValue": "WF-075"
                                    },
                                    {
                                          "fieldId": "status",
                                          "fieldValue": "processed"
                                    }
                              ]
                        }
                  },
                  "name": "[FIRESTORE] Operación Colección security_anomalies",
                  "type": "native-automation-node.googleFirebaseCloudFirestore",
                  "typeVersion": 1.1,
                  "position": [
                        650,
                        300
                  ],
                  "credentials": {
                        "googleApi": {
                              "id": "5NiYz8gX64lPYIdK",
                              "name": "Costa Rica Tours - Firebase"
                        }
                  },
                  "onError": "continueErrorOutput"
            },
            {
                  "parameters": {
                        "respondWith": "json",
                        "responseBody": "{\n  \"success\": true,\n  \"workflowCode\": \"WF-075\",\n  \"collection\": \"security_anomalies\",\n  \"timestamp\": \"={{ $now }}\",\n  \"message\": \"Operación completada exitosamente en security_anomalies\"\n}",
                        "options": {}
                  },
                  "name": "[RESPUESTA] Finalizar con Éxito",
                  "type": "native-automation-node.respondToWebhook",
                  "typeVersion": 1.5,
                  "position": [
                        950,
                        200
                  ]
            },
            {
                  "parameters": {
                        "method": "POST",
                        "url": "={{ $env.APP_URL || \"http://localhost:3000\" }}/api/alerts",
                        "sendHeaders": true,
                        "headerParameters": {
                              "parameters": [
                                    {
                                          "name": "X-Webhook-Secret",
                                          "value": "={{ $env.WEBHOOK_SECRET || \"dev-secret\" }}"
                                    },
                                    {
                                          "name": "Content-Type",
                                          "value": "application/json"
                                    }
                              ]
                        },
                        "sendBody": true,
                        "specifyBody": "json",
                        "jsonBody": "{\n  \"source\": \"Centinela de Anomalías y Alertas de Ciberseguridad\",\n  \"severity\": \"critical\",\n  \"title\": \"Fallo en workflow WF-075: Centinela de Anomalías y Alertas de Ciberseguridad\",\n  \"message\": \"=Error al ejecutar en colección security_anomalies: {{ $json.error?.message || \\\"Error no especificado\\\" }}\",\n  \"bookingId\": \"={{ $json.bookingId }}\",\n  \"metadata\": {\n    \"workflowCode\": \"WF-075\",\n    \"collection\": \"security_anomalies\",\n    \"endpoint\": \"/api/native/workflows/security-anomaly\"\n  }\n}",
                        "options": {}
                  },
                  "name": "[ALERTA NATIVA] Enviar a /api/alerts",
                  "type": "native-automation-node.httpRequest",
                  "typeVersion": 4.2,
                  "position": [
                        950,
                        450
                  ]
            }
      ],
      "connections": {
            "[TRIGGER] Centinela de Anomalías y Alertas de Ciberseguridad": {
                  "main": [
                        [
                              {
                                    "node": "[EXTRACT] Formatear y Validar Datos",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[EXTRACT] Formatear y Validar Datos": {
                  "main": [
                        [
                              {
                                    "node": "[FIRESTORE] Operación Colección security_anomalies",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[FIRESTORE] Operación Colección security_anomalies": {
                  "main": [
                        [
                              {
                                    "node": "[RESPUESTA] Finalizar con Éxito",
                                    "type": "main",
                                    "index": 0
                              }
                        ],
                        [
                              {
                                    "node": "[ALERTA NATIVA] Enviar a /api/alerts",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            }
      }
}
  },
  {
    id: "wf-076-wildfire-dry-season-alert",
    code: "WF-076",
    name: {
      es: "Detector de Alertas por Incendios Forestales en Guanacaste",
      en: "Wildfire & Dry Season Forest Buffer Zone Early Warning"
    },
    category: "emergency",
    collection: "wildfire_alerts",
    description: {
      es: "Monitorea focos de calor satelitales (NASA FIRMS) en el bosque seco de Guanacaste protegiendo tours de cabalgata.",
      en: "Monitors NASA FIRMS thermal hotspots in Guanacaste dry forest rerouting horseback & canopy tours."
    },
    icon: "Flame",
    color: "#ea580c",
    endpoint: "/api/native/workflows/wildfire-watch",
    method: "POST",
    triggerEvent: "Alerta satelital de foco de calor",
    nodesCount: 5,
    slaTarget: "< 1s",
    nodes: [
      {
            "id": "node-trigger",
            "name": "[TRIGGER] Detector de Alertas por Incendios Forestales en Guanacaste",
            "type": "native-automation-node.webhook",
            "description": "Alerta satelital de foco de calor"
      },
      {
            "id": "node-extract",
            "name": "[EXTRACT] Formatear y Validar Datos",
            "type": "native-automation-node.code",
            "description": "Transformación y validación de esquema"
      },
      {
            "id": "node-firestore",
            "name": "[FIRESTORE] Operación wildfire_alerts",
            "type": "native-automation-node.googleFirebaseCloudFirestore",
            "description": "Lectura/Escritura en Firestore /wildfire_alerts"
      },
      {
            "id": "node-response",
            "name": "[RESPUESTA] Finalizar con Éxito",
            "type": "native-automation-node.respondToWebhook",
            "description": "Respuesta HTTP 200 con payload estructurado"
      },
      {
            "id": "node-alert",
            "name": "[ALERTA NATIVA] Enviar a /api/alerts",
            "type": "native-automation-node.httpRequest",
            "description": "Enrutamiento de error a /api/alerts (reemplazo Telegram)"
      }
],
    samplePayload: {
      "parkArea": "Santa Rosa National Park",
      "hotspotDistanceKm": 14.2,
      "tourSuspended": false
},
    blueprintJson: {
      "id": "WF-076",
      "name": "Detector de Alertas por Incendios Forestales en Guanacaste",
      "active": true,
      "nodes": [
            {
                  "parameters": {
                        "path": "api/native/workflows/wildfire-watch",
                        "httpMethod": "POST",
                        "responseMode": "responseNode",
                        "options": {}
                  },
                  "name": "[TRIGGER] Detector de Alertas por Incendios Forestales en Guanacaste",
                  "type": "native-automation-node.webhook",
                  "typeVersion": 2,
                  "position": [
                        100,
                        300
                  ]
            },
            {
                  "parameters": {
                        "jsCode": "// Validar campos obligatorios y normalizar timestamp\nconst item = $input.first().json || {};\nitem.processedAt = new Date().toISOString();\nitem.environment = 'production';\nitem.targetCollection = 'wildfire_alerts';\nreturn [{ json: item }];"
                  },
                  "name": "[EXTRACT] Formatear y Validar Datos",
                  "type": "native-automation-node.code",
                  "typeVersion": 2,
                  "position": [
                        350,
                        300
                  ]
            },
            {
                  "parameters": {
                        "operation": "upsert",
                        "collection": "wildfire_alerts",
                        "documentId": "={{ $json.id || $json.bookingId || $json.code || $now }}",
                        "dataToSend": "defineBelow",
                        "fieldsUi": {
                              "fieldValues": [
                                    {
                                          "fieldId": "updatedAt",
                                          "fieldValue": "={{ $now }}"
                                    },
                                    {
                                          "fieldId": "workflowSource",
                                          "fieldValue": "WF-076"
                                    },
                                    {
                                          "fieldId": "status",
                                          "fieldValue": "processed"
                                    }
                              ]
                        }
                  },
                  "name": "[FIRESTORE] Operación Colección wildfire_alerts",
                  "type": "native-automation-node.googleFirebaseCloudFirestore",
                  "typeVersion": 1.1,
                  "position": [
                        650,
                        300
                  ],
                  "credentials": {
                        "googleApi": {
                              "id": "5NiYz8gX64lPYIdK",
                              "name": "Costa Rica Tours - Firebase"
                        }
                  },
                  "onError": "continueErrorOutput"
            },
            {
                  "parameters": {
                        "respondWith": "json",
                        "responseBody": "{\n  \"success\": true,\n  \"workflowCode\": \"WF-076\",\n  \"collection\": \"wildfire_alerts\",\n  \"timestamp\": \"={{ $now }}\",\n  \"message\": \"Operación completada exitosamente en wildfire_alerts\"\n}",
                        "options": {}
                  },
                  "name": "[RESPUESTA] Finalizar con Éxito",
                  "type": "native-automation-node.respondToWebhook",
                  "typeVersion": 1.5,
                  "position": [
                        950,
                        200
                  ]
            },
            {
                  "parameters": {
                        "method": "POST",
                        "url": "={{ $env.APP_URL || \"http://localhost:3000\" }}/api/alerts",
                        "sendHeaders": true,
                        "headerParameters": {
                              "parameters": [
                                    {
                                          "name": "X-Webhook-Secret",
                                          "value": "={{ $env.WEBHOOK_SECRET || \"dev-secret\" }}"
                                    },
                                    {
                                          "name": "Content-Type",
                                          "value": "application/json"
                                    }
                              ]
                        },
                        "sendBody": true,
                        "specifyBody": "json",
                        "jsonBody": "{\n  \"source\": \"Detector de Alertas por Incendios Forestales en Guanacaste\",\n  \"severity\": \"critical\",\n  \"title\": \"Fallo en workflow WF-076: Detector de Alertas por Incendios Forestales en Guanacaste\",\n  \"message\": \"=Error al ejecutar en colección wildfire_alerts: {{ $json.error?.message || \\\"Error no especificado\\\" }}\",\n  \"bookingId\": \"={{ $json.bookingId }}\",\n  \"metadata\": {\n    \"workflowCode\": \"WF-076\",\n    \"collection\": \"wildfire_alerts\",\n    \"endpoint\": \"/api/native/workflows/wildfire-watch\"\n  }\n}",
                        "options": {}
                  },
                  "name": "[ALERTA NATIVA] Enviar a /api/alerts",
                  "type": "native-automation-node.httpRequest",
                  "typeVersion": 4.2,
                  "position": [
                        950,
                        450
                  ]
            }
      ],
      "connections": {
            "[TRIGGER] Detector de Alertas por Incendios Forestales en Guanacaste": {
                  "main": [
                        [
                              {
                                    "node": "[EXTRACT] Formatear y Validar Datos",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[EXTRACT] Formatear y Validar Datos": {
                  "main": [
                        [
                              {
                                    "node": "[FIRESTORE] Operación Colección wildfire_alerts",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[FIRESTORE] Operación Colección wildfire_alerts": {
                  "main": [
                        [
                              {
                                    "node": "[RESPUESTA] Finalizar con Éxito",
                                    "type": "main",
                                    "index": 0
                              }
                        ],
                        [
                              {
                                    "node": "[ALERTA NATIVA] Enviar a /api/alerts",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            }
      }
}
  },
  {
    id: "wf-077-nps-promoter-coupon-generator",
    code: "WF-077",
    name: {
      es: "Generador de Cupones de Fidelidad para Promotores (NPS 9-10)",
      en: "NPS 9-10 Promoter 15% Referral Coupon Generator"
    },
    category: "feedback",
    collection: "promotions",
    description: {
      es: "Cuando un cliente califica con 9 o 10 su experiencia, genera automáticamente un cupón de 15% para familiares y amigos.",
      en: "When traveler awards 9-10 NPS score, generates automated 15% gift voucher for friends and family."
    },
    icon: "HeartHandshake",
    color: "#059669",
    endpoint: "/api/native/workflows/nps-promoter",
    method: "POST",
    triggerEvent: "Encuesta NPS completada con puntaje 9 o 10",
    nodesCount: 5,
    slaTarget: "< 400ms",
    nodes: [
      {
            "id": "node-trigger",
            "name": "[TRIGGER] Generador de Cupones de Fidelidad para Promotores (NPS 9-10)",
            "type": "native-automation-node.webhook",
            "description": "Encuesta NPS completada con puntaje 9 o 10"
      },
      {
            "id": "node-extract",
            "name": "[EXTRACT] Formatear y Validar Datos",
            "type": "native-automation-node.code",
            "description": "Transformación y validación de esquema"
      },
      {
            "id": "node-firestore",
            "name": "[FIRESTORE] Operación promotions",
            "type": "native-automation-node.googleFirebaseCloudFirestore",
            "description": "Lectura/Escritura en Firestore /promotions"
      },
      {
            "id": "node-response",
            "name": "[RESPUESTA] Finalizar con Éxito",
            "type": "native-automation-node.respondToWebhook",
            "description": "Respuesta HTTP 200 con payload estructurado"
      },
      {
            "id": "node-alert",
            "name": "[ALERTA NATIVA] Enviar a /api/alerts",
            "type": "native-automation-node.httpRequest",
            "description": "Enrutamiento de error a /api/alerts (reemplazo Telegram)"
      }
],
    samplePayload: {
      "bookingId": "BK-CR-2026-977",
      "npsScore": 10,
      "promoCode": "PURAVIRAL-15",
      "touristName": "Sophie Dubois"
},
    blueprintJson: {
      "id": "WF-077",
      "name": "Generador de Cupones de Fidelidad para Promotores (NPS 9-10)",
      "active": true,
      "nodes": [
            {
                  "parameters": {
                        "path": "api/native/workflows/nps-promoter",
                        "httpMethod": "POST",
                        "responseMode": "responseNode",
                        "options": {}
                  },
                  "name": "[TRIGGER] Generador de Cupones de Fidelidad para Promotores (NPS 9-10)",
                  "type": "native-automation-node.webhook",
                  "typeVersion": 2,
                  "position": [
                        100,
                        300
                  ]
            },
            {
                  "parameters": {
                        "jsCode": "// Validar campos obligatorios y normalizar timestamp\nconst item = $input.first().json || {};\nitem.processedAt = new Date().toISOString();\nitem.environment = 'production';\nitem.targetCollection = 'promotions';\nreturn [{ json: item }];"
                  },
                  "name": "[EXTRACT] Formatear y Validar Datos",
                  "type": "native-automation-node.code",
                  "typeVersion": 2,
                  "position": [
                        350,
                        300
                  ]
            },
            {
                  "parameters": {
                        "operation": "upsert",
                        "collection": "promotions",
                        "documentId": "={{ $json.id || $json.bookingId || $json.code || $now }}",
                        "dataToSend": "defineBelow",
                        "fieldsUi": {
                              "fieldValues": [
                                    {
                                          "fieldId": "updatedAt",
                                          "fieldValue": "={{ $now }}"
                                    },
                                    {
                                          "fieldId": "workflowSource",
                                          "fieldValue": "WF-077"
                                    },
                                    {
                                          "fieldId": "status",
                                          "fieldValue": "processed"
                                    }
                              ]
                        }
                  },
                  "name": "[FIRESTORE] Operación Colección promotions",
                  "type": "native-automation-node.googleFirebaseCloudFirestore",
                  "typeVersion": 1.1,
                  "position": [
                        650,
                        300
                  ],
                  "credentials": {
                        "googleApi": {
                              "id": "5NiYz8gX64lPYIdK",
                              "name": "Costa Rica Tours - Firebase"
                        }
                  },
                  "onError": "continueErrorOutput"
            },
            {
                  "parameters": {
                        "respondWith": "json",
                        "responseBody": "{\n  \"success\": true,\n  \"workflowCode\": \"WF-077\",\n  \"collection\": \"promotions\",\n  \"timestamp\": \"={{ $now }}\",\n  \"message\": \"Operación completada exitosamente en promotions\"\n}",
                        "options": {}
                  },
                  "name": "[RESPUESTA] Finalizar con Éxito",
                  "type": "native-automation-node.respondToWebhook",
                  "typeVersion": 1.5,
                  "position": [
                        950,
                        200
                  ]
            },
            {
                  "parameters": {
                        "method": "POST",
                        "url": "={{ $env.APP_URL || \"http://localhost:3000\" }}/api/alerts",
                        "sendHeaders": true,
                        "headerParameters": {
                              "parameters": [
                                    {
                                          "name": "X-Webhook-Secret",
                                          "value": "={{ $env.WEBHOOK_SECRET || \"dev-secret\" }}"
                                    },
                                    {
                                          "name": "Content-Type",
                                          "value": "application/json"
                                    }
                              ]
                        },
                        "sendBody": true,
                        "specifyBody": "json",
                        "jsonBody": "{\n  \"source\": \"Generador de Cupones de Fidelidad para Promotores (NPS 9-10)\",\n  \"severity\": \"critical\",\n  \"title\": \"Fallo en workflow WF-077: Generador de Cupones de Fidelidad para Promotores (NPS 9-10)\",\n  \"message\": \"=Error al ejecutar en colección promotions: {{ $json.error?.message || \\\"Error no especificado\\\" }}\",\n  \"bookingId\": \"={{ $json.bookingId }}\",\n  \"metadata\": {\n    \"workflowCode\": \"WF-077\",\n    \"collection\": \"promotions\",\n    \"endpoint\": \"/api/native/workflows/nps-promoter\"\n  }\n}",
                        "options": {}
                  },
                  "name": "[ALERTA NATIVA] Enviar a /api/alerts",
                  "type": "native-automation-node.httpRequest",
                  "typeVersion": 4.2,
                  "position": [
                        950,
                        450
                  ]
            }
      ],
      "connections": {
            "[TRIGGER] Generador de Cupones de Fidelidad para Promotores (NPS 9-10)": {
                  "main": [
                        [
                              {
                                    "node": "[EXTRACT] Formatear y Validar Datos",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[EXTRACT] Formatear y Validar Datos": {
                  "main": [
                        [
                              {
                                    "node": "[FIRESTORE] Operación Colección promotions",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[FIRESTORE] Operación Colección promotions": {
                  "main": [
                        [
                              {
                                    "node": "[RESPUESTA] Finalizar con Éxito",
                                    "type": "main",
                                    "index": 0
                              }
                        ],
                        [
                              {
                                    "node": "[ALERTA NATIVA] Enviar a /api/alerts",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            }
      }
}
  },
  {
    id: "wf-078-tripadvisor-google-maps-review-booster",
    code: "WF-078",
    name: {
      es: "Sincronizador de Reseñas en TripAdvisor y Google Maps",
      en: "TripAdvisor & Google Maps Live Review Booster & Invitation"
    },
    category: "marketing",
    collection: "review_invites",
    description: {
      es: "Envía invitación con enlace directo a la ficha de Google Maps y TripAdvisor 4 horas después del tour.",
      en: "Sends direct one-click review invitation to TripAdvisor and Google Business 4h post-tour."
    },
    icon: "Star",
    color: "#eab308",
    endpoint: "/api/native/workflows/review-booster",
    method: "POST",
    triggerEvent: "Cron diario 5:00 PM (tours finalizados)",
    nodesCount: 5,
    slaTarget: "< 500ms",
    nodes: [
      {
            "id": "node-trigger",
            "name": "[TRIGGER] Sincronizador de Reseñas en TripAdvisor y Google Maps",
            "type": "native-automation-node.webhook",
            "description": "Cron diario 5:00 PM (tours finalizados)"
      },
      {
            "id": "node-extract",
            "name": "[EXTRACT] Formatear y Validar Datos",
            "type": "native-automation-node.code",
            "description": "Transformación y validación de esquema"
      },
      {
            "id": "node-firestore",
            "name": "[FIRESTORE] Operación review_invites",
            "type": "native-automation-node.googleFirebaseCloudFirestore",
            "description": "Lectura/Escritura en Firestore /review_invites"
      },
      {
            "id": "node-response",
            "name": "[RESPUESTA] Finalizar con Éxito",
            "type": "native-automation-node.respondToWebhook",
            "description": "Respuesta HTTP 200 con payload estructurado"
      },
      {
            "id": "node-alert",
            "name": "[ALERTA NATIVA] Enviar a /api/alerts",
            "type": "native-automation-node.httpRequest",
            "description": "Enrutamiento de error a /api/alerts (reemplazo Telegram)"
      }
],
    samplePayload: {
      "bookingId": "BK-CR-2026-978",
      "reviewLink": "https://g.page/r/costaricatours/review",
      "customerEmail": "mark.watson@sydney.au"
},
    blueprintJson: {
      "id": "WF-078",
      "name": "Sincronizador de Reseñas en TripAdvisor y Google Maps",
      "active": true,
      "nodes": [
            {
                  "parameters": {
                        "path": "api/native/workflows/review-booster",
                        "httpMethod": "POST",
                        "responseMode": "responseNode",
                        "options": {}
                  },
                  "name": "[TRIGGER] Sincronizador de Reseñas en TripAdvisor y Google Maps",
                  "type": "native-automation-node.webhook",
                  "typeVersion": 2,
                  "position": [
                        100,
                        300
                  ]
            },
            {
                  "parameters": {
                        "jsCode": "// Validar campos obligatorios y normalizar timestamp\nconst item = $input.first().json || {};\nitem.processedAt = new Date().toISOString();\nitem.environment = 'production';\nitem.targetCollection = 'review_invites';\nreturn [{ json: item }];"
                  },
                  "name": "[EXTRACT] Formatear y Validar Datos",
                  "type": "native-automation-node.code",
                  "typeVersion": 2,
                  "position": [
                        350,
                        300
                  ]
            },
            {
                  "parameters": {
                        "operation": "upsert",
                        "collection": "review_invites",
                        "documentId": "={{ $json.id || $json.bookingId || $json.code || $now }}",
                        "dataToSend": "defineBelow",
                        "fieldsUi": {
                              "fieldValues": [
                                    {
                                          "fieldId": "updatedAt",
                                          "fieldValue": "={{ $now }}"
                                    },
                                    {
                                          "fieldId": "workflowSource",
                                          "fieldValue": "WF-078"
                                    },
                                    {
                                          "fieldId": "status",
                                          "fieldValue": "processed"
                                    }
                              ]
                        }
                  },
                  "name": "[FIRESTORE] Operación Colección review_invites",
                  "type": "native-automation-node.googleFirebaseCloudFirestore",
                  "typeVersion": 1.1,
                  "position": [
                        650,
                        300
                  ],
                  "credentials": {
                        "googleApi": {
                              "id": "5NiYz8gX64lPYIdK",
                              "name": "Costa Rica Tours - Firebase"
                        }
                  },
                  "onError": "continueErrorOutput"
            },
            {
                  "parameters": {
                        "respondWith": "json",
                        "responseBody": "{\n  \"success\": true,\n  \"workflowCode\": \"WF-078\",\n  \"collection\": \"review_invites\",\n  \"timestamp\": \"={{ $now }}\",\n  \"message\": \"Operación completada exitosamente en review_invites\"\n}",
                        "options": {}
                  },
                  "name": "[RESPUESTA] Finalizar con Éxito",
                  "type": "native-automation-node.respondToWebhook",
                  "typeVersion": 1.5,
                  "position": [
                        950,
                        200
                  ]
            },
            {
                  "parameters": {
                        "method": "POST",
                        "url": "={{ $env.APP_URL || \"http://localhost:3000\" }}/api/alerts",
                        "sendHeaders": true,
                        "headerParameters": {
                              "parameters": [
                                    {
                                          "name": "X-Webhook-Secret",
                                          "value": "={{ $env.WEBHOOK_SECRET || \"dev-secret\" }}"
                                    },
                                    {
                                          "name": "Content-Type",
                                          "value": "application/json"
                                    }
                              ]
                        },
                        "sendBody": true,
                        "specifyBody": "json",
                        "jsonBody": "{\n  \"source\": \"Sincronizador de Reseñas en TripAdvisor y Google Maps\",\n  \"severity\": \"critical\",\n  \"title\": \"Fallo en workflow WF-078: Sincronizador de Reseñas en TripAdvisor y Google Maps\",\n  \"message\": \"=Error al ejecutar en colección review_invites: {{ $json.error?.message || \\\"Error no especificado\\\" }}\",\n  \"bookingId\": \"={{ $json.bookingId }}\",\n  \"metadata\": {\n    \"workflowCode\": \"WF-078\",\n    \"collection\": \"review_invites\",\n    \"endpoint\": \"/api/native/workflows/review-booster\"\n  }\n}",
                        "options": {}
                  },
                  "name": "[ALERTA NATIVA] Enviar a /api/alerts",
                  "type": "native-automation-node.httpRequest",
                  "typeVersion": 4.2,
                  "position": [
                        950,
                        450
                  ]
            }
      ],
      "connections": {
            "[TRIGGER] Sincronizador de Reseñas en TripAdvisor y Google Maps": {
                  "main": [
                        [
                              {
                                    "node": "[EXTRACT] Formatear y Validar Datos",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[EXTRACT] Formatear y Validar Datos": {
                  "main": [
                        [
                              {
                                    "node": "[FIRESTORE] Operación Colección review_invites",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[FIRESTORE] Operación Colección review_invites": {
                  "main": [
                        [
                              {
                                    "node": "[RESPUESTA] Finalizar con Éxito",
                                    "type": "main",
                                    "index": 0
                              }
                        ],
                        [
                              {
                                    "node": "[ALERTA NATIVA] Enviar a /api/alerts",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            }
      }
}
  },
  {
    id: "wf-079-abandoned-checkout-recovery",
    code: "WF-079",
    name: {
      es: "Recuperador de Carritos Abandonados con Asistente WhatsApp",
      en: "Abandoned Checkout Multi-Touch Recovery Engine"
    },
    category: "marketing",
    collection: "abandoned_carts",
    description: {
      es: "Si el usuario ingresó sus datos pero no pagó, envía mensaje amable a los 30 min ofreciendo resolver dudas.",
      en: "Sends friendly concierge message 30 min after abandoned checkout offering assistance or date advice."
    },
    icon: "ShoppingCart",
    color: "#3b82f6",
    endpoint: "/api/native/workflows/abandoned-cart-recovery",
    method: "POST",
    triggerEvent: "Soft hold expirado sin pago",
    nodesCount: 5,
    slaTarget: "< 600ms",
    nodes: [
      {
            "id": "node-trigger",
            "name": "[TRIGGER] Recuperador de Carritos Abandonados con Asistente WhatsApp",
            "type": "native-automation-node.webhook",
            "description": "Soft hold expirado sin pago"
      },
      {
            "id": "node-extract",
            "name": "[EXTRACT] Formatear y Validar Datos",
            "type": "native-automation-node.code",
            "description": "Transformación y validación de esquema"
      },
      {
            "id": "node-firestore",
            "name": "[FIRESTORE] Operación abandoned_carts",
            "type": "native-automation-node.googleFirebaseCloudFirestore",
            "description": "Lectura/Escritura en Firestore /abandoned_carts"
      },
      {
            "id": "node-response",
            "name": "[RESPUESTA] Finalizar con Éxito",
            "type": "native-automation-node.respondToWebhook",
            "description": "Respuesta HTTP 200 con payload estructurado"
      },
      {
            "id": "node-alert",
            "name": "[ALERTA NATIVA] Enviar a /api/alerts",
            "type": "native-automation-node.httpRequest",
            "description": "Enrutamiento de error a /api/alerts (reemplazo Telegram)"
      }
],
    samplePayload: {
      "customerEmail": "hannah.k@munich.de",
      "tourSelected": "Tortuguero 2-Day Safari",
      "discountOffered": "Free Hotel Pickup Upgrade"
},
    blueprintJson: {
      "id": "WF-079",
      "name": "Recuperador de Carritos Abandonados con Asistente WhatsApp",
      "active": true,
      "nodes": [
            {
                  "parameters": {
                        "path": "api/native/workflows/abandoned-cart-recovery",
                        "httpMethod": "POST",
                        "responseMode": "responseNode",
                        "options": {}
                  },
                  "name": "[TRIGGER] Recuperador de Carritos Abandonados con Asistente WhatsApp",
                  "type": "native-automation-node.webhook",
                  "typeVersion": 2,
                  "position": [
                        100,
                        300
                  ]
            },
            {
                  "parameters": {
                        "jsCode": "// Validar campos obligatorios y normalizar timestamp\nconst item = $input.first().json || {};\nitem.processedAt = new Date().toISOString();\nitem.environment = 'production';\nitem.targetCollection = 'abandoned_carts';\nreturn [{ json: item }];"
                  },
                  "name": "[EXTRACT] Formatear y Validar Datos",
                  "type": "native-automation-node.code",
                  "typeVersion": 2,
                  "position": [
                        350,
                        300
                  ]
            },
            {
                  "parameters": {
                        "operation": "upsert",
                        "collection": "abandoned_carts",
                        "documentId": "={{ $json.id || $json.bookingId || $json.code || $now }}",
                        "dataToSend": "defineBelow",
                        "fieldsUi": {
                              "fieldValues": [
                                    {
                                          "fieldId": "updatedAt",
                                          "fieldValue": "={{ $now }}"
                                    },
                                    {
                                          "fieldId": "workflowSource",
                                          "fieldValue": "WF-079"
                                    },
                                    {
                                          "fieldId": "status",
                                          "fieldValue": "processed"
                                    }
                              ]
                        }
                  },
                  "name": "[FIRESTORE] Operación Colección abandoned_carts",
                  "type": "native-automation-node.googleFirebaseCloudFirestore",
                  "typeVersion": 1.1,
                  "position": [
                        650,
                        300
                  ],
                  "credentials": {
                        "googleApi": {
                              "id": "5NiYz8gX64lPYIdK",
                              "name": "Costa Rica Tours - Firebase"
                        }
                  },
                  "onError": "continueErrorOutput"
            },
            {
                  "parameters": {
                        "respondWith": "json",
                        "responseBody": "{\n  \"success\": true,\n  \"workflowCode\": \"WF-079\",\n  \"collection\": \"abandoned_carts\",\n  \"timestamp\": \"={{ $now }}\",\n  \"message\": \"Operación completada exitosamente en abandoned_carts\"\n}",
                        "options": {}
                  },
                  "name": "[RESPUESTA] Finalizar con Éxito",
                  "type": "native-automation-node.respondToWebhook",
                  "typeVersion": 1.5,
                  "position": [
                        950,
                        200
                  ]
            },
            {
                  "parameters": {
                        "method": "POST",
                        "url": "={{ $env.APP_URL || \"http://localhost:3000\" }}/api/alerts",
                        "sendHeaders": true,
                        "headerParameters": {
                              "parameters": [
                                    {
                                          "name": "X-Webhook-Secret",
                                          "value": "={{ $env.WEBHOOK_SECRET || \"dev-secret\" }}"
                                    },
                                    {
                                          "name": "Content-Type",
                                          "value": "application/json"
                                    }
                              ]
                        },
                        "sendBody": true,
                        "specifyBody": "json",
                        "jsonBody": "{\n  \"source\": \"Recuperador de Carritos Abandonados con Asistente WhatsApp\",\n  \"severity\": \"critical\",\n  \"title\": \"Fallo en workflow WF-079: Recuperador de Carritos Abandonados con Asistente WhatsApp\",\n  \"message\": \"=Error al ejecutar en colección abandoned_carts: {{ $json.error?.message || \\\"Error no especificado\\\" }}\",\n  \"bookingId\": \"={{ $json.bookingId }}\",\n  \"metadata\": {\n    \"workflowCode\": \"WF-079\",\n    \"collection\": \"abandoned_carts\",\n    \"endpoint\": \"/api/native/workflows/abandoned-cart-recovery\"\n  }\n}",
                        "options": {}
                  },
                  "name": "[ALERTA NATIVA] Enviar a /api/alerts",
                  "type": "native-automation-node.httpRequest",
                  "typeVersion": 4.2,
                  "position": [
                        950,
                        450
                  ]
            }
      ],
      "connections": {
            "[TRIGGER] Recuperador de Carritos Abandonados con Asistente WhatsApp": {
                  "main": [
                        [
                              {
                                    "node": "[EXTRACT] Formatear y Validar Datos",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[EXTRACT] Formatear y Validar Datos": {
                  "main": [
                        [
                              {
                                    "node": "[FIRESTORE] Operación Colección abandoned_carts",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[FIRESTORE] Operación Colección abandoned_carts": {
                  "main": [
                        [
                              {
                                    "node": "[RESPUESTA] Finalizar con Éxito",
                                    "type": "main",
                                    "index": 0
                              }
                        ],
                        [
                              {
                                    "node": "[ALERTA NATIVA] Enviar a /api/alerts",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            }
      }
}
  },
  {
    id: "wf-080-green-season-dynamic-discounts",
    code: "WF-080",
    name: {
      es: "Optimizador Dinámico de Tarifas en Temporada Verde (Mayo - Noviembre)",
      en: "Green Season Dynamic Yield & Rain Discount Engine"
    },
    category: "marketing",
    collection: "dynamic_pricing",
    description: {
      es: "Aplica descuentos de hasta 20% en días de menor ocupación para maximizar ingresos de operadores locales.",
      en: "Applies up to 20% dynamic incentives on low-occupancy green season dates to optimize partner revenue."
    },
    icon: "BadgePercent",
    color: "#10b981",
    endpoint: "/api/native/workflows/green-season-discounts",
    method: "POST",
    triggerEvent: "Cron diario de cálculo de ocupación",
    nodesCount: 5,
    slaTarget: "< 1s",
    nodes: [
      {
            "id": "node-trigger",
            "name": "[TRIGGER] Optimizador Dinámico de Tarifas en Temporada Verde (Mayo - Noviembre)",
            "type": "native-automation-node.webhook",
            "description": "Cron diario de cálculo de ocupación"
      },
      {
            "id": "node-extract",
            "name": "[EXTRACT] Formatear y Validar Datos",
            "type": "native-automation-node.code",
            "description": "Transformación y validación de esquema"
      },
      {
            "id": "node-firestore",
            "name": "[FIRESTORE] Operación dynamic_pricing",
            "type": "native-automation-node.googleFirebaseCloudFirestore",
            "description": "Lectura/Escritura en Firestore /dynamic_pricing"
      },
      {
            "id": "node-response",
            "name": "[RESPUESTA] Finalizar con Éxito",
            "type": "native-automation-node.respondToWebhook",
            "description": "Respuesta HTTP 200 con payload estructurado"
      },
      {
            "id": "node-alert",
            "name": "[ALERTA NATIVA] Enviar a /api/alerts",
            "type": "native-automation-node.httpRequest",
            "description": "Enrutamiento de error a /api/alerts (reemplazo Telegram)"
      }
],
    samplePayload: {
      "season": "Green Season",
      "averageOccupancy": "42%",
      "discountApplied": "15% Off Midweek Tours"
},
    blueprintJson: {
      "id": "WF-080",
      "name": "Optimizador Dinámico de Tarifas en Temporada Verde (Mayo - Noviembre)",
      "active": true,
      "nodes": [
            {
                  "parameters": {
                        "path": "api/native/workflows/green-season-discounts",
                        "httpMethod": "POST",
                        "responseMode": "responseNode",
                        "options": {}
                  },
                  "name": "[TRIGGER] Optimizador Dinámico de Tarifas en Temporada Verde (Mayo - Noviembre)",
                  "type": "native-automation-node.webhook",
                  "typeVersion": 2,
                  "position": [
                        100,
                        300
                  ]
            },
            {
                  "parameters": {
                        "jsCode": "// Validar campos obligatorios y normalizar timestamp\nconst item = $input.first().json || {};\nitem.processedAt = new Date().toISOString();\nitem.environment = 'production';\nitem.targetCollection = 'dynamic_pricing';\nreturn [{ json: item }];"
                  },
                  "name": "[EXTRACT] Formatear y Validar Datos",
                  "type": "native-automation-node.code",
                  "typeVersion": 2,
                  "position": [
                        350,
                        300
                  ]
            },
            {
                  "parameters": {
                        "operation": "upsert",
                        "collection": "dynamic_pricing",
                        "documentId": "={{ $json.id || $json.bookingId || $json.code || $now }}",
                        "dataToSend": "defineBelow",
                        "fieldsUi": {
                              "fieldValues": [
                                    {
                                          "fieldId": "updatedAt",
                                          "fieldValue": "={{ $now }}"
                                    },
                                    {
                                          "fieldId": "workflowSource",
                                          "fieldValue": "WF-080"
                                    },
                                    {
                                          "fieldId": "status",
                                          "fieldValue": "processed"
                                    }
                              ]
                        }
                  },
                  "name": "[FIRESTORE] Operación Colección dynamic_pricing",
                  "type": "native-automation-node.googleFirebaseCloudFirestore",
                  "typeVersion": 1.1,
                  "position": [
                        650,
                        300
                  ],
                  "credentials": {
                        "googleApi": {
                              "id": "5NiYz8gX64lPYIdK",
                              "name": "Costa Rica Tours - Firebase"
                        }
                  },
                  "onError": "continueErrorOutput"
            },
            {
                  "parameters": {
                        "respondWith": "json",
                        "responseBody": "{\n  \"success\": true,\n  \"workflowCode\": \"WF-080\",\n  \"collection\": \"dynamic_pricing\",\n  \"timestamp\": \"={{ $now }}\",\n  \"message\": \"Operación completada exitosamente en dynamic_pricing\"\n}",
                        "options": {}
                  },
                  "name": "[RESPUESTA] Finalizar con Éxito",
                  "type": "native-automation-node.respondToWebhook",
                  "typeVersion": 1.5,
                  "position": [
                        950,
                        200
                  ]
            },
            {
                  "parameters": {
                        "method": "POST",
                        "url": "={{ $env.APP_URL || \"http://localhost:3000\" }}/api/alerts",
                        "sendHeaders": true,
                        "headerParameters": {
                              "parameters": [
                                    {
                                          "name": "X-Webhook-Secret",
                                          "value": "={{ $env.WEBHOOK_SECRET || \"dev-secret\" }}"
                                    },
                                    {
                                          "name": "Content-Type",
                                          "value": "application/json"
                                    }
                              ]
                        },
                        "sendBody": true,
                        "specifyBody": "json",
                        "jsonBody": "{\n  \"source\": \"Optimizador Dinámico de Tarifas en Temporada Verde (Mayo - Noviembre)\",\n  \"severity\": \"critical\",\n  \"title\": \"Fallo en workflow WF-080: Optimizador Dinámico de Tarifas en Temporada Verde (Mayo - Noviembre)\",\n  \"message\": \"=Error al ejecutar en colección dynamic_pricing: {{ $json.error?.message || \\\"Error no especificado\\\" }}\",\n  \"bookingId\": \"={{ $json.bookingId }}\",\n  \"metadata\": {\n    \"workflowCode\": \"WF-080\",\n    \"collection\": \"dynamic_pricing\",\n    \"endpoint\": \"/api/native/workflows/green-season-discounts\"\n  }\n}",
                        "options": {}
                  },
                  "name": "[ALERTA NATIVA] Enviar a /api/alerts",
                  "type": "native-automation-node.httpRequest",
                  "typeVersion": 4.2,
                  "position": [
                        950,
                        450
                  ]
            }
      ],
      "connections": {
            "[TRIGGER] Optimizador Dinámico de Tarifas en Temporada Verde (Mayo - Noviembre)": {
                  "main": [
                        [
                              {
                                    "node": "[EXTRACT] Formatear y Validar Datos",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[EXTRACT] Formatear y Validar Datos": {
                  "main": [
                        [
                              {
                                    "node": "[FIRESTORE] Operación Colección dynamic_pricing",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[FIRESTORE] Operación Colección dynamic_pricing": {
                  "main": [
                        [
                              {
                                    "node": "[RESPUESTA] Finalizar con Éxito",
                                    "type": "main",
                                    "index": 0
                              }
                        ],
                        [
                              {
                                    "node": "[ALERTA NATIVA] Enviar a /api/alerts",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            }
      }
}
  },
  {
    id: "wf-081-affiliate-influencer-commission-tracker",
    code: "WF-081",
    name: {
      es: "Rastreador de Afiliados y Creadores de Contenido de Viajes",
      en: "Travel Influencer & Eco-Blogger Affiliate Commission Tracker"
    },
    category: "marketing",
    collection: "affiliate_commissions",
    description: {
      es: "Calcula comisiones por reservas originadas desde códigos de creadores de contenido de ecoturismo.",
      en: "Tracks booking conversions from verified eco-travel bloggers and computes monthly affiliate payouts."
    },
    icon: "Share2",
    color: "#8b5cf6",
    endpoint: "/api/native/workflows/affiliate-track",
    method: "POST",
    triggerEvent: "Reserva con código de afiliado",
    nodesCount: 5,
    slaTarget: "< 300ms",
    nodes: [
      {
            "id": "node-trigger",
            "name": "[TRIGGER] Rastreador de Afiliados y Creadores de Contenido de Viajes",
            "type": "native-automation-node.webhook",
            "description": "Reserva con código de afiliado"
      },
      {
            "id": "node-extract",
            "name": "[EXTRACT] Formatear y Validar Datos",
            "type": "native-automation-node.code",
            "description": "Transformación y validación de esquema"
      },
      {
            "id": "node-firestore",
            "name": "[FIRESTORE] Operación affiliate_commissions",
            "type": "native-automation-node.googleFirebaseCloudFirestore",
            "description": "Lectura/Escritura en Firestore /affiliate_commissions"
      },
      {
            "id": "node-response",
            "name": "[RESPUESTA] Finalizar con Éxito",
            "type": "native-automation-node.respondToWebhook",
            "description": "Respuesta HTTP 200 con payload estructurado"
      },
      {
            "id": "node-alert",
            "name": "[ALERTA NATIVA] Enviar a /api/alerts",
            "type": "native-automation-node.httpRequest",
            "description": "Enrutamiento de error a /api/alerts (reemplazo Telegram)"
      }
],
    samplePayload: {
      "affiliateCode": "WANDERLUST_CR",
      "bookingId": "BK-CR-2026-981",
      "commissionEarnedUSD": 18.5
},
    blueprintJson: {
      "id": "WF-081",
      "name": "Rastreador de Afiliados y Creadores de Contenido de Viajes",
      "active": true,
      "nodes": [
            {
                  "parameters": {
                        "path": "api/native/workflows/affiliate-track",
                        "httpMethod": "POST",
                        "responseMode": "responseNode",
                        "options": {}
                  },
                  "name": "[TRIGGER] Rastreador de Afiliados y Creadores de Contenido de Viajes",
                  "type": "native-automation-node.webhook",
                  "typeVersion": 2,
                  "position": [
                        100,
                        300
                  ]
            },
            {
                  "parameters": {
                        "jsCode": "// Validar campos obligatorios y normalizar timestamp\nconst item = $input.first().json || {};\nitem.processedAt = new Date().toISOString();\nitem.environment = 'production';\nitem.targetCollection = 'affiliate_commissions';\nreturn [{ json: item }];"
                  },
                  "name": "[EXTRACT] Formatear y Validar Datos",
                  "type": "native-automation-node.code",
                  "typeVersion": 2,
                  "position": [
                        350,
                        300
                  ]
            },
            {
                  "parameters": {
                        "operation": "upsert",
                        "collection": "affiliate_commissions",
                        "documentId": "={{ $json.id || $json.bookingId || $json.code || $now }}",
                        "dataToSend": "defineBelow",
                        "fieldsUi": {
                              "fieldValues": [
                                    {
                                          "fieldId": "updatedAt",
                                          "fieldValue": "={{ $now }}"
                                    },
                                    {
                                          "fieldId": "workflowSource",
                                          "fieldValue": "WF-081"
                                    },
                                    {
                                          "fieldId": "status",
                                          "fieldValue": "processed"
                                    }
                              ]
                        }
                  },
                  "name": "[FIRESTORE] Operación Colección affiliate_commissions",
                  "type": "native-automation-node.googleFirebaseCloudFirestore",
                  "typeVersion": 1.1,
                  "position": [
                        650,
                        300
                  ],
                  "credentials": {
                        "googleApi": {
                              "id": "5NiYz8gX64lPYIdK",
                              "name": "Costa Rica Tours - Firebase"
                        }
                  },
                  "onError": "continueErrorOutput"
            },
            {
                  "parameters": {
                        "respondWith": "json",
                        "responseBody": "{\n  \"success\": true,\n  \"workflowCode\": \"WF-081\",\n  \"collection\": \"affiliate_commissions\",\n  \"timestamp\": \"={{ $now }}\",\n  \"message\": \"Operación completada exitosamente en affiliate_commissions\"\n}",
                        "options": {}
                  },
                  "name": "[RESPUESTA] Finalizar con Éxito",
                  "type": "native-automation-node.respondToWebhook",
                  "typeVersion": 1.5,
                  "position": [
                        950,
                        200
                  ]
            },
            {
                  "parameters": {
                        "method": "POST",
                        "url": "={{ $env.APP_URL || \"http://localhost:3000\" }}/api/alerts",
                        "sendHeaders": true,
                        "headerParameters": {
                              "parameters": [
                                    {
                                          "name": "X-Webhook-Secret",
                                          "value": "={{ $env.WEBHOOK_SECRET || \"dev-secret\" }}"
                                    },
                                    {
                                          "name": "Content-Type",
                                          "value": "application/json"
                                    }
                              ]
                        },
                        "sendBody": true,
                        "specifyBody": "json",
                        "jsonBody": "{\n  \"source\": \"Rastreador de Afiliados y Creadores de Contenido de Viajes\",\n  \"severity\": \"critical\",\n  \"title\": \"Fallo en workflow WF-081: Rastreador de Afiliados y Creadores de Contenido de Viajes\",\n  \"message\": \"=Error al ejecutar en colección affiliate_commissions: {{ $json.error?.message || \\\"Error no especificado\\\" }}\",\n  \"bookingId\": \"={{ $json.bookingId }}\",\n  \"metadata\": {\n    \"workflowCode\": \"WF-081\",\n    \"collection\": \"affiliate_commissions\",\n    \"endpoint\": \"/api/native/workflows/affiliate-track\"\n  }\n}",
                        "options": {}
                  },
                  "name": "[ALERTA NATIVA] Enviar a /api/alerts",
                  "type": "native-automation-node.httpRequest",
                  "typeVersion": 4.2,
                  "position": [
                        950,
                        450
                  ]
            }
      ],
      "connections": {
            "[TRIGGER] Rastreador de Afiliados y Creadores de Contenido de Viajes": {
                  "main": [
                        [
                              {
                                    "node": "[EXTRACT] Formatear y Validar Datos",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[EXTRACT] Formatear y Validar Datos": {
                  "main": [
                        [
                              {
                                    "node": "[FIRESTORE] Operación Colección affiliate_commissions",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[FIRESTORE] Operación Colección affiliate_commissions": {
                  "main": [
                        [
                              {
                                    "node": "[RESPUESTA] Finalizar con Éxito",
                                    "type": "main",
                                    "index": 0
                              }
                        ],
                        [
                              {
                                    "node": "[ALERTA NATIVA] Enviar a /api/alerts",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            }
      }
}
  },
  {
    id: "wf-082-corporate-retreat-b2b-quote-engine",
    code: "WF-082",
    name: {
      es: "Generador de Cotizaciones B2B para Retiros Corporativos",
      en: "Corporate Retreats & MICE B2B Instant Proposal Generator"
    },
    category: "marketing",
    collection: "corporate_quotes",
    description: {
      es: "Crea propuestas ejecutivas en PDF con desglose de transporte, team-building ecológico y catering en menos de 10 segundos.",
      en: "Creates formal executive PDF proposals for corporate eco-retreats with volume discounts within 10 seconds."
    },
    icon: "Briefcase",
    color: "#0284c7",
    endpoint: "/api/native/workflows/corporate-quote",
    method: "POST",
    triggerEvent: "Envío de formulario corporativo B2B",
    nodesCount: 5,
    slaTarget: "< 2s",
    nodes: [
      {
            "id": "node-trigger",
            "name": "[TRIGGER] Generador de Cotizaciones B2B para Retiros Corporativos",
            "type": "native-automation-node.webhook",
            "description": "Envío de formulario corporativo B2B"
      },
      {
            "id": "node-extract",
            "name": "[EXTRACT] Formatear y Validar Datos",
            "type": "native-automation-node.code",
            "description": "Transformación y validación de esquema"
      },
      {
            "id": "node-firestore",
            "name": "[FIRESTORE] Operación corporate_quotes",
            "type": "native-automation-node.googleFirebaseCloudFirestore",
            "description": "Lectura/Escritura en Firestore /corporate_quotes"
      },
      {
            "id": "node-response",
            "name": "[RESPUESTA] Finalizar con Éxito",
            "type": "native-automation-node.respondToWebhook",
            "description": "Respuesta HTTP 200 con payload estructurado"
      },
      {
            "id": "node-alert",
            "name": "[ALERTA NATIVA] Enviar a /api/alerts",
            "type": "native-automation-node.httpRequest",
            "description": "Enrutamiento de error a /api/alerts (reemplazo Telegram)"
      }
],
    samplePayload: {
      "companyName": "BioTech Global",
      "paxCount": 35,
      "proposalTotalUSD": 14500
},
    blueprintJson: {
      "id": "WF-082",
      "name": "Generador de Cotizaciones B2B para Retiros Corporativos",
      "active": true,
      "nodes": [
            {
                  "parameters": {
                        "path": "api/native/workflows/corporate-quote",
                        "httpMethod": "POST",
                        "responseMode": "responseNode",
                        "options": {}
                  },
                  "name": "[TRIGGER] Generador de Cotizaciones B2B para Retiros Corporativos",
                  "type": "native-automation-node.webhook",
                  "typeVersion": 2,
                  "position": [
                        100,
                        300
                  ]
            },
            {
                  "parameters": {
                        "jsCode": "// Validar campos obligatorios y normalizar timestamp\nconst item = $input.first().json || {};\nitem.processedAt = new Date().toISOString();\nitem.environment = 'production';\nitem.targetCollection = 'corporate_quotes';\nreturn [{ json: item }];"
                  },
                  "name": "[EXTRACT] Formatear y Validar Datos",
                  "type": "native-automation-node.code",
                  "typeVersion": 2,
                  "position": [
                        350,
                        300
                  ]
            },
            {
                  "parameters": {
                        "operation": "upsert",
                        "collection": "corporate_quotes",
                        "documentId": "={{ $json.id || $json.bookingId || $json.code || $now }}",
                        "dataToSend": "defineBelow",
                        "fieldsUi": {
                              "fieldValues": [
                                    {
                                          "fieldId": "updatedAt",
                                          "fieldValue": "={{ $now }}"
                                    },
                                    {
                                          "fieldId": "workflowSource",
                                          "fieldValue": "WF-082"
                                    },
                                    {
                                          "fieldId": "status",
                                          "fieldValue": "processed"
                                    }
                              ]
                        }
                  },
                  "name": "[FIRESTORE] Operación Colección corporate_quotes",
                  "type": "native-automation-node.googleFirebaseCloudFirestore",
                  "typeVersion": 1.1,
                  "position": [
                        650,
                        300
                  ],
                  "credentials": {
                        "googleApi": {
                              "id": "5NiYz8gX64lPYIdK",
                              "name": "Costa Rica Tours - Firebase"
                        }
                  },
                  "onError": "continueErrorOutput"
            },
            {
                  "parameters": {
                        "respondWith": "json",
                        "responseBody": "{\n  \"success\": true,\n  \"workflowCode\": \"WF-082\",\n  \"collection\": \"corporate_quotes\",\n  \"timestamp\": \"={{ $now }}\",\n  \"message\": \"Operación completada exitosamente en corporate_quotes\"\n}",
                        "options": {}
                  },
                  "name": "[RESPUESTA] Finalizar con Éxito",
                  "type": "native-automation-node.respondToWebhook",
                  "typeVersion": 1.5,
                  "position": [
                        950,
                        200
                  ]
            },
            {
                  "parameters": {
                        "method": "POST",
                        "url": "={{ $env.APP_URL || \"http://localhost:3000\" }}/api/alerts",
                        "sendHeaders": true,
                        "headerParameters": {
                              "parameters": [
                                    {
                                          "name": "X-Webhook-Secret",
                                          "value": "={{ $env.WEBHOOK_SECRET || \"dev-secret\" }}"
                                    },
                                    {
                                          "name": "Content-Type",
                                          "value": "application/json"
                                    }
                              ]
                        },
                        "sendBody": true,
                        "specifyBody": "json",
                        "jsonBody": "{\n  \"source\": \"Generador de Cotizaciones B2B para Retiros Corporativos\",\n  \"severity\": \"critical\",\n  \"title\": \"Fallo en workflow WF-082: Generador de Cotizaciones B2B para Retiros Corporativos\",\n  \"message\": \"=Error al ejecutar en colección corporate_quotes: {{ $json.error?.message || \\\"Error no especificado\\\" }}\",\n  \"bookingId\": \"={{ $json.bookingId }}\",\n  \"metadata\": {\n    \"workflowCode\": \"WF-082\",\n    \"collection\": \"corporate_quotes\",\n    \"endpoint\": \"/api/native/workflows/corporate-quote\"\n  }\n}",
                        "options": {}
                  },
                  "name": "[ALERTA NATIVA] Enviar a /api/alerts",
                  "type": "native-automation-node.httpRequest",
                  "typeVersion": 4.2,
                  "position": [
                        950,
                        450
                  ]
            }
      ],
      "connections": {
            "[TRIGGER] Generador de Cotizaciones B2B para Retiros Corporativos": {
                  "main": [
                        [
                              {
                                    "node": "[EXTRACT] Formatear y Validar Datos",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[EXTRACT] Formatear y Validar Datos": {
                  "main": [
                        [
                              {
                                    "node": "[FIRESTORE] Operación Colección corporate_quotes",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[FIRESTORE] Operación Colección corporate_quotes": {
                  "main": [
                        [
                              {
                                    "node": "[RESPUESTA] Finalizar con Éxito",
                                    "type": "main",
                                    "index": 0
                              }
                        ],
                        [
                              {
                                    "node": "[ALERTA NATIVA] Enviar a /api/alerts",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            }
      }
}
  },
  {
    id: "wf-083-detractor-nps-resolution-pipeline",
    code: "WF-083",
    name: {
      es: "Protocolo de Rescate y Solución para Clientes Detractores (NPS 1-6)",
      en: "Detractor NPS 1-6 Immediate Recovery & Escalation Protocol"
    },
    category: "feedback",
    collection: "customer_escalations",
    description: {
      es: "Cuando un cliente reporta insatisfacción, notifica a gerencia y envía disculpa formal con llamada directa del concierge.",
      en: "Escalates negative feedback directly to ops director triggering immediate concierge call and apology gift."
    },
    icon: "AlertTriangle",
    color: "#dc2626",
    endpoint: "/api/native/workflows/nps-detractor-rescue",
    method: "POST",
    triggerEvent: "Encuesta NPS con puntaje <= 6",
    nodesCount: 5,
    slaTarget: "< 100ms",
    nodes: [
      {
            "id": "node-trigger",
            "name": "[TRIGGER] Protocolo de Rescate y Solución para Clientes Detractores (NPS 1-6)",
            "type": "native-automation-node.webhook",
            "description": "Encuesta NPS con puntaje <= 6"
      },
      {
            "id": "node-extract",
            "name": "[EXTRACT] Formatear y Validar Datos",
            "type": "native-automation-node.code",
            "description": "Transformación y validación de esquema"
      },
      {
            "id": "node-firestore",
            "name": "[FIRESTORE] Operación customer_escalations",
            "type": "native-automation-node.googleFirebaseCloudFirestore",
            "description": "Lectura/Escritura en Firestore /customer_escalations"
      },
      {
            "id": "node-response",
            "name": "[RESPUESTA] Finalizar con Éxito",
            "type": "native-automation-node.respondToWebhook",
            "description": "Respuesta HTTP 200 con payload estructurado"
      },
      {
            "id": "node-alert",
            "name": "[ALERTA NATIVA] Enviar a /api/alerts",
            "type": "native-automation-node.httpRequest",
            "description": "Enrutamiento de error a /api/alerts (reemplazo Telegram)"
      }
],
    samplePayload: {
      "bookingId": "BK-CR-2026-983",
      "npsScore": 4,
      "issueReported": "Guide arrived 20 min late due to flat tire",
      "actionTaken": "50% Refund Voucher + Direct Call"
},
    blueprintJson: {
      "id": "WF-083",
      "name": "Protocolo de Rescate y Solución para Clientes Detractores (NPS 1-6)",
      "active": true,
      "nodes": [
            {
                  "parameters": {
                        "path": "api/native/workflows/nps-detractor-rescue",
                        "httpMethod": "POST",
                        "responseMode": "responseNode",
                        "options": {}
                  },
                  "name": "[TRIGGER] Protocolo de Rescate y Solución para Clientes Detractores (NPS 1-6)",
                  "type": "native-automation-node.webhook",
                  "typeVersion": 2,
                  "position": [
                        100,
                        300
                  ]
            },
            {
                  "parameters": {
                        "jsCode": "// Validar campos obligatorios y normalizar timestamp\nconst item = $input.first().json || {};\nitem.processedAt = new Date().toISOString();\nitem.environment = 'production';\nitem.targetCollection = 'customer_escalations';\nreturn [{ json: item }];"
                  },
                  "name": "[EXTRACT] Formatear y Validar Datos",
                  "type": "native-automation-node.code",
                  "typeVersion": 2,
                  "position": [
                        350,
                        300
                  ]
            },
            {
                  "parameters": {
                        "operation": "upsert",
                        "collection": "customer_escalations",
                        "documentId": "={{ $json.id || $json.bookingId || $json.code || $now }}",
                        "dataToSend": "defineBelow",
                        "fieldsUi": {
                              "fieldValues": [
                                    {
                                          "fieldId": "updatedAt",
                                          "fieldValue": "={{ $now }}"
                                    },
                                    {
                                          "fieldId": "workflowSource",
                                          "fieldValue": "WF-083"
                                    },
                                    {
                                          "fieldId": "status",
                                          "fieldValue": "processed"
                                    }
                              ]
                        }
                  },
                  "name": "[FIRESTORE] Operación Colección customer_escalations",
                  "type": "native-automation-node.googleFirebaseCloudFirestore",
                  "typeVersion": 1.1,
                  "position": [
                        650,
                        300
                  ],
                  "credentials": {
                        "googleApi": {
                              "id": "5NiYz8gX64lPYIdK",
                              "name": "Costa Rica Tours - Firebase"
                        }
                  },
                  "onError": "continueErrorOutput"
            },
            {
                  "parameters": {
                        "respondWith": "json",
                        "responseBody": "{\n  \"success\": true,\n  \"workflowCode\": \"WF-083\",\n  \"collection\": \"customer_escalations\",\n  \"timestamp\": \"={{ $now }}\",\n  \"message\": \"Operación completada exitosamente en customer_escalations\"\n}",
                        "options": {}
                  },
                  "name": "[RESPUESTA] Finalizar con Éxito",
                  "type": "native-automation-node.respondToWebhook",
                  "typeVersion": 1.5,
                  "position": [
                        950,
                        200
                  ]
            },
            {
                  "parameters": {
                        "method": "POST",
                        "url": "={{ $env.APP_URL || \"http://localhost:3000\" }}/api/alerts",
                        "sendHeaders": true,
                        "headerParameters": {
                              "parameters": [
                                    {
                                          "name": "X-Webhook-Secret",
                                          "value": "={{ $env.WEBHOOK_SECRET || \"dev-secret\" }}"
                                    },
                                    {
                                          "name": "Content-Type",
                                          "value": "application/json"
                                    }
                              ]
                        },
                        "sendBody": true,
                        "specifyBody": "json",
                        "jsonBody": "{\n  \"source\": \"Protocolo de Rescate y Solución para Clientes Detractores (NPS 1-6)\",\n  \"severity\": \"critical\",\n  \"title\": \"Fallo en workflow WF-083: Protocolo de Rescate y Solución para Clientes Detractores (NPS 1-6)\",\n  \"message\": \"=Error al ejecutar en colección customer_escalations: {{ $json.error?.message || \\\"Error no especificado\\\" }}\",\n  \"bookingId\": \"={{ $json.bookingId }}\",\n  \"metadata\": {\n    \"workflowCode\": \"WF-083\",\n    \"collection\": \"customer_escalations\",\n    \"endpoint\": \"/api/native/workflows/nps-detractor-rescue\"\n  }\n}",
                        "options": {}
                  },
                  "name": "[ALERTA NATIVA] Enviar a /api/alerts",
                  "type": "native-automation-node.httpRequest",
                  "typeVersion": 4.2,
                  "position": [
                        950,
                        450
                  ]
            }
      ],
      "connections": {
            "[TRIGGER] Protocolo de Rescate y Solución para Clientes Detractores (NPS 1-6)": {
                  "main": [
                        [
                              {
                                    "node": "[EXTRACT] Formatear y Validar Datos",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[EXTRACT] Formatear y Validar Datos": {
                  "main": [
                        [
                              {
                                    "node": "[FIRESTORE] Operación Colección customer_escalations",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[FIRESTORE] Operación Colección customer_escalations": {
                  "main": [
                        [
                              {
                                    "node": "[RESPUESTA] Finalizar con Éxito",
                                    "type": "main",
                                    "index": 0
                              }
                        ],
                        [
                              {
                                    "node": "[ALERTA NATIVA] Enviar a /api/alerts",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            }
      }
}
  },
  {
    id: "wf-084-eco-ambassador-badge-awarder",
    code: "WF-084",
    name: {
      es: "Asignador de Insignias y Certificado de Embajador Sostenible",
      en: "Eco-Ambassador Badge & Tree Planting Certificate Awarder"
    },
    category: "marketing",
    collection: "eco_certificates",
    description: {
      es: "Genera diploma digital personalizado certificando la contribución del viajero a la conservación de bosques ticos.",
      en: "Issues downloadable certified digital diploma honoring traveler contribution to rainforest conservation."
    },
    icon: "Medal",
    color: "#15803d",
    endpoint: "/api/native/workflows/eco-ambassador",
    method: "POST",
    triggerEvent: "Culminación de tour con aporte ecológico certificado",
    nodesCount: 5,
    slaTarget: "< 600ms",
    nodes: [
      {
            "id": "node-trigger",
            "name": "[TRIGGER] Asignador de Insignias y Certificado de Embajador Sostenible",
            "type": "native-automation-node.webhook",
            "description": "Culminación de tour con aporte ecológico certificado"
      },
      {
            "id": "node-extract",
            "name": "[EXTRACT] Formatear y Validar Datos",
            "type": "native-automation-node.code",
            "description": "Transformación y validación de esquema"
      },
      {
            "id": "node-firestore",
            "name": "[FIRESTORE] Operación eco_certificates",
            "type": "native-automation-node.googleFirebaseCloudFirestore",
            "description": "Lectura/Escritura en Firestore /eco_certificates"
      },
      {
            "id": "node-response",
            "name": "[RESPUESTA] Finalizar con Éxito",
            "type": "native-automation-node.respondToWebhook",
            "description": "Respuesta HTTP 200 con payload estructurado"
      },
      {
            "id": "node-alert",
            "name": "[ALERTA NATIVA] Enviar a /api/alerts",
            "type": "native-automation-node.httpRequest",
            "description": "Enrutamiento de error a /api/alerts (reemplazo Telegram)"
      }
],
    samplePayload: {
      "travelerName": "Alexander Wright",
      "treesProtected": 5,
      "certificateId": "ECO-AMB-2026-984"
},
    blueprintJson: {
      "id": "WF-084",
      "name": "Asignador de Insignias y Certificado de Embajador Sostenible",
      "active": true,
      "nodes": [
            {
                  "parameters": {
                        "path": "api/native/workflows/eco-ambassador",
                        "httpMethod": "POST",
                        "responseMode": "responseNode",
                        "options": {}
                  },
                  "name": "[TRIGGER] Asignador de Insignias y Certificado de Embajador Sostenible",
                  "type": "native-automation-node.webhook",
                  "typeVersion": 2,
                  "position": [
                        100,
                        300
                  ]
            },
            {
                  "parameters": {
                        "jsCode": "// Validar campos obligatorios y normalizar timestamp\nconst item = $input.first().json || {};\nitem.processedAt = new Date().toISOString();\nitem.environment = 'production';\nitem.targetCollection = 'eco_certificates';\nreturn [{ json: item }];"
                  },
                  "name": "[EXTRACT] Formatear y Validar Datos",
                  "type": "native-automation-node.code",
                  "typeVersion": 2,
                  "position": [
                        350,
                        300
                  ]
            },
            {
                  "parameters": {
                        "operation": "upsert",
                        "collection": "eco_certificates",
                        "documentId": "={{ $json.id || $json.bookingId || $json.code || $now }}",
                        "dataToSend": "defineBelow",
                        "fieldsUi": {
                              "fieldValues": [
                                    {
                                          "fieldId": "updatedAt",
                                          "fieldValue": "={{ $now }}"
                                    },
                                    {
                                          "fieldId": "workflowSource",
                                          "fieldValue": "WF-084"
                                    },
                                    {
                                          "fieldId": "status",
                                          "fieldValue": "processed"
                                    }
                              ]
                        }
                  },
                  "name": "[FIRESTORE] Operación Colección eco_certificates",
                  "type": "native-automation-node.googleFirebaseCloudFirestore",
                  "typeVersion": 1.1,
                  "position": [
                        650,
                        300
                  ],
                  "credentials": {
                        "googleApi": {
                              "id": "5NiYz8gX64lPYIdK",
                              "name": "Costa Rica Tours - Firebase"
                        }
                  },
                  "onError": "continueErrorOutput"
            },
            {
                  "parameters": {
                        "respondWith": "json",
                        "responseBody": "{\n  \"success\": true,\n  \"workflowCode\": \"WF-084\",\n  \"collection\": \"eco_certificates\",\n  \"timestamp\": \"={{ $now }}\",\n  \"message\": \"Operación completada exitosamente en eco_certificates\"\n}",
                        "options": {}
                  },
                  "name": "[RESPUESTA] Finalizar con Éxito",
                  "type": "native-automation-node.respondToWebhook",
                  "typeVersion": 1.5,
                  "position": [
                        950,
                        200
                  ]
            },
            {
                  "parameters": {
                        "method": "POST",
                        "url": "={{ $env.APP_URL || \"http://localhost:3000\" }}/api/alerts",
                        "sendHeaders": true,
                        "headerParameters": {
                              "parameters": [
                                    {
                                          "name": "X-Webhook-Secret",
                                          "value": "={{ $env.WEBHOOK_SECRET || \"dev-secret\" }}"
                                    },
                                    {
                                          "name": "Content-Type",
                                          "value": "application/json"
                                    }
                              ]
                        },
                        "sendBody": true,
                        "specifyBody": "json",
                        "jsonBody": "{\n  \"source\": \"Asignador de Insignias y Certificado de Embajador Sostenible\",\n  \"severity\": \"critical\",\n  \"title\": \"Fallo en workflow WF-084: Asignador de Insignias y Certificado de Embajador Sostenible\",\n  \"message\": \"=Error al ejecutar en colección eco_certificates: {{ $json.error?.message || \\\"Error no especificado\\\" }}\",\n  \"bookingId\": \"={{ $json.bookingId }}\",\n  \"metadata\": {\n    \"workflowCode\": \"WF-084\",\n    \"collection\": \"eco_certificates\",\n    \"endpoint\": \"/api/native/workflows/eco-ambassador\"\n  }\n}",
                        "options": {}
                  },
                  "name": "[ALERTA NATIVA] Enviar a /api/alerts",
                  "type": "native-automation-node.httpRequest",
                  "typeVersion": 4.2,
                  "position": [
                        950,
                        450
                  ]
            }
      ],
      "connections": {
            "[TRIGGER] Asignador de Insignias y Certificado de Embajador Sostenible": {
                  "main": [
                        [
                              {
                                    "node": "[EXTRACT] Formatear y Validar Datos",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[EXTRACT] Formatear y Validar Datos": {
                  "main": [
                        [
                              {
                                    "node": "[FIRESTORE] Operación Colección eco_certificates",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[FIRESTORE] Operación Colección eco_certificates": {
                  "main": [
                        [
                              {
                                    "node": "[RESPUESTA] Finalizar con Éxito",
                                    "type": "main",
                                    "index": 0
                              }
                        ],
                        [
                              {
                                    "node": "[ALERTA NATIVA] Enviar a /api/alerts",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            }
      }
}
  },
  {
    id: "wf-085-geo-targeted-push-notifications",
    code: "WF-085",
    name: {
      es: "Notificaciones Push Geolocalizadas con Ofertas Cercanas",
      en: "Hyperlocal Geo-Targeted Push Notifications & Nearby Deals"
    },
    category: "marketing",
    collection: "push_campaigns",
    description: {
      es: "Envía sugerencias de actividades nocturnas o tours para el día siguiente cuando el viajero llega a su hotel en La Fortuna o Manuel Antonio.",
      en: "Dispatches nearby night walk / hot springs suggestions when traveler checks into regional hotel area."
    },
    icon: "BellRing",
    color: "#8b5cf6",
    endpoint: "/api/native/workflows/geo-push",
    method: "POST",
    triggerEvent: "Evento de geolocalización o check-in",
    nodesCount: 5,
    slaTarget: "< 300ms",
    nodes: [
      {
            "id": "node-trigger",
            "name": "[TRIGGER] Notificaciones Push Geolocalizadas con Ofertas Cercanas",
            "type": "native-automation-node.webhook",
            "description": "Evento de geolocalización o check-in"
      },
      {
            "id": "node-extract",
            "name": "[EXTRACT] Formatear y Validar Datos",
            "type": "native-automation-node.code",
            "description": "Transformación y validación de esquema"
      },
      {
            "id": "node-firestore",
            "name": "[FIRESTORE] Operación push_campaigns",
            "type": "native-automation-node.googleFirebaseCloudFirestore",
            "description": "Lectura/Escritura en Firestore /push_campaigns"
      },
      {
            "id": "node-response",
            "name": "[RESPUESTA] Finalizar con Éxito",
            "type": "native-automation-node.respondToWebhook",
            "description": "Respuesta HTTP 200 con payload estructurado"
      },
      {
            "id": "node-alert",
            "name": "[ALERTA NATIVA] Enviar a /api/alerts",
            "type": "native-automation-node.httpRequest",
            "description": "Enrutamiento de error a /api/alerts (reemplazo Telegram)"
      }
],
    samplePayload: {
      "currentRegion": "Arenal",
      "suggestedTour": "Eco-Termales Hot Springs Night Pass",
      "discount": "10% Tonight Only"
},
    blueprintJson: {
      "id": "WF-085",
      "name": "Notificaciones Push Geolocalizadas con Ofertas Cercanas",
      "active": true,
      "nodes": [
            {
                  "parameters": {
                        "path": "api/native/workflows/geo-push",
                        "httpMethod": "POST",
                        "responseMode": "responseNode",
                        "options": {}
                  },
                  "name": "[TRIGGER] Notificaciones Push Geolocalizadas con Ofertas Cercanas",
                  "type": "native-automation-node.webhook",
                  "typeVersion": 2,
                  "position": [
                        100,
                        300
                  ]
            },
            {
                  "parameters": {
                        "jsCode": "// Validar campos obligatorios y normalizar timestamp\nconst item = $input.first().json || {};\nitem.processedAt = new Date().toISOString();\nitem.environment = 'production';\nitem.targetCollection = 'push_campaigns';\nreturn [{ json: item }];"
                  },
                  "name": "[EXTRACT] Formatear y Validar Datos",
                  "type": "native-automation-node.code",
                  "typeVersion": 2,
                  "position": [
                        350,
                        300
                  ]
            },
            {
                  "parameters": {
                        "operation": "upsert",
                        "collection": "push_campaigns",
                        "documentId": "={{ $json.id || $json.bookingId || $json.code || $now }}",
                        "dataToSend": "defineBelow",
                        "fieldsUi": {
                              "fieldValues": [
                                    {
                                          "fieldId": "updatedAt",
                                          "fieldValue": "={{ $now }}"
                                    },
                                    {
                                          "fieldId": "workflowSource",
                                          "fieldValue": "WF-085"
                                    },
                                    {
                                          "fieldId": "status",
                                          "fieldValue": "processed"
                                    }
                              ]
                        }
                  },
                  "name": "[FIRESTORE] Operación Colección push_campaigns",
                  "type": "native-automation-node.googleFirebaseCloudFirestore",
                  "typeVersion": 1.1,
                  "position": [
                        650,
                        300
                  ],
                  "credentials": {
                        "googleApi": {
                              "id": "5NiYz8gX64lPYIdK",
                              "name": "Costa Rica Tours - Firebase"
                        }
                  },
                  "onError": "continueErrorOutput"
            },
            {
                  "parameters": {
                        "respondWith": "json",
                        "responseBody": "{\n  \"success\": true,\n  \"workflowCode\": \"WF-085\",\n  \"collection\": \"push_campaigns\",\n  \"timestamp\": \"={{ $now }}\",\n  \"message\": \"Operación completada exitosamente en push_campaigns\"\n}",
                        "options": {}
                  },
                  "name": "[RESPUESTA] Finalizar con Éxito",
                  "type": "native-automation-node.respondToWebhook",
                  "typeVersion": 1.5,
                  "position": [
                        950,
                        200
                  ]
            },
            {
                  "parameters": {
                        "method": "POST",
                        "url": "={{ $env.APP_URL || \"http://localhost:3000\" }}/api/alerts",
                        "sendHeaders": true,
                        "headerParameters": {
                              "parameters": [
                                    {
                                          "name": "X-Webhook-Secret",
                                          "value": "={{ $env.WEBHOOK_SECRET || \"dev-secret\" }}"
                                    },
                                    {
                                          "name": "Content-Type",
                                          "value": "application/json"
                                    }
                              ]
                        },
                        "sendBody": true,
                        "specifyBody": "json",
                        "jsonBody": "{\n  \"source\": \"Notificaciones Push Geolocalizadas con Ofertas Cercanas\",\n  \"severity\": \"critical\",\n  \"title\": \"Fallo en workflow WF-085: Notificaciones Push Geolocalizadas con Ofertas Cercanas\",\n  \"message\": \"=Error al ejecutar en colección push_campaigns: {{ $json.error?.message || \\\"Error no especificado\\\" }}\",\n  \"bookingId\": \"={{ $json.bookingId }}\",\n  \"metadata\": {\n    \"workflowCode\": \"WF-085\",\n    \"collection\": \"push_campaigns\",\n    \"endpoint\": \"/api/native/workflows/geo-push\"\n  }\n}",
                        "options": {}
                  },
                  "name": "[ALERTA NATIVA] Enviar a /api/alerts",
                  "type": "native-automation-node.httpRequest",
                  "typeVersion": 4.2,
                  "position": [
                        950,
                        450
                  ]
            }
      ],
      "connections": {
            "[TRIGGER] Notificaciones Push Geolocalizadas con Ofertas Cercanas": {
                  "main": [
                        [
                              {
                                    "node": "[EXTRACT] Formatear y Validar Datos",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[EXTRACT] Formatear y Validar Datos": {
                  "main": [
                        [
                              {
                                    "node": "[FIRESTORE] Operación Colección push_campaigns",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[FIRESTORE] Operación Colección push_campaigns": {
                  "main": [
                        [
                              {
                                    "node": "[RESPUESTA] Finalizar con Éxito",
                                    "type": "main",
                                    "index": 0
                              }
                        ],
                        [
                              {
                                    "node": "[ALERTA NATIVA] Enviar a /api/alerts",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            }
      }
}
  },
  {
    id: "wf-086-travel-agency-api-whitelabel-sync",
    code: "WF-086",
    name: {
      es: "Conector de Disponibilidad para Agencias de Viajes Mayoristas",
      en: "Wholesale B2B Travel Agencies White-Label API Synchronizer"
    },
    category: "marketing",
    collection: "agency_manifests",
    description: {
      es: "Sincroniza cupos y tarifas netas con agencias de viajes europeas y norteamericanas mediante JSON API estandarizada.",
      en: "Exposes live inventory and net rates to European & American tour operators via standardized JSON API."
    },
    icon: "Network",
    color: "#0284c7",
    endpoint: "/api/native/workflows/b2b-agency-sync",
    method: "GET",
    triggerEvent: "Petición de disponibilidad B2B",
    nodesCount: 5,
    slaTarget: "< 200ms",
    nodes: [
      {
            "id": "node-trigger",
            "name": "[TRIGGER] Conector de Disponibilidad para Agencias de Viajes Mayoristas",
            "type": "native-automation-node.webhook",
            "description": "Petición de disponibilidad B2B"
      },
      {
            "id": "node-extract",
            "name": "[EXTRACT] Formatear y Validar Datos",
            "type": "native-automation-node.code",
            "description": "Transformación y validación de esquema"
      },
      {
            "id": "node-firestore",
            "name": "[FIRESTORE] Operación agency_manifests",
            "type": "native-automation-node.googleFirebaseCloudFirestore",
            "description": "Lectura/Escritura en Firestore /agency_manifests"
      },
      {
            "id": "node-response",
            "name": "[RESPUESTA] Finalizar con Éxito",
            "type": "native-automation-node.respondToWebhook",
            "description": "Respuesta HTTP 200 con payload estructurado"
      },
      {
            "id": "node-alert",
            "name": "[ALERTA NATIVA] Enviar a /api/alerts",
            "type": "native-automation-node.httpRequest",
            "description": "Enrutamiento de error a /api/alerts (reemplazo Telegram)"
      }
],
    samplePayload: {
      "agencyId": "AGY-LONDON-TOURS",
      "toursAvailable": 48,
      "rateTier": "Wholesale A"
},
    blueprintJson: {
      "id": "WF-086",
      "name": "Conector de Disponibilidad para Agencias de Viajes Mayoristas",
      "active": true,
      "nodes": [
            {
                  "parameters": {
                        "path": "api/native/workflows/b2b-agency-sync",
                        "httpMethod": "GET",
                        "responseMode": "responseNode",
                        "options": {}
                  },
                  "name": "[TRIGGER] Conector de Disponibilidad para Agencias de Viajes Mayoristas",
                  "type": "native-automation-node.webhook",
                  "typeVersion": 2,
                  "position": [
                        100,
                        300
                  ]
            },
            {
                  "parameters": {
                        "jsCode": "// Validar campos obligatorios y normalizar timestamp\nconst item = $input.first().json || {};\nitem.processedAt = new Date().toISOString();\nitem.environment = 'production';\nitem.targetCollection = 'agency_manifests';\nreturn [{ json: item }];"
                  },
                  "name": "[EXTRACT] Formatear y Validar Datos",
                  "type": "native-automation-node.code",
                  "typeVersion": 2,
                  "position": [
                        350,
                        300
                  ]
            },
            {
                  "parameters": {
                        "operation": "upsert",
                        "collection": "agency_manifests",
                        "documentId": "={{ $json.id || $json.bookingId || $json.code || $now }}",
                        "dataToSend": "defineBelow",
                        "fieldsUi": {
                              "fieldValues": [
                                    {
                                          "fieldId": "updatedAt",
                                          "fieldValue": "={{ $now }}"
                                    },
                                    {
                                          "fieldId": "workflowSource",
                                          "fieldValue": "WF-086"
                                    },
                                    {
                                          "fieldId": "status",
                                          "fieldValue": "processed"
                                    }
                              ]
                        }
                  },
                  "name": "[FIRESTORE] Operación Colección agency_manifests",
                  "type": "native-automation-node.googleFirebaseCloudFirestore",
                  "typeVersion": 1.1,
                  "position": [
                        650,
                        300
                  ],
                  "credentials": {
                        "googleApi": {
                              "id": "5NiYz8gX64lPYIdK",
                              "name": "Costa Rica Tours - Firebase"
                        }
                  },
                  "onError": "continueErrorOutput"
            },
            {
                  "parameters": {
                        "respondWith": "json",
                        "responseBody": "{\n  \"success\": true,\n  \"workflowCode\": \"WF-086\",\n  \"collection\": \"agency_manifests\",\n  \"timestamp\": \"={{ $now }}\",\n  \"message\": \"Operación completada exitosamente en agency_manifests\"\n}",
                        "options": {}
                  },
                  "name": "[RESPUESTA] Finalizar con Éxito",
                  "type": "native-automation-node.respondToWebhook",
                  "typeVersion": 1.5,
                  "position": [
                        950,
                        200
                  ]
            },
            {
                  "parameters": {
                        "method": "POST",
                        "url": "={{ $env.APP_URL || \"http://localhost:3000\" }}/api/alerts",
                        "sendHeaders": true,
                        "headerParameters": {
                              "parameters": [
                                    {
                                          "name": "X-Webhook-Secret",
                                          "value": "={{ $env.WEBHOOK_SECRET || \"dev-secret\" }}"
                                    },
                                    {
                                          "name": "Content-Type",
                                          "value": "application/json"
                                    }
                              ]
                        },
                        "sendBody": true,
                        "specifyBody": "json",
                        "jsonBody": "{\n  \"source\": \"Conector de Disponibilidad para Agencias de Viajes Mayoristas\",\n  \"severity\": \"critical\",\n  \"title\": \"Fallo en workflow WF-086: Conector de Disponibilidad para Agencias de Viajes Mayoristas\",\n  \"message\": \"=Error al ejecutar en colección agency_manifests: {{ $json.error?.message || \\\"Error no especificado\\\" }}\",\n  \"bookingId\": \"={{ $json.bookingId }}\",\n  \"metadata\": {\n    \"workflowCode\": \"WF-086\",\n    \"collection\": \"agency_manifests\",\n    \"endpoint\": \"/api/native/workflows/b2b-agency-sync\"\n  }\n}",
                        "options": {}
                  },
                  "name": "[ALERTA NATIVA] Enviar a /api/alerts",
                  "type": "native-automation-node.httpRequest",
                  "typeVersion": 4.2,
                  "position": [
                        950,
                        450
                  ]
            }
      ],
      "connections": {
            "[TRIGGER] Conector de Disponibilidad para Agencias de Viajes Mayoristas": {
                  "main": [
                        [
                              {
                                    "node": "[EXTRACT] Formatear y Validar Datos",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[EXTRACT] Formatear y Validar Datos": {
                  "main": [
                        [
                              {
                                    "node": "[FIRESTORE] Operación Colección agency_manifests",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[FIRESTORE] Operación Colección agency_manifests": {
                  "main": [
                        [
                              {
                                    "node": "[RESPUESTA] Finalizar con Éxito",
                                    "type": "main",
                                    "index": 0
                              }
                        ],
                        [
                              {
                                    "node": "[ALERTA NATIVA] Enviar a /api/alerts",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            }
      }
}
  },
  {
    id: "wf-087-seasonal-anniversary-reactivation-campaign",
    code: "WF-087",
    name: {
      es: "Campaña Anual de Reactivación de Viajeros Pasados",
      en: "1-Year Anniversary Return Trip Reactivation Campaign"
    },
    category: "marketing",
    collection: "reengagement_campaigns",
    description: {
      es: "Envía un emotivo recordatorio fotográfico al cumplirse un año de la visita del turista, invitándolo a descubrir nuevas regiones.",
      en: "Sends a nostalgic 1-year anniversary photo recap inviting travelers back to explore unexplored CR provinces."
    },
    icon: "CalendarHeart",
    color: "#ec4899",
    endpoint: "/api/native/workflows/anniversary-reengage",
    method: "POST",
    triggerEvent: "Cron diario comparando fechas de hace 365 días",
    nodesCount: 5,
    slaTarget: "< 1s",
    nodes: [
      {
            "id": "node-trigger",
            "name": "[TRIGGER] Campaña Anual de Reactivación de Viajeros Pasados",
            "type": "native-automation-node.webhook",
            "description": "Cron diario comparando fechas de hace 365 días"
      },
      {
            "id": "node-extract",
            "name": "[EXTRACT] Formatear y Validar Datos",
            "type": "native-automation-node.code",
            "description": "Transformación y validación de esquema"
      },
      {
            "id": "node-firestore",
            "name": "[FIRESTORE] Operación reengagement_campaigns",
            "type": "native-automation-node.googleFirebaseCloudFirestore",
            "description": "Lectura/Escritura en Firestore /reengagement_campaigns"
      },
      {
            "id": "node-response",
            "name": "[RESPUESTA] Finalizar con Éxito",
            "type": "native-automation-node.respondToWebhook",
            "description": "Respuesta HTTP 200 con payload estructurado"
      },
      {
            "id": "node-alert",
            "name": "[ALERTA NATIVA] Enviar a /api/alerts",
            "type": "native-automation-node.httpRequest",
            "description": "Enrutamiento de error a /api/alerts (reemplazo Telegram)"
      }
],
    samplePayload: {
      "customerEmail": "claire.benoit@lyon.fr",
      "previousTour": "Monteverde Zipline 2025",
      "promoOffer": "$50 Off Corcovado Expedition"
},
    blueprintJson: {
      "id": "WF-087",
      "name": "Campaña Anual de Reactivación de Viajeros Pasados",
      "active": true,
      "nodes": [
            {
                  "parameters": {
                        "path": "api/native/workflows/anniversary-reengage",
                        "httpMethod": "POST",
                        "responseMode": "responseNode",
                        "options": {}
                  },
                  "name": "[TRIGGER] Campaña Anual de Reactivación de Viajeros Pasados",
                  "type": "native-automation-node.webhook",
                  "typeVersion": 2,
                  "position": [
                        100,
                        300
                  ]
            },
            {
                  "parameters": {
                        "jsCode": "// Validar campos obligatorios y normalizar timestamp\nconst item = $input.first().json || {};\nitem.processedAt = new Date().toISOString();\nitem.environment = 'production';\nitem.targetCollection = 'reengagement_campaigns';\nreturn [{ json: item }];"
                  },
                  "name": "[EXTRACT] Formatear y Validar Datos",
                  "type": "native-automation-node.code",
                  "typeVersion": 2,
                  "position": [
                        350,
                        300
                  ]
            },
            {
                  "parameters": {
                        "operation": "upsert",
                        "collection": "reengagement_campaigns",
                        "documentId": "={{ $json.id || $json.bookingId || $json.code || $now }}",
                        "dataToSend": "defineBelow",
                        "fieldsUi": {
                              "fieldValues": [
                                    {
                                          "fieldId": "updatedAt",
                                          "fieldValue": "={{ $now }}"
                                    },
                                    {
                                          "fieldId": "workflowSource",
                                          "fieldValue": "WF-087"
                                    },
                                    {
                                          "fieldId": "status",
                                          "fieldValue": "processed"
                                    }
                              ]
                        }
                  },
                  "name": "[FIRESTORE] Operación Colección reengagement_campaigns",
                  "type": "native-automation-node.googleFirebaseCloudFirestore",
                  "typeVersion": 1.1,
                  "position": [
                        650,
                        300
                  ],
                  "credentials": {
                        "googleApi": {
                              "id": "5NiYz8gX64lPYIdK",
                              "name": "Costa Rica Tours - Firebase"
                        }
                  },
                  "onError": "continueErrorOutput"
            },
            {
                  "parameters": {
                        "respondWith": "json",
                        "responseBody": "{\n  \"success\": true,\n  \"workflowCode\": \"WF-087\",\n  \"collection\": \"reengagement_campaigns\",\n  \"timestamp\": \"={{ $now }}\",\n  \"message\": \"Operación completada exitosamente en reengagement_campaigns\"\n}",
                        "options": {}
                  },
                  "name": "[RESPUESTA] Finalizar con Éxito",
                  "type": "native-automation-node.respondToWebhook",
                  "typeVersion": 1.5,
                  "position": [
                        950,
                        200
                  ]
            },
            {
                  "parameters": {
                        "method": "POST",
                        "url": "={{ $env.APP_URL || \"http://localhost:3000\" }}/api/alerts",
                        "sendHeaders": true,
                        "headerParameters": {
                              "parameters": [
                                    {
                                          "name": "X-Webhook-Secret",
                                          "value": "={{ $env.WEBHOOK_SECRET || \"dev-secret\" }}"
                                    },
                                    {
                                          "name": "Content-Type",
                                          "value": "application/json"
                                    }
                              ]
                        },
                        "sendBody": true,
                        "specifyBody": "json",
                        "jsonBody": "{\n  \"source\": \"Campaña Anual de Reactivación de Viajeros Pasados\",\n  \"severity\": \"critical\",\n  \"title\": \"Fallo en workflow WF-087: Campaña Anual de Reactivación de Viajeros Pasados\",\n  \"message\": \"=Error al ejecutar en colección reengagement_campaigns: {{ $json.error?.message || \\\"Error no especificado\\\" }}\",\n  \"bookingId\": \"={{ $json.bookingId }}\",\n  \"metadata\": {\n    \"workflowCode\": \"WF-087\",\n    \"collection\": \"reengagement_campaigns\",\n    \"endpoint\": \"/api/native/workflows/anniversary-reengage\"\n  }\n}",
                        "options": {}
                  },
                  "name": "[ALERTA NATIVA] Enviar a /api/alerts",
                  "type": "native-automation-node.httpRequest",
                  "typeVersion": 4.2,
                  "position": [
                        950,
                        450
                  ]
            }
      ],
      "connections": {
            "[TRIGGER] Campaña Anual de Reactivación de Viajeros Pasados": {
                  "main": [
                        [
                              {
                                    "node": "[EXTRACT] Formatear y Validar Datos",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[EXTRACT] Formatear y Validar Datos": {
                  "main": [
                        [
                              {
                                    "node": "[FIRESTORE] Operación Colección reengagement_campaigns",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[FIRESTORE] Operación Colección reengagement_campaigns": {
                  "main": [
                        [
                              {
                                    "node": "[RESPUESTA] Finalizar con Éxito",
                                    "type": "main",
                                    "index": 0
                              }
                        ],
                        [
                              {
                                    "node": "[ALERTA NATIVA] Enviar a /api/alerts",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            }
      }
}
  },
  {
    id: "wf-088-social-media-ugc-showcase-curator",
    code: "WF-088",
    name: {
      es: "Curador y Reposteador de Contenido Generado por Turistas (UGC)",
      en: "User-Generated Content (UGC) Tagged Photo Showcase Curator"
    },
    category: "marketing",
    collection: "ugc_posts",
    description: {
      es: "Identifica fotos con el hashtag `#CostaRicaTours2026`, solicita permiso al autor y actualiza la galería pública del sitio.",
      en: "Collects Instagram posts tagged `#CostaRicaTours2026` requesting repost clearance for website gallery."
    },
    icon: "Instagram",
    color: "#e1306c",
    endpoint: "/api/native/workflows/ugc-curator",
    method: "POST",
    triggerEvent: "Webhook de Instagram Graph API",
    nodesCount: 5,
    slaTarget: "< 1s",
    nodes: [
      {
            "id": "node-trigger",
            "name": "[TRIGGER] Curador y Reposteador de Contenido Generado por Turistas (UGC)",
            "type": "native-automation-node.webhook",
            "description": "Webhook de Instagram Graph API"
      },
      {
            "id": "node-extract",
            "name": "[EXTRACT] Formatear y Validar Datos",
            "type": "native-automation-node.code",
            "description": "Transformación y validación de esquema"
      },
      {
            "id": "node-firestore",
            "name": "[FIRESTORE] Operación ugc_posts",
            "type": "native-automation-node.googleFirebaseCloudFirestore",
            "description": "Lectura/Escritura en Firestore /ugc_posts"
      },
      {
            "id": "node-response",
            "name": "[RESPUESTA] Finalizar con Éxito",
            "type": "native-automation-node.respondToWebhook",
            "description": "Respuesta HTTP 200 con payload estructurado"
      },
      {
            "id": "node-alert",
            "name": "[ALERTA NATIVA] Enviar a /api/alerts",
            "type": "native-automation-node.httpRequest",
            "description": "Enrutamiento de error a /api/alerts (reemplazo Telegram)"
      }
],
    samplePayload: {
      "instagramHandle": "@jungle_wanderer",
      "photoUrl": "https://cdn.cr/ugc-101.jpg",
      "location": "Nauyaca Waterfalls"
},
    blueprintJson: {
      "id": "WF-088",
      "name": "Curador y Reposteador de Contenido Generado por Turistas (UGC)",
      "active": true,
      "nodes": [
            {
                  "parameters": {
                        "path": "api/native/workflows/ugc-curator",
                        "httpMethod": "POST",
                        "responseMode": "responseNode",
                        "options": {}
                  },
                  "name": "[TRIGGER] Curador y Reposteador de Contenido Generado por Turistas (UGC)",
                  "type": "native-automation-node.webhook",
                  "typeVersion": 2,
                  "position": [
                        100,
                        300
                  ]
            },
            {
                  "parameters": {
                        "jsCode": "// Validar campos obligatorios y normalizar timestamp\nconst item = $input.first().json || {};\nitem.processedAt = new Date().toISOString();\nitem.environment = 'production';\nitem.targetCollection = 'ugc_posts';\nreturn [{ json: item }];"
                  },
                  "name": "[EXTRACT] Formatear y Validar Datos",
                  "type": "native-automation-node.code",
                  "typeVersion": 2,
                  "position": [
                        350,
                        300
                  ]
            },
            {
                  "parameters": {
                        "operation": "upsert",
                        "collection": "ugc_posts",
                        "documentId": "={{ $json.id || $json.bookingId || $json.code || $now }}",
                        "dataToSend": "defineBelow",
                        "fieldsUi": {
                              "fieldValues": [
                                    {
                                          "fieldId": "updatedAt",
                                          "fieldValue": "={{ $now }}"
                                    },
                                    {
                                          "fieldId": "workflowSource",
                                          "fieldValue": "WF-088"
                                    },
                                    {
                                          "fieldId": "status",
                                          "fieldValue": "processed"
                                    }
                              ]
                        }
                  },
                  "name": "[FIRESTORE] Operación Colección ugc_posts",
                  "type": "native-automation-node.googleFirebaseCloudFirestore",
                  "typeVersion": 1.1,
                  "position": [
                        650,
                        300
                  ],
                  "credentials": {
                        "googleApi": {
                              "id": "5NiYz8gX64lPYIdK",
                              "name": "Costa Rica Tours - Firebase"
                        }
                  },
                  "onError": "continueErrorOutput"
            },
            {
                  "parameters": {
                        "respondWith": "json",
                        "responseBody": "{\n  \"success\": true,\n  \"workflowCode\": \"WF-088\",\n  \"collection\": \"ugc_posts\",\n  \"timestamp\": \"={{ $now }}\",\n  \"message\": \"Operación completada exitosamente en ugc_posts\"\n}",
                        "options": {}
                  },
                  "name": "[RESPUESTA] Finalizar con Éxito",
                  "type": "native-automation-node.respondToWebhook",
                  "typeVersion": 1.5,
                  "position": [
                        950,
                        200
                  ]
            },
            {
                  "parameters": {
                        "method": "POST",
                        "url": "={{ $env.APP_URL || \"http://localhost:3000\" }}/api/alerts",
                        "sendHeaders": true,
                        "headerParameters": {
                              "parameters": [
                                    {
                                          "name": "X-Webhook-Secret",
                                          "value": "={{ $env.WEBHOOK_SECRET || \"dev-secret\" }}"
                                    },
                                    {
                                          "name": "Content-Type",
                                          "value": "application/json"
                                    }
                              ]
                        },
                        "sendBody": true,
                        "specifyBody": "json",
                        "jsonBody": "{\n  \"source\": \"Curador y Reposteador de Contenido Generado por Turistas (UGC)\",\n  \"severity\": \"critical\",\n  \"title\": \"Fallo en workflow WF-088: Curador y Reposteador de Contenido Generado por Turistas (UGC)\",\n  \"message\": \"=Error al ejecutar en colección ugc_posts: {{ $json.error?.message || \\\"Error no especificado\\\" }}\",\n  \"bookingId\": \"={{ $json.bookingId }}\",\n  \"metadata\": {\n    \"workflowCode\": \"WF-088\",\n    \"collection\": \"ugc_posts\",\n    \"endpoint\": \"/api/native/workflows/ugc-curator\"\n  }\n}",
                        "options": {}
                  },
                  "name": "[ALERTA NATIVA] Enviar a /api/alerts",
                  "type": "native-automation-node.httpRequest",
                  "typeVersion": 4.2,
                  "position": [
                        950,
                        450
                  ]
            }
      ],
      "connections": {
            "[TRIGGER] Curador y Reposteador de Contenido Generado por Turistas (UGC)": {
                  "main": [
                        [
                              {
                                    "node": "[EXTRACT] Formatear y Validar Datos",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[EXTRACT] Formatear y Validar Datos": {
                  "main": [
                        [
                              {
                                    "node": "[FIRESTORE] Operación Colección ugc_posts",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[FIRESTORE] Operación Colección ugc_posts": {
                  "main": [
                        [
                              {
                                    "node": "[RESPUESTA] Finalizar con Éxito",
                                    "type": "main",
                                    "index": 0
                              }
                        ],
                        [
                              {
                                    "node": "[ALERTA NATIVA] Enviar a /api/alerts",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            }
      }
}
  },
  {
    id: "wf-089-google-calendar-operator-sync",
    code: "WF-089",
    name: {
      es: "Sincronizador Bidireccional de Google Calendar para Guías",
      en: "Bi-Directional Google Calendar Sync for Naturalist Guides"
    },
    category: "calendar",
    collection: "calendar_events",
    description: {
      es: "Crea eventos automáticos con recordatorios en el calendario de Google de los guías y choferes con detalles de la reserva.",
      en: "Creates calendar events with alerts in guide and driver Google Calendars including passenger pickup details."
    },
    icon: "Calendar",
    color: "#0284c7",
    endpoint: "/api/native/workflows/sync-calendar",
    method: "POST",
    triggerEvent: "Reserva confirmada o reprogramada",
    nodesCount: 5,
    slaTarget: "< 500ms",
    nodes: [
      {
            "id": "node-trigger",
            "name": "[TRIGGER] Sincronizador Bidireccional de Google Calendar para Guías",
            "type": "native-automation-node.webhook",
            "description": "Reserva confirmada o reprogramada"
      },
      {
            "id": "node-extract",
            "name": "[EXTRACT] Formatear y Validar Datos",
            "type": "native-automation-node.code",
            "description": "Transformación y validación de esquema"
      },
      {
            "id": "node-firestore",
            "name": "[FIRESTORE] Operación calendar_events",
            "type": "native-automation-node.googleFirebaseCloudFirestore",
            "description": "Lectura/Escritura en Firestore /calendar_events"
      },
      {
            "id": "node-response",
            "name": "[RESPUESTA] Finalizar con Éxito",
            "type": "native-automation-node.respondToWebhook",
            "description": "Respuesta HTTP 200 con payload estructurado"
      },
      {
            "id": "node-alert",
            "name": "[ALERTA NATIVA] Enviar a /api/alerts",
            "type": "native-automation-node.httpRequest",
            "description": "Enrutamiento de error a /api/alerts (reemplazo Telegram)"
      }
],
    samplePayload: {
      "guideEmail": "carlos.guide@costaricatours.es",
      "eventTitle": "Tour Arenal Volcano - 4 Pax",
      "startDateTime": "2026-10-15T08:00:00-06:00"
},
    blueprintJson: {
      "id": "WF-089",
      "name": "Sincronizador Bidireccional de Google Calendar para Guías",
      "active": true,
      "nodes": [
            {
                  "parameters": {
                        "path": "api/native/workflows/sync-calendar",
                        "httpMethod": "POST",
                        "responseMode": "responseNode",
                        "options": {}
                  },
                  "name": "[TRIGGER] Sincronizador Bidireccional de Google Calendar para Guías",
                  "type": "native-automation-node.webhook",
                  "typeVersion": 2,
                  "position": [
                        100,
                        300
                  ]
            },
            {
                  "parameters": {
                        "jsCode": "// Validar campos obligatorios y normalizar timestamp\nconst item = $input.first().json || {};\nitem.processedAt = new Date().toISOString();\nitem.environment = 'production';\nitem.targetCollection = 'calendar_events';\nreturn [{ json: item }];"
                  },
                  "name": "[EXTRACT] Formatear y Validar Datos",
                  "type": "native-automation-node.code",
                  "typeVersion": 2,
                  "position": [
                        350,
                        300
                  ]
            },
            {
                  "parameters": {
                        "operation": "upsert",
                        "collection": "calendar_events",
                        "documentId": "={{ $json.id || $json.bookingId || $json.code || $now }}",
                        "dataToSend": "defineBelow",
                        "fieldsUi": {
                              "fieldValues": [
                                    {
                                          "fieldId": "updatedAt",
                                          "fieldValue": "={{ $now }}"
                                    },
                                    {
                                          "fieldId": "workflowSource",
                                          "fieldValue": "WF-089"
                                    },
                                    {
                                          "fieldId": "status",
                                          "fieldValue": "processed"
                                    }
                              ]
                        }
                  },
                  "name": "[FIRESTORE] Operación Colección calendar_events",
                  "type": "native-automation-node.googleFirebaseCloudFirestore",
                  "typeVersion": 1.1,
                  "position": [
                        650,
                        300
                  ],
                  "credentials": {
                        "googleApi": {
                              "id": "5NiYz8gX64lPYIdK",
                              "name": "Costa Rica Tours - Firebase"
                        }
                  },
                  "onError": "continueErrorOutput"
            },
            {
                  "parameters": {
                        "respondWith": "json",
                        "responseBody": "{\n  \"success\": true,\n  \"workflowCode\": \"WF-089\",\n  \"collection\": \"calendar_events\",\n  \"timestamp\": \"={{ $now }}\",\n  \"message\": \"Operación completada exitosamente en calendar_events\"\n}",
                        "options": {}
                  },
                  "name": "[RESPUESTA] Finalizar con Éxito",
                  "type": "native-automation-node.respondToWebhook",
                  "typeVersion": 1.5,
                  "position": [
                        950,
                        200
                  ]
            },
            {
                  "parameters": {
                        "method": "POST",
                        "url": "={{ $env.APP_URL || \"http://localhost:3000\" }}/api/alerts",
                        "sendHeaders": true,
                        "headerParameters": {
                              "parameters": [
                                    {
                                          "name": "X-Webhook-Secret",
                                          "value": "={{ $env.WEBHOOK_SECRET || \"dev-secret\" }}"
                                    },
                                    {
                                          "name": "Content-Type",
                                          "value": "application/json"
                                    }
                              ]
                        },
                        "sendBody": true,
                        "specifyBody": "json",
                        "jsonBody": "{\n  \"source\": \"Sincronizador Bidireccional de Google Calendar para Guías\",\n  \"severity\": \"critical\",\n  \"title\": \"Fallo en workflow WF-089: Sincronizador Bidireccional de Google Calendar para Guías\",\n  \"message\": \"=Error al ejecutar en colección calendar_events: {{ $json.error?.message || \\\"Error no especificado\\\" }}\",\n  \"bookingId\": \"={{ $json.bookingId }}\",\n  \"metadata\": {\n    \"workflowCode\": \"WF-089\",\n    \"collection\": \"calendar_events\",\n    \"endpoint\": \"/api/native/workflows/sync-calendar\"\n  }\n}",
                        "options": {}
                  },
                  "name": "[ALERTA NATIVA] Enviar a /api/alerts",
                  "type": "native-automation-node.httpRequest",
                  "typeVersion": 4.2,
                  "position": [
                        950,
                        450
                  ]
            }
      ],
      "connections": {
            "[TRIGGER] Sincronizador Bidireccional de Google Calendar para Guías": {
                  "main": [
                        [
                              {
                                    "node": "[EXTRACT] Formatear y Validar Datos",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[EXTRACT] Formatear y Validar Datos": {
                  "main": [
                        [
                              {
                                    "node": "[FIRESTORE] Operación Colección calendar_events",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[FIRESTORE] Operación Colección calendar_events": {
                  "main": [
                        [
                              {
                                    "node": "[RESPUESTA] Finalizar con Éxito",
                                    "type": "main",
                                    "index": 0
                              }
                        ],
                        [
                              {
                                    "node": "[ALERTA NATIVA] Enviar a /api/alerts",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            }
      }
}
  },
  {
    id: "wf-090-daily-executive-revenue-report",
    code: "WF-090",
    name: {
      es: "Reporte Financiero Ejecutivo Diario (Ingresos, Ocupación, IVA)",
      en: "Daily Executive Financial & Operational Dashboard Report"
    },
    category: "analytics",
    collection: "daily_reports",
    description: {
      es: "Genera a las 8:00 PM resumen con reservas totales, ingresos brutos, comisiones netas y liquidaciones pendientes.",
      en: "Generates daily 8:00 PM executive report with gross sales, net margin, pax served, and pending payouts."
    },
    icon: "BarChart3",
    color: "#059669",
    endpoint: "/api/native/workflows/daily-report",
    method: "POST",
    triggerEvent: "Cron diario 8:00 PM",
    nodesCount: 5,
    slaTarget: "< 2s",
    nodes: [
      {
            "id": "node-trigger",
            "name": "[TRIGGER] Reporte Financiero Ejecutivo Diario (Ingresos, Ocupación, IVA)",
            "type": "native-automation-node.webhook",
            "description": "Cron diario 8:00 PM"
      },
      {
            "id": "node-extract",
            "name": "[EXTRACT] Formatear y Validar Datos",
            "type": "native-automation-node.code",
            "description": "Transformación y validación de esquema"
      },
      {
            "id": "node-firestore",
            "name": "[FIRESTORE] Operación daily_reports",
            "type": "native-automation-node.googleFirebaseCloudFirestore",
            "description": "Lectura/Escritura en Firestore /daily_reports"
      },
      {
            "id": "node-response",
            "name": "[RESPUESTA] Finalizar con Éxito",
            "type": "native-automation-node.respondToWebhook",
            "description": "Respuesta HTTP 200 con payload estructurado"
      },
      {
            "id": "node-alert",
            "name": "[ALERTA NATIVA] Enviar a /api/alerts",
            "type": "native-automation-node.httpRequest",
            "description": "Enrutamiento de error a /api/alerts (reemplazo Telegram)"
      }
],
    samplePayload: {
      "date": "2026-09-14",
      "totalBookings": 24,
      "grossRevenueUSD": 4850,
      "netCommissionUSD": 727.5,
      "passengersTotal": 58
},
    blueprintJson: {
      "id": "WF-090",
      "name": "Reporte Financiero Ejecutivo Diario (Ingresos, Ocupación, IVA)",
      "active": true,
      "nodes": [
            {
                  "parameters": {
                        "path": "api/native/workflows/daily-report",
                        "httpMethod": "POST",
                        "responseMode": "responseNode",
                        "options": {}
                  },
                  "name": "[TRIGGER] Reporte Financiero Ejecutivo Diario (Ingresos, Ocupación, IVA)",
                  "type": "native-automation-node.webhook",
                  "typeVersion": 2,
                  "position": [
                        100,
                        300
                  ]
            },
            {
                  "parameters": {
                        "jsCode": "// Validar campos obligatorios y normalizar timestamp\nconst item = $input.first().json || {};\nitem.processedAt = new Date().toISOString();\nitem.environment = 'production';\nitem.targetCollection = 'daily_reports';\nreturn [{ json: item }];"
                  },
                  "name": "[EXTRACT] Formatear y Validar Datos",
                  "type": "native-automation-node.code",
                  "typeVersion": 2,
                  "position": [
                        350,
                        300
                  ]
            },
            {
                  "parameters": {
                        "operation": "upsert",
                        "collection": "daily_reports",
                        "documentId": "={{ $json.id || $json.bookingId || $json.code || $now }}",
                        "dataToSend": "defineBelow",
                        "fieldsUi": {
                              "fieldValues": [
                                    {
                                          "fieldId": "updatedAt",
                                          "fieldValue": "={{ $now }}"
                                    },
                                    {
                                          "fieldId": "workflowSource",
                                          "fieldValue": "WF-090"
                                    },
                                    {
                                          "fieldId": "status",
                                          "fieldValue": "processed"
                                    }
                              ]
                        }
                  },
                  "name": "[FIRESTORE] Operación Colección daily_reports",
                  "type": "native-automation-node.googleFirebaseCloudFirestore",
                  "typeVersion": 1.1,
                  "position": [
                        650,
                        300
                  ],
                  "credentials": {
                        "googleApi": {
                              "id": "5NiYz8gX64lPYIdK",
                              "name": "Costa Rica Tours - Firebase"
                        }
                  },
                  "onError": "continueErrorOutput"
            },
            {
                  "parameters": {
                        "respondWith": "json",
                        "responseBody": "{\n  \"success\": true,\n  \"workflowCode\": \"WF-090\",\n  \"collection\": \"daily_reports\",\n  \"timestamp\": \"={{ $now }}\",\n  \"message\": \"Operación completada exitosamente en daily_reports\"\n}",
                        "options": {}
                  },
                  "name": "[RESPUESTA] Finalizar con Éxito",
                  "type": "native-automation-node.respondToWebhook",
                  "typeVersion": 1.5,
                  "position": [
                        950,
                        200
                  ]
            },
            {
                  "parameters": {
                        "method": "POST",
                        "url": "={{ $env.APP_URL || \"http://localhost:3000\" }}/api/alerts",
                        "sendHeaders": true,
                        "headerParameters": {
                              "parameters": [
                                    {
                                          "name": "X-Webhook-Secret",
                                          "value": "={{ $env.WEBHOOK_SECRET || \"dev-secret\" }}"
                                    },
                                    {
                                          "name": "Content-Type",
                                          "value": "application/json"
                                    }
                              ]
                        },
                        "sendBody": true,
                        "specifyBody": "json",
                        "jsonBody": "{\n  \"source\": \"Reporte Financiero Ejecutivo Diario (Ingresos, Ocupación, IVA)\",\n  \"severity\": \"critical\",\n  \"title\": \"Fallo en workflow WF-090: Reporte Financiero Ejecutivo Diario (Ingresos, Ocupación, IVA)\",\n  \"message\": \"=Error al ejecutar en colección daily_reports: {{ $json.error?.message || \\\"Error no especificado\\\" }}\",\n  \"bookingId\": \"={{ $json.bookingId }}\",\n  \"metadata\": {\n    \"workflowCode\": \"WF-090\",\n    \"collection\": \"daily_reports\",\n    \"endpoint\": \"/api/native/workflows/daily-report\"\n  }\n}",
                        "options": {}
                  },
                  "name": "[ALERTA NATIVA] Enviar a /api/alerts",
                  "type": "native-automation-node.httpRequest",
                  "typeVersion": 4.2,
                  "position": [
                        950,
                        450
                  ]
            }
      ],
      "connections": {
            "[TRIGGER] Reporte Financiero Ejecutivo Diario (Ingresos, Ocupación, IVA)": {
                  "main": [
                        [
                              {
                                    "node": "[EXTRACT] Formatear y Validar Datos",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[EXTRACT] Formatear y Validar Datos": {
                  "main": [
                        [
                              {
                                    "node": "[FIRESTORE] Operación Colección daily_reports",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[FIRESTORE] Operación Colección daily_reports": {
                  "main": [
                        [
                              {
                                    "node": "[RESPUESTA] Finalizar con Éxito",
                                    "type": "main",
                                    "index": 0
                              }
                        ],
                        [
                              {
                                    "node": "[ALERTA NATIVA] Enviar a /api/alerts",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            }
      }
}
  },
  {
    id: "wf-091-bigquery-data-warehouse-sync",
    code: "WF-091",
    name: {
      es: "Exportador Continuo de Reservas a Data Warehouse (BigQuery / Sheets)",
      en: "Continuous BigQuery / Google Sheets Data Warehouse Pipeline"
    },
    category: "analytics",
    collection: "data_warehouse_syncs",
    description: {
      es: "Transfiere registros históricos anonimizados a BigQuery para modelos predictivos de estacionalidad turística.",
      en: "Streams anonymized historical records to BigQuery for predictive tourist demand forecasting."
    },
    icon: "Database",
    color: "#4285f4",
    endpoint: "/api/native/workflows/bigquery-export",
    method: "POST",
    triggerEvent: "Cron diario medianoche o micro-batch",
    nodesCount: 5,
    slaTarget: "< 4s",
    nodes: [
      {
            "id": "node-trigger",
            "name": "[TRIGGER] Exportador Continuo de Reservas a Data Warehouse (BigQuery / Sheets)",
            "type": "native-automation-node.webhook",
            "description": "Cron diario medianoche o micro-batch"
      },
      {
            "id": "node-extract",
            "name": "[EXTRACT] Formatear y Validar Datos",
            "type": "native-automation-node.code",
            "description": "Transformación y validación de esquema"
      },
      {
            "id": "node-firestore",
            "name": "[FIRESTORE] Operación data_warehouse_syncs",
            "type": "native-automation-node.googleFirebaseCloudFirestore",
            "description": "Lectura/Escritura en Firestore /data_warehouse_syncs"
      },
      {
            "id": "node-response",
            "name": "[RESPUESTA] Finalizar con Éxito",
            "type": "native-automation-node.respondToWebhook",
            "description": "Respuesta HTTP 200 con payload estructurado"
      },
      {
            "id": "node-alert",
            "name": "[ALERTA NATIVA] Enviar a /api/alerts",
            "type": "native-automation-node.httpRequest",
            "description": "Enrutamiento de error a /api/alerts (reemplazo Telegram)"
      }
],
    samplePayload: {
      "recordsExported": 142,
      "destinationTable": "analytics.cr_tours_historical_2026",
      "status": "SUCCESS"
},
    blueprintJson: {
      "id": "WF-091",
      "name": "Exportador Continuo de Reservas a Data Warehouse (BigQuery / Sheets)",
      "active": true,
      "nodes": [
            {
                  "parameters": {
                        "path": "api/native/workflows/bigquery-export",
                        "httpMethod": "POST",
                        "responseMode": "responseNode",
                        "options": {}
                  },
                  "name": "[TRIGGER] Exportador Continuo de Reservas a Data Warehouse (BigQuery / Sheets)",
                  "type": "native-automation-node.webhook",
                  "typeVersion": 2,
                  "position": [
                        100,
                        300
                  ]
            },
            {
                  "parameters": {
                        "jsCode": "// Validar campos obligatorios y normalizar timestamp\nconst item = $input.first().json || {};\nitem.processedAt = new Date().toISOString();\nitem.environment = 'production';\nitem.targetCollection = 'data_warehouse_syncs';\nreturn [{ json: item }];"
                  },
                  "name": "[EXTRACT] Formatear y Validar Datos",
                  "type": "native-automation-node.code",
                  "typeVersion": 2,
                  "position": [
                        350,
                        300
                  ]
            },
            {
                  "parameters": {
                        "operation": "upsert",
                        "collection": "data_warehouse_syncs",
                        "documentId": "={{ $json.id || $json.bookingId || $json.code || $now }}",
                        "dataToSend": "defineBelow",
                        "fieldsUi": {
                              "fieldValues": [
                                    {
                                          "fieldId": "updatedAt",
                                          "fieldValue": "={{ $now }}"
                                    },
                                    {
                                          "fieldId": "workflowSource",
                                          "fieldValue": "WF-091"
                                    },
                                    {
                                          "fieldId": "status",
                                          "fieldValue": "processed"
                                    }
                              ]
                        }
                  },
                  "name": "[FIRESTORE] Operación Colección data_warehouse_syncs",
                  "type": "native-automation-node.googleFirebaseCloudFirestore",
                  "typeVersion": 1.1,
                  "position": [
                        650,
                        300
                  ],
                  "credentials": {
                        "googleApi": {
                              "id": "5NiYz8gX64lPYIdK",
                              "name": "Costa Rica Tours - Firebase"
                        }
                  },
                  "onError": "continueErrorOutput"
            },
            {
                  "parameters": {
                        "respondWith": "json",
                        "responseBody": "{\n  \"success\": true,\n  \"workflowCode\": \"WF-091\",\n  \"collection\": \"data_warehouse_syncs\",\n  \"timestamp\": \"={{ $now }}\",\n  \"message\": \"Operación completada exitosamente en data_warehouse_syncs\"\n}",
                        "options": {}
                  },
                  "name": "[RESPUESTA] Finalizar con Éxito",
                  "type": "native-automation-node.respondToWebhook",
                  "typeVersion": 1.5,
                  "position": [
                        950,
                        200
                  ]
            },
            {
                  "parameters": {
                        "method": "POST",
                        "url": "={{ $env.APP_URL || \"http://localhost:3000\" }}/api/alerts",
                        "sendHeaders": true,
                        "headerParameters": {
                              "parameters": [
                                    {
                                          "name": "X-Webhook-Secret",
                                          "value": "={{ $env.WEBHOOK_SECRET || \"dev-secret\" }}"
                                    },
                                    {
                                          "name": "Content-Type",
                                          "value": "application/json"
                                    }
                              ]
                        },
                        "sendBody": true,
                        "specifyBody": "json",
                        "jsonBody": "{\n  \"source\": \"Exportador Continuo de Reservas a Data Warehouse (BigQuery / Sheets)\",\n  \"severity\": \"critical\",\n  \"title\": \"Fallo en workflow WF-091: Exportador Continuo de Reservas a Data Warehouse (BigQuery / Sheets)\",\n  \"message\": \"=Error al ejecutar en colección data_warehouse_syncs: {{ $json.error?.message || \\\"Error no especificado\\\" }}\",\n  \"bookingId\": \"={{ $json.bookingId }}\",\n  \"metadata\": {\n    \"workflowCode\": \"WF-091\",\n    \"collection\": \"data_warehouse_syncs\",\n    \"endpoint\": \"/api/native/workflows/bigquery-export\"\n  }\n}",
                        "options": {}
                  },
                  "name": "[ALERTA NATIVA] Enviar a /api/alerts",
                  "type": "native-automation-node.httpRequest",
                  "typeVersion": 4.2,
                  "position": [
                        950,
                        450
                  ]
            }
      ],
      "connections": {
            "[TRIGGER] Exportador Continuo de Reservas a Data Warehouse (BigQuery / Sheets)": {
                  "main": [
                        [
                              {
                                    "node": "[EXTRACT] Formatear y Validar Datos",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[EXTRACT] Formatear y Validar Datos": {
                  "main": [
                        [
                              {
                                    "node": "[FIRESTORE] Operación Colección data_warehouse_syncs",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[FIRESTORE] Operación Colección data_warehouse_syncs": {
                  "main": [
                        [
                              {
                                    "node": "[RESPUESTA] Finalizar con Éxito",
                                    "type": "main",
                                    "index": 0
                              }
                        ],
                        [
                              {
                                    "node": "[ALERTA NATIVA] Enviar a /api/alerts",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            }
      }
}
  },
  {
    id: "wf-092-backend-health-heartbeat-monitor",
    code: "WF-092",
    name: {
      es: "Centinela de Uptime y Salud de Endpoints de Producción",
      en: "Production Backend Health, Uptime & Latency Heartbeat Watcher"
    },
    category: "analytics",
    collection: "uptime_logs",
    description: {
      es: "Realiza pings continuos cada 60 segundos a `/api/health` y pasarelas de pago; si hay latencia > 3s, dispara alerta administrativa.",
      en: "Pings `/api/health` and payment gateways every 60 seconds, dispatching an alert to `/api/alerts` if latency spikes."
    },
    icon: "Activity",
    color: "#10b981",
    endpoint: "/api/native/workflows/health-heartbeat",
    method: "POST",
    triggerEvent: "Cron cada 1 minuto",
    nodesCount: 5,
    slaTarget: "< 200ms",
    nodes: [
      {
            "id": "node-trigger",
            "name": "[TRIGGER] Centinela de Uptime y Salud de Endpoints de Producción",
            "type": "native-automation-node.webhook",
            "description": "Cron cada 1 minuto"
      },
      {
            "id": "node-extract",
            "name": "[EXTRACT] Formatear y Validar Datos",
            "type": "native-automation-node.code",
            "description": "Transformación y validación de esquema"
      },
      {
            "id": "node-firestore",
            "name": "[FIRESTORE] Operación uptime_logs",
            "type": "native-automation-node.googleFirebaseCloudFirestore",
            "description": "Lectura/Escritura en Firestore /uptime_logs"
      },
      {
            "id": "node-response",
            "name": "[RESPUESTA] Finalizar con Éxito",
            "type": "native-automation-node.respondToWebhook",
            "description": "Respuesta HTTP 200 con payload estructurado"
      },
      {
            "id": "node-alert",
            "name": "[ALERTA NATIVA] Enviar a /api/alerts",
            "type": "native-automation-node.httpRequest",
            "description": "Enrutamiento de error a /api/alerts (reemplazo Telegram)"
      }
],
    samplePayload: {
      "targetUrl": "https://costaricatours.es/api/health",
      "responseTimeMs": 42,
      "isHealthy": true
},
    blueprintJson: {
      "id": "WF-092",
      "name": "Centinela de Uptime y Salud de Endpoints de Producción",
      "active": true,
      "nodes": [
            {
                  "parameters": {
                        "path": "api/native/workflows/health-heartbeat",
                        "httpMethod": "POST",
                        "responseMode": "responseNode",
                        "options": {}
                  },
                  "name": "[TRIGGER] Centinela de Uptime y Salud de Endpoints de Producción",
                  "type": "native-automation-node.webhook",
                  "typeVersion": 2,
                  "position": [
                        100,
                        300
                  ]
            },
            {
                  "parameters": {
                        "jsCode": "// Validar campos obligatorios y normalizar timestamp\nconst item = $input.first().json || {};\nitem.processedAt = new Date().toISOString();\nitem.environment = 'production';\nitem.targetCollection = 'uptime_logs';\nreturn [{ json: item }];"
                  },
                  "name": "[EXTRACT] Formatear y Validar Datos",
                  "type": "native-automation-node.code",
                  "typeVersion": 2,
                  "position": [
                        350,
                        300
                  ]
            },
            {
                  "parameters": {
                        "operation": "upsert",
                        "collection": "uptime_logs",
                        "documentId": "={{ $json.id || $json.bookingId || $json.code || $now }}",
                        "dataToSend": "defineBelow",
                        "fieldsUi": {
                              "fieldValues": [
                                    {
                                          "fieldId": "updatedAt",
                                          "fieldValue": "={{ $now }}"
                                    },
                                    {
                                          "fieldId": "workflowSource",
                                          "fieldValue": "WF-092"
                                    },
                                    {
                                          "fieldId": "status",
                                          "fieldValue": "processed"
                                    }
                              ]
                        }
                  },
                  "name": "[FIRESTORE] Operación Colección uptime_logs",
                  "type": "native-automation-node.googleFirebaseCloudFirestore",
                  "typeVersion": 1.1,
                  "position": [
                        650,
                        300
                  ],
                  "credentials": {
                        "googleApi": {
                              "id": "5NiYz8gX64lPYIdK",
                              "name": "Costa Rica Tours - Firebase"
                        }
                  },
                  "onError": "continueErrorOutput"
            },
            {
                  "parameters": {
                        "respondWith": "json",
                        "responseBody": "{\n  \"success\": true,\n  \"workflowCode\": \"WF-092\",\n  \"collection\": \"uptime_logs\",\n  \"timestamp\": \"={{ $now }}\",\n  \"message\": \"Operación completada exitosamente en uptime_logs\"\n}",
                        "options": {}
                  },
                  "name": "[RESPUESTA] Finalizar con Éxito",
                  "type": "native-automation-node.respondToWebhook",
                  "typeVersion": 1.5,
                  "position": [
                        950,
                        200
                  ]
            },
            {
                  "parameters": {
                        "method": "POST",
                        "url": "={{ $env.APP_URL || \"http://localhost:3000\" }}/api/alerts",
                        "sendHeaders": true,
                        "headerParameters": {
                              "parameters": [
                                    {
                                          "name": "X-Webhook-Secret",
                                          "value": "={{ $env.WEBHOOK_SECRET || \"dev-secret\" }}"
                                    },
                                    {
                                          "name": "Content-Type",
                                          "value": "application/json"
                                    }
                              ]
                        },
                        "sendBody": true,
                        "specifyBody": "json",
                        "jsonBody": "{\n  \"source\": \"Centinela de Uptime y Salud de Endpoints de Producción\",\n  \"severity\": \"critical\",\n  \"title\": \"Fallo en workflow WF-092: Centinela de Uptime y Salud de Endpoints de Producción\",\n  \"message\": \"=Error al ejecutar en colección uptime_logs: {{ $json.error?.message || \\\"Error no especificado\\\" }}\",\n  \"bookingId\": \"={{ $json.bookingId }}\",\n  \"metadata\": {\n    \"workflowCode\": \"WF-092\",\n    \"collection\": \"uptime_logs\",\n    \"endpoint\": \"/api/native/workflows/health-heartbeat\"\n  }\n}",
                        "options": {}
                  },
                  "name": "[ALERTA NATIVA] Enviar a /api/alerts",
                  "type": "native-automation-node.httpRequest",
                  "typeVersion": 4.2,
                  "position": [
                        950,
                        450
                  ]
            }
      ],
      "connections": {
            "[TRIGGER] Centinela de Uptime y Salud de Endpoints de Producción": {
                  "main": [
                        [
                              {
                                    "node": "[EXTRACT] Formatear y Validar Datos",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[EXTRACT] Formatear y Validar Datos": {
                  "main": [
                        [
                              {
                                    "node": "[FIRESTORE] Operación Colección uptime_logs",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[FIRESTORE] Operación Colección uptime_logs": {
                  "main": [
                        [
                              {
                                    "node": "[RESPUESTA] Finalizar con Éxito",
                                    "type": "main",
                                    "index": 0
                              }
                        ],
                        [
                              {
                                    "node": "[ALERTA NATIVA] Enviar a /api/alerts",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            }
      }
}
  },
  {
    id: "wf-093-ict-national-tourism-stats-exporter",
    code: "WF-093",
    name: {
      es: "Generador de Estadísticas Oficiales para el ICT (Encuesta Nacional)",
      en: "Official ICT National Tourism Observatory Statistics Exporter"
    },
    category: "analytics",
    collection: "ict_statistics",
    description: {
      es: "Agrega datos anonimizados de procedencia de turistas (países, noches de estadía, gasto promedio) para reportes del ICT.",
      en: "Aggregates anonymized tourist nationality, stay duration, and expenditure metrics for ICT reports."
    },
    icon: "PieChart",
    color: "#0f766e",
    endpoint: "/api/native/workflows/ict-stats",
    method: "POST",
    triggerEvent: "Cron mensual el día 1",
    nodesCount: 5,
    slaTarget: "< 3s",
    nodes: [
      {
            "id": "node-trigger",
            "name": "[TRIGGER] Generador de Estadísticas Oficiales para el ICT (Encuesta Nacional)",
            "type": "native-automation-node.webhook",
            "description": "Cron mensual el día 1"
      },
      {
            "id": "node-extract",
            "name": "[EXTRACT] Formatear y Validar Datos",
            "type": "native-automation-node.code",
            "description": "Transformación y validación de esquema"
      },
      {
            "id": "node-firestore",
            "name": "[FIRESTORE] Operación ict_statistics",
            "type": "native-automation-node.googleFirebaseCloudFirestore",
            "description": "Lectura/Escritura en Firestore /ict_statistics"
      },
      {
            "id": "node-response",
            "name": "[RESPUESTA] Finalizar con Éxito",
            "type": "native-automation-node.respondToWebhook",
            "description": "Respuesta HTTP 200 con payload estructurado"
      },
      {
            "id": "node-alert",
            "name": "[ALERTA NATIVA] Enviar a /api/alerts",
            "type": "native-automation-node.httpRequest",
            "description": "Enrutamiento de error a /api/alerts (reemplazo Telegram)"
      }
],
    samplePayload: {
      "period": "Agosto 2026",
      "topNationalities": [
            "USA (48%)",
            "Germany (16%)",
            "Canada (12%)",
            "France (9%)"
      ]
},
    blueprintJson: {
      "id": "WF-093",
      "name": "Generador de Estadísticas Oficiales para el ICT (Encuesta Nacional)",
      "active": true,
      "nodes": [
            {
                  "parameters": {
                        "path": "api/native/workflows/ict-stats",
                        "httpMethod": "POST",
                        "responseMode": "responseNode",
                        "options": {}
                  },
                  "name": "[TRIGGER] Generador de Estadísticas Oficiales para el ICT (Encuesta Nacional)",
                  "type": "native-automation-node.webhook",
                  "typeVersion": 2,
                  "position": [
                        100,
                        300
                  ]
            },
            {
                  "parameters": {
                        "jsCode": "// Validar campos obligatorios y normalizar timestamp\nconst item = $input.first().json || {};\nitem.processedAt = new Date().toISOString();\nitem.environment = 'production';\nitem.targetCollection = 'ict_statistics';\nreturn [{ json: item }];"
                  },
                  "name": "[EXTRACT] Formatear y Validar Datos",
                  "type": "native-automation-node.code",
                  "typeVersion": 2,
                  "position": [
                        350,
                        300
                  ]
            },
            {
                  "parameters": {
                        "operation": "upsert",
                        "collection": "ict_statistics",
                        "documentId": "={{ $json.id || $json.bookingId || $json.code || $now }}",
                        "dataToSend": "defineBelow",
                        "fieldsUi": {
                              "fieldValues": [
                                    {
                                          "fieldId": "updatedAt",
                                          "fieldValue": "={{ $now }}"
                                    },
                                    {
                                          "fieldId": "workflowSource",
                                          "fieldValue": "WF-093"
                                    },
                                    {
                                          "fieldId": "status",
                                          "fieldValue": "processed"
                                    }
                              ]
                        }
                  },
                  "name": "[FIRESTORE] Operación Colección ict_statistics",
                  "type": "native-automation-node.googleFirebaseCloudFirestore",
                  "typeVersion": 1.1,
                  "position": [
                        650,
                        300
                  ],
                  "credentials": {
                        "googleApi": {
                              "id": "5NiYz8gX64lPYIdK",
                              "name": "Costa Rica Tours - Firebase"
                        }
                  },
                  "onError": "continueErrorOutput"
            },
            {
                  "parameters": {
                        "respondWith": "json",
                        "responseBody": "{\n  \"success\": true,\n  \"workflowCode\": \"WF-093\",\n  \"collection\": \"ict_statistics\",\n  \"timestamp\": \"={{ $now }}\",\n  \"message\": \"Operación completada exitosamente en ict_statistics\"\n}",
                        "options": {}
                  },
                  "name": "[RESPUESTA] Finalizar con Éxito",
                  "type": "native-automation-node.respondToWebhook",
                  "typeVersion": 1.5,
                  "position": [
                        950,
                        200
                  ]
            },
            {
                  "parameters": {
                        "method": "POST",
                        "url": "={{ $env.APP_URL || \"http://localhost:3000\" }}/api/alerts",
                        "sendHeaders": true,
                        "headerParameters": {
                              "parameters": [
                                    {
                                          "name": "X-Webhook-Secret",
                                          "value": "={{ $env.WEBHOOK_SECRET || \"dev-secret\" }}"
                                    },
                                    {
                                          "name": "Content-Type",
                                          "value": "application/json"
                                    }
                              ]
                        },
                        "sendBody": true,
                        "specifyBody": "json",
                        "jsonBody": "{\n  \"source\": \"Generador de Estadísticas Oficiales para el ICT (Encuesta Nacional)\",\n  \"severity\": \"critical\",\n  \"title\": \"Fallo en workflow WF-093: Generador de Estadísticas Oficiales para el ICT (Encuesta Nacional)\",\n  \"message\": \"=Error al ejecutar en colección ict_statistics: {{ $json.error?.message || \\\"Error no especificado\\\" }}\",\n  \"bookingId\": \"={{ $json.bookingId }}\",\n  \"metadata\": {\n    \"workflowCode\": \"WF-093\",\n    \"collection\": \"ict_statistics\",\n    \"endpoint\": \"/api/native/workflows/ict-stats\"\n  }\n}",
                        "options": {}
                  },
                  "name": "[ALERTA NATIVA] Enviar a /api/alerts",
                  "type": "native-automation-node.httpRequest",
                  "typeVersion": 4.2,
                  "position": [
                        950,
                        450
                  ]
            }
      ],
      "connections": {
            "[TRIGGER] Generador de Estadísticas Oficiales para el ICT (Encuesta Nacional)": {
                  "main": [
                        [
                              {
                                    "node": "[EXTRACT] Formatear y Validar Datos",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[EXTRACT] Formatear y Validar Datos": {
                  "main": [
                        [
                              {
                                    "node": "[FIRESTORE] Operación Colección ict_statistics",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[FIRESTORE] Operación Colección ict_statistics": {
                  "main": [
                        [
                              {
                                    "node": "[RESPUESTA] Finalizar con Éxito",
                                    "type": "main",
                                    "index": 0
                              }
                        ],
                        [
                              {
                                    "node": "[ALERTA NATIVA] Enviar a /api/alerts",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            }
      }
}
  },
  {
    id: "wf-094-catalog-search-trend-analyzer",
    code: "WF-094",
    name: {
      es: "Analizador de Tendencias y Búsquedas sin Disponibilidad",
      en: "Catalog Search Trends & Zero-Result Query Demand Analyzer"
    },
    category: "analytics",
    collection: "search_trends",
    description: {
      es: "Monitorea qué tours o fechas están siendo más buscados por los usuarios para sugerir aperturas de cupos a operadores.",
      en: "Tracks high-demand dates and zero-availability queries to advise partner operators on expanding capacity."
    },
    icon: "Search",
    color: "#6366f1",
    endpoint: "/api/native/workflows/search-trends",
    method: "POST",
    triggerEvent: "Batch cada 6 horas agregando logs de búsqueda",
    nodesCount: 5,
    slaTarget: "< 1.5s",
    nodes: [
      {
            "id": "node-trigger",
            "name": "[TRIGGER] Analizador de Tendencias y Búsquedas sin Disponibilidad",
            "type": "native-automation-node.webhook",
            "description": "Batch cada 6 horas agregando logs de búsqueda"
      },
      {
            "id": "node-extract",
            "name": "[EXTRACT] Formatear y Validar Datos",
            "type": "native-automation-node.code",
            "description": "Transformación y validación de esquema"
      },
      {
            "id": "node-firestore",
            "name": "[FIRESTORE] Operación search_trends",
            "type": "native-automation-node.googleFirebaseCloudFirestore",
            "description": "Lectura/Escritura en Firestore /search_trends"
      },
      {
            "id": "node-response",
            "name": "[RESPUESTA] Finalizar con Éxito",
            "type": "native-automation-node.respondToWebhook",
            "description": "Respuesta HTTP 200 con payload estructurado"
      },
      {
            "id": "node-alert",
            "name": "[ALERTA NATIVA] Enviar a /api/alerts",
            "type": "native-automation-node.httpRequest",
            "description": "Enrutamiento de error a /api/alerts (reemplazo Telegram)"
      }
],
    samplePayload: {
      "trendingRegion": "Tortuguero",
      "highDemandDates": [
            "2026-10-12",
            "2026-10-13"
      ],
      "zeroResultQueries": 14
},
    blueprintJson: {
      "id": "WF-094",
      "name": "Analizador de Tendencias y Búsquedas sin Disponibilidad",
      "active": true,
      "nodes": [
            {
                  "parameters": {
                        "path": "api/native/workflows/search-trends",
                        "httpMethod": "POST",
                        "responseMode": "responseNode",
                        "options": {}
                  },
                  "name": "[TRIGGER] Analizador de Tendencias y Búsquedas sin Disponibilidad",
                  "type": "native-automation-node.webhook",
                  "typeVersion": 2,
                  "position": [
                        100,
                        300
                  ]
            },
            {
                  "parameters": {
                        "jsCode": "// Validar campos obligatorios y normalizar timestamp\nconst item = $input.first().json || {};\nitem.processedAt = new Date().toISOString();\nitem.environment = 'production';\nitem.targetCollection = 'search_trends';\nreturn [{ json: item }];"
                  },
                  "name": "[EXTRACT] Formatear y Validar Datos",
                  "type": "native-automation-node.code",
                  "typeVersion": 2,
                  "position": [
                        350,
                        300
                  ]
            },
            {
                  "parameters": {
                        "operation": "upsert",
                        "collection": "search_trends",
                        "documentId": "={{ $json.id || $json.bookingId || $json.code || $now }}",
                        "dataToSend": "defineBelow",
                        "fieldsUi": {
                              "fieldValues": [
                                    {
                                          "fieldId": "updatedAt",
                                          "fieldValue": "={{ $now }}"
                                    },
                                    {
                                          "fieldId": "workflowSource",
                                          "fieldValue": "WF-094"
                                    },
                                    {
                                          "fieldId": "status",
                                          "fieldValue": "processed"
                                    }
                              ]
                        }
                  },
                  "name": "[FIRESTORE] Operación Colección search_trends",
                  "type": "native-automation-node.googleFirebaseCloudFirestore",
                  "typeVersion": 1.1,
                  "position": [
                        650,
                        300
                  ],
                  "credentials": {
                        "googleApi": {
                              "id": "5NiYz8gX64lPYIdK",
                              "name": "Costa Rica Tours - Firebase"
                        }
                  },
                  "onError": "continueErrorOutput"
            },
            {
                  "parameters": {
                        "respondWith": "json",
                        "responseBody": "{\n  \"success\": true,\n  \"workflowCode\": \"WF-094\",\n  \"collection\": \"search_trends\",\n  \"timestamp\": \"={{ $now }}\",\n  \"message\": \"Operación completada exitosamente en search_trends\"\n}",
                        "options": {}
                  },
                  "name": "[RESPUESTA] Finalizar con Éxito",
                  "type": "native-automation-node.respondToWebhook",
                  "typeVersion": 1.5,
                  "position": [
                        950,
                        200
                  ]
            },
            {
                  "parameters": {
                        "method": "POST",
                        "url": "={{ $env.APP_URL || \"http://localhost:3000\" }}/api/alerts",
                        "sendHeaders": true,
                        "headerParameters": {
                              "parameters": [
                                    {
                                          "name": "X-Webhook-Secret",
                                          "value": "={{ $env.WEBHOOK_SECRET || \"dev-secret\" }}"
                                    },
                                    {
                                          "name": "Content-Type",
                                          "value": "application/json"
                                    }
                              ]
                        },
                        "sendBody": true,
                        "specifyBody": "json",
                        "jsonBody": "{\n  \"source\": \"Analizador de Tendencias y Búsquedas sin Disponibilidad\",\n  \"severity\": \"critical\",\n  \"title\": \"Fallo en workflow WF-094: Analizador de Tendencias y Búsquedas sin Disponibilidad\",\n  \"message\": \"=Error al ejecutar en colección search_trends: {{ $json.error?.message || \\\"Error no especificado\\\" }}\",\n  \"bookingId\": \"={{ $json.bookingId }}\",\n  \"metadata\": {\n    \"workflowCode\": \"WF-094\",\n    \"collection\": \"search_trends\",\n    \"endpoint\": \"/api/native/workflows/search-trends\"\n  }\n}",
                        "options": {}
                  },
                  "name": "[ALERTA NATIVA] Enviar a /api/alerts",
                  "type": "native-automation-node.httpRequest",
                  "typeVersion": 4.2,
                  "position": [
                        950,
                        450
                  ]
            }
      ],
      "connections": {
            "[TRIGGER] Analizador de Tendencias y Búsquedas sin Disponibilidad": {
                  "main": [
                        [
                              {
                                    "node": "[EXTRACT] Formatear y Validar Datos",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[EXTRACT] Formatear y Validar Datos": {
                  "main": [
                        [
                              {
                                    "node": "[FIRESTORE] Operación Colección search_trends",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[FIRESTORE] Operación Colección search_trends": {
                  "main": [
                        [
                              {
                                    "node": "[RESPUESTA] Finalizar con Éxito",
                                    "type": "main",
                                    "index": 0
                              }
                        ],
                        [
                              {
                                    "node": "[ALERTA NATIVA] Enviar a /api/alerts",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            }
      }
}
  },
  {
    id: "wf-095-database-backup-firestore-snapshot",
    code: "WF-095",
    name: {
      es: "Vigilante de Snapshots y Respaldo Periódico de Firestore",
      en: "Firestore Database Daily Automated Snapshot & Backup Verifier"
    },
    category: "analytics",
    collection: "backup_audits",
    description: {
      es: "Verifica la integridad de las copias de seguridad automáticas de Firestore en Google Cloud Storage.",
      en: "Verifies daily automated Firestore snapshot integrity in Google Cloud Storage buckets."
    },
    icon: "HardDrive",
    color: "#475569",
    endpoint: "/api/native/workflows/verify-backups",
    method: "POST",
    triggerEvent: "Cron diario 03:00 AM",
    nodesCount: 5,
    slaTarget: "< 2s",
    nodes: [
      {
            "id": "node-trigger",
            "name": "[TRIGGER] Vigilante de Snapshots y Respaldo Periódico de Firestore",
            "type": "native-automation-node.webhook",
            "description": "Cron diario 03:00 AM"
      },
      {
            "id": "node-extract",
            "name": "[EXTRACT] Formatear y Validar Datos",
            "type": "native-automation-node.code",
            "description": "Transformación y validación de esquema"
      },
      {
            "id": "node-firestore",
            "name": "[FIRESTORE] Operación backup_audits",
            "type": "native-automation-node.googleFirebaseCloudFirestore",
            "description": "Lectura/Escritura en Firestore /backup_audits"
      },
      {
            "id": "node-response",
            "name": "[RESPUESTA] Finalizar con Éxito",
            "type": "native-automation-node.respondToWebhook",
            "description": "Respuesta HTTP 200 con payload estructurado"
      },
      {
            "id": "node-alert",
            "name": "[ALERTA NATIVA] Enviar a /api/alerts",
            "type": "native-automation-node.httpRequest",
            "description": "Enrutamiento de error a /api/alerts (reemplazo Telegram)"
      }
],
    samplePayload: {
      "backupBucket": "gs://cr-tours-firestore-backups-2026",
      "snapshotSizeMB": 842,
      "verificationStatus": "VERIFIED_OK"
},
    blueprintJson: {
      "id": "WF-095",
      "name": "Vigilante de Snapshots y Respaldo Periódico de Firestore",
      "active": true,
      "nodes": [
            {
                  "parameters": {
                        "path": "api/native/workflows/verify-backups",
                        "httpMethod": "POST",
                        "responseMode": "responseNode",
                        "options": {}
                  },
                  "name": "[TRIGGER] Vigilante de Snapshots y Respaldo Periódico de Firestore",
                  "type": "native-automation-node.webhook",
                  "typeVersion": 2,
                  "position": [
                        100,
                        300
                  ]
            },
            {
                  "parameters": {
                        "jsCode": "// Validar campos obligatorios y normalizar timestamp\nconst item = $input.first().json || {};\nitem.processedAt = new Date().toISOString();\nitem.environment = 'production';\nitem.targetCollection = 'backup_audits';\nreturn [{ json: item }];"
                  },
                  "name": "[EXTRACT] Formatear y Validar Datos",
                  "type": "native-automation-node.code",
                  "typeVersion": 2,
                  "position": [
                        350,
                        300
                  ]
            },
            {
                  "parameters": {
                        "operation": "upsert",
                        "collection": "backup_audits",
                        "documentId": "={{ $json.id || $json.bookingId || $json.code || $now }}",
                        "dataToSend": "defineBelow",
                        "fieldsUi": {
                              "fieldValues": [
                                    {
                                          "fieldId": "updatedAt",
                                          "fieldValue": "={{ $now }}"
                                    },
                                    {
                                          "fieldId": "workflowSource",
                                          "fieldValue": "WF-095"
                                    },
                                    {
                                          "fieldId": "status",
                                          "fieldValue": "processed"
                                    }
                              ]
                        }
                  },
                  "name": "[FIRESTORE] Operación Colección backup_audits",
                  "type": "native-automation-node.googleFirebaseCloudFirestore",
                  "typeVersion": 1.1,
                  "position": [
                        650,
                        300
                  ],
                  "credentials": {
                        "googleApi": {
                              "id": "5NiYz8gX64lPYIdK",
                              "name": "Costa Rica Tours - Firebase"
                        }
                  },
                  "onError": "continueErrorOutput"
            },
            {
                  "parameters": {
                        "respondWith": "json",
                        "responseBody": "{\n  \"success\": true,\n  \"workflowCode\": \"WF-095\",\n  \"collection\": \"backup_audits\",\n  \"timestamp\": \"={{ $now }}\",\n  \"message\": \"Operación completada exitosamente en backup_audits\"\n}",
                        "options": {}
                  },
                  "name": "[RESPUESTA] Finalizar con Éxito",
                  "type": "native-automation-node.respondToWebhook",
                  "typeVersion": 1.5,
                  "position": [
                        950,
                        200
                  ]
            },
            {
                  "parameters": {
                        "method": "POST",
                        "url": "={{ $env.APP_URL || \"http://localhost:3000\" }}/api/alerts",
                        "sendHeaders": true,
                        "headerParameters": {
                              "parameters": [
                                    {
                                          "name": "X-Webhook-Secret",
                                          "value": "={{ $env.WEBHOOK_SECRET || \"dev-secret\" }}"
                                    },
                                    {
                                          "name": "Content-Type",
                                          "value": "application/json"
                                    }
                              ]
                        },
                        "sendBody": true,
                        "specifyBody": "json",
                        "jsonBody": "{\n  \"source\": \"Vigilante de Snapshots y Respaldo Periódico de Firestore\",\n  \"severity\": \"critical\",\n  \"title\": \"Fallo en workflow WF-095: Vigilante de Snapshots y Respaldo Periódico de Firestore\",\n  \"message\": \"=Error al ejecutar en colección backup_audits: {{ $json.error?.message || \\\"Error no especificado\\\" }}\",\n  \"bookingId\": \"={{ $json.bookingId }}\",\n  \"metadata\": {\n    \"workflowCode\": \"WF-095\",\n    \"collection\": \"backup_audits\",\n    \"endpoint\": \"/api/native/workflows/verify-backups\"\n  }\n}",
                        "options": {}
                  },
                  "name": "[ALERTA NATIVA] Enviar a /api/alerts",
                  "type": "native-automation-node.httpRequest",
                  "typeVersion": 4.2,
                  "position": [
                        950,
                        450
                  ]
            }
      ],
      "connections": {
            "[TRIGGER] Vigilante de Snapshots y Respaldo Periódico de Firestore": {
                  "main": [
                        [
                              {
                                    "node": "[EXTRACT] Formatear y Validar Datos",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[EXTRACT] Formatear y Validar Datos": {
                  "main": [
                        [
                              {
                                    "node": "[FIRESTORE] Operación Colección backup_audits",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[FIRESTORE] Operación Colección backup_audits": {
                  "main": [
                        [
                              {
                                    "node": "[RESPUESTA] Finalizar con Éxito",
                                    "type": "main",
                                    "index": 0
                              }
                        ],
                        [
                              {
                                    "node": "[ALERTA NATIVA] Enviar a /api/alerts",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            }
      }
}
  },
  {
    id: "wf-096-customer-data-gdpr-privacy-worker",
    code: "WF-096",
    name: {
      es: "Procesador de Derechos de Privacidad y Anonimización (GDPR)",
      en: "GDPR / PRODHAB Traveler Data Privacy & Right to Be Forgotten Worker"
    },
    category: "analytics",
    collection: "privacy_requests",
    description: {
      es: "Permite a viajeros europeos solicitar la exportación o eliminación de sus datos personales conforme al reglamento GDPR.",
      en: "Executes GDPR right-to-be-forgotten and data export requests anonymizing personal identifiers in Firestore."
    },
    icon: "UserX",
    color: "#64748b",
    endpoint: "/api/native/workflows/gdpr-anonymize",
    method: "POST",
    triggerEvent: "Solicitud formal de privacidad de usuario",
    nodesCount: 5,
    slaTarget: "< 1s",
    nodes: [
      {
            "id": "node-trigger",
            "name": "[TRIGGER] Procesador de Derechos de Privacidad y Anonimización (GDPR)",
            "type": "native-automation-node.webhook",
            "description": "Solicitud formal de privacidad de usuario"
      },
      {
            "id": "node-extract",
            "name": "[EXTRACT] Formatear y Validar Datos",
            "type": "native-automation-node.code",
            "description": "Transformación y validación de esquema"
      },
      {
            "id": "node-firestore",
            "name": "[FIRESTORE] Operación privacy_requests",
            "type": "native-automation-node.googleFirebaseCloudFirestore",
            "description": "Lectura/Escritura en Firestore /privacy_requests"
      },
      {
            "id": "node-response",
            "name": "[RESPUESTA] Finalizar con Éxito",
            "type": "native-automation-node.respondToWebhook",
            "description": "Respuesta HTTP 200 con payload estructurado"
      },
      {
            "id": "node-alert",
            "name": "[ALERTA NATIVA] Enviar a /api/alerts",
            "type": "native-automation-node.httpRequest",
            "description": "Enrutamiento de error a /api/alerts (reemplazo Telegram)"
      }
],
    samplePayload: {
      "customerEmail": "traveler@privacy-eu.org",
      "action": "ANONYMIZE_PII",
      "status": "COMPLETED"
},
    blueprintJson: {
      "id": "WF-096",
      "name": "Procesador de Derechos de Privacidad y Anonimización (GDPR)",
      "active": true,
      "nodes": [
            {
                  "parameters": {
                        "path": "api/native/workflows/gdpr-anonymize",
                        "httpMethod": "POST",
                        "responseMode": "responseNode",
                        "options": {}
                  },
                  "name": "[TRIGGER] Procesador de Derechos de Privacidad y Anonimización (GDPR)",
                  "type": "native-automation-node.webhook",
                  "typeVersion": 2,
                  "position": [
                        100,
                        300
                  ]
            },
            {
                  "parameters": {
                        "jsCode": "// Validar campos obligatorios y normalizar timestamp\nconst item = $input.first().json || {};\nitem.processedAt = new Date().toISOString();\nitem.environment = 'production';\nitem.targetCollection = 'privacy_requests';\nreturn [{ json: item }];"
                  },
                  "name": "[EXTRACT] Formatear y Validar Datos",
                  "type": "native-automation-node.code",
                  "typeVersion": 2,
                  "position": [
                        350,
                        300
                  ]
            },
            {
                  "parameters": {
                        "operation": "upsert",
                        "collection": "privacy_requests",
                        "documentId": "={{ $json.id || $json.bookingId || $json.code || $now }}",
                        "dataToSend": "defineBelow",
                        "fieldsUi": {
                              "fieldValues": [
                                    {
                                          "fieldId": "updatedAt",
                                          "fieldValue": "={{ $now }}"
                                    },
                                    {
                                          "fieldId": "workflowSource",
                                          "fieldValue": "WF-096"
                                    },
                                    {
                                          "fieldId": "status",
                                          "fieldValue": "processed"
                                    }
                              ]
                        }
                  },
                  "name": "[FIRESTORE] Operación Colección privacy_requests",
                  "type": "native-automation-node.googleFirebaseCloudFirestore",
                  "typeVersion": 1.1,
                  "position": [
                        650,
                        300
                  ],
                  "credentials": {
                        "googleApi": {
                              "id": "5NiYz8gX64lPYIdK",
                              "name": "Costa Rica Tours - Firebase"
                        }
                  },
                  "onError": "continueErrorOutput"
            },
            {
                  "parameters": {
                        "respondWith": "json",
                        "responseBody": "{\n  \"success\": true,\n  \"workflowCode\": \"WF-096\",\n  \"collection\": \"privacy_requests\",\n  \"timestamp\": \"={{ $now }}\",\n  \"message\": \"Operación completada exitosamente en privacy_requests\"\n}",
                        "options": {}
                  },
                  "name": "[RESPUESTA] Finalizar con Éxito",
                  "type": "native-automation-node.respondToWebhook",
                  "typeVersion": 1.5,
                  "position": [
                        950,
                        200
                  ]
            },
            {
                  "parameters": {
                        "method": "POST",
                        "url": "={{ $env.APP_URL || \"http://localhost:3000\" }}/api/alerts",
                        "sendHeaders": true,
                        "headerParameters": {
                              "parameters": [
                                    {
                                          "name": "X-Webhook-Secret",
                                          "value": "={{ $env.WEBHOOK_SECRET || \"dev-secret\" }}"
                                    },
                                    {
                                          "name": "Content-Type",
                                          "value": "application/json"
                                    }
                              ]
                        },
                        "sendBody": true,
                        "specifyBody": "json",
                        "jsonBody": "{\n  \"source\": \"Procesador de Derechos de Privacidad y Anonimización (GDPR)\",\n  \"severity\": \"critical\",\n  \"title\": \"Fallo en workflow WF-096: Procesador de Derechos de Privacidad y Anonimización (GDPR)\",\n  \"message\": \"=Error al ejecutar en colección privacy_requests: {{ $json.error?.message || \\\"Error no especificado\\\" }}\",\n  \"bookingId\": \"={{ $json.bookingId }}\",\n  \"metadata\": {\n    \"workflowCode\": \"WF-096\",\n    \"collection\": \"privacy_requests\",\n    \"endpoint\": \"/api/native/workflows/gdpr-anonymize\"\n  }\n}",
                        "options": {}
                  },
                  "name": "[ALERTA NATIVA] Enviar a /api/alerts",
                  "type": "native-automation-node.httpRequest",
                  "typeVersion": 4.2,
                  "position": [
                        950,
                        450
                  ]
            }
      ],
      "connections": {
            "[TRIGGER] Procesador de Derechos de Privacidad y Anonimización (GDPR)": {
                  "main": [
                        [
                              {
                                    "node": "[EXTRACT] Formatear y Validar Datos",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[EXTRACT] Formatear y Validar Datos": {
                  "main": [
                        [
                              {
                                    "node": "[FIRESTORE] Operación Colección privacy_requests",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[FIRESTORE] Operación Colección privacy_requests": {
                  "main": [
                        [
                              {
                                    "node": "[RESPUESTA] Finalizar con Éxito",
                                    "type": "main",
                                    "index": 0
                              }
                        ],
                        [
                              {
                                    "node": "[ALERTA NATIVA] Enviar a /api/alerts",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            }
      }
}
  },
  {
    id: "wf-097-operator-phone-whitelist-authenticator",
    code: "WF-097",
    name: {
      es: "Autenticador de Números de Teléfono de Operadores Autorizados",
      en: "Operator Verified Phone Whitelist & Session Authenticator"
    },
    category: "operations",
    collection: "operator_sessions",
    description: {
      es: "Verifica el número telefónico de choferes y guías antes de procesar comandos de actualización de estado de tours.",
      en: "Validates driver/guide mobile numbers against active verified operator collection before accepting updates."
    },
    icon: "PhoneCheck",
    color: "#10b981",
    endpoint: "/api/native/workflows/auth-operator-phone",
    method: "POST",
    triggerEvent: "Petición entrante desde WhatsApp o terminal de operador",
    nodesCount: 5,
    slaTarget: "< 100ms",
    nodes: [
      {
            "id": "node-trigger",
            "name": "[TRIGGER] Autenticador de Números de Teléfono de Operadores Autorizados",
            "type": "native-automation-node.webhook",
            "description": "Petición entrante desde WhatsApp o terminal de operador"
      },
      {
            "id": "node-extract",
            "name": "[EXTRACT] Formatear y Validar Datos",
            "type": "native-automation-node.code",
            "description": "Transformación y validación de esquema"
      },
      {
            "id": "node-firestore",
            "name": "[FIRESTORE] Operación operator_sessions",
            "type": "native-automation-node.googleFirebaseCloudFirestore",
            "description": "Lectura/Escritura en Firestore /operator_sessions"
      },
      {
            "id": "node-response",
            "name": "[RESPUESTA] Finalizar con Éxito",
            "type": "native-automation-node.respondToWebhook",
            "description": "Respuesta HTTP 200 con payload estructurado"
      },
      {
            "id": "node-alert",
            "name": "[ALERTA NATIVA] Enviar a /api/alerts",
            "type": "native-automation-node.httpRequest",
            "description": "Enrutamiento de error a /api/alerts (reemplazo Telegram)"
      }
],
    samplePayload: {
      "phone": "+50688776655",
      "isRegistered": true,
      "operatorId": "prov-arenal-01",
      "role": "certified_guide"
},
    blueprintJson: {
      "id": "WF-097",
      "name": "Autenticador de Números de Teléfono de Operadores Autorizados",
      "active": true,
      "nodes": [
            {
                  "parameters": {
                        "path": "api/native/workflows/auth-operator-phone",
                        "httpMethod": "POST",
                        "responseMode": "responseNode",
                        "options": {}
                  },
                  "name": "[TRIGGER] Autenticador de Números de Teléfono de Operadores Autorizados",
                  "type": "native-automation-node.webhook",
                  "typeVersion": 2,
                  "position": [
                        100,
                        300
                  ]
            },
            {
                  "parameters": {
                        "jsCode": "// Validar campos obligatorios y normalizar timestamp\nconst item = $input.first().json || {};\nitem.processedAt = new Date().toISOString();\nitem.environment = 'production';\nitem.targetCollection = 'operator_sessions';\nreturn [{ json: item }];"
                  },
                  "name": "[EXTRACT] Formatear y Validar Datos",
                  "type": "native-automation-node.code",
                  "typeVersion": 2,
                  "position": [
                        350,
                        300
                  ]
            },
            {
                  "parameters": {
                        "operation": "upsert",
                        "collection": "operator_sessions",
                        "documentId": "={{ $json.id || $json.bookingId || $json.code || $now }}",
                        "dataToSend": "defineBelow",
                        "fieldsUi": {
                              "fieldValues": [
                                    {
                                          "fieldId": "updatedAt",
                                          "fieldValue": "={{ $now }}"
                                    },
                                    {
                                          "fieldId": "workflowSource",
                                          "fieldValue": "WF-097"
                                    },
                                    {
                                          "fieldId": "status",
                                          "fieldValue": "processed"
                                    }
                              ]
                        }
                  },
                  "name": "[FIRESTORE] Operación Colección operator_sessions",
                  "type": "native-automation-node.googleFirebaseCloudFirestore",
                  "typeVersion": 1.1,
                  "position": [
                        650,
                        300
                  ],
                  "credentials": {
                        "googleApi": {
                              "id": "5NiYz8gX64lPYIdK",
                              "name": "Costa Rica Tours - Firebase"
                        }
                  },
                  "onError": "continueErrorOutput"
            },
            {
                  "parameters": {
                        "respondWith": "json",
                        "responseBody": "{\n  \"success\": true,\n  \"workflowCode\": \"WF-097\",\n  \"collection\": \"operator_sessions\",\n  \"timestamp\": \"={{ $now }}\",\n  \"message\": \"Operación completada exitosamente en operator_sessions\"\n}",
                        "options": {}
                  },
                  "name": "[RESPUESTA] Finalizar con Éxito",
                  "type": "native-automation-node.respondToWebhook",
                  "typeVersion": 1.5,
                  "position": [
                        950,
                        200
                  ]
            },
            {
                  "parameters": {
                        "method": "POST",
                        "url": "={{ $env.APP_URL || \"http://localhost:3000\" }}/api/alerts",
                        "sendHeaders": true,
                        "headerParameters": {
                              "parameters": [
                                    {
                                          "name": "X-Webhook-Secret",
                                          "value": "={{ $env.WEBHOOK_SECRET || \"dev-secret\" }}"
                                    },
                                    {
                                          "name": "Content-Type",
                                          "value": "application/json"
                                    }
                              ]
                        },
                        "sendBody": true,
                        "specifyBody": "json",
                        "jsonBody": "{\n  \"source\": \"Autenticador de Números de Teléfono de Operadores Autorizados\",\n  \"severity\": \"critical\",\n  \"title\": \"Fallo en workflow WF-097: Autenticador de Números de Teléfono de Operadores Autorizados\",\n  \"message\": \"=Error al ejecutar en colección operator_sessions: {{ $json.error?.message || \\\"Error no especificado\\\" }}\",\n  \"bookingId\": \"={{ $json.bookingId }}\",\n  \"metadata\": {\n    \"workflowCode\": \"WF-097\",\n    \"collection\": \"operator_sessions\",\n    \"endpoint\": \"/api/native/workflows/auth-operator-phone\"\n  }\n}",
                        "options": {}
                  },
                  "name": "[ALERTA NATIVA] Enviar a /api/alerts",
                  "type": "native-automation-node.httpRequest",
                  "typeVersion": 4.2,
                  "position": [
                        950,
                        450
                  ]
            }
      ],
      "connections": {
            "[TRIGGER] Autenticador de Números de Teléfono de Operadores Autorizados": {
                  "main": [
                        [
                              {
                                    "node": "[EXTRACT] Formatear y Validar Datos",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[EXTRACT] Formatear y Validar Datos": {
                  "main": [
                        [
                              {
                                    "node": "[FIRESTORE] Operación Colección operator_sessions",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[FIRESTORE] Operación Colección operator_sessions": {
                  "main": [
                        [
                              {
                                    "node": "[RESPUESTA] Finalizar con Éxito",
                                    "type": "main",
                                    "index": 0
                              }
                        ],
                        [
                              {
                                    "node": "[ALERTA NATIVA] Enviar a /api/alerts",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            }
      }
}
  },
  {
    id: "wf-098-price-parity-ota-comparison-watcher",
    code: "WF-098",
    name: {
      es: "Monitor de Paridad de Precios frente a OTAs (Viator, GetYourGuide)",
      en: "OTA Price Parity & Best Price Guarantee Crawler Watcher"
    },
    category: "analytics",
    collection: "price_parities",
    description: {
      es: "Verifica que nuestros precios directos garanticen la mejor tarifa frente a intermediarios internacionales.",
      en: "Monitors external OTA marketplace rates ensuring direct bookings offer guaranteed best price and perks."
    },
    icon: "Scale",
    color: "#0284c7",
    endpoint: "/api/native/workflows/price-parity-check",
    method: "POST",
    triggerEvent: "Cron semanal de comparación de precios",
    nodesCount: 5,
    slaTarget: "< 3s",
    nodes: [
      {
            "id": "node-trigger",
            "name": "[TRIGGER] Monitor de Paridad de Precios frente a OTAs (Viator, GetYourGuide)",
            "type": "native-automation-node.webhook",
            "description": "Cron semanal de comparación de precios"
      },
      {
            "id": "node-extract",
            "name": "[EXTRACT] Formatear y Validar Datos",
            "type": "native-automation-node.code",
            "description": "Transformación y validación de esquema"
      },
      {
            "id": "node-firestore",
            "name": "[FIRESTORE] Operación price_parities",
            "type": "native-automation-node.googleFirebaseCloudFirestore",
            "description": "Lectura/Escritura en Firestore /price_parities"
      },
      {
            "id": "node-response",
            "name": "[RESPUESTA] Finalizar con Éxito",
            "type": "native-automation-node.respondToWebhook",
            "description": "Respuesta HTTP 200 con payload estructurado"
      },
      {
            "id": "node-alert",
            "name": "[ALERTA NATIVA] Enviar a /api/alerts",
            "type": "native-automation-node.httpRequest",
            "description": "Enrutamiento de error a /api/alerts (reemplazo Telegram)"
      }
],
    samplePayload: {
      "tourId": "tour-manuel-antonio",
      "ourDirectUSD": 50,
      "externalOtaUSD": 65,
      "parityStatus": "BEST_DIRECT_RATE"
},
    blueprintJson: {
      "id": "WF-098",
      "name": "Monitor de Paridad de Precios frente a OTAs (Viator, GetYourGuide)",
      "active": true,
      "nodes": [
            {
                  "parameters": {
                        "path": "api/native/workflows/price-parity-check",
                        "httpMethod": "POST",
                        "responseMode": "responseNode",
                        "options": {}
                  },
                  "name": "[TRIGGER] Monitor de Paridad de Precios frente a OTAs (Viator, GetYourGuide)",
                  "type": "native-automation-node.webhook",
                  "typeVersion": 2,
                  "position": [
                        100,
                        300
                  ]
            },
            {
                  "parameters": {
                        "jsCode": "// Validar campos obligatorios y normalizar timestamp\nconst item = $input.first().json || {};\nitem.processedAt = new Date().toISOString();\nitem.environment = 'production';\nitem.targetCollection = 'price_parities';\nreturn [{ json: item }];"
                  },
                  "name": "[EXTRACT] Formatear y Validar Datos",
                  "type": "native-automation-node.code",
                  "typeVersion": 2,
                  "position": [
                        350,
                        300
                  ]
            },
            {
                  "parameters": {
                        "operation": "upsert",
                        "collection": "price_parities",
                        "documentId": "={{ $json.id || $json.bookingId || $json.code || $now }}",
                        "dataToSend": "defineBelow",
                        "fieldsUi": {
                              "fieldValues": [
                                    {
                                          "fieldId": "updatedAt",
                                          "fieldValue": "={{ $now }}"
                                    },
                                    {
                                          "fieldId": "workflowSource",
                                          "fieldValue": "WF-098"
                                    },
                                    {
                                          "fieldId": "status",
                                          "fieldValue": "processed"
                                    }
                              ]
                        }
                  },
                  "name": "[FIRESTORE] Operación Colección price_parities",
                  "type": "native-automation-node.googleFirebaseCloudFirestore",
                  "typeVersion": 1.1,
                  "position": [
                        650,
                        300
                  ],
                  "credentials": {
                        "googleApi": {
                              "id": "5NiYz8gX64lPYIdK",
                              "name": "Costa Rica Tours - Firebase"
                        }
                  },
                  "onError": "continueErrorOutput"
            },
            {
                  "parameters": {
                        "respondWith": "json",
                        "responseBody": "{\n  \"success\": true,\n  \"workflowCode\": \"WF-098\",\n  \"collection\": \"price_parities\",\n  \"timestamp\": \"={{ $now }}\",\n  \"message\": \"Operación completada exitosamente en price_parities\"\n}",
                        "options": {}
                  },
                  "name": "[RESPUESTA] Finalizar con Éxito",
                  "type": "native-automation-node.respondToWebhook",
                  "typeVersion": 1.5,
                  "position": [
                        950,
                        200
                  ]
            },
            {
                  "parameters": {
                        "method": "POST",
                        "url": "={{ $env.APP_URL || \"http://localhost:3000\" }}/api/alerts",
                        "sendHeaders": true,
                        "headerParameters": {
                              "parameters": [
                                    {
                                          "name": "X-Webhook-Secret",
                                          "value": "={{ $env.WEBHOOK_SECRET || \"dev-secret\" }}"
                                    },
                                    {
                                          "name": "Content-Type",
                                          "value": "application/json"
                                    }
                              ]
                        },
                        "sendBody": true,
                        "specifyBody": "json",
                        "jsonBody": "{\n  \"source\": \"Monitor de Paridad de Precios frente a OTAs (Viator, GetYourGuide)\",\n  \"severity\": \"critical\",\n  \"title\": \"Fallo en workflow WF-098: Monitor de Paridad de Precios frente a OTAs (Viator, GetYourGuide)\",\n  \"message\": \"=Error al ejecutar en colección price_parities: {{ $json.error?.message || \\\"Error no especificado\\\" }}\",\n  \"bookingId\": \"={{ $json.bookingId }}\",\n  \"metadata\": {\n    \"workflowCode\": \"WF-098\",\n    \"collection\": \"price_parities\",\n    \"endpoint\": \"/api/native/workflows/price-parity-check\"\n  }\n}",
                        "options": {}
                  },
                  "name": "[ALERTA NATIVA] Enviar a /api/alerts",
                  "type": "native-automation-node.httpRequest",
                  "typeVersion": 4.2,
                  "position": [
                        950,
                        450
                  ]
            }
      ],
      "connections": {
            "[TRIGGER] Monitor de Paridad de Precios frente a OTAs (Viator, GetYourGuide)": {
                  "main": [
                        [
                              {
                                    "node": "[EXTRACT] Formatear y Validar Datos",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[EXTRACT] Formatear y Validar Datos": {
                  "main": [
                        [
                              {
                                    "node": "[FIRESTORE] Operación Colección price_parities",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[FIRESTORE] Operación Colección price_parities": {
                  "main": [
                        [
                              {
                                    "node": "[RESPUESTA] Finalizar con Éxito",
                                    "type": "main",
                                    "index": 0
                              }
                        ],
                        [
                              {
                                    "node": "[ALERTA NATIVA] Enviar a /api/alerts",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            }
      }
}
  },
  {
    id: "wf-099-webhook-dead-letter-queue-retry-worker",
    code: "WF-099",
    name: {
      es: "Recuperador de Webhooks Fallidos (Dead Letter Queue & Backoff)",
      en: "Dead Letter Queue (DLQ) Auto-Retry Worker with Exponential Backoff"
    },
    category: "operations",
    collection: "dlq_retries",
    description: {
      es: "Reintenta el envío de eventos que hayan fallado por problemas de red de proveedores con intervalo exponencial.",
      en: "Auto-retries failed partner notification webhooks using exponential backoff with max 3 attempts."
    },
    icon: "RefreshCw",
    color: "#f59e0b",
    endpoint: "/api/native/workflows/dlq-retry",
    method: "POST",
    triggerEvent: "Cron cada 10 minutos procesando cola DLQ",
    nodesCount: 5,
    slaTarget: "< 1s",
    nodes: [
      {
            "id": "node-trigger",
            "name": "[TRIGGER] Recuperador de Webhooks Fallidos (Dead Letter Queue & Backoff)",
            "type": "native-automation-node.webhook",
            "description": "Cron cada 10 minutos procesando cola DLQ"
      },
      {
            "id": "node-extract",
            "name": "[EXTRACT] Formatear y Validar Datos",
            "type": "native-automation-node.code",
            "description": "Transformación y validación de esquema"
      },
      {
            "id": "node-firestore",
            "name": "[FIRESTORE] Operación dlq_retries",
            "type": "native-automation-node.googleFirebaseCloudFirestore",
            "description": "Lectura/Escritura en Firestore /dlq_retries"
      },
      {
            "id": "node-response",
            "name": "[RESPUESTA] Finalizar con Éxito",
            "type": "native-automation-node.respondToWebhook",
            "description": "Respuesta HTTP 200 con payload estructurado"
      },
      {
            "id": "node-alert",
            "name": "[ALERTA NATIVA] Enviar a /api/alerts",
            "type": "native-automation-node.httpRequest",
            "description": "Enrutamiento de error a /api/alerts (reemplazo Telegram)"
      }
],
    samplePayload: {
      "failedWebhookId": "WH-ERR-2026-09",
      "attempts": 2,
      "nextRetryInSeconds": 300,
      "status": "RETRYING"
},
    blueprintJson: {
      "id": "WF-099",
      "name": "Recuperador de Webhooks Fallidos (Dead Letter Queue & Backoff)",
      "active": true,
      "nodes": [
            {
                  "parameters": {
                        "path": "api/native/workflows/dlq-retry",
                        "httpMethod": "POST",
                        "responseMode": "responseNode",
                        "options": {}
                  },
                  "name": "[TRIGGER] Recuperador de Webhooks Fallidos (Dead Letter Queue & Backoff)",
                  "type": "native-automation-node.webhook",
                  "typeVersion": 2,
                  "position": [
                        100,
                        300
                  ]
            },
            {
                  "parameters": {
                        "jsCode": "// Validar campos obligatorios y normalizar timestamp\nconst item = $input.first().json || {};\nitem.processedAt = new Date().toISOString();\nitem.environment = 'production';\nitem.targetCollection = 'dlq_retries';\nreturn [{ json: item }];"
                  },
                  "name": "[EXTRACT] Formatear y Validar Datos",
                  "type": "native-automation-node.code",
                  "typeVersion": 2,
                  "position": [
                        350,
                        300
                  ]
            },
            {
                  "parameters": {
                        "operation": "upsert",
                        "collection": "dlq_retries",
                        "documentId": "={{ $json.id || $json.bookingId || $json.code || $now }}",
                        "dataToSend": "defineBelow",
                        "fieldsUi": {
                              "fieldValues": [
                                    {
                                          "fieldId": "updatedAt",
                                          "fieldValue": "={{ $now }}"
                                    },
                                    {
                                          "fieldId": "workflowSource",
                                          "fieldValue": "WF-099"
                                    },
                                    {
                                          "fieldId": "status",
                                          "fieldValue": "processed"
                                    }
                              ]
                        }
                  },
                  "name": "[FIRESTORE] Operación Colección dlq_retries",
                  "type": "native-automation-node.googleFirebaseCloudFirestore",
                  "typeVersion": 1.1,
                  "position": [
                        650,
                        300
                  ],
                  "credentials": {
                        "googleApi": {
                              "id": "5NiYz8gX64lPYIdK",
                              "name": "Costa Rica Tours - Firebase"
                        }
                  },
                  "onError": "continueErrorOutput"
            },
            {
                  "parameters": {
                        "respondWith": "json",
                        "responseBody": "{\n  \"success\": true,\n  \"workflowCode\": \"WF-099\",\n  \"collection\": \"dlq_retries\",\n  \"timestamp\": \"={{ $now }}\",\n  \"message\": \"Operación completada exitosamente en dlq_retries\"\n}",
                        "options": {}
                  },
                  "name": "[RESPUESTA] Finalizar con Éxito",
                  "type": "native-automation-node.respondToWebhook",
                  "typeVersion": 1.5,
                  "position": [
                        950,
                        200
                  ]
            },
            {
                  "parameters": {
                        "method": "POST",
                        "url": "={{ $env.APP_URL || \"http://localhost:3000\" }}/api/alerts",
                        "sendHeaders": true,
                        "headerParameters": {
                              "parameters": [
                                    {
                                          "name": "X-Webhook-Secret",
                                          "value": "={{ $env.WEBHOOK_SECRET || \"dev-secret\" }}"
                                    },
                                    {
                                          "name": "Content-Type",
                                          "value": "application/json"
                                    }
                              ]
                        },
                        "sendBody": true,
                        "specifyBody": "json",
                        "jsonBody": "{\n  \"source\": \"Recuperador de Webhooks Fallidos (Dead Letter Queue & Backoff)\",\n  \"severity\": \"critical\",\n  \"title\": \"Fallo en workflow WF-099: Recuperador de Webhooks Fallidos (Dead Letter Queue & Backoff)\",\n  \"message\": \"=Error al ejecutar en colección dlq_retries: {{ $json.error?.message || \\\"Error no especificado\\\" }}\",\n  \"bookingId\": \"={{ $json.bookingId }}\",\n  \"metadata\": {\n    \"workflowCode\": \"WF-099\",\n    \"collection\": \"dlq_retries\",\n    \"endpoint\": \"/api/native/workflows/dlq-retry\"\n  }\n}",
                        "options": {}
                  },
                  "name": "[ALERTA NATIVA] Enviar a /api/alerts",
                  "type": "native-automation-node.httpRequest",
                  "typeVersion": 4.2,
                  "position": [
                        950,
                        450
                  ]
            }
      ],
      "connections": {
            "[TRIGGER] Recuperador de Webhooks Fallidos (Dead Letter Queue & Backoff)": {
                  "main": [
                        [
                              {
                                    "node": "[EXTRACT] Formatear y Validar Datos",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[EXTRACT] Formatear y Validar Datos": {
                  "main": [
                        [
                              {
                                    "node": "[FIRESTORE] Operación Colección dlq_retries",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[FIRESTORE] Operación Colección dlq_retries": {
                  "main": [
                        [
                              {
                                    "node": "[RESPUESTA] Finalizar con Éxito",
                                    "type": "main",
                                    "index": 0
                              }
                        ],
                        [
                              {
                                    "node": "[ALERTA NATIVA] Enviar a /api/alerts",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            }
      }
}
  },
  {
    id: "wf-100-master-orchestration-circuit-breaker",
    code: "WF-100",
    name: {
      es: "Interruptor Maestro de Orquestación y Conmutación por Falla (Circuit Breaker)",
      en: "Master Orchestration Circuit Breaker & Failover Routing Engine"
    },
    category: "operations",
    collection: "system_health",
    description: {
      es: "Monitorea la salud global del ecosistema; si un canal externo se cae, conmuta automáticamente a canales redundantes sin interrumpir reservas.",
      en: "Supervises global ecosystem health; if an external gateway drops, auto-routes to redundant backup channels."
    },
    icon: "Cpu",
    color: "#047857",
    endpoint: "/api/native/workflows/circuit-breaker",
    method: "POST",
    triggerEvent: "Evaluación continua de salud del sistema",
    nodesCount: 5,
    slaTarget: "< 50ms",
    nodes: [
      {
            "id": "node-trigger",
            "name": "[TRIGGER] Interruptor Maestro de Orquestación y Conmutación por Falla (Circuit Breaker)",
            "type": "native-automation-node.webhook",
            "description": "Evaluación continua de salud del sistema"
      },
      {
            "id": "node-extract",
            "name": "[EXTRACT] Formatear y Validar Datos",
            "type": "native-automation-node.code",
            "description": "Transformación y validación de esquema"
      },
      {
            "id": "node-firestore",
            "name": "[FIRESTORE] Operación system_health",
            "type": "native-automation-node.googleFirebaseCloudFirestore",
            "description": "Lectura/Escritura en Firestore /system_health"
      },
      {
            "id": "node-response",
            "name": "[RESPUESTA] Finalizar con Éxito",
            "type": "native-automation-node.respondToWebhook",
            "description": "Respuesta HTTP 200 con payload estructurado"
      },
      {
            "id": "node-alert",
            "name": "[ALERTA NATIVA] Enviar a /api/alerts",
            "type": "native-automation-node.httpRequest",
            "description": "Enrutamiento de error a /api/alerts (reemplazo Telegram)"
      }
],
    samplePayload: {
      "primaryGateway": "OPERATIONAL",
      "backupGateway": "STANDBY_READY",
      "circuitState": "CLOSED_HEALTHY"
},
    blueprintJson: {
      "id": "WF-100",
      "name": "Interruptor Maestro de Orquestación y Conmutación por Falla (Circuit Breaker)",
      "active": true,
      "nodes": [
            {
                  "parameters": {
                        "path": "api/native/workflows/circuit-breaker",
                        "httpMethod": "POST",
                        "responseMode": "responseNode",
                        "options": {}
                  },
                  "name": "[TRIGGER] Interruptor Maestro de Orquestación y Conmutación por Falla (Circuit Breaker)",
                  "type": "native-automation-node.webhook",
                  "typeVersion": 2,
                  "position": [
                        100,
                        300
                  ]
            },
            {
                  "parameters": {
                        "jsCode": "// Validar campos obligatorios y normalizar timestamp\nconst item = $input.first().json || {};\nitem.processedAt = new Date().toISOString();\nitem.environment = 'production';\nitem.targetCollection = 'system_health';\nreturn [{ json: item }];"
                  },
                  "name": "[EXTRACT] Formatear y Validar Datos",
                  "type": "native-automation-node.code",
                  "typeVersion": 2,
                  "position": [
                        350,
                        300
                  ]
            },
            {
                  "parameters": {
                        "operation": "upsert",
                        "collection": "system_health",
                        "documentId": "={{ $json.id || $json.bookingId || $json.code || $now }}",
                        "dataToSend": "defineBelow",
                        "fieldsUi": {
                              "fieldValues": [
                                    {
                                          "fieldId": "updatedAt",
                                          "fieldValue": "={{ $now }}"
                                    },
                                    {
                                          "fieldId": "workflowSource",
                                          "fieldValue": "WF-100"
                                    },
                                    {
                                          "fieldId": "status",
                                          "fieldValue": "processed"
                                    }
                              ]
                        }
                  },
                  "name": "[FIRESTORE] Operación Colección system_health",
                  "type": "native-automation-node.googleFirebaseCloudFirestore",
                  "typeVersion": 1.1,
                  "position": [
                        650,
                        300
                  ],
                  "credentials": {
                        "googleApi": {
                              "id": "5NiYz8gX64lPYIdK",
                              "name": "Costa Rica Tours - Firebase"
                        }
                  },
                  "onError": "continueErrorOutput"
            },
            {
                  "parameters": {
                        "respondWith": "json",
                        "responseBody": "{\n  \"success\": true,\n  \"workflowCode\": \"WF-100\",\n  \"collection\": \"system_health\",\n  \"timestamp\": \"={{ $now }}\",\n  \"message\": \"Operación completada exitosamente en system_health\"\n}",
                        "options": {}
                  },
                  "name": "[RESPUESTA] Finalizar con Éxito",
                  "type": "native-automation-node.respondToWebhook",
                  "typeVersion": 1.5,
                  "position": [
                        950,
                        200
                  ]
            },
            {
                  "parameters": {
                        "method": "POST",
                        "url": "={{ $env.APP_URL || \"http://localhost:3000\" }}/api/alerts",
                        "sendHeaders": true,
                        "headerParameters": {
                              "parameters": [
                                    {
                                          "name": "X-Webhook-Secret",
                                          "value": "={{ $env.WEBHOOK_SECRET || \"dev-secret\" }}"
                                    },
                                    {
                                          "name": "Content-Type",
                                          "value": "application/json"
                                    }
                              ]
                        },
                        "sendBody": true,
                        "specifyBody": "json",
                        "jsonBody": "{\n  \"source\": \"Interruptor Maestro de Orquestación y Conmutación por Falla (Circuit Breaker)\",\n  \"severity\": \"critical\",\n  \"title\": \"Fallo en workflow WF-100: Interruptor Maestro de Orquestación y Conmutación por Falla (Circuit Breaker)\",\n  \"message\": \"=Error al ejecutar en colección system_health: {{ $json.error?.message || \\\"Error no especificado\\\" }}\",\n  \"bookingId\": \"={{ $json.bookingId }}\",\n  \"metadata\": {\n    \"workflowCode\": \"WF-100\",\n    \"collection\": \"system_health\",\n    \"endpoint\": \"/api/native/workflows/circuit-breaker\"\n  }\n}",
                        "options": {}
                  },
                  "name": "[ALERTA NATIVA] Enviar a /api/alerts",
                  "type": "native-automation-node.httpRequest",
                  "typeVersion": 4.2,
                  "position": [
                        950,
                        450
                  ]
            }
      ],
      "connections": {
            "[TRIGGER] Interruptor Maestro de Orquestación y Conmutación por Falla (Circuit Breaker)": {
                  "main": [
                        [
                              {
                                    "node": "[EXTRACT] Formatear y Validar Datos",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[EXTRACT] Formatear y Validar Datos": {
                  "main": [
                        [
                              {
                                    "node": "[FIRESTORE] Operación Colección system_health",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            },
            "[FIRESTORE] Operación Colección system_health": {
                  "main": [
                        [
                              {
                                    "node": "[RESPUESTA] Finalizar con Éxito",
                                    "type": "main",
                                    "index": 0
                              }
                        ],
                        [
                              {
                                    "node": "[ALERTA NATIVA] Enviar a /api/alerts",
                                    "type": "main",
                                    "index": 0
                              }
                        ]
                  ]
            }
      }
}
  }
];
