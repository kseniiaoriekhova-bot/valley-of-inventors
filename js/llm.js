/* ============================================================
   LLM-мозок (необов'язковий)
   Підтримує Ollama та будь-який OpenAI-сумісний сервер
   (LM Studio, llama.cpp server, vLLM, Groq, OpenRouter…).
   LLM лише ПРОПОНУЄ експеримент — рушій фізики перевіряє,
   чи він справді працює, і нараховує натхнення.
   ============================================================ */
(function (V) {
  'use strict';
  const M = V.MATERIALS;

  const DEFAULTS = { enabled: false, provider: 'ollama', url: 'http://localhost:11434', model: 'qwen2.5:3b', apiKey: '', plans: true, chat: true, cooldown: 1.5 };
  let cfg = Object.assign({}, DEFAULTS);
  try { const s = JSON.parse(localStorage.getItem('valley.llm') || 'null'); if (s) cfg = Object.assign(cfg, s); } catch (e) { /* без сховища */ }

  const state = { busy: false, last: 0, ok: 0, fail: 0, lastError: '', latency: 0, status: 'вимкнено', log: [] };

  const LLM = V.LLM = {
    cfg, state,
    save() { try { localStorage.setItem('valley.llm', JSON.stringify(cfg)); } catch (e) { /* ок */ } },
    set(k, v) { cfg[k] = v; LLM.save(); if (k === 'enabled') state.status = v ? 'увімкнено' : 'вимкнено'; },
    ready() { return cfg.enabled && !state.busy && (performance.now() - state.last) / 1000 > cfg.cooldown; },
    canPlan() { return cfg.plans && LLM.ready(); },
    canChat() { return cfg.chat && LLM.ready() && Math.random() < 0.35; },
  };
  state.status = cfg.enabled ? 'увімкнено' : 'вимкнено';

  function endpoint() {
    const base = cfg.url.replace(/\/+$/, '');
    return cfg.provider === 'ollama' ? base + '/api/chat' : (base.endsWith('/v1') ? base : base + '/v1') + '/chat/completions';
  }

  async function call(messages, maxTokens = 300) {
    state.busy = true; state.last = performance.now();
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 90000);
    const t0 = performance.now();
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (cfg.apiKey) headers.Authorization = 'Bearer ' + cfg.apiKey;
      const body = cfg.provider === 'ollama'
        ? { model: cfg.model, messages, stream: false, format: 'json', options: { temperature: 0.8, num_predict: maxTokens } }
        : { model: cfg.model, messages, temperature: 0.8, max_tokens: maxTokens };
      const res = await fetch(endpoint(), { method: 'POST', headers, body: JSON.stringify(body), signal: ctrl.signal });
      if (!res.ok) throw new Error('HTTP ' + res.status + ' ' + (await res.text()).slice(0, 120));
      const data = await res.json();
      const text = cfg.provider === 'ollama' ? data.message && data.message.content : data.choices && data.choices[0].message.content;
      state.ok++; state.latency = Math.round(performance.now() - t0); state.status = `працює (${state.latency} мс)`;
      return parseJSON(text || '');
    } catch (e) {
      state.fail++;
      state.lastError = e.name === 'AbortError' ? 'тайм-аут' : (e.message || String(e));
      state.status = 'помилка: ' + state.lastError;
      if (/Failed to fetch|NetworkError|Load failed/i.test(state.lastError)) state.status = 'немає з\'єднання (див. «Як під\'єднати»)';
      return null;
    } finally { clearTimeout(timer); state.busy = false; state.last = performance.now(); }
  }

  function parseJSON(text) {
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) return null;
    try { return JSON.parse(m[0]); } catch (e) { return null; }
  }

  LLM.test = async function () {
    state.status = 'перевіряю…';
    const base = cfg.url.replace(/\/+$/, '');
    try {
      const headers = cfg.apiKey ? { Authorization: 'Bearer ' + cfg.apiKey } : {};
      const url = cfg.provider === 'ollama' ? base + '/api/tags' : (base.endsWith('/v1') ? base : base + '/v1') + '/models';
      const r = await fetch(url, { headers });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const d = await r.json();
      const models = cfg.provider === 'ollama' ? (d.models || []).map(m => m.name) : (d.data || []).map(m => m.id);
      state.status = models.length ? 'з\'єднано' : 'з\'єднано, але моделей немає';
      return { ok: true, models };
    } catch (e) {
      state.status = 'немає з\'єднання';
      return { ok: false, error: e.message || String(e) };
    }
  };

  const matLine = id => {
    const m = M[id];
    return `${id} = ${m.name}${m.desc ? ' [' + m.desc.split('.')[0] + ']' : ''}: ${V.propLine(m)}`;
  };

  /* ---------- Планування експерименту ---------- */
  LLM.planExperiment = async function (sim, n, o) {
    const shuffle = a => a.map(x => [Math.random(), x]).sort((p, q) => p[0] - q[0]).map(x => x[1]);
    const mats = new Set();
    const heat = shuffle(o.heat).slice(0, 20); heat.forEach(h => h.forEach(id => mats.add(id)));
    const build = o.build.map(b => ({ idea: b.idea, slots: b.slots.map(s => s.slice(0, 10)) }));
    build.forEach(b => b.slots.forEach(s => s.forEach(id => mats.add(id))));
    o.alloy.forEach(a => { mats.add(a.base); mats.add(a.add); });
    o.composite.forEach(c => { mats.add(c.matrix); mats.add(c.filler); });
    if (!mats.size) return null;

    const R = V.REWARD;
    const devs = Object.values(sim.devices).map(d => `${V.IDEAS[d.idea].name} (якість ${d.quality})`).join(', ') || 'нічого';
    const fails = [...n.failures].slice(-6).join('; ');
    const hints = [n.hints.hotter && 'жару бракує для деяких реакцій', n.hints.air && 'деяким речам потрібен жар без повітря', n.hints.wall && 'стіни печі тріщать від жару'].filter(Boolean).join('; ') || 'немає';

    const sys = `Ти — ${n.name}, поселенець(-ка) у первісній долині. Ти допитлив(-а) і хочеш винаходити.
Світ підкоряється справжній фізиці й хімії: метали відновлюються з руди вугіллям при достатньому жарі, глина спікається, сплави змінюють твердість і крихкість, пристрій працює лише якщо властивості матеріалів підходять.
Твоє натхнення зараз: ${Math.round(n.insp)}. Ти отримуєш натхнення: новий матеріал +${R.material}, матеріал кращий за всі відомі +${R.useful}, новий винахід, що працює, до +${R.invent}, покращення +${R.improve}, «майже вийшло» +${R.partial}, невдача +${R.fail}. Найцінніше — те, що справді працює і чого ще ніхто не робив.
Відповідай ЛИШЕ JSON-об'єктом.`;

    const user = `Температура печі з найкращим паливом: ${o.temp ? Math.round(o.temp.t) + '°C' + (o.temp.enclosed ? ', закрита піч' : ', відкрите вогнище') : 'вогню немає'}.
Уже є в поселенні: ${devs}.
Підказки з досвіду: ${hints}.
Мої невдалі спроби: ${fails || 'немає'}.

Матеріали (id = назва: властивості):
${[...mats].map(matLine).join('\n')}

Можливі експерименти:
A) нагріти: ${heat.map(h => '[' + h.join(',') + ']').join(' ') || 'немає'}
B) змайструвати пристрій (idea і по одному матеріалу на кожне гніздо):
${build.map(b => `  ${b.idea} — ${V.IDEAS[b.idea].name} (щоб ${V.IDEAS[b.idea].verb}); гнізда: ${V.IDEAS[b.idea].slots.map((s, i) => V.SLOT[s].name + ' з [' + b.slots[i].join(',') + ']').join('; ')}`).join('\n') || '  немає'}
C) сплав (base + add, f = частка add від 0.01 до 0.5; для вуглецю 0.001–0.045): ${o.alloy.map(a => a.base + '+' + a.add).join(', ') || 'немає'}${o.temp ? '' : ''}
D) композит (matrix + filler, f = частка наповнювача 0.05–0.6): ${o.composite.map(c => c.matrix + '+' + c.filler).join(', ') || 'немає'}

Обери ОДИН експеримент. Формат:
{"thought":"коротка думка українською","type":"heat|build|alloy|composite","inputs":["id"],"idea":"id","parts":["id"],"base":"id","add":"id","matrix":"id","filler":"id","f":0.1,"name":"назва для нового матеріалу (необов'язково)"}`;

    const j = await call([{ role: 'system', content: sys }, { role: 'user', content: user }], 260);
    if (!j) return null;
    const plan = validate(j, o);
    state.log.unshift({ t: Date.now(), who: n.name, ok: !!plan, text: j.thought || '', raw: JSON.stringify(j).slice(0, 220) });
    if (state.log.length > 30) state.log.pop();
    return plan;
  };

  function validate(j, o) {
    const type = String(j.type || '').toLowerCase();
    const thought = typeof j.thought === 'string' ? j.thought.slice(0, 160) : '';
    const name = typeof j.name === 'string' ? j.name.slice(0, 28) : '';
    if (type === 'heat' && Array.isArray(j.inputs)) {
      const inp = j.inputs.map(String);
      const ok = o.heat.find(h => h.length === inp.length && h.every(x => inp.includes(x)));
      if (ok) return { type: 'heat', inputs: ok.slice(), thought, llm: true };
    }
    if (type === 'build' && j.idea && Array.isArray(j.parts)) {
      const b = o.build.find(x => x.idea === j.idea);
      if (b && j.parts.length === b.slots.length && j.parts.every((id, i) => b.slots[i].includes(id))) return { type: 'build', idea: b.idea, parts: j.parts.map(String), thought, llm: true };
    }
    if (type === 'alloy' && o.alloy.some(a => a.base === j.base && a.add === j.add)) {
      const max = j.add === 'charcoal' ? 0.045 : 0.5, min = j.add === 'charcoal' ? 0.001 : 0.01;
      const f = Math.max(min, Math.min(max, +j.f || (j.add === 'charcoal' ? 0.008 : 0.1)));
      return { type: 'alloy', base: j.base, add: j.add, f, name, thought, llm: true };
    }
    if (type === 'composite' && o.composite.some(c => c.matrix === j.matrix && c.filler === j.filler)) {
      const f = Math.max(0.05, Math.min(0.6, +j.f || 0.2));
      return { type: 'composite', matrix: j.matrix, filler: j.filler, f, name, thought, llm: true };
    }
    return null;
  }

  /* ---------- Розмова ---------- */
  LLM.chat = async function (sim, a, b, items) {
    const topic = items.length ? items.map(V.knowName).join('; ') : 'щоденне життя';
    const sys = `Ти пишеш репліки двох поселенців первісної долини. Коротко (до 15 слів кожна), живо, українською. Відповідай лише JSON {"a":"...","b":"..."}.`;
    const user = `${a.name} (${a.thought}) розповідає ${b.name} про: ${topic}. ${b.name} зараз: ${b.thought}. Епоха: ${sim.era}.`;
    const j = await call([{ role: 'system', content: sys }, { role: 'user', content: user }], 120);
    if (!j || typeof j.a !== 'string') return null;
    return [j.a.slice(0, 140), typeof j.b === 'string' ? j.b.slice(0, 140) : ''];
  };
})(window.V = window.V || {});
