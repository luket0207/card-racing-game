import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Button, { BUTTON_VARIANT } from "../../engine/ui/button/button";
import { useGame } from "../../engine/gameContext/gameContext";
import cards from "../../assets/gameContent/cards";
import "./home.scss";

const Home = () => {
  const navigate = useNavigate();
  const { setGameState } = useGame();

  const buildRandomDeck = useCallback(() => {
    const shuffled = [...cards].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 16).map((card) => card.id);
  }, []);

  const handleStartRace = useCallback(() => {
    const deck1 = buildRandomDeck();
    const deck2 = buildRandomDeck();
    const deck3 = buildRandomDeck();
    const deck4 = buildRandomDeck();

    setGameState((prev) => ({
      ...prev,
      player1: { ...prev.player1, deck: deck1, position: 0 },
      player2: { ...prev.player2, deck: deck2, position: 0 },
      player3: { ...prev.player3, deck: deck3, position: 0 },
      player4: { ...prev.player4, deck: deck4, position: 0 },
    }));

    navigate("/race");
  }, [buildRandomDeck, navigate, setGameState]);

  return (
    <div className="home">
      <div className="home_content">
        <h1>Mini React Game Engine</h1>
        <Button variant={BUTTON_VARIANT.PRIMARY} to="/info">
          Go to Info
        </Button>
        <Button variant={BUTTON_VARIANT.SECONDARY} onClick={handleStartRace}>
          Start Race
        </Button>
      </div>
    </div>
  );
};

export default Home;
