/* layouts.js — 슬라이드 레이아웃과 덱 템플릿.
   · 레이아웃: 슬라이드(16:9 프레임) 안에 제목·본문·도형을 배치하는 규칙. 좌표는 슬라이드 크기에 대한 비율.
   · 덱 템플릿: 테마 + 프레임 모양 + 캔버스 배치(가로 줄·격자·방사형 줌·3D 계단) + 기본 개요.
   · AI 덱 만들기도 같은 개요 형식(outline)을 받아 이 엔진으로 만듭니다. */
const LAYOUTS = {
  title: { name: '표지', icon: [['t', .5, .42, .5, .09], ['l', .5, .55, .14, .012], ['s', .5, .64, .34, .04]] },
  section: { name: '섹션', icon: [['b', .09, .5, .012, .3], ['s', .2, .38, .08, .04, 'l'], ['t', .2, .52, .55, .09, 'l']] },
  bullets: { name: '제목 + 글머리표', icon: [['t', .08, .16, .5, .07, 'l'], ['d', .08, .38, .6, .035], ['d', .08, .52, .55, .035], ['d', .08, .66, .5, .035]] },
  two: { name: '2단', icon: [['t', .08, .16, .5, .07, 'l'], ['d', .08, .42, .37, .035], ['d', .08, .56, .32, .035], ['d', .55, .42, .37, .035], ['d', .55, .56, .32, .035]] },
  imageText: { name: '이미지 + 글', icon: [['t', .08, .16, .5, .07, 'l'], ['i', .08, .3, .4, .55], ['d', .55, .42, .37, .035], ['d', .55, .56, .32, .035]] },
  closing: { name: '마무리', icon: [['t', .5, .45, .4, .09], ['s', .5, .6, .3, .04]] },
  blank: { name: '빈 슬라이드', icon: [] },
};
/* 레이아웃 글자 크기는 발표용 기준 (1080p에서 본문 약 48px) — 편집 중 직접 쓰는 글(TEXT_STYLES)과 따로 둠 */
const LAYOUT_FS = { cover: 120, section: 110, title: 76, body: 48, sub: 48, kicker: 44 };
const bulletsHTML = list => '<ul>' + (list || []).filter(Boolean).map(b => `<li>${esc(b)}</li>`).join('') + '</ul>';

/* 슬라이드 로컬 좌표(가운데 0,0 · 단위 px) → 월드. 회전·기울기·배율을 슬라이드에서 그대로 물려받음 */
function slidePut(f, u, v, props) {
  const { type = 'text', k = 1, ...rest } = props;   // type은 따로 빼야 함 (넘기면 객체 종류를 덮어씀)
  const off = mulV(objM(f), [u * f.s, v * f.s, 0]);
  return insertObj(makeObj(type, { ...rest, x: f.x + off[0], y: f.y + off[1], z: f.z + off[2], rot: f.rot, rx: f.rx, ry: f.ry, s: f.s * k }));
}
/* 글상자: 왼쪽 정렬 블록은 폭을 정해 왼쪽 끝(u0)에 맞추고, 가운데 정렬은 중심(u)에 */
function slideText(f, html, { u = 0, v = 0, w = 0, style = 'body', fs, fw, align = 'left', color = null }) {
  const W = doc.W;
  const props = { html, style, fs: fs || TEXT_STYLES[style].fs, fw: fw || TEXT_STYLES[style].fw, align, color };
  if (w) Object.assign(props, { auto: false, w: w * W });
  const cu = w && align === 'left' ? u * W + (w * W) / 2 : u * W;
  return slidePut(f, cu - W / 2, v * doc.H - doc.H / 2, props);
}
function applyLayout(f, key, c = {}) {
  const H = doc.H, W = doc.W, made = [];
  const T = (html, o) => html ? made.push(slideText(f, html, o)) : null;
  const shape = (u, v, w, h, props) => made.push(slidePut(f, u * W - W / 2, v * H - H / 2, { type: 'shape', w: w * W, h: h * H, ...props }));
  const head = (t) => T(esc(t || '제목'), { u: .08, v: .16, w: .84, style: 'title', fs: LAYOUT_FS.title });
  switch (key) {
    case 'title':
      T(esc(c.title || '발표 제목'), { u: .5, v: .42, style: 'title', fs: LAYOUT_FS.cover, align: 'center' });
      shape(.5, .55, .12, .012, { shape: 'rect', p: { r: .5 } });
      T(esc(c.sub || '부제목 · 발표자 · 날짜'), { u: .5, v: .64, style: 'sub', fs: LAYOUT_FS.sub, fw: 500, align: 'center' });
      break;
    case 'section':
      shape(.09, .5, .012, .3, { shape: 'rect', p: { r: .5 } });
      T(esc(c.kicker || '01'), { u: .14, v: .38, w: .5, style: 'sub', fs: LAYOUT_FS.kicker });
      T(esc(c.title || '섹션 제목'), { u: .14, v: .52, w: .76, style: 'title', fs: LAYOUT_FS.section });
      break;
    case 'bullets':
      head(c.title);
      T(bulletsHTML(c.bullets || ['첫 번째 요점', '두 번째 요점', '세 번째 요점']), { u: .08, v: .55, w: .84, fs: LAYOUT_FS.body });
      break;
    case 'two': {
      head(c.title);
      const col = (u, x) => T((x.head ? `<b>${esc(x.head)}</b>` : '') + bulletsHTML(x.bullets || ['요점', '요점']), { u, v: .56, w: .38, fs: LAYOUT_FS.body });
      col(.08, c.left || { head: '왼쪽', bullets: ['요점 1', '요점 2'] });
      col(.54, c.right || { head: '오른쪽', bullets: ['요점 1', '요점 2'] });
      break;
    }
    case 'imageText':
      head(c.title);
      shape(.28, .58, .4, .52, { shape: 'rect', p: { r: .04 }, fill: '#c9d0da', text: '이미지를 넣으세요<br>(이 상자를 지우고 이미지를 놓기)', fs: 30, color: '#5b6573' });
      T(bulletsHTML(c.bullets || ['설명 1', '설명 2']), { u: .54, v: .56, w: .38, fs: LAYOUT_FS.body });
      break;
    case 'closing':
      T(esc(c.title || '감사합니다'), { u: .5, v: .45, style: 'title', fs: LAYOUT_FS.cover, align: 'center' });
      T(esc(c.sub || '질문과 토론'), { u: .5, v: .6, style: 'sub', fs: LAYOUT_FS.sub, fw: 500, align: 'center' });
      break;
  }
  if (c.notes) f.notes = String(c.notes);
  return made;
}
function makeSlideFrame(pos, frameKind) {
  return insertObj(makeObj('frame', { rot: 0, rx: 0, ry: 0, z: 0, ...pos, frame: frameKind || doc.slideFrame || 'rect', slide: true, w: doc.W, h: doc.H }));
}

/* ── 덱 템플릿 ── */
const DECKS = {
  clean: { name: '깔끔한 비즈니스', desc: '흰 바탕 · 사각 프레임 · 가로로 이어지는 흐름', theme: 0, frame: 'rect', arrange: 'row' },
  dark: { name: '다크 테크', desc: '어두운 바탕 · 프레임 없이 · 격자 배치', theme: 3, frame: 'hidden', arrange: 'grid' },
  chalk: { name: '칠판 강의', desc: '칠판 테마 · 대괄호 프레임 · 가로 흐름', theme: 2, frame: 'bracket', arrange: 'row' },
  zoom: { name: '줌 스토리', desc: '표지를 가운데 크게, 나머지를 둘레에 — 확대·축소로 이동', theme: 1, frame: 'rect', arrange: 'radial' },
  stairs: { name: '3D 계단', desc: '깊이를 따라 비스듬히 내려가는 입체 배치', theme: 5, frame: 'rect', arrange: 'stairs' },
};
const DEMO_OUTLINE = [
  { layout: 'title', title: '발표 제목', sub: '부제목 · 발표자 · 날짜' },
  { layout: 'section', kicker: '01', title: '배경과 목표' },
  { layout: 'bullets', title: '핵심 내용', bullets: ['첫 번째 요점', '두 번째 요점', '세 번째 요점'] },
  { layout: 'two', title: '비교', left: { head: '기존 방식', bullets: ['특징 1', '특징 2'] }, right: { head: '새 방식', bullets: ['특징 1', '특징 2'] } },
  { layout: 'imageText', title: '사례', bullets: ['설명 1', '설명 2'] },
  { layout: 'closing', title: '감사합니다', sub: '질문과 토론' },
];
/* 배치: 슬라이드 i의 위치·배율·기울기 */
function arrangeSlides(kind, n) {
  const W = doc.W, H = doc.H, out = [];
  for (let i = 0; i < n; i++) {
    if (kind === 'grid') out.push({ x: (i % 3) * W * 1.15, y: Math.floor(i / 3) * H * 1.25, s: 1 });
    else if (kind === 'radial') {
      if (i === 0) { out.push({ x: 0, y: 0, s: 1.25 }); continue; }
      const a = -Math.PI / 2 + (i - 1) / Math.max(1, n - 1) * Math.PI * 2, R = W * 1.55;
      out.push({ x: Math.cos(a) * R, y: Math.sin(a) * R * .8, s: .62 });
    } else if (kind === 'stairs') out.push({ x: i * W * .95, y: i * H * .28, z: -i * W * .55, ry: -28, s: 1 });
    else out.push({ x: i * W * 1.15, y: 0, s: 1 });
  }
  return out;
}
/* 개요(outline)로 덱을 만듦. replace=true면 새 문서, 아니면 지금 문서 끝에 이어 붙임 */
function buildDeck(key, outline, opts = {}) {
  const T = DECKS[key] || DECKS.clean;
  if (editing) endEdit();
  if (opts.replace !== false) {
    const d = newDoc();
    d.theme = T.theme; d.title = opts.title || outline.find(c => c.layout === 'title')?.title || T.name;
    loadDoc(d);
  }
  doc.slideFrame = T.frame; doc.deck = key;
  const base = doc.path.length ? boundsOf(doc.objects) : null;
  const pos = arrangeSlides(T.arrange, outline.length);
  if (base) pos.forEach(p => { p.y += base.y + base.h / 2 + doc.H * 1.4; });   // 기존 내용 아래쪽에 이어서
  outline.forEach((c, i) => {
    const f = makeSlideFrame(pos[i], T.frame);
    applyLayout(f, LAYOUTS[c.layout] ? c.layout : 'bullets', c);
    doc.path.push(f.id);
  });
  if (T.arrange === 'radial' && outline.length > 1) {
    /* 줌 스토리: 전체를 감싸는 큰 원 프레임 (경로 밖, 장식) */
    const b = boundsOf(doc.objects), r = Math.max(b.w, b.h) * .62;
    insertObj(makeObj('frame', { x: b.x, y: b.y, z: 0, frame: 'circle', w: r * 2, h: r * 2, s: 1 }));
  }
  activeStep = 0;
  renderAll(); commit(); renderPathList(); fitAll(600);
  toast(`'${T.name}' 템플릿으로 슬라이드 ${outline.length}장을 만들었습니다`);
}

/* ── 미리보기 그림 (SVG) ── */
function layoutIcon(key, w = 64, h = 36) {
  const parts = (LAYOUTS[key] || LAYOUTS.blank).icon.map(([t, x, y, ww, hh, al]) => {
    const X = (al === 'l' || ['d', 'i', 'b'].includes(t) ? x : x - ww / 2) * w, Y = y * h - hh * h / 2;
    const fill = t === 't' ? 'currentColor' : t === 'i' ? '#c9d0da' : t === 'l' || t === 'b' ? 'var(--blue)' : 'rgba(120,128,140,.55)';
    return `<rect x="${X.toFixed(1)}" y="${(t === 'i' ? y * h : Y).toFixed(1)}" width="${(ww * w).toFixed(1)}" height="${(hh * h).toFixed(1)}" rx="${t === 'i' ? 2 : 1}" fill="${fill}"/>`;
  }).join('');
  return `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}"><rect x=".5" y=".5" width="${w - 1}" height="${h - 1}" rx="3" fill="#fff" stroke="rgba(0,0,0,.15)"/>${parts}</svg>`;
}
function deckPreviewSVG(key) {
  const T = DECKS[key], th = THEMES[T.theme], n = DEMO_OUTLINE.length, pos = arrangeSlides(T.arrange, n);
  const W = 1920, H = 1080;
  const pts = pos.map(p => ({ ...p, w: W * p.s, h: H * p.s }));
  const x0 = Math.min(...pts.map(p => p.x - p.w / 2)), x1 = Math.max(...pts.map(p => p.x + p.w / 2));
  const y0 = Math.min(...pts.map(p => p.y - p.h / 2)), y1 = Math.max(...pts.map(p => p.y + p.h / 2));
  const k = Math.min(220 / (x1 - x0), 110 / (y1 - y0)), ox = (240 - (x1 - x0) * k) / 2, oy = (130 - (y1 - y0) * k) / 2;
  const rects = pts.map((p, i) => {
    const x = ox + (p.x - p.w / 2 - x0) * k, y = oy + (p.y - p.h / 2 - y0) * k, w = p.w * k, h = p.h * k;
    const skew = p.ry ? ` transform="skewY(${p.ry * .25}) "` : '';
    const st = T.frame === 'hidden' ? 'none' : th.accent;
    return `<g${skew}><rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" rx="2" fill="${th.bg}" stroke="${st}" stroke-width="1.2" style="filter:drop-shadow(0 1px 1px rgba(0,0,0,.18))"/>`
      + `<rect x="${(x + w * .12).toFixed(1)}" y="${(y + h * .25).toFixed(1)}" width="${(w * (i ? .5 : .76)).toFixed(1)}" height="${Math.max(1.5, h * .1).toFixed(1)}" fill="${th.title}"/>`
      + `<rect x="${(x + w * .12).toFixed(1)}" y="${(y + h * .5).toFixed(1)}" width="${(w * .6).toFixed(1)}" height="${Math.max(1, h * .05).toFixed(1)}" fill="${th.body}" opacity=".6"/></g>`;
  }).join('');
  return `<svg viewBox="0 0 240 130" width="240" height="130"><rect width="240" height="130" rx="6" fill="${T.theme === 0 ? '#eef1f5' : th.bg}"/>${rects}</svg>`;
}
