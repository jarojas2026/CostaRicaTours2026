# Auditoría de continuidad y evolución AI — 2026-09-19

## Alcance

Revisión del branch `audit-hardening-ai-memory-2026-09-19`, su divergencia contra `main`, commits recientes y piezas que podían haber quedado incompletas por integraciones masivas.

## Hallazgos corregidos

- `backend/agentTools.ts` faltaba en el branch aunque `aiAssistantService.ts` ya lo importaba.
- `src/components/Header.tsx` estaba truncado a mitad de la interfaz.
- `backend/pdfService.ts` tenía una interpolación TypeScript rota y un itinerario de prueba hardcodeado.
- Stripe/PayPal tenían caminos de simulación que podían devolver éxito sin credenciales.
- `ADMIN_MOCK_TOKEN` seguía presente en la UI administrativa.
- Había datos personales/test incrustados en automatización y fixtures.
- El endpoint de PDF podía fabricar una reserva si el ID no existía.
- La confirmación de itinerario enviaba datos ficticios al proveedor en vez de leer la reserva.
- Había datos de proveedor hardcodeados en `bookingService.ts`.
- Existía un webhook de confirmación duplicado.
- Varios controles manuales de alto impacto no exigían autorización.
- El checkout aceptaba un importe controlado por cliente; ahora se compara contra el precio calculado en servidor.
- El replay de idempotencia dependía de memoria; ahora puede recuperar la reserva desde Firestore.
- La memoria semántica ahora registra expiración y evita recuperar vectores caducados.
- La validación semver del Skill Genome estaba mal escapada y fue corregida.

## Evolución del Skill Genome

Las skills ahora tienen ciclo de vida:

`candidate → canary → active → retired`

Cada versión acumula evidencia de:
- groundedness
- safety
- quality
- número de evaluaciones
- fallos críticos

Promoción a canary y active está bloqueada hasta superar gates mínimos. Las versiones pueden registrarse, evaluarse, promoverse y retirarse/rollback desde endpoints administrativos.

Colección persistente: `skill_genome_versions`.

La evolución no modifica automáticamente código, políticas críticas ni pagos.

## Divergencia contra main

Al momento de la auditoría el branch estaba 3 commits detrás de `main`. La revisión detectó especialmente el commit de registro unificado de capacidades de agentes, que fue reincorporado manualmente. El Destination Pulse se conserva porque en este branch está integrado en Home; su eliminación en main fue tratada como una eliminación deliberada de una versión no integrada, no como una pieza a copiar ciegamente.

## CI / despliegue

El run histórico inspeccionado probó un merge ref anterior y falló por errores de `pdfService.ts`, `FloatingWhatsApp.tsx` y `Header.tsx`. Los errores de PDF/Header encontrados en el branch fueron corregidos posteriormente. Vercel mostró además un fallo de límite de builds, que es una restricción de infraestructura y no evidencia por sí misma de fallo TypeScript.

`package-lock.json` todavía no refleja seis dependencias declaradas en `package.json`, por lo que el workflow usa `npm install` y no `npm ci`.

## Pendientes no ocultos

1. Migrar el tipo de cambio CRC fijo a una fuente/configuración financiera centralizada.
2. Sincronizar `package-lock.json` para volver a `npm ci`.
3. Ejecutar un nuevo CI sobre el head actual y corregir cualquier error residual que aparezca.
4. El entrenamiento de modelos sigue siendo infraestructura preparada, no un modelo propio ya entrenado.

## CI trigger
The PR is now ready for review so the next synchronize event can run the current merge result.
