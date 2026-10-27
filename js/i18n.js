/* ============================================================
   Мови / Sprachen: українська (uk) і німецька (de)
   Симуляція зберігає повідомлення як [ключ, параметри],
   тож уся хроніка перекладається одразу при перемиканні мови.
   ============================================================ */
(function (V) {
  'use strict';

  let lang = 'uk';
  try { lang = localStorage.getItem('valley.lang') || (/^de/i.test(navigator.language || '') ? 'de' : 'uk'); } catch (e) { /* без сховища */ }
  if (lang !== 'uk' && lang !== 'de') lang = 'uk';
  Object.defineProperty(V, 'lang', { get: () => lang });
  V.setLang = function (l) { lang = l === 'de' ? 'de' : 'uk'; try { localStorage.setItem('valley.lang', lang); } catch (e) { /* ок */ } };

  /* ---------- Імена ---------- */
  const NAME_DE = {
    'Олеся': 'Olesja', 'Тарас': 'Taras', 'Мирослава': 'Myroslawa', 'Богдан': 'Bohdan', 'Ярина': 'Jaryna', 'Остап': 'Ostap',
    'Злата': 'Slata', 'Данило': 'Danylo', 'Леся': 'Lesja', 'Назар': 'Nasar', 'Устина': 'Ustyna', 'Орест': 'Orest',
    'Марта': 'Marta', 'Ілько': 'Ilko', 'Соломія': 'Solomija', 'Захар': 'Sachar', 'Олекса': 'Oleksa', 'Дарина': 'Daryna',
    'Роман': 'Roman', 'Христя': 'Chrystja', 'Іванна': 'Iwanna', 'Святослав': 'Swjatoslaw', 'Галя': 'Halja', 'Петро': 'Petro',
    'Віра': 'Wira', 'Гнат': 'Hnat',
  };
  const FEMALE = new Set(['Олеся', 'Мирослава', 'Ярина', 'Злата', 'Леся', 'Устина', 'Марта', 'Соломія', 'Дарина', 'Христя', 'Іванна', 'Галя', 'Віра']);
  V.isFemale = name => FEMALE.has(name);
  V.nn = function (name) {
    if (!name) return '';
    if (lang === 'de') { if (NAME_DE[name]) return NAME_DE[name]; const m = /^Мешканець (\d+)$/.exec(name); if (m) return 'Bewohner ' + m[1]; }
    return name;
  };

  /* ---------- Довідники ---------- */
  const MAT_DE = {
    wood: 'Holz', fiber: 'Pflanzenfaser', resin: 'Harz', stone: 'Stein', flint: 'Feuerstein', clay: 'Ton', sand: 'Sand',
    limestone: 'Kalkstein', salt: 'Salz', water: 'Wasser', copper_ore: 'Kupfererz (Malachit)', tin_ore: 'Zinnerz (Kassiterit)',
    lead_ore: 'Bleierz (Galenit)', iron_ore: 'Eisenerz (Hämatit)', coal: 'Steinkohle', berries: 'Beeren', meat: 'rohes Fleisch',
    fish: 'Fisch', hide: 'Fell', bone: 'Knochen', cooked: 'gekochtes Essen', charcoal: 'Holzkohle', ceramic: 'Keramik',
    brick: 'gebrannter Ziegel', quicklime: 'Branntkalk', mortar: 'Kalkteig', leather: 'gegerbtes Leder', copper: 'Kupfer',
    tin: 'Zinn', lead: 'Blei', iron: 'Eisen (Luppe)', glass: 'Glas', carbon: 'Kohlenstoff',
  };
  const IDEA_DE = {
    knife: ['Schneidwerkzeug', 'schneiden', 'sammelt schneller und verarbeitet Beute besser'],
    spear: ['Speer', 'jagen', 'Jagd gelingt öfter'],
    vessel: ['Gefäß', 'kochen', 'Gekochtes nährt mehr, man kann Wasser tragen'],
    kiln: ['Ofen', 'die Glut halten', 'Glut ohne Luft und +150 °C'],
    bellows: ['Blasebalg', 'Luft blasen', '+300 °C im Ofen'],
    net: ['Netz', 'fischen', 'Fischfang'],
    raft: ['Floß', 'schwimmen', 'doppelter Fischfang, ferne Ufer'],
    cart: ['Karren', 'transportieren', 'trägt doppelt so viel'],
    pen: ['Gehege', 'Tiere zähmen', 'gezähmte Tiere liefern Nahrung'],
    house: ['Haus', 'warm wohnen', 'besserer Schlaf und Gesundheit'],
    lens: ['Linse', 'genau hinsehen', 'Experimente 40 % schneller'],
    tablet: ['Schreibtafeln', 'aufschreiben', 'Wissen der Tafeln geht nachts an alle im Lager'],
    cell: ['galvanische Zelle', 'Strom gewinnen', 'Elektrizität: Licht im Lager bei Nacht'],
  };
  const SLOT_DE = {
    edge: 'Klinge', point: 'Spitze', shaft: 'Griff', binding: 'Bindung', vessel: 'Gefäß', wall: 'Wand', membrane: 'Membran',
    frame: 'Rahmen', float: 'Schwimmkörper', disc: 'Scheibe', binder: 'Bindemittel', lens: 'Linse', writable: 'Tafel',
    electrode: 'Elektrode', electrolyte: 'Elektrolyt',
  };
  const LAW_DE = {
    cook: 'Eiweiße denaturieren durch Hitze — das Essen wird nahrhafter',
    cookfish: 'Hitze macht Fisch sicherer und nahrhafter',
    char: 'Pyrolyse: ohne Luft verbrennt Holz nicht, sondern verkohlt',
    ceramic: 'Sintern: Tonteilchen verwachsen und werden wasserdicht',
    brick: 'Sand verringert die Schwindung, Sintern ergibt hitzefeste Ziegel',
    lime: 'Kalzinierung: CaCO₃ → CaO + CO₂',
    mortar: 'Kalklöschen: CaO + H₂O → Ca(OH)₂, das an der Luft aushärtet',
    leather: 'Salz entzieht Feuchtigkeit und stoppt die Fäulnis — das Fell wird dicht und haltbar',
    pb: 'Kohlenstoff entzieht dem Erz Schwefel und Sauerstoff, übrig bleibt Blei',
    sn: 'SnO₂ + 2C → Sn + 2CO',
    cu: 'Kohlenstoff reduziert Kupfer aus Malachit, und es schmilzt',
    fe: 'Fe₂O₃ + 3CO → 2Fe + 3CO₂ im Rennofen',
    glass: 'Kalk senkt den Schmelzpunkt von Quarz — es entsteht Glas',
  };
  const REAL_DE = [
    ['Niedrigzinnbronze', 'frühe Bronze: etwas härter als Kupfer, gut schmiedbar'],
    ['Bronze', 'klassische Zinnbronze der Bronzezeit — hart und zäh'],
    ['Glockenbronze', 'sehr hart und klangvoll, aber spröde — daraus goss man Glocken'],
    ['Speculum', 'Spiegelbronze: so hart und glänzend, dass man daraus Spiegel und Teleskope machte'],
    ['Pewter (Zinngeschirr)', 'Zinnlegierung für Geschirr — weich und leicht schmelzbar'],
    ['Zinn-Blei-Lot', 'schmilzt tiefer als beide Metalle — damit verbindet man andere Metalle'],
    ['Bleihaltiges Pewter', 'billige Zinnlegierung mit Blei'],
    ['Blei-Zinn-Legierung', 'schwere, weiche Legierung für Gewichte und Rohre'],
    ['Schmiedeeisen', 'fast reines Eisen: zäh, aber eher weich'],
    ['Weicher Stahl', 'kohlenstoffarmer Stahl — fest und gut formbar'],
    ['Kohlenstoffstahl', 'harter Stahl, der eine Schneide gut hält'],
    ['Gusseisen', 'viel Kohlenstoff: leicht schmelzbar, hart, aber spröde'],
    ['Strohlehm', 'mit Stroh bewehrter Lehm — Baustoff seit Jahrtausenden'],
    ['Gemagerter Ton', 'Ton mit Sand reißt beim Trocknen weniger'],
    ['Kalkmörtel', 'Kalk mit Sand — der klassische Baumörtel'],
    ['Opus signinum', 'Kalk mit zerstoßener Keramik — wasserfester römischer Mörtel'],
    ['Harzkleber', 'Harz mit Kohle — uralter Kleber zum Befestigen von Spitzen'],
  ];
  const ERA = {
    uk: { stone: 'Кам\'яна доба', ceramic: 'Доба кераміки', copper: 'Мідна доба', bronze: 'Бронзова доба', iron: 'Залізна доба', glass: 'Доба скла й заліза', electric: 'Електрична доба' },
    de: { stone: 'Steinzeit', ceramic: 'Keramikzeit', copper: 'Kupferzeit', bronze: 'Bronzezeit', iron: 'Eisenzeit', glass: 'Zeit von Glas und Eisen', electric: 'Elektrisches Zeitalter' },
  };
  const ERA_SHORT = {
    uk: { stone: 'Камінь', ceramic: 'Кераміка', copper: 'Мідь', bronze: 'Бронза', iron: 'Залізо', glass: 'Скло', electric: 'Електрика' },
    de: { stone: 'Stein', ceramic: 'Keramik', copper: 'Kupfer', bronze: 'Bronze', iron: 'Eisen', glass: 'Glas', electric: 'Strom' },
  };
  V.ERA_KEYS = ['stone', 'ceramic', 'copper', 'bronze', 'iron', 'glass', 'electric'];
  V.eraName = k => ERA[lang][k] || k;
  V.eraShort = k => ERA_SHORT[lang][k] || k;
  const ACT = {
    uk: { gather: 'збирає', hunt: 'полює', fish: 'рибалить', experiment: 'експериментує', teach: 'навчає', build: 'будує', explore: 'досліджує', eat: 'їсть', sleep: 'спить', listen: 'слухає', play: 'грається', think: 'обмірковує' },
    de: { gather: 'sammelt', hunt: 'jagt', fish: 'fischt', experiment: 'experimentiert', teach: 'lehrt', build: 'baut', explore: 'erkundet', eat: 'isst', sleep: 'schläft', listen: 'hört zu', play: 'spielt', think: 'denkt nach' },
  };
  V.act = t => ACT[lang][t] || t;
  const ANIMAL = { uk: { rabbit: 'кріль', deer: 'олень', wolf: 'вовк' }, de: { rabbit: 'Kaninchen', deer: 'Hirsch', wolf: 'Wolf' } };
  V.animalName = t => ANIMAL[lang][t] || t;
  const KIND = {
    uk: { organic: 'органіка', mineral: 'мінерал', ore: 'руда', fuel: 'паливо', food: 'їжа', liquid: 'рідина', ceramic: 'кераміка', metal: 'метал', composite: 'композит', alloy: 'сплав' },
    de: { organic: 'organisch', mineral: 'Mineral', ore: 'Erz', fuel: 'Brennstoff', food: 'Nahrung', liquid: 'Flüssigkeit', ceramic: 'Keramik', metal: 'Metall', composite: 'Verbundstoff', alloy: 'Legierung' },
  };
  V.kindName = k => KIND[lang][k] || k;

  /* Час у форматі мови: «завтра о 01:00» / «morgen um 01:00» */
  V.fmtTime = function (ms) {
    if (!ms) return '';
    const d = new Date(ms), now = new Date();
    const hm = d.toLocaleTimeString(lang === 'de' ? 'de-DE' : 'uk-UA', { hour: '2-digit', minute: '2-digit' });
    const tomorrow = d.toDateString() !== now.toDateString();
    return lang === 'de' ? (tomorrow ? `morgen um ${hm}` : `um ${hm}`) : (tomorrow ? `завтра о ${hm}` : `о ${hm}`);
  };

  /* Назва матеріалу з урахуванням мови */
  V.mn = function (id) {
    const M = V.MATERIALS, m = M && M[id];
    if (id === 'carbon') return lang === 'de' ? 'Kohlenstoff' : 'вуглець';
    if (!m) return id;
    let base;
    if (m.realIdx != null) base = lang === 'de' ? REAL_DE[m.realIdx][0] : V.REAL[m.realIdx].name;
    else if (m.word) base = V.wordName(m.word);     // вигадане слово, записане складами
    else if (m.inventor) base = m.name;            // назва, яку дала модель
    else base = lang === 'de' ? (MAT_DE[id] || m.name) : m.name;
    return m.withComp ? `${base} (${V.describeComp(m.comp)})` : base;
  };
  const SYL = { uk: ['ва', 'ре', 'лі', 'то', 'мі', 'ар', 'ко', 'ні', 'ус', 'да', 'ле', 'ри', 'са', 'ту', 'ен', 'ор', 'ві', 'ла', 'мо', 'зе'],
    de: ['wa', 're', 'li', 'to', 'mi', 'ar', 'ko', 'ni', 'us', 'da', 'le', 'ri', 'sa', 'tu', 'en', 'or', 'wi', 'la', 'mo', 'se'] };
  V.SYL_COUNT = 20;
  V.wordName = idx => { const w = idx.map(k => SYL[lang][k]).join(''); return w.charAt(0).toUpperCase() + w.slice(1); };
  V.ideaName = id => lang === 'de' ? IDEA_DE[id][0] : V.IDEAS[id].name;
  V.ideaVerb = id => lang === 'de' ? IDEA_DE[id][1] : V.IDEAS[id].verb;
  V.ideaEffect = id => lang === 'de' ? IDEA_DE[id][2] : V.IDEAS[id].effect;
  V.slotName = id => lang === 'de' ? SLOT_DE[id] : V.SLOT[id].name;
  V.lawWhy = id => { const l = V.LAWS.find(x => x.id === id); return lang === 'de' ? LAW_DE[id] : (l ? l.why : ''); };
  V.realNote = idx => lang === 'de' ? REAL_DE[idx][1] : V.REAL[idx].note;

  V.describeComp = function (comp) {
    const fine = comp.some(([, f]) => f < 0.01 || f > 0.99);
    return comp.map(([id, f]) => `${(f * 100).toFixed(fine ? 1 : 0)}% ${V.mn(id)}`).join(' + ');
  };
  V.propLine = function (p) {
    const de = lang === 'de', parts = [];
    parts.push(`${de ? 'Härte' : 'твердість'} ${(+p.hard).toFixed(1)}`);
    parts.push(`${de ? 'Zähigkeit' : 'міцність'} ${(+p.tough).toFixed(1)}`);
    if (p.flex > 2) parts.push(`${de ? 'Biegsamkeit' : 'гнучкість'} ${(+p.flex).toFixed(1)}`);
    parts.push(`${de ? 'Dichte' : 'густина'} ${(+p.dens).toFixed(1)} ${de ? 'g/cm³' : 'г/см³'}`);
    if (p.mp) parts.push(de ? `schmilzt bei ~${Math.round(p.mp)} °C` : `плавиться ~${Math.round(p.mp)}°C`);
    else if (p.hp) parts.push(de ? `hält ~${Math.round(p.hp)} °C aus` : `витримує ~${Math.round(p.hp)}°C`);
    if (p.cond >= 0.9) parts.push(`${de ? 'Leiter' : 'провідник'}, ${p.pot >= 0 ? '+' : ''}${(+p.pot).toFixed(2)} ${de ? 'V' : 'В'}`);
    if (p.wp >= 0.8) parts.push(de ? 'wasserdicht' : 'водонепроникний');
    return parts.join(', ');
  };
  /* Опис створеного матеріалу */
  V.matDesc = function (m) {
    if (!m || !m.inventor) return m && lang === 'uk' ? (m.desc || '') : '';
    if (m.realIdx != null) return `${V.realNote(m.realIdx)}. ${lang === 'de' ? 'Zusammensetzung' : 'Склад'}: ${V.describeComp(m.comp)}.`;
    const near = m.nearest ? V.mn(m.nearest) : '—';
    return lang === 'de'
      ? `Neuartig: ${m.alloy ? 'Legierung' : 'Verbundstoff'} aus ${V.describeComp(m.comp)}. In der realen Welt hat er keinen eigenen Namen. Am ähnlichsten in den Eigenschaften: ${near}.`
      : `Нового типу: ${m.alloy ? 'сплав' : 'композит'} ${V.describeComp(m.comp)}. У реальному світі окремої назви не має. Найближчий за властивостями: ${near}.`;
  };
  V.devName = function (d) {
    if (!d) return '';
    if (d.custom) return d.custom;
    return V.ideaName(d.idea) + (d.improved ? (lang === 'de' ? ' (verbessert)' : ' (вдосконалений)') : '');
  };
  V.knowName = function (k) {
    const id = k.slice(2), de = lang === 'de';
    if (k.startsWith('m:')) return V.mn(id);
    if (k.startsWith('d:')) return (de ? 'Bauweise: ' : 'як зробити: ') + V.ideaName(id);
    if (k.startsWith('i:')) return (de ? 'Idee: ' : 'ідея: ') + V.ideaName(id);
    if (k.startsWith('l:')) { const l = V.LAWS.find(x => x.id === id); return l ? (de ? 'Gesetz: ' : 'закон: ') + l.inputs.map(V.mn).join('+') + ' → ' + V.mn(l.out) : id; }
    return k;
  };

  /* ---------- Тексти ---------- */
  // Параметри: n, n2, n3 — імена; m, m2 — id матеріалів; ms — масив id; idea, slot, law, era — ключі;
  // parts — [[гніздо, матеріал], …]; comp — склад; useful — масив гнізд; note, a, b — вкладені повідомлення.
  const UK = {
    'raw': r => r.s,
    'log.start': 'Вісім поселенців розклали багаття в долині. Вони вміють розводити вогонь — і більше нічого.',
    'log.find': r => `${r.n} вперше знаходить у долині: ${r.m}.`,
    'log.idea': r => `${r.n} замислюється: ${r.why}`,
    'th.idea': r => r.why.charAt(0).toUpperCase() + r.why.slice(1),
    'why.vessel': 'якби мати щось, що тримає воду над вогнем…',
    'why.kiln': 'треба загородити вогонь, щоб жар не розходився.',
    'why.bellows': 'а якщо дмухати в піч повітрям?',
    'why.net': 'риба близько — от би її чимось вичерпати.',
    'why.raft': 'деревина тримається на воді… а людина на ній?',
    'why.cart': 'носити все в руках — надто повільно.',
    'why.pen': 'а що як тримати тварин поруч, замість ганятися за ними?',
    'why.house': 'стіни, що тримають жар у печі, втримають і тепло вночі.',
    'why.lens': 'крізь скло все здається більшим!',
    'why.tablet': 'якщо видряпати знання на глині, їх не забудуть.',
    'why.cell': 'два різні метали в солоній воді щипають язик — у цьому щось є.',
    'log.wall': r => `${r.n}: стіни печі тріщать — вище ${r.cap}°C вони не витримують.`,
    'log.discMat': r => `★ ${r.n}: ${r.ms}${r.cold ? '' : ` при ${r.t}°C`} → новий матеріал — ${r.m}! (${r.lawWhy})`,
    'how.heat': r => r.cold ? `${r.ms}, без нагрівання` : `${r.ms} при ${r.t}°C`,
    'th.success': r => `Вийшло! ${r.m}!`,
    'th.again': r => `Знову вийшло: ${r.m}.`,
    'log.hint': r => `${r.n}: ${r.ms} — ${r.note}`,
    'heat.ore': 'руда розжарилася, але нічого не віддала — може, їй чогось бракує в суміші?',
    'heat.air': 'все просто згоріло — може, потрібен жар без повітря?',
    'heat.hotter': r => `щось почало змінюватися, але жару замало (досягнуто ${r.t}°C)`,
    'heat.melt': r => `${r.m} розплавився і знову застиг — новим матеріалом не став`,
    'heat.burn': r => `${r.m} просто згорів`,
    'heat.nothing': 'нічого не сталося',
    'log.invent': r => `★ ${r.n} винаходить: ${r.dev}! (${r.parts}) — працює, якість ${r.q}.${r.volts ? ` Напруга ${r.volts} В.` : ''}`,
    'th.invent': r => `Мій винахід працює: ${r.idea}!`,
    'log.improve': r => `${r.n} вдосконалює винахід «${r.idea}»: ${r.parts}. Якість ${r.q0} → ${r.q1}.`,
    'th.notBetter': r => `Вийшло, але не краще за наявне: ${r.idea}.`,
    'th.partial': r => `${cap(r.idea)} майже працює, але ${r.slot} підводить.`,
    'log.partial': r => `${r.n} пробує зробити «${r.idea}» (${r.parts}) — майже, але ${r.slot} не годиться.`,
    'th.fail': r => `${cap(r.idea)} з такого не вийде: ${r.slot} нікуди не годиться.`,
    'th.cantStart': r => `Не можу почати: забракло — ${r.m}.`,
    'th.needHeat': r => `${cap(r.m)} і ${r.m2} не змішуються — треба розплавити, а це ${r.t}°C.`,
    'log.needHeat': r => `${r.n} намагається сплавити ${r.m} з ${r.m2}, але печі не вистачає жару (${r.t}°C).`,
    'th.known': r => `Вийшов знайомий матеріал: ${r.m}.`,
    'th.crumble': 'Суміш розсипалася на порох.',
    'log.crumble': r => `${r.n}: суміш ${r.comp} розсипалася.`,
    'log.junk': r => `${r.n} змішує ${r.comp} і називає це «${r.m}». Поки незрозуміло, навіщо воно.`,
    'th.junk': r => `«${r.m}»… цікаво, але навіщо?`,
    'log.newMat': r => `★ ${r.n} створює ${r.alloy ? 'сплав' : 'композит'} «${r.m}» (${r.real ? 'справжній матеріал' : 'невідомий у реальному світі'}): ${r.comp}.${r.useful ? ` Найкращий для: ${r.useful}!` : ''}`,
    'th.newMat': r => `Новий матеріал — «${r.m}»!`,
    'th.look': 'Оглядаюся довкола.',
    'th.rest': 'Час відпочити.',
    'th.ate': r => `Поїв: ${r.m}.`,
    'th.play': 'Граюся біля табору!',
    'th.goGather': r => `Іду по: ${r.m}.`,
    'th.capture': 'Спробую впіймати кроля живим.',
    'th.huntFor': r => `Полюю: ${r.animal}.`,
    'th.escaped': 'Втекло…',
    'log.firstPen': r => `${r.n} приводить першого прирученого кроля в загороду.`,
    'th.penned': 'Кріль у загороді!',
    'th.goodHunt': 'Вдале полювання!',
    'th.goFish': 'Йду рибалити.',
    'th.caught': r => `Упіймав рибу (${r.k}).`,
    'th.noBite': 'Не клює.',
    'th.explore': 'Цікаво, що там, за пагорбами?',
    'th.thinking': 'Обмірковую ідею…',
    'th.noMats': 'Бракує матеріалів для дослідів.',
    'plan.heat': r => `Спробую нагріти: ${r.ms}.`,
    'plan.build': r => `Майструю: ${r.idea} (${r.ms}).`,
    'plan.alloy': r => `Сплавляю: ${r.m} + ${r.m2}.`,
    'plan.comp': r => `Змішую: ${r.m} + ${r.m2}.`,
    'th.talkTo': r => `Іду поговорити. Співрозмовник: ${r.n}.`,
    'log.help': r => `${r.n} помічає, що ${r.n2} ${r.f2 ? 'голодна' : 'голодний'}, і ділиться їжею.`,
    'log.talk': r => `${r.n}: «${r.a}»${r.b ? ` — ${r.n2}: «${r.b}»` : ''}`,
    'small.0': 'Як тобі сьогоднішній день?', 'ans.0': 'Добрий день, працюємо!',
    'small.1': 'Бачив, скільки кролів на луці?', 'ans.1': 'Ага, треба б на них полювати.',
    'small.2': 'Вогонь сьогодні гарно горить.', 'ans.2': 'Тепло — це головне.',
    'small.3': 'Чула, як вовки вили вночі?', 'ans.3': 'Тримаймося ближче до вогню.',
    'dlg.design': r => `Дивись, ${r.idea} робиться так: ${r.ms}.`, 'dlg.designA': 'О, тепер і я так зможу!',
    'dlg.law': r => `${r.ms}${r.cold ? '' : ' + жар'} = ${r.m}. Перевір!`, 'dlg.lawA': 'Не може бути! Треба спробувати.',
    'dlg.idea': r => `Я думаю, як ${r.verb}. Може, ${r.idea}?`, 'dlg.ideaA': 'Цікава думка…',
    'dlg.mat': r => `Знаєш, що таке ${r.m}? ${r.info}.`, 'dlg.matA': 'Запам\'ятаю.',
    'th.buildHouse': 'Будую новий дім.',
    'log.house': r => `${r.n} добудовує ще один дім. Тепер їх ${r.k}.`,
    'log.death': r => `${r.n} не ${r.f ? 'пережила' : 'пережив'} голоду. Поселення сумує.`,
    'log.birth': r => `У ${r.n} і ${r.n2} народжується дитина — ${r.n3}.`,
    'log.era': r => `Настає нова епоха: ${r.era}.`,
    'st.on': 'увімкнено', 'st.off': 'вимкнено', 'st.works': r => `працює (${r.ms} мс)`, 'st.err': r => `помилка: ${r.e}`,
    'st.noconn': 'немає з\'єднання (див. «Як під\'єднати»)', 'st.checking': 'перевіряю…', 'st.needKey': 'вставте ключ API',
    'st.badKey': 'ключ не прийнято', 'st.okOR': 'з\'єднано з OpenRouter', 'st.ok': 'з\'єднано', 'st.okNoModels': 'з\'єднано, але моделей немає',
    'st.missing': r => `моделі «${r.model}» немає, доступні: ${r.list}`,
    'st.limit': r => `денний ліміт вичерпано, відновиться ${V.fmtTime(r.until)}`,
    'log.llmDown': 'LLM-мозок не відповідає. Поселенці думають за правилами, поки модель не повернеться.',
    'log.llmLimit': r => `Денний ліміт моделі вичерпано. До ${V.fmtTime(r.until).replace(/^завтра о |^о /, '')} поселенці думають за правилами.`,
    'log.llmUp': 'LLM-мозок знову працює.',
    'log.llmPaused': 'LLM-мозок поставлено на паузу. Поселенці думають за правилами.',
    'log.llmResumed': 'LLM-мозок знову увімкнено.',
    'dlg.p.hotter': r => `Хочу щось отримати з такого: ${r.ms}, але жару замало — лише ${r.t}°C.`,
    'dlg.p.air': r => `${cap(r.ms)} у вогні просто згорає. Як бути?`,
    'dlg.s.know': r => r.kt === 'd' ? `Я вмію робити «${r.kname}» — це допоможе. Покажу!` : r.kt === 'm' ? `Візьми як паливо таке: ${r.kname}. Горить значно гарячіше!` : `Деревину треба палити без повітря — вийде вугілля.`,
    'dlg.b.kiln': 'Не знаю… А якщо обкласти вогонь камінням, щоб жар не втікав?',
    'dlg.b.bellows': 'Хм… а якщо дмухати в піч? Може, жар зросте?',
    'dlg.p.wall': r => `Моя піч тріщить, щойно жар вищий за ${r.cap}°C.`,
    'dlg.s.wall': r => `Склади стіни з такого матеріалу: ${r.m}. Він витримає більше.`,
    'dlg.b.wall': 'Треба щось, що зовсім не боїться вогню… Подумаю.',
    'dlg.p.device': r => `Мій винахід «${r.idea}» не виходить: частина «${r.slot}» не годиться.`,
    'dlg.s.mat': r => `Для частини «${r.slot}» спробуй таке: ${r.m}. Точно підійде.`,
    'dlg.g.mat': r => `Можливо, для частини «${r.slot}» згодиться таке: ${r.m}?`,
    'dlg.p.missing': r => `Мені бракує матеріалу: ${r.m}.`,
    'dlg.s.missing': r => `Я знаю, де це знайти: ${r.m}. Принесу!`,
    'dlg.p.food': 'Їжі мало, усі ходять голодні.',
    'dlg.s.food': r => `Я вмію робити «${r.idea}» — з цим їжі буде більше. Навчу!`,
    'dlg.b.food': r => `А що як придумати таке: ${r.idea}?`,
    'dlg.news.mat': r => `Я ${r.f ? 'створила' : 'створив'} новий матеріал — ${r.m}!`,
    'dlg.news.dev': r => `Мій винахід «${r.idea}» працює!`,
    'dlg.news.a': 'Ого! Покажеш, як?',
    'log.solved': r => `${r.n} і ${r.n2} разом розв'язали проблему: ${r.kn}.`,
    'log.brainstorm': r => `${r.n} і ${r.n2} радяться й разом доходять ідеї: ${r.idea}.`,
    'log.advice': r => `${r.n} радить: для «${r.idea}», частина «${r.slot}» — ${r.m}. ${r.n2} спробує.`,
    'log.together': r => `★ Спільний винахід: ${r.n} і ${r.n2} — «${r.idea}»! Вирішальна порада: ${r.m}.`,
    'log.wolfDied': 'Старий вовк не знайшов здобичі й загинув від голоду.',
    'log.wolves': 'З далеких лісів у долину прийшла нова зграя вовків.',
    'rw.solved': 'спільно розв\'язали проблему', 'rw.brainstorm': 'придумали разом', 'rw.coinvent': 'спільний винахід',
    // причини натхнення
    'rw.learn': 'нове знання', 'rw.foundMat': 'знайшов новий матеріал', 'rw.sawFish': 'побачив рибу', 'rw.idea': 'нова ідея',
    'rw.taughtBy': 'навчився в іншого', 'rw.wasTaught': 'мене навчили', 'rw.teach': 'допоміг іншому розвиватися', 'rw.chat': 'гарна розмова',
    'rw.fed': 'нагодував іншого', 'rw.hunt': 'вдале полювання', 'rw.gather': 'приніс до табору', 'rw.explore': 'дослідив місцевість',
    'rw.walk': 'прогулянка', 'rw.newMat': 'новий матеріал', 'rw.useful': 'новий матеріал працює краще за відомі',
    'rw.invent': 'новий винахід працює', 'rw.improve': 'покращив винахід', 'rw.partial': 'майже вийшло', 'rw.fail': 'спроба',
    'rw.impact': 'інші користуються моїм винаходом', 'rw.copied': 'відтворив відому конструкцію', 'rw.recipe': 'повторив рецепт',
    'rw.observe': 'цінне спостереження', 'rw.tamed': 'приручив тварину', 'rw.catch': 'улов', 'rw.built': 'збудував для всіх',
    'rw.tablets': 'таблички вчать інших', 'rw.readTablets': 'прочитав таблички', 'rw.work': 'корисна робота',
  };

  const DE = {
    'raw': r => r.s,
    'log.start': 'Acht Siedler haben im Tal ein Feuer entzündet. Sie können Feuer machen — und sonst nichts.',
    'log.find': r => `${r.n} entdeckt zum ersten Mal im Tal: ${r.m}.`,
    'log.idea': r => `${r.n} grübelt: ${r.why}`,
    'th.idea': r => r.why.charAt(0).toUpperCase() + r.why.slice(1),
    'why.vessel': 'hätte man doch etwas, das Wasser über dem Feuer hält …',
    'why.kiln': 'man muss das Feuer einfassen, damit die Glut nicht verfliegt.',
    'why.bellows': 'und wenn man Luft in den Ofen bläst?',
    'why.net': 'die Fische sind so nah — könnte man sie doch herausschöpfen.',
    'why.raft': 'Holz schwimmt auf dem Wasser … und ein Mensch darauf?',
    'why.cart': 'alles in den Händen zu tragen, ist zu langsam.',
    'why.pen': 'was, wenn wir die Tiere bei uns halten, statt ihnen nachzujagen?',
    'why.house': 'Wände, die die Glut im Ofen halten, halten nachts auch die Wärme.',
    'why.lens': 'durch Glas sieht alles größer aus!',
    'why.tablet': 'ritzt man Wissen in Ton, wird es nicht vergessen.',
    'why.cell': 'zwei verschiedene Metalle in Salzwasser kribbeln auf der Zunge — da steckt etwas dahinter.',
    'log.wall': r => `${r.n}: Die Ofenwände knacken — über ${r.cap} °C halten sie nicht.`,
    'log.discMat': r => `★ ${r.n} ${r.cold ? 'verbindet' : 'erhitzt'} ${r.ms}${r.cold ? '' : ` auf ${r.t} °C`} und erhält einen neuen Stoff — ${r.m}! (${r.lawWhy})`,
    'how.heat': r => r.cold ? `${r.ms}, ohne Erhitzen` : `${r.ms} bei ${r.t} °C`,
    'th.success': r => `Geschafft! ${r.m}!`,
    'th.again': r => `Wieder geklappt: ${r.m}.`,
    'log.hint': r => `${r.n}: ${r.ms} — ${r.note}`,
    'heat.ore': 'das Erz glüht, gibt aber nichts frei — fehlt vielleicht etwas in der Mischung?',
    'heat.air': 'alles ist einfach verbrannt — braucht es Glut ohne Luft?',
    'heat.hotter': r => `es beginnt sich zu verändern, aber die Glut reicht nicht (erreicht: ${r.t} °C)`,
    'heat.melt': r => `${r.m} ist geschmolzen und wieder erstarrt — ein neuer Stoff ist es nicht`,
    'heat.burn': r => `${r.m} ist einfach verbrannt`,
    'heat.nothing': 'nichts ist passiert',
    'log.invent': r => `★ ${r.n} erfindet: ${r.dev}! (${r.parts}) — funktioniert, Qualität ${r.q}.${r.volts ? ` Spannung ${r.volts} V.` : ''}`,
    'th.invent': r => `Meine Erfindung funktioniert: ${r.idea}!`,
    'log.improve': r => `${r.n} verbessert: ${r.idea} (${r.parts}). Qualität ${r.q0} → ${r.q1}.`,
    'th.notBetter': r => `Geklappt, aber nicht besser als das Vorhandene: ${r.idea}.`,
    'th.partial': r => `${r.idea} funktioniert fast, aber ${r.slot} taugt nicht.`,
    'log.partial': r => `${r.n} versucht: ${r.idea} (${r.parts}) — fast, aber ${r.slot} taugt nicht.`,
    'th.fail': r => `${r.idea} wird so nichts: ${r.slot} taugt gar nicht.`,
    'th.cantStart': r => `Kann nicht anfangen: es fehlt — ${r.m}.`,
    'th.needHeat': r => `${r.m} und ${r.m2} mischen sich nicht — man muss sie schmelzen, das sind ${r.t} °C.`,
    'log.needHeat': r => `${r.n} versucht, ${r.m} mit ${r.m2} zu legieren, aber der Ofen ist nicht heiß genug (${r.t} °C).`,
    'th.known': r => `Ein bekannter Stoff ist entstanden: ${r.m}.`,
    'th.crumble': 'Die Mischung ist zu Staub zerfallen.',
    'log.crumble': r => `${r.n}: Die Mischung ${r.comp} ist zerfallen.`,
    'log.junk': r => `${r.n} mischt ${r.comp} und nennt es „${r.m}“. Wofür es gut ist, ist noch unklar.`,
    'th.junk': r => `„${r.m}“ … spannend, aber wozu?`,
    'log.newMat': r => `★ ${r.n} erschafft ${r.alloy ? 'die Legierung' : 'den Verbundstoff'} „${r.m}“ (${r.real ? 'echter Werkstoff' : 'in der realen Welt unbekannt'}): ${r.comp}.${r.useful ? ` Am besten für: ${r.useful}!` : ''}`,
    'th.newMat': r => `Ein neuer Stoff — „${r.m}“!`,
    'th.look': 'Ich schaue mich um.',
    'th.rest': 'Zeit, sich auszuruhen.',
    'th.ate': r => `Gegessen: ${r.m}.`,
    'th.play': 'Ich spiele am Lager!',
    'th.goGather': r => `Ich hole: ${r.m}.`,
    'th.capture': 'Ich versuche, ein Kaninchen lebend zu fangen.',
    'th.huntFor': r => `Ich jage: ${r.animal}.`,
    'th.escaped': 'Entwischt …',
    'log.firstPen': r => `${r.n} bringt das erste gezähmte Kaninchen ins Gehege.`,
    'th.penned': 'Das Kaninchen ist im Gehege!',
    'th.goodHunt': 'Erfolgreiche Jagd!',
    'th.goFish': 'Ich gehe fischen.',
    'th.caught': r => `Fisch gefangen (${r.k}).`,
    'th.noBite': 'Kein Biss.',
    'th.explore': 'Was wohl hinter den Hügeln liegt?',
    'th.thinking': 'Ich denke über eine Idee nach …',
    'th.noMats': 'Mir fehlen Materialien für Versuche.',
    'plan.heat': r => `Ich versuche zu erhitzen: ${r.ms}.`,
    'plan.build': r => `Ich baue: ${r.idea} (${r.ms}).`,
    'plan.alloy': r => `Ich legiere: ${r.m} + ${r.m2}.`,
    'plan.comp': r => `Ich mische: ${r.m} + ${r.m2}.`,
    'th.talkTo': r => `Ich gehe reden. Gesprächspartner: ${r.n}.`,
    'log.help': r => `${r.n} merkt, dass ${r.n2} hungrig ist, und teilt das Essen.`,
    'log.talk': r => `${r.n}: „${r.a}“${r.b ? ` — ${r.n2}: „${r.b}“` : ''}`,
    'small.0': 'Wie war dein Tag?', 'ans.0': 'Guter Tag, wir arbeiten!',
    'small.1': 'Hast du gesehen, wie viele Kaninchen auf der Wiese sind?', 'ans.1': 'Ja, wir sollten sie jagen.',
    'small.2': 'Das Feuer brennt heute schön.', 'ans.2': 'Wärme ist das Wichtigste.',
    'small.3': 'Hast du die Wölfe heute Nacht heulen gehört?', 'ans.3': 'Bleiben wir nah am Feuer.',
    'dlg.design': r => `Schau, so baut man: ${r.idea} — ${r.ms}.`, 'dlg.designA': 'Oh, jetzt kann ich das auch!',
    'dlg.law': r => `${r.ms}${r.cold ? '' : ' + Hitze'} = ${r.m}. Probier's aus!`, 'dlg.lawA': 'Unglaublich! Das muss ich probieren.',
    'dlg.idea': r => `Ich überlege, wie man ${r.verb} kann. Vielleicht: ${r.idea}?`, 'dlg.ideaA': 'Interessanter Gedanke …',
    'dlg.mat': r => `Kennst du ${r.m}? ${r.info}.`, 'dlg.matA': 'Merke ich mir.',
    'th.buildHouse': 'Ich baue ein neues Haus.',
    'log.house': r => `${r.n} baut noch ein Haus. Jetzt sind es ${r.k}.`,
    'log.death': r => `${r.n} hat den Hunger nicht überlebt. Die Siedlung trauert.`,
    'log.birth': r => `${r.n} und ${r.n2} bekommen ein Kind — ${r.n3}.`,
    'log.era': r => `Ein neues Zeitalter beginnt: ${r.era}.`,
    'st.on': 'an', 'st.off': 'aus', 'st.works': r => `läuft (${r.ms} ms)`, 'st.err': r => `Fehler: ${r.e}`,
    'st.noconn': 'keine Verbindung (siehe „So verbindest du …“)', 'st.checking': 'prüfe …', 'st.needKey': 'API-Schlüssel einfügen',
    'st.badKey': 'Schlüssel abgelehnt', 'st.okOR': 'mit OpenRouter verbunden', 'st.ok': 'verbunden', 'st.okNoModels': 'verbunden, aber keine Modelle',
    'st.missing': r => `Modell „${r.model}“ fehlt, verfügbar: ${r.list}`,
    'st.limit': r => `Tageslimit erreicht, wieder verfügbar ${V.fmtTime(r.until)}`,
    'log.llmDown': 'Das LLM-Gehirn antwortet nicht. Die Siedler denken nach Regeln, bis das Modell zurück ist.',
    'log.llmLimit': r => `Das Tageslimit des Modells ist erreicht. Bis ${V.fmtTime(r.until).replace(/^morgen um |^um /, '')} Uhr denken die Siedler nach Regeln.`,
    'log.llmUp': 'Das LLM-Gehirn funktioniert wieder.',
    'log.llmPaused': 'Das LLM-Gehirn ist pausiert. Die Siedler denken nach Regeln.',
    'log.llmResumed': 'Das LLM-Gehirn ist wieder an.',
    'dlg.p.hotter': r => `Ich will etwas aus ${r.ms} gewinnen, aber die Glut reicht nicht — nur ${r.t} °C.`,
    'dlg.p.air': r => `${r.ms} verbrennt im Feuer einfach. Was tun?`,
    'dlg.s.know': r => r.kt === 'd' ? `Ich kann „${r.kname}“ bauen — das hilft. Ich zeig's dir!` : r.kt === 'm' ? `Nimm ${r.kname} als Brennstoff. Brennt viel heißer!` : `Holz muss ohne Luft brennen — dann wird Kohle daraus.`,
    'dlg.b.kiln': 'Weiß nicht … Und wenn wir das Feuer mit Steinen umgeben, damit die Glut bleibt?',
    'dlg.b.bellows': 'Hm … und wenn man in den Ofen bläst? Vielleicht wird die Glut stärker?',
    'dlg.p.wall': r => `Mein Ofen knackt, sobald es heißer als ${r.cap} °C wird.`,
    'dlg.s.wall': r => `Bau die Wände aus ${r.m}. Das hält mehr aus.`,
    'dlg.b.wall': 'Man bräuchte etwas, das gar keine Angst vor Feuer hat … Ich denke nach.',
    'dlg.p.device': r => `Meine Erfindung „${r.idea}“ klappt nicht: das Teil „${r.slot}“ taugt nicht.`,
    'dlg.s.mat': r => `Für das Teil „${r.slot}“ nimm ${r.m}. Das passt bestimmt.`,
    'dlg.g.mat': r => `Vielleicht passt für das Teil „${r.slot}“ ${r.m}?`,
    'dlg.p.missing': r => `Mir fehlt: ${r.m}.`,
    'dlg.s.missing': r => `Ich weiß, wo es ${r.m} gibt. Ich bring's dir!`,
    'dlg.p.food': 'Es gibt wenig Essen, alle sind hungrig.',
    'dlg.s.food': r => `Ich kann „${r.idea}“ bauen — damit gibt's mehr Essen. Ich bring's dir bei!`,
    'dlg.b.food': r => `Und wenn wir so etwas erfinden: ${r.idea}?`,
    'dlg.news.mat': r => `Ich habe einen neuen Stoff erschaffen — ${r.m}!`,
    'dlg.news.dev': r => `Meine Erfindung „${r.idea}“ funktioniert!`,
    'dlg.news.a': 'Wow! Zeigst du mir, wie?',
    'log.solved': r => `${r.n} und ${r.n2} haben gemeinsam ein Problem gelöst: ${r.kn}.`,
    'log.brainstorm': r => `${r.n} und ${r.n2} beraten sich und kommen gemeinsam auf eine Idee: ${r.idea}.`,
    'log.advice': r => `${r.n} rät: für „${r.idea}“, Teil „${r.slot}“ — ${r.m}. ${r.n2} probiert es.`,
    'log.together': r => `★ Gemeinsame Erfindung: ${r.n} und ${r.n2} — „${r.idea}“! Entscheidender Rat: ${r.m}.`,
    'log.wolfDied': 'Ein alter Wolf fand keine Beute und ist verhungert.',
    'log.wolves': 'Aus fernen Wäldern ist ein neues Wolfsrudel ins Tal gekommen.',
    'rw.solved': 'gemeinsam ein Problem gelöst', 'rw.brainstorm': 'gemeinsam ausgedacht', 'rw.coinvent': 'gemeinsame Erfindung',
    'rw.learn': 'neues Wissen', 'rw.foundMat': 'neuen Stoff gefunden', 'rw.sawFish': 'Fische gesehen', 'rw.idea': 'neue Idee',
    'rw.taughtBy': 'von anderen gelernt', 'rw.wasTaught': 'man hat mir etwas beigebracht', 'rw.teach': 'anderen beim Wachsen geholfen', 'rw.chat': 'gutes Gespräch',
    'rw.fed': 'jemanden satt gemacht', 'rw.hunt': 'erfolgreiche Jagd', 'rw.gather': 'zum Lager gebracht', 'rw.explore': 'Gegend erkundet',
    'rw.walk': 'Spaziergang', 'rw.newMat': 'neuer Stoff', 'rw.useful': 'neuer Stoff ist besser als alle bekannten',
    'rw.invent': 'neue Erfindung funktioniert', 'rw.improve': 'Erfindung verbessert', 'rw.partial': 'fast geschafft', 'rw.fail': 'Versuch',
    'rw.impact': 'andere nutzen meine Erfindung', 'rw.copied': 'bekannte Bauweise nachgebaut', 'rw.recipe': 'Rezept wiederholt',
    'rw.observe': 'wertvolle Beobachtung', 'rw.tamed': 'Tier gezähmt', 'rw.catch': 'Fang', 'rw.built': 'für alle gebaut',
    'rw.tablets': 'Tafeln lehren andere', 'rw.readTablets': 'Tafeln gelesen', 'rw.work': 'nützliche Arbeit',
  };
  const DICT = { uk: UK, de: DE };
  function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }

  /* Розгортання параметрів у готові рядки */
  function resolve(p) {
    const r = {};
    for (const k in p) {
      const v = p[k];
      if (v == null) continue;
      if (k === 'n' || k === 'n2' || k === 'n3') { r[k] = V.nn(v); r[k === 'n' ? 'f' : 'f' + k.slice(1)] = FEMALE.has(v); }
      else if (k === 'm' || k === 'm2') r[k] = V.mn(v);
      else if (k === 'ms') r.ms = v.map(V.mn).join(' + ');
      else if (k === 'idea') { r.idea = V.ideaName(v); r.verb = V.ideaVerb(v); }
      else if (k === 'slot') r.slot = V.slotName(v);
      else if (k === 'law') r.lawWhy = V.lawWhy(v);
      else if (k === 'era') r.era = V.eraName(v);
      else if (k === 'w') r.why = T('why.' + v);
      else if (k === 'parts') r.parts = v.map(([s, m]) => `${V.slotName(s)} — ${V.mn(m)}`).join(', ');
      else if (k === 'comp') r.comp = V.describeComp(v);
      else if (k === 'useful') r.useful = v.length ? v.map(V.slotName).join(', ') : '';
      else if (k === 'animal') r.animal = V.animalName(v);
      else if (k === 'dev') r.dev = V.devName(v);
      else if (k === 'info') r.info = v;
      else if (k === 'key') { r.kn = V.knowName(v); r.kt = v.slice(0, 1); r.kid = v.slice(2); r.kname = v[0] === 'm' ? V.mn(r.kid) : V.IDEAS[r.kid] ? V.ideaName(r.kid) : ''; }
      else if (Array.isArray(v) && typeof v[0] === 'string' && (v.length === 1 || typeof v[1] === 'object')) r[k] = V.R(v);
      else r[k] = v;
    }
    if (p.infoMat) { const m = V.MATERIALS[p.infoMat]; const d = V.matDesc(m); r.info = d ? d.split('.')[0] : V.propLine(m); }
    return r;
  }

  function T(key, p) {
    const d = DICT[lang][key] !== undefined ? DICT[lang][key] : UK[key];
    if (d === undefined) return key;
    return typeof d === 'function' ? d(resolve(p || {})) : d;
  }
  V.T = T;
  /* Повідомлення: рядок (як є) або [ключ, параметри] */
  V.R = function (msg) {
    if (msg == null) return '';
    if (typeof msg === 'string') return msg;
    return T(msg[0], msg[1]);
  };
  V.msg = (key, p) => [key, p || {}];

  /* ---------- Статичний інтерфейс ---------- */
  V.UI = {
    uk: {
      title: 'Долина винахідників', q1: '«', q2: '»',
      'aria.speed': 'Швидкість часу', pause: 'Пауза', resume: 'Продовжити',
      'stat.pop': 'мешканців', 'stat.food': 'їжі в запасі', 'stat.mats': 'відомих матеріалів', 'stat.inv': 'винаходів',
      'stat.exp': 'дослідів', 'stat.insp': 'натхнення', 'stat.rab': 'кролів', 'stat.deer': 'оленів', 'stat.wolf': 'вовків',
      day: 'День', night: 'ніч', dayShort: 'Д',
      'lg.rabbit': 'кріль', 'lg.deer': 'олень', 'lg.wolf': 'вовк', 'lg.ore': 'руда', 'lg.exp': 'дослід',
      'lg.hint': 'Торкніться поселенця, щоб стежити за ним.',
      'tab.chron': 'Хроніка', 'tab.people': 'Мешканці', 'tab.disc': 'Відкриття', 'tab.brain': 'Мозок',
      'f.all': 'Усе', 'f.discovery': 'Відкриття', 'f.idea': 'Ідеї', 'f.talk': 'Розмови', 'f.together': 'Разом', 'f.life': 'Життя',
      quiet: 'Поки тихо.', zoomIn: 'Наблизити', zoomOut: 'Віддалити', strip: 'Мешканці', follow: 'Стежити за обраним',
      prev: 'Попередній мешканець', next: 'Наступний мешканець', close: 'Закрити', child: 'дитина', adult: 'дорослий', deceased: 'помер(ла)',
      lastLine: 'Остання репліка', sat: 'Ситість', energy: 'Енергія', social: 'Спілкування', health: 'Здоров\'я',
      insp: 'Натхнення', brainLearned: 'Чого навчився мозок: очікуване натхнення від кожного заняття.',
      knowledge: 'Знання', matsN: 'матеріалів', lawsN: 'законів природи', craft: 'ремесло', teachSk: 'навчання',
      invented: 'Винайшов(ла)', friends: 'Друзі', history: 'Історія', nothingYet: 'Поки нічого особливого.', knowN: 'знань',
      inventions: 'Винаходи', noInv: 'Ще нічого. Поселенці лише починають пробувати.', quality: 'якість',
      materials: 'Матеріали', matHint: 'Торкніться матеріалу, щоб побачити властивості. Помаранчева рамка — створений поселенцями.',
      derived: 'Отримані', natural: 'Природні', noneYet: 'поки немає', recent: 'Останні відкриття', inventedHere: 'вигаданий у долині',
      realMat: 'справжній матеріал', bestFor: 'Найкращий для', created: 'Створено', newTag: 'новий', realTag: 'справжній',
      'llm.title': 'LLM-мозок',
      'llm.intro': 'Без LLM поселенці думають за правилами і вчаться на заохоченнях. З LLM безкоштовна відкрита модель вигадує їхні експерименти та розмови, а рушій фізики перевіряє, чи це справді працює.',
      'p.cf': 'хмара цього сайту, без ключа', 'p.or': 'хмара, працює з телефона', 'p.ol': 'на твоєму комп\'ютері', 'p.lm': 'на твоєму комп\'ютері',
      'llm.on': 'Під\'єднати модель', 'llm.server': 'Сервер', 'llm.url': 'Адреса', 'llm.model': 'Модель', 'llm.key': 'Ключ API',
      'llm.compat': 'OpenAI-сумісний (LM Studio, llama.cpp…)', 'llm.plans': 'Модель вигадує експерименти', 'llm.chat': 'Модель пише розмови',
      'llm.test': 'Перевірити з\'єднання', 'llm.off': 'вимкнено', 'llm.answers': 'відповідей', 'llm.noThought': '(без думки)',
      'llm.bad': 'відповідь не підійшла, вирішили правила', 'key.ollama': 'не потрібен для Ollama', 'key.opt': 'якщо сервер його вимагає', 'key.cf': 'не потрібен',
      'how.title': 'Як під\'єднати безкоштовну модель',
      'how.cf': '<b>Cloudflare Workers AI</b> — якщо гра розгорнута на Cloudflare (інструкція в README), натисніть «Cloudflare» вгорі: модель працює на сервері сайту, без ключа, з телефона.',
      'how.or': '<b>OpenRouter</b> — створіть ключ на <a href="https://openrouter.ai/keys" target="_blank" rel="noopener">openrouter.ai/keys</a>, натисніть «OpenRouter» і вставте ключ. Модель <code>openrouter/free</code> сама обирає доступну безкоштовну модель.',
      'how.ol': '<b>Ollama</b> на комп\'ютері: <code>ollama pull qwen2.5:3b</code>, потім <code>OLLAMA_ORIGINS="*" ollama serve</code> (PowerShell: <code>$env:OLLAMA_ORIGINS="*"; ollama serve</code>), відкрийте <code>index.html</code> і натисніть «Ollama».',
      'how.note': 'У веб-версії гри, відкритій із Claude, з\'єднання зі сторонніми серверами заблоковані, тому там працює лише мозок на правилах. Ключ API зберігається лише у вашому браузері.',
      'about.title': 'Як це влаштовано',
      'about.1': '<b>Закони природи</b> — властивості матеріалів, температура полум\'я, піч, міхи, межа жаростійкості стін, сплави та композити. Їх знає лише світ.',
      'about.2': '<b>Ідеї</b> народжуються з проблем: «жару замало», «риба близько», «носити важко». Як саме втілити ідею, поселенці шукають самі.',
      'about.3': '<b>Натхнення</b>: нове знання +2, навчити іншого +4, новий матеріал +15, матеріал кращий за відомі +20, робочий винахід до +40, покращення +10, невдача +1, бонус автору, коли інші користуються винаходом. Поселенці частіше роблять те, що приносить натхнення.',
      'about.4': '<b>Нові матеріали</b>: якщо склад збігається з реальним (бронза, спекулум, сталь, саман…), матеріал отримує справжню назву; якщо ні — вигадану з поясненням і найближчим відомим аналогом.',
      'tab.worlds': 'Світи', 'banner.close': 'Сховати',
      'chip.off': 'LLM вимкнено', 'chip.paused': 'LLM на паузі', 'chip.ok': 'LLM працює', 'chip.idle': 'LLM готовий', 'chip.down': 'LLM не відповідає', 'chip.limit': 'LLM: ліміт вичерпано',
      'llm.pauseBtn': 'Пауза моделі', 'llm.resumeBtn': 'Продовжити модель',
      'w.current': 'Поточна цивілізація', 'w.name': 'Назва', 'w.save': 'Зберегти зараз', 'w.savedAt': 'Збережено',
      'w.auto': 'Світ зберігається автоматично щохвилини та коли ви закриваєте сторінку. Наступного разу гра продовжиться з того самого місця.',
      'w.new': 'Нова цивілізація', 'w.newNote': 'Поточну цивілізацію буде збережено — її можна відкрити пізніше.',
      'w.list': 'Збережені цивілізації', 'w.open': 'Відкрити', 'w.del': 'Видалити', 'w.confirm': 'Точно видалити?', 'w.active': 'відкрита зараз',
      'w.local': 'Збереження живуть у цьому браузері на цьому пристрої. На іншому пристрої їх не буде.',
      'w.full': 'У браузері забракло місця для збереження. Видаліть стару цивілізацію.', 'w.civ': 'Цивілізація', 'w.pop': 'мешканців', 'w.failed': 'Не вдалося відкрити це збереження.',
      newWorld: 'Новий світ', worldNo: 'Світ №', mapLabel: 'Карта долини', speed: 'Швидкість',
      'note.cf': 'Модель працює на Cloudflare Workers AI цього сайту — ключ не потрібен. Якщо з\'єднання немає, гру відкрито не з Cloudflare.',
      'note.or': 'Вставте ключ з <a href="https://openrouter.ai/keys" target="_blank" rel="noopener">openrouter.ai/keys</a>. Модель <code>openrouter/free</code> сама обирає доступну безкоштовну модель. Гра має бути відкрита зі звичайного сайту, а не з Claude.',
      'note.ol': 'Запустіть <code>OLLAMA_ORIGINS="*" ollama serve</code> і завантажте модель: <code>ollama pull qwen2.5:3b</code>.',
      'note.lm': 'У LM Studio завантажте модель і ввімкніть локальний сервер (Developer → Start Server, з дозволом CORS). Потім натисніть «Перевірити з\'єднання» і виберіть модель зі списку.',
    },
    de: {
      title: 'Tal der Erfinder', q1: '„', q2: '“',
      'aria.speed': 'Zeitgeschwindigkeit', pause: 'Pause', resume: 'Fortsetzen',
      'stat.pop': 'Bewohner', 'stat.food': 'Nahrung im Vorrat', 'stat.mats': 'bekannte Stoffe', 'stat.inv': 'Erfindungen',
      'stat.exp': 'Versuche', 'stat.insp': 'Inspiration', 'stat.rab': 'Kaninchen', 'stat.deer': 'Hirsche', 'stat.wolf': 'Wölfe',
      day: 'Tag', night: 'Nacht', dayShort: 'T',
      'lg.rabbit': 'Kaninchen', 'lg.deer': 'Hirsch', 'lg.wolf': 'Wolf', 'lg.ore': 'Erz', 'lg.exp': 'Versuch',
      'lg.hint': 'Tippe auf einen Siedler, um ihm zu folgen.',
      'tab.chron': 'Chronik', 'tab.people': 'Bewohner', 'tab.disc': 'Entdeckungen', 'tab.brain': 'Gehirn',
      'f.all': 'Alles', 'f.discovery': 'Entdeckungen', 'f.idea': 'Ideen', 'f.talk': 'Gespräche', 'f.together': 'Gemeinsam', 'f.life': 'Leben',
      quiet: 'Noch ist es ruhig.', zoomIn: 'Vergrößern', zoomOut: 'Verkleinern', strip: 'Bewohner', follow: 'Ausgewählten folgen',
      prev: 'Vorheriger Bewohner', next: 'Nächster Bewohner', close: 'Schließen', child: 'Kind', adult: 'erwachsen', deceased: 'verstorben',
      lastLine: 'Letzte Äußerung', sat: 'Sättigung', energy: 'Energie', social: 'Geselligkeit', health: 'Gesundheit',
      insp: 'Inspiration', brainLearned: 'Was das Gehirn gelernt hat: erwartete Inspiration je Tätigkeit.',
      knowledge: 'Wissen', matsN: 'Stoffe', lawsN: 'Naturgesetze', craft: 'Handwerk', teachSk: 'Lehren',
      invented: 'Erfunden', friends: 'Freunde', history: 'Geschichte', nothingYet: 'Noch nichts Besonderes.', knowN: 'Wissen',
      inventions: 'Erfindungen', noInv: 'Noch nichts. Die Siedler fangen gerade erst an zu probieren.', quality: 'Qualität',
      materials: 'Stoffe', matHint: 'Tippe auf einen Stoff, um seine Eigenschaften zu sehen. Orangefarbener Rahmen — von Siedlern erschaffen.',
      derived: 'Gewonnen', natural: 'Natürlich', noneYet: 'noch keine', recent: 'Letzte Entdeckungen', inventedHere: 'im Tal erfunden',
      realMat: 'echter Werkstoff', bestFor: 'Am besten für', created: 'Erschaffen', newTag: 'neu', realTag: 'echt',
      'llm.title': 'LLM-Gehirn',
      'llm.intro': 'Ohne LLM denken die Siedler nach Regeln und lernen durch Belohnungen. Mit LLM erfindet ein kostenloses offenes Modell ihre Experimente und Gespräche, und die Physik-Engine prüft, ob es wirklich funktioniert.',
      'p.cf': 'Cloud dieser Seite, ohne Schlüssel', 'p.or': 'Cloud, läuft auf dem Handy', 'p.ol': 'auf deinem Computer', 'p.lm': 'auf deinem Computer',
      'llm.on': 'Modell verbinden', 'llm.server': 'Server', 'llm.url': 'Adresse', 'llm.model': 'Modell', 'llm.key': 'API-Schlüssel',
      'llm.compat': 'OpenAI-kompatibel (LM Studio, llama.cpp …)', 'llm.plans': 'Modell erfindet Experimente', 'llm.chat': 'Modell schreibt Gespräche',
      'llm.test': 'Verbindung prüfen', 'llm.off': 'aus', 'llm.answers': 'Antworten', 'llm.noThought': '(ohne Gedanken)',
      'llm.bad': 'Antwort passte nicht, die Regeln haben entschieden', 'key.ollama': 'für Ollama nicht nötig', 'key.opt': 'falls der Server ihn verlangt', 'key.cf': 'nicht nötig',
      'how.title': 'So verbindest du ein kostenloses Modell',
      'how.cf': '<b>Cloudflare Workers AI</b> — wenn das Spiel auf Cloudflare läuft (Anleitung im README), tippe oben auf „Cloudflare“: das Modell läuft auf dem Server der Seite, ohne Schlüssel, auch vom Handy.',
      'how.or': '<b>OpenRouter</b> — erstelle einen Schlüssel auf <a href="https://openrouter.ai/keys" target="_blank" rel="noopener">openrouter.ai/keys</a>, tippe auf „OpenRouter“ und füge ihn ein. Das Modell <code>openrouter/free</code> wählt selbst ein verfügbares kostenloses Modell.',
      'how.ol': '<b>Ollama</b> auf dem Computer: <code>ollama pull qwen2.5:3b</code>, dann <code>OLLAMA_ORIGINS="*" ollama serve</code> (PowerShell: <code>$env:OLLAMA_ORIGINS="*"; ollama serve</code>), <code>index.html</code> öffnen und „Ollama“ tippen.',
      'how.note': 'In der Web-Version aus Claude sind Verbindungen zu fremden Servern gesperrt, dort läuft nur das Regel-Gehirn. Der API-Schlüssel bleibt nur in deinem Browser.',
      'about.title': 'Wie es funktioniert',
      'about.1': '<b>Naturgesetze</b> — Stoffeigenschaften, Flammentemperatur, Ofen, Blasebalg, Hitzegrenze der Wände, Legierungen und Verbundstoffe. Nur die Welt kennt sie.',
      'about.2': '<b>Ideen</b> entstehen aus Problemen: „zu wenig Glut“, „die Fische sind nah“, „Tragen ist mühsam“. Wie man sie umsetzt, finden die Siedler selbst heraus.',
      'about.3': '<b>Inspiration</b>: neues Wissen +2, andere lehren +4, neuer Stoff +15, Stoff besser als alle bekannten +20, funktionierende Erfindung bis +40, Verbesserung +10, Fehlschlag +1, Bonus für den Erfinder, wenn andere die Erfindung nutzen. Siedler tun öfter, was Inspiration bringt.',
      'about.4': '<b>Neue Stoffe</b>: Stimmt die Zusammensetzung mit einem echten Werkstoff überein (Bronze, Speculum, Stahl, Strohlehm …), bekommt er den echten Namen; sonst einen erfundenen mit Erklärung und dem ähnlichsten bekannten Stoff.',
      'tab.worlds': 'Welten', 'banner.close': 'Ausblenden',
      'chip.off': 'LLM aus', 'chip.paused': 'LLM pausiert', 'chip.ok': 'LLM aktiv', 'chip.idle': 'LLM bereit', 'chip.down': 'LLM antwortet nicht', 'chip.limit': 'LLM: Limit erreicht',
      'llm.pauseBtn': 'Modell pausieren', 'llm.resumeBtn': 'Modell fortsetzen',
      'w.current': 'Aktuelle Zivilisation', 'w.name': 'Name', 'w.save': 'Jetzt speichern', 'w.savedAt': 'Gespeichert',
      'w.auto': 'Die Welt wird jede Minute und beim Schließen der Seite automatisch gespeichert. Beim nächsten Mal geht es genau dort weiter.',
      'w.new': 'Neue Zivilisation', 'w.newNote': 'Die aktuelle Zivilisation wird gespeichert — du kannst sie später wieder öffnen.',
      'w.list': 'Gespeicherte Zivilisationen', 'w.open': 'Öffnen', 'w.del': 'Löschen', 'w.confirm': 'Wirklich löschen?', 'w.active': 'gerade geöffnet',
      'w.local': 'Spielstände bleiben in diesem Browser auf diesem Gerät. Auf anderen Geräten gibt es sie nicht.',
      'w.full': 'Im Browser ist kein Platz mehr zum Speichern. Lösche eine alte Zivilisation.', 'w.civ': 'Zivilisation', 'w.pop': 'Bewohner', 'w.failed': 'Dieser Spielstand ließ sich nicht öffnen.',
      newWorld: 'Neue Welt', worldNo: 'Welt Nr. ', mapLabel: 'Karte des Tals', speed: 'Tempo',
      'note.cf': 'Das Modell läuft auf Cloudflare Workers AI dieser Seite — kein Schlüssel nötig. Ohne Verbindung ist das Spiel nicht über Cloudflare geöffnet.',
      'note.or': 'Füge den Schlüssel von <a href="https://openrouter.ai/keys" target="_blank" rel="noopener">openrouter.ai/keys</a> ein. Das Modell <code>openrouter/free</code> wählt selbst ein verfügbares kostenloses Modell. Das Spiel muss von einer normalen Webseite geöffnet sein, nicht aus Claude.',
      'note.ol': 'Starte <code>OLLAMA_ORIGINS="*" ollama serve</code> und lade ein Modell: <code>ollama pull qwen2.5:3b</code>.',
      'note.lm': 'Lade in LM Studio ein Modell und starte den lokalen Server (Developer → Start Server, mit CORS). Dann „Verbindung prüfen“ tippen und das Modell aus der Liste wählen.',
    },
  };
  V.u = key => (V.UI[lang][key] !== undefined ? V.UI[lang][key] : V.UI.uk[key] !== undefined ? V.UI.uk[key] : key);
})(window.V = window.V || {});
