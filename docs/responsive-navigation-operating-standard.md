# Estándar operativo de navegación responsive — Costa Rica Tours

Fecha de corte: 2026-10-14.

Este documento convierte los problemas observados de desbordamiento, controles fuera de pantalla y efectos de clic que aparecen fuera del área visible en un contrato técnico reutilizable. Complementa `AGENTS.md`; no sustituye servicios de dominio ni cambia reglas de negocio.

## Principios no negociables

1. **El viewport del navegador es el scroll principal.** Evitar shells de aplicación con `max-height: 100vh` + `overflow-y:auto` salvo superficies deliberadamente aisladas.
2. **Una acción visible debe producir un resultado visible.** Si un clic cambia de ruta, el destino empieza arriba. Si abre un panel/modal, ese panel entra dentro del viewport o recibe foco/scroll de forma explícita.
3. **No hay contenido útil fuera del ancho visual.** El scroll horizontal se reserva para carruseles, tablas o barras de chips que lo indiquen y lo contengan localmente. Nunca debe aparecer una barra horizontal a nivel de documento.
4. **Todo overlay se puede cerrar.** X/botón visible, Escape cuando corresponda, foco razonable y tamaño compatible con `dvh`.
5. **Los textos largos envuelven.** IDs, URLs, nombres, etiquetas bilingües y respuestas IA no deben ensanchar tarjetas o layouts.
6. **Sin estados inventados.** Las mejoras visuales no convierten datos pendientes en confirmados.
7. **Accesibilidad y touch.** Objetivos interactivos importantes >=44×44 CSS px, navegación por teclado y contraste según AGENTS.md.

## Matriz mínima automática

El script `scripts/auditResponsiveNavigation.mjs` navega las rutas principales en:

- teléfono 320×568;
- teléfono 360×800;
- teléfono 390×844;
- tablet 768×1024;
- tablet horizontal 1024×768;
- escritorio 1280×720;
- escritorio 1920×1080.

También redimensiona una misma página para detectar layouts que solo se corrigen al recargar, usa rueda vertical y horizontal, recorre enlaces GET internos seguros y falla si encuentra overflow de documento o controles más anchos que el viewport.

## Contrato de revelado de interacción

Para componentes expandibles o flujos por pasos:

- preferir `aria-expanded` + `aria-controls`;
- al abrir contenido fuera de vista, ejecutar `scrollIntoView({block:'nearest'})` o enfocar el encabezado/contenedor con `preventScroll:false`, según el caso;
- no mover el viewport si el resultado ya es visible;
- no usar desplazamiento automático durante entrada de texto;
- modales: centrar en pantallas suficientes y alinear arriba en móviles/corta altura;
- drawers/paneles flotantes: incluir cierre visible y Escape;
- después de cambiar de ruta SPA: `window.scrollTo(0,0)` y foco programático en `#main-content` sin capturar el teclado del usuario.

## Mapas

Los controles del mapa son overlays y no deben bloquear la interacción cartográfica:

- selectores de capas deben caber dentro del viewport y tener X;
- permitir seleccionar múltiples capas antes de cerrar;
- Escape cierra el panel;
- popup/fichas deben tener ancho máximo relativo a viewport;
- excluir canvas/panes internos de Leaflet del detector genérico de overflow;
- no confundir mover/zoom del mapa con scroll accidental de la página.

## Modales, formularios y chat

- `w-full max-w-*` + padding exterior pequeño;
- `max-h` basado en `dvh`, con scroll interno cuando el contenido supera altura;
- encabezados y acciones usan `min-w-0`, `flex-wrap` o grid responsive;
- campos siempre `max-width:100%`;
- botones principales permanecen visibles sin exigir scroll horizontal;
- respuestas IA y URLs usan wrap/break para no ensanchar el panel.

## Política de CI

El workflow `.github/workflows/responsive-navigation-audit.yml` es un gate de regresión. Debe ejecutarse junto con Build & Type Check. Una corrección responsive no se considera terminada si:

- alguna ruta pública da error HTTP/fatal;
- hay overflow global;
- el panel nacional de capas no abre/cierra correctamente;
- una navegación desde una posición profunda deja el destino fuera de vista;
- la compilación o tests contractuales fallan.

El audit es read-only: bloquea POST/PUT/PATCH/DELETE y no debe disparar pagos, reservas, mensajes, mutaciones de proveedor ni formularios reales.
