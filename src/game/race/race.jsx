import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Deck from "./components/deck/deck";
import Track from "./components/track/track";
import useRaceEngine from "./components/raceEngine";
import { useToast } from "../../engine/ui/toast/toast";
import { useModal, MODAL_BUTTONS } from "../../engine/ui/modal/modalContext";
import Button, { BUTTON_VARIANT } from "../../engine/ui/button/button";
import { useGame } from "../../engine/gameContext/gameContext";
import Piece from "./components/piece/piece";
import themes from "../../assets/gameContent/themes";
import "./race.scss";

const PAST_POST_BETS = {
  fast: { label: "Past The Post Fast (<=200)", threshold: 200 },
  slow: { label: "Past The Post Slow (>200)", threshold: 200 },
};

const calcPayout = (stake, odds) => {
  const [num, denom] = odds;
  const decimal = denom === 0 ? 0 : num / denom;
  return Math.round(stake * (decimal + 1));
};

const Race = () => {
  const {
    players,
    tiles,
    drawPileCount,
    discardCount,
    lastDraw,
    winner,
    turnCount,
    raceClass,
    themeId,
    totalLaps,
    totalTiles,
    drawNextCard,
    resetRace,
  } = useRaceEngine();
  const { log, clearLog } = useToast();
  const { openModal, closeModal } = useModal();
  const navigate = useNavigate();
  const { gameState, setGameState } = useGame();
  const betting = gameState?.betting ?? {};
  const isBetting = betting.active === true;
  const modalKeyRef = useRef(null);
  const bettingFinishRef = useRef(null);
  const bettingRace = betting.currentRace;
  const bettingBets = betting.bets ?? [];
  const activeTheme = useMemo(
    () => themes.find((t) => t.id === themeId) ?? themes[0],
    [themeId]
  );
  const pieceSize = activeTheme?.iconSize ?? "small";
  const standings = useMemo(() => {
    return [...players].sort((a, b) => {
      if ((b.lap ?? 1) !== (a.lap ?? 1)) return (b.lap ?? 1) - (a.lap ?? 1);
      if (b.position !== a.position) return b.position - a.position;
      const aSeq = a.arrivalSeq > 0 ? a.arrivalSeq : Number.POSITIVE_INFINITY;
      const bSeq = b.arrivalSeq > 0 ? b.arrivalSeq : Number.POSITIVE_INFINITY;
      return aSeq - bSeq;
    });
  }, [players]);
  const [tilePositions, setTilePositions] = useState({});
  const [moveDurationMs, setMoveDurationMs] = useState(500);

  useEffect(() => {
    if (!winner) {
      modalKeyRef.current = null;
      bettingFinishRef.current = null;
    }
  }, [winner]);

  const handleMeasure = useCallback((positions) => {
    setTilePositions(positions);
  }, []);

  const handleDraw = useCallback(
    (meta = { source: "manual" }) => {
      if (meta?.source === "auto" && typeof meta.delaySec === "number") {
        const baseMs = meta.delaySec * 1000;
        setMoveDurationMs(Math.max(200, baseMs - 100));
      } else {
        setMoveDurationMs(500);
      }
      drawNextCard();
    },
    [drawNextCard]
  );

  const overlay = useMemo(
    () => (
      <div className="race-track__overlay" style={{ "--move-duration": `${moveDurationMs}ms` }}>
        {players.map((player) => {
          const pos = tilePositions[player.position] ?? tilePositions[0];
          if (!pos) return null;
          const index = players.findIndex((p) => p.id === player.id);
          const baseOffset = pieceSize === "large" ? 18 : pieceSize === "medium" ? 16 : 8;
          const offsets = [
            { x: -baseOffset, y: -baseOffset },
            { x: baseOffset, y: -baseOffset },
            { x: -baseOffset, y: baseOffset },
            { x: baseOffset, y: baseOffset },
          ];
          const offset = offsets[index % offsets.length] ?? { x: 0, y: 0 };
          return (
            <div
              key={`overlay-${player.id}`}
              className="race-track__overlayPiece"
              style={{ left: `${pos.x + offset.x}px`, top: `${pos.y + offset.y}px` }}
            >
              <Piece
                label={player.short}
                color={player.color}
                playerId={player.id}
                status={player.status}
                image={player.image}
                icon={player.icon}
                size={pieceSize}
              />
            </div>
          );
        })}
      </div>
    ),
    [moveDurationMs, pieceSize, players, tilePositions]
  );

  useEffect(() => {
    if (!winner) return;
    if (bettingFinishRef.current === null) {
      bettingFinishRef.current =
        isBetting || (bettingRace && bettingBets.length >= 0) ? "bet" : "standard";
    }
    const mode = bettingFinishRef.current ?? (isBetting ? "bet" : "standard");
    const raceKey = `${mode}-${turnCount}`;
    if (modalKeyRef.current === raceKey) return;
    modalKeyRef.current = raceKey;

    if (mode !== "bet") {
      openModal({
        modalTitle: "Race Finished",
        modalContent: (
          <div className="race__winnerModal">
            <p className="race__winnerModalText">{winner.name} wins the race!</p>
            <div className="race__winnerModalStandings">
              {standings.map((player, index) => (
                <div key={`winner-stand-${player.id}`} className="race__winnerModalRow">
                  <span>#{index + 1}</span>
                  <span>{player.name}</span>
                <span>
                  Lap {player.lap ?? 1} / {totalLaps} - Tile {player.position}
                </span>
                </div>
              ))}
            </div>
            <div className="race__winnerModalActions">
              <Button
                variant={BUTTON_VARIANT.PRIMARY}
                onClick={() => {
                  closeModal();
                  resetRace();
                }}
              >
                Race Again
              </Button>
              <Button
                variant={BUTTON_VARIANT.TERTIARY}
                onClick={() => {
                  closeModal();
                  navigate("/");
                }}
              >
                Return Home
              </Button>
            </div>
          </div>
        ),
        buttons: MODAL_BUTTONS.NONE,
      });
      return;
    }

    const oddsByRacer = new Map(
      (bettingRace?.racers ?? []).map((r) => [r.id, r.odds ?? [1, 1]])
    );
    const raceIndex = betting.raceIndex ?? 1;
    const isFinalRace = raceIndex >= 10;
    const winnerId = standings[0]?.id;
    const secondId = standings[1]?.id;

    const betResults = (betting.bets ?? []).map((bet) => {
      let won = false;
      let odds = [1, 1];
      let label = bet.type;
      const racerName =
        bet.racerId ? standings.find((p) => p.id === bet.racerId)?.name ?? "Racer" : "Racer";
      if (bet.type === "outright") {
        odds = oddsByRacer.get(bet.racerId) ?? [1, 1];
        label = `Outright: ${racerName}`;
        won = !!bet.racerId && bet.racerId === winnerId;
      } else if (bet.type === "eachway") {
        odds = oddsByRacer.get(bet.racerId) ?? [1, 1];
        label = `Each Way: ${racerName}`;
        won = !!bet.racerId && (bet.racerId === winnerId || bet.racerId === secondId);
      } else if (PAST_POST_BETS[bet.type]) {
        const config = PAST_POST_BETS[bet.type];
        odds = bet.odds ?? [1, 1];
        label = config.label;
        won = bet.type === "fast" ? turnCount <= config.threshold : turnCount > config.threshold;
      }
      const payoutBase =
        bet.type === "eachway"
          ? (bet.stake ?? 0) / 2
          : bet.stake ?? 0;
      const basePayout = won
        ? calcPayout(payoutBase, odds) * (bet.type === "eachway" ? 2 : 1)
        : 0;
      return {
        ...bet,
        won,
        odds,
        label,
        payout: basePayout,
      };
    });

    const baseTotal = betResults.reduce((sum, bet) => sum + bet.payout, 0);
    const totalPayout = isFinalRace ? Math.round(baseTotal * 2) : baseTotal;
    const goldAfter = (betting.gold ?? 0) + totalPayout;
    const isBankrupt = goldAfter <= 0;
    const endGame = isFinalRace || isBankrupt;

    const result = {
      raceIndex,
      isFinalRace,
      basePayout: baseTotal,
      totalPayout,
      goldAfter,
      betResults,
      turnCount,
      standings: standings.map((player, index) => ({
        id: player.id,
        name: player.name,
        position: player.position,
        place: index + 1,
      })),
    };

    setGameState((prev) => ({
      ...prev,
      betting: {
        ...(prev.betting ?? {}),
        gold: goldAfter,
        lastResult: result,
        bets: [],
        currentRace: null,
        raceIndex: endGame ? raceIndex : raceIndex + 1,
        active: endGame ? false : prev.betting?.active ?? true,
      },
    }));

    openModal({
      modalTitle: isFinalRace
        ? "Final Race Results"
        : isBankrupt
          ? "Game Over"
          : "Betting Results",
      modalContent: (
        <div className="race__winnerModal">
          <p className="race__winnerModalText">{winner.name} wins the race!</p>
          {isBankrupt && (
            <p className="race__bettingOutcome">
              You have run out of gold. The betting run is over.
            </p>
          )}
          <div className="race__winnerModalStandings">
            {standings.map((player, index) => (
              <div key={`winner-stand-${player.id}`} className="race__winnerModalRow">
                <span>#{index + 1}</span>
                <span>{player.name}</span>
                <span>
                  Lap {player.lap ?? 1} / {totalLaps} - Tile {player.position}
                </span>
              </div>
            ))}
          </div>
          <div className="race__bettingSummary">
            <div className="race__bettingRow">
              <span>Turns</span>
              <span>{turnCount}</span>
            </div>
            {betResults.map((bet) => (
              <div key={bet.id} className="race__bettingRow">
                <span>
                  {bet.label} ({bet.odds[0]}/{bet.odds[1]})
                </span>
                <span>{bet.won ? `+${bet.payout}` : "Lost"}</span>
              </div>
            ))}
            {isFinalRace && baseTotal > 0 && (
              <div className="race__bettingRow">
                <span>Final Race Bonus</span>
                <span>x2</span>
              </div>
            )}
            <div className="race__bettingTotal">
              <span>Total Winnings</span>
              <span>{totalPayout}</span>
            </div>
            <div className="race__bettingTotal">
              <span>Gold After</span>
              <span>{goldAfter}</span>
            </div>
          </div>
          <div className="race__winnerModalActions">
            <Button
              variant={BUTTON_VARIANT.PRIMARY}
              onClick={() => {
                closeModal();
                if (endGame) {
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
                } else {
                  navigate("/betting-mode");
                }
              }}
            >
              {endGame ? "Return Home" : "Back to Betting"}
            </Button>
          </div>
        </div>
      ),
      buttons: MODAL_BUTTONS.NONE,
    });
  }, [
    betting.bets,
    betting.gold,
    betting.raceIndex,
    bettingRace,
    closeModal,
    isBetting,
    navigate,
    openModal,
    resetRace,
    setGameState,
    standings,
    turnCount,
    winner,
  ]);

  useEffect(() => {
    if (!Array.isArray(gameState?.racers) || gameState.racers.length === 0) {
      navigate("/");
    }
  }, [gameState, navigate]);

  return (
    <div
      className={`race race--theme-${themeId ?? "default"}`}
      style={{ "--track-bg": activeTheme?.trackColor ?? "rgba(255,255,255,0.08)" }}
    >
      <header className="race__header">
        <div>
          <p className="race__eyebrow">Card Racing Prototype</p>
          <h1 className="race__title">{totalTiles}-Tile Sprint</h1>
          <p className="race__subtitle">
            Four racers, one combined deck. Draw cards to move each piece and race to tile {totalTiles}.
          </p>
        </div>

        <div className="race__status">
          <div className="race__statusLabel">Turns Drawn</div>
          <div className="race__statusValue">{turnCount}</div>
          <div className="race__statusMeta">Laps: {totalLaps}</div>
          {winner && <div className="race__winner">Winner: {winner.name}</div>}
        </div>
      </header>

      <div className="race__layout">
        <section className="race__trackPanel">
          <div className="race__leaderBanner">
            {standings.length > 0 ? (
              <div className="race__leaderList">
                {standings.map((player, index) => (
                  <div key={`stand-${player.id}`} className="race__leaderItem">
                    <span>#{index + 1}</span>
                    <span className="race__leaderName">
                      <span
                        className="race__leaderDot"
                        style={{ background: player.color }}
                        aria-hidden="true"
                      />
                      {player.name}
                    </span>
                    <span>
                      Lap {player.lap ?? 1} / {totalLaps} - Tile {player.position}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              "Standings: TBD"
            )}
          </div>
          <div className="race__classBanner" data-class={raceClass ?? "Unclassed"}>
            <span className="race__classLabel">Race Class</span>
            <span className="race__classValue">{raceClass ?? "Unclassed"}</span>
          </div>
          <Track
            tiles={tiles}
            players={players}
            winner={winner}
            onMeasure={handleMeasure}
            overlay={overlay}
            showPieces={false}
            pieceSize={pieceSize}
            finishTile={totalTiles}
          />
        </section>

        <aside className="race__sidePanel">
          <Deck
            drawPileCount={drawPileCount}
            discardCount={discardCount}
            lastDraw={lastDraw}
            winner={winner}
            onDraw={handleDraw}
            autoDelayDefault={isBetting ? 0.6 : 0}
          />

          {isBetting && (
            <section className="race__bets">
              <div className="race__betsHeader">
                <h2>Active Bets</h2>
                <span>{bettingBets.length}</span>
              </div>
              <div className="race__betsList">
                {bettingBets.length === 0 ? (
                  <div className="race__betsEmpty">No bets placed.</div>
                ) : (
                  bettingBets.map((bet) => (
                    <div key={bet.id} className="race__betsItem">
                      <span className="race__betsType">
                        {bet.type === "fast"
                          ? "Past The Post Fast"
                          : bet.type === "slow"
                            ? "Past The Post Slow"
                            : bet.type}
                      </span>
                      <span className="race__betsTarget">
                        {bet.racerId
                          ? players.find((p) => p.id === bet.racerId)?.name ?? "Racer"
                          : "Race"}
                      </span>
                      <span className="race__betsStake">{bet.stake}g</span>
                    </div>
                  ))
                )}
              </div>
            </section>
          )}

          <section className="race__log">
            <div className="race__logHeader">
              <h2>Race Log</h2>
              <button type="button" className="race__logClear" onClick={clearLog}>
                Clear
              </button>
            </div>
            <div className="race__logList" role="log" aria-label="Race event log">
              {log.length === 0 ? (
                <div className="race__logEmpty">No events yet.</div>
              ) : (
                log.slice(0, 12).map((entry) => (
                  <div key={entry.id} className="race__logItem">
                    <span
                      className="race__logBadge"
                      style={entry.color ? { background: entry.color, color: "#1b1b1b" } : undefined}
                    >
                      {entry.type.replace("player", "P")}
                    </span>
                    <span className="race__logText">{entry.message}</span>
                  </div>
                ))
              )}
            </div>
          </section>

          <div className="race__players">
            <div className="race__playersHeader">
              <h2>Racers</h2>
              <span>Start at tile 0</span>
            </div>
            {players.map((player) => (
              <div className="race__playerCard" key={player.id}>
                <div className="race__playerBadge" style={{ "--player-color": player.color }}>
                  {player.short}
                </div>
                <div className="race__playerInfo">
                  <div className="race__playerName">{player.name}</div>
                  <div className="race__playerPos">
                    Lap {player.lap ?? 1} / {totalLaps} - Tile {player.position}
                  </div>
                  <div className="race__playerStats">
                    <span>
                      Status:{" "}
                      {player.status.map((entry) => `${entry.type}${entry.duration}`).join(", ") ||
                        "None"}
                    </span>
                  </div>
                  <div className="race__playerDeck">Deck: {player.deck.join(", ")}</div>
                </div>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
};

export default Race;
