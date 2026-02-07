import cards from "../../assets/gameContent/cards";

const CLASS_KEYS = ["Red", "Blue", "Green", "Yellow", "Orange"];

const getSpendByClass = (deck) =>
  deck.reduce(
    (acc, cardId) => {
      const card = cards.find((c) => c.id === cardId);
      const cls = card?.class;
      const cost = card?.cost ?? 0;
      if (cls) acc[cls] = (acc[cls] ?? 0) + cost;
      return acc;
    },
    { Red: 0, Blue: 0, Green: 0, Yellow: 0, Orange: 0 }
  );

export const buildFixedLimits = (value = 5) =>
  CLASS_KEYS.reduce((acc, cls) => {
    acc[cls] = value;
    return acc;
  }, {});

export const buildRandomDeck = (limits) => {
  const canAfford = (deck, card) => {
    const spend = getSpendByClass(deck);
    return (spend[card.class] ?? 0) + card.cost <= (limits[card.class] ?? 0);
  };

  for (let tryCount = 0; tryCount < 200; tryCount += 1) {
    const deck = [];
    let attempts = 0;
    while (deck.length < 16 && attempts < 12000) {
      attempts += 1;
      const card = cards[Math.floor(Math.random() * cards.length)];
      if (!card) continue;
      if (!canAfford(deck, card)) continue;
      deck.push(card.id);
    }
    if (deck.length === 16) return deck;
  }

  return [];
};

export const buildRacersForTheme = (theme, count = 4) => {
  const pieces = theme?.pieces ?? [];
  const pooled = theme?.namePool ?? [];
  const fixed = theme?.nameStyle === "fixed";
  const shuffledPieces = [...pieces].sort(() => Math.random() - 0.5);
  const shuffledNames = [...pooled].sort(() => Math.random() - 0.5);

  return Array.from({ length: count }, (_, idx) => {
    const piece = shuffledPieces[idx % shuffledPieces.length];
    const name = fixed
      ? piece?.name ?? `Racer ${idx + 1}`
      : shuffledNames[idx % shuffledNames.length] ?? `Racer ${idx + 1}`;
    return {
      id: `player${idx + 1}`,
      name,
      type: "ai",
      pieceId: piece?.id ?? `piece-${idx + 1}`,
      color: piece?.color ?? "#ffffff",
      image: piece?.image ?? null,
      icon: piece?.icon ?? null,
    };
  });
};
