/* ============================================================
   Світ: генерація карти, ресурси, тварини
   ============================================================ */
(function (V) {
  'use strict';

  V.rng = function (seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  const T = V.T = { DEEP: 0, SHALLOW: 1, SAND: 2, GRASS: 3, FOREST: 4, HILLS: 5, MOUNT: 6 };
  V.T_NAMES = ['глибока вода', 'мілина', 'пісок', 'лука', 'ліс', 'пагорби', 'гори'];

  function valueNoise(rnd, w, h, cell) {
    const gw = Math.ceil(w / cell) + 2, gh = Math.ceil(h / cell) + 2;
    const g = [];
    for (let i = 0; i < gw * gh; i++) g.push(rnd());
    const sm = t => t * t * (3 - 2 * t);
    return (x, y) => {
      const gx = x / cell, gy = y / cell;
      const x0 = Math.floor(gx), y0 = Math.floor(gy);
      const fx = sm(gx - x0), fy = sm(gy - y0);
      const v = (i, j) => g[(j) * gw + (i)];
      const a = v(x0, y0) * (1 - fx) + v(x0 + 1, y0) * fx;
      const b = v(x0, y0 + 1) * (1 - fx) + v(x0 + 1, y0 + 1) * fx;
      return a * (1 - fy) + b * fy;
    };
  }

  V.makeWorld = function (seed) {
    const rnd = V.rng(seed);
    const W = 72, H = 48;
    const n1 = valueNoise(rnd, W, H, 14), n2 = valueNoise(rnd, W, H, 6), n3 = valueNoise(rnd, W, H, 3);
    const m1 = valueNoise(rnd, W, H, 10), m2 = valueNoise(rnd, W, H, 4);
    const tiles = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const dx = (x - W / 2) / (W / 2), dy = (y - H / 2) / (H / 2);
      const fall = Math.pow(Math.min(1, Math.sqrt(dx * dx * 0.9 + dy * dy)), 2.4);
      const e = n1(x, y) * 0.55 + n2(x, y) * 0.3 + n3(x, y) * 0.15 - fall * 0.55 + 0.12;
      const m = m1(x, y) * 0.7 + m2(x, y) * 0.3;
      let t;
      if (e < 0.22) t = T.DEEP;
      else if (e < 0.3) t = T.SHALLOW;
      else if (e < 0.34) t = T.SAND;
      else if (e < 0.56) t = m > 0.5 ? T.FOREST : T.GRASS;
      else if (e < 0.68) t = T.HILLS;
      else t = T.MOUNT;
      tiles.push({ x, y, t, e, r: null, a: 0, max: 0, fish: 0, shade: rnd() });
    }
    const at = (x, y) => (x < 0 || y < 0 || x >= W || y >= H) ? null : tiles[y * W + x];
    const near = (x, y, pred, r = 1) => {
      for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) {
        const t = at(x + i, y + j); if (t && pred(t)) return true;
      }
      return false;
    };
    const isWater = t => t.t <= T.SHALLOW;

    // ресурси
    const put = (t, r, amt) => { t.r = r; t.a = amt; t.max = amt; };
    for (const t of tiles) {
      const p = rnd();
      if (isWater(t)) { t.fish = t.t === T.SHALLOW ? 3 + rnd() * 3 : 2 + rnd() * 4; continue; }
      if (t.t === T.FOREST) { if (p < 0.5) put(t, 'wood', 10); else if (p < 0.6) put(t, 'resin', 4); else if (p < 0.72) put(t, 'berries', 6); }
      else if (t.t === T.GRASS) {
        if (near(t.x, t.y, isWater, 1) && p < 0.35) put(t, 'clay', 12);
        else if (p < 0.16) put(t, 'fiber', 8); else if (p < 0.26) put(t, 'berries', 6);
      } else if (t.t === T.SAND) {
        if (near(t.x, t.y, u => u.t === T.DEEP, 2) && p < 0.18) put(t, 'salt', 6);
        else if (p < 0.5) put(t, 'sand', 15);
        else if (near(t.x, t.y, isWater, 1) && p < 0.6) put(t, 'clay', 10);
      } else if (t.t === T.HILLS) {
        if (p < 0.3) put(t, 'stone', 20); else if (p < 0.42) put(t, 'flint', 8); else if (p < 0.55) put(t, 'limestone', 12);
      } else if (t.t === T.MOUNT) {
        if (p < 0.45) put(t, 'stone', 25);
      }
    }
    // рудні жили — кластери в пагорбах і горах
    const rocky = tiles.filter(t => t.t >= T.HILLS);
    const veins = [['copper_ore', 3, 10], ['tin_ore', 2, 7], ['iron_ore', 3, 12], ['coal', 3, 14], ['lead_ore', 2, 8], ['flint', 1, 8], ['limestone', 1, 10]];
    for (const [r, n, amt] of veins) {
      for (let k = 0; k < n && rocky.length; k++) {
        const c = rocky[Math.floor(rnd() * rocky.length)];
        const size = 2 + Math.floor(rnd() * 3);
        for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
          const t = at(c.x + i, c.y + j);
          if (t && t.t >= T.HILLS && rnd() < 0.3 + size * 0.12) put(t, r, amt);
        }
      }
    }
    // гарантуємо ключові ресурси
    for (const r of ['copper_ore', 'tin_ore', 'iron_ore', 'coal', 'lead_ore', 'salt', 'sand', 'clay', 'flint', 'limestone', 'resin', 'fiber']) {
      if (!tiles.some(t => t.r === r)) {
        const pool = r === 'salt' || r === 'sand' ? tiles.filter(t => t.t === T.SAND) : r === 'clay' || r === 'fiber' ? tiles.filter(t => t.t === T.GRASS) : r === 'resin' ? tiles.filter(t => t.t === T.FOREST) : rocky;
        const pick = pool.length ? pool[Math.floor(rnd() * pool.length)] : tiles.find(t => !isWater(t));
        if (pick) put(pick, r, 10);
      }
    }

    // табір — лука біля води ближче до центру
    let camp = null, best = -1e9;
    for (const t of tiles) {
      if (t.t !== T.GRASS && t.t !== T.SAND) continue;
      const d = Math.hypot(t.x - W / 2, t.y - H / 2);
      let s = -d;
      if (near(t.x, t.y, isWater, 4)) s += 10;
      if (near(t.x, t.y, u => u.t === T.FOREST, 4)) s += 8;
      if (near(t.x, t.y, u => u.t === T.HILLS, 9)) s += 6;
      if (s > best) { best = s; camp = t; }
    }
    for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) { const t = at(camp.x + i, camp.y + j); if (t && !isWater(t)) { t.r = null; t.a = 0; if (t.t === T.FOREST) t.t = T.GRASS; } }

    return { W, H, tiles, at, near, isWater, camp: { x: camp.x + 0.5, y: camp.y + 0.5 }, rnd };
  };

  V.isLand = (world, x, y) => { const t = world.at(Math.floor(x), Math.floor(y)); return !!t && t.t >= V.T.SAND && t.t !== V.T.MOUNT; };
  V.walkable = (world, x, y) => { const t = world.at(Math.floor(x), Math.floor(y)); return !!t && t.t >= V.T.SAND; };

  /* ---------- Тварини ---------- */
  V.ANIMALS = {
    rabbit: { name: 'кріль', speed: 0.07, cap: 60, breed: 0.0009, prey: true, meat: 2, hide: 1, bone: 0 },
    deer: { name: 'олень', speed: 0.085, cap: 22, breed: 0.0004, prey: true, meat: 5, hide: 2, bone: 2 },
    wolf: { name: 'вовк', speed: 0.1, cap: 8, breed: 0.0003, prey: false },
  };

  V.spawnAnimals = function (sim) {
    const { world, rnd } = sim;
    const land = world.tiles.filter(t => t.t === V.T.GRASS || t.t === V.T.FOREST);
    const add = (type, n) => {
      for (let i = 0; i < n; i++) {
        const t = land[Math.floor(rnd() * land.length)];
        if (Math.hypot(t.x - world.camp.x, t.y - world.camp.y) < 6 && type === 'wolf') { i--; continue; }
        sim.animals.push({ id: sim.nextId++, type, x: t.x + 0.5, y: t.y + 0.5, dir: rnd() * 6.28, hunger: rnd() * 30, alive: true, flee: 0 });
      }
    };
    add('rabbit', 26); add('deer', 10); add('wolf', 4);
  };

  V.stepAnimals = function (sim) {
    const { world, rnd, animals } = sim;
    const counts = { rabbit: 0, deer: 0, wolf: 0 };
    for (const a of animals) if (a.alive) counts[a.type]++;
    const born = [];
    for (const a of animals) {
      if (!a.alive) continue;
      const spec = V.ANIMALS[a.type];
      let speed = spec.speed * 0.45;
      if (a.type === 'wolf') {
        a.hunger += 0.03;
        if (a.hunger > 45) {
          let prey = null, bd = 12;
          for (const b of animals) if (b.alive && b.type !== 'wolf') { const d = Math.hypot(b.x - a.x, b.y - a.y); if (d < bd) { bd = d; prey = b; } }
          if (prey) {
            a.dir = Math.atan2(prey.y - a.y, prey.x - a.x); speed = spec.speed;
            if (bd < 0.6 && rnd() < 0.08) { prey.alive = false; a.hunger = Math.max(0, a.hunger - (prey.type === 'deer' ? 90 : 45)); sim.stats.wolfKills++; }
          }
        }
        // вовки тримаються подалі від табору вдень
        const dc = Math.hypot(a.x - world.camp.x, a.y - world.camp.y);
        if (dc < 7 && !sim.isNight()) { a.dir = Math.atan2(a.y - world.camp.y, a.x - world.camp.x); speed = spec.speed; }
        if (a.hunger > 160 && rnd() < 0.002) { a.alive = false; continue; }
        if (a.hunger < 25 && counts.wolf < spec.cap && rnd() < spec.breed) born.push({ type: 'wolf', x: a.x, y: a.y });
      } else {
        // травоїдні: тікають від вовків і від людей, що полюють
        let threat = null, bd = a.type === 'deer' ? 5 : 3.5;
        for (const b of animals) if (b.alive && b.type === 'wolf') { const d = Math.hypot(b.x - a.x, b.y - a.y); if (d < bd) { bd = d; threat = b; } }
        for (const n of sim.npcs) if (n.task && n.task.type === 'hunt' && n.task.target === a.id) { const d = Math.hypot(n.x - a.x, n.y - a.y); if (d < bd) { bd = d; threat = n; } }
        if (threat) { a.dir = Math.atan2(a.y - threat.y, a.x - threat.x) + (rnd() - 0.5) * 0.6; speed = spec.speed; }
        else if (rnd() < 0.04) a.dir += (rnd() - 0.5) * 2;
        if (counts[a.type] < spec.cap && rnd() < spec.breed * (1 - counts[a.type] / spec.cap) * 2) born.push({ type: a.type, x: a.x, y: a.y });
      }
      if (rnd() < 0.02) a.dir += (rnd() - 0.5);
      const nx = a.x + Math.cos(a.dir) * speed, ny = a.y + Math.sin(a.dir) * speed;
      if (V.isLand(world, nx, ny)) { a.x = nx; a.y = ny; } else a.dir += Math.PI * (0.5 + rnd());
    }
    for (const b of born) { sim.animals.push({ id: sim.nextId++, type: b.type, x: b.x, y: b.y, dir: rnd() * 6.28, hunger: 0, alive: true }); counts[b.type]++; }
    if (sim.tick % 200 === 0) sim.animals = sim.animals.filter(a => a.alive);
    // відновлення риби та рослин
    if (sim.tick % 50 === 0) {
      for (const t of world.tiles) {
        if (t.fish !== undefined && world.isWater(t) && t.fish < 6) t.fish += 0.05;
        if (t.r && t.a < t.max && ['wood', 'berries', 'fiber', 'resin'].includes(t.r)) t.a = Math.min(t.max, t.a + 0.25);
      }
    }
  };
})(window.V = window.V || {});
