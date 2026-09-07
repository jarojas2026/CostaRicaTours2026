# Roadmap: Automatización del backend de reservas

> **Nota de origen:** este documento estaba guardado por error como
> `.github/workflows/main.yml`. GitHub intentaba ejecutarlo como una
> automatización real (workflow de CI/CD) en cada push, pero es texto en
> lenguaje natural, no código YAML — por eso siempre fallaba con una ❌ en
> el repositorio. Se movió aquí como documento de referencia el
> 2026-09-07, sin perder el contenido, porque describe correctamente los
> siguientes pasos pendientes del backend.

## Objetivo

Que una reserva se complete de principio a fin **sin intervención
humana** — hoy depende de leer WhatsApp a mano, y eso debe desaparecer.

**Regla más importante:** no modificar ningún componente de
`src/components` ni ningún archivo de UI/frontend. Todo el trabajo va en
`server.ts` y, si hace falta, en archivos nuevos dentro de una carpeta
`backend/`. El frontend ya funciona y no se debe tocar.

## Contexto actual de `server.ts`

- Hay un endpoint que crea reservas y las guarda en
  `const bookings: any[] = []`, un array en memoria que se borra en cada
  reinicio del servidor.
- El campo `paymentStatus` se recibe directo del cliente sin
  verificación.
- Hay una llamada a un webhook de n8n comentada (no activa).
- Hay un endpoint `/api/webhooks/n8n/update-booking` que espera que n8n
  le avise cambios de estado, pero nada lo dispara todavía porque el
  webhook de salida está apagado.

## Pasos a implementar (cada uno probable por separado)

### 1. Persistencia real
Reemplazar el array en memoria por Firestore. Cada reserva nueva debe
escribirse en una colección `bookings` con el mismo `bookingId` que ya
se genera. El endpoint `GET /api/bookings` debe leer desde Firestore, no
del array. No cambiar la forma (shape) del objeto `booking` que ya
existe, para no romper el `AdminDashboard` que lo consume.

### 2. Verificación de pago del lado del servidor
Antes de guardar una reserva con `paymentStatus = "completed"`,
verificar el pago contra la API de PayPal (Orders API / webhook de
PayPal), no contra lo que mande el cliente en el body. Si no se puede
verificar, guardar la reserva con estado `pendiente_pago` en vez de
`completada`.

*(Relacionado: ya se corrigió el equivalente para Stripe — ver el
webhook `/webhook/verificar-pago-reserva` con verificación de firma.)*

### 3. Disparo del webhook a n8n
Activar la llamada POST a n8n que está comentada, mandando el objeto
completo de la reserva apenas se confirma el pago (no antes). Si la
llamada falla, no debe tumbar la creación de la reserva — loguear el
error y seguir.

### 4. Control de disponibilidad
Antes de aceptar una reserva nueva, chequear en Firestore cuántas
reservas existen ya para el mismo `tourId + date + time`, y comparar
contra un campo de cupo máximo del tour (agregarlo a los datos del tour
si no existe). Si no hay cupo, devolver un error claro que el frontend
ya pueda mostrar (status 409, mensaje "sin disponibilidad").

Para cada punto, documentar: qué archivos se tocaron, qué variables de
entorno nuevas hay que configurar en Cloud Run (si alguna), y cómo
probarlo manualmente antes de publicar.

## Después del backend: workflow en n8n (fuera de AI Studio/Claude)

Una vez activo el webhook del paso 3, armar directamente en la interfaz
de n8n un workflow que reciba ese webhook y:

1. Mande confirmación automática al cliente (WhatsApp Business API o
   email).
2. Notifique al operador (WhatsApp, email o Slack).
3. Cree el evento en un calendario, si se usa para coordinar
   operadores.

Este workflow de n8n no se genera en AI Studio ni en Claude — se arma
directo en la interfaz de n8n. Lo descrito arriba es lo que le da los
datos necesarios para funcionar.

## Contexto de negocio

Costa Rica Tours es una plataforma que vende los tours que ofrecen en
todo Costa Rica los proveedores de servicios turísticos, alojamiento y
transporte — incluyendo potencialmente miles de productos de distintos
proveedores, no solo tours propios.
