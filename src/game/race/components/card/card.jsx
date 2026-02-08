import "./card.scss";

const CardDisplay = ({ owner, cardClass, title, text, code, id, borderColor }) => {
  return (
    <div
      className="race-card"
      data-class={cardClass}
      style={borderColor ? { borderColor } : undefined}
    >
      <div className="race-card__header">
        <span className="race-card__class" title={cardClass} aria-label={`Class ${cardClass}`}>
          {cardClass}
        </span>
      </div>
      <h3 className="race-card__title">{title}</h3>
      <p className="race-card__text">{text}</p>
    </div>
  );
};

export default CardDisplay;
