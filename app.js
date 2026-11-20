/* Главное приложение: чаты, сообщения, настройки, связка с Theme Engine. */
(function () {
  'use strict';
  const { Store, Theme, AI, Gallery, md: toHtml, esc } = Swizy;
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const DEF = { name: '', provider: 'mock', endpoint: '/api/chat', temperature: 0.7, fontSize: 16, enterToSend: true,
    system: 'Ты — SWIZY AI, дружелюбный и точный помощник. Отвечай на языке пользователя.' };
  let settings = Object.assign({}, DEF, Store.get('swizy.settings.v1', {}));
  let chats = Store.get('swizy.chats.v1', []);
  let activeId = Store.get('swizy.active.v1', null);
  let busy = null, lastFocus = null, toastT = 0;
  const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36);
  const saveChats = () => { Store.set('swizy.chats.v1', chats); Store.set('swizy.active.v1', activeId); };
  const saveSettings = () => Store.set('swizy.settings.v1', settings);
  const active = () => chats.find(c => c.id === activeId);
  const wide = () => matchMedia('(min-width:900px)').matches;

  function toast(t) { const e = $('#toast'); e.textContent = t; e.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => e.classList.remove('show'), 2200); }
  async function copy(text) {
    try { await navigator.clipboard.writeText(text); toast('Скопировано'); }
    catch (e) { const t = document.createElement('textarea'); t.value = text; document.body.appendChild(t); t.select(); try { document.execCommand('copy'); toast('Скопировано'); } catch (_) { toast('Не удалось скопировать'); } t.remove(); }
  }

  /* ---------- сайдбар ---------- */
  function toggleSidebar(force) {
    const app = $('#app');
    if (wide()) app.classList.toggle('sb-closed', force === undefined ? !app.classList.contains('sb-closed') : !force);
    else app.classList.toggle('sb-open', force === undefined ? !app.classList.contains('sb-open') : force);
  }
  const closeSidebarMobile = () => { if (!wide()) $('#app').classList.remove('sb-open'); };

  function renderList() {
    const q = $('#search').value.trim().toLowerCase(), el = $('#chatList'); el.innerHTML = '';
    const list = chats.filter(c => !q || c.title.toLowerCase().includes(q)).sort((a, b) => b.updated - a.updated);
    if (!list.length) { el.innerHTML = '<p class="empty-note">Чатов пока нет</p>'; return; }
    list.forEach(c => {
      const row = document.createElement('div'); row.className = 'chat-item' + (c.id === activeId ? ' active' : '');
      row.innerHTML = `<button class="ci-main">${esc(c.title)}</button><button class="ci-act" data-a="ren" aria-label="Переименовать">✎</button><button class="ci-act" data-a="del" aria-label="Удалить">🗑</button>`;
      row.querySelector('.ci-main').onclick = () => { activeId = c.id; saveChats(); renderAll(); closeSidebarMobile(); };
      row.querySelector('[data-a=ren]').onclick = () => { const t = prompt('Название чата', c.title); if (t && t.trim()) { c.title = t.trim().slice(0, 80); saveChats(); renderList(); renderTitle(); } };
      row.querySelector('[data-a=del]').onclick = () => { if (!confirm('Удалить чат?')) return; if (activeId === c.id) { stop(); activeId = null; } chats = chats.filter(x => x.id !== c.id); saveChats(); renderAll(); };
      el.appendChild(row);
    });
  }
  const renderTitle = () => { const c = active(); $('#chatTitle').textContent = c ? c.title : 'SWIZY AI'; };

  /* ---------- сообщения ---------- */
  const SUGGEST = [
    { e: '👋', t: 'Поздороваться', p: 'Привет!' },
    { e: '💻', t: 'Пример кода', p: 'Покажи пример кода' },
    { e: '🎨', t: 'Расскажи про темы', p: 'Какие есть темы оформления?' },
    { e: '🔌', t: 'Подключить модель', p: 'Как подключить настоящую ИИ-модель?' }
  ];
  function renderEmpty(box) {
    box.innerHTML = `<div class="empty"><div style="font-size:2.6rem">✨</div><h1>${settings.name ? 'Привет, ' + esc(settings.name) + '!' : 'Чем могу помочь?'}</h1><p>SWIZY AI — задайте вопрос или выберите подсказку.</p><div class="cards"></div></div>`;
    const cards = box.querySelector('.cards');
    SUGGEST.forEach(s => { const b = document.createElement('button'); b.className = 'card'; b.innerHTML = `<b>${s.e} ${s.t}</b><span>${esc(s.p)}</span>`; b.onclick = () => send(s.p); cards.appendChild(b); });
    const t = document.createElement('button'); t.className = 'card'; t.innerHTML = '<b>🖌 Сменить оформление</b><span>10 тем с предпросмотром</span>'; t.onclick = () => openModal('appearance'); cards.appendChild(t);
  }
  function fill(d, m, isLast) {
    if (m.role === 'user') { d.querySelector('.bubble').textContent = m.content; return; }
    d.querySelector('.md').innerHTML = m.content ? toHtml(m.content) : '<span class="typing"><i></i><i></i><i></i></span>';
    const a = d.querySelector('.actions'); a.innerHTML = '';
    if (m.content && !busy) a.innerHTML = '<button data-act="copy">📋 Копировать</button>' + (isLast ? '<button data-act="regen">🔄 Заново</button>' : '');
  }
  function renderMessages() {
    const box = $('#messages'), c = active(); box.innerHTML = '';
    if (!c || !c.messages.length) { renderEmpty(box); return; }
    c.messages.forEach((m, i) => {
      const d = document.createElement('div'); d.className = 'msg ' + (m.role === 'user' ? 'user' : 'ai'); d.dataset.id = m.id;
      d.innerHTML = m.role === 'user' ? '<div class="bubble"></div>' : '<div class="avatar">S</div><div class="bubble"><div class="md"></div><div class="actions"></div></div>';
      fill(d, m, i === c.messages.length - 1); box.appendChild(d);
    });
    scrollEnd();
  }
  const scrollEnd = () => { const b = $('#messages'); b.scrollTop = b.scrollHeight; };
  const nearEnd = () => { const b = $('#messages'); return b.scrollHeight - b.scrollTop - b.clientHeight < 140; };
  function renderAll() { renderList(); renderTitle(); renderMessages(); setBusyUi(); }

  /* ---------- отправка ---------- */
  function setBusyUi() {
    const b = $('#sendBtn'); b.textContent = busy ? '■' : '➤'; b.setAttribute('aria-label', busy ? 'Остановить' : 'Отправить');
    b.disabled = !busy && !$('#input').value.trim();
  }
  function stop() { if (busy) busy.abort(); }
  async function send(text, regen) {
    if (busy) return;
    let c = active(); text = (text || '').trim();
    if (!regen) {
      if (!text) return;
      if (!c) { c = { id: uid(), title: 'Новый чат', created: Date.now(), updated: Date.now(), messages: [] }; chats.push(c); activeId = c.id; }
      c.messages.push({ id: uid(), role: 'user', content: text, ts: Date.now() });
      if (c.messages.length === 1) c.title = text.slice(0, 40);
      $('#input').value = ''; autogrow();
    } else if (!c) return;
    const ai = { id: uid(), role: 'assistant', content: '', ts: Date.now() };
    c.messages.push(ai); c.updated = Date.now(); saveChats();
    const ctl = new AbortController(); busy = ctl; renderAll(); closeSidebarMobile();
    let raf = 0;
    const paint = () => { raf = 0; const el = document.querySelector(`[data-id="${ai.id}"] .md`); if (!el) return; const s = nearEnd(); el.innerHTML = toHtml(ai.content); if (s) scrollEnd(); };
    try {
      await AI.stream({ messages: c.messages.filter(m => m !== ai).map(({ role, content }) => ({ role, content })), settings, signal: ctl.signal,
        onToken: t => { ai.content += t; if (!raf) raf = requestAnimationFrame(paint); } });
    } catch (e) { if (e.name !== 'AbortError') ai.content += (ai.content ? '\n\n' : '') + '⚠️ Ошибка: ' + e.message; }
    cancelAnimationFrame(raf); busy = null;
    if (!ai.content) c.messages = c.messages.filter(m => m !== ai);
    c.updated = Date.now(); saveChats(); renderAll();
  }

  /* ---------- ввод ---------- */
  function autogrow() { const t = $('#input'); t.style.height = 'auto'; t.style.height = Math.min(t.scrollHeight, 200) + 'px'; setBusyUi(); }
  $('#input').addEventListener('input', autogrow);
  $('#input').addEventListener('keydown', e => {
    if (e.key !== 'Enter' || e.isComposing) return;
    const go = settings.enterToSend ? !e.shiftKey : (e.ctrlKey || e.metaKey);
    if (go) { e.preventDefault(); send($('#input').value); }
  });
  $('#sendBtn').onclick = () => busy ? stop() : send($('#input').value);
  $('#newChat').onclick = () => { stop(); activeId = null; saveChats(); renderAll(); closeSidebarMobile(); $('#input').focus(); };
  $('#search').addEventListener('input', renderList);
  $('#menuBtn').onclick = () => toggleSidebar();
  $('#scrim').onclick = () => toggleSidebar(false);
  $('#messages').addEventListener('click', e => {
    const cb = e.target.closest('[data-copy]');
    if (cb) { copy(cb.closest('.code').querySelector('code').textContent); return; }
    const ab = e.target.closest('[data-act]'); if (!ab) return;
    const c = active(); if (!c) return;
    if (ab.dataset.act === 'copy') copy(c.messages.find(m => m.id === ab.closest('.msg').dataset.id).content);
    if (ab.dataset.act === 'regen') { const l = c.messages[c.messages.length - 1]; if (l && l.role === 'assistant') { c.messages.pop(); send(null, true); } }
  });

  /* ---------- настройки / модальное окно ---------- */
  function openModal(tab) {
    if (Theme.previewing()) Theme.endPreview(false);
    lastFocus = document.activeElement; $('#modal').hidden = false; selectTab(tab || 'appearance'); $('#closeModal').focus(); closeSidebarMobile();
  }
  function closeModal() { $('#modal').hidden = true; if (lastFocus && lastFocus.focus) lastFocus.focus(); }
  function selectTab(t) {
    $$('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === t));
    $$('.pane').forEach(p => p.classList.toggle('on', p.dataset.pane === t));
  }
  $('#openSettings').onclick = () => openModal('general');
  $('#openTheme').onclick = $('#themeBtn').onclick = () => openModal('appearance');
  $('#closeModal').onclick = closeModal;
  $('#modal').addEventListener('mousedown', e => { if (e.target.id === 'modal') closeModal(); });
  $('#tabs').addEventListener('click', e => { const b = e.target.closest('button'); if (b) selectTab(b.dataset.tab); });

  function applySettings() {
    document.documentElement.style.setProperty('--fs', settings.fontSize + 'px');
    $('#endpointRow').hidden = settings.provider !== 'server';
  }
  $$('[data-s]').forEach(el => {
    const k = el.dataset.s, o = el.parentElement.querySelector('output');
    if (el.type === 'checkbox') el.checked = !!settings[k]; else el.value = settings[k];
    if (o) o.textContent = settings[k];
    el.addEventListener('input', () => {
      const v = el.type === 'checkbox' ? el.checked : el.type === 'range' ? parseFloat(el.value) : el.value;
      settings[k] = v; saveSettings(); applySettings(); if (o) o.textContent = v;
      if (k === 'name' && !(active() && active().messages.length)) renderMessages();
    });
  });

  /* ---------- оформление ---------- */
  function syncTheme() {
    Gallery.render($('#gallery'));
    $$('#modeSeg button').forEach(b => b.classList.toggle('on', b.dataset.m === Theme.state.pref));
    const cur = Theme.find(Theme.state.theme);
    $('#modeNote').textContent = Theme.modes(cur).length === 1
      ? `Тема «${cur.name}» существует только в тёмном варианте — переключатель режима влияет на остальные темы.` : '';
    const pv = Theme.previewing();
    document.body.classList.toggle('previewing', !!pv);
    $('#previewBar').hidden = !pv;
    if (pv) { const t = Theme.find(pv); $('#previewText').textContent = `${t.emoji} Предпросмотр: ${t.name}`; }
  }
  $('#modeSeg').addEventListener('click', e => { const b = e.target.closest('button'); if (b) Theme.setPref(b.dataset.m); });
  $('#previewApply').onclick = () => { const t = Theme.find(Theme.previewing()); Theme.endPreview(true); toast(`Тема «${t.name}» применена`); openModal('appearance'); };
  $('#previewCancel').onclick = () => { Theme.endPreview(false); openModal('appearance'); };
  Theme.subscribe(syncTheme);

  /* ---------- данные ---------- */
  $('#exportBtn').onclick = () => {
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify({ chats, settings }, null, 2)], { type: 'application/json' }));
    a.download = 'swizy-ai-export.json'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  $('#clearBtn').onclick = () => { if (confirm('Удалить все чаты?')) { stop(); chats = []; activeId = null; saveChats(); renderAll(); toast('Чаты удалены'); } };
  $('#resetBtn').onclick = () => {
    if (!confirm('Сбросить настройки и тему?')) return;
    Store.remove('swizy.settings.v1'); Store.remove(Theme.KEY); location.reload();
  };

  /* ---------- горячие клавиши ---------- */
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (Theme.previewing()) { Theme.endPreview(false); openModal('appearance'); }
    else if (!$('#modal').hidden) closeModal();
    else closeSidebarMobile();
  });

  /* ---------- старт ---------- */
  if (!wide()) $('#app').classList.remove('sb-open');
  if (active() === undefined) activeId = null;
  applySettings(); syncTheme(); renderAll();
  window.Swizy.app = { send, openModal };
})();
