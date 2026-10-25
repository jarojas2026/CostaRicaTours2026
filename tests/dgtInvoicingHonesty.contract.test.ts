import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const engineSource = fs.readFileSync(path.join(root, 'backend/nativeAutomationEngine.ts'), 'utf8');
const routeSource = fs.readFileSync(path.join(root, 'backend/routes/automations.ts'), 'utf8');

function dgtFunctionSource(): string {
  const start = engineSource.indexOf('export async function executeDGTElectronicInvoicingSettlement');
  const end = engineSource.indexOf('WF-COMPLEX-05', start);
  assert.ok(start >= 0 && end > start, 'la función DGT debe seguir existiendo (no se borra)');
  return engineSource.slice(start, end);
}

test('la factura DGT simulada no inventa aceptación de Hacienda ni acuses', () => {
  const fn = dgtFunctionSource();
  assert.doesNotMatch(engineSource, /ACEPTADO_POR_DGT/);
  assert.doesNotMatch(fn, /acuseHaciendaHash/);
  assert.doesNotMatch(fn, /Math\.random/);
  assert.doesNotMatch(fn, /v4\.3/);
  assert.doesNotMatch(fn, /0\.04/);
  assert.doesNotMatch(fn, /PROGRAMADA_DISPERSION/);
  assert.doesNotMatch(fn, /3-101-999888/);
});

test('la ruta DGT responde 501 con estado honesto', () => {
  assert.match(routeSource, /executeDGTElectronicInvoicingSettlement\(req\.body\);\s*res\.status\(501\)\.json\(result\)/);
});

test('executeDGTElectronicInvoicingSettlement responde no_configurado / simulación', async () => {
  delete process.env.DGT_INVOICE_SIMULATION_PREVIEW;
  const mod = await import('../backend/nativeAutomationEngine');
  const result: any = await mod.executeDGTElectronicInvoicingSettlement({
    cliente: { nombre: 'Prueba' },
    detalleVenta: { montoTotalUSD: 113, proveedorId: 'op-1' },
  });
  assert.equal(result.exito, false);
  assert.equal(result.estado, 'no_configurado');
  assert.equal(result.simulacion, true);
  assert.equal(result.emitido, false);
  assert.equal(result.enviadoAHacienda, false);
  assert.equal(result.documentoFiscal, null);
  assert.equal(result.liquidacionBancariaOperador, null);
  assert.equal(result.borradorSimulacion, null);
  assert.match(result.mensaje, /TicoFactura/);
  const serialized = JSON.stringify(result);
  assert.doesNotMatch(serialized, /ACEPTADO/i);
  assert.doesNotMatch(serialized, /SHA256-/);
});

test('el borrador opcional queda marcado como simulación con IVA 13 % y sin acuse', async () => {
  process.env.DGT_INVOICE_SIMULATION_PREVIEW = 'true';
  try {
    const mod = await import('../backend/nativeAutomationEngine');
    const result: any = await mod.executeDGTElectronicInvoicingSettlement({ detalleVenta: { montoTotalUSD: 113 } });
    assert.equal(result.estado, 'no_configurado');
    assert.ok(result.borradorSimulacion);
    assert.match(result.borradorSimulacion.etiqueta, /SIMULACIÓN/);
    assert.equal(result.borradorSimulacion.subtotalUSD, 100);
    assert.equal(result.borradorSimulacion.impuestoIVAUSD, 13);
    assert.equal(result.borradorSimulacion.acuseHacienda, null);
    assert.equal(result.borradorSimulacion.claveNumerica, null);
    assert.doesNotMatch(JSON.stringify(result), /ACEPTADO/i);
  } finally {
    delete process.env.DGT_INVOICE_SIMULATION_PREVIEW;
  }
});
