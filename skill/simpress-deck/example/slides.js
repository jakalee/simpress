/* Example deck (4 slides) — copy this folder, then rewrite slides.js / notes.js / deck.config.json for a new deck.
   Coordinates are slide-local pixels on a 1920x1080 canvas: L = left, T = top, W = width, H = height. */
const { C, icon, svg, background, card, pill, flow, label } = require('../deckgen/art');
const TOTAL = 4, FOOT = { footL: 'SIMPRESS DECK EXAMPLE', footR: 'YOUR COMPANY' };

/* helpers */
const K = t => `<span style="letter-spacing:5px">${t}</span>`;
const txt = (html, L, T, W, fs, color = C.text, o = {}) => ({ t: 'txt', html, L, T, W, fs, color, fw: o.fw ?? 400, align: o.align || 'left', font: o.font, enter: o.enter === undefined ? 'up' : o.enter, vc: o.vc, name: o.name });
const img = (s, L, T, W, H, o = {}) => ({ t: 'img', svg: s, L, T, W, H, enter: o.enter === undefined ? 'zoom' : o.enter, name: o.name, enterCode: o.enterCode });
const bg = (n, a, b, extra = '', o = {}) => ({ t: 'img', svg: background(n, TOTAL, a, b, extra, { ...FOOT, ...o }), L: 0, T: 0, W: 1920, H: 1080, enter: null, name: 'background' });
const header = (kicker, title, sub, c) => [
  txt(K(kicker), 120, 92, 1500, 22, c, { fw: 700, enter: 'left' }),
  txt(title, 120, 128, 1680, 62, C.text, { fw: 800, enter: 'left' }),
  ...(sub ? [txt(sub, 120, 214, 1500, 27, C.muted, { enter: 'left' })] : []),
];
const S = [];

/* 1 — title, with a picture in a "screen" card and three chips */
{
  const rings = `<circle class="spin" cx="1445" cy="520" r="400" fill="none" stroke="${C.cyan}" stroke-opacity=".18" stroke-dasharray="4 14" stroke-width="2"/>
    <circle class="spinr" cx="1445" cy="520" r="455" fill="none" stroke="${C.violet}" stroke-opacity=".16" stroke-dasharray="80 30 6 30" stroke-width="2"/>`;
  const items = [bg(1, C.cyan, C.violet, rings),
    txt(K('KICKER · TOPIC'), 120, 236, 900, 24, C.cyan, { fw: 700, enter: 'left' }),
    txt('Big Title<br>Second Line', 120, 280, 980, 108, C.text, { fw: 800, enter: 'left' }),
    txt('One-sentence promise of the talk: what the audience will take away.', 120, 592, 900, 31, C.muted, { enter: 'left' }),
    img(card(600, 340, C.cyan, { bar: false, top: .05, bot: .02, r: 28 }), 1145, 350, 600, 340),
    { t: 'imgfile', file: 'picture', L: 1165, T: 370, W: 560, H: 280, radius: 16, enter: 'zoom', name: 'picture' },
  ];
  [['Point one', C.cyan], ['Point two', C.violet], ['Point three', C.amber]].forEach(([t, c], i) => {
    const w = 270, x = 120 + i * (w + 18);
    items.push(img(pill(w, 56, c), x, 740, w, 56, { enter: 'up' }));
    items.push(txt(t, x, 740, w, 22, c, { fw: 700, align: 'center', vc: 56, enter: 'up' }));
  });
  items.push(txt('Presenter Name', 120, 860, 700, 32, C.text, { fw: 700, enter: 'fade' }));
  items.push(txt('Company · Team', 120, 905, 900, 22, C.muted, { enter: 'fade' }));
  S.push({ name: 'Title', items });
}

/* 2 — four cards + a goal band */
{
  const cards = [['book', C.cyan, 'Card title one', 'Short explanation in one or two lines.'], ['repeat', C.violet, 'Card title two', 'Short explanation in one or two lines.'],
    ['clock', C.amber, 'Card title three', 'Short explanation in one or two lines.'], ['report', C.mint, 'Card title four', 'Short explanation in one or two lines.']];
  const items = [bg(2, C.violet, C.cyan), ...header('01 · SECTION', 'Four cards in a row', 'Subtitle that frames the slide', C.violet)];
  cards.forEach(([ic, c, h, b], i) => {
    const w = 402, x = 120 + i * (w + 24), y = 300;
    items.push(img(card(w, 430, c, { icon: ic, num: '0' + (i + 1) }), x, y, w, 430));
    items.push(txt(h, x + 36, y + 128, w - 72, 31, C.text, { fw: 700 }));
    items.push(txt(b, x + 36, y + 228, w - 72, 22, C.muted));
  });
  items.push(img(svg(1680, 144, `<rect x="1" y="1" width="1678" height="142" rx="24" fill="#FFFFFF" fill-opacity=".045" stroke="#9FB3C8" stroke-opacity=".25" stroke-width="2"/>`), 120, 780, 1680, 144, { enter: 'up' }));
  items.push(txt('<b>The goal:</b> one sentence the audience should remember.', 160, 780, 1500, 28, C.text, { vc: 144 }));
  S.push({ name: 'Four cards', items });
}

/* 3 — flow of nodes with animated arrows (arrows live in the background SVG) */
{
  const nodes = [['user', C.cyan, 'Input', 'Where it starts'], ['bot', C.violet, 'Process', 'What happens'], ['link', C.amber, 'Tool', 'What it calls'], ['cube', C.mint, 'Output', 'What comes out']];
  let arrows = '';
  nodes.forEach((n, i) => { if (i < 3) { const x1 = 120 + i * 450 + 340, x2 = x1 + 104; arrows += flow(x1 + 6, 368, x2 - 6, 368, nodes[i + 1][1]) + label((x1 + x2) / 2, 350, 'STEP ' + (i + 1), nodes[i + 1][1], 13); } });
  const items = [bg(3, C.amber, C.violet, arrows), ...header('02 · FLOW', 'A simple flow', 'Nodes are cards, arrows are drawn in the background', C.amber)];
  nodes.forEach(([ic, c, h, b], i) => {
    const x = 120 + i * 450, y = 300;
    items.push(img(card(340, 136, c, { icon: ic, ix: 24, iy: 36, is: 64, barW: 50 }), x, y, 340, 136));
    items.push(txt(h, x + 108, y + 36, 220, 26, C.text, { fw: 700 }));
    items.push(txt(b, x + 108, y + 74, 220, 19, C.muted));
  });
  [['01', 'First stat', C.cyan], ['≤ 1 h', 'Second stat', C.violet], ['24/7', 'Third stat', C.amber], ['8', 'Fourth stat', C.mint]].forEach(([v, l, c], i) => {
    const w = 402, x = 120 + i * (w + 24), y = 520;
    items.push(img(card(w, 200, c), x, y, w, 200));
    items.push(txt(v, x + 32, y + 34, w - 64, 50, c, { fw: 800 }));
    items.push(txt(l, x + 32, y + 120, w - 64, 21, C.muted));
  });
  S.push({ name: 'A simple flow', items });
}

/* 4 — closing */
{
  const items = [bg(4, C.cyan, C.violet), ...header('03 · SUMMARY', 'Summary & next steps', null, C.cyan)];
  ['Next step one', 'Next step two', 'Next step three', 'Next step four'].forEach((t, i) => {
    const w = 402, x = 120 + i * (w + 24);
    items.push(img(card(w, 96, C.mint, { bar: false, r: 18, top: .06, bot: .03 }), x, 320, w, 96, { enter: 'up' }));
    items.push(txt(`<span style="color:#5DFFB2;font-weight:800">0${i + 1}</span>  ${t}`, x + 26, 320, w - 52, 21, C.text, { vc: 96 }));
  });
  items.push(txt('Thank you', 120, 760, 900, 76, C.text, { fw: 800, enter: 'zoom' }));
  items.push(txt('Questions are welcome.', 120, 858, 900, 26, C.cyan, { enter: 'fade' }));
  S.push({ name: 'Summary', items });
}

module.exports = { S };
