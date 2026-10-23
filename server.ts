// Clean tsx injected relative __dirname which breaks module resolution in vite plugins
if (typeof (globalThis as any).__dirname !== 'undefined' && (globalThis as any).__dirname === '.') {
  delete (globalThis as any).__dirname;
}
if (typeof (global as any).__dirname !== 'undefined' && (global as any).__dirname === '.') {
  delete (global as any).__dirname;
}

import dotenv from 'dotenv';
dotenv.config();

/**
 * Raíz de composición del servidor full-stack.
 *
 * Las rutas viven en backend/routes/* (un router por dominio) y se montan en
 * backend/app.ts. Este archivo solo arranca procesos: el worker de la cola de
 * customer intake, Vite/estáticos y el listener HTTP.
 */
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { initializeAutomationEngine, withDistributedAutomationLock } from './backend/cronEngine';
import { hydrateSkillGenome } from './backend/skillGenome';
import { syncAgentRegistryFromKnowledgeFabric } from './backend/agentRegistryService';
import { processPendingCustomerIntakeJobs } from './backend/customerIntakeGateway';
import { createApp } from './backend/app';
import { initServerSentry } from './backend/observability/sentry';
import { warmInternalDataStore } from './backend/internalDataStore';

const app = createApp();
const PORT = Number(process.env.PORT) || 3000;

let customerIntakeQueueRunning = false;
setInterval(async () => {
  if (customerIntakeQueueRunning) return;
  customerIntakeQueueRunning = true;
  try {
    await withDistributedAutomationLock('customer-intake-worker-5s', () => processPendingCustomerIntakeJobs(10));
  } catch (error) {
    console.warn('Customer Intake queue sweep failed:', error);
  } finally {
    customerIntakeQueueRunning = false;
  }
}, 5000);

// ==========================================
// 🚀 MIDDLEWARE VITE (FULL-STACK SPA + BACKEND)
// ==========================================

async function startServer() {
  // Opt-in error monitoring: no-op unless SENTRY_DSN is set.
  if (await initServerSentry().catch((err) => { console.warn('Sentry init skipped:', err); return false; })) {
    console.log('🛰️ Sentry activo para errores del servidor (sin PII).');
  }
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
        ws: false
      },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    // Express 5 / path-to-regexp 8: a bare '*' is no longer valid; '/{*splat}'
    // also matches '/'.
    app.get('/{*splat}', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Datos internos de operadores (Firestore privado en producción): se cargan antes de
  // aceptar tráfico para que la redacción de proveedores tenga su denylist desde el inicio.
  await warmInternalDataStore()
    .then((snap) => console.log(`🔒 Datos internos de operadores: ${snap.source} (${snap.tourSources.length} tours).`))
    .catch((err) => console.warn('Internal data warm-up failed:', err));
  hydrateSkillGenome().catch(err => console.warn('Skill Genome hydration skipped:', err));
  syncAgentRegistryFromKnowledgeFabric().catch(err => console.warn('Agent registry bootstrap skipped:', err));
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor Full-Stack corriendo en http://0.0.0.0:${PORT}`);
    console.log(`🧠 Motor de IA nativo listo: Gemini/Vertex + Claude + automatización Node.js/Firestore.`);
    initializeAutomationEngine();
  });
}

startServer();
