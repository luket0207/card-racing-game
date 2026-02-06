import { useEffect, useMemo, useState } from "react";
import Button, { BUTTON_VARIANT } from "../../../../engine/ui/button/button";
import { Slider } from "primereact/slider";
import CardDisplay from "../card/card";
import "./deck.scss";

const Deck = ({ drawPileCount, discardCount, lastDraw, winner, onDraw, autoDelayDefault = 0 }) => {
  const lastDrawText = lastDraw
    ? `${lastDraw.playerName} drew ${lastDraw.cardName}`
    : "No cards drawn yet.";
  const [autoDelay, setAutoDelay] = useState(() => autoDelayDefault);
  const [manualCooldown, setManualCooldown] = useState(false);

  const autoDelayLabel = useMemo(() => {
    if (!autoDelay) return "Off";
    return `${autoDelay.toFixed(1)}s`;
  }, [autoDelay]);

  useEffect(() => {
    if (!autoDelay || winner) return undefined;

    const interval = setInterval(() => {
      onDraw({ source: "auto", delaySec: autoDelay });
    }, autoDelay * 1000);

    return () => clearInterval(interval);
  }, [autoDelay, onDraw, winner]);

  useEffect(() => {
    if (!manualCooldown) return undefined;
    const timeout = setTimeout(() => setManualCooldown(false), 500);
    return () => clearTimeout(timeout);
  }, [manualCooldown]);

  return (
    <section className="race-deck">
      <div className="race-deck__header">
        <div>
          <h2>Race Deck</h2>
          <p>Combined 64-card pile built from each player deck.</p>
        </div>
        <div className="race-deck__counts">
          <div>
            <span>Draw Pile</span>
            <strong>{drawPileCount}</strong>
          </div>
          <div>
            <span>Discard</span>
            <strong>{discardCount}</strong>
          </div>
        </div>
      </div>

      <div className="race-deck__actions">
        <Button
          variant={BUTTON_VARIANT.PRIMARY}
          onClick={() => {
            if (winner) return;
            if (autoDelay > 0) {
              setAutoDelay(0);
              return;
            }
            if (manualCooldown) return;
            setManualCooldown(true);
            onDraw({ source: "manual" });
          }}
          disabled={!!winner || (autoDelay === 0 && manualCooldown)}
        >
          {autoDelay > 0 ? "Pause Auto Draw" : "Draw Next Card"}
        </Button>
      </div>

      <div className="race-deck__auto">
        <label className="race-deck__autoLabel" htmlFor="auto-draw">
          Auto Draw
        </label>
        <div className="race-deck__autoRow">
          <Slider
            id="auto-draw"
            value={autoDelay}
            min={0}
            max={3}
            step={0.3}
            onChange={(event) => setAutoDelay(event.value ?? 0)}
            disabled={!!winner}
          />
          <span className="race-deck__autoValue">{autoDelayLabel}</span>
        </div>
      </div>

      <div className="race-deck__card">
        <div className="race-deck__label">Latest Draw</div>
        <div className="race-deck__draw">{lastDrawText}</div>
        {lastDraw?.reshuffled && <div className="race-deck__reshuffle">Discard pile reshuffled.</div>}
      </div>

      {lastDraw && (
        <CardDisplay
          owner={lastDraw.playerName}
          cardClass={lastDraw.cardClass}
          title={lastDraw.cardName}
          text={lastDraw.cardText}
          code={lastDraw.cardCode}
          id={lastDraw.cardId}
          borderColor={lastDraw.playerColor}
        />
      )}

      {winner && <div className="race-deck__winnerBanner">{winner.name} wins!</div>}
    </section>
  );
};

export default Deck;
