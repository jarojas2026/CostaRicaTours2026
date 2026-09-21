# ESTADO REAL DEL SISTEMA - Costa Rica Tours 2026

**Actualizado: 19 de septiembre de 2026**

## Estado actual

La base principal de reservas, autenticación de operadores, idempotencia, control de concurrencia, automatización nativa, agentes de IA y experiencia de destinos está integrada en `main`. Esta auditoría añade endurecimiento de producción sobre la integración automatización nativa/MCP y elimina credenciales incrustadas del código activo.

## Corregido en esta auditoría

- Credenciales Bearer de automatización nativa MCP retiradas de `mcp.json`, `automatización nativa-mcp-config.json` y del bridge TypeScript. Ahora se requieren `automatización nativa_MCP_SERVER_URL` y `automatización nativa_MCP_TOKEN` por entorno.
- Las herramientas internas de agentes que pueden producir efectos persistentes requieren `AGENT_INTERNAL_TOKEN`.
- El endpoint de tipo de cambio ya no devuelve ₡515 fijo. En producción requiere `USD_TO_CRC_RATE` configurado desde una fuente oficial.
- La identidad de Firebase Admin usa `FIREBASE_PROJECT_ID` en lugar de depender de un project ID incrustado.
- Los fallbacks de correo de proveedor con dominios ficticios fueron eliminados.
- Las órdenes de servicio ya no se reconstruyen con reservas ficticias si no existen en el almacenamiento operativo.
- Los datos bancarios sintéticos del registro de proveedores dejaron de actuar como datos operativos.
- El auditor de seguridad ahora inspecciona también los archivos de configuración MCP y patrones de JWT incrustados.

## Dependencias externas que siguen requiriendo configuración real

1. **Firebase/Firestore:** credenciales de servidor, proyecto y database ID mediante secretos de despliegue.
2. **Pagos:** `STRIPE_SECRET_KEY`, PayPal client/secret y configuración de producción. El backend rechaza pagos cuando no están configurados.
3. **Tipo de cambio:** `USD_TO_CRC_RATE` debe mantenerse actualizado desde una fuente oficial del BCCR; no debe utilizarse un valor histórico fijo para cotizaciones financieras.
4. **automatización nativa MCP (opcional):** solo habilitar `automatización nativa_ENABLED=true` si existen URL y token válidos en secretos del entorno.
5. **Proveedores:** los correos, teléfonos, cuentas de liquidación y disponibilidad deben proceder de datos operativos verificados, no de fixtures de código.
6. **CI/CD:** el pipeline debe ejecutar instalación, auditoría de fixtures, TypeScript y build antes de permitir la integración.

## Pendientes funcionales de producto

- Sustituir cualquier imagen/catálogo provisional por activos y disponibilidad reales de cada operador.
- Completar la alimentación de disponibilidad por proveedor y sincronización de calendario en producción.
- Conectar el frontend a un servicio de tipo de cambio vigente en lugar de multiplicadores históricos embebidos en componentes de UI.
- Validar el flujo completo de Stripe/PayPal/SINPE en entorno real antes de activar cobros.
- Ejecutar pruebas end-to-end contra Firebase y proveedores reales antes del lanzamiento público.

## Regla de producción

No se consideran "completadas" las funciones que dependan de credenciales, datos de proveedores, cuentas bancarias, pagos o fuentes externas no configuradas. El código debe fallar de forma explícita y segura en lugar de simular una operación real.
