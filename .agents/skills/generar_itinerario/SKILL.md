---
name: generar_itinerario
description: Diseña itinerarios de viaje completos, realistas y optimizados logísticamente para Costa Rica (3 a 14 días), con tours reales, traslados privados y tiempos de desplazamiento verificados.
---

# Skill: Generador de Itinerarios Multidía Costa Rica

## Cuándo Utilizar Esta Herramienta
- El usuario solicita recomendaciones de viaje para varios días ("itinerario de 5 días", "viajo 1 semana con mi familia", "qué hacer en Costa Rica 7 días").
- Se requiere planificar traslados coordinados entre destinos (San José, La Fortuna/Arenal, Monteverde, Manuel Antonio, Tortuguero, Guanacaste).
- Se necesita estimar presupuestos totales de viaje (USD/CRC) y lista de equipaje recomendada.

## Definición de Herramienta (Tool Definition)
- **Endpoint**: `/api/agent/tools/generate_custom_itinerary`
- **Método HTTP**: `POST`
- **Parámetros**:
  ```json
  {
    "days": 5,
    "travelers": 2,
    "style": "Aventura y Naturaleza | Relax y Termales | Familiar | Lujo",
    "budget": "Económico | Medio | Lujo Boutique",
    "group": "Pareja | Solo | Familia | Grupo de Amigos",
    "language": "es | en",
    "special_requests": "texto opcional con solicitudes especiales"
  }
  ```

## Ciclo ReAct Esperado
1. **Thought**: "El viajero solicita una propuesta de viaje de 5 días para 2 personas en busca de aventura. Voy a generar el itinerario maestro validado."
2. **Action**: `generate_custom_itinerary({ days: 5, travelers: 2, style: "Aventura y Naturaleza" })`
3. **Observation**: Recibir JSON con `itinerary_title`, `days_plan`, `estimated_budget_usd`, `packing_list`.
4. **Response**: Presentar el plan día a día estructurado, destacando traslados, actividades y ofreciendo el botón de confirmación de reserva directa.
