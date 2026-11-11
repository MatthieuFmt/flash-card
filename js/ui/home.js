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

  function continentFilter(c) {
    const sel = FC.settings.continents;
    return sel.length === 0 || sel.includes("all") || sel.includes(c.continent);
  }

  function syncContinentButtons() {
    const sel = FC.settings.continents;
    $$("#continent-options button").forEach((b) =>
      b.classList.toggle("selected", sel.includes(b.dataset.continent))
    );
  }

  function wireContinentOptions() {
    $$("#continent-options button").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.continent;
        if (id === "all") {
          FC.settings.continents = ["all"];
        } else {
          let sel = FC.settings.continents.filter((c) => c !== "all");
          if (sel.includes(id)) {
            sel = sel.filter((c) => c !== id);
          } else {
            sel.push(id);
          }
          FC.settings.continents = sel.length ? sel : ["all"];
        }
        syncContinentButtons();
        renderHomeStats();
      });
    });
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
        if (deck.available && !deck.available(c)) continue;
        for (const dir of deck.directions) {
          if (FC.srs.getState(deck.id, c.iso, dir.id).reps >= 1) learned++;
        }
      }
    }
    $("#stat-learned").textContent = learned;

    const deck = currentDeck();
    const dirs = currentDirectionIds();
    const countries = FC.COUNTRIES.filter(
      (c) =>
        continentFilter(c) &&
        (!deck.available || deck.available(c))
    );
    let due = 0;
    let learnedDue = 0;
    let nextDue = Infinity;
    for (const c of countries) {
      for (const dir of dirs) {
        const st = FC.srs.getState(deck.id, c.iso, dir);
        if (st.due <= Date.now()) {
          due++;
          if (st.reps >= 1) learnedDue++;
        } else if (st.due < nextDue) {
          nextDue = st.due;
        }
      }
    }
    $("#review-due").textContent = due;
    $("#review-next").textContent =
      nextDue === Infinity
        ? "⏳ Aucune révision planifiée"
        : `⏳ Prochaine révision : dans ${U.humanize(nextDue - Date.now())}`;

    const reviewBtn = $("#review-btn");
    reviewBtn.textContent = learnedDue > 0 ? `🔄 Révision (${learnedDue})` : "🔄 Révision";
    reviewBtn.disabled = learnedDue === 0;
    reviewBtn.classList.toggle("selected", FC.settings.review);
  }

  function nextReviewText() {
    const deck = currentDeck();
    const dirs = currentDirectionIds();
    const countries = FC.COUNTRIES.filter(
      (c) =>
        continentFilter(c) &&
        (!deck.available || deck.available(c))
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
    wireContinentOptions();
    wireOptions("#size-options", "size", (v) => {
      FC.settings.size = v === "all" ? "all" : parseInt(v, 10);
      FC.settings.review = false;
      $("#review-btn").classList.remove("selected");
    });
    $("#review-btn").addEventListener("click", () => {
      FC.settings.review = true;
      $$("#size-options button").forEach((b) => b.classList.remove("selected"));
      $("#review-btn").classList.add("selected");
      FC.ui.game.startSession();
    });
  }

  return { init, renderHomeStats, nextReviewText };
})();
