window.FC = window.FC || {};
FC.ui = FC.ui || {};

FC.ui.stats = (function () {
  const U = FC.utils;
  const { $, $$ } = U;

  const DAY = 86400000;

  const COLORS = {
    rate: "#8b5cf6",
    activity: "#22d3ee",
    learned: "#34d399"
  };

  const SRS_BUCKETS = [
    { label: "Nouvelles", color: "#fbbf24" },
    { label: "Court · 1-3 j", color: "#22d3ee" },
    { label: "Moyen · 4-14 j", color: "#6366f1" },
    { label: "Long · 15 j+", color: "#34d399" }
  ];

  let deckFilter = "all";
  let periodFilter = "30";

  function dayKey(d) {
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}-${m}-${day}`;
  }

  function addDays(d, n) {
    const out = new Date(d.getTime());
    out.setDate(out.getDate() + n);
    return out;
  }

  function parseDay(key) {
    const parts = key.split("-");
    return new Date(+parts[0], +parts[1] - 1, +parts[2]);
  }

  function entryFor(key) {
    const e = FC.storage.history[key];
    if (!e) return null;
    if (deckFilter === "all") return e.totals || null;
    return (e.decks && e.decks[deckFilter]) || null;
  }

  function seriesKeys() {
    const history = FC.storage.history;
    if (periodFilter === "all") return Object.keys(history).sort();
    const n = parseInt(periodFilter, 10);
    const days = [];
    const today = new Date();
    for (let i = n - 1; i >= 0; i--) days.push(addDays(today, -i));
    return days.map(dayKey);
  }

  function dayLabels(keys) {
    return keys.map((k) => {
      const d = parseDay(k);
      return `${d.getDate()}/${d.getMonth() + 1}`;
    });
  }

  function hasAnyActivity() {
    const history = FC.storage.history;
    return Object.keys(history).some(
      (k) => history[k].totals && history[k].totals.attempts > 0
    );
  }

  function currentLearnedCount() {
    const decks = deckFilter === "all" ? FC.decks.list : [FC.decks[deckFilter]];
    let learned = 0;
    for (const deck of decks) {
      for (const c of FC.COUNTRIES) {
        if (deck.available && !deck.available(c)) continue;
        for (const dir of deck.directions) {
          if (FC.srs.getState(deck.id, c.iso, dir.id).reps >= 1) learned++;
        }
      }
    }
    return learned;
  }

  function rateSeries(keys) {
    return keys.map((k) => {
      const e = entryFor(k);
      if (!e || !e.attempts) return null;
      return Math.round((e.correct / e.attempts) * 100);
    });
  }

  function activitySeries(keys) {
    return keys.map((k) => {
      const e = entryFor(k);
      return e ? e.attempts : 0;
    });
  }

  function learnedSeries(keys) {
    let windowRecorded = 0;
    for (const k of keys) {
      const e = entryFor(k);
      windowRecorded += e ? e.learned : 0;
    }
    let cum = Math.max(0, currentLearnedCount() - windowRecorded);
    const out = [];
    for (const k of keys) {
      const e = entryFor(k);
      cum += e ? e.learned : 0;
      out.push(cum);
    }
    return out;
  }

  function computeStreak() {
    const history = FC.storage.history;
    const active = new Set(
      Object.keys(history).filter((k) => history[k].totals && history[k].totals.attempts > 0)
    );
    let current = 0;
    if (active.size) {
      let cursor = new Date();
      if (!active.has(dayKey(cursor))) cursor = addDays(cursor, -1);
      while (active.has(dayKey(cursor))) {
        current++;
        cursor = addDays(cursor, -1);
      }
    }
    let best = current;
    const days = Object.keys(history).sort();
    if (days.length) {
      let run = 0;
      let d = parseDay(days[0]);
      const span = Math.min(5000, Math.round((new Date() - d) / DAY) + 2);
      for (let i = 0; i < span; i++) {
        if (active.has(dayKey(d))) {
          run++;
          if (run > best) best = run;
        } else {
          run = 0;
        }
        d = addDays(d, 1);
      }
    }
    return { current: current, best: best };
  }

  function srsDistribution() {
    const decks = deckFilter === "all" ? FC.decks.list : [FC.decks[deckFilter]];
    const buckets = SRS_BUCKETS.map((b) => ({ label: b.label, color: b.color, value: 0 }));
    let total = 0;
    for (const deck of decks) {
      for (const c of FC.COUNTRIES) {
        if (deck.available && !deck.available(c)) continue;
        for (const dir of deck.directions) {
          const st = FC.srs.getState(deck.id, c.iso, dir.id);
          total++;
          const iv = st.interval;
          const bucket =
            iv === 0 ? buckets[0] : iv <= 3 ? buckets[1] : iv <= 14 ? buckets[2] : buckets[3];
          bucket.value++;
        }
      }
    }
    return { buckets: buckets, total: total };
  }

  function placeholder(text) {
    const div = document.createElement("div");
    div.className = "chart-placeholder";
    div.textContent = text;
    return div;
  }

  function renderRateChart(rates, labels) {
    const holder = $("#chart-success");
    holder.innerHTML = "";
    if (!rates.some((r) => r !== null)) {
      holder.appendChild(placeholder("Pas encore de réponses sur cette période."));
      return;
    }
    holder.appendChild(
      FC.charts.line(rates, {
        width: 560,
        height: 160,
        color: COLORS.rate,
        max: 100,
        labels: rates.map((r, i) => (r === null ? null : `${labels[i]} : ${r} %`))
      })
    );
  }

  function renderActivityChart(values, labels) {
    const holder = $("#chart-activity");
    holder.innerHTML = "";
    if (!values.some((v) => v > 0)) {
      holder.appendChild(placeholder("Aucune activité sur cette période."));
      return;
    }
    holder.appendChild(
      FC.charts.bars(values, {
        width: 560,
        height: 160,
        color: COLORS.activity,
        labels: values.map((v, i) => (v > 0 ? `${labels[i]} : ${v} tentative(s)` : null))
      })
    );
  }

  function renderLearnedChart(values, labels) {
    const holder = $("#chart-learned");
    holder.innerHTML = "";
    if (!values.some((v) => v > 0)) {
      holder.appendChild(placeholder("Les cartes apprises apparaîtront ici au fil de tes révisions."));
      return;
    }
    holder.appendChild(
      FC.charts.line(values, {
        width: 560,
        height: 160,
        color: COLORS.learned,
        labels: values.map((v, i) => `${labels[i]} : ${v} carte(s)`)
      })
    );
  }

  function renderDonut() {
    const holder = $("#chart-srs");
    const legend = $("#srs-legend");
    holder.innerHTML = "";
    legend.innerHTML = "";
    const { buckets, total } = srsDistribution();
    if (!total) {
      holder.appendChild(placeholder("Aucune carte."));
      return;
    }
    holder.appendChild(
      FC.charts.donut(
        buckets.map((b) => ({ value: b.value, color: b.color })),
        { size: 150, thickness: 26, center: String(total) }
      )
    );
    for (const b of buckets) {
      const row = document.createElement("div");
      row.className = "donut-legend-item";
      const dot = document.createElement("span");
      dot.className = "donut-legend-dot";
      dot.style.background = b.color;
      const label = document.createElement("span");
      label.textContent = b.label;
      const value = document.createElement("strong");
      value.textContent = b.value;
      row.appendChild(dot);
      row.appendChild(label);
      row.appendChild(value);
      legend.appendChild(row);
    }
  }

  function render() {
    const content = $("#stats-content");
    const empty = $("#stats-empty");
    if (!hasAnyActivity()) {
      empty.hidden = false;
      content.hidden = true;
      return;
    }
    empty.hidden = true;
    content.hidden = false;

    const keys = seriesKeys();
    const labels = dayLabels(keys);

    let attempts = 0;
    let correct = 0;
    for (const k of keys) {
      const e = entryFor(k);
      if (e) {
        attempts += e.attempts;
        correct += e.correct;
      }
    }
    $("#stats-rate").textContent = attempts ? Math.round((correct / attempts) * 100) : "–";
    $("#stats-attempts").textContent = attempts;
    $("#stats-learned").textContent = currentLearnedCount();

    const streak = computeStreak();
    $("#stat-streak").textContent = streak.current;
    $("#stat-streak-best").textContent = streak.best;

    renderRateChart(rateSeries(keys), labels);
    renderActivityChart(activitySeries(keys), labels);
    renderLearnedChart(learnedSeries(keys), labels);
    renderDonut();
  }

  function renderDeckFilter() {
    const container = $("#stats-deck-filter");
    container.innerHTML = "";
    const items = [{ id: "all", label: "Tout" }].concat(
      FC.decks.list.map((d) => ({ id: d.id, label: `${d.icon} ${d.name}` }))
    );
    for (const it of items) {
      const btn = document.createElement("button");
      btn.className = "chip" + (it.id === deckFilter ? " selected" : "");
      btn.dataset.statsDeck = it.id;
      btn.textContent = it.label;
      btn.addEventListener("click", () => {
        deckFilter = it.id;
        $$("#stats-deck-filter button").forEach((b) =>
          b.classList.toggle("selected", b.dataset.statsDeck === it.id)
        );
        render();
      });
      container.appendChild(btn);
    }
  }

  function wirePeriodFilter() {
    $$("#stats-period-filter button").forEach((btn) => {
      btn.addEventListener("click", () => {
        periodFilter = btn.dataset.statsPeriod;
        $$("#stats-period-filter button").forEach((b) =>
          b.classList.toggle("selected", b.dataset.statsPeriod === periodFilter)
        );
        render();
      });
    });
  }

  function show() {
    U.showScreen("#screen-stats");
    render();
  }

  function close() {
    FC.ui.end.goHome();
  }

  function init() {
    renderDeckFilter();
    wirePeriodFilter();
  }

  return { init, show, close };
})();
