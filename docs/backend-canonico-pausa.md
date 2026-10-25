# Backend canónico y pausa operativa

Decisión del propietario: unificar sin perder datos y mantener la pausa de costos.

## Destino único del repositorio

`costa-rica-tours` en `us-central1` es el destino existente de deploy, WIF y digest.
El único workflow de publicación es `.github/workflows/deploy-cloud-run.yml`.
No crear otro backend ni cambiar Firestore, secretos, pagos o reservas para unificar.
Los servicios históricos `costaricatours` y `costaricatours2026` quedan conservados,
pausados y fuera de futuras publicaciones. Sus activadores de Cloud Build deben
permanecer inhabilitados. No borrarlos ni borrar imágenes sin aprobación específica.

## Pausa que falla cerrada

- `CLOUD_RUN_DEPLOY_ENABLED`: variable de Actions; ausente, false o cualquier valor
  distinto de `true` impide autenticar, compilar y desplegar, incluso manualmente.
- `CLOUD_RUN_OPERATIONS_ENABLED`: misma regla para el resumen diario de leads.
- Ambas ejecuciones solo se permiten desde main; se conservan los gates de CI.
- Mantener además el workflow de deploy inhabilitado en Actions durante la pausa.
- Esto no elimina almacenamiento ni garantiza gasto cero de la cuenta.

## Comprobaciones pendientes antes de reanudar

1. Verificar el destino efectivo `CLOUD_RUN_BACKEND_URL` del deployment de producción
   de Vercel. Está almacenado como Secret y la API no devuelve su valor. No sustituir
   una configuración desconocida ni declarar el routing verificado.
2. Comparar configuración y referencias a datos/secretos de los tres servicios.
   Conservar la revisión actual y anterior de cada uno hasta terminar la revisión.
3. Auditar tareas externas y builds pendientes; los activadores pausados no bloquean
   publicaciones manuales ni herramientas externas.
4. Con aprobación expresa para gastos/reanudación, verificar identidad WIF, destino,
   revisión y pruebas de reservas en entorno autorizado antes de habilitar operaciones.

## Recuperación

No se migran datos ni se elimina ningún recurso. Reanudar requiere autorización del
propietario, habilitar el workflow y configurar explícitamente las variables anteriores.
No activar los dos activadores históricos. La limpieza del registro es otra operación,
con inventario y autorización propios; no es parte de este cambio.
