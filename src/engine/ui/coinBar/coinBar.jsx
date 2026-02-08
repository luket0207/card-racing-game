import "./coinBar.scss";

const CLASS_KEYS = ["Red", "Blue", "Green", "Yellow", "Orange"];

const CoinBar = ({
  coinArray = {},
  segmentWidth = 38,
  height = 20,
  borderWidth = 3,
}) => {
  return (
    <div className="coin-bar" aria-label="Class Coins">
      {CLASS_KEYS.flatMap((cls) => {
        const count = coinArray?.[cls] ?? 0;
        return Array.from({ length: count }, (_, idx) => (
          <span
            key={`${cls}-coin-${idx}`}
            className={`coin-bar__seg coin-bar__seg--${cls.toLowerCase()}`}
            style={{
              width: `${segmentWidth}px`,
              height: `${height}px`,
              borderRightWidth: `${borderWidth}px`,
            }}
          />
        ));
      })}
    </div>
  );
};

export default CoinBar;
