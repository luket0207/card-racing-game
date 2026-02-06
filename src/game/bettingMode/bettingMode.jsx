import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Button, { BUTTON_VARIANT } from "../../engine/ui/button/button";
import { useGame } from "../../engine/gameContext/gameContext";
import { useToast } from "../../engine/ui/toast/toast";
import { MODAL_BUTTONS, useModal } from "../../engine/ui/modal/modalContext";
import cards from "../../assets/gameContent/cards";
import themes from "../../assets/gameContent/themes";
import "./bettingMode.scss";

const BET_TYPES = [
  { id: "outright", label: "Outright (Winner)" },
  { id: "eachway", label: "Each Way (1st or 2nd)" },
  { id: "fast", label: "Past The Post Fast (<=200 turns)" },
  { id: "slow", label: "Past The Post Slow (>200 turns)" },
];

const coinTotalsToTier = (total) => {
  const map = {
    22: "Very low",
    23: "Slightly low",
    24: "Average",
    25: "Good",
    26: "Great",
    27: "Super",
  };
  return map[total] ?? "Average";
};

const buildCoinLimits = () => {
  const classes = ["Red", "Blue", "Green", "Yellow", "Orange"];
  let limits;
  let total;
  do {
    limits = classes.reduce((acc, cls) => {
      acc[cls] = 4 + Math.floor(Math.random() * 3); // 4-6
      return acc;
    }, {});
    total = Object.values(limits).reduce((sum, val) => sum + val, 0);
  } while (total < 22 || total >= 28);
  return { limits, total };
};

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

const buildRandomDeck = (limits) => {
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

const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a));

const buildOdds = (racers) => {
  const WEIGHT_K = 0.4;
  const weights = racers.map((r) => Math.exp(r.coinTotal * WEIGHT_K));
  const total = weights.reduce((sum, w) => sum + w, 0);

  return racers.map((r, idx) => {
    const p = total > 0 ? weights[idx] / total : 0;
    const decimal = p > 0 ? 1 / p : 10;

    // Use fair fractional odds: (1/p - 1) rounded to 0.1 for clean ratios.
    const numerator = Math.max(1, Math.round((decimal - 1) * 10));
    const denominator = 10;
    const divisor = gcd(numerator, denominator);
    const odds = [numerator / divisor, denominator / divisor];

    return { ...r, odds, decimalOdds: decimal };
  });
};

const buildPastPostOdds = (racers) => {
  const totals = racers.map((r) => r.coinTotal);
  const max = Math.max(...totals);
  const avg = totals.reduce((sum, v) => sum + v, 0) / Math.max(1, totals.length);

  // Emphasize top-end strength more than quantity.
  const strength = max + 0.35 * avg;
  const baseline = 25 + 0.35 * 25; // good, good, average, average

  const delta = strength - baseline;
  const fastShift = delta * 0.08;
  const fastDecimal = Math.max(1.2, Math.min(3.2, 2 - fastShift));
  const slowDecimal = Math.max(1.2, Math.min(3.2, 2 + fastShift));

  const toOdds = (decimal) => {
    const numerator = Math.max(1, Math.round((decimal - 1) * 10));
    const denominator = 10;
    const divisor = gcd(numerator, denominator);
    return [numerator / divisor, denominator / divisor];
  };

  return {
    fast: toOdds(fastDecimal),
    slow: toOdds(slowDecimal),
  };
};

const buildRacersForTheme = (theme, count = 4) => {
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

const BettingMode = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { gameState, setGameState } = useGame();
  const { clearLog } = useToast();
  const { openModal, closeModal, isModalOpen } = useModal();
  const promptKeyRef = useRef(null);
  const suppressPromptRef = useRef(false);
  const betting = gameState.betting ?? {};
  const [themeId, setThemeId] = useState(betting.themeId ?? "dots");
  const [pendingThemeId, setPendingThemeId] = useState(themeId);
  const pendingThemeRef = useRef(themeId);
  const currentRace = betting.currentRace;
  const isThemeLocked = betting.active === true;
  const activeThemeId = betting.active === true ? betting.themeId ?? themeId : themeId;
  const activeTheme = useMemo(
    () => themes.find((t) => t.id === activeThemeId) ?? themes[0],
    [activeThemeId]
  );

  const gold = betting.gold ?? 500;
  const raceIndex = betting.raceIndex ?? 1;

  const [betType, setBetType] = useState("outright");
  const [betRacerId, setBetRacerId] = useState("player1");
  const [stake, setStake] = useState(100);
  const [betError, setBetError] = useState("");
  const betTypeLabels = useMemo(
    () => BET_TYPES.reduce((acc, bet) => ({ ...acc, [bet.id]: bet.label }), {}),
    []
  );

  const minBet = gold < 100 ? gold : 100;
  const betCost = stake;
  const maxStake = gold;
  const isOutOfGold = gold <= 0;

  useEffect(() => {
    setStake((prev) => {
      const safeMax = Math.max(0, maxStake);
      if (safeMax === 0) return 0;
      if (minBet > safeMax) return safeMax;
      if (prev < minBet) return minBet;
      if (prev > safeMax) return safeMax;
      return prev;
    });
  }, [maxStake, minBet]);

  const generateRaceForTheme = useCallback((theme) => {
    const racers = buildRacersForTheme(theme, 4).map((r) => {
      let { limits, total } = buildCoinLimits();
      let deck = buildRandomDeck(limits);
      let safety = 0;
      while (deck.length !== 16 && safety < 50) {
        safety += 1;
        const reroll = buildCoinLimits();
        limits = reroll.limits;
        total = reroll.total;
        deck = buildRandomDeck(limits);
      }
      return { ...r, coinLimits: limits, coinTotal: total, deck };
    });
    const racersWithOdds = buildOdds(racers);
    return { racers: racersWithOdds, themeId: theme.id };
  }, []);

  const generateRace = useCallback(() => generateRaceForTheme(activeTheme), [
    activeTheme,
    generateRaceForTheme,
  ]);

  useEffect(() => {
    if (betting.active !== true) return;
    const lockedThemeId = betting.themeId ?? themeId;
    if (!currentRace || currentRace.themeId !== lockedThemeId) {
      const theme = themes.find((t) => t.id === lockedThemeId) ?? themes[0];
      const nextRace = generateRaceForTheme(theme);
      setGameState((prev) => ({
        ...prev,
        betting: {
          ...(prev.betting ?? {}),
          active: true,
          themeId: theme.id,
          currentRace: nextRace,
          bets: [],
          lastResult: null,
          gold: prev.betting?.gold ?? 500,
          raceIndex: prev.betting?.raceIndex ?? 1,
        },
      }));
    }
  }, [betting.active, betting.themeId, currentRace, generateRaceForTheme, setGameState, themeId]);

  const bets = betting.bets ?? [];
  const betsByType = useMemo(
    () => bets.reduce((acc, bet) => ({ ...acc, [bet.type]: bet }), {}),
    [bets]
  );
  const hasPastPostBet = useMemo(
    () => bets.some((bet) => bet.type === "fast" || bet.type === "slow"),
    [bets]
  );
  const pastPostOdds = useMemo(
    () => (currentRace ? buildPastPostOdds(currentRace.racers) : { fast: [1, 1], slow: [1, 1] }),
    [currentRace]
  );

  const selectedOdds = useMemo(() => {
    if (betType === "outright" || betType === "eachway") {
      const racer = currentRace?.racers?.find((r) => r.id === betRacerId);
      return racer?.odds ?? [1, 1];
    }
    if (betType === "fast") return pastPostOdds.fast;
    if (betType === "slow") return pastPostOdds.slow;
    return [1, 1];
  }, [betRacerId, betType, currentRace, pastPostOdds]);
  const hasBets = bets.length > 0;

  useEffect(() => {
    if (currentRace?.racers?.length) {
      setBetRacerId(currentRace.racers[0].id);
    }
  }, [currentRace?.racers]);

  useEffect(() => {
    setBetError("");
  }, [betType, betRacerId, stake]);

  const handleAddBet = useCallback(() => {
    if (!currentRace) return;
    if (betsByType[betType]) {
      setBetError("You can only place one bet of this type per race.");
      return;
    }
    if ((betType === "fast" || betType === "slow") && hasPastPostBet) {
      setBetError("You can only place one Past The Post bet per race.");
      return;
    }
    const amount = Math.max(0, Number(stake));
    const cost = amount;
    if (amount <= 0) {
      setBetError("Bet amount must be greater than 0.");
      return;
    }
    if (amount < 100 && gold >= 100) {
      setBetError("Minimum bet is 100 gold.");
      return;
    }
    if (cost > gold) {
      setBetError("You cannot afford this bet.");
      return;
    }
    const odds =
      betType === "fast"
        ? pastPostOdds.fast
        : betType === "slow"
          ? pastPostOdds.slow
          : selectedOdds;
    const bet = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      type: betType,
      racerId: ["outright", "eachway"].includes(betType) ? betRacerId : null,
      stake: amount,
      cost,
      odds,
    };
    setGameState((prev) => ({
      ...prev,
      betting: {
        ...(prev.betting ?? {}),
        gold: (prev.betting?.gold ?? 0) - cost,
        bets: [bet, ...(prev.betting?.bets ?? [])],
      },
    }));
    setBetError("");
    setStake(minBet);
  }, [
    betRacerId,
    betType,
    betsByType,
    currentRace,
    gold,
    hasPastPostBet,
    minBet,
    pastPostOdds,
    selectedOdds,
    setGameState,
    stake,
  ]);

  const handleRemoveBet = useCallback(
    (betId) => {
      setGameState((prev) => {
        const existing = prev.betting?.bets ?? [];
        const bet = existing.find((b) => b.id === betId);
        if (!bet) return prev;
        const refunded = bet.cost ?? bet.stake ?? 0;
        return {
          ...prev,
          betting: {
            ...(prev.betting ?? {}),
            gold: (prev.betting?.gold ?? 0) + refunded,
            bets: existing.filter((b) => b.id !== betId),
          },
        };
      });
    },
    [setGameState]
  );

  const handleStartRace = useCallback(() => {
    if (!currentRace) return;
    if (bets.length === 0) return;
    if (bets.every((b) => b.stake < 100) && gold >= 100) return;

    const racers = currentRace.racers;
    setGameState((prev) => ({
      ...prev,
      themeId: currentRace.themeId,
      racers,
      raceLaps: 2,
      player1: { ...prev.player1, deck: racers[0]?.deck ?? [], position: 0 },
      player2: { ...prev.player2, deck: racers[1]?.deck ?? [], position: 0 },
      player3: { ...prev.player3, deck: racers[2]?.deck ?? [], position: 0 },
      player4: { ...prev.player4, deck: racers[3]?.deck ?? [], position: 0 },
    }));
    clearLog();
    navigate("/race");
  }, [bets, clearLog, currentRace, gold, navigate, setGameState]);

  const handleResetBetting = useCallback(() => {
    setGameState((prev) => ({
      ...prev,
      betting: {
        active: false,
        gold: 500,
        raceIndex: 1,
        themeId: prev.betting?.themeId ?? "dots",
        currentRace: null,
        bets: [],
        lastResult: null,
      },
    }));
    navigate("/");
  }, [navigate, setGameState]);

  const startRun = useCallback(
    (selectedThemeId) => {
      suppressPromptRef.current = true;
      const selectedTheme = themes.find((theme) => theme.id === selectedThemeId) ?? themes[0];
      const nextRace = generateRaceForTheme(selectedTheme);
      setGameState((prev) => ({
        ...prev,
        betting: {
          active: true,
          themeId: selectedTheme.id,
          currentRace: nextRace,
          bets: [],
          lastResult: null,
          gold: 500,
          raceIndex: 1,
        },
      }));
      setThemeId(selectedTheme.id);
      setPendingThemeId(selectedTheme.id);
      pendingThemeRef.current = selectedTheme.id;
      closeModal();
    },
    [closeModal, generateRaceForTheme, setGameState]
  );

  const openRunModal = useCallback(() => {
    if (isModalOpen) return;
    openModal({
      modalTitle: betting.active === true ? "Betting Mode" : "Start Betting Run",
      modalContent: (
        <div className="betting-mode__themeModal">
          <p>
            {betting.active === true
              ? "Pick a theme and choose whether to continue or start a new run."
              : "Pick a theme to start your betting run."}
          </p>
          <select
            className="betting-mode__themeSelect"
            defaultValue={pendingThemeId}
            onChange={(e) => {
              setPendingThemeId(e.target.value);
              pendingThemeRef.current = e.target.value;
            }}
          >
            {themes.map((theme) => (
              <option key={theme.id} value={theme.id}>
                {theme.name}
              </option>
            ))}
          </select>
          <div className="betting-mode__themeActions">
            {betting.active === true && (
              <Button
                variant={BUTTON_VARIANT.SECONDARY}
                onClick={() => {
                  suppressPromptRef.current = true;
                  closeModal();
                }}
              >
                Continue Run
              </Button>
            )}
            <Button
              variant={BUTTON_VARIANT.PRIMARY}
              onClick={() => startRun(pendingThemeRef.current)}
            >
              {betting.active === true ? "Start New Run" : "Start Run"}
            </Button>
            <Button
              variant={BUTTON_VARIANT.TERTIARY}
              onClick={() => {
                closeModal();
                navigate("/");
              }}
            >
              Back Home
            </Button>
          </div>
        </div>
      ),
      buttons: MODAL_BUTTONS.NONE,
    });
  }, [betting.active, closeModal, isModalOpen, navigate, openModal, pendingThemeId, startRun]);

  useEffect(() => {
    const fromHome = location.state?.fromHome === true;
    if (!fromHome) return;
    if (promptKeyRef.current === location.key) return;
    if (suppressPromptRef.current) {
      suppressPromptRef.current = false;
      return;
    }
    promptKeyRef.current = location.key;
    openRunModal();
  }, [location.key, location.state, openRunModal]);

  useEffect(() => {
    if (betting.active === true && betting.themeId) {
      setThemeId(betting.themeId);
      setPendingThemeId(betting.themeId);
      pendingThemeRef.current = betting.themeId;
    }
  }, [betting.active, betting.themeId]);


  return (
    <div className="betting-mode">
      <header className="betting-mode__header">
        <div>
          <h1>Betting Mode</h1>
          <p>Gold: {gold} - Race {raceIndex} / 10</p>
        </div>
        <div className="betting-mode__headerActions">
          <Button variant={BUTTON_VARIANT.TERTIARY} to="/">
            Back Home
          </Button>
        </div>
      </header>

      <div className="betting-mode__controls">
        <div className="betting-mode__control">
          <label>Theme</label>
          <div className="betting-mode__themeDisplay">{activeTheme?.name ?? "Unknown"}</div>
          {isThemeLocked && (
            <div className="betting-mode__hint">Theme is locked for this run.</div>
          )}
        </div>
      </div>

      {isOutOfGold && !hasBets ? (
        <div className="betting-mode__racers">
          <h2>Game Over</h2>
          <p>You are out of gold coins.</p>
          <Button variant={BUTTON_VARIANT.PRIMARY} onClick={handleResetBetting}>
            Return Home
          </Button>
        </div>
      ) : (
        currentRace && (
        <div className="betting-mode__layout">
          <section className="betting-mode__racers">
            <h2>Racers</h2>
            {currentRace.racers.map((r) => (
              <div key={r.id} className="betting-mode__racer">
                <div className="betting-mode__racerName">{r.name}</div>
                <div className="betting-mode__racerMeta">
                  Coins: {r.coinTotal} ({coinTotalsToTier(r.coinTotal)}) - Odds {r.odds[0]}/
                  {r.odds[1]}
                </div>
              </div>
            ))}
          </section>

          <section className="betting-mode__bets">
            <h2>Place Bets</h2>
            <div className="betting-mode__betRow">
              <select value={betType} onChange={(e) => setBetType(e.target.value)}>
                {BET_TYPES.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.label}
                  </option>
                ))}
              </select>
              {["outright", "eachway"].includes(betType) && (
                <select value={betRacerId} onChange={(e) => setBetRacerId(e.target.value)}>
                  {currentRace.racers.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              )}
              <input
                type="number"
                min={minBet}
                max={maxStake}
                value={stake}
                onChange={(e) => setStake(Number(e.target.value))}
              />
              <div className="betting-mode__odds">
                Odds {selectedOdds[0]}/{selectedOdds[1]}
              </div>
              <Button
                variant={BUTTON_VARIANT.PRIMARY}
                onClick={handleAddBet}
                disabled={
                  gold <= 0 ||
                  betCost > gold ||
                  stake < minBet ||
                  !!betsByType[betType] ||
                  ((betType === "fast" || betType === "slow") && hasPastPostBet)
                }
              >
                {betsByType[betType]
                  ? "Bet Already Placed"
                  : (betType === "fast" || betType === "slow") && hasPastPostBet
                    ? "Past The Post Already Placed"
                    : "Add Bet"}
              </Button>
            </div>

            <div className="betting-mode__betHint">
              Minimum bet is {minBet}. Each-way splits the stake in half.
            </div>
            {betError && <div className="betting-mode__betError">{betError}</div>}

            <div className="betting-mode__betsList">
              {bets.length === 0 ? (
                <div className="betting-mode__empty">No bets placed yet.</div>
              ) : (
                bets.map((b) => (
                  <div key={b.id} className="betting-mode__betItem">
                    <span>{betTypeLabels[b.type] ?? b.type}</span>
                    <span>
                      {b.racerId
                        ? currentRace.racers.find((r) => r.id === b.racerId)?.name
                        : "Race"}
                    </span>
                    <span>{b.stake}g</span>
                    <Button
                      variant={BUTTON_VARIANT.TERTIARY}
                      onClick={() => handleRemoveBet(b.id)}
                    >
                      Cancel
                    </Button>
                  </div>
                ))
              )}
            </div>

            <Button
              variant={BUTTON_VARIANT.SECONDARY}
              onClick={handleStartRace}
              disabled={bets.length === 0}
            >
              Start Race
            </Button>
          </section>
        </div>
        )
      )}
    </div>
  );
};

export default BettingMode;
