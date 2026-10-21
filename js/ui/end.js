window.FC = window.FC || {};
FC.ui = FC.ui || {};

FC.ui.end = (function () {
  const U = FC.utils;
  const { $ } = U;

  function appendPayload(container, className, payload) {
    const span = document.createElement("span");
    span.className = className;
    if (payload.img) {
      const img = document.createElement("img");
      img.className = "wi-img";
      img.src = payload.img;
      img.alt = "";
      span.appendChild(img);
    }
    const textParts = [];
    if (!payload.img && payload.emoji) textParts.push(payload.emoji);
    if (payload.text) textParts.push(payload.text);
    if (textParts.length) {
      span.appendChild(document.createTextNode((payload.img ? " " : "") + textParts.join(" ")));
    }
    container.appendChild(span);
  }

  function show(summary) {
    U.showScreen("#screen-end");
    const total = summary.total;
    const ratio = total ? summary.correct / total : 0;
    $("#end-emoji").textContent = ratio >= 0.9 ? "🏆" : ratio >= 0.7 ? "🎉" : ratio >= 0.4 ? "🙂" : "💪";
    $("#end-title").textContent = ratio >= 0.9 ? "Excellent !" : ratio >= 0.7 ? "Bien joué !" : ratio >= 0.4 ? "Pas mal !" : "Courage, ça vient !";
    $("#end-score").textContent = `${summary.correct} / ${total}`;
    $("#end-msg").textContent =
      summary.failed === 0
        ? "Sans faute ! Les prochaines révisions sont planifiées dans plusieurs jours. 🚀"
        : `${summary.failed} réponse(s) à retravailler. Les cartes oubliées reviennent dans 10 minutes, les bien mémorisées dans plusieurs jours. 📈`;

    const list = $("#wrong-list");
    list.innerHTML = "";
    if (summary.toReview.length) {
      const h = document.createElement("h3");
      h.textContent = "📝 À revoir";
      list.appendChild(h);
      for (const r of summary.toReview) {
        const div = document.createElement("div");
        div.className = "wrong-item";
        appendPayload(div, "wi-q", r.question);
        const arrow = document.createElement("span");
        arrow.className = "wi-arrow";
        arrow.textContent = "→";
        appendPayload(div, "wi-a", r.answer);
        const when = document.createElement("span");
        when.className = "wi-when";
        when.textContent = `(reviendra dans ${r.whenText})`;
        div.appendChild(arrow);
        div.appendChild(when);
        list.appendChild(div);
      }
    }
    FC.ui.home.renderHomeStats();
  }

  function goHome() {
    U.showScreen("#screen-home");
    FC.ui.home.renderHomeStats();
  }

  return { show, goHome };
})();
