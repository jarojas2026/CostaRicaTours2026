# Dominio y estrategia de lanzamiento — Costa Rica Tours

> Estado: septiembre de 2026. Este documento distingue hechos operativos verificados de decisiones de marca todavía pendientes.

## Objetivo

Poner Costa Rica Tours online con el menor costo posible sin acoplar reservas, pagos, OAuth, webhooks ni correo a un dominio que la empresa todavía no controla.

## Dominio

### `costaricatours.com`

Es el nombre preferido como dominio comercial canónico por claridad, confianza y recordación para una plataforma internacional de reservas. Sin embargo, **no debe configurarse ni documentarse como dominio oficial hasta que la empresa tenga control registral y DNS verificable**.

La investigación pública realizada en septiembre de 2026 indica que el nombre no debe asumirse disponible para registro estándar. La disponibilidad y cualquier precio de adquisición deben confirmarse en el momento de compra mediante RDAP y/o el checkout de un registrador acreditado. No se debe inventar un precio de compra ni pagar un precio premium sin evaluación previa.

### `costaricatours.ai`

Es una alternativa coherente con el componente de inteligencia artificial del producto, pero no debe declararse propiedad de Costa Rica Tours sin verificación. Para una plataforma transaccional de turismo, `.com` sigue siendo la preferencia de marca si puede adquirirse razonablemente; `.ai` puede funcionar como dominio secundario o de producto IA.

### Mientras no exista dominio propio

La URL de Vercel permanece como endpoint público provisional. No deben migrarse `canonical`, OAuth redirect URIs, callbacks de pago, webhooks, correo transaccional o enlaces de proveedores a un dominio no controlado.

## Estrategia de costo mínimo

1. No comprar un dominio premium por impulso.
2. Verificar precio de **renovación**, no solo promoción del primer año.
3. Preferir un registrador con precio transparente, DNS y privacidad WHOIS cuando aplique.
4. Si `costaricatours.com` requiere una compra premium fuera del presupuesto, mantener Vercel provisionalmente y evaluar un `.com` cercano, corto y profesional antes de comprometer la marca.
5. Cuando exista dominio propio, proteger también variantes estratégicas solo si el presupuesto lo permite; no es requisito para lanzar el MVP.

## Arquitectura vigente que debe preservarse

Costa Rica Tours no debe migrarse de framework únicamente por adoptar un dominio. La arquitectura actual sigue siendo la base de lanzamiento:

- React 19 + TypeScript + Vite;
- Tailwind CSS, React Router y PWA;
- Node.js + Express + TypeScript;
- Firebase Auth + Firestore / Firebase Admin;
- Stripe y PayPal server-side;
- agentes de IA, memoria del viajero y Journey Orchestrator;
- automatización nativa en código + Firestore, **sin n8n**;
- Vercel para frontend/gateway;
- Cloud Run privado para backend canónico;
- autenticación Vercel → Google Cloud mediante WIF/OIDC una vez completada y verificada la configuración IAM.

## Reglas de lanzamiento

Un dominio bonito no convierte un sistema parcialmente configurado en producción. Antes de anunciar el dominio como operativo deben comprobarse, de extremo a extremo:

- DNS y HTTPS;
- `/api/health` a través del gateway real;
- autenticación y autorización;
- disponibilidad real de tours;
- soft holds y prevención de sobreventa;
- creación de reserva;
- pago sandbox y reconciliación server-side;
- webhooks firmados e idempotentes;
- despacho únicamente a proveedores activos/verificados;
- respuesta/confirmación del proveedor;
- notificaciones al viajero;
- cancelación/reembolso según reglas reales;
- logs, auditoría y recuperación ante fallos.

## Estado de reservas y pagos

La plataforma debe mantener separados estos hechos:

1. intención o solicitud del cliente;
2. proforma/cotización;
3. aprobación del cliente;
4. pago verificado por el procesador;
5. solicitud al proveedor;
6. aceptación/confirmación del proveedor;
7. reserva final confirmada.

Ningún clic del navegador puede sustituir una confirmación server-side del pago, y un pago no equivale por sí solo a confirmación del proveedor.

## Pendientes técnicos de producción

Mantener visibles hasta que exista evidencia de cierre:

- completar/verificar WIF/IAM y variables del gateway Vercel → Cloud Run;
- scheduler externo para trabajos operativos que no deben depender del proceso Node;
- webhooks firmados de Stripe/PayPal, idempotencia, duplicados, reintentos y refunds;
- E2E autenticado del ciclo completo de reserva;
- auditoría de catálogo y fotografías de tours;
- pruebas de seguridad, carga y accesibilidad;
- observabilidad y alertas de producción.

## Regla para futuras IA y desarrolladores

No empezar de cero. Antes de proponer PostgreSQL, Next.js, FastAPI, microservicios, Redis u otra migración, demostrar qué limitación real del sistema actual resuelve y por qué el beneficio supera el riesgo de introducir una segunda arquitectura. La prioridad inmediata es **cerrar y verificar el ciclo de negocio existente**, no reescribirlo.
