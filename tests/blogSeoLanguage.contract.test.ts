import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const metadata = readFileSync('src/components/RouteMetadata.tsx', 'utf8');
const article = readFileSync('src/pages/BlogArticlePage.tsx', 'utf8');
const sitemap = readFileSync('public/sitemap.xml', 'utf8');
const blogData = readFileSync('src/data/blogPosts.ts', 'utf8');

test('blog renders ES content and declares canonical language based on actual article language', () => {
  assert.match(article, /const lang = language === 'es' \? 'es' : 'en'/);
  assert.match(metadata, /const isBlogArticle = pathname\.startsWith\('\/blog\/'\)/);
  assert.match(metadata, /const seoLanguage: Language = isBlogArticle \? \(language === 'es' \? 'es' : 'en'\) : language/);
  assert.match(metadata, /document\.documentElement\.lang = htmlLang\(seoLanguage\)/);
  assert.match(metadata, /const pinnedLanguage = isBlogArticle \? lang : languageFromQuery\(search\)/);
  assert.match(metadata, /upsertCanonical\(pinnedLanguage \? `\$\{canonicalUrl\}\?lang=\$\{pinnedLanguage\}` : canonicalUrl\)/);
});

test('blog head emits ES/EN hreflang alternates and x-default, not untranslated extra locales', () => {
  assert.match(metadata, /upsertAlternates\(canonicalUrl, isBlogArticle \? \['es', 'en'\] : ENABLED_LANGUAGES\)/);
  assert.match(metadata, /languageCodes: readonly Language\[\] = ENABLED_LANGUAGES/);
  for (const lang of ['es', 'en']) assert.match(sitemap, new RegExp(`hreflang="${lang}" href="https:\\/\\/costaricatours2026\\.vercel\\.app\\/blog\\/[^"]+\\?lang=${lang}"`));
  assert.match(sitemap, /hreflang="x-default" href="https:\/\/costaricatours2026\.vercel\.app\/blog\//);
});

test('blog source contains Spanish title, excerpt, article sections and image alt', () => {
  assert.match(blogData, /title: \{ es:/);
  assert.match(blogData, /excerpt: \{ es:/);
  assert.match(blogData, /heading: \{ es:/);
  assert.match(blogData, /imageAlt: \{ es:/);
});
