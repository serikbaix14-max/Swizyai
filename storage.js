/* Безопасная обёртка над localStorage (с запасным хранилищем в памяти). */
(function (g, f) { var x = f(g); if (typeof module === 'object' && module.exports) module.exports = x; else g.Swizy = Object.assign(g.Swizy || {}, x); })(
typeof window !== 'undefined' ? window : globalThis, function (g) {
  'use strict';
  const mem = {};
  let ls = null;
  try { ls = g.localStorage; ls.setItem('__t', '1'); ls.removeItem('__t'); } catch (e) { ls = null; }
  const Store = {
    persistent: !!ls,
    get(k, d) { try { const v = ls ? ls.getItem(k) : mem[k]; return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { const s = JSON.stringify(v); try { if (ls) ls.setItem(k, s); else mem[k] = s; return true; } catch (e) { mem[k] = s; return false; } },
    remove(k) { try { if (ls) ls.removeItem(k); } catch (e) { } delete mem[k]; }
  };
  return { Store };
});
