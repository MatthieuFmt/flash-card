window.FC = window.FC || {};

FC.storage = (function () {
  const U = FC.utils;
  const STATS_KEY = "flashcards.stats.v1";
  const SRS_KEY = "flashcards.srs.v2";
  const LEGACY_KEYS = ["capitales.leitner.v1", "capitales.srs.v1", "capitales.stats.v1"];
  const DAY = 86400000;

  function migrateLegacy() {
    if (!localStorage.getItem(SRS_KEY)) {
      const migrated = {};
      const now = Date.now();

      const srsOld = U.loadJSON("capitales.srs.v1", {});
      for (const iso of Object.keys(srsOld)) {
        for (const dir of ["pc", "cp"]) {
          const st = srsOld[iso] && srsOld[iso][dir];
          if (!st) continue;
          if (!migrated.capitals) migrated.capitals = {};
          if (!migrated.capitals[iso]) migrated.capitals[iso] = {};
          migrated.capitals[iso][dir] = st;
        }
      }

      const boxes = U.loadJSON("capitales.leitner.v1", {});
      const days = [0, 0, 1, 3, 7, 14];
      for (const iso of Object.keys(boxes)) {
        for (const dir of ["pc", "cp"]) {
          const box = boxes[iso] && boxes[iso][dir];
          if (!box || box < 1) continue;
          if (migrated.capitals && migrated.capitals[iso] && migrated.capitals[iso][dir]) continue;
          const interval = days[box] || 14;
          if (!migrated.capitals) migrated.capitals = {};
          if (!migrated.capitals[iso]) migrated.capitals[iso] = {};
          migrated.capitals[iso][dir] = {
            due: interval ? now + interval * DAY : 0,
            interval: interval,
            ease: 2.5,
            reps: box >= 2 ? 1 : 0
          };
        }
      }

      if (Object.keys(migrated).length) {
        localStorage.setItem(SRS_KEY, JSON.stringify(migrated));
      }
    }

    if (!localStorage.getItem(STATS_KEY)) {
      const oldStats = U.loadJSON("capitales.stats.v1", null);
      if (oldStats) localStorage.setItem(STATS_KEY, JSON.stringify(oldStats));
    }
  }

  migrateLegacy();

  const stats = Object.assign(
    { attempts: 0, correct: 0, sessions: 0 },
    U.loadJSON(STATS_KEY, {})
  );
  const srs = U.loadJSON(SRS_KEY, {});

  function saveStats() {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  }

  function saveSRS() {
    localStorage.setItem(SRS_KEY, JSON.stringify(srs));
  }

  function reset() {
    for (const k of Object.keys(srs)) delete srs[k];
    stats.attempts = 0;
    stats.correct = 0;
    stats.sessions = 0;
    saveSRS();
    saveStats();
    LEGACY_KEYS.forEach((k) => localStorage.removeItem(k));
  }

  return { stats, srs, saveStats, saveSRS, reset };
})();
