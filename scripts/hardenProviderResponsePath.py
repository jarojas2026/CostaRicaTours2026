from pathlib import Path
import re

native_path = Path('backend/nativeWorkflows.ts')
server_path = Path('server.ts')
test_path = Path('tests/providerTruthPlane.contract.test.ts')

native = native_path.read_text()
server = server_path.read_text()
test = test_path.read_text()

# Secure action links only. Never emit bookingId/providerId mutation URLs without a signed capability.
old = """  // Generar URLs de acción de 1 clic para el proveedor
  const providerPortalUrl = providerPortalConfigured()
    ? `${APP_URL}/provider/portal?token=${encodeURIComponent(createProviderPortalToken({ orderId: bookingId, providerId: provider.id, ttlMinutes: 1440 }))}`
    : '';
  const confirmUrl = providerPortalUrl ? `${providerPortalUrl}&action=confirm` : `${APP_URL}/api/provider/respond?action=confirm&bookingId=${encodeURIComponent(bookingId)}&providerId=${encodeURIComponent(provider.id)}`;
  const modifyTimeUrl = providerPortalUrl ? `${providerPortalUrl}&action=modify_time` : `${APP_URL}/api/provider/respond?action=modify_time&bookingId=${encodeURIComponent(bookingId)}&providerId=${encodeURIComponent(provider.id)}`;
  const declineUrl = providerPortalUrl ? `${providerPortalUrl}&action=decline` : `${APP_URL}/api/provider/respond?action=decline&bookingId=${encodeURIComponent(bookingId)}&providerId=${encodeURIComponent(provider.id)}`;
"""
new = """  // Las acciones del proveedor sólo se aceptan mediante el portal firmado.
  if (!providerPortalConfigured()) {
    const reason = 'Despacho bloqueado: PROVIDER_ACTION_SECRET no está configurado para generar un enlace seguro de proveedor.';
    await recordEscalation({
      type: 'PROVIDER_PORTAL_UNCONFIGURED',
      bookingId,
      providerId: provider.id,
      reason,
      customerEmail,
      customerPhone,
      details: { tourId, tourDate, tourTime }
    });
    throw new Error(reason);
  }
  const providerPortalUrl = `${APP_URL}/provider/portal?token=${encodeURIComponent(createProviderPortalToken({ orderId: bookingId, providerId: provider.id, ttlMinutes: 1440 }))}`;
  // El portal presenta las acciones válidas y envía la decisión al endpoint firmado.
  const confirmUrl = providerPortalUrl;
  const modifyTimeUrl = providerPortalUrl;
  const declineUrl = providerPortalUrl;
"""
if native.count(old) != 1:
    raise SystemExit(f'provider action URL block: expected 1 match, found {native.count(old)}')
native = native.replace(old, new, 1)

safe_handler = r'''export async function handleProviderActionResponse(
  bookingId: string,
  action: 'confirm' | 'modify_time' | 'decline' | string,
  options?: {
    guideName?: string;
    vehiclePlate?: string;
    proposedTime?: string;
    providerNotes?: string;
    providerId?: string;
  }
): Promise<{
  success: boolean;
  action: string;
  bookingId: string;
  newStatus: string;
  providerStatus: string;
  message: string;
  reassigned?: boolean;
}> {
  console.log(`⚡ [RESPUESTA PROVEEDOR] Procesando acción "${action}" para reserva #${bookingId}`);
  const db = getFirestoreDb();
  if (!db) throw new Error('Firestore no disponible; no se puede validar una respuesta de proveedor.');

  const doc = await db.collection('bookings').doc(bookingId).get();
  if (!doc.exists) throw new Error(`Reserva #${bookingId} no encontrada.`);
  const bookingData: any = doc.data() || {};
  const assignedProviderId = String(bookingData.providerId || bookingData.providerInfo?.id || '').trim();
  const respondingProviderId = String(options?.providerId || '').trim();
  if (!assignedProviderId || !respondingProviderId || assignedProviderId !== respondingProviderId) {
    const reason = `Respuesta bloqueada: proveedor no coincide con la asignación de la reserva #${bookingId}.`;
    await recordEscalation({
      type: 'PROVIDER_RESPONSE_IDENTITY_MISMATCH',
      bookingId,
      providerId: respondingProviderId || undefined,
      reason,
      details: { assignedProviderId: assignedProviderId || null }
    });
    throw new Error(reason);
  }

  const provider = await getProviderFromDb(respondingProviderId, String(bookingData.tourId || ''));
  if (!provider) {
    const reason = `Respuesta bloqueada: proveedor ${respondingProviderId} no está activo y verificado para esta reserva.`;
    await recordEscalation({ type: 'PROVIDER_RESPONSE_UNVERIFIED', bookingId, providerId: respondingProviderId, reason });
    throw new Error(reason);
  }

  if (action === 'confirm') {
    const confirmedAt = new Date().toISOString();
    const patch: Record<string, any> = {
      providerStatus: 'confirmed',
      serviceOrderStatus: 'confirmed',
      providerConfirmedAt: confirmedAt,
      providerNotes: String(options?.providerNotes || '').trim() || 'Confirmado por proveedor.'
    };
    const guide = String(options?.guideName || '').trim();
    const vehicle = String(options?.vehiclePlate || '').trim();
    if (guide) patch.assignedGuide = guide;
    if (vehicle) patch.assignedVehicle = vehicle;

    const updated = await updateBookingStatus(bookingId, patch);
    if (!updated.success) throw new Error(updated.error || `No se pudo registrar la confirmación del proveedor para ${bookingId}.`);

    try {
      const { sendAgentMessage, publishAgentEvent } = await import('./agentMeshService');
      await sendAgentMessage({
        conversationId: bookingId,
        fromAgent: 'provider_liaison',
        toAgent: 'customer_service',
        audience: 'internal',
        type: 'response',
        subject: 'Proveedor confirmó disponibilidad',
        payload: { bookingId, providerId: respondingProviderId, guide: guide || null, vehicle: vehicle || null }
      });
      await publishAgentEvent('provider.booking.confirmed', { bookingId, providerId: respondingProviderId, guide: guide || null, vehicle: vehicle || null }, bookingId);
    } catch (meshErr) {
      console.warn('Agent mesh provider confirmation unavailable:', meshErr);
    }

    logAutomationExecution('WF_COORDINACION_PROVEEDOR', 0, 'success', `Proveedor ${respondingProviderId} confirmó disponibilidad para #${bookingId}`);
    return {
      success: true,
      action: 'confirm',
      bookingId,
      newStatus: String(bookingData.status || 'provider_pending'),
      providerStatus: 'confirmed',
      message: `Proveedor ${respondingProviderId} confirmó disponibilidad. El lifecycle canónico validará la transición final y la notificación al cliente.`
    };
  }

  if (action === 'modify_time') {
    const proposedTime = String(options?.proposedTime || '').trim();
    if (!proposedTime) throw new Error('proposedTime es obligatorio para solicitar un cambio de horario.');
    const updated = await updateBookingStatus(bookingId, {
      providerStatus: 'time_change_requested',
      proposedTime,
      providerNotes: String(options?.providerNotes || '').trim() || `Proveedor solicita horario ${proposedTime}`
    });
    if (!updated.success) throw new Error(updated.error || `No se pudo registrar el cambio de horario para ${bookingId}.`);

    try {
      const { sendAgentMessage, publishAgentEvent } = await import('./agentMeshService');
      await sendAgentMessage({
        conversationId: bookingId,
        fromAgent: 'provider_liaison',
        toAgent: 'customer_service',
        audience: 'internal',
        type: 'request',
        subject: 'Proveedor solicita cambio de horario',
        payload: { bookingId, proposedTime, providerId: respondingProviderId, notes: options?.providerNotes }
      });
      await publishAgentEvent('provider.booking.time_change_requested', { bookingId, proposedTime, providerId: respondingProviderId }, bookingId);
    } catch (meshErr) {
      console.warn('Agent mesh provider time-change unavailable:', meshErr);
    }

    return {
      success: true,
      action: 'modify_time',
      bookingId,
      newStatus: String(bookingData.status || 'provider_pending'),
      providerStatus: 'time_change_requested',
      message: `Cambio de horario solicitado por el proveedor y pendiente de resolución; no se modificó automáticamente el voucher del viajero.`
    };
  }

  if (action === 'decline') {
    return executeAutonomousProviderFallback(
      bookingId,
      respondingProviderId,
      String(options?.providerNotes || '').trim() || 'Proveedor indicó que no puede atender la solicitud.'
    );
  }

  return {
    success: false,
    action,
    bookingId,
    newStatus: String(bookingData.status || 'provider_pending'),
    providerStatus: String(bookingData.providerStatus || 'unknown'),
    message: `Acción "${action}" no reconocida.`
  };
}'''

pattern = re.compile(
    r"export async function handleProviderActionResponse\(.*?\n\}(?=\n\n/\*\*\n \* =========================================================================\n \* FALLBACK AUTÓNOMO DE PROVEEDORES)",
    re.S,
)
native, count = pattern.subn(safe_handler, native, count=1)
if count != 1:
    raise SystemExit(f'provider action handler: expected 1 match, found {count}')

native = native.replace(
    ' * Reasigna instantáneamente una reserva rechazada a la flota directa de Alsama Tours CR,\n * despachando nuevo aviso a la central de operaciones sin cancelar la experiencia al viajero.',
    ' * Bloquea la reasignación automática cuando no existe una alternativa verificada y\n * escala el caso para que ninguna reserva termine asignada a un proveedor sintético.'
)

# Retire the unsigned provider-response mutation surface. The signed provider portal
# is the only public provider capability endpoint.
pattern = re.compile(
    r"// 1\.1 Endpoint Bidireccional de Respuesta del Proveedor.*?\napp\.all\(\['/api/provider/respond', '/webhook/provider-response', '/api/webhooks/provider-response'\], async \(req, res\) => \{.*?\n\}\);",
    re.S,
)
replacement = """// 1.1 Endpoint legado de respuesta del proveedor retirado.
// Las mutaciones públicas sólo se aceptan mediante /api/provider/portal/action con token firmado.
app.all(['/api/provider/respond', '/webhook/provider-response', '/api/webhooks/provider-response'], (_req, res) => {
  res.status(410).json({
    success: false,
    error: 'Endpoint legado retirado. Use el portal seguro del proveedor con enlace firmado.'
  });
});"""
server, count = pattern.subn(replacement, server, count=1)
if count != 1:
    raise SystemExit(f'legacy provider response route: expected 1 match, found {count}')

# Extend regression coverage.
append = r'''

test('provider public actions require a signed portal capability and do not auto-confirm the booking', () => {
  const native = read('backend/nativeWorkflows.ts');
  const server = read('server.ts');
  const start = native.indexOf('export async function handleProviderActionResponse');
  const end = native.indexOf('export async function executeAutonomousProviderFallback', start);
  assert.ok(start >= 0 && end > start, 'provider handler not found');
  const handler = native.slice(start, end);

  assert.equal(native.includes('/api/provider/respond?action='), false);
  assert.match(native, /PROVIDER_PORTAL_UNCONFIGURED/);
  assert.equal(handler.includes("status: 'confirmada'"), false);
  assert.equal(handler.includes('Unidad Turística Oficial Alsama'), false);
  assert.equal(handler.includes("options?.proposedTime || '09:00 AM'"), false);
  assert.match(handler, /serviceOrderStatus: 'confirmed'/);
  assert.match(handler, /PROVIDER_RESPONSE_IDENTITY_MISMATCH/);
  assert.match(server, /app\.all\(\['\/api\/provider\/respond'[\s\S]*status\(410\)/);
  assert.match(server, /verifyProviderPortalToken/);
});
'''
if "provider public actions require a signed portal capability" not in test:
    test += append

native_path.write_text(native)
server_path.write_text(server)
test_path.write_text(test)
