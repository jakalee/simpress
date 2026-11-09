/* chart.js — 라이브러리 없이 SVG로 그리는 차트. 확대해도 선명하고 내보낸 파일에 그대로 들어갑니다.
   데이터는 표 형태 2차원 배열: 첫 행 = [가로축 이름, 계열1, 계열2…], 이후 행 = [항목, 값, 값…] */
const CHART_KINDS = [['bar', '막대'], ['hbar', '가로 막대'], ['stack', '누적'], ['line', '꺾은선'], ['area', '영역'], ['pie', '원'], ['donut', '도넛'], ['scatter', '산점도']];
const CHART_PAL = ['var(--c-accent)', '#e8833a', '#3fa36b', '#8a5cd0', '#d64b5f', '#2bb0b8', '#c9a227', '#6b7a8f'];
const CHART_MAX_POINTS = 1500;   // 이보다 많으면 구간별 최소·최대만 남겨 그립니다

/* 문자열 전체가 숫자일 때만 숫자 ('1분기'는 숫자가 아님). 천 단위 쉼표·%·공백은 허용 */
const numOf = s => { const t = String(s ?? '').replace(/[,\s%]/g, ''); return /^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(t) ? +t : NaN; };
/* 엑셀에서 복사한 범위(탭 구분)와 CSV(쉼표 구분)를 모두 받습니다 */
function parseGrid(text) {
  const lines = String(text || '').replace(/\r/g, '').split('\n').filter(l => l.trim());
  const tab = lines.some(l => l.includes('\t'));
  return lines.map(l => (tab ? l.split('\t') : l.split(',')).map(c => c.trim()));
}
const gridText = rows => rows.map(r => r.join('\t')).join('\n');

function chartData(o) {
  const rows = (o.data || []).filter(r => Array.isArray(r) && r.length);
  const head = rows[0] || ['', ''], body = rows.slice(1);
  const nSeries = Math.max(1, head.length - 1);
  const series = Array.from({ length: nSeries }, (_, k) => ({ name: head[k + 1] || `계열 ${k + 1}`, vals: body.map(r => numOf(r[k + 1])) }));
  const cats = body.map(r => r[0] ?? '');
  const xs = cats.map(numOf), xnum = cats.length > 1 && xs.every(Number.isFinite);
  return { head, cats, xs, xnum, series };
}
/* 보기 좋은 눈금: 1·2·5 × 10^n 간격 */
function niceTicks(lo, hi, count = 5) {
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) { lo = 0; hi = 1; }
  if (lo === hi) { const d = Math.abs(lo) * .1 || 1; lo -= d; hi += d; }
  const raw = (hi - lo) / count, p = 10 ** Math.floor(Math.log10(raw)), m = raw / p;
  const step = (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * p;
  const a = Math.floor(lo / step + 1e-9) * step, b = Math.ceil(hi / step - 1e-9) * step, out = [];
  for (let v = a; v <= b + step * 1e-6; v += step) out.push(Math.round(v / step) * step);
  return out;
}
const chartFmt = v => {
  if (!Number.isFinite(v)) return '';
  const a = Math.abs(v);
  return a >= 1e5 ? v.toLocaleString('ko-KR', { maximumFractionDigits: 0 }) : a >= 100 ? (+v.toFixed(1)).toLocaleString('ko-KR') : String(+v.toPrecision(3));
};
/* 점이 아주 많으면 구간마다 최소·최대 두 점만 남김 (파형 모양은 유지) */
function thinIdx(n, xsOf, ys) {
  if (n <= CHART_MAX_POINTS) return [...Array(n).keys()];
  const buckets = CHART_MAX_POINTS / 2, size = n / buckets, out = [];
  for (let b = 0; b < buckets; b++) {
    const s = Math.floor(b * size), e = Math.min(n, Math.floor((b + 1) * size));
    let mn = s, mx = s;
    for (let i = s; i < e; i++) { if (ys[i] < ys[mn]) mn = i; if (ys[i] > ys[mx]) mx = i; }
    out.push(Math.min(mn, mx)); if (mn !== mx) out.push(Math.max(mn, mx));
  }
  return out;
}

function chartSVG(o) {
  const w = o.w, h = o.h, fs = o.fs || 28, D = chartData(o), kind = o.kind || 'bar';
  const font = esc(FONTS[o.font] || FONTS.sans), ink = 'var(--c-body)', pal = k => CHART_PAL[k % CHART_PAL.length];
  const T = (x, y, s, attrs = '', size = fs * .78) => `<text x="${r2(x)}" y="${r2(y)}" font-size="${r2(size)}" ${attrs}>${esc(s)}</text>`;
  let top = fs * .5, out = '';
  if (o.title) { out += T(w / 2, fs * 1.15, o.title, `text-anchor="middle" font-weight="700" fill="var(--c-title)"`, fs * 1.1); top = fs * 1.9; }
  const pieLike = kind === 'pie' || kind === 'donut';
  /* 범례: 위쪽 한 줄 (원·도넛은 항목, 나머지는 계열) */
  const legendItems = pieLike ? D.cats : D.series.map(s => s.name);
  if (o.legend !== false && (pieLike || D.series.length > 1)) {
    const sz = fs * .66, gap = fs * 1.1, widths = legendItems.map(n => sz * 1.4 + String(n).length * sz * .62 + gap);
    let x = (w - widths.reduce((a, b) => a + b, 0) + gap) / 2;
    legendItems.forEach((n, k) => {
      out += `<rect x="${r2(x)}" y="${r2(top + sz * .1)}" width="${r2(sz * .9)}" height="${r2(sz * .9)}" rx="${r2(sz * .2)}" fill="${pal(k)}"/>` + T(x + sz * 1.25, top + sz * .9, n, `fill="${ink}"`, sz);
      x += widths[k];
    });
    top += sz * 2;
  }
  const play = o.anim !== false ? ' ca' : '';
  if (pieLike) {
    const vals = (D.series[0]?.vals || []).map(v => Math.max(0, v || 0)), sum = vals.reduce((a, b) => a + b, 0) || 1;
    const cx = w / 2, cy = (top + h) / 2, R = Math.max(10, Math.min(w, h - top) / 2 - fs * .4), r0 = kind === 'donut' ? R * .56 : 0;
    let a = -Math.PI / 2;
    vals.forEach((v, k) => {
      const da = v / sum * Math.PI * 2;
      if (da <= 0) return;
      const a1 = a + Math.min(da, Math.PI * 2 - 1e-4), large = da > Math.PI ? 1 : 0;
      const P = (rr, t) => `${r2(cx + rr * Math.cos(t))},${r2(cy + rr * Math.sin(t))}`;
      const d = r0 ? `M${P(R, a)}A${r2(R)},${r2(R)} 0 ${large} 1 ${P(R, a1)}L${P(r0, a1)}A${r2(r0)},${r2(r0)} 0 ${large} 0 ${P(r0, a)}Z`
        : `M${r2(cx)},${r2(cy)}L${P(R, a)}A${r2(R)},${r2(R)} 0 ${large} 1 ${P(R, a1)}Z`;
      out += `<path class="cs${play}" style="transform-origin:${r2(cx)}px ${r2(cy)}px;animation-delay:${k * .08}s" d="${d}" fill="${pal(k)}" stroke="var(--c-bg)" stroke-width="${r2(fs * .08)}"/>`;
      if (o.labels !== false && v / sum >= .04) {
        const m = a + da / 2, lr = r0 ? (R + r0) / 2 : R * .64;
        out += T(cx + lr * Math.cos(m), cy + lr * Math.sin(m) + fs * .26, Math.round(v / sum * 100) + '%', `text-anchor="middle" font-weight="700" fill="#fff"`);
      }
      a += da;
    });
    return `<svg viewBox="0 0 ${w} ${h}" font-family="${font}">${out}</svg>`;
  }

  /* 축이 있는 차트 */
  const horiz = kind === 'hbar', stack = kind === 'stack', scatter = kind === 'scatter', lineLike = kind === 'line' || kind === 'area';
  const numX = scatter || (lineLike && D.xnum);
  let vals = D.series.flatMap(s => s.vals).filter(Number.isFinite);
  if (stack) vals = D.cats.map((_, i) => D.series.reduce((a, s) => a + Math.max(0, s.vals[i] || 0), 0));
  let lo = Math.min(...vals), hi = Math.max(...vals);
  if (!vals.length) { lo = 0; hi = 1; }
  if (!scatter && !lineLike) { lo = Math.min(0, lo); hi = Math.max(0, hi); }
  else if (lo > 0 && lo < (hi - lo) * .6) lo = 0;
  const ticks = niceTicks(lo, hi), vmin = ticks[0], vmax = ticks[ticks.length - 1];
  const labW = Math.max(...ticks.map(t => chartFmt(t).length)) * fs * .48 + fs * .5;
  const catW = horiz ? Math.max(...D.cats.map(c => String(c).length), 2) * fs * .5 + fs * .5 : 0;
  const L = horiz ? catW : labW, R0 = w - fs * .6, Tp = top + fs * .3, B = h - fs * 1.4;
  const pw = Math.max(10, R0 - L), ph = Math.max(10, B - Tp);
  const vy = v => B - (v - vmin) / (vmax - vmin || 1) * ph;          // 값 → 세로 위치
  const vx = v => L + (v - vmin) / (vmax - vmin || 1) * pw;          // 값 → 가로 위치(가로 막대)
  /* 격자와 값 눈금 */
  ticks.forEach(t => {
    if (horiz) {
      if (o.grid !== false) out += `<line x1="${r2(vx(t))}" y1="${r2(Tp)}" x2="${r2(vx(t))}" y2="${r2(B)}" stroke="${ink}" stroke-opacity=".16"/>`;
      out += T(vx(t), B + fs * .95, chartFmt(t), `text-anchor="middle" fill="${ink}"`);
    } else {
      if (o.grid !== false) out += `<line x1="${r2(L)}" y1="${r2(vy(t))}" x2="${r2(R0)}" y2="${r2(vy(t))}" stroke="${ink}" stroke-opacity=".16"/>`;
      out += T(L - fs * .3, vy(t) + fs * .27, chartFmt(t), `text-anchor="end" fill="${ink}"`);
    }
  });
  const n = D.cats.length || 1;
  /* 가로축 위치: 숫자 x면 실제 값, 아니면 항목 칸의 가운데 */
  let xmin = 0, xmax = 1, xt = [];
  /* 숫자 가로축은 데이터 범위에 딱 맞추고, 눈금은 그 안쪽만 (파형이 축 끝까지 차도록) */
  if (numX) { const xv = D.xs.filter(Number.isFinite); xmin = Math.min(...xv); xmax = Math.max(...xv); xt = niceTicks(xmin, xmax, 6).filter(t => t >= xmin - 1e-9 && t <= xmax + 1e-9); }
  const px = i => numX ? L + (D.xs[i] - xmin) / (xmax - xmin || 1) * pw : L + (i + .5) * pw / n;
  if (numX) xt.forEach(t => {
    const x = L + (t - xmin) / (xmax - xmin || 1) * pw;
    if (o.grid !== false) out += `<line x1="${r2(x)}" y1="${r2(Tp)}" x2="${r2(x)}" y2="${r2(B)}" stroke="${ink}" stroke-opacity=".1"/>`;
    out += T(x, B + fs * .95, chartFmt(t), `text-anchor="middle" fill="${ink}"`);
  });
  else {
    const every = Math.max(1, Math.ceil(n / Math.max(1, Math.floor((horiz ? ph : pw) / (fs * 3.2)))));
    D.cats.forEach((c, i) => {
      if (i % every) return;
      if (horiz) out += T(L - fs * .3, Tp + (i + .5) * ph / n + fs * .27, c, `text-anchor="end" fill="${ink}"`);
      else out += T(px(i), B + fs * .95, c, `text-anchor="middle" fill="${ink}"`);
    });
  }
  out += horiz ? `<line x1="${r2(L)}" y1="${r2(Tp)}" x2="${r2(L)}" y2="${r2(B)}" stroke="${ink}" stroke-opacity=".5" stroke-width="2"/>`
    : `<line x1="${r2(L)}" y1="${r2(vy(Math.max(vmin, Math.min(0, vmax))))}" x2="${r2(R0)}" y2="${r2(vy(Math.max(vmin, Math.min(0, vmax))))}" stroke="${ink}" stroke-opacity=".5" stroke-width="2"/>`;

  const ns = D.series.length, lab = (x, y, v, anchor = 'middle') => o.labels ? T(x, y, chartFmt(v), `text-anchor="${anchor}" fill="${ink}" font-weight="600"`, fs * .62) : '';
  if (kind === 'bar' || horiz || stack) {
    const band = (horiz ? ph : pw) / n, bw = stack ? band * .62 : band * .72 / ns;
    D.cats.forEach((_, i) => {
      let acc = 0;
      D.series.forEach((s, k) => {
        const v = s.vals[i];
        if (!Number.isFinite(v)) return;
        const delay = `animation-delay:${(i * .04 + k * .06).toFixed(2)}s`;
        if (horiz) {
          const y = Tp + i * band + band * .14 + k * bw, x0 = vx(Math.max(vmin, 0)), x1 = vx(v);
          out += `<rect class="cbh${play}" style="${delay}" x="${r2(Math.min(x0, x1))}" y="${r2(y)}" width="${r2(Math.abs(x1 - x0))}" height="${r2(bw * .92)}" fill="${pal(k)}"/>` + lab(Math.max(x0, x1) + fs * .2, y + bw * .7, v, 'start');
        } else if (stack) {
          const v0 = acc, v1 = acc + Math.max(0, v); acc = v1;
          const x = L + i * band + (band - bw) / 2;
          out += `<rect class="cb${play}" style="${delay}" x="${r2(x)}" y="${r2(vy(v1))}" width="${r2(bw)}" height="${r2(vy(v0) - vy(v1))}" fill="${pal(k)}"/>`;
          if (k === ns - 1) out += lab(x + bw / 2, vy(v1) - fs * .25, v1);
        } else {
          const x = L + i * band + band * .14 + k * bw, y0 = vy(Math.max(vmin, Math.min(0, vmax))), y1 = vy(v);
          out += `<rect class="cb${play}" style="${delay}" x="${r2(x)}" y="${r2(Math.min(y0, y1))}" width="${r2(bw * .92)}" height="${r2(Math.abs(y0 - y1))}" fill="${pal(k)}"/>` + lab(x + bw * .46, Math.min(y0, y1) - fs * .25, v);
        }
      });
    });
  } else {
    D.series.forEach((s, k) => {
      const ok = [...Array(n).keys()].filter(i => Number.isFinite(s.vals[i]) && (!numX || Number.isFinite(D.xs[i])));
      const idx = thinIdx(ok.length, null, ok.map(i => s.vals[i])).map(j => ok[j]);
      const pts = idx.map(i => [r2(px(i)), r2(vy(s.vals[i]))]);
      if (scatter) {
        pts.forEach(([x, y], j) => { out += `<circle class="cd${play}" style="animation-delay:${Math.min(1, j * .01).toFixed(2)}s" cx="${x}" cy="${y}" r="${r2(fs * .22)}" fill="${pal(k)}" fill-opacity=".85"/>`; });
        return;
      }
      if (!pts.length) return;
      const d = 'M' + pts.map(p => p.join(',')).join('L');
      if (kind === 'area') out += `<path class="ca-fill${play}" d="${d}L${pts[pts.length - 1][0]},${r2(B)}L${pts[0][0]},${r2(B)}Z" fill="${pal(k)}" fill-opacity=".18"/>`;
      out += `<path class="cl${play}" pathLength="1" d="${d}" fill="none" stroke="${pal(k)}" stroke-width="${r2(fs * .12)}" stroke-linejoin="round" stroke-linecap="round"/>`;
      if (pts.length <= 40) pts.forEach(([x, y], j) => { out += `<circle cx="${x}" cy="${y}" r="${r2(fs * .16)}" fill="var(--c-bg)" stroke="${pal(k)}" stroke-width="${r2(fs * .08)}"/>` + lab(+x, y - fs * .4, s.vals[idx[j]]); });
    });
  }
  return `<svg viewBox="0 0 ${w} ${h}" font-family="${font}">${out}</svg>`;
}
