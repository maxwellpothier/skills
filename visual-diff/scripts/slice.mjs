#!/usr/bin/env node
// Slice a tall image into fixed-height pieces.
// A full-page or full-frame render is unreadable once downscaled to fit an
// image-read; slices keep every piece at true scale.
//
//   node slice.mjs <image.png> [--out DIR] [--height 900] [--width N] [--from N] [--to N]

import { mkdirSync, existsSync, writeFileSync, rmSync } from 'node:fs';
import { resolve, basename, dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const argv = process.argv.slice(2);
const src = argv.find((a) => !a.startsWith('--'));
if (!src || !existsSync(src)) {
  console.error('usage: node slice.mjs <image.png> [--out DIR] [--height N]');
  process.exit(1);
}
const flag = (n, d) => {
  const i = argv.indexOf(`--${n}`);
  return i === -1 ? d : argv[i + 1];
};

const out = flag('out', 'slices');
const sliceH = Number(flag('height', 900));
mkdirSync(out, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage();

// The host page must live beside the image: a file:// document can load a
// file:// image only from its own directory, and setContent() on about:blank
// cannot reach the disk at all.
const abs = resolve(src);
const host = join(dirname(abs), `.slice-${process.pid}.html`);
writeFileSync(
  host,
  `<body style="margin:0"><img id="i" src="${encodeURIComponent(basename(abs))}" style="display:block"></body>`
);

try {
  await page.goto(pathToFileURL(host).href);
await page.waitForFunction(() => {
  const i = document.getElementById('i');
  return i?.complete && i.naturalWidth > 0;
});
const { w, h } = await page.evaluate(() => {
  const i = document.getElementById('i');
  return { w: i.naturalWidth, h: i.naturalHeight };
});

const width = Number(flag('width', w));
const from = Number(flag('from', 0));
const to = Number(flag('to', h));
await page.setViewportSize({ width: Math.min(width, w), height: Math.min(sliceH, h) });

console.log(`${basename(src)} ${w}x${h} → slices of ${sliceH}px`);
let i = 0;
for (let y = from; y < to; y += sliceH) {
  await page.screenshot({
    path: `${out}/${String(i).padStart(2, '0')}.png`,
    fullPage: true,
    clip: { x: 0, y, width: Math.min(width, w), height: Math.min(sliceH, to - y) },
  });
  i++;
}
console.log(`${i} slices → ${out}/`);
} finally {
  rmSync(host, { force: true });
  await browser.close();
}
