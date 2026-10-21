# Costa Rica Tours 2026 — Reglas Persistentes del Proyecto y Guía para Agentes AI

Este archivo define las convenciones arquitectónicas, reglas de diseño y directrices de persistencia para cualquier agente de IA o desarrollador que opere sobre la base de código de **Costa Rica Tours 2026**.

---

## 1. Identidad y Alcance del Proyecto
* **Nombre de la Aplicación**: Costa Rica Tours
* **Propósito**: Plataforma oficial de reservas, experiencias ecoturísticas sostenibles y asistencia inteligente al viajero en Costa Rica.
* **Prohibición de Renombramiento**: No renombrar la aplicación ni cambiar su identidad de marca en `metadata.json`, `index.html` o componentes UI.
* **Bilingüismo Oficial**: Todas las interfaces, avisos y errores deben mantener soporte bilingüe prioritario (Español e Inglés) según el estado de idioma activo (`language`).

---

## 2. Principios de Reactividad en Tiempo Real ("Update Everything")
* **Reactividad Inmediata**: Cualquier control deslizante (slider), filtro o selector numérico debe actualizar la interfaz, contadores de resultados y precios en tiempo real sin requerir botones de "Aplicar" ni recargas de página.
* **Enlace Bidireccional**: Los estados compartidos (`maxPrice`, `difficulty`, `region`, `category`, `durationHours`) deben sincronizarse fluidamente entre la barra de búsqueda rápida, el cajón de filtros y las cuadrículas de resultados.
* **Formatos de Divisa**: Mostrar los montos adaptados a la divisa seleccionada (USD y CRC) con cálculos transparentes de IVA y tarifas locales.

---

## 3. Arquitectura Técnica y Entorno de Ejecución
* **Frontend**: React 19 + TypeScript 5.8 + Tailwind CSS v4 + Motion (`motion/react`).
* **Backend**: Express en `server.ts` con Vite como middleware en desarrollo y empaquetado `dist/server.cjs` para producción.
* **Puerto Único**: El servidor se enlaza exclusivamente al puerto `3000` y host `0.0.0.0`.
* **Seguridad de API Keys**:
  * La clave de Gemini (`GEMINI_API_KEY`) y credenciales de Stripe/PayPal permanecen estrictamente en el backend (`server.ts` o servicios de servidor).
  * No exponer variables privadas con prefijo `VITE_`.
* **Compatibilidad de Despliegue**:
  * Mantener `public/_redirects` y `netlify.toml` con reglas SPA de reescritura (`/* /index.html 200`) para evitar errores 404 al recargar rutas en Netlify o Cloud Run.

---

## 4. Automatización nativa con IA y Base de Datos (Firestore)
* **Motor nativo**: la automatización operativa se ejecuta dentro del backend con TypeScript/Node.js, Firestore y los agentes IA.
* **Agentes IA**: `aiAssistantService`, `agentTools`, `agentKnowledgeFabric` y `nativeAutomationEngine` coordinan razonamiento, herramientas y acciones verificables.
* **Eventos y tareas**: los procesos se disparan mediante endpoints, eventos y tareas nativas; no dependen de orquestadores externos.
* **Seguridad**: conservar el modelo Default Deny de Firestore y autenticación/autorización interna para operaciones con efectos persistentes.

## 5. Calidad Visual y Estándares "Anti-Slop"
* **Paleta Natural de Costa Rica**: Tonos esmeralda oscuros (`#041711`, `#051c14`), acentos ámbar/dorado (`#f59e0b`), y toques turquesa/coral para badges de estado.
* **Sin Diseños Genéricos**: Evitar degradados estridentes de púrpura a cian, sombras desproporcionadas o botones sin respuesta háptica/visual.
* **Accesibilidad y Contraste**: Cumplir con WCAG AA (mínimo 4.5:1 para texto de lectura) y etiquetas `aria-label` en controles de icono.

---

## 6. Arquitectura Cognitiva y Agente Autónomo de Reservas 2026 (ReAct + Tools)
* **Directorio Maestro**: Seguir la estructura estandarizada en `/.agents/AGENTS.md` y `/.agents/skills/` con documentación en `docs/guia-agentes-autonomos-reservas-2026.md`.
* **Marco ReAct**: Todo agente conversacional o de voz debe operar bajo el ciclo *Thought* (pensar) -> *Action* (invocar tool) -> *Observation* (leer resultado) -> *Response* (responder con valor comercial).
* **Llamadas Asíncronas No Bloqueantes**: Utilizar Function Calling asíncrono con mensajes keep-alive intermedios para retener al cliente durante consultas pesadas en base de datos.
* **Herramientas Nativas (Tools)**:
  * `check_calendar_availability`: `/api/agent/tools/check_calendar_availability`
  * `create_booking_and_notify`: `/api/agent/tools/create_booking_and_notify`
  * Manifiesto de capacidades: `/api/agent/tools/manifest`
* **Límites de Ejecución (Token Bounds)**: Máximo 2 reintentos en fallas externas antes de escalar. Prohibido ejecutar reembolsos automáticos sin intervención humana.



## 11. Capa de Experiencia Turística Experta de Costa Rica

Todo agente turístico debe utilizar `backend/costaRicaTourismKnowledge.ts` como conocimiento de dominio estable y aplicar sus reglas de razonamiento regional.

### Estándar de conocimiento
- Pensar por regiones, microclimas, logística, perfil del viajero y objetivo del viaje.
- Diferenciar conocimiento estable de datos actuales.
- Disponibilidad, precios, cierres, clima actual, requisitos migratorios, acceso a parques y afirmaciones de proveedores requieren verificación de una fuente actual.
- Priorizar ICT para información turística nacional y SINAC para áreas silvestres protegidas, acceso, conservación y turismo sostenible.
- Nunca inventar disponibilidad, reseñas, certificaciones, alianzas oficiales, operadores, tarifas ni avistamientos de fauna.
- No garantizar encuentros con fauna, condiciones meteorológicas ni tiempos exactos de carretera.
- Optimizar itinerarios por geografía y carga de traslados; evitar zigzags innecesarios.
- Para aventura, comprobar restricciones de edad/tamaño, condiciones de seguridad y requisitos del operador.
- Para familias, accesibilidad, lujo, aventura, naturaleza y cultura, adaptar la recomendación al perfil en vez de aplicar una receta universal.
- Cuando existan varias opciones razonables, explicar los intercambios entre tiempo, costo, intensidad, logística y experiencia.
- Si falta evidencia, marcar el dato como no verificado y escalar a una fuente o herramienta adecuada.

Esta capa aumenta la capacidad de razonamiento de los agentes sin convertir conocimiento estático en falsas garantías operativas.


---

## 12. Ciudad digital nacional y oficina administrativa de agentes (2026-10-11)

El objetivo nuevo es abarcar servicios legítimos de toda Costa Rica, desde perfiles independientes y comunidades hasta organizaciones, espacios públicos, privados y eventos, **sin atribuir representación oficial ni habilitar transacciones hasta verificar derechos y autorizaciones**.

- Antes de crear una entidad, colección o motor: consultar `docs/ciudad-digital-ecosistema-nacional-2026.md`, `docs/arquitectura-ciudad-digital.md` y los servicios ya existentes. No duplicar `bookings`, `tours`, identidades ni herramientas.
- Distinguir publicación informativa de capacidad de contratar/reservar. Los perfiles individuales requieren consentimiento y permisos; los miembros de varias organizaciones no heredan permisos globales.
- La oficina virtual administrativa es una **proyección de eventos verificables**, no un juego que simule actividad. Nunca marcar agentes como `running`/`idle` a partir de su nombre o una pantalla estática. Sin heartbeat/tarea transaccional, mostrar incertidumbre.
- Evitar exposición de contenido privado de viajeros, mensajes internos, secretos y payloads de eventos a través del dashboard, incluso detrás de login.
- Ninguna acción de agentes de IA puede ejecutar reembolsos, modificar permisos, dar de alta organizaciones comerciales o desplegar código sin reglas de autorización, aprobación y auditoría.
- Evaluar nuevas librerías/modelos (OpenAI, Google ADK, Kimi, DeepSeek, Qwen, Temporal, OpenTelemetry, React Flow) como alternativas, no introducirlas en producción ni subir costes sin evaluación técnica y legal.
- **Credenciales:** cualquier archivo de cuenta de servicio con clave privada compartido fuera del gestor de secretos debe tratarse como comprometido; revocar/rotar y utilizar GitHub OIDC + Workload Identity Federation. Nunca copiar su clave al repositorio, documentación ni logs.


---

## 13. Ciudad global y habilidades progresivas

Ver `docs/ciudad-digital-global-skills-2026.md` y `.agents/skills/global-city-onboarding/SKILL.md` antes de modificar registro universal, membresías, geografía global o catálogo internacional.

- Costa Rica es el núcleo existente; el soporte internacional debe ser explícito por país y autorizado por cada jurisdicción, sin afirmar presencia o convenios donde no los hay.
- Un preflight de registro es **solo una comprobación de requisitos**; no verifica la identidad, la representación, la legalidad de venta, el consentimiento contractual, la disponibilidad o el pago, y no guarda registros.
- Nunca dar por publicados, verificados o reservables personas, empresas, comunidades, espacios públicos o privados usando solamente datos introducidos en el navegador o sugeridos por IA.
- Las skills deben seguir el formato Agent Skills `SKILL.md`, cargarse bajo demanda, especificar límites de herramientas y reutilizar `backend/agentTools.ts`; la existencia del archivo no otorga nuevas capacidades de ejecución.
- Si un flujo reporta cupos o pagos sin verificar la respuesta transaccional, priorizar reparación y regresión antes de aumentar la autonomía o habilitar países nuevos. Issue #175 es bloqueo P0.
- Conservar todas las reglas anteriores de protección, auditoría, compatibilidad, CI, idempotencia y autorización.

## 12. Privacidad de proveedores (decisión del negocio)
- El cliente no ve datos que identifiquen al operador antes de reservar: nombre, oficina/dirección, teléfonos, correo, WhatsApp, web, enlaces de fuente, logo. Ubicación, región, pin del mapa y punto de encuentro sí son visibles.
- Catálogo público: `src/data/catalogTours.json` (sin campos de operador). Datos del operador: `data/internal/operatorTourSources.json` (solo servidor, vía `backend/operatorSourcesInternal.ts`). Ambos los genera `npm run catalog:build`.
- Texto neutral: "Operador local seleccionado por Costa Rica Tours" (o "…con declaratoria turística verificada por nuestro equipo" solo si `operatorIctVerified`). Ante preguntas sobre proveedores: "Trabajamos con operadores locales; verificamos su declaratoria turística del ICT antes de confirmar cada reserva." Nunca afirmar que todos están certificados por el ICT.
- `tests/publicOperatorPrivacy.contract.test.ts` y `scripts/auditOperatorPrivacy.mjs` (en `npm run build`) fallan si se filtra un operador.

## 14. Coordinación multiagente
- Antes de empezar cualquier tarea, leer `docs/COORDINACION-AGENTES.md`: reglas fijas, carriles con dueño (Hark / ChatGPT), cómo reclamar un issue (asignarse + etiqueta `en-curso` + rama `hark/` o `gpt/` desde `origin/main`), decisiones del dueño y estado actual.
- PR pequeño, squash con CI verde, nunca force-push a `main`.
