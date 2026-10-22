# Piloto comercial verificable — Costa Rica Tours (22-10-2026)

> Documento de revisión interna, no contrato firmado, tarifa, disponibilidad ni promesa de ingresos. Sin secretos, contactos ni PII. Mantener como fuente de verdad el código/Firestore actual.

## Servicios existentes a reutilizar

| Control | Servicio existente | Criterio |
| --- | --- | --- |
| Preparación comercial | backend/commerceReadinessPolicy.ts; CommerceOperationsPanel | Muestras de candidatos; no confirman proveedor ni cupos vivos |
| Comisión | backend/providerPayoutPolicy.ts; backend/providerPayoutService.ts | Comisión contractual verificable, sin tasa 15% por defecto |
| Pedido al proveedor | backend/providerCommunicationService.ts | Solicitud enviada no equivale a aceptación |
| Cotización | POST /api/leads/quote-request y POST /api/customer-intake | Solicitud con referencia confirmada, no reserva ni pago |
| Precios | src/utils/referencePrice.ts y servicio de tipo de cambio | USD de referencia; conversión aproximada solo con tasa comprobable |

Fuentes: docs/commerce-sales-readiness-2026-10-20.md, docs/provider-contractual-settlement-2026-10-20.md, docs/COORDINACION-AGENTES.md.

## Checklist para activar una oferta real

1. **Identidad del proveedor:** validar entidad y representante, permisos y seguros aplicables, estado activo y verificado. Los documentos quedan en almacenamiento privado con controles de acceso.
2. **Acuerdo comercial:** revisión legal y fiscal antes de firmar; registrar comisión explícita, base imponible, moneda, impuestos, descuentos y vigencia. Sin acuerdo, bloquear liquidaciones y órdenes.
3. **Oferta:** vincular una ficha existente; validar tarifas finales adulto/menor, qué incluye/excluye, duración, puntos de encuentro, imágenes licenciadas y cancelaciones.
4. **Inventario:** cupos por fecha y horario, descontando reservas y holds verificados. Editar cupo total no debe reponer plazas ocupadas. Verificar cupo vivo con operador.
5. **Solicitud y respuesta:** consentimiento Ley 8968, lead persistido con referencia; silencio del proveedor = pendiente, nunca aceptación ni confirmación.
6. **Pago:** validar viabilidad de la pasarela para la entidad real; sandbox con webhooks firmados, idempotencia, importes, duplicados, disputa, devolución y reconciliación. Sin pruebas, no activar checkout de producción.
7. **Reserva/voucher:** separar cotización, cupo verificado, pago confirmado, aceptación proveedor y reserva confirmada, conforme al estado canónico.
8. **Liquidación:** calcular según contrato y evidencia de cumplimiento, fees, ajustes y contracargos; plazos expresados en días hábiles y sujetos a conciliación, no T+2 incondicional.
9. **Privacidad:** finalidad y consentimiento, mínima divulgación de datos para operación; sin PII ni bancos en repositorio, PRs, Issues o registros públicos.
10. **Certificación:** primero tests de API simulada, luego sandbox con identidades autorizadas; ningún test en CI genera leads o cobros reales.

## Revisión obligatoria del borrador de contrato

Pendiente asesoría profesional sobre: representación legal; responsabilidad y seguros por actividad; permisos de prestación; precio público/neto/base de comisión e impuestos; factura y diferencia cambiaria; términos de cancelación/no-show/fuerza mayor/contracargo; pagos y días hábiles; conservación de evidencia; tratamiento de datos, confidencialidad y transmisión mínima; derechos de fotografía; terminación y reservas en curso; foro y legislación aplicable; versiones y firmas.

La plantilla adjunta es un insumo **no firmable** en su estado actual. La información del proveedor, cuentas y documentos firmados deben guardarse solo en sistemas autorizados.

## Economía unitaria honesta

Definir P = importe pagado, c = porcentaje contractual, F = fees de pasarela/cambio, A = adquisición, O = costo operativo variable, R = reembolsos/disputas esperados:

- Comisión bruta ilustrativa = P × c **solo** si el contrato define esa base; de lo contrario usar neto pactado.
- Contribución variable = P × c − F − A − O − R.
- Ejemplo, no dato de operación: P = US$500 y c = 18% => US$90 comisión bruta por reserva, sin descontar gastos/impuestos.
- Para llegar a US$3.000 de comisión bruta bajo esa hipótesis hacen falta 34 reservas (33 generan US$2.970).
- **No se ha demostrado** punto de equilibrio de 15 reservas/mes ni ingresos a 30/60/90 días. Usar ingresos cobrados y conciliados, no reservas previstas.

## Puertas de aprobación

A. Identidad, seguridad y cumplimiento básico comprobados; B. Primer operador con acuerdo, tarifa y cupo; C. Cotización reproducible y seguimiento; D. Pagos sandbox y conciliación validados; E. Primera venta confirmada con evidencia y settlement; F. Decisión humana para gasto publicitario y expansión.

No crear un segundo sistema de reservas, no exponer proveedores públicamente, no simular aceptación, no enviar pagos ni iniciar gastos por incorporar esta guía.
