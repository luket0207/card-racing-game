import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dropdown } from "primereact/dropdown";
import { InputText } from "primereact/inputtext";
import Button, { BUTTON_VARIANT } from "../../engine/ui/button/button";
import { MODAL_BUTTONS, useModal } from "../../engine/ui/modal/modalContext";
import { DEFAULT_GAME_STATE, useGame } from "../../engine/gameContext/gameContext";
import themes from "../../assets/gameContent/themes";
import cards from "../../assets/gameContent/cards";
import events from "../../assets/gameContent/events";
import Calendar from "./components/calendar/calendar";
import EndCampaignModal from "./components/endCampaignModal/endCampaignModal";
import Piece from "../race/components/piece/piece";
import { buildCampaignCalendar } from "./hooks/useCampaignCalendar";
import { buildCampaignRaces, buildRaceDayDecks } from "./hooks/useCampaignRaces";
import LoadingSpinner from "../../engine/ui/loadingSpinner/loadingSpinner";
import "./campaignHome.scss";


const DEFAULT_CAMPAIGN = {
  active: false,
  playerName: "",
  themeId: "cars",
  pieceId: "",
  difficulty: "normal",
  coinArray: { Red: 3, Blue: 3, Green: 3, Yellow: 3, Orange: 3 },
  deck: [],
  library: [],
  goldCoins: 0,
  points: 0,
  results: [],
  calendar: [],
  day: 0,
  monthNames: [],
  races: [],
};

const COST1_LIBRARY = cards.filter((card) => card.cost === 1).map((card) => card.id);

const buildStartingCoinArray = () => {
  const base = { Red: 3, Blue: 3, Green: 3, Yellow: 3, Orange: 3 };
  const keys = Object.keys(base);
  const boosted = keys[Math.floor(Math.random() * keys.length)];
  return { ...base, [boosted]: 4 };
};

const CampaignHome = () => {
  const navigate = useNavigate();
  const { gameState, setGameState } = useGame();
  const { openModal, closeModal } = useModal();

  const campaign = gameState.campaign ?? DEFAULT_CAMPAIGN;
  const isActive = campaign.active === true;

  const [playerName, setPlayerName] = useState(
    campaign.playerName || "My Racing Campaign"
  );
  const [themeId, setThemeId] = useState(campaign.themeId || themes[0]?.id);
  const [pieceId, setPieceId] = useState(campaign.pieceId || "");
  const [difficulty, setDifficulty] = useState(campaign.difficulty || "normal");
  const [isGeneratingRace, setIsGeneratingRace] = useState(false);
  const [pieceNameMap, setPieceNameMap] = useState({});

  const activeTheme = useMemo(
    () => themes.find((t) => t.id === themeId) ?? themes[0],
    [themeId]
  );

  useEffect(() => {
    const pool = activeTheme?.namePool ?? [];
    const pieces = activeTheme?.pieces ?? [];
    if (activeTheme?.nameStyle !== "pooled" || pool.length === 0) {
      setPieceNameMap({});
      return;
    }
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    const nextMap = pieces.reduce((acc, piece, idx) => {
      acc[piece.id] = shuffled[idx] ?? piece.name;
      return acc;
    }, {});
    setPieceNameMap(nextMap);
  }, [activeTheme]);

  const pieceOptions = useMemo(
    () =>
      (activeTheme?.pieces ?? []).map((piece) => ({
        label:
          activeTheme?.nameStyle === "pooled"
            ? pieceNameMap[piece.id] ?? piece.name
            : piece.name,
        value: piece.id,
        color: piece.color,
        image: piece.image ?? null,
        icon: piece.icon ?? null,
      })),
    [activeTheme, pieceNameMap]
  );

  const selectedPiece = useMemo(
    () => pieceOptions.find((p) => p.value === pieceId) ?? pieceOptions[0],
    [pieceId, pieceOptions]
  );

  const handleThemeChange = (value) => {
    setThemeId(value);
    const nextTheme = themes.find((t) => t.id === value);
    const firstPiece = nextTheme?.pieces?.[0];
    if (firstPiece) {
      setPieceId(firstPiece.id);
    }
  };

  const startCampaign = useCallback(() => {
    if (!playerName.trim()) {
      openModal({
        modalTitle: "Missing Name",
        modalContent: <div>Please enter your name to begin the campaign.</div>,
        buttons: MODAL_BUTTONS.OK,
      });
      return;
    }

    const firstPiece = selectedPiece ?? pieceOptions[0];
    const { calendar, monthNames } = buildCampaignCalendar({
      themeId,
      playerPieceId: firstPiece?.value ?? "",
    });
    const { calendar: campaignCalendar, races } = buildCampaignRaces({
      calendar,
      themeId,
      difficulty,
      playerPieceId: firstPiece?.value ?? "",
    });

    const nextCampaign = {
      ...DEFAULT_CAMPAIGN,
      active: true,
      playerName: playerName.trim(),
      themeId,
      pieceId: firstPiece?.value ?? "",
      difficulty,
      calendar: campaignCalendar,
      monthNames,
      day: 0,
      races,
      library: COST1_LIBRARY,
      deck: [],
      coinArray: buildStartingCoinArray(),
      goldCoins: 2000,
      points: 0,
    };

    sessionStorage.setItem("campaignActive", "1");
    setGameState({
      ...DEFAULT_GAME_STATE,
      campaign: nextCampaign,
    });
  }, [
    difficulty,
    openModal,
    pieceOptions,
    playerName,
    selectedPiece,
    setGameState,
    themeId,
  ]);

  const currentDayType = campaign.calendar?.[campaign.day]?.type ?? "normal";
  const currentRaceIndex = campaign.calendar?.[campaign.day]?.raceDayIndex ?? null;
  const currentRace =
    currentRaceIndex != null ? campaign.races?.[currentRaceIndex - 1] : null;
  const currentEventId = campaign.calendar?.[campaign.day]?.eventId ?? null;
  const currentEventPiece = campaign.calendar?.[campaign.day]?.eventPieceName ?? "";
  const currentEvent = useMemo(
    () => events.find((event) => event.id === currentEventId) ?? null,
    [currentEventId]
  );
  const currentEventText = currentEvent
    ? currentEvent.text.replace("{piece}", currentEventPiece || "A rival")
    : null;

  useEffect(() => {
    if (!currentRace || currentRace.decksGenerated) return;
    setIsGeneratingRace(true);
    const timer = setTimeout(() => {
      try {
        setGameState((prev) => {
          const races = [...(prev.campaign?.races ?? [])];
          const race = races[currentRaceIndex - 1];
          if (!race || race.decksGenerated) return prev;
          races[currentRaceIndex - 1] = buildRaceDayDecks(race);
          return {
            ...prev,
            campaign: {
              ...prev.campaign,
              races,
            },
          };
        });
      } finally {
        setIsGeneratingRace(false);
      }
    }, 0);

    return () => clearTimeout(timer);
  }, [currentRace, currentRaceIndex, setGameState]);

  const handleNextDay = useCallback(() => {
    if (!campaign.calendar?.length) return;
    if (campaign.day >= campaign.calendar.length - 1) {
      openModal({
        modalTitle: "Campaign Complete",
        modalContent: <EndCampaignModal />,
        buttons: MODAL_BUTTONS.OK,
        onClick: () => {
          closeModal();
          sessionStorage.removeItem("campaignActive");
          setGameState(DEFAULT_GAME_STATE);
          navigate("/");
        },
      });
      return;
    }

    setGameState((prev) => ({
      ...prev,
      campaign: {
        ...prev.campaign,
        day: (prev.campaign?.day ?? 0) + 1,
      },
    }));
  }, [campaign.calendar?.length, campaign.day, closeModal, navigate, openModal, setGameState]);

  const handleQuit = useCallback(() => {
    openModal({
      modalTitle: "Quit Campaign",
      modalContent: <div>Are you sure you want to quit? Your campaign will be lost.</div>,
      buttons: MODAL_BUTTONS.YES_NO,
      onYes: () => {
        closeModal();
        sessionStorage.removeItem("campaignActive");
        setGameState(DEFAULT_GAME_STATE);
        navigate("/");
      },
      onNo: () => closeModal(),
    });
  }, [closeModal, navigate, openModal, setGameState]);

  useEffect(() => {
    if (!isActive) return;
    if (!sessionStorage.getItem("campaignActive")) {
      setGameState(DEFAULT_GAME_STATE);
      navigate("/");
    }
  }, [isActive, navigate, setGameState]);

  useEffect(() => {
    if (!isActive) return;
    if (campaign.calendar?.[campaign.day]?.type === "event") {
      navigate("/campaign-event");
    }
  }, [campaign.calendar, campaign.day, isActive, navigate]);

  if (!isActive) {
    return (
      <div className="campaign-home">
        <header className="campaign-home__header">
          <div>
            <h1>Campaign Mode</h1>
            <p>Choose your racer and prepare for a 12-week calendar.</p>
          </div>
          <Button variant={BUTTON_VARIANT.TERTIARY} to="/">
            Back Home
          </Button>
        </header>

        <div className="campaign-home__setup">
          <div className="campaign-home__panel">
            <label>Name</label>
            <InputText
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              disabled={isGeneratingRace}
            />
          </div>

          <div className="campaign-home__panel">
            <label>Theme</label>
            <Dropdown
              value={themeId}
              options={themes.map((theme) => ({ label: theme.name, value: theme.id }))}
              onChange={(e) => handleThemeChange(e.value)}
              disabled={isGeneratingRace}
            />
          </div>

          <div className="campaign-home__panel campaign-home__panel--piece">
            <label>Piece</label>
            <div className="campaign-home__pieceRow">
              <div className="campaign-home__piecePreview">
                {selectedPiece ? (
                  <Piece
                    label={selectedPiece.label}
                    color={selectedPiece.color}
                    playerId="campaign-player"
                    status={[]}
                    image={selectedPiece.image}
                    icon={selectedPiece.icon}
                    size={activeTheme?.iconSize ?? "small"}
                  />
                ) : null}
              </div>
              <Dropdown
                value={selectedPiece?.value ?? ""}
                options={pieceOptions}
                onChange={(e) => setPieceId(e.value)}
                disabled={isGeneratingRace}
              />
            </div>
          </div>

          <div className="campaign-home__panel">
            <label>Difficulty</label>
            <Dropdown
              value={difficulty}
              options={[
                { label: "Easy", value: "easy" },
                { label: "Normal", value: "normal" },
                { label: "Hard", value: "hard" },
              ]}
              onChange={(e) => setDifficulty(e.value)}
              disabled={isGeneratingRace}
            />
          </div>
        </div>

        <div className="campaign-home__actions">
          <Button
            variant={BUTTON_VARIANT.PRIMARY}
            onClick={startCampaign}
            disabled={isGeneratingRace}
          >
            Start Campaign
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`campaign-home${isGeneratingRace ? " campaign-home--loading" : ""}`}>
      <header className="campaign-home__header">
        <div>
          <h1>Campaign Calendar</h1>
          <p>Current day: {currentDayType}</p>
        </div>
        <div className="campaign-home__stats">
          <div className="campaign-home__statRow">
            <div>
              <span>Gold</span>
              <strong>{campaign.goldCoins ?? 0}</strong>
            </div>
            <div>
              <span>Points</span>
              <strong>{campaign.points ?? 0}</strong>
            </div>
          </div>
          <div className="campaign-home__coinBar">
            <span className="campaign-home__coinBarLabel">Class Coins</span>
            <div className="campaign-home__coinBarTrack" aria-label="Class Coins">
              {["Red", "Blue", "Green", "Yellow", "Orange"].flatMap((cls) => {
                const count = campaign.coinArray?.[cls] ?? 0;
                return Array.from({ length: count }, (_, idx) => (
                  <span
                    key={`${cls}-coin-${idx}`}
                    className={`campaign-home__coinSeg campaign-home__coinSeg--${cls.toLowerCase()}`}
                  />
                ));
              })}
            </div>
          </div>
        </div>
        <Button variant={BUTTON_VARIANT.TERTIARY} to="/">
          Back Home
        </Button>
      </header>

      <div className="campaign-home__info">
        <div className="campaign-home__infoHeader">
          <h2>{currentRace?.name ?? (currentDayType === "event" ? "Event" : "Today")}</h2>
          <span>{currentRace ? `Race Day ${currentRaceIndex}` : currentDayType}</span>
        </div>
        {currentDayType === "event" && currentEvent ? (
          <div className="campaign-home__infoBody">
            <div className="campaign-home__infoSection">
              <h3>Event</h3>
              <p>{currentEventText}</p>
            </div>
          </div>
        ) : currentRace ? (
          <div className="campaign-home__infoBody">
            <div className="campaign-home__infoSection">
              <h3>Race Details</h3>
              <p>Laps: {currentRace.laps}</p>
              <div className="campaign-home__rewards">
                <strong>Rewards</strong>
                <ul>
                  <li>1st: {currentRace.rewards?.first ?? "N/A"}</li>
                  <li>2nd: {currentRace.rewards?.second ?? "N/A"}</li>
                  <li>3rd: {currentRace.rewards?.third ?? "N/A"}</li>
                  <li>4th: {currentRace.rewards?.fourth ?? "N/A"}</li>
                </ul>
              </div>
            </div>
            <div className="campaign-home__infoSection">
              <h3>Opponents</h3>
              <div className="campaign-home__opponents">
                {currentRace.opponents?.map((opponent) => (
                  <div key={opponent.id} className="campaign-home__opponent">
                    <div className="campaign-home__opponentHeader">
                      <span>{opponent.name}</span>
                      <span className="campaign-home__opponentTier">Tier {opponent.tier}</span>
                    </div>
                    <div className="campaign-home__opponentDeck">
                      {opponent.deckCards?.length ? (
                        opponent.deckCards.map((card, idx) => (
                          <span key={`${opponent.id}-${card.id}-${idx}`}>
                            {card.id} ({card.cost})
                          </span>
                        ))
                      ) : (
                        <span>Deck pending...</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="campaign-home__infoBody">
            <p>No race scheduled today.</p>
          </div>
        )}
      </div>

      <Calendar
        calendar={campaign.calendar}
        dayIndex={campaign.day}
        monthNames={campaign.monthNames}
        races={campaign.races}
      />

      <div className="campaign-home__controls">
        <Button
          variant={BUTTON_VARIANT.PRIMARY}
          onClick={handleNextDay}
          disabled={isGeneratingRace || (campaign.day === 0 && (campaign.deck?.length ?? 0) !== 16)}
        >
          {campaign.day >= (campaign.calendar?.length ?? 1) - 1 ? "End Campaign" : "Next Day"}
        </Button>
        <Button
          variant={BUTTON_VARIANT.SECONDARY}
          onClick={() => navigate("/deck-selection?mode=campaign")}
          disabled={isGeneratingRace}
        >
          Edit Deck
        </Button>
        <Button variant={BUTTON_VARIANT.SECONDARY} onClick={handleQuit} disabled={isGeneratingRace}>
          Quit
        </Button>
      </div>
      {isGeneratingRace ? (
        <div className="campaign-home__loadingOverlay" aria-live="polite">
          <LoadingSpinner size={64} />
          <span>Generating race decks...</span>
        </div>
      ) : null}
    </div>
  );
};

export default CampaignHome;
