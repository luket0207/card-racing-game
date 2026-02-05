import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Button, { BUTTON_VARIANT } from "../../engine/ui/button/button";
import { useGame } from "../../engine/gameContext/gameContext";
import "./raceSetup.scss";

const DEFAULT_COLORS = [
  { label: "Red", value: "#ff6b6b" },
  { label: "Blue", value: "#4dabf7" },
  { label: "Green", value: "#63e6be" },
  { label: "Yellow", value: "#ffd43b" },
  { label: "Orange", value: "#ffa94d" },
  { label: "Purple", value: "#b197fc" },
];

const AI_NAMES = [
  "Nova", "Bolt", "Echo", "Viper", "Atlas", "Rook", "Jinx", "Mako", "Blitz", "Sable",
  "Rift", "Quill", "Lumen", "Glitch", "Zephyr",
];

const buildDefaultRacers = (count, humanCount) => {
  const racers = [];
  for (let i = 0; i < count; i += 1) {
    const isHuman = i < humanCount;
    racers.push({
      id: `player${i + 1}`,
      name: isHuman ? `Player ${i + 1}` : AI_NAMES[i % AI_NAMES.length],
      type: isHuman ? "human" : "ai",
      color: DEFAULT_COLORS[i % DEFAULT_COLORS.length].value,
    });
  }
  return racers;
};

const RaceSetup = () => {
  const navigate = useNavigate();
  const { setGameState } = useGame();
  const [racerCount, setRacerCount] = useState(4);
  const [humanCount, setHumanCount] = useState(2);
  const [racers, setRacers] = useState(() => buildDefaultRacers(4, 2));

  const activeRacers = useMemo(() => racers.slice(0, racerCount), [racers, racerCount]);

  const ensureUniqueColors = useCallback((nextRacers) => {
    const used = new Set();
    const colors = DEFAULT_COLORS.map((c) => c.value);
    return nextRacers.map((r) => {
      let color = r.color;
      if (used.has(color)) {
        color = colors.find((c) => !used.has(c)) ?? color;
      }
      used.add(color);
      return { ...r, color };
    });
  }, []);

  const handleRacerCountChange = useCallback((value) => {
    setRacerCount(value);
    setHumanCount((prev) => Math.min(prev, value));
    setRacers((prev) => {
      const next = buildDefaultRacers(value, Math.min(humanCount, value));
      const merged = next.map((r, idx) => (prev[idx] ? { ...next[idx], ...prev[idx] } : r));
      return ensureUniqueColors(merged);
    });
  }, [ensureUniqueColors, humanCount]);

  const handleHumanCountChange = useCallback((value) => {
    setHumanCount(value);
    setRacers((prev) =>
      prev.map((r, idx) => ({
        ...r,
        type: idx < value ? "human" : "ai",
        name: idx < value ? r.name : AI_NAMES[idx % AI_NAMES.length],
      }))
    );
  }, []);

  const updateRacer = useCallback((index, updates) => {
    setRacers((prev) => {
      const next = prev.map((r, idx) => (idx === index ? { ...r, ...updates } : r));
      return ensureUniqueColors(next);
    });
  }, [ensureUniqueColors]);

  const startDeckSelection = useCallback(() => {
    const trimmed = activeRacers.map((r) => ({
      id: r.id,
      name: r.name.trim() || r.id,
      type: r.type,
      color: r.color,
    }));
    setGameState((prev) => ({
      ...prev,
      racers: trimmed,
    }));
    navigate("/deck-selection");
  }, [activeRacers, navigate, setGameState]);

  return (
    <div className="race-setup">
      <header className="race-setup__header">
        <div>
          <h1>Race Setup</h1>
          <p>Choose racers, human vs AI, names, and piece colors.</p>
        </div>
        <Button variant={BUTTON_VARIANT.TERTIARY} to="/">
          Back Home
        </Button>
      </header>

      <div className="race-setup__controls">
        <div className="race-setup__control">
          <label htmlFor="racer-count">Racers</label>
          <select
            id="racer-count"
            value={racerCount}
            onChange={(e) => handleRacerCountChange(Number(e.target.value))}
          >
            {[2, 3, 4].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>

        <div className="race-setup__control">
          <label htmlFor="human-count">Human Players</label>
          <select
            id="human-count"
            value={humanCount}
            onChange={(e) => handleHumanCountChange(Number(e.target.value))}
          >
            {Array.from({ length: racerCount }, (_, idx) => idx + 1).map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="race-setup__grid">
        {activeRacers.map((racer, index) => (
          <div key={racer.id} className="race-setup__card">
            <div className="race-setup__cardHeader">
              <span>{racer.id.toUpperCase()}</span>
              <span className={racer.type === "human" ? "is-human" : "is-ai"}>
                {racer.type === "human" ? "Human" : "AI"}
              </span>
            </div>

            <div className="race-setup__field">
              <label>Name</label>
              <input
                type="text"
                value={racer.name}
                onChange={(e) => updateRacer(index, { name: e.target.value })}
                disabled={racer.type !== "human"}
              />
            </div>

            <div className="race-setup__field">
              <label>Piece Color</label>
              <select
                value={racer.color}
                onChange={(e) => updateRacer(index, { color: e.target.value })}
              >
                {DEFAULT_COLORS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
              <div className="race-setup__colorSwatch" style={{ background: racer.color }} />
            </div>
          </div>
        ))}
      </div>

      <footer className="race-setup__footer">
        <Button variant={BUTTON_VARIANT.PRIMARY} onClick={startDeckSelection}>
          Continue to Decks
        </Button>
      </footer>
    </div>
  );
};

export default RaceSetup;
