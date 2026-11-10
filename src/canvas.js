const objStyleEl = document.createElement('style'); objStyleEl.textContent = OBJ_CSS; document.head.appendChild(objStyleEl);
/* canvas.js — 무한 캔버스 카메라, 변형 링, 경로 오버레이, 미니맵, 포인터 입력 */
const stage = $('#stage'), world = $('#world'), grid = $('#grid'), selbox = $('#selbox'), zebra = $('#zebra');
const pathSvg = $('#pathlayer'), band = $('#band'), readout = $('#readout'), mini = $('#minimap');
const MINZ = 0.002, MAXZ = 200;
let cam = { x: 0, y: 0, wz: 0, z: .4, r: 0, rx: 0, ry: 0 }, vw = 1, vh = 1, tween = null, zoomA = null, rafId = 0;
let sel = [], editing = null, pathMode = false, drag = null, spaceDown = false, activeStep = -1;
let lastDown = { t: 0, x: 0, y: 0 }, miniMap = null;

const elOf = o => world.querySelector(`[data-id="${o.id}"]`);
const selObjs = () => sel.map(getObj).filter(Boolean);
/* impress.js 공식 그대로: 화면 = 배율 × 원근(perspective/배율) × 카메라 회전(Z→Y→X) × 이동
   cam.z는 배율, cam.wz는 카메라가 보는 면의 Z 위치입니다 */
const persp = () => doc.perspective / cam.z;
const camM = () => euler(cam.rx, cam.ry, cam.r);
function w2s(x, y, z = 0) {
  const c = mulV(transM(camM()), [x - cam.x, y - cam.y, z - cam.wz]), d = persp();
  const f = d / Math.max(d - c[2], d * .001);
  return [vw / 2 + c[0] * f * cam.z, vh / 2 + c[1] * f * cam.z, c[2]];
}
/* 화면의 한 점을, 카메라 공간 깊이 cz의 면으로 되돌립니다 */
function rayAt(sx, sy, cz = 0) {
  const d = persp(), f = d / (d - cz);
  const v = mulV(camM(), [(sx - vw / 2) / cam.z / f, (sy - vh / 2) / cam.z / f, cz]);
  return [cam.x + v[0], cam.y + v[1], cam.wz + v[2]];
}
const s2w = (sx, sy) => rayAt(sx, sy, 0);
/* 화면의 한 점이 객체 평면과 만나는 곳 */
function rayPlane(sx, sy, o) {
  const A = rayAt(sx, sy, 0), B = rayAt(sx, sy, persp() * .5), n = mulV(objM(o), [0, 0, 1]);
  const dir = [B[0] - A[0], B[1] - A[1], B[2] - A[2]], dn = n[0] * dir[0] + n[1] * dir[1] + n[2] * dir[2];
  if (Math.abs(dn) < 1e-9) return A;
  const t = (n[0] * (o.x - A[0]) + n[1] * (o.y - A[1]) + n[2] * (o.z - A[2])) / dn;
  return [A[0] + dir[0] * t, A[1] + dir[1] * t, A[2] + dir[2] * t];
}
const pt = e => { const b = stage.getBoundingClientRect(); return [e.clientX - b.left, e.clientY - b.top]; };

/* ── 카메라 ── */
function applyCam() {
  world.style.transform = `translate(${vw / 2}px,${vh / 2}px) scale(${cam.z}) perspective(${persp()}px) rotateZ(${-cam.r}deg) rotateY(${-cam.ry}deg) rotateX(${-cam.rx}deg) translate3d(${-cam.x}px,${-cam.y}px,${-cam.wz}px)`;
  let step = 100;
  while (step * cam.z < 26) step *= 4;
  while (step * cam.z > 104) step /= 4;
  const [ox, oy] = w2s(0, 0), g = step * cam.z;
  grid.style.backgroundSize = `${g}px ${g}px`;
  grid.style.backgroundPosition = `${ox}px ${oy}px`;
  $('#zoom-label').textContent = (cam.z >= 10 ? Math.round(cam.z * 100) : Math.round(cam.z * 1000) / 10) + '%';
  const tilted = Math.abs(norm180(cam.rx)) > .05 || Math.abs(norm180(cam.ry)) > .05;
  grid.hidden = tilted;
  $('#rot-reset').hidden = !tilted && Math.abs(norm180(cam.r)) < .05;
  syncOverlay();
  drawMini();
}
function tick() {
  if (rafId) return;
  rafId = requestAnimationFrame(now => {
    rafId = 0;
    let again = false;
    if (tween) {
      const { from: f, to: t, t0, ms } = tween;
      const p = Math.min(1, (now - t0) / ms), e = p < .5 ? 4 * p ** 3 : 1 - (-2 * p + 2) ** 3 / 2;
      cam.z = Math.exp(Math.log(f.z) + (Math.log(t.z) - Math.log(f.z)) * e);
      // 확대 중심이 고정되도록 위치를 배율에 맞춰 보간
      const w = Math.abs(f.z / t.z - 1) > .01 ? (1 / cam.z - 1 / f.z) / (1 / t.z - 1 / f.z) : e;
      cam.x = f.x + (t.x - f.x) * w;
      cam.y = f.y + (t.y - f.y) * w;
      cam.wz = f.wz + (t.wz - f.wz) * w;
      cam.r = f.r + (t.r - f.r) * e;
      cam.rx = f.rx + (t.rx - f.rx) * e;
      cam.ry = f.ry + (t.ry - f.ry) * e;
      if (p < 1) again = true; else tween = null;
    }
    if (zoomA) {
      const d = Math.log(zoomA.z / cam.z);
      if (Math.abs(d) < .002) { cam.z = zoomA.z; } else { cam.z *= Math.exp(d * .3); again = true; }
      const [ax, ay, az] = s2w(zoomA.s[0], zoomA.s[1]);
      cam.x += zoomA.w[0] - ax; cam.y += zoomA.w[1] - ay; cam.wz += zoomA.w[2] - az;
      if (!again) zoomA = null;
    }
    applyCam();
    if (again) tick();
  });
}
function zoomAt(sx, sy, k) {
  tween = null;
  const z = Math.min(MAXZ, Math.max(MINZ, (zoomA ? zoomA.z : cam.z) * k));
  zoomA = { z, s: [sx, sy], w: s2w(sx, sy) };
  tick();
}
function flyTo(rg, ms = 900, pad = .92) {
  zoomA = null;
  const z = Math.min(MAXZ, Math.max(MINZ, Math.min(vw / rg.w, vh / rg.h) * pad));
  /* 화면 크기가 아직 0(숨은 창·막 열린 창)이거나 영역이 잘못되면 카메라를 건드리지 않음 — NaN이 문서에 번지는 것을 막음 */
  if (!(vw > 0 && vh > 0) || !Number.isFinite(z) || ![rg.x, rg.y].every(Number.isFinite)) return;
  const to = { x: rg.x, y: rg.y, wz: rg.z || 0, z, r: cam.r + norm180((rg.r || 0) - cam.r), rx: cam.rx + norm180((rg.rx || 0) - cam.rx), ry: cam.ry + norm180((rg.ry || 0) - cam.ry) };
  if (ms <= 0) { cam = to; tween = null; applyCam(); return; }
  tween = { from: { ...cam }, to, t0: performance.now(), ms };
  tick();
}
function fitAll(ms = 700) { flyTo(overviewRegion(), ms, 1); }

/* ── 객체 렌더링 ── */
function measure(o) {
  if (o.type !== 'text' && o.type !== 'table') return;
  const el = elOf(o);
  if (!el) return;
  if (o.type === 'table') { o.h = el.offsetHeight || o.h; return; }
  if (o.auto) o.w = el.offsetWidth;
  o.h = el.offsetHeight;
}
function renderAll() {
  document.documentElement.style.cssText = themeVars();
  stage.style.background = 'var(--c-bg)';
  /* 실행 중인 임베드 iframe은 DOM에서 빼면 다시 로딩되므로, 그 요소만 남겨 두고 나머지를 주변에 다시 끼움 */
  const keep = new Map($$('.o-embed', world).filter(el => el.querySelector('.emb-live')).map(el => [el.dataset.id, el]));
  if (!keep.size) world.innerHTML = doc.objects.map(o => objHTML(o)).join('');
  else {
    [...world.children].forEach(c => { if (!keep.has(c.dataset.id)) c.remove(); });
    const t = document.createElement('template');
    let cur = world.firstElementChild;
    doc.objects.forEach(o => {
      t.innerHTML = objHTML(o);
      const n = t.content.firstElementChild, k = o.type === 'embed' && keep.get(o.id);
      if (!k) { world.insertBefore(n, cur); return; }
      keep.delete(o.id);
      const on = k.classList.contains('emb-on');
      k.className = n.className; k.classList.toggle('emb-on', on);
      k.setAttribute('style', n.getAttribute('style') || '');
      const ph = k.querySelector('.emb-ph'), nph = n.querySelector('.emb-ph');
      if (ph && nph) ph.replaceWith(nph);
      if (k === cur) cur = cur.nextElementSibling; else world.insertBefore(k, cur);
    });
    keep.forEach(el => el.remove());
  }
  doc.objects.forEach(measure);
  syncLiveEmbeds();
  refreshConnectors();
  markSelection(); syncOverlay(); drawMini(); renderPathList(); renderLayers(); renderProps();
}
function renderObj(o) {
  const el = elOf(o);
  if (!el) return;
  el.style.cssText = objStyle(o);
  const live = o.type === 'embed' && el.querySelector('.emb-live'), ph = live && el.querySelector('.emb-ph');
  if (ph) { const t = document.createElement('template'); t.innerHTML = objInner(o, 'edit', editorSrc); ph.replaceWith(t.content.firstElementChild); }
  else { el.innerHTML = objInner(o, 'edit', editorSrc); if (o.type === 'embed') el._sig = undefined; }
  if (o.type === 'embed') liveEmbed(el, o);
  el.classList.toggle('locked', !!o.locked);
  el.classList.toggle('fxhid', !!o.fxHidden);
  measure(o);
  refreshConnectors([o.id]);   // 붙은 연결선(연결선 자신이면 자기 경로)도 다시 계산
}
const placeObj = o => { const el = elOf(o); if (el) el.style.transform = objTransform(o); };
function markSelection() { $$('.o', world).forEach(el => el.classList.toggle('sel', sel.includes(el.dataset.id))); }
function select(ids) { sel = ids.filter(getObj); markSelection(); syncOverlay(); renderProps(); markLayerSel(); }
/* 잠기거나 숨긴 객체는 캔버스에서 집히지 않습니다 (레이어 패널에서만 선택) */
const pickable = o => o && !o.locked && !o.hidden;
/* 손잡이·링 없이 테두리만 보이는 객체: 잠긴 것, 양 끝이 붙은 연결선 */
const fixedObj = o => o.locked || o.type === 'connector';

/* ── 연결선: 두 객체의 변 가운데 중 가장 가까운 쌍을 이어 경로를 만듭니다 ── */
function sidesOf(o) {
  const q = corners(o), c = [o.x, o.y];
  return [[q[0], q[1]], [q[1], q[2]], [q[2], q[3]], [q[3], q[0]]].map(([a, b]) => {
    const p = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], d = Math.hypot(p[0] - c[0], p[1] - c[1]) || 1;
    return { p, n: [(p[0] - c[0]) / d, (p[1] - c[1]) / d] };
  });
}
function layoutConnector(cn) {
  const A = getObj(cn.from), B = getObj(cn.to);
  if (!A || !B) return false;
  let best = null;
  sidesOf(A).forEach(a => sidesOf(B).forEach(b => {
    const d = Math.hypot(a.p[0] - b.p[0], a.p[1] - b.p[1]) - (a.n[0] * (b.p[0] - a.p[0]) + a.n[1] * (b.p[1] - a.p[1]) > 0 ? 1e-6 : 0);
    if (!best || d < best.d) best = { d, a, b };
  }));
  const p1 = best.a.p, p2 = best.b.p, n1 = best.a.n, n2 = best.b.n;
  const dist = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
  let pts, path;
  if (cn.route === 'curve') {
    const k = Math.max(dist * .4, 20), c1 = [p1[0] + n1[0] * k, p1[1] + n1[1] * k], c2 = [p2[0] + n2[0] * k, p2[1] + n2[1] * k];
    pts = [p1, c1, c2, p2]; path = P => `M${P(p1)}C${P(c1)} ${P(c2)} ${P(p2)}`;
  } else if (cn.route === 'elbow') {
    /* 나가는 변이 좌우면 가로→세로→가로, 위아래면 세로→가로→세로 */
    const horiz = Math.abs(n1[0]) >= Math.abs(n1[1]);
    const m = horiz ? [(p1[0] + p2[0]) / 2, p1[1]] : [p1[0], (p1[1] + p2[1]) / 2], m2 = horiz ? [m[0], p2[1]] : [p2[0], m[1]];
    pts = [p1, m, m2, p2]; path = P => `M${P(p1)}L${P(m)}L${P(m2)}L${P(p2)}`;
  } else { pts = [p1, p2]; path = P => `M${P(p1)}L${P(p2)}`; }
  const pad = cn.sw * 3 + 4;
  const x0 = Math.min(...pts.map(p => p[0])) - pad, y0 = Math.min(...pts.map(p => p[1])) - pad;
  const x1 = Math.max(...pts.map(p => p[0])) + pad, y1 = Math.max(...pts.map(p => p[1])) + pad;
  Object.assign(cn, { x: (x0 + x1) / 2, y: (y0 + y1) / 2, z: ((A.z || 0) + (B.z || 0)) / 2, w: x1 - x0, h: y1 - y0, s: 1, rot: 0, rx: 0, ry: 0 });
  cn.d = path(p => `${r2(p[0] - x0)},${r2(p[1] - y0)}`);
  return true;
}
/* 객체가 움직이면 거기 붙은 연결선을 다시 계산 (ids 없으면 전부) */
function refreshConnectors(ids) {
  const set = ids && new Set(ids);
  doc.objects.forEach(cn => {
    if (cn.type !== 'connector' || (set && !set.has(cn.from) && !set.has(cn.to) && !set.has(cn.id))) return;
    if (layoutConnector(cn)) { const el = elOf(cn); if (el) { el.style.cssText = objStyle(cn); el.innerHTML = objInner(cn, 'edit', editorSrc); } }
  });
}

/* ── 도구 모드: 연결선 잇기 · 펜 ── */
let toolMode = null, connFrom = null;
function setTool(mode) {
  if (pathMode) setPathMode(false);
  toolMode = toolMode === mode ? null : mode;
  connFrom = null;
  stage.classList.toggle('pen-on', toolMode === 'pen');
  stage.classList.toggle('connect-on', toolMode === 'connect');
  $('#btn-pen')?.classList.toggle('on', toolMode === 'pen');
  $('#btn-connect')?.classList.toggle('on', toolMode === 'connect');
  const hint = $('#mode-hint');
  hint.hidden = !toolMode;
  hint.textContent = toolMode === 'pen' ? '펜: 끌어서 그립니다 · 여러 번 그릴 수 있습니다 · Esc로 끝내기'
    : toolMode === 'connect' ? '연결선: 시작 객체를 누르고, 이어서 끝 객체를 누르세요 · Esc로 끝내기' : '';
  if (toolMode) select([]);
}
function connectClick(o) {
  if (o && o.type === 'connector') return;
  if (!o) { connFrom = null; select([]); $('#mode-hint').textContent = '연결선: 시작 객체를 누르고, 이어서 끝 객체를 누르세요 · Esc로 끝내기'; return; }
  if (!connFrom || connFrom === o.id) { connFrom = o.id; select([o.id]); $('#mode-hint').textContent = '이제 끝 객체를 누르세요 · Esc로 취소'; return; }
  const cn = makeObj('connector', { from: connFrom, to: o.id, route: doc.lastRoute || 'elbow' });
  doc.objects.push(cn);   // 맨 앞에 그려 객체에 가려지지 않게
  layoutConnector(cn);
  world.insertAdjacentHTML('beforeend', objHTML(cn));
  connFrom = null;
  $('#mode-hint').textContent = '연결했습니다 · 계속 잇거나 Esc로 끝내기';
  select([cn.id]); commit();
}
/* 펜: 화면 좌표 → 지금 보는 면 위의 점 → 그 면의 로컬 좌표. 점을 줄이고 부드럽게 이어 저장 */
function simplify(pts, eps) {
  if (pts.length < 3) return pts;
  let idx = 0, dmax = 0;
  const [a, b] = [pts[0], pts[pts.length - 1]];
  for (let i = 1; i < pts.length - 1; i++) { const d = segDist(pts[i][0], pts[i][1], a, b); if (d > dmax) { dmax = d; idx = i; } }
  if (dmax <= eps) return [a, b];
  return simplify(pts.slice(0, idx + 1), eps).slice(0, -1).concat(simplify(pts.slice(idx), eps));
}
function finishInk(screenPts) {
  if (screenPts.length < 2) return;
  const sp = simplify(screenPts, 1.2), M = transM(camM());
  const wp = sp.map(([x, y]) => rayAt(x, y, 0));
  const c = wp.reduce((a, p) => [a[0] + p[0] / wp.length, a[1] + p[1] / wp.length, a[2] + p[2] / wp.length], [0, 0, 0]);
  const lp = wp.map(p => mulV(M, [p[0] - c[0], p[1] - c[1], p[2] - c[2]]));
  const sw = (doc.penWidth || 5) / cam.z, pad = sw * 2;
  const x0 = Math.min(...lp.map(p => p[0])) - pad, y0 = Math.min(...lp.map(p => p[1])) - pad;
  const x1 = Math.max(...lp.map(p => p[0])) + pad, y1 = Math.max(...lp.map(p => p[1])) + pad;
  const P = p => `${r2(p[0] - x0)},${r2(p[1] - y0)}`, mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  let d = `M${P(lp[0])}`;
  if (lp.length === 2) d += `L${P(lp[1])}`;
  else { for (let i = 1; i < lp.length - 1; i++) d += `Q${P(lp[i])} ${P(mid(lp[i], lp[i + 1]))}`; d += `L${P(lp[lp.length - 1])}`; }
  /* 상자 가운데가 객체 위치: 로컬 상자 중심을 다시 월드로 */
  const off = mulV(camM(), [(x0 + x1) / 2, (y0 + y1) / 2, 0]);
  const o = makeObj('ink', { x: c[0] + off[0], y: c[1] + off[1], z: c[2] + off[2], rot: cam.r, rx: cam.rx, ry: cam.ry, s: 1, w: x1 - x0, h: y1 - y0, d, sw, stroke: doc.penColor || null });
  doc.objects.push(o);
  world.insertAdjacentHTML('beforeend', objHTML(o));
  commit();
}

/* ── 선택 상자·변형 링·경로 ── */
function selectionBox() {
  const list = selObjs();
  if (!list.length) return null;
  if (list.length === 1) { const o = list[0]; return { x: o.x, y: o.y, z: o.z, w: o.w, h: o.h, s: o.s, rot: o.rot, rx: o.rx, ry: o.ry }; }
  const b = boundsOf(list);
  return { x: b.x, y: b.y, z: b.z, w: b.w, h: b.h, s: 1, rot: 0, rx: 0, ry: 0 };
}
let selQuad = null;
function syncOverlay() {
  const b = selectionBox();
  const show = b && !editing && !pathMode;
  const locked = selObjs().some(fixedObj);   // 잠긴 객체·연결선은 테두리만 보이고 손잡이·링은 숨김
  selbox.hidden = !show || locked;
  zebra.toggleAttribute('hidden', !show || locked);   // SVG 요소에는 .hidden 속성이 없음
  selQuad = null;
  if (show) {
    const q = corners(b).map(p => w2s(p[0], p[1], p[2])), mid = (u, v) => [(u[0] + v[0]) / 2, (u[1] + v[1]) / 2];
    const pos = { nw: q[0], ne: q[1], se: q[2], sw: q[3], n: mid(q[0], q[1]), e: mid(q[1], q[2]), s: mid(q[2], q[3]), w: mid(q[3], q[0]) };
    $$('i', selbox).forEach(h => { const p = pos[h.dataset.h]; h.style.transform = `translate(${p[0]}px,${p[1]}px)`; });
    selQuad = q;
    const one = sel.length === 1 ? getObj(sel[0]) : null;
    selbox.dataset.t = one ? one.type : 'multi';
    const c = w2s(b.x, b.y, b.z);
    zebra.style.transform = `translate(${c[0]}px,${c[1]}px)`;
    zebra.classList.toggle('dim', !!drag && drag.kind === 'move');
    zebra.style.display = drag && drag.kind === 'resize' ? 'none' : '';
  }
  renderPathLayer();
}
function renderPathLayer() {
  const pts = doc.path.map(id => { const o = getObj(id); return o ? w2s(o.x, o.y, o.z) : null; }).filter(Boolean);
  let h = selQuad ? `<polygon class="sq" points="${selQuad.map(p => p[0] + ',' + p[1]).join(' ')}"/>` : '';
  if (doc.overview) {
    const r = doc.overview;
    const q = corners({ x: r.x, y: r.y, z: r.z || 0, w: r.w, h: r.h, s: 1, rot: r.r || 0, rx: r.rx || 0, ry: r.ry || 0 }).map(p => w2s(p[0], p[1], p[2]));
    h += `<polygon class="ov" points="${q.map(p => p[0] + ',' + p[1]).join(' ')}"/><text class="ovt" x="${q[0][0] + 6}" y="${q[0][1] - 7}">Overview</text>`;
  }
  if (pts.length > 1) h += `<polyline class="pl" points="${pts.map(p => p[0] + ',' + p[1]).join(' ')}"/>`;
  if (pathMode) for (let i = 0; i + 1 < pts.length; i++) {
    const mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2;
    h += `<g class="pm" data-pm="${i}" transform="translate(${mx},${my})"><circle r="9"/><path d="M-4 0H4M0-4V4"/></g>`;
  }
  pts.forEach((p, i) => { h += `<g class="pb${i === activeStep ? ' on' : ''}" data-pb="${i}" transform="translate(${p[0]},${p[1]})"><circle r="13"/><text y="4.5">${i + 1}</text></g>`; });
  if (drag && drag.kind === 'path' && drag.moved) h += `<circle class="pg" cx="${drag.cur[0]}" cy="${drag.cur[1]}" r="13"/>`;
  if (drag && drag.kind === 'ink') h += `<polyline class="inkp" points="${drag.pts.map(p => p.join(',')).join(' ')}" stroke-width="${doc.penWidth || 5}" style="stroke:${esc(doc.penColor || 'var(--c-title)')}"/>`;
  pathSvg.innerHTML = h;
}

function drawMini() {
  if (mini.parentElement.hidden) return;
  const dpr = devicePixelRatio || 1, W = mini.clientWidth, H = mini.clientHeight;
  if (mini.width !== W * dpr) { mini.width = W * dpr; mini.height = H * dpr; }
  const g = mini.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, W, H);
  const t = theme(), view = [s2w(0, 0), s2w(vw, 0), s2w(vw, vh), s2w(0, vh)];
  const base = boundsOf(doc.objects) || { x: 0, y: 0, w: 1000, h: 600 };
  const bw = Math.max(base.w, 1), bh = Math.max(base.h, 1), k = Math.min(W / bw, H / bh) * .86;
  miniMap = { cx: base.x, cy: base.y, k, W, H };
  const m = (x, y) => [W / 2 + (x - base.x) * k, H / 2 + (y - base.y) * k];
  const poly = pts => { g.beginPath(); pts.forEach((p, i) => { const [x, y] = m(p[0], p[1]); i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.closePath(); };
  doc.objects.forEach(o => {
    if (o.type === 'connector' || o.type === 'ink' || o.hidden) return;   // 선은 상자로 그리면 덩어리로 보여 생략
    poly(corners(o));
    if (o.type === 'frame') { if (o.frame === 'hidden') return; g.strokeStyle = t.accent; g.lineWidth = 1; g.stroke(); return; }
    g.fillStyle = o.type === 'text' ? t.title : o.type === 'image' ? '#8fa3b8' : o.type === 'video' ? '#334' : t.accent;
    g.globalAlpha = o.type === 'text' ? .55 : .7; g.fill(); g.globalAlpha = 1;
  });
  poly(view);
  g.fillStyle = 'rgba(47,111,237,.12)'; g.fill();
  g.strokeStyle = '#2f6fed'; g.lineWidth = 1.5; g.stroke();
}
function miniGoto(e) {
  if (!miniMap) return;
  const b = mini.getBoundingClientRect(), m = miniMap;
  tween = zoomA = null;
  cam.x = m.cx + (e.clientX - b.left - m.W / 2) / m.k;
  cam.y = m.cy + (e.clientY - b.top - m.H / 2) / m.k;
  applyCam();
}
mini.addEventListener('pointerdown', e => { mini.setPointerCapture(e.pointerId); miniGoto(e); e.stopPropagation(); });
mini.addEventListener('pointermove', e => { if (e.buttons) miniGoto(e); });

/* ── 집기(hit test) ── */
function segDist(px, py, a, b) {
  const vx = b[0] - a[0], vy = b[1] - a[1], t = Math.max(0, Math.min(1, ((px - a[0]) * vx + (py - a[1]) * vy) / (vx * vx + vy * vy || 1)));
  return Math.hypot(px - a[0] - vx * t, py - a[1] - vy * t);
}
function frameOutline(o) {
  if (o.frame !== 'circle') return corners(o).map(p => w2s(p[0], p[1], p[2]));
  const m = objM(o), out = [];
  for (let i = 0; i < 48; i++) {
    const a = i / 48 * Math.PI * 2, v = mulV(m, [Math.cos(a) * o.w * o.s / 2, Math.sin(a) * o.h * o.s / 2, 0]);
    out.push(w2s(o.x + v[0], o.y + v[1], o.z + v[2]));
  }
  return out;
}
function hitFrameBorder(sx, sy) {
  for (let i = doc.objects.length - 1; i >= 0; i--) {
    const o = doc.objects[i];
    if (o.type !== 'frame' || !pickable(o)) continue;
    const q = frameOutline(o);
    if (q.some((p, k) => segDist(sx, sy, p, q[(k + 1) % q.length]) <= 11)) return o;
  }
  return null;
}
/* 객체가 화면에 그려진 사각형 안의 점인지 */
function hitQuad(o, sx, sy) {
  const q = corners(o).map(p => w2s(p[0], p[1], p[2]));
  let inside = false;
  for (let i = 0, j = 3; i < 4; j = i++) {
    if ((q[i][1] > sy) !== (q[j][1] > sy) && sx < (q[j][0] - q[i][0]) * (sy - q[i][1]) / (q[j][1] - q[i][1]) + q[i][0]) inside = !inside;
  }
  return inside;
}
function pickObj(e, sx, sy) {
  const el = e.target.closest ? e.target.closest('#world .o') : null;
  return (el && getObj(el.dataset.id)) || hitFrameBorder(sx, sy);
}
/* 경로용: 일반 객체 → 프레임 테두리 → 점을 감싸는 가장 작은 프레임 */
function hitAny(sx, sy) {
  const b = stage.getBoundingClientRect();
  const el = document.elementsFromPoint(sx + b.left, sy + b.top).find(n => n.closest && n.closest('#world .o'));
  if (el) return getObj(el.closest('.o').dataset.id);
  const fb = hitFrameBorder(sx, sy);
  if (fb) return fb;
  return doc.objects.filter(o => o.type === 'frame' && pickable(o) && hitQuad(o, sx, sy)).sort((p, q) => p.w * p.h * p.s * p.s - q.w * q.h * q.s * q.s)[0] || null;
}

/* ── 변형: 이동·확대·회전을 하나의 식으로 ── */
function xformBegin(alt) {
  const ids = new Set(sel);
  if (!alt) selObjs().forEach(o => { if (o.type === 'frame') containedIn(o).forEach(c => ids.add(c.id)); });
  const b = selectionBox();
  const snap = o => ({ o, x: o.x, y: o.y, z: o.z, s: o.s, rot: o.rot, rx: o.rx, ry: o.ry, M: objM(o) });
  const items = [...ids].map(id => snap(getObj(id)));
  const p = sel.length === 1 ? items.find(i => i.o.id === sel[0]) : { o: { id: '_', rot: 0, rx: 0, ry: 0 }, rot: 0, rx: 0, ry: 0, M: euler(0, 0, 0) };
  return { c: [b.x, b.y, b.z], items, p };
}
/* dv: 이동, k: 배율, Rd: 중심 기준 회전 행렬. 프레임 안 내용도 같은 강체 변환을 받습니다 */
function xformApply(X, dv, k, Rd) {
  X.items.forEach(it => {
    let r = [it.x - X.c[0], it.y - X.c[1], it.z - X.c[2]];
    if (Rd) {
      r = mulV(Rd, r);
      [it.o.rx, it.o.ry, it.o.rot] = toEuler(mulM(Rd, it.M));
    }
    it.o.x = X.c[0] + r[0] * k + dv[0];
    it.o.y = X.c[1] + r[1] * k + dv[1];
    it.o.z = X.c[2] + r[2] * k + dv[2];
    it.o.s = it.s * k;
    placeObj(it.o);
  });
  refreshConnectors(X.items.map(it => it.o.id));
  syncOverlay(); drawMini(); fillGeom();
}
/* 기준 객체의 각도를 지정 → 그 차이만큼 전체를 회전 */
function xformEuler(X, rx, ry, rz) {
  xformApply(X, [0, 0, 0], 1, mulM(euler(rx, ry, rz), transM(X.p.M)));
  X.p.o.rx = norm180(rx); X.p.o.ry = norm180(ry); X.p.o.rot = norm180(rz);
  placeObj(X.p.o); syncOverlay(); fillGeom();
}
function showReadout(sx, sy, text) {
  readout.hidden = false; readout.textContent = text;
  readout.style.transform = `translate(${sx + 16}px,${sy - 30}px)`;
}

/* ── 제자리 글 편집: 글상자·도형 안 글·표 셀 ── */
const editableOf = o => o && (o.type === 'text' || o.type === 'table' || (o.type === 'shape' && o.shape !== 'line'));
const editEl = o => { const el = elOf(o); return el && (o.type === 'text' ? $('.txt', el) : $('[data-edit]', el)); };
function startEdit(o, selectAll, at) {
  const t = editEl(o);
  if (!t) return;
  editing = o;
  const el = elOf(o);
  el.classList.add('editing');
  t.contentEditable = 'true';
  t.focus({ preventScroll: true });   // 캔버스(overflow:hidden)가 몰래 스크롤되면 좌표가 어긋남
  let r = null;
  if (at && document.caretRangeFromPoint) {   // 더블클릭한 자리(표라면 그 칸)에 커서
    const c = document.caretRangeFromPoint(at[0], at[1]);
    if (c && t.contains(c.startContainer)) r = c;
  }
  if (!r) {
    r = document.createRange();
    const target = o.type === 'table' ? (t.querySelector('td,th') || t) : t;
    r.selectNodeContents(target);
    if (!selectAll) r.collapse(false);
  }
  const s = getSelection(); s.removeAllRanges(); s.addRange(r);
  syncOverlay(); renderProps();
}
function endEdit() {
  const o = editing;
  if (!o) return;
  editing = null;
  const el = elOf(o), t = editEl(o);
  el.classList.remove('editing');
  t.removeAttribute('contenteditable');
  getSelection().removeAllRanges();
  if (o.type === 'text' && !t.textContent.trim()) removeObjs([o.id]);
  else readEdited(o, t);
  syncOverlay(); renderProps(); commit();
}
/* 편집한 DOM 내용을 객체 데이터로 되돌림 (살균 포함) */
function readEdited(o, t) {
  const empty = !t.textContent.trim();
  if (o.type === 'text') { o.html = clean(t.innerHTML); measure(o); }
  else if (o.type === 'shape') { o.text = empty ? '' : clean(t.innerHTML); renderObj(o); }
  else if (o.type === 'table') {
    const read = [...t.rows].map(r => [...r.cells].map(c => c.textContent.trim() ? clean(c.innerHTML) : ''));
    const nc = Math.max(1, ...read.map(r => r.length));
    if (read.length) o.rows = read.map(r => r.concat(Array(nc - r.length).fill('')));
    renderObj(o);
  }
}
/* 표 편집 중 Tab·Shift+Tab으로 칸 이동 */
world.addEventListener('keydown', e => {
  if (!editing || editing.type !== 'table' || e.key !== 'Tab') return;
  e.preventDefault();
  const t = editEl(editing), cells = [...t.querySelectorAll('td,th')];
  const sel0 = getSelection().anchorNode, cur = sel0 && (sel0.nodeType === 1 ? sel0 : sel0.parentElement).closest('td,th');
  const next = cells[(cells.indexOf(cur) + (e.shiftKey ? -1 : 1) + cells.length) % cells.length];
  const r = document.createRange(); r.selectNodeContents(next);
  const s = getSelection(); s.removeAllRanges(); s.addRange(r);
});
world.addEventListener('input', () => {
  const o = editing;
  if (!o) return;
  if (o.type === 'table') { measure(o); syncOverlay(); return; }
  if (o.type !== 'text') return;
  const ow = o.w, oh = o.h;
  measure(o);
  const dw = (o.w - ow) * o.s, dh = (o.h - oh) * o.s;
  const ax = o.auto ? (o.align === 'left' ? dw / 2 : o.align === 'right' ? -dw / 2 : 0) : 0, ay = dh / 2;
  const v = mulV(objM(o), [ax, ay, 0]);
  o.x += v[0]; o.y += v[1]; o.z += v[2];
  placeObj(o);
});
world.addEventListener('paste', e => {
  if (!editing) return;
  e.preventDefault(); e.stopPropagation();
  document.execCommand('insertText', false, e.clipboardData.getData('text/plain'));
});

/* ── 포인터 입력 ── */
function onDouble(sx, sy, e) {
  const cur = selObjs().find(o => o.type !== 'frame' && pickable(o) && hitQuad(o, sx, sy));
  const o = cur || pickObj(e, sx, sy);
  if (o) {
    select([o.id]);
    if (editableOf(o) && pickable(o)) { const b = stage.getBoundingClientRect(); startEdit(o, false, [sx + b.left, sy + b.top]); }
    else flyTo(regionOf(o));
    return true;
  }
  if (e.target.closest('[data-z],[data-h]')) return false;
  addText(s2w(sx, sy));
  return true;
}
stage.addEventListener('pointerdown', e => {
  if (e.target.closest('.ui')) return;
  closeMenus();
  if (editing) {
    if (e.target.closest('[contenteditable]')) return;
    endEdit();
  }
  tween = zoomA = null;
  const [sx, sy] = pt(e), now = performance.now();
  const dbl = now - lastDown.t < 360 && Math.hypot(sx - lastDown.x, sy - lastDown.y) < 7;
  lastDown = { t: now, x: sx, y: sy };
  if (dbl && e.button === 0 && !spaceDown && !pathMode && !toolMode) { lastDown.t = 0; if (onDouble(sx, sy, e)) return; }

  stage.setPointerCapture(e.pointerId);
  const base = { sx, sy, cam: { ...cam }, moved: false };
  const t = e.target;
  if (e.button === 2) { drag = { ...base, kind: 'orbit' }; return; }
  if (spaceDown || e.button === 1) { drag = { ...base, kind: 'pan', silent: true }; stage.classList.add('panning'); return; }
  if (toolMode === 'pen') { drag = { ...base, kind: 'ink', pts: [[sx, sy]] }; return; }
  if (toolMode === 'connect') { drag = { ...base, kind: 'pan', connClick: hitAny(sx, sy) || 'none' }; return; }

  const pb = t.closest('[data-pb]'), pm = t.closest('[data-pm]');
  if (pb || pm) { drag = { ...base, kind: 'path', index: +(pb || pm).dataset[pb ? 'pb' : 'pm'], insert: !!pm, cur: [sx, sy] }; return; }

  const h = t.closest('[data-h]');
  if (h) {
    const o = getObj(sel[0]), [dx, dy] = { nw: [-1, -1], n: [0, -1], ne: [1, -1], e: [1, 0], se: [1, 1], s: [0, 1], sw: [-1, 1], w: [-1, 0] }[h.dataset.h];
    const M = objM(o), v = mulV(M, [-dx * o.w * o.s / 2, -dy * o.h * o.s / 2, 0]);
    drag = { ...base, kind: 'resize', o, dx, dy, M, anchor: [o.x + v[0], o.y + v[1], o.z + v[2]], w: o.w * o.s, h: o.h * o.s };
    syncOverlay();
    return;
  }
  const z = t.closest('[data-z]');
  if (z) {
    const b = selectionBox(), [cx, cy, cz] = w2s(b.x, b.y, b.z), zk = z.dataset.z;
    const kind = { move: 'move', scale: 'scale', rotate: 'rotate' }[zk] || 'tilt';
    drag = { ...base, kind, axis: zk, X: xformBegin(e.altKey), cz, cs: [cx, cy], d0: Math.hypot(sx - cx, sy - cy), a0: Math.atan2(sy - cy, sx - cx) };
    return;
  }
  if (pathMode) { drag = { ...base, kind: 'pan', pathClick: hitAny(sx, sy) }; return; }

  const o = pickObj(e, sx, sy);
  if (o) {
    if (e.shiftKey) select(sel.includes(o.id) ? sel.filter(i => i !== o.id) : [...sel, o.id]);
    else if (!sel.includes(o.id)) select([o.id]);
    if (sel.length) { const b = selectionBox(); drag = { ...base, kind: 'move', X: xformBegin(e.altKey), cz: w2s(b.x, b.y, b.z)[2] }; }
    return;
  }
  if (e.shiftKey) { drag = { ...base, kind: 'band' }; band.hidden = false; return; }
  if (e.altKey) { drag = { ...base, kind: 'orbit' }; return; }
  drag = { ...base, kind: 'pan', deselect: true };
});

stage.addEventListener('pointermove', e => {
  const [sx, sy] = pt(e);
  if (!drag) {
    const onFrame = !spaceDown && (e.target === grid || e.target === stage || e.target === world);
    stage.classList.toggle('over-frame', onFrame && !!hitFrameBorder(sx, sy));
    return;
  }
  if (!drag.moved && Math.hypot(sx - drag.sx, sy - drag.sy) < 3) return;
  drag.moved = true;
  const d = drag;
  if (d.kind === 'ink') { d.pts.push([sx, sy]); renderPathLayer(); return; }
  if (d.kind === 'pan') {
    stage.classList.add('panning');
    const v = mulV(euler(d.cam.rx, d.cam.ry, d.cam.r), [(sx - d.sx) / d.cam.z, (sy - d.sy) / d.cam.z, 0]);
    cam.x = d.cam.x - v[0]; cam.y = d.cam.y - v[1]; cam.wz = d.cam.wz - v[2];
    tick();
  } else if (d.kind === 'orbit') {
    stage.classList.add('panning');
    cam.ry = d.cam.ry - (sx - d.sx) * .3;
    cam.rx = d.cam.rx + (sy - d.sy) * .3;
    showReadout(sx, sy, `X ${norm180(cam.rx).toFixed(0)}°  Y ${norm180(cam.ry).toFixed(0)}°`);
    tick();
  } else if (d.kind === 'move') {
    const p = rayAt(sx, sy, d.cz), q = rayAt(d.sx, d.sy, d.cz);
    xformApply(d.X, [p[0] - q[0], p[1] - q[1], p[2] - q[2]], 1, null);
  } else if (d.kind === 'scale') {
    const k = Math.max(.02, Math.hypot(sx - d.cs[0], sy - d.cs[1]) / Math.max(d.d0, 1));
    xformApply(d.X, [0, 0, 0], k, null);
    showReadout(sx, sy, '× ' + k.toFixed(2));
  } else if (d.kind === 'rotate') {
    let da = (Math.atan2(sy - d.cs[1], sx - d.cs[0]) - d.a0) / RAD;
    const p = d.X.p;
    if (e.shiftKey) da = Math.round((p.rot + da) / 15) * 15 - p.rot;
    else { const nearest = Math.round((p.rot + da) / 90) * 90; if (Math.abs(p.rot + da - nearest) < 1.6) da = nearest - p.rot; }
    xformEuler(d.X, p.rx, p.ry, p.rot + da);
    showReadout(sx, sy, norm180(p.rot + da).toFixed(1).replace(/\.0$/, '') + '°');
  } else if (d.kind === 'tilt') {
    const p = d.X.p;
    if (d.axis === 'tz') {
      const dz = -(sy - d.sy) * 3 / cam.z;
      xformApply(d.X, [0, 0, dz], 1, null);
      showReadout(sx, sy, 'Z ' + Math.round(p.o.z ?? d.X.c[2] + dz));
    } else {
      const base = d.axis === 'tx' ? p.rx : p.ry, raw = base + (d.axis === 'tx' ? sy - d.sy : sx - d.sx) * .5;
      const val = e.shiftKey ? Math.round(raw / 15) * 15 : Math.abs(raw) < 1.5 ? 0 : raw;
      if (d.axis === 'tx') xformEuler(d.X, val, p.ry, p.rot); else xformEuler(d.X, p.rx, val, p.rot);
      showReadout(sx, sy, (d.axis === 'tx' ? 'X ' : 'Y ') + val.toFixed(0) + '°');
    }
  } else if (d.kind === 'resize') {
    resizeDrag(d, rayPlane(sx, sy, d.o), e.shiftKey);
  } else if (d.kind === 'band') {
    const x = Math.min(sx, d.sx), y = Math.min(sy, d.sy);
    band.style.cssText = `transform:translate(${x}px,${y}px);width:${Math.abs(sx - d.sx)}px;height:${Math.abs(sy - d.sy)}px`;
  } else if (d.kind === 'path') { d.cur = [sx, sy]; renderPathLayer(); }
});

function resizeDrag(d, P, shift) {
  const o = d.o;
  const [lx, ly] = mulV(transM(d.M), [P[0] - d.anchor[0], P[1] - d.anchor[1], P[2] - d.anchor[2]]);
  let w = d.dx ? Math.max(8 / cam.z, Math.abs(lx)) : d.w, h = d.dy ? Math.max(8 / cam.z, Math.abs(ly)) : d.h;
  const scaled = o.type === 'image' || o.type === 'ink';   // 비율 유지하며 배율(s)만 바꾸는 객체
  const keep = scaled || (o.type === 'text' && d.dx && d.dy) || (shift && d.dx && d.dy);
  if (keep) { const k = Math.max(w / d.w, h / d.h); w = d.w * k; h = d.h * k; }
  if (o.type === 'text') {
    if (d.dx && d.dy) o.s *= w / (o.w * o.s);
    else { o.auto = false; o.w = w / o.s; }
    renderObj(o);
    h = o.h * o.s; w = o.w * o.s;
  } else if (scaled) {
    o.s *= w / (o.w * o.s);
  } else {
    o.w = w / o.s; o.h = h / o.s;
    renderObj(o);
  }
  const v = mulV(d.M, [d.dx * w / 2, d.dy * h / 2, 0]);
  o.x = d.anchor[0] + v[0]; o.y = d.anchor[1] + v[1]; o.z = d.anchor[2] + v[2];
  placeObj(o);
  refreshConnectors([o.id]);
  syncOverlay(); drawMini(); fillGeom();
}

function endDrag(e) {
  const d = drag;
  if (!d) return;
  drag = null;
  stage.classList.remove('panning');
  readout.hidden = true;
  const [sx, sy] = pt(e);
  if (d.kind === 'ink') { finishInk(d.pts); renderPathLayer(); }
  else if (d.kind === 'pan') {
    if (!d.moved && d.connClick) connectClick(d.connClick === 'none' ? null : d.connClick);
    else if (!d.moved && d.pathClick) addToPath(d.pathClick.id);
    else if (!d.moved && d.deselect) select([]);
  } else if (d.kind === 'band') {
    band.hidden = true;
    const a = Math.min(sx, d.sx), b = Math.max(sx, d.sx), c = Math.min(sy, d.sy), f = Math.max(sy, d.sy);
    select(doc.objects.filter(o => { if (!pickable(o)) return false; const [x, y] = w2s(o.x, o.y, o.z); return x >= a && x <= b && y >= c && y <= f; }).map(o => o.id));
  } else if (d.kind === 'path') {
    const list = doc.path.filter(id => getObj(id));
    if (!d.moved) { if (!d.insert) { activeStep = d.index; flyTo(regionOf(getObj(list[d.index]))); renderPathList(); } }
    else {
      const o = hitAny(sx, sy);
      if (d.insert) { if (o) doc.path.splice(d.index + 1, 0, o.id); }
      else if (o) doc.path[d.index] = o.id;
      else doc.path.splice(d.index, 1);
      commit();
    }
  } else if (d.moved) { commit(); }
  syncOverlay(); fillGeom();
}
stage.addEventListener('pointerup', endDrag);
stage.addEventListener('pointercancel', endDrag);
stage.addEventListener('contextmenu', e => e.preventDefault());

stage.addEventListener('wheel', e => {
  if (e.target.closest('.ui')) return;
  e.preventDefault();
  const unit = e.deltaMode === 1 ? 30 : 1;
  if (!e.ctrlKey && Math.abs(e.deltaX) > Math.abs(e.deltaY)) {   // 트랙패드 가로 스크롤 = 이동
    tween = zoomA = null;
    const v = mulV(camM(), [e.deltaX * unit / cam.z, 0, 0]);
    cam.x += v[0]; cam.y += v[1]; cam.wz += v[2];
    tick();
    return;
  }
  const [sx, sy] = pt(e);
  zoomAt(sx, sy, Math.exp(-e.deltaY * unit * (e.ctrlKey ? .009 : .0016)));
}, { passive: false });

new ResizeObserver(() => {
  const first = !(vw > 0 && vh > 0);
  vw = stage.clientWidth; vh = stage.clientHeight;
  if (![cam.x, cam.y, cam.z].every(Number.isFinite) || cam.z <= 0) cam = { x: 0, y: 0, wz: 0, z: 1, r: 0, rx: 0, ry: 0 };
  applyCam();
  if (first && vw > 0 && vh > 0) fitAll(0);   // 크기 0으로 시작했다면 보이게 된 순간 전체 보기
}).observe(stage);
stage.addEventListener('scroll', () => { stage.scrollTop = 0; stage.scrollLeft = 0; });
