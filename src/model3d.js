/* model3d.js — 3D 모델 객체 (three.js).
   · 모든 형식은 불러올 때 GLB 하나로 바꿔 저장합니다 (STEP/IGES/STL/OBJ → GLB).
   · 편집 화면에는 스냅샷 이미지만 보여 줍니다 (WebGL 하나를 돌려 쓰므로 모델이 많아도 안전).
   · 발표 화면에서는 지금 슬라이드의 모델만 실시간으로 돌리고, 나가면 WebGL을 해제합니다.
   라이브러리는 버전을 고정한 CDN에서 처음 쓸 때만 불러옵니다. */
const MV = {
  three: 'https://cdn.jsdelivr.net/npm/three@0.187.0/build/three.module.js',
  addons: 'https://cdn.jsdelivr.net/npm/three@0.187.0/examples/jsm/',
  draco: 'https://cdn.jsdelivr.net/npm/three@0.187.0/examples/jsm/libs/draco/gltf/',
  occt: 'https://cdn.jsdelivr.net/npm/occt-import-js@0.0.23/dist/',
};
const MODEL_EXT = ['glb', 'gltf', 'stl', 'obj', 'step', 'stp', 'iges', 'igs'];

/* ── 공유: 편집기와 발표 화면 양쪽에서 쓰는 함수 (발표 파일에는 toString()으로 들어감) ── */
function mvCfg(o) {
  return { w: o.w, h: o.h, bg: o.bg || null, spin: !!o.spin, speed: o.speed ?? 1, anim: o.anim !== false, yaw: o.yaw ?? 30, pitch: o.pitch ?? 20, zoom: o.zoom || 1, exposure: o.exposure ?? 1, parts: o.parts || {} };
}
async function mvLibs() {
  if (!window.__mvLibs) window.__mvLibs = Promise.all([
    import('three'), import('three/addons/loaders/GLTFLoader.js'), import('three/addons/loaders/DRACOLoader.js'),
    import('three/addons/environments/RoomEnvironment.js'), import('three/addons/controls/OrbitControls.js'),
  ]).then(([T, G, D, R, O]) => ({ THREE: T, GLTFLoader: G.GLTFLoader, DRACOLoader: D.DRACOLoader, RoomEnvironment: R.RoomEnvironment, OrbitControls: O.OrbitControls }));
  return window.__mvLibs;
}
async function mvParse(buf, dracoPath) {
  const L = await mvLibs(), loader = new L.GLTFLoader(), draco = new L.DRACOLoader();
  draco.setDecoderPath(dracoPath); loader.setDRACOLoader(draco);
  try { return await new Promise((res, rej) => loader.parse(buf, '', res, rej)); }
  finally { draco.dispose(); }
}
/* 장면 구성: 모델 중심을 원점에, 카메라는 각도(yaw·pitch)·확대(zoom)로. 부품별 숨김·색·투명도 적용 */
function mvStage(L, gltf, cfg, w, h, renderer) {
  const T = L.THREE, scene = new T.Scene(), model = gltf.scene;
  const pm = new T.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(new L.RoomEnvironment(), 0.04).texture; pm.dispose();
  scene.background = cfg.bg ? new T.Color(cfg.bg) : null;
  model.position.set(0, 0, 0); model.rotation.set(0, 0, 0); model.updateMatrixWorld(true);
  const box = new T.Box3().setFromObject(model), c = box.getCenter(new T.Vector3());
  const r = box.isEmpty() ? 1 : box.getBoundingSphere(new T.Sphere()).radius || 1;
  model.position.sub(c);
  const pivot = new T.Group(); pivot.add(model); scene.add(pivot);
  const sun = new T.DirectionalLight(0xffffff, 1.4); sun.position.set(r * 2, r * 3, r * 2); scene.add(sun);
  scene.add(new T.HemisphereLight(0xffffff, 0x50565f, 0.5));
  const cam = new T.PerspectiveCamera(35, w / h, r / 200, r * 200);
  mvAim(cam, cfg, r);
  const meshes = [];
  model.traverse(m => { if (m.isMesh) meshes.push(m); });
  meshes.forEach((m, i) => {
    if (!m.userData.mat0) m.userData.mat0 = m.material;
    const p = cfg.parts[i];
    m.visible = !(p && p.h);
    m.material = m.userData.mat0;
    if (p && (p.c || (p.o != null && p.o < 1))) {
      const mt = Array.isArray(m.material) ? m.material.map(x => x.clone()) : m.material.clone();
      [].concat(mt).forEach(x => { if (p.c && x.color) x.color.set(p.c); if (p.o != null && p.o < 1) { x.transparent = true; x.opacity = p.o; x.depthWrite = false; } });
      m.material = mt;
    }
  });
  renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = cfg.exposure;
  renderer.outputColorSpace = T.SRGBColorSpace;
  let mixer = null;
  if (cfg.anim && gltf.animations && gltf.animations.length) { mixer = new T.AnimationMixer(model); gltf.animations.forEach(a => mixer.clipAction(a).play()); }
  return { scene, cam, pivot, r, meshes, mixer };
}
function mvAim(cam, cfg, r) {
  const yaw = cfg.yaw * Math.PI / 180, pitch = cfg.pitch * Math.PI / 180;
  const d = r / Math.sin(cam.fov * Math.PI / 360) / (cfg.zoom || 1);
  cam.position.set(d * Math.cos(pitch) * Math.sin(yaw), d * Math.sin(pitch), d * Math.cos(pitch) * Math.cos(yaw));
  cam.lookAt(0, 0, 0); cam.updateProjectionMatrix();
}
/* 실시간 보기: host 안에 캔버스를 만들어 돌림. stop()으로 WebGL을 반드시 해제 */
function mvLive(L, gltf, cfg, host, pixelRatio, opts) {
  const T = L.THREE, renderer = new T.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(pixelRatio); renderer.setSize(cfg.w, cfg.h, false);
  const cv = renderer.domElement;
  cv.className = 'mv-canvas'; cv.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;display:block';
  host.appendChild(cv);
  const S = mvStage(L, gltf, cfg, cfg.w, cfg.h, renderer);
  let ctl = null;
  if (opts.orbit) {
    ctl = new L.OrbitControls(S.cam, cv);
    ctl.enableDamping = true; ctl.enablePan = !!opts.pan; ctl.target.set(0, 0, 0);
    ctl.autoRotate = cfg.spin && !opts.noSpin; ctl.autoRotateSpeed = cfg.speed * 2;
  }
  const clock = new T.Clock();
  renderer.setAnimationLoop(() => {
    const dt = clock.getDelta();
    if (S.mixer) S.mixer.update(dt);
    if (ctl) ctl.update(); else if (cfg.spin && !opts.noSpin) S.pivot.rotation.y += dt * cfg.speed * 0.5;
    renderer.render(S.scene, S.cam);
  });
  return {
    S,
    /* 지금 카메라 위치를 각도·확대값으로 (미리보기에서 '이 각도로 저장') */
    view() {
      const p = S.cam.position, d = p.length();
      return { yaw: Math.round(Math.atan2(p.x, p.z) * 180 / Math.PI), pitch: Math.round(Math.asin(p.y / d) * 180 / Math.PI), zoom: +(S.r / Math.sin(S.cam.fov * Math.PI / 360) / d).toFixed(3) };
    },
    stop() { renderer.setAnimationLoop(null); if (ctl) ctl.dispose(); renderer.dispose(); renderer.forceContextLoss(); cv.remove(); },
  };
}

/* ── 편집기 전용 ── */
const mvCache = {};   // 자산 id → 파싱한 glTF (스냅샷용)
const mvGLTF = id => (mvCache[id] = mvCache[id] || fetch(doc.assets[id]).then(r => r.arrayBuffer()).then(b => mvParse(b, MV.draco)));
let mvSnapRenderer = null;
async function modelSnapshot(o) {
  const L = await mvLibs(), g = await mvGLTF(o.asset);
  const k = Math.min(1, 900 / Math.max(o.w, o.h)), w = Math.round(o.w * k), h = Math.round(o.h * k);
  if (!mvSnapRenderer) mvSnapRenderer = new L.THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  const R = mvSnapRenderer;
  R.setPixelRatio(1); R.setSize(w, h, false);
  const S = mvStage(L, g, { ...mvCfg(o), w, h }, w, h, R);
  if (S.mixer) S.mixer.update(0);
  R.render(S.scene, S.cam);
  return { url: R.domElement.toDataURL('image/webp', 0.9), names: S.meshes.map((m, i) => (m.name || (m.parent && m.parent.name) || '').slice(0, 40) || `부품 ${i + 1}`) };
}
/* 스냅샷 줄: 설정이 바뀐 모델만 다시 그림 (한 번에 하나씩) */
const snapQ = new Set();
let snapBusy = false;
function queueSnap(o) { snapQ.add(o.id); runSnaps(); }
async function runSnaps() {
  if (snapBusy) return;
  snapBusy = true;
  try {
    while (snapQ.size) {
      const id = snapQ.values().next().value;
      snapQ.delete(id);
      const o = getObj(id);
      if (!o || o.type !== 'model' || !doc.assets[o.asset]) continue;
      const sig = JSON.stringify(mvCfg(o));
      try {
        const { url, names } = await modelSnapshot(o);
        const a = 'a' + uid();
        doc.assets[a] = url; assetURL[a] = url;
        o.thumbA = a; o.thumbSig = sig; o.partNames = names.slice(0, 400);
        renderObj(o); changed();
        if (sel.includes(o.id) && !$('#props .parts')) renderProps();
      } catch (err) {
        console.warn(err);
        toast('3D 미리보기를 만들지 못했습니다 (인터넷 연결 확인): ' + err.message);
      }
    }
  } finally { snapBusy = false; }
}
function checkSnaps() { doc.objects.forEach(o => { if (o.type === 'model' && o.thumbSig !== JSON.stringify(mvCfg(o))) queueSnap(o); }); }

const loadScript = src => new Promise((res, rej) => {
  const s = document.createElement('script');
  s.src = src; s.onload = res; s.onerror = () => rej(new Error('불러오지 못했습니다: ' + src));
  document.head.appendChild(s);
});
async function toGLB(object3d) {
  const { GLTFExporter } = await import('three/addons/exporters/GLTFExporter.js');
  return new Blob([await new GLTFExporter().parseAsync(object3d, { binary: true })], { type: 'model/gltf-binary' });
}
/* CAD(STEP·IGES) → 메시. 변환기(약 7.6MB)는 이때 처음 한 번만 내려받습니다 */
async function cadToGroup(buf, ext) {
  if (!window.occtimportjs) await loadScript(MV.occt + 'occt-import-js.js');
  const occt = await window.occtimportjs({ locateFile: f => MV.occt + f });
  const params = { linearUnit: 'millimeter', linearDeflectionType: 'bounding_box_ratio', linearDeflection: 0.001, angularDeflection: 0.5 };
  const data = new Uint8Array(buf);
  const res = ext === 'step' || ext === 'stp' ? occt.ReadStepFile(data, params) : occt.ReadIgesFile(data, params);
  if (!res || !res.success || !res.meshes.length) throw new Error('CAD 파일에서 형상을 읽지 못했습니다');
  const { THREE: T } = await mvLibs(), group = new T.Group();
  res.meshes.forEach((m, i) => {
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(m.attributes.position.array, 3));
    if (m.attributes.normal) g.setAttribute('normal', new T.Float32BufferAttribute(m.attributes.normal.array, 3));
    if (m.index) g.setIndex(Array.from(m.index.array));
    if (!m.attributes.normal) g.computeVertexNormals();
    const col = m.color ? new T.Color(m.color[0], m.color[1], m.color[2]) : new T.Color(0x9aa7b8);
    const mesh = new T.Mesh(g, new T.MeshStandardMaterial({ color: col, metalness: 0.35, roughness: 0.45 }));
    mesh.name = m.name || `부품 ${i + 1}`;
    group.add(mesh);
  });
  group.rotation.x = -Math.PI / 2;   // CAD는 Z가 위, three.js는 Y가 위
  return group;
}
async function meshToGroup(buf, ext, text) {
  const { THREE: T } = await mvLibs();
  if (ext === 'stl') {
    const { STLLoader } = await import('three/addons/loaders/STLLoader.js');
    const g = new STLLoader().parse(buf), mesh = new T.Mesh(g, new T.MeshStandardMaterial({ color: 0x9aa7b8, metalness: 0.3, roughness: 0.5 }));
    if (!g.attributes.normal) g.computeVertexNormals();
    const grp = new T.Group(); grp.add(mesh); grp.rotation.x = -Math.PI / 2; return grp;
  }
  const { OBJLoader } = await import('three/addons/loaders/OBJLoader.js');
  return new OBJLoader().parse(text);
}
/* 파일 → GLB Blob (glb는 그대로). gltf는 파일 하나에 다 들어 있는 경우만 */
async function fileToGLB(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  if (ext === 'glb') return file;
  const buf = await file.arrayBuffer();
  if (ext === 'gltf') {
    const g = await mvParse(buf, MV.draco).catch(() => { throw new Error('외부 파일을 참조하는 .gltf는 열 수 없습니다. .glb로 내보내 주세요'); });
    return toGLB(g.scene);
  }
  if (ext === 'stl' || ext === 'obj') return toGLB(await meshToGroup(buf, ext, ext === 'obj' ? new TextDecoder().decode(buf) : ''));
  return toGLB(await cadToGroup(buf, ext));
}
async function addModelFile(file, at) {
  const ext = file.name.split('.').pop().toLowerCase();
  if (!MODEL_EXT.includes(ext)) { toast('지원하는 3D 형식: GLB · glTF · STL · OBJ · STEP · IGES'); return; }
  const cad = ['step', 'stp', 'iges', 'igs'].includes(ext);
  toast(cad ? 'CAD 파일을 변환하는 중… (처음엔 변환기 내려받기로 시간이 걸립니다)' : '3D 모델을 불러오는 중…');
  try {
    const blob = await fileToGLB(file);
    if (blob.size > 40e6) toast('모델이 커서 발표 파일도 그만큼 커집니다');
    const id = await addAsset(blob);
    const w = 960, h = 640, s = vw * .5 / w / cam.z;
    const o = insertObj(makeObj('model', { ...(at || onView(viewCenter())), asset: id, srcName: file.name, w, h, s }));
    select([o.id]); commit();
    queueSnap(o);
  } catch (err) {
    console.error(err);
    toast('3D 모델을 불러오지 못했습니다: ' + err.message);
  }
}

/* ── 미리보기 창: 마우스로 돌려 보고 '이 각도로 저장' ── */
let mvPreview = null;
async function openModelPreview() {
  const o = selObjs().find(x => x.type === 'model');
  if (!o) return;
  const d = $('#mdlg'), host = $('#mv-host');
  const W = Math.min(760, innerWidth - 80), H = Math.round(Math.min(W * o.h / o.w, innerHeight - 220));
  host.style.width = W + 'px'; host.style.height = H + 'px';
  host.innerHTML = '<p class="note mv-wait">불러오는 중…</p>';
  d.showModal();
  try {
    const L = await mvLibs();
    const buf = await fetch(doc.assets[o.asset]).then(r => r.arrayBuffer());
    const g = await mvParse(buf, MV.draco);   // 스냅샷과 장면을 공유하지 않도록 따로 파싱
    if (!d.open) return;
    host.innerHTML = '';
    mvPreview = { o, v: mvLive(L, g, { ...mvCfg(o), w: W, h: H }, host, devicePixelRatio || 1, { orbit: true, noSpin: true }) };
  } catch (err) { host.innerHTML = `<p class="note warn">불러오지 못했습니다: ${esc(err.message)}</p>`; }
}
function closeModelPreview(save) {
  if (mvPreview) {
    if (save) { Object.assign(mvPreview.o, mvPreview.v.view()); commit(); renderProps(); }
    mvPreview.v.stop(); mvPreview = null;
  }
  $('#mv-host').innerHTML = '';
  if ($('#mdlg').open) $('#mdlg').close();
}

/* ── 발표 화면용 실행 코드 (모듈 스크립트로 들어감) ── */
function modelRuntime() {
  return `const MV=${JSON.stringify(MV)};
${mvCfg}
${mvLibs}
${mvParse}
${mvStage}
${mvAim}
${mvLive}
const data=JSON.parse(document.getElementById('zc-data').textContent),cache={},live={};
const gltfFor=id=>(cache[id]=cache[id]||fetch(data.assets[id]).then(r=>r.arrayBuffer()).then(b=>mvParse(b,MV.draco)));
async function start(el){
  const id=el.getAttribute('data-id');if(live[id])return;
  const o=data.objects.find(x=>x.id===id);if(!o||!data.assets[o.asset])return;
  live[id]='wait';
  try{
    const L=await mvLibs(),g=await gltfFor(o.asset);
    if(live[id]!=='wait')return;
    const r=el.getBoundingClientRect(),pr=Math.min(3,Math.max(1,r.width/o.w*(window.devicePixelRatio||1)));
    live[id]=mvLive(L,g,mvCfg(o),el,pr,{orbit:!!o.orbit});el.classList.add('mv-on');
  }catch(e){console.warn('3D 모델을 띄우지 못했습니다 (인터넷 연결 필요). 스냅샷을 대신 보여 줍니다.',e);delete live[id];}
}
function stop(el){const id=el.getAttribute('data-id'),v=live[id];if(v&&v.stop)v.stop();delete live[id];el.classList.remove('mv-on');}
const els=s=>document.querySelectorAll('.o-model[data-step="'+s+'"]');
document.addEventListener('impress:stepenter',e=>els(e.target.id).forEach(start));
document.addEventListener('impress:stepleave',e=>els(e.target.id).forEach(stop));
const cur=document.querySelector('.step.active');if(cur)els(cur.id).forEach(start);`;
}
