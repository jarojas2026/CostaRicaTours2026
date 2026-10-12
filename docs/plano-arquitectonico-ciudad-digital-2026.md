# Costa Rica Tours — Plano arquitectónico de experiencia digital
**Revisión:** 11 de octubre de 2026 · **Tipo:** diseño de información y experiencia de usuario, construido sobre el repositorio existente.

## 1. Concepto urbanístico
La ciudad digital es una **metáfora de navegación**, no una representación geográfica, un simulador de personas ni una red de comercios supuestamente verificados. Su plaza central sirve de orientación y sus distritos son áreas funcionales. Costa Rica conserva identidad territorial y turística; expansión a otros países es gradual y requiere reglas locales.

### Plano funcional — Fase visual A
```
┌──────────────────────┬─────────────────────────┬──────────────────────┐
│ 01 EXPERIENCIAS      │                         │ 03 COMUNIDAD         │
│ Catálogo de tours    │                         │ Solicitud privada    │
├──────────────────────┤       PLAZA CENTRAL     ├──────────────────────┤
│ 02 TERRITORIO        │  Orientación y acceso   │ 04 MOVILIDAD         │
│ Mapa turístico       │  a servicios existentes │ Búsqueda de vuelos   │
└──────────────────────┤                         ├──────────────────────┘
                       └─────────────────────────┘
┌─────────────────────────────────┬──────────────────────────────────┐
│ 05 ITINERARIOS                  │ 06 ASISTENCIA IA                 │
│ Planificador                    │ Asesoría conversacional         │
└─────────────────────────────────┴──────────────────────────────────┘
```

**Implementación concreta:**
- `src/pages/DigitalCityArchitecturePage.tsx`, ruta pública `/ciudad`, renderizada como página separada por React Router con lazy loading.
- `src/data/digitalCityDistricts.ts` es el contrato de datos para seis distritos y los destinos de navegación, para no mantener textos/hrefs divergentes.
- `src/components/DigitalCityGateway.tsx` es una puerta de entrada visible desde la portada actual. No reemplaza el Hero ni el buscador, ni los tours destacados.
- Pie de página y `RouteMetadata` llevan a la misma ruta.
- `tests/digitalCityArchitecturalNavigation.test.ts` verifica rutas reales, estructura semántica, navegación y diferenciación del plano conceptual.

## 2. Jerarquía para visitantes
1. **Llegada / Atrio:** una frase clara, opciones primarias `Recorrer la ciudad`, `Solicitar participación` y `Explorar experiencias`.
2. **Plaza / Wayfinding:** mapa esquemático de distritos; selección de distrito mediante botón y una salida real mediante `Link`.
3. **Distrito / Servicio:** se reutilizan páginas existentes; se preservan sus comprobaciones propias de disponibilidad, proveedores y pagos.
4. **Proceso / Continuidad:** si el usuario solicita participación, va a `/participar` con Firebase Auth, consentimiento y revisión; NO se crea perfil público de manera automática.
5. **Ayuda / Supervisión:** `/ai` tiene el asesor; administrador existente conserva `/admin` detrás de `AdminRouteGuard`. La oficina de agentes sigue siendo privada.

## 3. Sistema formal de diseño
- **Tono:** arquitectura tropical contemporánea, precisión técnica y claridad institucional sin imitar un sitio gubernamental.
- **Color:** verdes ya empleados por la plataforma (`#041711`, `#0a2b21`, `#092d23`), oro/ámbar (`#fcd34d`) como llamada a la acción. No modificar branding global ni introducir una segunda paleta independiente.
- **Material:** planos y trazas sutiles con CSS radial/grid, bordes arquitectónicos, geometría central. No fotos sintéticas ni imágenes de lugares sin permiso o fuente.
- **Tipografía:** se heredan las fuentes existentes Fraunces / Work Sans. Titular escalable y textos secundarios legibles.
- **Estructura:** 3 zonas verticales — portada / plano / confianza — y 3 columnas en escritorio, una columna en móvil. Distritos de acceso grande en móvil; la plaza sigue siendo legible sin ratón.
- **Microinteracción:** selección de distrito, estado `aria-pressed`, detalle `aria-live=polite`, enlaces con foco visible. Sin animaciones obligatorias ni canvas pesado.
- **Accesibilidad:** orientar por landmarks `main/nav/section`, títulos jerárquicos, área táctil de al menos 44px para controles principales, contorno de foco visible, navegación mediante teclado, jerarquía de lectura lineal; aspiración WCAG 2.2 AA, **no afirmar auditoría completa de conformidad**.
- **Rendimiento:** sin librerías ni imágenes nuevas y lazy load de la página. CSS ligero; no mapear datos sensibles en el público.

## 4. Estados y verdad comercial
Cada distrito es una **puerta a una función existente**, no evidencia de proveedores o entidades oficiales existentes, calidad, horario, disponibilidad o ingresos. Se rechazan estadísticas, estrellas, cifras de miembros y estados de agentes inventados.

- `/tours`: catálogo disponible, comprobar cupos antes de reservar.
- `/map`: orientación turística, no plano urbanístico real.
- `/participar`: solicitud privada, consentimiento y moderación. No directorio de negocios aprobados.
- `/flights`: búsqueda; rutas, precios, emisión y disponibilidad se verifican con proveedores.
- `/itinerary`: propuestas, no contratos ni reservas automáticas.
- `/ai`: orientación y herramientas acotadas; IA no reemplaza dominio transaccional.

## 5. Núcleo administrativo como edificio de control (existente)
`src/components/AgentOfficeMap.tsx` expone salas por funciones y eventos de Firestore, **no tareas vivas garantizadas**. El próximo paso arquitectónico será agregar:
- un plano de sala de mando que se adapte a móvil;
- contratos `executionId`/`heartbeat`/`status` para estados `running/waiting/failed/stale` reales;
- controles protegidos con permisos y auditoría;
- trazabilidad de aprobaciones administrativas, alertas y reservas.

Ninguna ampliación del plano debe crear un segundo motor IA, otro bookingService o colecciones de identidad duplicadas.

## 6. Plan evolutivo con gates
| Etapa | Diseño y operación | Gate |
| --- | --- | --- |
| A | Plaza visual e hipervínculos reales | CI TypeScript/build/contratos, teclado y móvil |
| B | Directorio de entidades **verificadas** | consentimiento + moderación + origen/fecha de datos; no publicar aspirantes |
| C | Descubrimiento territorial y comunidad | geografía oficial, deduplicación, idioma y derechos de imagen |
| D | Conversión comercial segura | inventario, pago y reembolsos E2E en sandbox, idempotencia, proveedor validado |
| E | Edificio de control de IA | ejecuciones observables y comandos auditados, sin telemetría ficticia |
| F | Expansión internacional | cumplimiento por país, pagos habilitados y soporte reales |

## 7. Pruebas que aún deben realizarse
- Navegación de teclado completa con foco visible; VoiceOver/TalkBack.
- Móvil 320px, 375px, 768px, escritorio y zoom 200%, con el header y bottom nav existentes.
- LCP, CLS y tamaño del chunk lazy cargado; prueba de navegación y recarga directa de `/ciudad`.
- Comportamiento sin red/PWA y entradas de usuarios sin permisos.
- Pruebas integradas de `/participar` con Firebase Auth/Firestore Emulator.

**Referencias de diseño accesible:** [WCAG 2.2](https://www.w3.org/TR/WCAG22/), [landmarks ARIA](https://www.w3.org/WAI/ARIA/apg/patterns/landmarks/), [navegación predecible](https://www.w3.org/WAI/WCAG22/Understanding/predictable).

**Regla irrevocable:** diseñar sobre lo existente; todo lo ilustrado que no sea funcional debe declararse conceptual y nunca hacerse pasar por un servicio real.
