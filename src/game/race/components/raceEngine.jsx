import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import cards from "../../../assets/gameContent/cards";
import { TOAST_TYPE, useToast } from "../../../engine/ui/toast/toast";
import { useGame } from "../../../engine/gameContext/gameContext";

const TOTAL_TILES = 32;
const ROW_SIZE = 8;
const QUARTER = TOTAL_TILES / 4;
const HALF = TOTAL_TILES / 2;
const THREE_QUARTER = QUARTER * 3;

const PLAYER_CONFIG = [
  { id: "player1", name: "Player 1", short: "P1", color: "#ff6b6b" },
  { id: "player2", name: "Player 2", short: "P2", color: "#4dabf7" },
  { id: "player3", name: "Player 3", short: "P3", color: "#63e6be" },
  { id: "player4", name: "Player 4", short: "P4", color: "#ffd43b" },
];

const shuffle = (items) => {
  const array = [...items];
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};

const buildCardLookup = (allCards) => {
  const map = new Map();
  allCards.forEach((card) => map.set(card.id, card));
  return map;
};

const cardLookup = buildCardLookup(cards);

const resolveDeck = (deck) => (Array.isArray(deck) && deck.length === 16 ? deck : []);

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const getStage = (position) => {
  if (position <= 0) return "SST";
  if (position <= QUARTER) return "SST";
  if (position <= HALF) return "SEM";
  if (position <= THREE_QUARTER) return "SLM";
  return "SED";
};

const getRow = (position) => {
  if (position <= 0) return 0;
  return Math.floor((position - 1) / ROW_SIZE) + 1;
};

const getStatusCounts = (player) => {
  const staminaCount = player.status.filter((entry) => entry.type === "S").length;
  const fatigueCount = player.status.filter((entry) => entry.type === "F").length;
  const surplus = staminaCount - fatigueCount;
  return { staminaCount, fatigueCount, surplus };
};

const getProgress = (player) => {
  const lap = player.lap ?? 1;
  return (lap - 1) * TOTAL_TILES + player.position;
};

const getPlaceRank = (players, playerId) => {
  const target = players.find((p) => p.id === playerId);
  if (!target) return null;
  const targetProgress = getProgress(target);
  const higherCount = players.filter((p) => getProgress(p) > targetProgress).length;
  return higherCount + 1;
};

const evaluateCondition = (condition, player, players, raceClass, totalLaps, turnCount) => {
  const stage = getStage(player.position);
  const rank = getPlaceRank(players, player.id);
  const { surplus } = getStatusCounts(player);
  const isMultiLap = totalLaps > 1;
  const isFirstTurn = turnCount === 0;

  if (/^L[1-5]M$/.test(condition)) {
    const lapNumber = Number(condition[1]);
    return isMultiLap && player.lap === lapNumber;
  }

  switch (condition) {
    case "L1":
      return isMultiLap && player.lap === 1;
    case "LL":
    case "LLM":
      return isMultiLap && player.lap === totalLaps;
    case "SLR":
      return totalLaps === 1;
    case "HAF":
      return player.position <= HALF;
    case "HAS":
      return player.position >= HALF + 1;
    case "HAM":
      return player.position >= QUARTER + 1 && player.position <= THREE_QUARTER;
    case "HAE":
      return stage === "SST" || stage === "SED";
    case "SST":
    case "SEM":
    case "SLM":
    case "SED":
      return stage === condition;
    case "STA":
      return surplus > 0;
    case "FAT":
      return surplus < 0;
    case "NFAT":
      return surplus >= 0;
    case "CLR":
      return raceClass === "Red";
    case "CLB":
      return raceClass === "Blue";
    case "CLG":
      return raceClass === "Green";
    case "CLY":
      return raceClass === "Yellow";
    case "CLO":
      return raceClass === "Orange";
    case "FIRP":
      return !isFirstTurn && rank === 1;
    case "SECP":
      return !isFirstTurn && rank === 2;
    case "THRP":
      return !isFirstTurn && rank === 3;
    case "FORP":
      return !isFirstTurn && rank === 4;
    default:
      return false;
  }
};

const parseCardCode = (cardCode) => {
  const tokens = cardCode.split("-").filter(Boolean);
  const ifIndex = tokens.indexOf("if");
  if (ifIndex === -1) {
    return {
      conditions: [],
      effectsIfTrue: tokens,
      effectsIfFalse: [],
    };
  }

  const thenIndex = tokens.indexOf("then");
  const before = tokens.slice(0, ifIndex);
  const conditionTokens = tokens.slice(ifIndex + 1, thenIndex);
  const after = tokens.slice(thenIndex + 1);

  const conditions = conditionTokens.filter((token) => token !== "and");

  return {
    conditions,
    effectsIfTrue: after,
    effectsIfFalse: before,
  };
};

const getTargetPlayers = (targetCode, activePlayer, players) => {
  const stage = getStage(activePlayer.position);
  const row = getRow(activePlayer.position);

  switch (targetCode) {
    case "S":
      return [activePlayer];
    case "A":
      return players;
    case "AO":
      return players.filter((player) => player.id !== activePlayer.id);
    case "SR":
      return players.filter(
        (player) => player.id !== activePlayer.id && player.position === activePlayer.position
      );
    case "SS":
      return players.filter(
        (player) => player.id !== activePlayer.id && getStage(player.position) === stage
      );
    case "SST":
    case "SEM":
    case "SLM":
    case "SED":
      return players.filter((player) => getStage(player.position) === targetCode);
    case "AHE":
      return players.filter((player) => getProgress(player) > getProgress(activePlayer));
    case "BEH":
      return players.filter((player) => getProgress(player) < getProgress(activePlayer));
    default:
      return [];
  }
};

const advancePlayer = (player, distance, totalLaps, arrivalCounter) => {
  if (distance <= 0) {
    return {
      player: {
        ...player,
        status: [],
      },
      arrivalCounter,
      movedAmount: 0,
      newLap: player.lap,
    };
  }

  let nextPosition = player.position + distance;
  let nextLap = player.lap;

  while (nextPosition > TOTAL_TILES && nextLap < totalLaps) {
    nextPosition -= TOTAL_TILES;
    nextLap += 1;
  }

  if (nextPosition >= TOTAL_TILES && nextLap >= totalLaps) {
    nextPosition = TOTAL_TILES;
    nextLap = totalLaps;
  } else {
    nextPosition = clamp(nextPosition, 0, TOTAL_TILES);
  }

  const nextArrivalCounter = arrivalCounter + 1;

  return {
    player: {
      ...player,
      position: nextPosition,
      lap: nextLap,
      status: [],
      arrivalSeq: nextArrivalCounter,
    },
    arrivalCounter: nextArrivalCounter,
    movedAmount: distance,
    newLap: nextLap,
  };
};

const retreatPlayer = (player, distance, totalLaps) => {
  if (distance <= 0) {
    return player;
  }

  let remaining = distance;
  let nextPosition = player.position;
  let nextLap = player.lap;

  while (remaining > 0) {
    if (nextLap <= 1) {
      nextPosition = Math.max(0, nextPosition - remaining);
      remaining = 0;
      continue;
    }

    if (remaining >= nextPosition) {
      remaining -= nextPosition;
      nextLap -= 1;
      nextPosition = TOTAL_TILES + 1;
    } else {
      nextPosition -= remaining;
      remaining = 0;
    }
  }

  if (nextPosition === TOTAL_TILES + 1) {
    nextPosition = TOTAL_TILES;
  }

  return {
    ...player,
    position: clamp(nextPosition, 0, TOTAL_TILES),
    lap: Math.min(Math.max(1, nextLap), totalLaps),
  };
};

const applyMoveWithStatus = (player, baseAmount, arrivalCounter, totalLaps) => {
  const { surplus } = getStatusCounts(player);
  const adjusted = Math.max(0, baseAmount + surplus);
  const result = advancePlayer(player, adjusted, totalLaps, arrivalCounter);
  return {
    ...result,
    baseAmount,
    surplus,
  };
};

const applyEffect = (effectToken, activePlayerId, players, arrivalCounter, totalLaps) => {
  const activePlayer = players.find((player) => player.id === activePlayerId);
  if (!activePlayer) return { players, events: [], arrivalCounter };
  const parts = effectToken.split(",");
  if (parts.length < 3) return { players, events: [], arrivalCounter };

  const [effectCode, targetCode, rawAmount] = parts;
  const amount = Number(rawAmount);
  if (!Number.isFinite(amount)) return { players, events: [], arrivalCounter };

  const targets = getTargetPlayers(targetCode, activePlayer, players);

  const events = [];
  let nextArrivalCounter = arrivalCounter;

  const nextPlayers = players.map((player) => {
    const isTarget = targets.some((target) => target.id === player.id);
    if (!isTarget) return player;

    switch (effectCode) {
      case "M":
        {
          const moveResult = applyMoveWithStatus(player, amount, nextArrivalCounter, totalLaps);
          nextArrivalCounter = moveResult.arrivalCounter;
          const modifierText =
            moveResult.surplus !== 0
              ? ` (base ${amount}, ${moveResult.surplus > 0 ? "+" : ""}${moveResult.surplus} status)`
              : "";
          const actionText =
            moveResult.movedAmount > 0
              ? `moves forward ${moveResult.movedAmount}`
              : "does not move";
          events.push({
            playerId: player.id,
            color: player.color,
            message: `${player.name} ${actionText}${modifierText}.`,
          });
          return moveResult.player;
        }
      case "MB":
        events.push({
          playerId: player.id,
          color: player.color,
          message: `${player.name} moves back ${amount}.`,
        });
        if (amount <= 0) return player;
        nextArrivalCounter += 1;
        return {
          ...retreatPlayer(player, amount, totalLaps),
          arrivalSeq: nextArrivalCounter,
        };
      case "S":
      case "F":
      case "RF":
        return player;
      default:
        return player;
    }
  });

  return { players: nextPlayers, events, arrivalCounter: nextArrivalCounter };
};

const applyStatusEffect = (effectToken, activePlayerId, players) => {
  const parts = effectToken.split(",");
  if (parts.length < 3) return { players, events: [] };

  const [effectCode, targetCode, rawAmount] = parts;
  const amount = Number(rawAmount);
  if (!Number.isFinite(amount) || amount <= 0) return { players, events: [] };

  const activePlayer = players.find((player) => player.id === activePlayerId);
  if (!activePlayer) return { players, events: [] };

  const targets = getTargetPlayers(targetCode, activePlayer, players);

  if (effectCode === "S" || effectCode === "F") {
    const events = [];
    const nextPlayers = players.map((player) => {
      const isTarget = targets.some((target) => target.id === player.id);
      if (!isTarget) return player;
      events.push({
        playerId: player.id,
        color: player.color,
        message: `${player.name} gains ${effectCode === "S" ? "stamina" : "fatigue"} (duration ${amount}).`,
      });
      return {
        ...player,
        status: [...player.status, { type: effectCode, duration: amount }],
      };
    });
    return { players: nextPlayers, events };
  }

  if (effectCode === "RF") {
    const events = [];
    const nextPlayers = players.map((player) => {
      const isTarget = targets.some((target) => target.id === player.id);
      if (!isTarget) return player;
      const fatigueEntries = player.status
        .filter((entry) => entry.type === "F")
        .sort((a, b) => a.duration - b.duration);
      const remainingToRemove = Math.min(amount, fatigueEntries.length);
      const remainingFatigue = fatigueEntries.slice(remainingToRemove);
      const nonFatigue = player.status.filter((entry) => entry.type !== "F");
      if (remainingToRemove > 0) {
        events.push({
          playerId: player.id,
          color: player.color,
          message: `${player.name} removes ${remainingToRemove} fatigue.`,
        });
      }
      return {
        ...player,
        status: [...nonFatigue, ...remainingFatigue],
      };
    });
    return { players: nextPlayers, events };
  }

  return { players, events: [] };
};

const applyCardEffects = (
  cardCode,
  activePlayer,
  players,
  raceClass,
  arrivalCounter,
  totalLaps,
  turnCount
) => {
  const { conditions, effectsIfTrue, effectsIfFalse } = parseCardCode(cardCode);
  const allConditionsMet =
    conditions.length === 0 ||
    conditions.every((condition) =>
      evaluateCondition(condition, activePlayer, players, raceClass, totalLaps, turnCount)
    );

  const effectsToApply =
    conditions.length === 0 ? effectsIfTrue : allConditionsMet ? effectsIfTrue : effectsIfFalse;

  let updatedPlayers = players;
  let events = [];
  let nextArrivalCounter = arrivalCounter;
  const pendingStatusEffects = [];

  effectsToApply.forEach((effectToken) => {
    const [effectCode] = effectToken.split(",");
    if (effectCode === "M" || effectCode === "MB") {
      const result = applyEffect(
        effectToken,
        activePlayer.id,
        updatedPlayers,
        nextArrivalCounter,
        totalLaps
      );
      updatedPlayers = result.players;
      events = [...events, ...result.events];
      nextArrivalCounter = result.arrivalCounter;
    } else {
      pendingStatusEffects.push(effectToken);
    }
  });

  pendingStatusEffects.forEach((effectToken) => {
    const result = applyStatusEffect(effectToken, activePlayer.id, updatedPlayers);
    updatedPlayers = result.players;
    events = [...events, ...result.events];
  });

  return { players: updatedPlayers, events, arrivalCounter: nextArrivalCounter };
};

const tickStatuses = (players) =>
  players.map((player) => ({
    ...player,
    status: player.status
      .map((entry) => ({ ...entry, duration: entry.duration - 1 }))
      .filter((entry) => entry.duration > 0),
  }));

const createInitialState = (deckOverrides = {}, racers = PLAYER_CONFIG) => {
  const players = racers.map((player, index) => ({
    ...player,
    short: player.short ?? `P${index + 1}`,
    deck: resolveDeck(deckOverrides[player.id]),
    position: 0,
    lap: 1,
    status: [],
    arrivalSeq: 0,
  }));

  const combinedDeck = players.flatMap((player) =>
    player.deck.map((cardId, index) => ({
      id: `${player.id}-${index}-${cardId}`,
      playerId: player.id,
      cardId,
    }))
  );

  return {
    players,
    drawPile: shuffle(combinedDeck),
    discardPile: [],
    lastDraw: null,
    winner: null,
    turnCount: 0,
    raceClass: null,
    lastCardClass: null,
    arrivalCounter: 0,
  };
};

const useRaceEngine = () => {
  const { showToast } = useToast();
  const { gameState } = useGame();
  const totalLaps = useMemo(() => {
    const value = Number(gameState?.raceLaps ?? 1);
    if (!Number.isFinite(value)) return 1;
    return Math.min(5, Math.max(1, value));
  }, [gameState?.raceLaps]);
  const deckOverrides = useMemo(
    () => ({
      player1: gameState?.player1?.deck,
      player2: gameState?.player2?.deck,
      player3: gameState?.player3?.deck,
      player4: gameState?.player4?.deck,
    }),
    [gameState]
  );
  const racers = useMemo(() => {
    if (Array.isArray(gameState?.racers) && gameState.racers.length > 0) {
      return gameState.racers.map((r, idx) => ({
        id: r.id,
        name: r.name,
        short: r.short ?? `P${idx + 1}`,
        color: r.color ?? PLAYER_CONFIG[idx]?.color ?? "#ffffff",
        gradient: r.gradient ?? null,
        image: r.image ?? null,
        icon: r.icon ?? null,
      }));
    }
    return PLAYER_CONFIG;
  }, [gameState?.racers]);
  const [state, setState] = useState(() => createInitialState(deckOverrides, racers));
  const themeId = gameState?.themeId ?? "cars";
  const pendingEventsRef = useRef([]);

  const tiles = useMemo(
    () => Array.from({ length: TOTAL_TILES }, (_, idx) => idx + 1),
    []
  );

  const typeFromPlayerId = useCallback((playerId) => {
    switch (playerId) {
      case "player1":
        return TOAST_TYPE.PLAYER1;
      case "player2":
        return TOAST_TYPE.PLAYER2;
      case "player3":
        return TOAST_TYPE.PLAYER3;
      case "player4":
        return TOAST_TYPE.PLAYER4;
      default:
        return TOAST_TYPE.PLAYER1;
    }
  }, []);

  const emitEvents = useCallback(
    (events) => {
      events.forEach((event) => {
        showToast(typeFromPlayerId(event.playerId), event.message, { color: event.color });
      });
    },
    [showToast, typeFromPlayerId]
  );

  const drawNextCardWithToasts = useCallback(() => {
    setState((prev) => {
      if (prev.winner) return prev;

      let drawPile = [...prev.drawPile];
      let discardPile = [...prev.discardPile];
      let reshuffled = false;

      if (drawPile.length === 0) {
        if (discardPile.length === 0) return prev;
        drawPile = shuffle(discardPile);
        discardPile = [];
        reshuffled = true;
      }

      const tickedPlayers = tickStatuses(prev.players);
      const card = drawPile.shift();
      if (!card) return prev;

      const activePlayer = tickedPlayers.find((player) => player.id === card.playerId);
      const cardData = cardLookup.get(card.cardId);
      const cardCode = cardData?.cardCode;
      const activeRaceClass = prev.lastCardClass ?? null;

      const result =
        activePlayer && cardCode
          ? applyCardEffects(
              cardCode,
              activePlayer,
              tickedPlayers,
              activeRaceClass,
              prev.arrivalCounter,
              totalLaps,
              prev.turnCount
            )
          : { players: tickedPlayers, events: [], arrivalCounter: prev.arrivalCounter };
      const players = result.players;
      pendingEventsRef.current = result.events;

      const updatedActive = players.find((player) => player.id === card.playerId);
      const winner =
        players.find((player) => player.lap >= totalLaps && player.position >= TOTAL_TILES) ||
        null;
      const nextRaceClass = cardData?.class ?? null;

      return {
        ...prev,
        players,
        drawPile,
        discardPile: [...discardPile, card],
        lastDraw: {
          playerId: card.playerId,
          playerName: updatedActive?.name ?? "Unknown",
          playerColor: updatedActive?.color ?? null,
          cardId: card.cardId,
          cardClass: cardData?.class ?? "Unknown",
          cardName: cardData?.name ?? "Unknown Card",
          cardText: cardData?.text ?? "No card text available.",
          cardCode: cardCode ?? "",
          reshuffled,
        },
        winner,
        turnCount: prev.turnCount + 1,
        raceClass: activeRaceClass,
        lastCardClass: nextRaceClass,
        arrivalCounter: result.arrivalCounter ?? prev.arrivalCounter,
      };
    });
  }, [emitEvents, totalLaps]);

  useEffect(() => {
    if (pendingEventsRef.current.length > 0) {
      const toEmit = [...pendingEventsRef.current];
      pendingEventsRef.current = [];
      emitEvents(toEmit);
    }
  }, [state.turnCount, emitEvents]);

  const resetRace = useCallback(() => {
    setState(createInitialState(deckOverrides, racers));
  }, [deckOverrides, racers]);

  return {
    players: state.players,
    tiles,
    drawPileCount: state.drawPile.length,
    discardCount: state.discardPile.length,
    lastDraw: state.lastDraw,
    winner: state.winner,
    turnCount: state.turnCount,
    raceClass: state.raceClass,
    themeId,
    totalLaps,
    totalTiles: TOTAL_TILES,
    drawNextCard: drawNextCardWithToasts,
    resetRace,
  };
};

export default useRaceEngine;
