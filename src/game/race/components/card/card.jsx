import "./card.scss";

const CardDisplay = ({ owner, cardClass, title, text, code, id, borderColor }) => {
  return (
    <div
      className="race-card"
      data-class={cardClass}
      style={borderColor ? { borderColor } : undefined}
    >
      <div className="race-card__header">
        <span className="race-card__id">{id}</span>
        <span className="race-card__class" title={cardClass} aria-label={`Class ${cardClass}`} />
      </div>
      <h3 className="race-card__title">{title}</h3>
      <p className="race-card__text">{text}</p>
      <div className="race-card__footer">
        <span className="race-card__owner">Owner: {owner}</span>
        <span className="race-card__code">{code}</span>
      </div>
    </div>
  );
};

export default CardDisplay;
