window.FC = window.FC || {};
FC.decks = FC.decks || {};
FC.decks.list = FC.decks.list || [];

FC.decks.flags = {
  id: "flags",
  name: "Drapeaux",
  icon: "🚩",
  directions: [
    {
      id: "fp",
      label: "Drapeau → Pays",
      questionLabel: "Quel est ce pays ?",
      answerLabel: "C'est",
      front: (c) => ({ img: FC.utils.flagUrl(c.iso), text: "" }),
      back: (c) => ({ img: FC.utils.flagUrl(c.iso), text: c.name })
    },
    {
      id: "pf",
      label: "Pays → Drapeau",
      questionLabel: "Quel est le drapeau de…",
      answerLabel: "Le drapeau est",
      front: (c) => ({ emoji: "❓", text: c.name }),
      back: (c) => ({ img: FC.utils.flagUrl(c.iso), text: "" })
    }
  ]
};

FC.decks.list.push(FC.decks.flags);
