/* Theme Engine SWIZY AI.
   Единственное место, где описаны темы. Каждая тема — 7 цветов (+ glow/gloss) на режим (light/dark).
   Движок генерирует CSS-переменные [data-theme][data-mode], остальное (границы, градиенты, тени)
   вычисляется в css/base.css из этих токенов. Компоненты не дублируются. */
(function (g, f) { var x = f(g); if (typeof module === 'object' && module.exports) module.exports = x; else g.Swizy = Object.assign(g.Swizy || {}, x); })(
typeof window !== 'undefined' ? window : globalThis, function (g) {
  'use strict';
  const Store = (g.Swizy && g.Swizy.Store) || require('./storage.js').Store;
  const KEY = 'swizy.theme.v1';

  //          фон        сайдбар    карточки   текст      приглушённый акцент    акцент2    доп.
  const T = (bg, side, surface, text, muted, accent, accent2, x) =>
    Object.assign({ bg, side, surface, text, muted, accent, accent2, glow: 30, gloss: 0 }, x);

  const THEMES = [
    { id: 'default', name: 'Default', emoji: '🌌', desc: 'Оригинальная тёмная тема SWIZY AI', modes: {
      dark: T('#0f1115', '#0a0c10', '#171a21', '#e8eaf0', '#8b93a7', '#6c8cff', '#a06bff') } },
    { id: 'sakura', name: 'Sakura', emoji: '🌸', desc: 'Нежно-розовая, с эстетикой японской сакуры', modes: {
      light: T('#fff5f8', '#ffe6ee', '#ffffff', '#4a2b36', '#9a6f7e', '#f27ca4', '#ffb3c8'),
      dark: T('#1d1218', '#170e13', '#2a1b23', '#fbe6ee', '#b58b9a', '#f58fb2', '#c78bd9') } },
    { id: 'bubblegum', name: 'Bubble Gum', emoji: '🍬', desc: 'Яркая розовая глянцевая тема', modes: {
      light: T('#ffd6ec', '#ffbfe0', '#fff0f8', '#5a0a3a', '#a8467a', '#ff2e93', '#ff7ac6', { gloss: 0.5, glow: 45 }),
      dark: T('#2a0720', '#200518', '#3a0d2d', '#ffe3f3', '#d37fb0', '#ff3ea5', '#ff8bd0', { gloss: 0.25, glow: 45 }) } },
    { id: 'cyberpunk', name: 'Cyberpunk', emoji: '🤖', desc: 'Чёрная с фиолетовым неоном', modes: {
      dark: T('#07040f', '#0b0618', '#120a26', '#efe6ff', '#9a86cc', '#b026ff', '#00f0ff', { glow: 65 }) } },
    { id: 'vanilla', name: 'Vanilla', emoji: '🍦', desc: 'Кремовая минималистичная тема', modes: {
      light: T('#fbf6ea', '#f3ead6', '#fffdf7', '#3b3326', '#857a66', '#c9a15b', '#e3c88f', { glow: 18 }),
      dark: T('#1b1813', '#15130f', '#252118', '#f2ead9', '#a39a85', '#d4ad68', '#e8d3a3', { glow: 18 }) } },
    { id: 'ocean', name: 'Ocean', emoji: '🌊', desc: 'Голубая и бирюзовая', modes: {
      light: T('#e8f8fb', '#d3f0f5', '#ffffff', '#0b3a47', '#4f8794', '#0aa2c0', '#14d1b8'),
      dark: T('#06161c', '#041117', '#0b232c', '#dff6fa', '#6fa3af', '#19b5d4', '#1de0c4') } },
    { id: 'midnight', name: 'Midnight', emoji: '🌑', desc: 'Чёрная с красными акцентами', modes: {
      dark: T('#050505', '#000000', '#111111', '#f1f1f1', '#8a8a8a', '#ff1f3d', '#ff5a4d', { glow: 40 }) } },
    { id: 'lavender', name: 'Lavender', emoji: '💜', desc: 'Светло-фиолетовая', modes: {
      light: T('#f4f0ff', '#e8e0ff', '#ffffff', '#2f2550', '#7a6fa6', '#8b5cf6', '#c4a1ff'),
      dark: T('#15112a', '#100d22', '#1f1a3a', '#ece6ff', '#9d92c9', '#a58bff', '#d6b8ff') } },
    { id: 'forest', name: 'Forest', emoji: '🌲', desc: 'Зелёная природная', modes: {
      light: T('#eef6ec', '#dfecda', '#ffffff', '#1f3a26', '#5f8266', '#2f9e57', '#8bc34a'),
      dark: T('#0c1710', '#08120b', '#14241a', '#e1f2e4', '#7fa388', '#3fbf6c', '#9bd45b') } },
    { id: 'sunset', name: 'Sunset', emoji: '🌇', desc: 'Оранжево-розовый закат', modes: {
      light: T('#fff1e6', '#ffe0d0', '#ffffff', '#4a2318', '#9c6552', '#ff6b4a', '#ff4f8b'),
      dark: T('#1f0f14', '#170a0e', '#2d1820', '#ffe9df', '#c08a85', '#ff7a50', '#ff4f8b') } }
  ];

  /* ---------- цвет ---------- */
  const lum = (hex) => {
    const n = parseInt(hex.slice(1), 16), c = [n >> 16 & 255, n >> 8 & 255, n & 255]
      .map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  };
  const contrast = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  // Цвет текста на кнопках/градиентах: белый или почти чёрный — что читаемее на обоих акцентах.
  const pickOn = (a1, a2) => {
    const score = c => Math.min(contrast(c, a1), contrast(c, a2));
    return score('#ffffff') >= score('#16111c') ? '#ffffff' : '#16111c';
  };

  const find = id => THEMES.find(t => t.id === id);
  const modes = t => Object.keys(t.modes);
  const resolve = (t, pref, sysDark) => {
    const m = modes(t);
    if (m.length === 1) return m[0];
    if (pref === 'light' || pref === 'dark') return pref;
    return sysDark ? 'dark' : 'light';
  };

  function buildCSS() {
    return THEMES.map(t => modes(t).map(m => {
      const v = t.modes[m];
      return `[data-theme="${t.id}"][data-mode="${m}"]{color-scheme:${m};--bg:${v.bg};--side:${v.side};--surface:${v.surface};` +
        `--text:${v.text};--muted:${v.muted};--accent:${v.accent};--accent2:${v.accent2};--on:${pickOn(v.accent, v.accent2)};` +
        `--glow:${v.glow};--gloss:${v.gloss}}`;
    }).join('\n')).join('\n');
  }

  /* ---------- движок ---------- */
  const state = { theme: 'default', pref: 'auto' };
  let previewId = null, timer = 0;
  const subs = [];
  const emit = () => subs.forEach(fn => { try { fn(); } catch (e) { console.error(e); } });
  const save = () => Store.set(KEY, { theme: state.theme, pref: state.pref });
  const sysDark = () => !!(g.matchMedia && g.matchMedia('(prefers-color-scheme: dark)').matches);

  function paint(id, animate) {
    const d = g.document; if (!d) return;
    const t = find(id) || THEMES[0], mode = resolve(t, state.pref, sysDark()), el = d.documentElement;
    if (animate) { el.classList.add('theme-anim'); clearTimeout(timer); timer = setTimeout(() => el.classList.remove('theme-anim'), 650); }
    el.dataset.theme = t.id; el.dataset.mode = mode;
    const meta = d.querySelector('meta[name=theme-color]'); if (meta) meta.content = t.modes[mode].bg;
  }

  const Theme = {
    THEMES, state, find, modes, resolve, buildCSS, contrast, pickOn, KEY,
    init() {
      const s = Store.get(KEY, null);
      if (s && find(s.theme)) state.theme = s.theme;
      if (s && ['auto', 'light', 'dark'].includes(s.pref)) state.pref = s.pref;
      const d = g.document; if (!d) return;
      let st = d.getElementById('swizy-tokens');
      if (!st) { st = d.createElement('style'); st.id = 'swizy-tokens'; d.head.appendChild(st); }
      st.textContent = buildCSS();
      paint(state.theme, false);
      if (g.matchMedia) g.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        if (state.pref === 'auto') { paint(previewId || state.theme, true); emit(); }
      });
    },
    effective: id => resolve(find(id), state.pref, sysDark()),
    apply(id) { if (!find(id)) return; state.theme = id; previewId = null; save(); paint(id, true); emit(); },
    setPref(p) { if (!['auto', 'light', 'dark'].includes(p)) return; state.pref = p; save(); paint(previewId || state.theme, true); emit(); },
    preview(id) { if (!find(id)) return; previewId = id; paint(id, true); emit(); },
    endPreview(commit) {
      const id = previewId; previewId = null;
      if (id && commit) { state.theme = id; save(); }
      paint(state.theme, true); emit();
    },
    previewing: () => previewId,
    subscribe: fn => subs.push(fn)
  };
  return { Theme, THEMES };
});
