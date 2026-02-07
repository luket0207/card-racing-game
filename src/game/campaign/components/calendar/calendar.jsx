import "./calendar.scss";

const DAY_LABELS = Object.freeze({
  normal: "Normal",
  race: "Race",
  event: "Event",
  miniGame: "Mini Game",
});

const Calendar = ({ calendar, dayIndex, monthNames }) => {
  const safeDay = Math.max(0, Math.min(dayIndex ?? 0, (calendar?.length ?? 1) - 1));
  const monthIndex = Math.floor(safeDay / 28);
  const monthStart = monthIndex * 28;
  const monthDays = calendar?.slice(monthStart, monthStart + 28) ?? [];
  const monthName = monthNames?.[monthIndex] ?? "Month";

  return (
    <div className="campaign-calendar">
      <div className="campaign-calendar__header">
        <h2>{monthName}</h2>
        <span>
          Day {safeDay + 1} / {calendar?.length ?? 0}
        </span>
      </div>
      <div className="campaign-calendar__grid">
        {monthDays.map((day, idx) => {
          const absoluteDay = monthStart + idx;
          const type = day?.type ?? "normal";
          return (
            <div
              key={`day-${absoluteDay}`}
              className={`campaign-calendar__day campaign-calendar__day--${type}${
                absoluteDay === safeDay ? " campaign-calendar__day--active" : ""
              }`}
            >
              <div className="campaign-calendar__dayNumber">{idx + 1}</div>
              <div className="campaign-calendar__dayType">{DAY_LABELS[type] ?? "Normal"}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Calendar;
