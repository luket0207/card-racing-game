import Button, { BUTTON_VARIANT } from "../../engine/ui/button/button";
import "./howToPlay.scss";

const HowToPlay = () => {
  return (
    <div className="how-to-play">
      <div className="how-to-play__content">
        <header className="how-to-play__header">
          <h1>How to Play</h1>
          <Button variant={BUTTON_VARIANT.TERTIARY} to="/">
            Back Home
          </Button>
        </header>

        <section className="how-to-play__section">
          <h2>Single Race</h2>
          <p>
            Use Race Setup to choose the theme, number of racers, human players, names, and laps.
            Then build decks for each human player. AI decks are randomized for you. When all decks
            are ready, start the race and draw cards to move pieces around the 32-tile track. The
            race ends when a racer completes the final lap.
          </p>
        </section>

        <section className="how-to-play__section">
          <h2>Quick Race</h2>
          <p>
            Quick Race skips setup and creates a fully randomized race for you. The theme, racers,
            and decks are generated automatically with standard class coins. Auto draw starts off
            so you can step through the race manually or enable it when you are ready.
          </p>
        </section>

        <section className="how-to-play__section how-to-play__section--campaign">
          <h2>Campaign Mode</h2>
          <p>
            Campaign Mode is a 12-week calendar where you develop one persistent deck over time.
            Start by choosing your name, theme, piece, and difficulty. You then move through the
            calendar day by day. Race days let you enter a race, earn rewards, and advance. Event
            days give you a chance at bonus rewards.
          </p>
          <p>
            Your deck must always have 16 cards before you can move forward. Cards are unlocked
            into your library using Gold Coins, then added to your deck in the deck selection
            screen. Cost 2 cards are cheaper than cost 3 cards, and you can only select cards that
            are already in your library.
          </p>
          <p>
            Class Coins set how many cards of each class you can afford in your deck. Gold Coins
            are your campaign currency for unlocking cards. Points are a running score earned from
            rewards and purchases and are shown at the end of the campaign. The last two weeks are
            a tournament: you must qualify to continue, and winning the final race completes the
            campaign.
          </p>
        </section>

        <section className="how-to-play__section">
          <h2>Betting Mode</h2>
          <p>
            Betting Mode creates a full AI race. Choose a theme at the start of the run and place
            bets before each race. You can place one bet per type (Outright, Each-Way, or Past The
            Post). Each-Way splits the stake in half and pays if the racer places 1st or 2nd. Past
            The Post lets you bet on Fast (200 turns or fewer) or Slow (more than 200 turns).
          </p>
          <p>
            After the race, winnings are calculated and added to your gold. Runs end after 10 races
            or if you run out of gold.
          </p>
        </section>

        <section className="how-to-play__section">
          <h2>Just Build a Deck</h2>
          <p>
            Use Just Build a Deck to create a single 16-card deck and export it as a .txt file. Send
            that file to a friend so they can import it in their deck selection screen. This makes it
            easy to race with custom decks without re-building them manually.
          </p>
        </section>
      </div>
    </div>
  );
};

export default HowToPlay;
