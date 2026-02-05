import "./card.scss";

const CardDisplay = ({ owner, cardClass, title, text, code, id }) => {
  return (
    <div className="race-card" data-class={cardClass}>
      <div className="race-card__header">
        <span className="race-card__id">{id}</span>
        <span className="race-card__class">{cardClass}</span>
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
