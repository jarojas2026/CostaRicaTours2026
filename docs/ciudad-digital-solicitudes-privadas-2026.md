# Ciudad digital — Fase 2: solicitudes privadas y revisión administrativa

**Estado de entrega:** código en PR, no presumir desplegado hasta validar CI. **Fecha:** 2026-10-11.

## Alcance
La preevaluación introducida en `backend/digitalCityRegistrationPolicy.ts` continúa siendo una operación sin escrituras. Esta fase añade:
- La página pública bilingüe `/participar`, con inicio de sesión Google de alcance básico y correo verificado.
- `POST /api/digital-city/applications` para enviar una solicitud privada después de validar `ready_for_moderation`.
- `GET /api/digital-city/applications/mine` para consultar únicamente las solicitudes del UID autenticado.
- `GET /api/digital-city/applications/admin/queue` y `POST /api/digital-city/applications/admin/:id/triage` exclusivamente para administradores verificados, sin aprobar publicaciones.
- `DigitalCityReviewQueue` dentro de `AdminControlCenterPage`, ya protegido por `AdminRouteGuard`.

## Arquitectura existente que se reutiliza
- **Identidad:** Firebase Auth y `backend/firebaseAdminRuntime.ts`, sin credenciales nuevas ni confiar en un UID enviado por el navegador.
- **Almacenamiento:** `getFirestoreDb()` de `backend/bookingService.ts`; Firestore Default Deny mantiene bloqueada la escritura directa a las colecciones nuevas desde clientes.
- **Autorización del administrador:** `requireOperator` con rol estricto `admin` y token Firebase: una simple clave de operador no permite moderar.
- **Control de abuso:** `generalApiLimiter`, límite HTTP de 10/hora en escritura y cuota atómica de 3 expedientes nuevos por cuenta y día.
- **Validación de entrada:** `evaluateDigitalCityRegistration`, tipos conocidos, país, localidad, representación declarada y consentimiento. La representación **no queda verificada** por declarar un checkbox.

## Almacenamiento y protección
Colección privada de solicitudes `digital_city_applications` (necesaria: no existe equivalente genérico; no mezclar con operadores verificados). Referencia estable `dca_<hash>` calculada con UID del token y los datos clave de la entidad para reintentos idempotentes.
La cuota diaria usa `digital_city_application_quotas`. La moderación añade registros en `digital_city_application_audit`, en la misma transacción Firestore.
Se guardan: UID del solicitante, nombre de entidad, país, localidad, tipo, fuente pública declarada, declaración de representación y consentimiento, estado, fechas y motivo de revisión. **No se almacenan** contraseñas, documentos de identidad, imágenes, números de tarjeta, datos de otros perfiles ni datos de pago.

Estados en esta fase: `submitted`, `under_review`, `needs_information`, `rejected`. No existe transición a `published`, `verified`, `provider_active` ni `bookable`. Banderas `publishable=false`, `bookable=false`, `paymentEnabled=false` se establecen únicamente desde el servidor.

## Límites y próximos requisitos
1. **Pendiente:** consentimiento legal definitivo, aviso de privacidad específico, políticas de conservación, derecho de supresión/rectificación y revisión por legislación local para expansión fuera de CR. No promover esta página como inscripción comercial certificada sin ello.
2. **Pendiente:** edición/reenvío del expediente que quedó `needs_information`, notificaciones, verificación documental y permisos de membresía por organización.
3. **Pendiente:** revisión pública editorial antes de una publicación informativa; además verificación comercial independiente antes de inventario/pagos.
4. **Pendiente:** pruebas E2E contra Firebase Emulator y flujos de email verificado, cierres de sesión, errores de almacenamiento y reglas. Los tests incluidos cubren transacciones con un doble aislado; no son E2E.
5. **Pendiente:** métricas y paginación administrativa; la bandeja muestra hasta 50 solicitudes de dos estados, sin confundir esos números con cifras globales.

## Gates
`npm run test:contracts`, `npm run lint`, `npm run build`, CI y seguridad; revisión de permisos/privacidad antes de merge. No modificar directamente `operators`, `proveedores`, `tours`, `bookings`, `payments` ni `traveler_identities`.
