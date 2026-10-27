/* ============================================================
   Симуляція: поселенці, знання, винаходи, заохочення
   ============================================================ */
(function (V) {
  'use strict';
  const M = V.MATERIALS;

  const NAMES = ['Олеся', 'Тарас', 'Мирослава', 'Богдан', 'Ярина', 'Остап', 'Злата', 'Данило', 'Леся', 'Назар', 'Устина', 'Орест',
    'Марта', 'Ілько', 'Соломія', 'Захар', 'Олекса', 'Дарина', 'Роман', 'Христя', 'Іванна', 'Святослав', 'Галя', 'Петро', 'Віра', 'Гнат'];
  const COLORS = ['#e8a33d', '#4fb3a9', '#d9668a', '#7d8de6', '#9ccf5a', '#e6735a', '#b07de0', '#5fa8e8', '#d6c14a', '#e88fd0', '#62c98a', '#c9925e'];
  const FOODS = ['cooked', 'meat', 'fish', 'berries'];

  // Заохочення («натхнення»)
  const R = V.REWARD = {
    learn: 2, teach: 4, taught: 2, idea: 2, material: 15, useful: 20, invent: 40, partial: 5, fail: 1,
    improve: 10, impact: 0.3, help: 3, build: 5, hunt: 1.5, gather: 0.5, explore: 1,
    solve: 6, brainstorm: 3, coinvent: 20, kind: 2, tamedDog: 15, tamedAnimal: 6,
  };
  const ACTS = ['gather', 'hunt', 'fish', 'experiment', 'teach', 'build', 'explore', 'feed'];
  const msg = V.msg;
  // на прикормлених і приручених не полюють
  const huntable = a => (a.type === 'rabbit' || a.type === 'deer') && (a.trust || 0) < 30 && !a.tame;

  function Sim(seed, saved) {
    this.seed = seed;
    this.world = V.makeWorld(seed);
    this.rnd = this.world.rnd;
    this.tick = 0;
    this.DAY = 1200;
    this.nextId = 1;
    this.npcs = [];
    this.animals = [];
    this.dead = [];
    this.store = { berries: 12, wood: 6, fiber: 3, stone: 3 };
    this.devices = {};      // ідея → найкраща робоча конструкція
    this.structures = {};   // збудовані споруди
    this.worldKnown = new Set(['wood', 'fiber', 'stone', 'berries', 'water']);
    this.chronicle = [];
    this.discoveries = [];
    this.genCount = 0;
    this.attempts = 0;
    this.triedPairs = new Set();
    this.ideasSeen = new Set();
    this.pen = 0;
    this.houses = 0;
    this.era = 'stone';
    this.stats = { wolfKills: 0, hunts: 0, fish: 0, taught: 0, experiments: 0, births: 0 };
    if (saved) { this.load(saved); return; }
    V.spawnAnimals(this);
    for (let i = 0; i < 8; i++) this.addNPC(null);
    this.log(msg('log.start'), 'era');
  }
  V.Sim = Sim;
  const P = Sim.prototype;

  /* ---------- Збереження та відновлення ----------
     Рельєф відтворюється з зерна (seed), тож зберігаємо лише те, що змінилося. */
  const SAVE_VERSION = 1;
  const NPC_SETS = ['know', 'failures'];
  P.serialize = function () {
    const w = this.world;
    const tiles = { r: [], a: [], max: [], fish: [] };
    for (const t of w.tiles) { tiles.r.push(t.r); tiles.a.push(t.a); tiles.max.push(t.max); tiles.fish.push(t.fish || 0); }
    const npc = n => {
      const o = {};
      for (const k in n) {
        if (k === 'task') continue;                       // поточну справу після завантаження обирають заново
        o[k] = NPC_SETS.includes(k) ? [...n[k]] : n[k];
      }
      return o;
    };
    return {
      v: SAVE_VERSION, seed: this.seed, rng: this.rnd.getState(), tick: this.tick, nextId: this.nextId,
      tiles, npcs: this.npcs.map(npc),
      dead: this.dead.map(n => ({ id: n.id, name: n.name, color: n.color, history: n.history, inventions: n.inventions, insp: n.insp, know: [...n.know].slice(0, 0), failures: [], val: n.val, skill: n.skill, friends: {}, thought: n.thought, hunger: 100, energy: 0, social: 0, health: 0, ageTicks: n.ageTicks, problems: {}, suggest: [] })),
      animals: this.animals.filter(a => a.alive).map(a => ({ id: a.id, type: a.type, x: a.x, y: a.y, dir: a.dir, hunger: a.hunger, alive: true, trust: a.trust || 0, owner: a.owner, fedBy: a.fedBy, tame: a.tame })),
      store: this.store, devices: this.devices, structures: this.structures,
      worldKnown: [...this.worldKnown], chronicle: this.chronicle, discoveries: this.discoveries,
      genCount: this.genCount, attempts: this.attempts, triedPairs: [...this.triedPairs], ideasSeen: [...this.ideasSeen],
      pen: this.pen, houses: this.houses, era: this.era, stats: this.stats, adviceSeen: this.adviceSeen || {}, fedTypes: this.fedTypes || {},
      mats: Object.values(M).filter(m => /^g\d+$/.test(m.id)),
    };
  };
  P.load = function (d) {
    if (!d || d.v !== SAVE_VERSION) throw new Error('unsupported save');
    const w = this.world;
    w.tiles.forEach((t, i) => { t.r = d.tiles.r[i]; t.a = d.tiles.a[i]; t.max = d.tiles.max[i]; t.fish = d.tiles.fish[i]; });
    this.rnd.setState(d.rng);
    for (const id of Object.keys(M)) if (/^g\d+$/.test(id)) delete M[id];
    for (const m of d.mats || []) M[m.id] = m;
    const npc = o => { const n = Object.assign({}, o, { task: null }); for (const k of NPC_SETS) n[k] = new Set(o[k] || []); return n; };
    Object.assign(this, {
      tick: d.tick, nextId: d.nextId, npcs: d.npcs.map(npc), dead: d.dead.map(npc), animals: d.animals,
      store: d.store, devices: d.devices, structures: d.structures, worldKnown: new Set(d.worldKnown),
      chronicle: d.chronicle, discoveries: d.discoveries, genCount: d.genCount, attempts: d.attempts,
      triedPairs: new Set(d.triedPairs), ideasSeen: new Set(d.ideasSeen), pen: d.pen, houses: d.houses,
      era: d.era, stats: d.stats, adviceSeen: d.adviceSeen, fedTypes: d.fedTypes || {},
    });
  };

  P.day = function () { return Math.floor(this.tick / this.DAY) + 1; };
  P.phase = function () { return (this.tick % this.DAY) / this.DAY; };
  P.isNight = function () { const p = this.phase(); return p > 0.78 || p < 0.04; };
  /* Повідомлення зберігаються як [ключ, параметри] — перекладаються під час показу */
  P.log = function (m, kind = 'life', npc = null) {
    this.chronicle.push({ day: this.day(), t: this.tick, msg: m, kind, npc: npc ? npc.id : null });
    if (this.chronicle.length > 400) this.chronicle.shift();
    if (npc) { npc.history.unshift({ day: this.day(), msg: m }); if (npc.history.length > 12) npc.history.pop(); }
  };
  const think = (n, key, p) => { n.thought = msg(key, p); n.thoughtLLM = false; };

  /* ---------- Поселенці ---------- */
  P.addNPC = function (parents) {
    const rnd = this.rnd;
    const used = new Set(this.npcs.map(n => n.name).concat(this.dead.map(n => n.name)));
    let name = NAMES.find(n => !used.has(n)) || ('Мешканець ' + this.nextId);
    if (parents) { const free = NAMES.filter(n => !used.has(n)); if (free.length) name = free[Math.floor(rnd() * free.length)]; }
    const c = this.world.camp;
    const n = {
      id: this.nextId++, name, color: COLORS[this.npcs.length % COLORS.length],
      x: c.x + (rnd() - 0.5) * 3, y: c.y + (rnd() - 0.5) * 3,
      curiosity: 0.3 + rnd() * 0.7, sociability: 0.3 + rnd() * 0.7, diligence: 0.3 + rnd() * 0.7,
      hunger: 20 + rnd() * 20, energy: 70 + rnd() * 30, social: rnd() * 30, health: 100,
      skill: { gather: 1, hunt: 1, craft: 1, teach: 1 },
      know: new Set(), insp: 0, val: {}, task: null, carry: null, thought: ['th.look', {}], thoughtLLM: false,
      history: [], failures: new Set(), hints: {}, friends: {}, inventions: [], taughtCount: 0,
      hunts: 0, gathers: 0, heatTries: 0, ageTicks: parents ? 0 : this.DAY * 3, parents: parents ? parents.map(p => p.id) : null,
      problems: {}, suggest: [],
    };
    for (const a of ACTS) n.val[a] = 3;
    const base = ['m:wood', 'm:fiber', 'm:stone', 'm:berries', 'm:water'];
    if (!parents) {
      for (const k of base) n.know.add(k);
      n.know.add('i:knife'); n.know.add('i:spear');
      const extra = ['m:flint', 'm:clay', 'm:sand'];
      n.know.add(extra[Math.floor(rnd() * extra.length)]);
    } else {
      n.know.add('m:berries'); n.know.add('m:water'); n.know.add('m:wood');
      n.color = parents[0].color;
    }
    for (const k of n.know) if (k.startsWith('m:')) this.worldKnown.add(k.slice(2));
    this.npcs.push(n);
    return n;
  };

  const isAdult = (sim, n) => n.ageTicks >= sim.DAY * 2;
  P.knows = (n, k) => n.know.has(k);
  P.learn = function (n, key, how) {
    if (n.know.has(key)) return false;
    n.know.add(key);
    if (key.startsWith('m:')) this.worldKnown.add(key.slice(2));
    this.reward(n, key.startsWith('i:') ? R.idea : R.learn, how || (key.startsWith('i:') ? 'idea' : 'learn'));
    return true;
  };
  P.reward = function (n, amt, why) {
    n.insp += amt;
    if (n.task) n.task.r = (n.task.r || 0) + amt;
    n.lastReward = { amt, why, t: this.tick };
  };
  P.stock = function (id) { return this.store[id] || 0; };
  P.give = function (id, k = 1) { this.store[id] = (this.store[id] || 0) + k; };
  P.take = function (id, k = 1) { if (this.stock(id) < k) return false; this.store[id] -= k; return true; };
  P.foodStock = function () { return FOODS.reduce((s, f) => s + this.stock(f), 0); };
  P.hasDev = function (n, idea) { return !!this.devices[idea] && n.know.has('d:' + idea); };
  P.devQ = function (idea) { return this.devices[idea] ? this.devices[idea].quality : 0; };
  P.useDev = function (n, idea) {
    const d = this.devices[idea];
    if (d && d.inventor !== n.id) { const inv = this.npcs.find(x => x.id === d.inventor); if (inv) this.reward(inv, R.impact, 'impact'); }
  };

  /* Температура, яку дає табір */
  P.temp = function (fuel) {
    const base = M[fuel] ? M[fuel].fuel : 0;
    const k = this.structures.kiln;
    let t = base, cap = Infinity, enclosed = false;
    if (k) { t += 150; enclosed = true; cap = k.hp; if (this.structures.bellows) t += 300; }
    return { t: Math.min(t, cap), raw: t, cap, enclosed };
  };
  P.bestFuel = function (n) {
    let best = null, bt = 0;
    for (const f of V.FUELS) if (n.know.has('m:' + f) && this.stock(f) > 0 && M[f].fuel > bt) { best = f; bt = M[f].fuel; }
    return best;
  };

  /* ---------- Рух ---------- */
  P.moveTo = function (n, tx, ty, speedMul = 1) {
    const dx = tx - n.x, dy = ty - n.y, d = Math.hypot(dx, dy);
    if (d < 0.35) return true;
    let sp = 0.075 * speedMul * (n.ageTicks < this.DAY * 2 ? 0.7 : 1);
    if (this.hasDev(n, 'cart') && n.carry) sp *= 1.15;
    const base = Math.atan2(dy, dx);
    for (const off of [0, 0.6, -0.6, 1.2, -1.2, 1.9, -1.9]) {
      const a = base + off, nx = n.x + Math.cos(a) * Math.min(sp, d), ny = n.y + Math.sin(a) * Math.min(sp, d);
      if (V.walkable(this.world, nx, ny) || (this.hasDev(n, 'raft') && this.world.at(Math.floor(nx), Math.floor(ny)))) { n.x = nx; n.y = ny; return false; }
    }
    n.x += (this.rnd() - 0.5) * 0.2; n.y += (this.rnd() - 0.5) * 0.2;
    if (!V.walkable(this.world, n.x, n.y)) { n.x = this.world.camp.x; n.y = this.world.camp.y; }
    return false;
  };
  /* Місце поселенця біля вогнища — завжди на суходолі */
  P.campSpot = function (n) {
    if (n.spot) return n.spot;
    const c = this.world.camp;
    for (let k = 0; k < 24; k++) {
      const a = (n.id * 2.4 + k * 0.7) % 6.28, r = 1.2 + ((n.id + k) % 3) * 0.5;
      const p = { x: c.x + Math.cos(a) * r, y: c.y + Math.sin(a) * r };
      if (V.walkable(this.world, p.x, p.y)) return (n.spot = p);
    }
    return (n.spot = { x: c.x, y: c.y });
  };

  /* Знайти найближчу клітинку з ресурсом */
  P.findRes = function (n, res) {
    let best = null, bd = 1e9;
    for (const t of this.world.tiles) {
      if (t.r !== res || t.a < 1) continue;
      const d = Math.hypot(t.x + 0.5 - n.x, t.y + 0.5 - n.y);
      if (d < bd) { bd = d; best = t; }
    }
    return best;
  };
  P.waterEdge = function (n) {
    let best = null, bd = 1e9;
    const w = this.world;
    for (const t of w.tiles) {
      if (w.isWater(t) || t.t === V.TER.MOUNT) continue;
      let fish = 0;
      for (const [i, j] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const u = w.at(t.x + i, t.y + j); if (u && w.isWater(u)) fish = Math.max(fish, u.fish); }
      if (fish < 1.5) continue;
      const d = Math.hypot(t.x + 0.5 - n.x, t.y + 0.5 - n.y) - fish;
      if (d < bd) { bd = d; best = t; }
    }
    return best;
  };

  /* Огляд околиць — так NPC дізнаються нові матеріали і тварин */
  P.look = function (n, r = 2) {
    const w = this.world, cx = Math.floor(n.x), cy = Math.floor(n.y);
    for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) {
      const t = w.at(cx + i, cy + j); if (!t) continue;
      if (t.r && !n.know.has('m:' + t.r)) {
        const first = !this.worldKnown.has(t.r);
        this.learn(n, 'm:' + t.r, 'foundMat');
        if (first) this.log(msg('log.find', { n: n.name, m: t.r }), 'find', n);
      }
      if (w.isWater(t) && t.fish > 2 && !n.know.has('m:fish')) this.learn(n, 'm:fish', 'sawFish');
    }
  };

  /* ---------- Ідеї: виникають із проблем ---------- */
  P.checkIdeas = function (n) {
    const k = x => n.know.has(x);
    const unlock = id => {
      if (!k('i:' + id) && this.learn(n, 'i:' + id, 'idea')) {
        think(n, 'th.idea', { w: id });
        if (!this.ideasSeen.has(id)) { this.ideasSeen.add(id); this.log(msg('log.idea', { n: n.name, w: id }), 'idea', n); }
      }
    };
    if (k('m:clay') && (k('l:cook') || this.day() >= 2)) unlock('vessel');
    if (n.hints.air || n.hints.hotter) unlock('kiln');
    if (n.hints.hotter && this.structures.kiln) unlock('bellows');
    if (k('m:fish') && k('m:fiber')) unlock('net');
    if (k('d:net') || (k('m:fish') && k('m:wood') && this.day() >= 4)) unlock('raft');
    if (n.gathers >= 12) unlock('cart');
    if (n.hunts >= 3 && k('m:fiber')) unlock('pen');
    if ((k('m:brick') || k('m:mortar') || k('m:stone')) && this.day() >= 3 && this.structures.kiln) unlock('house');
    if (k('m:glass')) unlock('lens');
    if (n.taughtCount >= 5 && k('m:clay')) unlock('tablet');
    const metals = [...n.know].filter(x => x.startsWith('m:') && M[x.slice(2)] && M[x.slice(2)].cond >= 0.9).length;
    if (metals >= 2 && (k('m:salt') || k('m:quicklime'))) unlock('cell');
  };

  /* ---------- Варіанти експериментів ---------- */
  P.experimentOptions = function (n) {
    const have = id => n.know.has('m:' + id) && this.stock(id) > 0;
    const known = [...n.know].filter(x => x.startsWith('m:')).map(x => x.slice(2)).filter(id => M[id]);
    const avail = known.filter(have);
    const fuel = this.bestFuel(n);
    const opts = { heat: [], build: [], alloy: [], composite: [], fuel, temp: fuel ? this.temp(fuel) : null };
    if (fuel) {
      const heatable = avail.filter(id => M[id].kind !== 'liquid' || id === 'water');
      for (const a of heatable) opts.heat.push([a]);
      for (let i = 0; i < heatable.length; i++) for (let j = i + 1; j < heatable.length; j++) opts.heat.push([heatable[i], heatable[j]]);
    }
    for (const k of n.know) {
      if (!k.startsWith('i:')) continue;
      const idea = k.slice(2), I = V.IDEAS[idea];
      const slots = I.slots.map(() => avail.filter(id => M[id].kind !== 'food' && M[id].kind !== 'ore'));
      if (slots.every(s => s.length)) opts.build.push({ idea, slots });
    }
    const metals = avail.filter(id => M[id].kind === 'metal' && !M[id].alloy);
    for (const a of metals) {
      for (const b of metals) if (a !== b) opts.alloy.push({ base: a, add: b });
      if (a === 'iron' && have('charcoal')) opts.alloy.push({ base: 'iron', add: 'charcoal' });
    }
    for (const m of V.MATRICES) if (have(m)) for (const f of V.FILLERS) if (have(f) && f !== m) opts.composite.push({ matrix: m, filler: f });
    return opts;
  };

  /* Мозок на правилах: обирає експеримент */
  P.rulePlan = function (n, o) {
    const rnd = this.rnd;
    const pick = arr => arr[Math.floor(rnd() * arr.length)];
    const sig = p => JSON.stringify(p);
    const cands = [];
    const tBand = o.temp ? Math.round(o.temp.t / 100) : 0;
    // нагрівання — новизна важлива
    for (const inp of o.heat) {
      const p = { type: 'heat', inputs: inp };
      if (n.failures.has(sig(p) + '@' + tBand)) continue;
      let w = 1;
      if (n.hints.hotter && n.hints.hotterSet === inp.slice().sort().join('+')) w = 0.2;
      if (inp.some(id => M[id].kind === 'ore')) w *= inp.some(id => id === 'charcoal' || id === 'coal') ? 2.5 : 1.2;
      if (inp.some(id => M[id].kind === 'food')) w *= 0.5;
      if (inp.length === 2 && !inp.some(id => M[id].kind === 'ore')) w *= 0.3;
      const law = V.LAWS.find(l => n.know.has('l:' + l.id) && l.inputs.length === inp.filter(x => x !== 'charcoal' && x !== 'coal').length && l.inputs.every(x => inp.includes(x)));
      if (law) { if (this.stock(law.out) < 3 && law.out !== 'cooked') w = M[law.out].kind === 'metal' || law.out === 'charcoal' ? 6 : 2.5; else continue; }
      cands.push({ p, w: w * 1.0 });
    }
    // поради, які дали інші, — пробуємо охоче
    n.suggest = n.suggest.filter(sg => this.tick - sg.t < this.DAY * 4);
    for (const sg of n.suggest) {
      const b = o.build.find(x => x.idea === sg.idea);
      if (!b || !b.slots[sg.si] || !b.slots[sg.si].includes(sg.mat)) continue;
      const parts = b.slots.map((opts, i) => {
        if (i === sg.si) return sg.mat;
        const slot = V.IDEAS[b.idea].slots[i];
        let best = opts[0], bs = -1;
        for (const id of opts) { const sc = V.SLOT[slot].test(M[id]) + (rnd() - 0.5) * 0.3; if (sc > bs) { bs = sc; best = id; } }
        return best;
      });
      const p = { type: 'build', idea: b.idea, parts, coauthor: sg.from, coMat: sg.mat };
      if (!n.failures.has(sig({ type: 'build', idea: b.idea, parts }))) cands.push({ p, w: 7 });
    }
    for (const b of o.build) {
      const smart = rnd() < 0.35 + n.skill.craft * 0.08;
      for (let tries = 0; tries < 3; tries++) {
        const parts = b.slots.map((s, i) => {
          if (!smart) return pick(s);
          const slot = V.IDEAS[b.idea].slots[i];
          let best = s[0], bs = -1;
          for (const id of s) { const sc = V.SLOT[slot].test(M[id]) + (rnd() - 0.5) * 0.5; if (sc > bs) { bs = sc; best = id; } }
          return best;
        });
        const p = { type: 'build', idea: b.idea, parts };
        if (n.failures.has(sig(p))) continue;
        const have = this.devices[b.idea];
        let w = have ? 0.5 : 2.2;
        if (b.idea === 'kiln' && n.hints.wall) w = 2.5;
        if (b.idea === 'bellows' && n.hints.hotter) w = 2.5;
        cands.push({ p, w });
        break;
      }
    }
    for (const a of o.alloy) {
      const need = a.add === 'charcoal' ? 1100 : Math.max(M[a.base].mp, M[a.add].mp);
      if (!o.temp || o.temp.t < need) continue;
      let f;
      if (a.add === 'charcoal') f = 0.001 + Math.pow(rnd(), 1.5) * 0.04;
      else f = 0.02 + Math.pow(rnd(), 1.3) * 0.43;
      const tried = this.triedPairs.has(a.base + '+' + a.add);
      cands.push({ p: { type: 'alloy', base: a.base, add: a.add, f: +f.toFixed(a.add === 'charcoal' ? 4 : 3) }, w: tried ? 1.2 : 4 });
    }
    for (const c of o.composite) {
      const tried = this.triedPairs.has(c.matrix + '+' + c.filler);
      cands.push({ p: { type: 'composite', matrix: c.matrix, filler: c.filler, f: +(0.05 + rnd() * 0.5).toFixed(2) }, w: (tried ? 0.04 : 0.3) * n.curiosity });
    }
    if (!cands.length) return null;
    const tot = cands.reduce((s, c) => s + c.w, 0);
    let r = rnd() * tot;
    for (const c of cands) { r -= c.w; if (r <= 0) return c.p; }
    return cands[cands.length - 1].p;
  };

  /* ---------- Виконання експерименту ---------- */
  P.runExperiment = function (n, plan) {
    this.attempts++; this.stats.experiments++;
    if (plan.coauthor) n.suggest = n.suggest.filter(sg => !(sg.idea === plan.idea && sg.mat === plan.coMat));
    n.skill.craft += 0.05;
    const sig = JSON.stringify(plan.type === 'alloy' || plan.type === 'composite' ? { t: plan.type } : plan.type === 'build' ? { type: 'build', idea: plan.idea, parts: plan.parts } : plan);
    const fuel = this.bestFuel(n);
    const T = fuel ? this.temp(fuel) : { t: 0, raw: 0, cap: Infinity, enclosed: false };

    if (plan.type === 'heat') {
      for (const id of plan.inputs) if (!this.take(id)) return this.fail(n, id, plan);
      if (fuel) this.take(fuel);
      n.heatTries++;
      const res = V.heat(plan.inputs, T.t, T.enclosed);
      const ms = plan.inputs.slice();
      if (T.raw > T.cap && !res.ok) { n.hints.wall = true; n.problems.wall = { cap: Math.round(T.cap) }; this.log(msg('log.wall', { n: n.name, cap: Math.round(T.cap) }), 'hint', n); }
      if (res.ok) {
        const out = res.out, k = out === 'cooked' ? 2 : 3;
        this.give(out, k);
        n.know.add('l:' + res.law);
        const first = !this.worldKnown.has(out);
        if (this.learn(n, 'm:' + out)) { /* винагорода в learn */ }
        if (first) {
          this.reward(n, R.material, 'newMat');
          const cold = V.LAWS.find(l => l.id === res.law).minT === 0;
          this.discoveries.push({ day: this.day(), kind: 'material', id: out, by: n.id, how: msg('how.heat', { ms, cold, t: Math.round(T.t) }), why: msg('raw', { s: '' }), law: res.law, real: true });
          this.log(msg('log.discMat', { n: n.name, cold, ms, t: Math.round(T.t), m: out, law: res.law }), 'discovery', n);
          think(n, 'th.success', { m: out });
        } else { think(n, 'th.again', { m: out }); this.reward(n, 1, 'work'); }
        n.hints.hotter = false; delete n.problems.hotter; delete n.problems.air;
        return;
      }
      n.failures.add(JSON.stringify(plan) + '@' + Math.round(T.t / 100));
      if (res.hint === 'hotter') { n.problems.hotter = { ms, t: Math.round(T.t) }; n.hints.hotter = true; n.hints.hotterSet = plan.inputs.slice().sort().join('+'); this.reward(n, 3, 'observe'); this.log(msg('log.hint', { n: n.name, ms, note: res.note }), 'hint', n); }
      else if (res.hint === 'air') { n.problems.air = { ms }; n.hints.air = true; this.reward(n, 3, 'observe'); this.log(msg('log.hint', { n: n.name, ms, note: res.note }), 'hint', n); }
      else this.reward(n, R.fail, 'fail');
      n.thought = res.note; n.thoughtLLM = false;
      this.checkIdeas(n);
      return;
    }

    if (plan.type === 'build') {
      const idea = V.IDEAS[plan.idea];
      const need = {};
      plan.parts.forEach(id => need[id] = (need[id] || 0) + (idea.structure ? 2 : 1));
      for (const id in need) if (this.stock(id) < need[id]) return this.fail(n, id, plan);
      for (const id in need) this.take(id, need[id]);
      const ev = V.evaluate(plan.idea, plan.parts.map(id => M[id]));
      const parts = plan.parts.map((id, i) => [idea.slots[i], id]);
      const cur = this.devices[plan.idea];
      if (ev.works) {
        if (!cur || ev.quality > cur.quality + 0.05) {
          const isNew = !cur;
          const dev = { idea: plan.idea, parts: plan.parts, quality: ev.quality, inventor: n.id, day: this.day(), custom: plan.name || null, improved: !isNew, extra: ev.extra };
          this.devices[plan.idea] = dev;
          n.know.add('d:' + plan.idea);
          if (!n.inventions.includes(plan.idea)) n.inventions.push(plan.idea);
          if (idea.structure) this.buildStructure(plan.idea, plan.parts, ev);
          if (isNew) {
            const bonus = Math.round(R.invent * Math.min(1.2, ev.quality));
            this.reward(n, bonus, 'invent');
            this.discoveries.push({ day: this.day(), kind: 'device', id: plan.idea, dev: Object.assign({}, dev), by: n.id, how: msg('raw', { s: '' }), parts, quality: ev.quality, extra: ev.extra });
            const volts = ev.extra && ev.extra.volts ? ev.extra.volts.toFixed(2) : null;
            this.log(msg('log.invent', { n: n.name, dev: Object.assign({}, dev), parts, q: ev.quality, volts }), 'discovery', n);
            think(n, 'th.invent', { idea: plan.idea });
          } else {
            this.reward(n, R.improve, 'improve');
            this.discoveries.push({ day: this.day(), kind: 'improve', id: plan.idea, dev: Object.assign({}, dev), by: n.id, parts, quality: ev.quality });
            this.log(msg('log.improve', { n: n.name, idea: plan.idea, parts, q0: cur.quality, q1: ev.quality }), 'improve', n);
          }
          if (plan.idea === 'kiln') { n.hints.wall = false; delete n.problems.wall; }
          if (n.problems.device && n.problems.device.idea === plan.idea) delete n.problems.device;
          const co = plan.coauthor && this.npcs.find(x => x.id === plan.coauthor);
          if (co && co !== n) {
            dev.co = co.name;
            this.reward(co, isNew ? R.coinvent : R.improve, 'coinvent');
            this.log(msg('log.together', { n: n.name, n2: co.name, idea: plan.idea, m: plan.coMat }), 'together', n);
            n.friends[co.id] = (n.friends[co.id] || 0) + 15; co.friends[n.id] = (co.friends[n.id] || 0) + 15;
            if (!co.know.has('d:' + plan.idea)) this.learn(co, 'd:' + plan.idea, 'taughtBy');
          }
        } else {
          n.know.add('d:' + plan.idea);
          this.reward(n, 2, 'copied');
          think(n, 'th.notBetter', { idea: plan.idea });
          n.failures.add(sig);
        }
        return;
      }
      n.failures.add(sig);
      const weak = ev.weakSlot;
      n.problems.device = { idea: plan.idea, slot: weak, si: idea.slots.indexOf(weak), parts: plan.parts.slice() };
      if (ev.partial) {
        this.reward(n, R.partial, 'partial');
        think(n, 'th.partial', { idea: plan.idea, slot: weak });
        this.log(msg('log.partial', { n: n.name, idea: plan.idea, parts, slot: weak }), 'try', n);
      } else {
        this.reward(n, R.fail, 'fail');
        think(n, 'th.fail', { idea: plan.idea, slot: weak });
      }
      return;
    }

    if (plan.type === 'alloy' || plan.type === 'composite') return this.makeMaterial(n, plan, T);
  };

  P.fail = function (n, missing, plan) {
    think(n, 'th.cantStart', { m: missing });
    n.problems.missing = { m: missing };
    this.reward(n, 0.2, 'fail');
    if (plan) n.goalMats = (plan.inputs || plan.parts || []).filter(id => this.stock(id) < 2 && V.BASE_RESOURCES.includes(id));
  };

  P.buildStructure = function (idea, parts, ev) {
    const m = M[parts[0]];
    if (idea === 'kiln') { this.structures.kiln = { wall: parts[0], hp: m.hp }; }
    else if (idea === 'bellows') this.structures.bellows = { parts };
    else if (idea === 'pen') this.structures.pen = { parts };
    else if (idea === 'house') { this.structures.house = { parts }; this.houses = Math.max(this.houses, 1); }
    else if (idea === 'tablet') this.structures.tablet = { parts };
    else if (idea === 'cell') this.structures.cell = { parts, volts: ev.extra.volts };
  };

  /* Генерація нового матеріалу: сплав або композит */
  P.makeMaterial = function (n, plan, T) {
    const isAlloy = plan.type === 'alloy';
    const a = isAlloy ? plan.base : plan.matrix, b = isAlloy ? plan.add : plan.filler;
    const need = isAlloy ? (b === 'charcoal' ? 1100 : Math.max(M[a].mp, M[b].mp)) : 0;
    if (!this.take(a)) return this.fail(n, a, plan);
    if (!this.take(b)) { this.give(a); return this.fail(n, b, plan); }
    if (isAlloy && T.t < need) {
      n.hints.hotter = true;
      this.reward(n, 2, 'observe');
      think(n, 'th.needHeat', { m: a, m2: b === 'charcoal' ? 'carbon' : b, t: need });
      n.problems.hotter = { ms: [a, b], t: Math.round(T.t) };
      this.log(msg('log.needHeat', { n: n.name, m: a, m2: b === 'charcoal' ? 'carbon' : b, t: Math.round(T.t) }), 'hint', n);
      this.checkIdeas(n);
      return;
    }
    const f = Math.max(0.0005, Math.min(0.6, +plan.f || 0.1));
    const props = isAlloy ? V.makeAlloy(a, b, f) : V.makeComposite(a, b, f);
    this.triedPairs.add(a + '+' + b);
    const rd = isAlloy ? (b === 'charcoal' ? 1000 : 100) : 20;
    const sigKey = props.comp.map(([id, x]) => id + ':' + Math.round(x * rd)).join('|');
    let existing = Object.values(M).find(m => m.sig === sigKey);
    if (existing) {
      this.give(existing.id, 2);
      this.learn(n, 'm:' + existing.id);
      this.reward(n, 1, 'recipe');
      think(n, 'th.known', { m: existing.id });
      return;
    }
    // ще не досить міцне — розсипається
    if (props.tough < 0.4 || props.hard < 0.3) {
      this.reward(n, R.fail, 'fail');
      think(n, 'th.crumble');
      this.log(msg('log.crumble', { n: n.name, comp: props.comp }), 'try', n);
      return;
    }
    const real = V.matchReal(props.comp);
    const id = 'g' + (++this.genCount);
    const pool = Object.values(M).filter(m => this.worldKnown.has(m.id));
    let name, nearest = null, withComp = false, word = null;
    if (real) {
      name = real.name;
      // реальна назва вже зайнята іншою пропорцією — показуємо ще й склад
      if (Object.values(M).some(m => m.realIdx === real.idx)) withComp = true;
    } else {
      if (plan.name && plan.name.length < 30) name = plan.name; else { word = V.inventWord(this.rnd); name = word.join('-'); }
      const near = V.nearest(props, pool);
      nearest = near ? near.id : null;
      if (Object.values(M).some(m => m.name === name)) withComp = true;
    }
    const color = isAlloy ? mixColor(M[a].color, M[b] ? M[b].color : '#333', f) : mixColor(M[a].color, M[b].color, f);
    const mat = Object.assign({ id, name, kind: isAlloy ? 'alloy' : 'composite', trans: 0, fuel: 0, food: 0, ion: 0, air: 0, binder: 0, plast: 0, hp: 0, mp: 0, cond: 0, pot: 0, sharp: 0, wp: 0 }, props, { sig: sigKey, real: !!real, realIdx: real ? real.idx : null, nearest, withComp, word, color, inventor: n.id, day: this.day() });
    if (!mat.hp) mat.hp = mat.mp ? mat.mp - 100 : 300;
    if (isAlloy) mat.kind = 'metal', mat.alloy = true;
    M[id] = mat;
    this.give(id, 3);
    // корисність: чи кращий він за все відоме хоча б в одному гнізді?
    let usefulFor = [];
    for (const s in V.SLOT) {
      const sc = V.SLOT[s].test(mat);
      if (sc < 0.6) continue;
      let best = 0;
      for (const m of pool) if (m.kind !== 'food' && m.kind !== 'ore') best = Math.max(best, V.SLOT[s].test(m));
      if (sc > best + 0.05) usefulFor.push(s);
    }
    this.learn(n, 'm:' + id);
    this.reward(n, real || usefulFor.length ? R.material : 4, 'newMat');
    if (usefulFor.length) this.reward(n, R.useful, 'useful');
    mat.usefulFor = usefulFor;
    this.discoveries.push({ day: this.day(), kind: 'material', id, by: n.id, how: msg('raw', { s: '' }), comp: props.comp, real: !!real, useful: usefulFor });
    if (!real && !usefulFor.length) { this.log(msg('log.junk', { n: n.name, comp: props.comp, m: id }), 'try', n); think(n, 'th.junk', { m: id }); this.checkIdeas(n); return; }
    this.log(msg('log.newMat', { n: n.name, alloy: isAlloy, m: id, real: !!real, comp: props.comp, useful: usefulFor }), 'discovery', n);
    think(n, 'th.newMat', { m: id });
    this.checkIdeas(n);
  };

  function mixColor(c1, c2, f) {
    const p = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
    const a = p(c1), b = p(c2);
    return '#' + a.map((v, i) => Math.round(v * (1 - f) + b[i] * f).toString(16).padStart(2, '0')).join('');
  }

  /* ---------- Вибір дії (мозок на правилах + заохочення) ---------- */
  P.decide = function (n) {
    const rnd = this.rnd;
    const night = this.isNight();
    if (!isAdult(this, n)) {
      if (n.hunger > 55 && this.foodStock() > 0) return this.setTask(n, 'eat');
      if (night || n.energy < 30) return this.setTask(n, 'sleep');
      return this.setTask(n, 'play');
    }
    const starving = n.hunger > 75;
    if (!starving && ((night && n.energy < 90) || n.energy < 18)) return this.setTask(n, 'sleep');
    if (n.hunger > 60) {
      if (this.foodStock() < this.npcs.length) n.problems.food = { t: this.tick };
      if (this.foodStock() > 0) return this.setTask(n, 'eat');
      if (this.hasDev(n, 'net')) return this.setTask(n, 'fish');
      return this.setTask(n, rnd() < 0.5 ? 'hunt' : 'gather', { res: 'berries' });
    }
    // softmax над очікуваним натхненням × ситуація
    const food = this.foodStock(), pop = this.npcs.length;
    const mult = {
      gather: 1 + (food < pop * 2 ? 1.5 : 0) + (n.goalMats && n.goalMats.length ? 1 : 0),
      hunt: (food < pop * 3 ? 1.6 : 0.5) * (this.animals.some(a => a.alive && huntable(a)) ? 1 : 0),
      fish: this.hasDev(n, 'net') ? (food < pop * 3 ? 1.6 : 0.6) : 0,
      experiment: (0.5 + n.curiosity) * (food > pop ? 1.2 : 0.5),
      teach: (0.4 + n.sociability) * (n.social > 40 ? 1.6 : 1) * (pop > 1 ? 1 : 0),
      build: this.devices.house && this.houses < Math.ceil(pop / 4) ? 1.2 : 0,
      explore: 0.3 + n.curiosity * 0.6,
      // підгодувати тварин — лише коли в таборі є надлишок їжі
      feed: food > pop * 3 && (this.stock('bone') > 0 || this.stock('berries') > pop) ? 0.25 + n.sociability * 0.5 : 0,
    };
    const tau = 2.5;
    let tot = 0; const w = {};
    for (const a of ACTS) { if (n.val[a] == null) n.val[a] = 3; w[a] = mult[a] > 0 ? Math.exp(Math.min(8, n.val[a] / tau)) * mult[a] : 0; tot += w[a]; }
    let r = rnd() * tot, act = 'gather';
    for (const a of ACTS) { r -= w[a]; if (r <= 0) { act = a; break; } }
    if (act === 'gather') {
      let res;
      if (food < pop * 2) res = rnd() < 0.7 ? 'berries' : null;
      if (!res && this.stock('wood') < 4 && rnd() < 0.6) res = 'wood';
      if (!res && rnd() < 0.4) {
        const ores = { copper: 'copper_ore', tin: 'tin_ore', lead: 'lead_ore', iron: 'iron_ore' };
        const want = Object.keys(ores).filter(m => n.know.has('m:' + m) && this.stock(m) < 2 && this.stock(ores[m]) < 3 && this.findRes(n, ores[m]));
        if (want.length) res = ores[want[Math.floor(rnd() * want.length)]];
      }
      if (!res && n.goalMats && n.goalMats.length) res = n.goalMats.shift();
      if (!res) {
        const opts = V.BASE_RESOURCES.filter(id => n.know.has('m:' + id) && id !== 'water' && this.findRes(n, id));
        opts.sort((x, y) => this.stock(x) - this.stock(y));
        res = opts.length ? opts[Math.floor(rnd() * Math.min(4, opts.length))] : 'berries';
      }
      if (res === 'water') { this.give('water', 2); res = 'berries'; }
      return this.setTask(n, 'gather', { res });
    }
    return this.setTask(n, act);
  };

  P.setTask = function (n, type, extra = {}) {
    n.task = Object.assign({ type, phase: 0, t: 0, r: 0, start: this.tick }, extra);
  };

  P.endTask = function (n) {
    const t = n.task;
    if (t && ACTS.includes(t.type)) {
      const dur = Math.max(1, (this.tick - t.start) / 200);
      const perTime = (t.r || 0) / dur;
      n.val[t.type] = n.val[t.type] * 0.85 + Math.min(20, perTime) * 0.15;
    }
    n.task = null;
  };

  /* ---------- Крок поселенця ---------- */
  P.stepNPC = function (n) {
    const rnd = this.rnd;
    n.ageTicks++;
    const sleeping = n.task && n.task.type === 'sleep' && n.task.phase === 1;
    n.hunger = Math.min(100, n.hunger + (sleeping ? 0.03 : 0.055));
    if (!sleeping) n.energy = Math.max(0, n.energy - 0.06);
    n.social = Math.min(100, n.social + 0.04);
    if (n.hunger >= 100) n.health -= 0.06; else n.health = Math.min(100, n.health + 0.01 * (this.structures.house ? 2 : 1));
    if (n.health <= 0) { this.die(n); return; }
    // сильний голод перериває будь-яку справу, крім пошуку їжі
    if (n.hunger > 85) {
      if (n.carry && FOODS.includes(n.carry.id)) {           // з'їсти принесене просто на ходу
        n.hunger = Math.max(0, n.hunger - M[n.carry.id].food); n.carry.k--;
        if (n.carry.k <= 0) n.carry = null;
      }
      const t0 = n.task;
      const forFood = t0 && (t0.type === 'eat' || t0.type === 'hunt' || t0.type === 'fish' || (t0.type === 'gather' && t0.res === 'berries'));
      if (t0 && !forFood && !(t0.type === 'sleep' && n.energy < 5)) {
        if (n.carry) { this.give(n.carry.id, n.carry.k); n.carry = null; }
        if (t0.type === 'teach') { const m = this.npcs.find(x => x.id === t0.partner); if (m && m.task && m.task.type === 'listen') this.endTask(m); }
        this.endTask(n);
      }
    }
    if (!n.task) this.decide(n);
    const t = n.task; t.t++;
    const camp = this.world.camp;
    // дійшов, якщо поруч із вогнищем або довго не може пробратися до свого місця
    const toCamp = () => { const s = this.campSpot(n); return this.moveTo(n, s.x, s.y) || (t.t > 400 && Math.hypot(n.x - camp.x, n.y - camp.y) < 3.5); };

    switch (t.type) {
      case 'sleep':
        if (t.phase === 0) { think(n, 'th.rest'); if (toCamp() || t.t > 300) t.phase = 1; }   // не дійшов — спить, де застала втома
        else { n.energy = Math.min(100, n.energy + 0.22 * (this.structures.house ? 1.5 : 1)); if (n.energy >= 99 && !this.isNight()) this.endTask(n); if (!this.isNight() && n.energy > 85 && n.hunger > 70) this.endTask(n); }
        break;
      case 'eat':
        if (toCamp() || t.t > 500) {   // заблукав — їсть зі своїх запасів у дорозі
          const f = FOODS.find(x => this.stock(x) > 0);
          if (f) {
            let food = M[f].food;
            if ((f === 'meat' || f === 'fish') && n.know.has('l:cook') && this.stock('wood') > 0) { food = M.cooked.food; this.take('wood'); }
            if (this.hasDev(n, 'vessel') && f !== 'berries') { food *= 1.3; this.useDev(n, 'vessel'); }
            this.take(f); n.hunger = Math.max(0, n.hunger - food);
            think(n, 'th.ate', { m: f });
          }
          this.endTask(n);
        }
        break;
      case 'play':
        if (t.phase === 0) { t.tx = camp.x + (rnd() - 0.5) * 6; t.ty = camp.y + (rnd() - 0.5) * 6; t.phase = 1; think(n, 'th.play'); }
        if (this.moveTo(n, t.tx, t.ty) || t.t > 200) this.endTask(n);
        break;
      case 'gather': this.doGather(n, t); break;
      case 'hunt': this.doHunt(n, t); break;
      case 'fish': this.doFish(n, t); break;
      case 'explore': this.doExplore(n, t); break;
      case 'experiment': this.doExperiment(n, t); break;
      case 'teach': this.doTeach(n, t); break;
      case 'listen': if (t.t > 90 || !this.npcs.some(m => m.task && m.task.type === 'teach' && m.task.partner === n.id)) this.endTask(n); break;
      case 'build': this.doBuild(n, t); break;
      case 'feed': this.doFeed(n, t); break;
      default: this.endTask(n);
    }
    if (this.tick % 20 === n.id % 20) { this.look(n, 2); this.checkIdeas(n); }
  };

  P.doGather = function (n, t) {
    if (t.phase === 0) {
      t.tile = this.findRes(n, t.res);
      if (!t.tile) { this.endTask(n); return; }
      think(n, 'th.goGather', { m: t.res }); t.phase = 1;
    }
    if (t.phase === 1) { if (this.moveTo(n, t.tile.x + 0.5, t.tile.y + 0.5)) { t.phase = 2; t.w = 0; } if (t.t > 900) this.endTask(n); }
    else if (t.phase === 2) {
      const sp = 1 + (this.hasDev(n, 'knife') && ['wood', 'resin', 'fiber'].includes(t.res) ? this.devQ('knife') * 0.8 : 0);
      t.w += sp * (1 + n.skill.gather * 0.05);
      if (t.w >= 30) {
        const cap = (this.hasDev(n, 'cart') ? 6 : 3) + (t.res === 'berries' ? 1 : 0);
        const k = Math.min(cap, Math.floor(t.tile.a));
        if (k <= 0) { this.endTask(n); return; }
        t.tile.a -= k; if (t.tile.a < 1 && !['wood', 'berries', 'fiber', 'resin'].includes(t.res)) t.tile.r = t.tile.a > 0 ? t.tile.r : null;
        if (this.hasDev(n, 'knife') && ['wood', 'resin', 'fiber'].includes(t.res)) this.useDev(n, 'knife');
        if (this.hasDev(n, 'cart')) this.useDev(n, 'cart');
        n.carry = { id: t.res, k }; t.phase = 3; n.skill.gather += 0.02; n.gathers++;
      }
    } else if (t.phase === 3) {
      const s = this.campSpot(n);
      if (this.moveTo(n, s.x, s.y)) { this.give(n.carry.id, n.carry.k); this.reward(n, R.gather * n.carry.k, 'gather'); n.carry = null; this.endTask(n); }
    }
  };

  P.doHunt = function (n, t) {
    if (t.phase === 0) {
      let best = null, bd = 28;
      const canPen = this.structures.pen && n.know.has('d:pen');
      for (const a of this.animals) if (a.alive && huntable(a)) { const d = Math.hypot(a.x - n.x, a.y - n.y) * (a.type === 'deer' ? 0.8 : 1); if (d < bd) { bd = d; best = a; } }
      if (!best) { this.endTask(n); return; }
      t.target = best.id; t.phase = 1; t.capture = canPen && best.type === 'rabbit' && this.pen < 12 && this.rnd() < 0.5;
      if (t.capture) think(n, 'th.capture'); else think(n, 'th.huntFor', { animal: best.type });
    }
    if (t.phase === 1) {
      const a = this.animals.find(x => x.id === t.target && x.alive);
      if (!a || t.t > 700) { think(n, 'th.escaped'); this.endTask(n); return; }
      this.moveTo(n, a.x, a.y, 1.25);
      if (Math.hypot(a.x - n.x, a.y - n.y) < 0.8 && this.rnd() < 0.15) {
        const spear = this.hasDev(n, 'spear') ? this.devQ('spear') * 0.45 : 0;
        const dog = this.animals.some(d => d.alive && d.type === 'dog' && d.owner === n.id && Math.hypot(d.x - n.x, d.y - n.y) < 6);
        const p = (0.2 + spear + (dog ? 0.25 : 0) + n.skill.hunt * 0.03) * (a.type === 'deer' ? 0.6 : 1);
        if (this.rnd() < p) {
          a.alive = false; n.hunts++; n.skill.hunt += 0.08; this.stats.hunts++;
          if (spear) this.useDev(n, 'spear');
          if (t.capture) { this.pen++; this.reward(n, 4, 'tamed'); this.useDev(n, 'pen'); think(n, 'th.penned'); if (this.pen === 1) this.log(msg('log.firstPen', { n: n.name }), 'life', n); this.endTask(n); return; }
          const spec = V.ANIMALS[a.type];
          const knife = this.hasDev(n, 'knife') ? 1 : 0;
          if (knife) this.useDev(n, 'knife');
          n.carry = { id: 'meat', k: spec.meat, extra: [['hide', spec.hide + knife], ['bone', spec.bone + knife]] };
          think(n, dog ? 'th.dogHelps' : 'th.goodHunt'); t.phase = 2;
          this.reward(n, R.hunt, 'hunt');
          if (!n.know.has('m:hide')) this.learn(n, 'm:hide'); if (!n.know.has('m:bone') && spec.bone + knife > 0) this.learn(n, 'm:bone'); if (!n.know.has('m:meat')) this.learn(n, 'm:meat');
        }
      }
    } else if (t.phase === 2) {
      const s = this.campSpot(n);
      if (this.moveTo(n, s.x, s.y)) {
        this.give(n.carry.id, n.carry.k);
        for (const [id, k] of n.carry.extra || []) if (k > 0) this.give(id, k);
        n.carry = null; this.endTask(n);
      }
    }
  };

  /* ---------- Підгодовування тварин і приручення ----------
     Вовкам — кістки, травоїдним — ягоди. Довіра росте з кожним разом;
     вовк, що зовсім довіряє людям, стає собакою. */
  P.doFeed = function (n, t) {
    if (t.phase === 0) {
      let best = null, bs = -1e9;
      const dogs = this.animals.filter(x => x.alive && x.type === 'dog').length;
      const dogCap = Math.min(6, Math.ceil(this.npcs.length / 4));
      for (const a of this.animals) {
        if (!a.alive || a.type === 'dog' || a.tame) continue;
        if (a.type === 'wolf' && dogs >= dogCap) continue;           // собак уже вистачає
        const d = Math.hypot(a.x - n.x, a.y - n.y); if (d > 25) continue;
        const food = a.type === 'wolf' ? (this.stock('bone') > 0 ? 'bone' : this.stock('meat') > this.npcs.length ? 'meat' : null) : (this.stock('berries') > this.npcs.length ? 'berries' : null);
        if (!food) continue;
        const s = (a.trust || 0) * 0.6 + (a.fedBy === n.id ? 20 : 0) + (a.type === 'wolf' ? 8 : 0) - d;
        if (s > bs) { bs = s; best = { a, food }; }
      }
      if (!best || !this.take(best.food)) { this.endTask(n); return; }
      t.target = best.a.id; t.food = best.food; n.carry = { id: best.food, k: 1 }; t.phase = 1;
      think(n, 'th.feed', { animal: best.a.type });
    }
    if (t.phase === 1) {
      const a = this.animals.find(x => x.id === t.target && x.alive);
      if (!a || a.type === 'dog' || a.tame || t.t > 700) { if (n.carry) { this.give(n.carry.id, 1); n.carry = null; } this.endTask(n); return; }
      this.moveTo(n, a.x, a.y);
      if (Math.hypot(a.x - n.x, a.y - n.y) < 2.5) {
        n.carry = null;
        a.trust = Math.min(100, (a.trust || 0) + (a.type === 'wolf' ? 12 : 18) + (a.fedBy === n.id ? 6 : 0));
        a.fedBy = n.id; a.hunger = Math.max(0, (a.hunger || 0) - 35);
        this.reward(n, R.kind, 'kind');
        this.fedTypes = this.fedTypes || {};
        if (!this.fedTypes[a.type]) { this.fedTypes[a.type] = true; this.log(msg('log.firstFeed', { n: n.name, animal: a.type }), 'nature', n); }
        think(n, 'th.fed', { animal: a.type });
        if (a.trust >= 100) this.tameAnimal(n, a);
        this.endTask(n);
      }
    }
  };
  P.tameAnimal = function (n, a) {
    if (a.type === 'wolf') {
      a.type = 'dog'; a.owner = n.id; a.trust = 100;
      this.stats.dogs = (this.stats.dogs || 0) + 1;
      this.reward(n, R.tamedDog, 'tamedDog');
      this.log(msg(this.stats.dogs === 1 ? 'log.firstDog' : 'log.dog', { n: n.name }), 'discovery', n);
      return;
    }
    this.reward(n, R.tamedAnimal, 'tamed');
    if (this.structures.pen && this.pen < 12) { a.alive = false; this.pen++; this.log(msg('log.tamedPen', { n: n.name, animal: a.type }), 'nature', n); }
    else { a.tame = true; a.trust = 100; this.log(msg('log.tamed', { n: n.name, animal: a.type }), 'nature', n); }
  };

  P.doFish = function (n, t) {
    if (t.phase === 0) { t.tile = this.waterEdge(n); if (!t.tile) { this.endTask(n); return; } t.phase = 1; think(n, 'th.goFish'); }
    if (t.phase === 1) { if (this.moveTo(n, t.tile.x + 0.5, t.tile.y + 0.5)) { t.phase = 2; t.w = 0; } if (t.t > 900) this.endTask(n); }
    else if (t.phase === 2) {
      t.w++;
      if (t.w > 50) {
        const w = this.world; let water = null;
        for (const [i, j] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const u = w.at(t.tile.x + i, t.tile.y + j); if (u && w.isWater(u) && (!water || u.fish > water.fish)) water = u; }
        const q = this.devQ('net') * (this.hasDev(n, 'raft') ? 2 : 1);
        const k = water ? Math.min(Math.floor(water.fish), Math.max(1, Math.round(q * 2))) : 0;
        this.useDev(n, 'net'); if (this.hasDev(n, 'raft')) this.useDev(n, 'raft');
        if (k > 0) { water.fish -= k; n.carry = { id: 'fish', k }; this.stats.fish += k; this.reward(n, 1.5, 'catch'); think(n, 'th.caught', { k }); t.phase = 3; }
        else { think(n, 'th.noBite'); this.endTask(n); }
      }
    } else if (t.phase === 3) {
      const s = this.campSpot(n);
      if (this.moveTo(n, s.x, s.y)) { this.give('fish', n.carry.k); n.carry = null; this.endTask(n); }
    }
  };

  P.doExplore = function (n, t) {
    if (t.phase === 0) {
      const w = this.world;
      for (let k = 0; k < 30; k++) {
        const tile = w.tiles[Math.floor(this.rnd() * w.tiles.length)];
        if (!V.walkable(this.world, tile.x + 0.5, tile.y + 0.5)) continue;
        const d = Math.hypot(tile.x - n.x, tile.y - n.y);
        if (d > 8 && d < 34) { t.tx = tile.x + 0.5; t.ty = tile.y + 0.5; break; }
      }
      if (t.tx === undefined) { this.endTask(n); return; }
      t.phase = 1; think(n, 'th.explore');
    }
    if (t.phase === 1) {
      if (this.moveTo(n, t.tx, t.ty) || t.t > 800) {
        const before = n.know.size; this.look(n, 4);
        if (n.know.size === before) this.reward(n, 0.3, 'walk'); else this.reward(n, R.explore, 'explore');
        t.phase = 2;
      }
    } else if (t.phase === 2) { if (this.moveTo(n, this.world.camp.x, this.world.camp.y)) this.endTask(n); }
  };

  P.doExperiment = function (n, t) {
    if (t.phase === 0) {
      const ws = { x: this.world.camp.x + 1.6, y: this.world.camp.y - 0.4 };
      if (!this.moveTo(n, ws.x, ws.y)) return;
      const opts = this.experimentOptions(n);
      t.opts = opts;
      if (V.LLM && V.LLM.canPlan()) {
        t.phase = 1; t.waitFrom = this.tick; think(n, 'th.thinking');
        V.LLM.planExperiment(this, n, opts).then(p => { t.llmPlan = p || 'none'; }).catch(() => { t.llmPlan = 'none'; });
        return;
      }
      t.plan = this.rulePlan(n, opts); t.phase = 2; t.w = 0;
      if (!t.plan) { think(n, 'th.noMats'); n.goalMats = ['clay', 'flint', 'stone', 'fiber'].filter(id => n.know.has('m:' + id)); this.endTask(n); return; }
      n.thought = planText(t.plan); n.thoughtLLM = false;
    }
    if (t.phase === 1) {
      if (t.llmPlan && t.llmPlan !== 'none') { t.plan = t.llmPlan; t.phase = 2; t.w = 0; if (t.plan.thought) { n.thought = msg('raw', { s: t.plan.thought }); n.thoughtLLM = true; } else { n.thought = planText(t.plan); n.thoughtLLM = false; } }
      else if (t.llmPlan === 'none' || this.tick - t.waitFrom > 600) { t.plan = this.rulePlan(n, t.opts); t.phase = 2; t.w = 0; if (!t.plan) { this.endTask(n); return; } n.thought = planText(t.plan); n.thoughtLLM = false; }
      return;
    }
    if (t.phase === 2) {
      t.w += this.hasDev(n, 'lens') ? 1.4 : 1;
      if (t.w >= 70) { if (this.hasDev(n, 'lens')) this.useDev(n, 'lens'); this.runExperiment(n, t.plan); this.endTask(n); }
    }
  };
  function planText(p) {
    if (p.type === 'heat') return msg('plan.heat', { ms: p.inputs });
    if (p.type === 'build') return msg('plan.build', { idea: p.idea, ms: p.parts });
    if (p.type === 'alloy') return msg('plan.alloy', { m: p.base, m2: p.add === 'charcoal' ? 'carbon' : p.add });
    return msg('plan.comp', { m: p.matrix, m2: p.filler });
  }

  P.teachable = function (a, b) {
    const out = [];
    for (const k of a.know) if (!b.know.has(k) && !k.startsWith('l:')) out.push(k);
    for (const k of a.know) if (k.startsWith('l:') && !b.know.has(k)) out.unshift(k);
    out.sort((x, y) => rank(y) - rank(x));
    return out;
    function rank(k) { return k.startsWith('d:') ? 4 : k.startsWith('l:') ? 3 : k.startsWith('i:') ? 2 : 1; }
  };
  P.doTeach = function (n, t) {
    if (t.phase === 0) {
      let best = null, bs = -1;
      for (const m of this.npcs) {
        if (m === n || (m.task && ['sleep', 'teach', 'listen'].includes(m.task.type))) continue;
        const d = Math.hypot(m.x - n.x, m.y - n.y); if (d > 22) continue;
        const gap = this.teachable(n, m).length;
        const s = gap * 2 + (n.friends[m.id] || 0) * 0.05 - d * 0.2 + (m.ageTicks < this.DAY * 2 ? 3 : 0);
        if (s > bs) { bs = s; best = m; }
      }
      if (!best) { this.endTask(n); return; }
      t.partner = best.id; t.phase = 1; think(n, 'th.talkTo', { n: best.name });
    }
    const m = this.npcs.find(x => x.id === t.partner);
    if (!m) { this.endTask(n); return; }
    if (t.phase === 1) {
      if (this.moveTo(n, m.x + 0.4, m.y) || Math.hypot(m.x - n.x, m.y - n.y) < 0.9) {
        if (m.task && m.task.type === 'sleep') { this.endTask(n); return; }
        m.task = { type: 'listen', phase: 0, t: 0, r: 0, start: this.tick, from: n.id };
        t.phase = 2; t.w = 0;
        const items = this.teachable(n, m);
        t.items = items.slice(0, 1 + Math.floor(n.skill.teach / 2.5));
        t.convo = this.converse(n, m, t.items);
        t.lines = t.convo.lines;
        if (V.LLM && V.LLM.canChat()) V.LLM.chat(this, n, m, t.convo).then(l => { if (l) t.lines = l; }).catch(() => {});
      }
    } else if (t.phase === 2) {
      t.w++;
      if (t.w >= 70) {
        let learned = 0;
        for (const k of t.items) if (this.learn(m, k, 'taughtBy')) { learned++; this.reward(m, R.taught, 'wasTaught'); }
        if (learned) { this.reward(n, R.teach * learned, 'teach'); n.taughtCount += learned; n.skill.teach += 0.1 * learned; this.stats.taught += learned; }
        else this.reward(n, 1, 'chat');
        if (t.convo && t.convo.apply) t.convo.apply();
        // допомога голодному
        if (m.hunger > 55 && this.foodStock() > 0) {
          const f = FOODS.find(x => this.stock(x) > 0); this.take(f); m.hunger = Math.max(0, m.hunger - M[f].food);
          this.reward(n, R.help, 'fed');
          if (this.rnd() < 0.15) this.log(msg('log.help', { n: n.name, n2: m.name }), 'help', n);
        }
        n.social = Math.max(0, n.social - 50); m.social = Math.max(0, m.social - 40);
        n.friends[m.id] = (n.friends[m.id] || 0) + 8; m.friends[n.id] = (m.friends[n.id] || 0) + 8;
        if (t.lines && t.lines.length) {
          n.lastLine = t.lines[0]; if (t.lines[1]) m.lastLine = t.lines[1];
          const worth = t.convo && t.convo.kind !== 'small';
          if ((worth || learned) && this.rnd() < (worth ? 0.8 : 0.4)) this.log(msg('log.talk', { n: n.name, n2: m.name, a: t.lines[0], b: t.lines[1] || null }), 'talk', n);
        }
        if (m.task && m.task.type === 'listen') this.endTask(m);
        this.endTask(n);
      }
    }
  };

  /* ---------- Розмови: проблеми, поради, спільні рішення ----------
     a — той, хто заговорив, b — співрозмовник. Повертає репліки і що зміниться після розмови. */
  P.converse = function (a, b, items) {
    const rnd = this.rnd, sim = this;
    const both = (amt, why) => { sim.reward(a, amt, why); sim.reward(b, amt, why); };
    const knownMats = npc => [...npc.know].filter(k => k.startsWith('m:')).map(k => k.slice(2)).filter(id => M[id] && M[id].kind !== 'food' && M[id].kind !== 'ore' && M[id].kind !== 'liquid');
    const bestFor = (npc, slot, exclude) => {
      let best = null, bs = -1;
      for (const id of knownMats(npc)) { if (exclude && exclude.includes(id)) continue; const sc = V.SLOT[slot].test(M[id]); if (sc > bs) { bs = sc; best = id; } }
      return best ? { id: best, score: bs } : null;
    };
    const solved = (prob) => { delete a.problems[prob]; both(R.solve, 'solved'); };

    // 1. Проблема того, хто заговорив
    const probs = Object.keys(a.problems).filter(p => p !== 'food' || this.foodStock() < this.npcs.length);
    if (probs.length && rnd() < 0.75) {
      const p = probs[Math.floor(rnd() * probs.length)], d = a.problems[p];
      if (p === 'hotter' || p === 'air') {
        const ask = p === 'hotter' ? msg('dlg.p.hotter', { ms: d.ms, t: d.t }) : msg('dlg.p.air', { ms: d.ms });
        // хто знає кращу піч, міхи чи гарячіше паливо — підкаже
        const fuels = ['coal', 'charcoal'].filter(f => b.know.has('m:' + f) && !a.know.has('m:' + f));
        const tips = [];
        if (p === 'air' && b.know.has('d:kiln') && !a.know.has('d:kiln')) tips.push('d:kiln');
        if (p === 'air' && b.know.has('l:char') && !a.know.has('l:char')) tips.push('l:char');
        if (p === 'hotter' && b.know.has('d:bellows') && !a.know.has('d:bellows')) tips.push('d:bellows');
        if (p === 'hotter' && fuels.length) tips.push('m:' + fuels[0]);
        if (p === 'hotter' && b.know.has('d:kiln') && !a.know.has('d:kiln')) tips.push('d:kiln');
        if (tips.length) {
          const k = tips[0];
          return { kind: 'solve', lines: [ask, msg('dlg.s.know', { key: k })], topic: [ask, k],
            apply() { sim.learn(a, k, 'taughtBy'); solved(p); sim.log(msg('log.solved', { n: b.name, n2: a.name, key: k }), 'together', b); } };
        }
        // ніхто не знає — думають удвох і доходять нової ідеї
        const idea = sim.structures.kiln ? 'bellows' : 'kiln';
        return { kind: 'brainstorm', lines: [ask, msg('dlg.b.' + idea)], topic: [ask, 'i:' + idea],
          apply() {
            const na = sim.learn(a, 'i:' + idea, 'brainstorm'), nb = sim.learn(b, 'i:' + idea, 'brainstorm');
            if (na || nb) { both(R.brainstorm, 'brainstorm'); sim.log(msg('log.brainstorm', { n: a.name, n2: b.name, idea }), 'together', a); }
          } };
      }
      if (p === 'wall') {
        const ask = msg('dlg.p.wall', { cap: d.cap });
        const mat = knownMats(b).filter(id => M[id].hp > d.cap + 100 && V.SLOT.wall.test(M[id]) >= 0.6).sort((x, y) => M[y].hp - M[x].hp)[0];
        if (mat) return { kind: 'solve', lines: [ask, msg('dlg.s.wall', { m: mat })], topic: [ask, 'm:' + mat],
          apply() { sim.learn(a, 'm:' + mat, 'taughtBy'); a.suggest.push({ idea: 'kiln', si: 0, mat, from: b.id, t: sim.tick }); solved('wall'); sim.logAdvice(b, a, 'kiln', 'wall', mat); } };
        return { kind: 'brainstorm', lines: [ask, msg('dlg.b.wall')], topic: [ask], apply() { both(1, 'chat'); } };
      }
      if (p === 'device') {
        const ask = msg('dlg.p.device', { idea: d.idea, slot: d.slot });
        const known = bestFor(b, d.slot, [d.parts[d.si]]);
        if (known && known.score >= 0.6) {
          return { kind: 'solve', lines: [ask, msg('dlg.s.mat', { m: known.id, slot: d.slot })], topic: [ask, 'm:' + known.id],
            apply() {
              sim.learn(a, 'm:' + known.id, 'taughtBy');
              a.suggest.push({ idea: d.idea, si: d.si, mat: known.id, from: b.id, t: sim.tick });
              if (!b.know.has('i:' + d.idea)) sim.learn(b, 'i:' + d.idea, 'brainstorm');
              both(R.solve, 'solved'); delete a.problems.device;
              sim.logAdvice(b, a, d.idea, d.slot, known.id);
            } };
        }
        // здогадка: найкраще, що знає співрозмовник, навіть якщо не певен
        if (known) return { kind: 'brainstorm', lines: [ask, msg('dlg.g.mat', { m: known.id, slot: d.slot })], topic: [ask, 'm:' + known.id],
          apply() { sim.learn(a, 'm:' + known.id, 'taughtBy'); a.suggest.push({ idea: d.idea, si: d.si, mat: known.id, from: b.id, t: sim.tick }); both(1, 'chat'); } };
      }
      if (p === 'missing' && d.m) {
        const ask = msg('dlg.p.missing', { m: d.m });
        if (b.know.has('m:' + d.m) && V.BASE_RESOURCES.includes(d.m) && sim.findRes(b, d.m)) {
          return { kind: 'help', lines: [ask, msg('dlg.s.missing', { m: d.m })], topic: [ask],
            apply() { b.goalMats = [d.m].concat(b.goalMats || []); delete a.problems.missing; both(2, 'solved'); } };
        }
      }
      if (p === 'food') {
        const ask = msg('dlg.p.food');
        const dev = ['net', 'spear', 'pen', 'vessel'].find(id => b.know.has('d:' + id) && !a.know.has('d:' + id) && sim.devices[id]);
        if (dev) return { kind: 'solve', lines: [ask, msg('dlg.s.food', { idea: dev })], topic: [ask, 'd:' + dev],
          apply() { sim.learn(a, 'd:' + dev, 'taughtBy'); solved('food'); sim.log(msg('log.solved', { n: b.name, n2: a.name, key: 'd:' + dev }), 'together', b); } };
        const idea = ['spear', 'net', 'pen'].find(id => !sim.devices[id] && !(a.know.has('i:' + id) && b.know.has('i:' + id)));
        if (idea) return { kind: 'brainstorm', lines: [ask, msg('dlg.b.food', { idea })], topic: [ask, 'i:' + idea],
          apply() { sim.learn(a, 'i:' + idea, 'brainstorm'); sim.learn(b, 'i:' + idea, 'brainstorm'); both(R.brainstorm, 'brainstorm'); } };
      }
    }

    // 2. Поділитися власною ідеєю й попросити поради
    const ideas = [...a.know].filter(k => k.startsWith('i:') && !this.devices[k.slice(2)]).map(k => k.slice(2));
    if (ideas.length && rnd() < 0.5) {
      const idea = ideas[Math.floor(rnd() * ideas.length)], slots = V.IDEAS[idea].slots;
      const si = Math.floor(rnd() * slots.length);
      const g = bestFor(b, slots[si]);
      const say = msg('dlg.idea', { idea });
      if (g) return { kind: 'idea', lines: [say, msg('dlg.g.mat', { m: g.id, slot: slots[si] })], topic: [say, 'm:' + g.id],
        apply() {
          sim.learn(a, 'm:' + g.id, 'taughtBy'); sim.learn(b, 'i:' + idea, 'brainstorm');
          a.suggest.push({ idea, si, mat: g.id, from: b.id, t: sim.tick }); both(1.5, 'brainstorm');
        } };
    }

    // 3. Розповісти новину: власний винахід чи відкриття
    const mine = this.discoveries.filter(d => d.by === a.id && this.tick - this.DAY * (d.day - 1) < this.DAY * 3).pop();
    if (mine && rnd() < 0.5) {
      const say = mine.kind === 'material' ? msg('dlg.news.mat', { m: mine.id, n: a.name }) : msg('dlg.news.dev', { idea: mine.id });
      return { kind: 'news', lines: [say, msg('dlg.news.a')], topic: [say] };
    }

    // 4. Звичайне навчання або балачки
    const ln = this.dialogue(a, b, items);
    return { kind: items.length ? 'teach' : 'small', lines: ln, topic: ln.slice(0, 1) };
  };

  /* Однакову пораду в хроніці показуємо не частіше разу на два дні */
  P.logAdvice = function (from, to, idea, slot, mat) {
    this.adviceSeen = this.adviceSeen || {};
    const key = idea + slot + mat;
    if (this.adviceSeen[key] && this.tick - this.adviceSeen[key] < this.DAY * 2) return;
    this.adviceSeen[key] = this.tick;
    this.log(msg('log.advice', { n: from.name, n2: to.name, m: mat, slot, idea }), 'together', from);
  };

  P.dialogue = function (a, b, items) {
    const rnd = this.rnd;
    if (!items.length) {
      const i = Math.floor(rnd() * 4); return [msg('small.' + i), msg('ans.' + i)];
    }
    const k = items[0], id = k.slice(2);
    if (k.startsWith('d:')) { const d = this.devices[id]; return [msg('dlg.design', { idea: id, ms: d ? d.parts : [] }), msg('dlg.designA')]; }
    if (k.startsWith('l:')) { const l = V.LAWS.find(x => x.id === id); return [msg('dlg.law', { ms: l.inputs, m: l.out, cold: l.minT === 0 }), msg('dlg.lawA')]; }
    if (k.startsWith('i:')) return [msg('dlg.idea', { idea: id }), msg('dlg.ideaA')];
    return [msg('dlg.mat', { m: id, infoMat: id }), msg('dlg.matA')];
  };

  P.doBuild = function (n, t) {
    if (t.phase === 0) {
      const d = this.devices.house;
      if (!d) { this.endTask(n); return; }
      for (const id of d.parts) if (this.stock(id) < 2) { n.goalMats = d.parts.filter(x => V.BASE_RESOURCES.includes(x)); this.endTask(n); return; }
      for (const id of d.parts) this.take(id, 2);
      t.phase = 1; t.w = 0; think(n, 'th.buildHouse');
    }
    if (t.phase === 1) {
      const s = { x: this.world.camp.x - 2, y: this.world.camp.y + 1.5 };
      if (this.moveTo(n, s.x, s.y)) { t.w++; if (t.w > 120) { this.houses++; this.reward(n, R.build, 'built'); this.log(msg('log.house', { n: n.name, k: this.houses }), 'life', n); this.endTask(n); } }
    }
  };

  P.die = function (n) {
    this.log(msg('log.death', { n: n.name }), 'death', n);
    this.dead.push(n); this.npcs = this.npcs.filter(x => x !== n);
  };

  /* ---------- Світанок: народження, таблички, загорода ---------- */
  P.dawn = function () {
    const rnd = this.rnd;
    if (this.pen > 0) { const k = Math.floor(this.pen / 2); if (k) { this.give('meat', k); } if (this.pen >= 2 && this.pen < 12) this.pen++; }
    if (this.structures.tablet) {
      const writers = this.npcs.filter(n => n.know.has('d:tablet'));
      const pool = new Set(); for (const w of writers) for (const k of w.know) pool.add(k);
      let spread = 0;
      for (const n of this.npcs) {
        const miss = [...pool].filter(k => !n.know.has(k));
        for (let i = 0; i < 3 && miss.length; i++) { const k = miss.splice(Math.floor(rnd() * miss.length), 1)[0]; if (this.learn(n, k, 'readTablets')) spread++; }
      }
      if (spread) for (const w of writers) this.reward(w, spread * 0.3, 'tablets');
    }
    const adults = this.npcs.filter(n => isAdult(this, n));
    if (this.npcs.length < 22 && this.foodStock() >= this.npcs.length * 2 && rnd() < 0.45 && adults.length >= 2) {
      let pair = null, best = 30;
      for (const a of adults) for (const id in a.friends) { const b = adults.find(x => x.id == id); if (b && b !== a && a.friends[id] > best) { best = a.friends[id]; pair = [a, b]; } }
      if (pair) {
        const c = this.addNPC(pair);
        c.x = this.world.camp.x; c.y = this.world.camp.y;
        this.stats.births++;
        this.log(msg('log.birth', { n: pair[0].name, n2: pair[1].name, n3: c.name }), 'birth', c);
      }
    }
    this.updateEra();
  };

  P.updateEra = function () {
    const has = id => this.worldKnown.has(id);
    const anyAlloy = pred => Object.values(M).some(m => m.alloy && this.worldKnown.has(m.id) && pred(m));
    let era = 'stone';
    if (has('ceramic')) era = 'ceramic';
    if (has('copper')) era = 'copper';
    if (anyAlloy(m => m.comp.some(c => c[0] === 'tin') && m.comp.some(c => c[0] === 'copper'))) era = 'bronze';
    if (has('iron')) era = 'iron';
    if (has('glass') && has('iron')) era = 'glass';
    if (this.structures.cell) era = 'electric';
    if (era !== this.era) { this.era = era; this.log(msg('log.era', { era }), 'era'); }
  };

  P.wolfDied = function () { this.stats.wolfDeaths = (this.stats.wolfDeaths || 0) + 1; this.log(msg('log.wolfDied'), 'nature'); };
  P.wolvesArrived = function () { this.log(msg('log.wolves'), 'nature'); };

  P.step = function () {
    this.tick++;
    V.stepAnimals(this);
    for (const n of this.npcs.slice()) this.stepNPC(n);
    if (this.tick % this.DAY === Math.floor(this.DAY * 0.06)) this.dawn();
  };

  /* Підсумок для інтерфейсу / LLM */
  P.summary = function () {
    return { day: this.day(), era: this.era, pop: this.npcs.length, food: this.foodStock(), inventions: Object.keys(this.devices).length, materials: this.worldKnown.size };
  };
})(window.V = window.V || {});
