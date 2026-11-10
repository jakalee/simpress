/* embed.js — 웹 임베드 객체 (iframe).
   · HTML 파일: 내용을 문서 안에 넣어 실행 (오프라인 가능, 내보낸 파일 하나에 포함). 한 파일로 완결된 HTML만 됩니다.
   · URL: 임베드를 허용하는 사이트만 보입니다.
   · 둘 다 sandbox iframe으로 실행되어 편집기 데이터에 손대지 못합니다.
   · 편집 화면에는 자리표시만, 발표 화면에서는 그 슬라이드에 들어올 때만 불러옵니다. */
const P5_URL = 'https://cdn.jsdelivr.net/npm/p5@1.11.13/lib/p5.min.js';
/* 예제 HTML (p5): 단진자 · 파동 · 입자 · 3상 회전 자계 · 빈 스케치 */
const EMBED_EXAMPLES = {
  pendulum: {
    name: '단진자',
    params: [['length', '줄 길이', 0.3, 1, 0.01, 0.8], ['gravity', '중력', 0.1, 3, 0.05, 1], ['damping', '감쇠', 0, 0.02, 0.0005, 0.002], ['angle', '처음 각도(°)', 5, 170, 1, 60]],
    code: `let a, v = 0;
function setup() {
  createCanvas(W, H);
  a = P.angle * PI / 180;
}
function draw() {
  background(255);
  const ox = width / 2, oy = height * 0.1, L = min(width, height) * 0.8 * P.length;
  v = (v - P.gravity * 0.004 * sin(a)) * (1 - P.damping);
  a += v;
  const x = ox + L * sin(a), y = oy + L * cos(a);
  stroke(70); strokeWeight(4); line(ox, oy, x, y);
  noStroke(); fill(47, 111, 237); circle(x, y, min(width, height) * 0.1);
  fill(70); circle(ox, oy, 14);
  textSize(height * 0.045); text('θ = ' + (a * 180 / PI).toFixed(1) + '°', 24, height - 24);
}`,
  },
  wave: {
    name: '파동',
    params: [['amp', '진폭', 0.1, 1, 0.01, 0.7], ['wavelength', '파장', 0.1, 1.5, 0.01, 0.5], ['speed', '속도', 0, 3, 0.05, 1], ['standing', '정상파 보기(0/1)', 0, 1, 1, 0]],
    code: `let t = 0;
function setup() { createCanvas(W, H); }
function draw() {
  background(255);
  const A = height * 0.3 * P.amp, k = TWO_PI / (width * P.wavelength), m = height / 2;
  stroke(225); strokeWeight(2); line(0, m, width, m);
  noFill(); strokeWeight(4);
  stroke(47, 111, 237);
  beginShape(); for (let x = 0; x <= width; x += 4) vertex(x, m - A * sin(k * x - t)); endShape();
  if (P.standing > 0.5) {
    stroke(232, 131, 58);
    beginShape(); for (let x = 0; x <= width; x += 4) vertex(x, m - A * sin(k * x) * cos(t)); endShape();
  }
  t += P.speed * 0.05;
}`,
  },
  particles: {
    name: '입자',
    params: [['count', '개수', 10, 400, 10, 120], ['gravity', '중력', 0, 2, 0.05, 0.6], ['speed', '속도', 0.2, 4, 0.1, 1.5]],
    code: `let ps = [];
function setup() {
  createCanvas(W, H);
  for (let i = 0; i < P.count; i++) ps.push({ x: random(width), y: random(height * 0.5), vx: random(-2, 2), vy: random(-1, 1) });
}
function draw() {
  background(255, 70);
  noStroke(); fill(47, 111, 237, 190);
  for (const q of ps) {
    q.vy += P.gravity * 0.1;
    q.x += q.vx * P.speed; q.y += q.vy * P.speed;
    if (q.x < 0 || q.x > width) q.vx *= -1;
    if (q.y > height) { q.y = height; q.vy *= -0.85; }
    circle(q.x, q.y, min(width, height) * 0.02);
  }
}`,
  },
  rotfield: {
    name: '회전 자계 (3상)',
    params: [['freq', '주파수', 0.1, 3, 0.05, 1], ['parts', '상별 자계 보기(0/1)', 0, 1, 1, 1]],
    code: `let t = 0;
const cols = [[214, 75, 95], [63, 163, 107], [47, 111, 237]];
function setup() { createCanvas(W, H); }
function draw() {
  background(255);
  const cx = width / 2, cy = height / 2 - height * 0.04, R = min(width, height) * 0.3;
  noFill(); stroke(228); strokeWeight(2); circle(cx, cy, R * 3);
  let sx = 0, sy = 0;
  for (let k = 0; k < 3; k++) {
    const ax = k * TWO_PI / 3;                      // 코일 축 방향 (120°씩)
    const m = cos(P.freq * 0.04 * t - k * TWO_PI / 3); // 그 상의 전류 = 자계 크기
    const x = R * m * cos(ax), y = R * m * sin(ax);
    sx += x; sy += y;
    stroke(cols[k][0], cols[k][1], cols[k][2], 80); strokeWeight(2);
    line(cx - R * cos(ax), cy - R * sin(ax), cx + R * cos(ax), cy + R * sin(ax));
    if (P.parts > 0.5) arrowTo(cx, cy, cx + x, cy + y, cols[k], 4);
  }
  arrowTo(cx, cy, cx + sx, cy + sy, [30, 30, 30], 7); // 합성 자계: 크기 일정(1.5배), 방향만 회전
  noStroke(); fill(70); textSize(height * 0.045);
  text('합성 자계 크기 = 상 하나 최대값의 ' + (Math.hypot(sx, sy) / R).toFixed(2) + '배', 24, height - 24);
  t += 1;
}
function arrowTo(x1, y1, x2, y2, c, sw) {
  stroke(c[0], c[1], c[2]); strokeWeight(sw); line(x1, y1, x2, y2);
  const a = atan2(y2 - y1, x2 - x1), h = sw * 3.2;
  noStroke(); fill(c[0], c[1], c[2]);
  triangle(x2, y2, x2 - h * cos(a - 0.45), y2 - h * sin(a - 0.45), x2 - h * cos(a + 0.45), y2 - h * sin(a + 0.45));
}`,
  },
  blank: {
    name: '빈 스케치',
    params: [['speed', '속도', 0, 3, 0.05, 1]],
    code: `function setup() {
  createCanvas(W, H);
}
function draw() {
  background(255);
  noStroke(); fill(47, 111, 237);
  circle(width / 2 + sin(frameCount * 0.03 * P.speed) * width * 0.3, height / 2, min(width, height) * 0.15);
}`,
  },
};
const exampleParams = k => Object.fromEntries(EMBED_EXAMPLES[k].params.map(([key, , , , , v]) => [key, v]));
/* 예제를 '혼자 실행되는 HTML 한 장'으로 (p5는 CDN). 값은 맨 위 P에서 바꿉니다 */
function exampleHTML(k) {
  const t = EMBED_EXAMPLES[k];
  const plines = t.params.map(([key, label, , , , v]) => `  ${key}: ${v},   // ${label}`).join('\n');
  return `<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><title>${t.name}</title>
<style>html,body{margin:0;overflow:hidden;background:#fff}canvas{display:block}</style>
<script src="${P5_URL}"><\/script></head>
<body><script>
// ${t.name} — 아래 값을 바꿔 보세요
const P = {
${plines}
};
const W = innerWidth, H = innerHeight;

${t.code}
<\/script></body></html>`;
}

/* ── 임베드 객체: HTML(문서 안에 포함) 또는 URL ── */
const EMBED_SB_HTML = 'allow-scripts allow-popups allow-forms allow-pointer-lock allow-modals';
const EMBED_SB_URL = 'allow-scripts allow-same-origin allow-popups allow-forms allow-pointer-lock allow-presentation allow-modals';
const isWebURL = u => /^https?:\/\/[^\s]+$/i.test(String(u || '').trim());
const embedHost = u => { try { return new URL(u).host; } catch (e) { return ''; } };
/* 상대 경로로 다른 파일을 부르는 HTML은 문서 안에서 깨지므로 미리 경고 */
function relativeRefs(html) {
  const refs = [...String(html).matchAll(/\b(?:src|href)\s*=\s*["']([^"'#]+)["']/gi)].map(m => m[1].trim())
    .filter(u => u && !/^(https?:|data:|blob:|mailto:|javascript:|\/\/)/i.test(u));
  return [...new Set(refs)];
}
function addEmbed(props) {
  const w = 960, h = 600;
  const o = insertObj(makeObj('embed', { ...onView(viewCenter()), w, h, s: vw * .5 / w / cam.z, ...props }));
  select([o.id]); commit();
  return o;
}
async function addEmbedFile(file) {
  const html = await file.text();
  if (html.length > 2e6) toast('HTML이 커서 저장 파일도 그만큼 커집니다');
  const refs = relativeRefs(html);
  addEmbed({ mode: 'html', html, srcName: file.name });
  if (refs.length) toast(`같은 폴더의 파일 ${refs.length}개(${refs.slice(0, 2).join(', ')}${refs.length > 2 ? ' …' : ''})는 불러올 수 없습니다. 한 파일로 합치거나 CDN 주소를 쓰세요`);
}
async function addEmbedURL() {
  const u = await ask({ title: '웹 페이지 임베드', msg: '임베드를 허용하는 사이트만 보입니다 (CodePen, p5 에디터 공유 링크, Desmos, GitHub Pages 등). 많은 포털·SNS는 막혀 있어 빈 칸이 됩니다.', input: 'https://…' });
  if (u === null) return;
  if (!isWebURL(u)) { toast('http:// 또는 https://로 시작하는 주소를 넣어 주세요'); return; }
  addEmbed({ mode: 'url', url: u.trim() });
}
/* 편집기 미리보기: 발표 화면과 같은 sandbox로 크게 띄움 */
function openEmbedPreview() {
  const o = selObjs().find(x => x.type === 'embed');
  if (!o) return;
  const host = $('#emb-host'), W = Math.min(820, innerWidth - 80), H = Math.round(Math.min(W * o.h / o.w, innerHeight - 200));
  host.style.width = W + 'px'; host.style.height = H + 'px';
  host.innerHTML = '';
  const f = document.createElement('iframe');
  f.setAttribute('sandbox', o.mode === 'url' ? EMBED_SB_URL : EMBED_SB_HTML);
  f.setAttribute('allow', 'autoplay; fullscreen; xr-spatial-tracking');
  f.style.cssText = 'width:100%;height:100%;border:0;display:block;background:#fff';
  if (o.mode === 'url') { if (!isWebURL(o.url)) { host.innerHTML = '<p class="note warn" style="padding:16px">주소가 올바르지 않습니다</p>'; } else f.src = o.url; }
  else f.srcdoc = o.html || '';
  if (f.src || f.srcdoc) host.appendChild(f);
  $('#edlg').showModal();
}
function closeEmbedPreview() { $('#emb-host').innerHTML = ''; if ($('#edlg').open) $('#edlg').close(); }

/* ── 발표 화면용 실행 코드: 슬라이드에 들어오면 불러오고 나가면 내림 (소리·CPU 정지) ── */
function embedRuntime() {
  return `(function(){
var SBH=${JSON.stringify(EMBED_SB_HTML)},SBU=${JSON.stringify(EMBED_SB_URL)};
var data=JSON.parse(document.getElementById('zc-data').textContent);
function web(u){u=String(u||'');return u.indexOf('http://')===0||u.indexOf('https://')===0;}
function start(el){
  if(el.querySelector('.emb-frame'))return;
  var id=el.getAttribute('data-id'),o=data.objects.find(function(x){return x.id===id;});if(!o)return;
  var f=document.createElement('iframe');f.className='emb-frame';
  f.setAttribute('sandbox',o.mode==='url'?SBU:SBH);f.setAttribute('allow','autoplay; fullscreen; xr-spatial-tracking');
  if(o.mode==='url'){if(!web(o.url))return;f.src=o.url;}else f.srcdoc=(o.html||'')+KEYFWD;
  el.appendChild(f);
}
/* 임베드 안을 클릭하면 키 포커스가 그 안으로 들어가므로, 리모컨 키(PageUp/PageDown)는 발표로 돌려줌 */
var KEYFWD='<scr'+'ipt>addEventListener("keydown",function(e){if(e.key==="PageDown"||e.key==="PageUp"){e.preventDefault();parent.postMessage({zcKey:e.key},"*");}},true);</scr'+'ipt>';
window.addEventListener('message',function(e){
  var d=e.data;if(!d||(d.zcKey!=='PageDown'&&d.zcKey!=='PageUp'))return;
  var ok=[].some.call(document.querySelectorAll('.emb-frame'),function(f){return f.contentWindow===e.source;});if(!ok)return;
  try{document.activeElement&&document.activeElement.blur();}catch(_){}
  if(window.impress){var a=impress();d.zcKey==='PageDown'?a.next():a.prev();}
});
function stop(el){[].forEach.call(el.querySelectorAll('.emb-frame'),function(x){x.remove();});}
var els=function(s){return document.querySelectorAll('.o-embed[data-step="'+s+'"]');};
document.addEventListener('impress:stepenter',function(e){[].forEach.call(els(e.target.id),start);});
document.addEventListener('impress:stepleave',function(e){[].forEach.call(els(e.target.id),stop);});
[].forEach.call(document.querySelectorAll('.o-embed:not([data-step])'),start);   // 어느 슬라이드에도 속하지 않으면 바로
var cur=document.querySelector('.step.active');if(cur)[].forEach.call(els(cur.id),start);
})();`;
}
try { new Function(embedRuntime()); } catch (err) { console.error('임베드 런타임 문법 오류:', err); }
