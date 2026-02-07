import { useNavigate } from "react-router-dom";
import Button, { BUTTON_VARIANT } from "../../engine/ui/button/button";
import themes from "../../assets/gameContent/themes";
import { useGame } from "../../engine/gameContext/gameContext";
import { useToast } from "../../engine/ui/toast/toast";
import { buildFixedLimits, buildRandomDeck, buildRacersForTheme } from "../utils/raceSetupUtils";
import "./home.scss";

const Home = () => {
  const navigate = useNavigate();
  const { setGameState } = useGame();
  const { clearLog } = useToast();

  const handleQuickRace = () => {
    const theme = themes[Math.floor(Math.random() * themes.length)] ?? themes[0];
    const racers = buildRacersForTheme(theme, 4);
    const limits = buildFixedLimits(5);

    const buildSafeDeck = () => {
      let deck = buildRandomDeck(limits);
      let safety = 0;
      while (deck.length !== 16 && safety < 50) {
        safety += 1;
        deck = buildRandomDeck(limits);
      }
      return deck;
    };

    setGameState((prev) => ({
      ...prev,
      themeId: theme.id,
      racers,
      raceLaps: 1,
      betting: {
        ...(prev.betting ?? {}),
        active: false,
        currentRace: null,
        bets: [],
      },
      player1: { ...prev.player1, deck: buildSafeDeck(), position: 0 },
      player2: { ...prev.player2, deck: buildSafeDeck(), position: 0 },
      player3: { ...prev.player3, deck: buildSafeDeck(), position: 0 },
      player4: { ...prev.player4, deck: buildSafeDeck(), position: 0 },
    }));
    clearLog();
    navigate("/race");
  };

  return (
    <div className="home">
      <div className="home_content">
        <div className="home__title">
          <h1>Racing</h1>
        </div>
        <div className="home__pod">
          <div className="home__podTitle">Game Modes</div>
          <Button variant={BUTTON_VARIANT.TERTIARY} onClick={handleQuickRace}>
            Quick Race
          </Button>
          <Button variant={BUTTON_VARIANT.SECONDARY} to="/race-setup">
            Single Race
          </Button>
          <Button variant={BUTTON_VARIANT.PRIMARY} to="/campaign">
            Campaign Mode
          </Button>
          <Button variant={BUTTON_VARIANT.PRIMARY} to="/betting-mode" state={{ fromHome: true }}>
            Betting Mode
          </Button>
        </div>
        <div className="home__pod home__pod--secondary">
          <div className="home__podTitle">Tools</div>
          <Button variant={BUTTON_VARIANT.TERTIARY} to="/how-to-play">
            How To Play
          </Button>
          <Button variant={BUTTON_VARIANT.TERTIARY} to="/deck-selection?mode=export">
            Build a Deck
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Home;
