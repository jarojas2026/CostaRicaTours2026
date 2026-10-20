# Mission Control — JARVIS PRIME (PR-03 lectura operativa)

## Alcance

Añade al panel administrativo una vista «Misiones / Missions» que consulta el registro de ejecuciones `agentRuns`, las aprobaciones existentes y los planes de `jarvisOrchestrator`.

No crea otra máquina de trabajos, no envía mensajes, no ejecuta pagos, no cambia reservas y no concede autonomía.

## Fuente y gobierno

- `GET /api/admin/mission-control` exige `requireOwner`. Un colaborador administrador sin rol de propietario no puede acceder a estos registros.
- La consulta devuelve muestras de hasta 60 runs, 40 aprobaciones y 30 planes; los contadores representan **solo esas muestras**, no totales históricos.
- La respuesta evita cuerpos de herramientas, correos y teléfonos: proyección restringida y `scrubText`. El detalle sensible permanece protegido en sus fuentes de dominio.
- Si Firestore falla o alguno de los tres orígenes falla, la fuente correspondiente queda `unavailable`. No devuelve cero como éxito ficticio.
- El cliente solicita token de Firebase al propietario, y actualiza cada minuto **solo mientras está abierta la sección**.
- El navegador no escribe datos ni tiene acceso a credenciales.

## Archivos

- `backend/missionControlService.ts`: proyección segura y estados por fuente.
- `backend/routes/admin.ts`: ruta GET `requireOwner`.
- `src/components/MissionControlPanel.tsx`: vista accesible bilingüe, resumen y detalle de registros.
- `src/pages/AdminControlCenterPage.tsx`: sección Misiones sin reescribir otras secciones.
- `tests/missionControl.test.ts`: contratos de estado, fuente, autenticación y UI.

## Limitaciones expresas

- Esta vista **no demuestra** que haya workers consumiendo tareas; una tarea `queued` no es `running`.
- Una ausencia de registros consultados no significa que no haya trabajo fuera de la muestra.
- No incluye ACK, leases, DLQ, recuperación de jobs ni estado global de scheduler.
- Requiere autenticación funcionando en el backend; revisar PR #284 antes de validar en producción.
- Los registros pueden contener información sensible en sus fuentes: los roles y las reglas Firestore permanecen inalterados.

## Validaciones requeridas

`npm run lint`, `npm run test:contracts`, `npm run build`, CI, prueba E2E autenticada como propietario, prueba de rechazo para usuario normal y administrador sin permiso owner.

## Rollback

Revertir el PR sin migración de datos ni eliminación de colecciones. La ruta y la sección se eliminan del deploy solo tras publicación y prueba.
