import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGhost } from "@fortawesome/free-solid-svg-icons";
import "./piece.scss";

const getSurplus = (status = []) => {
  const stamina = status.filter((entry) => entry.type === "S").length;
  const fatigue = status.filter((entry) => entry.type === "F").length;
  const surplus = stamina - fatigue;
  return { stamina, fatigue, surplus };
};

const Piece = ({ label, color, playerId, status, image, icon, size = "small", showLabel = false }) => {
  const { surplus } = getSurplus(status);
  const showBuff = surplus !== 0;
  const isStamina = surplus > 0;
  const badgeCount = Math.abs(surplus);
  const variant = image ? "image" : icon ? "icon" : "dot";
  const iconPx = size === "large" ? 50 : size === "medium" ? 35 : 20;

  const content = (() => {
    if (image) {
      return <img className="race-piece__image" src={image} alt={label || "piece"} />;
    }
    if (icon === "ghost") {
      return (
        <FontAwesomeIcon
          icon={faGhost}
          style={{ color, width: `${iconPx}px`, height: `${iconPx}px` }}
        />
      );
    }
    return showLabel ? label : null;
  })();

  return (
    <div
      className={`race-piece race-piece--${variant} race-piece--${size}`}
      data-player={playerId}
      style={{ "--piece-color": color }}
    >
      {content}
      {showBuff && (
        <span className={`race-piece__buff ${isStamina ? "race-piece__buff--stamina" : "race-piece__buff--fatigue"}`}>
          {badgeCount > 1 ? badgeCount : ""}
        </span>
      )}
    </div>
  );
};

export default Piece;
