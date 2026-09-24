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
const unsafeContactCompact = '88887777';

const providerService = read('backend/providerCommunicationService.ts');
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

for (const relative of ['backend', 'src', 'scripts', 'public', 'docs']) {
  const dir = path.join(root, relative);
  if (!fs.existsSync(dir)) continue;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isFile() || !/\.(ts|tsx|js|jsx|md)$/.test(entry.name)) continue;
    const file = path.join(dir, entry.name);
    const source = fs.readFileSync(file, 'utf8');
    const relativePath = path.relative(root, file);
    if (relativePath === 'scripts/auditSystem.ts') continue;
    if (/n8n/i.test(source)) add('HIGH', 'AUTOMATION-001', `n8n reference remains in ${relativePath}.`);
    if (/react-example/i.test(source)) add('MEDIUM', 'META-001', `Legacy project name react-example remains in ${relativePath}.`);
    if (/(?:8888)[-](?:7777)|88887777/.test(source)) add('HIGH', 'CONTACT-001', `Hardcoded private/emergency contact ${unsafeContact} remains in ${relativePath}.`);
  }
}

const server = read('server.ts');
const voiceService = read('backend/voiceAgentDeskService.ts');
if (/if \(!authToken\) return true/.test(voiceService) || /if \(!authToken\)\\s*\\{\\s*return true/.test(voiceService)) {
  add('CRITICAL', 'VOICE-SEC-001', 'Voice webhook signature verification fails open when the provider token is missing.');
}
if (/verifyVoiceSignature\(/.test(server) && !/VOICE_PROVIDER_AUTH_TOKEN/.test(voiceService)) {
  add('HIGH', 'VOICE-SEC-002', 'Voice webhook route exists but its signature configuration is not visible in the voice service.');
}

if (/setInterval\(async \(\) =>[\\s\\S]*processPendingCustomerIntakeJobs/.test(server)) {
  add('MEDIUM', 'QUEUE-001', 'Customer Intake has an in-process sweep; production serverless deployments also need an external scheduler calling the protected queue endpoint.');
}

const reservationLifecycle = read('backend/reservationLifecycleOrchestrator.ts');
if (!/runReservationLifecycleSweep/.test(reservationLifecycle) || !/\/api\/internal\/reservation-lifecycle\/sweep/.test(server)) {
  add('CRITICAL', 'BOOKING-001', 'Reservation lifecycle orchestrator is not connected to the protected server endpoint.');
}
if (!/runReservationLifecycleSweep\(100\)/.test(read('backend/cronEngine.ts'))) {
  add('HIGH', 'BOOKING-002', 'Reservation lifecycle orchestrator is not scheduled by the native cron engine.');
}
if (!/claim\(/.test(reservationLifecycle) || !/reservation_lifecycle_events/.test(reservationLifecycle)) {
  add('HIGH', 'BOOKING-003', 'Reservation lifecycle orchestration lacks durable idempotent event tracking.');
}
if (!/withDistributedAutomationLock/.test(read('backend/cronEngine.ts')) || !/automation_locks/.test(read('backend/cronEngine.ts'))) {
  add('HIGH', 'AUTOMATION-LOCK-001', 'Recurring automation jobs lack the distributed Firestore lock guard.');
}
if (!/getPendingReservationLifecycleBookings/.test(read('backend/bookingService.ts')) || !/getPendingReservationLifecycleBookings/.test(reservationLifecycle)) {
  add('HIGH', 'BOOKING-SCALE-001', 'Reservation lifecycle sweep is not using the indexed pending-state query path.');
}
const emailOperations = read('backend/emailOperationsAgent.ts');
if (!/processEmailOperationsOnce/.test(server) || !/\/api\/internal\/email-operations\/sweep/.test(server)) {
  add('CRITICAL', 'EMAIL-001', 'Autonomous email agent is not connected to a protected server endpoint.');
}
if (!/processEmailOperationsOnce\(\)/.test(read('backend/cronEngine.ts'))) {
  add('HIGH', 'EMAIL-002', 'Autonomous email agent is not scheduled by the native cron engine.');
}
if (!/claimEvent/.test(emailOperations) || !/status === 'error'/.test(emailOperations)) {
  add('HIGH', 'EMAIL-003', 'Email operation queue lacks visible idempotent/recoverable claim handling.');
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
