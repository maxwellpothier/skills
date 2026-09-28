#!/usr/bin/env node
// Pull a Figma node via the REST API — free on every plan, and not subject to
// the Figma MCP server's per-plan tool-call cap.
//
//   node figma.mjs <figma-url | fileKey nodeId> [--out DIR] [--scale N]
//                  [--outline] [--specs] [--children] [--no-render]
//
// Auth: FIGMA_TOKEN from the environment, or a FIGMA_TOKEN= line in the
// nearest .env.local walking up from the working directory. Never logged.

import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const argv = process.argv.slice(2);
const flag = (n, d) => {
  const i = argv.indexOf(`--${n}`);
  return i === -1 ? d : argv[i + 1];
};
const has = (n) => argv.includes(`--${n}`);
const positional = argv.filter((a, i) => !a.startsWith('--') && !argv[i - 1]?.startsWith('--'));

// ---- target ---------------------------------------------------------------
let fileKey, nodeId;
const urlArg = positional.find((a) => a.includes('figma.com'));
if (urlArg) {
  fileKey = urlArg.match(/\/(?:design|file|board|slides)\/([0-9a-zA-Z]{22,128})/)?.[1];
  const branch = urlArg.match(/\/branch\/([0-9a-zA-Z]{22,128})/)?.[1];
  if (branch) fileKey = branch;
  nodeId = decodeURIComponent(urlArg.match(/[?&]node-id=([^&]+)/)?.[1] ?? '').replace('-', ':');
} else {
  [fileKey, nodeId] = positional;
}
if (!fileKey || !nodeId) {
  console.error('usage: node figma.mjs <figma-url>   (url must contain node-id)');
  console.error('   or: node figma.mjs <fileKey> <nodeId>');
  process.exit(1);
}

// ---- token ----------------------------------------------------------------
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
if (!token) {
  console.error('No FIGMA_TOKEN found (env, or .env.local walking up from cwd).');
  console.error('Create one: Figma → Settings → Security → Personal access tokens');
  console.error('Scope needed: file_content:read');
  process.exit(1);
}
const headers = { 'X-Figma-Token': token };

const api = async (path) => {
  const r = await fetch(`https://api.figma.com/v1/${path}`, { headers });
  if (!r.ok) {
    const body = await r.text();
    console.error(`Figma API ${r.status}: ${body.slice(0, 300)}`);
    if (r.status === 403) console.error('→ token may lack file_content:read, or has expired.');
    process.exit(1);
  }
  return r.json();
};

const out = flag('out', 'figma');
mkdirSync(out, { recursive: true });

// ---- tree -----------------------------------------------------------------
const tree = await api(`files/${fileKey}/nodes?ids=${encodeURIComponent(nodeId)}`);
const doc = tree.nodes[nodeId]?.document ?? Object.values(tree.nodes)[0]?.document;
if (!doc) {
  console.error(`Node ${nodeId} not found in file ${fileKey}.`);
  process.exit(1);
}
writeFileSync(`${out}/tree.json`, JSON.stringify(tree, null, 2));
const box = doc.absoluteBoundingBox ?? {};
console.log(`${doc.name} (${doc.type}) ${Math.round(box.width)}x${Math.round(box.height)}`);
console.log(`tree.json written`);

const hex = (c) =>
  c ? '#' + [c.r, c.g, c.b].map((v) => Math.round(v * 255).toString(16).padStart(2, '0')).join('') : null;

// ---- outline --------------------------------------------------------------
if (has('outline')) {
  const depth = Number(flag('depth', 2));
  const walk = (n, d) => {
    if (d > depth) return;
    for (const c of n.children ?? []) {
      const b = c.absoluteBoundingBox ?? {};
      const rel = b.y != null ? Math.round(b.y - box.y) : '?';
      const label = c.type === 'TEXT' ? ` "${(c.characters ?? '').slice(0, 48).replace(/\s+/g, ' ')}"` : '';
      console.log(
        `${'  '.repeat(d)}${c.id}  ${c.type.padEnd(9)} ${String(rel).padStart(6)}y ` +
          `${String(Math.round(b.width)).padStart(5)}x${String(Math.round(b.height)).padEnd(5)} ${c.name}${label}`
      );
      walk(c, d + 1);
    }
  };
  console.log('\n-- outline (y is relative to frame top) --');
  walk(doc, 0);
}

// ---- specs: every distinct text style and fill ----------------------------
if (has('specs')) {
  const texts = new Map();
  const fills = new Map();
  const collect = (n) => {
    if (n.type === 'TEXT' && n.style) {
      const s = n.style;
      const key = [
        s.fontFamily,
        s.fontWeight,
        `${s.fontSize}px`,
        `lh ${s.lineHeightPx ? Math.round(s.lineHeightPx) + 'px' : s.lineHeightPercent + '%'}`,
        `ls ${(s.letterSpacing ?? 0).toFixed(2)}`,
        hex(n.fills?.find((f) => f.type === 'SOLID')?.color) ?? '',
        s.textAlignHorizontal ?? '',
      ].join(' | ');
      texts.set(key, (texts.get(key) ?? 0) + 1);
    }
    for (const f of n.fills ?? []) {
      if (f.type === 'SOLID' && f.visible !== false) {
        const h = hex(f.color) + (f.opacity != null && f.opacity < 1 ? ` @${f.opacity}` : '');
        fills.set(h, (fills.get(h) ?? 0) + 1);
      }
    }
    if (n.cornerRadius != null) fills.set(`radius ${n.cornerRadius}px`, (fills.get(`radius ${n.cornerRadius}px`) ?? 0) + 1);
    (n.children ?? []).forEach(collect);
  };
  collect(doc);

  console.log('\n-- text styles (family | weight | size | line-height | tracking | color | align) --');
  [...texts.entries()].sort((a, b) => b[1] - a[1]).forEach(([k, n]) => console.log(`  ${String(n).padStart(3)}x  ${k}`));
  console.log('\n-- fills & radii --');
  [...fills.entries()].sort((a, b) => b[1] - a[1]).forEach(([k, n]) => console.log(`  ${String(n).padStart(3)}x  ${k}`));
}

// ---- renders --------------------------------------------------------------
const FIGMA_MAX = 16384; // hard cap on either axis; beyond it Figma silently rescales

async function render(ids, label) {
  const list = ids.join(',');
  let scale = Number(flag('scale', 2));
  const tallest = Math.max(...ids.map((id) => nodeBox(id)?.height ?? 0));
  const widest = Math.max(...ids.map((id) => nodeBox(id)?.width ?? 0));
  const fit = FIGMA_MAX / Math.max(tallest, widest);
  if (scale > fit) {
    scale = Math.floor(fit * 100) / 100;
    console.log(`  (scale capped to ${scale}x — ${FIGMA_MAX}px API limit)`);
  }
  const res = await api(`images/${fileKey}?ids=${encodeURIComponent(list)}&format=png&scale=${scale}`);
  for (const [id, url] of Object.entries(res.images)) {
    if (!url) {
      console.log(`  ${id}: no render returned (empty or hidden node)`);
      continue;
    }
    const buf = Buffer.from(await (await fetch(url)).arrayBuffer());
    const name = `${label(id)}.png`;
    writeFileSync(join(out, name), buf);
    console.log(`  ${name}  ${(buf.length / 1e6).toFixed(1)}MB`);
  }
}

const index = new Map();
(function idx(n) {
  index.set(n.id, n);
  (n.children ?? []).forEach(idx);
})(doc);
const nodeBox = (id) => index.get(id)?.absoluteBoundingBox;

if (!has('no-render')) {
  if (has('children')) {
    // One render per top-level child — keeps each at full scale and gives you
    // section-sized images instead of one enormous strip.
    const kids = (doc.children ?? []).filter((c) => c.absoluteBoundingBox);
    console.log(`\nrendering ${kids.length} children:`);
    const safe = (s) => s.replace(/[^a-z0-9]+/gi, '-').toLowerCase().slice(0, 40);
    for (let i = 0; i < kids.length; i += 10) {
      const batch = kids.slice(i, i + 10);
      await render(
        batch.map((c) => c.id),
        (id) => `${String(kids.findIndex((k) => k.id === id)).padStart(2, '0')}-${safe(index.get(id).name)}`
      );
    }
  } else {
    console.log('\nrendering frame:');
    await render([doc.id], () => 'frame');
  }
}
