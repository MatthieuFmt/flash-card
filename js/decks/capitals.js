window.FC = window.FC || {};
FC.decks = FC.decks || {};
FC.decks.list = FC.decks.list || [];

FC.decks.capitals = {
  id: "capitals",
  name: "Capitales",
  icon: "🏛️",
  directions: [
    {
      id: "pc",
      label: "Pays → Capitale",
      questionLabel: "Quelle est la capitale de…",
      answerLabel: "La capitale est",
      front: (c) => ({ img: FC.utils.flagUrl(c.iso), text: c.name }),
      back: (c) => ({ img: FC.utils.flagUrl(c.iso), text: c.capital[0] })
    },
    {
      id: "cp",
      label: "Capitale → Pays",
      questionLabel: "Quel pays a pour capitale…",
      answerLabel: "Le pays est",
      front: (c) => ({ emoji: "🗺️", text: c.capital[0] }),
      back: (c) => ({ img: FC.utils.flagUrl(c.iso), text: c.name })
    }
  ]
};

FC.decks.list.push(FC.decks.capitals);
