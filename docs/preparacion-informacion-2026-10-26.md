# Información y preparación del viaje — 26 de octubre de 2026

Issue #469. Mejora del frontend en `/tools` y `/trip`, conectada con inicio, catálogo, destinos, ficha de tour y herramientas del mapa. No modifica pagos, gateway, backend ni sus activadores pausados.

## Qué funciona

| Función | Comportamiento y límites |
| --- | --- |
| Guía ES/EN | 12 temas, búsqueda por palabras y filtros por tema; URL comparte únicamente el tema público. Referencias editoriales y fecha de revisión. |
| Preparación contextual | Región, actividad, menores y accesibilidad generan preguntas y equipaje sugerido. La fecha distingue próxima salida, jornada de viaje y cierre. No confirma accesos ni condiciones operativas. |
| Pendientes personales | Cada combinación de fechas, región, actividad y necesidades guarda sus propias marcas. Cambiar de contexto no reutiliza marcas antiguas; volver permite recuperarlas. |
| Mi viaje existente | Conserva destino, notas, tareas previas, presupuesto e historial de gastos. No recorta gastos a 30 ni oculta permanentemente los anteriores a los primeros ocho. |
| Fechas | Días civiles válidos y zona `America/Costa_Rica`; distingue viaje finalizado y salida pasada sin regreso definido. El reloj se actualiza por minuto y al volver a la pestaña. |
| Resumen | Vista previa, copiar al portapapeles y alternativa manual si el navegador lo bloquea. Omite notas, contactos y reservas. |
| Calendario | Descarga `.ics` con revisiones personales sugeridas a 14, 7 y 2 días antes, salida y regreso cuando corresponda. Omite eventos pasados. El usuario debe importarlo; no escribe en Google/Outlook ni garantiza notificaciones. |
| Presupuesto | Registro personal, centavos, validación del gasto y aviso si supera el presupuesto. No es contabilidad oficial ni mueve dinero. |
| Guardado | Clave previa `crt_traveler_os_v1`, `privateStorage`, visitantes en sesión del navegador y cuentas aisladas por uid. Comprueba lectura posterior a la escritura y avisa si falla. No sincroniza en la nube. |

La preparación no consulta IA de pago. Conversión monetaria reutiliza el servicio existente y no inventa tasas. El backend sigue pausado: reservas, pagos TEST, mensajes, memoria remota y agentes de operación requieren su disponibilidad y autorización humana. No se habilitan ni se presentan como operativos por esta mejora.

## Información y procedencia

Se retiraron garantías generales de entradas incluidas, potabilidad universal y requisitos fijos sin verificación. El contenido es orientación de preparación; no determina requisitos legales o médicos individuales. Las condiciones actuales deben verificarse antes de viajar.

Se respeta la decisión comercial documentada en `tests/noOutboundTourismLinks.contract.test.ts`: el sitio no redirige a portales turísticos externos. La interfaz muestra institución y tema; esta documentación conserva la trazabilidad editorial, fuera del bundle público.

| Tema | Referencia editorial | Fuente consultada |
| --- | --- | --- |
| `entry` | ICT · Requisitos de entrada | https://www.visitcostarica.com/planning-your-trip/entry-requirements |
| `parks` | SINAC · Compra y reserva | https://www.sinac.go.cr/ES/resvlinea/Paginas/default.aspx |
| `weather` | IMN · Avisos meteorológicos | https://imn.ac.cr/web/imn/avisos-meteorologicos |
| `water` | ICT · Preguntas de viaje | https://www.visitcostarica.com/faq/html/costa-rica.html |
| `adventure` | ICT · Consejos de viaje | https://www.visitcostarica.com/planning-your-trip/tips |
| `wildlife` | SINAC · Visita segura y responsable | https://www.sinac.go.cr/ES/turismo/Documents/Visita%20segura%20y%20responsable.pdf |
| `transport` | ICT · Seguridad en carretera | https://www.visitcostarica.com/planning-your-trip/tips |
| `accessibility` | ICT · Accesibilidad y preguntas | https://www.visitcostarica.com/faqs |
| `budget` | BCCR · Tipo de cambio de referencia | https://www.bccr.fi.cr/ |
| `packing` | ICT · Planificar el viaje | https://es.visitcostarica.com/planning-your-trip |
| `connectivity` | ICT · Información práctica | https://www.visitcostarica.com/travel-trade |
| `culture` | ICT · Planificar experiencias | https://www.visitcostarica.com/planning-your-trip |

El 9-1-1 se cita como emergencia general a partir de los consejos oficiales del ICT; ninguna prueba realiza llamadas. No hay precios, clima, accesos ni disponibilidad en vivo añadidos a la guía.

## Preservación y comprobación

Las versiones anteriores de las dos superficies reemplazadas se conservan en `archive/traveler-information-20261026/`. Los accesos a buses locales y diseño de viaje siguen disponibles; el equipaje manual pasa al panel personal, con sugerencias contextuales.

Pruebas: contratos de fechas, fases, contexto, calendario y privacidad; E2E de filtros, navegación, migración del plan anterior, historial completo, cambios de perfil, guardado bloqueado, descarga y móvil; axe en las dos superficies nuevas ES/EN. Ejecutar los comandos normales del repositorio y consultar el PR para los resultados exactos. No se envían mensajes reales ni reservas en estas pruebas.
