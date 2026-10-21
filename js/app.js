window.FC = window.FC || {};

(function () {
  const U = FC.utils;
  const { $ } = U;

  FC.settings = {
    deck: "capitals",
    direction: "pc",
    continent: "all",
    size: 15
  };

  function init() {
    FC.ui.home.init();
    FC.ui.game.init();

    $("#start-btn").addEventListener("click", FC.ui.game.startSession);
    $("#replay-btn").addEventListener("click", FC.ui.game.startSession);
    $("#home-btn").addEventListener("click", FC.ui.end.goHome);
    $("#quit-btn").addEventListener("click", FC.ui.end.goHome);

    FC.ui.home.renderHomeStats();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
