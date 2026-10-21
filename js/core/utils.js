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
    $(".site-header").hidden = id !== "#screen-home";
  }

  let worldOthersCache = null;

  function worldOthers() {
    if (worldOthersCache === null) {
      const parts = [];
      for (const code in FC.WORLD) {
        parts.push(`<path class="wm-other" d="${FC.WORLD[code]}"/>`);
      }
      worldOthersCache = parts.join("");
    }
    return worldOthersCache;
  }

  function worldSvg(iso, loose) {
    const target = FC.WORLD && FC.WORLD[iso];
    if (!target) return null;
    return (
      `<svg viewBox="${worldViewBox(iso, loose)}" class="wm" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">` +
      '<rect x="0" y="0" width="720" height="360" class="wm-ocean"/>' +
      worldOthers() +
      `<path class="wm-target" d="${target}"/>` +
      "</svg>"
    );
  }
  function isIsland(iso) {
    const bb = FC.WORLD_BBOX && FC.WORLD_BBOX[iso];
    if (!bb) return false;
    for (const code in FC.WORLD_BBOX) {
      if (code === iso) continue;
      const b = FC.WORLD_BBOX[code];
      if (bb[0] - 1 <= b[2] && bb[2] + 1 >= b[0] && bb[1] - 1 <= b[3] && bb[3] + 1 >= b[1]) {
        return false;
      }
    }
    return true;
  }

  function worldViewBox(iso, loose) {
    const bb = FC.WORLD_BBOX && FC.WORLD_BBOX[iso];
    if (!bb) return "0 0 720 360";
    let [x0, y0, x1, y1] = bb;
    let w = x1 - x0;
    let h = y1 - y0;
    const island = isIsland(iso);
    const pad = island
      ? Math.max(w, h) * (loose ? 0.6 : 0.5) + (loose ? 12 : 6)
      : Math.max(w, h) * (loose ? 0.55 : 0.25) + (loose ? 20 : 8);
    x0 -= pad;
    y0 -= pad;
    x1 += pad;
    y1 += pad;
    w = x1 - x0;
    h = y1 - y0;
    const MIN_W = island ? (loose ? 45 : 20) : 90;
    const MIN_H = island ? (loose ? 30 : 14) : 56;
    if (w < MIN_W) { const c = (x0 + x1) / 2; x0 = c - MIN_W / 2; x1 = c + MIN_W / 2; w = MIN_W; }
    if (h < MIN_H) { const c = (y0 + y1) / 2; y0 = c - MIN_H / 2; y1 = c + MIN_H / 2; h = MIN_H; }
    if (w / h > 2.6) { const c = (y0 + y1) / 2; h = w / 2.6; y0 = c - h / 2; y1 = c + h / 2; }
    if (h / w > 1.7) { const c = (x0 + x1) / 2; w = h / 1.7; x0 = c - w / 2; x1 = c + w / 2; }
    x0 = Math.max(0, x0);
    y0 = Math.max(0, y0);
    x1 = Math.min(720, x1);
    y1 = Math.min(360, y1);
    return `${Math.round(x0)} ${Math.round(y0)} ${Math.round(x1 - x0)} ${Math.round(y1 - y0)}`;
  }

  const CONTINENT_EMOJI = {
    "Afrique": "🌍",
    "Amérique du Nord": "🌎",
    "Amérique du Sud": "🌎",
    "Asie": "🌏",
    "Europe": "🌍",
    "Océanie": "🌏"
  };

  return { $, $$, shuffle, flagEmoji, flagUrl, humanize, loadJSON, showScreen, worldSvg, CONTINENT_EMOJI };
})();
