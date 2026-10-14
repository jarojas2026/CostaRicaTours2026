import { METHODS } from 'node:http';
import type { Express } from 'express';

/** One registered Express layer, flattened across routers mounted at "/". */
export interface RouteEntry {
  /** `ROUTE` for app.METHOD()/router.METHOD(), `USE` for middleware and sub-apps. */
  kind: 'ROUTE' | 'USE';
  /** Upper-case HTTP methods (`ALL` for .all()); empty for USE layers. */
  methods: string[];
  /** Route path(s) as registered, or the mount regexp for USE layers. */
  path: string;
  /** Number of handlers on a route, or the middleware function name for USE layers. */
  handlers: number | string;
}

interface ExpressLayer {
  name: string;
  regexp: RegExp & { fast_slash?: boolean };
  handle: { stack?: ExpressLayer[] } & ((...args: unknown[]) => unknown);
  route?: {
    path: string | RegExp | Array<string | RegExp>;
    methods: Record<string, boolean>;
    stack: unknown[];
  };
}

function describePath(path: string | RegExp | Array<string | RegExp>): string {
  return Array.isArray(path) ? `[${path.map(String).join(', ')}]` : String(path);
}

/**
 * app.all() registers the handler once per HTTP method while router.all()
 * registers a single `_all` layer. Both answer every method, so the inventory
 * reports either form as `ALL` with the handlers of one method.
 */
function describeRoute(route: NonNullable<ExpressLayer['route']>): { methods: string[]; handlers: number } {
  const methods = Object.keys(route.methods);
  if (methods.includes('_all')) return { methods: ['ALL'], handlers: route.stack.length };
  if (methods.length === METHODS.length && route.stack.length % METHODS.length === 0) {
    return { methods: ['ALL'], handlers: route.stack.length / METHODS.length };
  }
  return { methods: methods.map((method) => method.toUpperCase()).sort(), handlers: route.stack.length };
}

function walk(stack: ExpressLayer[], out: RouteEntry[]): void {
  for (const layer of stack) {
    if (layer.route) {
      out.push({ kind: 'ROUTE', path: describePath(layer.route.path), ...describeRoute(layer.route) });
      continue;
    }
    // Domain routers are mounted at "/": flatten them so the inventory reflects
    // the order in which Express actually evaluates every layer.
    if (layer.name === 'router' && layer.regexp.fast_slash && Array.isArray(layer.handle.stack)) {
      walk(layer.handle.stack, out);
      continue;
    }
    out.push({ kind: 'USE', methods: [], path: String(layer.regexp), handlers: layer.name });
  }
}

/** Lists every layer registered on an Express 4 app, in evaluation order. */
export function listRegisteredRoutes(app: Express): RouteEntry[] {
  const router = (app as unknown as { _router?: { stack: ExpressLayer[] } })._router;
  if (!router) return [];
  const out: RouteEntry[] = [];
  walk(router.stack, out);
  return out;
}

export function formatRouteEntry(entry: RouteEntry): string {
  return entry.kind === 'ROUTE'
    ? `ROUTE ${entry.methods.join(',')} ${entry.path} (${entry.handlers})`
    : `USE ${entry.path} ${entry.handlers}`;
}
