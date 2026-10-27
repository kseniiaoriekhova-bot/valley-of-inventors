/* ============================================================
   Cloudflare Worker для «Долини винахідників»
   - віддає гру як статичний сайт (папка dist/)
   - /api/v1/chat/completions і /api/v1/models — OpenAI-сумісний
     інтерфейс до безкоштовних відкритих моделей Workers AI.
   Ключ не потрібен: модель викликається через прив'язку AI.
   ============================================================ */

// Дозволені моделі — щоб чужі сайти не витрачали ваш денний ліміт на будь-що
const MODELS = [
  '@cf/meta/llama-3.1-8b-instruct-fp8-fast',
  '@cf/meta/llama-3.1-8b-instruct',
  '@cf/qwen/qwen3-30b-a3b-fp8',
];
const DEFAULT_MODEL = MODELS[0];
const MAX_TOKENS = 400;

const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
});

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/api/v1/models' && request.method === 'GET') {
      return json({ object: 'list', data: MODELS.map(id => ({ id, object: 'model', owned_by: 'cloudflare' })) });
    }

    if (url.pathname === '/api/v1/chat/completions' && request.method === 'POST') {
      // лише запити з цього ж сайту
      const origin = request.headers.get('origin');
      if (origin && origin !== url.origin) return json({ error: { message: 'forbidden origin' } }, 403);
      if (!env.AI) return json({ error: { message: 'Workers AI binding "AI" is not configured' } }, 500);

      let body;
      try { body = await request.json(); } catch { return json({ error: { message: 'invalid JSON' } }, 400); }
      const model = MODELS.includes(body.model) ? body.model : DEFAULT_MODEL;
      const messages = Array.isArray(body.messages)
        ? body.messages.slice(-6).map(m => ({ role: String(m.role || 'user'), content: String(m.content || '').slice(0, 8000) }))
        : [];
      if (!messages.length) return json({ error: { message: 'messages required' } }, 400);

      try {
        const out = await env.AI.run(model, {
          messages,
          max_tokens: Math.min(MAX_TOKENS, +body.max_tokens || MAX_TOKENS),
          temperature: typeof body.temperature === 'number' ? body.temperature : 0.8,
        });
        const text = typeof out === 'string' ? out
          : out.response ?? (out.choices && out.choices[0] && out.choices[0].message && out.choices[0].message.content) ?? '';
        return json({
          id: 'cf-' + crypto.randomUUID(), object: 'chat.completion', model,
          choices: [{ index: 0, finish_reason: 'stop', message: { role: 'assistant', content: typeof text === 'string' ? text : JSON.stringify(text) } }],
        });
      } catch (e) {
        const msg = String((e && e.message) || e);
        // денний безкоштовний ліміт вичерпано або перевантаження
        const status = /limit|capacity|429|neurons/i.test(msg) ? 429 : 502;
        return json({ error: { message: msg.slice(0, 300) } }, status);
      }
    }

    if (url.pathname.startsWith('/api/')) return json({ error: { message: 'not found' } }, 404);
    return env.ASSETS.fetch(request);
  },
};
