# Revisión del recorrido de reservas

## Cambios locales

- La página de tour entrega el registro devuelto por `/api/bookings` al estado compartido de “Mis reservas”.
- El formulario emergente exige un identificador persistido, elimina la confirmación inventada y llama una sola vez al callback de éxito.
- Ambos formularios conservan la clave de idempotencia durante reintentos con los mismos datos y bloquean envíos simultáneos. La protección actual dura mientras el formulario esté montado; no garantiza recuperación tras recargar.
- Los enlaces de pago requieren respuesta satisfactoria y URL HTTPS del proveedor. PayPal ya no sustituye un error por una URL local de éxito.
- El backend normaliza `customer.fullName` y `customer.name` para conservar el nombre real del viajero.
- El resumen no acredita cobro por seleccionar tarjeta/PayPal ni promete un conductor sin confirmación del operador.

## Pendiente antes de declarar el recorrido completo operativo

- Probar en navegador con un entorno de pruebas y Firestore aislado: solicitud, reintento, falta de cupo, recuperación y consulta posterior.
- Los endpoints de pago todavía necesitan reconciliación verificada con la reserva: enviar `bookingId` desde el cliente no basta para acreditar un cobro. Verificar asociación, webhook, importe, moneda, captura PayPal y permisos antes de cobros reales.
- El retorno de pago en App todavía genera un objeto provisional `VERIFICANDO...`; sustituirlo por consulta autenticada de la reserva, sin confiar en parámetros de URL.
- Confirmar asociación segura con el usuario autenticado y recuperación de reservas después de recargar. No ampliar reglas de Firestore para resolverlo.
- `CostaRicaCheckout.tsx` no tiene consumidores detectados y conserva simulaciones antiguas; no conectarlo a producción sin reemplazar su lógica.
- Revisar los demás botones, accesibilidad y recorridos de vuelos, mapa y reservas personalizadas en navegador. Las pruebas de contratos no sustituyen esa revisión.

## Conciliación de pago (siguiente corrección)

- Stripe incorpora el identificador interno de la reserva en `client_reference_id` y `metadata`. Al volver de Checkout, el backend recupera la sesión del proveedor, exige estado pagado, moneda USD y total exacto antes de registrar el pago.
- PayPal incorpora el mismo identificador en `custom_id`. Al retornar, el backend captura o recupera la orden en PayPal y exige estado COMPLETED, moneda y total coincidentes.
- Ningún retorno de navegador confirma al proveedor: el pago verificado llega solo a `paid`; la confirmación operativa sigue siendo una transición independiente.
- El antiguo enlace GET `customer-confirm` quedó retirado con 410: abrir un email nunca puede marcar pagada, cancelar ni despachar una reserva.

Estos cambios no constituyen un despliegue ni una prueba de pago real.

## Verificación local realizada

- TypeScript sin errores; suite de contratos: 45/45; las dos regresiones adicionales del formulario y comprobante también pasan.
- Build de Vite, PWA y backend completado. La auditoría informa pendientes `PROVIDER-003` y `QUEUE-001`, no resueltos por estos cambios.
- Navegador local: inicio carga, “Consultar” abre el tour; cambiar de dos a tres adultos recalcula de USD 238 a USD 357 y actualiza el mensaje de WhatsApp. Navegación a `/tours` comprobada.
- No se enviaron reservas ni pagos desde el navegador. El preview estático no valida la persistencia ni proveedores externos.
