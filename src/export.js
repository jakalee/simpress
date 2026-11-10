/* export.js — impress.js 프레젠테이션 만들기, 테스트 실행, 저장·불러오기 */
const SHOW_CSS = `
html,body{margin:0;height:100%;overflow:hidden;background:var(--c-bg)}
.step{position:absolute;left:0;top:0;width:var(--pw);height:var(--ph);pointer-events:none;outline:0}
.notes{display:none}
.o[data-step]{cursor:zoom-in}
.impress-enabled #impress-toolbar{position:fixed;right:8px;bottom:8px;z-index:10;display:flex;align-items:center;font:13px -apple-system,"Apple SD Gothic Neo","Malgun Gothic",sans-serif}
#impress-toolbar>span{display:inline-flex;align-items:center;gap:3px;margin-left:8px}
#impress-toolbar button,#impress-toolbar select{height:28px;border:1px solid rgba(120,128,140,.45);border-radius:6px;background:rgba(255,255,255,.88);color:#20262e;font:inherit;padding:0 9px;cursor:pointer}
#impress-toolbar button:hover,#impress-toolbar select:hover{background:#fff}
#impress-toolbar select{max-width:230px}
body.impress-mouse-timeout #impress-toolbar{display:none}
.impress-progress{position:fixed;left:12px;bottom:10px;z-index:10;color:var(--c-body);font:13px -apple-system,"Apple SD Gothic Neo","Malgun Gothic",sans-serif;font-variant-numeric:tabular-nums;opacity:.75}
.impress-progressbar{position:fixed;left:0;right:0;bottom:0;height:3px;z-index:10}
.impress-progressbar div{width:0;height:100%;background:var(--c-accent);transition:width .5s}
.zc-preview #impress-toolbar,.zc-preview .impress-progress,.zc-preview .impress-progressbar{display:none!important}
/* 인터랙션: 객체 자체의 transform은 위치이므로, 효과는 안쪽 요소에 겁니다 */
.o[data-hover]>*{transition:transform .28s cubic-bezier(.2,.8,.2,1),filter .28s,opacity .28s}
.o[data-hover=grow]:hover>*{transform:scale(1.08)}
.o[data-hover=lift]:hover>*{transform:translateY(-6%)}
.o[data-hover=tilt]:hover>*{transform:rotate(-4deg)}
.o[data-hover=glow]:hover>*{filter:drop-shadow(0 0 .4em var(--c-accent))}
.o[data-hover=dim]>*{opacity:.5}.o[data-hover=dim]:hover>*{opacity:1}
.o[data-click]{cursor:pointer}
.o[data-vis]{transition:opacity .45s}.o[data-vis="0"]{opacity:0!important;pointer-events:none}
.o.fx-pulse>*{animation:fxPulse .5s}.o.fx-shake>*{animation:fxShake .5s}
.o.fx-in[data-enter=fade]>*{animation:fxFade .7s both}
.o.fx-in[data-enter=up]>*{animation:fxUp .7s cubic-bezier(.2,.8,.2,1) both}
.o.fx-in[data-enter=left]>*{animation:fxLeft .7s cubic-bezier(.2,.8,.2,1) both}
.o.fx-in[data-enter=zoom]>*{animation:fxZoom .6s cubic-bezier(.2,.8,.2,1) both}
@keyframes fxPulse{50%{transform:scale(1.12)}}
@keyframes fxShake{20%,60%{transform:translateX(-4%)}40%,80%{transform:translateX(4%)}}
@keyframes fxFade{from{opacity:0}}@keyframes fxUp{from{opacity:0;transform:translateY(18%)}}
@keyframes fxLeft{from{opacity:0;transform:translateX(-18%)}}@keyframes fxZoom{from{opacity:0;transform:scale(.6)}}
.zc-alert{position:fixed;inset:0;z-index:100;display:flex;align-items:center;justify-content:center;background:rgba(15,20,30,.35);font:15px -apple-system,"Apple SD Gothic Neo","Malgun Gothic",sans-serif}
.zc-alert>div{min-width:260px;max-width:min(520px,86vw);padding:22px 22px 16px;border-radius:14px;background:#fff;color:#20262e;box-shadow:0 18px 50px rgba(0,0,0,.3)}
.zc-alert p{margin:0 0 16px;white-space:pre-wrap;line-height:1.5}
.zc-alert button{float:right;padding:7px 18px;border:0;border-radius:8px;background:#2f6fed;color:#fff;font:inherit;cursor:pointer}
`;

const SHOW_RUNTIME = `
(function(){
/* 발표자 콘솔의 현재·다음 화면 안에서 실행 중인지: 콘솔은 '#step-1', 일반 실행은 '#/step-1' 주소를 씁니다 */
var preview=window.parent!==window&&location.hash.indexOf('#/')!==0;
if(preview)document.body.classList.add('zc-preview');
var data=JSON.parse(document.getElementById('zc-data').textContent);
document.querySelectorAll('[data-a]').forEach(function(el){var a=data.assets[el.getAttribute('data-a')];if(a)el.src=a;});
var api=impress();api.init();
/* 콘솔 미리보기는 '#step-3' 주소를 쓰므로 브라우저가 그 요소로 페이지를 스크롤해 화면이 어긋남.
   크롬은 file://을 다른 출처로 봐서 콘솔 쪽에서 되돌릴 수 없으니, 문서 스스로 스크롤을 0에 고정 */
var noScroll=function(){var b=document.body,d=document.documentElement;if(window.scrollX||window.scrollY)window.scrollTo(0,0);b.scrollTop=b.scrollLeft=d.scrollTop=d.scrollLeft=0;};
window.addEventListener('scroll',noScroll);
window.addEventListener('hashchange',function(){noScroll();setTimeout(noScroll,0);});
document.addEventListener('impress:stepenter',noScroll);
noScroll();setTimeout(noScroll,0);
if(preview)return;

function openConsole(){
  if(document.getElementById('impress-console-button'))return;
  impressConsole('impress').open();
}
function addTool(label,title,fn){
  var b=document.createElement('button');
  b.textContent=label;b.title=title;
  b.addEventListener('click',function(e){e.stopPropagation();fn();b.blur();});
  document.getElementById('impress-toolbar').dispatchEvent(new CustomEvent('impress:toolbar:appendChild',{bubbles:true,detail:{group:3,element:b}}));
}
addTool('전체','전체 보기 (O)',function(){api.goto('overview');});
addTool('노트','발표자 노트 (P)',openConsole);
/* 탐색기에서 고른 뒤 방향키가 목록이 아니라 발표를 움직이도록 */
document.addEventListener('change',function(e){if(e.target.id==='impress-navigation-ui-select')e.target.blur();});
/* 단계에 들어올 때: 차트 애니메이션, 객체 등장 효과(순서대로 조금씩 늦게)를 다시 재생 */
var replay=function(el,cls){el.classList.remove(cls);void el.offsetWidth;el.classList.add(cls);};
document.addEventListener('impress:stepenter',function(e){
  var id=e.target.id;
  document.querySelectorAll('.o-chart[data-step="'+id+'"]').forEach(function(el){replay(el,'play');});
  document.querySelectorAll('.o[data-enter][data-step="'+id+'"]').forEach(function(el,i){
    [].forEach.call(el.children,function(c){c.style.animationDelay=(i*.12)+'s';});
    replay(el,'fx-in');
  });
});
/* 누르면: 슬라이드 이동·다음·이전·링크·다른 객체 보이기/숨기기·펄스·흔들기 */
function fxClick(o){
  var k=o.getAttribute('data-click'),t=o.getAttribute('data-target');
  if(k==='goto'&&t)api.goto(t);
  else if(k==='next')api.next();
  else if(k==='prev')api.prev();
  else if(k==='url'){var u=o.getAttribute('data-url')||'';if(u.indexOf('http://')===0||u.indexOf('https://')===0)window.open(u,'_blank','noopener');}
  else if(k==='toggle'){var el=document.querySelector('.o[data-id="'+t+'"]');if(el)el.setAttribute('data-vis',el.getAttribute('data-vis')==='0'?'1':'0');}
  else if(k==='pulse'||k==='shake')replay(o,'fx-'+k);
  else if(k==='code')runCode(o);
}
/* 사용자 자바스크립트: el(누른 객체), api(impress), byName('레이어 이름'), fx(요소,'pulse'|'shake')를 넘겨 실행 */
function byName(n){return document.querySelector('.o[data-name="'+String(n).replace(/["\\\\]/g,'')+'"]');}
function showErr(msg){
  var b=document.createElement('div');b.textContent='스크립트 오류: '+msg;
  b.style.cssText='position:fixed;left:50%;top:14px;transform:translateX(-50%);z-index:99;padding:8px 14px;border-radius:8px;background:#c62828;color:#fff;font:13px sans-serif';
  document.body.appendChild(b);setTimeout(function(){b.remove();},4000);
}
/* alert 대신 쓰는 화면 안 알림창: 격리된 테스트 실행·전체 화면에서도 보입니다 (브라우저 alert는 여기서 막힘) */
function uiAlert(msg){
  closeAlert();
  var w=document.createElement('div');w.className='zc-alert';
  var box=document.createElement('div'),p=document.createElement('p'),b=document.createElement('button');
  p.textContent=String(msg);b.textContent='확인';
  box.appendChild(p);box.appendChild(b);w.appendChild(box);
  /* 닫는 클릭이 아래 발표 화면의 '이동' 클릭으로 번지지 않게 막음 */
  w.addEventListener('click',function(e){e.stopPropagation();if(e.target===w||e.target===b)closeAlert();});
  document.body.appendChild(w);b.focus();
}
function closeAlert(){var a=document.querySelector('.zc-alert');if(a)a.remove();}
function runCode(o,attr){
  attr=attr||'data-code';
  var code=o.getAttribute(attr)||'';
  if(!code.trim()){showErr('누르면 실행할 코드가 비어 있습니다 — 편집기에서 입력하세요');return;}
  try{new Function('el','api','byName','fx','alert',code)(o,api,byName,function(el,k){if(el)replay(el,'fx-'+k);},uiAlert);}
  catch(err){console.error(err);showErr(err.message);}
}
/* 단계에 들어올 때 실행할 코드 (객체가 속한 단계마다) */
document.addEventListener('impress:stepenter',function(e){
  document.querySelectorAll('.o[data-oncode][data-step="'+e.target.id+'"]').forEach(function(el){runCode(el,'data-oncode');});
});

document.addEventListener('click',function(e){
  if(e.target.closest('.zc-alert,.mv-canvas'))return;   // 알림창 클릭·3D 모델 돌리기는 화면 이동으로 넘기지 않음
  var fo=e.target.closest('.o[data-click]');
  if(fo){fxClick(fo);return;}
  if(e.target.closest('a,video,iframe,#impress-toolbar,#impress-console-button'))return;
  var cur=document.querySelector('.step.active'),o=e.target.closest('.o[data-step]');
  if(o){if(cur&&cur.id===o.getAttribute('data-step'))api.next();else api.goto(o.getAttribute('data-step'));return;}
  if(cur&&cur.id==='overview')api.next();else api.goto('overview');
});
/* 한글 입력 상태에서는 keyCode가 80이 아니므로 물리 키(e.code)로 판단 */
var isP=function(e){return e.code==='KeyP'&&!e.metaKey&&!e.ctrlKey&&!e.altKey;};
document.addEventListener('keydown',function(e){
  if(document.querySelector('.zc-alert')&&(e.key==='Escape'||e.key==='Enter')){e.preventDefault();e.stopPropagation();closeAlert();return;}
  if(isP(e)&&!e.repeat){e.preventDefault();openConsole();return;}
  if(e.key==='Escape'&&window.parent!==window)window.parent.postMessage({type:'zc-exit'},'*');
  if(e.key==='Home'||e.code==='KeyO')api.goto('overview');
});
window.addEventListener('keyup',function(e){if(isP(e))e.stopPropagation();},true);
})();
`;

/* 발표 스크립트는 문자열로 들어가므로 편집기에서 문법을 미리 확인 (깨지면 발표 전체가 멈춤) */
try { new Function(SHOW_RUNTIME); } catch (err) { console.error('발표 런타임 문법 오류:', err); setTimeout(() => toast('발표 스크립트에 오류가 있습니다 — 콘솔을 확인하세요'), 500); }

/* 인터랙션 프리셋 (발표 화면에서만 동작). [값, 이름] */
const FX_TYPES = ['text', 'shape', 'image', 'table', 'chart'];
const FX_HOVER = [['none', '없음'], ['grow', '살짝 커지기'], ['lift', '위로 뜨기'], ['tilt', '기울기'], ['glow', '빛나기'], ['dim', '흐리다가 선명하게']];
const FX_CLICK = [['none', '없음'], ['goto', '슬라이드로 이동'], ['next', '다음 단계'], ['prev', '이전 단계'], ['url', '링크 열기'], ['toggle', '다른 객체 보이기/숨기기'], ['pulse', '두근거리기'], ['shake', '흔들기'], ['code', '자바스크립트 실행']];
const objHasCode = o => (o.click === 'code' && String(o.clickCode || '').trim()) || String(o.enterCode || '').trim();
const hasCode = d => d.objects.some(objHasCode);
const FX_ENTER = [['none', '없음'], ['fade', '나타나기'], ['up', '아래에서 올라오기'], ['left', '왼쪽에서 들어오기'], ['zoom', '커지며 나타나기']];

function usedAssets() {
  const out = {};
  doc.objects.forEach(o => {
    if (o.asset && doc.assets[o.asset]) out[o.asset] = doc.assets[o.asset];
    if (o.thumbA && doc.assets[o.thumbA]) out[o.thumbA] = doc.assets[o.thumbA];   // 3D 모델 스냅샷
  });
  return out;
}
function stepAttrs(r) {
  const n = v => Math.round(v * 1000) / 1000;
  const scale = Math.max(r.w / doc.W, r.h / doc.H);
  return `data-x="${n(r.x)}" data-y="${n(r.y)}" data-z="${n(r.z || 0)}" data-rotate-x="${n(r.rx || 0)}" data-rotate-y="${n(r.ry || 0)}" data-rotate-z="${n(r.r || 0)}" data-scale="${scale.toFixed(5)}"`;
}
/* 객체를 클릭했을 때 확대할 단계: 자신이 경로에 있으면 자신, 아니면 감싸는 가장 작은 경로 프레임 */
function stepForObject(o) {
  const own = doc.path.indexOf(o.id);
  if (own >= 0) return 'step-' + (own + 1);
  let best = null, area = Infinity;
  doc.path.forEach((id, i) => {
    const f = getObj(id);
    if (!f || f.type !== 'frame' || !containsPoint(f, o.x, o.y, o.z)) return;
    const a = f.w * f.h * f.s * f.s;
    if (a < area) { area = a; best = 'step-' + (i + 1); }
  });
  return best;
}

function buildShowHTML() {
  const srcOf = o => o.asset ? `data-a="${esc(o.asset)}"` : (o.src ? `src="${esc(o.src)}"` : '');
  /* 보이기/숨기기 대상은 data-vis로 표시 (처음엔 숨김이면 0) */
  const toggled = new Set(doc.objects.filter(o => o.click === 'toggle' && o.clickTarget).map(o => o.clickTarget));
  const objs = doc.objects.map(o => {
    const st = o.type === 'frame' || o.type === 'video' ? null : stepForObject(o);
    let extra = st ? ` data-step="${st}"` : '';
    if (FX_TYPES.includes(o.type)) {
      if (FX_HOVER.some(([k]) => k === o.hover) && o.hover !== 'none') extra += ` data-hover="${o.hover}"`;
      if (FX_ENTER.some(([k]) => k === o.enter) && o.enter !== 'none') extra += ` data-enter="${o.enter}"`;
      if (String(o.enterCode || '').trim()) extra += ` data-oncode="${esc(o.enterCode)}"`;
      if (FX_CLICK.some(([k]) => k === o.click) && o.click !== 'none') {
        let target = '';
        if (o.click === 'goto') { const i = doc.path.indexOf(o.clickTarget); target = i >= 0 ? `step-${i + 1}` : ''; }
        if (o.click === 'toggle') target = getObj(o.clickTarget) ? o.clickTarget : '';
        if (!((o.click === 'goto' || o.click === 'toggle') && !target)) {
          extra += ` data-click="${o.click}"`;
          if (target) extra += ` data-target="${esc(target)}"`;
          if (o.click === 'url') extra += ` data-url="${esc(o.clickUrl || '')}"`;
          if (o.click === 'code') extra += ` data-code="${esc(o.clickCode || '')}"`;
        }
      }
    }
    if (toggled.has(o.id) || o.fxHidden) extra += ` data-vis="${o.fxHidden ? 0 : 1}"`;
    if (o.name) extra += ` data-name="${esc(o.name)}"`;   // 스크립트에서 byName('이름')으로 찾기
    return objHTML(o, 'show', srcOf, extra);
  }).join('\n');
  const steps = doc.path.map((id, i) => {
    const o = getObj(id);
    const notes = o.notes ? `<div class="notes">${esc(o.notes).replace(/\n/g, '<br>')}</div>` : '';
    return `<div id="step-${i + 1}" class="step" title="${esc(`${i + 1}. ${stepTitle(o).slice(0, 34)}`)}" ${stepAttrs(regionOf(o))}>${notes}</div>`;
  }).join('\n');
  const data = JSON.stringify({ ...doc, assets: usedAssets() }).replace(/</g, '\\u003c');
  const impressSrc = $('#impress-src').textContent;
  /* 3D 모델이 있을 때만 three.js(CDN)를 불러오는 모듈을 넣음. 오프라인이면 스냅샷이 그대로 보임 */
  const has3D = doc.objects.some(o => o.type === 'model' && o.asset);
  const head3D = has3D ? `<script type="importmap">{"imports":{"three":"${MV.three}","three/addons/":"${MV.addons}"}}<\/script>` : '';
  const run3D = has3D ? `<script type="module">${modelRuntime().replace(/<\/script/gi, '<\\/script')}<\/script>` : '';
  const runEmb = doc.objects.some(o => o.type === 'embed') ? `<script>${embedRuntime().replace(/<\/script/gi, '<\\/script')}<\/script>` : '';
  return `<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(doc.title)}</title>
<style>:root{${themeVars()};--pw:${doc.W}px;--ph:${doc.H}px}${OBJ_CSS}${SHOW_CSS}</style>${head3D}</head>
<body class="impress-not-supported">
<div id="impress" data-width="${doc.W}" data-height="${doc.H}" data-transition-duration="${doc.duration}" data-max-scale="4" data-min-scale="0" data-perspective="${doc.perspective}">
${objs}
<div id="overview" class="step" title="전체 보기" ${stepAttrs(overviewRegion())}></div>
${steps}
</div>
<div id="impress-toolbar"></div>
<div class="impress-progressbar"><div></div></div>
<div class="impress-progress"></div>
<script type="application/json" id="zc-data">${data}<\/script>
<script>${impressSrc}<\/script>
<script>${SHOW_RUNTIME}<\/script>
${runEmb}
${run3D}
</body></html>`;
}

/* ── PDF: 슬라이드(경로 단계)마다 한 페이지. 브라우저 인쇄의 'PDF로 저장'을 쓰므로 글자가 벡터로 남습니다 ── */
function buildPrintHTML() {
  const W = doc.W, H = doc.H;
  const regions = (doc.path.length ? doc.path.map(id => getObj(id)).filter(Boolean).map(regionOf) : [overviewRegion()]);
  const srcOf = o => o.asset && doc.assets[o.asset] ? `src="${esc(doc.assets[o.asset])}"` : (o.src ? `src="${esc(o.src)}"` : '');
  const pages = regions.map(r => {
    const k = Math.min(W / r.w, H / r.h), d = doc.perspective / k, reach = Math.hypot(r.w, r.h) / 2;
    /* 이 슬라이드 근처 객체만 (발표 시작 때 숨겨지는 객체는 제외) */
    const objs = doc.objects.filter(o => !o.fxHidden && Math.hypot(o.x - r.x, o.y - r.y) < reach + Math.hypot(o.w, o.h) * o.s / 2);
    return `<section class="page"><div class="pw" style="transform:translate(${W / 2}px,${H / 2}px) scale(${k}) perspective(${d}px) rotateZ(${-(r.r || 0)}deg) rotateY(${-(r.ry || 0)}deg) rotateX(${-(r.rx || 0)}deg) translate3d(${-r.x}px,${-r.y}px,${-(r.z || 0)}px)">${objs.map(o => objHTML(o, 'print', srcOf)).join('')}</div></section>`;
  }).join('\n');
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>${esc(doc.title)}</title>
<style>:root{${themeVars()}}${OBJ_CSS}
@page{size:${W}px ${H}px;margin:0}
html,body{margin:0;padding:0;background:var(--c-bg)}
*{-webkit-print-color-adjust:exact;print-color-adjust:exact}
.page{position:relative;width:${W}px;height:${H}px;overflow:hidden;background:var(--c-bg);break-after:page;page-break-after:always}
.page:last-child{break-after:auto;page-break-after:auto}
.pw{position:absolute;left:0;top:0;transform-origin:0 0;transform-style:preserve-3d}
</style></head><body>${pages}</body></html>`;
}
async function exportPDF() {
  if (editing) endEdit();
  const n = doc.path.length || 1;
  toast(`슬라이드 ${n}장을 PDF로 준비하는 중… 인쇄 창에서 'PDF로 저장'을 고르세요`);
  const f = document.createElement('iframe');
  f.style.cssText = `position:fixed;left:-${doc.W + 100}px;top:0;width:${doc.W}px;height:${doc.H}px;border:0`;
  document.body.appendChild(f);
  await new Promise(res => { f.onload = res; f.srcdoc = buildPrintHTML(); });
  const d = f.contentDocument;
  /* 이미지·글꼴이 다 그려진 뒤 인쇄 (안 그러면 빈 칸이 찍힘) */
  await Promise.all([...d.images].map(img => img.decode ? img.decode().catch(() => {}) : null));
  if (d.fonts && d.fonts.ready) await d.fonts.ready;
  const prevTitle = document.title;
  document.title = safeName();   // 크롬은 '저장' 파일 이름에 제목을 씁니다
  f.contentWindow.focus();
  f.contentWindow.print();
  document.title = prevTitle;
  setTimeout(() => f.remove(), 1000);
}

function download(name, blob) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}
const safeName = () => (doc.title || 'canvas').replace(/[\\/:*?"<>|]+/g, '_');
function exportHTML() {
  download(safeName() + '.html', new Blob([buildShowHTML()], { type: 'text/html' }));
  toast('독립 실행형 HTML을 내보냈습니다');
}
function saveJSON() {
  download(safeName() + '.json', new Blob([JSON.stringify({ ...doc, assets: usedAssets() })], { type: 'application/json' }));
  toast('JSON으로 저장했습니다');
}

/* 예전 impress 편집기 JSON(슬라이드 카드 방식)을 새 구조로 변환 */
function convertLegacy(old) {
  const d = newDoc();
  d.W = old.slideW || 1920; d.H = old.slideH || 1080;
  (old.slides || []).forEach(s => {
    const x = s.ix || 0, y = -(s.iy || 0), sc = s.iscale || 1, rot = s.irz || 0;
    const d3 = { z: s.iz || 0, rx: s.irx || 0, ry: s.iry || 0 };
    const f = makeObj('frame', { frame: 'hidden', ...d3, x, y, w: d.W, h: d.H, s: sc, rot, notes: s.notes && s.notes !== '<number>' ? s.notes : '' });
    d.objects.push(f); d.path.push(f.id);
    const m = /^\s*<img[^>]*src=["']([^"']+)["']/i.exec(s.body || '');
    if (m) d.objects.push(makeObj('image', { ...d3, x, y, w: d.W, h: d.H, s: sc, rot, src: m[1] }));
    else {
      if (s.title) d.objects.push(makeObj('text', { ...d3, x, y: y - d.H * .22 * sc, s: sc, rot, html: esc(s.title), style: 'title', fs: 90, fw: 800, align: 'center' }));
      if (s.body) d.objects.push(makeObj('text', { ...d3, x, y: y + d.H * .1 * sc, s: sc, rot, html: clean(s.body), style: 'body', align: 'center' }));
    }
  });
  if (old.overviewZoom) d.overview = { x: old.overviewX || 0, y: -(old.overviewY || 0), w: d.W * old.overviewZoom, h: d.H * old.overviewZoom, r: 0, rx: 0, ry: 0 };
  return d;
}
function parseDocText(text, name) {
  if (/\.html?$/i.test(name) || /^\s*</.test(text)) {
    const node = new DOMParser().parseFromString(text, 'text/html').getElementById('zc-data');
    if (!node) throw new Error('이 편집기에서 내보낸 HTML이 아닙니다');
    text = node.textContent;
  }
  const data = JSON.parse(text);
  if (Array.isArray(data.objects)) {
    /* 구조 검증: 알려진 종류만, id는 영숫자만, 숫자 칸은 숫자로 (HTML 속성 주입 방지) */
    const TYPES = ['frame', 'text', 'image', 'shape', 'video', 'table', 'chart', 'connector', 'ink', 'model', 'embed'];
    const NUMS = ['x', 'y', 'z', 'w', 'h', 's', 'rot', 'rx', 'ry', 'opacity', 'fs', 'fw', 'sw', 'radius', 'speed', 'yaw', 'pitch', 'zoom', 'exposure'];
    const HEX = /^#[0-9a-f]{6}$/i;
    const safeId = v => String(v ?? '').replace(/[^\w-]/g, '');
    data.objects = data.objects.filter(o => o && TYPES.includes(o.type));
    data.objects.forEach(o => {
      o.id = safeId(o.id) || uid();
      NUMS.forEach(k => { if (k in o) { const v = +o[k]; o[k] = Number.isFinite(v) ? v : (k === 's' || k === 'opacity' ? 1 : 0); } });
      if (o.p && typeof o.p === 'object') Object.keys(o.p).forEach(k => { const v = +o.p[k]; if (Number.isFinite(v)) o.p[k] = v; else delete o.p[k]; });
      if (o.type === 'connector') { o.from = safeId(o.from); o.to = safeId(o.to); }
      if (o.type === 'embed') {
        /* HTML은 sandbox iframe에서만 실행되므로 내용은 그대로 두고, 종류·주소만 검증 */
        o.mode = o.mode === 'url' ? 'url' : 'html';
        o.html = String(o.html || ''); o.srcName = String(o.srcName || ''); o.lazy = !!o.lazy;
        o.url = /^https?:\/\/[^\s]+$/i.test(String(o.url || '').trim()) ? String(o.url).trim() : '';
      }
      if (o.type === 'model') {
        o.asset = safeId(o.asset); o.thumbA = safeId(o.thumbA) || null; o.srcName = String(o.srcName || '');
        o.bg = HEX.test(o.bg) ? o.bg : null;
        o.partNames = (Array.isArray(o.partNames) ? o.partNames : []).map(n => String(n)).slice(0, 400);
        const parts = {};
        Object.entries(o.parts && typeof o.parts === 'object' ? o.parts : {}).forEach(([k, p]) => {
          if (!/^\d+$/.test(k) || !p || typeof p !== 'object') return;
          parts[k] = { h: !!p.h, ...(HEX.test(p.c) ? { c: p.c } : {}), ...(Number.isFinite(+p.o) && p.o != null ? { o: Math.min(1, Math.max(0, +p.o)) } : {}) };
        });
        o.parts = parts;
      }
      /* 인터랙션 값은 목록에 있는 것만, 링크는 http(s)만 */
      const pick = (v, list) => list.some(([k]) => k === v) ? v : 'none';
      if ('hover' in o) o.hover = pick(o.hover, FX_HOVER);
      if ('click' in o) o.click = pick(o.click, FX_CLICK);
      if ('enter' in o) o.enter = pick(o.enter, FX_ENTER);
      if ('clickTarget' in o) o.clickTarget = safeId(o.clickTarget);
      if ('clickUrl' in o) o.clickUrl = /^https?:\/\//i.test(String(o.clickUrl)) ? String(o.clickUrl) : '';
      if ('clickCode' in o) o.clickCode = String(o.clickCode || '');
      if ('enterCode' in o) o.enterCode = String(o.enterCode || '');
      if ('name' in o) o.name = String(o.name || '');
    });
    data.path = (Array.isArray(data.path) ? data.path : []).map(safeId);
    ['W', 'H', 'duration', 'perspective', 'theme'].forEach(k => { if (k in data) { const v = +data[k]; data[k] = Number.isFinite(v) ? v : newDoc()[k]; } });
    /* 불러온 파일의 글은 모두 살균: 글상자·도형 안 글·표 칸 */
    data.objects.forEach(o => {
      if (o.type === 'text') o.html = clean(o.html);
      if (o.type === 'shape' && o.text) o.text = clean(o.text);
      if (o.type === 'table') o.rows = (Array.isArray(o.rows) ? o.rows : [['']]).map(r => (Array.isArray(r) ? r : ['']).map(c => clean(c)));
      /* 경로 문자열은 숫자·명령 글자만 허용 (속성 주입 방지) */
      if (o.type === 'connector' || o.type === 'ink') o.d = String(o.d || '').replace(/[^MLCQZHVAmlcqzhva0-9.,\s-]/g, '');
      if (o.type === 'chart') { o.data = (Array.isArray(o.data) ? o.data : [['', '']]).map(r => (Array.isArray(r) ? r : ['']).map(c => String(c ?? ''))); o.title = String(o.title || ''); }
    });
    return Object.assign(newDoc(), data);
  }
  if (Array.isArray(data.slides) && data.slides.some(s => 'ix' in s)) return convertLegacy(data);
  throw new Error('알 수 없는 파일 형식입니다');
}
