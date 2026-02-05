import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Button, { BUTTON_VARIANT } from "../../engine/ui/button/button";
import { useGame } from "../../engine/gameContext/gameContext";
import { useToast } from "../../engine/ui/toast/toast";
import cards from "../../assets/gameContent/cards";
import "./deckSelection.scss";

const PLAYER_LIST = [
  { id: "player1", name: "Player 1" },
  { id: "player2", name: "Player 2" },
  { id: "player3", name: "Player 3" },
  { id: "player4", name: "Player 4" },
];

const DeckSelection = () => {
  const navigate = useNavigate();
  const { setGameState } = useGame();
  const { clearLog } = useToast();
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

  const getSpendByClass = useCallback((deck) => {
    return deck.reduce(
      (acc, cardId) => {
        const card = cards.find((c) => c.id === cardId);
        const cardClass = card?.class;
        const cost = card?.cost ?? 0;
        if (cardClass) {
          acc[cardClass] = (acc[cardClass] ?? 0) + cost;
        }
        return acc;
      },
      { Red: 0, Blue: 0, Green: 0, Yellow: 0, Orange: 0 }
    );
  }, []);

  const activeSpend = useMemo(() => getSpendByClass(activeDeck), [activeDeck, getSpendByClass]);

  const canAffordCard = useCallback(
    (deck, card) => {
      const spend = getSpendByClass(deck);
      const next = (spend[card.class] ?? 0) + (card.cost ?? 0);
      return next <= 5;
    },
    [getSpendByClass]
  );

  const addCard = useCallback(
    (cardId) => {
      setDecks((prev) => {
        if (confirmed[activePlayerId]) return prev;
        const current = prev[activePlayerId] ?? [];
        if (current.length >= 16) return prev;
        const card = cards.find((c) => c.id === cardId);
        if (!card) return prev;
        if (!canAffordCard(current, card)) return prev;
        return { ...prev, [activePlayerId]: [...current, cardId] };
      });
    },
    [activePlayerId, confirmed, canAffordCard]
  );

  const removeCard = useCallback(
    (index) => {
      setDecks((prev) => {
        if (confirmed[activePlayerId]) return prev;
        const current = prev[activePlayerId] ?? [];
        if (!current[index]) return prev;
        return {
          ...prev,
          [activePlayerId]: current.filter((_, idx) => idx !== index),
        };
      });
    },
    [activePlayerId, confirmed]
  );

  const randomizeDeck = useCallback(
    (playerId) => {
      setDecks((prev) => {
        if (confirmed[playerId]) return prev;
        const cost3Cards = cards.filter((card) => card.cost === 3);
        const buildDeck = (enforceCost3) => {
          const target = Math.floor(Math.random() * 3) + 2; // 2-4
          const deck = [];
          let attempts = 0;

          if (enforceCost3) {
            while (deck.length < target && attempts < 2000) {
              attempts += 1;
              const card = cost3Cards[Math.floor(Math.random() * cost3Cards.length)];
              if (!card) continue;
              if (!canAffordCard(deck, card)) continue;
              deck.push(card.id);
            }
            if (deck.filter((id) => cards.find((c) => c.id === id)?.cost === 3).length < 2) {
              return null;
            }
          }

          attempts = 0;
          while (deck.length < 16 && attempts < 8000) {
            attempts += 1;
            const card = cards[Math.floor(Math.random() * cards.length)];
            if (!card) continue;
            if (!canAffordCard(deck, card)) continue;
            deck.push(card.id);
          }

          return deck.length === 16 ? deck : null;
        };

        let deck = null;
        for (let i = 0; i < 200; i += 1) {
          deck = buildDeck(true);
          if (deck) break;
        }
        if (!deck) {
          for (let i = 0; i < 200; i += 1) {
            deck = buildDeck(false);
            if (deck) break;
          }
        }

        return { ...prev, [playerId]: deck ?? [] };
      });
    },
    [canAffordCard, confirmed]
  );

  const clearDeck = useCallback(
    (playerId) => {
      setDecks((prev) => {
        if (confirmed[playerId]) return prev;
        return { ...prev, [playerId]: [] };
      });
    },
    [confirmed]
  );

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
    clearLog();
    navigate("/race");
  }, [clearLog, decks, isReady, navigate, setGameState]);

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
          <p>Build 16-card decks for each player. Spend up to 5 coins per class.</p>
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
                  {confirmed[player.id] ? " (OK)" : ""}
                </span>
              </div>
            ))}
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

          <div className="deck-selection__deckList">
            {activeDeck.length === 0 && (
              <div className="deck-selection__empty">No cards selected yet.</div>
            )}
            {activeDeck.map((cardId, index) => {
              const card = cards.find((c) => c.id === cardId);
              return (
                <div key={`${cardId}-${index}`} className="deck-selection__deckItem">
                  <div>
                    <div className="deck-selection__deckTitle">{card?.name ?? cardId}</div>
                    <div className="deck-selection__deckMeta">
                      {card?.class ?? "Unknown"} - {cardId}
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

          <div className="deck-selection__start">
            <div>
              {isReady ? "All decks ready." : "Each player needs 16 cards to start."}
            </div>
            <Button variant={BUTTON_VARIANT.PRIMARY} onClick={startRace} disabled={!isReady}>
              Start Race
            </Button>
          </div>
        </section>

        <section className="deck-selection__cards">
          <div className="deck-selection__currency">
            <div className="deck-selection__currencyTitle">Coins</div>
            <div className="deck-selection__currencyList">
              {["Red", "Blue", "Green", "Yellow", "Orange"].map((cls) => (
                <div key={cls} className="deck-selection__currencyItem">
                  <span className={`deck-selection__badge deck-selection__badge--${cls.toLowerCase()}`}>
                    {cls}
                  </span>
                  <span>{activeSpend[cls] ?? 0}/5</span>
                </div>
              ))}
            </div>
          </div>

          <div className="deck-selection__cardsHeader">
            <h2>All Cards</h2>
            <span>{activeDeck.length}/16 selected</span>
          </div>

          <div className="deck-selection__cardGrid">
            {cards.map((card) => {
              const isFull = activeDeck.length >= 16;
              const affordable = canAffordCard(activeDeck, card);
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
                  <div className="deck-selection__cardCost">Cost: {card.cost}</div>
                  <button
                    type="button"
                    className="deck-selection__addBtn"
                    disabled={isFull || activeConfirmed || !affordable}
                    onClick={() => addCard(card.id)}
                  >
                    {isFull ? "Deck Full" : !affordable ? "No Coins" : "Add"}
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
