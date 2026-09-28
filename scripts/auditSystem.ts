import fs from 'node:fs';
import path from 'node:path';

type Finding = { severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'INFO'; id: string; message: string };

const root = process.cwd();
const findings: Finding[] = [];

function read(relative: string): string {
  return fs.readFileSync(path.join(root, relative), 'utf8');
}

function add(severity: Finding['severity'], id: string, message: string) {
  findings.push({ severity, id, message });
}

const agentTools = read('backend/agentTools.ts');
const registryNames = [...agentTools.matchAll(/^  ([A-Za-z0-9_]+): \{/gm)].map(m => m[1]);
const declarationNames = [...agentTools.matchAll(/^    name: '([^']+)'/gm)].map(m => m[1]);
const caseNames = [...agentTools.matchAll(/^    case '([^']+)':/gm)].map(m => m[1]);

const unique = (items: string[]) => [...new Set(items)];
const missingDeclarations = unique(registryNames).filter(name => !declarationNames.includes(name));
const undeclared = unique(declarationNames).filter(name => !registryNames.includes(name));
const missingExecutors = unique(registryNames).filter(name => !caseNames.includes(name));

if (missingDeclarations.length) add('CRITICAL', 'AI-TOOLS-001', `Tools in registry without Gemini declaration: ${missingDeclarations.join(', ')}`);
if (undeclared.length) add('HIGH', 'AI-TOOLS-002', `Gemini declarations not present in registry: ${undeclared.join(', ')}`);
if (missingExecutors.length) add('CRITICAL', 'AI-TOOLS-003', `Tools in registry without executor case: ${missingExecutors.join(', ')}`);
if (unique(declarationNames).length !== declarationNames.length) add('HIGH', 'AI-TOOLS-004', 'Duplicate Gemini function declaration names detected.');

const unsafeContact = ['8888', '7777'].join('-');
const providerService = read('backend/providerCommunicationService.ts');
if (!/resolveOperationalProvider/.test(providerService) || !/await resolveOperationalProvider/.test(providerService)) {
  add('HIGH', 'PROVIDER-004', 'Provider dispatch does not enforce an operational Firestore provider record before sending orders.');
}

const nativeWorkflows = read('backend/nativeWorkflows.ts');
if (/return match \|\| REGISTERED_PROVIDERS\[0\]/.test(providerService)) {
  add('CRITICAL', 'PROVIDER-001', 'Provider selection still falls back to a synthetic/static first provider.');
}
if (/\bactive:\s*true/.test(providerService) && !/verified\?: boolean/.test(providerService)) {
  add('HIGH', 'PROVIDER-002', 'Static provider directory contains operationally active providers without an explicit verification field.');
}
if (/fallbackProvider\.verified !== true/.test(nativeWorkflows) === false) {
  add('HIGH', 'PROVIDER-003', 'Direct-operations failover does not require explicit provider verification.');
}

function collectSourceFiles(startDir: string): string[] {
  const files: string[] = [];
  const stack = [startDir];
  while (stack.length) {
    const current = stack.pop()!;
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      if (['node_modules', '.git', 'dist', 'coverage'].includes(entry.name)) continue;
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(full);
      else if (entry.isFile() && /\.(ts|tsx|js|jsx|md)$/.test(entry.name)) files.push(full);
    }
  }
  return files;
}

for (const relative of ['backend', 'src', 'public', 'agent']) {
  const dir = path.join(root, relative);
  if (!fs.existsSync(dir)) continue;
  for (const file of collectSourceFiles(dir)) {
    const relativePath = path.relative(root, file);
    if (relativePath === 'scripts/auditSystem.ts') continue;
    const source = fs.readFileSync(file, 'utf8');
    if (/n8n/i.test(source)) add('HIGH', 'AUTOMATION-001', `n8n reference remains in ${relativePath}.`);
    if (/react-example/i.test(source)) add('MEDIUM', 'META-001', `Legacy project name react-example remains in ${relativePath}.`);
    if (/(?:8888)[-](?:7777)|88887777/.test(source)) add('HIGH', 'CONTACT-001', `Hardcoded private/emergency contact ${unsafeContact} remains in ${relativePath}.`);
  }
}

const server = read('server.ts');
const reservationLifecycle = read('backend/reservationLifecycleOrchestrator.ts');
if (!/createInFlightLimiter/.test(server) || !/apiAdmission/.test(server) || !/aiAdmission/.test(server)) {
  add('HIGH', 'ADMISSION-001', 'API admission control is missing from server.ts.');
}
if (!/256kb/.test(server) || !/parameterLimit: 100/.test(server)) {
  add('MEDIUM', 'PAYLOAD-001', 'HTTP body size limits are not explicitly hardened.');
}
const cronSource = read('backend/cronEngine.ts');
if (!/withDistributedAutomationLock/.test(cronSource) || !/automation_locks/.test(cronSource)) {
  add('HIGH', 'CRON-001', 'Distributed automation locking is not wired.');
}
if (!/getPendingReservationLifecycleBookings/.test(reservationLifecycle) || !/getPendingReservationLifecycleBookings/.test(read('backend/bookingService.ts'))) {
  add('HIGH', 'LIFECYCLE-001', 'Reservation lifecycle still scans the full booking history.');
}

const voiceService = read('backend/voiceAgentDeskService.ts');
if (/if \(!authToken\) return true/.test(voiceService) || /if \(!authToken\)\s*\{\s*return true/.test(voiceService)) {
  add('CRITICAL', 'VOICE-SEC-001', 'Voice webhook signature verification fails open when the provider token is missing.');
}
if (/verifyVoiceSignature\(/.test(server) && !/VOICE_PROVIDER_AUTH_TOKEN/.test(voiceService)) {
  add('HIGH', 'VOICE-SEC-002', 'Voice webhook route exists but its signature configuration is not visible in the voice service.');
}

if (/setInterval\(async \(\) =>[\s\S]*processPendingCustomerIntakeJobs/.test(server)) {
  add('MEDIUM', 'QUEUE-001', 'Customer Intake has an in-process sweep; production serverless deployments also need an external scheduler calling the protected queue endpoint.');
}

if (!/runReservationLifecycleSweep/.test(reservationLifecycle) || !/\/api\/internal\/reservation-lifecycle\/sweep/.test(server)) {
  add('CRITICAL', 'BOOKING-001', 'Reservation lifecycle orchestrator is not connected to the protected server endpoint.');
}
if (!/runReservationLifecycleSweep\(100\)/.test(cronSource)) {
  add('HIGH', 'BOOKING-002', 'Reservation lifecycle orchestrator is not scheduled by the native cron engine.');
}
if (!/claim\(/.test(reservationLifecycle) || !/reservation_lifecycle_events/.test(reservationLifecycle)) {
  add('HIGH', 'BOOKING-003', 'Reservation lifecycle orchestration lacks durable idempotent event tracking.');
}

const massiveEngine = read('backend/massiveProcessingEngine.ts');
if (!/QUEUE_BACKPRESSURE/.test(massiveEngine) || !/maxQueueDepth/.test(massiveEngine)) add('HIGH', 'QUEUE-004', 'Massive Processing Engine lacks an explicit queue ceiling/backpressure guard.');
if (/sweepPendingSlas[\s\S]*getAllBookings\(\)/.test(massiveEngine)) add('HIGH', 'QUEUE-005', 'Provider SLA sweep still scans all bookings.');

const emailOperations = read('backend/emailOperationsAgent.ts');
if (!/EMAIL_MAX_ATTEMPTS/.test(emailOperations) || !/claimed === 'terminal'/.test(emailOperations)) {
  add('MEDIUM', 'EMAIL-004', 'Email operations lacks a terminal retry guard for poison messages.');
}
if (!/processEmailOperationsOnce/.test(server) || !/\/api\/internal\/email-operations\/sweep/.test(server)) {
  add('CRITICAL', 'EMAIL-001', 'Autonomous email agent is not connected to a protected server endpoint.');
}
if (!/processEmailOperationsOnce/.test(cronSource) || !/email-operations-1m/.test(cronSource)) {
  add('HIGH', 'EMAIL-002', 'Autonomous email agent is not scheduled by the native cron engine.');
}
if (!/claimEvent/.test(emailOperations) || !/status === 'error'/.test(emailOperations)) {
  add('HIGH', 'EMAIL-003', 'Email operation queue lacks visible idempotent/recoverable claim handling.');
}

// Customer-facing booking truthfulness regression guards.
const tourDetail = read('src/pages/TourDetailPage.tsx');
if (/status:\s*[^\n]*(?:confirmada|confirmed)/i.test(tourDetail)) {
  add('CRITICAL', 'BOOKING-UX-001', 'TourDetailPage assigns a final confirmed status from the browser. Confirmation must remain server/provider-owned.');
}
if (/CR-PV-\$\{Math\.floor/.test(tourDetail) || /Math\.random\(\)[\s\S]{0,120}bookingId/.test(tourDetail)) {
  add('HIGH', 'BOOKING-UX-002', 'TourDetailPage still creates booking identifiers client-side.');
}
if (/navigate\(['"]\/bookings['"]\)/.test(tourDetail)) {
  add('HIGH', 'BOOKING-UX-003', 'TourDetailPage navigates to the legacy/noncanonical /bookings route.');
}
if (/150\+\s*reviews/i.test(tourDetail)) {
  add('HIGH', 'TRUST-001', 'TourDetailPage contains a hardcoded 150+ reviews social-proof claim.');
}
if (!/\/api\/tours\/\$\{encodeURIComponent\(tour\.id\)\}\/availability/.test(tourDetail)) {
  add('HIGH', 'AVAILABILITY-001', 'TourDetailPage does not visibly verify live availability before submitting a booking request.');
}
if (!/Idempotency-Key/.test(tourDetail)) {
  add('MEDIUM', 'BOOKING-UX-004', 'TourDetailPage does not send an idempotency key for booking creation.');
}

// Vercel must authenticate to private Cloud Run; anonymous rewrites are not accepted.
const gatewayPath = path.join(root, 'api', '[...path].ts');
if (!fs.existsSync(gatewayPath)) {
  add('HIGH', 'GATEWAY-001', 'Vercel /api gateway is missing; frontend and private Cloud Run cannot communicate through same-origin API calls.');
} else {
  const gateway = fs.readFileSync(gatewayPath, 'utf8');
  if (!/VERCEL_OIDC_TOKEN/.test(gateway) || !/sts\.googleapis\.com/.test(gateway) || !/x-serverless-authorization/i.test(gateway)) {
    add('CRITICAL', 'GATEWAY-002', 'Vercel gateway does not visibly implement OIDC/WIF authentication for private Cloud Run.');
  }
  if (/fetch\([^\n]*CLOUD_RUN_BACKEND_URL[\s\S]{0,300}catch[\s\S]{0,200}fetch\(/.test(gateway)) {
    add('CRITICAL', 'GATEWAY-003', 'Vercel gateway appears to fall back to a second/anonymous backend request after authentication failure.');
  }
}

// Legacy customer itinerary approval must not be confused with provider confirmation.
if (/\/api\/bookings\/:id\/customer-confirm[\s\S]{0,1400}status:\s*action === 'aprobado' \? 'confirmada'/.test(server)) {
  add('HIGH', 'LIFECYCLE-002', 'Customer itinerary approval still writes final booking confirmation before provider coordination. Migrate this route to record approval separately.');
}

// Public trust language is surfaced as debt until evidence-backed claims replace it.
const header = read('src/components/Header.tsx');
for (const claim of ['Agencia Receptiva Oficial', 'Operador Oficial', 'Tarifas Oficiales Directas']) {
  if (header.includes(claim)) add('MEDIUM', 'TRUST-002', `Public header still contains evidence-sensitive claim: ${claim}`);
}

const envExample = read('.env.example');
for (const key of ['AGENT_INTERNAL_TOKEN', 'CUSTOMER_INTAKE_JOB_TOKEN', 'WHATSAPP_APP_SECRET', 'WHATSAPP_WEBHOOK_VERIFY_TOKEN', 'VOICE_PROVIDER_AUTH_TOKEN', 'GMAIL_CLIENT_ID', 'GMAIL_CLIENT_SECRET', 'GMAIL_REFRESH_TOKEN', 'OUTLOOK_CLIENT_ID', 'OUTLOOK_CLIENT_SECRET', 'OUTLOOK_REFRESH_TOKEN', 'OUTLOOK_MAILBOX_USER']) {
  if (!envExample.includes(key)) add('HIGH', 'ENV-001', `${key} is not documented in .env.example.`);
}

const output = {
  generatedAt: new Date().toISOString(),
  registryTools: unique(registryNames).length,
  declaredTools: unique(declarationNames).length,
  executableTools: unique(caseNames).length,
  findings
};

console.log(JSON.stringify(output, null, 2));

if (findings.some(f => f.severity === 'CRITICAL')) process.exit(1);
