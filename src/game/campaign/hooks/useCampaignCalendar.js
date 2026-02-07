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
  MINI: "miniGame",
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

export const buildCampaignCalendar = () => {
  const shuffledMonths = shuffle(MONTH_NAMES);
  const monthNames = shuffledMonths.slice(0, 3);

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

    // Events: 50% chance, one per week.
    if (Math.random() < 0.5) {
      const nonRaceDays = Array.from({ length: 7 }, (_, idx) => weekStart + idx).filter(
        (day) => calendar[day].type === DAY_TYPES.NORMAL
      );
      if (nonRaceDays.length > 0) {
        const day = pickRandom(nonRaceDays);
        calendar[day].type = DAY_TYPES.EVENT;
      }
    }

    // Mini games: 25% chance, one per week.
    if (Math.random() < 0.25) {
      const nonRaceDays = Array.from({ length: 7 }, (_, idx) => weekStart + idx).filter(
        (day) => calendar[day].type === DAY_TYPES.NORMAL
      );
      if (nonRaceDays.length > 0) {
        const day = pickRandom(nonRaceDays);
        calendar[day].type = DAY_TYPES.MINI;
      }
    }
  }

  // Ensure each month has at least one event or mini game.
  for (let monthIndex = 0; monthIndex < 3; monthIndex += 1) {
    const monthStart = monthIndex * 28;
    const monthEnd = monthStart + 28;
    const monthDays = calendar.slice(monthStart, monthEnd);
    const hasSpecial = monthDays.some(
      (day) => day.type === DAY_TYPES.EVENT || day.type === DAY_TYPES.MINI
    );

    if (!hasSpecial) {
      const candidates = Array.from({ length: 28 }, (_, idx) => monthStart + idx).filter(
        (day) => calendar[day].type === DAY_TYPES.NORMAL
      );
      if (candidates.length > 0) {
        const day = pickRandom(candidates);
        calendar[day].type = Math.random() < 0.5 ? DAY_TYPES.EVENT : DAY_TYPES.MINI;
      }
    }
  }

  // Ensure days 1-2 remain normal even if races were assigned.
  calendar[0].type = DAY_TYPES.NORMAL;
  calendar[1].type = DAY_TYPES.NORMAL;

  return { calendar, monthNames };
};
