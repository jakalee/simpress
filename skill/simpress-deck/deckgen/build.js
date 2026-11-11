#!/usr/bin/env node
/* simpress-deck builder
   usage:  node build.js <deck-folder>
   The deck folder holds deck.config.json, slides.js and notes.js (see ../example).
   Output: <out>/<name>.json (open in simpress to edit) and <out>/<name>.html (present). */
const fs = require('fs'), path = require('path');
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { console.error('Playwright is missing: npm i playwright && npx playwright install chromium'); process.exit(1); }

const dir = path.resolve(process.argv[2] || '.');
const cfg = JSON.parse(fs.readFileSync(path.join(dir, 'deck.config.json'), 'utf8'));
const { S } = require(path.join(dir, 'slides.js'));
const NOTES = fs.existsSync(path.join(dir, 'notes.js')) ? require(path.join(dir, 'notes.js')) : [];
/* editor: env > deck.config.json > bundled copy next to this script (zip package) > GitHub Pages */
const BUNDLED = path.join(__dirname, 'editor.html');
const EDITOR = process.env.SIMPRESS_EDITOR || cfg.editor || (fs.existsSync(BUNDLED) ? BUNDLED : 'https://jakalee.github.io/simpress/index.html');
const OUT = path.resolve(dir, cfg.out || 'out'), NAME = cfg.name || 'deck';
const SEP = cfg.noteSeparator || '\n\n— 한국어 —\n\n';

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const files = {};
  for (const [k, f] of Object.entries(cfg.files || {})) {
    const p = path.resolve(dir, f.path);
    files[k] = { b64: fs.readFileSync(p).toString('base64'), type: f.type, w: f.w, h: f.h, name: path.basename(p) };
  }
  /* 4 slides per row, rows snake left-right-left, with depth and tilt so the overview fills the screen */
  const n = S.length, rows = Math.ceil(n / 4);
  const pos = S.map((_, i) => {
    const row = Math.floor(i / 4), col = row % 2 ? 3 - (i % 4) : i % 4;
    return {
      x: Math.round((col - 1.5) * 2450), y: Math.round((row - (rows - 1) / 2) * 1650 + Math.sin(i * 1.7) * 160), z: Math.round(Math.cos(i * 1.3) * 500 - 300),
      rot: [0, 3, -3, 2, -4, 3, -2, 4, -3][i % 9], ry: [0, -14, 10, -10, 12, -12, 10, -10, 14][i % 9], rx: [0, 6, -5, 5, -6, 5, -5, 6, -4][i % 9], s: i === 0 ? 1.15 : 1,
    };
  });
  const slides = S.map((s, i) => ({ ...s, pos: s.pos || pos[i], notes: NOTES[i] ? (Array.isArray(NOTES[i]) ? NOTES[i].filter(Boolean).join(SEP) : NOTES[i]) : '' }));

  const proxy = process.env.HTTPS_PROXY || process.env.https_proxy;   // behind a corporate proxy
  const b = await chromium.launch(proxy ? { proxy: { server: proxy } } : {}), page = await b.newPage({ viewport: { width: 1600, height: 900 } });
  page.on('pageerror', e => console.log('page error:', e.message));
  await page.goto(EDITOR.includes('://') ? EDITOR : 'file://' + path.resolve(dir, EDITOR));
  await page.waitForFunction(() => typeof buildShowHTML === 'function' && typeof insertObj === 'function', null, { timeout: 30000 });
  const info = await page.evaluate(async ({ slides, files, cfg }) => {
    const d = newDoc();
    d.title = cfg.title || 'Presentation'; d.theme = cfg.theme ?? 3; d.bg = cfg.bg || '#040913';
    d.duration = cfg.duration || 1500; d.perspective = cfg.perspective || 1200;
    loadDoc(d);
    const ids = {};
    for (const [k, f] of Object.entries(files)) ids[k] = await addAsset(new File([Uint8Array.from(atob(f.b64), c => c.charCodeAt(0))], f.name, { type: f.type }));
    /* slide-local pixel box (left, top, width, height) -> world centre on the slide's frame */
    const put = (f, o, L, T, W, H) => {
      const v = mulV(objM(f), [(L + W / 2 - 960) * f.s, (T + H / 2 - 540) * f.s, 0]);
      Object.assign(o, { x: f.x + v[0], y: f.y + v[1], z: f.z + v[2], rot: f.rot, rx: f.rx, ry: f.ry });
    };
    let k = 0;
    for (const [si, s] of slides.entries()) {
      const f = insertObj(makeObj('frame', { frame: 'hidden', slide: true, w: 1920, h: 1080, ...s.pos, name: s.name, notes: s.notes }));
      doc.path.push(f.id);
      for (const it of s.items) {
        const F = files[it.file];
        if ((it.t === 'imgfile' || it.t === 'video') && !F) throw new Error(`slide ${si + 1}: file key "${it.file}" is not in deck.config.json`);
        let o;
        if (it.t === 'img') o = makeObj('image', { asset: await addAsset(new File([it.svg], `art-${si + 1}-${++k}.svg`, { type: 'image/svg+xml' })), w: it.W, h: it.H, s: f.s });
        else if (it.t === 'imgfile') o = makeObj('image', { asset: ids[it.file], w: F.w, h: F.h, s: f.s * it.W / F.w, radius: it.radius || 0 });
        else if (it.t === 'video') o = makeObj('video', { asset: ids[it.file], w: F.w, h: F.h, s: f.s * it.W / F.w, noCtl: it.controls !== true });
        else if (it.t === 'txt') o = makeObj('text', { html: it.html, fs: it.fs, fw: it.fw, color: it.color, align: it.align, font: it.font || 'sans', auto: false, w: it.W, s: f.s, style: 'body' });
        else throw new Error(`slide ${si + 1}: unknown item type ${it.t}`);
        if (it.name) o.name = it.name;
        if (it.opacity != null) o.opacity = it.opacity;
        if (it.enter) o.enter = it.enter;
        if (it.enterCode) o.enterCode = it.enterCode;
        put(f, o, it.L, it.T, it.W, it.H || 10);
        insertObj(o);
        if (it.t === 'txt') { const h = o.h || 40; put(f, o, it.L, it.vc ? it.T + (it.vc - h) / 2 : it.T, it.W, h); renderObj(o); }
      }
    }
    activeStep = 0; renderAll(); commit(); renderPathList();
    return { slides: doc.path.length, objects: doc.objects.length };
  }, { slides, files, cfg });
  const json = await page.evaluate(() => JSON.stringify(doc));
  const html = await page.evaluate(() => buildShowHTML());
  fs.writeFileSync(path.join(OUT, NAME + '.json'), json);
  fs.writeFileSync(path.join(OUT, NAME + '.html'), html);
  console.log(`${info.slides} slides, ${info.objects} objects -> ${path.join(OUT, NAME)}.html (${(html.length / 1e6).toFixed(1)} MB) + .json`);
  await b.close();
})().catch(e => { console.error(e.message || e); process.exit(1); });
