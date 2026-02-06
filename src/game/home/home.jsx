import Button, { BUTTON_VARIANT } from "../../engine/ui/button/button";
import "./home.scss";

const Home = () => {
  return (
    <div className="home">
      <div className="home_content">
        <h1>Racing Game</h1>
        <Button variant={BUTTON_VARIANT.SECONDARY} to="/race-setup">
          Race Setup
        </Button>
        <Button variant={BUTTON_VARIANT.TERTIARY} to="/deck-selection?mode=export">
          Just Select a Deck
        </Button>
      </div>
    </div>
  );
};

export default Home;
