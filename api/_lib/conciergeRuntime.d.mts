// Tipos del bundle generado por `npm run build:concierge-runtime`
// (fuente: backend/vercel/conciergeRuntime.ts). No editar el .mjs a mano.
export type ConciergeRuntimeResult = { status: number; body: any };
export declare function configureVercelRuntimeEnv(env?: NodeJS.ProcessEnv): void;
export declare function deterministicConciergeFallback(body: any): Promise<ConciergeRuntimeResult>;
export declare function runConciergeInProcess(
  body: Record<string, unknown>,
  headers?: Record<string, unknown>,
  options?: { deadlineMs?: number },
): Promise<ConciergeRuntimeResult>;
