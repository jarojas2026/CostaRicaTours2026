import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// #329: el banner de cookies añade padding-bottom al body; el contenedor de scroll de la app
// debe medir el alto real de #root (h-full) y no 100vh, o su parte inferior queda
// tapada e inalcanzable (gate de login en /admin, /ops…).
test('#329 app scroll container follows #root height instead of 100vh', () => {
  const app = readFileSync('src/App.tsx', 'utf8');
  const shell = app.match(/<div className="([^"]*overflow-y-auto[^"]*)"/)?.[1] || '';
  assert.match(shell, /\bh-full\b/);
  assert.doesNotMatch(shell, /\bmax-h-screen\b|\bmin-h-screen\b/);
  const banner = readFileSync('src/components/CookiesBanner.tsx', 'utf8');
  assert.match(banner, /body\.style\.paddingBottom/, 'banner still reserves space via body padding');
});

// #330: imagen de Unsplash eliminada (404, cargada 2 veces en /blog).
test('#330 blog posts do not reference the removed Unsplash photo', () => {
  const posts = readFileSync('src/data/blogPosts.ts', 'utf8');
  assert.doesNotMatch(posts, /photo-1518132715369-0f866418858f/);
});
