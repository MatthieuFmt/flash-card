window.FC = window.FC || {};
FC.ui = FC.ui || {};

FC.ui.game = (function () {
  const U = FC.utils;
  const { $, $$ } = U;

  const GRADE_KEYS = { "1": 0, "2": 1, "3": 2, "4": 3 };

  let queue = [];
  let results = {};
  let answered = 0;
  let sessionCorrect = 0;
  let sessionFailed = 0;
  let backContentTimer = null;
  let backContentReady = true;

  function deck() {
    return FC.decks[FC.settings.deck];
  }

  function directionIds() {
    return FC.settings.direction === "mix"
      ? deck().directions.map((d) => d.id)
      : [FC.settings.direction];
  }

  function directionById(id) {
    return deck().directions.find((d) => d.id === id);
  }

  function buildQueue() {
    const countries = FC.COUNTRIES.filter(
      (c) =>
        (FC.settings.continent === "all" || c.continent === FC.settings.continent) &&
        (!deck().available || deck().available(c))
    );
    const dirs = directionIds();
    const cards = [];
    for (const c of countries) {
      for (const dir of dirs) {
        if (FC.srs.isDue(deck().id, c.iso, dir)) cards.push({ country: c, dir: dir });
      }
    }
    const shuffled = U.shuffle(cards);
    shuffled.sort(
      (a, b) =>
        FC.srs.getState(deck().id, a.country.iso, a.dir).due -
        FC.srs.getState(deck().id, b.country.iso, b.dir).due
    );
    const quota = FC.settings.size === "all" ? shuffled.length : FC.settings.size;
    return shuffled.slice(0, quota);
  }

  function startSession() {
    queue = buildQueue();
    if (queue.length === 0) {
      U.showScreen("#screen-home");
      FC.ui.home.renderHomeStats();
      $("#home-notice").textContent = `🎉 Aucune carte à réviser pour le moment ! ${FC.ui.home.nextReviewText()}`;
      $("#home-notice").hidden = false;
      return;
    }
    FC.storage.stats.sessions++;
    FC.storage.saveStats();
    results = {};
    answered = 0;
    sessionCorrect = 0;
    sessionFailed = 0;
    if (backContentTimer) {
      clearTimeout(backContentTimer);
      backContentTimer = null;
    }
    backContentReady = true;
    $("#home-notice").hidden = true;
    U.showScreen("#screen-game");
    renderCard();
  }

  function updateHints(text) {
    $("#key-hints").textContent = "⌨️ " + text;
  }

  function renderCard() {
    const item = queue[0];
    const dir = directionById(item.dir);
    const country = item.country;
    const front = dir.front(country);
    const badge = `${U.CONTINENT_EMOJI[country.continent]} ${country.continent}`;
    const total = answered + queue.length;

    $("#game-progress-text").textContent = `${deck().icon} Carte ${answered + 1} / ${total}`;
    $("#progressbar-fill").style.width = `${(answered / total) * 100}%`;
    $("#game-score-ok").textContent = `✓ ${sessionCorrect}`;
    $("#game-score-ko").textContent = `✗ ${sessionFailed}`;

    const card = $("#flip-area");
    const wasFlipped = card.classList.contains("flipped");
    card.classList.remove("flipped", "shake");
    $("#card-badge").textContent = badge;
    $("#card-badge-back").textContent = badge;
    setCardMedia("#card-flag-img-front", "#card-flag-front", "#card-map-front", front);
    $("#card-question-label").textContent = dir.questionLabel;
    $("#card-question").textContent = front.text;
    $("#card-question").style.display = front.text ? "" : "none";
    $("#flip-actions").hidden = true;
    if (wasFlipped) {
      backContentReady = false;
      scheduleBackContent();
    } else {
      applyBackContent();
    }
    updateHints("Espace ou clic : révéler la réponse");
  }

  function scheduleBackContent() {
    if (backContentTimer) clearTimeout(backContentTimer);
    backContentTimer = setTimeout(() => {
      backContentTimer = null;
      applyBackContent();
      backContentReady = true;
    }, 600);
  }

  function applyBackContent() {
    const item = queue[0];
    if (!item) return;
    const dir = directionById(item.dir);
    const country = item.country;
    const back = dir.back(country);
    $("#card-answer-label").textContent = dir.answerLabel;
    $("#card-answer").textContent = back.text;
    $("#card-answer").style.display = back.text ? "" : "none";

    const flag = $("#country-flag");
    flag.src = U.flagUrl(country.iso);
    flag.hidden = false;

    const mapEl = $("#country-map");
    const svg = U.worldSvg(country.iso, true);
    if (svg) {
      mapEl.innerHTML = svg;
      mapEl.hidden = false;
    } else {
      mapEl.hidden = true;
      mapEl.innerHTML = "";
    }

    const infoEl = $("#country-info");
    const info = FC.COUNTRY_INFO && FC.COUNTRY_INFO[country.iso];
    if (info) {
      infoEl.innerHTML = "";
      const chips = [];
      if (info.languages) {
        let langText = info.languages.join(" · ");
        if (info.languages.length > 3) {
          langText = info.languages.slice(0, 3).join(" · ") + ` +${info.languages.length - 3} autres`;
        }
        chips.push(["🗣️", langText]);
      }
      if (info.currency) {
        const curs = info.currency.split(", ");
        let curText = curs.join(", ");
        if (curs.length > 2) {
          curText = curs.slice(0, 2).join(", ") + ` +${curs.length - 2} autres`;
        }
        chips.push(["💰", curText]);
      }
      if (info.population) chips.push(["👥", info.population]);
      for (const [icon, text] of chips) {
        const span = document.createElement("span");
        span.className = "ci-chip";
        const i = document.createElement("span");
        i.className = "ci-icon";
        i.textContent = icon;
        span.appendChild(i);
        span.appendChild(document.createTextNode(" " + text));
        infoEl.appendChild(span);
      }
      infoEl.hidden = chips.length === 0;
    } else {
      infoEl.hidden = true;
    }
  }

  function setCardMedia(imgSel, emojiSel, mapSel, payload) {
    const img = $(imgSel);
    const emoji = $(emojiSel);
    const map = $(mapSel);
    if (payload.svg) {
      map.innerHTML = payload.svg;
      map.hidden = false;
      img.hidden = true;
      img.removeAttribute("src");
      emoji.hidden = true;
      emoji.textContent = "";
    } else if (payload.img) {
      map.hidden = true;
      map.innerHTML = "";
      img.src = payload.img;
      img.hidden = false;
      emoji.hidden = true;
    } else {
      map.hidden = true;
      map.innerHTML = "";
      img.hidden = true;
      img.removeAttribute("src");
      emoji.hidden = false;
      emoji.textContent = payload.emoji || "";
    }
  }

  function flipReveal() {
    const card = $("#flip-area");
    if (card.classList.contains("flipped") || !backContentReady) return;
    card.classList.add("flipped");
    $("#flip-actions").hidden = false;
    updateHints("1 : pas du tout • 2 : à peine • 3 : un peu • 4 : très bien");
  }

  function shakeElement(el) {
    el.classList.remove("shake");
    void el.offsetWidth;
    el.classList.add("shake");
  }

  function buildSummary() {
    const toReview = Object.values(results)
      .filter((r) => r.grade <= 1)
      .map((r) => {
        const dir = directionById(r.item.dir);
        const st = FC.srs.getState(deck().id, r.item.country.iso, r.item.dir);
        const q = dir.front(r.item.country);
        const a = dir.back(r.item.country);
        const dupMedia = (q.img && q.img === a.img) || (q.svg && a.svg);
        return {
          question: q,
          answer: dupMedia ? { text: a.text, emoji: a.emoji } : a,
          whenText: U.humanize(st.due - Date.now())
        };
      });
    return { total: answered, correct: sessionCorrect, failed: sessionFailed, toReview: toReview };
  }

  function answerCurrent(grade) {
    const item = queue.shift();
    if (!item) return;
    const state = FC.srs.getState(deck().id, item.country.iso, item.dir);
    FC.srs.schedule(state, grade);
    FC.srs.setState(deck().id, item.country.iso, item.dir, state);

    const stats = FC.storage.stats;
    stats.attempts++;
    if (grade >= 2) stats.correct++;
    FC.storage.saveStats();

    results[`${item.country.iso}|${item.dir}`] = { item: item, grade: grade };
    answered++;

    if (grade >= 2) {
      sessionCorrect++;
      FC.ui.confetti.burst();
    } else {
      sessionFailed++;
      shakeElement($("#flip-area"));
    }
    if (grade === 0) queue.push(item);

    if (queue.length === 0) {
      FC.ui.end.show(buildSummary());
    } else {
      renderCard();
    }
  }

  function init() {
    $("#flip-area").addEventListener("click", flipReveal);
    $("#flip-area").addEventListener("keydown", (e) => {
      const flipped = $("#flip-area").classList.contains("flipped");
      if (!flipped && (e.key === " " || e.key === "Enter")) {
        e.preventDefault();
        flipReveal();
      } else if (flipped && GRADE_KEYS[e.key] !== undefined) {
        e.preventDefault();
        answerCurrent(GRADE_KEYS[e.key]);
      }
    });

    $("#grade0-btn").addEventListener("click", () => answerCurrent(0));
    $("#grade1-btn").addEventListener("click", () => answerCurrent(1));
    $("#grade2-btn").addEventListener("click", () => answerCurrent(2));
    $("#grade3-btn").addEventListener("click", () => answerCurrent(3));

    document.addEventListener("keydown", (e) => {
      if ($("#screen-game").hidden) return;
      if (e.target === $("#flip-area")) return;
      const flipped = $("#flip-area").classList.contains("flipped");
      if ((e.key === " " || e.key === "Enter") && !flipped) {
        e.preventDefault();
        flipReveal();
      } else if (flipped && GRADE_KEYS[e.key] !== undefined) {
        e.preventDefault();
        answerCurrent(GRADE_KEYS[e.key]);
      }
    });
  }

  return { init, startSession };
})();
