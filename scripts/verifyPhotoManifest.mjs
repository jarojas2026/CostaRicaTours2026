#!/usr/bin/env node
// Verifica en red que cada foto del manifiesto responde 200 image/* (no corre en CI: requiere red).
// Uso: node scripts/verifyPhotoManifest.mjs
import fs from 'node:fs';
const manifest = JSON.parse(fs.readFileSync(new URL('../src/data/photoManifest.json', import.meta.url), 'utf8'));
const UA = 'CostaRicaTours2026-photo-audit/1.0 (https://github.com/jarojas2026/CostaRicaTours2026)';
let failed = 0;
for (const p of manifest.photos) {
  const url = p.source === 'unsplash' ? `${p.url}?w=64&q=10` : p.url;
  const checks = [url, ...(p.sourcePage ? [p.sourcePage] : [])];
  for (const u of checks) {
    const res = await fetch(u, { method: 'GET', headers: { 'User-Agent': UA } }).catch(e => ({ ok: false, status: String(e) }));
    const type = res.headers?.get?.('content-type') || '';
    const okType = u === p.sourcePage ? /text\/html/.test(type) : /^image\//.test(type);
    if (!res.ok || !okType) { failed++; console.error('FALLA', p.key, res.status, type, u); }
    await new Promise(r => setTimeout(r, 400));
  }
}
console.log(failed ? `${failed} fallas` : `OK: ${manifest.photos.length} fotos verificadas`);
process.exit(failed ? 1 : 0);
