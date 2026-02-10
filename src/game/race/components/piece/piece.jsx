import { useId } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import "./piece.scss";

const getSurplus = (status = []) => {
  const stamina = status.filter((entry) => entry.type === "S").length;
  const fatigue = status.filter((entry) => entry.type === "F").length;
  const surplus = stamina - fatigue;
  return { stamina, fatigue, surplus };
};

const Piece = ({ label, color, gradient, playerId, status, image, icon, size = "small" }) => {
  const { surplus } = getSurplus(status);
  const showBuff = surplus !== 0;
  const isStamina = surplus > 0;
  const badgeCount = Math.abs(surplus);
  const variant = image ? "image" : "icon";
  const iconPx = size === "large" ? 50 : size === "medium" ? 35 : 20;
  const gradientId = useId().replace(/:/g, "");
  const hasGradient = Array.isArray(gradient) && gradient.length >= 2;

  const content = (() => {
    if (image) {
      return <img className="race-piece__image" src={image} alt={label || "piece"} />;
    }
    if (icon) {
      if (hasGradient && icon.icon) {
        const [width, height, , , svgPathData] = icon.icon;
        const paths = Array.isArray(svgPathData) ? svgPathData : [svgPathData];
        return (
          <svg
            className="race-piece__icon-svg"
            viewBox={`0 0 ${width} ${height}`}
            width={iconPx}
            height={iconPx}
            aria-hidden="true"
            focusable="false"
          >
            <defs>
              <linearGradient id={`piece-gradient-${gradientId}`} x1="0%" y1="0%" x2="100%" y2="100%">
                {gradient.map((stop, idx) => (
                  <stop
                    key={`${gradientId}-stop-${idx}`}
                    offset={`${(idx / (gradient.length - 1)) * 100}%`}
                    stopColor={stop}
                  />
                ))}
              </linearGradient>
            </defs>
            {paths.map((path, idx) => (
              <path key={`${gradientId}-path-${idx}`} d={path} fill={`url(#piece-gradient-${gradientId})`} />
            ))}
          </svg>
        );
      }
      return (
        <FontAwesomeIcon
          icon={icon}
          style={{ color, width: `${iconPx}px`, height: `${iconPx}px`, fontSize: `${iconPx}px` }}
        />
      );
    }
    return null;
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
