#!/usr/bin/env node
// Render an HTML file to a crisp PNG using a locally cached Chromium.
// Usage: node render.mjs <input.html> <output.png> [width]
import { chromium } from 'playwright-core';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';

function findChromium() {
  const root = `${process.env.HOME}/Library/Caches/ms-playwright`;
  const dirs = readdirSync(root).filter((d) => d.startsWith('chromium')).sort().reverse();
  for (const d of dirs) {
    for (const rel of [
      'chrome-headless-shell-mac-arm64/chrome-headless-shell',
      'chrome-mac-arm64/Chromium.app/Contents/MacOS/Chromium',
    ]) {
      const p = `${root}/${d}/${rel}`;
      try { readFileSync(p, { flag: 'r' }); return p; } catch {}
    }
  }
  throw new Error(`no cached chromium under ${root}`);
}

const [input, output, width = '1200'] = process.argv.slice(2);
if (!input || !output) { console.error('usage: render.mjs <input.html> <output.png> [width]'); process.exit(1); }

const browser = await chromium.launch({ executablePath: findChromium() });
const page = await browser.newPage({
  viewport: { width: Number(width), height: 800 },
  deviceScaleFactor: 2,
});
await page.goto(pathToFileURL(resolve(input)).href, { waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready);
const target = (await page.$('#frame')) ?? (await page.$('body'));
await target.screenshot({ path: resolve(output) });
await browser.close();
console.log(`wrote ${output}`);
