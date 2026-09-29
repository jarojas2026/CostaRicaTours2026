# Inventario de despliegues y ruta canónica

Actualizado: 28 de septiembre de 2026. Basado en los workflows de `main` y en dos capturas de Cloud Run proporcionadas por el propietario. Una captura de consola no demuestra el origen de un despliegue ni el estado actual posterior a la captura.

## Configuración que declara este repositorio

Se han mencionado `CostaRicaTours.ia`, `costaricatours.ai` y `CostaTours.io`; ninguno está comprado ni verificado. `.ia` no figura en la zona raíz publicada por IANA, mientras que `.ai` sí. Hasta confirmar la grafía y el dominio elegido, la URL activa de Vercel debe conservarse y los enlaces `costaricatours.es` usados para contacto, documentos y reservas no deben sustituirse en bloque.

| Función | Destino declarado | Archivo |
| --- | --- | --- |
| Backend Cloud Run | proyecto `gen-lang-client-0782739149`, servicio `costa-rica-tours`, región `us-central1` | `.github/workflows/deploy-cloud-run.yml` |
| Puerta de API en Vercel | `CLOUD_RUN_BACKEND_URL` apunta a la URL del servicio anterior; identidad mediante WIF | `.github/workflows/configure-vercel-wif.yml`, `api/[...path].ts` |
| Frontend Vercel | build del repositorio y rutas SPA | `vercel.json` |

La región de un servicio de Cloud Run se fija al crearlo. Cambiar la región de un workflow no mueve ni repara automáticamente otro servicio ya creado. La URL y la audiencia usadas por la puerta de Vercel deben corresponder al servicio canónico de `us-central1`.

## Observado en las capturas

| Servicio visible | Región | Estado mostrado | Acción antes de consolidar |
| --- | --- | --- | --- |
| `costa-rica-tours` | `us-central1` | correcto; requiere autenticación | cotejar URL, revisión e imagen con GitHub Actions y Vercel |
| `costaricatours` | `us-central1` | correcto; requiere autenticación | identificar origen, tráfico y dependencias |
| `costaricatours2026` | `us-central1` | correcto; requiere autenticación | identificar origen, tráfico y dependencias |
| `costaricatours2026` | `us-west2` | error; acceso público | el propietario confirma que lo despliega Google AI Studio al sincronizar GitHub; revisar sus logs y detener ese despliegue paralelo una vez comprobado que no recibe tráfico |

No eliminar servicios ni redirigir dominios hasta confirmar qué URL usa cada frontend y si existen reservas, secretos o tareas vinculadas. En particular, no publicar el backend privado para intentar arreglar el acceso de Vercel.

## Verificación operativa pendiente

1. En Cloud Run, abrir cada servicio y registrar URL, revisión activa, origen, variables (solo nombres), asignación de tráfico, logs de la revisión fallida y dominio personalizado.
2. En GitHub Actions, comparar el SHA del último despliegue exitoso de `Deploy to Google Cloud Run` con `main`; comprobar `Build & Type Check`.
3. En Vercel, comprobar proyecto conectado, rama de producción, SHA desplegado y el valor de `CLOUD_RUN_BACKEND_URL`; éste debe ser la URL de `costa-rica-tours` en `us-central1`. Verificar que WIF emita el token para esa audiencia.
4. En AI Studio, comprobar proyecto de Cloud, nombre de servicio, región elegida, revisión fallida y logs. Seguir sincronizando cambios de código con GitHub, pero desactivar el despliegue directo paralelo; publicar mediante el flujo único de GitHub después de pasar los checks.
5. Tras una prueba autenticada de `/api/health` y una prueba de flujo sin cobro, migrar dominios y tráfico de forma controlada; conservar los otros servicios hasta verificar que no reciben solicitudes.
6. Si el propietario compra y controla `CostaTours.io` u otro dominio elegido, añadirlo al proyecto Vercel canónico, aplicar los registros DNS indicados por Vercel y verificar HTTPS. Solo entonces actualizar URL canónica, metadatos y enlaces; auditar aparte correos y enlaces de documentos para evitar destinos inexistentes.

La auditoría local del código aún señala `PROVIDER-003`, `QUEUE-001` y `LIFECYCLE-002`; un build correcto no equivale a operación de reservas validada en producción.
