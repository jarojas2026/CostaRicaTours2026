/**
 * Firestore en memoria mínimo para contratos (where/limit/get, doc get/set/update,
 * batch, runTransaction). No persiste nada fuera del proceso.
 */
type Docs = Record<string, Record<string, Record<string, any>>>;

export function createFakeFirestore(initial: Docs = {}) {
  const data: Docs = JSON.parse(JSON.stringify(initial));
  const writes: Array<{ op: string; collection: string; id: string; value?: any }> = [];
  const coll = (name: string) => (data[name] ||= {});

  const docRef = (collection: string, id: string) => ({
    id,
    collection,
    async get() {
      const value = coll(collection)[id];
      return { exists: value !== undefined, id, data: () => (value === undefined ? undefined : JSON.parse(JSON.stringify(value))) };
    },
    async set(value: any, opts?: { merge?: boolean }) {
      writes.push({ op: 'set', collection, id, value });
      coll(collection)[id] = opts?.merge ? { ...(coll(collection)[id] || {}), ...value } : value;
    },
    async update(value: any) {
      if (coll(collection)[id] === undefined) throw new Error('NOT_FOUND');
      writes.push({ op: 'update', collection, id, value });
      coll(collection)[id] = { ...coll(collection)[id], ...value };
    },
    async create(value: any) {
      if (coll(collection)[id] !== undefined) throw new Error('ALREADY_EXISTS');
      writes.push({ op: 'create', collection, id, value });
      coll(collection)[id] = value;
    },
  });

  const query = (collection: string, filters: Array<[string, string, any]> = [], max = Infinity): any => ({
    where: (field: string, op: string, value: any) => query(collection, [...filters, [field, op, value]], max),
    orderBy: () => query(collection, filters, max),
    limit: (n: number) => query(collection, filters, n),
    async get() {
      const docs = Object.entries(coll(collection))
        .filter(([, doc]) => filters.every(([f, op, v]) => {
          const actual = doc[f];
          if (op === '==') return actual === v;
          if (op === 'in') return Array.isArray(v) && v.includes(actual);
          if (op === '>=') return actual >= v;
          if (op === '<=') return actual <= v;
          if (op === '<') return actual < v;
          throw new Error(`op ${op} no soportado`);
        }))
        .slice(0, max)
        .map(([id, doc]) => ({ id, data: () => JSON.parse(JSON.stringify(doc)) }));
      return { empty: docs.length === 0, docs, size: docs.length };
    },
  });

  const db: any = {
    collection: (name: string) => ({ ...query(name), doc: (id: string) => docRef(name, id) }),
    batch() {
      const ops: Array<() => Promise<void>> = [];
      return {
        set: (ref: any, v: any, o?: any) => ops.push(() => ref.set(v, o)),
        update: (ref: any, v: any) => ops.push(() => ref.update(v)),
        create: (ref: any, v: any) => ops.push(() => ref.create(v)),
        commit: async () => { for (const op of ops) await op(); },
      };
    },
    async runTransaction(fn: (tx: any) => Promise<any>) {
      const ops: Array<() => Promise<void>> = [];
      const tx = {
        get: (ref: any) => ref.get(),
        set: (ref: any, v: any, o?: any) => ops.push(() => ref.set(v, o)),
        update: (ref: any, v: any) => ops.push(() => ref.update(v)),
        create: (ref: any, v: any) => ops.push(() => ref.create(v)),
      };
      const result = await fn(tx);
      for (const op of ops) await op();
      return result;
    },
  };
  return { db, data, writes };
}
