import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dropdown } from "primereact/dropdown";
import { InputText } from "primereact/inputtext";
import Button, { BUTTON_VARIANT } from "../../engine/ui/button/button";
import { MODAL_BUTTONS, useModal } from "../../engine/ui/modal/modalContext";
import { useGame } from "../../engine/gameContext/gameContext";
import themes from "../../assets/gameContent/themes";
import Calendar from "./components/calendar/calendar";
import EndCampaignModal from "./components/endCampaignModal/endCampaignModal";
import Piece from "../race/components/piece/piece";
import "./campaignHome.scss";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const DEFAULT_CAMPAIGN = {
  active: false,
  playerName: "",
  themeId: "cars",
  pieceId: "",
  difficulty: "normal",
  coinArray: [5, 5, 5, 5, 5],
  deck: [],
  library: [],
  goldCoins: 0,
  results: [],
  calendar: [],
  day: 0,
  monthNames: [],
};

const buildCalendar = () => {
  const shuffledMonths = [...MONTH_NAMES].sort(() => Math.random() - 0.5);
  const monthNames = shuffledMonths.slice(0, 3);

  const types = ["normal", "race", "event", "miniGame"];
  const weights = [0.55, 0.25, 0.12, 0.08];

  const pickType = () => {
    const roll = Math.random();
    let sum = 0;
    for (let i = 0; i < types.length; i += 1) {
      sum += weights[i];
      if (roll <= sum) return types[i];
    }
    return "normal";
  };

  const calendar = Array.from({ length: 28 * 3 }, () => ({
    type: pickType(),
  }));

  return { calendar, monthNames };
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

  const activeTheme = useMemo(
    () => themes.find((t) => t.id === themeId) ?? themes[0],
    [themeId]
  );

  const pieceOptions = useMemo(
    () =>
      (activeTheme?.pieces ?? []).map((piece) => ({
        label: piece.name,
        value: piece.id,
        color: piece.color,
        image: piece.image ?? null,
        icon: piece.icon ?? null,
      })),
    [activeTheme]
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

    const { calendar, monthNames } = buildCalendar();
    const firstPiece = selectedPiece ?? pieceOptions[0];

    setGameState((prev) => ({
      ...prev,
      campaign: {
        ...DEFAULT_CAMPAIGN,
        active: true,
        playerName: playerName.trim(),
        themeId,
        pieceId: firstPiece?.value ?? "",
        difficulty,
        calendar,
        monthNames,
        day: 0,
      },
    }));
  }, [difficulty, openModal, pieceOptions, playerName, selectedPiece, setGameState, themeId]);

  const currentDayType = campaign.calendar?.[campaign.day]?.type ?? "normal";

  const handleNextDay = useCallback(() => {
    if (!campaign.calendar?.length) return;
    if (campaign.day >= campaign.calendar.length - 1) {
      openModal({
        modalTitle: "Campaign Complete",
        modalContent: <EndCampaignModal />,
        buttons: MODAL_BUTTONS.OK,
        onClick: () => {
          closeModal();
          setGameState((prev) => ({ ...prev, campaign: DEFAULT_CAMPAIGN }));
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
        setGameState((prev) => ({ ...prev, campaign: DEFAULT_CAMPAIGN }));
        navigate("/");
      },
      onNo: () => closeModal(),
    });
  }, [closeModal, navigate, openModal, setGameState]);

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
            <InputText value={playerName} onChange={(e) => setPlayerName(e.target.value)} />
          </div>

          <div className="campaign-home__panel">
            <label>Theme</label>
            <Dropdown
              value={themeId}
              options={themes.map((theme) => ({ label: theme.name, value: theme.id }))}
              onChange={(e) => handleThemeChange(e.value)}
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
            />
          </div>
        </div>

        <div className="campaign-home__actions">
          <Button variant={BUTTON_VARIANT.PRIMARY} onClick={startCampaign}>
            Start Campaign
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="campaign-home">
      <header className="campaign-home__header">
        <div>
          <h1>Campaign Calendar</h1>
          <p>Current day: {currentDayType}</p>
        </div>
        <Button variant={BUTTON_VARIANT.TERTIARY} to="/">
          Back Home
        </Button>
      </header>

      <Calendar
        calendar={campaign.calendar}
        dayIndex={campaign.day}
        monthNames={campaign.monthNames}
      />

      <div className="campaign-home__controls">
        <Button
          variant={BUTTON_VARIANT.PRIMARY}
          onClick={handleNextDay}
        >
          {campaign.day >= (campaign.calendar?.length ?? 1) - 1 ? "End Campaign" : "Next Day"}
        </Button>
        <Button variant={BUTTON_VARIANT.SECONDARY} onClick={handleQuit}>
          Quit
        </Button>
      </div>
    </div>
  );
};

export default CampaignHome;
