/* ============================================================
   Інтерфейс спостерігача
   ============================================================ */
(function (V) {
  'use strict';
  const $ = id => document.getElementById(id);
  const M = V.MATERIALS;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  let seed = Math.floor(Math.random() * 1e6);
  let sim = new V.Sim(seed);
  const canvas = $('world');
  const R = new V.Renderer(canvas, sim);
  let speed = 1, paused = false, acc = 0, last = performance.now();
  let tab = 'chron', chronFilter = 'all', selMat = null;

  /* ---------- керування ---------- */
  function setSpeed(s) {
    speed = s; paused = false;
    document.querySelectorAll('.spd').forEach(b => b.classList.toggle('on', +b.dataset.s === s));
    $('pause').classList.remove('on'); $('pause').textContent = '❚❚';
  }
  document.querySelectorAll('.spd').forEach(b => b.addEventListener('click', () => setSpeed(+b.dataset.s)));
  $('pause').addEventListener('click', () => {
    paused = !paused; $('pause').classList.toggle('on', paused); $('pause').textContent = paused ? '▶' : '❚❚';
    $('pause').setAttribute('aria-label', paused ? 'Продовжити' : 'Пауза');
  });
  setSpeed(1);

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

  function select(id) {
    R.sel = id;
    if (tab !== 'people') document.querySelector('.tab[data-tab="people"]').click();
    renderPanel(true);
  }
  canvas.addEventListener('click', e => {
    const r = canvas.getBoundingClientRect();
    const n = R.pick(e.clientX - r.left, e.clientY - r.top);
    if (n) select(n.id);
  });
  $('people').addEventListener('click', e => { const li = e.target.closest('li[data-id]'); if (li) select(+li.dataset.id); });
  $('chron').addEventListener('click', e => { const w = e.target.closest('[data-npc]'); if (w) select(+w.dataset.npc); });
  $('person').addEventListener('click', e => { if (e.target.closest('.close')) { R.sel = null; renderPanel(true); } });
  $('disc').addEventListener('click', e => { const m = e.target.closest('[data-mat]'); if (m) { selMat = selMat === m.dataset.mat ? null : m.dataset.mat; renderPanel(true); } });

  $('newWorld').addEventListener('click', () => {
    seed = Math.floor(Math.random() * 1e6);
    // прибрати згенеровані матеріали попереднього світу
    for (const id of Object.keys(M)) if (/^g\d+$/.test(id)) delete M[id];
    sim = new V.Sim(seed); R.setSim(sim); R.sel = null; selMat = null;
    renderPanel(true);
  });

  function setZoom(z) {
    const wrap = $('canvasWrap');
    const cx = (wrap.scrollLeft + wrap.clientWidth / 2) / (R.ts || 1), cy = (wrap.scrollTop + wrap.clientHeight / 2) / (R.ts || 1);
    R.zoom = Math.max(1, Math.min(4, z)); R.resize();
    wrap.scrollLeft = R.zoom === 1 ? 0 : cx * R.ts - wrap.clientWidth / 2;
    wrap.scrollTop = R.zoom === 1 ? 0 : cy * R.ts - wrap.clientHeight / 2;
  }
  $('zoomIn').addEventListener('click', () => {
    const wrap = $('canvasWrap');
    if (R.zoom === 1) { R.zoom = 2; R.resize(); wrap.scrollLeft = sim.world.camp.x * R.ts - wrap.clientWidth / 2; wrap.scrollTop = sim.world.camp.y * R.ts - wrap.clientHeight / 2; }
    else setZoom(R.zoom + 1);
  });
  $('zoomOut').addEventListener('click', () => setZoom(R.zoom - 1));

  let rsz; window.addEventListener('resize', () => { clearTimeout(rsz); rsz = setTimeout(() => R.resize(), 120); });

  /* ---------- LLM-налаштування ---------- */
  const L = V.LLM;
  function syncLLMForm() {
    $('llmOn').checked = L.cfg.enabled; $('llmProv').value = L.cfg.provider; $('llmUrl').value = L.cfg.url;
    $('llmModel').value = L.cfg.model; $('llmKey').value = L.cfg.apiKey;
    document.querySelectorAll('.preset').forEach(b => b.classList.toggle('on', b.dataset.preset === L.cfg.preset));
    $('llmKey').placeholder = L.cfg.provider === 'ollama' ? 'не потрібен для Ollama' : L.cfg.preset === 'openrouter' ? 'sk-or-…' : 'якщо сервер його вимагає';
  }
  document.querySelectorAll('.preset').forEach(b => b.addEventListener('click', () => {
    const p = L.applyPreset(b.dataset.preset);
    L.set('enabled', true);
    syncLLMForm();
    $('presetNote').innerHTML = p.note; $('presetNote').hidden = false;
    if (b.dataset.preset === 'openrouter' && !L.cfg.apiKey) $('llmKey').focus();
    renderPanel(true);
  }));
  $('llmOn').checked = L.cfg.enabled; $('llmProv').value = L.cfg.provider; $('llmUrl').value = L.cfg.url;
  $('llmModel').value = L.cfg.model; $('llmKey').value = L.cfg.apiKey; $('llmPlans').checked = L.cfg.plans; $('llmChat').checked = L.cfg.chat;
  syncLLMForm();
  $('llmOn').addEventListener('change', e => L.set('enabled', e.target.checked));
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
    if (r.ok && !r.skipCheck && r.models.length && !r.models.includes(L.cfg.model)) L.state.status += ` · моделі «${L.cfg.model}» немає, доступні: ${r.models.slice(0, 4).join(', ')}`;
    renderPanel(true);
  });

  /* ---------- головний цикл ---------- */
  function frame(now) {
    const dt = Math.min(0.25, (now - last) / 1000); last = now;
    if (!paused) {
      acc += dt * 10 * speed;
      let steps = 0;
      const t0 = performance.now();
      while (acc >= 1 && steps < 2000) { sim.step(); acc -= 1; steps++; if (steps % 50 === 0 && performance.now() - t0 > 28) { acc = 0; break; } }
    }
    R.draw(now);
    header();
    requestAnimationFrame(frame);
  }

  let lastHeader = 0;
  function header() {
    const now = performance.now();
    if (now - lastHeader < 200) return;
    lastHeader = now;
    $('era').textContent = sim.era;
    $('day').textContent = 'День ' + sim.day() + (sim.isNight() ? ' · ніч' : '');
    $('sun').style.setProperty('--p', (sim.phase() * 100).toFixed(1) + '%');
    const insp = sim.npcs.reduce((s, n) => s + n.insp, 0);
    const animals = sim.animals.filter(a => a.alive);
    const cnt = t => animals.filter(a => a.type === t).length;
    $('stats').innerHTML =
      `<span><b>${sim.npcs.length}</b>мешканців</span>` +
      `<span><b>${sim.foodStock()}</b>їжі в запасі</span>` +
      `<span><b>${sim.worldKnown.size}</b>відомих матеріалів</span>` +
      `<span><b>${Object.keys(sim.devices).length}</b>винаходів</span>` +
      `<span><b>${sim.attempts}</b>дослідів</span>` +
      `<span><b>${Math.round(insp)}</b>натхнення</span>` +
      `<span><b>${cnt('rabbit')}</b>кролів · <b>${cnt('deer')}</b>оленів · <b>${cnt('wolf')}</b>вовків</span>`;
    renderPanel(false);
  }

  /* ---------- панелі ---------- */
  let lastPanel = 0, lastChronLen = -1;
  function renderPanel(force) {
    const now = performance.now();
    if (!force && now - lastPanel < 500) return;
    lastPanel = now;
    if (tab === 'chron') renderChron(force);
    else if (tab === 'people') renderPeople();
    else if (tab === 'disc') renderDisc();
    else renderBrain();
  }

  function npcName(id) { const n = sim.npcs.find(x => x.id === id) || sim.dead.find(x => x.id === id); return n ? n.name : ''; }

  function renderChron(force) {
    const key = sim.chronicle.length + ':' + (sim.chronicle.length ? sim.chronicle[sim.chronicle.length - 1].t : 0) + chronFilter;
    if (!force && key === lastChronLen) return;
    lastChronLen = key;
    const want = c => chronFilter === 'all' ? true : chronFilter === 'discovery' ? (c.kind === 'discovery' || c.kind === 'improve' || c.kind === 'era') : chronFilter === 'life' ? ['life', 'birth', 'death', 'help', 'find'].includes(c.kind) : chronFilter === 'idea' ? (c.kind === 'idea' || c.kind === 'hint' || c.kind === 'try') : c.kind === chronFilter;
    const items = sim.chronicle.filter(want).slice(-160).reverse();
    $('chron').innerHTML = items.map(c => {
      let t = esc(c.text);
      const nm = c.npc ? npcName(c.npc) : '';
      if (nm) t = t.replace(esc(nm), `<span class="who" data-npc="${c.npc}">${esc(nm)}</span>`);
      return `<li class="${c.kind}"><span class="d">Д${c.day}</span><span class="t">${t}</span></li>`;
    }).join('') || '<li><span></span><span class="muted">Поки тихо.</span></li>';
  }

  const meter = (label, v, cls = '') => `<span>${label}</span><span class="meter ${cls}"><i style="width:${Math.max(0, Math.min(100, v)).toFixed(0)}%"></i></span><span class="v">${Math.round(v)}</span>`;

  function renderPeople() {
    const sel = sim.npcs.find(n => n.id === R.sel) || sim.dead.find(n => n.id === R.sel);
    if (sel) {
      const n = sel, alive = sim.npcs.includes(n);
      const act = n.task ? V.ACT_NAMES[n.task.type] || n.task.type : '—';
      const valMax = Math.max(...Object.values(n.val), 1);
      const vals = Object.entries(n.val).sort((a, b) => b[1] - a[1]).map(([k, v]) => meter(V.ACT_NAMES[k], v / valMax * 100, 'gold').replace(/<span class="v">[^<]*<\/span>/, `<span class="v">${v.toFixed(1)}</span>`)).join('');
      const designs = [...n.know].filter(k => k.startsWith('d:')).map(k => `<span class="tag d">${esc(V.IDEAS[k.slice(2)].name)}</span>`).join('');
      const ideas = [...n.know].filter(k => k.startsWith('i:') && !n.know.has('d:' + k.slice(2))).map(k => `<span class="tag i">${esc(V.IDEAS[k.slice(2)].name)}</span>`).join('');
      const mats = [...n.know].filter(k => k.startsWith('m:')).length;
      const laws = [...n.know].filter(k => k.startsWith('l:')).length;
      const friends = Object.entries(n.friends).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([id]) => npcName(+id)).filter(Boolean).join(', ');
      const age = n.ageTicks < sim.DAY * 2 ? 'дитина' : 'дорослий';
      const lr = n.lastReward && sim.tick - n.lastReward.t < sim.DAY ? `<div class="reward">+${n.lastReward.amt.toFixed(1)} натхнення — ${esc(n.lastReward.why)}</div>` : '';
      $('person').innerHTML = `<div class="person">
        <div class="head"><span class="dot" style="background:${n.color}"></span><span class="nm">${esc(n.name)}</span><span class="muted">${alive ? age + ' · ' + act : 'помер(ла)'}</span><button class="close" aria-label="Закрити">✕</button></div>
        <div class="thought ${n.llmNote && n.thought === n.llmNote ? 'llm' : ''}">${esc(n.thought)}</div>
        ${n.lastLine ? `<div class="muted" style="font-size:12px;margin-bottom:8px">Остання репліка: «${esc(n.lastLine)}»</div>` : ''}
        <div class="meters">
          ${meter('Ситість', 100 - n.hunger, n.hunger > 70 ? 'warn' : '')}
          ${meter('Енергія', n.energy, n.energy < 20 ? 'warn' : '')}
          ${meter('Спілкування', 100 - n.social)}
          ${meter('Здоров\'я', n.health, n.health < 50 ? 'warn' : '')}
        </div>
        <h3>Натхнення: ${Math.round(n.insp)}</h3>${lr}
        <p class="muted" style="font-size:12px;margin:4px 0 6px">Чого навчився мозок: очікуване натхнення від кожного заняття.</p>
        <div class="meters">${vals}</div>
        <h3>Знання</h3>
        <p style="margin:0 0 6px;font-size:13px">${mats} матеріалів · ${laws} законів природи · ремесло ${n.skill.craft.toFixed(1)} · навчання ${n.skill.teach.toFixed(1)}</p>
        <div class="tags">${designs}${ideas}</div>
        ${n.inventions.length ? `<h3>Винайшов(ла)</h3><div class="tags">${n.inventions.map(x => `<span class="tag d">${esc(x)}</span>`).join('')}</div>` : ''}
        ${friends ? `<h3>Друзі</h3><p style="margin:0;font-size:13px">${esc(friends)}</p>` : ''}
        <h3>Історія</h3><ul class="hist">${n.history.slice(0, 8).map(h => `<li>${esc(h)}</li>`).join('') || '<li>Поки нічого особливого.</li>'}</ul>
      </div>`;
    } else $('person').innerHTML = '';
    const list = sim.npcs.slice().sort((a, b) => b.insp - a.insp);
    $('people').innerHTML = list.map(n => {
      const act = n.task ? V.ACT_NAMES[n.task.type] || '' : '';
      return `<li data-id="${n.id}" class="${n.id === R.sel ? 'sel' : ''}"><span class="dot" style="background:${n.color}"></span>
        <span><span class="nm">${esc(n.name)}${n.ageTicks < sim.DAY * 2 ? ' · дитина' : ''}</span><span class="act">${esc(act)} — ${esc(n.thought)}</span></span>
        <span class="score">${Math.round(n.insp)}<small>${n.know.size} знань</small></span></li>`;
    }).join('');
  }

  const ERAS = ['Кам\'яна доба', 'Доба кераміки', 'Мідна доба', 'Бронзова доба', 'Залізна доба', 'Доба скла й заліза', 'Електрична доба'];
  function renderDisc() {
    const ei = ERAS.indexOf(sim.era);
    let h = `<div class="timeline">${ERAS.map((e, i) => `<span class="${i <= ei ? 'on' : ''}">${esc(e.replace(' доба', '').replace('Доба ', ''))}</span>`).join('')}</div>`;
    const devs = Object.values(sim.devices);
    h += `<h2>Винаходи (${devs.length})</h2>`;
    h += devs.length ? devs.map(d => {
      const I = V.IDEAS[d.idea];
      const parts = d.parts.map((id, i) => `${V.SLOT[I.slots[i]].name}: ${M[id].name}`).join(', ');
      const v = d.extra && d.extra.volts ? ` · ${d.extra.volts.toFixed(2)} В` : '';
      return `<div class="dev"><div class="top"><b>${esc(d.name)}</b><span class="q">якість ${d.quality}${v}</span><span class="muted">День ${d.day} · ${esc(npcName(d.inventor))}</span></div><div class="how">${esc(parts)} → ${esc(I.effect)}</div></div>`;
    }).join('') : '<p class="muted">Ще нічого. Поселенці лише починають пробувати.</p>';
    const known = [...sim.worldKnown].map(id => M[id]).filter(Boolean);
    const derived = known.filter(m => !V.BASE_RESOURCES.includes(m.id) && !['meat', 'fish', 'hide', 'bone'].includes(m.id));
    h += `<h2 style="margin-top:16px">Матеріали (${known.length})</h2><p class="muted" style="font-size:12px;margin:0 0 8px">Торкніться матеріалу, щоб побачити властивості. Помаранчева рамка — створений поселенцями.</p>`;
    if (selMat && M[selMat]) {
      const m = M[selMat];
      h += `<div class="matinfo"><b>${esc(m.name)}</b>${m.real === false ? ' <span class="tag">вигаданий у долині</span>' : m.real ? ' <span class="tag i">справжній матеріал</span>' : ''}<br>${esc(V.propLine(m))}${m.desc ? '<br><span class="muted">' + esc(m.desc) + '</span>' : ''}${m.usefulFor && m.usefulFor.length ? `<br>Найкращий для: ${esc(m.usefulFor.join(', '))}` : ''}${m.inventor ? `<br><span class="muted">Створено: день ${m.day}, ${esc(npcName(m.inventor))}</span>` : ''}</div>`;
    }
    const kindName = { organic: 'органіка', mineral: 'мінерал', ore: 'руда', fuel: 'паливо', food: 'їжа', liquid: 'рідина', ceramic: 'кераміка', metal: 'метал', composite: 'композит' };
    const card = m => `<button class="mat ${m.inventor ? 'new' : ''} ${m.real ? 'real' : ''}" data-mat="${m.id}"><span class="sw" style="background:${m.color}"></span>${esc(m.name)}<span class="k">${m.alloy ? 'сплав' : kindName[m.kind] || m.kind}${m.inventor ? (m.real ? ' · справжній' : ' · новий') : ''}</span></button>`;
    h += `<h3>Отримані</h3><div class="mats">${derived.map(card).join('') || '<span class="muted">поки немає</span>'}</div>`;
    h += `<h3>Природні</h3><div class="mats">${known.filter(m => !derived.includes(m)).map(card).join('')}</div>`;
    const recent = sim.discoveries.slice(-12).reverse();
    if (recent.length) h += `<h3>Останні відкриття</h3>` + recent.map(d => `<div class="dev"><div class="top"><b>${esc(d.name)}</b><span class="muted">День ${d.day} · ${esc(npcName(d.by))}</span></div><div class="how">${esc(d.how)}${d.why ? ' — ' + esc(d.why) : ''}</div></div>`).join('');
    $('disc').innerHTML = h;
  }

  function renderBrain() {
    $('llmStatus').textContent = (L.cfg.enabled ? '' : 'вимкнено · ') + L.state.status + (L.state.ok ? ` · відповідей: ${L.state.ok}` : '');
    $('llmLog').innerHTML = L.state.log.slice(0, 10).map(e => `<li class="${e.ok ? '' : 'bad'}"><b>${esc(e.who)}</b>: ${esc(e.text || '(без думки)')}${e.ok ? '' : ' <span class="muted">— відповідь не підійшла, вирішили правила</span>'}</li>`).join('');
    $('seedLbl').textContent = 'Світ №' + sim.seed;
  }

  renderPanel(true);
  requestAnimationFrame(frame);
  V.ui = { get sim() { return sim; } };
})(window.V = window.V || {});
