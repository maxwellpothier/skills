#!/usr/bin/env node
// Screenshot a running page with headless Chromium.
// Full-page capture plus fixed-height slices, so a long page can be read
// a viewport at a time instead of as one unreadable strip.
//
//   node shoot.mjs <url> [--out DIR] [--width 1440] [--height 900]
//                        [--scale 1] [--wait 1500] [--selector "footer"]
//                        [--full-only] [--dark]

import { mkdirSync, rmSync } from 'node:fs';
import { chromium } from 'playwright-core';

const argv = process.argv.slice(2);
const url = argv.find((a) => !a.startsWith('--'));
if (!url) {
  console.error('usage: node shoot.mjs <url> [--out DIR] [--width N] ...');
  process.exit(1);
}
const flag = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i === -1 ? fallback : argv[i + 1];
};
const has = (name) => argv.includes(`--${name}`);

const out = flag('out', 'shots');
const width = Number(flag('width', 1440));
const height = Number(flag('height', 900));
const scale = Number(flag('scale', 1));
const wait = Number(flag('wait', 1500));
const selector = flag('selector', null);

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width, height },
  deviceScaleFactor: scale,
  colorScheme: has('dark') ? 'dark' : 'light',
});

const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(String(e)));

try {
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
} catch {
  // networkidle never settles on pages with polling/websockets — fall back.
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
}
// Drive lazy-loaded content by scrolling the whole page before capture.
await page.evaluate(async () => {
  const step = window.innerHeight;
  for (let y = 0; y < document.body.scrollHeight; y += step) {
    window.scrollTo(0, y);
    await new Promise((r) => setTimeout(r, 120));
  }
  window.scrollTo(0, 0);
});
// Webfonts must be settled before measuring or capturing: a fallback face
// wraps text differently, which silently changes every height on the page.
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(wait);

if (selector) {
  const el = page.locator(selector).first();
  await el.screenshot({ path: `${out}/element.png` });
  console.log(`element.png  ${selector}`);
} else {
  await page.screenshot({ path: `${out}/full.png`, fullPage: true });
  const total = await page.evaluate(() => document.body.scrollHeight);
  console.log(`full.png  ${width}x${total}`);

  if (!has('full-only')) {
    let i = 0;
    for (let y = 0; y < total; y += height) {
      await page.screenshot({
        path: `${out}/slice-${String(i).padStart(2, '0')}.png`,
        fullPage: true, // required: clip is relative to the full-page image
        clip: { x: 0, y, width, height: Math.min(height, total - y) },
      });
      i++;
    }
    console.log(`${i} slices of ${height}px`);
  }
}

if (errors.length) {
  console.log(`\n${errors.length} console error(s):`);
  errors.slice(0, 10).forEach((e) => console.log('  ' + e.slice(0, 200)));
}

await browser.close();
