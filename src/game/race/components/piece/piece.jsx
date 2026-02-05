import "./piece.scss";

const getSurplus = (status = []) => {
  const stamina = status.filter((entry) => entry.type === "S").length;
  const fatigue = status.filter((entry) => entry.type === "F").length;
  const surplus = stamina - fatigue;
  return { stamina, fatigue, surplus };
};

const Piece = ({ label, color, playerId, status }) => {
  const { surplus } = getSurplus(status);
  const showBuff = surplus !== 0;
  const isStamina = surplus > 0;
  const badgeCount = Math.abs(surplus);

  return (
    <div
      className="race-piece"
      data-player={playerId}
      style={{ "--piece-color": color }}
    >
      {label}
      {showBuff && (
        <span className={`race-piece__buff ${isStamina ? "race-piece__buff--stamina" : "race-piece__buff--fatigue"}`}>
          {badgeCount > 1 ? badgeCount : ""}
        </span>
      )}
    </div>
  );
};

export default Piece;
