window.FC = window.FC || {};
FC.ui = FC.ui || {};

FC.ui.home = (function () {
  const U = FC.utils;
  const { $, $$ } = U;

  function currentDeck() {
    return FC.decks[FC.settings.deck] || FC.decks.list[0];
  }

  function currentDirectionIds() {
    const deck = currentDeck();
    return FC.settings.direction === "mix"
      ? deck.directions.map((d) => d.id)
      : [FC.settings.direction];
  }

  function wireOptions(containerSel, attr, cb) {
    $$(`${containerSel} button`).forEach((btn) => {
      btn.addEventListener("click", () => {
        $$(`${containerSel} button`).forEach((b) => b.classList.remove("selected"));
        btn.classList.add("selected");
        cb(btn.dataset[attr]);
      });
    });
  }

  function renderDeckOptions() {
    const container = $("#deck-options");
    container.innerHTML = "";
    for (const deck of FC.decks.list) {
      const btn = document.createElement("button");
      btn.className = "deck-card" + (deck.id === FC.settings.deck ? " selected" : "");
      btn.dataset.deck = deck.id;
      const icon = document.createElement("span");
      icon.className = "deck-icon";
      icon.textContent = deck.icon;
      const label = document.createElement("span");
      label.textContent = deck.name;
      btn.appendChild(icon);
      btn.appendChild(label);
      btn.addEventListener("click", () => {
        FC.settings.deck = deck.id;
        FC.settings.direction = deck.directions[0].id;
        $$("#deck-options button").forEach((b) => b.classList.remove("selected"));
        btn.classList.add("selected");
        renderDirectionOptions();
        renderHomeStats();
      });
      container.appendChild(btn);
    }
  }

  function renderDirectionOptions() {
    const deck = currentDeck();
    const container = $("#direction-options");
    container.innerHTML = "";
    const items = deck.directions.concat([{ id: "mix", label: "Les deux 🎲" }]);
    for (const d of items) {
      const btn = document.createElement("button");
      btn.className = "chip" + (d.id === FC.settings.direction ? " selected" : "");
      btn.dataset.dir = d.id;
      btn.textContent = d.label;
      btn.addEventListener("click", () => {
        FC.settings.direction = d.id;
        $$("#direction-options button").forEach((b) => b.classList.remove("selected"));
        btn.classList.add("selected");
        renderHomeStats();
      });
      container.appendChild(btn);
    }
  }

  function renderHomeStats() {
    const stats = FC.storage.stats;
    const attempts = stats.attempts || 0;
    const rate = attempts ? Math.round((stats.correct / attempts) * 100) : 0;
    $("#stat-success").textContent = rate;
    $("#stat-attempts").textContent = attempts;

    let learned = 0;
    for (const deck of FC.decks.list) {
      for (const c of FC.COUNTRIES) {
        for (const dir of deck.directions) {
          if (FC.srs.getState(deck.id, c.iso, dir.id).reps >= 1) learned++;
        }
      }
    }
    $("#stat-learned").textContent = learned;

    const deck = currentDeck();
    const dirs = currentDirectionIds();
    const countries = FC.COUNTRIES.filter(
      (c) => FC.settings.continent === "all" || c.continent === FC.settings.continent
    );
    let due = 0;
    let nextDue = Infinity;
    for (const c of countries) {
      for (const dir of dirs) {
        const st = FC.srs.getState(deck.id, c.iso, dir);
        if (st.due <= Date.now()) due++;
        else if (st.due < nextDue) nextDue = st.due;
      }
    }
    $("#review-due").textContent = due;
    $("#review-next").textContent =
      nextDue === Infinity
        ? "⏳ Aucune révision planifiée"
        : `⏳ Prochaine révision : dans ${U.humanize(nextDue - Date.now())}`;
  }

  function nextReviewText() {
    const deck = currentDeck();
    const dirs = currentDirectionIds();
    const countries = FC.COUNTRIES.filter(
      (c) => FC.settings.continent === "all" || c.continent === FC.settings.continent
    );
    let nextDue = Infinity;
    for (const c of countries) {
      for (const dir of dirs) {
        const st = FC.srs.getState(deck.id, c.iso, dir);
        if (st.due > Date.now() && st.due < nextDue) nextDue = st.due;
      }
    }
    return nextDue === Infinity
      ? "Aucune révision planifiée."
      : `Prochaine révision : dans ${U.humanize(nextDue - Date.now())}.`;
  }

  function init() {
    renderDeckOptions();
    renderDirectionOptions();
    wireOptions("#continent-options", "continent", (v) => {
      FC.settings.continent = v;
      renderHomeStats();
    });
    wireOptions("#size-options", "size", (v) => {
      FC.settings.size = v === "all" ? "all" : parseInt(v, 10);
    });
  }

  return { init, renderHomeStats, nextReviewText };
})();
