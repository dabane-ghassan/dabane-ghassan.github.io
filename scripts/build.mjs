#!/usr/bin/env node
/**
 * Builds the site indexes:
 *   posts/index.json          from posts/*.md
 *   presentations/index.json  from presentations/*.html (and presentations/<folder>/index.html)
 *   feed.xml, sitemap.xml
 *
 *   node scripts/build.mjs
 *
 * No dependencies. GitHub Actions runs this on every push (see .github/workflows/deploy.yml),
 * so you only need to run it yourself when previewing locally.
 *
 * Posts:
 *   - every posts/*.md becomes a post; the file name (without .md) is its URL slug
 *   - files starting with "_" (like _template.md) are ignored
 *   - `draft: true` in the front matter hides a post
 *
 * Presentations:
 *   - title comes from the deck's <title>
 *   - date from <meta name="date" content="2026-05-12">, else from a file name like 2026-05-12-my-talk.html
 *   - optional <meta name="event" content="BraiNets Day">
 *   - language from <html lang="…">
 *   - files starting with "_" are ignored
 */
import { readFileSync, writeFileSync, readdirSync, existsSync, statSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const POSTS = join(ROOT, 'posts');
const config = JSON.parse(readFileSync(join(ROOT, 'site.config.json'), 'utf8'));
const SITE = (process.env.SITE_URL || config.url || '').replace(/\/$/, '');

function scalar(v) {
  v = v.trim();
  if (/^(['"]).*\1$/.test(v)) return v.slice(1, -1);
  v = v.replace(/\s+#.*$/, '');
  if (/^\[.*\]$/.test(v)) return v.slice(1, -1).split(',').map(scalar).filter((x) => x !== '');
  if (v === 'true') return true;
  if (v === 'false') return false;
  return v;
}

function frontMatter(src) {
  src = src.replace(/^﻿/, '');
  const m = /^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/.exec(src);
  if (!m) return { data: {}, body: src };
  const data = {};
  let key = null;
  for (const line of m[1].split(/\r?\n/)) {
    if (!line.trim() || /^\s*#/.test(line)) continue;
    const li = /^\s*-\s+(.*)$/.exec(line);
    if (li && key) { if (!Array.isArray(data[key])) data[key] = []; data[key].push(scalar(li[1])); continue; }
    const kv = /^([A-Za-z0-9_-]+)\s*:\s*(.*)$/.exec(line);
    if (kv) { key = kv[1]; data[key] = kv[2].trim() === '' ? '' : scalar(kv[2]); }
  }
  return { data, body: src.slice(m[0].length) };
}

function plainText(md) {
  return md
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/\$\$[\s\S]*?\$\$/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[\^[^\]]+\]/g, '')
    .replace(/^#+\s.*$/gm, ' ')
    .replace(/[*_`>#]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const xml = (s) => String(s ?? '').replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]));

const warnings = [];
const posts = [];
for (const file of readdirSync(POSTS).filter((f) => f.endsWith('.md') && !f.startsWith('_')).sort()) {
  const slug = file.replace(/\.md$/, '');
  if (!/^[\w.-]+$/.test(slug)) { warnings.push(`${file}: use only letters, digits, "-", "_" or "." in file names`); continue; }
  const { data, body } = frontMatter(readFileSync(join(POSTS, file), 'utf8'));
  if (data.draft === true) continue;
  if (!data.title) warnings.push(`${file}: missing "title"`);
  const date = String(data.date || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) warnings.push(`${file}: "date" should look like 2026-10-28`);
  const text = plainText(body);
  const words = text.split(' ').filter(Boolean).length;
  const tags = Array.isArray(data.tags) ? data.tags : data.tags ? String(data.tags).split(',').map((s) => s.trim()) : [];
  posts.push({
    slug,
    title: data.title || slug,
    date,
    lang: data.lang === 'fr' ? 'fr' : 'en',
    tags,
    summary: data.summary || (text.length > 180 ? text.slice(0, 177).replace(/\s+\S*$/, '') + '…' : text),
    ref: data.ref || slug,
    minutes: Math.max(1, Math.round(words / 220)),
  });
}
posts.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.slug.localeCompare(b.slug)));

writeFileSync(join(POSTS, 'index.json'), JSON.stringify({ generated: new Date().toISOString(), posts }, null, 2) + '\n');

// RSS
const items = posts.slice(0, 30).map((p) => `    <item>
      <title>${xml(p.title)}</title>
      <link>${SITE}/post.html?p=${encodeURIComponent(p.slug)}</link>
      <guid>${SITE}/post.html?p=${encodeURIComponent(p.slug)}</guid>
      <pubDate>${new Date(p.date + 'T12:00:00Z').toUTCString()}</pubDate>
      <description>${xml(p.summary)}</description>
${p.tags.map((t) => `      <category>${xml(t)}</category>`).join('\n')}
    </item>`).join('\n');
writeFileSync(join(ROOT, 'feed.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${xml(config.title)}</title>
    <link>${SITE}/</link>
    <description>${xml(config.description)}</description>
    <language>en</language>
${items}
  </channel>
</rss>
`);

// presentations
const TALKS = join(ROOT, 'presentations');
if (!existsSync(TALKS)) mkdirSync(TALKS);
const decode = (t) => t.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/\s+/g, ' ').trim();
const meta = (html, name) => {
  const m = new RegExp(`<meta[^>]+name=["']${name}["'][^>]*>`, 'i').exec(html);
  const c = m && /content=["']([^"']*)["']/i.exec(m[0]);
  return c ? decode(c[1]) : '';
};
const talks = [];
for (const entry of readdirSync(TALKS).sort()) {
  if (entry.startsWith('_') || entry.startsWith('.')) continue;
  let file = null;
  if (entry.toLowerCase().endsWith('.html') && entry !== 'index.html') file = entry;
  else if (statSync(join(TALKS, entry)).isDirectory() && existsSync(join(TALKS, entry, 'index.html'))) file = entry + '/index.html';
  if (!file) continue;
  const html = readFileSync(join(TALKS, file), 'utf8').slice(0, 400000);
  const name = entry.replace(/\.html$/i, '');
  const fromName = /^(\d{4}-\d{2}-\d{2})[-_ ]?(.*)$/.exec(name);
  const t = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  const lang = (/<html[^>]*\blang=["']([a-z]{2})/i.exec(html) || [])[1] || '';
  talks.push({
    file,
    title: (t && decode(t[1].replace(/<[^>]+>/g, ' '))) || (fromName ? fromName[2] : name).replace(/[-_]+/g, ' '),
    date: (meta(html, 'date') || (fromName ? fromName[1] : '')).slice(0, 10),
    event: meta(html, 'event'),
    lang: lang === 'fr' ? 'fr' : lang === 'en' ? 'en' : '',
  });
}
talks.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.title.localeCompare(b.title)));
writeFileSync(join(TALKS, 'index.json'), JSON.stringify({ generated: new Date().toISOString(), talks }, null, 2) + '\n');

// sitemap
const urls = ['', 'blog.html', ...posts.map((p) => `post.html?p=${encodeURIComponent(p.slug)}`), ...talks.map((t) => `presentations/${t.file}`)];
writeFileSync(join(ROOT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${xml(SITE + '/' + u)}</loc></url>`).join('\n')}
</urlset>
`);

console.log(`✓ ${posts.length} post(s) → posts/index.json · ${talks.length} presentation(s) → presentations/index.json · feed.xml · sitemap.xml`);
for (const w of warnings) console.warn('⚠ ' + w);
if (!existsSync(join(ROOT, '.nojekyll'))) console.warn('⚠ .nojekyll is missing');
