/* ============================================================
   Малювання світу на canvas
   ============================================================ */
(function (V) {
  'use strict';
  const M = V.MATERIALS;

  const TERRAIN = [
    ['#1f4f73', '#24597f'],  // глибока вода
    ['#3b7ea3', '#4389ad'],  // мілина
    ['#d9c48d', '#e0cc97'],  // пісок
    ['#7fa35a', '#88ab61'],  // лука
    ['#4d7a3e', '#557f44'],  // ліс
    ['#9b8f74', '#a5997d'],  // пагорби
    ['#7b7670', '#86817b'],  // гори
  ];
  const RES_MARK = {
    copper_ore: '#3fbf8f', tin_ore: '#3a2f28', lead_ore: '#b9c2cc', iron_ore: '#b5452c', coal: '#1b1b1e',
    flint: '#3d434c', limestone: '#f1eee2', salt: '#ffffff', clay: '#a8613e', resin: '#e0a02e', fiber: '#d2dd7a', berries: '#c43d64',
  };

  function Renderer(canvas, sim) {
    this.c = canvas; this.ctx = canvas.getContext('2d');
    this.sim = sim; this.sel = null; this.terrain = null; this.ts = 12; this.zoom = 1;
    this.resize();
  }
  V.Renderer = Renderer;
  const P = Renderer.prototype;

  P.setSim = function (sim) { this.sim = sim; this.terrain = null; this.resize(); };

  P.resize = function () {
    const w = this.sim.world;
    const box = this.c.parentElement.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const ts = Math.max(4, Math.min(box.width / w.W, 18)) * this.zoom;
    this.ts = ts;
    this.c.style.width = (ts * w.W) + 'px';
    this.c.style.height = (ts * w.H) + 'px';
    this.c.width = Math.round(ts * w.W * dpr); this.c.height = Math.round(ts * w.H * dpr);
    this.dpr = dpr;
    this.terrain = null;
  };

  P.buildTerrain = function () {
    const w = this.sim.world, ts = this.ts * this.dpr;
    const off = document.createElement('canvas');
    off.width = this.c.width; off.height = this.c.height;
    const g = off.getContext('2d');
    for (const t of w.tiles) {
      const pal = TERRAIN[t.t];
      g.fillStyle = t.shade > 0.5 ? pal[0] : pal[1];
      g.fillRect(Math.floor(t.x * ts), Math.floor(t.y * ts), Math.ceil(ts) + 1, Math.ceil(ts) + 1);
    }
    // берегова лінія
    g.strokeStyle = 'rgba(255,255,255,0.18)'; g.lineWidth = Math.max(1, ts * 0.08);
    for (const t of w.tiles) {
      if (!w.isWater(t)) continue;
      for (const [i, j, ax, ay, bx, by] of [[1, 0, 1, 0, 1, 1], [-1, 0, 0, 0, 0, 1], [0, 1, 0, 1, 1, 1], [0, -1, 0, 0, 1, 0]]) {
        const u = w.at(t.x + i, t.y + j);
        if (u && !w.isWater(u)) { g.beginPath(); g.moveTo((t.x + ax) * ts, (t.y + ay) * ts); g.lineTo((t.x + bx) * ts, (t.y + by) * ts); g.stroke(); }
      }
    }
    // гори — штрихування
    g.strokeStyle = 'rgba(40,36,32,0.25)'; g.lineWidth = Math.max(1, ts * 0.07);
    for (const t of w.tiles) if (t.t === V.TER.MOUNT) {
      const x = t.x * ts, y = t.y * ts;
      g.beginPath(); g.moveTo(x + ts * 0.2, y + ts * 0.8); g.lineTo(x + ts * 0.5, y + ts * 0.25); g.lineTo(x + ts * 0.8, y + ts * 0.8); g.stroke();
    }
    this.terrain = off;
  };

  P.draw = function (frameT) {
    const sim = this.sim, w = sim.world, g = this.ctx, d = this.dpr, ts = this.ts * d;
    if (!this.terrain) this.buildTerrain();
    g.drawImage(this.terrain, 0, 0);

    // ресурси
    for (const t of w.tiles) {
      if (!t.r || t.a < 0.5) continue;
      const cx = (t.x + 0.5) * ts, cy = (t.y + 0.5) * ts;
      if (t.r === 'wood') {
        const s = 0.25 + 0.18 * (t.a / t.max);
        g.fillStyle = '#2f5a2b'; g.beginPath(); g.arc(cx, cy, ts * s, 0, 6.29); g.fill();
        g.fillStyle = 'rgba(255,255,255,0.08)'; g.beginPath(); g.arc(cx - ts * 0.08, cy - ts * 0.08, ts * s * 0.5, 0, 6.29); g.fill();
      } else if (t.r === 'stone' || t.r === 'sand' || t.r === 'water') {
        if (t.r === 'stone') { g.fillStyle = 'rgba(70,66,60,0.35)'; g.fillRect(cx - ts * 0.15, cy - ts * 0.1, ts * 0.3, ts * 0.2); }
      } else {
        const col = RES_MARK[t.r] || '#fff';
        g.fillStyle = col;
        const r = ts * (t.r === 'berries' ? 0.13 : 0.17);
        if (t.r === 'berries') { for (const [ox, oy] of [[-0.12, 0], [0.12, 0.05], [0, -0.12]]) { g.beginPath(); g.arc(cx + ox * ts, cy + oy * ts, r, 0, 6.29); g.fill(); } }
        else { g.beginPath(); g.moveTo(cx, cy - r * 1.3); g.lineTo(cx + r * 1.2, cy); g.lineTo(cx, cy + r * 1.3); g.lineTo(cx - r * 1.2, cy); g.closePath(); g.fill(); g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = d; g.stroke(); }
      }
    }

    this.drawCamp(g, ts, d, frameT);

    // тварини
    for (const a of sim.animals) {
      if (!a.alive) continue;
      const x = a.x * ts, y = a.y * ts;
      if (a.type === 'rabbit') { g.fillStyle = '#f1ece2'; g.beginPath(); g.arc(x, y, ts * 0.16, 0, 6.29); g.fill(); g.strokeStyle = 'rgba(0,0,0,0.3)'; g.lineWidth = d; g.stroke(); }
      else if (a.type === 'deer') { g.fillStyle = '#9a6a3a'; g.beginPath(); g.ellipse(x, y, ts * 0.32, ts * 0.2, a.dir, 0, 6.29); g.fill(); g.fillStyle = '#e8d8bb'; g.beginPath(); g.arc(x + Math.cos(a.dir) * ts * 0.3, y + Math.sin(a.dir) * ts * 0.3, ts * 0.09, 0, 6.29); g.fill(); }
      else {
        const dog = a.type === 'dog';
        g.fillStyle = dog ? '#b07a43' : '#4b4f55'; g.beginPath();
        g.moveTo(x + Math.cos(a.dir) * ts * 0.38, y + Math.sin(a.dir) * ts * 0.38);
        g.lineTo(x + Math.cos(a.dir + 2.5) * ts * 0.28, y + Math.sin(a.dir + 2.5) * ts * 0.28);
        g.lineTo(x + Math.cos(a.dir - 2.5) * ts * 0.28, y + Math.sin(a.dir - 2.5) * ts * 0.28);
        g.closePath(); g.fill();
        g.fillStyle = dog ? '#d64545' : '#e8c25a'; g.beginPath(); g.arc(x + Math.cos(a.dir) * ts * 0.2, y + Math.sin(a.dir) * ts * 0.2, ts * (dog ? 0.08 : 0.05), 0, 6.29); g.fill();
      }
      // прикормлені тварини — світла обвідка
      if ((a.trust || 0) > 40 && a.type !== 'dog') { g.strokeStyle = 'rgba(255,214,120,0.9)'; g.lineWidth = 1.2 * d; g.beginPath(); g.arc(x, y, ts * 0.36, 0, 6.29); g.stroke(); }
    }

    // поселенці
    for (const n of sim.npcs) {
      const x = n.x * ts, y = n.y * ts;
      const child = n.ageTicks < sim.DAY * 2;
      const r = ts * (child ? 0.24 : 0.34);
      const asleep = n.task && n.task.type === 'sleep' && n.task.phase === 1;
      g.globalAlpha = asleep ? 0.55 : 1;
      g.fillStyle = 'rgba(0,0,0,0.25)'; g.beginPath(); g.ellipse(x, y + r * 0.8, r, r * 0.4, 0, 0, 6.29); g.fill();
      g.fillStyle = n.color; g.beginPath(); g.arc(x, y, r, 0, 6.29); g.fill();
      g.strokeStyle = '#141a20'; g.lineWidth = 1.4 * d; g.stroke();
      if (n.carry) { g.fillStyle = (M[n.carry.id] && M[n.carry.id].color) || '#fff'; g.fillRect(x + r * 0.4, y - r * 1.1, r * 0.8, r * 0.8); g.strokeStyle = '#141a20'; g.lineWidth = d; g.strokeRect(x + r * 0.4, y - r * 1.1, r * 0.8, r * 0.8); }
      if (n.task && n.task.type === 'experiment' && n.task.phase >= 1) {
        g.fillStyle = n.task.phase === 1 ? '#8fd3ff' : '#ffcf5a';
        g.beginPath(); g.arc(x, y - r * 1.6, r * 0.35 + Math.sin(frameT / 150) * r * 0.08, 0, 6.29); g.fill();
      }
      if (n.task && n.task.type === 'teach' && n.task.phase === 2) {
        g.fillStyle = '#ffffff'; g.strokeStyle = '#141a20'; g.lineWidth = d;
        const bx = x + r * 0.6, by = y - r * 2.1;
        g.beginPath(); g.roundRect ? g.roundRect(bx, by, r * 1.9, r * 1.1, r * 0.3) : g.rect(bx, by, r * 1.9, r * 1.1); g.fill(); g.stroke();
        g.fillStyle = '#141a20'; for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(bx + r * (0.45 + i * 0.5), by + r * 0.55, r * 0.12, 0, 6.29); g.fill(); }
      }
      if (asleep) { g.fillStyle = '#e6eef7'; g.font = `${Math.round(r * 1.3)}px sans-serif`; g.fillText('z', x + r * 0.7, y - r * 0.6); }
      g.globalAlpha = 1;
      if (this.sel === n.id) {
        g.strokeStyle = '#ffd36b'; g.lineWidth = 2.5 * d; g.beginPath(); g.arc(x, y, r + 4 * d, 0, 6.29); g.stroke();
        g.font = `600 ${Math.round(11 * d)}px Rubik, system-ui, sans-serif`;
        const label = V.nn(n.name), tw = g.measureText(label).width;
        g.fillStyle = 'rgba(20,26,32,0.85)'; g.fillRect(x - tw / 2 - 5 * d, y - r - 22 * d, tw + 10 * d, 16 * d);
        g.fillStyle = '#fff'; g.fillText(label, x - tw / 2, y - r - 10 * d);
      }
    }

    // ніч
    const p = sim.phase();
    let dark = 0;
    if (p > 0.7) dark = Math.min(1, (p - 0.7) / 0.1); else if (p < 0.08) dark = 1 - p / 0.08;
    if (dark > 0) {
      g.fillStyle = `rgba(10,18,40,${0.55 * dark})`; g.fillRect(0, 0, this.c.width, this.c.height);
      const cx = w.camp.x * ts, cy = w.camp.y * ts;
      const glowR = ts * (sim.structures.cell ? 9 : 5);
      const grad = g.createRadialGradient(cx, cy, 0, cx, cy, glowR);
      const col = sim.structures.cell ? '200,230,255' : '255,170,70';
      grad.addColorStop(0, `rgba(${col},${0.35 * dark})`); grad.addColorStop(1, `rgba(${col},0)`);
      g.fillStyle = grad; g.beginPath(); g.arc(cx, cy, glowR, 0, 6.29); g.fill();
    }
  };

  P.drawCamp = function (g, ts, d, frameT) {
    const sim = this.sim, c = sim.world.camp;
    const cx = c.x * ts, cy = c.y * ts;
    // утоптана земля
    g.fillStyle = 'rgba(120,96,64,0.35)'; g.beginPath(); g.arc(cx, cy, ts * 2.6, 0, 6.29); g.fill();
    // вогнище
    g.fillStyle = '#5a4a3a'; g.beginPath(); g.arc(cx, cy, ts * 0.42, 0, 6.29); g.fill();
    const fl = 0.75 + Math.sin(frameT / 90) * 0.1 + Math.sin(frameT / 37) * 0.06;
    g.fillStyle = '#ff9a2e'; g.beginPath(); g.arc(cx, cy, ts * 0.28 * fl, 0, 6.29); g.fill();
    g.fillStyle = '#ffe17a'; g.beginPath(); g.arc(cx, cy, ts * 0.14 * fl, 0, 6.29); g.fill();
    const s = sim.structures;
    // майстерня
    g.fillStyle = 'rgba(70,52,36,0.8)'; g.fillRect(cx + ts * 1.2, cy - ts * 0.8, ts * 0.8, ts * 0.5);
    if (s.kiln) {
      const kx = cx + ts * 1.9, ky = cy + ts * 0.9;
      g.fillStyle = M[s.kiln.wall] ? M[s.kiln.wall].color : '#888';
      g.beginPath(); g.arc(kx, ky, ts * 0.55, Math.PI, 0); g.lineTo(kx + ts * 0.55, ky + ts * 0.25); g.lineTo(kx - ts * 0.55, ky + ts * 0.25); g.closePath(); g.fill();
      g.strokeStyle = '#141a20'; g.lineWidth = d; g.stroke();
      g.fillStyle = '#ff7a2e'; g.fillRect(kx - ts * 0.15, ky - ts * 0.05, ts * 0.3, ts * 0.25);
      if (s.bellows) { g.fillStyle = '#7a4f2e'; g.beginPath(); g.moveTo(kx + ts * 0.6, ky); g.lineTo(kx + ts * 1.1, ky - ts * 0.25); g.lineTo(kx + ts * 1.1, ky + ts * 0.25); g.closePath(); g.fill(); }
    }
    if (s.pen) {
      const px = cx - ts * 3.6, py = cy - ts * 1.4, pw = ts * 1.6;
      g.strokeStyle = '#6b4a2b'; g.lineWidth = 1.5 * d; g.strokeRect(px, py, pw, pw);
      g.fillStyle = '#f1ece2';
      for (let i = 0; i < Math.min(sim.pen, 9); i++) { g.beginPath(); g.arc(px + ts * 0.3 + (i % 3) * ts * 0.5, py + ts * 0.3 + Math.floor(i / 3) * ts * 0.5, ts * 0.12, 0, 6.29); g.fill(); }
    }
    for (let i = 0; i < sim.houses; i++) {
      const hx = cx - ts * 2.4 + (i % 3) * ts * 1.2, hy = cy + ts * 1.5 + Math.floor(i / 3) * ts * 1.2;
      const wall = sim.devices.house ? M[sim.devices.house.parts[0]] : null;
      g.fillStyle = wall ? wall.color : '#a3462e'; g.fillRect(hx - ts * 0.4, hy - ts * 0.2, ts * 0.8, ts * 0.55);
      g.fillStyle = '#5a3a24'; g.beginPath(); g.moveTo(hx - ts * 0.5, hy - ts * 0.2); g.lineTo(hx, hy - ts * 0.6); g.lineTo(hx + ts * 0.5, hy - ts * 0.2); g.closePath(); g.fill();
    }
    if (s.tablet) { g.fillStyle = '#c46a3c'; g.fillRect(cx - ts * 0.3, cy - ts * 2, ts * 0.6, ts * 0.45); g.fillStyle = 'rgba(20,20,20,0.5)'; for (let i = 0; i < 3; i++) g.fillRect(cx - ts * 0.22, cy - ts * 1.92 + i * ts * 0.12, ts * 0.44, ts * 0.04); }
    if (s.cell) {
      const ex = cx + ts * 0.2, ey = cy + ts * 2.2;
      g.fillStyle = '#c9ccd1'; g.fillRect(ex - ts * 0.2, ey - ts * 0.3, ts * 0.4, ts * 0.5);
      g.fillStyle = `rgba(160,220,255,${0.6 + Math.sin(frameT / 200) * 0.3})`; g.beginPath(); g.arc(ex, ey - ts * 0.45, ts * 0.12, 0, 6.29); g.fill();
    }
  };

  P.pick = function (px, py) {
    const ts = this.ts;
    let best = null, bd = 1.2;
    for (const n of this.sim.npcs) { const d = Math.hypot(n.x - px / ts, n.y - py / ts); if (d < bd) { bd = d; best = n; } }
    return best;
  };
})(window.V = window.V || {});
