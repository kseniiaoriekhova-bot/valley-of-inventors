/* ============================================================
   Долина винахідників — «закони природи»
   Властивості матеріалів, закони нагрівання, генератор
   сплавів і композитів, реальний каталог матеріалів,
   ідеї пристроїв і перевірка їхньої роботи.
   NPC цих таблиць не бачать: вони лише пробують, а світ відповідає.
   ============================================================ */
(function (V) {
  'use strict';

  const clamp = (x, a = 0, b = 1.5) => Math.max(a, Math.min(b, x));
  V.clamp = clamp;

  /* ---------- Матеріали ----------
     hard  твердість (0–10, приблизно за Моосом)
     tough міцність / ударна в'язкість (0–10)
     flex  гнучкість (0–10)       tensile міцність на розрив (0–10)
     dens  густина, г/см³          wp   водонепроникність (0–1)
     hp    жаростійкість, °C       mp   температура плавлення (метали), °C
     fuel  макс. температура полум'я, °C
     sharp здатність тримати гостре лезо (0–1)
     trans прозорість  cond електропровідність  pot електродний потенціал, В
     ion   іонна провідність (електроліт)        food поживність
     plast пластичність  air герметичність  binder в'язучі властивості
  */
  const M = {};
  function mat(id, name, kind, props, extra = {}) {
    M[id] = Object.assign({
      id, name, kind,
      hard: 0, tough: 0, flex: 0, tensile: 0, dens: 1, wp: 0, hp: 300, mp: 0, fuel: 0,
      sharp: 0, trans: 0, cond: 0, pot: 0, ion: 0, food: 0, plast: 0, air: 0, binder: 0,
    }, props, extra);
  }

  // природні
  mat('wood', 'деревина', 'organic', { hard: 3, tough: 6, flex: 4, tensile: 5, dens: 0.7, wp: 0.4, hp: 250, fuel: 600, sharp: 0.2 }, { color: '#9a6b3c' });
  mat('fiber', 'рослинне волокно', 'organic', { hard: 0.5, tough: 2, flex: 9, tensile: 6, dens: 0.5, wp: 0.1, hp: 200 }, { color: '#b9c46a' });
  mat('resin', 'смола', 'organic', { hard: 1, tough: 2, flex: 3, tensile: 2, dens: 1.05, wp: 1, hp: 150, plast: 7, binder: 0.6 }, { color: '#c98a2e' });
  mat('stone', 'камінь', 'mineral', { hard: 6, tough: 3, dens: 2.6, wp: 1, hp: 1200, sharp: 0.4 }, { color: '#8d8a86' });
  mat('flint', 'кремінь', 'mineral', { hard: 7, tough: 2, dens: 2.6, wp: 1, hp: 1000, sharp: 1 }, { color: '#4f5560' });
  mat('clay', 'глина', 'mineral', { hard: 1, tough: 1, dens: 1.8, wp: 0.3, hp: 600, plast: 9, binder: 0.4 }, { color: '#b5734f' });
  mat('sand', 'пісок', 'mineral', { hard: 6, tough: 0.5, dens: 1.6, hp: 1700 }, { color: '#dcc68d' });
  mat('limestone', 'вапняк', 'mineral', { hard: 3, tough: 2, dens: 2.5, wp: 0.8, hp: 800 }, { color: '#d8d4c4' });
  mat('salt', 'сіль', 'mineral', { hard: 2, tough: 0.5, dens: 2.2, ion: 1 }, { color: '#eef0f2' });
  mat('water', 'вода', 'liquid', { dens: 1, ion: 0.1, hp: 100 }, { color: '#4a8fc4' });
  mat('copper_ore', 'мідна руда (малахіт)', 'ore', { hard: 4, tough: 2, dens: 4, hp: 1000 }, { color: '#3e9b7a' });
  mat('tin_ore', 'олов\'яна руда (каситерит)', 'ore', { hard: 6, tough: 2, dens: 7, hp: 1100 }, { color: '#5b4a3e' });
  mat('lead_ore', 'свинцева руда (галеніт)', 'ore', { hard: 2.5, tough: 2, dens: 7.5, hp: 1000 }, { color: '#7d8590' });
  mat('iron_ore', 'залізна руда (гематит)', 'ore', { hard: 5.5, tough: 2, dens: 5, hp: 1500 }, { color: '#8b3a2a' });
  mat('coal', 'кам\'яне вугілля', 'fuel', { hard: 2, tough: 1, dens: 1.3, fuel: 1200, hp: 300 }, { color: '#2a2a2e' });
  mat('berries', 'ягоди', 'food', { food: 15, dens: 1 }, { color: '#b23a5b' });
  mat('meat', 'сире м\'ясо', 'food', { food: 30, dens: 1 }, { color: '#b5524a' });
  mat('fish', 'риба', 'food', { food: 25, dens: 1 }, { color: '#9fb7c9' });
  mat('hide', 'шкура', 'organic', { hard: 1, tough: 5, flex: 7, tensile: 5, dens: 0.9, wp: 0.6, hp: 120, air: 0.8 }, { color: '#a5835f' });
  mat('bone', 'кістка', 'organic', { hard: 4, tough: 4, dens: 1.9, hp: 600, sharp: 0.9 }, { color: '#e6dcc3' });

  // отримувані законами природи
  mat('cooked', 'приготована їжа', 'food', { food: 55, dens: 1 }, { color: '#c9853f' });
  mat('charcoal', 'деревне вугілля', 'fuel', { hard: 1, tough: 0.5, dens: 0.4, fuel: 1100, hp: 300, cond: 0.3, pot: 0.2 }, { color: '#1f1f22' });
  mat('ceramic', 'кераміка', 'ceramic', { hard: 5, tough: 2.5, dens: 2, wp: 1, hp: 1400, sharp: 0.5 }, { color: '#c46a3c' });
  mat('brick', 'обпалена цегла', 'ceramic', { hard: 5, tough: 3, dens: 1.9, wp: 0.8, hp: 1700, binder: 0 }, { color: '#a3462e' });
  mat('quicklime', 'негашене вапно', 'mineral', { hard: 2, tough: 0.5, dens: 3.3, ion: 0.5, hp: 2500 }, { color: '#f4f2ea' });
  mat('mortar', 'вапняне тісто', 'mineral', { hard: 4, tough: 2, dens: 1.8, wp: 0.7, hp: 900, binder: 1, plast: 6 }, { color: '#e3dfd0' });
  mat('leather', 'вичинена шкіра', 'organic', { hard: 1.5, tough: 7, flex: 6, tensile: 7, dens: 0.9, wp: 0.8, hp: 150, air: 1 }, { color: '#7a4f2e' });
  mat('copper', 'мідь', 'metal', { hard: 3, tough: 7, flex: 2, tensile: 6, dens: 8.9, wp: 1, mp: 1085, hp: 985, sharp: 0.8, cond: 1, pot: 0.34 }, { color: '#c8733c' });
  mat('tin', 'олово', 'metal', { hard: 1.5, tough: 4, flex: 3, tensile: 2, dens: 7.3, wp: 1, mp: 232, hp: 200, sharp: 0.3, cond: 1, pot: -0.14 }, { color: '#c9ccd1' });
  mat('lead', 'свинець', 'metal', { hard: 1, tough: 4, flex: 4, tensile: 1.5, dens: 11.3, wp: 1, mp: 327, hp: 300, sharp: 0.2, cond: 1, pot: -0.13 }, { color: '#6f7783' });
  mat('iron', 'залізо (криця)', 'metal', { hard: 5, tough: 7, flex: 1, tensile: 7, dens: 7.9, wp: 0.7, mp: 1538, hp: 1400, sharp: 0.9, cond: 1, pot: -0.44 }, { color: '#5c6168' });
  mat('glass', 'скло', 'ceramic', { hard: 5.5, tough: 1, dens: 2.5, wp: 1, hp: 1000, sharp: 0.9, trans: 1 }, { color: '#9fd3d6' });

  V.MATERIALS = M;
  V.BASE_RESOURCES = ['wood', 'fiber', 'resin', 'stone', 'flint', 'clay', 'sand', 'limestone', 'salt', 'water',
    'copper_ore', 'tin_ore', 'lead_ore', 'iron_ore', 'coal', 'berries'];
  V.FUELS = ['wood', 'charcoal', 'coal'];

  /* ---------- Закони нагрівання та змішування ---------- */
  // inputs — точний набір; reducer — будь-який відновник з переліку
  V.LAWS = [
    { id: 'cook', inputs: ['meat'], minT: 150, out: 'cooked', why: 'білки денатурують під дією тепла — їжа стає поживнішою' },
    { id: 'cookfish', inputs: ['fish'], minT: 150, out: 'cooked', why: 'тепло робить рибу безпечнішою і поживнішою' },
    { id: 'char', inputs: ['wood'], minT: 400, enclosed: true, out: 'charcoal', why: 'піроліз: без доступу повітря деревина не згоряє, а обвуглюється' },
    { id: 'ceramic', inputs: ['clay'], minT: 800, out: 'ceramic', why: 'спікання: частинки глини зростаються і стають водонепроникними' },
    { id: 'brick', inputs: ['clay', 'sand'], minT: 900, out: 'brick', why: 'пісок зменшує усадку, а спікання дає жаростійку цеглу' },
    { id: 'lime', inputs: ['limestone'], minT: 900, out: 'quicklime', why: 'кальцинація: CaCO₃ → CaO + CO₂' },
    { id: 'mortar', inputs: ['quicklime', 'water'], minT: 0, out: 'mortar', why: 'гасіння вапна: CaO + H₂O → Ca(OH)₂, яке твердне на повітрі' },
    { id: 'leather', inputs: ['hide', 'salt'], minT: 0, out: 'leather', why: 'сіль витягує вологу і зупиняє гниття — шкіра стає щільною і довговічною' },
    { id: 'pb', inputs: ['lead_ore'], reducer: true, minT: 800, out: 'lead', why: 'вуглець відбирає сірку й кисень у руди, лишається свинець' },
    { id: 'sn', inputs: ['tin_ore'], reducer: true, minT: 900, out: 'tin', why: 'SnO₂ + 2C → Sn + 2CO' },
    { id: 'cu', inputs: ['copper_ore'], reducer: true, minT: 1085, out: 'copper', why: 'вуглець відновлює мідь з малахіту, і вона плавиться' },
    { id: 'fe', inputs: ['iron_ore'], reducer: true, minT: 1300, out: 'iron', why: 'Fe₂O₃ + 3CO → 2Fe + 3CO₂ у сиродутному горні' },
    { id: 'glass', inputs: ['sand', 'quicklime'], minT: 1400, out: 'glass', why: 'вапно знижує температуру плавлення кварцу — утворюється скло' },
  ];
  const REDUCERS = ['charcoal', 'coal'];

  const sameSet = (a, b) => a.length === b.length && a.every(x => b.includes(x));

  /* Нагрівання: inputs — масив id; повертає результат і «спостереження» */
  V.heat = function (inputs, temp, enclosed) {
    const plain = inputs.filter(x => !REDUCERS.includes(x));
    const hasReducer = inputs.some(x => REDUCERS.includes(x));
    for (const law of V.LAWS) {
      if (!sameSet(law.inputs, plain)) continue;
      if (law.reducer && !hasReducer) {
        if (temp >= law.minT) return { ok: false, hint: 'nothing', note: 'руда розжарилася, але нічого не віддала — може, їй чогось бракує в суміші?' };
        continue;
      }
      if (!law.reducer && hasReducer && plain.length === inputs.length - 1 && law.id !== 'char') {
        // зайве вугілля не заважає, просто згорає
      }
      if (law.enclosed && !enclosed) return { ok: false, hint: 'air', law: law.id, note: 'все просто згоріло — може, потрібен жар без повітря?' };
      if (temp < law.minT) return { ok: false, hint: 'hotter', law: law.id, need: law.minT, note: `щось почало змінюватися, але жару замало (досягнуто ${Math.round(temp)}°C)` };
      return { ok: true, out: law.out, law: law.id, why: law.why };
    }
    // фізична реакція без нового матеріалу
    const m = M[plain[0]];
    if (m && m.mp && temp >= m.mp) return { ok: false, hint: 'melt', note: `${m.name} розплавився і знову застиг — новим матеріалом не став` };
    if (m && m.fuel) return { ok: false, hint: 'burn', note: `${m.name} просто згорів` };
    return { ok: false, hint: 'nothing', note: 'нічого не сталося' };
  };

  /* ---------- Генератор сплавів і композитів ---------- */
  // парні коефіцієнти: зміцнення (H), крихкість (B), зниження Tпл (D)
  const PAIR = {
    'copper|tin': { H: 4.2, B: 18, D: 260 },
    'copper|lead': { H: 0.6, B: 6, D: 120 },
    'lead|tin': { H: 0.9, B: 2, D: 420 },
    'copper|iron': { H: 2.5, B: 10, D: 90 },
    'iron|tin': { H: 1.5, B: 22, D: 300 },
    'iron|lead': { H: 0.2, B: 12, D: 40 },
  };
  const pairKey = (a, b) => [a, b].sort().join('|');

  /* Сплав: base — основний метал, add — добавка ('charcoal' = вуглець), f — частка добавки */
  V.makeAlloy = function (base, add, f) {
    const A = M[base];
    if (add === 'charcoal') {
      const c = f; // масова частка вуглецю
      return {
        kind: 'alloy', comp: [[base, 1 - c], ['carbon', c]],
        hard: A.hard + Math.min(c, 0.021) * 160 + Math.max(0, c - 0.021) * 40,
        tough: A.tough + Math.min(c, 0.008) * 60 - Math.max(0, c - 0.012) * 190,
        flex: Math.max(0, A.flex - c * 20), tensile: A.tensile + Math.min(c, 0.012) * 120 - Math.max(0, c - 0.02) * 120,
        dens: A.dens - c * 10, wp: A.wp, mp: A.mp - c * 9000, cond: 1, pot: A.pot + c * 2,
        sharp: Math.min(1, A.sharp + c * 8),
      };
    }
    const B = M[add];
    const p = PAIR[pairKey(base, add)] || { H: 2, B: 10, D: 150 };
    const fa = 1 - f, fb = f;
    const minor = Math.min(fa, fb);
    const harden = p.H * (minor / (minor + 0.07));
    const brittle = p.B * Math.max(0, minor - 0.14);
    const out = {
      kind: 'alloy', comp: [[base, fa], [add, fb]],
      hard: fa * A.hard + fb * B.hard + harden,
      tough: fa * A.tough + fb * B.tough - brittle,
      flex: Math.max(0, fa * A.flex + fb * B.flex - harden * 0.5),
      tensile: fa * A.tensile + fb * B.tensile + harden * 0.6 - brittle * 0.8,
      dens: fa * A.dens + fb * B.dens,
      wp: Math.min(A.wp, B.wp) * 0.5 + (fa * A.wp + fb * B.wp) * 0.5,
      mp: fa * A.mp + fb * B.mp - p.D * 4 * fa * fb,
      cond: 1, pot: fa * A.pot + fb * B.pot,
      sharp: Math.min(1, fa * A.sharp + fb * B.sharp + harden * 0.05),
    };
    return out;
  };

  V.MATRICES = ['clay', 'mortar', 'resin'];
  V.FILLERS = ['fiber', 'sand', 'bone', 'ceramic', 'charcoal', 'hide', 'stone'];

  /* Композит: основа (matrix) + наповнювач (filler) з часткою f */
  V.makeComposite = function (matrix, filler, f) {
    const A = M[matrix], B = M[filler];
    const fa = 1 - f, fb = f;
    const fibrous = clamp((B.tensile * B.flex) / 40, 0, 1.4); // волокна армують
    const grit = clamp(B.hard / 6, 0, 1.2) * (1 - fibrous);   // тверді частинки
    const bond = A.binder;
    const overload = Math.max(0, fb - 0.45) * 8; // забагато наповнювача — розсипається
    return {
      kind: 'composite', comp: [[matrix, fa], [filler, fb]],
      hard: fa * A.hard + fb * B.hard * bond * 0.8 + grit * fb * 2 - overload,
      tough: fa * A.tough + fibrous * fb * 9 * bond + fb * B.tough * 0.2 - overload * 1.5,
      flex: fa * A.flex + fibrous * fb * 3,
      tensile: fa * A.tensile + fibrous * fb * 8 * bond - overload,
      dens: fa * A.dens + fb * B.dens,
      wp: clamp(fa * A.wp + fb * B.wp * 0.5 - overload * 0.1, 0, 1),
      hp: Math.min(A.hp + fb * (B.hp - A.hp) * 0.6, Math.max(A.hp, B.hp)),
      plast: A.plast * fa, binder: A.binder * fa,
      cond: B.cond * fb, pot: B.pot, sharp: fb * B.sharp * 0.5,
      ion: 0, air: fa * A.air,
    };
  };

  /* ---------- Каталог реальних матеріалів ---------- */
  // перевіряється за складом; якщо збіг — матеріал отримує справжню назву
  V.REAL = [
    { comp: ['copper', 'tin'], minor: 'tin', from: 0.02, to: 0.075, name: 'Низькоолов\'яна бронза', note: 'рання бронза: трохи твердіша за мідь, легко кується' },
    { comp: ['copper', 'tin'], minor: 'tin', from: 0.075, to: 0.155, name: 'Бронза', note: 'класична олов\'яна бронза бронзової доби — тверда і в\'язка' },
    { comp: ['copper', 'tin'], minor: 'tin', from: 0.155, to: 0.25, name: 'Дзвонова бронза', note: 'дуже тверда, дзвінка, але крихка — з неї відливали дзвони' },
    { comp: ['copper', 'tin'], minor: 'tin', from: 0.25, to: 0.42, name: 'Спекулум', note: 'дзеркальна бронза: настільки тверда й блискуча, що з неї робили дзеркала й телескопи' },
    { comp: ['tin', 'copper'], minor: 'copper', from: 0.01, to: 0.16, name: 'П\'ютер', note: 'олов\'яний сплав для посуду — м\'який і легкоплавкий' },
    { comp: ['tin', 'lead'], minor: 'lead', from: 0.3, to: 0.46, name: 'Олов\'яно-свинцевий припій', note: 'плавиться нижче за обидва метали — ним з\'єднують інші метали' },
    { comp: ['tin', 'lead'], minor: 'lead', from: 0.05, to: 0.3, name: 'Свинцевий п\'ютер', note: 'дешевий олов\'яний сплав зі свинцем' },
    { comp: ['lead', 'tin'], minor: 'tin', from: 0.02, to: 0.5, name: 'Свинцево-олов\'яний сплав', note: 'важкий м\'який сплав для грузил і труб' },
    { comp: ['iron', 'carbon'], minor: 'carbon', from: 0, to: 0.0025, name: 'Ковке залізо', note: 'майже чисте залізо: в\'язке, але м\'якувате' },
    { comp: ['iron', 'carbon'], minor: 'carbon', from: 0.0025, to: 0.006, name: 'М\'яка сталь', note: 'низьковуглецева сталь — міцна й пластична' },
    { comp: ['iron', 'carbon'], minor: 'carbon', from: 0.006, to: 0.021, name: 'Вуглецева сталь', note: 'тверда сталь, що добре тримає лезо' },
    { comp: ['iron', 'carbon'], minor: 'carbon', from: 0.021, to: 0.05, name: 'Чавун', note: 'багато вуглецю: легкоплавкий, твердий, але крихкий' },
    { comp: ['clay', 'fiber'], minor: 'fiber', from: 0.08, to: 0.4, name: 'Саман', note: 'глина, армована соломою, — будівельний матеріал тисячоліть' },
    { comp: ['clay', 'sand'], minor: 'sand', from: 0.15, to: 0.5, name: 'Отощена глина', note: 'глина з піском менше тріскається при сушінні' },
    { comp: ['mortar', 'sand'], minor: 'sand', from: 0.2, to: 0.65, name: 'Вапняний розчин', note: 'вапно з піском — класичний будівельний розчин' },
    { comp: ['mortar', 'ceramic'], minor: 'ceramic', from: 0.15, to: 0.55, name: 'Цем\'янка', note: 'вапно з товченою керамікою (opus signinum) — водостійкий римський розчин' },
    { comp: ['resin', 'charcoal'], minor: 'charcoal', from: 0.08, to: 0.45, name: 'Смоляний клей', note: 'смола з вугіллям — давній клей для кріплення наконечників' },
  ];

  V.matchReal = function (comp) {
    const ids = comp.map(c => c[0]);
    for (const r of V.REAL) {
      if (!sameSet(r.comp, ids)) continue;
      if (ids[0] !== r.comp[0]) continue; // основа має збігатися
      const fr = comp.find(c => c[0] === r.minor)[1];
      if (fr >= r.from && fr < r.to) return r;
    }
    return null;
  };

  const SYL = ['ва', 'ре', 'лі', 'то', 'мі', 'ар', 'ко', 'ні', 'ус', 'да', 'ле', 'ри', 'са', 'ту', 'ен', 'ор', 'ві', 'ла', 'мо', 'зе'];
  V.inventWord = function (rnd) {
    let w = '';
    const n = 2 + (rnd() < 0.5 ? 1 : 0);
    for (let i = 0; i < n; i++) w += SYL[Math.floor(rnd() * SYL.length)];
    return w.charAt(0).toUpperCase() + w.slice(1);
  };

  const COMPNAME = { carbon: 'вуглецю' };
  const compName = id => COMPNAME[id] || (M[id] ? M[id].name : id);

  V.describeComp = function (comp) {
    const fine = comp.some(([, f]) => f < 0.01 || f > 0.99);
    return comp.map(([id, f]) => `${(f * 100).toFixed(fine ? 1 : 0)}% ${compName(id)}`).join(' + ');
  };

  /* Найближчий відомий матеріал за властивостями */
  V.nearest = function (p, pool) {
    const keys = ['hard', 'tough', 'flex', 'tensile', 'dens'];
    let best = null, bd = 1e9;
    for (const m of pool) {
      if (!m || m.kind === 'food' || m.kind === 'liquid' || m.kind === 'ore') continue;
      let d = 0;
      for (const k of keys) d += Math.pow((p[k] || 0) - (m[k] || 0), 2);
      if (d < bd) { bd = d; best = m; }
    }
    return best;
  };

  /* ---------- Ідеї пристроїв ----------
     Кожна ідея — фізичний принцип із «гніздами».
     Гніздо перевіряє властивості матеріалу і дає оцінку 0..1.5.
     Пристрій працює, якщо всі гнізда ≥ 0.6. */
  const SLOT = {
    edge: { name: 'лезо', test: p => clamp((p.hard - 3) / 4) * clamp(p.tough / 3, 0, 1) * clamp(p.sharp * 1.1, 0, 1) },
    point: { name: 'вістря', test: p => clamp((p.hard - 2) / 3.5) * clamp(p.sharp * 1.2, 0, 1) * clamp(p.tough / 1.5, 0, 1) },
    shaft: { name: 'держак', test: p => clamp(p.tough / 5) * clamp((3 - p.dens) / 2, 0, 1) * clamp(p.hard / 2, 0, 1) * clamp((7 - p.flex) / 3, 0, 1) },
    binding: { name: 'обмотка', test: p => clamp(p.tensile / 5) * clamp(p.flex / 6) },
    vessel: { name: 'посудина', test: p => clamp(p.wp, 0, 1) * clamp(p.hp / 400) * clamp(p.hard / 3, 0, 1) * clamp(p.tough / 1.5, 0, 1) },
    wall: { name: 'стіна', test: p => clamp(p.hp / 1000) * clamp(p.hard / 3, 0, 1) * clamp(p.tough / 1.5, 0, 1) },
    membrane: { name: 'мембрана', test: p => clamp(p.air, 0, 1) * clamp(p.flex / 5) * clamp(p.tough / 4, 0, 1) },
    frame: { name: 'каркас', test: p => clamp(p.tough / 4) * clamp(p.hard / 2, 0, 1) * clamp((4 - p.dens) / 2, 0, 1) },
    float: { name: 'поплавок', test: p => clamp((1.15 - p.dens) / 0.5) * clamp(p.tough / 3, 0, 1) * clamp(p.hard / 2, 0, 1) },
    disc: { name: 'диск', test: p => clamp(p.tough / 5) * clamp(p.hard / 3, 0, 1) },
    binder: { name: 'в\'яжуче', test: p => clamp(p.binder * 1.1) * clamp(p.hard / 2, 0, 1) },
    lens: { name: 'лінза', test: p => clamp(p.trans, 0, 1) * clamp(p.hard / 5) },
    writable: { name: 'табличка', test: p => clamp(p.plast / 6) * clamp(p.dens / 1.5, 0, 1) },
    electrode: { name: 'електрод', test: p => p.cond >= 0.9 ? 1 : p.cond * 0.5 },
    electrolyte: { name: 'електроліт', test: p => clamp(p.ion / 0.8) },
  };
  V.SLOT = SLOT;

  V.IDEAS = {
    knife: { name: 'ріжучий інструмент', verb: 'різати', slots: ['edge', 'shaft', 'binding'], effect: 'швидше збирає і краще оброблює здобич' },
    spear: { name: 'спис', verb: 'полювати', slots: ['point', 'shaft', 'binding'], effect: 'полювання вдається частіше' },
    vessel: { name: 'посудина', verb: 'варити', slots: ['vessel'], effect: 'варене дає більше поживності, можна носити воду' },
    kiln: { name: 'піч', verb: 'тримати жар', slots: ['wall'], structure: true, effect: 'жар без повітря і +150°C' },
    bellows: { name: 'міхи', verb: 'дмухати', slots: ['membrane', 'frame'], structure: true, effect: '+300°C у печі' },
    net: { name: 'сітка', verb: 'ловити рибу', slots: ['binding'], effect: 'рибалка' },
    raft: { name: 'пліт', verb: 'плавати', slots: ['float', 'binding'], effect: 'рибалка вдвічі кориснішa, далекі береги' },
    cart: { name: 'візок', verb: 'возити', slots: ['disc', 'shaft'], effect: 'носить удвічі більше' },
    pen: { name: 'загорода', verb: 'приручати', slots: ['shaft', 'binding'], structure: true, effect: 'приручені тварини дають їжу' },
    house: { name: 'дім', verb: 'жити в теплі', slots: ['wall', 'binder'], structure: true, effect: 'кращий сон і здоров\'я' },
    lens: { name: 'лінза', verb: 'роздивлятися', slots: ['lens'], effect: 'експерименти на 40% швидші' },
    tablet: { name: 'письмові таблички', verb: 'записувати', slots: ['writable', 'point'], structure: true, effect: 'знання з табличок вночі переходять до всіх у таборі' },
    cell: { name: 'гальванічний елемент', verb: 'добувати струм', slots: ['electrode', 'electrode', 'electrolyte', 'vessel'], structure: true, effect: 'електрика: світло в таборі вночі' },
  };

  /* Перевірка пристрою: parts — масив об'єктів-матеріалів у порядку гнізд */
  V.evaluate = function (ideaId, parts) {
    const idea = V.IDEAS[ideaId];
    const scores = idea.slots.map((s, i) => SLOT[s].test(parts[i]));
    let extra = null;
    if (ideaId === 'cell') {
      const a = parts[0], b = parts[1];
      const volts = Math.abs((a.pot || 0) - (b.pot || 0));
      extra = { volts };
      const vs = a.id === b.id ? 0 : clamp(volts / 0.5);
      scores[0] = Math.min(scores[0], vs || 0.01);
      scores[1] = Math.min(scores[1], vs || 0.01);
    }
    const min = Math.min(...scores);
    const q = scores.reduce((s, x) => s + x, 0) / scores.length;
    let weak = idea.slots[scores.indexOf(min)];
    return { works: min >= 0.6, partial: min >= 0.3, quality: +q.toFixed(2), scores, weakSlot: weak, extra };
  };

  /* Короткий опис властивостей для людей */
  V.propLine = function (p) {
    const parts = [];
    parts.push(`твердість ${(+p.hard).toFixed(1)}`);
    parts.push(`міцність ${(+p.tough).toFixed(1)}`);
    if (p.flex > 2) parts.push(`гнучкість ${(+p.flex).toFixed(1)}`);
    parts.push(`густина ${(+p.dens).toFixed(1)} г/см³`);
    if (p.mp) parts.push(`плавиться ~${Math.round(p.mp)}°C`);
    else if (p.hp) parts.push(`витримує ~${Math.round(p.hp)}°C`);
    if (p.cond >= 0.9) parts.push(`провідник, ${p.pot >= 0 ? '+' : ''}${(+p.pot).toFixed(2)} В`);
    if (p.wp >= 0.8) parts.push('водонепроникний');
    return parts.join(', ');
  };
})(window.V = window.V || {});
