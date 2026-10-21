window.FC = window.FC || {};
FC.decks = FC.decks || {};
FC.decks.list = FC.decks.list || [];

FC.decks.world = {
  id: "world",
  name: "Carte du monde",
  icon: "🗺️",
  available: (c) => !!FC.WORLD[c.iso],
  directions: [
    {
      id: "mp",
      label: "Carte → Pays",
      questionLabel: "Quel est ce pays ?",
      answerLabel: "C'est",
      front: (c) => ({ svg: FC.utils.worldSvg(c.iso), text: "" }),
      back: (c) => ({ svg: FC.utils.worldSvg(c.iso), text: c.name })
    },
    {
      id: "pm",
      label: "Pays → Carte",
      questionLabel: "Où se trouve…",
      answerLabel: "Le voici",
      front: (c) => ({ emoji: "❓", text: c.name }),
      back: (c) => ({ svg: FC.utils.worldSvg(c.iso), text: "" })
    }
  ]
};

FC.decks.list.push(FC.decks.world);
