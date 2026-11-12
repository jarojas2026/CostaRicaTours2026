// Empaqueta el concierge canónico para las funciones de Vercel (ESM, $0, sin Cloud Run).
// Fuente: backend/vercel/conciergeRuntime.ts → salida: api/_lib/conciergeRuntime.mjs
// Las dependencias de npm quedan externas (Vercel las incluye con su rastreo de archivos).
// El almacén de datos internos de operadores y el listado de prospectos B2B se
// sustituyen por versiones vacías: las funciones públicas no incluyen datos de
// operadores (en Vercel no hay Firestore ni pipeline de leads que los use).
import { build } from 'esbuild';
import path from 'node:path';

const root = process.cwd();
const internalStore = path.join(root, 'backend', 'internalDataStore.ts');
const internalStub = path.join(root, 'backend', 'vercel', 'internalDataUnavailable.ts');
const prospectsJson = path.join(root, 'data', 'operators', 'operatorProspects.json');

const noInternalOperatorData = {
  name: 'no-internal-operator-data',
  setup(b) {
    b.onResolve({ filter: /internalDataStore$/ }, args => {
      const resolved = path.resolve(args.resolveDir, `${args.path}.ts`);
      return resolved === internalStore ? { path: internalStub } : undefined;
    });
    b.onResolve({ filter: /operatorProspects\.json$/ }, args => (
      path.resolve(args.resolveDir, args.path) === prospectsJson ? { path: 'operatorProspects.json', namespace: 'no-operator-prospects' } : undefined
    ));
    b.onLoad({ filter: /.*/, namespace: 'no-operator-prospects' }, () => ({
      loader: 'json',
      contents: JSON.stringify({
        generatedAt: '1970-01-01T00:00:00.000Z',
        disclaimer: { es: 'No disponible en funciones públicas.', en: 'Not available in public functions.' },
        operators: [],
        catalogMatches: [],
      }),
    }));
  },
};

await build({
  entryPoints: ['backend/vercel/conciergeRuntime.ts'],
  outfile: 'api/_lib/conciergeRuntime.mjs',
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node20',
  packages: 'external',
  legalComments: 'none',
  logLevel: 'warning',
  banner: { js: '// GENERADO por npm run build:concierge-runtime desde backend/vercel/conciergeRuntime.ts. No editar a mano.' },
  plugins: [noInternalOperatorData],
});
