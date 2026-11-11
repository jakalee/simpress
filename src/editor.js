/* editor.js — 명령, 왼쪽 경로 목록, 오른쪽 속성 패널, 실행 취소, 자동 저장, 시작 */
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 2200);
}
const closeMenus = () => $$('details.dd[open]').forEach(d => d.open = false);
document.addEventListener('pointerdown', e => { if (!e.target.closest('details.dd')) closeMenus(); });

/* ── 대화상자 ── */
function ask({ title, msg = '', input = null, ok = '확인', value = '' }) {
  const d = $('#dlg');
  $('#dlg-title').textContent = title; $('#dlg-msg').textContent = msg; $('#dlg-ok').textContent = ok;
  const f = $('#dlg-input');
  f.hidden = input === null; f.value = value; f.placeholder = input || '';
  d.showModal();
  if (input !== null) f.select();
  return new Promise(res => {
    d.addEventListener('close', () => res(d.returnValue === 'ok' ? (input === null ? true : f.value.trim()) : null), { once: true });
  });
}

/* ── 실행 취소 ── */
let hist = [], hi = -1, saveTimer = 0, thumbTimer = 0;
function snapshot() { const { assets, ...rest } = doc; return JSON.stringify(rest); }
function commit() {
  const s = snapshot();
  if (hist[hi] === s) return;
  hist = hist.slice(0, hi + 1); hist.push(s);
  if (hist.length > 200) hist.shift();
  hi = hist.length - 1;
  changed();
  checkSnaps();   // 설정이 바뀐 3D 모델은 스냅샷을 다시 그림
}
function changed() {
  $('#btn-undo').disabled = hi <= 0; $('#btn-redo').disabled = hi >= hist.length - 1;
  clearTimeout(thumbTimer); thumbTimer = setTimeout(() => { renderPathList(); renderLayers(); }, 160);
  clearTimeout(saveTimer); saveTimer = setTimeout(autosave, 700);
  $('#save-state').textContent = '저장 중…';
  drawMini();
}
function restore(i) {
  if (i < 0 || i >= hist.length) return;
  hi = i;
  const a = doc.assets;
  doc = JSON.parse(hist[hi]); doc.assets = a;
  sel = sel.filter(id => getObj(id));
  $('#doc-title').value = doc.title;
  renderAll(); changed();
}
function resetHistory() { hist = [snapshot()]; hi = 0; $('#btn-undo').disabled = $('#btn-redo').disabled = true; }

/* ── 자동 저장 (IndexedDB: 이미지가 커도 localStorage 한도에 걸리지 않음) ── */
let dbP = null;
function db() {
  dbP = dbP || new Promise((res, rej) => {
    const r = indexedDB.open('zoom-canvas', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('docs');
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  });
  return dbP;
}
async function autosave() {
  try {
    const d = await db();
    await new Promise((res, rej) => {
      const tx = d.transaction('docs', 'readwrite');
      tx.objectStore('docs').put({ ...doc, assets: usedAssets() }, 'current');
      tx.oncomplete = res; tx.onerror = () => rej(tx.error);
    });
    $('#save-state').textContent = '자동 저장됨';
  } catch (err) { $('#save-state').textContent = '자동 저장 실패 — JSON으로 저장하세요'; console.warn(err); }
}
async function loadSaved() {
  try {
    const d = await db();
    return await new Promise(res => {
      const q = d.transaction('docs').objectStore('docs').get('current');
      q.onsuccess = () => res(q.result || null); q.onerror = () => res(null);
    });
  } catch { return null; }
}

/* ── 자산 ── */
function dataToBlobURL(data) {
  const [head, body] = data.split(',');
  const bin = atob(body), arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return URL.createObjectURL(new Blob([arr], { type: head.slice(5).split(';')[0] }));
}
const readData = file => new Promise((res, rej) => {
  const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file);
});
async function addAsset(file) {
  const id = 'a' + uid();
  doc.assets[id] = await readData(file);
  assetURL[id] = URL.createObjectURL(file);
  return id;
}
function loadDoc(d) {
  doc = d;
  doc.perspective = doc.perspective || 1000;
  doc.objects.forEach(o => { o.z = o.z || 0; o.rx = o.rx || 0; o.ry = o.ry || 0; });
  Object.entries(doc.assets).forEach(([id, data]) => { if (!assetURL[id]) assetURL[id] = dataToBlobURL(data); });
  sel = []; activeStep = -1;
  $('#doc-title').value = doc.title;
  renderAll(); resetHistory(); requestAnimationFrame(() => fitAll(0));
}

/* ── 객체 추가 ── */
const viewCenter = () => s2w(vw / 2, vh / 2);
/* 새 객체는 지금 보는 면에 놓입니다: 기울어진 프레임 안에서 추가해도 그 면에 맞습니다 */
const onView = ([x, y, z]) => ({ x, y, z, rot: cam.r, rx: cam.rx, ry: cam.ry });
function insertObj(o) {
  /* 마지막 방어선: 위치·크기가 숫자가 아니면 문서(자동 저장)에 NaN이 남지 않도록 바로잡음 */
  ['x', 'y', 'z', 'rot', 'rx', 'ry'].forEach(k => { if (!Number.isFinite(o[k])) o[k] = 0; });
  if (!(o.s > 0 && Number.isFinite(o.s))) o.s = 1;
  if (o.type === 'frame') {
    const i = doc.objects.findIndex(x => x.type !== 'frame');
    doc.objects.splice(i < 0 ? doc.objects.length : i, 0, o);
    const el = document.createElement('template');
    el.innerHTML = objHTML(o);
    const next = doc.objects[doc.objects.indexOf(o) + 1];
    world.insertBefore(el.content.firstChild, next ? elOf(next) : null);
  } else {
    doc.objects.push(o);
    world.insertAdjacentHTML('beforeend', objHTML(o));
  }
  measure(o);
  if (o.type === 'embed') { const el = elOf(o); if (el) liveEmbed(el, o); }
  return o;
}
function addText(p, style = 'body') {
  const ts = TEXT_STYLES[style];
  const o = insertObj(makeObj('text', { ...onView(p || viewCenter()), s: 1 / cam.z * (style === 'body' ? 1 : .55), style, fs: ts.fs, fw: ts.fw }));
  select([o.id]); startEdit(o, true);
}
function addFrame(kind) {
  const ww = vw / cam.z * .62, w = doc.W * .6, h = kind === 'circle' ? w : doc.H * .6;
  const o = insertObj(makeObj('frame', { ...onView(viewCenter()), frame: kind, w, h, s: ww / w * (kind === 'circle' ? .6 : 1) }));
  doc.path.push(o.id); activeStep = doc.path.length - 1;
  select([o.id]); commit(); renderPathList();
  toast('프레임을 추가하고 경로 끝에 연결했습니다');
}
function addShape(key) {
  const pr = SHAPE_PRESET[key] || { shape: key, p: {}, size: [240, 240] };
  const o = insertObj(makeObj('shape', { ...onView(viewCenter()), shape: pr.shape, p: { ...pr.p }, w: pr.size[0], h: pr.size[1], s: 1 / cam.z, sw: pr.shape === 'line' ? 8 : 0 }));
  select([o.id]); commit();
}
function addTable() {
  const w = 1000;
  const o = insertObj(makeObj('table', { ...onView(viewCenter()), w, h: 300, s: vw * .5 / w / cam.z }));
  select([o.id]); commit();
  toast('표를 넣었습니다 · 더블클릭해서 칸을 채우고 Tab으로 다음 칸');
}
function addChart(kind = 'bar') {
  const w = 1200, h = 720;
  const o = insertObj(makeObj('chart', { ...onView(viewCenter()), kind, w, h, s: vw * .5 / w / cam.z }));
  select([o.id]); commit();
  toast('차트를 넣었습니다 · 오른쪽 데이터 칸에 엑셀 범위를 그대로 붙여넣을 수 있습니다');
}
/* 표 행·열 추가/삭제 (마지막 행·열 기준) */
function tableResize(dr, dc) {
  if (editing) endEdit();
  selObjs().filter(o => o.type === 'table').forEach(o => {
    const nc = o.rows[0].length;
    if (dr > 0) o.rows.push(Array(nc).fill(''));
    if (dr < 0 && o.rows.length > 1) o.rows.pop();
    if (dc > 0) o.rows.forEach(r => r.push(''));
    if (dc < 0 && nc > 1) o.rows.forEach(r => r.pop());
    if (dr < 0) o.h = 0;   // 줄이면 높이를 내용에 다시 맞춤
    renderObj(o);
  });
  commit(); syncOverlay(); renderProps();
}
function imageSize(url) {
  return new Promise(res => { const i = new Image(); i.onload = () => res([i.naturalWidth || 800, i.naturalHeight || 600]); i.onerror = () => res([800, 600]); i.src = url; });
}
async function addImages(files, at) {
  files = files.filter(f => /^image\//.test(f.type));
  if (!files.length) return;
  if (files.length === 1) {
    const id = await addAsset(files[0]), [w, h] = await imageSize(assetURL[id]);
    const s = Math.min(vw * .5 / w, vh * .5 / h) / cam.z;
    const o = insertObj(makeObj('image', { ...onView(at || viewCenter()), asset: id, w, h, s }));
    select([o.id]); commit();
    return;
  }
  /* 여러 장(PPT에서 내보낸 슬라이드 이미지 등)은 격자로 놓고 순서대로 경로에 연결 */
  const sorted = [...files].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  const cols = Math.ceil(Math.sqrt(sorted.length)), [cx, cy, cz] = at || viewCenter();
  const cw = doc.W * 1.08, ch = doc.H * 1.08, rows = Math.ceil(sorted.length / cols), ids = [];
  for (let i = 0; i < sorted.length; i++) {
    const id = await addAsset(sorted[i]), [w, h] = await imageSize(assetURL[id]);
    const s = Math.min(doc.W / w, doc.H / h);
    const o = insertObj(makeObj('image', {
      asset: id, w, h, s, z: cz,
      x: cx + (i % cols - (cols - 1) / 2) * cw,
      y: cy + (Math.floor(i / cols) - (rows - 1) / 2) * ch,
    }));
    doc.path.push(o.id); ids.push(o.id);
  }
  select(ids); commit(); renderPathList(); fitAll();
  toast(`이미지 ${sorted.length}장을 격자로 놓고 경로에 연결했습니다`);
}
function addVideoObj(props) {
  const o = insertObj(makeObj('video', { ...slideFill(1280), ...props }));
  select([o.id]); commit();
}
/* 기준 슬라이드: 선택한 프레임, 아니면 화면 가운데에 걸린 가장 작은(안쪽) 프레임 */
function targetFrame(sx = vw / 2, sy = vh / 2) {
  const s = selObjs().find(o => o.type === 'frame');
  if (s) return s;
  return doc.objects.filter(o => o.type === 'frame' && !o.hidden && hitQuad(o, sx, sy))
    .sort((a, b) => a.w * a.h * a.s * a.s - b.w * b.h * b.s * b.s)[0] || null;
}
/* 새 객체를 슬라이드와 같은 비율·크기로 (화면 꽉 차게). w0 = 내용이 그려질 기준 가로 픽셀 */
function slideFill(w0) {
  const f = targetFrame();
  if (f) return { x: f.x, y: f.y, z: f.z, rot: f.rot, rx: f.rx, ry: f.ry, w: w0, h: Math.round(w0 * f.h / f.w), s: f.w * f.s / w0 };
  const h0 = Math.round(w0 * doc.H / doc.W);
  return { ...onView(viewCenter()), w: w0, h: h0, s: Math.min(vw * .8 / w0, vh * .8 / h0) / cam.z };
}
/* 선택한 객체를 자기가 놓인 슬라이드(없으면 화면 가운데 슬라이드)에 꽉 채움.
   그림은 비율 유지(안에 맞춤), 임베드·영상·3D·도형은 슬라이드 비율로 바꿔 채움 */
const FILLABLE = ['embed', 'video', 'model', 'image', 'shape', 'chart'];
function fillSlide() {
  const list = selObjs().filter(o => FILLABLE.includes(o.type) && !o.locked);
  if (!list.length) { toast('채울 객체(임베드·영상·3D·그림·도형·차트)를 고르세요'); return; }
  let done = 0;
  list.forEach(o => {
    const f = doc.objects.filter(x => x.type === 'frame' && x !== o && containsPoint(x, o.x, o.y, o.z))
      .sort((a, b) => a.w * a.h * a.s * a.s - b.w * b.h * b.s * b.s)[0] || targetFrame();
    if (!f) return;
    const FW = f.w * f.s, FH = f.h * f.s;
    Object.assign(o, { x: f.x, y: f.y, z: f.z, rot: f.rot, rx: f.rx, ry: f.ry });
    if (o.type === 'image') o.s = Math.min(FW / o.w, FH / o.h);
    else { o.h = Math.round(o.w * FH / FW); o.s = FW / o.w; }
    renderObj(o); done++;
  });
  if (!done) { toast('채울 슬라이드를 찾지 못했습니다. 슬라이드를 화면 가운데에 두세요'); return; }
  syncOverlay(); renderProps(); commit();
}
const ytId = u => (/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/))([\w-]{6,})/.exec(u) || [])[1];

function removeObjs(ids) {
  /* 지우는 객체에 붙은 연결선도 함께 지움 */
  ids = [...ids, ...doc.objects.filter(o => o.type === 'connector' && (ids.includes(o.from) || ids.includes(o.to))).map(o => o.id)];
  doc.objects = doc.objects.filter(o => !ids.includes(o.id));
  doc.path = doc.path.filter(id => !ids.includes(id));
  ids.forEach(id => world.querySelector(`[data-id="${id}"]`)?.remove());
  sel = sel.filter(id => !ids.includes(id));
  renderPathList();
}
function cloneObjs(list, dx, dy, dz = 0) {
  /* 연결선은 양 끝이 함께 복제될 때만 복제하고, 새 객체끼리 잇도록 id를 바꿉니다 */
  const ids = new Set(list.map(o => o.id));
  list = list.filter(o => o.type !== 'connector' || (ids.has(o.from) && ids.has(o.to)));
  const idMap = {};
  const map = list.map(o => { const c = { ...JSON.parse(JSON.stringify(o)), id: uid(), x: o.x + dx, y: o.y + dy, z: o.z + dz }; idMap[o.id] = c.id; return c; });
  map.forEach(c => { if (c.type === 'connector') { c.from = idMap[c.from]; c.to = idMap[c.to]; } });
  map.forEach(insertObj);
  refreshConnectors(map.map(c => c.id));
  return map.map(o => o.id);
}
function expandedSel() {
  const ids = new Set(sel);
  selObjs().forEach(o => { if (o.type === 'frame') containedIn(o).forEach(c => ids.add(c.id)); });
  /* 함께 고른 객체끼리 잇는 연결선도 따라감 */
  doc.objects.forEach(c => { if (c.type === 'connector' && ids.has(c.from) && ids.has(c.to)) ids.add(c.id); });
  return [...ids].map(getObj);
}
function addToPath(id) {
  if (doc.path[doc.path.length - 1] === id) return;
  doc.path.push(id); activeStep = doc.path.length - 1;
  commit(); renderPathList(); syncOverlay(); renderProps();
}
function setPathMode(on) {
  if (on && toolMode) setTool(toolMode);
  pathMode = on;
  stage.classList.toggle('path-on', on);
  $('#btn-path').classList.toggle('on', on);
  $('#path-hint').hidden = !on;
  syncOverlay();
}
function reorderZ(dir) {
  const ids = new Set(sel), rest = doc.objects.filter(o => !ids.has(o.id)), chosen = doc.objects.filter(o => ids.has(o.id));
  doc.objects = dir > 0 ? [...rest, ...chosen] : [...chosen, ...rest];
  renderAll(); commit();
}
function goStep(i) {
  const list = doc.path.filter(getObj);
  if (!list.length) return;
  activeStep = (i + list.length) % list.length;
  const o = getObj(list[activeStep]);
  select([o.id]); flyTo(regionOf(o)); renderPathList(true);
}

/* ── 슬라이드: 경로에 들어간 16:9 사각 프레임. 새 모델 없이 프레임·경로를 그대로 씁니다 ── */
function curStep() {
  if (sel.length === 1) { const i = doc.path.indexOf(sel[0]); if (i >= 0) return i; }
  return activeStep >= 0 && activeStep < doc.path.length ? activeStep : -1;
}
/* 기준 슬라이드의 오른쪽(그 슬라이드의 가로 방향)으로, 비슷한 크기의 프레임과 겹치지 않는 첫 자리 */
function freeSpot(ref) {
  const w = ref.w * ref.s, R = objM(ref), area = ref.w * ref.h * ref.s * ref.s;
  for (let k = 1; k < 80; k++) {
    const v = mulV(R, [k * w * 1.15, 0, 0]), c = [ref.x + v[0], ref.y + v[1], ref.z + v[2]];
    const busy = doc.objects.some(o => o !== ref && o.type === 'frame' && o.w * o.h * o.s * o.s < area * 4
      && Math.hypot(o.x - c[0], o.y - c[1], o.z - c[2]) < Math.max(w, o.w * o.s) * .9);
    if (!busy) return c;
  }
  const v = mulV(R, [w * 1.15, 0, 0]);
  return [ref.x + v[0], ref.y + v[1], ref.z + v[2]];
}
function newSlide(layout) {
  if (editing) endEdit();
  layout = LAYOUTS[layout] ? layout : (doc.lastLayout || 'bullets');
  doc.lastLayout = layout;
  const i = curStep(), ref = getObj(doc.path[i >= 0 ? i : doc.path.length - 1]);
  let pos, s;
  if (ref) {
    const [x, y, z] = freeSpot(ref);
    s = ref.w * ref.s / doc.W;
    pos = { x, y, z, rot: ref.rot, rx: ref.rx, ry: ref.ry };
  } else {
    s = Math.min(vw / doc.W, vh / doc.H) / cam.z * .8;
    pos = onView(viewCenter());
  }
  if (!(s > 0 && Number.isFinite(s)) || ![pos.x, pos.y].every(Number.isFinite)) { s = 1; pos = { x: 0, y: 0, z: 0, rot: 0, rx: 0, ry: 0 }; }
  const f = makeSlideFrame({ ...pos, s });
  applyLayout(f, layout);
  const at = i >= 0 ? i + 1 : doc.path.length;
  doc.path.splice(at, 0, f.id);
  activeStep = at;
  select([f.id]); flyTo(regionOf(f), 700); commit(); renderPathList(true);
  toast(`슬라이드 ${at + 1}을(를) 추가했습니다`);
}
function dupSlide() {
  if (editing) endEdit();
  const i = curStep(), f = getObj(doc.path[i]);
  if (!f) { toast('복제할 슬라이드를 먼저 고르세요'); return; }
  const list = f.type === 'frame' ? [f, ...containedIn(f)] : [f];
  const [x, y, z] = freeSpot(f);
  const ids = cloneObjs(list, x - f.x, y - f.y, z - f.z), copy = getObj(ids[0]);
  if (f.name) copy.name = f.name + ' 복사본';
  doc.path.splice(i + 1, 0, copy.id);
  activeStep = i + 1;
  select([copy.id]); flyTo(regionOf(copy), 700); commit(); renderPathList(true);
}
async function delSlide() {
  if (editing) endEdit();
  const i = curStep(), f = getObj(doc.path[i]);
  if (!f) { toast('삭제할 슬라이드를 먼저 고르세요'); return; }
  const inner = f.type === 'frame' ? containedIn(f) : [];
  const ok = await ask({ title: `슬라이드 ${i + 1} 삭제`, msg: inner.length ? `프레임과 안에 든 객체 ${inner.length}개를 함께 지웁니다.` : '이 슬라이드를 지웁니다.', ok: '삭제' });
  if (!ok) return;
  removeObjs([f.id, ...inner.map(o => o.id)]);
  activeStep = Math.min(i, doc.path.length - 1);
  select([]); commit(); renderPathList(); syncOverlay();
}
function moveSlide(dir) {
  const i = curStep(), j = i + dir;
  if (i < 0 || j < 0 || j >= doc.path.length) return;
  [doc.path[i], doc.path[j]] = [doc.path[j], doc.path[i]];
  activeStep = j;
  commit(); renderPathList(true); syncOverlay();
}
async function renameObj(id) {
  const o = getObj(id || sel[0]);
  if (!o) { toast('이름을 바꿀 객체를 먼저 고르세요'); return; }
  const v = await ask({ title: '이름 바꾸기', msg: '슬라이드·레이어 목록에 보일 이름입니다. 비우면 자동 이름을 씁니다.', input: objLabel(o), value: o.name || '' });
  if (v === null) return;
  if (v) o.name = v; else delete o.name;
  commit(); renderPathList(); renderLayers(); renderProps();
}

/* ── 레이어: 순서·잠금·숨김 ── */
function stepZ(dir) {
  const a = doc.objects, ids = new Set(sel);
  if (!ids.size) return;
  if (dir > 0) { for (let i = a.length - 2; i >= 0; i--) if (ids.has(a[i].id) && !ids.has(a[i + 1].id)) [a[i], a[i + 1]] = [a[i + 1], a[i]]; }
  else { for (let i = 1; i < a.length; i++) if (ids.has(a[i].id) && !ids.has(a[i - 1].id)) [a[i], a[i - 1]] = [a[i - 1], a[i]]; }
  renderAll(); commit();
}
function toggleFlag(key, id) {
  const list = id ? [getObj(id)].filter(Boolean) : selObjs();
  if (!list.length) return;
  const on = !list.every(o => o[key]);
  list.forEach(o => {
    if (on) o[key] = true; else delete o[key];
    renderObj(o);
    elOf(o)?.classList.toggle('locked', !!o.locked);
  });
  if (key === 'hidden' && on) select(sel.filter(i => !list.some(o => o.id === i)));
  commit(); syncOverlay(); renderLayers(); renderPathList();
  toast(key === 'locked' ? (on ? '잠갔습니다 · 레이어 패널에서만 고를 수 있습니다' : '잠금을 풀었습니다') : (on ? '숨겼습니다 · 발표 화면에서도 보이지 않습니다' : '다시 보이게 했습니다'));
}
const unlockedSel = () => sel.filter(id => !getObj(id)?.locked);

/* ── 테스트 실행 ── */
let showURL = null;
function runShow(fromStart) {
  if (editing) endEdit();
  const start = fromStart === true ? (doc.path.length ? '#/step-1' : '#/overview')
    : activeStep >= 0 && activeStep < doc.path.length ? '#/step-' + (activeStep + 1) : '#/overview';
  showURL = URL.createObjectURL(new Blob([buildShowHTML()], { type: 'text/html' }));
  const layer = $('#showlayer'), f = $('#showframe');
  /* sandbox는 쓰지 않습니다: 격리하면 alert가 막히고 첫 클릭이 사라지며 발표자 콘솔·유튜브도 막힘.
     대신 편집 화면에서는 코드를 실행하지 않고, 남의 파일을 열 때 코드 유지 여부를 묻습니다 */
  layer.hidden = false;
  /* 뒤에 깔린 편집 화면(그림 수백 개)을 내려 두어, 발표 iframe이 쓸 메모리를 비움 (사파리에서 그림이 빠지는 문제) */
  document.body.classList.add('showing');
  f.src = showURL + start;
  f.onload = () => f.focus();
  layer.requestFullscreen?.().catch(() => {});
}
function closeShow() {
  const layer = $('#showlayer');
  if (layer.hidden) return;
  layer.hidden = true;
  document.body.classList.remove('showing');
  $('#showframe').src = 'about:blank';
  if (document.fullscreenElement) document.exitFullscreen();
  if (showURL) URL.revokeObjectURL(showURL);
  showURL = null;
}
window.addEventListener('message', e => { if (e.data && e.data.type === 'zc-exit') closeShow(); });
let wasFull = false;
document.addEventListener('fullscreenchange', () => { if (wasFull && !document.fullscreenElement) closeShow(); wasFull = !!document.fullscreenElement; });

/* ── 명령 ── */
const ACT = {
  frame: k => addFrame(k), text: () => addText(), shape: s => addShape(s), table: addTable,
  tblRow: d => tableResize(+d, 0), tblCol: d => tableResize(0, +d),
  chart: k => addChart(k || 'bar'),
  model: () => $('#file-model').click(),
  exportPDF: () => exportPDF(),
  embedFile: () => $('#file-html').click(),
  embedURL: () => addEmbedURL(),
  /* 예제를 새 임베드로, 또는 선택한 HTML 임베드의 내용을 예제로 바꿈 */
  embedExample(k) {
    const o = selObjs().find(x => x.type === 'embed' && x.mode === 'html');
    if (o) { o.html = exampleHTML(k); o.srcName = EMBED_EXAMPLES[k].name; commit(); renderObj(o); renderProps(); return; }
    addEmbed({ mode: 'html', html: exampleHTML(k), srcName: EMBED_EXAMPLES[k].name });
  },
  embedMode(m) { selObjs().filter(x => x.type === 'embed').forEach(o => { o.mode = m; renderObj(o); }); commit(); renderProps(); },
  embedPreview: () => openEmbedPreview(),
  aiDeck() { $('#ai-append').disabled = !doc.path.length; $('#adlg').showModal(); $('#ai-topic').focus(); },
  deckDialog() {
    $('#deck-list').innerHTML = Object.entries(DECKS).map(([k, T]) => `<div class="deck">${deckPreviewSVG(k)}<b>${esc(T.name)}</b><span class="note">${esc(T.desc)}</span>
      <div class="grid2"><button class="tb primary" data-deck="new" data-k="${k}">새 문서로</button><button class="tb" data-deck="append" data-k="${k}"${doc.path.length ? '' : ' disabled'}>지금 문서에 이어 붙이기</button></div></div>`).join('');
    $('#tdlg').showModal();
  },
  modelPreview: openModelPreview,
  /* 부품 보이기/숨기기·모두 초기화 */
  partVis(i) { const o = selObjs().find(x => x.type === 'model'); if (!o) return; const p = o.parts[i] || {}; o.parts = { ...o.parts, [i]: { ...p, h: !p.h } }; commit(); renderProps(); },
  partsShowAll() { const o = selObjs().find(x => x.type === 'model'); if (!o) return; o.parts = Object.fromEntries(Object.entries(o.parts).map(([k, p]) => [k, { ...p, h: false }])); commit(); renderProps(); },
  partsReset() { const o = selObjs().find(x => x.type === 'model'); if (!o) return; o.parts = {}; commit(); renderProps(); },
  viewReset() { selObjs().filter(x => x.type === 'model').forEach(o => Object.assign(o, { yaw: 30, pitch: 20, zoom: 1 })); commit(); renderProps(); },
  modelBg() { selObjs().filter(x => x.type === 'model').forEach(o => { o.bg = o.bg ? null : '#ffffff'; }); commit(); renderProps(); },
  connect: () => setTool('connect'), pen: () => setTool('pen'),
  route(k) { doc.lastRoute = k; selObjs().filter(o => o.type === 'connector').forEach(o => { o.route = k; refreshConnectors([o.id]); }); commit(); renderProps(); syncOverlay(); },
  head(k) { selObjs().filter(o => o.type === 'connector').forEach(o => { o.head = k; renderObj(o); }); commit(); renderProps(); },
  chartKind(k) { selObjs().filter(o => o.type === 'chart').forEach(o => { o.kind = k; renderObj(o); }); commit(); renderProps(); },
  /* 선택한 표를 같은 자리 옆에 차트로 (표 데이터 그대로) */
  tableToChart() {
    const t = selObjs().find(o => o.type === 'table');
    if (!t) return;
    const data = t.rows.map(r => r.map(c => plainText(c)));
    const v = mulV(objM(t), [t.w * t.s * 1.1, 0, 0]);
    const o = insertObj(makeObj('chart', { x: t.x + v[0], y: t.y + v[1], z: t.z + v[2], rot: t.rot, rx: t.rx, ry: t.ry, w: 1200, h: 720, s: t.w * t.s / 1200, data }));
    select([o.id]); commit();
  },
  toggleProp(k) { selObjs().forEach(o => { o[k] = !o[k]; renderObj(o); }); commit(); renderProps(); syncOverlay(); },
  shapeKind(k) {
    const pr = SHAPE_PRESET[k];
    selObjs().filter(o => o.type === 'shape').forEach(o => { o.shape = pr.shape; o.p = { ...pr.p }; renderObj(o); });
    commit(); renderProps();
  },
  shapeMenu() { const d = $('#dd-shape'); d.open = true; },
  editText() { const o = selObjs()[0]; if (editableOf(o)) startEdit(o, true); },
  codeSample() {
    const o = selObjs()[0];
    if (!o) return;
    o.clickCode = 'let sum = 0;\nfor (let i = 1; i <= 10; i++) {\n  sum += i;\n}\nalert("1부터 10까지의 합은 " + sum + "입니다.");';
    commit(); renderProps();
  },
  image: () => $('#file-image').click(), videoFile: () => $('#file-video').click(),
  async imageURL() {
    const u = await ask({ title: '이미지 주소', msg: '인터넷 이미지 주소를 넣으세요. 내보낸 파일에서도 이 주소로 불러옵니다.', input: 'https://…' });
    if (!u) return;
    const [w, h] = await imageSize(u), s = Math.min(vw * .5 / w, vh * .5 / h) / cam.z;
    const o = insertObj(makeObj('image', { ...onView(viewCenter()), src: u, w, h, s })); select([o.id]); commit();
  },
  async videoURL() {
    const u = await ask({ title: '영상 주소', msg: 'YouTube 주소 또는 mp4 파일 주소를 넣으세요.', input: 'https://www.youtube.com/watch?v=…' });
    if (!u) return;
    const yt = ytId(u);
    if (!yt && !/^https?:\/\//i.test(u)) { toast('http로 시작하는 주소를 넣어 주세요'); return; }
    addVideoObj(yt ? { yt } : { src: u });
  },
  path: () => setPathMode(!pathMode),
  addView() {
    const w = vw / cam.z, h = vh / cam.z, s = Math.max(w / doc.W, h / doc.H);
    const o = insertObj(makeObj('frame', { ...onView(viewCenter()), frame: 'hidden', w: doc.W, h: doc.H, s }));
    doc.path.push(o.id); activeStep = doc.path.length - 1; commit(); renderPathList(); syncOverlay();
    toast('현재 화면을 숨은 프레임으로 경로에 넣었습니다');
  },
  run: runShow, closeShow,
  setOverview() { doc.overview = { x: cam.x, y: cam.y, z: cam.wz, w: vw / cam.z, h: vh / cam.z, r: cam.r, rx: cam.rx, ry: cam.ry }; commit(); syncOverlay(); renderPathList(); toast('현재 화면을 overview로 지정했습니다'); },
  clearOverview() { doc.overview = null; commit(); syncOverlay(); renderPathList(); toast('overview를 자동(전체 맞춤)으로 되돌렸습니다'); },
  exportHTML: () => { if (editing) endEdit(); exportHTML(); }, saveJSON,
  open: () => $('#file-doc').click(),
  async newDoc() {
    if (await ask({ title: '새 캔버스', msg: '지금 내용을 지우고 새로 시작할까요? 필요하면 먼저 JSON으로 저장하세요.', ok: '새로 시작' })) { loadDoc(newDoc()); commit(); autosave(); }
  },
  undo: () => { if (editing) endEdit(); restore(hi - 1); },
  redo: () => { if (editing) endEdit(); restore(hi + 1); },
  fit: () => fitAll(),
  zoomIn: () => zoomAt(vw / 2, vh / 2, 1.5), zoomOut: () => zoomAt(vw / 2, vh / 2, 1 / 1.5),
  resetRot: () => flyTo({ x: cam.x, y: cam.y, z: cam.wz, w: vw / cam.z, h: vh / cam.z, r: 0, rx: 0, ry: 0 }, 500, 1),
  flatten() { const X = xformBegin(false); xformEuler(X, 0, 0, X.p.rot); xformApply(X, [0, 0, -(selectionBox().z || 0)], 1, null); commit(); renderProps(); },
  del() {
    if (!sel.length) return;
    const ids = unlockedSel();
    if (ids.length < sel.length) toast('잠긴 객체는 지우지 않았습니다');
    if (!ids.length) return;
    removeObjs(ids); select([]); commit();
  },
  dup() { if (!sel.length) return; const k = 30 / cam.z; select(cloneObjs(expandedSel(), k, k).slice(0, sel.length)); commit(); },
  front: () => reorderZ(1), back: () => reorderZ(-1),
  forward: () => stepZ(1), backward: () => stepZ(-1),
  toggleLock: id => toggleFlag('locked', id), toggleHide: id => toggleFlag('hidden', id),
  renameObj: id => renameObj(id),
  newSlide, dupSlide, delSlide, pdfImport: pickPDF, fillSlide,
  renameSlide: () => { const i = curStep(); if (i < 0) { toast('이름을 바꿀 슬라이드를 먼저 고르세요'); return; } renameObj(doc.path[i]); },
  moveSlide: d => moveSlide(+d),
  prevSlide: () => { const i = curStep(); goStep(i < 0 ? -1 : i - 1); }, nextSlide: () => goStep(curStep() + 1),
  runStart: () => runShow(true),
  copy() { if (sel.length) { clip = JSON.parse(JSON.stringify(expandedSel())); toast('복사했습니다'); } },
  paste() { if (!clip) { toast('복사한 객체가 없습니다'); return; } const k = 30 / cam.z; select(cloneObjs(clip, k, k)); commit(); },
  selectAll: () => select(doc.objects.filter(pickable).map(o => o.id)),
  deselect: () => select([]),
  leftTab(t) {
    $('#pane-slides').hidden = t !== 'slides'; $('#pane-layers').hidden = t !== 'layers';
    $('#tab-slides').classList.toggle('on', t === 'slides'); $('#tab-layers').classList.toggle('on', t === 'layers');
    if (t === 'layers') renderLayers(); else renderPathList(true);
  },
  toggleMini() { const b = $('#minimap-box'); b.hidden = !b.hidden; drawMini(); },
  help() { $('#helpdlg').showModal(); },
  addPath: () => { selObjs().forEach(o => addToPath(o.id)); },
  removePath: () => { doc.path = doc.path.filter(id => !sel.includes(id)); commit(); renderPathList(); syncOverlay(); renderProps(); },
  view: () => { const o = selObjs()[0]; if (o) flyTo(regionOf(o)); },
  theme(i) { doc.theme = +i; doc.bg = null; renderAll(); commit(); },
  pathRemove(i) { doc.path.splice(+i, 1); commit(); renderPathList(); syncOverlay(); },
  overviewGo() { activeStep = -1; flyTo(overviewRegion(), 900, 1); renderPathList(); },
  frameKind(k) { selObjs().forEach(o => { o.frame = k; if (k === 'circle') { const m = Math.max(o.w, o.h); o.w = o.h = m; } renderObj(o); }); commit(); renderProps(); syncOverlay(); renderPathList(); },
  textStyle(k) { const ts = TEXT_STYLES[k]; selObjs().forEach(o => { Object.assign(o, { style: k, fs: ts.fs, fw: ts.fw, color: null }); renderObj(o); }); commit(); renderProps(); syncOverlay(); },
  align(a) { selObjs().forEach(o => { o.align = a; if (editing !== o) renderObj(o); else editEl(o).style.textAlign = a; }); if (!editing) commit(); renderProps(); },
  resetColor(k) { selObjs().forEach(o => { o[k] = null; renderObj(o); }); commit(); renderProps(); },
  fmt: c => formatText(c),
};
function formatText(cmd, val) {
  if (editing) { document.execCommand(cmd, false, val); return; }
  selObjs().filter(editableOf).forEach(o => {
    const t = editEl(o);
    t.contentEditable = 'true'; t.focus();
    document.execCommand('selectAll'); document.execCommand(cmd, false, val);
    getSelection().removeAllRanges();
    t.removeAttribute('contenteditable');
    readEdited(o, t);
  });
  commit(); syncOverlay();
}
document.addEventListener('mousedown', e => { if (e.target.closest('[data-keep]')) e.preventDefault(); });
document.addEventListener('click', e => {
  const b = e.target.closest('[data-act]');
  if (!b || b.disabled || !ACT[b.dataset.act]) return;
  if (b.closest('details.dd')) closeMenus();
  if (b.closest('#ctx')) hideCtx();
  ACT[b.dataset.act](b.dataset.arg);
});

/* ── 메뉴 막대: 항목은 모두 ACT 명령을 부릅니다 [이름, 명령, 인자, 단축키] ── */
const MENUS = [
  ['파일', [['새 캔버스', 'newDoc'], ['템플릿으로 새 덱…', 'deckDialog'], ['AI로 덱 만들기…', 'aiDeck'], ['PDF 불러오기 (슬라이드로)…', 'pdfImport'], ['열기…', 'open', '', '⌘O'], '-', ['JSON 저장', 'saveJSON', '', '⌘S'], ['HTML 내보내기', 'exportHTML', '', '⇧⌘E'], ['PDF로 내보내기 (슬라이드별)', 'exportPDF'], '-',
    ['지금 화면을 overview로 지정', 'setOverview'], ['overview 자동으로 되돌리기', 'clearOverview']]],
  ['편집', [['실행 취소', 'undo', '', '⌘Z'], ['다시 실행', 'redo', '', '⇧⌘Z'], '-', ['복사', 'copy', '', '⌘C'], ['붙여넣기', 'paste', '', '⌘V'], ['복제', 'dup', '', '⌘D'], ['삭제', 'del', '', 'Delete'], '-',
    ['모두 선택', 'selectAll', '', '⌘A'], ['선택 해제', 'deselect', '', 'Esc']]],
  ['삽입', [['새 슬라이드', 'newSlide'], '-', ['텍스트', 'text', '', '더블클릭'], ['대괄호 프레임', 'frame', 'bracket'], ['원 프레임', 'frame', 'circle'], ['사각 프레임', 'frame', 'rect'], ['숨은 프레임', 'frame', 'hidden'], '-',
    ['도형…', 'shapeMenu'], ['사각형', 'shape', 'rect'], ['원', 'shape', 'ellipse'], ['화살표', 'shape', 'arrow'], ['선', 'shape', 'line'], '-', ['표', 'table'], ['막대 차트', 'chart', 'bar'], ['꺾은선 차트', 'chart', 'line'], ['원 차트', 'chart', 'pie'], '-', ['3D 모델… (GLB·STL·OBJ·STEP·IGES)', 'model'], ['웹 임베드: HTML 파일…', 'embedFile'], ['웹 임베드: 웹 주소…', 'embedURL'], '-', ['연결선 잇기', 'connect'], ['펜으로 그리기', 'pen'], '-',
    ['이미지 파일…', 'image'], ['이미지 주소…', 'imageURL'], ['영상 주소…', 'videoURL'], ['영상 파일…', 'videoFile']]],
  ['슬라이드', [['처음부터 발표', 'runStart'], ['현재 슬라이드부터 발표', 'run', '', '⌘↵'], '-', ['새 슬라이드', 'newSlide'],
    ...Object.entries(LAYOUTS).map(([k, L]) => ['  └ ' + L.name, 'newSlide', k]), ['템플릿으로 새 덱…', 'deckDialog'], ['AI로 덱 만들기…', 'aiDeck'], ['PDF 불러오기 (슬라이드로)…', 'pdfImport'], '-', ['현재 슬라이드 복제', 'dupSlide'], ['현재 슬라이드 삭제', 'delSlide'], '-',
    ['이전 슬라이드', 'prevSlide', '', 'PageUp'], ['다음 슬라이드', 'nextSlide', '', 'PageDown'], ['앞으로 옮기기', 'moveSlide', '-1'], ['뒤로 옮기기', 'moveSlide', '1'], '-',
    ['슬라이드 이름 바꾸기…', 'renameSlide'], ['경로 잇기 모드', 'path'], ['지금 화면을 경로에 추가', 'addView'], '-', ['슬라이드를 PDF로 내보내기', 'exportPDF']]],
  ['레이어', [['맨 앞으로', 'front', '', '⇧⌘]'], ['앞으로', 'forward', '', '⌘]'], ['뒤로', 'backward', '', '⌘['], ['맨 뒤로', 'back', '', '⇧⌘['], '-',
    ['잠금 전환', 'toggleLock', '', '⇧⌘L'], ['표시 전환', 'toggleHide', '', '⇧⌘H'], ['이름 바꾸기…', 'renameObj'], '-', ['레이어 패널', 'leftTab', 'layers']]],
  ['보기', [['확대', 'zoomIn', '', '⌘='], ['축소', 'zoomOut', '', '⌘−'], ['전체 보기', 'fit', '', '⇧1'], ['선택 객체로 이동', 'view', '', '⇧2'], ['화면 회전 풀기', 'resetRot'], '-',
    ['슬라이드 패널', 'leftTab', 'slides'], ['레이어 패널', 'leftTab', 'layers'], ['미니맵 보이기/숨기기', 'toggleMini']]],
  ['도움말', [['키보드 단축키', 'help', '', '?']]],
];
const menuItems = items => items.map(it => it === '-' ? '<hr>'
  : `<button class="mi" data-act="${it[1]}"${it[2] ? ` data-arg="${esc(it[2])}"` : ''}><span>${esc(it[0])}</span>${it[3] ? `<kbd>${esc(it[3])}</kbd>` : ''}</button>`).join('');
$('#menubar').innerHTML = '<b class="brand">simpress</b>' + MENUS.map(([name, items]) => `<details class="dd mb"><summary>${name}</summary><div class="pop">${menuItems(items)}</div></details>`).join('');
/* 메뉴 하나가 열려 있으면, 옆 메뉴 위로 마우스만 옮겨도 그 메뉴가 열림 */
$('#menubar').addEventListener('pointerover', e => {
  const d = e.target.closest('details.mb');
  if (d && !d.open && $('#menubar details[open]')) { closeMenus(); d.open = true; }
});
document.addEventListener('toggle', e => {
  const d = e.target;
  if (d.matches && d.matches('details.dd') && d.open) $$('details.dd[open]').forEach(x => { if (x !== d) x.open = false; });
}, true);

/* ── 우클릭 메뉴 ── */
function showCtx(x, y, items) {
  const c = $('#ctx');
  c.innerHTML = menuItems(items);
  c.hidden = false;
  const w = c.offsetWidth, h = c.offsetHeight;
  c.style.transform = `translate(${Math.min(x, innerWidth - w - 6)}px,${Math.min(y, innerHeight - h - 6)}px)`;
}
function hideCtx() { $('#ctx').hidden = true; }
document.addEventListener('pointerdown', e => { if (!e.target.closest('#ctx')) hideCtx(); });

const SHORTCUTS = [['휠', '확대·축소'], ['배경 드래그 · Space+드래그', '화면 이동'], ['빈 곳 더블클릭', '글쓰기'], ['Shift+드래그', '범위 선택'], ['우클릭·⌥+드래그', '시점 돌리기'],
  ['⌘Z · ⇧⌘Z', '실행 취소 · 다시 실행'], ['⌘C · ⌘V · ⌘D', '복사 · 붙여넣기 · 복제'], ['Delete', '삭제'], ['⌘A', '모두 선택'],
  ['방향키', '선택했으면 조금 이동, 아니면 슬라이드 이동'], ['PageUp · PageDown', '이전 · 다음 슬라이드'], ['⌘] · ⌘[', '앞으로 · 뒤로'], ['⇧⌘] · ⇧⌘[', '맨 앞으로 · 맨 뒤로'],
  ['⇧⌘L · ⇧⌘H', '잠금 · 표시 전환'], ['⌘= · ⌘−', '확대 · 축소'], ['⇧1 · ⇧2', '전체 보기 · 선택으로 이동'], ['⌘O · ⌘S · ⇧⌘E', '열기 · JSON 저장 · HTML 내보내기'],
  ['⌘↵', '테스트 실행'], ['발표 중 P · O', '발표자 노트 · 전체 보기'], ['?', '이 도움말']];
$('#help-list').innerHTML = SHORTCUTS.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('');

/* ── 도형 고르기: 미리보기 아이콘은 실제 렌더러로 그립니다 ── */
function shapeIcon(key, bw = 30, bh = 24) {
  const pr = SHAPE_PRESET[key], [sw, sh] = pr.size, k = Math.min(bw / sw, bh / sh), w = sw * k, h = sh * k;
  return shapeSVG({ shape: pr.shape, p: pr.p, w, h, fill: 'currentColor', sw: 0, stroke: pr.shape === 'line' ? 'currentColor' : null })
    .replace('<svg ', `<svg style="width:${w.toFixed(1)}px;height:${h.toFixed(1)}px" `);
}
$('#shape-pop').innerHTML = SHAPE_MENU.map(([g, list]) => `<h5>${g}</h5><div class="sg">${list.map(([k, name]) => `<button data-act="shape" data-arg="${k}" title="${name}">${shapeIcon(k)}</button>`).join('')}</div>`).join('');
const PARAM_UI = { r: ['모서리', 0, .5, .01], n: ['개수', 3, 12, 1], inner: ['안쪽 비율', .1, .9, .01], t: ['두께', .05, .9, .01], a: ['각도', 10, 360, 5], k: ['기울기', 0, .45, .01] };
function shapeProps(o) {
  const P = { ...SHAPE_DEF[o.shape], ...o.p };
  const pick = `<div class="shape-pick">${Object.keys(SHAPE_PRESET).map(k => `<button data-act="shapeKind" data-arg="${k}" title="${SHAPE_PRESET[k].name}" class="${SHAPE_PRESET[k].shape === o.shape ? 'on' : ''}">${shapeIcon(k, 22, 18)}</button>`).join('')}</div>`;
  const params = Object.keys(SHAPE_DEF[o.shape] || {}).map(k => { const [label, mn, mx, st] = PARAM_UI[k]; return `<label class="row"><span>${label}</span><input type="range" data-p="p.${k}" min="${mn}" max="${mx}" step="${st}" value="${P[k]}"></label>`; }).join('');
  let h = `<h3>도형</h3>${pick}${params}${colorRow('채우기', 'fill', o.fill, cssColor('--c-accent'))}${colorRow('선 색', 'stroke', o.stroke, '#222222')}
    <label class="row"><span>선 두께</span><input type="range" data-p="sw" min="0" max="40" value="${o.sw}"></label>`;
  if (o.shape !== 'line') h += `<h4>도형 안 글</h4>${textFmtHTML(o)}<button class="wide" data-act="editText">글 입력 (Enter · 더블클릭)</button>`;
  return h;
}
/* 글자 서식 묶음: 굵게·기울임·밑줄·목록, 정렬, 색, 크기, 글꼴 */
function textFmtHTML(o, colorFallback = '#ffffff') {
  return `<div class="seg"><button data-act="fmt" data-arg="bold" data-keep><b>B</b></button><button data-act="fmt" data-arg="italic" data-keep><i>I</i></button><button data-act="fmt" data-arg="underline" data-keep><u>U</u></button><button data-act="fmt" data-arg="insertUnorderedList" data-keep>•</button></div>
    ${seg('align', [['left', '왼쪽'], ['center', '가운데'], ['right', '오른쪽']], o.align)}
    ${colorRow('글자색', 'color', o.color, colorFallback)}
    <label class="row"><span>글자 크기</span><input type="number" data-p="fs" min="6" max="600" step="2" value="${o.fs}" style="width:84px"></label>
    <label class="row"><span>글꼴</span><select data-p="font"><option value="sans"${o.font === 'sans' ? ' selected' : ''}>고딕</option><option value="serif"${o.font === 'serif' ? ' selected' : ''}>명조</option><option value="mono"${o.font === 'mono' ? ' selected' : ''}>고정폭</option></select></label>`;
}
function chartProps(o) {
  const chk = (label, k, def) => `<label class="row"><span>${label}</span><input type="checkbox" data-act="toggleProp" data-arg="${k}"${(o[k] ?? def) ? ' checked' : ''}></label>`;
  const rows = (o.data || []).length - 1, many = rows > CHART_MAX_POINTS;
  return `<h3>차트</h3><div class="kinds">${CHART_KINDS.map(([k, n]) => `<button data-act="chartKind" data-arg="${k}" class="${o.kind === k ? 'on' : ''}">${n}</button>`).join('')}</div>
    <label class="row"><span>제목</span><input type="text" data-p="title" value="${esc(o.title || '')}" placeholder="없음"></label>
    <h4>데이터 <span class="note" style="font-weight:400">— 첫 행은 이름, 첫 열은 항목</span></h4>
    <textarea data-p="csv" rows="7" spellcheck="false" class="mono" placeholder="엑셀에서 복사한 범위를 붙여넣으세요">${esc(gridText(o.data || []))}</textarea>
    <p class="note">${rows}행 · 계열 ${Math.max(0, ((o.data || [])[0] || []).length - 1)}개${many ? ` · 점이 많아 그릴 때 ${CHART_MAX_POINTS}개 수준으로 줄입니다` : ''}</p>
    ${chk('범례', 'legend', true)}${chk('값 표시', 'labels', false)}${chk('격자', 'grid', true)}${chk('발표 때 애니메이션', 'anim', true)}
    <label class="row"><span>글자 크기</span><input type="number" data-p="fs" min="8" max="200" step="2" value="${o.fs}" style="width:84px"></label>
    <label class="row"><span>글꼴</span><select data-p="font"><option value="sans"${o.font === 'sans' ? ' selected' : ''}>고딕</option><option value="serif"${o.font === 'serif' ? ' selected' : ''}>명조</option><option value="mono"${o.font === 'mono' ? ' selected' : ''}>고정폭</option></select></label>
    <p class="note">색은 테마 강조색부터 차례로 씁니다.</p>`;
}
function modelProps(o) {
  const mb = doc.assets[o.asset] ? (doc.assets[o.asset].length * .75 / 1048576).toFixed(1) : '?';
  const chk = (label, k) => `<label class="row"><span>${label}</span><input type="checkbox" data-act="toggleProp" data-arg="${k}"${o[k] ? ' checked' : ''}></label>`;
  const names = o.partNames || [];
  const rows = names.map((n, i) => {
    const p = o.parts[i] || {};
    return `<div class="pt${p.h ? ' off' : ''}"><button data-act="partVis" data-arg="${i}" title="${p.h ? '보이기' : '숨기기'}">${icon(p.h ? 'eyeoff' : 'eye')}</button><span title="${esc(n)}">${esc(n)}</span><input type="color" data-part="${i}" value="${esc(p.c || '#9aa7b8')}" title="색 바꾸기"${p.c ? '' : ' class="unset"'}></div>`;
  }).join('');
  return `<h3>3D 모델</h3><p class="note">${esc(o.srcName || '')} · ${mb} MB${o.thumbA ? '' : ' · <b>미리보기 만드는 중…</b>'}</p>
    <button class="wide" data-act="modelPreview">미리보기에서 각도 맞추기</button>
    <button class="wide" data-act="viewReset">기본 각도로</button>
    <h4>발표 화면</h4>
    ${chk('자동 회전', 'spin')}
    ${o.spin ? `<label class="row"><span>회전 속도</span><input type="range" data-p="speed" min="0.1" max="4" step="0.1" value="${o.speed}"></label>` : ''}
    ${chk('마우스로 돌리기', 'orbit')}
    ${chk('애니메이션 재생', 'anim')}
    <h4>보기</h4>
    <label class="row"><span>밝기</span><input type="range" data-p="exposure" min="0.2" max="2.5" step="0.05" value="${o.exposure}"></label>
    <label class="row"><span>배경</span><span class="bgset"><input type="checkbox" data-act="modelBg"${o.bg ? ' checked' : ''} title="배경색 쓰기"><input type="color" data-p="bg" value="${esc(o.bg || '#ffffff')}"${o.bg ? '' : ' disabled'}></span></label>
    <h4>부품 <span class="note" style="font-weight:400">${names.length}개</span></h4>
    ${names.length ? `<div class="parts">${rows}</div><div class="grid2"><button class="wide" data-act="partsShowAll">모두 보이기</button><button class="wide" data-act="partsReset">부품 설정 초기화</button></div>` : '<p class="note">스냅샷을 만든 뒤 부품 목록이 나옵니다.</p>'}
    <p class="note">발표 화면에서는 이 슬라이드에 들어올 때 실시간으로 돌고, 나가면 멈춥니다. 인터넷이 없으면 스냅샷이 대신 보입니다. 기울어진 슬라이드에서는 마우스 회전 방향이 어긋날 수 있습니다.</p>`;
}
function embedProps(o) {
  const ex = Object.entries(EMBED_EXAMPLES).map(([k, t]) => `<option value="${k}">${esc(t.name)}</option>`).join('');
  const refs = o.mode === 'html' ? relativeRefs(o.html) : [];
  const body = o.mode === 'url'
    ? `<label class="row"><span>주소</span><input type="text" data-p="url" value="${esc(o.url)}" placeholder="https://…" style="width:150px"></label>
       ${o.url && !isWebURL(o.url) ? '<p class="note warn">http:// 또는 https://로 시작해야 합니다</p>' : ''}
       <p class="note">사이트가 임베드를 막으면 발표 화면에서 빈 칸이 됩니다. 미리보기로 먼저 확인하세요.</p>`
    : `<div class="grid2"><button class="wide" data-act="embedFile">HTML 파일 열기…</button><select data-ex style="width:100%"><option value="">예제 넣기…</option>${ex}</select></div>
       <h4>HTML 코드 <span class="note" style="font-weight:400">— ${Math.round((o.html || '').length / 1024)}KB</span></h4>
       <textarea data-p="html" rows="10" spellcheck="false" class="mono code" placeholder="여기에 HTML을 붙여넣거나 파일을 여세요">${esc(o.html || '')}</textarea>
       ${refs.length ? `<p class="note warn">같은 폴더 파일을 부르는 경로 ${refs.length}개는 동작하지 않습니다: ${esc(refs.slice(0, 3).join(', '))}</p>` : ''}
       <p class="note">한 파일로 완결된 HTML만 됩니다 (라이브러리는 CDN 주소로). 격리된 상태로 실행되어 이 편집기의 데이터에는 접근할 수 없습니다.</p>`;
  return `<h3>웹 임베드</h3>${seg('embedMode', [['html', 'HTML'], ['url', '웹 주소']], o.mode)}${body}
    <label class="row"><span>보일 때만 실행</span><input type="checkbox" data-act="toggleProp" data-arg="lazy"${o.lazy ? ' checked' : ''}></label>
    <p class="note">끄면(기본) 발표를 열 때부터 계속 실행되어 전체 보기·전환 중에도 보입니다. 무겁거나 소리가 나는 페이지만 켜세요.</p>
    <p class="note">발표 중 바로 클릭·드래그로 조작됩니다. 안을 클릭한 뒤 화살표 키는 임베드로 가니, 슬라이드 넘김은 바깥 클릭·리모컨(PageDown)으로 하세요.</p>
    <button class="wide" data-act="embedPreview">미리보기 (실행해 보기)</button>
    <p class="note">편집 화면에서도 실행해 보여 줍니다 (조작은 미리보기·발표에서). 인터넷이 없어 라이브러리를 못 불러오면 &lt;/&gt; 자리표시로 돌아갑니다. PDF에는 자리표시로 들어갑니다.</p>`;
}
function connectorProps(o) {
  const a = getObj(o.from), b = getObj(o.to);
  return `<h3>연결선</h3>${seg('route', [['straight', '직선'], ['elbow', '꺾은선'], ['curve', '곡선']], o.route)}
    ${seg('head', [['none', '없음'], ['end', '끝 화살표'], ['both', '양쪽']], o.head)}
    ${colorRow('선 색', 'stroke', o.stroke, cssColor('--c-body'))}
    <label class="row"><span>두께</span><input type="range" data-p="sw" min="1" max="40" value="${o.sw}"></label>
    <label class="row"><span>점선</span><input type="checkbox" data-act="toggleProp" data-arg="dash"${o.dash ? ' checked' : ''}></label>
    <p class="note">${esc(a ? objLabel(a) : '?')} → ${esc(b ? objLabel(b) : '?')}<br>양 끝 객체를 옮기면 따라옵니다. 기울기·깊이가 다른 객체끼리는 평면에 투영해 잇습니다.</p>`;
}
function inkProps(o) {
  return `<h3>그리기</h3>${colorRow('선 색', 'stroke', o.stroke, cssColor('--c-title'))}
    <label class="row"><span>두께</span><input type="range" data-p="sw" min="1" max="${Math.max(40, Math.round(o.sw * 3))}" step="any" value="${o.sw}"></label>`;
}
function penProps() {
  return `<h3>펜</h3><label class="row"><span>색</span><input type="color" data-d="penColor" value="${esc(doc.penColor || cssColor('--c-title'))}"></label>
    <label class="row"><span>두께 (화면 기준)</span><input type="range" data-d="penWidth" min="1" max="30" value="${doc.penWidth || 5}"></label>
    <p class="note">끌어서 그립니다. 지금 보는 면 위에 그려지고, 확대해서 그리면 가늘게 들어갑니다. Esc로 끝냅니다.</p>`;
}
/* 인터랙션 (발표 화면에서 동작) */
function fxProps(o) {
  if (!FX_TYPES.includes(o.type)) return '';
  const sel = (key, list, cur) => `<select data-p="${key}" style="width:140px">${list.map(([k, n]) => `<option value="${k}"${(cur || 'none') === k ? ' selected' : ''}>${n}</option>`).join('')}</select>`;
  let target = '';
  if (o.click === 'goto') {
    const opts = doc.path.map((id, i) => [id, `${i + 1}. ${stepTitle(getObj(id)).slice(0, 18)}`]);
    target = `<label class="row"><span>이동할 곳</span>${sel('clickTarget', [['', '고르세요'], ...opts], o.clickTarget || '')}</label>`;
  }
  if (o.click === 'toggle') {
    const opts = doc.objects.filter(x => x !== o && FX_TYPES.includes(x.type)).reverse().map(x => [x.id, objLabel(x).slice(0, 20)]);
    target = `<label class="row"><span>대상 객체</span>${sel('clickTarget', [['', '고르세요'], ...opts], o.clickTarget || '')}</label>`;
  }
  if (o.click === 'url') target = `<label class="row"><span>주소</span><input type="text" data-p="clickUrl" value="${esc(o.clickUrl || '')}" placeholder="https://…" style="width:140px"></label>`;
  const emptyCode = !String(o.clickCode || '').trim();
  if (o.click === 'code') target = `<textarea data-p="clickCode" rows="8" spellcheck="false" class="mono code" placeholder="여기에 코드를 입력하세요">${esc(o.clickCode || '')}</textarea>
    ${emptyCode ? '<p class="note warn">코드가 비어 있습니다. 눌러도 아무 일도 일어나지 않습니다.</p><button class="wide" data-act="codeSample">예제 넣기 (1~10 합계 알림)</button>' : ''}
    <p class="note">발표 화면에서 누를 때 실행됩니다 (편집 화면에서는 실행하지 않음). 쓸 수 있는 것:<br>
    <code>el</code> 누른 객체 · <code>api.goto('step-2')</code> <code>api.next()</code> <code>api.prev()</code><br>
    <code>byName('레이어 이름')</code> 이름 붙인 객체 찾기 · <code>fx(요소, 'pulse')</code> 효과</p>
    <button class="wide" data-act="runStart">테스트 실행으로 확인</button>`;
  return `<h4>인터랙션 <span class="note" style="font-weight:400">— 발표 화면에서 동작</span></h4>
    <label class="row"><span>마우스 올리면</span>${sel('hover', FX_HOVER, o.hover)}</label>
    <label class="row"><span>누르면</span>${sel('click', FX_CLICK, o.click)}</label>${target}
    <label class="row"><span>단계에 들어오면</span>${sel('enter', FX_ENTER, o.enter)}</label>
    <details class="fxcode"${String(o.enterCode || '').trim() ? ' open' : ''}><summary>단계에 들어오면 자바스크립트 실행 (고급)</summary>
      <textarea data-p="enterCode" rows="5" spellcheck="false" class="mono code" placeholder="여기에 코드를 입력하세요">${esc(o.enterCode || '')}</textarea>
      <p class="note">이 객체가 속한 슬라이드(또는 경로 단계)에 들어올 때마다 실행됩니다. ${stepForObject(o) ? '' : '<b class="warn">지금은 어느 슬라이드에도 속하지 않아 실행되지 않습니다.</b>'} 쓸 수 있는 것은 위와 같습니다.</p>
    </details>
    <label class="row"><span>처음엔 숨김</span><input type="checkbox" data-act="toggleProp" data-arg="fxHidden"${o.fxHidden ? ' checked' : ''}></label>
    ${o.fxHidden ? '<p class="note">다른 객체의 "보이기/숨기기"로 나타나게 하세요. 편집 화면에서는 흐리게 보입니다.</p>' : ''}`;
}
function tableProps(o) {
  const step = (label, act, n) => `<div class="row"><span>${label}</span><div class="stepper"><button data-act="${act}" data-arg="-1" title="${label} 빼기">−</button><b>${n}</b><button data-act="${act}" data-arg="1" title="${label} 더하기">+</button></div></div>`;
  return `<h3>표</h3>${step('행', 'tblRow', o.rows.length)}${step('열', 'tblCol', o.rows[0].length)}
    <label class="row"><span>머리글 행</span><input type="checkbox" data-act="toggleProp" data-arg="head"${o.head ? ' checked' : ''}></label>
    <label class="row"><span>줄무늬</span><input type="checkbox" data-act="toggleProp" data-arg="stripe"${o.stripe ? ' checked' : ''}></label>
    ${colorRow('머리글 색', 'fill', o.fill, cssColor('--c-accent'))}${colorRow('선 색', 'stroke', o.stroke, '#9aa1ab')}
    <h4>글자</h4>${textFmtHTML(o, cssColor('--c-body'))}<button class="wide" data-act="editText">칸 편집 (Enter · 더블클릭 · Tab으로 이동)</button>
    <button class="wide" data-act="tableToChart">이 표로 차트 만들기</button>`;
}

/* ── 왼쪽: 경로 목록 ── */
function thumbInner(r) {
  const tw = 164, th = Math.round(tw * doc.H / doc.W), k = Math.min(tw / r.w, th / r.h), d = doc.perspective / k;
  const reach = Math.hypot(r.w, r.h) / 2;
  const objs = doc.objects.filter(o => Math.hypot(o.x - r.x, o.y - r.y) < reach + Math.hypot(o.w, o.h) * o.s / 2);
  return `<div class="thumb" style="width:${tw}px;height:${th}px"><div class="tw" style="transform:translate(${tw / 2}px,${th / 2}px) scale(${k}) perspective(${d}px) rotateZ(${-(r.r || 0)}deg) rotateY(${-(r.ry || 0)}deg) rotateX(${-(r.rx || 0)}deg) translate3d(${-r.x}px,${-r.y}px,${-(r.z || 0)}px)">${objs.map(o => objHTML(o, 'thumb')).join('')}</div></div>`;
}
function renderPathList(scroll) {
  clearTimeout(thumbTimer);
  const box = $('#path-list');
  const ov = `<div class="pi ov${activeStep < 0 ? ' on' : ''}" data-act="overviewGo"><b>◎</b>${thumbInner(overviewRegion())}<span>전체 보기${doc.overview ? '' : ' (자동)'}</span></div>`;
  box.innerHTML = ov + doc.path.map((id, i) => {
    const o = getObj(id);
    if (!o) return '';
    const tag = o.slide ? '' : `<i class="tag">${esc(objLabel({ ...o, name: '' }))}</i>`;
    return `<div class="pi${i === activeStep ? ' on' : ''}" draggable="true" data-i="${i}"><b>${i + 1}</b>${tag}${thumbInner(regionOf(o))}<span>${esc(stepTitle(o))}</span><button class="x" data-act="pathRemove" data-arg="${i}" title="경로에서 빼기">×</button></div>`;
  }).join('');
  if (scroll) $('.pi.on', box)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}
let dragI = null;
$('#path-list').addEventListener('dragstart', e => { const p = e.target.closest('.pi[data-i]'); if (p) { dragI = +p.dataset.i; e.dataTransfer.effectAllowed = 'move'; } });
$('#path-list').addEventListener('dragover', e => {
  const p = e.target.closest('.pi[data-i]');
  if (dragI === null || !p) return;
  e.preventDefault();
  $$('.pi.gap').forEach(x => x.classList.remove('gap'));
  p.classList.add('gap');
});
$('#path-list').addEventListener('drop', e => {
  const p = e.target.closest('.pi[data-i]');
  if (dragI === null || !p) return;
  e.preventDefault();
  const to = +p.dataset.i, [id] = doc.path.splice(dragI, 1);
  doc.path.splice(to, 0, id); activeStep = to; dragI = null;
  commit(); renderPathList(); syncOverlay();
});
$('#path-list').addEventListener('dragend', () => { dragI = null; $$('.pi.gap').forEach(x => x.classList.remove('gap')); });
$('#path-list').addEventListener('click', e => {
  if (e.target.closest('[data-act]') && !e.target.closest('.pi.ov')) return;
  const p = e.target.closest('.pi[data-i]');
  if (p) goStep(+p.dataset.i);
});
$('#path-list').addEventListener('dblclick', e => {
  const p = e.target.closest('.pi[data-i]');
  if (p && e.target.closest('span')) renameObj(doc.path[+p.dataset.i]);
});
$('#path-list').addEventListener('contextmenu', e => {
  const p = e.target.closest('.pi[data-i]');
  if (!p) return;
  e.preventDefault();
  const i = +p.dataset.i;
  activeStep = i; select([doc.path[i]]); renderPathList();
  showCtx(e.clientX, e.clientY, [['새 슬라이드', 'newSlide'], ['슬라이드 복제', 'dupSlide'], ['이름 바꾸기…', 'renameSlide'], '-',
    ['앞으로 옮기기', 'moveSlide', '-1'], ['뒤로 옮기기', 'moveSlide', '1'], '-', ['경로에서만 빼기', 'pathRemove', String(i)], ['슬라이드 삭제', 'delSlide']]);
});

/* ── 왼쪽: 레이어 목록 (위가 맨 앞) ── */
const TYPE_ICON = { frame: 'frame', text: 'text', image: 'image', shape: 'shape', video: 'video', table: 'table', chart: 'chart', connector: 'path', ink: 'pen', model: 'cube', embed: 'web' };
function renderLayers() {
  const box = $('#layer-list');
  if (!box || $('#pane-layers').hidden) return;
  box.innerHTML = [...doc.objects].reverse().map(o => {
    const cls = ['li', sel.includes(o.id) ? 'on' : '', o.hidden ? 'off' : '', o.slide ? 'slide' : ''].filter(Boolean).join(' ');
    const ic = o.slide ? 'slide' : TYPE_ICON[o.type] || 'shape';
    const fx = [o.hover, o.click, o.enter].some(v => v && v !== 'none') || o.fxHidden || String(o.enterCode || '').trim() ? '<i class="fx" title="인터랙션 있음">⚡</i>' : '';
    return `<div class="${cls}" draggable="true" data-id="${o.id}">${icon(ic)}<span class="nm">${esc(objLabel(o))}</span>${fx}`
      + `<button class="${o.locked ? 'set' : ''}" data-act="toggleLock" data-arg="${o.id}" title="${o.locked ? '잠금 풀기' : '잠그기'}">${icon(o.locked ? 'lock' : 'unlock')}</button>`
      + `<button class="${o.hidden ? 'set' : ''}" data-act="toggleHide" data-arg="${o.id}" title="${o.hidden ? '보이기' : '숨기기'}">${icon(o.hidden ? 'eyeoff' : 'eye')}</button></div>`;
  }).join('') || '<p class="note" style="padding:8px">객체가 없습니다</p>';
}
function markLayerSel() {
  const rows = $$('#layer-list .li');
  rows.forEach(r => r.classList.toggle('on', sel.includes(r.dataset.id)));
  rows.find(r => r.classList.contains('on'))?.scrollIntoView({ block: 'nearest' });
}
const layerList = $('#layer-list');
layerList.addEventListener('click', e => {
  if (e.target.closest('[data-act]')) return;
  const r = e.target.closest('.li');
  if (!r) return;
  const id = r.dataset.id;
  if (e.shiftKey || e.metaKey) select(sel.includes(id) ? sel.filter(i => i !== id) : [...sel, id]);
  else select([id]);
});
layerList.addEventListener('dblclick', e => {
  const r = e.target.closest('.li');
  if (!r || e.target.closest('[data-act]')) return;
  if (e.target.closest('.nm')) renameObj(r.dataset.id);
  else { const o = getObj(r.dataset.id); if (o) flyTo(regionOf(o)); }
});
layerList.addEventListener('contextmenu', e => {
  const r = e.target.closest('.li');
  if (!r) return;
  e.preventDefault();
  const o = getObj(r.dataset.id);
  if (!sel.includes(o.id)) select([o.id]);
  showCtx(e.clientX, e.clientY, [['이름 바꾸기…', 'renameObj'], [o.locked ? '잠금 풀기' : '잠그기', 'toggleLock'], [o.hidden ? '보이기' : '숨기기', 'toggleHide'], ['이 객체로 이동', 'view'], '-',
    ['맨 앞으로', 'front'], ['앞으로', 'forward'], ['뒤로', 'backward'], ['맨 뒤로', 'back'], '-', ['복제', 'dup'], ['삭제', 'del']]);
});
let dragL = null;
layerList.addEventListener('dragstart', e => { const r = e.target.closest('.li'); if (r) { dragL = r.dataset.id; e.dataTransfer.effectAllowed = 'move'; } });
layerList.addEventListener('dragover', e => {
  const r = e.target.closest('.li');
  if (!dragL || !r) return;
  e.preventDefault();
  $$('#layer-list .gap').forEach(x => x.classList.remove('gap'));
  r.classList.add('gap');
});
layerList.addEventListener('drop', e => {
  const r = e.target.closest('.li');
  if (!dragL || !r) return;
  e.preventDefault();
  const tid = r.dataset.id, from = doc.objects.findIndex(o => o.id === dragL);
  if (tid !== dragL && from >= 0) {
    const [o] = doc.objects.splice(from, 1);
    doc.objects.splice(doc.objects.findIndex(x => x.id === tid) + 1, 0, o);   // 목록에서 놓은 줄의 바로 위 = 그 객체 바로 앞
    renderAll(); commit();
  }
  dragL = null;
});
layerList.addEventListener('dragend', () => { dragL = null; $$('#layer-list .gap').forEach(x => x.classList.remove('gap')); });

/* ── 오른쪽: 속성 패널 ── */
const icon = n => `<svg class="ic"><use href="#i-${n}"/></svg>`;
const seg = (act, items, cur) => `<div class="seg">${items.map(([k, label]) => `<button data-act="${act}" data-arg="${k}" data-keep class="${k === cur ? 'on' : ''}">${label}</button>`).join('')}</div>`;
const colorRow = (label, key, val, fallback) => `<label class="row"><span>${label}</span><input type="color" data-p="${key}" value="${esc(val || fallback)}"><button class="mini" data-act="resetColor" data-arg="${key}" title="테마 색으로">↺</button></label>`;
const cssColor = v => { const h = getComputedStyle(document.documentElement).getPropertyValue(v).trim(); return /^#[0-9a-f]{6}$/i.test(h) ? h : '#000000'; };

function geomHTML() {
  return `<h4>위치와 크기</h4><div class="grid2">
  <label>X<input type="number" data-p="x" step="1"></label><label>Y<input type="number" data-p="y" step="1"></label>
  <label>폭<input type="number" data-p="ww" min="1" step="1"></label><label>높이<input type="number" data-p="wh" min="1" step="1"></label>
  <label>투명도<input type="number" data-p="opacity" min="0" max="100" step="5"></label><label>Z 깊이<input type="number" data-p="z" step="10"></label></div>
  <h4>회전</h4><div class="grid3"><label>X축<input type="number" data-p="rx" step="1"></label><label>Y축<input type="number" data-p="ry" step="1"></label><label>Z축<input type="number" data-p="rot" step="1"></label></div>
  <button class="wide" data-act="flatten">3D 값 지우기 (평면으로)</button>`;
}
function fillGeom() {
  const o = sel.length === 1 ? getObj(sel[0]) : null;
  if (!o) return;
  const set = (k, v) => { const f = $(`#props [data-p="${k}"]`); if (f && document.activeElement !== f) f.value = v; };
  set('x', Math.round(o.x)); set('y', Math.round(o.y)); set('ww', Math.round(o.w * o.s)); set('wh', Math.round(o.h * o.s));
  set('z', Math.round(o.z)); set('rx', Math.round(o.rx * 10) / 10); set('ry', Math.round(o.ry * 10) / 10);
  set('rot', Math.round(o.rot * 10) / 10); set('opacity', Math.round(o.opacity * 100));
}
function renderProps() {
  const p = $('#props'), list = selObjs(), o = list.length === 1 ? list[0] : null;
  const acts = `<div class="acts"><button data-act="dup" title="복제 (⌘D)">${icon('copy')}</button><button data-act="front" title="맨 앞으로">${icon('front')}</button><button data-act="back" title="맨 뒤로">${icon('back')}</button><button class="danger" data-act="del" title="삭제 (Delete)">${icon('trash')}</button></div>`;
  if (!list.length && toolMode === 'pen') { p.innerHTML = penProps(); return; }
  if (!list.length) {
    p.innerHTML = `<h3>캔버스</h3><h4>테마</h4><div class="themes">${THEMES.map((t, i) => `<button data-act="theme" data-arg="${i}" class="${i === doc.theme ? 'on' : ''}" title="${t.name}" style="background:${t.bg};color:${t.title}"><i style="background:${t.accent}"></i>${t.name}</button>`).join('')}</div>
    <h4>화면</h4><label class="row"><span>배경색</span><input type="color" data-d="bg" value="${esc(doc.bg || theme().bg)}"></label>
    <label class="row"><span>화면비</span><select data-d="ratio"><option value="1920x1080"${doc.W / doc.H > 1.5 ? ' selected' : ''}>16:9</option><option value="1600x1200"${doc.W / doc.H <= 1.5 ? ' selected' : ''}>4:3</option></select></label>
    <label class="row"><span>전환 속도</span><input type="range" data-d="duration" min="400" max="3000" step="100" value="${doc.duration}"></label>
    <label class="row"><span>원근감</span><input type="range" data-d="perspective" min="300" max="4000" step="100" value="${doc.perspective}"></label>
    <h4>조작법</h4><dl class="help"><dt>휠</dt><dd>확대·축소</dd><dt>배경 드래그</dt><dd>이동</dd><dt>더블클릭</dt><dd>글 쓰기</dd><dt>Shift+드래그</dt><dd>범위 선택</dd><dt>우클릭·⌥+드래그</dt><dd>시점 돌리기</dd><dt>방향키</dt><dd>경로 따라 이동</dd><dt>⌘↵</dt><dd>테스트 실행</dd><dt>발표 중 P</dt><dd>발표자 노트</dd><dt>?</dt><dd>단축키 전체 보기</dd></dl>`;
    return;
  }
  if (!o) { p.innerHTML = `<h3>${list.length}개 선택</h3>${acts}<button class="wide" data-act="addPath">경로에 추가</button>`; return; }
  const inPath = doc.path.includes(o.id);
  const pathBtn = `<button class="wide" data-act="${inPath ? 'removePath' : 'addPath'}">${inPath ? '경로에서 빼기' : '경로에 추가'}</button>`;
  let h = '';
  if (o.type === 'frame') {
    const no = doc.path.indexOf(o.id);
    h = `<h3>${o.slide ? `슬라이드${no >= 0 ? ' ' + (no + 1) : ''}` : '프레임'}</h3>
    <label class="row"><span>이름</span><input type="text" data-p="name" value="${esc(o.name || '')}" placeholder="${esc(stepTitle({ ...o, name: '' }))}"></label>
    ${seg('frameKind', [['bracket', '대괄호'], ['circle', '원'], ['rect', '사각'], ['hidden', '숨김']], o.frame)}${colorRow('선 색', 'color', o.color, cssColor('--c-accent'))}
    <label class="row"><span>채우기</span><input type="color" data-p="fill" value="${esc(o.fill || '#ffffff')}"><button class="mini" data-act="resetColor" data-arg="fill" title="채우기 없음">↺</button></label>
    <h4>발표자 노트</h4><textarea data-p="notes" rows="3" placeholder="발표 화면에서 P키로 봅니다">${esc(o.notes)}</textarea>`;
  }
  if (o.type === 'text') {
    h = `<h3>텍스트</h3>${seg('textStyle', [['title', '제목'], ['sub', '부제'], ['body', '본문']], o.style)}
    <div class="seg"><button data-act="fmt" data-arg="bold" data-keep><b>B</b></button><button data-act="fmt" data-arg="italic" data-keep><i>I</i></button><button data-act="fmt" data-arg="underline" data-keep><u>U</u></button><button data-act="fmt" data-arg="insertUnorderedList" data-keep>•</button></div>
    ${seg('align', [['left', '왼쪽'], ['center', '가운데'], ['right', '오른쪽']], o.align)}
    ${colorRow('글자색', 'color', o.color, cssColor(o.style === 'body' ? '--c-body' : o.style === 'sub' ? '--c-accent' : '--c-title'))}
    <label class="row"><span>글꼴</span><select data-p="font"><option value="sans"${o.font === 'sans' ? ' selected' : ''}>고딕</option><option value="serif"${o.font === 'serif' ? ' selected' : ''}>명조</option><option value="mono"${o.font === 'mono' ? ' selected' : ''}>고정폭</option></select></label>`;
  }
  if (o.type === 'shape') h = shapeProps(o);
  if (o.type === 'table') h = tableProps(o);
  if (o.type === 'chart') h = chartProps(o);
  if (o.type === 'connector') { p.innerHTML = connectorProps(o) + acts; return; }
  if (o.type === 'ink') h = inkProps(o);
  if (o.type === 'model') h = modelProps(o);
  if (o.type === 'embed') h = embedProps(o);
  if (o.type === 'image') h = `<h3>이미지</h3><label class="row"><span>모서리</span><input type="range" data-p="radius" min="0" max="200" value="${o.radius}"></label>`;
  if (o.type === 'video') h = `<h3>영상</h3><label class="row"><span>컨트롤바 숨기기</span><input type="checkbox" data-act="toggleProp" data-arg="noCtl"${o.noCtl ? ' checked' : ''}></label>
    <p class="note">숨기면 영상을 클릭해서 재생·일시정지합니다.${o.yt ? ' YouTube 제목·로고 링크도 눌리지 않게 막습니다 (YouTube가 그리는 제목 표시 자체는 잠깐 보일 수 있음).' : ''}</p>
    <p class="note">편집 중에는 자리표시만 보이고, 테스트 실행과 내보낸 파일에서 재생됩니다.</p>`;
  if (FILLABLE.includes(o.type)) h += `<button class="wide" data-act="fillSlide">슬라이드에 꽉 채우기</button>`;
  if (o.type !== 'frame' && inPath) h += `<h4>발표자 노트</h4><textarea data-p="notes" rows="3" placeholder="발표 화면에서 P키로 봅니다">${esc(o.notes)}</textarea>`;
  p.innerHTML = h + fxProps(o) + geomHTML() + `<h4>순서</h4>${pathBtn}<button class="wide" data-act="view">이 객체로 이동</button>${acts}`;
  fillGeom();
}
function setProp(key, val) {
  /* 위치·회전은 프레임 안 내용까지 함께 움직이도록 변형 경로로 처리 */
  if (['x', 'y', 'z', 'rx', 'ry', 'rot'].includes(key)) {
    const one = sel.length === 1 ? getObj(sel[0]) : null;
    if (!one) return;
    const X = xformBegin(false);
    if (key === 'rx' || key === 'ry' || key === 'rot') xformEuler(X, key === 'rx' ? val : one.rx, key === 'ry' ? val : one.ry, key === 'rot' ? val : one.rot);
    else xformApply(X, [key === 'x' ? val - one.x : 0, key === 'y' ? val - one.y : 0, key === 'z' ? val - one.z : 0], 1, null);
    return;
  }
  selObjs().forEach(o => {
    if (key === 'ww') {
      if (o.type === 'image' || o.type === 'ink' || (o.type === 'text' && o.auto)) o.s = val / o.w;
      else o.w = val / o.s;
      if (o.type === 'text') o.auto = false;
    } else if (key === 'wh') {
      if (o.type === 'image' || o.type === 'ink' || o.type === 'text') o.s = val / o.h; else o.h = val / o.s;
    } else if (key === 'opacity') o.opacity = Math.min(100, Math.max(0, val)) / 100;
    else if (key === 'name') { if (val.trim()) o.name = val.trim(); else delete o.name; return; }
    else if (key.startsWith('p.')) o.p = { ...o.p, [key.slice(2)]: val };
    else if (key === 'csv') { const g = parseGrid(val); if (g.length) o.data = g; }
    else o[key] = val;
    if (key === 'color' && editing === o) return;
    renderObj(o);
  });
  syncOverlay(); drawMini(); fillGeom();
}
$('#props').addEventListener('input', e => {
  const f = e.target, k = f.dataset.p, d = f.dataset.d;
  if (k) {
    if (k === 'color' && editing && !getSelection().isCollapsed) { document.execCommand('foreColor', false, f.value); return; }
    const num = f.type === 'number' || f.type === 'range';
    if (num && f.value === '') return;
    setProp(k, num ? +f.value : f.value);
  }
  if (d === 'bg') { doc.bg = f.value; document.documentElement.style.cssText = themeVars(); }
  if (d === 'duration') doc.duration = +f.value;
  if (f.dataset.part != null) {   // 3D 모델 부품 색
    const o = selObjs().find(x => x.type === 'model');
    if (o) { const i = f.dataset.part; o.parts = { ...o.parts, [i]: { ...(o.parts[i] || {}), c: f.value } }; f.classList.remove('unset'); }
  }
  if (d === 'penColor') doc.penColor = f.value;
  if (d === 'penWidth') doc.penWidth = +f.value;
  if (d === 'perspective') { doc.perspective = +f.value; applyCam(); renderPathList(); }
  if (d === 'ratio') { [doc.W, doc.H] = f.value.split('x').map(Number); renderPathList(); }
});
$('#props').addEventListener('change', e => {
  commit();
  const k = e.target.dataset.p;
  if (k === 'name') { renderPathList(); renderLayers(); }
  if (k === 'click' || k === 'hover' || k === 'enter') { renderProps(); renderLayers(); }   // 대상 고르는 칸 표시
  if (e.target.dataset.ex !== undefined && e.target.value) { ACT.embedExample(e.target.value); return; }
  if (k === 'url' || k === 'html') { const o = selObjs().find(x => x.type === 'embed'); if (o) renderObj(o); renderProps(); }
  if (k === 'clickCode') { const w = $('#props .warn'); if (w && e.target.value.trim()) { w.remove(); $('#props [data-act=codeSample]')?.remove(); } }
});

/* ── 파일 입력·끌어다 놓기·붙여넣기 ── */
$('#file-image').addEventListener('change', e => { addImages([...e.target.files]); e.target.value = ''; });
$('#file-model').addEventListener('change', e => { const f = e.target.files[0]; e.target.value = ''; if (f) addModelFile(f); });
/* HTML 파일: 선택한 HTML 임베드가 있으면 그 내용을 바꾸고, 없으면 새로 */
$('#file-html').addEventListener('change', async e => {
  const f = e.target.files[0]; e.target.value = '';
  if (!f) return;
  const o = selObjs().find(x => x.type === 'embed' && x.mode === 'html');
  if (o) { o.html = await f.text(); o.srcName = f.name; commit(); renderObj(o); renderProps(); const r = relativeRefs(o.html); if (r.length) toast(`같은 폴더 파일 ${r.length}개는 불러올 수 없습니다`); }
  else addEmbedFile(f);
});
$('#embed-pop').insertAdjacentHTML('beforeend', '<h5 class="ph">예제 (p5.js)</h5>' + Object.entries(EMBED_EXAMPLES).map(([k, t]) => `<button data-act="embedExample" data-arg="${k}">${esc(t.name)}</button>`).join(''));
$('#edlg').addEventListener('click', e => { if (e.target.closest('[data-emb=close]')) closeEmbedPreview(); });
/* ── AI 덱 창 ── */
$('#ai-deck').innerHTML = Object.entries(DECKS).map(([k, T]) => `<option value="${k}">${esc(T.name)}</option>`).join('');
$('#ai-copy').addEventListener('click', async () => {
  const topic = $('#ai-topic').value.trim();
  if (!topic) { $('#ai-status').textContent = '먼저 발표 주제를 적어 주세요'; $('#ai-topic').focus(); return; }
  const n = Math.min(30, Math.max(3, +$('#ai-n').value || 8));
  const p = aiPrompt(topic, n, $('#ai-extra').value.trim());
  try { await navigator.clipboard.writeText(p); $('#ai-status').textContent = '프롬프트를 복사했습니다. AI에 붙여넣고, 받은 답을 위 칸에 붙여넣으세요.'; }
  catch (e) {   // 클립보드 권한이 없으면 답 칸에 띄워 직접 복사하게
    $('#ai-answer').value = p; $('#ai-answer').select();
    $('#ai-status').textContent = '자동 복사가 막혔습니다. 칸에 띄운 프롬프트를 ⌘C로 복사한 뒤 지우고 답을 붙여넣으세요.';
  }
});
async function aiBuild(replace) {
  let parsed;
  try { parsed = parseOutline($('#ai-answer').value); }
  catch (err) { $('#ai-status').textContent = '⚠ ' + err.message; return; }
  const key = $('#ai-deck').value;
  if (replace && doc.objects.length) {
    $('#adlg').close();
    const ok = await ask({ title: 'AI 덱 만들기', msg: `지금 캔버스를 비우고 슬라이드 ${parsed.outline.length}장으로 새로 만듭니다. 지금 작업이 필요하면 먼저 JSON으로 저장하세요.`, ok: '새로 만들기' });
    if (!ok) { $('#adlg').showModal(); return; }
  } else $('#adlg').close();
  buildDeck(key, parsed.outline, { replace, title: parsed.title });
}
$('#ai-build').addEventListener('click', () => aiBuild(true));
$('#ai-append').addEventListener('click', () => aiBuild(false));
$('#ai-close').addEventListener('click', () => $('#adlg').close());
$('#ai-answer').addEventListener('input', () => {
  const v = $('#ai-answer').value.trim();
  if (!v) { $('#ai-status').textContent = ''; return; }
  try { const p = parseOutline(v); $('#ai-status').textContent = `✓ 슬라이드 ${p.outline.length}장: ${p.outline.map(c => LAYOUTS[c.layout].name).join(' · ')}`; }
  catch (err) { $('#ai-status').textContent = '⚠ ' + err.message; }
});
/* 레이아웃 고르기 (새 슬라이드 ▾) */
$('#layout-pop').innerHTML = Object.entries(LAYOUTS).map(([k, L]) => `<button data-act="newSlide" data-arg="${k}">${layoutIcon(k)}<span>${esc(L.name)}</span></button>`).join('');
/* 템플릿 창: 새 문서로 만들기 전에는 지금 문서가 사라진다고 확인 */
$('#tdlg').addEventListener('click', async e => {
  const b = e.target.closest('[data-deck]');
  if (!b) return;
  if (b.dataset.deck === 'close') { $('#tdlg').close(); return; }
  const k = b.dataset.k;
  if (b.dataset.deck === 'new' && doc.objects.length) {
    $('#tdlg').close();
    const ok = await ask({ title: '새 덱 만들기', msg: '지금 캔버스를 비우고 템플릿으로 새로 만듭니다. 지금 작업이 필요하면 먼저 JSON으로 저장하세요. (실행 취소로는 되돌릴 수 없습니다)', ok: '새로 만들기' });
    if (!ok) return;
  } else $('#tdlg').close();
  buildDeck(k, DEMO_OUTLINE, { replace: b.dataset.deck === 'new' });
});
$('#edlg').addEventListener('close', () => { $('#emb-host').innerHTML = ''; });
/* 3D 미리보기 창: 저장·닫기, Esc로 닫아도 WebGL 해제 */
$('#mdlg').addEventListener('click', e => { const b = e.target.closest('[data-mv]'); if (b) closeModelPreview(b.dataset.mv === 'save'); });
$('#mdlg').addEventListener('close', () => closeModelPreview(false));
$('#file-video').addEventListener('change', async e => {
  const f = e.target.files[0];
  e.target.value = '';
  if (!f) return;
  if (f.size > 80e6) toast('영상이 커서 저장 파일도 그만큼 커집니다');
  addVideoObj({ asset: await addAsset(f) });
});
async function openFile(f) {
  try {
    const d = parseDocText(await f.text(), f.name);
    /* 남이 만든 파일의 자바스크립트는 발표 때 실행되므로, 출처를 믿을 때만 유지 */
    if (hasCode(d)) {
      const n = d.objects.filter(objHasCode).length;
      const keep = await ask({ title: '자바스크립트가 들어 있는 파일', msg: `객체 ${n}개에 발표 중 실행되는 코드(누르면·단계에 들어오면)가 있습니다. 직접 만들었거나 믿을 수 있는 파일일 때만 유지하세요. 취소하면 코드를 지우고 엽니다.`, ok: '코드 유지' });
      if (!keep) d.objects.forEach(o => { if (o.click === 'code') { o.click = 'none'; o.clickCode = ''; } o.enterCode = ''; });
    }
    loadDoc(d);
    autosave();
    toast(`${f.name}을(를) 불러왔습니다`);
  } catch (err) { toast('불러오기 실패: ' + err.message); }
}
$('#file-doc').addEventListener('change', e => { if (e.target.files[0]) openFile(e.target.files[0]); e.target.value = ''; });
stage.addEventListener('dragover', e => { if (e.dataTransfer.types.includes('Files')) e.preventDefault(); });
stage.addEventListener('drop', e => {
  e.preventDefault();
  const files = [...e.dataTransfer.files], [sx, sy] = pt(e);
  if (files[0] && /\.(json|html?)$/i.test(files[0].name)) openFile(files[0]);
  else if (files[0] && /\.pdf$/i.test(files[0].name)) importPDF(files[0]);
  else if (files[0] && MODEL_EXT.includes(files[0].name.split('.').pop().toLowerCase())) addModelFile(files[0], onView(s2w(sx, sy)));
  else addImages(files, s2w(sx, sy));
});
let clip = null;
document.addEventListener('paste', e => {
  if (editing || e.target.matches?.('input,textarea')) return;
  const imgs = [...e.clipboardData.files].filter(f => /^image\//.test(f.type));
  if (imgs.length) { e.preventDefault(); addImages(imgs); return; }
  if (clip) { const k = 30 / cam.z; select(cloneObjs(clip, k, k)); commit(); }
});
$('#doc-title').addEventListener('change', e => { doc.title = e.target.value.trim() || '새 캔버스'; commit(); });

/* ── 키보드 ── */
window.addEventListener('keydown', e => {
  const mod = e.metaKey || e.ctrlKey, k = e.key.toLowerCase();
  if (!$('#showlayer').hidden) { if (e.key === 'Escape') closeShow(); return; }
  if ($('#dlg').open || $('#helpdlg').open) return;
  const code = e.code;
  if (mod && k === 's') { e.preventDefault(); if (editing) endEdit(); saveJSON(); return; }
  if (mod && k === 'o') { e.preventDefault(); ACT.open(); return; }
  if (mod && e.shiftKey && code === 'KeyE') { e.preventDefault(); ACT.exportHTML(); return; }
  if (mod && e.key === 'Enter') { e.preventDefault(); runShow(); return; }
  if (mod && (code === 'Equal' || code === 'NumpadAdd')) { e.preventDefault(); ACT.zoomIn(); return; }
  if (mod && (code === 'Minus' || code === 'NumpadSubtract')) { e.preventDefault(); ACT.zoomOut(); return; }
  if (editing) { if (e.key === 'Escape') endEdit(); return; }
  if (e.target.matches?.('input,textarea,select')) return;
  if (e.key === 'Escape' && !$('#ctx').hidden) { hideCtx(); return; }
  if (mod && k === 'z') { e.preventDefault(); e.shiftKey ? ACT.redo() : ACT.undo(); return; }
  if (mod && k === 'y') { e.preventDefault(); ACT.redo(); return; }
  if (mod && k === 'd') { e.preventDefault(); if (sel.length) ACT.dup(); return; }
  if (mod && k === 'a') { e.preventDefault(); ACT.selectAll(); return; }
  if (mod && k === 'c') { if (sel.length) clip = JSON.parse(JSON.stringify(expandedSel())); return; }
  /* 레이어 순서·잠금·숨김: 한글 입력 상태에서도 되도록 물리 키(e.code)로 판단 */
  if (mod && code === 'BracketRight') { e.preventDefault(); e.shiftKey ? ACT.front() : ACT.forward(); return; }
  if (mod && code === 'BracketLeft') { e.preventDefault(); e.shiftKey ? ACT.back() : ACT.backward(); return; }
  if (mod && e.shiftKey && code === 'KeyL') { e.preventDefault(); ACT.toggleLock(); return; }
  if (mod && e.shiftKey && code === 'KeyH') { e.preventDefault(); ACT.toggleHide(); return; }
  if (!mod && e.shiftKey && code === 'Digit1') { e.preventDefault(); ACT.fit(); return; }
  if (!mod && e.shiftKey && code === 'Digit2') { e.preventDefault(); ACT.view(); return; }
  if (!mod && e.key === '?') { e.preventDefault(); ACT.help(); return; }
  if (e.key === ' ') { e.preventDefault(); spaceDown = true; stage.classList.add('space'); return; }
  if (e.key === 'Delete' || e.key === 'Backspace') { if (sel.length) ACT.del(); return; }
  if (e.key === 'Escape') { if (toolMode) setTool(toolMode); else if (pathMode) setPathMode(false); else select([]); return; }
  if (e.key === 'Enter' && sel.length === 1 && editableOf(getObj(sel[0])) && pickable(getObj(sel[0]))) { e.preventDefault(); startEdit(getObj(sel[0])); return; }
  if (e.key.startsWith('Arrow')) {
    e.preventDefault();
    const dx = e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : 0, dy = e.key === 'ArrowUp' ? -1 : e.key === 'ArrowDown' ? 1 : 0;
    if (sel.length && mod === false && !e.altKey) {
      if (selObjs().some(o => o.locked)) { toast('잠긴 객체는 옮길 수 없습니다'); return; }
      const st = (e.shiftKey ? 20 : 2) / cam.z, X = xformBegin(false);
      xformApply(X, mulV(euler(cam.rx, cam.ry, cam.r), [dx * st, dy * st, 0]), 1, null);
      clearTimeout(ACT.nudge); ACT.nudge = setTimeout(commit, 400);
    } else goStep(activeStep + (dx + dy > 0 ? 1 : -1));
    return;
  }
  if (e.key === 'PageDown') { e.preventDefault(); ACT.nextSlide(); }
  if (e.key === 'PageUp') { e.preventDefault(); ACT.prevSlide(); }
  if (e.key === 'Home') { e.preventDefault(); ACT.overviewGo(); }
});
window.addEventListener('keyup', e => { if (e.key === ' ') { spaceDown = false; stage.classList.remove('space'); } });

/* ── 처음 여는 사람을 위한 예제 ── */
function sampleDoc() {
  const d = newDoc();
  d.title = '캔버스 둘러보기';
  const T = (html, x, y, style, s = 1, extra = {}) => makeObj('text', { html, x, y, style, s, fs: TEXT_STYLES[style].fs, fw: TEXT_STYLES[style].fw, align: 'center', ...extra });
  const F = (frame, x, y, w, h, s, rot = 0) => makeObj('frame', { frame, x, y, w, h, s, rot });
  const big = F('circle', 0, 0, 2000, 2000, 1.5);
  const hero = F('hidden', 0, -560, 1920, 1080, .78);
  const a = F('bracket', -860, 500, 1152, 648, .72, -10);
  const b = F('bracket', 0, 800, 1152, 648, .72);
  const c = F('bracket', 860, 500, 1152, 648, .72, 10);
  const deep = F('rect', 110, 880, 1152, 648, .1);
  d.objects.push(big, hero, a, b, c, deep,
    T('하나의 큰 캔버스', 0, -640, 'title', 1.1),
    T('슬라이드를 넘기는 대신, 움직이고 확대해서 이야기합니다', 0, -470, 'sub', .62),
    T('자유 배치', -860, 410, 'title', .62, { rot: -10 }),
    T('어디든 더블클릭해서 글을 쓰고<br>객체를 눌러 나타나는 링으로 옮기고 키우고 돌립니다', -880, 560, 'body', .7, { rot: -10 }),
    T('프레임 안의 프레임', 0, 700, 'title', .62),
    T('작게 넣어 두면 확대로 찾아갑니다', -130, 880, 'body', .7),
    T('여기까지 왔습니다', 110, 868, 'title', .08),
    T('확대할 수 있는 깊이에는 제한이 없습니다', 110, 898, 'body', .11),
    T('경로로 연결', 860, 410, 'title', .62, { rot: 10 }),
    T('프레임 순서가 곧 발표 순서입니다<br>왼쪽 목록에서 끌어 순서를 바꿉니다', 880, 560, 'body', .7, { rot: 10 }));
  d.objects.push(makeObj('shape', { shape: 'arrow', x: -470, y: 120, w: 340, h: 100, s: .8, rot: 125 }), makeObj('shape', { shape: 'arrow', x: 470, y: 120, w: 340, h: 100, s: .8, rot: 55 }));
  /* impress.js의 3D: 뒤쪽으로 물러나 비스듬히 기운 프레임 */
  const t3 = { z: -700, rx: 14, ry: -38, rot: -6 }, tilt = F('rect', 2700, -350, 1152, 648, .9);
  Object.assign(tilt, t3);
  const at = (lx, ly) => { const v = mulV(objM(tilt), [lx, ly, 0]); return { x: tilt.x + v[0], y: tilt.y + v[1], z: tilt.z + v[2] }; };
  const place = (o, lx, ly) => Object.assign(o, at(lx, ly), { rx: t3.rx, ry: t3.ry, rot: t3.rot });
  d.objects.splice(6, 0, tilt);
  d.objects.push(place(T('깊이와 기울기', 0, 0, 'title', .62), 0, -90), place(T('X·Y축 회전과 Z 깊이를 그대로 씁니다<br>이 프레임으로 이동하면 편집 화면도 함께 정면을 향합니다', 0, 0, 'body', .7), 0, 60));
  d.path = [hero.id, a.id, b.id, deep.id, c.id, tilt.id];
  return d;
}

(async function boot() {
  vw = stage.clientWidth; vh = stage.clientHeight;
  doc = newDoc();
  const saved = await loadSaved();
  loadDoc(saved ? Object.assign(newDoc(), saved) : sampleDoc());
  $('#save-state').textContent = saved ? '이어서 편집' : '';
})();
