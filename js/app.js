window.FC = window.FC || {};

(function () {
  const U = FC.utils;
  const { $ } = U;

  FC.settings = {
    deck: "flags",
    direction: "fp",
    continents: ["all"],
    size: 15,
    review: false
  };

  function init() {
    FC.ui.home.init();
    FC.ui.game.init();
    FC.ui.stats.init();
    FC.ui.duel.init();

    $("#start-btn").addEventListener("click", FC.ui.game.startSession);
    $("#replay-btn").addEventListener("click", FC.ui.game.startSession);
    $("#home-btn").addEventListener("click", FC.ui.end.goHome);
    $("#quit-btn").addEventListener("click", FC.ui.end.goHome);
    $("#stats-btn").addEventListener("click", FC.ui.stats.show);
    $("#stats-back-btn").addEventListener("click", FC.ui.stats.close);
    $("#duel-btn").addEventListener("click", FC.ui.duel.showSetup);

    FC.ui.home.renderHomeStats();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
