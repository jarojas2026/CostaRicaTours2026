# Auditoría de consolidación y Agent Desk — 30 de septiembre de 2026

Esta bitácora continúa las decisiones de `docs/despliegues-canonicos.md`, `docs/portable-voice-agent-desk.md` y las auditorías anteriores. Conserva el trabajo existente y distingue código comprobado localmente de servicios externos que todavía no se pueden validar desde el repositorio.

## Estado ejecutivo

| Área | Evidencia observada | Estado |
| --- | --- | --- |
| Frontend público | `https://costaricatours2026.vercel.app/` respondió HTTP 200 el 30-Sep-2026 15:41 UTC; el sitio y su catálogo se renderizan | Disponible como escaparate |
| API / Cloud Run privado | `/api/health` y `/api/tours` respondieron HTTP 503 `backend_gateway_unavailable` el 30-Sep-2026 15:41 UTC; los logs de Vercel señalan que falta `GCP_WIF_AUDIENCE` | Bloqueado; no anunciar reservas, consultas automáticas ni Agent Desk como operativos |
| Vercel | Una app/proyecto de producción `costaricatours2026`, conectada a `main`; el despliegue observado usó SHA `29e433e52326f65a3126327cbcd57957810939e9` | Unificado del lado Vercel; la API sigue degradada |
| Agent Desk | Los webhooks y el cerebro conversacional existen en `backend/voiceAgentDeskService.ts` y `server.ts`; se endurecieron firmas, estados y recuperación de llamadas | Código mejorado; falta configurar el proveedor telefónico y probar una llamada real |
| Cloud Run | La configuración del repo declara `costa-rica-tours`, proyecto `gen-lang-client-0782739149`, región `us-central1` | Estado actual, revisión y tráfico no se pudieron confirmar desde la consola de Google Cloud |

La respuesta 503 se produce en la puerta de Vercel antes de poder afirmar que Cloud Run recibió la petición. La corrección de seguridad es restaurar las variables de producción `GCP_WIF_AUDIENCE`, `GCP_WIF_SERVICE_ACCOUNT` y `CLOUD_RUN_BACKEND_URL`, comprobar audiencia/proveedor WIF y después validar que Cloud Run continúe privado. No habilitar invocación anónima para ocultar el error.

## Recorrido de cliente: reserva y solicitud de información

Auditoría de solo lectura realizada sobre el sitio público el 30-Sep-2026. Se abrió la portada, el Mostrador Digital y el cotizador; no se enviaron datos personales, no se creó una reserva y no se inició un pago.

| Paso visto por el viajero | Resultado | Qué falta para completarlo |
| --- | --- | --- |
| Abrir la portada y explorar tours | HTTP 200; catálogo renderiza nombres y tarifas | El sitio funciona como escaparate, pero el catálogo en vivo del API no está disponible (HTTP 503). No se puede confirmar que el catálogo, precio mostrado y cupos estén actualizados. |
| Consultar disponibilidad desde el Mostrador | La fecha es obligatoria; sin fecha el botón queda desactivado | La interfaz decía “con el operador / en tiempo real”, pero el endpoint implementado sólo consulta cupos registrados en Firestore y reservas locales, no una respuesta en vivo del operador. El texto del Mostrador se ajustó en este cambio para decirlo claramente. |
| Solicitar información desde el formulario | El formulario enviaba al ciclo `customer-intake`, pero marcaba la solicitud como enviada inmediatamente, incluso si la API fallaba; nombre, correo y mensaje podían ir vacíos y no había teléfono | Se corrigió el estado para esperar el resultado real de la API, exigir mensaje y al menos un medio de contacto (correo o teléfono), y añadir teléfono/WhatsApp. La confirmación de recibido incluirá ID cuando el servidor lo devuelva. Este cambio aún no está desplegado. |
| Crear una reserva desde detalle/cotizador | El front exige fecha, nombre y correo; el backend sólo confirma tras persistencia/cupo y los pagos regresan para verificación | En producción el POST `/api/bookings` no es alcanzable por la puerta 503. Después de reparar WIF, aún se deben probar disponibilidad real, precio canónico, todos los métodos de pago y confirmación del operador en una compra de prueba sin cobro real. |
| Pago y confirmación final | El código distingue pago verificado, confirmación del proveedor y reserva final | No confundir “solicitud recibida”, “pago verificado” y “operador confirmó”. No se validaron credenciales ni se hizo una compra real. |

Otros puntos visibles que reducen conversiones o confianza: la página usa el dominio actual `costaricatours2026.vercel.app`, pero el pie y algunos mensajes de WhatsApp mencionan `costaricatours.es`; se debe confirmar si `.es` es una propiedad/dominio oficial antes de cambiar o publicitar otra dirección. El sitio repite frases de reembolso garantizado a 48 horas, disponibilidad “100% verificada” y disponibilidad garantizada, que no se pudieron comprobar operativamente y no concuerdan con el backend caído. Esta rama suaviza esas promesas para explicar que el operador confirma condiciones y disponibilidad. En el cotizador se observó un combo de Poás/Doka/La Paz con precios/listados cercanos de USD 115 y USD 145; definir un ID, tarifa y texto canónicos antes de recibir pagos. La pestaña de navegador no permitió probar el endpoint de cupos porque el cambio de fecha del control nativo no activó el estado React; además, el API 503 ya bloquea cualquier resultado de extremo a extremo.

### Criterio de listo para reservas y consultas

1. Restituir WIF en Vercel y confirmar `/api/health`, `/api/tours`, `/api/customer-intake` y `/api/bookings` desde producción con autenticación de infraestructura, sin exponer Cloud Run.
2. Enviar una consulta de prueba autorizada y comprobar respuesta, ID durable, registro en Agent Desk/cola, aviso humano y enlace de WhatsApp si hay fallo; nunca mostrar éxito si el backend rechaza la solicitud.
3. Confirmar el mismo tour/ID/precio entre portada, detalle, cotizador, backend y checkout. El servidor debe ser autoridad del precio.
4. Completar una reserva sandbox: verificación de cupos, persistencia/idempotencia, pago sandbox, callback válido del proveedor y estados visibles; no usar una tarjeta real para esta prueba.
5. Activar scheduler externo para Customer Intake (`QUEUE-001`) y probar reintentos, deduplicación y alertas.

## Agent Desk: cambios de esta pasada

- Se conserva la conexión existente con Counter Desk, memoria operativa e identidad del viajero.
- Los cuatro callbacks del proveedor —entrada, turno de voz, resultado de transferencia y estado de llamada— validan `X-Twilio-Signature`. Un secreto ausente o una firma inválida falla cerrado.
- La disponibilidad de transferencia admite varios destinos en E.164 mediante `VOICE_HUMAN_NUMBERS`; el saludo sólo anuncia la opción si hay un número utilizable. `VOICE_HUMAN_NUMBER` continúa disponible por compatibilidad.
- Un estado `in-progress`, `ringing` u otro estado no terminal ya no escribe `endedAt`. La marca de fin se guarda sólo al recibirse un estado terminal.
- Si un operador no contesta, el callback devuelve al viajero al Agent Desk de voz. Si contesta, la llamada termina de manera normal.
- Tres respuestas silenciosas consecutivas llevan a un operador configurado o cierran la llamada con un mensaje claro; se evita el ciclo infinito de Gather/Redirect.
- Las teclas DTMF no reconocidas no se envían al modelo como si fueran una intención de reserva. La tecla `0` sólo inicia transferencia cuando hay un destino configurado.
- Los callbacks de estado ya no agregan un falso turno conversacional cada vez que el proveedor informa progreso o fin de llamada.

Los endpoints y el contrato de hotel/PBX permanecen descritos en [`portable-voice-agent-desk.md`](portable-voice-agent-desk.md). No se configuró ni inventó un número telefónico, cuenta Twilio, operador de guardia, credencial, hotel o llamada de prueba.

## Repositorio, ramas, PR y automatizaciones

- `main` sigue siendo la fuente canónica. La inspección previa contabilizó 123 ramas remotas y 75 ramas con commits ausentes de `main`; muchas están atrasadas o contienen mezclas de varias funciones. No se debe fusionar ni borrar el conjunto en bloque. Los cambios rescatables deben revisarse por commit y portarse de forma selectiva.
- En la revisión previa aparecían 11 PR abiertos: diez actualizaciones Dependabot con comprobaciones reportadas verdes y un PR de despliegue/documentación (`#102`) marcado no mergeable. No se fusionaron actualizaciones de dependencias automáticamente durante esta pasada; se deben reevaluar sus checks justo antes de integrarlas.
- El PR `#102` repite trabajo de instalación/documentación ya presente en la línea principal, pero su comparación también mostró cambios de carga diferida de UI. Antes de cerrarlo, comparar el árbol actual de `main` y conservar cualquier mejora exclusiva; no eliminar su rama.
- `.github/workflows/deploy-cloud-run.yml` despliega desde `main`, mantiene Cloud Run privado en `us-central1` y comprueba el health endpoint con token. Sigue usando el secreto JSON `GCP_SA_KEY`; debe rotarse la clave de servicio expuesta en los archivos adjuntos y planear una migración validada a WIF para GitHub Actions antes de retirar esa credencial.
- `.github/workflows/configure-vercel-wif.yml` documenta el proveedor esperado `vercel` / `vercel-production` y el Service Account de puerta. Su resumen imprime los valores no secretos que deben copiarse a Vercel; no los aplica a Vercel automáticamente.
- El falso positivo histórico `PROVIDER-003` se corrigió: el auditor ahora inspecciona la función de failover y exige que no reasigne proveedor si no hay alternativa verificada. El único pendiente estructural que sigue informando el auditor es `QUEUE-001`: Customer Intake necesita un scheduler externo que llame al endpoint protegido. Un temporizador en memoria no basta con Vercel o Cloud Run escalando a cero.

## Contexto histórico y trabajo sin terminar

- Los adjuntos antiguos incluyen diseños con n8n, estados de reserva inmediata y memoria en proceso. Son referencias históricas; prevalecen el ciclo nativo del repositorio, Firestore, la separación entre aprobación de itinerario/pago/proveedor/confirmación final y la instrucción previa de retirar n8n sin borrar el trabajo útil.
- Las conversaciones anteriores pidieron Agent Desk portable para hoteles, llamadas atendidas por IA, continuidad de memoria, reservas canónicas y derivación humana; este cambio avanza la capa de webhooks, pero no activa número/central telefónica.
- Sigue pendiente OAuth real de Gmail/Outlook para ejecutar operaciones de correo. Las variables documentadas no sustituyen `client ID`, secreto, refresh token, permisos ni una prueba consentida de extremo a extremo.
- `CostaTours.io`, `costaricatours.ai` y la grafía `.ia` no se consideran elegidas ni compradas. Mantener URL actual y no mover DNS hasta que el propietario confirme dominio y titularidad.
- La clave de cuenta de servicio adjunta contiene material privado. No se usó ni se copió al repositorio. Tratarla como expuesta, revocarla/rotarla en Google Cloud y revisar qué secretos de GitHub o Cloud Run dependen de esa clave.

## Secuencia para declarar Agent Desk listo en producción

1. Restaurar WIF de Vercel con audiencia del proveedor correcto, cuenta de servicio con privilegios mínimos y URL exacta del servicio privado de Cloud Run; desplegar producción y exigir HTTP 200 autenticado en `/api/health`.
2. Verificar desde Google Cloud la URL, región, revisión activa, tráfico, IAM, logs y origen de `costa-rica-tours`; revisar las otras revisiones/servicios sin borrar nada hasta confirmar que no reciben tráfico ni soportan procesos.
3. Provisionar número y proveedor telefónico, configurar `VOICE_PROVIDER_AUTH_TOKEN`, `VOICE_AGENT_DESK_ENABLED=true`, `PUBLIC_BASE_URL`, destinos humanos y callbacks firmados. Mantener secretos en el gestor de secretos, nunca en Git.
4. Hacer llamadas de prueba ES/EN desde entrada hasta respuesta, memoria, consulta real, tecla DTMF, silencio, identidad conflictiva, operador contesta/no contesta y callback de estado; comprobar persistencia e idempotencia sin cobrar.
5. Configurar scheduler externo para Customer Intake y revisar reintentos, alarmas y límites de gasto.
6. Rotar la clave adjunta; migrar `GCP_SA_KEY` a Workload Identity Federation de GitHub sólo después de comprobar permisos y un despliegue de prueba.
7. Revalidar ramas y checks en el momento de fusionar. No considerar los despliegues de preview de Dependabot como versiones de producción.

## Verificación local de esta pasada

Las pruebas de seguridad de voz añadidas cubren firmas, callback terminal, transferencia múltiple, DTMF, silencio y devolución desde una transferencia fallida. Ejecutar antes de integrar:

```bash
npm run lint
node --test-force-exit --import tsx --test tests/*.test.ts
node --import tsx scripts/auditSystem.ts
npx vite build
npx esbuild server.ts --bundle --platform=node --format=cjs --packages=external --outfile=dist/server.cjs
```

Resultado de esta pasada: TypeScript correcto; 58 tests pasaron; auditoría del sistema sin bloqueos de alta/críticos (permanece `QUEUE-001`); Vite y el bundle del servidor compilaron; `git diff --check` limpio. `npm audit --omit=dev --audit-level=critical` pasó el umbral configurado, pero reportó cinco advisories de producción (una alta y cuatro moderadas, incluidas `minimatch`, `ajv`, `ip-address` y `uuid`); actualizar en un cambio acotado y revisar regresiones, sin ejecutar `npm audit fix` a ciegas. Se sincronizó `package-lock.json` con el `package.json` más reciente de `main`, y `npm ci --include=optional` completó correctamente.
