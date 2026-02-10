import { useEffect, useMemo, useRef } from "react";
import Piece from "../piece/piece";
import "./track.scss";

const buildTrackPositions = (count) => {
  if (count <= 0) return [];
  const topY = 14;
  const bottomY = 86;
  const centerY = (topY + bottomY) / 2;
  const radius = (bottomY - topY) / 2;
  const leftX = 10;
  const rightX = Math.min(90, leftX + radius * 2);
  const straightLen = rightX - leftX;
  const arcLen = Math.PI * radius;
  const totalLen = straightLen * 2 + arcLen * 2;

  const getPosByS = (s) => {
    if (s < straightLen) {
      return { x: leftX + s, y: topY };
    }
    if (s < straightLen + arcLen) {
      const t = (s - straightLen) / arcLen;
      const angle = (-90 + 180 * t) * (Math.PI / 180);
      return {
        x: rightX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius,
      };
    }
    if (s < straightLen + arcLen + straightLen) {
      const t = (s - straightLen - arcLen) / straightLen;
      return { x: rightX - t * straightLen, y: bottomY };
    }
    const t = (s - straightLen - arcLen - straightLen) / arcLen;
    const angle = (90 + 180 * t) * (Math.PI / 180);
    return {
      x: leftX + Math.cos(angle) * radius,
      y: centerY + Math.sin(angle) * radius,
    };
  };

  const positions = Array.from({ length: count }, (_, i) => {
    const s = (i / count) * totalLen;
    return getPosByS(s);
  });

  positions.startPoint = getPosByS(totalLen - totalLen / count / 2);
  return positions;
};

const Track = ({
  tiles,
  players,
  onMeasure,
  overlay,
  showPieces = true,
  pieceSize = "small",
  finishTile = 32,
}) => {
  const boardRef = useRef(null);
  const startRef = useRef(null);
  const tileRefs = useRef({});

  useEffect(() => {
    const boardNode = boardRef.current;
    if (!boardNode) return undefined;

    boardNode.style.setProperty("--track-bg-y", "50%");

    const handleMove = (event) => {
      const ratio = Math.min(Math.max(event.clientY / window.innerHeight, 0), 1);
      const maxShift = 10;
      const yPos = 50 + (0.5 - ratio) * (maxShift * 2);
      boardNode.style.setProperty("--track-bg-y", `${yPos}%`);
    };

    window.addEventListener("mousemove", handleMove);

    return () => {
      window.removeEventListener("mousemove", handleMove);
    };
  }, []);

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
  const positions = useMemo(() => buildTrackPositions(tiles.length), [tiles.length]);

  const startPos = useMemo(() => positions.startPoint ?? null, [positions]);

  return (
    <div className="race-track">
      <div className="race-track__board" ref={boardRef}>
        <div className="race-track__grid">
          {startPos && (
            <div
              className="race-track__startMarker"
              ref={startRef}
              style={{ left: `${startPos.x}%`, top: `${startPos.y}%` }}
            >
              {showPieces &&
                playersAtStart.map((player) => (
                  <Piece
                    key={player.id}
                    label={player.short}
                    color={player.color}
                    gradient={player.gradient}
                    playerId={player.id}
                    status={player.status}
                    image={player.image}
                    icon={player.icon}
                    size={pieceSize}
                  />
                ))}
            </div>
          )}
          {tiles.map((tile, index) => {
            const playersOnTile = players.filter((player) => player.position === tile);
            const pos = positions[index];

            return (
              <div
                key={`tile-${tile}`}
                className={`race-track__tile${
                  tile === 1 ? " race-track__tile--start" : ""
                }${tile === finishTile ? " race-track__tile--finish" : ""}`}
                ref={(node) => {
                  if (node) tileRefs.current[tile] = node;
                }}
                style={
                  pos
                    ? {
                        left: `${pos.x}%`,
                        top: `${pos.y}%`,
                      }
                    : undefined
                }
              >
                <div className="race-track__tileNumber">{tile}</div>
                {showPieces && (
                  <div className="race-track__pieces">
                    {playersOnTile.map((player) => (
                      <Piece
                        key={`${tile}-${player.id}`}
                        label={player.short}
                        color={player.color}
                        gradient={player.gradient}
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
