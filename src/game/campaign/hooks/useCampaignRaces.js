import cards from "../../../assets/gameContent/cards";
import themes from "../../../assets/gameContent/themes";
import { CAMPAIGN_RACE_TABLE } from "../data/campaignRaceTable";
import { buildRandomDeck } from "../../utils/raceSetupUtils";

const CLASS_KEYS = ["Red", "Blue", "Green", "Yellow", "Orange"];

const TIER_LIMITS = Object.freeze({
  1: { max: 4, total: 16 },
  2: { max: 4, total: 17 },
  3: { max: 4, total: 18 },
  4: { max: 4, total: 19 },
  5: { max: 5, total: 20 },
  6: { max: 5, total: 21 },
  7: { max: 5, total: 22 },
  8: { max: 6, total: 24 },
  9: { max: 6, total: 26 },
  10: { max: 6, total: 28 },
});

const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

const shuffle = (arr) => {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

const generateCoinArray = (tier) => {
  const limits = TIER_LIMITS[tier] ?? TIER_LIMITS[1];
  const totals = CLASS_KEYS.reduce((acc, key) => ({ ...acc, [key]: 1 }), {});
  let remaining = limits.total - CLASS_KEYS.length;
  let safety = 200;

  while (remaining > 0 && safety > 0) {
    safety -= 1;
    const key = pickRandom(CLASS_KEYS);
    if (totals[key] >= limits.max) continue;
    totals[key] += 1;
    remaining -= 1;
  }

  return totals;
};

const cardsByClassAndCost = cards.reduce((acc, card) => {
  if (!card?.class || !card?.cost) return acc;
  if (!acc[card.class]) acc[card.class] = { 1: [], 2: [], 3: [] };
  if (!acc[card.class][card.cost]) acc[card.class][card.cost] = [];
  acc[card.class][card.cost].push(card);
  return acc;
}, {});

const pickFrom = (arr) => arr[Math.floor(Math.random() * arr.length)];

const buildOpponentDeck = (coinArray) => {
  const totalBudget = CLASS_KEYS.reduce((acc, cls) => acc + (coinArray[cls] ?? 0), 0);

  for (let attempt = 0; attempt < 40; attempt += 1) {
    const remaining = { ...coinArray };
    const deck = [];
    let remainingTotal = totalBudget;
    let safety = 2400;

    while (deck.length < 16 && safety > 0) {
      safety -= 1;
      const slotsLeft = 16 - deck.length;
      if (remainingTotal < slotsLeft) break;
      if (remainingTotal > slotsLeft * 3) break;

      const availableClasses = CLASS_KEYS.filter((cls) => (remaining[cls] ?? 0) > 0);
      if (availableClasses.length === 0) break;

      const cls = pickRandom(availableClasses);
      const maxAffordable = Math.min(remaining[cls], 3);
      const minRemaining = (slotsLeft - 1) * 1;
      const maxRemaining = (slotsLeft - 1) * 3;

      const candidateCosts = [3, 2, 1].filter(
        (cost) =>
          cost <= maxAffordable &&
          remainingTotal - cost >= minRemaining &&
          remainingTotal - cost <= maxRemaining
      );

      let picked = null;
      let chosenCost = null;
      for (const cost of candidateCosts) {
        const pool = cardsByClassAndCost?.[cls]?.[cost] ?? [];
        if (pool.length === 0) continue;
        picked = pickFrom(pool);
        chosenCost = cost;
        break;
      }

      if (!picked) continue;

      deck.push(picked.id);
      remaining[cls] -= chosenCost;
      remainingTotal -= chosenCost;
    }

    if (deck.length === 16 && remainingTotal === 0) return deck;
  }

  return buildRandomDeck(coinArray);
};

const toDeckDetails = (deck) =>
  deck.map((cardId) => {
    const card = cards.find((c) => c.id === cardId);
    return { id: cardId, cost: card?.cost ?? 0 };
  });

const pickOpponentPieces = (theme, count, playerPieceId, forceNames = null) => {
  const pieces = theme?.pieces ?? [];
  const available = pieces.filter((piece) => piece.id !== playerPieceId);
  const pool = available.length >= count ? available : pieces;

  if (forceNames && forceNames.length > 0) {
    const forcedPieces = forceNames
      .map((name) => pool.find((piece) => piece.name === name))
      .filter(Boolean);
    const needed = count - forcedPieces.length;
    const filler = shuffle(pool.filter((piece) => !forcedPieces.includes(piece))).slice(0, needed);
    return [...forcedPieces, ...filler].slice(0, count);
  }

  return shuffle(pool).slice(0, count);
};

const pickOpponentNames = (theme, pieces, count, forceNames = null) => {
  if (forceNames && forceNames.length > 0) {
    return Array.from({ length: count }, (_, idx) => forceNames[idx] ?? pieces[idx]?.name ?? `Opponent ${idx + 1}`);
  }
  if (theme?.nameStyle === "fixed") {
    return pieces.map((piece) => piece.name);
  }
  const pool = theme?.namePool ?? [];
  const shuffled = shuffle(pool);
  return Array.from({ length: count }, (_, idx) => shuffled[idx] ?? `Opponent ${idx + 1}`);
};

const pickLaps = (lapsValue) => {
  if (lapsValue === "1-2") {
    return Math.random() < 0.5 ? 1 : 2;
  }
  const parsed = Number(lapsValue);
  return Number.isFinite(parsed) ? parsed : 1;
};

export const buildCampaignRaces = ({ calendar, themeId, difficulty, playerPieceId }) => {
  const theme = themes.find((t) => t.id === themeId) ?? themes[0];
  const raceNames = theme?.raceNames ?? [];
  const raceTable = [...CAMPAIGN_RACE_TABLE, ...(theme?.raceFinals ?? [])];
  const difficultyKey =
    difficulty === "easy" ? "easy" : difficulty === "hard" ? "hard" : "normal";

  let raceIndex = 0;
  const races = [];
  const nextCalendar = calendar.map((day) => ({ ...day }));

  nextCalendar.forEach((day, dayIndex) => {
    if (day.type !== "race") return;
    raceIndex += 1;
    const tableRow =
      raceTable[raceIndex - 1] ?? raceTable[raceTable.length - 1];
    const tiers = tableRow?.tiers?.[difficultyKey] ?? [];
    const opponentCount = tiers.length;
    const forceNames = tableRow?.forceNames ?? null;
    const pieces = pickOpponentPieces(theme, opponentCount, playerPieceId, forceNames);
    const names = pickOpponentNames(theme, pieces, opponentCount, forceNames);

    const opponents = tiers.map((tier, idx) => ({
      id: `race-${raceIndex}-opp-${idx + 1}`,
      name: names[idx] ?? `Opponent ${idx + 1}`,
      tier,
      pieceId: pieces[idx]?.id ?? `piece-${idx + 1}`,
      color: pieces[idx]?.color ?? "#ffffff",
      gradient: pieces[idx]?.gradient ?? null,
      image: pieces[idx]?.image ?? null,
      icon: pieces[idx]?.icon ?? null,
      coinArray: null,
      deck: [],
      deckCards: [],
    }));

    const race = {
      id: raceIndex,
      name: raceNames[raceIndex - 1] ?? `Race ${raceIndex}`,
      themeId: theme?.id ?? themeId,
      difficulty: difficultyKey,
      laps: pickLaps(tableRow?.laps),
      rewards: tableRow?.rewards ?? {},
      opponents,
      decksGenerated: false,
    };

    races.push(race);
    nextCalendar[dayIndex] = {
      ...day,
      raceDayIndex: raceIndex,
    };
  });

  return { races, calendar: nextCalendar };
};

export const buildRaceDayDecks = (race) => {
  const opponents = race.opponents.map((opponent) => {
    const coinArray = generateCoinArray(opponent.tier);
    const deck = buildOpponentDeck(coinArray);
    return {
      ...opponent,
      coinArray,
      deck,
      deckCards: toDeckDetails(deck),
    };
  });

  return {
    ...race,
    opponents,
    decksGenerated: true,
  };
};
