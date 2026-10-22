# Salud IA: contrato público y diagnóstico privado

Cambio para #355 (21 de octubre de 2026).

- `GET /api/health/ai` conserva un resumen pasivo: `status`, `scope`, `maxAgeSeconds`. No revela proveedores, políticas, presupuesto, facturación ni breakers.
- `GET /api/ops/ai-health` conserva el diagnóstico detallado usando `requireOperator`: sesión Firebase con rol operativo autorizado o clave operativa del servidor. No poner esta clave en el navegador ni en documentación.
- Ambas respuestas usan `Cache-Control: no-store`, también al denegar acceso al diagnóstico.
- Se mantiene el HTTP histórico: 503 cuando todos los proveedores configurados están degradados; 200 en los demás casos. HTTP 200 no certifica disponibilidad: leer `status`. `unknown` significa falta de observación reciente, no éxito.
- Las consultas no ejecutan modelos, no generan costes de IA y no modifican reglas de selección, facturación o privacidad.
- `GET /api/health` conserva el contrato existente de liveness.

## Validación

Pruebas HTTP locales con Express: resumen público con claves exactas, diagnóstico sin credenciales y con credencial incorrecta (401), diagnóstico con clave ficticia de test y cabeceras sin caché. Pruebas existentes de estados desconocidos/degradados y snapshot de rutas conservadas. Sin llamadas a proveedores ni credenciales reales.

Comprobación tras despliegue: consultar los dos endpoints sin autenticación y verificar resumen mínimo/denegación; en una sesión operativa autorizada, comprobar el diagnóstico. No confundir pruebas locales/CI con verificación de producción.

Reversión: revertir el commit de este cambio; no hay migraciones ni variables nuevas. Eso restablecería la exposición anterior, por lo que se prefiere una corrección hacia adelante.
