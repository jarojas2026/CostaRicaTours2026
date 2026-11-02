# Modelo operativo de agencia intermediaria

> Documento normativo del negocio (1-nov-2026). Toda IA, agente o persona que trabaje en la plataforma debe seguirlo. Si contradice algo técnico, prevalecen las reglas de [`AGENTS.md`](../AGENTS.md) y [`docs/REGLAS_PLATAFORMA.md`](REGLAS_PLATAFORMA.md) (costo $0, no borrar, no fusionar sin OK, aprobación humana para pagos).
>
> Este documento **no cambia código ni datos**. Describe cómo opera el negocio para que la plataforma y las IA lo respeten.

---

## 1. Modelo de negocio

- **Qué somos:** una agencia local en línea. Vendemos tours y paquetes de **operadores terceros**; no operamos los tours.
- **Cómo ganamos:**
  - **Tarifa neta (preferida):** el operador nos da un precio neto y nosotros fijamos el precio público.
  - **Comisión:** solo si el operador no trabaja con neto.
- **Margen mínimo: 20 % sobre el precio público.** Si el operador no deja al menos 20 %, **ese tour no se vende**.
- **Prioridad de venta:** paquetes (traslado + tours) por encima de tours sueltos. Dejan más margen por cliente y menos trabajo por venta.

---

## 2. Flujo de reserva y del dinero

1. **El cliente ve el tour** en la plataforma (catálogo público, sin datos del operador).
2. **Contacta por chat o WhatsApp** y la IA resuelve dudas.
3. **Se crea la reserva** en `agent_bookings` con estado `pendiente_pago` y código **AGB**.
4. **Aviso al dueño** (Gabriel) de la nueva reserva pendiente.
5. **Enlace de pago** generado con la pasarela elegida y enviado al cliente.
6. **La pasarela cobra** al cliente, descuenta su comisión y **deposita en la cuenta bancaria de Costa Rica**.
7. **El dueño confirma con el operador** y **le paga el neto** — siempre **manual y registrado por el dueño**. Ninguna IA paga ni marca pagado.
8. **Recordatorio pre-tour** al cliente (hora, punto de encuentro, qué llevar).
9. **Solicitud de reseña post-tour.**
10. **Registro semanal de números:** ventas, comisiones de pasarela, netos pagados, ganancia.

Reglas: un pago solo se da por recibido con confirmación verificada de la pasarela (webhook firmado o consulta verificada), nunca desde la UI ni por dicho del cliente. No se generan confirmaciones, facturas ni comprobantes simulados.

---

## 3. Pasarelas de pago

> Tarifas verificadas el **1-nov-2026**. **Revisarlas de nuevo antes de usar**: cambian sin aviso.
> **Pendiente:** la elección final de pasarela es de Gabriel.

| Pasarela | Tarifa tarjeta | Medios | Notas |
|---|---|---|---|
| **Stripe** | — | — | **No opera en Costa Rica.** Desactivar con bandera, **no borrar** código ni configuración. Mientras tanto sigue la regla vigente "Stripe solo TEST". |
| **ONVO** | 3,9 % + $0,35 (Visa/MC) | Visa, Mastercard, SINPE Móvil | Candidata. Más barata para tarjetas. |
| **Tilopay** | 4,25 % + $0,35 | Visa, MC, AMEX (incluye internacionales) | Candidata. Útil si hay muchos clientes con AMEX. |
| **PayPal CR** | 5,4 % + $0,30 | Cuenta PayPal / tarjetas | Alternativa para extranjeros que prefieran PayPal. |

- **Ninguna acepta JCB, UnionPay ni Alipay.** No ofrecer esos medios.
- SINPE Móvil solo para cobrar **nuestros propios servicios** a través de la pasarela; nunca pagar ni recibir SINPE por cuenta de terceros (ver regla legal en `AGENTS.md`).

---

## 4. Ejemplo de números

| Concepto | Monto |
|---|---|
| Precio público | $100,00 |
| Neto al operador | $80,00 |
| Comisión ONVO (3,9 % + $0,35) | $4,25 |
| **Ganancia aproximada** | **≈ $15,75** |

El 20 % de margen es **antes** de la comisión de la pasarela. Si la ganancia final queda muy baja, revisar precio público o neto antes de publicar.

---

## 5. Riesgos y reglas

- **Cancelaciones:** nuestra política debe ser **igual o más estricta que la del operador**. La pasarela **no devuelve su comisión** cuando se reembolsa; ese costo es nuestro.
- **Contracargos:** guardar pruebas de cada venta: confirmación enviada, mensajes con el cliente y aceptación de condiciones (términos y política de cancelación).
- **Operadores:** solo operadores serios, con **declaratoria turística del ICT** y **pólizas** vigentes. Tener un **plan B** (otro operador) para cada tour importante.
- **Formalización (antes de crecer):**
  - Hacienda: inscripción y **factura electrónica**.
  - **Declaratoria ICT de agencia de viajes.**
  - ⚠️ **No verificado legalmente.** Confirmar requisitos con un contador o abogado antes de actuar.

---

## 6. Viator / GetYourGuide

- **No revender tours de terceros ahí.** Su comisión (aprox. 20–30 %, **no verificada**) se come todo el margen.
- Solo válido como **canal futuro** si algún día hay **producto propio**.

---

## 7. Privacidad del proveedor

- El cliente **nunca** ve nombre, web ni contacto (teléfono, correo, WhatsApp, redes) del operador.
- Aplica lo de `AGENTS.md` §12 "Privacidad de proveedores": catálogo público sin campos de operador y texto neutral ("Operador local seleccionado por Costa Rica Tours").

---

## 8. Checklist para dar de alta un operador

- [ ] **Precio neto por escrito** (o comisión, si no hay neto), con al menos 20 % de margen.
- [ ] **Qué incluye** y qué no (transporte, comidas, entradas, guía, idioma).
- [ ] **Punto de encuentro y horarios.**
- [ ] **Política de cancelación** del operador.
- [ ] **Forma y momento de pago** al operador (antes/después del tour, transferencia, plazo).
- [ ] **Declaratoria ICT y pólizas** vigentes (copia o número).
- [ ] **Contacto operativo** para confirmar reservas y emergencias.

Sin estos puntos completos, el tour no se publica.

---

## 9. Flujo diario del dueño (8 pasos)

1. Revisar reservas nuevas en `pendiente_pago` (código AGB) y avisos recibidos.
2. Enviar o reenviar enlaces de pago pendientes.
3. Verificar en la pasarela los pagos recibidos.
4. Confirmar disponibilidad con el operador de cada reserva pagada.
5. Pagar el neto al operador y **registrarlo** (manual).
6. Enviar recordatorios a los clientes con tour en las próximas 24–48 h.
7. Pedir reseña a los clientes cuyo tour ya pasó.
8. Anotar los números del día (ventas, comisiones, netos, ganancia) para el registro semanal.
