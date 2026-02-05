import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Button, { BUTTON_VARIANT } from "../../engine/ui/button/button";
import { useGame } from "../../engine/gameContext/gameContext";
import cards from "../../assets/gameContent/cards";
import "./deckSelection.scss";

const PLAYER_LIST = [
  { id: "player1", name: "Player 1" },
  { id: "player2", name: "Player 2" },
  { id: "player3", name: "Player 3" },
  { id: "player4", name: "Player 4" },
];

const shuffle = (items) => {
  const array = [...items];
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};

const DeckSelection = () => {
  const navigate = useNavigate();
  const { setGameState } = useGame();
  const [activePlayerIndex, setActivePlayerIndex] = useState(0);
  const activePlayerId = PLAYER_LIST[activePlayerIndex]?.id ?? "player1";
  const activePlayerName = PLAYER_LIST[activePlayerIndex]?.name ?? "Player 1";
  const [decks, setDecks] = useState(() =>
    PLAYER_LIST.reduce((acc, player) => {
      acc[player.id] = [];
      return acc;
    }, {})
  );
  const [confirmed, setConfirmed] = useState(() =>
    PLAYER_LIST.reduce((acc, player) => {
      acc[player.id] = false;
      return acc;
    }, {})
  );

  const activeDeck = decks[activePlayerId] ?? [];

  const addCard = useCallback((cardId) => {
    setDecks((prev) => {
      if (confirmed[activePlayerId]) return prev;
      const current = prev[activePlayerId] ?? [];
      if (current.length >= 16 || current.includes(cardId)) return prev;
      return { ...prev, [activePlayerId]: [...current, cardId] };
    });
  }, [activePlayerId, confirmed]);

  const removeCard = useCallback((index) => {
    setDecks((prev) => {
      if (confirmed[activePlayerId]) return prev;
      const current = prev[activePlayerId] ?? [];
      if (!current[index]) return prev;
      return {
        ...prev,
        [activePlayerId]: current.filter((_, idx) => idx !== index),
      };
    });
  }, [activePlayerId, confirmed]);

  const randomizeDeck = useCallback((playerId) => {
    setDecks((prev) => {
      if (confirmed[playerId]) return prev;
      const randomDeck = shuffle(cards).slice(0, 16).map((card) => card.id);
      return { ...prev, [playerId]: randomDeck };
    });
  }, [confirmed]);

  const clearDeck = useCallback((playerId) => {
    setDecks((prev) => {
      if (confirmed[playerId]) return prev;
      return { ...prev, [playerId]: [] };
    });
  }, [confirmed]);

  const isReady = useMemo(
    () => PLAYER_LIST.every((player) => confirmed[player.id]),
    [confirmed]
  );

  const activeDeckFull = activeDeck.length === 16;
  const activeConfirmed = confirmed[activePlayerId];

  const startRace = useCallback(() => {
    if (!isReady) return;
    setGameState((prev) => ({
      ...prev,
      player1: { ...prev.player1, deck: decks.player1, position: 0 },
      player2: { ...prev.player2, deck: decks.player2, position: 0 },
      player3: { ...prev.player3, deck: decks.player3, position: 0 },
      player4: { ...prev.player4, deck: decks.player4, position: 0 },
    }));
    navigate("/race");
  }, [decks, isReady, navigate, setGameState]);

  const confirmDeck = useCallback(() => {
    if (!activeDeckFull || activeConfirmed) return;
    setConfirmed((prev) => ({ ...prev, [activePlayerId]: true }));
    setActivePlayerIndex((prev) => Math.min(prev + 1, PLAYER_LIST.length - 1));
  }, [activeConfirmed, activeDeckFull, activePlayerId]);

  return (
    <div className="deck-selection">
      <header className="deck-selection__header">
        <div>
          <h1>Deck Selection</h1>
          <p>Build 16-card decks for each player. No duplicates per deck.</p>
        </div>
        <Button variant={BUTTON_VARIANT.TERTIARY} to="/">
          Back Home
        </Button>
      </header>

      <div className="deck-selection__layout">
        <section className="deck-selection__players">
          <div className="deck-selection__playersHeader">
            <h2>Players</h2>
            <div className="deck-selection__playersHint">Current: {activePlayerName}</div>
          </div>

          <div className="deck-selection__playerStatus">
            {PLAYER_LIST.map((player, index) => (
              <div
                key={player.id}
                className={`deck-selection__playerRow${
                  index === activePlayerIndex ? " deck-selection__playerRow--active" : ""
                }`}
              >
                <span>{player.name}</span>
                <span>
                  {(decks[player.id] ?? []).length}/16
                  {confirmed[player.id] ? " ✓" : ""}
                </span>
              </div>
            ))}
          </div>

          <div className="deck-selection__deckList">
            {activeDeck.length === 0 && (
              <div className="deck-selection__empty">No cards selected yet.</div>
            )}
            {activeDeck.map((cardId, index) => {
              const card = cards.find((c) => c.id === cardId);
              return (
                <div key={`${cardId}-${index}`} className="deck-selection__deckItem">
                  <div>
                    <div className="deck-selection__deckTitle">
                      {card?.name ?? cardId}
                    </div>
                    <div className="deck-selection__deckMeta">
                      {card?.class ?? "Unknown"} • {cardId}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="deck-selection__removeBtn"
                    onClick={() => removeCard(index)}
                    disabled={activeConfirmed}
                  >
                    Remove
                  </button>
                </div>
              );
            })}
          </div>

          <div className="deck-selection__confirm">
            <Button
              variant={BUTTON_VARIANT.PRIMARY}
              onClick={confirmDeck}
              disabled={!activeDeckFull || activeConfirmed}
            >
              {activePlayerIndex === PLAYER_LIST.length - 1 ? "Confirm Deck" : "Confirm & Next"}
            </Button>
          </div>

          <div className="deck-selection__deckActions">
            <Button
              variant={BUTTON_VARIANT.SECONDARY}
              onClick={() => randomizeDeck(activePlayerId)}
              disabled={activeConfirmed}
            >
              Randomize Deck
            </Button>
            <Button
              variant={BUTTON_VARIANT.TERTIARY}
              onClick={() => clearDeck(activePlayerId)}
              disabled={activeConfirmed}
            >
              Clear Deck
            </Button>
          </div>

          <div className="deck-selection__start">
            <div>
              {isReady ? "All decks ready." : "Each player needs 16 cards to start."}
            </div>
            <Button
              variant={BUTTON_VARIANT.PRIMARY}
              onClick={startRace}
              disabled={!isReady}
            >
              Start Race
            </Button>
          </div>
        </section>

        <section className="deck-selection__cards">
          <div className="deck-selection__cardsHeader">
            <h2>All Cards</h2>
            <span>{activeDeck.length}/16 selected</span>
          </div>

          <div className="deck-selection__cardGrid">
            {cards.map((card) => {
              const isSelected = activeDeck.includes(card.id);
              const isFull = activeDeck.length >= 16;
              return (
                <div key={card.id} className="deck-selection__card">
                  <div className="deck-selection__cardTop">
                    <span className={`deck-selection__badge deck-selection__badge--${card.class.toLowerCase()}`}>
                      {card.class}
                    </span>
                    <span className="deck-selection__cardId">{card.id}</span>
                  </div>
                  <h3>{card.name}</h3>
                  <p>{card.text}</p>
                  <button
                    type="button"
                    className="deck-selection__addBtn"
                    disabled={isSelected || isFull || activeConfirmed}
                    onClick={() => addCard(card.id)}
                  >
                    {isSelected ? "Selected" : isFull ? "Deck Full" : "Add"}
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      </div>

    </div>
  );
};

export default DeckSelection;
