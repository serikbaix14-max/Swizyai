/* Галерея тем: карточки, миниатюры (используют те же CSS-переменные через data-theme), просмотр и применение. */
(function (g) {
  'use strict';
  const { Theme } = g.Swizy;
  const MINI = '<div class="ms"><i></i><i></i><i></i><i></i></div><div class="mm"><div class="u"></div><div class="a"></div><div class="a s"></div><div class="inp"><b></b></div></div>';
  function render(root) {
    root.innerHTML = '';
    const cur = Theme.state.theme, pv = Theme.previewing();
    Theme.THEMES.forEach(t => {
      const multi = Theme.modes(t).length > 1, card = document.createElement('article');
      card.className = 'theme-card' + (t.id === cur ? ' selected' : '') + (t.id === pv ? ' previewing' : '');
      card.innerHTML =
        `<div class="mini" data-theme="${t.id}" data-mode="${Theme.effective(t.id)}">${MINI}</div>` +
        `<div class="tc-body"><h3><span class="emo">${t.emoji}</span>${t.name}<span class="check" title="Выбрано">✓</span></h3>` +
        `<p>${t.desc}</p><small>${multi ? '☀️ Светлая · 🌙 Тёмная' : '🌙 Только тёмная'}</small>` +
        `<div class="tc-actions"><button class="btn ghost" data-a="p">👁 Просмотр</button>` +
        `<button class="btn primary" data-a="a"${t.id === cur ? ' disabled' : ''}>${t.id === cur ? 'Выбрано' : 'Применить'}</button></div></div>`;
      card.querySelector('[data-a=p]').onclick = () => Theme.preview(t.id);
      card.querySelector('[data-a=a]').onclick = () => Theme.apply(t.id);
      root.appendChild(card);
    });
  }
  g.Swizy.Gallery = { render };
})(window);
