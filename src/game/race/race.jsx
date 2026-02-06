import { useCallback, useEffect, useMemo, useState } from "react";
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
    drawNextCard,
    resetRace,
  } = useRaceEngine();
  const { log, clearLog } = useToast();
  const { openModal, closeModal } = useModal();
  const navigate = useNavigate();
  const { gameState } = useGame();
  const activeTheme = useMemo(
    () => themes.find((t) => t.id === themeId) ?? themes[0],
    [themeId]
  );
  const pieceSize = activeTheme?.iconSize ?? "small";
  const standings = useMemo(() => {
    return [...players].sort((a, b) => {
      if (b.position !== a.position) return b.position - a.position;
      const aSeq = a.arrivalSeq > 0 ? a.arrivalSeq : Number.POSITIVE_INFINITY;
      const bSeq = b.arrivalSeq > 0 ? b.arrivalSeq : Number.POSITIVE_INFINITY;
      return aSeq - bSeq;
    });
  }, [players]);
  const [tilePositions, setTilePositions] = useState({});
  const [moveDurationMs, setMoveDurationMs] = useState(500);

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
    [moveDurationMs, players, tilePositions]
  );

  useEffect(() => {
    if (!winner) return;
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
                <span>Tile {player.position}</span>
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
  }, [winner, openModal, closeModal, navigate]);

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
          <h1 className="race__title">64-Tile Sprint</h1>
          <p className="race__subtitle">
            Four racers, one combined deck. Draw cards to move each piece and race to tile 64.
          </p>
        </div>

        <div className="race__status">
          <div className="race__statusLabel">Turns Drawn</div>
          <div className="race__statusValue">{turnCount}</div>
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
                    <span>{player.name}</span>
                    <span>Tile {player.position}</span>
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
          />
        </section>

        <aside className="race__sidePanel">
          <Deck
            drawPileCount={drawPileCount}
            discardCount={discardCount}
            lastDraw={lastDraw}
            winner={winner}
            onDraw={handleDraw}
          />

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
                  <div className="race__playerPos">Tile {player.position}</div>
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
