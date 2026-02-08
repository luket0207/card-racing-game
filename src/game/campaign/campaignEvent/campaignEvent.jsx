import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Button, { BUTTON_VARIANT } from "../../../engine/ui/button/button";
import { MODAL_BUTTONS, useModal } from "../../../engine/ui/modal/modalContext";
import { useGame } from "../../../engine/gameContext/gameContext";
import events from "../../../assets/gameContent/events";
import cards from "../../../assets/gameContent/cards";
import "./campaignEvent.scss";

const CLASS_KEYS = ["Red", "Blue", "Green", "Yellow", "Orange"];

const POINTS_MATRIX = {
  "1": { win: 250, secondary: 0, lose: 0 },
  "1/2": { win: 500, secondary: 0, lose: 0 },
  "1/3": { win: 750, secondary: 100, lose: 0 },
  "1/4": { win: 1000, secondary: 200, lose: 0 },
};

const buildChoices = (chance, hasSecondary) => {
  const count = Number(chance.split("/")[1] ?? 1);
  const choices = [{ type: "reward" }];
  if (hasSecondary) choices.push({ type: "secondary" });
  while (choices.length < count) {
    choices.push({ type: "blank" });
  }
  return choices;
};

const shuffle = (arr) => {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

const CampaignEvent = () => {
  const navigate = useNavigate();
  const { openModal, closeModal } = useModal();
  const { gameState, setGameState } = useGame();
  const campaign = gameState?.campaign;

  const day = campaign?.day ?? 0;
  const dayData = campaign?.calendar?.[day];
  const currentEvent = useMemo(
    () => events.find((event) => event.id === dayData?.eventId) ?? null,
    [dayData?.eventId]
  );
  const eventText = currentEvent
    ? currentEvent.text.replace("{piece}", dayData?.eventPieceName ?? "A rival")
    : "";
  const chance = currentEvent?.chance ?? "1";
  const points = POINTS_MATRIX[chance] ?? POINTS_MATRIX["1"];
  const hasSecondary =
    currentEvent?.secondaryRewardCode && currentEvent.secondaryRewardCode !== "None";

  const [phase, setPhase] = useState(chance === "1" ? "result" : "preview");
  const [choices, setChoices] = useState(() => buildChoices(chance, hasSecondary));
  const [isShuffling, setIsShuffling] = useState(false);
  const [result, setResult] = useState(null);
  const [awaitingChoice, setAwaitingChoice] = useState(false);

  const applyReward = (rewardCode, rewardText) => {
    if (!rewardCode) return;
    if (rewardCode.startsWith("GOLD:")) {
      const amount = Number(rewardCode.split(":")[1] ?? 0);
      setGameState((prev) => ({
        ...prev,
        campaign: {
          ...prev.campaign,
          goldCoins: (prev.campaign?.goldCoins ?? 0) + amount,
        },
      }));
      return;
    }

    if (rewardCode === "CLASS_COIN:RANDOM") {
      const cls = CLASS_KEYS[Math.floor(Math.random() * CLASS_KEYS.length)];
      setGameState((prev) => ({
        ...prev,
        campaign: {
          ...prev.campaign,
          coinArray: {
            ...prev.campaign?.coinArray,
            [cls]: (prev.campaign?.coinArray?.[cls] ?? 0) + 1,
          },
        },
      }));
      return;
    }

    if (rewardCode === "CLASS_COIN:CHOICE") {
      setAwaitingChoice(true);
      openModal({
        modalTitle: "Choose a Class Coin",
        modalContent: (
          <div className="campaign-event__coinChoice">
            {CLASS_KEYS.map((cls) => (
              <Button
                key={cls}
                variant={BUTTON_VARIANT.SECONDARY}
                onClick={() => {
                  setGameState((prev) => ({
                    ...prev,
                    campaign: {
                      ...prev.campaign,
                      coinArray: {
                        ...prev.campaign?.coinArray,
                        [cls]: (prev.campaign?.coinArray?.[cls] ?? 0) + 1,
                      },
                    },
                  }));
                  closeModal();
                  setAwaitingChoice(false);
                }}
              >
                {cls}
              </Button>
            ))}
          </div>
        ),
        buttons: MODAL_BUTTONS.CLOSE,
        onClose: () => {
          closeModal();
          setAwaitingChoice(false);
        },
      });
      return;
    }

    if (rewardCode.startsWith("UNLOCK:TIER")) {
      const tier = Number(rewardCode.split("TIER")[1] ?? 0);
      const library = campaign?.library ?? [];
      const candidates = cards.filter((card) => card.cost === tier && !library.includes(card.id));
      if (candidates.length === 0) return;
      const card = candidates[Math.floor(Math.random() * candidates.length)];
      setGameState((prev) => ({
        ...prev,
        campaign: {
          ...prev.campaign,
          library: [...(prev.campaign?.library ?? []), card.id],
        },
      }));
      return;
    }

    if (rewardText && rewardText.includes("coins")) {
      const amount = Number(rewardText.replace(/[^0-9]/g, ""));
      if (!Number.isFinite(amount)) return;
      setGameState((prev) => ({
        ...prev,
        campaign: {
          ...prev.campaign,
          goldCoins: (prev.campaign?.goldCoins ?? 0) + amount,
        },
      }));
    }
  };

  const applyPoints = (type) => {
    const delta =
      type === "reward"
        ? points.win
        : type === "secondary"
        ? points.secondary
        : points.lose;
    if (!delta) return;
    setGameState((prev) => ({
      ...prev,
      campaign: {
        ...prev.campaign,
        points: (prev.campaign?.points ?? 0) + delta,
      },
    }));
  };

  const resolveChoice = (choice) => {
    if (result) return;
    if (choice.type === "reward") {
      applyReward(currentEvent?.rewardCode, currentEvent?.reward);
      applyPoints("reward");
      setResult({
        status: "win",
        message: `You won ${currentEvent?.reward ?? "a reward"}!`,
      });
    } else if (choice.type === "secondary") {
      applyReward(currentEvent?.secondaryRewardCode, currentEvent?.secondaryReward);
      applyPoints("secondary");
      setResult({
        status: "secondary",
        message: `You won ${currentEvent?.secondaryReward ?? "a secondary reward"}!`,
      });
    } else {
      applyPoints("lose");
      setResult({ status: "lose", message: "No reward this time." });
    }
    setPhase("result");
  };

  useEffect(() => {
    if (!campaign?.active) {
      navigate("/");
      return;
    }
    if (!currentEvent || dayData?.type !== "event") {
      navigate("/campaign");
    }
  }, [campaign?.active, currentEvent, dayData?.type, navigate]);

  useEffect(() => {
    if (!currentEvent) return;
    if (chance !== "1" || result) return;
    applyReward(currentEvent.rewardCode, currentEvent.reward);
    applyPoints("reward");
    setResult({ status: "win", message: `You won ${currentEvent.reward}!` });
  }, [chance, currentEvent, result]);

  if (!currentEvent) return null;

  return (
    <div className="campaign-event">
      <div className="campaign-event__card">
        <h1>Campaign Event</h1>
        <p>{eventText}</p>

        {chance !== "1" && (
          <div className="campaign-event__choices">
            <div className={`campaign-event__pickGrid${isShuffling ? " campaign-event__pickGrid--shuffling" : ""}`}>
              {choices.map((choice, idx) => (
                <button
                  key={`choice-${idx}`}
                  type="button"
                  className={`campaign-event__choice${phase === "preview" || result ? " campaign-event__choice--preview" : ""}`}
                  onClick={() => {
                    if (phase !== "pick" || isShuffling) return;
                    resolveChoice(choice);
                  }}
                  disabled={phase !== "pick" || isShuffling}
                >
                  {phase === "preview" || result ? (
                    <>
                      {choice.type === "reward" && currentEvent.reward}
                      {choice.type === "secondary" && currentEvent.secondaryReward}
                      {choice.type === "blank" && "Blank"}
                    </>
                  ) : (
                    "?"
                  )}
                </button>
              ))}
            </div>
            {phase === "preview" && (
              <Button
                variant={BUTTON_VARIANT.PRIMARY}
                onClick={() => {
                  if (isShuffling) return;
                  setIsShuffling(true);
                  let cycles = 0;
                  const interval = setInterval(() => {
                    cycles += 1;
                    setChoices((prev) => shuffle(prev));
                    if (cycles >= 12) {
                      clearInterval(interval);
                      setIsShuffling(false);
                      setPhase("pick");
                    }
                  }, 90);
                }}
              >
                Shuffle
              </Button>
            )}
          </div>
        )}

        {result && (
          <div className={`campaign-event__result campaign-event__result--${result.status}`}>
            {result.message}
          </div>
        )}

        {result && (
          <Button
            variant={BUTTON_VARIANT.SECONDARY}
            onClick={() => {
              if (awaitingChoice) return;
              setGameState((prev) => ({
                ...prev,
                campaign: {
                  ...prev.campaign,
                  day: (prev.campaign?.day ?? 0) + 1,
                },
              }));
              navigate("/campaign");
            }}
            disabled={awaitingChoice}
          >
            Return to Campaign
          </Button>
        )}

        {chance === "1" && result && (
          <Button
            variant={BUTTON_VARIANT.SECONDARY}
            onClick={() => {
              if (awaitingChoice) return;
              setGameState((prev) => ({
                ...prev,
                campaign: {
                  ...prev.campaign,
                  day: (prev.campaign?.day ?? 0) + 1,
                },
              }));
              navigate("/campaign");
            }}
            disabled={awaitingChoice}
          >
            Continue
          </Button>
        )}
      </div>
    </div>
  );
};

export default CampaignEvent;
