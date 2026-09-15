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

## 4. Automatización con n8n y Base de Datos (Firestore)
* **Instancia n8n**: `costaricatours2026.app.n8n.cloud`.
* **Flujos de Trabajo**: Mantener la compatibilidad con los 12 workflows documentados en `workflow-status.md` (pagos a operadores, confirmación de reservas, evaluación antifraude, notificaciones multicanal).
* **Cabeceras de Webhook**: Toda petición hacia endpoints de webhook debe incluir la cabecera de autenticación `X-Webhook-Secret`.
* **Reglas de Firestore (`firestore.rules`)**:
  * Conservar el modelo *Default Deny* (`allow read, write: if false;`).
  * Toda creación o actualización de reserva debe validar el usuario autenticado (`request.auth.uid`) y pasar la validación estricta de esquema y campos.

---

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

