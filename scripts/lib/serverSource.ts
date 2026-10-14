import fs from 'node:fs';
import path from 'node:path';

/**
 * Archivos que componen el servidor Express, en el orden en que se registran
 * sus capas: composición (backend/app.ts), middlewares compartidos, módulos de
 * dominio según backend/routes/index.ts y arranque (server.ts). Un módulo puede
 * exportar varios routers montados en posiciones distintas; el orden exacto de
 * las capas lo verifica tests/serverRoutes.contract.test.ts sobre la app real.
 */
export function serverSourceFiles(root: string = process.cwd()): string[] {
  const routesDir = path.join(root, 'backend', 'routes');
  const index = fs.readFileSync(path.join(routesDir, 'index.ts'), 'utf8');
  const routeModules = [...index.matchAll(/from '\.\/(\w+)'/g)].map((match) => match[1]);
  return [
    path.join(root, 'backend', 'app.ts'),
    path.join(routesDir, 'shared.ts'),
    ...routeModules.map((name) => path.join(routesDir, `${name}.ts`)),
    path.join(root, 'server.ts'),
  ];
}

/**
 * Fuente concatenada del servidor para auditorías estáticas y contract tests.
 *
 * Los registros `xRouter.post(` de los routers de dominio se normalizan a
 * `app.post(` para que las verificaciones de texto (auth por ruta, orden de
 * handlers) no dependan de en qué router vive cada ruta. El orden real de las
 * rutas lo verifica tests/serverRoutes.contract.test.ts contra la app.
 */
export function readServerSource(root: string = process.cwd()): string {
  return serverSourceFiles(root)
    .map((file) => fs.readFileSync(file, 'utf8'))
    .join('\n')
    .replace(/^(\s*)\w+Router\.(get|post|put|patch|delete|all|use)\(/gm, '$1app.$2(');
}
