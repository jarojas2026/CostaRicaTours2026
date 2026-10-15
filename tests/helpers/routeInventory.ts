import { METHODS } from 'node:http';
import express, { type Express } from 'express';

/** One registered Express layer, flattened across routers mounted at "/". */
export interface RouteEntry {
  /** `ROUTE` for app.METHOD()/router.METHOD(), `USE` for middleware and sub-apps. */
  kind: 'ROUTE' | 'USE';
  /** Upper-case HTTP methods (`ALL` for .all()); empty for USE layers. */
  methods: string[];
  /** Route path(s) as registered, or the mount path(s) for USE layers. */
  path: string;
  /** Number of handlers on a route, or the middleware function name for USE layers. */
  handlers: number | string;
}

type MountPath = string | RegExp | Array<string | RegExp>;

interface ExpressLayer {
  name: string;
  /** Set by the instrumentation below: Express 5 layers do not keep their path. */
  __mountPath?: MountPath;
  handle: { stack?: ExpressLayer[] } & ((...args: unknown[]) => unknown);
  route?: {
    path: MountPath;
    methods: Record<string, boolean>;
    stack: unknown[];
  };
}

/**
 * Express 5 (router 2.x) compiles mount paths into closures, so a USE layer no
 * longer exposes the path it was mounted at. Record it at registration time.
 * This module must be imported before backend/app (domain routers register
 * their middleware at import time).
 */
const routerProto = (express.Router as unknown as { prototype: Record<string, any> }).prototype;
if (!routerProto.__crtInventoryPatched) {
  const originalUse = routerProto.use;
  routerProto.use = function patchedUse(this: { stack: ExpressLayer[] }, ...args: unknown[]) {
    const before = this.stack.length;
    let probe: unknown = args[0];
    while (Array.isArray(probe) && probe.length) probe = probe[0];
    const mountPath = (typeof probe === 'function' ? '/' : args[0]) as MountPath;
    const result = originalUse.apply(this, args);
    for (const layer of this.stack.slice(before)) layer.__mountPath = mountPath;
    return result;
  };
  routerProto.__crtInventoryPatched = true;
}

function describePath(path: MountPath): string {
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
    if (layer.name === 'router' && layer.__mountPath === '/' && Array.isArray(layer.handle.stack)) {
      walk(layer.handle.stack, out);
      continue;
    }
    out.push({ kind: 'USE', methods: [], path: describePath(layer.__mountPath ?? '?'), handlers: layer.name });
  }
}

/** Lists every layer registered on an Express 5 app, in evaluation order. */
export function listRegisteredRoutes(app: Express): RouteEntry[] {
  const router = (app as unknown as { router?: { stack: ExpressLayer[] } }).router;
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
