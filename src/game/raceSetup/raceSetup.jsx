import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Button, { BUTTON_VARIANT } from "../../engine/ui/button/button";
import { Dropdown } from "primereact/dropdown";
import { InputText } from "primereact/inputtext";
import Piece from "../race/components/piece/piece";
import { useGame } from "../../engine/gameContext/gameContext";
import themes from "../../assets/gameContent/themes";
import "./raceSetup.scss";

const AI_NAMES = [
  "Nova", "Bolt", "Echo", "Viper", "Atlas", "Rook", "Jinx", "Mako", "Blitz", "Sable",
  "Rift", "Quill", "Lumen", "Glitch", "Zephyr",
];

const shuffle = (items) => {
  const array = [...items];
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};

const buildDefaultRacers = (count, humanCount, theme) => {
  const pieces = theme?.pieces ?? [];
  const pooledNames = theme?.namePool ?? AI_NAMES;
  const fixed = theme?.nameStyle === "fixed";
  const aiNamePool = shuffle(pooledNames);
  const racers = [];
  for (let i = 0; i < count; i += 1) {
    const isHuman = i < humanCount;
    const piece = pieces[i % pieces.length];
    const baseName = fixed && piece ? piece.name : aiNamePool[i % aiNamePool.length];
    racers.push({
      id: `player${i + 1}`,
      name: baseName,
      type: isHuman ? "human" : "ai",
      pieceId: piece?.id ?? `piece-${i + 1}`,
      color: piece?.color ?? "#ffffff",
      image: piece?.image ?? null,
      icon: piece?.icon ?? null,
    });
  }
  return racers;
};

const RaceSetup = () => {
  const navigate = useNavigate();
  const { setGameState } = useGame();
  const [themeId, setThemeId] = useState("cars");
  const activeTheme = useMemo(
    () => themes.find((t) => t.id === themeId) ?? themes[0],
    [themeId]
  );
  const [racerCount, setRacerCount] = useState(4);
  const [humanCount, setHumanCount] = useState(1);
  const [lapCount, setLapCount] = useState(1);
  const [racers, setRacers] = useState(() => buildDefaultRacers(4, 1, themes[0]));

  const activeRacers = useMemo(() => racers.slice(0, racerCount), [racers, racerCount]);

  const ensureUniqueColors = useCallback((nextRacers) => {
    const usedPieces = new Set();
    const pieces = activeTheme?.pieces ?? [];
    const fixed = activeTheme?.nameStyle === "fixed";

    return nextRacers.map((r) => {
      let piece = pieces.find((p) => p.id === r.pieceId) ?? pieces[0];
      if (piece && usedPieces.has(piece.id)) {
        piece = pieces.find((p) => !usedPieces.has(p.id)) ?? piece;
      }
      if (piece) usedPieces.add(piece.id);
      return {
        ...r,
        pieceId: piece?.id ?? r.pieceId,
        color: piece?.color ?? r.color,
        image: piece?.image ?? r.image,
        icon: piece?.icon ?? r.icon,
        name: fixed && piece ? piece.name : r.name,
      };
    });
  }, [activeTheme]);

  const handleRacerCountChange = useCallback((value) => {
    setRacerCount(value);
    setHumanCount((prev) => Math.min(prev, value));
    setRacers((prev) => {
      const next = buildDefaultRacers(value, Math.min(humanCount, value), activeTheme);
      const merged = next.map((r, idx) => (prev[idx] ? { ...next[idx], ...prev[idx] } : r));
      return ensureUniqueColors(merged);
    });
  }, [activeTheme, ensureUniqueColors, humanCount]);

  const handleHumanCountChange = useCallback((value) => {
    setHumanCount(value);
    const aiNames = shuffle(activeTheme?.namePool ?? AI_NAMES);
    setRacers((prev) =>
      prev.map((r, idx) => {
        const isHuman = idx < value;
        return {
          ...r,
          type: isHuman ? "human" : "ai",
          name:
            activeTheme?.nameStyle === "fixed"
              ? r.name
              : aiNames[idx % aiNames.length],
        };
      })
    );
  }, [activeTheme, racerCount]);

  const handleThemeChange = useCallback((value) => {
    const nextTheme = themes.find((t) => t.id === value) ?? themes[0];
    setThemeId(nextTheme.id);
    setRacers(buildDefaultRacers(racerCount, humanCount, nextTheme));
  }, [humanCount, racerCount]);

  const updateRacer = useCallback((index, updates) => {
    setRacers((prev) => {
      const next = prev.map((r, idx) => (idx === index ? { ...r, ...updates } : r));
      return ensureUniqueColors(next);
    });
  }, [ensureUniqueColors]);

  const startDeckSelection = useCallback(() => {
    const trimmed = activeRacers.map((r, idx) => ({
      id: r.id,
      name: r.name.trim() || r.id,
      type: r.type,
      color: r.color,
      pieceId: r.pieceId,
      image: r.image ?? null,
      icon: r.icon ?? null,
      short: `P${idx + 1}`,
    }));
    setGameState((prev) => ({
      ...prev,
      themeId: activeTheme?.id ?? "cars",
      racers: trimmed,
      raceLaps: lapCount,
    }));
    navigate("/deck-selection");
  }, [activeRacers, activeTheme?.id, navigate, setGameState]);

  return (
    <div className="race-setup site-background-colour secondary-text-colour">
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
        <div className="race-setup__control secondary-background-colour secondary-text-colour">
          <label htmlFor="theme-select">Theme</label>
          <Dropdown
            id="theme-select"
            value={themeId}
            options={themes.map((theme) => ({ label: theme.name, value: theme.id }))}
            onChange={(e) => handleThemeChange(e.value)}
          />
        </div>
        <div className="race-setup__control secondary-background-colour secondary-text-colour">
          <label htmlFor="racer-count">Racers</label>
          <Dropdown
            id="racer-count"
            value={racerCount}
            options={[2, 3, 4].map((value) => ({ label: String(value), value }))}
            onChange={(e) => handleRacerCountChange(Number(e.value))}
          />
        </div>

        <div className="race-setup__control secondary-background-colour secondary-text-colour">
          <label htmlFor="human-count">Human Players</label>
          <Dropdown
            id="human-count"
            value={humanCount}
            options={Array.from({ length: racerCount }, (_, idx) => idx + 1).map((value) => ({
              label: String(value),
              value,
            }))}
            onChange={(e) => handleHumanCountChange(Number(e.value))}
          />
        </div>

        <div className="race-setup__control secondary-background-colour secondary-text-colour">
          <label htmlFor="lap-count">Laps</label>
          <Dropdown
            id="lap-count"
            value={lapCount}
            options={Array.from({ length: 5 }, (_, idx) => idx + 1).map((value) => ({
              label: String(value),
              value,
            }))}
            onChange={(e) => setLapCount(Number(e.value))}
          />
        </div>
      </div>

      <div className="race-setup__grid">
        {activeRacers.map((racer, index) => (
          <div key={racer.id} className="race-setup__card secondary-background-colour secondary-text-colour">
            <div className="race-setup__cardHeader">
              <span>{racer.id.toUpperCase()}</span>
              <span className={racer.type === "human" ? "is-human" : "is-ai"}>
                {racer.type === "human" ? "Human" : "AI"}
              </span>
            </div>

            <div className="race-setup__field">
              <label>Name</label>
              <InputText
                value={racer.name}
                onChange={(e) => updateRacer(index, { name: e.target.value })}
                disabled={racer.type !== "human" && activeTheme?.nameStyle === "fixed"}
              />
            </div>

            <div className="race-setup__field">
              <label>Piece</label>
              <div className="race-setup__pieceRow">
                <div className="race-setup__piecePreview tertiary-background-colour tertiary-text-colour">
                  <Piece
                    label={racer.name}
                    color={racer.color}
                    playerId={racer.id}
                    status={[]}
                    image={racer.image}
                    icon={racer.icon}
                    size={activeTheme?.iconSize ?? "small"}
                  />
                </div>
                <Dropdown
                  value={racer.pieceId}
                  options={(activeTheme?.pieces ?? []).map((piece) => ({
                    label: piece.name,
                    value: piece.id,
                  }))}
                  onChange={(e) => {
                    const piece = activeTheme?.pieces?.find((p) => p.id === e.value);
                    if (!piece) return;
                    const name = activeTheme?.nameStyle === "fixed" ? piece.name : racer.name;
                    updateRacer(index, {
                      pieceId: piece.id,
                      color: piece.color,
                      image: piece.image ?? null,
                      icon: piece.icon ?? null,
                      name,
                    });
                  }}
                />
              </div>
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
