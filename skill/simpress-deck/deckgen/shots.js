#!/usr/bin/env node
/* Screenshot every slide of an exported simpress HTML for review.
   usage: node shots.js <deck.html> [outDir] [slideNumbers e.g. 1,4,7]
   Waits 3.6 s per slide so entrance effects have finished; also shoots the overview as s0.png. */
const path = require('path'), fs = require('fs');
const { chromium } = require('playwright');
const file = path.resolve(process.argv[2]), out = path.resolve(process.argv[3] || path.dirname(file) + '/shots');
(async () => {
  fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 1600, height: 900 } });
  p.on('pageerror', e => console.log('page error:', e.message));
  await p.goto('file://' + file); await p.waitForTimeout(1500);
  const n = await p.evaluate(() => document.querySelectorAll('.step[id^="step-"]').length);
  const list = process.argv[4] ? process.argv[4].split(',').map(Number) : Array.from({ length: n }, (_, i) => i + 1);
  for (const i of list) { await p.evaluate(i => impress().goto('step-' + i, 0), i); await p.waitForTimeout(3600); await p.screenshot({ path: `${out}/s${i}.png` }); }
  if (!process.argv[4]) { await p.evaluate(() => impress().goto('overview', 0)); await p.waitForTimeout(1500); await p.screenshot({ path: `${out}/s0.png` }); }
  console.log(`${list.length} slides -> ${out}`);
  await b.close();
})();
