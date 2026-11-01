import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const read = (relativePath: string) => fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');

test('Cloud Run runtime image retains the named Firestore database configuration', () => {
  const dockerfile = read('Dockerfile');
  assert.match(
    dockerfile,
    /COPY --from=builder \/app\/firebase-applet-config\.json \.\/firebase-applet-config\.json/,
    'Runtime image must keep firebase-applet-config.json so bookingService can resolve the named Firestore database.'
  );
});

test('Cloud Run deployment remains paused and cannot recover or enable cloud identities', () => {
  const workflow = read('.github/workflows/deploy-cloud-run.yml');
  assert.match(workflow, /workflow_dispatch/);
  assert.match(workflow, /if:\s*false/);
  assert.match(workflow, /Deshabilitado por política de costo cero/);
  assert.doesNotMatch(workflow, /gcloud\s+iam\s+service-accounts\s+enable/i);
  assert.doesNotMatch(workflow, /google-github-actions\/auth/);
  assert.doesNotMatch(workflow, /id-token:\s*write/);
  assert.doesNotMatch(workflow, /--allow-unauthenticated/);
});

test('paused Cloud Run workflow performs no availability probes or deployment operations', () => {
  const workflow = read('.github/workflows/deploy-cloud-run.yml');
  assert.doesNotMatch(workflow, /\/api\/tours\/arenal-volcano-hotsprings\/availability/);
  assert.doesNotMatch(workflow, /gcloud\s+run\s+deploy/i);
  assert.doesNotMatch(workflow, /google-github-actions\/deploy-cloudrun/);
  assert.match(workflow, /No se ejecutó autenticación, build ni despliegue/);
});
