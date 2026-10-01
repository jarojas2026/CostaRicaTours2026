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

test('Cloud Run deployment recovers disabled build identity without opening the service publicly', () => {
  const workflow = read('.github/workflows/deploy-cloud-run.yml');
  assert.match(workflow, /gcloud iam service-accounts enable "\$DEFAULT_COMPUTE_SA"/);
  assert.match(workflow, /FIREBASE_PROJECT_ID=\$PROJECT_ID,FIRESTORE_DATABASE_ID=\$FIRESTORE_DATABASE_ID/);
  assert.doesNotMatch(workflow, /--allow-unauthenticated/);
});

test('Cloud Run deployment verifies availability does not fall back to inaccessible Firestore', () => {
  const workflow = read('.github/workflows/deploy-cloud-run.yml');
  assert.match(workflow, /\/api\/tours\/arenal-volcano-hotsprings\/availability/);
  assert.match(workflow, /disponibilidad en vivo no está accesible\|servicio de disponibilidad no respondió/);
});
