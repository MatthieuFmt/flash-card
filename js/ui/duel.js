window.FC = window.FC || {};
FC.ui = FC.ui || {};

FC.ui.duel = (function () {
  const U = FC.utils;
  const { $, $$ } = U;

  const KEY_J1 = "a";
  const KEY_J2 = "l";

  let names = { j1: "Joueur 1", j2: "Joueur 2" };
  let rounds = 10;
  let countries = [];
  let roundIndex = 0;
  let scores = { j1: 0, j2: 0 };
  let buzzed = null;
  let roundBuzzer = null;
  let currentCountry = null;
  let answerLocked = false;

  function flagsCountries() {
    const deck = FC.decks.flags;
    return FC.COUNTRIES.filter((c) => c.name && (!deck.available || deck.available(c)));
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
    buzzed = null;
    roundBuzzer = null;
    answerLocked = false;
    FC.ui.end.goHome();
  }

  function renderRound() {
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

  function endRound() {
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
      scores[buzzed]++;
      updateScores();
      endRound();
      showFeedback(`Bien joué ${names[buzzed]} !`, true, currentCountry.name);
      FC.ui.confetti.burst();
      return;
    }
    if (buzzed === roundBuzzer) {
      const other = buzzed === "j1" ? "j2" : "j1";
      buzzed = other;
      const buzzerEl = $("#duel-buzzer");
      buzzerEl.classList.remove("j1", "j2");
      buzzerEl.classList.add(other);
      $("#duel-input-label").textContent = `Raté ! ${names[other]}, à toi de trouver le pays :`;
      $("#duel-input").value = "";
      $("#duel-suggestions").innerHTML = "";
      showFeedback(`Ce n'est pas ça… ${names[other]} peut tenter sa chance !`, false);
      $("#duel-input").focus();
      return;
    }
    endRound();
    showFeedback("Personne ne marque !", false, currentCountry.name);
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

  function updateSuggestions() {
    const box = $("#duel-suggestions");
    box.innerHTML = "";
    const q = U.normalizeText($("#duel-input").value);
    if (!q) return;
    const hits = flagsCountries()
      .map((c) => c.name)
      .filter((n) => U.normalizeText(n).includes(q))
      .slice(0, 8);
    for (const name of hits) {
      const btn = document.createElement("button");
      btn.className = "duel-suggestion";
      btn.textContent = name;
      btn.addEventListener("click", () => {
        $("#duel-input").value = name;
        submitAnswer(name);
      });
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

  function init() {
    wireRoundsChips();
    $("#duel-start-btn").addEventListener("click", start);
    $("#duel-quit-btn").addEventListener("click", quit);
    $("#duel-back-btn").addEventListener("click", quit);
    $("#duel-end-home-btn").addEventListener("click", quit);
    $("#duel-end-rematch-btn").addEventListener("click", rematch);
    $("#duel-next-btn").addEventListener("click", nextRound);
    $("#duel-validate-btn").addEventListener("click", () => submitAnswer());
    $("#duel-zone-j1").addEventListener("click", () => buzz("j1"));
    $("#duel-zone-j2").addEventListener("click", () => buzz("j2"));
    $("#duel-input").addEventListener("input", updateSuggestions);
    $("#duel-input").addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        submitAnswer();
      }
    });
    document.addEventListener("keydown", onKey);
  }

  return { init, showSetup };
})();
