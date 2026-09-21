# 🛎️ Guía de Integración y Operación Oficial • Counter Agent & Mostrador Turístico Digital
### Tours Costa Rica (costaricatours.es) — Versión 2026 Ultra Full-Stack

Esta guía proporciona el manual definitivo de arquitectura, código de integración web, despliegue continuo (Netlify / GitHub), mantenimiento de la base de conocimientos y orquestación con n8n para **Sofía (Counter Agent)**, la experta en reservas y servicio al cliente de Tours Costa Rica.

---

## 1. Código de Integración (Widget Web Autónomo)

Para incrustar el Mostrador Digital en cualquier sitio web (HTML puro, WordPress, Shopify, Webflow, React, etc.), añade el siguiente bloque antes de la etiqueta de cierre `</body>`:

```html
<!-- ========================================== -->
<!-- 🛎️ TOURS COSTA RICA • DIGITAL COUNTER DESK -->
<!-- ========================================== -->
<script 
  src="https://costaricatours.es/counter-widget.js" 
  data-endpoint="https://costaricatours.es/api/agent/counter"
  data-lang="es"
  data-color="#059669">
</script>
```

### Parámetros de Configuración del Script:
| Atributo | Tipo | Por Defecto | Descripción |
| :--- | :--- | :--- | :--- |
| `data-endpoint` | String (URL) | `/api/agent/counter` | URL absoluta o relativa al endpoint del Counter Agent en Express. |
| `data-lang` | `'es' \| 'en'` | `'es'` | Idioma inicial del mostrador. El usuario puede alternar en cualquier momento. |
| `data-color` | String (Hex) | `#059669` | Color primario de acento para botones, burbuja y bordes. |

### Prueba Rápida en Entorno Local o Sandbox:
Puedes abrir y probar el widget directamente visitando:
`https://costaricatours.es/counter-widget.html`

---

## 2. Guía Paso a Paso para Conectar desde Netlify y GitHub

### Paso 2.1 — Estructura del Repositorio en GitHub
Asegúrate de que el repositorio en GitHub contenga:
1. `public/counter-widget.js`: El script del widget compilado y ligero (~14 KB, sin dependencias externas).
2. `public/_redirects`: Regla de enrutamiento SPA para Netlify:
   ```text
   /*    /index.html   200
   ```
3. `netlify.toml`: Configuración de build de Netlify:
   ```toml
   [build]
     publish = "dist"
     command = "npm run build"

   [[redirects]]
     from = "/*"
     to = "/index.html"
     status = 200
   ```

### Paso 2.2 — Configuración de Variables de Entorno en Netlify
En el panel de Netlify (`Site configuration > Environment variables`):
- `GEMINI_API_KEY`: Tu clave de Google AI Studio / Gemini API.
- `VITE_FIREBASE_PROJECT_ID`: ID del proyecto en Firebase.
- `VITE_N8N_WEBHOOK_BASE_URL`: URL base de la instancia n8n (`https://costaricatours2026.app.n8n.cloud`).
- `VITE_N8N_WEBHOOK_SECRET`: Secreto compartido para autenticar los webhooks (`X-Webhook-Secret`).

### Paso 2.3 — Despliegue Automático (CI/CD)
Cada commit a la rama principal (`main` o `master`) en GitHub disparará automáticamente el build en Netlify:
1. Instalación de dependencias: `npm ci`
2. Verificación de tipos y empaquetado: `npm run build`
3. Distribución de activos estáticos en CDN global con HTTP/2 y compresión Brotli.

---

## 3. Instrucciones para Mantener la Base de Conocimientos Actualizada

El Counter Agent extrae su conocimiento de 3 fuentes principales unificadas en el sistema:

### 3.1 — Catálogo de Tours y Tarifas (`src/data/toursData.ts`)
Para agregar o modificar un tour:
1. Abre `src/data/toursData.ts`.
2. Modifica o agrega un objeto de tipo `Tour` respetando estrictamente los campos oficiales:
   - `id`: Identificador kebab-case único (ej. `arenal-volcano-combo`).
   - `title`: `{ es: 'Nombre en Español', en: 'English Title' }`.
   - `priceUSD`: Precio unitario por adulto en dólares americanos (el sistema calcula colones a CRC según `USD_TO_CRC_RATE` configurado automáticamente con el 13% de IVA).
   - `category`: Usa las categorías oficiales en inglés (`'volcanoes' | 'wildlife' | 'canopy' | 'beaches' | 'rafting' | 'culture' | 'multiday' | 'combos'`).
   - `image`: URL o ruta de imagen principal (singular, no `images`).
   - `whatToBring`: `{ es: [...], en: [...] }` con lista de recomendaciones y vestimenta.

### 3.2 — Rutas y Tarifas de Traslados Privados Alsama Tours
El mostrador maneja las rutas terrestres oficiales puerta a puerta con origen en Aeropuerto Internacional Juan Santamaría (SJO) o San José Centro:
- SJO ⇄ La Fortuna / Volcán Arenal: **$170 USD**
- SJO ⇄ Parque Nacional Manuel Antonio / Quepos: **$186 USD**
- SJO ⇄ Jacó / Playa Hermosa: **$143 USD**
- SJO ⇄ Bosque Nuboso Monteverde: **$186 USD**
- SJO ⇄ Guanacaste / Papagayo: **$240 USD**

### 3.3 — Políticas Oficiales de Reserva y Cancelación de la Empresa
El agente comunica y hace cumplir las siguientes condiciones comerciales:
- **Pago Previo**: El servicio debe estar **100% pagado al menos 24 horas antes** de la salida.
- **Cancelaciones**:
  - Más de 72 horas antes: **100% de reembolso garantizado** o cambio de fecha sin costo.
  - De 48 a 72 horas antes: **50% de reembolso** o reprogramación sujeta a cupo del operador local.
  - Menos de 48 horas: **No reembolsable** según la política estándar de los operadores locales.
- **Métodos de Pago**:
  - Tarjetas de crédito/débito (Visa, Mastercard mediante Stripe con 3D-Secure).
  - Transferencia bancaria nacional mediante **SINPE Móvil** (+506 8888-7777 con verificación de comprobante).
  - PayPal para viajeros internacionales.
  - Liquidación en mostrador físico para pasajeros autorizados.

---

## 4. Configuración de n8n para Automatizaciones de Reservas y Notificaciones

Instancia de producción: `https://costaricatours2026.app.n8n.cloud`

### Flujo A: Creación y Confirmación de Reserva (`/webhook/crear-reserva`)
1. **Trigger de Entrada (Webhook Node)**:
   - Método: `POST`
   - Ruta: `/webhook/crear-reserva`
   - Autenticación: Header `X-Webhook-Secret`
2. **Nodo de Validación**:
   - Comprueba existencia de `bookingId`, `tourId`, `date`, `adults`, `customerEmail`, `totalUSD`.
3. **Nodo Firestore**:
   - Colección: `bookings`
   - Operación: Upsert con clave `bookingId`.
4. **Nodo Notificación al Pasajero (SendGrid / Gmail / WhatsApp)**:
   - Envía el voucher digital con código QR adjunto y resumen en 1 oración.
5. **Nodo Despacho a Operador Local**:
   - Notifica a la central de guías y transportistas de Alsama Tours.

### Flujo B: Verificación de Comprobante SINPE Móvil (`/webhook/verificar-sinpe`)
1. **Trigger de Entrada**: Recibe `phone`, `amountCRC`, `referenceNumber`, `bookingId`.
2. **Nodo Comparación**: Cruza el monto recibido contra el saldo pendiente de la reserva en Firestore.
3. **Actualización**: Cambia el `paymentStatus` a `completado` y notifica al cliente inmediatamente.

---

## 5. Protocolo de Comunicación del Agente (ReAct & 1-Sentence Summary)
- **Tono**: Cálido, experto, ultra profesional, nunca robótico, con la hospitalidad Pura Vida.
- **Regla de Cierre Obligatoria**: Al formalizar una reserva o entregar información clave, **el agente siempre concluye con un resumen en 1 oración** de lo pactado.
- **Soporte Bilingüe**: Responde de forma nativa en español o inglés según la preferencia del viajero.
