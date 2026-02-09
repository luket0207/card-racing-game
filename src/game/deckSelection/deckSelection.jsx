import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Button, { BUTTON_VARIANT } from "../../engine/ui/button/button";
import { useGame } from "../../engine/gameContext/gameContext";
import { useToast } from "../../engine/ui/toast/toast";
import { MODAL_BUTTONS, useModal } from "../../engine/ui/modal/modalContext";
import { FileUpload } from "primereact/fileupload";
import { Checkbox } from "primereact/checkbox";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCoins } from "@fortawesome/free-solid-svg-icons";
import cards from "../../assets/gameContent/cards";
import themes from "../../assets/gameContent/themes";
import CoinBar from "../../engine/ui/coinBar/coinBar";
import Piece from "../race/components/piece/piece";
import "./deckSelection.scss";

const PLAYER_LIST = [
  { id: "player1", name: "Player 1" },
  { id: "player2", name: "Player 2" },
  { id: "player3", name: "Player 3" },
  { id: "player4", name: "Player 4" },
];

const DeckSelection = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const fileUploadRef = useRef(null);
  const isExportMode = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get("mode") === "export";
  }, [location.search]);
  const isCampaignMode = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get("mode") === "campaign";
  }, [location.search]);
  const { gameState, setGameState } = useGame();
  const { clearLog } = useToast();
  const { openModal, closeModal } = useModal();
  const racers = useMemo(() => {
    const campaignTheme =
      themes.find((t) => t.id === gameState?.campaign?.themeId) ?? themes[0];
    const campaignPiece =
      campaignTheme?.pieces?.find((p) => p.id === gameState?.campaign?.pieceId) ??
      campaignTheme?.pieces?.[0];
    const exportPiece = themes[0]?.pieces?.[0];
    const fallbackPieces = themes[0]?.pieces ?? [];
    if (isCampaignMode) {
      return [
        {
          id: "player1",
          name: gameState?.campaign?.playerName || "Player",
          type: "human",
          pieceId: campaignPiece?.id ?? "piece-1",
          color: campaignPiece?.color ?? "#ffffff",
          image: campaignPiece?.image ?? null,
          icon: campaignPiece?.icon ?? null,
        },
      ];
    }
    if (isExportMode) {
      return [
        {
          id: "player1",
          name: "Player 1",
          type: "human",
          pieceId: exportPiece?.id ?? "piece-1",
          color: exportPiece?.color ?? "#ffffff",
          image: exportPiece?.image ?? null,
          icon: exportPiece?.icon ?? null,
        },
      ];
    }
    const list =
      Array.isArray(gameState?.racers) && gameState.racers.length > 0
        ? gameState.racers
        : PLAYER_LIST.map((p, idx) => {
            const piece = fallbackPieces[idx % (fallbackPieces.length || 1)];
            return {
              id: p.id,
              name: p.name,
              type: idx < 2 ? "human" : "ai",
              pieceId: piece?.id ?? `piece-${idx + 1}`,
              color: piece?.color ?? "#ffffff",
              image: piece?.image ?? null,
              icon: piece?.icon ?? null,
            };
          });
    return list;
  }, [
    gameState?.campaign?.playerName,
    gameState?.campaign?.pieceId,
    gameState?.campaign?.themeId,
    gameState?.racers,
    isCampaignMode,
    isExportMode,
  ]);
  const activeTheme = useMemo(
    () =>
      themes.find(
        (t) => t.id === (isCampaignMode ? gameState?.campaign?.themeId : gameState?.themeId)
      ) ?? themes[0],
    [gameState?.campaign?.themeId, gameState?.themeId, isCampaignMode]
  );

  useEffect(() => {
    if (isExportMode) return;
    if (isCampaignMode) {
      if (!gameState?.campaign?.active) {
        navigate("/");
      }
      return;
    }
    if (!Array.isArray(gameState?.racers) || gameState.racers.length === 0) {
      navigate("/");
    }
  }, [gameState, isCampaignMode, isExportMode, navigate]);

  const humanRacers = useMemo(() => racers.filter((r) => r.type === "human"), [racers]);
  const [activePlayerIndex, setActivePlayerIndex] = useState(0);
  const activePlayer = humanRacers[activePlayerIndex];
  const activePlayerId = activePlayer?.id ?? "player1";
  const activePlayerName = activePlayer?.name ?? "Player 1";
  const [decks, setDecks] = useState(() =>
    racers.reduce((acc, player) => {
      acc[player.id] = [];
      return acc;
    }, {})
  );
  const decksRef = useRef(decks);
  useEffect(() => {
    decksRef.current = decks;
  }, [decks]);
  const [confirmed, setConfirmed] = useState(() =>
    racers.reduce((acc, player) => {
      acc[player.id] = player.type !== "human";
      return acc;
    }, {})
  );
  const [selectedClasses, setSelectedClasses] = useState([
    "Red",
    "Blue",
    "Green",
    "Yellow",
    "Orange",
  ]);
  const [selectedCosts, setSelectedCosts] = useState([1, 2, 3]);
  const [showOnlyAvailable, setShowOnlyAvailable] = useState(false);
  const [randomizingPlayerId, setRandomizingPlayerId] = useState(null);

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

  useEffect(() => {
    if (!isCampaignMode) return;
    setDecks((prev) => ({
      ...prev,
      [activePlayerId]: gameState?.campaign?.deck ?? [],
    }));
    setConfirmed((prev) => ({ ...prev, [activePlayerId]: false }));
  }, [activePlayerId, gameState?.campaign?.deck, isCampaignMode]);

  const campaignLimits = useMemo(() => {
    if (!isCampaignMode) return null;
    const arr = gameState?.campaign?.coinArray ?? {};
    return {
      Red: arr.Red ?? 0,
      Blue: arr.Blue ?? 0,
      Green: arr.Green ?? 0,
      Yellow: arr.Yellow ?? 0,
      Orange: arr.Orange ?? 0,
    };
  }, [gameState?.campaign?.coinArray, isCampaignMode]);

  const campaignGold = gameState?.campaign?.goldCoins ?? 0;
  const campaignPoints = gameState?.campaign?.points ?? 0;
  const campaignLibrary = gameState?.campaign?.library ?? [];

  const canAffordCard = useCallback(
    (deck, card) => {
      const spend = getSpendByClass(deck);
      const next = (spend[card.class] ?? 0) + (card.cost ?? 0);
      const limit = isCampaignMode ? (campaignLimits?.[card.class] ?? 0) : 5;
      return next <= limit;
    },
    [campaignLimits, getSpendByClass, isCampaignMode]
  );

  const buildRandomDeck = useCallback(() => {
    const availableCards = isCampaignMode
      ? cards.filter((card) => (gameState?.campaign?.library ?? []).includes(card.id))
      : cards;
    const cost3Cards = availableCards.filter((card) => card.cost === 3);
    const buildDeck = (enforceCost3) => {
      const target = Math.floor(Math.random() * 3) + 2; // 2-4
      const deck = [];
      let attempts = 0;

      if (enforceCost3 && !isCampaignMode) {
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
        const card = availableCards[Math.floor(Math.random() * availableCards.length)];
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
    return deck ?? [];
  }, [canAffordCard, gameState?.campaign?.library, isCampaignMode]);

  const buildCampaignFill = useCallback(
    (baseDeck) => {
      const availableCards = cards.filter((card) =>
        (gameState?.campaign?.library ?? []).includes(card.id)
      );
      const remainingByClass = { ...(campaignLimits ?? {}) };
      const spend = getSpendByClass(baseDeck);
      Object.keys(remainingByClass).forEach((cls) => {
        remainingByClass[cls] = Math.max(0, (remainingByClass[cls] ?? 0) - (spend[cls] ?? 0));
      });

      const slotsLeft = 16 - baseDeck.length;
      const remainingTotal = Object.values(remainingByClass).reduce((sum, val) => sum + val, 0);
      if (remainingTotal < slotsLeft) return null;

      const deck = [...baseDeck];
      let safety = 6000;
      while (deck.length < 16 && safety > 0) {
        safety -= 1;
        const classes = Object.keys(remainingByClass).filter((cls) => remainingByClass[cls] > 0);
        if (classes.length === 0) break;
        const cls = classes[Math.floor(Math.random() * classes.length)];
        const candidates = availableCards.filter((card) => card.class === cls);
        if (candidates.length === 0) {
          remainingByClass[cls] = 0;
          continue;
        }
        const card = candidates[Math.floor(Math.random() * candidates.length)];
        if (!card) continue;
        if (!canAffordCard(deck, card)) {
          remainingByClass[cls] = Math.max(0, remainingByClass[cls] - 1);
          continue;
        }
        deck.push(card.id);
        remainingByClass[cls] -= card.cost ?? 1;
      }

      return deck.length === 16 ? deck : null;
    },
    [campaignLimits, canAffordCard, gameState?.campaign?.library, getSpendByClass]
  );

  const addCard = useCallback(
    (cardId) => {
      setDecks((prev) => {
        if (confirmed[activePlayerId]) return prev;
        const current = prev[activePlayerId] ?? [];
        if (current.length >= 16) return prev;
        const card = cards.find((c) => c.id === cardId);
        if (!card) return prev;
        if (isCampaignMode && !(gameState?.campaign?.library ?? []).includes(cardId)) return prev;
        if (!canAffordCard(current, card)) return prev;
        return { ...prev, [activePlayerId]: [...current, cardId] };
      });
    },
    [activePlayerId, confirmed, canAffordCard, gameState?.campaign?.library, isCampaignMode]
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
      if (confirmed[playerId]) return;
      const current = decksRef.current[playerId] ?? [];
      if (current.length >= 16) return;

      setRandomizingPlayerId(playerId);

      let finalDeck = null;
      if (isCampaignMode) {
        for (let retry = 0; retry < 10; retry += 1) {
          finalDeck = buildCampaignFill(current);
          if (finalDeck) break;
        }
      } else {
        for (let retry = 0; retry < 10; retry += 1) {
          const filled = [...current];
          let attempts = 0;
          while (filled.length < 16 && attempts < 8000) {
            attempts += 1;
            const card = cards[Math.floor(Math.random() * cards.length)];
            if (!card) continue;
            if (!canAffordCard(filled, card)) continue;
            filled.push(card.id);
          }
          if (filled.length === 16) {
            finalDeck = filled;
            break;
          }
        }
      }

      if (!finalDeck) {
        setRandomizingPlayerId(null);
        openModal({
          modalTitle: "Cannot Randomize Deck",
          modalContent: (
            <div>
              There are not enough coins left to fill the deck to 16 cards. Remove some cards or
              clear the deck and try again.
            </div>
          ),
          buttons: MODAL_BUTTONS.OK,
        });
        return;
      }

      setDecks((prev) => ({ ...prev, [playerId]: finalDeck }));
      setRandomizingPlayerId(null);
    },
    [buildCampaignFill, canAffordCard, confirmed, isCampaignMode, openModal]
  );

  const clearDeck = useCallback(
    (playerId) => {
      setDecks((prev) => {
        if (confirmed[playerId]) return prev;
        decksRef.current = { ...prev, [playerId]: [] };
        return { ...prev, [playerId]: [] };
      });
    },
    [confirmed]
  );

  const activeDeckFull = activeDeck.length === 16;
  const activeConfirmed = confirmed[activePlayerId];
  const allHumanDecksFull = useMemo(
    () => humanRacers.every((player) => (decks[player.id] ?? []).length === 16),
    [decks, humanRacers]
  );

  const filteredCards = useMemo(() => {
    return cards.filter((card) => {
      const cls = card.class;
      const cost = card.cost;
      const classOk = selectedClasses.includes(cls);
      const costOk = selectedCosts.includes(cost);
      const availableOk =
        !isCampaignMode ||
        !showOnlyAvailable ||
        campaignLibrary.includes(card.id);
      return classOk && costOk && availableOk;
    });
  }, [
    campaignLibrary,
    isCampaignMode,
    selectedClasses,
    selectedCosts,
    showOnlyAvailable,
  ]);

  const purchaseCard = useCallback(
    (card) => {
      const cost = card.cost === 2 ? 250 : card.cost === 3 ? 1000 : 0;
      if (cost <= 0) return;
      if (campaignGold < cost) return;
      if (campaignLibrary.includes(card.id)) return;
      setGameState((prev) => ({
        ...prev,
        campaign: {
          ...prev.campaign,
          goldCoins: (prev.campaign?.goldCoins ?? 0) - cost,
          points: (prev.campaign?.points ?? 0) + cost,
          library: [...(prev.campaign?.library ?? []), card.id],
        },
      }));
    },
    [campaignGold, campaignLibrary, setGameState]
  );

  const startRace = useCallback(() => {
    if (isCampaignMode) return;
    if (!allHumanDecksFull) return;
    if (isExportMode) return;
    const withAiDecks = { ...decks };
    racers.forEach((r) => {
      if (r.type === "ai" && (!withAiDecks[r.id] || withAiDecks[r.id].length !== 16)) {
        withAiDecks[r.id] = buildRandomDeck();
      }
    });
    setGameState((prev) => ({
      ...prev,
      themeId: activeTheme?.id ?? "cars",
      player1: { ...prev.player1, deck: withAiDecks.player1 ?? [], position: 0 },
      player2: { ...prev.player2, deck: withAiDecks.player2 ?? [], position: 0 },
      player3: { ...prev.player3, deck: withAiDecks.player3 ?? [], position: 0 },
      player4: { ...prev.player4, deck: withAiDecks.player4 ?? [], position: 0 },
    }));
    clearLog();
    navigate("/race");
  }, [
    activeDeckFull,
    activeTheme?.id,
    buildRandomDeck,
    clearLog,
    decks,
    humanRacers.length,
    allHumanDecksFull,
    isCampaignMode,
    isExportMode,
    navigate,
    racers,
    setGameState,
  ]);

  const handleCampaignCancel = useCallback(() => {
    openModal({
      modalTitle: "Cancel Changes",
      modalContent: (
        <div>Are you sure you want to go back without saving the changes to your deck?</div>
      ),
      buttons: MODAL_BUTTONS.YES_NO,
      onYes: () => {
        closeModal();
        navigate("/campaign");
      },
      onNo: () => closeModal(),
    });
  }, [closeModal, navigate, openModal]);

  const goToPrevPlayer = useCallback(() => {
    setActivePlayerIndex((prev) => Math.max(0, prev - 1));
  }, []);

  const goToNextPlayer = useCallback(() => {
    setActivePlayerIndex((prev) => Math.min(prev + 1, humanRacers.length - 1));
  }, [humanRacers.length]);

  const confirmDeck = useCallback(() => {
    if (isCampaignMode) return;
    if (!activeDeckFull || activeConfirmed) return;
    setConfirmed((prev) => ({ ...prev, [activePlayerId]: true }));
    setActivePlayerIndex((prev) => Math.min(prev + 1, humanRacers.length - 1));
  }, [activeConfirmed, activeDeckFull, activePlayerId, humanRacers.length, isCampaignMode]);

  const validateDeck = useCallback(
    (deck) => {
      if (!Array.isArray(deck) || deck.length !== 16) return false;
      for (const cardId of deck) {
        if (!cards.find((c) => c.id === cardId)) return false;
      }
      const spend = getSpendByClass(deck);
      return Object.values(spend).every((val) => val <= 5);
    },
    [getSpendByClass]
  );

  const handleExportDeck = useCallback(() => {
    if (!activeDeckFull || activeConfirmed) return;
    const payload = btoa(JSON.stringify({ deck: activeDeck }));
    const blob = new Blob([payload], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "deck.txt";
    link.click();
    URL.revokeObjectURL(url);
  }, [activeConfirmed, activeDeck, activeDeckFull]);

  const handleImportDeckFile = useCallback(
    (file) => {
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const content = String(reader.result || "");
          const decoded = atob(content.trim());
          const parsed = JSON.parse(decoded);
          const deck = parsed?.deck;
          if (!validateDeck(deck)) return;
          setDecks((prev) => ({ ...prev, [activePlayerId]: deck }));
          setConfirmed((prev) => ({ ...prev, [activePlayerId]: false }));
        } catch (err) {
          // ignore invalid files
        }
      };
      reader.readAsText(file);
    },
    [activePlayerId, validateDeck]
  );

  const handleImportDeck = useCallback(
    (event) => {
      const file = event.target.files?.[0];
      handleImportDeckFile(file);
      event.target.value = "";
    },
    [handleImportDeckFile]
  );

  return (
    <div className="deck-selection">
      <header className="deck-selection__header">
        <div>
          <h1>Deck Selection</h1>
          <p>
            {isCampaignMode
              ? "Build your 16-card campaign deck. Only cards in your library can be used."
              : "Build 16-card decks for each player. Spend up to 5 coins per class."}
          </p>
        </div>
        {isCampaignMode && (
          <div className="deck-selection__stats">
            <div>
              <span>Gold</span>
              <strong>{campaignGold}</strong>
            </div>
            <div>
              <span>Points</span>
              <strong>{campaignPoints}</strong>
            </div>
          </div>
        )}
        <div className="deck-selection__headerActions">
          {isCampaignMode ? (
            <Button
              variant={BUTTON_VARIANT.TERTIARY}
              onClick={handleCampaignCancel}
              disabled={(gameState?.campaign?.deck ?? []).length !== 16}
            >
              Back to Campaign
            </Button>
          ) : (
            <Button variant={BUTTON_VARIANT.TERTIARY} to="/">
              Back Home
            </Button>
          )}
        </div>
      </header>

      <div className="deck-selection__layout">
        <section className="deck-selection__players">
          <div className="deck-selection__leftGrid">
            <div className="deck-selection__leftControls">
              <div className="deck-selection__playerStatus">
                {activePlayerId && (
                  <div className="deck-selection__playerRow deck-selection__playerRow--active">
                    {activePlayer && (
                      <div className="deck-selection__playerPiece">
                        <Piece
                          label={activePlayerName}
                          color={activePlayer.color}
                          playerId={activePlayer.id}
                          status={[]}
                          image={activePlayer.image}
                          icon={activePlayer.icon}
                          size="large"
                        />
                      </div>
                    )}
                    <h2>{activePlayerName}</h2>
                    <h4>
                      {(decks[activePlayerId] ?? []).length}/16
                      {confirmed[activePlayerId] ? " (OK)" : ""}
                    </h4>
                  </div>
                )}
                {!isExportMode && !isCampaignMode && (
                  <div className="deck-selection__playerPips" aria-label="Deck status">
                    {humanRacers.map((player) => {
                      const deckCount = (decks[player.id] ?? []).length;
                      const isComplete = deckCount === 16;
                      const isActive = player.id === activePlayerId;
                      const pipClass = [
                        "deck-selection__playerPip",
                        isActive
                          ? "deck-selection__playerPip--primary"
                          : "deck-selection__playerPip--secondary",
                        isComplete ? "deck-selection__playerPip--solid" : "deck-selection__playerPip--hollow",
                      ].join(" ");

                      return (
                        <span
                          key={`pip-${player.id}`}
                          className={pipClass}
                          title={`${player.name}: ${deckCount}/16`}
                        />
                      );
                    })}
                  </div>
                )}
              </div>

              {!isExportMode && !isCampaignMode && humanRacers.length > 1 && (
                <div className="deck-selection__playerNav">
                  <Button
                    variant={BUTTON_VARIANT.TERTIARY}
                    onClick={goToPrevPlayer}
                    disabled={activePlayerIndex === 0}
                  >
                    Previous Player
                  </Button>
                  <Button
                    variant={BUTTON_VARIANT.TERTIARY}
                    onClick={goToNextPlayer}
                    disabled={activePlayerIndex >= humanRacers.length - 1}
                  >
                    Next Player
                  </Button>
                </div>
              )}

              <div className="deck-selection__confirm">
                {isExportMode ? (
                  <Button
                    variant={BUTTON_VARIANT.PRIMARY}
                    onClick={handleExportDeck}
                    disabled={!activeDeckFull || activeConfirmed}
                  >
                    Download Deck (.txt)
                  </Button>
                ) : null}
              </div>

              <div className="deck-selection__deckActions">
                <Button
                  variant={BUTTON_VARIANT.SECONDARY}
                  onClick={() => randomizeDeck(activePlayerId)}
                  disabled={activeConfirmed || randomizingPlayerId === activePlayerId}
                >
                  {randomizingPlayerId === activePlayerId ? (
                    <span className="deck-selection__btnLoading">
                      <span className="deck-selection__spinner" aria-hidden="true" />
                      Randomizing...
                    </span>
                  ) : (
                    "Randomize Deck"
                  )}
                </Button>
                <Button
                  variant={BUTTON_VARIANT.TERTIARY}
                  onClick={() => clearDeck(activePlayerId)}
                  disabled={activeConfirmed}
                >
                  Clear Deck
                </Button>
                {!isExportMode && !isCampaignMode && (
                  <FileUpload
                    ref={fileUploadRef}
                    className="deck-selection__upload"
                    mode="basic"
                    chooseLabel="Upload Deck (.txt)"
                    accept=".txt"
                    customUpload
                    disabled={activeConfirmed}
                    onSelect={(e) => {
                      handleImportDeckFile(e.files?.[0]);
                      fileUploadRef.current?.clear();
                    }}
                    uploadHandler={() => {}}
                  />
                )}
              </div>

              {!isExportMode && !isCampaignMode && (
                <div className="deck-selection__start">
                  <div>
                    {allHumanDecksFull
                      ? "All decks are ready to start."
                      : "All players must have 16 cards to start."}
                  </div>
                  <Button
                    variant={BUTTON_VARIANT.PRIMARY}
                    onClick={startRace}
                    disabled={!allHumanDecksFull}
                  >
                    Start Race
                  </Button>
                </div>
              )}
              {isCampaignMode && (
                <div className="deck-selection__campaignActions">
                  <Button
                    variant={BUTTON_VARIANT.TERTIARY}
                    className="deck-selection__campaignCancel"
                    onClick={handleCampaignCancel}
                    disabled={(gameState?.campaign?.deck ?? []).length !== 16}
                  >
                    Cancel
                  </Button>
                  <div className="deck-selection__campaignHint">
                    You need to have 16 cards in your deck to continue.
                  </div>
                  <Button
                    variant={BUTTON_VARIANT.PRIMARY}
                    onClick={() => {
                      if (!activeDeckFull) return;
                      openModal({
                        modalTitle: "Save Deck",
                        modalContent: <div>Save your new campaign deck?</div>,
                        buttons: MODAL_BUTTONS.YES_NO,
                        onYes: () => {
                          closeModal();
                          setGameState((prev) => ({
                            ...prev,
                            campaign: {
                              ...prev.campaign,
                              deck: activeDeck,
                            },
                          }));
                          navigate("/campaign");
                        },
                        onNo: () => closeModal(),
                      });
                    }}
                    disabled={!activeDeckFull}
                  >
                    Save
                  </Button>
                </div>
              )}
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
                        {card?.class ?? "Unknown"} - {cardId} - Cost {card?.cost ?? 0}
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
          </div>
        </section>

        <section className="deck-selection__cards">
          <div className="deck-selection__currency">
            <div className="deck-selection__currencyTitle">Coins</div>
            <div className="deck-selection__currencyList">
              <CoinBar
                coinArray={Object.fromEntries(
                  ["Red", "Blue", "Green", "Yellow", "Orange"].map((cls) => {
                    const limit = isCampaignMode ? (campaignLimits?.[cls] ?? 0) : 5;
                    const remaining = limit - (activeSpend[cls] ?? 0);
                    return [cls, Math.max(0, remaining)];
                  })
                )}
                segmentWidth={38}
                height={20}
                borderWidth={3}
              />
            </div>
          </div>

          <div className="deck-selection__cardsHeader">
            <h2>All Cards</h2>
            <span>{activeDeck.length}/16 selected</span>
          </div>

          <div className="deck-selection__filters">
            {isCampaignMode && (
              <div className="deck-selection__filterGroup">
                <div className="deck-selection__filterHeader">
                  <span>Availability</span>
                  <div className="deck-selection__filterActions">
                    <button
                      type="button"
                      className="deck-selection__filterBtn"
                      onClick={() => setShowOnlyAvailable(false)}
                    >
                      Show All
                    </button>
                    <button
                      type="button"
                      className="deck-selection__filterBtn"
                      onClick={() => setShowOnlyAvailable(true)}
                    >
                      Available Only
                    </button>
                  </div>
                </div>
              </div>
            )}
            <div className="deck-selection__filterGroup">
              <div className="deck-selection__filterHeader">
                <span>Class</span>
                <div className="deck-selection__filterActions">
                  <button
                    type="button"
                    className="deck-selection__filterBtn"
                    onClick={() => setSelectedClasses(["Red", "Blue", "Green", "Yellow", "Orange"])}
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    className="deck-selection__filterBtn"
                    onClick={() => setSelectedClasses([])}
                  >
                    Clear
                  </button>
                </div>
              </div>
              <div className="deck-selection__filterList">
                {["Red", "Blue", "Green", "Yellow", "Orange"].map((cls) => (
                  <label key={cls} className="deck-selection__filterItem">
                    <Checkbox
                      inputId={`filter-class-${cls}`}
                      checked={selectedClasses.includes(cls)}
                      onChange={(e) => {
                        setSelectedClasses((prev) =>
                          e.checked ? [...prev, cls] : prev.filter((val) => val !== cls)
                        );
                      }}
                    />
                    <span>{cls}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="deck-selection__filterGroup">
              <div className="deck-selection__filterHeader">
                <span>Cost</span>
                <div className="deck-selection__filterActions">
                  <button
                    type="button"
                    className="deck-selection__filterBtn"
                    onClick={() => setSelectedCosts([1, 2, 3])}
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    className="deck-selection__filterBtn"
                    onClick={() => setSelectedCosts([])}
                  >
                    Clear
                  </button>
                </div>
              </div>
              <div className="deck-selection__filterList">
                {[1, 2, 3].map((cost) => (
                  <label key={cost} className="deck-selection__filterItem">
                    <Checkbox
                      inputId={`filter-cost-${cost}`}
                      checked={selectedCosts.includes(cost)}
                      onChange={(e) => {
                        setSelectedCosts((prev) =>
                          e.checked ? [...prev, cost] : prev.filter((val) => val !== cost)
                        );
                      }}
                    />
                    <span>{cost}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="deck-selection__cardGrid">
            {filteredCards.map((card) => {
              const isFull = activeDeck.length >= 16;
              const affordable = canAffordCard(activeDeck, card);
              const available = !isCampaignMode || campaignLibrary.includes(card.id);
              const buyCost = card.cost === 2 ? 250 : card.cost === 3 ? 1000 : 0;
              const canBuy = isCampaignMode && !available && campaignGold >= buyCost;
              return (
                <div key={card.id} className="deck-selection__card tertiary-background-colour tertiary-text-colour">
                  <div
                    className={`deck-selection__cardHeader deck-selection__cardHeader--${card.class.toLowerCase()}`}
                  >
                    {card.class} ({card.cost})
                  </div>
                  <h3>{card.name}</h3>
                  <p>{card.text}</p>
                  {!available && isCampaignMode ? (
                    <Button
                      variant={BUTTON_VARIANT.TERTIARY}
                      className="deck-selection__addBtn"
                      disabled={!canBuy}
                      onClick={() => purchaseCard(card)}
                    >
                      <span className="deck-selection__buyIcon">
                        <FontAwesomeIcon icon={faCoins} />
                      </span>
                      Buy Card ({buyCost})
                    </Button>
                  ) : (
                    <Button
                      variant={BUTTON_VARIANT.PRIMARY}
                      className="deck-selection__addBtn"
                      disabled={isFull || activeConfirmed || !affordable}
                      onClick={() => addCard(card.id)}
                    >
                      {isFull ? "Deck Full" : !affordable ? "No Coins" : "Add"}
                    </Button>
                  )}
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
