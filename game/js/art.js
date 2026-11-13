// 그림: 에셋 불러오기, 라떼 아트 그리기
// 배경과 인물·컵·재료·글자는 따로 놓는다(기획서 '아트 제작 구성').

const ART = (() => {

  // 배경·소품·재료 그림은 art 폴더의 선별 에셋을 assets/로 옮겨 쓴다.
  const IMG = {};
  function img(src) {
    if (!IMG[src]) { const im = new Image(); im.src = src; IMG[src] = im; }
    return IMG[src];
  }

  // ---------- 라떼 아트: 템플릿 모양(흰 거품으로 채움) ----------
  // ctx 좌표계: 0..1 (컵 표면 지름 기준)
  function heartPath(ctx, cx, cy, s) {
    ctx.moveTo(cx, cy + 0.32 * s);
    ctx.bezierCurveTo(cx - 0.12 * s, cy + 0.18 * s, cx - 0.42 * s, cy + 0.02 * s, cx - 0.36 * s, cy - 0.18 * s);
    ctx.bezierCurveTo(cx - 0.30 * s, cy - 0.36 * s, cx - 0.06 * s, cy - 0.34 * s, cx, cy - 0.16 * s);
    ctx.bezierCurveTo(cx + 0.06 * s, cy - 0.34 * s, cx + 0.30 * s, cy - 0.36 * s, cx + 0.36 * s, cy - 0.18 * s);
    ctx.bezierCurveTo(cx + 0.42 * s, cy + 0.02 * s, cx + 0.12 * s, cy + 0.18 * s, cx, cy + 0.32 * s);
    ctx.closePath();
  }

  function drawTemplate(ctx, id, surfaceDark) {
    ctx.save();
    ctx.fillStyle = '#fffaf1';
    ctx.strokeStyle = '#fffaf1';
    ctx.lineCap = 'round';
    if (id === 'heart') {
      ctx.beginPath(); heartPath(ctx, 0.5, 0.52, 1.0); ctx.fill();
    } else if (id === 'tulip') {
      ctx.beginPath(); heartPath(ctx, 0.5, 0.66, 0.46); ctx.fill();
      ctx.beginPath(); heartPath(ctx, 0.5, 0.48, 0.56); ctx.fill();
      ctx.save(); ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath(); ctx.ellipse(0.5, 0.36, 0.17, 0.05, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      ctx.beginPath(); heartPath(ctx, 0.5, 0.29, 0.5); ctx.fill();
      ctx.lineWidth = 0.022; ctx.beginPath(); ctx.moveTo(0.5, 0.2); ctx.lineTo(0.5, 0.86); ctx.stroke();
    } else if (id === 'leaf') {
      ctx.beginPath();
      ctx.moveTo(0.5, 0.14);
      ctx.bezierCurveTo(0.80, 0.30, 0.80, 0.64, 0.5, 0.84);
      ctx.bezierCurveTo(0.20, 0.64, 0.20, 0.30, 0.5, 0.14);
      ctx.fill();
      ctx.strokeStyle = surfaceDark; ctx.globalAlpha = 0.55; ctx.lineWidth = 0.018;
      for (let i = 0; i < 7; i++) {
        const y = 0.26 + i * 0.075, w = 0.10 + Math.sin((i + 1) / 8 * Math.PI) * 0.12;
        ctx.beginPath(); ctx.moveTo(0.5 - w, y - 0.05); ctx.quadraticCurveTo(0.5, y + 0.04, 0.5 + w, y - 0.05); ctx.stroke();
      }
      ctx.globalAlpha = 1; ctx.strokeStyle = '#fffaf1'; ctx.lineWidth = 0.02;
      ctx.beginPath(); ctx.moveTo(0.5, 0.16); ctx.lineTo(0.5, 0.92); ctx.stroke();
    } else if (id === 'bear') {
      ctx.beginPath(); ctx.arc(0.30, 0.30, 0.11, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(0.70, 0.30, 0.11, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(0.5, 0.54, 0.30, 0.27, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = surfaceDark;
      ctx.beginPath(); ctx.arc(0.30, 0.30, 0.05, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(0.70, 0.30, 0.05, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(0.40, 0.50, 0.03, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(0.60, 0.50, 0.03, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(0.5, 0.60, 0.04, 0.03, 0, 0, Math.PI * 2); ctx.fill();
      ctx.lineWidth = 0.014; ctx.strokeStyle = surfaceDark;
      ctx.beginPath(); ctx.moveTo(0.5, 0.63); ctx.quadraticCurveTo(0.46, 0.69, 0.42, 0.66); ctx.moveTo(0.5, 0.63); ctx.quadraticCurveTo(0.54, 0.69, 0.58, 0.66); ctx.stroke();
    }
    ctx.restore();
  }

  // 선(획) 그리기: points는 0..1 좌표
  function strokePaths(ctx, strokes, width) {
    ctx.save();
    ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = width;
    ctx.strokeStyle = '#fffaf1'; ctx.fillStyle = '#fffaf1';
    for (const s of strokes) {
      if (s.length === 1) { ctx.beginPath(); ctx.arc(s[0][0], s[0][1], width / 2, 0, Math.PI * 2); ctx.fill(); continue; }
      ctx.beginPath(); ctx.moveTo(s[0][0], s[0][1]);
      for (let i = 1; i < s.length - 1; i++) {
        const mx = (s[i][0] + s[i + 1][0]) / 2, my = (s[i][1] + s[i + 1][1]) / 2;
        ctx.quadraticCurveTo(s[i][0], s[i][1], mx, my);
      }
      const l = s[s.length - 1]; ctx.lineTo(l[0], l[1]); ctx.stroke();
    }
    ctx.restore();
  }

  const STROKE_W = 0.05;

  // 학습 결과(격자)를 거품 모양으로
  function gridCanvas(grid, n, lo = 0.42, hi = 0.62) {
    const c = document.createElement('canvas'); c.width = n; c.height = n;
    const g = c.getContext('2d'); const img = g.createImageData(n, n);
    for (let i = 0; i < n * n; i++) {
      let t = (grid[i] - lo) / (hi - lo); t = t < 0 ? 0 : t > 1 ? 1 : t; t = t * t * (3 - 2 * t);
      img.data[i * 4] = 255; img.data[i * 4 + 1] = 250; img.data[i * 4 + 2] = 241; img.data[i * 4 + 3] = Math.round(t * 255);
    }
    g.putImageData(img, 0, 0); return c;
  }

  // 아트만 따로(투명 배경) 그리기
  function artLayer(art, size, drink, progress = 1) {
    const c = document.createElement('canvas'); c.width = c.height = size;
    const g = c.getContext('2d');
    if (!art) return c;
    g.save(); g.scale(size, size);
    if (art.type === 'template') drawTemplate(g, art.id, drink.dark);
    else if (art.type === 'strokes') strokePaths(g, art.strokes, STROKE_W);
    else if (art.type === 'grid') { g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high'; g.drawImage(gridCanvas(art.grid, art.n), 0, 0, 1, 1); }
    g.restore();
    if (progress < 1) { // 가운데부터 퍼지는 연출
      g.globalCompositeOperation = 'destination-in';
      const r = size * 0.62 * progress;
      const rg = g.createRadialGradient(size / 2, size / 2, Math.max(0, r - size * 0.08), size / 2, size / 2, r + 1);
      rg.addColorStop(0, '#000'); rg.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = rg; g.fillRect(0, 0, size, size);
    }
    return c;
  }

  // 컵 윗면 전체: 음료 표면 + 크레마 + 거품 아트
  function renderSurface(ctx, size, drink, art, opts = {}) {
    const { progress = 1, foamOnly = true } = opts;
    ctx.clearRect(0, 0, size, size);
    ctx.save();
    ctx.beginPath(); ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2); ctx.clip();
    const rg = ctx.createRadialGradient(size * 0.45, size * 0.42, size * 0.05, size / 2, size / 2, size / 2);
    rg.addColorStop(0, lighten(drink.surface, 0.18)); rg.addColorStop(0.75, drink.surface); rg.addColorStop(1, drink.dark);
    ctx.fillStyle = rg; ctx.fillRect(0, 0, size, size);
    // 미세한 거품 점
    const seed = mulberry(7);
    ctx.fillStyle = 'rgba(255,255,255,.08)';
    for (let i = 0; i < 160; i++) { const a = seed() * 6.283, r = Math.sqrt(seed()) * size / 2; ctx.beginPath(); ctx.arc(size / 2 + Math.cos(a) * r, size / 2 + Math.sin(a) * r, seed() * 2.2 + 0.5, 0, 6.283); ctx.fill(); }
    if (art) {
      const layer = artLayer(art, size, drink, progress);
      ctx.save(); ctx.filter = `blur(${Math.max(2, size * 0.02)}px)`; ctx.globalAlpha = 0.35; ctx.drawImage(layer, 0, 0); ctx.restore();
      ctx.save(); ctx.filter = `blur(${Math.max(0.6, size * 0.003)}px)`; ctx.drawImage(layer, 0, 0); ctx.restore();
    }
    // 가장자리 그림자(컵 테두리 안쪽)
    const edge = ctx.createRadialGradient(size / 2, size / 2, size * 0.40, size / 2, size / 2, size / 2);
    edge.addColorStop(0, 'rgba(0,0,0,0)'); edge.addColorStop(1, 'rgba(60,30,10,.35)');
    ctx.fillStyle = edge; ctx.fillRect(0, 0, size, size);
    ctx.restore();
  }

  function lighten(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    r = Math.round(r + (255 - r) * amt); g = Math.round(g + (255 - g) * amt); b = Math.round(b + (255 - b) * amt);
    return `rgb(${r},${g},${b})`;
  }
  function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  return { img, drawTemplate, strokePaths, STROKE_W, renderSurface, artLayer, gridCanvas, lighten };
})();
