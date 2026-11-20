/* Мини-Markdown (безопасный: весь текст экранируется до разметки). */
(function (g, f) { var x = f(g); if (typeof module === 'object' && module.exports) module.exports = x; else g.Swizy = Object.assign(g.Swizy || {}, x); })(
typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  function inline(s) {
    s = esc(s);
    s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
    s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/(^|[\s(])\*([^*\n]+)\*/g, '$1<em>$2</em>');
    s = s.replace(/\bhttps?:\/\/[^\s<]+/g, u => `<a href="${u}" target="_blank" rel="noopener noreferrer">${u}</a>`);
    return s;
  }
  function blocks(t) {
    let h = '', list = null, para = [];
    const fp = () => { if (para.length) { h += '<p>' + para.map(inline).join('<br>') + '</p>'; para = []; } };
    const fl = () => { if (list) { h += `<${list.t}>` + list.i.map(x => '<li>' + inline(x) + '</li>').join('') + `</${list.t}>`; list = null; } };
    for (const l of t.split('\n')) {
      let m;
      if ((m = l.match(/^(#{1,3})\s+(.*)/))) { fp(); fl(); const n = m[1].length + 2; h += `<h${n}>${inline(m[2])}</h${n}>`; }
      else if ((m = l.match(/^\s*[-*]\s+(.*)/))) { fp(); if (!list || list.t !== 'ul') { fl(); list = { t: 'ul', i: [] }; } list.i.push(m[1]); }
      else if ((m = l.match(/^\s*\d+[.)]\s+(.*)/))) { fp(); if (!list || list.t !== 'ol') { fl(); list = { t: 'ol', i: [] }; } list.i.push(m[1]); }
      else if (!l.trim()) { fp(); fl(); }
      else { fl(); para.push(l); }
    }
    fp(); fl(); return h;
  }
  function md(text) {
    let out = '';
    String(text).split('```').forEach((p, i) => {
      if (i % 2) {
        const nl = p.indexOf('\n'), lang = nl >= 0 ? p.slice(0, nl).trim() : '', code = nl >= 0 ? p.slice(nl + 1) : p;
        out += `<div class="code"><div class="code-h"><span>${esc(lang) || 'code'}</span><button data-copy>Копировать</button></div><pre><code>${esc(code.replace(/\n$/, ''))}</code></pre></div>`;
      } else out += blocks(p);
    });
    return out;
  }
  return { md, esc };
});
