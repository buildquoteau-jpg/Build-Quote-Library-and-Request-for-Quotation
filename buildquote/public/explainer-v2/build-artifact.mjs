/**
 * build-artifact.mjs — produce a single-file copy of the explainer.
 *
 *   node build-artifact.mjs [outfile]
 *
 * The served version references its images and fonts as ordinary files.
 * A published Artifact runs under a CSP that blocks every external host and
 * has no sibling files to fetch, so this pass rewrites each reference to a
 * `data:` URI and emits one self-contained HTML file.
 *
 * Images are downscaled to their on-stage display size before encoding —
 * shipping the originals untouched would be ~4 MB, which makes the page feel
 * broken while it streams. Uses `sharp` when available and falls back to
 * embedding the original bytes (with a warning) when it is missing.
 */

import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT  = process.argv[2] || path.join(HERE, 'artifact.html');

/* Longest edge each shot is ever drawn at, in stage pixels. Anything larger
   is wasted bytes. */
const MAX_EDGE = {
  'doc-1.png': 480, 'doc-2.png': 480, 'doc-3.jpg': 520,
  'doc-4.jpg': 620, 'doc-5.jpg': 660,
  'cladmax-hero.jpg': 760, 'deckmax-hero.jpg': 760,
  'screenmax-hero.jpg': 520, 'pergola-hero.jpg': 520,
  'supplier-website.png': 460, 'trade-desk-search.png': 460,
  'rfq-supplier.png': 460,
};
const DEFAULT_EDGE = 700;

let sharp = null;
try { sharp = (await import('sharp')).default; }
catch { console.warn('! sharp is unavailable — embedding originals, so the file will be larger.'); }

const MIME = { '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg',
               '.webp':'image/webp', '.woff2':'font/woff2' };

async function encode(rel) {
  const abs = path.join(HERE, rel);
  if (!existsSync(abs)) { console.warn('! missing, left as-is:', rel); return null; }
  const ext = path.extname(abs).toLowerCase();

  if (sharp && ext !== '.woff2') {
    const edge = MAX_EDGE[path.basename(rel)] || DEFAULT_EDGE;
    const buf = await sharp(abs)
      .resize({ width: edge, height: edge, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 72 })
      .toBuffer();
    return `data:image/webp;base64,${buf.toString('base64')}`;
  }
  const buf = await readFile(abs);
  return `data:${MIME[ext] || 'application/octet-stream'};base64,${buf.toString('base64')}`;
}

let html = await readFile(path.join(HERE, 'index.html'), 'utf8');

/* every shots/… and fonts/… reference in the SHOTS manifest and FONTS table */
const refs = [...new Set([...html.matchAll(/'((?:shots|fonts)\/[^']+)'/g)].map(m => m[1]))];
console.log(`inlining ${refs.length} assets…`);

let bytes = 0;
for (const rel of refs) {
  const uri = await encode(rel);
  if (!uri) continue;
  bytes += uri.length;
  html = html.split(`'${rel}'`).join(`'${uri}'`);
  process.stdout.write(`  ${rel} → ${(uri.length / 1024).toFixed(0)} KB\n`);
}

/* the artifact has no sibling files, so the computed base is irrelevant —
   but leave assetURL() intact: it passes data: URIs straight through. */

/* The publish step wraps the file in its own <!doctype>/<head>/<body>, so
   ours has to come out. <title> stays — it names the artifact. <style> is
   valid in the body and keeps working. */
html = html
  .replace(/<!DOCTYPE html>\s*/i, '')
  .replace(/<\/?html[^>]*>\s*/gi, '')
  .replace(/<\/?head[^>]*>\s*/gi, '')
  .replace(/<\/?body[^>]*>\s*/gi, '')
  .replace(/^[ \t]*<meta[^>]*>\s*$/gim, '')
  .trimStart();

for (const tag of ['<!doctype', '<html', '<head', '<body']) {
  if (html.toLowerCase().includes(tag)) throw new Error(`document wrapper survived: ${tag}`);
}

await writeFile(OUT, html);
const kb = Buffer.byteLength(html) / 1024;
console.log(`\n${OUT}\n${kb.toFixed(0)} KB total (${(bytes / 1024).toFixed(0)} KB of it inlined assets)`);
if (kb > 15000) console.warn('! over the 16 MB artifact ceiling — lower MAX_EDGE or drop a shot.');
