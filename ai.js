/* Слой ИИ. Чтобы подключить настоящую модель — зарегистрируйте провайдер:
     Swizy.AI.register('my', { async stream({messages, settings, signal, onToken}) { ... onToken('текст'); } });
   и добавьте его в <select data-s="provider"> в index.html. Готовый провайдер 'server' работает с
   OpenAI-совместимым SSE через server.js (/api/chat). */
(function (g, f) { var x = f(g); if (typeof module === 'object' && module.exports) module.exports = x; else g.Swizy = Object.assign(g.Swizy || {}, x); })(
typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';
  const sleep = (ms, signal) => new Promise((res, rej) => {
    const t = setTimeout(res, ms);
    if (signal) signal.addEventListener('abort', () => { clearTimeout(t); rej(new DOMException('Aborted', 'AbortError')); }, { once: true });
  });
  const withSystem = (messages, s) => (s.system ? [{ role: 'system', content: s.system }] : []).concat(messages);

  function mockReply(q, name) {
    const s = q.toLowerCase(), who = name ? ', ' + name : '';
    if (/привет|здравств|hello|\bhi\b/.test(s)) return `Привет${who}! 👋 Я SWIZY AI и сейчас работаю в **демо-режиме**. Спросите про темы оформления или попросите пример кода.`;
    if (/тем[аыуе]|оформлен|дизайн|theme/.test(s)) return 'В SWIZY AI **10 тем**:\n\n- 🌌 Default\n- 🌸 Sakura\n- 🍬 Bubble Gum\n- 🤖 Cyberpunk\n- 🍦 Vanilla\n- 🌊 Ocean\n- 🌑 Midnight\n- 💜 Lavender\n- 🌲 Forest\n- 🌇 Sunset\n\nОткройте **Настройки → Оформление** — там можно посмотреть тему до применения.';
    if (/код|code|функци|скрипт|пример/.test(s)) return 'Вот пример на JavaScript:\n\n```js\nfunction greet(name) {\n  return `Привет, ${name}!`;\n}\nconsole.log(greet("SWIZY"));\n```\n\nМогу объяснить построчно.';
    if (/подключ|api|модел/.test(s)) return 'Чтобы подключить реальную модель:\n\n1. Задайте переменные `AI_API_KEY`, `AI_BASE_URL`, `AI_MODEL` и запустите `node server.js`.\n2. В **Настройки → Общие** выберите провайдер «Сервер».\n\nИли зарегистрируйте свой провайдер в `js/ai.js`.';
    return `Вы написали: «${q.slice(0, 200)}»\n\nЭто демо-ответ — настоящая модель пока не подключена. Инструкция по подключению — в **README.md**.`;
  }

  const providers = {
    mock: {
      async stream({ messages, settings, signal, onToken }) {
        const last = [...messages].reverse().find(m => m.role === 'user');
        await sleep(350, signal);
        for (const tok of mockReply(last ? last.content : '', settings.name).split(/(\s+)/)) {
          if (signal && signal.aborted) throw new DOMException('Aborted', 'AbortError');
          onToken(tok); await sleep(16, signal);
        }
      }
    },
    server: {
      async stream({ messages, settings, signal, onToken }) {
        const r = await fetch(settings.endpoint || '/api/chat', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, signal,
          body: JSON.stringify({ messages: withSystem(messages, settings), temperature: settings.temperature, stream: true })
        });
        if (!r.ok) throw new Error('Сервер ответил ' + r.status + ': ' + (await r.text()).slice(0, 200));
        const rd = r.body.getReader(), dec = new TextDecoder(); let buf = '';
        for (;;) {
          const { done, value } = await rd.read(); if (done) break;
          buf += dec.decode(value, { stream: true }); let i;
          while ((i = buf.indexOf('\n')) >= 0) {
            const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
            if (!line.startsWith('data:')) continue;
            const d = line.slice(5).trim(); if (d === '[DONE]') return;
            try { const j = JSON.parse(d), c = j.choices && j.choices[0] && j.choices[0].delta && j.choices[0].delta.content; if (c) onToken(c); } catch (e) { }
          }
        }
      }
    }
  };
  const AI = {
    providers, mockReply,
    register(name, p) { providers[name] = p; },
    stream(opts) { return (providers[opts.settings.provider] || providers.mock).stream(opts); }
  };
  return { AI };
});
