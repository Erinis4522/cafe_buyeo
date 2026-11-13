// 알바생의 학습
// 1) 레시피: 점장이 넣은 재료 순서를 그대로 기억한다(규칙 기억).
// 2) 그림: 여러 번 보여 준 그림의 위치·크기를 맞춘 뒤 겹쳐서, 자주 겹치는 부분을 대표 모양으로 만든다(예시로 배우기).

const LEARN = (() => {
  const N = 96;           // 격자 크기
  const LINE = 0.075;     // 학습용 선 두께(0..1 기준, 화면보다 조금 굵게)

  function allPoints(strokes) {
    const pts = [];
    for (const s of strokes) {
      for (let i = 0; i < s.length; i++) {
        pts.push(s[i]);
        if (i > 0) { // 선분 사이를 촘촘히 채워 점이 몰린 곳에 끌려가지 않게
          const [x0, y0] = s[i - 1], [x1, y1] = s[i];
          const d = Math.hypot(x1 - x0, y1 - y0), k = Math.floor(d / 0.01);
          for (let j = 1; j < k; j++) pts.push([x0 + (x1 - x0) * j / k, y0 + (y1 - y0) * j / k]);
        }
      }
    }
    return pts;
  }

  // 위치(무게중심)와 크기(평균 반지름)를 측정
  function measure(strokes) {
    const pts = allPoints(strokes);
    let cx = 0, cy = 0;
    for (const p of pts) { cx += p[0]; cy += p[1]; }
    cx /= pts.length; cy /= pts.length;
    let r = 0;
    for (const p of pts) r += (p[0] - cx) ** 2 + (p[1] - cy) ** 2;
    r = Math.sqrt(r / pts.length) || 0.1;
    return { cx, cy, r };
  }

  // 가운데로 옮기고 크기를 targetR로 맞춘 획
  function normalize(strokes, targetR) {
    const { cx, cy, r } = measure(strokes);
    const k = targetR / r;
    return strokes.map(s => s.map(([x, y]) => [0.5 + (x - cx) * k, 0.5 + (y - cy) * k]));
  }

  function rasterize(strokes) {
    const c = document.createElement('canvas'); c.width = c.height = N;
    const g = c.getContext('2d');
    g.scale(N, N);
    g.lineCap = 'round'; g.lineJoin = 'round'; g.lineWidth = LINE; g.strokeStyle = '#fff'; g.fillStyle = '#fff';
    for (const s of strokes) {
      g.beginPath();
      if (s.length === 1) { g.arc(s[0][0], s[0][1], LINE / 2, 0, 6.283); g.fill(); continue; }
      g.moveTo(s[0][0], s[0][1]);
      for (let i = 1; i < s.length; i++) g.lineTo(s[i][0], s[i][1]);
      g.stroke();
    }
    const d = g.getImageData(0, 0, N, N).data;
    const out = new Float32Array(N * N);
    for (let i = 0; i < N * N; i++) out[i] = d[i * 4 + 3] / 255;
    return blur(blur(out, 2), 2);
  }

  function blur(src, r) { // 가로·세로 상자 흐림
    const tmp = new Float32Array(N * N), out = new Float32Array(N * N), w = 2 * r + 1;
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      let s = 0; for (let k = -r; k <= r; k++) { const xx = Math.min(N - 1, Math.max(0, x + k)); s += src[y * N + xx]; }
      tmp[y * N + x] = s / w;
    }
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      let s = 0; for (let k = -r; k <= r; k++) { const yy = Math.min(N - 1, Math.max(0, y + k)); s += tmp[yy * N + x]; }
      out[y * N + x] = s / w;
    }
    return out;
  }

  function iou(a, b, th = 0.3) {
    let inter = 0, uni = 0;
    for (let i = 0; i < a.length; i++) { const p = a[i] > th, q = b[i] > th; if (p && q) inter++; if (p || q) uni++; }
    return uni ? inter / uni : 0;
  }

  // drawings: [{strokes}] → 대표 모양
  function consensus(drawings) {
    const sizes = drawings.map(d => measure(d.strokes).r);
    const targetR = sizes.reduce((a, b) => a + b, 0) / sizes.length;
    const norms = drawings.map(d => normalize(d.strokes, targetR));
    const rasters = norms.map(rasterize);
    const avg = new Float32Array(N * N);
    for (const r of rasters) for (let i = 0; i < avg.length; i++) avg[i] += r[i] / rasters.length;
    let sum = 0, cnt = 0;
    for (let i = 0; i < rasters.length; i++) for (let j = i + 1; j < rasters.length; j++) { sum += iou(rasters[i], rasters[j]); cnt++; }
    const consistency = cnt ? sum / cnt : 1;
    // 겹친 정도 지도를 보기 좋게 다시 맞춤(가장 진한 곳 = 1)
    let mx = 0; for (const v of avg) mx = Math.max(mx, v);
    const grid = new Float32Array(N * N);
    for (let i = 0; i < N * N; i++) grid[i] = mx ? avg[i] / mx : 0;
    return { grid, n: N, consistency, norms };
  }

  function grade(consistency) {
    if (consistency >= 0.36) return 'good';
    if (consistency >= 0.2) return 'ok';
    return 'bad';
  }

  // 겹친 모습(열지도)을 캔버스로
  function heatCanvas(grid, n) {
    const c = document.createElement('canvas'); c.width = c.height = n;
    const g = c.getContext('2d'); const img = g.createImageData(n, n);
    for (let i = 0; i < n * n; i++) {
      const v = grid[i];
      img.data[i * 4] = 255; img.data[i * 4 + 1] = Math.round(230 - 120 * v); img.data[i * 4 + 2] = Math.round(140 - 120 * v);
      img.data[i * 4 + 3] = Math.round(Math.min(1, v * 1.4) * 255);
    }
    g.putImageData(img, 0, 0); return c;
  }

  // 라떼 아트 점수(0~100): 좌우 대칭이 잘 맞고, 크기가 알맞을수록 높다.
  // 하트·튤립·곰돌이처럼 라떼 아트 모양은 대부분 좌우 대칭이라 '예쁨'의 기준으로 쓴다.
  function artScore(art) {
    if (!art) return 0;
    if (art.type === 'template') return CONFIG.templateScore;
    let r, th = 0.3, sizeF = 1;
    if (art.type === 'strokes') {
      const pts = art.strokes.reduce((a, s) => a + s.length, 0);
      if (pts < 4) return 0;
      const m = measure(art.strokes);
      if (m.r < 0.03) return 10;
      sizeF = m.r < 0.07 ? 0.65 : m.r < 0.1 ? 0.85 : m.r > 0.34 ? 0.85 : 1;
      r = rasterize(normalize(art.strokes, 0.17));
    } else { r = art.grid; th = 0.5; }
    const mir = new Float32Array(N * N);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) mir[y * N + x] = r[y * N + (N - 1 - x)];
    const sym = iou(r, mir, th);
    const t = Math.max(0, Math.min(1, (sym - 0.15) / 0.6));
    return Math.round((20 + 80 * t) * sizeF);
  }

  return { consensus, grade, heatCanvas, measure, artScore, N };
})();
