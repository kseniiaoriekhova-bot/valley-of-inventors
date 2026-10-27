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
  const FEMALE = new Set(['Олеся', 'Мирослава', 'Ярина', 'Злата', 'Леся', 'Устина', 'Марта', 'Соломія', 'Дарина', 'Христя', 'Іванна', 'Галя', 'Віра']);
  const g = (n, m, f) => FEMALE.has(n.name) ? f : m;
  V.g = g;

  // Заохочення («натхнення»)
  const R = V.REWARD = {
    learn: 2, teach: 4, taught: 2, idea: 2, material: 15, useful: 20, invent: 40, partial: 5, fail: 1,
    improve: 10, impact: 0.3, help: 3, build: 5, hunt: 1.5, gather: 0.5, explore: 1,
  };
  const ACTS = ['gather', 'hunt', 'fish', 'experiment', 'teach', 'build', 'explore'];
  const ACT_NAMES = { gather: 'збирає', hunt: 'полює', fish: 'рибалить', experiment: 'експериментує', teach: 'навчає', build: 'будує', explore: 'досліджує', eat: 'їсть', sleep: 'спить', listen: 'слухає', play: 'грається', think: 'обмірковує' };
  V.ACT_NAMES = ACT_NAMES;

  function Sim(seed) {
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
    this.era = 'Кам\'яна доба';
    this.stats = { wolfKills: 0, hunts: 0, fish: 0, taught: 0, experiments: 0, births: 0 };
    V.spawnAnimals(this);
    for (let i = 0; i < 8; i++) this.addNPC(null);
    this.log('Вісім поселенців розклали багаття в долині. Вони вміють розводити вогонь — і більше нічого.', 'era');
  }
  V.Sim = Sim;
  const P = Sim.prototype;

  P.day = function () { return Math.floor(this.tick / this.DAY) + 1; };
  P.phase = function () { return (this.tick % this.DAY) / this.DAY; };
  P.isNight = function () { const p = this.phase(); return p > 0.78 || p < 0.04; };
  P.log = function (text, kind = 'life', npc = null) {
    this.chronicle.push({ day: this.day(), t: this.tick, text, kind, npc: npc ? npc.id : null });
    if (this.chronicle.length > 400) this.chronicle.shift();
    if (npc) { npc.history.unshift(`День ${this.day()}: ${text}`); if (npc.history.length > 12) npc.history.pop(); }
  };

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
      know: new Set(), insp: 0, val: {}, task: null, carry: null, thought: 'Оглядаюся довкола.',
      history: [], failures: new Set(), hints: {}, friends: {}, inventions: [], taughtCount: 0,
      hunts: 0, gathers: 0, heatTries: 0, ageTicks: parents ? 0 : this.DAY * 3, parents: parents ? parents.map(p => p.id) : null,
      llmNote: '',
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
    this.reward(n, key.startsWith('i:') ? R.idea : R.learn, how || 'нове знання');
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
    if (d && d.inventor !== n.id) { const inv = this.npcs.find(x => x.id === d.inventor); if (inv) this.reward(inv, R.impact, 'інші користуються моїм винаходом'); }
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
  P.campSpot = function (n) { const a = (n.id * 2.4) % 6.28; const r = 1.2 + (n.id % 3) * 0.5; return { x: this.world.camp.x + Math.cos(a) * r, y: this.world.camp.y + Math.sin(a) * r }; };

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
      if (w.isWater(t) || t.t === V.T.MOUNT) continue;
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
        this.learn(n, 'm:' + t.r, 'знайшов новий матеріал');
        if (first) this.log(`${n.name} вперше ${g(n, 'знаходить', 'знаходить')} у долині: ${M[t.r].name}.`, 'find', n);
      }
      if (w.isWater(t) && t.fish > 2 && !n.know.has('m:fish')) this.learn(n, 'm:fish', 'побачив рибу');
    }
  };

  /* ---------- Ідеї: виникають із проблем ---------- */
  P.checkIdeas = function (n) {
    const k = x => n.know.has(x);
    const unlock = (id, why) => {
      if (!k('i:' + id) && this.learn(n, 'i:' + id, 'нова ідея')) {
        n.thought = why.charAt(0).toUpperCase() + why.slice(1);
        if (!this.ideasSeen.has(id)) { this.ideasSeen.add(id); this.log(`${n.name} замислюється: ${why}`, 'idea', n); }
      }
    };
    if (k('m:clay') && (k('l:cook') || this.day() >= 2)) unlock('vessel', 'якби мати щось, що тримає воду над вогнем…');
    if (n.hints.air || n.hints.hotter) unlock('kiln', 'треба загородити вогонь, щоб жар не розходився.');
    if (n.hints.hotter && this.structures.kiln) unlock('bellows', 'а якщо дмухати в піч повітрям?');
    if (k('m:fish') && k('m:fiber')) unlock('net', 'риба близько — от би її чимось вичерпати.');
    if (k('d:net') || (k('m:fish') && k('m:wood') && this.day() >= 4)) unlock('raft', 'деревина тримається на воді… а людина на ній?');
    if (n.gathers >= 12) unlock('cart', 'носити все в руках — надто повільно.');
    if (n.hunts >= 3 && k('m:fiber')) unlock('pen', 'а що як тримати тварин поруч, замість ганятися за ними?');
    if ((k('m:brick') || k('m:mortar') || k('m:stone')) && this.day() >= 3 && this.structures.kiln) unlock('house', 'стіни, що тримають жар у печі, втримають і тепло вночі.');
    if (k('m:glass')) unlock('lens', 'крізь скло все здається більшим!');
    if (n.taughtCount >= 5 && k('m:clay')) unlock('tablet', 'якщо видряпати знання на глині, їх не забудуть.');
    const metals = [...n.know].filter(x => x.startsWith('m:') && M[x.slice(2)] && M[x.slice(2)].cond >= 0.9).length;
    if (metals >= 2 && (k('m:salt') || k('m:quicklime'))) unlock('cell', 'два різні метали в солоній воді щипають язик — у цьому щось є.');
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
    n.skill.craft += 0.05;
    const sig = JSON.stringify(plan.type === 'alloy' || plan.type === 'composite' ? { t: plan.type } : plan);
    const fuel = this.bestFuel(n);
    const T = fuel ? this.temp(fuel) : { t: 0, raw: 0, cap: Infinity, enclosed: false };

    if (plan.type === 'heat') {
      for (const id of plan.inputs) if (!this.take(id)) return this.fail(n, `забракло: ${M[id].name}`, plan);
      if (fuel) this.take(fuel);
      n.heatTries++;
      const res = V.heat(plan.inputs, T.t, T.enclosed);
      const names = plan.inputs.map(id => M[id].name).join(' + ');
      if (T.raw > T.cap && !res.ok) { n.hints.wall = true; this.log(`${n.name}: стіни печі тріщать — вище ${Math.round(T.cap)}°C вони не витримують.`, 'hint', n); }
      if (res.ok) {
        const out = res.out, k = out === 'cooked' ? 2 : 3;
        this.give(out, k);
        n.know.add('l:' + res.law);
        const first = !this.worldKnown.has(out);
        if (this.learn(n, 'm:' + out)) { /* винагорода в learn */ }
        if (first) {
          this.reward(n, R.material, 'відкрив новий матеріал');
          const cold = V.LAWS.find(l => l.id === res.law).minT === 0;
          this.discoveries.push({ day: this.day(), kind: 'material', id: out, name: M[out].name, by: n.id, how: cold ? `${names}, без нагрівання` : `${names} при ${Math.round(T.t)}°C`, why: res.why, real: true });
          this.log(`★ ${n.name} ${cold ? 'поєднує' : 'нагріває'} ${names}${cold ? '' : ` до ${Math.round(T.t)}°C`} і отримує новий матеріал — ${M[out].name}! (${res.why})`, 'discovery', n);
          n.thought = `Вийшло! ${M[out].name}!`;
        } else { n.thought = `Знову вийшло: ${M[out].name}.`; this.reward(n, 1, 'корисна робота'); }
        n.hints.hotter = false;
        return;
      }
      n.failures.add(JSON.stringify(plan) + '@' + Math.round(T.t / 100));
      if (res.hint === 'hotter') { n.hints.hotter = true; n.hints.hotterSet = plan.inputs.slice().sort().join('+'); this.reward(n, 3, 'цінне спостереження'); this.log(`${n.name}: ${names} — ${res.note}`, 'hint', n); }
      else if (res.hint === 'air') { n.hints.air = true; this.reward(n, 3, 'цінне спостереження'); this.log(`${n.name}: ${names} — ${res.note}`, 'hint', n); }
      else this.reward(n, R.fail, 'спроба');
      n.thought = res.note;
      this.checkIdeas(n);
      return;
    }

    if (plan.type === 'build') {
      const idea = V.IDEAS[plan.idea];
      const need = {};
      plan.parts.forEach(id => need[id] = (need[id] || 0) + (idea.structure ? 2 : 1));
      for (const id in need) if (this.stock(id) < need[id]) return this.fail(n, `забракло: ${M[id].name}`, plan, true);
      for (const id in need) this.take(id, need[id]);
      const ev = V.evaluate(plan.idea, plan.parts.map(id => M[id]));
      const desc = plan.parts.map((id, i) => `${V.SLOT[idea.slots[i]].name} — ${M[id].name}`).join(', ');
      const cur = this.devices[plan.idea];
      if (ev.works) {
        if (!cur || ev.quality > cur.quality + 0.05) {
          const isNew = !cur;
          const name = plan.name || (isNew ? idea.name : `${idea.name} (вдосконалений)`);
          this.devices[plan.idea] = { idea: plan.idea, parts: plan.parts, quality: ev.quality, inventor: n.id, day: this.day(), name, extra: ev.extra };
          n.know.add('d:' + plan.idea);
          n.inventions.push(name);
          if (idea.structure) this.buildStructure(plan.idea, plan.parts, ev);
          if (isNew) {
            const bonus = Math.round(R.invent * Math.min(1.2, ev.quality));
            this.reward(n, bonus, 'новий винахід працює');
            this.discoveries.push({ day: this.day(), kind: 'device', id: plan.idea, name, by: n.id, how: desc, why: idea.effect, quality: ev.quality, extra: ev.extra });
            const v = ev.extra && ev.extra.volts ? ` Напруга ${ev.extra.volts.toFixed(2)} В.` : '';
            this.log(`★ ${n.name} винаходить: ${name}! (${desc}) — працює, якість ${ev.quality}.${v}`, 'discovery', n);
            n.thought = `Мій ${idea.name} працює!`;
          } else {
            this.reward(n, R.improve, 'покращив винахід');
            this.discoveries.push({ day: this.day(), kind: 'improve', id: plan.idea, name, by: n.id, how: desc, quality: ev.quality });
            this.log(`${n.name} вдосконалює ${idea.name}: ${desc}. Якість ${cur.quality} → ${ev.quality}.`, 'improve', n);
          }
          if (plan.idea === 'kiln') n.hints.wall = false;
        } else {
          n.know.add('d:' + plan.idea);
          this.reward(n, 2, 'відтворив відому конструкцію');
          n.thought = `Мій ${idea.name} не кращий за наявний.`;
          n.failures.add(sig);
        }
        return;
      }
      n.failures.add(sig);
      const weak = V.SLOT[ev.weakSlot].name;
      if (ev.partial) {
        this.reward(n, R.partial, 'майже вийшло');
        n.thought = `${idea.name} майже працює, але ${weak} підводить.`;
        this.log(`${n.name} пробує ${idea.name} (${desc}) — майже, але ${weak} не годиться.`, 'try', n);
      } else {
        this.reward(n, R.fail, 'спроба');
        n.thought = `${idea.name} з такого не вийде: ${weak} нікуди не годиться.`;
      }
      return;
    }

    if (plan.type === 'alloy' || plan.type === 'composite') return this.makeMaterial(n, plan, T);
  };

  P.fail = function (n, why, plan, gatherNeeded) {
    n.thought = `Не можу почати: ${why}.`;
    this.reward(n, 0.2, 'спроба');
    if (plan) n.goalMats = (plan.inputs || plan.parts || []).filter(id => this.stock(id) < 2 && V.BASE_RESOURCES.includes(id));
  };

  P.buildStructure = function (idea, parts, ev) {
    const m = M[parts[0]];
    if (idea === 'kiln') { this.structures.kiln = { wall: parts[0], hp: m.hp, name: m.name }; }
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
    if (!this.take(a)) return this.fail(n, `забракло: ${M[a].name}`, plan);
    if (!this.take(b)) { this.give(a); return this.fail(n, `забракло: ${M[b].name}`, plan); }
    if (isAlloy && T.t < need) {
      n.hints.hotter = true;
      this.reward(n, 2, 'цінне спостереження');
      n.thought = `${M[a].name} і ${M[b].name} не змішуються — треба розплавити, а це ${need}°C.`;
      this.log(`${n.name} намагається сплавити ${M[a].name} з ${M[b].name}, але печі не вистачає жару (${Math.round(T.t)}°C).`, 'hint', n);
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
      this.reward(n, 1, 'повторив рецепт');
      n.thought = `Вийшов знайомий ${existing.name}.`;
      return;
    }
    // ще не досить міцне — розсипається
    if (props.tough < 0.4 || props.hard < 0.3) {
      this.reward(n, R.fail, 'спроба');
      n.thought = 'Суміш розсипалася на порох.';
      this.log(`${n.name}: суміш ${V.describeComp(props.comp)} розсипалася.`, 'try', n);
      return;
    }
    const real = V.matchReal(props.comp);
    const id = 'g' + (++this.genCount);
    const pool = Object.values(M).filter(m => this.worldKnown.has(m.id));
    let name, desc;
    if (real) {
      name = real.name;
      desc = `${real.note}. Склад: ${V.describeComp(props.comp)}.`;
    } else {
      name = plan.name && plan.name.length < 30 ? plan.name : V.inventWord(this.rnd);
      const near = V.nearest(props, pool.concat(V.REAL_PROPS || []));
      desc = `Нового типу: ${isAlloy ? 'сплав' : 'композит'} ${V.describeComp(props.comp)}. У реальному світі окремої назви не має. Найближчий за властивостями: ${near ? near.name : '—'}.`;
    }
    // якщо реальна назва вже зайнята (інша пропорція того ж класу) — додаємо пропорцію
    if (Object.values(M).some(m => m.name === name)) name = `${name} (${V.describeComp(props.comp)})`;
    const color = isAlloy ? mixColor(M[a].color, M[b] ? M[b].color : '#333', f) : mixColor(M[a].color, M[b].color, f);
    const mat = Object.assign({ id, name, kind: isAlloy ? 'alloy' : 'composite', trans: 0, fuel: 0, food: 0, ion: 0, air: 0, binder: 0, plast: 0, hp: 0, mp: 0, cond: 0, pot: 0, sharp: 0, wp: 0 }, props, { sig: sigKey, real: !!real, desc, color, inventor: n.id, day: this.day() });
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
      if (sc > best + 0.05) usefulFor.push(V.SLOT[s].name);
    }
    this.learn(n, 'm:' + id);
    this.reward(n, real || usefulFor.length ? R.material : 4, 'створив новий матеріал');
    if (usefulFor.length) this.reward(n, R.useful, 'новий матеріал працює краще за відомі');
    mat.usefulFor = usefulFor;
    this.discoveries.push({ day: this.day(), kind: 'material', id, name, by: n.id, how: V.describeComp(props.comp), why: desc, real: !!real, useful: usefulFor });
    const tag = real ? 'справжній матеріал' : 'невідомий у реальному світі';
    const use = usefulFor.length ? ` Найкращий для: ${usefulFor.join(', ')}!` : '';
    if (!real && !usefulFor.length) { this.log(`${n.name} змішує ${V.describeComp(props.comp)} і називає це «${name}». Поки незрозуміло, навіщо воно.`, 'try', n); n.thought = `«${name}»… цікаво, але навіщо?`; this.checkIdeas(n); return; }
    this.log(`★ ${n.name} створює ${isAlloy ? 'сплав' : 'композит'} «${name}» (${tag}): ${V.describeComp(props.comp)}.${use}`, 'discovery', n);
    n.thought = `Новий матеріал — «${name}»!`;
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
      if (night || n.energy < 30) return this.setTask(n, 'sleep');
      if (n.hunger > 55 && this.foodStock() > 0) return this.setTask(n, 'eat');
      return this.setTask(n, 'play');
    }
    if ((night && n.energy < 90) || n.energy < 18) return this.setTask(n, 'sleep');
    if (n.hunger > 60) {
      if (this.foodStock() > 0) return this.setTask(n, 'eat');
      if (this.hasDev(n, 'net')) return this.setTask(n, 'fish');
      return this.setTask(n, rnd() < 0.5 ? 'hunt' : 'gather', { res: 'berries' });
    }
    // softmax над очікуваним натхненням × ситуація
    const food = this.foodStock(), pop = this.npcs.length;
    const mult = {
      gather: 1 + (food < pop * 2 ? 1.5 : 0) + (n.goalMats && n.goalMats.length ? 1 : 0),
      hunt: (food < pop * 3 ? 1.6 : 0.5) * (this.animals.some(a => a.alive && a.type !== 'wolf') ? 1 : 0),
      fish: this.hasDev(n, 'net') ? (food < pop * 3 ? 1.6 : 0.6) : 0,
      experiment: (0.5 + n.curiosity) * (food > pop ? 1.2 : 0.5),
      teach: (0.4 + n.sociability) * (n.social > 40 ? 1.6 : 1) * (pop > 1 ? 1 : 0),
      build: this.devices.house && this.houses < Math.ceil(pop / 4) ? 1.2 : 0,
      explore: 0.3 + n.curiosity * 0.6,
    };
    const tau = 2.5;
    let tot = 0; const w = {};
    for (const a of ACTS) { w[a] = mult[a] > 0 ? Math.exp(Math.min(8, n.val[a] / tau)) * mult[a] : 0; tot += w[a]; }
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
    if (!n.task) this.decide(n);
    const t = n.task; t.t++;
    const camp = this.world.camp;
    const toCamp = () => { const s = this.campSpot(n); return this.moveTo(n, s.x, s.y); };

    switch (t.type) {
      case 'sleep':
        if (t.phase === 0) { n.thought = 'Час відпочити.'; if (toCamp()) t.phase = 1; }
        else { n.energy = Math.min(100, n.energy + 0.22 * (this.structures.house ? 1.5 : 1)); if (n.energy >= 99 && !this.isNight()) this.endTask(n); if (!this.isNight() && n.energy > 85 && n.hunger > 70) this.endTask(n); }
        break;
      case 'eat':
        if (toCamp()) {
          const f = FOODS.find(x => this.stock(x) > 0);
          if (f) {
            let food = M[f].food;
            if ((f === 'meat' || f === 'fish') && n.know.has('l:cook') && this.stock('wood') > 0) { food = M.cooked.food; this.take('wood'); }
            if (this.hasDev(n, 'vessel') && f !== 'berries') { food *= 1.3; this.useDev(n, 'vessel'); }
            this.take(f); n.hunger = Math.max(0, n.hunger - food);
            n.thought = `Поїв: ${M[f].name}.`;
          }
          this.endTask(n);
        }
        break;
      case 'play':
        if (t.phase === 0) { t.tx = camp.x + (rnd() - 0.5) * 6; t.ty = camp.y + (rnd() - 0.5) * 6; t.phase = 1; n.thought = 'Граюся біля табору!'; }
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
      default: this.endTask(n);
    }
    if (this.tick % 20 === n.id % 20) { this.look(n, 2); this.checkIdeas(n); }
  };

  P.doGather = function (n, t) {
    if (t.phase === 0) {
      t.tile = this.findRes(n, t.res);
      if (!t.tile) { this.endTask(n); return; }
      n.thought = `Іду по ${M[t.res].name}.`; t.phase = 1;
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
      if (this.moveTo(n, s.x, s.y)) { this.give(n.carry.id, n.carry.k); this.reward(n, R.gather * n.carry.k, 'приніс до табору'); n.carry = null; this.endTask(n); }
    }
  };

  P.doHunt = function (n, t) {
    if (t.phase === 0) {
      let best = null, bd = 28;
      const canPen = this.structures.pen && n.know.has('d:pen');
      for (const a of this.animals) if (a.alive && a.type !== 'wolf') { const d = Math.hypot(a.x - n.x, a.y - n.y) * (a.type === 'deer' ? 0.8 : 1); if (d < bd) { bd = d; best = a; } }
      if (!best) { this.endTask(n); return; }
      t.target = best.id; t.phase = 1; t.capture = canPen && best.type === 'rabbit' && this.pen < 12 && this.rnd() < 0.5;
      n.thought = t.capture ? 'Спробую впіймати кроля живим.' : `Полюю на: ${V.ANIMALS[best.type].name}.`;
    }
    if (t.phase === 1) {
      const a = this.animals.find(x => x.id === t.target && x.alive);
      if (!a || t.t > 700) { n.thought = 'Втекло…'; this.endTask(n); return; }
      this.moveTo(n, a.x, a.y, 1.25);
      if (Math.hypot(a.x - n.x, a.y - n.y) < 0.8 && this.rnd() < 0.15) {
        const spear = this.hasDev(n, 'spear') ? this.devQ('spear') * 0.45 : 0;
        const p = (0.2 + spear + n.skill.hunt * 0.03) * (a.type === 'deer' ? 0.6 : 1);
        if (this.rnd() < p) {
          a.alive = false; n.hunts++; n.skill.hunt += 0.08; this.stats.hunts++;
          if (spear) this.useDev(n, 'spear');
          if (t.capture) { this.pen++; this.reward(n, 4, 'приручив тварину'); this.useDev(n, 'pen'); n.thought = 'Кріль у загороді!'; if (this.pen === 1) this.log(`${n.name} приводить першого прирученого кроля в загороду.`, 'life', n); this.endTask(n); return; }
          const spec = V.ANIMALS[a.type];
          const knife = this.hasDev(n, 'knife') ? 1 : 0;
          if (knife) this.useDev(n, 'knife');
          n.carry = { id: 'meat', k: spec.meat, extra: [['hide', spec.hide + knife], ['bone', spec.bone + knife]] };
          n.thought = 'Вдале полювання!'; t.phase = 2;
          this.reward(n, R.hunt, 'вдале полювання');
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

  P.doFish = function (n, t) {
    if (t.phase === 0) { t.tile = this.waterEdge(n); if (!t.tile) { this.endTask(n); return; } t.phase = 1; n.thought = 'Йду рибалити.'; }
    if (t.phase === 1) { if (this.moveTo(n, t.tile.x + 0.5, t.tile.y + 0.5)) { t.phase = 2; t.w = 0; } if (t.t > 900) this.endTask(n); }
    else if (t.phase === 2) {
      t.w++;
      if (t.w > 50) {
        const w = this.world; let water = null;
        for (const [i, j] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const u = w.at(t.tile.x + i, t.tile.y + j); if (u && w.isWater(u) && (!water || u.fish > water.fish)) water = u; }
        const q = this.devQ('net') * (this.hasDev(n, 'raft') ? 2 : 1);
        const k = water ? Math.min(Math.floor(water.fish), Math.max(1, Math.round(q * 2))) : 0;
        this.useDev(n, 'net'); if (this.hasDev(n, 'raft')) this.useDev(n, 'raft');
        if (k > 0) { water.fish -= k; n.carry = { id: 'fish', k }; this.stats.fish += k; this.reward(n, 1.5, 'улов'); n.thought = `Упіймав рибу (${k}).`; t.phase = 3; }
        else { n.thought = 'Не клює.'; this.endTask(n); }
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
      t.phase = 1; n.thought = 'Цікаво, що там, за пагорбами?';
    }
    if (t.phase === 1) {
      if (this.moveTo(n, t.tx, t.ty) || t.t > 800) {
        const before = n.know.size; this.look(n, 4);
        if (n.know.size === before) this.reward(n, 0.3, 'прогулянка'); else this.reward(n, R.explore, 'дослідив місцевість');
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
        t.phase = 1; t.waitFrom = this.tick; n.thought = 'Обмірковую ідею…';
        V.LLM.planExperiment(this, n, opts).then(p => { t.llmPlan = p || 'none'; }).catch(() => { t.llmPlan = 'none'; });
        return;
      }
      t.plan = this.rulePlan(n, opts); t.phase = 2; t.w = 0;
      if (!t.plan) { n.thought = 'Бракує матеріалів для дослідів.'; n.goalMats = ['clay', 'flint', 'stone', 'fiber'].filter(id => n.know.has('m:' + id)); this.endTask(n); return; }
      n.thought = planText(t.plan);
    }
    if (t.phase === 1) {
      if (t.llmPlan && t.llmPlan !== 'none') { t.plan = t.llmPlan; n.llmNote = t.plan.thought || ''; t.phase = 2; t.w = 0; n.thought = t.plan.thought || planText(t.plan); }
      else if (t.llmPlan === 'none' || this.tick - t.waitFrom > 600) { t.plan = this.rulePlan(n, t.opts); t.phase = 2; t.w = 0; if (!t.plan) { this.endTask(n); return; } n.thought = planText(t.plan); }
      return;
    }
    if (t.phase === 2) {
      t.w += this.hasDev(n, 'lens') ? 1.4 : 1;
      if (t.w >= 70) { if (this.hasDev(n, 'lens')) this.useDev(n, 'lens'); this.runExperiment(n, t.plan); this.endTask(n); }
    }
  };
  function planText(p) {
    if (p.type === 'heat') return `Спробую нагріти: ${p.inputs.map(id => M[id].name).join(' + ')}.`;
    if (p.type === 'build') return `Майструю ${V.IDEAS[p.idea].name}: ${p.parts.map(id => M[id].name).join(', ')}.`;
    if (p.type === 'alloy') return `Сплавляю ${M[p.base].name} з ${p.add === 'charcoal' ? 'вуглецем' : M[p.add].name}.`;
    if (p.type === 'composite') return `Змішую ${M[p.matrix].name} з ${M[p.filler].name}.`;
    return 'Думаю.';
  }

  P.teachable = function (a, b) {
    const out = [];
    for (const k of a.know) if (!b.know.has(k) && !k.startsWith('l:')) out.push(k);
    for (const k of a.know) if (k.startsWith('l:') && !b.know.has(k)) out.unshift(k);
    out.sort((x, y) => rank(y) - rank(x));
    return out;
    function rank(k) { return k.startsWith('d:') ? 4 : k.startsWith('l:') ? 3 : k.startsWith('i:') ? 2 : 1; }
  };
  V.knowName = function (k) {
    const id = k.slice(2);
    if (k.startsWith('m:')) return M[id] ? M[id].name : id;
    if (k.startsWith('d:')) return 'як зробити: ' + (V.IDEAS[id] ? V.IDEAS[id].name : id);
    if (k.startsWith('i:')) return 'ідея: ' + (V.IDEAS[id] ? V.IDEAS[id].name : id);
    if (k.startsWith('l:')) { const l = V.LAWS.find(x => x.id === id); return l ? 'закон: ' + l.inputs.map(x => M[x].name).join('+') + ' → ' + M[l.out].name : id; }
    return k;
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
      t.partner = best.id; t.phase = 1; n.thought = `Іду поговорити. Співрозмовник: ${best.name}.`;
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
        t.lines = this.dialogue(n, m, t.items);
        if (V.LLM && V.LLM.canChat()) V.LLM.chat(this, n, m, t.items).then(l => { if (l) t.lines = l; }).catch(() => {});
      }
    } else if (t.phase === 2) {
      t.w++;
      if (t.w >= 70) {
        let learned = 0;
        for (const k of t.items) if (this.learn(m, k, 'навчився в іншого')) { learned++; this.reward(m, R.taught, 'мене навчили'); }
        if (learned) { this.reward(n, R.teach * learned, 'допоміг іншому розвиватися'); n.taughtCount += learned; n.skill.teach += 0.1 * learned; this.stats.taught += learned; }
        else this.reward(n, 1, 'гарна розмова');
        // допомога голодному
        if (m.hunger > 55 && this.foodStock() > 0) {
          const f = FOODS.find(x => this.stock(x) > 0); this.take(f); m.hunger = Math.max(0, m.hunger - M[f].food);
          this.reward(n, R.help, 'нагодував іншого');
          if (this.rnd() < 0.15) this.log(`${n.name} помічає, що ${m.name} ${g(m, 'голодний', 'голодна')}, і ділиться їжею.`, 'help', n);
        }
        n.social = Math.max(0, n.social - 50); m.social = Math.max(0, m.social - 40);
        n.friends[m.id] = (n.friends[m.id] || 0) + 8; m.friends[n.id] = (m.friends[n.id] || 0) + 8;
        if (t.lines && t.lines.length) {
          n.lastLine = t.lines[0]; if (t.lines[1]) m.lastLine = t.lines[1];
          if (learned && this.rnd() < 0.5) this.log(`${n.name}: «${t.lines[0]}»${t.lines[1] ? ` — ${m.name}: «${t.lines[1]}»` : ''}`, 'talk', n);
        }
        if (m.task && m.task.type === 'listen') this.endTask(m);
        this.endTask(n);
      }
    }
  };

  P.dialogue = function (a, b, items) {
    const rnd = this.rnd;
    if (!items.length) {
      const small = ['Як тобі сьогоднішній день?', 'Бачив, скільки кролів на луці?', 'Вогонь сьогодні гарно горить.', 'Чула, як вовки вили вночі?'];
      const ans = ['Добрий день, працюємо!', 'Ага, треба б на них полювати.', 'Тепло — це головне.', 'Тримаймося ближче до вогню.'];
      const i = Math.floor(rnd() * small.length); return [small[i], ans[i]];
    }
    const k = items[0], name = V.knowName(k);
    const id = k.slice(2);
    if (k.startsWith('d:')) { const d = this.devices[id]; return [`Дивись, ${V.IDEAS[id].name} робиться так: ${d ? d.parts.map(x => M[x].name).join(', ') : ''}.`, 'О, тепер і я так зможу!']; }
    if (k.startsWith('l:')) { const l = V.LAWS.find(x => x.id === id); return [`Якщо нагріти ${l.inputs.map(x => M[x].name).join(' з ')}, вийде ${M[l.out].name}.`, 'Не може бути! Треба спробувати.']; }
    if (k.startsWith('i:')) return [`Я думаю, як ${V.IDEAS[id].verb}. Може, ${V.IDEAS[id].name}?`, 'Цікава думка…'];
    const m = M[id];
    return [`Знаєш ${m.name}? ${m.desc ? m.desc.split('.')[0] : V.propLine(m)}.`, 'Запам\'ятаю.'];
  };

  P.doBuild = function (n, t) {
    if (t.phase === 0) {
      const d = this.devices.house;
      if (!d) { this.endTask(n); return; }
      for (const id of d.parts) if (this.stock(id) < 2) { n.goalMats = d.parts.filter(x => V.BASE_RESOURCES.includes(x)); this.endTask(n); return; }
      for (const id of d.parts) this.take(id, 2);
      t.phase = 1; t.w = 0; n.thought = 'Будую новий дім.';
    }
    if (t.phase === 1) {
      const s = { x: this.world.camp.x - 2, y: this.world.camp.y + 1.5 };
      if (this.moveTo(n, s.x, s.y)) { t.w++; if (t.w > 120) { this.houses++; this.reward(n, R.build, 'збудував для всіх'); this.log(`${n.name} добудовує ще один дім. Тепер їх ${this.houses}.`, 'life', n); this.endTask(n); } }
    }
  };

  P.die = function (n) {
    this.log(`${n.name} не ${g(n, 'пережив', 'пережила')} голоду. Поселення сумує.`, 'death', n);
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
        for (let i = 0; i < 3 && miss.length; i++) { const k = miss.splice(Math.floor(rnd() * miss.length), 1)[0]; if (this.learn(n, k, 'прочитав таблички')) spread++; }
      }
      if (spread) for (const w of writers) this.reward(w, spread * 0.3, 'таблички вчать інших');
    }
    const adults = this.npcs.filter(n => isAdult(this, n));
    if (this.npcs.length < 22 && this.foodStock() >= this.npcs.length * 2 && rnd() < 0.45 && adults.length >= 2) {
      let pair = null, best = 30;
      for (const a of adults) for (const id in a.friends) { const b = adults.find(x => x.id == id); if (b && b !== a && a.friends[id] > best) { best = a.friends[id]; pair = [a, b]; } }
      if (pair) {
        const c = this.addNPC(pair);
        c.x = this.world.camp.x; c.y = this.world.camp.y;
        this.stats.births++;
        this.log(`У ${pair[0].name} і ${pair[1].name} народжується дитина — ${c.name}.`, 'birth', c);
      }
    }
    this.updateEra();
  };

  P.updateEra = function () {
    const has = id => this.worldKnown.has(id);
    const anyAlloy = pred => Object.values(M).some(m => m.alloy && this.worldKnown.has(m.id) && pred(m));
    let era = 'Кам\'яна доба';
    if (has('ceramic')) era = 'Доба кераміки';
    if (has('copper')) era = 'Мідна доба';
    if (anyAlloy(m => m.comp.some(c => c[0] === 'tin') && m.comp.some(c => c[0] === 'copper'))) era = 'Бронзова доба';
    if (has('iron')) era = 'Залізна доба';
    if (has('glass') && has('iron')) era = 'Доба скла й заліза';
    if (this.structures.cell) era = 'Електрична доба';
    if (era !== this.era) { this.era = era; this.log(`Настає нова епоха: ${era}.`, 'era'); }
  };

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
