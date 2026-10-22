/**
 * Panel administrativo, gobernanza de agentes y barridos internos.
 *
 * Extraído de server.ts sin cambios de comportamiento: rutas, middlewares y
 * orden de registro se conservan (ver tests/serverRoutes.contract.test.ts).
 */

import path from 'path';
import { requireOwner } from '../authMiddleware';
import { processProviderInboxOnce } from '../providerInboxAgent';
import { getAdminControlCenterSnapshot } from '../adminControlCenterService';
import { getOwnerMissionControlSnapshot } from '../missionControlService';
import { getOwnerExecutiveBriefing } from '../ownerExecutiveBriefingService';
import { getGlobalAgentControl, listAgentGovernanceAudit, pauseAgent, resumeAgent, revokeAgent, restoreAgent, setAgentAutonomy, setGlobalAgentShutdown } from '../agentGovernanceService';
import { listOwnerApprovals, approveOwnerApproval, rejectOwnerApproval } from '../ownerApprovalService';
import { getJarvisPlan, listJarvisPlans, reconcileJarvisPlan, runJarvisOwnerCommand } from '../jarvisOrchestrator';
import { evaluateDigitalCityRegistration } from '../digitalCityRegistrationPolicy';
import { getPlatformControls, updatePlatformControls } from '../platformControlService';
import { runAdminAICommand, listAdminAICommands, approveAdminAICommand, rejectAdminAICommand } from '../adminAICommandService';
import { getExecutiveAIArchitecture } from '../executiveAIArchitecture';
import { processEmailOperationsOnce, getEmailOperationsSnapshot } from '../emailOperationsAgent';
import { runReservationLifecycleSweep } from '../reservationLifecycleOrchestrator';
import { withDistributedAutomationLock } from '../cronEngine';
import { createRouter, requireAdmin, adminAccessPayload, requireAgentTool } from './shared';

/** Panel administrativo, gobernanza de agentes y JARVIS. */
export const adminRouter = createRouter();

// ==========================================
// 📬 PROVIDER INBOX — lectura operativa del correo cada minuto
adminRouter.post('/api/ops/provider-inbox/check', requireAdmin, async (_req, res) => {
  try {
    res.json({ success: true, result: await withDistributedAutomationLock('provider-inbox-1m', processProviderInboxOnce) });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'No se pudo revisar la bandeja.' });
  }
});

// ==========================================
// 📊 ADMIN CONTROL CENTER
adminRouter.get('/api/admin/ai-architecture', requireAdmin, async (_req, res) => res.json(getExecutiveAIArchitecture()));

adminRouter.get('/api/admin/access-policy', requireAdmin, async (req, res) => {
  res.json({
    allowed: true,
    adminOnly: true,
    access: adminAccessPayload(req),
    mutationsRequireExplicitAction: true,
    codeChangesRequireReviewedPullRequest: true
  });
});

adminRouter.get('/api/admin/ai-command/history', requireAdmin, async (_req, res) => {
  try { return res.json({ commands: await listAdminAICommands(40) }); }
  catch (error: any) { return res.status(500).json({ error: error?.message || 'No se pudo cargar el historial de IA.' }); }
});

adminRouter.post('/api/admin/ai-command', requireAdmin, async (req, res) => {
  try {
    const prompt = typeof req.body?.prompt === 'string' ? req.body.prompt : '';
    const mode = typeof req.body?.mode === 'string' ? req.body.mode : 'analyze';
    return res.json(await runAdminAICommand({ prompt, mode, actor: adminAccessPayload(req) }));
  } catch (error: any) {
    return res.status(400).json({ error: error?.message || 'No se pudo ejecutar el comando de IA.' });
  }
});

adminRouter.post('/api/admin/ai-command/:commandId/approve', requireOwner, async (req, res) => {
  try {
    return res.json(await approveAdminAICommand(String(req.params.commandId || ''), adminAccessPayload(req)));
  } catch (error: any) {
    return res.status(400).json({ error: error?.message || 'No se pudo aprobar la propuesta.' });
  }
});

adminRouter.post('/api/admin/ai-command/:commandId/reject', requireOwner, async (req, res) => {
  try {
    return res.json(await rejectAdminAICommand(String(req.params.commandId || ''), adminAccessPayload(req), String(req.body?.reason || '')));
  } catch (error: any) {
    return res.status(400).json({ error: error?.message || 'No se pudo rechazar la propuesta.' });
  }
});

adminRouter.get('/api/admin/platform-controls', requireAdmin, async (_req, res) => {
  try { return res.json(await getPlatformControls()); }
  catch (error: any) { return res.status(500).json({ error: error?.message || 'No se pudieron cargar los parámetros.' }); }
});

adminRouter.patch('/api/admin/platform-controls', requireAdmin, async (req, res) => {
  try { return res.json(await updatePlatformControls(req.body || {})); }
  catch (error: any) { return res.status(400).json({ error: error?.message || 'No se pudieron guardar los parámetros.' }); }
});

adminRouter.get('/api/admin/agent-office/governance', requireAdmin, async (_req, res) => {
  try { return res.json({ global: await getGlobalAgentControl() }); }
  catch (error: any) { return res.status(500).json({ error: error?.message || 'No se pudo cargar la gobernanza de agentes.' }); }
});

adminRouter.get('/api/admin/agent-office/audit', requireOwner, async (_req, res) => {
  try { return res.json({ audit: await listAgentGovernanceAudit(120) }); }
  catch (error: any) { return res.status(500).json({ error: error?.message || 'No se pudo cargar la bitácora.' }); }
});

adminRouter.patch('/api/admin/agent-office/agents/:agentId/autonomy', requireOwner, async (req, res) => {
  try {
    const rawLevel = Number(req.body?.level);
    if (![0, 1, 2, 3].includes(rawLevel)) return res.status(400).json({ error: 'Nivel de autonomía inválido.' });
    return res.json(await setAgentAutonomy({
      agentId: String(req.params.agentId || ''),
      level: rawLevel as 0 | 1 | 2 | 3,
      actor: adminAccessPayload(req),
      reason: String(req.body?.reason || '')
    }));
  } catch (error: any) {
    return res.status(400).json({ error: error?.message || 'No se pudo cambiar la autonomía.' });
  }
});

for (const [path, handler] of [
  ['pause', pauseAgent],
  ['resume', resumeAgent],
  ['revoke', revokeAgent],
  ['restore', restoreAgent]
] as const) {
  adminRouter.post(`/api/admin/agent-office/agents/:agentId/${path}`, requireOwner, async (req, res) => {
    try {
      return res.json(await handler({
        agentId: String(req.params.agentId || ''),
        actor: adminAccessPayload(req),
        reason: String(req.body?.reason || '')
      }));
    } catch (error: any) {
      return res.status(400).json({ error: error?.message || `No se pudo ejecutar ${path}.` });
    }
  });
}

adminRouter.post('/api/admin/agent-office/shutdown', requireOwner, async (req, res) => {
  try {
    return res.json(await setGlobalAgentShutdown({
      disabled: true,
      actor: adminAccessPayload(req),
      reason: String(req.body?.reason || '')
    }));
  } catch (error: any) {
    return res.status(400).json({ error: error?.message || 'No se pudo apagar la fuerza de agentes.' });
  }
});

adminRouter.post('/api/admin/agent-office/resume-all', requireOwner, async (req, res) => {
  try {
    return res.json(await setGlobalAgentShutdown({
      disabled: false,
      actor: adminAccessPayload(req),
      reason: String(req.body?.reason || '')
    }));
  } catch (error: any) {
    return res.status(400).json({ error: error?.message || 'No se pudo reanudar la fuerza de agentes.' });
  }
});

adminRouter.get('/api/admin/agent-office/approvals', requireOwner, async (_req, res) => {
  try { return res.json({ approvals: await listOwnerApprovals({ limit: 100 }) }); }
  catch (error: any) { return res.status(500).json({ error: error?.message || 'No se pudo cargar la cola de aprobaciones.' }); }
});

adminRouter.post('/api/admin/agent-office/approvals/:approvalId/approve', requireOwner, async (req, res) => {
  try { return res.json(await approveOwnerApproval(String(req.params.approvalId || ''), adminAccessPayload(req))); }
  catch (error: any) { return res.status(400).json({ error: error?.message || 'No se pudo aprobar la acción.' }); }
});

adminRouter.post('/api/admin/agent-office/approvals/:approvalId/reject', requireOwner, async (req, res) => {
  try {
    return res.json(await rejectOwnerApproval(
      String(req.params.approvalId || ''),
      adminAccessPayload(req),
      String(req.body?.reason || '')
    ));
  } catch (error: any) {
    return res.status(400).json({ error: error?.message || 'No se pudo rechazar la acción.' });
  }
});

adminRouter.post('/api/admin/jarvis/command', requireOwner, async (req, res) => {
  try {
    return res.json(await runJarvisOwnerCommand({
      ownerOrder: String(req.body?.order || req.body?.prompt || ''),
      language: req.body?.language === 'en' ? 'en' : 'es',
      actor: adminAccessPayload(req)
    }));
  } catch (error: any) {
    return res.status(400).json({ error: error?.message || 'JARVIS no pudo crear un plan gobernado.' });
  }
});

adminRouter.get('/api/admin/jarvis/plans', requireOwner, async (req, res) => {
  try {
    return res.json({ plans: await listJarvisPlans(Number(req.query.limit) || 40) });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'No se pudieron cargar los planes de JARVIS.' });
  }
});

adminRouter.get('/api/admin/jarvis/plans/:planId', requireOwner, async (req, res) => {
  try {
    const plan = await getJarvisPlan(String(req.params.planId || ''));
    if (!plan) return res.status(404).json({ error: 'Plan JARVIS no encontrado.' });
    return res.json({ plan });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'No se pudo cargar el plan de JARVIS.' });
  }
});

adminRouter.post('/api/admin/jarvis/plans/:planId/reconcile', requireOwner, async (req, res) => {
  try {
    return res.json({ plan: await reconcileJarvisPlan(String(req.params.planId || '')) });
  } catch (error: any) {
    return res.status(400).json({ error: error?.message || 'JARVIS no pudo reconciliar el plan.' });
  }
});

// Read-only global city onboarding preflight. No users, listings or payments are created.
adminRouter.post('/api/admin/digital-city/registration/preflight', requireAdmin, (req, res) => {
  try {
    const result = evaluateDigitalCityRegistration(req.body);
    return res.status(result.status === 'invalid' ? 400 : 200).json(result);
  } catch {
    return res.status(400).json({ error: 'No se pudo evaluar la solicitud.' });
  }
});

// Owner-only read-only projections of persisted operations; no agent side effects.
adminRouter.get('/api/admin/mission-control', requireOwner, async (_req, res) => {
  try {
    res.setHeader('cache-control', 'private, no-store');
    res.json(await getOwnerMissionControlSnapshot());
  } catch {
    res.status(503).json({ error: 'No se pudo consultar Mission Control.' });
  }
});

adminRouter.get('/api/admin/owner-briefing', requireOwner, async (_req, res) => {
  try {
    res.setHeader('cache-control', 'private, no-store');
    res.json(await getOwnerExecutiveBriefing());
  } catch {
    res.status(503).json({ error: 'Executive briefing unavailable.' });
  }
});

adminRouter.get('/api/admin/control-center', requireAdmin, async (_req, res) => {
  try {
    res.json(await getAdminControlCenterSnapshot());
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'No se pudo cargar el centro de control.' });
  }
});

/** Barridos internos y operaciones de email. */
export const operationsSweepRouter = createRouter();

operationsSweepRouter.post('/api/internal/provider-inbox/sweep', requireAgentTool, async (_req, res) => {
  try {
    res.json({ success: true, result: await withDistributedAutomationLock('provider-inbox-1m', processProviderInboxOnce) });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Provider inbox error' });
  }
});

operationsSweepRouter.post('/api/internal/email-operations/sweep', requireAgentTool, async (_req, res) => {
  try {
    res.json({ success: true, result: await withDistributedAutomationLock('email-operations-1m', processEmailOperationsOnce) });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Email operations error' });
  }
});

operationsSweepRouter.post('/api/internal/reservation-lifecycle/sweep', requireAgentTool, async (_req, res) => {
  try { res.json({ success: true, result: await withDistributedAutomationLock('reservation-lifecycle-1m', () => runReservationLifecycleSweep(100)) }); }
  catch (err: any) { res.status(500).json({ success: false, error: err.message || 'Reservation lifecycle error' }); }
});

operationsSweepRouter.get('/api/admin/email-operations', requireAdmin, async (_req, res) => {
  try { res.json(await getEmailOperationsSnapshot()); }
  catch (err: any) { res.status(500).json({ success: false, error: err.message || 'Email operations snapshot error' }); }
});

operationsSweepRouter.post('/api/admin/email-operations/sweep', requireAdmin, async (_req, res) => {
  try { res.json({ success: true, result: await withDistributedAutomationLock('email-operations-1m', processEmailOperationsOnce) }); }
  catch (err: any) { res.status(500).json({ success: false, error: err.message || 'Email operations sweep error' }); }
});
