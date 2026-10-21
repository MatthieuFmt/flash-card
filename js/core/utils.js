window.FC = window.FC || {};

FC.utils = (function () {
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function flagEmoji(iso) {
    return iso.toUpperCase().replace(/./g, (c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65));
  }

  function flagUrl(iso) {
    return "assets/flags/" + iso.toLowerCase() + ".png";
  }

  function humanize(ms) {
    const totalMin = Math.max(0, Math.round(ms / 60000));
    if (totalMin < 1) return "moins d'une minute";
    if (totalMin < 60) return totalMin === 1 ? "1 min" : `${totalMin} min`;
    const h = Math.round(totalMin / 60);
    if (h < 24) return h === 1 ? "1 h" : `${h} h`;
    const d = Math.round(h / 24);
    if (d < 30) return d === 1 ? "1 jour" : `${d} jours`;
    const mo = Math.round(d / 30);
    if (mo < 12) return mo === 1 ? "1 mois" : `${mo} mois`;
    const y = Math.round(mo / 12);
    return y === 1 ? "1 an" : `${y} ans`;
  }

  function loadJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function showScreen(id) {
    $$(".screen").forEach((s) => { s.hidden = true; });
    $(id).hidden = false;
  }

  const CONTINENT_EMOJI = {
    "Afrique": "🌍",
    "Amérique du Nord": "🌎",
    "Amérique du Sud": "🌎",
    "Asie": "🌏",
    "Europe": "🌍",
    "Océanie": "🌏"
  };

  return { $, $$, shuffle, flagEmoji, flagUrl, humanize, loadJSON, showScreen, CONTINENT_EMOJI };
})();
