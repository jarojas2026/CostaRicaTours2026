# Tienda operativa: incorporación y límites

## Flujo de venta

Catálogo Firestore → proveedor activo/verificado → tarifa publicada → cupo fechado
→ solicitud persistida y plaza reservada atómicamente → aceptación del proveedor
→ cobro con importe del expediente → pago verificado → confirmación/voucher.

Explorar una ficha o abrir WhatsApp no confirma una reserva. Una solicitud a medida
no tiene precio ni cupo definitivo hasta que el operador acuerda sus condiciones.
No crear miles de fichas ficticias para aparentar cobertura comercial.

## Administración

En el Centro de Control, “Preparar la tienda para ventas reales”:

1. Registrar proveedor real, identificador estable, nombre, correo operativo y
   teléfono internacional. El administrador declara haber verificado su acuerdo.
2. Elegir una ficha existente, vincular al proveedor, indicar tarifas finales por
   adulto/niño (incluidos los cargos aplicables), horarios y cancelación.
3. Publicar cupos para fecha y horario exactos. El cupo total incluye las plazas
   ya reservadas: editarlo nunca reinicia el contador.

Estos controles reutilizan tours, operators y availability_slots. Las referencias
del acuerdo y el actor quedan en commerce_audit, privado por default-deny. Sólo un
Firebase ID token con rol administrativo permite publicar; una clave operativa no.
El panel muestra hasta 500 registros y avisa si alcanza el límite. No es aún una
herramienta de importación masiva ni un sistema completo de contratación.

Los registros anteriores sin proveedor/estado/cupos explícitos no se promueven
automáticamente a reservables. Incorporar primero una oferta y probar su ciclo.
Los IDs del catálogo deben ser únicos y estables: no inferir identidad por título.

## Pagos

- APP_URL (o PUBLIC_BASE_URL) debe ser el origen HTTPS público de la tienda, sin
  rutas, credenciales ni parámetros. Nunca devolver el cliente al host privado
  de Cloud Run ni a un host aportado por el navegador.
- Stripe/PayPal cobran el total persistido, no los valores enviados por el cliente.
  La confirmación del proveedor se comprueba también en el backend, no sólo en el gateway.
- Configurar credenciales privadas, webhooks y la cuenta comercial compatible.
  Una cuenta PayPal personal no constituye evidencia de integración de checkout.
- Probar primero en sandbox. Validar referencias, moneda, importe, duplicados,
  reintentos, expiración/cancelación y conciliación antes de habilitar venta real.
- El alta de reserva no acepta referencias de pagos anteriores como prueba.
- Publicar y comprobar las tarifas CRC sólo con USD_TO_CRC_RATE vigente. La venta
  USD no depende de disponer de conversión CRC.

## Voz e IA

La integración existente es conversación telefónica por turnos, con reconocimiento
de voz y síntesis, no audio bidireccional de baja latencia ni “superinteligencia”.
Los mensajes están anidados en Gather para aceptar entrada durante el mensaje,
según https://www.twilio.com/docs/voice/twiml/gather. Los callbacks mantienen firmas,
límites de recuperación y transferencia humana. Nunca solicitar tarjetas por voz.

Habilitar una cuenta/número compatible, configurar callbacks HTTPS y secretos,
asignar el destino humano, y probar recepción, silencio, interrupción, transferencia,
fallo de IA y seguimiento de reserva. La presencia de variables no demuestra que
una llamada real funcione. No se compra ni activa telefonía mediante este panel.

La búsqueda sin credenciales o sin fuentes devuelve “no verificado”; no anuncia
parques, ferris ni inventario operativos mediante respuestas fijas.

## Pendiente externo

Confirmar identidad del aliado, condiciones comerciales, tarifas, disponibilidad,
cancelaciones y canales de respuesta. Confirmar titular/destino del nuevo teléfono
antes de sustituir el anterior. Configurar y probar pagos/telefonía sin publicar claves.
La carga masiva, nuevas fichas de servicios, cotizaciones privadas a medida y pruebas
integrales de producción siguen siendo etapas separadas; no declararlas completadas.
