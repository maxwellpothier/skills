#!/usr/bin/env node
// Extract the real assets out of a Figma node: every bitmap used as an image
// fill, and any vector layers rendered as SVG.
//
//   node figma-assets.mjs <figma-url> [--out DIR] [--images] [--svg <id,id,...>]
//
// --images  download every distinct image fill in the subtree
// --svg     render the given node ids as SVG (comma-separated)

import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const argv = process.argv.slice(2);
const flag = (n, d) => {
  const i = argv.indexOf(`--${n}`);
  return i === -1 ? d : argv[i + 1];
};
const has = (n) => argv.includes(`--${n}`);

const urlArg = argv.find((a) => a.includes('figma.com'));
let fileKey = urlArg?.match(/\/(?:design|file)\/([0-9a-zA-Z]{22,128})/)?.[1];
let nodeId = decodeURIComponent(urlArg?.match(/[?&]node-id=([^&]+)/)?.[1] ?? '').replace('-', ':');
if (!fileKey || !nodeId) {
  console.error('usage: node figma-assets.mjs <figma-url-with-node-id> [--images] [--svg ids]');
  process.exit(1);
}

function findToken() {
  if (process.env.FIGMA_TOKEN) return process.env.FIGMA_TOKEN.trim();
  let dir = resolve(process.cwd());
  for (;;) {
    for (const name of ['.env.local', '.env']) {
      const p = join(dir, name);
      if (existsSync(p)) {
        const m = readFileSync(p, 'utf8').match(/^\s*FIGMA_TOKEN\s*=\s*["']?([^"'\n]+)/m);
        if (m) return m[1].trim();
      }
    }
    const up = dirname(dir);
    if (up === dir) return null;
    dir = up;
  }
}
const token = findToken();
if (!token) { console.error('No FIGMA_TOKEN found.'); process.exit(1); }
const headers = { 'X-Figma-Token': token };
const api = async (p) => {
  const r = await fetch(`https://api.figma.com/v1/${p}`, { headers });
  if (!r.ok) { console.error(`Figma API ${r.status}: ${(await r.text()).slice(0, 200)}`); process.exit(1); }
  return r.json();
};

const out = flag('out', 'assets');
mkdirSync(out, { recursive: true });

// Sniff the real format — Figma serves image fills without a useful extension.
const extOf = (b) => {
  if (b[0] === 0x89 && b[1] === 0x50) return 'png';
  if (b[0] === 0xff && b[1] === 0xd8) return 'jpg';
  if (b[8] === 0x57 && b[9] === 0x45) return 'webp';
  if (b[0] === 0x47 && b[1] === 0x49) return 'gif';
  return 'bin';
};

if (has('images')) {
  // Which imageRefs does this subtree actually use, and on which node?
  const tree = await api(`files/${fileKey}/nodes?ids=${encodeURIComponent(nodeId)}`);
  const doc = tree.nodes[nodeId]?.document ?? Object.values(tree.nodes)[0]?.document;
  const used = new Map(); // imageRef -> {name, w, h}
  (function walk(n) {
    for (const f of n.fills ?? []) {
      if (f.type === 'IMAGE' && f.imageRef && !used.has(f.imageRef)) {
        const b = n.absoluteBoundingBox ?? {};
        used.set(f.imageRef, { name: n.name, w: Math.round(b.width), h: Math.round(b.height), id: n.id });
      }
    }
    (n.children ?? []).forEach(walk);
  })(doc);

  const all = await api(`files/${fileKey}/images`);
  const map = all.meta?.images ?? {};
  console.log(`${used.size} image fill(s) in subtree`);

  const manifest = [];
  let i = 0;
  for (const [ref, meta] of used) {
    const url = map[ref];
    if (!url) { console.log(`  ${meta.name}: no URL for ref ${ref.slice(0, 8)}`); continue; }
    const buf = Buffer.from(await (await fetch(url)).arrayBuffer());
    const slug = meta.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase().slice(0, 32).replace(/^-|-$/g, '');
    const file = `${String(i).padStart(2, '0')}-${slug || 'image'}.${extOf(buf)}`;
    writeFileSync(join(out, file), buf);
    manifest.push({ file, node: meta.id, name: meta.name, box: `${meta.w}x${meta.h}` });
    console.log(`  ${file}  ${meta.w}x${meta.h}  (node ${meta.id} "${meta.name}")`);
    i++;
  }
  writeFileSync(join(out, 'manifest.json'), JSON.stringify(manifest, null, 2));
}

const svgIds = flag('svg', null);
if (svgIds) {
  const res = await api(`images/${fileKey}?ids=${encodeURIComponent(svgIds)}&format=svg`);
  for (const [id, url] of Object.entries(res.images)) {
    if (!url) { console.log(`  ${id}: no SVG returned`); continue; }
    const svg = await (await fetch(url)).text();
    const file = `${id.replace(':', '-')}.svg`;
    writeFileSync(join(out, file), svg);
    console.log(`  ${file}  ${svg.length}B`);
  }
}
