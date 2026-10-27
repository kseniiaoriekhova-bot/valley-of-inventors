/* ============================================================
   Інтерфейс спостерігача
   ============================================================ */
(function (V) {
  'use strict';
  const $ = id => document.getElementById(id);
  const M = V.MATERIALS;
  const u = V.u;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* ---------- збереження цивілізацій (localStorage цього браузера) ---------- */
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { localStorage.setItem(k, v); },            // помилку (немає місця) обробляє той, хто викликав
    del(k) { try { localStorage.removeItem(k); } catch (e) { /* ок */ } },
  };
  let civs = [];
  try { civs = JSON.parse(store.get('valley.worlds') || '[]') || []; } catch (e) { civs = []; }
  const saveIndex = () => { try { store.set('valley.worlds', JSON.stringify(civs)); } catch (e) { /* ок */ } };
  let civ = null, lastSaved = 0, saveError = false, delArm = null;

  function newCivEntry() {
    const num = civs.reduce((m, c) => Math.max(m, c.num || 0), 0) + 1;
    const entry = { id: 'c' + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36), num, name: '', seed: Math.floor(Math.random() * 1e6) };
    civs.push(entry);
    return entry;
  }
  const civName = c => c.name || `${u('w.civ')} ${c.num}`;
  function openSaved(entry) {
    const raw = store.get('valley.world.' + entry.id);
    if (!raw) return null;
    try { return new V.Sim(entry.seed, JSON.parse(raw)); } catch (e) { return null; }
  }
  // відкрити останню цивілізацію або почати першу
  let sim = null;
  const activeId = store.get('valley.active');
  civ = civs.find(c => c.id === activeId) || null;
  if (civ) sim = openSaved(civ);
  if (!sim) { if (!civ) civ = newCivEntry(); for (const id of Object.keys(V.MATERIALS)) if (/^g\d+$/.test(id)) delete V.MATERIALS[id]; sim = new V.Sim(civ.seed); }
  try { store.set('valley.active', civ.id); } catch (e) { /* ок */ }
  saveIndex();

  function saveNow() {
    try {
      store.set('valley.world.' + civ.id, JSON.stringify(sim.serialize()));
      Object.assign(civ, { seed: sim.seed, day: sim.day(), era: sim.era, pop: sim.npcs.length, updated: Date.now() });
      saveIndex(); store.set('valley.active', civ.id);
      lastSaved = Date.now(); saveError = false;
    } catch (e) { saveError = true; }
    if (tab === 'worlds') renderWorlds();
  }
  function switchTo(newSim, entry) {
    sim = newSim; civ = entry;
    R.setSim(sim); R.sel = null; selMat = null; follow = false;
    try { store.set('valley.active', civ.id); } catch (e) { /* ок */ }
    lastChron = ''; renderStrip(true); renderPanel(true); header(true);
  }
  setInterval(() => { if (!paused || Date.now() - lastSaved > 60000) saveNow(); }, 60000);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') saveNow(); });
  window.addEventListener('pagehide', saveNow);

  const canvas = $('world');
  const R = new V.Renderer(canvas, sim);
  let speed = 1, paused = false, acc = 0, last = performance.now();
  let tab = 'chron', chronFilter = 'all', selMat = null, follow = false;
  const L = V.LLM;
  const PRESET_NOTE = { cloudflare: 'cf', openrouter: 'or', ollama: 'ol', lmstudio: 'lm' };

  /* ---------- мова ---------- */
  function applyStatic() {
    document.documentElement.lang = V.lang;
    document.title = u('title');
    document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = u(el.dataset.i18n); });
    document.querySelectorAll('[data-i18n-html]').forEach(el => { el.innerHTML = u(el.dataset.i18nHtml); });
    document.querySelectorAll('[data-i18n-aria]').forEach(el => el.setAttribute('aria-label', u(el.dataset.i18nAria)));
    document.querySelectorAll('.lang').forEach(b => b.classList.toggle('on', b.dataset.lang === V.lang));
    $('pause').setAttribute('aria-label', paused ? u('resume') : u('pause'));
    syncLLMForm();
    const note = $('presetNote');
    if (!note.hidden && L.cfg.preset) note.innerHTML = u('note.' + PRESET_NOTE[L.cfg.preset]);
  }
  document.querySelectorAll('.lang').forEach(b => b.addEventListener('click', () => {
    V.setLang(b.dataset.lang); applyStatic(); lastChron = ''; renderStrip(true); renderPanel(true); header(true);
  }));

  /* ---------- керування часом ---------- */
  function setSpeed(s) {
    speed = s; paused = false;
    document.querySelectorAll('.spd').forEach(b => b.classList.toggle('on', +b.dataset.s === s));
    $('pause').classList.remove('on'); $('pause').textContent = '❚❚'; $('pause').setAttribute('aria-label', u('pause'));
  }
  document.querySelectorAll('.spd').forEach(b => b.addEventListener('click', () => setSpeed(+b.dataset.s)));
  $('pause').addEventListener('click', () => {
    paused = !paused; $('pause').classList.toggle('on', paused); $('pause').textContent = paused ? '▶' : '❚❚';
    $('pause').setAttribute('aria-label', paused ? u('resume') : u('pause'));
  });

  document.querySelectorAll('.tab').forEach(b => b.addEventListener('click', () => {
    tab = b.dataset.tab;
    document.querySelectorAll('.tab').forEach(x => x.classList.toggle('on', x === b));
    document.querySelectorAll('.pane').forEach(p => p.classList.toggle('on', p.id === 'pane-' + tab));
    renderPanel(true);
  }));
  document.querySelectorAll('#chronFilter .chip').forEach(b => b.addEventListener('click', () => {
    chronFilter = b.dataset.f;
    document.querySelectorAll('#chronFilter .chip').forEach(x => x.classList.toggle('on', x === b));
    renderPanel(true);
  }));

  /* ---------- вибір мешканця ---------- */
  function findNPC(id) { return sim.npcs.find(x => x.id === id) || sim.dead.find(x => x.id === id); }
  function select(id, openTab = true) {
    R.sel = id;
    if (openTab && tab !== 'people') document.querySelector('.tab[data-tab="people"]').click();
    const n = sim.npcs.find(x => x.id === id);
    if (n && R.zoom > 1) centerOn(n, true);
    renderStrip(true); renderPanel(true);
  }
  function step(dir) {
    const list = sim.npcs.slice().sort((a, b) => a.id - b.id);
    if (!list.length) return;
    let i = list.findIndex(n => n.id === R.sel);
    i = i < 0 ? 0 : (i + dir + list.length) % list.length;
    select(list[i].id);
    const chip = $('strip').querySelector(`[data-id="${list[i].id}"]`);
    if (chip) chip.scrollIntoView({ block: 'nearest', inline: 'center' });
  }
  canvas.addEventListener('click', e => {
    const r = canvas.getBoundingClientRect();
    const n = R.pick(e.clientX - r.left, e.clientY - r.top);
    if (n) select(n.id);
  });
  $('strip').addEventListener('click', e => { const b = e.target.closest('[data-id]'); if (b) select(+b.dataset.id, false); });
  $('people').addEventListener('click', e => { const li = e.target.closest('li[data-id]'); if (li) select(+li.dataset.id); });
  $('chron').addEventListener('click', e => { const w = e.target.closest('[data-npc]'); if (w) select(+w.dataset.npc); });
  $('person').addEventListener('click', e => {
    if (e.target.closest('.close')) { R.sel = null; follow = false; renderStrip(true); renderPanel(true); }
    else if (e.target.closest('.prev')) step(-1);
    else if (e.target.closest('.next')) step(1);
    else if (e.target.closest('.follow')) {
      follow = !follow;
      if (follow && R.zoom === 1) { R.zoom = 2; R.resize(); }
      const n = sim.npcs.find(x => x.id === R.sel); if (n && follow) centerOn(n, true);
      renderPanel(true);
    }
  });
  $('disc').addEventListener('click', e => { const m = e.target.closest('[data-mat]'); if (m) { selMat = selMat === m.dataset.mat ? null : m.dataset.mat; renderPanel(true); } });

  /* ---------- масштаб і камера ---------- */
  function centerOn(n, jump) {
    const wrap = $('canvasWrap');
    const tx = n.x * R.ts - wrap.clientWidth / 2, ty = n.y * R.ts - wrap.clientHeight / 2;
    if (jump) { wrap.scrollLeft = tx; wrap.scrollTop = ty; return; }
    const dx = tx - wrap.scrollLeft, dy = ty - wrap.scrollTop;
    if (Math.abs(dx) > 1 || Math.abs(dy) > 1) { wrap.scrollLeft += dx * 0.12; wrap.scrollTop += dy * 0.12; }
  }
  function setZoom(z) {
    const wrap = $('canvasWrap');
    const cx = (wrap.scrollLeft + wrap.clientWidth / 2) / R.ts, cy = (wrap.scrollTop + wrap.clientHeight / 2) / R.ts;
    R.zoom = Math.max(1, Math.min(4, z)); R.resize();
    if (R.zoom === 1) { follow = false; wrap.scrollLeft = 0; wrap.scrollTop = 0; return; }
    wrap.scrollLeft = cx * R.ts - wrap.clientWidth / 2; wrap.scrollTop = cy * R.ts - wrap.clientHeight / 2;
  }
  $('zoomIn').addEventListener('click', () => {
    const wrap = $('canvasWrap');
    const n = sim.npcs.find(x => x.id === R.sel);
    if (R.zoom === 1) { R.zoom = 2; R.resize(); const c = n || sim.world.camp; wrap.scrollLeft = c.x * R.ts - wrap.clientWidth / 2; wrap.scrollTop = c.y * R.ts - wrap.clientHeight / 2; }
    else setZoom(R.zoom + 1);
  });
  $('zoomOut').addEventListener('click', () => { setZoom(R.zoom - 1); renderPanel(true); });

  $('newWorld').addEventListener('click', () => {
    saveNow();                                                     // поточну цивілізацію зберігаємо
    const entry = newCivEntry();
    for (const id of Object.keys(M)) if (/^g\d+$/.test(id)) delete M[id];   // матеріали попереднього світу
    switchTo(new V.Sim(entry.seed), entry);
    saveNow();
  });
  $('saveNow').addEventListener('click', saveNow);
  $('civName').addEventListener('change', e => { civ.name = e.target.value.trim(); saveIndex(); renderWorlds(); });
  $('civList').addEventListener('click', e => {
    const b = e.target.closest('button[data-act]'); if (!b) return;
    const entry = civs.find(c => c.id === b.dataset.id); if (!entry) return;
    if (b.dataset.act === 'open') {
      saveNow();
      const s = openSaved(entry);
      if (!s) { $('saveStatus').textContent = u('w.failed'); return; }
      switchTo(s, entry);
    } else if (b.dataset.act === 'del') {
      if (delArm !== entry.id) { delArm = entry.id; renderWorlds(); return; }
      store.del('valley.world.' + entry.id); civs = civs.filter(c => c !== entry); saveIndex(); delArm = null;
    }
    renderWorlds();
  });

  let rsz; window.addEventListener('resize', () => { clearTimeout(rsz); rsz = setTimeout(() => R.resize(), 120); });

  /* ---------- LLM-налаштування ---------- */
  function syncLLMForm() {
    $('llmOn').checked = L.cfg.enabled; $('llmProv').value = L.cfg.provider; $('llmUrl').value = L.cfg.url;
    $('llmModel').value = L.cfg.model; $('llmKey').value = L.cfg.apiKey;
    $('llmPlans').checked = L.cfg.plans; $('llmChat').checked = L.cfg.chat;
    document.querySelectorAll('.preset').forEach(b => b.classList.toggle('on', b.dataset.preset === L.cfg.preset));
    $('llmKey').placeholder = L.cfg.provider === 'ollama' ? u('key.ollama') : L.cfg.preset === 'openrouter' ? 'sk-or-…' : L.cfg.preset === 'cloudflare' ? u('key.cf') : u('key.opt');
  }
  document.querySelectorAll('.preset').forEach(b => b.addEventListener('click', () => {
    L.applyPreset(b.dataset.preset);
    L.set('enabled', true);
    syncLLMForm();
    $('presetNote').innerHTML = u('note.' + PRESET_NOTE[b.dataset.preset]); $('presetNote').hidden = false;
    if (b.dataset.preset === 'openrouter' && !L.cfg.apiKey) $('llmKey').focus();
    renderPanel(true);
  }));
  $('llmOn').addEventListener('change', e => { L.set('enabled', e.target.checked); bannerHidden = ''; renderLLMState(); });
  $('llmProv').addEventListener('change', e => {
    L.set('provider', e.target.value); L.set('preset', '');
    document.querySelectorAll('.preset').forEach(b => b.classList.remove('on'));
    if (e.target.value === 'ollama' && /1234/.test($('llmUrl').value)) { $('llmUrl').value = 'http://localhost:11434'; L.set('url', $('llmUrl').value); }
    if (e.target.value === 'openai' && /11434/.test($('llmUrl').value)) { $('llmUrl').value = 'http://localhost:1234/v1'; L.set('url', $('llmUrl').value); }
  });
  $('llmUrl').addEventListener('change', e => L.set('url', e.target.value.trim()));
  $('llmModel').addEventListener('change', e => L.set('model', e.target.value.trim()));
  $('llmKey').addEventListener('change', e => L.set('apiKey', e.target.value.trim()));
  $('llmPlans').addEventListener('change', e => L.set('plans', e.target.checked));
  $('llmChat').addEventListener('change', e => L.set('chat', e.target.checked));
  $('llmTest').addEventListener('click', async () => {
    const r = await L.test();
    if (r.ok) $('llmModels').innerHTML = r.models.map(m => `<option value="${esc(m)}">`).join('');
    if (r.ok && !r.skipCheck && r.models.length && !r.models.includes(L.cfg.model)) L.state.status = ['st.missing', { model: L.cfg.model, list: r.models.slice(0, 4).join(', ') }];
    renderPanel(true);
  });

  /* ---------- стан LLM: індикатор, банер, пауза ---------- */
  let bannerHidden = '';
  function renderLLMState() {
    const mode = L.mode();
    const chip = $('llmChip');
    chip.dataset.mode = mode;
    $('llmChipText').textContent = u('chip.' + mode);
    chip.title = mode === 'limit' ? V.T('st.limit', { until: L.state.until }) : '';
    $('llmPause').hidden = !L.cfg.enabled;
    $('llmPause').textContent = L.cfg.paused ? u('llm.resumeBtn') : u('llm.pauseBtn');
    const show = (mode === 'down' || mode === 'limit') && bannerHidden !== mode;
    $('llmBanner').hidden = !show;
    if (show) {
      $('llmBannerText').textContent = mode === 'limit' ? V.T('log.llmLimit', { until: L.state.until }) : V.T('log.llmDown');
      $('llmBannerPause').textContent = u('llm.pauseBtn');
    }
  }
  function togglePauseLLM() { L.setPaused(!L.cfg.paused); renderLLMState(); renderPanel(true); }
  $('llmChip').addEventListener('click', () => {
    if (!L.cfg.enabled) { document.querySelector('.tab[data-tab="brain"]').click(); return; }
    togglePauseLLM();
  });
  $('llmPause').addEventListener('click', togglePauseLLM);
  $('llmBannerPause').addEventListener('click', () => { L.setPaused(true); renderLLMState(); });
  $('llmBannerClose').addEventListener('click', () => { bannerHidden = L.mode(); renderLLMState(); });
  // події моделі потрапляють у хроніку поточної цивілізації
  L.onChange = kind => {
    const key = { down: 'log.llmDown', limit: 'log.llmLimit', up: 'log.llmUp', paused: 'log.llmPaused', resumed: 'log.llmResumed' }[kind];
    if (key) sim.log(V.msg(key, kind === 'limit' ? { until: L.state.until } : {}), 'system');
    if (kind === 'up' || kind === 'resumed') bannerHidden = '';
    renderLLMState(); lastChron = ''; renderPanel(true);
  };

  /* ---------- головний цикл ---------- */
  function frame(now) {
    const dt = Math.min(0.25, (now - last) / 1000); last = now;
    if (!paused) {
      acc += dt * 10 * speed;
      let steps = 0;
      const t0 = performance.now();
      while (acc >= 1 && steps < 2000) { sim.step(); acc -= 1; steps++; if (steps % 50 === 0 && performance.now() - t0 > 28) { acc = 0; break; } }
    }
    if (follow && R.zoom > 1) { const n = sim.npcs.find(x => x.id === R.sel); if (n) centerOn(n, false); else follow = false; }
    R.draw(now);
    header(false);
    requestAnimationFrame(frame);
  }

  let lastHeader = 0;
  function header(force) {
    const now = performance.now();
    if (!force && now - lastHeader < 200) return;
    lastHeader = now;
    $('era').textContent = V.eraName(sim.era);
    $('day').textContent = u('day') + ' ' + sim.day() + (sim.isNight() ? ' · ' + u('night') : '');
    $('sun').style.setProperty('--p', (sim.phase() * 100).toFixed(1) + '%');
    const insp = sim.npcs.reduce((s, n) => s + n.insp, 0);
    const animals = sim.animals.filter(a => a.alive);
    const cnt = t => animals.filter(a => a.type === t).length;
    $('stats').innerHTML =
      `<span><b>${sim.npcs.length}</b>${u('stat.pop')}</span>` +
      `<span><b>${sim.foodStock()}</b>${u('stat.food')}</span>` +
      `<span><b>${sim.worldKnown.size}</b>${u('stat.mats')}</span>` +
      `<span><b>${Object.keys(sim.devices).length}</b>${u('stat.inv')}</span>` +
      `<span><b>${sim.attempts}</b>${u('stat.exp')}</span>` +
      `<span><b>${Math.round(insp)}</b>${u('stat.insp')}</span>` +
      `<span><b>${cnt('rabbit')}</b>${u('stat.rab')} · <b>${cnt('deer')}</b>${u('stat.deer')} · <b>${cnt('wolf')}</b>${u('stat.wolf')}</span>`;
    renderStrip(false);
    renderLLMState();
    renderPanel(false);
  }

  /* ---------- стрічка мешканців ---------- */
  let lastStrip = 0;
  function renderStrip(force) {
    const now = performance.now();
    if (!force && now - lastStrip < 700) return;
    lastStrip = now;
    const list = sim.npcs.slice().sort((a, b) => a.id - b.id);
    $('strip').innerHTML = list.map(n => {
      const act = n.task ? V.act(n.task.type) : '';
      const child = n.ageTicks < sim.DAY * 2;
      const sel = n.id === R.sel;
      return `<button class="who-chip${sel ? ' on' : ''}" data-id="${n.id}" role="option" aria-selected="${sel}">` +
        `<span class="dot${child ? ' small' : ''}" style="background:${n.color}"></span>` +
        `<span class="wn">${esc(V.nn(n.name))}</span><span class="wa">${esc(act)}</span></button>`;
    }).join('');
  }

  /* ---------- панелі ---------- */
  let lastPanel = 0, lastChron = '';
  function renderPanel(force) {
    const now = performance.now();
    if (!force && now - lastPanel < 500) return;
    lastPanel = now;
    if (tab === 'chron') renderChron(force);
    else if (tab === 'people') renderPeople();
    else if (tab === 'disc') renderDisc();
    else if (tab === 'worlds') renderWorlds();
    else renderBrain();
  }

  function npcName(id) { const n = findNPC(id); return n ? V.nn(n.name) : ''; }

  function renderChron(force) {
    const lastE = sim.chronicle[sim.chronicle.length - 1];
    const key = sim.chronicle.length + ':' + (lastE ? lastE.t : 0) + chronFilter + V.lang;
    if (!force && key === lastChron) return;
    lastChron = key;
    const want = c => chronFilter === 'all' ? true
      : chronFilter === 'discovery' ? ['discovery', 'improve', 'era'].includes(c.kind)
        : chronFilter === 'life' ? ['life', 'birth', 'death', 'help', 'find', 'nature'].includes(c.kind)
        : chronFilter === 'together' ? c.kind === 'together' || (c.kind === 'talk')
          : chronFilter === 'idea' ? ['idea', 'hint', 'try'].includes(c.kind)
            : c.kind === chronFilter;
    const items = sim.chronicle.filter(want).slice(-160).reverse();
    $('chron').innerHTML = items.map(c => {
      let t = esc(V.R(c.msg));
      const nm = c.npc ? npcName(c.npc) : '';
      if (nm) t = t.replace(esc(nm), `<span class="who" data-npc="${c.npc}">${esc(nm)}</span>`);
      return `<li class="${c.kind}"><span class="d">${u('dayShort')}${c.day}</span><span class="t">${t}</span></li>`;
    }).join('') || `<li><span></span><span class="muted">${u('quiet')}</span></li>`;
  }

  const meter = (label, v, cls = '', shown) => `<span>${label}</span><span class="meter ${cls}"><i style="width:${Math.max(0, Math.min(100, v)).toFixed(0)}%"></i></span><span class="v">${shown !== undefined ? shown : Math.round(v)}</span>`;

  function renderPeople() {
    const n = findNPC(R.sel);
    if (n) {
      const alive = sim.npcs.includes(n);
      const act = n.task ? V.act(n.task.type) : '—';
      const valMax = Math.max(...Object.values(n.val), 1);
      const vals = Object.entries(n.val).sort((a, b) => b[1] - a[1]).map(([k, v]) => meter(V.act(k), v / valMax * 100, 'gold', v.toFixed(1))).join('');
      const designs = [...n.know].filter(k => k.startsWith('d:')).map(k => `<span class="tag d">${esc(V.ideaName(k.slice(2)))}</span>`).join('');
      const ideas = [...n.know].filter(k => k.startsWith('i:') && !n.know.has('d:' + k.slice(2))).map(k => `<span class="tag i">${esc(V.ideaName(k.slice(2)))}</span>`).join('');
      const mats = [...n.know].filter(k => k.startsWith('m:')).length;
      const laws = [...n.know].filter(k => k.startsWith('l:')).length;
      const friends = Object.entries(n.friends).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([id]) => npcName(+id)).filter(Boolean).join(', ');
      const age = n.ageTicks < sim.DAY * 2 ? u('child') : u('adult');
      const lr = n.lastReward && sim.tick - n.lastReward.t < sim.DAY ? `<div class="reward">+${n.lastReward.amt.toFixed(1)} — ${esc(V.T('rw.' + n.lastReward.why))}</div>` : '';
      const invs = n.inventions.map(id => `<span class="tag d">${esc(V.ideaName(id))}</span>`).join('');
      $('person').innerHTML = `<div class="person">
        <div class="head">
          <span class="dot" style="background:${n.color}"></span><span class="nm">${esc(V.nn(n.name))}</span>
          <span class="muted">${alive ? age + ' · ' + esc(act) : u('deceased')}</span>
          <span class="nav">
            <button class="iconbtn prev" aria-label="${u('prev')}">‹</button>
            <button class="iconbtn next" aria-label="${u('next')}">›</button>
            <button class="iconbtn close" aria-label="${u('close')}">✕</button>
          </span>
        </div>
        ${alive ? `<button class="follow${follow ? ' on' : ''}" aria-pressed="${follow}">◎ ${u('follow')}</button>` : ''}
        <div class="thought ${n.thoughtLLM ? 'llm' : ''}">${esc(V.R(n.thought))}</div>
        ${n.lastLine ? `<div class="muted" style="font-size:12px;margin-bottom:8px">${u('lastLine')}: ${u('q1')}${esc(V.R(n.lastLine))}${u('q2')}</div>` : ''}
        <div class="meters">
          ${meter(u('sat'), 100 - n.hunger, n.hunger > 70 ? 'warn' : '')}
          ${meter(u('energy'), n.energy, n.energy < 20 ? 'warn' : '')}
          ${meter(u('social'), 100 - n.social)}
          ${meter(u('health'), n.health, n.health < 50 ? 'warn' : '')}
        </div>
        <h3>${u('insp')}: ${Math.round(n.insp)}</h3>${lr}
        <p class="muted" style="font-size:12px;margin:4px 0 6px">${u('brainLearned')}</p>
        <div class="meters">${vals}</div>
        <h3>${u('knowledge')}</h3>
        <p style="margin:0 0 6px;font-size:13px">${mats} ${u('matsN')} · ${laws} ${u('lawsN')} · ${u('craft')} ${n.skill.craft.toFixed(1)} · ${u('teachSk')} ${n.skill.teach.toFixed(1)}</p>
        <div class="tags">${designs}${ideas}</div>
        ${invs ? `<h3>${u('invented')}</h3><div class="tags">${invs}</div>` : ''}
        ${friends ? `<h3>${u('friends')}</h3><p style="margin:0;font-size:13px">${esc(friends)}</p>` : ''}
        <h3>${u('history')}</h3><ul class="hist">${n.history.slice(0, 8).map(h => `<li>${u('day')} ${h.day}: ${esc(V.R(h.msg))}</li>`).join('') || `<li>${u('nothingYet')}</li>`}</ul>
      </div>`;
    } else $('person').innerHTML = '';
    const list = sim.npcs.slice().sort((a, b) => b.insp - a.insp);
    $('people').innerHTML = list.map(m => {
      const act = m.task ? V.act(m.task.type) : '';
      return `<li data-id="${m.id}" class="${m.id === R.sel ? 'sel' : ''}"><span class="dot" style="background:${m.color}"></span>
        <span><span class="nm">${esc(V.nn(m.name))}${m.ageTicks < sim.DAY * 2 ? ' · ' + u('child') : ''}</span><span class="act">${esc(act)} — ${esc(V.R(m.thought))}</span></span>
        <span class="score">${Math.round(m.insp)}<small>${m.know.size} ${u('knowN')}</small></span></li>`;
    }).join('');
  }

  function renderDisc() {
    const ei = V.ERA_KEYS.indexOf(sim.era);
    let h = `<div class="timeline">${V.ERA_KEYS.map((e, i) => `<span class="${i <= ei ? 'on' : ''}">${esc(V.eraShort(e))}</span>`).join('')}</div>`;
    const devs = Object.values(sim.devices);
    h += `<h2>${u('inventions')} (${devs.length})</h2>`;
    h += devs.length ? devs.map(d => {
      const I = V.IDEAS[d.idea];
      const parts = d.parts.map((id, i) => `${V.slotName(I.slots[i])}: ${V.mn(id)}`).join(', ');
      const v = d.extra && d.extra.volts ? ` · ${d.extra.volts.toFixed(2)} ${V.lang === 'de' ? 'V' : 'В'}` : '';
      return `<div class="dev"><div class="top"><b>${esc(V.devName(d))}</b><span class="q">${u('quality')} ${d.quality}${v}</span><span class="muted">${u('day')} ${d.day} · ${esc(npcName(d.inventor))}</span></div><div class="how">${esc(parts)} → ${esc(V.ideaEffect(d.idea))}</div></div>`;
    }).join('') : `<p class="muted">${u('noInv')}</p>`;
    const known = [...sim.worldKnown].map(id => M[id]).filter(Boolean);
    const derived = known.filter(m => !V.BASE_RESOURCES.includes(m.id) && !['meat', 'fish', 'hide', 'bone'].includes(m.id));
    h += `<h2 style="margin-top:16px">${u('materials')} (${known.length})</h2><p class="muted" style="font-size:12px;margin:0 0 8px">${u('matHint')}</p>`;
    if (selMat && M[selMat]) {
      const m = M[selMat], desc = V.matDesc(m);
      h += `<div class="matinfo"><b>${esc(V.mn(m.id))}</b>${m.inventor ? (m.real ? ` <span class="tag i">${u('realMat')}</span>` : ` <span class="tag">${u('inventedHere')}</span>`) : ''}<br>${esc(V.propLine(m))}${desc ? '<br><span class="muted">' + esc(desc) + '</span>' : ''}${m.usefulFor && m.usefulFor.length ? `<br>${u('bestFor')}: ${esc(m.usefulFor.map(V.slotName).join(', '))}` : ''}${m.inventor ? `<br><span class="muted">${u('created')}: ${u('day')} ${m.day}, ${esc(npcName(m.inventor))}</span>` : ''}</div>`;
    }
    const card = m => `<button class="mat ${m.inventor ? 'new' : ''} ${m.real ? 'real' : ''}" data-mat="${m.id}"><span class="sw" style="background:${m.color}"></span>${esc(V.mn(m.id))}<span class="k">${V.kindName(m.alloy ? 'alloy' : m.kind)}${m.inventor ? ' · ' + (m.real ? u('realTag') : u('newTag')) : ''}</span></button>`;
    h += `<h3>${u('derived')}</h3><div class="mats">${derived.map(card).join('') || `<span class="muted">${u('noneYet')}</span>`}</div>`;
    h += `<h3>${u('natural')}</h3><div class="mats">${known.filter(m => !derived.includes(m)).map(card).join('')}</div>`;
    const recent = sim.discoveries.slice(-12).reverse();
    if (recent.length) h += `<h3>${u('recent')}</h3>` + recent.map(d => {
      let name, how, why = '';
      if (d.kind === 'material') {
        name = V.mn(d.id);
        how = d.comp ? V.describeComp(d.comp) : V.R(d.how);
        why = d.law ? V.lawWhy(d.law) : V.matDesc(M[d.id]);
      } else {
        name = V.devName(d.dev);
        how = d.parts.map(([s, m]) => `${V.slotName(s)}: ${V.mn(m)}`).join(', ');
        why = d.kind === 'device' ? V.ideaEffect(d.id) : `${u('quality')} ${d.quality}`;
      }
      return `<div class="dev"><div class="top"><b>${esc(name)}</b><span class="muted">${u('day')} ${d.day} · ${esc(npcName(d.by))}</span></div><div class="how">${esc(how)}${why ? ' — ' + esc(why) : ''}</div></div>`;
    }).join('');
    $('disc').innerHTML = h;
  }

  function renderWorlds() {
    if (document.activeElement !== $('civName')) $('civName').value = civ.name || '';
    $('civName').placeholder = civName(civ);
    $('civInfo').textContent = `${u('day')} ${sim.day()} · ${V.eraName(sim.era)} · ${sim.npcs.length} ${u('w.pop')} · ${u('worldNo')}${sim.seed}`;
    $('saveStatus').textContent = saveError ? u('w.full') : lastSaved ? `${u('w.savedAt')}: ${new Date(lastSaved).toLocaleTimeString(V.lang === 'de' ? 'de-DE' : 'uk-UA', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}` : '';
    const list = civs.slice().sort((a, b) => (b.updated || 0) - (a.updated || 0));
    $('civList').innerHTML = list.map(c => {
      const on = c.id === civ.id;
      const info = c.day ? `${u('day')} ${c.day} · ${V.eraName(c.era)} · ${c.pop} ${u('w.pop')}${c.updated ? ' · ' + new Date(c.updated).toLocaleString(V.lang === 'de' ? 'de-DE' : 'uk-UA', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : ''}` : '';
      return `<li class="${on ? 'on' : ''}"><span class="cn">${esc(civName(c))}</span>
        <span class="ci">${on ? u('w.active') + (info ? ' · ' : '') : ''}${esc(info)}</span>
        <span class="ca">${on ? '' : `<button class="btn small" data-act="open" data-id="${c.id}">${u('w.open')}</button>
          <button class="btn small ${delArm === c.id ? 'danger' : 'ghost'}" data-act="del" data-id="${c.id}">${delArm === c.id ? u('w.confirm') : u('w.del')}</button>`}</span></li>`;
    }).join('');
  }

  function renderBrain() {
    $('llmStatus').textContent = (L.cfg.enabled ? V.R(L.state.status) : u('llm.off')) + (L.state.ok ? ` · ${u('llm.answers')}: ${L.state.ok}` : '');
    $('llmLog').innerHTML = L.state.log.slice(0, 10).map(e => `<li class="${e.ok ? '' : 'bad'}"><b>${esc(V.nn(e.who))}</b>: ${esc(e.text || u('llm.noThought'))}${e.ok ? '' : ` <span class="muted">— ${u('llm.bad')}</span>`}</li>`).join('');
  }

  setSpeed(1);
  applyStatic();
  renderStrip(true);
  renderPanel(true);
  header(true);
  requestAnimationFrame(frame);
  V.ui = { get sim() { return sim; } };
})(window.V = window.V || {});
