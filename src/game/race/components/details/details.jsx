import { useEffect, useMemo, useState } from "react";
import Button, { BUTTON_VARIANT } from "../../../../engine/ui/button/button";
import { Slider } from "primereact/slider";
import CardDisplay from "../card/card";
import { MODAL_BUTTONS, useModal } from "../../../../engine/ui/modal/modalContext";
import Piece from "../piece/piece";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUser } from "@fortawesome/free-solid-svg-icons";
import "./details.scss";

const Details = ({
  drawPileCount,
  discardCount,
  lastDraw,
  onDraw,
  autoDelayDefault = 0,
  turnCount = 0,
  totalLaps = 1,
  standings = [],
  raceClass,
  log = [],
  onClearLog,
  isBetting = false,
  bettingBets = [],
  players = [],
  pieceSize = "small",
  humanIds = [],
}) => {
  const { openModal, closeModal } = useModal();
  const lastDrawText = lastDraw
    ? `${lastDraw.playerName} drew ${lastDraw.cardName}`
    : "No cards drawn yet.";
  const [autoDelay, setAutoDelay] = useState(() => autoDelayDefault);
  const [manualCooldown, setManualCooldown] = useState(false);
  const showAutoStart = turnCount === 0 && autoDelay === 0;

  const autoDelayLabel = useMemo(() => {
    if (!autoDelay) return "Off";
    return `${autoDelay.toFixed(1)}s`;
  }, [autoDelay]);

  useEffect(() => {
    if (!autoDelay) return undefined;

    const interval = setInterval(() => {
      onDraw({ source: "auto", delaySec: autoDelay });
    }, autoDelay * 1000);

    return () => clearInterval(interval);
  }, [autoDelay, onDraw]);

  useEffect(() => {
    if (!manualCooldown) return undefined;
    const timeout = setTimeout(() => setManualCooldown(false), 200);
    return () => clearTimeout(timeout);
  }, [manualCooldown]);

  const openLogModal = () => {
    openModal({
      modalTitle: "Race Log",
      modalContent: (
        <div className="details__logModal">
          <div className="details__logHeader">
            <div>Race Log</div>
            <button type="button" className="details__logClear" onClick={onClearLog}>
              Clear
            </button>
          </div>
          <div className="details__logList" role="log" aria-label="Race event log">
            {log.length === 0 ? (
              <div className="details__logEmpty">No events yet.</div>
            ) : (
              log.map((entry) => (
                <div key={entry.id} className="details__logItem">
                  <span
                    className="details__logBadge"
                    style={entry.color ? { background: entry.color, color: "#1b1b1b" } : undefined}
                  >
                    {entry.type.replace("player", "P")}
                  </span>
                  <span className="details__logText">{entry.message}</span>
                </div>
              ))
            )}
          </div>
        </div>
      ),
      buttons: MODAL_BUTTONS.OK,
      onClick: () => closeModal(),
    });
  };

  const renderBetTarget = (bet) => {
    if (bet.type === "forecast") {
      const first = players.find((p) => p.id === bet.firstId);
      const second = players.find((p) => p.id === bet.secondId);
      return (
        <>
          <span className="details__betsPiece">
            <Piece
              label={first?.short}
              color={first?.color}
              playerId={bet.firstId}
              status={first?.status}
              image={first?.image}
              icon={first?.icon}
              size={pieceSize}
            />
          </span>
          <span className="details__betsPiece">
            <Piece
              label={second?.short}
              color={second?.color}
              playerId={bet.secondId}
              status={second?.status}
              image={second?.image}
              icon={second?.icon}
              size={pieceSize}
            />
          </span>
          1st {first?.name ?? "Racer"} - 2nd {second?.name ?? "Racer"}
        </>
      );
    }
    const target = bet.racerId ? players.find((p) => p.id === bet.racerId) : null;
    if (!target) return "Race";
    return (
      <>
        <span className="details__betsPiece">
          <Piece
            label={target.short}
            color={target.color}
            playerId={target.id}
            status={target.status}
            image={target.image}
            icon={target.icon}
            size={pieceSize}
          />
        </span>
        {target.name}
      </>
    );
  };

  return (
    <section className="details">
      <div className="details__leader">
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
                    {!isBetting && humanIds.includes(player.id) && (
                      <span className="race__leaderPlayerTag" aria-label="Player">
                        <FontAwesomeIcon icon={faUser} />
                      </span>
                    )}
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
      </div>
      <div className="details__class">
        <div className="race__classBanner" data-class={raceClass ?? "Unclassed"}>
          <span className="race__classLabel">Race Class</span>
          <span className="race__classValue">{raceClass ?? "Unclassed"}</span>
        </div>
      </div>

      <div className="details__counts">
        <div>
          <span>Draw Pile</span>
          <strong>{drawPileCount}</strong>
        </div>
        <div>
          <span>Discard</span>
          <strong>{discardCount}</strong>
        </div>
        <div>
          <span>Turns Drawn</span>
          <strong>{turnCount}</strong>
        </div>
        <div>
          <span>Laps</span>
          <strong>{totalLaps}</strong>
        </div>
      </div>

      {isBetting && (
        <div className="details__activeBets">
          <div className="details__betsHeader">
            <span>Active Bets</span>
            <strong>{bettingBets.length}</strong>
          </div>
          <div className="details__betsList">
            {bettingBets.length === 0 ? (
              <div className="details__betsEmpty">No bets placed.</div>
            ) : (
              bettingBets.map((bet) => {
                const odds = bet.odds ?? [1, 1];
                const stakeBase = bet.type === "eachway" ? (bet.stake ?? 0) / 2 : bet.stake ?? 0;
                const potentialWin =
                  bet.type === "forecast"
                    ? 0
                    : Math.round(stakeBase * ((odds[0] ?? 1) / (odds[1] ?? 1) + 1)) *
                      (bet.type === "eachway" ? 2 : 1);
                return (
                  <div key={bet.id} className="details__betsItem">
                    <span className="details__betsType">
                      {bet.type === "fast"
                        ? "Past The Post Fast"
                        : bet.type === "slow"
                          ? "Past The Post Slow"
                          : bet.type}
                    </span>
                    <span className="details__betsTarget">{renderBetTarget(bet)}</span>
                    <span className="details__betsOdds">
                      {bet.type === "forecast"
                        ? `Odds ${odds[0]?.[0] ?? 1}/${odds[0]?.[1] ?? 1} + ${odds[1]?.[0] ?? 1}/${
                            odds[1]?.[1] ?? 1
                          }`
                        : `Odds ${odds[0]}/${odds[1]}`}
                    </span>
                    <span className="details__betsStake">{bet.stake}g</span>
                    <span className="details__betsWin">
                      {bet.type === "forecast" ? "Win TBD" : `Win ${potentialWin}g`}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      <div className="details__actions">
        {showAutoStart && (
          <Button
            variant={BUTTON_VARIANT.SECONDARY}
            onClick={() => setAutoDelay(0.3)}
          >
            Start Race in Auto
          </Button>
        )}
        <Button
          variant={BUTTON_VARIANT.PRIMARY}
          onClick={() => {
            if (autoDelay > 0) {
              setAutoDelay(0);
              return;
            }
            if (manualCooldown) return;
            setManualCooldown(true);
            onDraw({ source: "manual" });
          }}
          disabled={autoDelay === 0 && manualCooldown}
        >
          {autoDelay > 0 ? "Pause Auto Draw" : "Draw Next Card"}
        </Button>
      </div>

      <div className="details__auto">
        <label className="details__autoLabel" htmlFor="auto-draw">
          Auto Draw
        </label>
        <div className="details__autoRow">
          <Slider
            id="auto-draw"
            value={autoDelay}
            min={0}
            max={3}
            step={0.3}
            onChange={(event) => setAutoDelay(event.value ?? 0)}
            disabled={false}
          />
          <span className="details__autoValue">{autoDelayLabel}</span>
        </div>
      </div>

      <div className="details__log">
        <Button variant={BUTTON_VARIANT.SECONDARY} onClick={openLogModal}>
          Race Log
        </Button>
      </div>
      <div className="details__cardSlot">
        {lastDraw ? (
          <CardDisplay
            owner={lastDraw.playerName}
            cardClass={lastDraw.cardClass}
            title={lastDraw.cardName}
            text={lastDraw.cardText}
            code={lastDraw.cardCode}
            id={lastDraw.cardId}
            borderColor={lastDraw.playerColor}
          />
        ) : (
          <div className="details__cardPlaceholder" aria-hidden="true" />
        )}
      </div>

    </section>
  );
};

export default Details;
