/* elements.js — 문서 모델, 객체 렌더링, 도형 계산 (편집기와 내보내기가 함께 씀) */
'use strict';
const $ = (q, el = document) => el.querySelector(q);
const $$ = (q, el = document) => [...el.querySelectorAll(q)];
const RAD = Math.PI / 180;
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => 'o' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const norm180 = a => { a = ((a + 180) % 360 + 360) % 360 - 180; return Math.round(a * 100) / 100; };

const THEMES = [
  { name: '화이트', bg: '#ffffff', title: '#16324f', body: '#46566a', accent: '#2f7fd1' },
  { name: '페이퍼', bg: '#f6f0e4', title: '#3b2c20', body: '#5f4e40', accent: '#c2562d' },
  { name: '칠판', bg: '#1f302a', title: '#f4f1e6', body: '#cdd8cf', accent: '#f0b43c' },
  { name: '미드나잇', bg: '#0e1a2d', title: '#f3f6fb', body: '#b7c4d6', accent: '#52b4ff' },
  { name: '코랄', bg: '#fff3ee', title: '#7a2436', body: '#8a4b52', accent: '#e8505b' },
  { name: '그래파이트', bg: '#24262b', title: '#fafafa', body: '#c3c6cc', accent: '#9ad14b' },
];
const FONTS = {
  sans: '-apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo","Pretendard","Noto Sans KR","Malgun Gothic",sans-serif',
  serif: '"Apple Myungjo","Noto Serif KR","Nanum Myeongjo","Batang",Georgia,serif',
  mono: 'ui-monospace,"SF Mono","D2Coding",Menlo,Consolas,monospace',
};
/* 기본 글자 크기 (이전 120·64·38에서 약 75%로 줄임) */
const TEXT_STYLES = { title: { fs: 90, fw: 800 }, sub: { fs: 48, fw: 600 }, body: { fs: 28, fw: 400 } };

/* 객체 CSS — 편집기·썸네일·내보낸 파일이 모두 같은 규칙을 씁니다 */
const OBJ_CSS = `
.o{position:absolute;left:0;top:0;transform-origin:0 0;box-sizing:border-box}
.o svg{display:block;width:100%;height:100%;overflow:visible}
.o-frame{pointer-events:none}
.o img,.o video,.o iframe{display:block;width:100%;height:100%;border:0}
.o img{object-fit:fill;-webkit-user-drag:none}
.txt{white-space:pre-wrap;word-break:keep-all;overflow-wrap:break-word;line-height:1.28;outline:0;min-width:.5em;min-height:1em}
.txt p,.txt ul,.txt ol{margin:0}.txt ul,.txt ol{padding-left:1.2em}.txt li+li{margin-top:.35em}
.vidlink{position:absolute;right:0;bottom:-30px;font:16px sans-serif;color:var(--c-body)}
.o-shape .sbox{position:absolute;inset:0;display:flex;align-items:center;padding:6% 8%;box-sizing:border-box}
.stxt{width:100%;white-space:pre-wrap;word-break:keep-all;overflow-wrap:break-word;line-height:1.25;outline:0;min-height:1em}
.stxt p,.stxt ul,.stxt ol{margin:0}.stxt ul,.stxt ol{padding-left:1.2em}
.tbl{width:100%;border-collapse:collapse;table-layout:fixed;line-height:1.3;outline:0}
.tbl td,.tbl th{border:2px solid var(--tl);padding:.32em .55em;vertical-align:middle;word-break:keep-all;overflow-wrap:break-word}
.tbl th{background:var(--th);color:#fff;font-weight:700;border-color:var(--th)}
.tbl.stripe tr:nth-child(even) td{background:rgba(128,136,150,.12)}
.tbl td:empty::after,.tbl th:empty::after{content:'\\200b'}
.o-chart text{white-space:pre}
.o-model .mv-snap{position:absolute;inset:0;width:100%;height:100%;object-fit:contain}
.o-model.mv-on .mv-snap{visibility:hidden}
.o-model .mv-wait{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4%;border:2px dashed rgba(120,128,140,.5);border-radius:12px;color:rgba(120,128,140,.9);font:28px sans-serif}
.o-embed .emb-ph{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3%;border:2px solid rgba(120,128,140,.35);border-radius:14px;background:rgba(128,136,150,.08);color:rgba(90,98,110,.95);font:30px -apple-system,"Apple SD Gothic Neo","Malgun Gothic",sans-serif;text-align:center;padding:0 6%;box-sizing:border-box;overflow:hidden}
.o-embed .emb-ph span{font-size:.65em;opacity:.75;word-break:break-all}
.o-embed .emb-frame{position:absolute;inset:0;width:100%;height:100%;border:0;background:#fff;border-radius:6px}
.o-connector,.o-ink{pointer-events:none}.o-connector .hit,.o-ink .hit{pointer-events:stroke}
.o-chart.play .ca{animation:.75s cubic-bezier(.2,.8,.2,1) both}
.o-chart.play .cb.ca{transform-box:fill-box;transform-origin:50% 100%;animation-name:chUp}
.o-chart.play .cbh.ca{transform-box:fill-box;transform-origin:0 50%;animation-name:chRight}
.o-chart.play .cl.ca{stroke-dasharray:1;animation-name:chDraw;animation-duration:1.3s}
.o-chart.play .cs.ca{animation-name:chPop}
.o-chart.play .cd.ca,.o-chart.play .ca-fill.ca{animation-name:chFade}
@keyframes chUp{from{transform:scaleY(0)}}@keyframes chRight{from{transform:scaleX(0)}}
@keyframes chDraw{from{stroke-dashoffset:1}}@keyframes chPop{from{transform:scale(.3);opacity:0}}@keyframes chFade{from{opacity:0}}
`;

let doc = null;
const assetURL = {};              // 자산 id → 편집기용 blob URL

function newDoc() {
  return { v: 2, title: '새 캔버스', theme: 0, bg: null, W: 1920, H: 1080, duration: 1200, perspective: 1000, objects: [], path: [], overview: null, assets: {} };
}
const getObj = id => doc.objects.find(o => o.id === id);
const theme = () => THEMES[doc.theme] || THEMES[0];
function themeVars() {
  const t = theme();
  return `--c-bg:${doc.bg || t.bg};--c-title:${t.title};--c-body:${t.body};--c-accent:${t.accent}`;
}

function makeObj(type, props) {
  const base = { id: uid(), type, x: 0, y: 0, z: 0, w: 100, h: 100, s: 1, rot: 0, rx: 0, ry: 0, opacity: 1 };
  if (type === 'text') Object.assign(base, { html: '', style: 'body', fs: TEXT_STYLES.body.fs, fw: 400, color: null, align: 'left', font: 'sans', auto: true });
  if (type === 'shape') Object.assign(base, { shape: 'rect', p: {}, fill: null, stroke: null, sw: 0, text: '', fs: 40, color: null, align: 'center', font: 'sans' });
  if (type === 'table') Object.assign(base, { rows: [['항목', '내용', '비고'], ['', '', ''], ['', '', ''], ['', '', '']], head: true, stripe: true, fs: 30, color: null, fill: null, stroke: null, align: 'left', font: 'sans' });
  if (type === 'chart') Object.assign(base, { kind: 'bar', title: '', fs: 28, font: 'sans', legend: true, labels: false, grid: true, anim: true,
    data: [['항목', '2024', '2025'], ['1분기', '42', '55'], ['2분기', '58', '61'], ['3분기', '49', '72'], ['4분기', '66', '80']] });
  if (type === 'model') Object.assign(base, { asset: null, srcName: '', thumbA: null, thumbSig: '', partNames: [], bg: null, spin: true, speed: 1, orbit: true, anim: true, yaw: 30, pitch: 20, zoom: 1, exposure: 1, parts: {} });
  if (type === 'embed') Object.assign(base, { mode: 'html', html: '', url: '', srcName: '' });
  if (type === 'connector') Object.assign(base, { from: null, to: null, route: 'elbow', stroke: null, sw: 6, head: 'end', dash: false, d: '' });
  if (type === 'ink') Object.assign(base, { d: '', stroke: null, sw: 6 });
  if (type === 'frame') Object.assign(base, { frame: 'bracket', color: null, fill: null, notes: '' });
  if (type === 'image') Object.assign(base, { asset: null, src: null, radius: 0 });
  if (type === 'video') Object.assign(base, { asset: null, src: null, yt: null });
  return Object.assign(base, props);
}

/* HTML 살균: 불러온 파일의 스크립트가 실행되지 않게 허용 목록만 남깁니다 */
function clean(html) {
  const tpl = document.createElement('template');
  tpl.innerHTML = String(html ?? '');
  const OK = /^(B|STRONG|I|EM|U|S|STRIKE|BR|DIV|P|SPAN|FONT|UL|OL|LI|A|H1|H2|H3)$/;
  (function walk(node) {
    [...node.children].forEach(el => {
      if (!OK.test(el.tagName)) {
        if (/^(SCRIPT|STYLE|IFRAME|OBJECT|EMBED|TEMPLATE|LINK|META)$/.test(el.tagName)) { el.remove(); return; }
        walk(el); el.replaceWith(...el.childNodes); return;
      }
      [...el.attributes].forEach(a => {
        const n = a.name.toLowerCase();
        const safe = n === 'color' || n === 'style' || (n === 'href' && /^(https?:|mailto:)/i.test(a.value));
        if (!safe || (n === 'style' && /url\(|expression|javascript:/i.test(a.value))) el.removeAttribute(a.name);
      });
      walk(el);
    });
  })(tpl.content);
  return tpl.innerHTML;
}

/* 도형: 종류마다 기본 매개변수를 두고 o.p로 덮어씁니다 (속성 패널에서 조절) */
const SHAPE_DEF = {
  rect: { r: .06 }, callout: { r: .08 }, polygon: { n: 6 }, star: { n: 5, inner: .45 }, cross: { t: .34 },
  pie: { a: 270 }, donut: { t: .32 }, chevron: { t: .38 }, parallelogram: { k: .25 }, trapezoid: { k: .2 },
};
/* 메뉴용 목록: [키, 이름, 실제 shape·p(생략 시 키와 같음), 기본 크기] */
const SHAPE_MENU = [
  ['기본 도형', [['rect', '사각형'], ['round', '둥근 사각형', { shape: 'rect', p: { r: .22 } }], ['ellipse', '원'], ['triangle', '삼각형'], ['diamond', '마름모'],
    ['parallelogram', '평행사변형'], ['trapezoid', '사다리꼴'], ['pentagon', '오각형', { shape: 'polygon', p: { n: 5 } }], ['hexagon', '육각형', { shape: 'polygon', p: { n: 6 } }],
    ['octagon', '팔각형', { shape: 'polygon', p: { n: 8 } }], ['star', '별'], ['cross', '십자'], ['pie', '부채꼴'], ['donut', '도넛']]],
  ['화살표·선', [['arrow', '오른쪽 화살표', null, [340, 100]], ['arrow2', '좌우 화살표', null, [360, 100]], ['chevron', '갈매기형', null, [220, 200]], ['line', '선', null, [340, 28]]]],
  ['설명선·순서도', [['callout', '설명선', null, [320, 220]], ['terminal', '시작·끝', null, [320, 120]], ['process', '처리', { shape: 'rect', p: { r: 0 } }, [300, 170]],
    ['decision', '판단', { shape: 'diamond' }, [300, 200]], ['document', '문서', null, [300, 190]]]],
];
const SHAPE_PRESET = Object.fromEntries(SHAPE_MENU.flatMap(([, list]) => list.map(([k, name, preset, size]) => [k, { name, shape: (preset && preset.shape) || k, p: (preset && preset.p) || {}, size: size || [240, 240] }])));
const r2 = v => Math.round(v * 100) / 100;
function shapeSVG(o) {
  const w = o.w, h = o.h, fill = o.fill || 'var(--c-accent)', stroke = o.stroke || 'none', sw = o.sw || 0;
  const P = { ...SHAPE_DEF[o.shape], ...o.p }, i = sw / 2, W = Math.max(1, w - sw), H = Math.max(1, h - sw);
  const p = `fill="${esc(fill)}" stroke="${esc(stroke)}" stroke-width="${sw}" stroke-linejoin="round"`;
  const X = u => r2(i + u * W), Y = v => r2(i + v * H);
  const poly = pts => `<polygon points="${pts.map(([u, v]) => X(u) + ',' + Y(v)).join(' ')}" ${p}/>`;
  const ring = (n, rad) => Array.from({ length: n }, (_, k) => { const a = -Math.PI / 2 + k * 2 * Math.PI / n; return [.5 + rad(k) * Math.cos(a), .5 + rad(k) * Math.sin(a)]; });
  let body = '';
  switch (o.shape) {
    case 'rect': body = `<rect x="${i}" y="${i}" width="${W}" height="${H}" rx="${r2(Math.min(W, H) * Math.min(.5, P.r))}" ${p}/>`; break;
    case 'ellipse': body = `<ellipse cx="${w / 2}" cy="${h / 2}" rx="${W / 2}" ry="${H / 2}" ${p}/>`; break;
    case 'triangle': body = poly([[.5, 0], [1, 1], [0, 1]]); break;
    case 'diamond': body = poly([[.5, 0], [1, .5], [.5, 1], [0, .5]]); break;
    case 'parallelogram': body = poly([[P.k, 0], [1, 0], [1 - P.k, 1], [0, 1]]); break;
    case 'trapezoid': body = poly([[P.k, 0], [1 - P.k, 0], [1, 1], [0, 1]]); break;
    case 'polygon': body = poly(ring(Math.max(3, Math.round(P.n)), () => .5)); break;
    case 'star': { const n = Math.max(3, Math.round(P.n)); body = poly(ring(n * 2, k => k % 2 ? .5 * P.inner : .5)); break; }
    case 'cross': { const a = (1 - P.t) / 2, b = (1 + P.t) / 2; body = poly([[a, 0], [b, 0], [b, a], [1, a], [1, b], [b, b], [b, 1], [a, 1], [a, b], [0, b], [0, a], [a, a]]); break; }
    case 'chevron': body = poly([[0, 0], [1 - P.t, 0], [1, .5], [1 - P.t, 1], [0, 1], [P.t, .5]]); break;
    case 'pie': {
      const a = Math.min(359.99, Math.max(1, P.a)) * RAD, cx = w / 2, cy = h / 2, rx = W / 2, ry = H / 2;
      const ex = cx + rx * Math.cos(-Math.PI / 2 + a), ey = cy + ry * Math.sin(-Math.PI / 2 + a);
      body = `<path d="M${cx},${cy}L${cx},${r2(cy - ry)}A${r2(rx)},${r2(ry)} 0 ${a > Math.PI ? 1 : 0} 1 ${r2(ex)},${r2(ey)}Z" ${p}/>`; break;
    }
    case 'donut': {
      const cx = w / 2, cy = h / 2, rx = W / 2, ry = H / 2, k = 1 - Math.min(.95, Math.max(.05, P.t)), e = (a, b) => `M${r2(cx - a)},${cy}a${r2(a)},${r2(b)} 0 1 0 ${r2(2 * a)},0a${r2(a)},${r2(b)} 0 1 0 ${r2(-2 * a)},0Z`;
      body = `<path fill-rule="evenodd" d="${e(rx, ry)}${e(rx * k, ry * k)}" ${p}/>`; break;
    }
    case 'arrow': case 'arrow2': {
      const t = H * .32, hl = Math.min(H * 1.1, W * (o.shape === 'arrow' ? .5 : .3)), m = h / 2, x0 = i, x1 = i + W;
      body = o.shape === 'arrow'
        ? `<polygon points="${x0},${m - t / 2} ${x1 - hl},${m - t / 2} ${x1 - hl},${i} ${x1},${m} ${x1 - hl},${i + H} ${x1 - hl},${m + t / 2} ${x0},${m + t / 2}" ${p}/>`
        : `<polygon points="${x0},${m} ${x0 + hl},${i} ${x0 + hl},${m - t / 2} ${x1 - hl},${m - t / 2} ${x1 - hl},${i} ${x1},${m} ${x1 - hl},${i + H} ${x1 - hl},${m + t / 2} ${x0 + hl},${m + t / 2} ${x0 + hl},${i + H}" ${p}/>`;
      break;
    }
    case 'callout': {
      const bh = H * .78, R = r2(Math.min(W, bh) * Math.min(.5, P.r)), L = i, T = i, Rt = i + W, B = i + bh;
      body = `<path d="M${L + R},${T}H${Rt - R}Q${Rt},${T} ${Rt},${T + R}V${B - R}Q${Rt},${B} ${Rt - R},${B}H${X(.38)}L${X(.16)},${Y(1)}L${X(.22)},${B}H${L + R}Q${L},${B} ${L},${B - R}V${T + R}Q${L},${T} ${L + R},${T}Z" ${p}/>`; break;
    }
    case 'terminal': body = `<rect x="${i}" y="${i}" width="${W}" height="${H}" rx="${r2(Math.min(W, H) / 2)}" ${p}/>`; break;
    case 'document': body = `<path d="M${X(0)},${Y(0)}H${X(1)}V${Y(.84)}C${X(.72)},${Y(.62)} ${X(.3)},${Y(1.08)} ${X(0)},${Y(.86)}Z" ${p}/>`; break;
    case 'line': body = `<rect x="0" y="${h / 2 - Math.max(sw, 6) / 2}" width="${w}" height="${Math.max(sw, 6)}" rx="${Math.max(sw, 6) / 2}" fill="${esc(o.stroke || o.fill || 'var(--c-accent)')}"/>`; break;
  }
  return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">${body}</svg>`;
}
/* 도형 안 글: 설명선은 꼬리를 뺀 몸통 안에, 문서는 물결 위쪽에 */
function shapeText(o, mode) {
  if (o.shape === 'line' || (mode !== 'edit' && !o.text)) return '';
  const pad = o.shape === 'callout' ? 'padding-bottom:24%;' : o.shape === 'document' ? 'padding-bottom:12%;' : o.shape === 'triangle' ? 'padding-top:30%;' : '';
  const c = o.color || '#ffffff';
  return `<div class="sbox" style="${pad}"><div class="stxt" data-edit style="font-family:${esc(FONTS[o.font] || FONTS.sans)};font-size:${o.fs || 40}px;color:${esc(c)};text-align:${esc(o.align || 'center')}">${o.text || ''}</div></div>`;
}
/* 표: 셀 내용만 저장하고 구조는 rows 배열로 만듭니다 */
function tableHTML(o) {
  const line = o.stroke || 'rgba(120,128,140,.55)', head = o.fill || 'var(--c-accent)', c = o.color || 'var(--c-body)';
  const rows = o.rows.map((r, ri) => `<tr>${r.map(cell => ri === 0 && o.head ? `<th>${cell}</th>` : `<td>${cell}</td>`).join('')}</tr>`).join('');
  return `<table class="tbl${o.stripe ? ' stripe' : ''}" data-edit style="height:${o.h}px;font-family:${esc(FONTS[o.font] || FONTS.sans)};font-size:${o.fs}px;color:${esc(c)};text-align:${esc(o.align)};--tl:${esc(line)};--th:${esc(head)}">${rows}</table>`;
}

/* 연결선: 경로(d)는 양 끝 객체 위치로 편집기가 계산해 저장합니다. 화살촉은 연결선마다 고유 id의 marker */
function connectorSVG(o) {
  const c = esc(o.stroke || 'var(--c-body)'), id = 'm' + esc(o.id), dash = o.dash ? ` stroke-dasharray="${o.sw * 2.5} ${o.sw * 1.8}"` : '';
  const mk = (n, rev) => `<marker id="${id}${n}" viewBox="0 0 10 10" refX="${rev ? 2 : 8}" refY="5" markerWidth="4.2" markerHeight="4.2" orient="auto-start-reverse"><path d="M0,1L10,5L0,9z" fill="${c}"/></marker>`;
  const end = o.head === 'end' || o.head === 'both', start = o.head === 'both';
  return `<svg viewBox="0 0 ${o.w} ${o.h}"><defs>${end ? mk('e') : ''}${start ? mk('s', 1) : ''}</defs>`
    + `<path class="hit" d="${esc(o.d)}" fill="none" stroke="transparent" stroke-width="${o.sw + 18}"/>`
    + `<path d="${esc(o.d)}" fill="none" stroke="${c}" stroke-width="${o.sw}" stroke-linejoin="round" stroke-linecap="round"${dash}${end ? ` marker-end="url(#${id}e)"` : ''}${start ? ` marker-start="url(#${id}s)"` : ''}/></svg>`;
}

function frameSVG(o, mode) {
  const w = o.w, h = o.h, c = o.color || 'var(--c-accent)', m = Math.min(w, h), sw = m * .012, i = sw / 2;
  const fill = o.fill ? `fill="${esc(o.fill)}"` : 'fill="none"';
  if (o.frame === 'hidden') {
    if (mode === 'show' || mode === 'thumb' || mode === 'print') return '';
    return `<svg viewBox="0 0 ${w} ${h}"><rect x="${i}" y="${i}" width="${w - sw}" height="${h - sw}" fill="none" stroke="#8892a0" stroke-width="${sw * .7}" stroke-dasharray="${sw * 4} ${sw * 3}"/></svg>`;
  }
  const st = `stroke="${esc(c)}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"`;
  let body = '';
  if (o.frame === 'rect') body = `<rect x="${i}" y="${i}" width="${w - sw}" height="${h - sw}" rx="${m * .03}" ${fill} ${st}/>`;
  if (o.frame === 'circle') body = `<ellipse cx="${w / 2}" cy="${h / 2}" rx="${w / 2 - i}" ry="${h / 2 - i}" ${fill} ${st}/>`;
  if (o.frame === 'bracket') {
    const b = m * .09;
    if (o.fill) body += `<rect width="${w}" height="${h}" ${fill}/>`;
    body += `<path d="M${b},${i}H${i}V${h - i}H${b}M${w - b},${i}H${w - i}V${h - i}H${w - b}" fill="none" ${st}/>`;
  }
  return `<svg viewBox="0 0 ${w} ${h}">${body}</svg>`;
}

function objInner(o, mode, srcOf) {
  if (o.type === 'text') {
    const c = o.color || (o.style === 'body' ? 'var(--c-body)' : o.style === 'sub' ? 'var(--c-accent)' : 'var(--c-title)');
    return `<div class="txt" style="font-family:${esc(FONTS[o.font] || FONTS.sans)};font-size:${o.fs}px;font-weight:${o.fw};color:${esc(c)};text-align:${esc(o.align)}">${o.html}</div>`;
  }
  if (o.type === 'shape') return shapeSVG(o) + shapeText(o, mode);
  if (o.type === 'table') return tableHTML(o);
  if (o.type === 'chart') return chartSVG(o);
  if (o.type === 'connector') return connectorSVG(o);
  if (o.type === 'model') {
    /* 편집 화면·썸네일은 스냅샷, 발표 화면은 스냅샷 위에 실시간 캔버스가 얹힘 (오프라인이면 스냅샷 그대로) */
    const src = !o.thumbA ? '' : mode === 'show' ? `data-a="${esc(o.thumbA)}"`
      : mode === 'print' ? `src="${esc(doc.assets[o.thumbA] || '')}"` : `src="${esc(assetURL[o.thumbA] || '')}"`;
    return src ? `<img class="mv-snap" alt="" draggable="false" ${src}>`
      : `<div class="mv-wait"><svg viewBox="0 0 24 24" width="22%" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M12 2 3 7v10l9 5 9-5V7z"/><path d="M3 7l9 5 9-5M12 12v10"/></svg><span>3D 모델 준비 중…</span></div>`;
  }
  if (o.type === 'embed') {
    /* 편집 화면·썸네일·PDF는 자리표시. 발표 화면에서는 이 위에 iframe이 얹힘 */
    const web = o.mode === 'url';
    const title = o.name || o.srcName || (web ? (o.url || '').replace(/^https?:\/\//, '').split('/')[0] : 'HTML') || '웹 임베드';
    const sub = web ? (o.url || '주소 없음') : (o.html ? `HTML ${Math.max(1, Math.round(o.html.length / 1024))}KB` : 'HTML 없음');
    return `<div class="emb-ph"><svg viewBox="0 0 24 24" width="14%" fill="none" stroke="currentColor" stroke-width="1.4">${web
      ? '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>'
      : '<path d="m8 8-4 4 4 4M16 8l4 4-4 4M14 5l-4 14"/>'}</svg><b>${esc(title)}</b><span>${esc(sub.slice(0, 80))}</span></div>`;
  }
  if (o.type === 'ink') {
    const c = esc(o.stroke || 'var(--c-title)');
    return `<svg viewBox="0 0 ${o.w} ${o.h}"><path class="hit" d="${esc(o.d)}" fill="none" stroke="transparent" stroke-width="${o.sw + 16}" stroke-linecap="round"/><path d="${esc(o.d)}" fill="none" stroke="${c}" stroke-width="${o.sw}" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  }
  if (o.type === 'frame') return frameSVG(o, mode);
  if (o.type === 'image') {
    const r = o.radius ? `border-radius:${o.radius}px;` : '';
    return `<img alt="" draggable="false" style="${r}" ${srcOf(o)}>`;
  }
  if (o.type === 'video') {
    if (mode === 'show') {
      // 로컬 파일에서도 재생되도록 공개된 프로젝트 플레이어를 거쳐 YouTube를 불러옵니다.
      if (o.yt) return `<iframe src="https://jakalee.github.io/simpress/player.html?v=${esc(o.yt)}" allow="autoplay;encrypted-media;fullscreen" allowfullscreen></iframe><a class="vidlink" href="https://www.youtube.com/watch?v=${esc(o.yt)}" target="_blank" rel="noopener">YouTube에서 열기 ↗</a>`;
      return `<video controls playsinline ${srcOf(o)}></video>`;
    }
    const bg = o.yt ? `background:#111 url(https://img.youtube.com/vi/${esc(o.yt)}/hqdefault.jpg) center/cover` : 'background:#111';
    return `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;${bg}"><svg viewBox="0 0 100 100" style="width:22%;height:auto"><circle cx="50" cy="50" r="46" fill="rgba(0,0,0,.55)" stroke="#fff" stroke-width="3"/><polygon points="40,30 72,50 40,70" fill="#fff"/></svg></div>`;
  }
  return '';
}

function objTransform(o) {
  return `translate3d(${o.x}px,${o.y}px,${o.z}px) rotateX(${o.rx}deg) rotateY(${o.ry}deg) rotateZ(${o.rot}deg) scale(${o.s}) translate(-50%,-50%)`;
}
function objStyle(o) {
  /* 글상자는 내용에 맞춰, 표는 폭만 정하고 높이는 내용에 맞춰 늘어납니다 */
  const size = o.type === 'text' ? (o.auto ? 'width:max-content;' : `width:${o.w}px;`) : o.type === 'table' ? `width:${o.w}px;` : `width:${o.w}px;height:${o.h}px;`;
  const op = o.opacity < 1 ? `opacity:${o.opacity};` : '';
  const vis = o.hidden ? 'visibility:hidden;' : '';
  return `${size}${op}${vis}transform:${objTransform(o)}`;
}
const editorSrc = o => {
  const u = o.asset ? assetURL[o.asset] : o.src;
  return u ? `src="${esc(u)}"` : '';
};
function objHTML(o, mode = 'edit', srcOf = editorSrc, extra = '') {
  const lock = mode === 'edit' ? (o.locked ? ' locked' : '') + (o.fxHidden ? ' fxhid' : '') : '';
  return `<div class="o o-${o.type}${lock}" data-id="${o.id}" style="${objStyle(o)}"${extra}>${objInner(o, mode, srcOf)}</div>`;
}

/* ── 기하 계산: impress.js와 같은 회전 순서(X→Y→Z) ── */
function euler(rx, ry, rz) {
  const a = rx * RAD, b = ry * RAD, c = rz * RAD, ca = Math.cos(a), sa = Math.sin(a), cb = Math.cos(b), sb = Math.sin(b), cc = Math.cos(c), sc = Math.sin(c);
  return [
    cb * cc, -cb * sc, sb,
    ca * sc + sa * sb * cc, ca * cc - sa * sb * sc, -sa * cb,
    sa * sc - ca * sb * cc, sa * cc + ca * sb * sc, ca * cb,
  ];
}
function toEuler(m) {
  const round = v => Math.round(v * 1000) / 1000;
  const sb = Math.max(-1, Math.min(1, m[2]));
  if (Math.abs(sb) > .99999) return [round(Math.atan2(m[7], m[4]) / RAD), round(Math.asin(sb) / RAD), 0];
  return [round(Math.atan2(-m[5], m[8]) / RAD), round(Math.asin(sb) / RAD), round(Math.atan2(-m[1], m[0]) / RAD)];
}
const mulM = (a, b) => [0, 1, 2].flatMap(r => [0, 1, 2].map(c => a[r * 3] * b[c] + a[r * 3 + 1] * b[c + 3] + a[r * 3 + 2] * b[c + 6]));
const transM = m => [m[0], m[3], m[6], m[1], m[4], m[7], m[2], m[5], m[8]];
const mulV = (m, v) => [m[0] * v[0] + m[1] * v[1] + m[2] * v[2], m[3] * v[0] + m[4] * v[1] + m[5] * v[2], m[6] * v[0] + m[7] * v[1] + m[8] * v[2]];
const objM = o => euler(o.rx || 0, o.ry || 0, o.rot || 0);

function corners(o) {
  const hw = o.w * o.s / 2, hh = o.h * o.s / 2, m = objM(o);
  return [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]].map(([x, y]) => { const v = mulV(m, [x, y, 0]); return [o.x + v[0], o.y + v[1], (o.z || 0) + v[2]]; });
}
function boundsOf(list) {
  if (!list.length) return null;
  let a = Infinity, b = Infinity, c = -Infinity, d = -Infinity, z = 0;
  list.forEach(o => { z += o.z || 0; corners(o).forEach(([x, y]) => { a = Math.min(a, x); b = Math.min(b, y); c = Math.max(c, x); d = Math.max(d, y); }); });
  return { x: (a + c) / 2, y: (b + d) / 2, z: z / list.length, w: c - a, h: d - b, r: 0, rx: 0, ry: 0 };
}
function toLocal(o, wx, wy, wz = o.z) {
  const v = mulV(transM(objM(o)), [wx - o.x, wy - o.y, wz - o.z]);
  return [v[0] / o.s, v[1] / o.s, v[2] / o.s];
}
function containsPoint(o, wx, wy, wz = o.z) {
  const [lx, ly, lz] = toLocal(o, wx, wy, wz);
  if (Math.abs(lz) > Math.max(o.w, o.h)) return false;
  if (o.type === 'frame' && o.frame === 'circle') return (lx / (o.w / 2)) ** 2 + (ly / (o.h / 2)) ** 2 <= 1;
  return Math.abs(lx) <= o.w / 2 && Math.abs(ly) <= o.h / 2;
}
/* 프레임 안에 든 객체 — 프레임을 옮기거나 기울이면 내용도 같이 움직입니다 */
function containedIn(f) {
  const area = f.w * f.h * f.s * f.s;
  return doc.objects.filter(o => o !== f && o.w * o.h * o.s * o.s < area && containsPoint(f, o.x, o.y, o.z));
}
function regionOf(o) {
  const m = o.type === 'frame' ? 1 : 1.14;
  return { x: o.x, y: o.y, z: o.z, w: o.w * o.s * m, h: o.h * o.s * m, r: o.rot, rx: o.rx, ry: o.ry };
}
function overviewRegion() {
  if (doc.overview) return doc.overview;
  const b = boundsOf(doc.objects) || { x: 0, y: 0, z: 0, w: doc.W, h: doc.H, r: 0, rx: 0, ry: 0 };
  return { ...b, w: Math.max(b.w, 200) * 1.1, h: Math.max(b.h, 200) * 1.1 };
}
const SHAPE_NAMES = { rect: '사각형', ellipse: '원', triangle: '삼각형', diamond: '마름모', polygon: '다각형', star: '별', cross: '십자', pie: '부채꼴', donut: '도넛',
  arrow: '화살표', arrow2: '좌우 화살표', chevron: '갈매기형', parallelogram: '평행사변형', trapezoid: '사다리꼴', callout: '설명선', terminal: '시작·끝', document: '문서', line: '선' };
const plainText = html => (new DOMParser().parseFromString(html || '', 'text/html').body.textContent || '').trim();
const TYPE_NAMES = { image: '이미지', video: '영상', table: '표', chart: '차트', connector: '연결선', ink: '그리기', model: '3D 모델', sim: '시뮬레이션' };
/* 레이어 목록에 보일 이름: 사용자가 붙인 이름 → 글 내용 → 종류 */
function objLabel(o) {
  if (o.name) return o.name;
  if (o.type === 'text') return plainText(o.html).slice(0, 40) || '텍스트';
  if (o.type === 'frame') return o.slide ? '슬라이드' : '프레임';
  if (o.type === 'shape') return plainText(o.text).slice(0, 30) || SHAPE_NAMES[o.shape] || '도형';
  if (o.type === 'table') return plainText((o.rows[0] || []).join(' · ')).slice(0, 30) || '표';
  if (o.type === 'model') return o.srcName ? o.srcName.replace(/\.[^.]+$/, '') : '3D 모델';
  if (o.type === 'embed') return o.srcName || (o.mode === 'url' && o.url ? o.url.replace(/^https?:\/\//, '').slice(0, 40) : '웹 임베드');
  if (o.type === 'chart') return o.title || (CHART_KINDS.find(k => k[0] === o.kind) || ['', ''])[1] + ' 차트';
  return TYPE_NAMES[o.type] || o.type;
}
function stepTitle(o) {
  if (!o) return '';
  if (o.name) return o.name;
  if (o.type === 'text') return (new DOMParser().parseFromString(o.html, 'text/html').body.textContent || '').trim() || '텍스트';
  const inner = doc.objects.filter(c => c.type === 'text' && containsPoint(o, c.x, c.y, c.z)).sort((a, b) => b.fs * b.s - a.fs * a.s)[0];
  if (inner) return stepTitle(inner);
  return o.type === 'frame' ? '프레임' : objLabel(o);
}
