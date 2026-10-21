# Proveedor: solo neto — verificación de publicación (2026-10-21)

## Alcance y evidencia
La decisión registrada del propietario es que el proveedor vea **solo su neto a recibir**, sin precio bruto facturado al viajero, porcentaje de comisión ni monto de comisión de Costa Rica Tours. Esta configuración es independiente del cálculo interno de la liquidación contractual.

Cambios de esta rama: `backend/providerSalesService.ts`, `backend/routes/provider.ts`, `src/pages/ProviderPortalV2.tsx`, tests y `.env.example`.

## Release gate
- `PROVIDER_PORTAL_SHOW_GROSS=false` y `PROVIDER_PORTAL_SHOW_COMMISSION=false` tanto en backend runtime como en cualquier entorno de prueba orientado a proveedores.
- Los contratos `tests/providerPortalNetOnly.contract.test.ts` y `tests/providerSales.contract.test.ts` deben estar verdes.
- Como proveedor autenticado en sandbox, consultar `GET /api/provider/v2/sales` y `GET /api/provider/v2/settlements`. Verificar que no incluyen `grossUSD`, `commissionRate`, `commissionRates`, `profileCommissionRate`, `commissionUSD`, `platformFeeUSD`, `totalUSD`, ni objetos anidados equivalentes. Probar cuentas de proveedores distintos para confirmar el aislamiento de tenant.
- Probar visualmente las pestañas de ventas y liquidaciones en móvil y escritorio, sin capturar datos personales reales.
- Confirmar que un `netUSD` calculado es **estimado** hasta liquidación efectiva. No presentar compras simuladas como pagadas.
- Para auditar el cambio, inspeccionar el diff y conservar el procedimiento de rollback. No desbloquear exposición de bruto/comisiones sin una nueva autorización explícita del propietario.

## Infraestructura
Un check rojo de Vercel debido a `build-rate-limit` no constituye una falla de aplicación, pero impide certificar esa publicación. Actualizar el commit de la rama permite solicitar un nuevo preview sin cambiar valores financieros; verificar que Vercel y CI reportan éxito **en ese mismo SHA** antes de fusionar.

Este documento no implementa un pago ni cambia permisos, tarifas o claves.
