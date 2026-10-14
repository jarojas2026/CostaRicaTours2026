/**
 * Punto de entrada histórico del catálogo para el servidor y los scripts.
 *
 * Re-exporta los metadatos y el listado completo de tours. El frontend NO debe
 * importar este módulo (arrastraría ~180 kB al bundle inicial): usa
 * ./catalogMeta para metadatos y loadTours() de ./loadTours para los tours.
 * Lo verifica tests/bundleBudget.contract.test.ts.
 */
export * from './catalogMeta';
export { TOURS, TOURS_DATA } from './toursCatalog';
