import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dropdown } from "primereact/dropdown";
import { InputText } from "primereact/inputtext";
import Button, { BUTTON_VARIANT } from "../../engine/ui/button/button";
import { MODAL_BUTTONS, useModal } from "../../engine/ui/modal/modalContext";
import { DEFAULT_GAME_STATE, useGame } from "../../engine/gameContext/gameContext";
import themes from "../../assets/gameContent/themes";
import cards from "../../assets/gameContent/cards";
import events from "../../assets/gameContent/events";
import CoinBar from "../../engine/ui/coinBar/coinBar";
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
  firstDayBonusChosen: false,
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
  return { Red: 3, Blue: 3, Green: 3, Yellow: 3, Orange: 3 };
};

const CLASS_KEYS = ["Red", "Blue", "Green", "Yellow", "Orange"];

const parseRaceReward = (rewardText) => {
  if (!rewardText || rewardText === "N/A") return { gold: 0, classCoins: 0 };
  const classMatch = rewardText.match(/(\d+)\s*Class Coin/i);
  const goldMatch = rewardText.match(/(\d+)\s*coins?/i);
  return {
    classCoins: classMatch ? Number(classMatch[1] ?? 0) : 0,
    gold: goldMatch ? Number(goldMatch[1] ?? 0) : 0,
  };
};

const CampaignHome = () => {
  const navigate = useNavigate();
  const { gameState, setGameState } = useGame();
  const { openModal, closeModal } = useModal();

  const campaign = gameState.campaign ?? DEFAULT_CAMPAIGN;
  const isActive = campaign.active === true;

  const [playerName, setPlayerName] = useState(campaign.playerName || "");
  const [themeId, setThemeId] = useState(campaign.themeId || themes[0]?.id);
  const [pieceId, setPieceId] = useState(campaign.pieceId || "");
  const [difficulty, setDifficulty] = useState(campaign.difficulty || "normal");
  const [isGeneratingRace, setIsGeneratingRace] = useState(false);
  const [pieceNameMap, setPieceNameMap] = useState({});
  const [hasCustomName, setHasCustomName] = useState(Boolean(campaign.playerName));
  const autoNameRef = useRef("");
  const firstDayPromptedRef = useRef(false);

  const activeTheme = useMemo(
    () => themes.find((t) => t.id === themeId) ?? themes[0],
    [themeId]
  );

  const FirstDayBonusModal = ({ onConfirm }) => {
    const [choices, setChoices] = useState([]);

    const toggleChoice = (cls) => {
      setChoices((prev) => {
        if (prev.includes(cls)) {
          return prev.filter((item) => item !== cls);
        }
        if (prev.length >= 2) return prev;
        return [...prev, cls];
      });
    };

    return (
      <div className="campaign-home__firstDayModal">
        <p>Pick two different classes to gain +1 Class Coin for the rest of the campaign.</p>
        <div className="campaign-home__firstDayChoices">
          {CLASS_KEYS.map((cls) => {
            const isSelected = choices.includes(cls);
            return (
              <Button
                key={`class-${cls}`}
                variant={isSelected ? BUTTON_VARIANT.PRIMARY : BUTTON_VARIANT.SECONDARY}
                choiceButton
                onClick={() => toggleChoice(cls)}
              >
                {cls}
              </Button>
            );
          })}
        </div>
        <div className="campaign-home__firstDayActions">
          <Button
            variant={BUTTON_VARIANT.PRIMARY}
            disabled={choices.length !== 2}
            onClick={() => onConfirm(choices)}
          >
            Confirm & Build Deck
          </Button>
        </div>
      </div>
    );
  };

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

  const getDefaultCampaignName = useCallback(() => {
    const pool = activeTheme?.namePool ?? [];
    const pieceLabel =
      selectedPiece?.label ?? selectedPiece?.name ?? pieceOptions[0]?.label ?? "";

    return pieceLabel || "Campaign";
  }, [activeTheme, pieceNameMap, selectedPiece, pieceOptions]);

  useEffect(() => {
    if (campaign.playerName) return;
    const shouldAuto = !hasCustomName || playerName === autoNameRef.current;
    if (!shouldAuto) return;
    const nextName = getDefaultCampaignName();
    if (nextName && playerName !== nextName) {
      autoNameRef.current = nextName;
      setPlayerName(nextName);
    }
  }, [campaign.playerName, getDefaultCampaignName, hasCustomName, playerName]);

  const handleThemeChange = (value) => {
    setThemeId(value);
    const nextTheme = themes.find((t) => t.id === value);
    const firstPiece = nextTheme?.pieces?.[0];
    if (firstPiece) {
      setPieceId(firstPiece.id);
    }
  };

  const handleFirstDayBonusConfirm = useCallback(
    (choices) => {
      if (!Array.isArray(choices) || choices.length !== 2) return;
      setGameState((prev) => {
        const current = prev.campaign?.coinArray ?? buildStartingCoinArray();
        const nextArray = { ...current };
        choices.forEach((cls) => {
          nextArray[cls] = (nextArray[cls] ?? 0) + 1;
        });
        return {
          ...prev,
          campaign: {
            ...prev.campaign,
            coinArray: nextArray,
            firstDayBonusChosen: true,
          },
        };
      });
      closeModal();
      navigate("/deck-selection?mode=campaign");
    },
    [closeModal, navigate, setGameState]
  );

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
      goldCoins: 0,
      firstDayBonusChosen: false,
      points: 0,
      racePhase: null,
      activeRaceDayIndex: null,
      activeRace: null,
      lastRaceResult: null,
    };

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
  const isTournamentDay = !!campaign.calendar?.[campaign.day]?.tournament;
  const racePhase = campaign.racePhase ?? (currentDayType === "race" ? "start" : null);
  const lastRaceResult = campaign.lastRaceResult;
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
    if (!isActive) {
      firstDayPromptedRef.current = false;
      return;
    }
    if (campaign.day !== 0) return;
    if (campaign.firstDayBonusChosen) return;
    if (firstDayPromptedRef.current) return;
    firstDayPromptedRef.current = true;
    openModal({
      modalTitle: "Choose Your Class Coins",
      modalContent: <FirstDayBonusModal onConfirm={handleFirstDayBonusConfirm} />,
      buttons: MODAL_BUTTONS.NONE,
      onClose: () => {},
    });
  }, [campaign.day, campaign.firstDayBonusChosen, handleFirstDayBonusConfirm, isActive, openModal]);

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
        setGameState(DEFAULT_GAME_STATE);
        navigate("/");
      },
      onNo: () => closeModal(),
    });
  }, [closeModal, navigate, openModal, setGameState]);


  useEffect(() => {
    if (!isActive) return;
    if (campaign.calendar?.[campaign.day]?.type === "event") {
      navigate("/campaign-event");
    }
  }, [campaign.calendar, campaign.day, isActive, navigate]);

  const handleStartRace = useCallback(() => {
    if (!currentRace || !currentRace.decksGenerated) return;
    const playerPiece =
      activeTheme?.pieces?.find((piece) => piece.id === campaign.pieceId) ?? activeTheme?.pieces?.[0];
    const playerRacer = {
      id: "player1",
      name: campaign.playerName || "Player",
      short: "P1",
      color: playerPiece?.color ?? "#ffffff",
      image: playerPiece?.image ?? null,
      icon: playerPiece?.icon ?? null,
    };
    const opponents = (currentRace.opponents ?? []).map((opponent, idx) => ({
      id: `player${idx + 2}`,
      name: opponent.name,
      short: `P${idx + 2}`,
      color: opponent.color,
      image: opponent.image ?? null,
      icon: opponent.icon ?? null,
    }));

    setGameState((prev) => ({
      ...prev,
      themeId: campaign.themeId,
      raceLaps: currentRace.laps ?? 1,
      racers: [playerRacer, ...opponents],
      player1: { ...prev.player1, deck: campaign.deck ?? [], position: 0 },
      player2: { ...prev.player2, deck: currentRace.opponents?.[0]?.deck ?? [], position: 0 },
      player3: { ...prev.player3, deck: currentRace.opponents?.[1]?.deck ?? [], position: 0 },
      player4: { ...prev.player4, deck: currentRace.opponents?.[2]?.deck ?? [], position: 0 },
      campaign: {
        ...prev.campaign,
        racePhase: "running",
        activeRaceDayIndex: currentRaceIndex,
        activeRace: currentRace,
      },
    }));
    navigate("/race");
  }, [
    activeTheme?.pieces,
    campaign.deck,
    campaign.pieceId,
    campaign.playerName,
    campaign.themeId,
    currentRace,
    currentRaceIndex,
    navigate,
    setGameState,
  ]);



  const handleShowResults = useCallback(() => {
    openModal({
      modalTitle: "Campaign Results",
      modalContent: (
        <div className="campaign-home__resultsModal">
          {(campaign.results ?? []).length === 0 ? (
            <p>No results yet.</p>
          ) : (
            campaign.results.map((result, idx) => (
              <div key={`result-${idx}`} className="campaign-home__resultsRow">
                <strong>{result.raceName}</strong>
                <span>Reward: {result.reward}</span>
                <div className="campaign-home__resultsStandings">
                  {(result.standings ?? []).map((entry) => (
                    <div key={`result-${idx}-${entry.id}`} className="campaign-home__resultsItem">
                      <span>#{entry.place}</span>
                      <span>{entry.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      ),
      buttons: MODAL_BUTTONS.OK,
    });
  }, [campaign.results, openModal]);

  if (!isActive) {
    return (
      <div className="campaign-home campaign-home--setup">
        <header className="campaign-home__header">
          <div>
            <h1>Campaign Mode</h1>
            <p>Choose your racer and prepare for a 12-week calendar.</p>
          </div>
        </header>

        <div className="campaign-home__setup">
          <div className="campaign-home__panel">
            <label>Name</label>
            <InputText
              value={playerName}
              onChange={(e) => {
                setPlayerName(e.target.value);
                setHasCustomName(true);
              }}
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
          <Button variant={BUTTON_VARIANT.TERTIARY} to="/">
            Back Home
          </Button>
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
      </header>

      <div className="campaign-home__stats">
        <div className="campaign-home__statsMain">
          <div className="campaign-home__coinBar">
            <span className="campaign-home__coinBarLabel">Class Coins</span>
            <CoinBar
              coinArray={campaign.coinArray}
              segmentWidth={12}
              height={14}
              borderWidth={2}
            />
          </div>
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
        </div>
        <div className="campaign-home__statsActions">
          <Button variant={BUTTON_VARIANT.SECONDARY} onClick={handleShowResults}>
            View Results
          </Button>
        </div>
      </div>

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
                {isTournamentDay && <p>Tournament Week</p>}
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
                  {(currentRace.opponents ?? [])
                    .slice()
                    .sort((a, b) => (b.tier ?? 0) - (a.tier ?? 0))
                    .map((opponent) => (
                      <div key={opponent.id} className="campaign-home__opponent">
                        <span>{opponent.name}</span>
                        <span className="campaign-home__opponentTier">Tier {opponent.tier}</span>
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

      <div className="campaign-home__calendarPanel">
        <div className="campaign-home__calendar">
          <Calendar
            calendar={campaign.calendar}
            dayIndex={campaign.day}
            monthNames={campaign.monthNames}
            races={campaign.races}
          />
        </div>
        <div className="campaign-home__controls">
          {currentDayType === "race" ? (
            <Button
              variant={BUTTON_VARIANT.PRIMARY}
              onClick={handleStartRace}
              disabled={
                isGeneratingRace ||
                !currentRace ||
                !currentRace.decksGenerated ||
                (campaign.deck?.length ?? 0) !== 16
              }
            >
              Start Race
            </Button>
          ) : (
            <Button
              variant={BUTTON_VARIANT.PRIMARY}
              onClick={handleNextDay}
              disabled={
                isGeneratingRace ||
                (campaign.day === 0 &&
                  (!campaign.firstDayBonusChosen || (campaign.deck?.length ?? 0) !== 16))
              }
            >
              {campaign.day >= (campaign.calendar?.length ?? 1) - 1 ? "End Campaign" : "Next Day"}
            </Button>
          )}
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
