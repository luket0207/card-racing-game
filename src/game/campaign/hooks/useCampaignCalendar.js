import themes from "../../../assets/gameContent/themes";
import events from "../../../assets/gameContent/events";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const DAY_TYPES = Object.freeze({
  NORMAL: "normal",
  RACE: "race",
  EVENT: "event",
});

const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

const RARITY_WEIGHTS = [
  { rarity: "Common", weight: 55 },
  { rarity: "Uncommon", weight: 33 },
  { rarity: "Rare", weight: 10 },
  { rarity: "Very Rare", weight: 2 },
];

const pickRarity = () => {
  const total = RARITY_WEIGHTS.reduce((sum, item) => sum + item.weight, 0);
  let roll = Math.random() * total;
  for (const item of RARITY_WEIGHTS) {
    roll -= item.weight;
    if (roll <= 0) return item.rarity;
  }
  return RARITY_WEIGHTS[0].rarity;
};

const buildEventPool = () =>
  events.reduce((acc, event) => {
    const rarity = event.rarity ?? "Common";
    if (!acc[rarity]) acc[rarity] = [];
    acc[rarity].push(event);
    return acc;
  }, {});

const shuffle = (arr) => {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

const pickRaceDaysForWeek = (weekStart, existingRaceDays, forbiddenDays = new Set()) => {
  const candidates = Array.from({ length: 7 }, (_, idx) => weekStart + idx).filter(
    (day) => !forbiddenDays.has(day)
  );
  const shuffled = shuffle(candidates);
  const races = [];

  for (let i = 0; i < shuffled.length && races.length < 2; i += 1) {
    const day = shuffled[i];
    const prevDay = day - 1;
    const nextDay = day + 1;
    const conflict = existingRaceDays.has(prevDay) || existingRaceDays.has(nextDay);
    if (conflict) continue;
    if (races.some((r) => Math.abs(r - day) === 1)) continue;
    races.push(day);
  }

  return races;
};

export const buildCampaignCalendar = ({ themeId, playerPieceId }) => {
  const shuffledMonths = shuffle(MONTH_NAMES);
  const monthNames = shuffledMonths.slice(0, 3);
  const eventPool = buildEventPool();
  const theme = themes.find((t) => t.id === themeId) ?? themes[0];
  const pieces = theme?.pieces ?? [];
  const playerPiece = pieces.find((piece) => piece.id === playerPieceId);
  const pooledNames = theme?.namePool ?? [];
  const eventNamePool =
    theme?.nameStyle === "pooled"
      ? pooledNames.filter((name) => name !== playerPiece?.name)
      : pieces.filter((piece) => piece.id !== playerPieceId).map((piece) => piece.name);

  const totalDays = 28 * 3;
  const calendar = Array.from({ length: totalDays }, () => ({
    type: DAY_TYPES.NORMAL,
  }));

  // Days 1 and 2 are always normal.
  calendar[0].type = DAY_TYPES.NORMAL;
  calendar[1].type = DAY_TYPES.NORMAL;

  const raceDays = new Set();

  // Place two races per week, never on consecutive days.
  for (let week = 0; week < 12; week += 1) {
    const weekStart = week * 7;
    if (week === 11) {
      const lastDay = totalDays - 1;
      raceDays.add(lastDay);
      calendar[lastDay].type = DAY_TYPES.RACE;

      const otherCandidates = Array.from({ length: 7 }, (_, idx) => weekStart + idx).filter(
        (day) =>
          day !== lastDay &&
          day !== lastDay - 1 &&
          !raceDays.has(day - 1) &&
          !raceDays.has(day + 1)
      );

      if (otherCandidates.length > 0) {
        const otherDay = pickRandom(otherCandidates);
        raceDays.add(otherDay);
        calendar[otherDay].type = DAY_TYPES.RACE;
      }
    } else if (week === 0) {
      const forbiddenDays = new Set([0, 1]);
      const races = pickRaceDaysForWeek(weekStart, raceDays, forbiddenDays);

      if (races.length < 2) {
        const retry = pickRaceDaysForWeek(weekStart, raceDays, forbiddenDays);
        races.length = 0;
        races.push(...retry);
      }

      races.forEach((day) => {
        raceDays.add(day);
        calendar[day].type = DAY_TYPES.RACE;
      });
    } else {
      const races = pickRaceDaysForWeek(weekStart, raceDays);

      // If we couldn't place 2, retry with a fresh selection.
      if (races.length < 2) {
        const retry = pickRaceDaysForWeek(weekStart, raceDays);
        races.length = 0;
        races.push(...retry);
      }

      races.forEach((day) => {
        raceDays.add(day);
        calendar[day].type = DAY_TYPES.RACE;
      });
    }

  }

  // Events are distributed per month: 1-5 events, max 2 per week.
  for (let monthIndex = 0; monthIndex < 3; monthIndex += 1) {
    const monthStart = monthIndex * 28;
    const eventsTarget = 1 + Math.floor(Math.random() * 5);
    const eventsPerWeek = [0, 0, 0, 0];
    let remaining = eventsTarget;
    let safety = 200;

    while (remaining > 0 && safety > 0) {
      safety -= 1;
      const weekOffset = Math.floor(Math.random() * 4);
      if (eventsPerWeek[weekOffset] >= 2) continue;

      const weekStart = monthStart + weekOffset * 7;
      const candidates = Array.from({ length: 7 }, (_, idx) => weekStart + idx).filter(
        (day) => calendar[day].type === DAY_TYPES.NORMAL
      );
      if (candidates.length === 0) continue;

      const day = pickRandom(candidates);
      const rarity = pickRarity();
      const options = eventPool[rarity] ?? eventPool.Common ?? events;
      const event = pickRandom(options);
      const fallbackPool =
        theme?.nameStyle === "pooled"
          ? pooledNames
          : pieces.map((piece) => piece.name);
      const namePool = eventNamePool.length ? eventNamePool : fallbackPool;
      const name = pickRandom(namePool);
      calendar[day] = {
        ...calendar[day],
        type: DAY_TYPES.EVENT,
        eventId: event?.id ?? null,
        eventPieceName: name ?? "A rival",
      };
      eventsPerWeek[weekOffset] += 1;
      remaining -= 1;
    }
  }

  // Ensure days 1-2 remain normal even if races were assigned.
  calendar[0].type = DAY_TYPES.NORMAL;
  calendar[1].type = DAY_TYPES.NORMAL;

  return { calendar, monthNames };
};
