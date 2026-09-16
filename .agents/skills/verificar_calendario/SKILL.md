---
name: check_calendar_availability
description: Consulta el calendario de Google y la base de datos de Costa Rica Tours para obtener los horarios y cupos disponibles en una fecha específica.
---

# Habilidad: Comprobador de Disponibilidad de Calendario (Availability Checker)

Esta herramienta permite al agente autónomo verificar en tiempo real si hay cupos libres para un tour o actividad en Costa Rica en una fecha y duración específica.

## Definición de Esquema JSON (Function Calling)

```json
{
  "name": "check_calendar_availability",
  "description": "Consulta el calendario de Google y el inventario de Costa Rica Tours para obtener horarios y cupos disponibles en una fecha específica.",
  "parameters": {
    "type": "object",
    "properties": {
      "target_date": {
        "type": "string",
        "description": "La fecha solicitada por el usuario en formato YYYY-MM-DD."
      },
      "service_duration_minutes": {
        "type": "integer",
        "description": "Duración estimada del servicio en minutos (por ejemplo 180 para 3 horas)."
      },
      "tour_id": {
        "type": "string",
        "description": "Identificador opcional del tour (ej. 'manuel-antonio-national-park', 'arenal-volcano-hike')."
      },
      "party_size": {
        "type": "integer",
        "description": "Cantidad de personas solicitadas."
      }
    },
    "required": ["target_date", "service_duration_minutes"]
  }
}
```

## Endpoint de Servicio
- **Método**: `POST`
- **Ruta**: `/api/agent/tools/check_calendar_availability`
- **Cabecera**: `Content-Type: application/json`

## Ejemplo de Respuesta
```json
{
  "available": true,
  "target_date": "2026-09-15",
  "available_slots": ["07:00", "08:30", "13:00"],
  "blocked_slots": ["10:30"],
  "remaining_seats": 14,
  "closest_alternatives": ["08:30", "13:00"],
  "message": "Cupos confirmados para la fecha solicitada."
}
```
