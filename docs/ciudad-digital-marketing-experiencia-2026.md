# Ciudad Digital — Front-end de descubrimiento y conversión por audiencia

Fecha: 2026-10-12. Implementación incremental sin reemplazar el catálogo, las reservas ni el motor de agentes.

## Diagnóstico del producto existente

La pantalla `/ciudad` abre con una metáfora de plaza central y seis distritos. Es distintiva, pero exige que visitantes y proveedores comprendan primero el concepto de "ciudad digital" antes de reconocer qué pueden hacer. La portada `/` ofrece búsqueda turística y un acceso al plano; falta una ruta breve, orientada a tareas, para usuarios de distintos perfiles.

## Evidencia externa estudiada

- [Baymard, *5 UX Best Practices for Travel Sites* (2025)](https://baymard.com/research-articles/travel-site-ux-best-practices): filtros relevantes, información detallada sobre tours, mapas y reseñas verificables; muchas webs de turismo omiten datos necesarios para decidir.
- [Baymard, *Tours and Experiences Booking* (2023)](https://baymard.com/research-articles/tours-and-experiences-launch): 1.700 horas de investigación; fotografías, itinerarios, puntos de encuentro, requisitos y calendarios de reserva afectan la confianza y exploración.
- [Baymard, *Travel Accommodations UX* (2022)](https://baymard.com/research-articles/new-research-travel-accommodations): búsqueda destacada y transparencia del precio, tarifas y condiciones son importantes para la conversión.

Las fuentes son investigación de usabilidad, **no pruebas de mejora de conversión de esta plataforma**. No se atribuyen resultados numéricos propios.

## Cambio implementado: descubrimiento antes que abstracción

Se añade `DigitalCityAudienceHub` a la portada y a `/ciudad`, antes del plano:
1. **Viajeros:** explora tours (`/tours`).
2. **Planificación:** diseña itinerarios (`/itinerary`).
3. **Operadores y negocios:** solicita participar (`/participar`).

Cada bloque tiene una propuesta de valor clara, un solo CTA primario, jerarquía visual y texto de expectativas reales. Accesos secundarios al mapa (`/map`) y asistente (`/ai`) complementan el recorrido. Las rutas ya existen, por lo que no se duplican los servicios de dominio.

La interfaz emplea verde oscuro, acentos ámbar, gradientes ligeros CSS, tipografía fuerte, espacios amplios, superficies de 44px o más, enfoque visible y texto ES/EN. No añade dependencias, imágenes sintéticas ni claims comerciales inventados.

## Fases siguientes (no implementadas aquí)

1. Evaluación de la portada mediante métricas reales y experimentos A/B con consentimiento; eventos sin PII.
2. Auditoría de páginas de tours para información de duración, punto de encuentro, restricciones, cancelación, precio orientativo de catálogo y estado de disponibilidad en vivo.
3. Optimización de fotografías reales, mapa del tour y reseñas solo verificadas; política de licencias y atribución.
4. Landing pages de proveedores con beneficios y criterios reales, etapas de revisión y expectativa de respuesta **sin plazos ficticios**.
5. SEO por destino e intención, enlazado interno, datos estructurados únicamente respaldados por información publicada.
6. Pruebas móviles, lector de pantalla, navegación con teclado y conversiones en sandbox antes de liberar experimentos.

## Límites

No se prometen reservas, afiliaciones, perfiles publicados, ingresos ni disponibilidad. El formulario de participación permanece privado y moderado. No se toca la autenticación ni Firestore. Los cambios deben superar TypeScript, contratos, build y CI antes de merge.
