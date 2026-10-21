---
name: create_booking_and_notify
description: Registra la solicitud de reserva y devuelve su estado real (pendiente de confirmación del operador y del pago). No emite voucher QR.
---

# Habilidad: Creador de Citas y Reservas (Appointment & Booking Creator)

Esta herramienta registra la solicitud de reserva y devuelve su estado real. El agente solo comunica lo que la herramienta confirme (solicitud registrada, pendiente de confirmación del operador y del pago); nunca promete voucher QR ni confirmaciones no devueltas.

## Definición de Esquema JSON (Function Calling)

```json
{
  "name": "create_booking_and_notify",
  "description": "Registra la solicitud de reserva y devuelve su estado real (pendiente de confirmación del operador y del pago). No emite voucher QR.",
  "parameters": {
    "type": "object",
    "properties": {
      "customer_name": {
        "type": "string",
        "description": "Nombre completo del cliente."
      },
      "customer_email": {
        "type": "string",
        "description": "Correo electrónico de contacto del cliente."
      },
      "customer_phone": {
        "type": "string",
        "description": "Teléfono o número de WhatsApp con código de país (+506...)."
      },
      "appointment_datetime": {
        "type": "string",
        "description": "Fecha y hora confirmada en formato ISO 8601 (ej. '2026-09-15T08:00:00-06:00')."
      },
      "service_type": {
        "type": "string",
        "description": "El tipo de servicio o nombre del tour reservado."
      },
      "tour_id": {
        "type": "string",
        "description": "Identificador único del tour."
      },
      "party_size": {
        "type": "integer",
        "description": "Número de personas que asistirán al tour."
      },
      "total_usd": {
        "type": "number",
        "description": "Monto total acordado en USD."
      }
    },
    "required": ["customer_name", "customer_email", "appointment_datetime", "service_type"]
  }
}
```

## Endpoint de Servicio
- **Método**: `POST`
- **Ruta**: `/api/agent/tools/create_booking_and_notify`
- **Cabecera**: `Content-Type: application/json`

## Ejemplo de Respuesta
```json
{
  "success": true,
  "booking_id": "CR-2026-98234",
  "customer_name": "Carlos Rodríguez",
  "tour_name": "Tour Guiado Parque Nacional Manuel Antonio",
  "datetime": "2026-09-15T08:00:00-06:00",
  "status": "confirmed",
  "calendar_synced": true,
  "qr_voucher_url": "https://costaricatours.netlify.app/voucher/CR-2026-98234",
  "message": "Reserva confirmada con éxito. Voucher enviado por correo y WhatsApp."
}
```
