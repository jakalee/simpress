// simpress-deck toolkit: vector art for decks: backgrounds, glass cards, icons, flows. All SVG strings (animated with CSS where useful).
const C = { cyan: '#33E7FF', violet: '#B960FF', amber: '#FFB454', mint: '#5DFFB2', text: '#EAF2FB', muted: '#9FB3C8', dim: '#5E7591', ink: '#07101F' };
let uid = 0; const id = p => `${p}${++uid}`;
const esc = t => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const ICON = {
  book: '<path d="M4 4.5A1.5 1.5 0 0 1 5.5 3H20v15H5.5A1.5 1.5 0 0 0 4 19.5z"/><path d="M4 19.5A1.5 1.5 0 0 0 5.5 21H20v-3"/><path d="M8 7h8M8 10.5h6"/>',
  repeat: '<path d="M17 2l3 3-3 3"/><path d="M4 11V9a4 4 0 0 1 4-4h12"/><path d="M7 22l-3-3 3-3"/><path d="M20 13v2a4 4 0 0 1-4 4H4"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>',
  report: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 16v-3M12 16v-6M15 16v-4"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l5 5"/>',
  folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  download: '<path d="M12 3v12M7 10l5 5 5-5M4 20h16"/>',
  tree: '<rect x="3" y="3" width="7" height="5" rx="1"/><rect x="14" y="10" width="7" height="5" rx="1"/><rect x="14" y="17" width="7" height="4" rx="1"/><path d="M6.5 8v11H14M6.5 12.5H14"/>',
  code: '<path d="M8 7l-5 5 5 5M16 7l5 5-5 5M14 4l-4 16"/>',
  play: '<circle cx="12" cy="12" r="9"/><path d="M10 8.5l6 3.5-6 3.5z"/>',
  chart: '<path d="M3 20h18M6 20v-6M11 20V8M16 20v-9M21 20V4"/>',
  slides: '<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M12 17v4M8 21h8M7 13l3-3 3 2 4-4"/>',
  db: '<ellipse cx="12" cy="5.5" rx="8" ry="2.8"/><path d="M4 5.5v13c0 1.5 3.6 2.8 8 2.8s8-1.3 8-2.8v-13"/><path d="M4 12c0 1.5 3.6 2.8 8 2.8s8-1.3 8-2.8"/>',
  glasses: '<circle cx="6.5" cy="14" r="3.5"/><circle cx="17.5" cy="14" r="3.5"/><path d="M10 14h4M3 14L1.5 8.5M21 14l1.5-5.5"/>',
  route: '<circle cx="5" cy="6" r="2.5"/><circle cx="19" cy="18" r="2.5"/><path d="M7.5 6H16a3.5 3.5 0 0 1 0 7H8a3.5 3.5 0 0 0 0 7h8.5"/>',
  mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
  eye: '<path d="M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>',
  bolt: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.2-4 4.5-6 8-6s6.8 2 8 6"/>',
  bot: '<rect x="4" y="8" width="16" height="12" rx="3"/><circle cx="9" cy="14" r="1.4"/><circle cx="15" cy="14" r="1.4"/><path d="M12 4v4M9 4h6"/>',
  cube: '<path d="M12 2l9 5v10l-9 5-9-5V7z"/><path d="M3 7l9 5 9-5M12 12v10"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/>',
  layers: '<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>',
  check: '<path d="M4 12.5l5 5L20 6.5"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
};
const icon = (name, x, y, size, color, sw = 1.8) =>
  `<g transform="translate(${x},${y}) scale(${size / 24})" fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${ICON[name]}</g>`;

const svg = (w, h, body, defs = '', style = '') =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs>${defs}</defs>${style ? `<style>${style}</style>` : ''}${body}</svg>`;

/* Full-slide background: deep navy, two slowly drifting glows, faint grid, corner brackets, footer. */
function background(n, total, accent, accent2, extra = '', opts = {}) {
  const g = id('g'), a = id('a'), b = id('b'), grid = id('grid'), vig = id('v');
  const defs = `
    <linearGradient id="${g}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0A1830"/><stop offset=".55" stop-color="#071226"/><stop offset="1" stop-color="#050B18"/></linearGradient>
    <radialGradient id="${a}"><stop offset="0" stop-color="${accent}" stop-opacity=".30"/><stop offset="1" stop-color="${accent}" stop-opacity="0"/></radialGradient>
    <radialGradient id="${b}"><stop offset="0" stop-color="${accent2}" stop-opacity=".22"/><stop offset="1" stop-color="${accent2}" stop-opacity="0"/></radialGradient>
    <radialGradient id="${vig}" cx=".5" cy=".5" r=".75"><stop offset=".6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".45"/></radialGradient>
    <pattern id="${grid}" width="48" height="48" patternUnits="userSpaceOnUse"><path d="M48 0H0V48" fill="none" stroke="#7FB6E6" stroke-opacity=".055" stroke-width="1"/></pattern>`;
  const style = `
    .d1{animation:d1 16s ease-in-out infinite alternate;transform-box:fill-box;transform-origin:center}
    .d2{animation:d2 21s ease-in-out infinite alternate;transform-box:fill-box;transform-origin:center}
    @keyframes d1{to{transform:translate(140px,90px) scale(1.15)}}
    @keyframes d2{to{transform:translate(-160px,-70px) scale(1.2)}}
    .flow{fill:none;stroke-linecap:round;stroke-dasharray:6 12;animation:fl 1.4s linear infinite}
    @keyframes fl{to{stroke-dashoffset:-36}}
    .pulse{animation:pu 2.4s ease-in-out infinite}
    @keyframes pu{0%,100%{opacity:.35}50%{opacity:1}}
    .spin{animation:sp 40s linear infinite;transform-box:fill-box;transform-origin:center}
    .spinr{animation:sp 60s linear infinite reverse;transform-box:fill-box;transform-origin:center}
    @keyframes sp{to{transform:rotate(360deg)}}
    text{font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text","Segoe UI",Inter,Arial,sans-serif}`;
  const br = (x, y, sx, sy) => `<path d="M${x} ${y + sy * 46}V${y}H${x + sx * 46}" fill="none" stroke="${accent}" stroke-opacity=".55" stroke-width="2"/>`;
  const footer = opts.noFooter ? '' : `
    <path d="M120 1012H1800" stroke="#9FB3C8" stroke-opacity=".14"/>
    <text x="120" y="1046" font-size="16" letter-spacing="4" fill="${C.dim}">${esc(opts.footL || '')}</text>
    <text x="1800" y="1046" font-size="16" letter-spacing="3" fill="${C.dim}" text-anchor="end">${opts.footR ? esc(opts.footR) + '  ·  ' : ''}${String(n).padStart(2, '0')} / ${String(total).padStart(2, '0')}</text>
    <rect x="120" y="1009" width="${Math.round(1680 * n / total)}" height="3" fill="${accent}" opacity=".8"/>`;
  const body = `
    <rect width="1920" height="1080" fill="url(#${g})"/>
    <circle class="d1" cx="${opts.ax ?? 260}" cy="${opts.ay ?? 160}" r="620" fill="url(#${a})"/>
    <circle class="d2" cx="${opts.bx ?? 1700}" cy="${opts.by ?? 960}" r="700" fill="url(#${b})"/>
    <rect width="1920" height="1080" fill="url(#${grid})"/>
    ${extra}
    <rect width="1920" height="1080" fill="url(#${vig})"/>
    ${br(40, 40, 1, 1)}${br(1880, 40, -1, 1)}${br(40, 1040, 1, -1)}${br(1880, 1040, -1, -1)}
    ${footer}`;
  return svg(1920, 1080, body, defs, style);
}

/* Glass card with accent edge, optional icon badge (top-left) and big number (top-right). */
function card(w, h, accent, o = {}) {
  const f = id('f'), s = id('s'), r = o.r ?? 22;
  const defs = `
    <linearGradient id="${f}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFFFF" stop-opacity="${o.top ?? .085}"/><stop offset="1" stop-color="#FFFFFF" stop-opacity="${o.bot ?? .025}"/></linearGradient>
    <linearGradient id="${s}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${accent}" stop-opacity=".75"/><stop offset=".45" stop-color="${accent}" stop-opacity=".18"/><stop offset="1" stop-color="${accent}" stop-opacity=".35"/></linearGradient>`;
  let body = `<rect x="1.5" y="1.5" width="${w - 3}" height="${h - 3}" rx="${r}" fill="url(#${f})" stroke="url(#${s})" stroke-width="2"/>`;
  if (o.bar !== false) body += `<rect x="${r + 6}" y="0" width="${o.barW ?? 70}" height="4" rx="2" fill="${accent}"/>`;
  if (o.icon) {
    const ix = o.ix ?? 34, iy = o.iy ?? 34, is = o.is ?? 64;
    body += `<rect x="${ix}" y="${iy}" width="${is}" height="${is}" rx="${is * .28}" fill="${accent}" fill-opacity=".14" stroke="${accent}" stroke-opacity=".5"/>` + icon(o.icon, ix + is * .22, iy + is * .22, is * .56, accent, 1.7);
  }
  if (o.num) body += `<text x="${w - 30}" y="${o.numY ?? 78}" text-anchor="end" font-size="${o.numSize ?? 54}" font-weight="800" fill="${accent}" fill-opacity=".22" font-family="-apple-system,BlinkMacSystemFont,Inter,Arial,sans-serif">${o.num}</text>`;
  if (o.extra) body += o.extra;
  return svg(w, h, body, defs);
}

/* Rounded pill/chip (outline or filled). */
function pill(w, h, color, filled = false) {
  return svg(w, h, `<rect x="1.5" y="1.5" width="${w - 3}" height="${h - 3}" rx="${(h - 3) / 2}" fill="${color}" fill-opacity="${filled ? .9 : .10}" stroke="${color}" stroke-opacity="${filled ? 1 : .6}" stroke-width="2"/>`);
}

/* Animated arrow between two points (inside a background). */
function flow(x1, y1, x2, y2, color, o = {}) {
  const d = o.d || (o.curve ? `M${x1} ${y1}C${(x1 + x2) / 2} ${y1} ${(x1 + x2) / 2} ${y2} ${x2} ${y2}` : `M${x1} ${y1}L${x2} ${y2}`);
  const ang = Math.atan2(y2 - (o.curve ? y2 : y1), x2 - (o.curve ? (x1 + x2) / 2 : x1));
  const ah = 13, a1 = ang + 2.6, a2 = ang - 2.6;
  const head = o.head === false ? '' : `<path d="M${x2} ${y2}L${x2 + ah * Math.cos(a1)} ${y2 + ah * Math.sin(a1)}M${x2} ${y2}L${x2 + ah * Math.cos(a2)} ${y2 + ah * Math.sin(a2)}" stroke="${color}" stroke-width="3" stroke-linecap="round" fill="none"/>`;
  return `<path d="${d}" stroke="${color}" stroke-opacity=".22" stroke-width="${o.w ?? 3}" fill="none"/><path class="flow" d="${d}" stroke="${color}" stroke-width="${o.w ?? 3}"/>${head}`;
}
const label = (x, y, t, color, size = 15, anchor = 'middle') =>
  `<text x="${x}" y="${y}" text-anchor="${anchor}" font-size="${size}" font-weight="700" letter-spacing="2.5" fill="${color}">${t}</text>`;

module.exports = { C, ICON, icon, svg, background, card, pill, flow, label };
