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

  // health: '' (ще не перевіряли), 'ok', 'down' (не відповідає), 'limit' (вичерпано ліміт)
  const state = { busy: false, last: 0, backoff: 0, ok: 0, fail: 0, fails: 0, health: '', until: 0, lastError: '', latency: 0, status: ['st.off', {}], log: [] };

  const PRESETS = {
    cloudflare: { provider: 'openai', url: '/api/v1', model: '@cf/meta/llama-3.1-8b-instruct-fp8-fast', cooldown: 3 },
    openrouter: { provider: 'openai', url: 'https://openrouter.ai/api/v1', model: 'openrouter/free', cooldown: 6 },
    ollama: { provider: 'ollama', url: 'http://localhost:11434', model: 'qwen2.5:3b', cooldown: 1.5 },
    lmstudio: { provider: 'openai', url: 'http://localhost:1234/v1', model: '', cooldown: 1.5 },
  };

  const LLM = V.LLM = {
    cfg, state,
    save() { try { localStorage.setItem('valley.llm', JSON.stringify(cfg)); } catch (e) { /* ок */ } },
    set(k, v) { cfg[k] = v; LLM.save(); if (k === 'enabled') { state.status = [v ? 'st.on' : 'st.off', {}]; state.health = ''; state.fails = 0; state.backoff = 0; } },
    ready() { return cfg.enabled && !cfg.paused && !state.busy && performance.now() > state.backoff && (performance.now() - state.last) / 1000 > cfg.cooldown; },
    /* Загальний стан для індикатора: off | paused | limit | down | ok | idle */
    mode() {
      if (!cfg.enabled) return 'off';
      if (cfg.paused) return 'paused';
      if (state.health === 'limit' || state.health === 'down') return state.health;
      return state.health === 'ok' ? 'ok' : 'idle';
    },
    onChange: null,
    canPlan() { return cfg.plans && LLM.ready(); },
    canChat() { return cfg.chat && LLM.ready() && Math.random() < 0.35; },
  };
  state.status = [cfg.enabled ? 'st.on' : 'st.off', {}];

  LLM.PRESETS = PRESETS;
  LLM.applyPreset = function (id) {
    const p = PRESETS[id]; if (!p) return null;
    cfg.keys = cfg.keys || {};
    if (cfg.preset) cfg.keys[cfg.preset] = cfg.apiKey;   // ключ кожного сервісу зберігається окремо
    for (const k of ['provider', 'url', 'model', 'cooldown']) cfg[k] = p[k];
    cfg.preset = id;
    cfg.apiKey = cfg.keys[id] || '';
    state.backoff = 0; state.health = ''; state.fails = 0;
    LLM.save();
    return p;
  };
  // відносна адреса (/api/v1) — сервер, з якого відкрито гру (Cloudflare Worker)
  const absUrl = u => /^https?:/i.test(u) ? u : (typeof location !== 'undefined' ? location.origin : '') + u;
  const isOpenRouter = () => /openrouter\.ai/.test(cfg.url);
  const isCloudflare = () => cfg.preset === 'cloudflare' || /^\/api\//.test(cfg.url) || /workers\.dev/.test(cfg.url);
  const nextUtcMidnight = () => { const d = new Date(); return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1); };
  function setHealth(h, until) {
    const prev = state.health;
    state.health = h; if (until) state.until = until;
    if (prev === h) return;
    if (h === 'ok' && (prev === 'down' || prev === 'limit')) notify('up');
    if (h === 'down' || h === 'limit') notify(h);
  }
  function notify(kind) { try { if (LLM.onChange) LLM.onChange(kind); } catch (e) { /* ок */ } }
  LLM.setPaused = function (p) { cfg.paused = !!p; LLM.save(); notify(p ? 'paused' : 'resumed'); };

  function endpoint() {
    const base = absUrl(cfg.url).replace(/\/+$/, '');
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
      if (isOpenRouter()) headers['X-Title'] = 'Valley of Inventors';
      const body = cfg.provider === 'ollama'
        ? { model: cfg.model, messages, stream: false, format: 'json', options: { temperature: 0.8, num_predict: maxTokens } }
        : { model: cfg.model, messages, temperature: 0.8, max_tokens: maxTokens };
      const res = await fetch(endpoint(), { method: 'POST', headers, body: JSON.stringify(body), signal: ctrl.signal });
      if (res.status === 429) {
        const txt = (await res.text()).slice(0, 300);
        // денний ліміт (Cloudflare: «neurons», «daily allocation») — до півночі UTC; інакше коротка пауза
        if (/neuron|daily|allocation|quota|per day|free tier/i.test(txt)) {
          const until = isCloudflare() ? nextUtcMidnight() : Date.now() + 10 * 60000;
          setHealth('limit', until);
          state.backoff = performance.now() + (until - Date.now());
          throw new Error('daily limit');
        }
        state.backoff = performance.now() + 45000;
        throw new Error('429 (limit, 45 s)');
      }
      if (res.status === 401) throw new Error('401 (API key)');
      if (!res.ok) throw new Error('HTTP ' + res.status + ' ' + (await res.text()).slice(0, 120));
      const data = await res.json();
      const text = cfg.provider === 'ollama' ? data.message && data.message.content : data.choices && data.choices[0].message.content;
      state.ok++; state.fails = 0; state.latency = Math.round(performance.now() - t0); state.status = ['st.works', { ms: state.latency }];
      setHealth('ok');
      return parseJSON(text || '');
    } catch (e) {
      state.fail++; state.fails++;
      state.lastError = e.name === 'AbortError' ? 'timeout' : (e.message || String(e));
      state.status = ['st.err', { e: state.lastError }];
      if (/Failed to fetch|NetworkError|Load failed/i.test(state.lastError)) state.status = ['st.noconn', {}];
      if (state.health === 'limit') state.status = ['st.limit', { until: state.until }];
      else if (state.fails >= 2) {
        // двічі поспіль без відповіді — вважаємо, що модель недоступна; пробуємо знову за хвилину
        setHealth('down');
        state.backoff = Math.max(state.backoff, performance.now() + 60000);
      }
      return null;
    } finally { clearTimeout(timer); state.busy = false; state.last = performance.now(); }
  }

  function parseJSON(text) {
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) return null;
    try { return JSON.parse(m[0]); } catch (e) { return null; }
  }

  LLM.test = async function () {
    state.status = ['st.checking', {}];
    const base = absUrl(cfg.url).replace(/\/+$/, '');
    try {
      const headers = cfg.apiKey ? { Authorization: 'Bearer ' + cfg.apiKey } : {};
      if (isOpenRouter()) {
        if (!cfg.apiKey) { state.status = ['st.needKey', {}]; return { ok: false, error: 'no key' }; }
        const k = await fetch(base + '/key', { headers });
        if (k.status === 401) { state.status = ['st.badKey', {}]; return { ok: false, error: '401' }; }
        if (!k.ok) throw new Error('HTTP ' + k.status);
        state.status = ['st.okOR', {}];
        return { ok: true, models: [cfg.model], skipCheck: true };
      }
      const url = cfg.provider === 'ollama' ? base + '/api/tags' : (base.endsWith('/v1') ? base : base + '/v1') + '/models';
      const r = await fetch(url, { headers });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      if (!/json/.test(r.headers.get('content-type') || '')) throw new Error('not JSON');
      const d = await r.json();
      const models = cfg.provider === 'ollama' ? (d.models || []).map(m => m.name) : (d.data || []).map(m => m.id);
      state.status = [models.length ? 'st.ok' : 'st.okNoModels', {}];
      return { ok: true, models };
    } catch (e) {
      state.status = ['st.noconn', {}];
      return { ok: false, error: e.message || String(e) };
    }
  };

  const matLine = id => {
    const d = V.matDesc(M[id]);
    return `${id} = ${V.mn(id)}${d ? ' [' + d.split('.')[0] + ']' : ''}: ${V.propLine(M[id])}`;
  };
  const langLine = () => V.lang === 'de' ? 'Schreibe "thought" und "name" auf Deutsch.' : 'Пиши "thought" і "name" українською.';

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
    const devs = Object.values(sim.devices).map(d => `${V.ideaName(d.idea)} (якість ${d.quality})`).join(', ') || 'нічого';
    const fails = [...n.failures].slice(-6).join('; ');
    const hints = [n.hints.hotter && 'жару бракує для деяких реакцій', n.hints.air && 'деяким речам потрібен жар без повітря', n.hints.wall && 'стіни печі тріщать від жару'].filter(Boolean).join('; ') || 'немає';

    const sys = `Ти — ${V.nn(n.name)}, поселенець(-ка) у первісній долині. Ти допитлив(-а) і хочеш винаходити.
Світ підкоряється справжній фізиці й хімії: метали відновлюються з руди вугіллям при достатньому жарі, глина спікається, сплави змінюють твердість і крихкість, пристрій працює лише якщо властивості матеріалів підходять.
Твоє натхнення зараз: ${Math.round(n.insp)}. Ти отримуєш натхнення: новий матеріал +${R.material}, матеріал кращий за всі відомі +${R.useful}, новий винахід, що працює, до +${R.invent}, покращення +${R.improve}, «майже вийшло» +${R.partial}, невдача +${R.fail}. Найцінніше — те, що справді працює і чого ще ніхто не робив.
Відповідай ЛИШЕ JSON-об'єктом. ${langLine()}`;

    const user = `Температура печі з найкращим паливом: ${o.temp ? Math.round(o.temp.t) + '°C' + (o.temp.enclosed ? ', закрита піч' : ', відкрите вогнище') : 'вогню немає'}.
Уже є в поселенні: ${devs}.
Підказки з досвіду: ${hints}.
Мої невдалі спроби: ${fails || 'немає'}.
Поради від інших поселенців: ${n.suggest.map(sg => `${V.ideaName(sg.idea)} — ${V.slotName(V.IDEAS[sg.idea].slots[sg.si])}: ${sg.mat}`).join('; ') || 'немає'}.

Матеріали (id = назва: властивості):
${[...mats].map(matLine).join('\n')}

Можливі експерименти:
A) нагріти: ${heat.map(h => '[' + h.join(',') + ']').join(' ') || 'немає'}
B) змайструвати пристрій (idea і по одному матеріалу на кожне гніздо):
${build.map(b => `  ${b.idea} — ${V.ideaName(b.idea)} (${V.ideaVerb(b.idea)}); гнізда: ${V.IDEAS[b.idea].slots.map((s, i) => V.slotName(s) + ' з [' + b.slots[i].join(',') + ']').join('; ')}`).join('\n') || '  немає'}
C) сплав (base + add, f = частка add від 0.01 до 0.5; для вуглецю 0.001–0.045): ${o.alloy.map(a => a.base + '+' + a.add).join(', ') || 'немає'}${o.temp ? '' : ''}
D) композит (matrix + filler, f = частка наповнювача 0.05–0.6): ${o.composite.map(c => c.matrix + '+' + c.filler).join(', ') || 'немає'}

Обери ОДИН експеримент. Формат:
{"thought":"коротка думка","type":"heat|build|alloy|composite","inputs":["id"],"idea":"id","parts":["id"],"base":"id","add":"id","matrix":"id","filler":"id","f":0.1,"name":"назва для нового матеріалу (необов'язково)"}`;

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
  LLM.chat = async function (sim, a, b, convo) {
    const parts = (convo && convo.topic || []).map(x => Array.isArray(x) ? V.R(x) : typeof x === 'string' && /^[mdil]:/.test(x) ? V.knowName(x) : String(x));
    const kinds = { solve: 'розповідає про проблему, і співрозмовник знає рішення', brainstorm: 'ділиться проблемою, і вони разом шукають рішення', idea: 'ділиться ідеєю, співрозмовник радить матеріал', help: 'просить допомоги', news: 'хвалиться відкриттям', teach: 'навчає', small: 'просто балакають' };
    const topic = (kinds[convo && convo.kind] || 'розмова') + (parts.length ? ': ' + parts.join(' → ') : '');
    const sys = `Ти пишеш репліки двох поселенців первісної долини. Коротко (до 15 слів кожна), живо, ${V.lang === 'de' ? 'НІМЕЦЬКОЮ мовою (auf Deutsch)' : 'українською'}. Відповідай лише JSON {"a":"...","b":"..."}.`;
    const user = `${V.nn(a.name)} (${V.R(a.thought)}) розповідає ${V.nn(b.name)} про: ${topic}. ${V.nn(b.name)} зараз: ${V.R(b.thought)}. Епоха: ${V.eraName(sim.era)}.`;
    const j = await call([{ role: 'system', content: sys }, { role: 'user', content: user }], 120);
    if (!j || typeof j.a !== 'string') return null;
    return [j.a.slice(0, 140), typeof j.b === 'string' ? j.b.slice(0, 140) : ''];
  };
})(window.V = window.V || {});
