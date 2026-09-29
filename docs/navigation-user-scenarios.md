# Recorridos de usuario — 29 septiembre 2026

## Evidencia en producción antes del cambio

- Inicio → Consultar Arenal → 2 a 3 adultos: total cambia de USD 250 a 375.
- Inicio → Mi viaje: carga correcta en la sesión observada.
- WhatsApp flotante → WhatsApp directo: abre una segunda ventana de IA, falla con backend_gateway_unavailable y afirma una notificación no verificada.
- WhatsApp de cabecera: mismo fallo. Ambas ventanas pueden cerrarse por separado.
- El aviso promocional y lanzadores flotantes cubren accesos en pantalla estrecha.

## Escenarios para verificar sin producir reservas reales

| Perfil | Recorrido | Condición de aceptación |
|---|---|---|
| Familia 2 adultos + 2 niños | Naturaleza → tour → fecha → viajeros → consulta | Respetar edades/restricciones; no inventar disponibilidad |
| Solo | Aventura → 1 adulto → consulta | Total coherente; indicar transporte y mínimos pendientes |
| Grupo de 12 | Playa → fecha → 12 adultos → WhatsApp | Conservar contexto; no afirmar cupos ni tarifa grupal confirmados |
| Pareja | Bosque → presupuesto → comparar → volver | Filtros y navegación utilizables |
| Accesibilidad | Tour → requisitos → asesor | No prometer accesibilidad sin evidencia del operador |
| Sin resultados | Filtros restrictivos → limpiar | Recuperar catálogo sin bloquear pantalla |
| Backend caído | Consulta → fallo → WhatsApp | Mostrar error honesto y alternativa independiente de la IA |
| Pantalla estrecha | Chat → mostrador → Escape → otra ruta | Un solo panel; cierre disponible; sin aviso promocional invasivo |

La prueba automática de 1000 combinaciones verifica exclusivamente la codificación y conservación del contexto en el enlace de WhatsApp. No representa 1000 reservas ni recorridos de navegador completados.

El envío, pago, confirmación del operador y entrega de voucher requieren un entorno de pruebas o autorización puntual. El error de gateway observado sigue siendo una dependencia externa pendiente; estos cambios no lo reparan.

## Auditoría de controles y comprobaciones locales

- Producción: moneda, idioma y menú abren con Enter; los clics de la herramienta no produjeron cambio visible. No se atribuye todavía esa diferencia al código.
- Producción: Mis reservas abre el estado vacío; Favoritos solo regresa al catálogo (acción provisional encontrada en Header).
- Producción: barra inferior Explorar → /, Reservar → /tours, Mi viaje → /trip, Asistente → /ai.
- Producción: Cotizar abre la pestaña de cotización; el lanzador Mostrador abre el mismo panel; cierre por botón funciona.
- Local: Mostrador sustituye al chat (0 chats, 1 mostrador); Escape cierra el mostrador (0).
- Local: WhatsApp directo abre api.whatsapp.com con el número y consulta; cierra el chat y no abre Atención inteligente. No se envió el mensaje.
- TypeScript y 51 pruebas aprobadas antes de añadir el filtro de favoritos.
- Producción: App Móvil abre la guía de instalación y Cerrar guía la cierra. No se instaló la PWA.
- Local: Favoritos abre /tours?favorites=1 con 0 tours y explicación del estado vacío; Ver todos los tours vuelve a /tours.
- Pendientes: instalación PWA efectiva, todos los submenús, todos los enlaces del pie, ratón en pantalla estrecha, reserva end-to-end y gateway en producción.
