import { useEffect, useMemo, useState } from "react";
import Button, { BUTTON_VARIANT } from "../../../../engine/ui/button/button";
import { Slider } from "primereact/slider";
import CardDisplay from "../card/card";
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
}) => {
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
