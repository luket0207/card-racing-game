import { useEffect, useRef } from "react";
import Piece from "../piece/piece";
import "./track.scss";

const Track = ({ tiles, players, onMeasure, overlay, showPieces = true, pieceSize = "small" }) => {
  const boardRef = useRef(null);
  const startRef = useRef(null);
  const tileRefs = useRef({});

  useEffect(() => {
    if (!onMeasure) return undefined;

    const measure = () => {
      const boardNode = boardRef.current;
      if (!boardNode) return;
      const boardRect = boardNode.getBoundingClientRect();
      const positions = {};

      if (startRef.current) {
        const rect = startRef.current.getBoundingClientRect();
        positions[0] = {
          x: rect.left - boardRect.left + rect.width / 2,
          y: rect.top - boardRect.top + rect.height / 2,
        };
      }

      tiles.forEach((tile) => {
        const node = tileRefs.current[tile];
        if (!node) return;
        const rect = node.getBoundingClientRect();
        positions[tile] = {
          x: rect.left - boardRect.left + rect.width / 2,
          y: rect.top - boardRect.top + rect.height / 2,
        };
      });

      onMeasure(positions);
    };

    const raf = requestAnimationFrame(measure);
    window.addEventListener("resize", measure);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", measure);
    };
  }, [onMeasure, tiles]);

  const playersAtStart = players.filter((player) => player.position === 0);

  return (
    <div className="race-track">
      <div className="race-track__meta">
        <div className="race-track__start">
          <div className="race-track__startLabel">Start</div>
          <div className="race-track__pieceRow" ref={startRef}>
            {showPieces &&
              playersAtStart.map((player) => (
                <Piece
                  key={player.id}
                  label={player.short}
                  color={player.color}
                  playerId={player.id}
                  status={player.status}
                  image={player.image}
                  icon={player.icon}
                  size={pieceSize}
                />
              ))}
          </div>
        </div>
        <div className="race-track__finish">Finish: Tile 64</div>
      </div>

      <div className="race-track__board" ref={boardRef}>
        <div className="race-track__grid">
          {tiles.map((tile) => {
            const playersOnTile = players.filter((player) => player.position === tile);

            return (
              <div
                key={`tile-${tile}`}
                className={`race-track__tile${tile === 64 ? " race-track__tile--finish" : ""}`}
                ref={(node) => {
                  if (node) tileRefs.current[tile] = node;
                }}
              >
                <div className="race-track__tileNumber">{tile}</div>
                {showPieces && (
                  <div className="race-track__pieces">
                    {playersOnTile.map((player) => (
                      <Piece
                        key={`${tile}-${player.id}`}
                        label={player.short}
                        color={player.color}
                        playerId={player.id}
                        status={player.status}
                        image={player.image}
                        icon={player.icon}
                        size={pieceSize}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {overlay}
      </div>
    </div>
  );
};

export default Track;
