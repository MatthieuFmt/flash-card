window.FC = window.FC || {};

FC.srs = (function () {
  const MIN_EASE = 1.3;
  const MAX_EASE = 3.0;
  const LAPSE_DELAY = 10 * 60 * 1000;
  const DAY = 86400000;

  function getState(deckId, iso, dir) {
    const deck = FC.storage.srs[deckId];
    const p = deck && deck[iso];
    if (p && p[dir]) return p[dir];
    return { due: 0, interval: 0, ease: 2.5, reps: 0 };
  }

  function setState(deckId, iso, dir, state) {
    if (!FC.storage.srs[deckId]) FC.storage.srs[deckId] = {};
    if (!FC.storage.srs[deckId][iso]) FC.storage.srs[deckId][iso] = {};
    FC.storage.srs[deckId][iso][dir] = state;
    FC.storage.saveSRS();
  }

  function isDue(deckId, iso, dir) {
    return getState(deckId, iso, dir).due <= Date.now();
  }

  function schedule(state, grade) {
    if (grade === 0) {
      state.reps = 0;
      state.interval = 0;
      state.ease = Math.max(MIN_EASE, state.ease - 0.2);
      state.due = Date.now() + LAPSE_DELAY;
      return;
    }
    state.reps++;
    if (state.reps === 1) {
      state.interval = grade === 1 ? 1 : grade === 2 ? 3 : 5;
    } else if (grade === 1) {
      state.interval = Math.max(1, Math.round(state.interval * 1.2));
    } else if (grade === 2) {
      state.interval = Math.max(1, Math.round(state.interval * state.ease));
    } else {
      state.interval = Math.max(1, Math.round(state.interval * state.ease * 1.3));
    }
    if (grade === 1) state.ease = Math.max(MIN_EASE, state.ease - 0.15);
    else if (grade === 3) state.ease = Math.min(MAX_EASE, state.ease + 0.15);
    state.due = Date.now() + state.interval * DAY;
  }

  return { getState, setState, isDue, schedule, DAY };
})();
