import Piece from "../piece/piece";
import "./track.scss";

const Track = ({ tiles, players }) => {
  const playersAtStart = players.filter((player) => player.position === 0);

  return (
    <div className="race-track">
      <div className="race-track__meta">
        <div className="race-track__start">
          <div className="race-track__startLabel">Start</div>
          <div className="race-track__pieceRow">
            {playersAtStart.map((player) => (
              <Piece
                key={player.id}
                label={player.short}
                color={player.color}
                playerId={player.id}
                status={player.status}
              />
            ))}
          </div>
        </div>
        <div className="race-track__finish">Finish: Tile 64</div>
      </div>

      <div className="race-track__grid">
        {tiles.map((tile) => {
          const playersOnTile = players.filter((player) => player.position === tile);

          return (
            <div
              key={`tile-${tile}`}
              className={`race-track__tile${tile === 64 ? " race-track__tile--finish" : ""}`}
            >
              <div className="race-track__tileNumber">{tile}</div>
              <div className="race-track__pieces">
                {playersOnTile.map((player) => (
                  <Piece
                    key={`${tile}-${player.id}`}
                    label={player.short}
                    color={player.color}
                    playerId={player.id}
                    status={player.status}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Track;
