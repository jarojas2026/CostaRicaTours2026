from pathlib import Path
import re

native_path = Path('backend/nativeWorkflows.ts')
server_path = Path('server.ts')
test_path = Path('tests/providerTruthPlane.contract.test.ts')

native = native_path.read_text()
server = server_path.read_text()
test = test_path.read_text()

# Remove the duplicate legacy payout implementation. The canonical payout service
# already enforces live PayPal, verified provider/payment, past service date and
# never marks simulations as paid.
pattern = re.compile(
    r"\nexport async function executeAutomatedProviderPayouts\(\): Promise<\{.*?\n\}\n\n// =========================================================================\n// 4\. VIGILANCIA",
    re.S,
)
native, count = pattern.subn("\n// =========================================================================\n// 4. VIGILANCIA", native, count=1)
if count != 1:
    raise SystemExit(f'legacy payout function: expected 1 match, found {count}')

# Server must import payouts only from the fail-closed canonical service.
old = "  executeCustomerProformaConfirmation,\n  executeAutomatedProviderPayouts,\n  executeSurveillanceAndEscalation,"
new = "  executeCustomerProformaConfirmation,\n  executeSurveillanceAndEscalation,"
if server.count(old) != 1:
    raise SystemExit(f'native payout import: expected 1 match, found {server.count(old)}')
server = server.replace(old, new, 1)

anchor = "} from './backend/nativeWorkflows';\n"
if server.count(anchor) != 1:
    raise SystemExit(f'native workflow import anchor: expected 1 match, found {server.count(anchor)}')
server = server.replace(
    anchor,
    anchor + "import { executeAutomatedProviderPayouts } from './backend/providerPayoutService';\n",
    1,
)

# The manual operator trigger remains available, but the old public webhook/batch
# alias is no longer an unauthenticated money-moving endpoint.
pattern = re.compile(
    r"// 3\. Pagos Automáticos a Proveedores \(Batch / Cron Trigger\)\napp\.post\(\['/api/payouts/run-batch', '/webhook/pagos-proveedores-batch'\], async \(req, res\) => \{.*?\n\}\);",
    re.S,
)
replacement = """// 3. Ejecución manual de liquidaciones a proveedores.
// El cron interno invoca providerPayoutService directamente; no existe webhook público.
app.post('/api/payouts/run-batch', requireAdmin, async (_req, res) => {
  try {
    const result = await executeAutomatedProviderPayouts();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/webhook/pagos-proveedores-batch', (_req, res) => {
  res.status(410).json({
    success: false,
    error: 'Webhook legado retirado. Las liquidaciones se ejecutan por el cron interno o por un administrador autenticado.'
  });
});"""
server, count = pattern.subn(replacement, server, count=1)
if count != 1:
    raise SystemExit(f'legacy payout route: expected 1 match, found {count}')

# Strengthen the regression contract so the unsafe implementation cannot return.
needle = "  assert.match(native, /ALLOW_LEGACY_PROVIDER_DIRECTORY/);\n});"
addition = """  assert.match(native, /ALLOW_LEGACY_PROVIDER_DIRECTORY/);
  assert.equal(native.includes('SUCCESS_SIMULATED'), false);
  assert.equal(native.includes("booking.totalUSD || booking.totalAmount || 100"), false);
});"""
if test.count(needle) != 1:
    raise SystemExit(f'provider contract anchor: expected 1 match, found {test.count(needle)}')
test = test.replace(needle, addition, 1)

needle = "  assert.match(server, /sourceOfTruth: 'firestore'/);\n});"
addition = """  assert.match(server, /sourceOfTruth: 'firestore'/);
  assert.match(server, /executeAutomatedProviderPayouts \} from '\.\/backend\/providerPayoutService'/);
  assert.match(server, /app\.post\('\/api\/payouts\/run-batch', requireAdmin/);
  assert.match(server, /app\.post\('\/webhook\/pagos-proveedores-batch'[\s\S]*status\(410\)/);
});"""
if test.count(needle) != 1:
    raise SystemExit(f'server payout contract anchor: expected 1 match, found {test.count(needle)}')
test = test.replace(needle, addition, 1)

native_path.write_text(native)
server_path.write_text(server)
test_path.write_text(test)
