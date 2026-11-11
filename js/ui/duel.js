window.FC = window.FC || {};
FC.ui = FC.ui || {};

FC.ui.duel = (function () {
  const U = FC.utils;
  const { $, $$ } = U;

  const KEY_J1 = "a";
  const KEY_J2 = "l";
  const ANSWER_TIME_S = 40;

  let names = { j1: "Joueur 1", j2: "Joueur 2" };
  let rounds = 10;
  let continents = ["all"];
  let countries = [];
  let roundIndex = 0;
  let scores = { j1: 0, j2: 0 };
  let buzzed = null;
  let roundBuzzer = null;
  let currentCountry = null;
  let answerLocked = false;
  let timerId = null;
  let timeLeft = 0;

  function continentOk(c) {
    return continents.length === 0 || continents.includes("all") || continents.includes(c.continent);
  }

  function flagsCountries() {
    const deck = FC.decks.flags;
    return FC.COUNTRIES.filter(
      (c) => c.name && continentOk(c) && (!deck.available || deck.available(c))
    );
  }

  function buildPool() {
    const pool = U.shuffle(flagsCountries());
    countries = pool.slice(0, Math.min(rounds, pool.length));
  }

  function showSetup() {
    U.showScreen("#screen-duel-setup");
  }

  function start() {
    names.j1 = $("#duel-name-j1").value.trim() || "Joueur 1";
    names.j2 = $("#duel-name-j2").value.trim() || "Joueur 2";
    $("#duel-zone-name-j1").textContent = names.j1;
    $("#duel-zone-name-j2").textContent = names.j2;
    buildPool();
    roundIndex = 0;
    scores = { j1: 0, j2: 0 };
    buzzed = null;
    roundBuzzer = null;
    answerLocked = false;
    U.showScreen("#screen-duel");
    renderRound();
  }

  function rematch() {
    buildPool();
    roundIndex = 0;
    scores = { j1: 0, j2: 0 };
    buzzed = null;
    roundBuzzer = null;
    answerLocked = false;
    U.showScreen("#screen-duel");
    renderRound();
  }

  function quit() {
    clearTimer();
    buzzed = null;
    roundBuzzer = null;
    answerLocked = false;
    FC.ui.end.goHome();
  }

  function renderRound() {
    clearTimer();
    currentCountry = countries[roundIndex];
    buzzed = null;
    roundBuzzer = null;
    answerLocked = false;
    $("#duel-round").textContent = `Manche ${roundIndex + 1} / ${countries.length}`;
    updateScores();
    $("#duel-flag").src = U.flagUrl(currentCountry.iso);
    $("#duel-answer-area").hidden = true;
    $("#duel-feedback").hidden = true;
    $("#duel-next-btn").hidden = true;
    $("#duel-input").value = "";
    $("#duel-suggestions").innerHTML = "";
    const buzzerEl = $("#duel-buzzer");
    buzzerEl.classList.remove("j1", "j2");
    buzzerEl.classList.add("active");
  }

  function updateScores() {
    $("#duel-score-j1").textContent = `${names.j1} : ${scores.j1}`;
    $("#duel-score-j2").textContent = `${names.j2} : ${scores.j2}`;
  }

  function buzz(player) {
    if (buzzed || answerLocked || !currentCountry) return;
    buzzed = player;
    roundBuzzer = player;
    const buzzerEl = $("#duel-buzzer");
    buzzerEl.classList.remove("active");
    buzzerEl.classList.add(player);
    $("#duel-input-label").textContent = `${player === "j1" ? names.j1 : names.j2}, écris le pays :`;
    $("#duel-answer-area").hidden = false;
    $("#duel-input").value = "";
    $("#duel-suggestions").innerHTML = "";
    $("#duel-input").focus();
    startTimer();
  }

  function correctNames() {
    return [currentCountry.name].concat(currentCountry.aliases || []);
  }

  function matches(target, guess) {
    const t = U.normalizeText(target);
    const g = U.normalizeText(guess);
    if (!g) return false;
    if (t === g) return true;
    const tolerance = Math.max(1, Math.floor(t.length / 5));
    return U.levenshtein(g, t) <= tolerance;
  }

  function showFeedback(text, ok, answer) {
    const fb = $("#duel-feedback");
    fb.hidden = false;
    fb.className = "duel-feedback " + (ok ? "ok" : "ko");
    $("#duel-feedback-text").textContent = text;
    const reveal = $("#duel-answer-reveal");
    if (answer) {
      reveal.hidden = false;
      $("#duel-answer-flag").textContent = U.flagEmoji(currentCountry.iso);
      $("#duel-answer-name").textContent = answer;
    } else {
      reveal.hidden = true;
    }
  }

  function renderTimer() {
    $("#duel-timer-text").textContent = Math.ceil(timeLeft) + "s";
    $("#duel-timer-fill").style.width = `${(timeLeft / ANSWER_TIME_S) * 100}%`;
    $("#duel-timer").classList.toggle("warning", timeLeft <= 10);
  }

  function tickTimer() {
    timeLeft -= 0.1;
    if (timeLeft <= 0) {
      clearTimer();
      giveUp("timeout");
    } else {
      renderTimer();
    }
  }

  function startTimer() {
    clearTimer();
    timeLeft = ANSWER_TIME_S;
    renderTimer();
    timerId = setInterval(tickTimer, 100);
  }

  function clearTimer() {
    if (timerId) {
      clearInterval(timerId);
      timerId = null;
    }
  }

  function giveUp(reason) {
    if (answerLocked || !buzzed || !currentCountry) return;
    if (buzzed === roundBuzzer) {
      const first = roundBuzzer;
      const other = buzzed === "j1" ? "j2" : "j1";
      buzzed = other;
      const buzzerEl = $("#duel-buzzer");
      buzzerEl.classList.remove("j1", "j2");
      buzzerEl.classList.add(other);
      $("#duel-input-label").textContent =
        reason === "wrong"
          ? `Raté ! ${names[other]}, à toi de trouver le pays :`
          : `${names[other]}, à toi de trouver le pays :`;
      $("#duel-input").value = "";
      $("#duel-suggestions").innerHTML = "";
      let msg;
      if (reason === "idk") {
        msg = `${names[first]} ne sait pas… ${names[other]} peut tenter sa chance !`;
      } else if (reason === "timeout") {
        msg = `⏳ Temps écoulé ! ${names[other]} peut tenter sa chance !`;
      } else {
        msg = `Ce n'est pas ça… ${names[other]} peut tenter sa chance !`;
      }
      showFeedback(msg, false);
      startTimer();
      $("#duel-input").focus();
      return;
    }
    endRound();
    showFeedback(
      reason === "timeout" ? "⏳ Temps écoulé, personne ne marque !" : "Personne ne marque !",
      false,
      currentCountry.name
    );
  }

  function endRound() {
    clearTimer();
    answerLocked = true;
    $("#duel-answer-area").hidden = true;
    $("#duel-buzzer").classList.remove("active", "j1", "j2");
    $("#duel-next-btn").hidden = false;
  }

  function submitAnswer(value) {
    if (answerLocked || !buzzed || !currentCountry) return;
    const guess = (value !== undefined ? value : $("#duel-input").value).trim();
    if (!guess) return;
    const ok = correctNames().some((n) => matches(n, guess));
    if (ok) {
      clearTimer();
      scores[buzzed]++;
      updateScores();
      endRound();
      showFeedback(`Bien joué ${names[buzzed]} !`, true, currentCountry.name);
      FC.ui.confetti.burst();
      return;
    }
    giveUp("wrong");
  }

  function nextRound() {
    roundIndex++;
    if (roundIndex >= countries.length) {
      showEnd();
    } else {
      renderRound();
    }
  }

  function showEnd() {
    U.showScreen("#screen-duel-end");
    const win = scores.j1 === scores.j2 ? null : scores.j1 > scores.j2 ? "j1" : "j2";
    $("#duel-end-emoji").textContent = win === null ? "🤝" : "🏆";
    $("#duel-end-title").textContent = win === null ? "Égalité !" : `${names[win]} remporte le duel !`;
    $("#duel-end-names").textContent = `${names.j1} vs ${names.j2}`;
    $("#duel-end-score").textContent = `${scores.j1} — ${scores.j2}`;
  }

  function chooseSuggestion(btn) {
    if (btn.classList.contains("picked")) return;
    btn.classList.add("picked");
    const name = btn.textContent;
    $("#duel-input").value = name;
    submitAnswer(name);
  }

  function updateSuggestions() {
    const box = $("#duel-suggestions");
    box.innerHTML = "";
    const q = U.normalizeText($("#duel-input").value);
    if (!q) return;
    const hits = [];
    const seen = {};
    for (const c of flagsCountries()) {
      if (seen[c.name]) continue;
      const names = [c.name].concat(c.aliases || []);
      if (names.some((n) => U.normalizeText(n).includes(q))) {
        seen[c.name] = true;
        hits.push(c.name);
      }
    }
    for (const name of hits.slice(0, 8)) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "duel-suggestion";
      btn.textContent = name;
      btn.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        chooseSuggestion(btn);
      });
      btn.addEventListener("click", () => chooseSuggestion(btn));
      box.appendChild(btn);
    }
  }

  function onKey(e) {
    if ($("#screen-duel").hidden) return;
    if (e.target === $("#duel-input")) return;
    const k = (e.key || "").toLowerCase();
    if (k === KEY_J1) {
      e.preventDefault();
      buzz("j1");
    } else if (k === KEY_J2) {
      e.preventDefault();
      buzz("j2");
    }
  }

  function wireRoundsChips() {
    $$("#duel-rounds-options button").forEach((btn) => {
      btn.addEventListener("click", () => {
        rounds = parseInt(btn.dataset.duelRounds, 10);
        $$("#duel-rounds-options button").forEach((b) => b.classList.remove("selected"));
        btn.classList.add("selected");
      });
    });
  }

  function syncContinentButtons() {
    $$("#duel-continent-options button").forEach((b) =>
      b.classList.toggle("selected", continents.includes(b.dataset.continent))
    );
  }

  function wireContinentOptions() {
    $$("#duel-continent-options button").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.continent;
        if (id === "all") {
          continents = ["all"];
        } else {
          let sel = continents.filter((c) => c !== "all");
          if (sel.includes(id)) {
            sel = sel.filter((c) => c !== id);
          } else {
            sel.push(id);
          }
          continents = sel.length ? sel : ["all"];
        }
        syncContinentButtons();
      });
    });
  }

  function init() {
    wireRoundsChips();
    wireContinentOptions();
    $("#duel-start-btn").addEventListener("click", start);
    $("#duel-quit-btn").addEventListener("click", quit);
    $("#duel-back-btn").addEventListener("click", quit);
    $("#duel-end-home-btn").addEventListener("click", quit);
    $("#duel-end-rematch-btn").addEventListener("click", rematch);
    $("#duel-next-btn").addEventListener("click", nextRound);
    $("#duel-validate-btn").addEventListener("click", () => submitAnswer());
    $("#duel-idk-btn").addEventListener("click", () => giveUp("idk"));
    $("#duel-zone-j1").addEventListener("click", () => buzz("j1"));
    $("#duel-zone-j2").addEventListener("click", () => buzz("j2"));
    $("#duel-input").addEventListener("input", updateSuggestions);
    $("#duel-input").addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        const picked = $("#duel-suggestions .duel-suggestion.highlight");
        if (picked) {
          chooseSuggestion(picked);
        } else {
          submitAnswer();
        }
      } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        const btns = $$("#duel-suggestions .duel-suggestion");
        if (!btns.length) return;
        e.preventDefault();
        let idx = btns.findIndex((b) => b.classList.contains("highlight"));
        if (e.key === "ArrowDown") {
          idx = idx < 0 ? 0 : Math.min(idx + 1, btns.length - 1);
        } else {
          idx = idx < 0 ? btns.length - 1 : Math.max(idx - 1, 0);
        }
        btns.forEach((b) => b.classList.remove("highlight"));
        btns[idx].classList.add("highlight");
        btns[idx].scrollIntoView({ block: "nearest" });
      }
    });
    document.addEventListener("keydown", onKey);
  }

  return { init, showSetup };
})();
